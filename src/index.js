const ALLOWED_ORIGINS = new Set([
    "https://dombesteindata.net",
    "https://dikult105.k.uib.no",
]);

function corsHeaders(origin) {
    // Only echo back allowed origins
    const headers = new Headers();
    if (origin && ALLOWED_ORIGINS.has(origin)) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Vary", "Origin");
        headers.set("Access-Control-Allow-Methots", "POST, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type");
        headers.set("Access-Control-Max-Age", "86400");
    }
    return headers;
}

function json(data, { status = 200, headers } = {}) {
    const h = new Headers(headers);
    h.set("Content-Type", "application/json; charset=utf-8");
    return new Response(JSON.stringify(data), { status, headers: h});
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method.toUpperCase();
        const origin = request.headers.get("Origin") || "";

        // --- Preflight ---
        if (method === "OPTIONS") {
            // If the request is not from a allowed orogin, we can still return 204 without CORS headers.
            // The browser will block or return 403 for us. 
            return new Response(null, { status: 204, headers: corsHeaders(origin) });
        }

        // --- Basic routing guard: only /v1/* is allowed for now. ---
        if (!path.startsWith('/v1/')) {
            return json({ error: 'Not Found' }, { status: 404 });
        }

        // --- Route: POST /v1/contact/send ---
        if (path === '/v1/contact/send' && method === 'POST') {
            // Gate by origin (browser-only)
            if (!ALLOWED_ORIGINS.has(origin)) {
                return json({ error: "Forbidden origin" }, { status: 403 });
            }

            // CORS response headers for allowed origin
            const headers = corsHeaders(origin);

            // TODO: parse body, validate, verify Turnstile, send email via Resend
            return json({ ok: true, message: 'Stub: Routed successfully'}, { headers });
        }

        return json({ error: 'Not Found'}, { status: 404 });
    },
};