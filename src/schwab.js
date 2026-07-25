import { generateState, basicAuthHeader } from "./oauth.js";

const AUTHORIZE =
"https://api.schwabapi.com/v1/oauth/authorize";

const TOKEN =
"https://api.schwabapi.com/v1/oauth/token";

const MARKET =
"https://api.schwabapi.com/marketdata/v1";

export async function loginHandler(env) {

    const state = generateState();

    await env.HUNTER_AUTH.put(
        "oauth_state",
        state
    );

    const params = new URLSearchParams({

        response_type: "code",

        client_id: env.SCHWAB_CLIENT_ID,

        redirect_uri: env.SCHWAB_REDIRECT_URI,

        state

    });

    return Response.redirect(
        `${AUTHORIZE}?${params}`,
        302
    );

}

export async function callbackHandler(request, env) {

    const url = new URL(request.url);

    const code = url.searchParams.get("code");

    const state = url.searchParams.get("state");

    const expected =
        await env.HUNTER_AUTH.get("oauth_state");

    if (state !== expected) {

        return new Response(
            "Invalid state",
            { status:400 }
        );

    }

    const auth =
        await basicAuthHeader(
            env.SCHWAB_CLIENT_ID,
            env.SCHWAB_CLIENT_SECRET
        );

    const body =
        new URLSearchParams({

            grant_type:
            "authorization_code",

            code,

            redirect_uri:
            env.SCHWAB_REDIRECT_URI

        });

    const response =
        await fetch(TOKEN,{

            method:"POST",

            headers:{

                Authorization:auth,

                "Content-Type":
                "application/x-www-form-urlencoded"

            },

            body

        });

    const token =
        await response.json();

    if (!response.ok) {

        return Response.json(token,{
            status:500
        });

    }

    await env.HUNTER_AUTH.put(

        "tokens",

        JSON.stringify(token)

    );

    return Response.json({

        success:true,

        expires:
        token.expires_in

    });

}

async function accessToken(env){

    const raw =
        await env.HUNTER_AUTH.get("tokens");

    if(!raw)
        throw new Error("No tokens");

    const token =
        JSON.parse(raw);

    return token.access_token;

}

export async function quoteHandler(request,env){

    const url =
        new URL(request.url);

    const symbol =
        url.searchParams.get("symbol");

    if(!symbol){

        return Response.json({

            error:"Missing symbol"

        },{

            status:400

        });

    }

    const access =
        await accessToken(env);

    const response =
        await fetch(

        `${MARKET}/quotes?symbols=${symbol}`,

        {

            headers:{

                Authorization:
                `Bearer ${access}`

            }

        });

    return new Response(

        await response.text(),

        {

            headers:{

                "Content-Type":
                "application/json"

            }

        }

    );

}