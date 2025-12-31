import { corsHeaders, isAllowedOrigin } from './lib/cors.js';
import { json } from './lib/json.js';
import { handleV1ContactSend } from './routes/v1/contact/send.js';
import { handleV1EstimatorTonight } from './routes/v1/estimator/tonight.js';

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
            return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
        }

        // --- Basic routing guard: only /v1/* is allowed for now. ---
        if (!path.startsWith('/v1/')) {
            return json({ error: 'Not Found' }, { status: 404 });
        }

        // --- Route: POST /v1/contact/send ---
        if (path === '/v1/contact/send' && method === 'POST') {
            // Gate by origin (browser-only). If no Origin header, assume non-browser (curl/server-to-server).
            if (origin && !isAllowedOrigin(origin, env)) {
                return json({ error: 'Forbidden origin' }, { status: 403 });
            }

            // CORS response headers for allowed origin
            const headers = corsHeaders(origin, env);

            return handleV1ContactSend({
                request,
                env,
                headers,
            });
        }

        // --- Route: POST /v1/estimator/tonight ---
        if (path === '/v1/estimator/tonight' && method === 'POST') {
            // Gate by origin (browser only). If no Origin header, assume non-browser (curl/server-to-server).
            if (origin && !isAllowedOrigin(origin, env)) {
                return json({ error: 'Forbidden origin' }, { status: 403 });
            }

            // CORS response headers for allowed origin
            const headers = corsHeaders(origin, env);

            return handleV1EstimatorTonight({
                request,
                env,
                headers
            });
        }

        return json({ error: 'Not Found'}, { status: 404 });
    },
};