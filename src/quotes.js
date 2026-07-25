import {
    authorizedFetch
} from "./schwabClient.js";

const QUOTE_URL =
    "https://api.schwabapi.com/marketdata/v1/quotes";

export async function quoteHandler(request, env) {

    const url =
        new URL(request.url);

    const symbol =
        url.searchParams.get("symbol");

    if (!symbol) {

        return Response.json({

            error: "Missing symbol"

        }, {

            status: 400

        });

    }

    const response =
        await authorizedFetch(

            `${QUOTE_URL}?symbols=${encodeURIComponent(symbol)}`,

            env

        );

    return new Response(

        await response.text(),

        {

            status: response.status,

            headers: {

                "Content-Type":
                    "application/json"

            }

        }

    );

}