// Quest checks, run against a snapshot of a student's GitHub repository.
//
// Pure functions (no network, no Deno/Node APIs) so the exact same rules run in the
// verify-quest Edge Function and in the test suite. They are static checks: they confirm the
// code contains what each quest asks for. They do not open the site in a browser.

export const QUESTS = {
    1: 'Boot Mainframe (Git & GitHub)',
    2: 'Identity Shell (Portfolio)',
    3: 'Holo Projection (3D Web)',
    4: 'Chassis Sync (3D Avatar)',
    5: 'Consciousness (Chatbot)',
};

const TEXT_EXT = /\.(html?|m?js|css|md|markdown|txt)$/i;
export const isTextPath = (p) => TEXT_EXT.test(p) || /(^|\/)readme$/i.test(p);

/**
 * @param {{ files: Record<string,string>, paths: string[] }} snapshot
 *   files: path -> text for the files that were downloaded; paths: every path in the repo.
 */
export function buildContext(snapshot) {
    const files = snapshot.files || {};
    const paths = snapshot.paths || Object.keys(files);
    const lowerPaths = new Set(paths.map((p) => p.toLowerCase()));
    const byLower = Object.fromEntries(Object.keys(files).map((p) => [p.toLowerCase(), p]));
    const get = (p) => (byLower[p.toLowerCase()] !== undefined ? files[byLower[p.toLowerCase()]] : undefined);

    const htmlPaths = Object.keys(files).filter((p) => /\.html?$/i.test(p));
    const indexPath = ['index.html', 'docs/index.html', 'public/index.html'].find((p) => get(p) !== undefined) || null;
    const index = indexPath ? get(indexPath) : '';
    const html = htmlPaths.map((p) => files[p]).join('\n');

    const inlineScripts = [];
    const inlineStyles = [];
    for (const doc of htmlPaths.map((p) => files[p])) {
        for (const m of doc.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) inlineScripts.push(m[1]);
        for (const m of doc.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) inlineStyles.push(m[1]);
        for (const m of doc.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)) inlineStyles.push(m[1]);
    }
    const jsFiles = Object.keys(files).filter((p) => /\.m?js$/i.test(p));
    const js = [...jsFiles.map((p) => files[p]), ...inlineScripts].join('\n');
    const css = [...Object.keys(files).filter((p) => /\.css$/i.test(p)).map((p) => files[p]), ...inlineStyles].join('\n');

    return {
        files, paths, lowerPaths, get, indexPath, index, html, js, css,
        jsChunks: [...jsFiles.map((p) => ({ path: p, text: files[p] })), ...inlineScripts.map((text) => ({ path: indexPath || 'inline', text }))],
        code: `${html}\n${js}\n${css}`,
    };
}

// ---------------------------------------------------------------------------
// Rules. test() returns true/false, or { pass, detail } to explain what was found.

const has = (re, text) => re.test(text || '');
const count = (re, text) => ((text || '').match(re) || []).length;

function stripMarkdown(md) {
    return md
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/^#+\s.*$/gm, ' ')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`>#-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function resolveRepoPath(ref, fromPath) {
    if (/^https?:\/\//i.test(ref) || ref.startsWith('//')) return { url: ref };
    const clean = ref.split(/[?#]/)[0];
    const base = clean.startsWith('/') ? [] : (fromPath || '').split('/').slice(0, -1);
    const parts = [...base, ...clean.replace(/^\//, '').split('/')];
    const out = [];
    for (const part of parts) {
        if (!part || part === '.') continue;
        if (part === '..') out.pop();
        else out.push(part);
    }
    return { path: out.join('/') };
}

export const RULES = {
    1: [
        {
            id: 'readme',
            label: 'README.md describes your project',
            hint: 'Add a README.md in the root of the repository with at least a sentence about your project (headings alone do not count).',
            test: (c) => {
                const readme = ['README.md', 'readme.md', 'README', 'README.markdown'].map(c.get).find((t) => t !== undefined);
                if (readme === undefined) return { pass: false, detail: 'No README.md found in the repository root.' };
                const words = stripMarkdown(readme).split(' ').filter(Boolean).length;
                return { pass: words >= 6, detail: `README has ${words} word${words === 1 ? '' : 's'} of description.` };
            },
        },
    ],
    2: [
        {
            id: 'index',
            label: 'Portfolio page index.html exists',
            hint: 'Put your portfolio in index.html at the root of the repository (or docs/index.html for GitHub Pages).',
            test: (c) => ({ pass: !!c.indexPath, detail: c.indexPath ? `Found ${c.indexPath}.` : 'No index.html found.' }),
        },
        {
            id: 'sections',
            label: 'About, Projects and Skills sections',
            hint: 'Your page needs sections for About Me, Projects and Skills (headings, ids or class names all count).',
            test: (c) => {
                const missing = [['About', /about/i], ['Projects', /projects?\b/i], ['Skills', /skills?\b/i]]
                    .filter(([, re]) => !re.test(c.index)).map(([n]) => n);
                return { pass: !missing.length, detail: missing.length ? `Missing: ${missing.join(', ')}.` : 'All three sections found.' };
            },
        },
        {
            id: 'own-css',
            label: 'Hand-written CSS styles the page',
            hint: 'Style the page with your own CSS (in a <style> tag or a .css file). The quest asks for at least a handful of rules.',
            test: (c) => {
                const rules = count(/\{[^{}]*:[^{}]*\}/g, c.css);
                return { pass: rules >= 8, detail: `${rules} CSS rule${rules === 1 ? '' : 's'} found.` };
            },
        },
        {
            id: 'no-framework',
            label: 'No CSS framework (pure CSS)',
            hint: 'Remove Tailwind, Bootstrap or other CSS frameworks; this quest is about writing the styles yourself.',
            test: (c) => {
                // Only look at what the page loads, not its wording ("Materialize your shell" is fine).
                const fw = '(tailwind|bootstrap|bulma|materialize|foundation|uikit)';
                const loaded = `${(c.html.match(/<(link|script)\b[^>]*>/gi) || []).join(' ')} ${(c.css.match(/@(import|tailwind)[^;]*/gi) || []).join(' ')}`;
                const m = (loaded.match(new RegExp(fw, 'i')) || [])[1] || (/@tailwind\b/i.test(c.css) ? 'tailwind' : undefined);
                return { pass: !m, detail: m ? `Found a reference to ${m}.` : 'No CSS framework detected.' };
            },
        },
        {
            id: 'glass',
            label: 'Glassmorphism effect (backdrop-filter)',
            hint: 'The frosted-glass look comes from backdrop-filter: blur(...). Ask your AI to add it to your cards or panels.',
            test: (c) => has(/backdrop-filter\s*:\s*[^;]*blur/i, c.css),
        },
        {
            id: 'responsive',
            label: 'Responsive layout',
            hint: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> and use flexbox, grid or @media rules.',
            test: (c) => {
                const viewport = has(/<meta[^>]+name\s*=\s*["']viewport["']/i, c.index);
                const layout = has(/@media|display\s*:\s*(flex|grid|inline-flex|inline-grid)/i, c.css);
                return { pass: viewport && layout, detail: `${viewport ? 'Viewport meta tag found' : 'No viewport meta tag'}; ${layout ? 'flex/grid/@media found' : 'no flex, grid or @media rules'}.` };
            },
        },
    ],
    3: [
        {
            id: 'three',
            label: 'Three.js is loaded',
            hint: 'Load Three.js, for example with a <script type="importmap"> or a CDN <script> tag, as the intel suggests.',
            test: (c) => has(/three(\.module)?(\.min)?\.js|["']three["']|three@\d|\/three\/build\//i, c.code),
        },
        {
            id: 'scene',
            label: 'Scene, camera and WebGL renderer are set up',
            hint: 'Your JavaScript should create a THREE.Scene, a camera (PerspectiveCamera) and a THREE.WebGLRenderer.',
            test: (c) => {
                const parts = { Scene: /\bScene\s*\(/, Camera: /(Perspective|Orthographic)Camera\s*\(/, WebGLRenderer: /WebGLRenderer\s*\(/ };
                const missing = Object.entries(parts).filter(([, re]) => !re.test(c.js)).map(([n]) => n);
                return { pass: !missing.length, detail: missing.length ? `Missing: ${missing.join(', ')}.` : 'Scene, camera and renderer found.' };
            },
        },
        {
            id: 'mesh',
            label: 'A 3D object is added to the scene',
            hint: 'Create a mesh from a geometry and a material (e.g. new THREE.Mesh(new THREE.TorusKnotGeometry(), material)) and add it to the scene.',
            test: (c) => has(/\bMesh\s*\(/, c.js) && has(/Geometry\s*\(/, c.js),
        },
        {
            id: 'animate',
            label: 'The object is animated',
            hint: 'Use requestAnimationFrame (or renderer.setAnimationLoop) and change the object\'s rotation every frame.',
            test: (c) => has(/requestAnimationFrame|setAnimationLoop/, c.js) && has(/rotation\.[xyz]\s*[+\-*]?=|rotate[XYZ]\s*\(|rotation\.set\s*\(/, c.js),
        },
        {
            id: 'background',
            label: 'Canvas is a fixed background',
            hint: 'Make the canvas position: fixed (with a negative z-index) so it sits behind your portfolio.',
            test: (c) => has(/position\s*[:=]\s*['"]?fixed/i, `${c.css}\n${c.js}`),
        },
    ],
    4: [
        {
            id: 'loader',
            label: 'GLTFLoader loads a model',
            hint: 'Import GLTFLoader from the Three.js addons and call loader.load(...) with your model file.',
            test: (c) => has(/GLTFLoader/, c.js) && has(/\.load(Async)?\s*\(/, c.js),
        },
        {
            id: 'model',
            label: 'The .glb / .gltf model is in the repository (or a public URL)',
            hint: 'Commit your .glb file to the repository and make sure the path in your code matches it exactly (paths are case-sensitive on the web).',
            test: (c) => {
                for (const chunk of c.jsChunks) {
                    for (const m of chunk.text.matchAll(/['"`]([^'"`\s]+?\.(glb|gltf))(\?[^'"`]*)?['"`]/gi)) {
                        // The browser resolves loader paths against the page (index.html), not the .js file.
                        // Also accept the script's folder, for new URL('./x.glb', import.meta.url).
                        const page = resolveRepoPath(m[1], c.indexPath || 'index.html');
                        if (page.url) return { pass: true, detail: `Model loaded from ${page.url}.` };
                        const candidates = [...new Set([page.path, resolveRepoPath(m[1], chunk.path).path])];
                        const found = candidates.find((p) => c.paths.includes(p));
                        if (found) return { pass: true, detail: `Found ${found} in the repository.` };
                        if (candidates.some((p) => c.lowerPaths.has(p.toLowerCase()))) {
                            return { pass: false, detail: `Code loads "${m[1]}" but the file's capitalisation differs in the repository.` };
                        }
                        return { pass: false, detail: `Code loads "${m[1]}" but ${page.path} is not in the repository.` };
                    }
                }
                return { pass: false, detail: 'No .glb or .gltf path found in your JavaScript.' };
            },
        },
        {
            id: 'spin',
            label: 'The model rotates on its Y axis',
            hint: 'In your animation loop, change model.rotation.y a little every frame.',
            test: (c) => has(/rotation\.y\s*[+\-]?=|rotateY\s*\(/, c.js),
        },
    ],
    5: [
        {
            id: 'chat-ui',
            label: 'Chat window with a text input',
            hint: 'Add a chat window to index.html with an <input> (or <textarea>) for the visitor\'s message.',
            test: (c) => has(/<(input|textarea)\b/i, c.html) && has(/chat/i, c.html),
        },
        {
            id: 'chat-logic',
            label: 'JavaScript reads the message and shows a reply',
            hint: 'Your chatbot script should read the input\'s .value and add the messages to the page (appendChild, innerHTML or textContent).',
            test: (c) => c.jsChunks.some(({ text }) => /\.value\b/.test(text) && /appendChild|insertAdjacentHTML|innerHTML|textContent|\.append\s*\(/.test(text)),
        },
        {
            id: 'regex',
            label: 'Answers use regex keyword matching (3+ patterns)',
            hint: 'Match the visitor\'s message with regular expressions, e.g. /project|portfolio/i.test(message), for at least three topics.',
            test: (c) => {
                const n = count(/\/(?:[^/\n\\]|\\.){2,}\/[gimsuy]*\s*\.test\s*\(/g, c.js)
                    + count(/\.(match|search|replace)\s*\(\s*\/(?:[^/\n\\]|\\.){2,}\//g, c.js)
                    + count(/new\s+RegExp\s*\(/g, c.js)
                    + count(/\{\s*(pattern|regex|re|keywords?)\s*:\s*\/(?:[^/\n\\]|\\.){2,}\/[gimsuy]*/g, c.js);
                return { pass: n >= 3, detail: `${n} regex pattern${n === 1 ? '' : 's'} found.` };
            },
        },
        {
            id: 'corner',
            label: 'Chat window is fixed to the bottom-right corner',
            hint: 'Style the chat window with position: fixed plus bottom and right offsets.',
            test: (c) => {
                const text = `${c.css}\n${c.js}`;
                return has(/position\s*[:=]\s*['"]?fixed/i, text) && has(/\bbottom\s*[:=]/i, text) && has(/\bright\s*[:=]/i, text);
            },
        },
        {
            id: 'scroll',
            label: 'Chat auto-scrolls to the newest message',
            hint: 'After adding a message, set chat.scrollTop = chat.scrollHeight (or use scrollIntoView).',
            test: (c) => has(/scrollTop\s*=\s*[^;\n]*scrollHeight|scrollIntoView\s*\(|scrollTo\s*\(/, c.js),
        },
    ],
};

/** Run every rule for a quest. Returns [{ id, label, pass, hint, detail }]. */
export function runQuestChecks(quest, ctx) {
    const rules = RULES[quest];
    if (!rules) throw new Error(`Unknown quest ${quest}`);
    return rules.map((rule) => {
        let res;
        try { res = rule.test(ctx); } catch (e) { res = { pass: false, detail: `Check failed to run: ${e.message}` }; }
        const r = typeof res === 'object' && res !== null ? res : { pass: !!res };
        return { id: rule.id, label: rule.label, pass: !!r.pass, hint: r.pass ? '' : rule.hint, detail: r.detail || '' };
    });
}
