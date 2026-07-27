import { getHistory } from "../schwabClient.js";

export async function getBenchmark(symbol, env, timeframe = "3Day") {

    const response = await getHistory(symbol, env, timeframe);

    return await response.json();

}

export async function getBenchmarks(symbols, env, timeframe = "3Day") {

    // Remove duplicates
    const uniqueSymbols = [...new Set(symbols)];

    // Fetch all benchmarks in parallel
    const requests = uniqueSymbols.map(async (symbol) => {

        const history = await getBenchmark(
            symbol,
            env,
            timeframe
);

        return [symbol, history];

    });

    const results = await Promise.all(requests);

    // Convert to object:
    // {
    //   SPY: {...},
    //   QQQ: {...},
    //   SMH: {...}
    // }

    return Object.fromEntries(results);

}