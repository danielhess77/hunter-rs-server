import { getHistory } from "./schwabClient.js";

export async function historyHandler(request, env) {

    try {

        const url = new URL(request.url);

        const symbol = url.searchParams.get("symbol");
        const period = url.searchParams.get("period") || "30";

        if (!symbol) {
            return Response.json({ error: "Missing symbol" }, { status: 400 });
        }

        const response = await getHistory(symbol, period, env);

        const text = await response.text();

        return Response.json({
            status: response.status,
            body: text
        });

    } catch (err) {

        return Response.json({
            error: err.message,
            stack: err.stack
        }, { status: 500 });

    }

}