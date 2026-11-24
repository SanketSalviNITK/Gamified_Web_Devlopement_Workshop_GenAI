// Verifies one quest submission: identity and freshness checks first, then the quest's own
// code checks. No database access here; the Edge Function supplies the student's profile and
// history and records the result.
import { buildContext, runQuestChecks } from './checks.js';
import { parseRepo, RepoError } from './github.js';

const GRACE_MS = 10 * 60 * 1000; // tolerate small clock differences between GitHub and us

/**
 * @param {object} a
 * @param {number} a.quest                 1..5
 * @param {string} a.repoInput             "owner/name" or a github.com URL
 * @param {{github_login: string, github_id: number|null}} a.profile
 * @param {string|Date} a.workSince        new work must be committed after this (enrolment or previous quest pass)
 * @param {(owner: string, name: string) => Promise<object>} a.snapshot   fetchSnapshot bound to a token
 * @returns {Promise<{passed: boolean, repo: string|null, commit: object|null, checks: object[], error?: string}>}
 */
export async function verifySubmission({ quest, repoInput, profile, workSince, snapshot }) {
    const parsed = parseRepo(repoInput);
    if (!parsed) {
        return { passed: false, repo: null, commit: null, error: 'bad_repo', checks: [fail('repo', 'Valid GitHub repository link', 'Paste a link like https://github.com/your-username/your-repo.')] };
    }

    let snap;
    try {
        snap = await snapshot(parsed.owner, parsed.name);
    } catch (e) {
        if (e instanceof RepoError) {
            return { passed: false, repo: `${parsed.owner}/${parsed.name}`, commit: null, error: e.code, checks: [fail('repo', 'Repository can be read', e.message)] };
        }
        throw e;
    }

    const repo = snap.repo.fullName;
    const identity = [];

    identity.push(snap.repo.private
        ? fail('public', 'Repository is public', 'Make the repository public (Settings → General → Danger Zone → Change visibility) so it can be verified.')
        : ok('public', 'Repository is public'));

    const ownsById = profile.github_id != null && Number(snap.repo.ownerId) === Number(profile.github_id);
    const ownsByLogin = profile.github_id == null && snap.repo.ownerLogin.toLowerCase() === String(profile.github_login).toLowerCase();
    identity.push(ownsById || ownsByLogin
        ? ok('owner', 'Repository belongs to you', `Owned by @${snap.repo.ownerLogin}.`)
        : fail('owner', 'Repository belongs to you', `Submit a repository from your own GitHub account (@${profile.github_login}). This one belongs to @${snap.repo.ownerLogin}.`));

    const since = new Date(workSince).getTime();
    const committed = snap.commit.date ? new Date(snap.commit.date).getTime() : NaN;
    const fresh = Number.isFinite(committed) && committed >= since - GRACE_MS;
    identity.push(fresh
        ? ok('fresh', quest === 1 ? 'Committed after you joined' : 'New work since your last quest', `Latest commit ${snap.commit.sha.slice(0, 7)}: "${snap.commit.message}".`)
        : fail('fresh', quest === 1 ? 'Committed after you joined' : 'New work since your last quest',
            `Your latest commit (${snap.commit.sha.slice(0, 7)}) is older than ${quest === 1 ? 'your enrolment' : 'your previous quest'}. Push the work for this quest, then verify again.`));

    const questChecks = runQuestChecks(quest, buildContext(snap));
    const checks = [...identity, ...questChecks];
    return {
        passed: checks.every((c) => c.pass),
        repo,
        commit: { sha: snap.commit.sha, date: snap.commit.date, message: snap.commit.message },
        checks,
        truncated: snap.truncated,
    };
}

const ok = (id, label, detail = '') => ({ id, label, pass: true, hint: '', detail });
const fail = (id, label, hint, detail = '') => ({ id, label, pass: false, hint, detail });
