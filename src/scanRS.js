import { watchlists } from "./watchlists.js";
import { calculateRelativeStrength } from "./engines/relativeStrengthEngine.js";

export async function scanRSHandler(request, env) {

    const url = new URL(request.url);

    const name = url.searchParams.get("watchlist");

    const symbols = watchlists[name];

    if (!symbols) {

        return Response.json(
            { error: "Unknown watchlist" },
            { status: 404 }
        );

    }

    const results = [];

    for (const symbol of symbols) {

        const rs = await calculateRelativeStrength(symbol, env);

        results.push(rs);

    }

    results.sort(
        (a, b) => b["5Day"].vsSpy - a["5Day"].vsSpy
    );

    return Response.json(results);

}