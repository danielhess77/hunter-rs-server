import { calculateRelativeStrength } from "./engines/relativeStrengthEngine.js";

export async function relativeStrengthHandler(request, env) {

    const url = new URL(request.url);

    const symbol = url.searchParams.get("symbol");

    if (!symbol) {

        return Response.json(
            { error: "Missing symbol" },
            { status: 400 }
        );

    }

    const result =
        await calculateRelativeStrength(symbol, env);

    return Response.json(result);

}