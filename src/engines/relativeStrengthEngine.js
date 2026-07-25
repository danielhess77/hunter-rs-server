import { getHistory } from "../schwabClient.js";
import { sectorMap } from "../sectors.js";
import { calculateRSMomentum } from "./rsMomentumEngine.js";

function percentChange(current, previous) {

    return ((current - previous) / previous) * 100;

}

function calculateReturn(candles, days) {

    const current =
        candles.at(-1).close;

    const previous =
        candles.at(-(days + 1)).close;

    return percentChange(
        current,
        previous
    );

}

function calculatePeriod(
    stockCandles,
    benchmarkCandles,
    days
) {

    const stockReturn =
        calculateReturn(
            stockCandles,
            days
        );

    const benchmarkReturn =
        calculateReturn(
            benchmarkCandles,
            days
        );

    return {

        stockReturn,

        benchmarkReturn,

        relativeStrength:
            stockReturn -
            benchmarkReturn

    };

}

function buildBenchmarkResult(
    stockCandles,
    benchmarkCandles
) {

    return {

        "3Day": calculatePeriod(
            stockCandles,
            benchmarkCandles,
            3
        ),

        "5Day": calculatePeriod(
            stockCandles,
            benchmarkCandles,
            5
        ),

        "10Day": calculatePeriod(
            stockCandles,
            benchmarkCandles,
            10
        )

    };

}

export async function calculateRelativeStrength(
    symbol,
    env,
    benchmarks
) {

    const response =
        await getHistory(
            symbol,
            env
        );

    const stock =
        await response.json();

    const output = {

        symbol,

        benchmarks: {}

    };

    //
    // Always compare against SPY
    //

    output.benchmarks.SPY =
        buildBenchmarkResult(
            stock.candles,
            benchmarks.SPY.candles
        );

    //
    // Always compare against QQQ
    //

    output.benchmarks.QQQ =
        buildBenchmarkResult(
            stock.candles,
            benchmarks.QQQ.candles
        );

    //
    // Compare against sector ETF if available
    //

    const sector =
        sectorMap[symbol];

    if (
        sector &&
        benchmarks[sector]
    ) {

        output.benchmarks[sector] =
            buildBenchmarkResult(
                stock.candles,
                benchmarks[sector].candles
            );

    }

    output.momentum =
    calculateRSMomentum(
        output.benchmarks
    );
    
    return output;

}