import { z } from 'zod';
import { json } from '../../../lib/json';

const TaskType = z.enum([
    "writing",
    "coding",
    "design",
    "admin",
    "studying",
    "creative",
    "unsure",
]);

const TaskSize = z.enum(["tiny", "small", "medium", "large"]);
const Proficiency = z.enum(["new", "some", "comfortable", "expert"]);
const Energy = z.enum(["dead", "meh", "decent", "locked_in"]);
const Deadline = z.enum(["tonight", "tomorrow", "custom"]);

const TonightEstimatorRequestSchema = z.object({
    taskType: TaskType,
    taskSize: TaskSize,
    proficiency: Proficiency,
    energy: Energy,

    // ISO Date-time is best, but we also accept "HH:MM".
    // If omitted, server will assume "now" in its own context.
    currentTime: z.string().optional(), // "21:45" or ISO

    // When deadline is custom, require a "HH:MM" or ISO.
    deadline: Deadline,
    deadlineTime: z.string().optional(), // required if deadline === 'custom'
});

type Req = z.infer<typeof TonightEstimatorRequestSchema>;

function clamp (n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function parseTimeToMinutes(value?: string): number | null {
    if (!value) return null;

    // ISO date-time
    const iso = Date.parse(value);
    if (!Number.isNaN(iso)) {
        const d = new Date(iso);
        return d.getHours() * 60 + d.getMinutes();
    }

    // HH:MM
    const m = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    return hh * 60 + mm;
}

function deadlineToMinutes(req: Req, nowMin: number) {
    // "tonight" = 23:59, "tomorrow" = next day 23:59, "custom" = deadlineTime
    if (req.deadline === 'custom') {
        const dl = parseTimeToMinutes(req.deadlineTime);
        if (dl === null) return 23 * 60 + 59;
        // if they give a time earlier than now, assume it's next day
        return dl < nowMin ? dl + 24 * 60 : dl;
    }

    if (req.deadline === 'tomorrow') return nowMin + (24 * 60); // A full day buffer
    return 23 * 60 + 59; // tonight
}

function estimateMinutes(req: Req, nowMin: number) {
    const reasoning: string[] = [];

    // Base time by task type (in minutes) for a "small" task
    const baseByType: Record<Req['taskType'], number> = {
        writing: 75,
        coding: 90,
        design: 80,
        admin: 45,
        studying: 70,
        creative: 85,
        unsure: 95,
    };

    // size multiplier
    const sizeMult: Record<Req['taskSize'], number> = {
        tiny: 0.5,
        small: 1.0,
        medium: 2.0,
        large: 3.5,
    };

    // Proficiency multiplyer (lower = faster)
    const profMult: Record<Req['proficiency'], number> = {
        new: 1.8,
        some: 1.25,
        comfortable: 1.0,
        expert: 0.85,
    };

    // Energy multiplier (lower energy = slower + mistakes)
    const energyMult: Record<Req['energy'], number> = {
        dead: 1.9,
        meh: 1.35,
        decent: 1.05,
        locked_in: 0.9,
    };

    // Lateness penalty (After 22:30, things get... ...a little spicy 😈)
    const lateThreshold = 22 * 60 + 30;
    const lateness = Math.max(0, nowMin - lateThreshold);
    const lateMult = 1 + clamp(lateness / 180, 0, 0.35); // up to +35% if you're deep into the night

    // Context-based reasoning lines
    reasoning.push(
        req.taskSize === 'large'
            ? 'Large scope tends to explode late at night.'
            : req.taskSize === 'medium'
            ? 'Medium scope: usually where optimism goes to die.'
            : `Scope is manageable (Assuming you don't add "Just one more thing").`
    );

    if (req.proficiency === 'new') reasoning.push('New territory adds friction and googling tax.');
    if (req.proficiency === 'expert') reasoning.push('High proficiency cuts the guesswork.');

    if (req.energy === 'dead') reasoning.push('Low energy increases errors and redo time.');
    if (req.energy === 'locked_in') reasoning.push('Locked in: You can ride the momentum.');

    if (nowMin >= lateThreshold) reasoning.push('Late-night penalty applied (focus drops, mistakes rise).');

    const base = baseByType[req.taskType];
    const minutes = 
        base *
        sizeMult[req.taskSize] * 
        profMult[req.proficiency] * 
        energyMult[req.energy] *
        lateMult;
    
    // Add a small fixed overhead for context switching / setup
    const overhead = req.taskType === 'coding' ? 15 : 10;

    return {
        minutes: Math.round(minutes + overhead),
        reasoning,
        lateMult,
    };
}

function verdictAndSuggestion(estimatedMin: number, availableMin: number) {
    const ratio = availableMin / Math.max(1, estimatedMin); // >1 means you likely have enough time.

    // Confidence: Not scientific, just useful.
    const confidence = clamp(0.25 + ratio * 0.55, 0.1, 0.95);

    let verdict: 'very_likely' | 'risky' | 'unlikely' | 'go_to_bed';
    if (ratio >= 1.25) verdict = 'very_likely';
    else if (ratio >= 0.85) verdict = 'risky';
    else if (ratio >= 0.5) verdict = 'unlikely';
    else verdict = 'go_to_bed';

    // Suggestions keyed to verdict
    const suggestions: Record<typeof verdict, string[]> = {
      very_likely: [
        "Ship the core, then stop. Don’t polish yourself into regret.",
        "Set a 25-minute timer and sprint the ugliest part first.",
        "If it’s working, don’t touch it. Seriously.",
      ],
      risky: [
        "Cut scope by ~30% and you might land this.",
        "Finish the “must-have” part. Leave the “nice-to-have” for tomorrow.",
        "Timebox: 60–90 minutes. If progress stalls, bail or simplify.",
      ],
      unlikely: [
        "Pick one deliverable: outline, prototype, or core feature — not all three.",
        "Do a “minimum pass” tonight and schedule a finish tomorrow.",
        "If you keep pushing, you’ll probably redo it anyway.",
      ],
      go_to_bed: [
        "This is a tomorrow problem wearing a tonight disguise. Sleep.",
        "Stop now and future-you will send you a thank-you note.",
        "Save, write a 3-line plan for tomorrow, then shut it down.",
      ],
    };

    const suggestion = suggestions[verdict][Math.floor(Math.random() * suggestions[verdict].length)];

    return { verdict, confidence, suggestion };
}

export async function handleV1EstimatorTonight({
    request,
    env,
    headers,
}: {
    request: Request;
    env: any;
    headers?: HeadersInit;
}): Promise<Response> {
    let body: unknown;

    // Parse JSON
    try {
        body = await request.json();
    } catch {
        return json(
            { error: 'Invalid JSON body' },
            { status: 400, headers }
        );
    }

    // Validate payload
    const parsed = TonightEstimatorRequestSchema.safeParse(body);
    if (!parsed.success) {
        return json(
            {
                error: 'Invalid request payload',
                issues: parsed.error.flatten(),
            },
            { status: 400, headers }
        );
    }

    const req = parsed.data;

    // Enforce deadlineTime when deadline is custom
    if (req.deadline === 'custom' && !req.deadlineTime) {
        return json(
            { error: 'deadlineTime is required when deadline is \"custom\"' },
            { status: 400, headers }
        );
    }

    // Determine "now"
    const nowMinParsed = parseTimeToMinutes(req.currentTime);
    const now = new Date();
    const nowMin = nowMinParsed ?? (now.getHours() * 60 + now.getMinutes());

    // Determine deadline minutes and availability
    const dlMin = deadlineToMinutes(req, nowMin);
    const availableMin = Math.max(0, dlMin - nowMin);

    // Estimate and verdict
    const { minutes: estimatedMinutes, reasoning } = estimateMinutes(req, nowMin);
    const { verdict, confidence, suggestion } = verdictAndSuggestion(
        estimatedMinutes,
        availableMin
    );

    return json(
        {
            verdict,
            confidence: Number(confidence.toFixed(2)),
            estimatedMinutes,
            availableMinutes: availableMin,
            reasoning,
            suggestion,
        },
        { status: 200, headers }
    );
}