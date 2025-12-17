export function json(data, { status = 200, headers } = {}) {
    const h = new Headers(headers);
    h.set("Content-Type", "application/json; charset=utf-8");
    return new Response(JSON.stringify(data), { status, headers: h });
}