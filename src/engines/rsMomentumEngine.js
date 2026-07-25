export function calculateRSMomentum(benchmarkResults) {

    const periods = [
        "3Day",
        "5Day",
        "10Day"
    ];

    const momentum = {};

    for (const [benchmark, data] of Object.entries(benchmarkResults)) {

        const rs3 = data["3Day"].relativeStrength;
        const rs5 = data["5Day"].relativeStrength;
        const rs10 = data["10Day"].relativeStrength;

        const shortTerm =
            rs3 - rs5;

        const mediumTerm =
            rs5 - rs10;

        const totalMomentum =
            shortTerm + mediumTerm;

        let trend;

        if (totalMomentum > 2) {

            trend = "Strongly Improving";

        } else if (totalMomentum > 0.5) {

            trend = "Improving";

        } else if (totalMomentum < -2) {

            trend = "Strongly Weakening";

        } else if (totalMomentum < -0.5) {

            trend = "Weakening";

        } else {

            trend = "Stable";

        }

        momentum[benchmark] = {

            shortTerm,

            mediumTerm,

            totalMomentum,

            trend

        };

    }

    return momentum;

}