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

export async function getSpyHistory(env) {

    const response = await getHistory("SPY", env);
    return await response.json();

}

export async function calculateRelativeStrength(symbol, env, spyHistory = null) {

    const stockResponse = await getHistory(symbol, env);

    const stock = await stockResponse.json();

    const spy =
        spyHistory ??
        await getSpyHistory(env);

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