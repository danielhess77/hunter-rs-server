export function generateState() {

    return crypto.randomUUID();

}

export async function basicAuthHeader(clientId, secret) {

    const text = `${clientId}:${secret}`;

    const encoded = btoa(text);

    return `Basic ${encoded}`;

}