export async function getStoredTokens(env) {

    const raw = await env.HUNTER_AUTH.get("tokens");

    if (!raw) {
        throw new Error("No OAuth tokens stored.");
    }

    return JSON.parse(raw);

}

export async function authorizedFetch(url, env) {

    const tokens = await getStoredTokens(env);

    return fetch(url, {
        headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            Accept: "application/json"
        }
    });

}

export async function getHistory(symbol, period, env) {

    const url =
        `https://api.schwabapi.com/marketdata/v1/pricehistory` +
        `?symbol=${encodeURIComponent(symbol)}` +
        `&periodType=day` +
        `&period=${period}` +
        `&frequencyType=daily` +
        `&frequency=1`;

    return authorizedFetch(url, env);

}