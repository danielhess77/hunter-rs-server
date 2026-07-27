import { watchlists } from "./watchlists.js";
import { sectorMap } from "./sectors.js";

import {
    getBenchmarks
} from "./engines/marketBenchmarkEngine.js";

import {
    calculateRelativeStrength
} from "./engines/relativeStrengthEngine.js";

export async function scanRSHandler(request, env) {

    const url = new URL(request.url);

    const watchlistName =
        url.searchParams.get("watchlist");

    const timeframe =
        url.searchParams.get("timeframe") ?? "3Day";

    const symbols =
        watchlists[watchlistName];

    if (!symbols) {

        return Response.json(
            { error: "Unknown watchlist" },
            { status: 404 }
        );

    }

    //
    // Build benchmark list
    //

    const benchmarkList = [
        "SPY",
        "QQQ"
    ];

    for (const symbol of symbols) {

        const sector =
            sectorMap[symbol];

        if (sector) {

            benchmarkList.push(sector);

        }

    }

    //
    // Fetch all benchmarks once
    //

    const benchmarks =
        await getBenchmarks(
            benchmarkList,
            env,
            timeframe
    );

    //
    // Calculate RS in parallel
    //

    const promises =
        symbols.map(symbol =>
            calculateRelativeStrength(
                symbol,
                env,
                benchmarks,
                timeframe
    )
        );

    const results =
        await Promise.all(promises);

    

    //
    // Sort by SPY 5-Day RS
    //

    results.sort((a, b) => {

        const aRS =
        a.benchmarks?.SPY?.[timeframe]?.relativeStrength ?? 0;

        const bRS =
        b.benchmarks?.SPY?.[timeframe]?.relativeStrength ?? 0;

        return bRS - aRS;

});

    return Response.json(results);

}