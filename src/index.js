import { corsHeaders, isAllowedOrigin } from './lib/cors.js';
import { json } from './lib/json.js';
import { handleV1ContactSend } from './routes/v1/contact/send.js';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method.toUpperCase();
        const origin = request.headers.get("Origin") || "";

        // --- Preflight ---
        if (method === "OPTIONS") {
            // If the request is not from an allowed origin, we can still return 204 without CORS headers.
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
            if (!isAllowedOrigin(origin)) {
                return json({ error: "Forbidden origin" }, { status: 403 });
            }

            // CORS response headers for allowed origin
            const headers = corsHeaders(origin);

            return handleV1ContactSend({
                request,
                env,
                headers,
            });
        }

        return json({ error: 'Not Found'}, { status: 404 });
    },
};