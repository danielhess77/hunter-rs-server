/**
 * Institutional Map Engine
 * Version: 2.0.0
 *
 * Purpose:
 * - Interpret Hunter's canonical MarketState nodes.
 * - Identify King Node, Floor, Ceiling, Gatekeepers,
 *   Fortresses, nearby institutional levels, and regimes.
 * - Preserve Gamma and Vanna as separate evidence.
 *
 * Compatibility:
 * The engine returns an enriched Array of nodes so existing
 * Structure Engine code can continue using array methods.
 *
 * The returned array also exposes:
 * - result.nodes
 * - result.kingNode / result.king
 * - result.floor
 * - result.ceiling
 * - result.gatekeepers
 * - result.fortress
 * - result.nearestNode
 * - result.nearbyNodes
 * - result.gammaRegime
 * - result.vannaRegime
 * - result.statistics
 *
 * Important:
 * This engine does not parse raw Skylit data.
 * MatrixParser and NodeClassifier are no longer required.
 */

class InstitutionalMapEngine {

    constructor(config = {}) {

        this.version = "2.0.0";
        this.name = "Institutional Map Engine";

        this.config = {
            gatekeeperRatio: 0.30,
            nearbyStrikeDistance: 2,
            fortressMinimumNodes: 3,
            fortressMaximumGapMultiplier: 1.25,
            dominantRegimeRatio: 1.20,
            ...config
        };

    }

    /**
     * Analyze canonical MarketState.
     *
     * @param {Object} marketState HunterMarketState v2.0
     * @returns {Array} Enriched node array
     */
    analyze(marketState) {

        if (
            !marketState ||
            marketState.valid === false
        ) {
            return this.unavailable(
                marketState?.reason ??
                "Canonical MarketState is unavailable."
            );
        }

        const spot =
            this.firstFinite(
                marketState.currentSpot,
                marketState.spot
            );

        const sourceNodes =
            Array.isArray(marketState.nodes)
                ? marketState.nodes
                : [];

        if (
            !Number.isFinite(spot) ||
            sourceNodes.length === 0
        ) {
            return this.unavailable(
                "Institutional Map cannot be built without spot and canonical nodes."
            );
        }

        const strikeStep =
            this.inferStrikeStep(
                sourceNodes
                    .map(node => Number(node.strike))
                    .filter(Number.isFinite)
            );

        const nodes =
            sourceNodes
                .map(node =>
                    this.normalizeNode(
                        node,
                        spot,
                        strikeStep
                    )
                )
                .filter(Boolean)
                .sort(
                    (a, b) =>
                        a.strike - b.strike
                );

        if (nodes.length === 0) {
            return this.unavailable(
                "Canonical node collection contained no valid strikes."
            );
        }

        const kingNode =
            this.selectKingNode(nodes);

        const gatekeeperThreshold =
            kingNode
                ? kingNode.gammaMagnitude *
                  this.config.gatekeeperRatio
                : 0;

        const floor =
            this.selectFloor(
                nodes,
                spot
            );

        const ceiling =
            this.selectCeiling(
                nodes,
                spot
            );

        const gatekeepers =
            this.selectGatekeepers(
                nodes,
                kingNode,
                gatekeeperThreshold
            );

        const nearestNode =
            this.selectNearestMajorNode({
                nodes,
                kingNode,
                floor,
                ceiling,
                gatekeepers,
                spot
            });

        const nearbyNodes =
            this.selectNearbyNodes(
                nodes,
                spot,
                strikeStep
            );

        const fortresses =
            this.detectFortresses(
                nodes,
                strikeStep,
                spot
            );

        const fortress =
            this.selectPrimaryFortress(
                fortresses,
                spot
            );

        const gammaRegime =
            this.classifyGammaRegime(
                nodes,
                spot
            );

        const vannaRegime =
            this.classifyVannaRegime(
                nodes,
                spot
            );

        const statistics =
            this.buildStatistics({
                nodes,
                spot,
                strikeStep,
                kingNode,
                floor,
                ceiling,
                gatekeepers,
                nearbyNodes,
                fortresses,
                gammaRegime,
                vannaRegime
            });

        this.assignRoles({
            nodes,
            kingNode,
            floor,
            ceiling,
            gatekeepers,
            fortresses
        });

        return this.enrichResult(nodes, {
            available: true,
            dataStatus: "READY",
            reason: null,
            version: this.version,
            symbol:
                marketState.symbol ??
                null,
            spot,
            strikeStep,
            expirations:
                Array.isArray(
                    marketState.expirations
                )
                    ? [...marketState.expirations]
                    : [],
            kingNode,
            king: kingNode,
            floor,
            ceiling,
            gatekeepers,
            gatekeeperThreshold,
            fortress,
            fortresses,
            nearestNode,
            nearbyNodes,
            gammaRegime,
            vannaRegime,
            statistics,
            diagnostics: {
                canonicalNodeCount:
                    sourceNodes.length,
                analyzedNodeCount:
                    nodes.length,
                gammaSeparated: true,
                vannaSeparated: true,
                matrixParserRetired: true,
                nodeClassifierRetired: true
            }
        });

    }

    normalizeNode(
        node,
        spot,
        strikeStep
    ) {

        if (
            !node ||
            typeof node !== "object"
        ) {
            return null;
        }

        const strike =
            Number(node.strike);

        if (!Number.isFinite(strike)) {
            return null;
        }

        const gammaByExpiration =
            this.copyNumericArray(
                node.gammaByExpiration
            );

        const vannaByExpiration =
            this.copyNumericArray(
                node.vannaByExpiration
            );

        const totalGamma =
            this.firstFinite(
                node.totalGamma,
                node.gammaSigned,
                this.sumSigned(
                    gammaByExpiration
                )
            ) ?? 0;

        const totalVanna =
            this.firstFinite(
                node.totalVanna,
                node.vannaSigned,
                this.sumSigned(
                    vannaByExpiration
                )
            ) ?? 0;

        const gammaMagnitude =
            this.firstFinite(
                node.gammaMagnitude,
                this.sumMagnitude(
                    gammaByExpiration
                )
            ) ?? 0;

        const vannaMagnitude =
            this.firstFinite(
                node.vannaMagnitude,
                this.sumMagnitude(
                    vannaByExpiration
                )
            ) ?? 0;

        const distance =
            strike - spot;

        const distanceInStrikes =
            strikeStep > 0
                ? distance / strikeStep
                : null;

        return {
            ...node,

            strike,

            totalGamma,
            totalVanna,

            gammaSigned:
                totalGamma,

            vannaSigned:
                totalVanna,

            gammaMagnitude,
            vannaMagnitude,

            gammaByExpiration,
            vannaByExpiration,

            distanceFromSpot:
                distance,

            absoluteDistanceFromSpot:
                Math.abs(distance),

            distanceInStrikes,

            absoluteDistanceInStrikes:
                Number.isFinite(
                    distanceInStrikes
                )
                    ? Math.abs(
                        distanceInStrikes
                    )
                    : null,

            sideOfSpot:
                strike < spot
                    ? "BELOW"
                    : strike > spot
                        ? "ABOVE"
                        : "AT_SPOT",

            gammaSign:
                this.signLabel(
                    totalGamma
                ),

            vannaSign:
                this.signLabel(
                    totalVanna
                ),

            supportCandidate:
                strike <= spot,

            resistanceCandidate:
                strike >= spot,

            role:
                "NODE",

            roles:
                [],

            state:
                node.state ??
                "UNKNOWN"
        };

    }

    selectKingNode(nodes) {

        return [...nodes]
            .sort((a, b) => {

                if (
                    b.gammaMagnitude !==
                    a.gammaMagnitude
                ) {
                    return (
                        b.gammaMagnitude -
                        a.gammaMagnitude
                    );
                }

                return (
                    Math.abs(b.totalGamma) -
                    Math.abs(a.totalGamma)
                );

            })[0] ?? null;

    }

    selectFloor(
        nodes,
        spot
    ) {

        const candidates =
            nodes.filter(
                node =>
                    node.strike <= spot
            );

        if (candidates.length === 0) {
            return null;
        }

        return [...candidates]
            .sort((a, b) => {

                if (
                    b.gammaMagnitude !==
                    a.gammaMagnitude
                ) {
                    return (
                        b.gammaMagnitude -
                        a.gammaMagnitude
                    );
                }

                return (
                    b.strike -
                    a.strike
                );

            })[0];

    }

    selectCeiling(
        nodes,
        spot
    ) {

        const candidates =
            nodes.filter(
                node =>
                    node.strike >= spot
            );

        if (candidates.length === 0) {
            return null;
        }

        return [...candidates]
            .sort((a, b) => {

                if (
                    b.gammaMagnitude !==
                    a.gammaMagnitude
                ) {
                    return (
                        b.gammaMagnitude -
                        a.gammaMagnitude
                    );
                }

                return (
                    a.strike -
                    b.strike
                );

            })[0];

    }

    selectGatekeepers(
        nodes,
        kingNode,
        threshold
    ) {

        if (!kingNode) {
            return [];
        }

        return nodes
            .filter(
                node =>
                    node !== kingNode &&
                    node.gammaMagnitude >=
                    threshold
            )
            .sort(
                (a, b) =>
                    a.strike - b.strike
            );

    }

    selectNearestMajorNode({
        nodes,
        kingNode,
        floor,
        ceiling,
        gatekeepers,
        spot
    }) {

        const major =
            [
                kingNode,
                floor,
                ceiling,
                ...gatekeepers
            ]
                .filter(Boolean);

        const unique =
            this.uniqueNodes(
                major.length > 0
                    ? major
                    : nodes
            );

        return [...unique]
            .sort(
                (a, b) =>
                    Math.abs(
                        a.strike - spot
                    ) -
                    Math.abs(
                        b.strike - spot
                    )
            )[0] ?? null;

    }

    selectNearbyNodes(
        nodes,
        spot,
        strikeStep
    ) {

        const maximumDistance =
            strikeStep *
            this.config.nearbyStrikeDistance;

        return nodes
            .filter(
                node =>
                    Math.abs(
                        node.strike - spot
                    ) <=
                    maximumDistance
            )
            .sort(
                (a, b) =>
                    Math.abs(
                        a.strike - spot
                    ) -
                    Math.abs(
                        b.strike - spot
                    )
            );

    }

    detectFortresses(
        nodes,
        strikeStep,
        spot
    ) {

        const positive =
            nodes.filter(
                node =>
                    node.totalGamma > 0
            );

        if (
            positive.length <
            this.config.fortressMinimumNodes
        ) {
            return [];
        }

        const groups = [];
        let current = [];

        for (const node of positive) {

            if (current.length === 0) {
                current.push(node);
                continue;
            }

            const previous =
                current[
                    current.length - 1
                ];

            const gap =
                node.strike -
                previous.strike;

            const allowedGap =
                strikeStep *
                this.config
                    .fortressMaximumGapMultiplier;

            if (gap <= allowedGap) {
                current.push(node);
            } else {
                if (
                    current.length >=
                    this.config
                        .fortressMinimumNodes
                ) {
                    groups.push(
                        this.buildFortress(
                            current,
                            spot
                        )
                    );
                }

                current = [node];
            }

        }

        if (
            current.length >=
            this.config
                .fortressMinimumNodes
        ) {
            groups.push(
                this.buildFortress(
                    current,
                    spot
                )
            );
        }

        return groups;

    }

    buildFortress(
        nodes,
        spot
    ) {

        const sorted =
            [...nodes].sort(
                (a, b) =>
                    a.strike - b.strike
            );

        const lower =
            sorted[0].strike;

        const upper =
            sorted[
                sorted.length - 1
            ].strike;

        const totalGamma =
            sorted.reduce(
                (sum, node) =>
                    sum +
                    node.totalGamma,
                0
            );

        const gammaMagnitude =
            sorted.reduce(
                (sum, node) =>
                    sum +
                    node.gammaMagnitude,
                0
            );

        const totalVanna =
            sorted.reduce(
                (sum, node) =>
                    sum +
                    node.totalVanna,
                0
            );

        const location =
            upper < spot
                ? "BELOW_SPOT"
                : lower > spot
                    ? "ABOVE_SPOT"
                    : "AROUND_SPOT";

        return {
            available: true,
            lowerStrike: lower,
            upperStrike: upper,
            nodeCount:
                sorted.length,
            nodes: sorted,
            totalGamma,
            gammaMagnitude,
            totalVanna,
            location,
            bias:
                location === "BELOW_SPOT"
                    ? "SUPPORT"
                    : location === "ABOVE_SPOT"
                        ? "RESISTANCE"
                        : "PINNING"
        };

    }

    selectPrimaryFortress(
        fortresses,
        spot
    ) {

        if (
            !Array.isArray(fortresses) ||
            fortresses.length === 0
        ) {
            return {
                available: false,
                reason:
                    "No qualifying fortress detected."
            };
        }

        return [...fortresses]
            .sort((a, b) => {

                const aDistance =
                    this.distanceToRange(
                        spot,
                        a.lowerStrike,
                        a.upperStrike
                    );

                const bDistance =
                    this.distanceToRange(
                        spot,
                        b.lowerStrike,
                        b.upperStrike
                    );

                if (
                    aDistance !==
                    bDistance
                ) {
                    return (
                        aDistance -
                        bDistance
                    );
                }

                return (
                    b.gammaMagnitude -
                    a.gammaMagnitude
                );

            })[0];

    }

    classifyGammaRegime(
        nodes,
        spot
    ) {

        const below =
            nodes.filter(
                node =>
                    node.strike < spot
            );

        const above =
            nodes.filter(
                node =>
                    node.strike > spot
            );

        const positiveMagnitude =
            nodes.reduce(
                (sum, node) =>
                    sum +
                    (
                        node.totalGamma > 0
                            ? node.gammaMagnitude
                            : 0
                    ),
                0
            );

        const negativeMagnitude =
            nodes.reduce(
                (sum, node) =>
                    sum +
                    (
                        node.totalGamma < 0
                            ? node.gammaMagnitude
                            : 0
                    ),
                0
            );

        const belowMagnitude =
            below.reduce(
                (sum, node) =>
                    sum +
                    node.gammaMagnitude,
                0
            );

        const aboveMagnitude =
            above.reduce(
                (sum, node) =>
                    sum +
                    node.gammaMagnitude,
                0
            );

        let signRegime =
            "MIXED";

        if (
            positiveMagnitude >
            negativeMagnitude *
            this.config.dominantRegimeRatio
        ) {
            signRegime =
                "POSITIVE";
        } else if (
            negativeMagnitude >
            positiveMagnitude *
            this.config.dominantRegimeRatio
        ) {
            signRegime =
                "NEGATIVE";
        }

        let directionalBalance =
            "BALANCED";

        if (
            aboveMagnitude >
            belowMagnitude *
            this.config.dominantRegimeRatio
        ) {
            directionalBalance =
                "ABOVE_SPOT_DOMINANT";
        } else if (
            belowMagnitude >
            aboveMagnitude *
            this.config.dominantRegimeRatio
        ) {
            directionalBalance =
                "BELOW_SPOT_DOMINANT";
        }

        return {
            signRegime,
            directionalBalance,
            positiveMagnitude,
            negativeMagnitude,
            aboveMagnitude,
            belowMagnitude,
            netGamma:
                nodes.reduce(
                    (sum, node) =>
                        sum +
                        node.totalGamma,
                    0
                )
        };

    }

    classifyVannaRegime(
        nodes,
        spot
    ) {

        const positiveMagnitude =
            nodes.reduce(
                (sum, node) =>
                    sum +
                    (
                        node.totalVanna > 0
                            ? node.vannaMagnitude
                            : 0
                    ),
                0
            );

        const negativeMagnitude =
            nodes.reduce(
                (sum, node) =>
                    sum +
                    (
                        node.totalVanna < 0
                            ? node.vannaMagnitude
                            : 0
                    ),
                0
            );

        const aboveMagnitude =
            nodes
                .filter(
                    node =>
                        node.strike > spot
                )
                .reduce(
                    (sum, node) =>
                        sum +
                        node.vannaMagnitude,
                    0
                );

        const belowMagnitude =
            nodes
                .filter(
                    node =>
                        node.strike < spot
                )
                .reduce(
                    (sum, node) =>
                        sum +
                        node.vannaMagnitude,
                    0
                );

        let signRegime =
            "MIXED";

        if (
            positiveMagnitude >
            negativeMagnitude *
            this.config.dominantRegimeRatio
        ) {
            signRegime =
                "POSITIVE";
        } else if (
            negativeMagnitude >
            positiveMagnitude *
            this.config.dominantRegimeRatio
        ) {
            signRegime =
                "NEGATIVE";
        }

        let directionalBalance =
            "BALANCED";

        if (
            aboveMagnitude >
            belowMagnitude *
            this.config.dominantRegimeRatio
        ) {
            directionalBalance =
                "ABOVE_SPOT_DOMINANT";
        } else if (
            belowMagnitude >
            aboveMagnitude *
            this.config.dominantRegimeRatio
        ) {
            directionalBalance =
                "BELOW_SPOT_DOMINANT";
        }

        return {
            signRegime,
            directionalBalance,
            positiveMagnitude,
            negativeMagnitude,
            aboveMagnitude,
            belowMagnitude,
            netVanna:
                nodes.reduce(
                    (sum, node) =>
                        sum +
                        node.totalVanna,
                    0
                )
        };

    }

    assignRoles({
        nodes,
        kingNode,
        floor,
        ceiling,
        gatekeepers,
        fortresses
    }) {

        for (const node of nodes) {
            node.role = "NODE";
            node.roles = [];
        }

        this.addRole(
            kingNode,
            "KING"
        );

        this.addRole(
            floor,
            "FLOOR"
        );

        this.addRole(
            ceiling,
            "CEILING"
        );

        for (const node of gatekeepers) {
            this.addRole(
                node,
                "GATEKEEPER"
            );
        }

        for (const fortress of fortresses) {
            for (const node of fortress.nodes) {
                this.addRole(
                    node,
                    "FORTRESS"
                );
            }
        }

        for (const node of nodes) {

            node.role =
                this.primaryRole(
                    node.roles
                );

        }

    }

    addRole(
        node,
        role
    ) {

        if (!node) {
            return;
        }

        if (
            !Array.isArray(node.roles)
        ) {
            node.roles = [];
        }

        if (
            !node.roles.includes(role)
        ) {
            node.roles.push(role);
        }

    }

    primaryRole(roles) {

        const priority = [
            "KING",
            "FLOOR",
            "CEILING",
            "GATEKEEPER",
            "FORTRESS",
            "NODE"
        ];

        return priority.find(
            role =>
                roles.includes(role)
        ) ?? "NODE";

    }

    buildStatistics({
        nodes,
        spot,
        strikeStep,
        kingNode,
        floor,
        ceiling,
        gatekeepers,
        nearbyNodes,
        fortresses,
        gammaRegime,
        vannaRegime
    }) {

        return {
            nodeCount:
                nodes.length,

            spot,

            strikeStep,

            kingStrike:
                kingNode?.strike ??
                null,

            floorStrike:
                floor?.strike ??
                null,

            ceilingStrike:
                ceiling?.strike ??
                null,

            gatekeeperCount:
                gatekeepers.length,

            nearbyNodeCount:
                nearbyNodes.length,

            fortressCount:
                fortresses.length,

            totalGamma:
                nodes.reduce(
                    (sum, node) =>
                        sum +
                        node.totalGamma,
                    0
                ),

            totalGammaMagnitude:
                nodes.reduce(
                    (sum, node) =>
                        sum +
                        node.gammaMagnitude,
                    0
                ),

            totalVanna:
                nodes.reduce(
                    (sum, node) =>
                        sum +
                        node.totalVanna,
                    0
                ),

            totalVannaMagnitude:
                nodes.reduce(
                    (sum, node) =>
                        sum +
                        node.vannaMagnitude,
                    0
                ),

            gammaRegime:
                gammaRegime.signRegime,

            vannaRegime:
                vannaRegime.signRegime
        };

    }

    enrichResult(
        nodes,
        metadata
    ) {

        /*
         * Arrays can carry named properties in JavaScript.
         * This preserves old callers that expect Array methods
         * while exposing the full v2.0 institutional map.
         */
        Object.assign(
            nodes,
            metadata
        );

        nodes.nodes = nodes;

        return nodes;

    }

    unavailable(reason) {

        const nodes = [];

        return this.enrichResult(
            nodes,
            {
                available: false,
                dataStatus:
                    "UNAVAILABLE",
                reason,
                version:
                    this.version,
                symbol: null,
                spot: null,
                strikeStep: null,
                expirations: [],
                kingNode: null,
                king: null,
                floor: null,
                ceiling: null,
                gatekeepers: [],
                gatekeeperThreshold: 0,
                fortress: {
                    available: false,
                    reason:
                        "Institutional map unavailable."
                },
                fortresses: [],
                nearestNode: null,
                nearbyNodes: [],
                gammaRegime: {
                    signRegime:
                        "UNAVAILABLE",
                    directionalBalance:
                        "UNAVAILABLE",
                    positiveMagnitude: 0,
                    negativeMagnitude: 0,
                    aboveMagnitude: 0,
                    belowMagnitude: 0,
                    netGamma: 0
                },
                vannaRegime: {
                    signRegime:
                        "UNAVAILABLE",
                    directionalBalance:
                        "UNAVAILABLE",
                    positiveMagnitude: 0,
                    negativeMagnitude: 0,
                    aboveMagnitude: 0,
                    belowMagnitude: 0,
                    netVanna: 0
                },
                statistics: {
                    nodeCount: 0
                },
                diagnostics: {
                    gammaSeparated: true,
                    vannaSeparated: true,
                    matrixParserRetired: true,
                    nodeClassifierRetired: true
                }
            }
        );

    }

    inferStrikeStep(strikes) {

        const sorted =
            [...new Set(strikes)]
                .sort(
                    (a, b) =>
                        a - b
                );

        const differences = [];

        for (
            let index = 1;
            index < sorted.length;
            index += 1
        ) {

            const difference =
                sorted[index] -
                sorted[index - 1];

            if (difference > 0) {
                differences.push(
                    difference
                );
            }

        }

        if (differences.length === 0) {
            return 1;
        }

        differences.sort(
            (a, b) =>
                a - b
        );

        return differences[
            Math.floor(
                differences.length / 2
            )
        ];

    }

    uniqueNodes(nodes) {

        const seen =
            new Set();

        return nodes.filter(
            node => {

                if (
                    !node ||
                    seen.has(node.strike)
                ) {
                    return false;
                }

                seen.add(
                    node.strike
                );

                return true;

            }
        );

    }

    distanceToRange(
        value,
        lower,
        upper
    ) {

        if (
            value >= lower &&
            value <= upper
        ) {
            return 0;
        }

        return Math.min(
            Math.abs(
                value - lower
            ),
            Math.abs(
                value - upper
            )
        );

    }

    signLabel(value) {

        if (value > 0) {
            return "POSITIVE";
        }

        if (value < 0) {
            return "NEGATIVE";
        }

        return "NEUTRAL";

    }

    copyNumericArray(value) {

        if (!Array.isArray(value)) {
            return [];
        }

        return value.map(
            item =>
                Number.isFinite(
                    Number(item)
                )
                    ? Number(item)
                    : 0
        );

    }

    sumSigned(values) {

        return values.reduce(
            (sum, value) =>
                sum +
                (Number(value) || 0),
            0
        );

    }

    sumMagnitude(values) {

        return values.reduce(
            (sum, value) =>
                sum +
                Math.abs(
                    Number(value) || 0
                ),
            0
        );

    }

    firstFinite(...values) {

        for (const value of values) {

            const number =
                Number(value);

            if (Number.isFinite(number)) {
                return number;
            }

        }

        return null;

    }

}

export default InstitutionalMapEngine;