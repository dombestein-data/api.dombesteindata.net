/**
 * JSON response helper.
 *
 * @param {any} data
 * @param {ResponseInit} [init]
 * @returns {Response}
 */
export function json(data, init = {}) {
    const { status = 200, headers } = init;

    const h = new Headers(headers);
    // Always set/override JSON content type
    h.set("Content-Type", "application/json; charset=utf-8");

    return new Response(JSON.stringify(data), { status, headers: h });
}