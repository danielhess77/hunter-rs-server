import { authorizedFetch } from "./schwabClient.js";
import { jsonResponse } from "./utils.js";

const WATCHLIST_URL =
    "https://api.schwabapi.com/trader/v1/watchlists";

export async function getWatchlistsHandler(request, env) {

    const response =
        await authorizedFetch(
            WATCHLIST_URL,
            env
        );

    const body =
        await response.text();

    return new Response(body, {

        status: response.status,

        headers: {
            "Content-Type": "application/json"
        }

    });

}