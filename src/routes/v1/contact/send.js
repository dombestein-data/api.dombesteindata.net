import { json } from '../../../lib/json.js';
import { validateContactPayload } from '../../../lib/validators.js';
import { verifyTurnstile } from '../../../lib/turnstile.js';

export async function handleV1ContactSend({ request, env, headers }) {
    let body;

    // Parse JSON body
    try {
        body = await request.json();
    } catch {
        return json(
            { ok: false, error: 'Invalid JSON payload' },
            { status: 400, headers }
        );
    }

    // Validate input fields
    const validation = validateContactPayload(body);
    if (!validation.ok) {
        return json(
            { ok: false, error: validation.error },
            { status: 400, headers }
        );
    }

    const { name, email, message, turnstileToken } = validation.value;

    // Verify Turnstile
    const secret = env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        return json(
            { ok: false, error: 'Server not configured.' },
            { status: 500, headers }
        );
    }

    // Optional dev bypass for now
    const isDev = env.ENVIRONMENT === 'dev';
    if (!isDev) {
        const remoteip = request.headers.get('CF-Connecting-IP') || undefined;
        const turnstileResult = await verifyTurnstile(
            turnstileToken,
            secret,
            remoteip
        );

        if (!turnstileResult.success) {
            return json(
                { ok: false, error: 'Turnstile verification failed' },
                { status: 403, headers }
            );
        }
    }

    // Send email via Resend
    const resendKey = env.RESEND_API_KEY;
    const toEmail = env.CONTACT_TO_EMAIL;

    if (!resendKey || !toEmail) {
        return json(
            { ok: false, error: 'Email service not configured' },
            { status: 500, headers }
        );
    }

    const emailPayload = {
        from: env.RESEND_FROM_EMAIL || 'Dombestein Data <noreply@dombesteindata.net>',
        to: [toEmail],
        reply_to: email,
        subject: `New contact form message from ${name}`,
        text: [
            `Name: ${name}`,
            `Email: ${email}`,
            ``,
            `Message:`,
            message,
        ].join('\n'),
    };

    let resendResponse;
    let resendBodyText = '';
    let resendData = {};

    try {
        resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailPayload),
        });

        // Read the body ONCE (can be JSON or plain text depending on errors)
        resendBodyText = await resendResponse.text();
        try {
            resendData = resendBodyText ? JSON.parse(resendBodyText) : {};
        } catch {
            resendData = { raw: resendBodyText };
        }
    } catch (err) {
        console.error('Resend fetch threw:', err);
        return json(
            { ok: false, error: 'Failed to send email.' },
            { status: 500, headers }
        );
    }

    if (!resendResponse.ok) {
        console.error('Resend error:', resendResponse.status, resendData);

        // In local dev, include a little extra detail to debug quickly.
        if (isDev) {
            return json(
                {
                    ok: false,
                    error: 'Failed to send email.',
                    debug: {
                        status: resendResponse.status,
                        resend: resendData,
                    },
                },
                { status: 500, headers }
            );
        }

        return json(
            { ok: false, error: 'Failed to send email.' },
            { status: 500, headers }
        );
    }

    // Resend typically returns { id: "..." } on success.
    if (!resendData || !resendData.id) {
        console.warn('Resend response missing id:', resendData);
    }

    return json(
        {
            ok: true,
            message: 'Message received successfully.',
            resendId: resendData?.id || null,
        },
        { status: 200, headers }
    );
}