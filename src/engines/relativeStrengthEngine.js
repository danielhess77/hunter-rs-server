import { getHistory } from "../schwabClient.js";

function percentChange(current, previous) {
    return ((current - previous) / previous) * 100;
}

function calculateReturn(candles, days) {

    const current = candles.at(-1).close;
    const previous = candles.at(-(days + 1)).close;

    return percentChange(current, previous);

}

function calculatePeriod(stockCandles, benchmarkCandles, days) {

    const stockReturn = calculateReturn(stockCandles, days);
    const benchmarkReturn = calculateReturn(benchmarkCandles, days);

    return {

        stockReturn,
        benchmarkReturn,
        relativeStrength: stockReturn - benchmarkReturn

    };

}

export async function getBenchmarkHistory(benchmark, env) {

    const response = await getHistory(benchmark, env);
    return await response.json();

}

export async function calculateRelativeStrength(
    symbol,
    env,
    benchmarkHistory = null,
    benchmark = "SPY"
) {

    const stockResponse =
        await getHistory(symbol, env);

    const stock =
        await stockResponse.json();

    const benchmarkData =
        benchmarkHistory ??
        await getBenchmarkHistory(
            benchmark,
            env
        );

    return {

        symbol,
        benchmark,

        "3Day": calculatePeriod(
            stock.candles,
            benchmarkData.candles,
            3
        ),

        "5Day": calculatePeriod(
            stock.candles,
            benchmarkData.candles,
            5
        ),

        "10Day": calculatePeriod(
            stock.candles,
            benchmarkData.candles,
            10
        )

    };

}