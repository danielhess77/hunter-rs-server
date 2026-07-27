/**
 * Skylit Adapter
 * Version: 1.0
 *
 * Responsible for receiving normalized data from Skylit
 * and passing it into Hunter.
 */

class SkylitAdapter {

    constructor() {

        this.connected = false;

    }

    connect() {

        console.log("Connecting to Skylit...");

        this.connected = true;

    }

    disconnect() {

        this.connected = false;

    }

    receive(data) {

        return data;

    }

}

export default SkylitAdapter;