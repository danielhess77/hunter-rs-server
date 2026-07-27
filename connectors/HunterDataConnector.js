/**
 * Hunter Data Connector
 * Version: 2.0.0
 *
 * Purpose:
 * - Detect supported external payloads.
 * - Normalize them into Hunter's canonical MarketState shape.
 * - Build standardized strike-node records.
 * - Preserve Gamma and Vanna separately.
 * - Fail gracefully without allowing downstream engines to guess.
 *
 * Important:
 * This connector does NOT classify King Nodes, Floors, Ceilings,
 * Gatekeepers, Fortresses, patterns, structure, or trades.
 */

class HunterDataConnector {

    constructor(config = {}) {

        this.version = "2.0.0";

        this.config = {
            requireGamma: true,
            requireVanna: true,
            allowDirectPayload: true,
            ...config
        };

    }

    /**
     * Primary production interface.
     *
     * @param {Object} rawData External payload or capture wrapper.
     * @param {Object} marketState Existing HunterMarketState instance.
     * @returns {Object} The populated marketState object.
     */
    connect(rawData, marketState = {}) {

        const normalized = this.normalize(rawData);

        this.applyToMarketState(
            marketState,
            normalized
        );

        return marketState;

    }

    /**
     * Converts raw external data into Hunter's canonical shape.
     *
     * @param {Object} rawData
     * @returns {Object}
     */
    normalize(rawData) {

        const base = this.emptyMarketState();

        if (!rawData || typeof rawData !== "object") {
            return this.invalid(
                base,
                "No market data was supplied."
            );
        }

        const detected = this.detectPayload(rawData);

        if (!detected) {
            return this.invalid(
                base,
                "No supported Heatseeker matrix payload was found."
            );
        }

        const {
            payload,
            sourceType,
            sourcePath,
            sourceUrl
        } = detected;

        const heatseeker =
            this.normalizeHeatseekerPayload(payload);

        if (!heatseeker.valid) {
            return {
                ...heatseeker,
                metadata: {
                    ...heatseeker.metadata,
                    connectorVersion: this.version,
                    sourceType,
                    sourcePath,
                    sourceUrl
                }
            };
        }

        const optionsFlow =
            this.extractOptionsFlow(rawData, payload);

        const darkPools =
            this.extractDarkPools(rawData, payload);

        return {
            ...heatseeker,
            optionsFlow,
            darkPools,
            metadata: {
                ...heatseeker.metadata,
                connectorVersion: this.version,
                sourceType,
                sourcePath,
                sourceUrl,
                optionsFlowAvailable:
                    Array.isArray(optionsFlow) &&
                    optionsFlow.length > 0,
                darkPoolsAvailable:
                    Array.isArray(darkPools) &&
                    darkPools.length > 0
            }
        };

    }

    /**
     * Detects the best supported payload.
     *
     * Supports:
     * - Direct Skylit Heatseeker payloads.
     * - Legacy capture wrappers containing fetchCalls.
     * - Prototype export capture records.
     * - Nested payload/data/result objects.
     */
    detectPayload(rawData) {

        const candidates = [];

        if (
            this.config.allowDirectPayload &&
            this.isHeatseekerPayload(rawData)
        ) {
            candidates.push({
                payload: rawData,
                sourceType: "SKYLIT_HEATSEEKER",
                sourcePath: "$",
                sourceUrl: null,
                score: this.scoreHeatseekerPayload(rawData)
            });
        }

        this.collectLegacyFetchCalls(
            rawData,
            candidates
        );

        this.collectPrototypeCaptures(
            rawData,
            candidates
        );

        this.walkObjects(
            rawData,
            (value, path) => {

                if (!this.isHeatseekerPayload(value)) {
                    return;
                }

                candidates.push({
                    payload: value,
                    sourceType: "SKYLIT_HEATSEEKER",
                    sourcePath: path,
                    sourceUrl: null,
                    score:
                        this.scoreHeatseekerPayload(value)
                });

            }
        );

        if (candidates.length === 0) {
            return null;
        }

        candidates.sort((a, b) =>
            b.score - a.score
        );

        return candidates[0];

    }

    collectLegacyFetchCalls(rawData, candidates) {

        if (!Array.isArray(rawData.fetchCalls)) {
            return;
        }

        rawData.fetchCalls.forEach(
            (call, index) => {

                const payload =
                    call?.payload ??
                    call?.data ??
                    null;

                if (!this.isHeatseekerPayload(payload)) {
                    return;
                }

                candidates.push({
                    payload,
                    sourceType:
                        call.type === "matrix"
                            ? "SKYLIT_HEATSEEKER"
                            : "UNKNOWN_CAPTURE",
                    sourcePath:
                        `$.fetchCalls[${index}].payload`,
                    sourceUrl:
                        call.url ?? null,
                    score:
                        this.scoreHeatseekerPayload(payload) +
                        (call.type === "matrix" ? 25 : 0)
                });

            }
        );

    }

    collectPrototypeCaptures(rawData, candidates) {

        const captureLists = [
            rawData.captures,
            rawData.analysis?.captures
        ];

        for (const list of captureLists) {

            if (!Array.isArray(list)) {
                continue;
            }

            list.forEach(
                (capture, index) => {

                    const payload =
                        capture?.payload ??
                        null;

                    if (!this.isHeatseekerPayload(payload)) {
                        return;
                    }

                    candidates.push({
                        payload,
                        sourceType:
                            "SKYLIT_HEATSEEKER",
                        sourcePath:
                            `$.captures[${index}].payload`,
                        sourceUrl:
                            capture.url ?? null,
                        score:
                            this.scoreHeatseekerPayload(payload)
                    });

                }
            );

        }

        const analysisMatrix =
            rawData.analysis?.matrix;

        if (
            analysisMatrix &&
            this.isNormalizedHeatseekerMatrix(
                analysisMatrix
            )
        ) {
            candidates.push({
                payload:
                    this.denormalizePrototypeMatrix(
                        analysisMatrix
                    ),
                sourceType:
                    "HUNTER_PROTOTYPE_MATRIX",
                sourcePath:
                    "$.analysis.matrix",
                sourceUrl:
                    rawData.analysis?.capture?.url ??
                    null,
                score: 1000
            });
        }

    }

    normalizeHeatseekerPayload(payload) {

        const base =
            this.emptyMarketState();

        const symbol =
            this.firstDefined(
                payload.symbol,
                payload.Symbol,
                payload.ticker,
                payload.Ticker,
                payload.underlying,
                payload.Underlying
            );

        const currentSpot =
            this.firstFinite(
                payload.CurrentSpot,
                payload.currentSpot,
                payload.spot,
                payload.Spot,
                payload.underlyingPrice
            );

        const previousClose =
            this.firstFinite(
                payload.PreviousClose,
                payload.previousClose
            );

        const priceChange =
            this.firstFinite(
                payload.PriceChange,
                payload.priceChange
            );

        const priceChangePercent =
            this.firstFinite(
                payload.PriceChangePercent,
                payload.priceChangePercent
            );

        const lastUpdated =
            this.firstDefined(
                payload.LastUpdated,
                payload.lastUpdated,
                payload.timestamp,
                payload.Timestamp,
                payload.updatedAt
            );

        const historicalTimestamp =
            this.firstDefined(
                payload.HistoricalTimestamp,
                payload.historicalTimestamp
            );

        const expirations =
            this.normalizeExpirations(
                this.firstArray(
                    payload.Expirations,
                    payload.expirations
                )
            );

        const strikes =
            this.normalizeNumberArray(
                this.firstArray(
                    payload.Strikes,
                    payload.strikes,
                    payload.strikePrices
                )
            );

        const gammaMatrix =
            this.normalizeMatrix(
                this.firstArray(
                    payload.GammaValues,
                    payload.gammaMatrix,
                    payload.gamma,
                    payload.gex
                )
            );

        const vannaMatrix =
            this.normalizeMatrix(
                this.firstArray(
                    payload.VannaValues,
                    payload.vannaMatrix,
                    payload.vanna,
                    payload.vex
                )
            );

        const validation =
            this.validateHeatseeker({
                currentSpot,
                strikes,
                gammaMatrix,
                vannaMatrix,
                expirations
            });

        if (!validation.valid) {
            return this.invalid(
                {
                    ...base,
                    symbol: symbol ?? null,
                    currentSpot,
                    previousClose,
                    priceChange,
                    priceChangePercent,
                    lastUpdated:
                        lastUpdated ?? null,
                    historicalTimestamp:
                        historicalTimestamp ?? null,
                    expirations,
                    strikes,
                    gammaMatrix,
                    vannaMatrix,
                    metadata: {
                        source:
                            "SKYLIT_HEATSEEKER",
                        replayMode:
                            Boolean(
                                payload.ReplayMode ??
                                payload.replayMode
                            )
                    }
                },
                validation.reason
            );
        }

        const nodes =
            this.buildNodes({
                strikes,
                gammaMatrix,
                vannaMatrix,
                expirations
            });

        return {
            valid: true,
            reason: null,

            symbol:
                symbol ?? null,

            currentSpot,
            spot: currentSpot,

            previousClose,
            priceChange,
            priceChangePercent,

            lastUpdated:
                lastUpdated ?? null,

            historicalTimestamp:
                historicalTimestamp ?? null,

            expirations,
            strikes,
            gammaMatrix,
            vannaMatrix,
            nodes,

            optionsFlow: [],
            darkPools: [],

            metadata: {
                source:
                    "SKYLIT_HEATSEEKER",
                dataSource:
                    this.firstDefined(
                        payload.DataSource,
                        payload.dataSource
                    ),
                replayMode:
                    Boolean(
                        payload.ReplayMode ??
                        payload.replayMode
                    ),
                strikeCount:
                    strikes.length,
                expirationCount:
                    expirations.length,
                gammaRowCount:
                    gammaMatrix.length,
                vannaRowCount:
                    vannaMatrix.length,
                gammaSeparated: true,
                vannaSeparated: true,
                nodeCount:
                    nodes.length,
                rawGammaMax:
                    this.firstFinite(
                        payload.GammaMaxValue,
                        payload.gammaMaxValue
                    ),
                rawGammaMin:
                    this.firstFinite(
                        payload.GammaMinValue,
                        payload.gammaMinValue
                    ),
                rawVannaMax:
                    this.firstFinite(
                        payload.VannaMaxValue,
                        payload.vannaMaxValue
                    ),
                rawVannaMin:
                    this.firstFinite(
                        payload.VannaMinValue,
                        payload.vannaMinValue
                    )
            }
        };

    }

    validateHeatseeker({
        currentSpot,
        strikes,
        gammaMatrix,
        vannaMatrix,
        expirations
    }) {

        if (!Number.isFinite(currentSpot)) {
            return {
                valid: false,
                reason:
                    "Incomplete Heatseeker matrix: CurrentSpot is missing."
            };
        }

        if (
            !Array.isArray(strikes) ||
            strikes.length === 0
        ) {
            return {
                valid: false,
                reason:
                    "Incomplete Heatseeker matrix: Strikes are missing."
            };
        }

        if (
            this.config.requireGamma &&
            (
                !Array.isArray(gammaMatrix) ||
                gammaMatrix.length === 0
            )
        ) {
            return {
                valid: false,
                reason:
                    "Incomplete Heatseeker matrix: GammaValues are missing."
            };
        }

        if (
            this.config.requireVanna &&
            (
                !Array.isArray(vannaMatrix) ||
                vannaMatrix.length === 0
            )
        ) {
            return {
                valid: false,
                reason:
                    "Incomplete Heatseeker matrix: VannaValues are missing."
            };
        }

        if (
            gammaMatrix.length > 0 &&
            gammaMatrix.length !== strikes.length
        ) {
            return {
                valid: false,
                reason:
                    "Incomplete Heatseeker matrix: Gamma row count does not match strike count."
            };
        }

        if (
            vannaMatrix.length > 0 &&
            vannaMatrix.length !== strikes.length
        ) {
            return {
                valid: false,
                reason:
                    "Incomplete Heatseeker matrix: Vanna row count does not match strike count."
            };
        }

        const expectedColumns =
            expirations.length;

        if (expectedColumns > 0) {

            const badGammaRow =
                gammaMatrix.find(
                    row =>
                        row.length !==
                        expectedColumns
                );

            if (badGammaRow) {
                return {
                    valid: false,
                    reason:
                        "Incomplete Heatseeker matrix: Gamma column count does not match expiration count."
                };
            }

            const badVannaRow =
                vannaMatrix.find(
                    row =>
                        row.length !==
                        expectedColumns
                );

            if (badVannaRow) {
                return {
                    valid: false,
                    reason:
                        "Incomplete Heatseeker matrix: Vanna column count does not match expiration count."
                };
            }

        }

        return {
            valid: true,
            reason: null
        };

    }

    buildNodes({
        strikes,
        gammaMatrix,
        vannaMatrix,
        expirations
    }) {

        return strikes.map(
            (strike, index) => {

                const gammaByExpiration =
                    this.normalizeRowLength(
                        gammaMatrix[index] ?? [],
                        expirations.length
                    );

                const vannaByExpiration =
                    this.normalizeRowLength(
                        vannaMatrix[index] ?? [],
                        expirations.length
                    );

                const gammaByExpirationMap =
                    this.toExpirationMap(
                        expirations,
                        gammaByExpiration
                    );

                const vannaByExpirationMap =
                    this.toExpirationMap(
                        expirations,
                        vannaByExpiration
                    );

                return {
                    strike,

                    gammaByExpiration,
                    vannaByExpiration,

                    gammaByExpirationMap,
                    vannaByExpirationMap,

                    totalGamma:
                        this.sumSigned(
                            gammaByExpiration
                        ),

                    totalVanna:
                        this.sumSigned(
                            vannaByExpiration
                        ),

                    gammaMagnitude:
                        this.sumMagnitude(
                            gammaByExpiration
                        ),

                    vannaMagnitude:
                        this.sumMagnitude(
                            vannaByExpiration
                        )
                };

            }
        );

    }

    extractOptionsFlow(rawData, matrixPayload) {

        const arrays =
            this.findNamedArrays(
                [rawData, matrixPayload],
                [
                    "optionsFlow",
                    "flow",
                    "optionTrades",
                    "optionsTrades",
                    "flowRecords"
                ]
            );

        return arrays[0] ?? [];

    }

    extractDarkPools(rawData, matrixPayload) {

        const arrays =
            this.findNamedArrays(
                [rawData, matrixPayload],
                [
                    "darkPools",
                    "darkPool",
                    "darkPoolLevels",
                    "darkPoolPrints"
                ]
            );

        return arrays[0] ?? [];

    }

    applyToMarketState(
        marketState,
        normalized
    ) {

        if (
            marketState &&
            typeof marketState.load === "function"
        ) {
            marketState.load(normalized);
            return;
        }

        if (
            marketState &&
            typeof marketState.loadNormalized ===
                "function"
        ) {
            marketState.loadNormalized(
                normalized
            );
            return;
        }

        /*
         * Backward-compatible fallback.
         *
         * Existing HunterMarketState versions may not yet have
         * load() or loadNormalized(). In that case, copy the
         * canonical fields directly so runtime integration can
         * continue without a crash.
         */
        Object.assign(
            marketState,
            normalized
        );

    }

    isHeatseekerPayload(value) {

        if (!value || typeof value !== "object") {
            return false;
        }

        const strikes =
            this.firstArray(
                value.Strikes,
                value.strikes,
                value.strikePrices
            );

        const gamma =
            this.firstArray(
                value.GammaValues,
                value.gammaMatrix,
                value.gamma,
                value.gex
            );

        const vanna =
            this.firstArray(
                value.VannaValues,
                value.vannaMatrix,
                value.vanna,
                value.vex
            );

        return (
            Array.isArray(strikes) &&
            strikes.length > 0 &&
            (
                Array.isArray(gamma) ||
                Array.isArray(vanna)
            )
        );

    }

    isNormalizedHeatseekerMatrix(value) {

        return Boolean(
            value &&
            typeof value === "object" &&
            Array.isArray(value.strikes) &&
            (
                Array.isArray(value.gamma) ||
                Array.isArray(
                    value.gammaMatrix
                )
            )
        );

    }

    denormalizePrototypeMatrix(value) {

        return {
            symbol: value.symbol,
            CurrentSpot:
                value.spot ??
                value.currentSpot,
            PreviousClose:
                value.previousClose,
            PriceChange:
                value.priceChange,
            PriceChangePercent:
                value.priceChangePercent,
            LastUpdated:
                value.timestamp ??
                value.lastUpdated,
            HistoricalTimestamp:
                value.historicalTimestamp,
            ReplayMode:
                value.replayMode,
            Expirations:
                value.expirations,
            Strikes:
                value.strikes,
            GammaValues:
                value.gamma ??
                value.gammaMatrix,
            VannaValues:
                value.vanna ??
                value.vannaMatrix
        };

    }

    scoreHeatseekerPayload(payload) {

        const strikes =
            this.firstArray(
                payload.Strikes,
                payload.strikes,
                payload.strikePrices
            ) ?? [];

        const expirations =
            this.firstArray(
                payload.Expirations,
                payload.expirations
            ) ?? [];

        const gamma =
            this.firstArray(
                payload.GammaValues,
                payload.gammaMatrix,
                payload.gamma,
                payload.gex
            ) ?? [];

        const vanna =
            this.firstArray(
                payload.VannaValues,
                payload.vannaMatrix,
                payload.vanna,
                payload.vex
            ) ?? [];

        return (
            strikes.length * 2 +
            expirations.length * 5 +
            gamma.length +
            vanna.length +
            (
                Number.isFinite(
                    this.firstFinite(
                        payload.CurrentSpot,
                        payload.currentSpot,
                        payload.spot
                    )
                )
                    ? 50
                    : 0
            )
        );

    }

    findNamedArrays(roots, names) {

        const results = [];

        for (const root of roots) {

            this.walkObjects(
                root,
                value => {

                    if (!value || typeof value !== "object") {
                        return;
                    }

                    for (const name of names) {

                        if (
                            Array.isArray(value[name]) &&
                            value[name].length > 0
                        ) {
                            results.push(value[name]);
                        }

                    }

                }
            );

        }

        return results;

    }

    walkObjects(
        root,
        visitor,
        maxDepth = 8
    ) {

        if (!root || typeof root !== "object") {
            return;
        }

        const seen =
            new WeakSet();

        const walk =
            (value, path, depth) => {

                if (
                    !value ||
                    typeof value !== "object" ||
                    depth > maxDepth ||
                    seen.has(value)
                ) {
                    return;
                }

                seen.add(value);
                visitor(value, path);

                if (Array.isArray(value)) {

                    value.forEach(
                        (item, index) =>
                            walk(
                                item,
                                `${path}[${index}]`,
                                depth + 1
                            )
                    );

                    return;

                }

                Object.entries(value).forEach(
                    ([key, item]) =>
                        walk(
                            item,
                            `${path}.${key}`,
                            depth + 1
                        )
                );

            };

        walk(root, "$", 0);

    }

    normalizeExpirations(values) {

        if (!Array.isArray(values)) {
            return [];
        }

        return values.map(
            value => {

                if (!value) {
                    return null;
                }

                const date =
                    new Date(value);

                if (
                    Number.isFinite(
                        date.getTime()
                    )
                ) {
                    return date
                        .toISOString()
                        .slice(0, 10);
                }

                return String(value);

            }
        );

    }

    normalizeNumberArray(values) {

        if (!Array.isArray(values)) {
            return [];
        }

        return values
            .map(value => Number(value))
            .filter(Number.isFinite);

    }

    normalizeMatrix(matrix) {

        if (!Array.isArray(matrix)) {
            return [];
        }

        return matrix.map(
            row =>
                Array.isArray(row)
                    ? row.map(
                        value =>
                            Number.isFinite(
                                Number(value)
                            )
                                ? Number(value)
                                : 0
                    )
                    : []
        );

    }

    normalizeRowLength(
        row,
        expectedLength
    ) {

        const normalized =
            Array.isArray(row)
                ? row.map(
                    value =>
                        Number.isFinite(
                            Number(value)
                        )
                            ? Number(value)
                            : 0
                )
                : [];

        if (
            !Number.isFinite(expectedLength) ||
            expectedLength <= 0
        ) {
            return normalized;
        }

        if (
            normalized.length ===
            expectedLength
        ) {
            return normalized;
        }

        if (
            normalized.length >
            expectedLength
        ) {
            return normalized.slice(
                0,
                expectedLength
            );
        }

        return [
            ...normalized,
            ...Array(
                expectedLength -
                normalized.length
            ).fill(0)
        ];

    }

    toExpirationMap(
        expirations,
        values
    ) {

        const result = {};

        expirations.forEach(
            (expiration, index) => {

                if (!expiration) {
                    return;
                }

                result[expiration] =
                    values[index] ?? 0;

            }
        );

        return result;

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

    emptyMarketState() {

        return {
            valid: false,
            reason: null,

            symbol: null,

            currentSpot: null,
            spot: null,

            previousClose: null,
            priceChange: null,
            priceChangePercent: null,

            lastUpdated: null,
            historicalTimestamp: null,

            expirations: [],
            strikes: [],
            gammaMatrix: [],
            vannaMatrix: [],
            nodes: [],

            optionsFlow: [],
            darkPools: [],

            metadata: {
                source: null,
                connectorVersion:
                    this.version,
                strikeCount: 0,
                expirationCount: 0,
                gammaSeparated: true,
                vannaSeparated: true
            }
        };

    }

    invalid(base, reason) {

        return {
            ...base,
            valid: false,
            reason
        };

    }

    firstArray(...values) {

        for (const value of values) {

            if (Array.isArray(value)) {
                return value;
            }

        }

        return null;

    }

    firstDefined(...values) {

        for (const value of values) {

            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {
                return value;
            }

        }

        return null;

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

export default HunterDataConnector;