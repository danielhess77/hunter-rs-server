async function saveTokens(tokens, env) {

    tokens.expires_at =
        Math.floor(Date.now() / 1000) +
        tokens.expires_in - 60;

    tokens.expires_at =
    Math.floor(Date.now() / 1000) +
    tokens.expires_in - 60;

    await env.HUNTER_AUTH.put(
        "tokens",
        JSON.stringify(tokens)
);

}

export async function getStoredTokens(env) {

    const raw =
        await env.HUNTER_AUTH.get("tokens");

    if (!raw) {
        throw new Error("No OAuth tokens stored.");
    }

    return JSON.parse(raw);

}

async function refreshAccessToken(tokens, env) {

    const credentials =
        btoa(
            `${env.SCHWAB_CLIENT_ID}:${env.SCHWAB_CLIENT_SECRET}`
        );

    const body =
        new URLSearchParams({

            grant_type: "refresh_token",

            refresh_token:
                tokens.refresh_token

        });

    const response =
        await fetch(
            "https://api.schwabapi.com/v1/oauth/token",
            {

                method: "POST",

                headers: {

                    Authorization:
                        `Basic ${credentials}`,

                    "Content-Type":
                        "application/x-www-form-urlencoded"

                },

                body

            }

        );

    if (!response.ok) {

        throw new Error(
            `Refresh failed (${response.status})`
        );

    }

    const refreshed =
        await response.json();

    refreshed.refresh_token =
        refreshed.refresh_token ||
        tokens.refresh_token;

    await saveTokens(
        refreshed,
        env
    );

    return refreshed;

}

async function ensureValidToken(env) {

    let tokens =
        await getStoredTokens(env);

    const now =
        Math.floor(Date.now() / 1000);

    if (
        !tokens.expires_at ||
        now >= tokens.expires_at
    ) {

        tokens =
            await refreshAccessToken(
                tokens,
                env
            );

    }

    return tokens;

}

export async function authorizedFetch(url, env) {

    const tokens =
        await ensureValidToken(env);

    return fetch(url, {

        headers: {

            Authorization:
                `Bearer ${tokens.access_token}`,

            Accept:
                "application/json"

        }

    });

}

export async function getHistory(symbol, env) {

    const url =
        `https://api.schwabapi.com/marketdata/v1/pricehistory` +
        `?symbol=${encodeURIComponent(symbol)}` +
        `&periodType=year` +
        `&period=1` +
        `&frequencyType=daily` +
        `&frequency=1`;

    return authorizedFetch(url, env);

}