import { watchlists } from "./watchlists.js";

import {
    calculateRelativeStrength,
    getBenchmarkHistory
} from "./engines/relativeStrengthEngine.js";

export async function scanRSHandler(request, env) {

    const url = new URL(request.url);

    const name =
        url.searchParams.get("watchlist");

    const symbols =
        watchlists[name];

    if (!symbols) {

        return Response.json(
            { error: "Unknown watchlist" },
            { status: 404 }
        );

    }

    const benchmark =
        "SPY";

    const benchmarkHistory =
        await getBenchmarkHistory(
            benchmark,
            env
        );

    const promises =
        symbols.map(symbol =>
            calculateRelativeStrength(
                symbol,
                env,
                benchmarkHistory,
                benchmark
            )
        );

    const results =
        await Promise.all(promises);

    results.sort(
        (a, b) =>
            b["5Day"].relativeStrength -
            a["5Day"].relativeStrength
    );

    return Response.json(results);

}