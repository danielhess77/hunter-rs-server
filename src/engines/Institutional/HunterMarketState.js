/**
 * Hunter Market State
 * Version: 2.0.0
 *
 * Purpose:
 * - Store Hunter's canonical normalized market snapshot.
 * - Provide a stable contract for all downstream engines.
 * - Preserve backward-compatible aliases during migration.
 *
 * Important:
 * HunterMarketState does not parse external data,
 * classify institutional nodes, detect patterns,
 * score trades, or make decisions.
 */

class HunterMarketState {

    constructor(initialState = null) {

        this.version = "2.0.0";

        this.reset();

        if (initialState) {
            this.load(initialState);
        }

    }

    /**
     * Reset this instance to an empty canonical state.
     *
     * @returns {HunterMarketState}
     */
    reset() {

        this.valid = false;
        this.reason = null;

        this.symbol = null;

        this.currentSpot = null;
        this.spot = null;

        this.previousClose = null;
        this.priceChange = null;
        this.priceChangePercent = null;

        this.lastUpdated = null;
        this.historicalTimestamp = null;

        this.expirations = [];
        this.strikes = [];

        this.gammaMatrix = [];
        this.vannaMatrix = [];

        /*
         * Backward-compatible aliases.
         *
         * These point to the same arrays assigned during load().
         */
        this.gamma = this.gammaMatrix;
        this.vanna = this.vannaMatrix;

        this.nodes = [];

        this.optionsFlow = [];
        this.darkPools = [];

        this.metadata = {};

        return this;

    }

    /**
     * Load a normalized Hunter market state.
     *
     * Expected source:
     * HunterDataConnector v2.0 or another compatible connector.
     *
     * @param {Object} state
     * @returns {HunterMarketState}
     */
    load(state) {

        this.reset();

        if (!state || typeof state !== "object") {
            this.valid = false;
            this.reason =
                "No normalized market state was supplied.";

            return this;
        }

        this.valid =
            state.valid === true;

        this.reason =
            this.firstDefined(
                state.reason,
                null
            );

        this.symbol =
            this.firstDefined(
                state.symbol,
                state.ticker,
                null
            );

        this.currentSpot =
            this.firstFinite(
                state.currentSpot,
                state.spot
            );

        this.spot =
            this.currentSpot;

        this.previousClose =
            this.firstFinite(
                state.previousClose
            );

        this.priceChange =
            this.firstFinite(
                state.priceChange
            );

        this.priceChangePercent =
            this.firstFinite(
                state.priceChangePercent
            );

        this.lastUpdated =
            this.firstDefined(
                state.lastUpdated,
                state.timestamp,
                null
            );

        this.historicalTimestamp =
            this.firstDefined(
                state.historicalTimestamp,
                null
            );

        this.expirations =
            this.copyArray(
                state.expirations
            );

        this.strikes =
            this.copyNumberArray(
                state.strikes
            );

        this.gammaMatrix =
            this.copyMatrix(
                this.firstDefined(
                    state.gammaMatrix,
                    state.gamma,
                    []
                )
            );

        this.vannaMatrix =
            this.copyMatrix(
                this.firstDefined(
                    state.vannaMatrix,
                    state.vanna,
                    []
                )
            );

        /*
         * Maintain legacy aliases while ensuring both names
         * reference the canonical arrays.
         */
        this.gamma =
            this.gammaMatrix;

        this.vanna =
            this.vannaMatrix;

        this.nodes =
            this.copyObjects(
                state.nodes
            );

        this.optionsFlow =
            this.copyObjects(
                state.optionsFlow
            );

        this.darkPools =
            this.copyObjects(
                state.darkPools
            );

        this.metadata =
            this.copyObject(
                state.metadata
            );

        /*
         * If a connector explicitly marked the state invalid,
         * preserve that verdict.
         *
         * Otherwise validate the canonical shape before allowing
         * downstream engines to use it.
         */
        if (state.valid !== false) {

            const validation =
                this.validate();

            this.valid =
                validation.valid;

            this.reason =
                validation.reason;

        }

        return this;

    }

    /**
     * Compatibility wrapper for older runtime code.
     *
     * This supports:
     * - legacy raw Skylit matrix payloads
     * - already-normalized Hunter state objects
     *
     * New production code should call load().
     *
     * @param {Object} matrix
     * @returns {HunterMarketState}
     */
    loadMatrix(matrix) {

        if (!matrix || typeof matrix !== "object") {
            return this.load(null);
        }

        const looksNormalized =
            Object.prototype.hasOwnProperty.call(
                matrix,
                "gammaMatrix"
            ) ||
            Object.prototype.hasOwnProperty.call(
                matrix,
                "nodes"
            ) ||
            Object.prototype.hasOwnProperty.call(
                matrix,
                "valid"
            );

        if (looksNormalized) {
            return this.load(matrix);
        }

        /*
         * Legacy fallback.
         *
         * This exists only to avoid breaking older runtime code
         * before all callers migrate to HunterDataConnector v2.0.
         * Node construction remains the connector's responsibility.
         */
        const normalized = {
            valid: Boolean(
                matrix.CurrentSpot !== undefined &&
                Array.isArray(matrix.Strikes) &&
                Array.isArray(matrix.GammaValues) &&
                Array.isArray(matrix.VannaValues)
            ),

            reason: null,

            symbol:
                this.firstDefined(
                    matrix.symbol,
                    matrix.Symbol,
                    null
                ),

            currentSpot:
                this.firstFinite(
                    matrix.CurrentSpot,
                    matrix.currentSpot,
                    matrix.spot
                ),

            previousClose:
                this.firstFinite(
                    matrix.PreviousClose,
                    matrix.previousClose
                ),

            priceChange:
                this.firstFinite(
                    matrix.PriceChange,
                    matrix.priceChange
                ),

            priceChangePercent:
                this.firstFinite(
                    matrix.PriceChangePercent,
                    matrix.priceChangePercent
                ),

            lastUpdated:
                this.firstDefined(
                    matrix.LastUpdated,
                    matrix.lastUpdated,
                    null
                ),

            historicalTimestamp:
                this.firstDefined(
                    matrix.HistoricalTimestamp,
                    matrix.historicalTimestamp,
                    null
                ),

            expirations:
                this.copyArray(
                    this.firstDefined(
                        matrix.Expirations,
                        matrix.expirations,
                        []
                    )
                ),

            strikes:
                this.copyNumberArray(
                    this.firstDefined(
                        matrix.Strikes,
                        matrix.strikes,
                        []
                    )
                ),

            gammaMatrix:
                this.copyMatrix(
                    this.firstDefined(
                        matrix.GammaValues,
                        matrix.gammaMatrix,
                        matrix.gamma,
                        []
                    )
                ),

            vannaMatrix:
                this.copyMatrix(
                    this.firstDefined(
                        matrix.VannaValues,
                        matrix.vannaMatrix,
                        matrix.vanna,
                        []
                    )
                ),

            nodes: [],

            optionsFlow:
                this.copyObjects(
                    matrix.optionsFlow
                ),

            darkPools:
                this.copyObjects(
                    matrix.darkPools
                ),

            metadata: {
                source:
                    "LEGACY_LOAD_MATRIX",
                replayMode:
                    Boolean(
                        matrix.ReplayMode ??
                        matrix.replayMode
                    )
            }
        };

        if (!normalized.valid) {
            normalized.reason =
                "Incomplete legacy Heatseeker matrix.";
        }

        return this.load(normalized);

    }

    /**
     * Validate the canonical state.
     *
     * @returns {{valid: boolean, reason: string|null}}
     */
    validate() {

        if (!Number.isFinite(this.currentSpot)) {
            return {
                valid: false,
                reason:
                    "MarketState is invalid: currentSpot is missing."
            };
        }

        if (
            !Array.isArray(this.strikes) ||
            this.strikes.length === 0
        ) {
            return {
                valid: false,
                reason:
                    "MarketState is invalid: strikes are missing."
            };
        }

        if (
            !Array.isArray(this.gammaMatrix) ||
            this.gammaMatrix.length === 0
        ) {
            return {
                valid: false,
                reason:
                    "MarketState is invalid: gammaMatrix is missing."
            };
        }

        if (
            !Array.isArray(this.vannaMatrix) ||
            this.vannaMatrix.length === 0
        ) {
            return {
                valid: false,
                reason:
                    "MarketState is invalid: vannaMatrix is missing."
            };
        }

        if (
            this.gammaMatrix.length !==
            this.strikes.length
        ) {
            return {
                valid: false,
                reason:
                    "MarketState is invalid: gammaMatrix row count does not match strikes."
            };
        }

        if (
            this.vannaMatrix.length !==
            this.strikes.length
        ) {
            return {
                valid: false,
                reason:
                    "MarketState is invalid: vannaMatrix row count does not match strikes."
            };
        }

        if (
            Array.isArray(this.nodes) &&
            this.nodes.length > 0 &&
            this.nodes.length !==
            this.strikes.length
        ) {
            return {
                valid: false,
                reason:
                    "MarketState is invalid: node count does not match strikes."
            };
        }

        if (
            this.expirations.length > 0
        ) {

            const expectedColumns =
                this.expirations.length;

            const badGammaRow =
                this.gammaMatrix.find(
                    row =>
                        !Array.isArray(row) ||
                        row.length !==
                        expectedColumns
                );

            if (badGammaRow) {
                return {
                    valid: false,
                    reason:
                        "MarketState is invalid: gammaMatrix columns do not match expirations."
                };
            }

            const badVannaRow =
                this.vannaMatrix.find(
                    row =>
                        !Array.isArray(row) ||
                        row.length !==
                        expectedColumns
                );

            if (badVannaRow) {
                return {
                    valid: false,
                    reason:
                        "MarketState is invalid: vannaMatrix columns do not match expirations."
                };
            }

        }

        return {
            valid: true,
            reason: null
        };

    }

    /**
     * Returns a serializable snapshot.
     *
     * @returns {Object}
     */
    toJSON() {

        return {
            version:
                this.version,

            valid:
                this.valid,

            reason:
                this.reason,

            symbol:
                this.symbol,

            currentSpot:
                this.currentSpot,

            spot:
                this.spot,

            previousClose:
                this.previousClose,

            priceChange:
                this.priceChange,

            priceChangePercent:
                this.priceChangePercent,

            lastUpdated:
                this.lastUpdated,

            historicalTimestamp:
                this.historicalTimestamp,

            expirations:
                this.copyArray(
                    this.expirations
                ),

            strikes:
                this.copyNumberArray(
                    this.strikes
                ),

            gammaMatrix:
                this.copyMatrix(
                    this.gammaMatrix
                ),

            vannaMatrix:
                this.copyMatrix(
                    this.vannaMatrix
                ),

            /*
             * Legacy aliases are included in serialization
             * during the migration period.
             */
            gamma:
                this.copyMatrix(
                    this.gammaMatrix
                ),

            vanna:
                this.copyMatrix(
                    this.vannaMatrix
                ),

            nodes:
                this.copyObjects(
                    this.nodes
                ),

            optionsFlow:
                this.copyObjects(
                    this.optionsFlow
                ),

            darkPools:
                this.copyObjects(
                    this.darkPools
                ),

            metadata:
                this.copyObject(
                    this.metadata
                )
        };

    }

    /**
     * Returns a compact diagnostic summary.
     *
     * @returns {Object}
     */
    getSummary() {

        return {
            version:
                this.version,

            valid:
                this.valid,

            reason:
                this.reason,

            symbol:
                this.symbol,

            currentSpot:
                this.currentSpot,

            strikeCount:
                this.strikes.length,

            expirationCount:
                this.expirations.length,

            gammaRowCount:
                this.gammaMatrix.length,

            vannaRowCount:
                this.vannaMatrix.length,

            nodeCount:
                this.nodes.length,

            optionsFlowCount:
                this.optionsFlow.length,

            darkPoolCount:
                this.darkPools.length,

            lastUpdated:
                this.lastUpdated
        };

    }

    copyArray(value) {

        if (!Array.isArray(value)) {
            return [];
        }

        return value.map(
            item =>
                item &&
                typeof item === "object"
                    ? this.deepClone(item)
                    : item
        );

    }

    copyNumberArray(value) {

        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .map(item => Number(item))
            .filter(Number.isFinite);

    }

    copyMatrix(value) {

        if (!Array.isArray(value)) {
            return [];
        }

        return value.map(
            row =>
                Array.isArray(row)
                    ? row.map(
                        item =>
                            Number.isFinite(
                                Number(item)
                            )
                                ? Number(item)
                                : 0
                    )
                    : []
        );

    }

    copyObjects(value) {

        if (!Array.isArray(value)) {
            return [];
        }

        return value.map(
            item =>
                this.deepClone(item)
        );

    }

    copyObject(value) {

        if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value)
        ) {
            return {};
        }

        return this.deepClone(value);

    }

    deepClone(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return value;
        }

        if (
            typeof structuredClone ===
            "function"
        ) {
            try {
                return structuredClone(value);
            } catch {}
        }

        try {
            return JSON.parse(
                JSON.stringify(value)
            );
        } catch {
            return value;
        }

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

export default HunterMarketState;