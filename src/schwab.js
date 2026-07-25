const AUTHORIZE_URL = "https://api.schwabapi.com/v1/oauth/authorize";
const TOKEN_URL = "https://api.schwabapi.com/v1/oauth/token";
const QUOTE_URL = "https://api.schwabapi.com/marketdata/v1/quotes";

export async function loginHandler(env) {

    const state = crypto.randomUUID();

    await env.HUNTER_AUTH.put("oauth_state", state);

    const params = new URLSearchParams({
        response_type: "code",
        client_id: env.SCHWAB_CLIENT_ID,
        redirect_uri: env.SCHWAB_REDIRECT_URI,
        state
    });

    return Response.redirect(
        `${AUTHORIZE_URL}?${params.toString()}`,
        302
    );

}

export async function callbackHandler(request, env) {

    const url = new URL(request.url);

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const expectedState = await env.HUNTER_AUTH.get("oauth_state");

    if (!code) {
        return Response.json({
            error: "Missing authorization code"
        }, { status: 400 });
    }

    if (state !== expectedState) {
        return Response.json({
            error: "Invalid OAuth state"
        }, { status: 400 });
    }

    const credentials = btoa(
        `${env.SCHWAB_CLIENT_ID}:${env.SCHWAB_CLIENT_SECRET}`
    );

    const response = await fetch(TOKEN_URL, {

        method: "POST",

        headers: {
            "Authorization": `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },

        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: env.SCHWAB_REDIRECT_URI
        })

    });

    const token = await response.json();

    if (!response.ok) {
        return Response.json(token, {
            status: response.status
        });
    }

    await env.HUNTER_AUTH.put(
        "tokens",
        JSON.stringify(token)
    );

    return Response.json({
        success: true,
        message: "OAuth complete",
        expires_in: token.expires_in
    });

}

export async function quoteHandler(request, env) {

    const url = new URL(request.url);

    const symbol = url.searchParams.get("symbol");

    if (!symbol) {

        return Response.json({
            error: "Missing symbol"
        }, { status: 400 });

    }

    const raw = await env.HUNTER_AUTH.get("tokens");

    if (!raw) {

        return Response.json({
            error: "No OAuth tokens found"
        }, { status: 401 });

    }

    const tokens = JSON.parse(raw);

    const response = await fetch(

        `${QUOTE_URL}?symbols=${encodeURIComponent(symbol)}`,

        {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                Accept: "application/json"
            }
        }

    );

    const body = await response.text();

    return new Response(body, {
        status: response.status,
        headers: {
            "Content-Type": "application/json"
        }
    });

}