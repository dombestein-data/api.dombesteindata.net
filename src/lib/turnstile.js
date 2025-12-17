export async function verifyTurnstile(token, secret, remoteip) {
    if (!token) return { success: false, error: "missing token" };
    if (!secret) return { success: false, error: "missing secret key" };

    const formData = new FormData();
    formData.append("secret", secret);
    formData.append("response", token);
    if (remoteip) formData.append("remoteip", remoteip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
    });

    const data = await res.json().catch(() => ({}));
    return data;
}