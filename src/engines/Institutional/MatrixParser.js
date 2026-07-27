/**
 * Matrix Parser
 * Version: 1.3
 *
 * Converts a Heatseeker matrix into
 * normalized institutional node objects.
 *
 * Important:
 * Gamma and Vanna are kept separate.
 * Hunter preserves both signed net exposure
 * and absolute magnitude.
 */

class MatrixParser {

    parse(marketState) {

        const nodes = [];

        const strikes =
            marketState.strikes || [];

        const gamma =
            marketState.gamma || [];

        const vanna =
            marketState.vanna || [];

        for (
            let strikeIndex = 0;
            strikeIndex < strikes.length;
            strikeIndex++
        ) {

            const strike =
                strikes[strikeIndex];

            const gammaRow =
                gamma[strikeIndex] || [];

            const vannaRow =
                vanna[strikeIndex] || [];

            const gammaNet =
                gammaRow.reduce(
                    (sum, value) =>
                        sum + (value || 0),
                    0
                );

            const gammaMagnitude =
                gammaRow.reduce(
                    (sum, value) =>
                        sum + Math.abs(value || 0),
                    0
                );

            const vannaNet =
                vannaRow.reduce(
                    (sum, value) =>
                        sum + (value || 0),
                    0
                );

            const vannaMagnitude =
                vannaRow.reduce(
                    (sum, value) =>
                        sum + Math.abs(value || 0),
                    0
                );

            nodes.push({

                strike,

                gamma: gammaRow,

                gammaNet,

                gammaMagnitude,

                vanna: vannaRow,

                vannaNet,

                vannaMagnitude

            });

        }

        return nodes;

    }

}

export default MatrixParser;