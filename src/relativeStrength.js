import { getHistory } from "./schwabClient.js";

function percentChange(current, previous) {
    return ((current - previous) / previous) * 100;
}

function grade(diff) {

    if (diff >= 5) return "A+";
    if (diff >= 3) return "A";
    if (diff >= 1) return "B";
    if (diff >= -1) return "Watchlist";

    return "Pass";
}

function calculatePeriod(stockCandles, spyCandles, days) {

    const stockNow =
        stockCandles.at(-1).close;

    const stockPast =
        stockCandles.at(-(days + 1)).close;

    const spyNow =
        spyCandles.at(-1).close;

    const spyPast =
        spyCandles.at(-(days + 1)).close;

    const stockReturn =
        percentChange(stockNow, stockPast);

    const spyReturn =
        percentChange(spyNow, spyPast);

    return grade(
        stockReturn - spyReturn
    );

}

export async function relativeStrengthHandler(request, env) {

    const url =
        new URL(request.url);

    const symbol =
        url.searchParams.get("symbol");

    if (!symbol) {

        return Response.json({
            error: "Missing symbol"
        }, { status: 400 });

    }

    const stockResponse =
        await getHistory(symbol, env);

    const spyResponse =
        await getHistory("SPY", env);

    const stock =
        await stockResponse.json();

    const spy =
        await spyResponse.json();

    return Response.json({

        symbol,

        "3Day":
            calculatePeriod(
                stock.candles,
                spy.candles,
                3
            ),

        "5Day":
            calculatePeriod(
                stock.candles,
                spy.candles,
                5
            ),

        "10Day":
            calculatePeriod(
                stock.candles,
                spy.candles,
                10
            )

    });

}