function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateContactPayload(body) {
    const name = (body?.name ?? "").trim();
    const email = (body?.email ?? "").trim();
    const message = (body?.message ?? "").trim();
    const turnstileToken = (body?.turnstileToken ?? "").trim();

    if (name.length < 2) return { ok: false, error: "Name is required." };
    if (!isValidEmail(email)) return { ok: false, error: "Valid email is required." };
    if (message.length < 10) return { ok: false, error: "Message is too short." };
    if (!turnstileToken) return { ok: false, error: "Missing Turnstile token." };

    return { ok: true, value: { name, email, message, turnstileToken } };
}