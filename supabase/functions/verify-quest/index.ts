// verify-quest: the only way a quest can be marked as passed.
//
// POST { quest: 1-5, repo: "https://github.com/owner/name", tool?: string, prompt?: string }
// with the student's Supabase session token in the Authorization header.
//
// 1. Identifies the student from their session (GitHub sign-in).
// 2. Checks quest order, cohort enrolment and a rate limit.
// 3. Downloads the repository from GitHub and runs the quest's checks.
// 4. Records the attempt, and the pass if every check succeeded, via record_verification.
//
// Environment: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
// Set GITHUB_TOKEN as a function secret (a read-only token) to avoid GitHub's low anonymous rate limit.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { verifySubmission } from '../_shared/verify.js';
import { fetchSnapshot } from '../_shared/github.js';

const MAX_ATTEMPTS_PER_HOUR = 20;

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Who is asking?
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth?.user) return json(401, { error: 'not_signed_in', message: 'Sign in with GitHub first.' });
    const userId = auth.user.id;

    let body: { quest?: unknown; repo?: unknown; tool?: unknown; prompt?: unknown };
    try { body = await req.json(); } catch { return json(400, { error: 'bad_json' }); }
    const quest = Number(body.quest);
    const repo = String(body.repo ?? '').slice(0, 300);
    const tool = String(body.tool ?? '').slice(0, 40);
    const prompt = String(body.prompt ?? '').slice(0, 5000);
    if (!Number.isInteger(quest) || quest < 1 || quest > 5) return json(400, { error: 'bad_quest' });

    // 2. Profile, enrolment, quest order and rate limit
    const [{ data: profile }, { data: passes }, { data: enrolments }, { data: attempts }] = await Promise.all([
        admin.from('profiles').select('id, github_login, github_id').eq('id', userId).single(),
        admin.from('quest_passes').select('quest_id, passed_at').eq('user_id', userId),
        admin.from('enrollments').select('joined_at').eq('user_id', userId).order('joined_at', { ascending: true }).limit(1),
        admin.rpc('recent_attempts', { p_user: userId }),
    ]);
    if (!profile) return json(403, { error: 'no_profile', message: 'Your profile was not created. Sign out and sign in with GitHub again.' });
    if (!enrolments?.length) return json(403, { error: 'not_enrolled', message: 'Join a cohort before submitting quests.' });

    const passed = new Map((passes ?? []).map((p) => [p.quest_id, p.passed_at]));
    for (let q = 1; q < quest; q++) {
        if (!passed.has(q)) return json(409, { error: 'locked', message: `Pass quest ${q} first.` });
    }
    if ((attempts ?? 0) >= MAX_ATTEMPTS_PER_HOUR) {
        return json(429, { error: 'rate_limited', message: 'Too many verification attempts this hour. Take a short break and try again.' });
    }

    // New work must be committed after enrolment (quest 1) or after the previous quest's pass.
    const workSince = quest === 1 ? enrolments[0].joined_at : passed.get(quest - 1);

    // 3. Verify against GitHub
    const githubToken = Deno.env.get('GITHUB_TOKEN') ?? '';
    const result = await verifySubmission({
        quest,
        repoInput: repo,
        profile,
        workSince,
        snapshot: (owner: string, name: string) => fetchSnapshot({ owner, name, token: githubToken }),
    });
    if (result.error === 'bad_repo') return json(400, { error: 'bad_repo', checks: result.checks });
    if (result.error === 'rate_limited') return json(503, { error: 'github_busy', checks: result.checks });

    // 4. Record the attempt (and the pass)
    const { error: recordError } = await admin.rpc('record_verification', {
        p_user: userId,
        p_quest: quest,
        p_repo: result.repo ?? repo,
        p_sha: result.commit?.sha ?? null,
        p_commit_at: result.commit?.date ?? null,
        p_passed: result.passed,
        p_checks: result.checks,
        p_tool: tool,
        p_prompt: prompt,
    });
    if (recordError) return json(409, { error: 'not_recorded', message: recordError.message });

    return json(200, { passed: result.passed, quest, repo: result.repo, commit: result.commit, checks: result.checks });
});
