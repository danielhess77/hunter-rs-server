import { getHistory } from "../schwabClient.js";

function percentChange(current, previous) {
    return ((current - previous) / previous) * 100;
}

function calculateReturn(candles, days) {

    const current = candles.at(-1).close;
    const previous = candles.at(-(days + 1)).close;

    return percentChange(current, previous);

}

function calculatePeriod(stockCandles, spyCandles, days) {

    const stockReturn = calculateReturn(stockCandles, days);
    const spyReturn = calculateReturn(spyCandles, days);

    return {
        stockReturn,
        spyReturn,
        vsSpy: stockReturn - spyReturn
    };

}

export async function calculateRelativeStrength(symbol, env) {

    const stockResponse = await getHistory(symbol, env);
    const spyResponse = await getHistory("SPY", env);

    const stock = await stockResponse.json();
    const spy = await spyResponse.json();

    return {

        symbol,

        "3Day": calculatePeriod(
            stock.candles,
            spy.candles,
            3
        ),

        "5Day": calculatePeriod(
            stock.candles,
            spy.candles,
            5
        ),

        "10Day": calculatePeriod(
            stock.candles,
            spy.candles,
            10
        )

    };

}