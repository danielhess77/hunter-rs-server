const AUTHORIZE_URL = "https://api.schwabapi.com/v1/oauth/authorize";
const TOKEN_URL = "https://api.schwabapi.com/v1/oauth/token";

import { jsonResponse } from "./utils.js";

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

    const expectedState =
        await env.HUNTER_AUTH.get("oauth_state");

    if (!code) {

        return jsonResponse({
            error: "Missing authorization code"
        }, 400);

    }

    if (state !== expectedState) {

        return jsonResponse({
            error: "Invalid OAuth state"
        }, 400);

    }

    const credentials = btoa(
        `${env.SCHWAB_CLIENT_ID}:${env.SCHWAB_CLIENT_SECRET}`
    );

    const response = await fetch(TOKEN_URL, {

        method: "POST",

        headers: {

            Authorization: `Basic ${credentials}`,

            "Content-Type":
                "application/x-www-form-urlencoded"

        },

        body: new URLSearchParams({

            grant_type: "authorization_code",

            code,

            redirect_uri:
                env.SCHWAB_REDIRECT_URI

        })

    });

    const token = await response.json();

    if (!response.ok) {

        return jsonResponse(
            token,
            response.status
        );

    }

    await env.HUNTER_AUTH.put(
        "tokens",
        JSON.stringify(token)
    );

    return jsonResponse({

        success: true,

        expires: token.expires_in

    });

}