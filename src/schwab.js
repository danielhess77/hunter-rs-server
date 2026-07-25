const AUTHORIZE_URL = "https://api.schwabapi.com/v1/oauth/authorize";

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

export async function callbackHandler() {

    return Response.json({
        message: "Callback endpoint coming in Commit 2"
    });

}

export async function quoteHandler() {

    return Response.json({
        message: "Quote endpoint coming in Commit 4"
    });

}