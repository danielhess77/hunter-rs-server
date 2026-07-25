import { getHistory } from "./schwabClient.js";

export async function historyHandler(request, env) {

    const url = new URL(request.url);

    const symbol =
        url.searchParams.get("symbol");

    const period =
        url.searchParams.get("period") || "30";

    if (!symbol) {

        return Response.json({
            error: "Missing symbol"
        }, {
            status: 400
        });

    }

    const response =
        await getHistory(symbol, period, env);

    return new Response(

        await response.text(),

        {
            status: response.status,
            headers: {
                "Content-Type": "application/json"
            }
        }

    );

}