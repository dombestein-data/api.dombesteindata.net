export const ALLOWED_ORIGINS = new Set([
    "https://dombesteindata.net",
    "https://dikult105.k.uib.no",
]);

function isDev(env) {
    return (env?.ENVIRONMENT || env?.ENV || '').toString().toLowerCase() === 'dev';
}

export function isAllowedOrigin(origin, env) {
    if (!origin) return false;

    // Always allow the sites in ALLOWED_ORIGINS
    if (ALLOWED_ORIGINS.has(origin)) return true;

    // If we're in a dev environment, allow localhost as well.
    if (isDev(env) && origin.startsWith('http://localhost:')) return true;

    return false;
}

export function corsHeaders(origin, env) {
    // Only echo back allowed origins
    const headers = new Headers();
    if (isAllowedOrigin(origin, env)) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Vary", "Origin");
        headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type");
        headers.set("Access-Control-Max-Age", "86400");
    }
    return headers;
}