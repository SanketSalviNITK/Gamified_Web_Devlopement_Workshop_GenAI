// Downloads a snapshot of a public GitHub repository at its latest commit:
// repository metadata, the commit, the full file list and the text of the relevant files.
// `fetchImpl` is injectable so tests can serve a fake GitHub.
import { isTextPath } from './checks.js';

const SKIP_DIR = /(^|\/)(node_modules|vendor|dist|build|\.git|\.next|coverage)\//i;
const VENDORED = /(^|\/)(three|three\.module|three\.min|jquery|bootstrap|tailwind)[^/]*\.js$|\.min\.(js|css)$/i;

export class RepoError extends Error {
    constructor(code, message) { super(message); this.code = code; }
}

export function parseRepo(input) {
    const s = String(input || '').trim();
    const m = s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?(?:[/?#].*)?$/i)
        || s.match(/^([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})$/);
    if (!m) return null;
    return { owner: m[1], name: m[2].replace(/\.git$/i, '') };
}

/**
 * @returns {Promise<{repo, commit, paths: string[], files: Record<string,string>, truncated: boolean}>}
 */
export async function fetchSnapshot({ owner, name, token = '', fetchImpl = fetch, maxFiles = 40, maxBytes = 300_000 }) {
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'glitch-raid-verifier',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const api = async (path) => {
        const res = await fetchImpl(`https://api.github.com${path}`, { headers });
        if (res.status === 404) throw new RepoError('not_found', 'Repository not found. Check the URL and make sure the repository is public.');
        if (res.status === 403 || res.status === 429) throw new RepoError('rate_limited', 'GitHub is rate-limiting the verifier. Try again in a few minutes.');
        if (res.status === 409) throw new RepoError('empty', 'This repository is empty. Push your first commit, then try again.');
        if (!res.ok) throw new RepoError('github_error', `GitHub returned ${res.status}.`);
        return res.json();
    };

    const repoJson = await api(`/repos/${owner}/${name}`);
    const branch = repoJson.default_branch || 'main';
    const commitJson = await api(`/repos/${repoJson.owner.login}/${repoJson.name}/commits/${encodeURIComponent(branch)}`);
    const sha = commitJson.sha;
    const treeJson = await api(`/repos/${repoJson.owner.login}/${repoJson.name}/git/trees/${sha}?recursive=1`);

    const blobs = (treeJson.tree || []).filter((t) => t.type === 'blob');
    const paths = blobs.map((b) => b.path);
    const wanted = blobs
        .filter((b) => isTextPath(b.path) && !SKIP_DIR.test(b.path) && !VENDORED.test(b.path) && (b.size ?? 0) <= maxBytes)
        .sort((a, b) => depth(a.path) - depth(b.path) || priority(a.path) - priority(b.path))
        .slice(0, maxFiles);

    const files = {};
    await Promise.all(wanted.map(async (b) => {
        const url = `https://raw.githubusercontent.com/${repoJson.owner.login}/${repoJson.name}/${sha}/${b.path.split('/').map(encodeURIComponent).join('/')}`;
        const res = await fetchImpl(url, { headers: { 'User-Agent': headers['User-Agent'] } });
        if (res.ok) files[b.path] = await res.text();
    }));

    return {
        repo: {
            fullName: repoJson.full_name,
            ownerLogin: repoJson.owner.login,
            ownerId: repoJson.owner.id,
            private: !!repoJson.private,
            fork: !!repoJson.fork,
            defaultBranch: branch,
        },
        commit: {
            sha,
            date: commitJson.commit?.committer?.date || commitJson.commit?.author?.date || null,
            message: (commitJson.commit?.message || '').split('\n')[0].slice(0, 120),
        },
        paths,
        files,
        truncated: !!treeJson.truncated,
    };
}

const depth = (p) => p.split('/').length;
const priority = (p) => (/^index\.html$/i.test(p) ? 0 : /^readme/i.test(p) ? 1 : /\.html?$/i.test(p) ? 2 : /\.m?js$/i.test(p) ? 3 : 4);
