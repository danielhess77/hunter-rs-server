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