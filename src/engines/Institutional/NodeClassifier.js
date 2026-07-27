/**
 * Node Classifier
 * Version 2.0
 *
 * Preserves all institutional node data while
 * adding Hunter classification fields.
 */

class NodeClassifier {

    classify(node, context = {}) {

        const magnitude =
            node.magnitude ??
            0;

        const largestMagnitude =
            context.largestMagnitude ?? 0;

        const isKingNode =
            magnitude === largestMagnitude &&
            magnitude > 0;

        // Placeholder logic until the
        // Structure Engine begins assigning
        // structural roles.

        const isFloor = false;
        const isCeiling = false;
        const isGatekeeper = false;

        let type = "Unknown";

        if (isKingNode)
            type = "King Node";
        else if (isFloor)
            type = "Floor";
        else if (isCeiling)
            type = "Ceiling";
        else if (isGatekeeper)
            type = "Gatekeeper";

        return {

            // Preserve everything from MatrixParser

            ...node,

            // Add Hunter classifications

            type,

            isKingNode,

            isFloor,

            isCeiling,

            isGatekeeper

        };

    }

}

export default NodeClassifier;