// Tests for the quest verifier. Run with: node --test tests/
// A fake GitHub serves sample student repositories, so no network is needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifySubmission } from '../supabase/functions/_shared/verify.js';
import { fetchSnapshot, parseRepo } from '../supabase/functions/_shared/github.js';

// ---------------------------------------------------------------------------
// Sample repository that completes every quest (what a good student ends with).
const GOOD = {
    'README.md': '# Ana\'s Portfolio\n\nThis is my personal portfolio built during the gamified GenAI web workshop.\n',
    'index.html': `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; font-family: sans-serif; }
  .card { background: rgba(255,255,255,.1); backdrop-filter: blur(12px); border-radius: 16px; }
  .grid { display: grid; gap: 1rem; }
  header { padding: 2rem; }
  h1 { font-size: 3rem; }
  section { padding: 2rem; }
  a { color: cyan; }
  #bg { position: fixed; inset: 0; z-index: -1; }
  #chat { position: fixed; bottom: 20px; right: 20px; }
  @media (max-width: 600px) { h1 { font-size: 2rem; } }
</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"}}</script>
</head><body>
<section id="about"><h2>About Me</h2></section>
<section id="projects"><h2>Projects</h2></section>
<section id="skills"><h2>Skills</h2></section>
<div id="chat"><div id="chat-log"></div><input id="chat-input"><button>Send</button></div>
<script type="module" src="bg.js"></script>
<script src="js/chatbot.js"></script>
</body></html>`,
    'bg.js': `import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ alpha: true });
const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.3), new THREE.MeshStandardMaterial());
scene.add(knot);
let model;
new GLTFLoader().load('./assets/avatar.glb', (g) => { model = g.scene; scene.add(model); });
function animate() { requestAnimationFrame(animate); knot.rotation.x += 0.01; if (model) model.rotation.y += 0.01; renderer.render(scene, camera); }
animate();`,
    'assets/avatar.glb': '<binary>',
    'js/chatbot.js': `const input = document.getElementById('chat-input');
const log = document.getElementById('chat-log');
const answers = [
  { re: /hello|hi|hey/i, text: 'Hi there!' },
  { re: /project|portfolio/i, text: 'Check out my projects section.' },
  { re: /skill|stack/i, text: 'I know HTML, CSS and JavaScript.' },
];
function reply(msg) {
  if (/hello|hi/i.test(msg)) return 'Hi!';
  if (/project/i.test(msg)) return 'See my projects.';
  if (/contact|email/i.test(msg)) return 'Email me!';
  return "I'm not sure yet.";
}
input.addEventListener('change', () => {
  const p = document.createElement('p'); p.textContent = input.value; log.appendChild(p);
  log.scrollTop = log.scrollHeight;
});`,
};

const NOW = Date.parse('2026-11-24T10:00:00Z');
const JOINED = '2026-11-24T09:00:00Z';
const PROFILE = { github_login: 'ana-dev', github_id: 1001 };

function fakeGitHub({ files = GOOD, owner = 'ana-dev', ownerId = 1001, name = 'portfolio', priv = false, commitDate = '2026-11-24T09:30:00Z', missing = false, status = 200 } = {}) {
    const sha = 'abc1234def5678';
    const calls = [];
    const fetchImpl = async (url) => {
        calls.push(url);
        const respond = (body, code = 200) => ({
            ok: code >= 200 && code < 300, status: code,
            json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
        });
        if (status !== 200) return respond({ message: 'nope' }, status);
        const u = new URL(url);
        if (u.hostname === 'api.github.com') {
            if (missing) return respond({ message: 'Not Found' }, 404);
            const base = `/repos/${owner}/${name}`;
            if (u.pathname.toLowerCase() === base.toLowerCase()) {
                return respond({ full_name: `${owner}/${name}`, name, owner: { login: owner, id: ownerId }, private: priv, fork: false, default_branch: 'main' });
            }
            if (u.pathname === `${base}/commits/main`) return respond({ sha, commit: { committer: { date: commitDate }, message: 'Add quest work\n\nbody' } });
            if (u.pathname === `${base}/git/trees/${sha}`) {
                return respond({ tree: Object.keys(files).map((p) => ({ path: p, type: 'blob', size: files[p].length })), truncated: false });
            }
        }
        if (u.hostname === 'raw.githubusercontent.com') {
            const path = decodeURIComponent(u.pathname.split('/').slice(4).join('/'));
            if (path in files) return respond(files[path]);
        }
        return respond({ message: 'unexpected ' + url }, 500);
    };
    return { fetchImpl, calls };
}

const run = (quest, opts = {}, args = {}) => {
    const gh = fakeGitHub(opts);
    return verifySubmission({
        quest,
        repoInput: args.repo ?? 'https://github.com/ana-dev/portfolio',
        profile: args.profile ?? PROFILE,
        workSince: args.workSince ?? JOINED,
        snapshot: (owner, name) => fetchSnapshot({ owner, name, fetchImpl: gh.fetchImpl }),
    });
};
const failed = (r) => r.checks.filter((c) => !c.pass).map((c) => c.id);
const without = (...paths) => Object.fromEntries(Object.entries(GOOD).filter(([p]) => !paths.includes(p)));
const edit = (path, fn) => ({ ...GOOD, [path]: fn(GOOD[path]) });

// ---------------------------------------------------------------------------
test('parses repository links', () => {
    assert.deepEqual(parseRepo('https://github.com/ana-dev/portfolio'), { owner: 'ana-dev', name: 'portfolio' });
    assert.deepEqual(parseRepo('github.com/ana-dev/portfolio.git'), { owner: 'ana-dev', name: 'portfolio' });
    assert.deepEqual(parseRepo('https://github.com/ana-dev/my.site/tree/main/src'), { owner: 'ana-dev', name: 'my.site' });
    assert.deepEqual(parseRepo('ana-dev/portfolio'), { owner: 'ana-dev', name: 'portfolio' });
    assert.equal(parseRepo('https://gitlab.com/ana/portfolio'), null);
    assert.equal(parseRepo('not a repo'), null);
});

test('a complete repository passes every quest', async () => {
    for (const quest of [1, 2, 3, 4, 5]) {
        const r = await run(quest);
        assert.equal(r.passed, true, `quest ${quest} failed: ${JSON.stringify(r.checks.filter((c) => !c.pass))}`);
        assert.equal(r.commit.sha, 'abc1234def5678');
        assert.equal(r.repo, 'ana-dev/portfolio');
    }
});

test('identity: repository must belong to the signed-in student', async () => {
    const r = await run(2, { owner: 'someone-else', ownerId: 999 }, { repo: 'someone-else/portfolio' });
    assert.equal(r.passed, false);
    assert.deepEqual(failed(r), ['owner']);
    assert.match(r.checks.find((c) => c.id === 'owner').hint, /@ana-dev/);
});

test('identity: GitHub id is used, so a renamed account still matches', async () => {
    const r = await run(1, { owner: 'ana-renamed', ownerId: 1001 }, { repo: 'ana-renamed/portfolio' });
    assert.equal(r.passed, true);
});

test('identity: private and missing repositories are rejected with guidance', async () => {
    assert.deepEqual(failed(await run(1, { priv: true })), ['public']);
    const missing = await run(1, { missing: true });
    assert.equal(missing.passed, false);
    assert.equal(missing.error, 'not_found');
    assert.match(missing.checks[0].hint, /public/);
    const limited = await run(1, { status: 403 });
    assert.equal(limited.error, 'rate_limited');
    const bad = await run(1, {}, { repo: 'https://example.com/x' });
    assert.equal(bad.error, 'bad_repo');
});

test('freshness: old commits cannot be resubmitted for a new quest', async () => {
    const stale = await run(3, { commitDate: '2026-11-24T09:30:00Z' }, { workSince: '2026-11-24T09:50:00Z' });
    assert.deepEqual(failed(stale), ['fresh']);
    const withinGrace = await run(3, { commitDate: '2026-11-24T09:45:00Z' }, { workSince: '2026-11-24T09:50:00Z' });
    assert.equal(withinGrace.passed, true);
});

test('quest 1: README must contain a real description', async () => {
    assert.deepEqual(failed(await run(1, { files: without('README.md') })), ['readme']);
    assert.deepEqual(failed(await run(1, { files: { ...GOOD, 'README.md': '# Portfolio\n' } })), ['readme']);
});

test('quest 2: portfolio requirements', async () => {
    assert.deepEqual(failed(await run(2, { files: without('index.html') })), ['index', 'sections', 'own-css', 'glass', 'responsive']);
    assert.deepEqual(failed(await run(2, { files: edit('index.html', (h) => h.replace(/Skills/g, 'Hobbies').replace('id="skills"', 'id="hobbies"')) })), ['sections']);
    assert.deepEqual(failed(await run(2, { files: edit('index.html', (h) => h.replace('<head>', '<head><link rel="stylesheet" href="https://cdn.tailwindcss.com/x.css">')) })), ['no-framework']);
    assert.deepEqual(failed(await run(2, { files: edit('index.html', (h) => h.replace('backdrop-filter: blur(12px);', '')) })), ['glass']);
    assert.deepEqual(failed(await run(2, { files: edit('index.html', (h) => h.replace('<h2>About Me</h2>', '<h2>About Me</h2><p>Materialize your bootstrap ideas</p>')) })), [], 'framework names in page text are fine');
    assert.deepEqual(failed(await run(2, { files: edit('index.html', (h) => h.replace('<style>', '<style>@import url("https://cdn.jsdelivr.net/npm/bulma/css/bulma.css");')) })), ['no-framework']);
    assert.deepEqual(failed(await run(2, { files: edit('index.html', (h) => h.replace(/<meta name="viewport"[^>]*>/, '')) })), ['responsive']);
});

test('quest 3: Three.js scene requirements', async () => {
    assert.deepEqual(failed(await run(3, { files: edit('bg.js', (s) => s.replace(/requestAnimationFrame\(animate\);/, '').replace('knot.rotation.x += 0.01;', '')) })), ['animate']);
    assert.deepEqual(failed(await run(3, { files: edit('bg.js', (s) => s.replace('new THREE.WebGLRenderer', 'new THREE.SVGRenderer')) })), ['scene']);
    assert.deepEqual(failed(await run(3, { files: edit('index.html', (h) => h.replace('#bg { position: fixed;', '#bg { position: absolute;')) })), []);
    const noFixed = { ...GOOD, 'index.html': GOOD['index.html'].replace(/position: fixed/g, 'position: absolute') };
    assert.ok(failed(await run(3, { files: noFixed })).includes('background'));
});

test('quest 4: model must exist where the code loads it from', async () => {
    assert.deepEqual(failed(await run(4, { files: without('assets/avatar.glb') })), ['model']);
    const r = await run(4, { files: { ...without('assets/avatar.glb'), 'assets/Avatar.glb': 'x' } });
    assert.match(r.checks.find((c) => c.id === 'model').detail, /capitalisation/);
    assert.equal((await run(4, { files: edit('bg.js', (s) => s.replace("'./assets/avatar.glb'", "'https://models.example.com/me.glb'")) })).passed, true);
    assert.deepEqual(failed(await run(4, { files: edit('bg.js', (s) => s.replace('model.rotation.y += 0.01;', '')) })), ['spin']);
});

test('quest 5: chatbot requirements', async () => {
    const twoPatterns = `const input = document.querySelector('input'); const log = document.querySelector('#chat-log');
function reply(m) { if (/hello/i.test(m)) return 'hi'; if (/bye/i.test(m)) return 'bye'; return '?'; }
input.onchange = () => { log.innerHTML += input.value; log.scrollTop = log.scrollHeight; };`;
    assert.deepEqual(failed(await run(5, { files: { ...GOOD, 'js/chatbot.js': twoPatterns } })), ['regex']);
    assert.deepEqual(failed(await run(5, { files: edit('js/chatbot.js', (s) => s.replace('log.scrollTop = log.scrollHeight;', '')) })), ['scroll']);
    assert.deepEqual(failed(await run(5, { files: edit('index.html', (h) => h.replace('#chat { position: fixed; bottom: 20px; right: 20px; }', '#chat { margin: 1rem; }').replace('#bg { position: fixed; inset: 0; z-index: -1; }', '')) })), ['corner']);
});

test('vendored libraries and node_modules are not downloaded', async () => {
    const files = { ...GOOD, 'node_modules/x/index.js': 'x', 'libs/three.min.js': 'x'.repeat(10), 'big.js': 'y' };
    const gh = fakeGitHub({ files });
    const snap = await fetchSnapshot({ owner: 'ana-dev', name: 'portfolio', fetchImpl: gh.fetchImpl });
    assert.ok(!('node_modules/x/index.js' in snap.files));
    assert.ok(!('libs/three.min.js' in snap.files));
    assert.ok('big.js' in snap.files);
    assert.ok(snap.paths.includes('libs/three.min.js'), 'all paths are still listed');
});
