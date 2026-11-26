// Lesson 4.3 "Path lab": type the path you'd pass to loader.load() and see the URL the browser
// actually requests, on GitHub Pages, on Live Server and when index.html is double-clicked.
// Shows why "it works on my laptop" can still be a 404 online.
import { el } from './util.js';

const FILES = ['index.html', 'css/style.css', 'js/bg.js', 'assets/Robot.glb'];
const SIZES = { 'assets/Robot.glb': '162 KB' };
const HOSTS = {
    pages: { label: 'GitHub Pages', base: 'https://ana.github.io/my-portfolio/', caseSensitive: true },
    live: { label: 'Live Server (Windows laptop)', base: 'http://127.0.0.1:5500/', caseSensitive: false },
    file: { label: 'Double-clicked index.html', base: 'file:///C:/Users/Ana/my-portfolio/' },
};
const PRESETS = ['/assets/Robot.glb', 'assets/robot.glb', '../assets/Robot.glb', 'Robot.glb', 'C:\\Users\\Ana\\my-portfolio\\assets\\Robot.glb', './assets/Robot.glb'];

export function mount(root) {
    let host = 'pages';
    const seen = { pages404: false };
    const input = el('input.pa-input', { type: 'text', value: '/assets/Robot.glb', spellcheck: 'false', 'aria-label': 'Path passed to loader.load' });
    const hostRow = el('div.sb-buttons');
    const tree = el('ul.pa-tree');
    const net = el('div.pa-net', { 'aria-live': 'polite' });
    const note = el('div.sb-verdict');

    function resolve(path) {
        const h = HOSTS[host];
        if (/^[a-z]:\\/i.test(path) || path.includes('\\Users\\')) {
            return { status: 'local', url: path, why: 'That is a path on your own computer. Visitors load your site from GitHub, and their browsers can\'t reach your hard drive. Use a path relative to index.html, like assets/Robot.glb.' };
        }
        let url;
        try { url = new URL(path, h.base + 'index.html'); } catch { return { status: 'bad', url: path, why: 'That isn\'t a valid path.' }; }
        if (host === 'file') {
            return { status: 'cors', url: url.href, why: 'Opening index.html by double-clicking uses file://, and browsers block loading files from file:// pages for security (a CORS error). Run a local server instead: Live Server in VS Code, or npx serve.' };
        }
        if (!url.href.startsWith(h.base)) {
            return { status: 404, url: url.href, why: path.startsWith('/') && host === 'pages'
                ? 'A leading / means "the root of the website". On GitHub Pages your site lives in /my-portfolio/, so /assets/… points outside it. Drop the leading slash.'
                : 'This path climbs out of your site\'s folder. Paths in loader.load() are relative to the page (index.html), not to the .js file that contains them.' };
        }
        const rel = decodeURIComponent(url.href.slice(h.base.length));
        const match = FILES.find((f) => (h.caseSensitive ? f === rel : f.toLowerCase() === rel.toLowerCase()));
        if (match) {
            let caseNote = match !== rel ? ` Careful: it worked because Windows ignores capitals, but the file is really "${match}". GitHub Pages is case-sensitive, so this path would be a 404 online.` : '';
            if (host === 'live' && /^(\/|\.\.\/)/.test(path)) caseNote += ' Careful: this only works because Live Server\'s root is your project folder. On GitHub Pages your site lives in /my-portfolio/, so this path breaks.';
            return { status: 200, url: url.href, file: match, why: `Found ${match}.${caseNote}`, warn: !!caseNote };
        }
        const near = FILES.find((f) => f.toLowerCase() === rel.toLowerCase());
        if (near) return { status: 404, url: url.href, why: `Capitals matter on GitHub Pages: you asked for "${rel}" but the file is "${near}". (It worked on Windows, which ignores case.)` };
        if (rel === 'Robot.glb') return { status: 404, url: url.href, why: 'The file is inside the assets folder. Include the folder: assets/Robot.glb.' };
        return { status: 404, url: url.href, why: `There's no ${rel} in the repository.` };
    }

    function render() {
        hostRow.replaceChildren(el('span.w-label', {}, 'Page opened from:'), ...Object.entries(HOSTS).map(([k, h]) => el('button.pl-part' + (host === k ? '.on' : ''), {
            type: 'button', onclick: () => { host = k; render(); },
        }, h.label)));
        const r = resolve(input.value.trim());
        tree.replaceChildren(el('li.dir', {}, '📁 my-portfolio/'), ...FILES.map((f) => el('li' + (r.file === f ? '.hit' : ''), { style: { paddingLeft: `${(f.split('/').length) * 0.9}rem` } },
            `${f.endsWith('.glb') ? '🧊' : '📄'} ${f}`)));
        const statusText = { 200: '200 OK', 404: '404 Not Found', cors: '(failed) CORS error', local: '(blocked) not a web address', bad: '(failed)' }[r.status];
        net.replaceChildren(
            el('div.pa-row.head', {}, el('span', {}, 'Network'), el('span', {}, 'Status'), el('span', {}, 'Size')),
            el('div.pa-row' + (r.status === 200 ? '.ok' : '.err'), {}, el('span.pa-url', {}, `GET ${r.url}`), el('span', {}, statusText), el('span', {}, r.status === 200 ? SIZES[r.file] || '1 KB' : '0 B')),
        );
        note.className = `sb-verdict ${r.status === 200 && !r.warn ? 'good' : 'bad'}`;
        note.textContent = r.why;
        if (host === 'pages' && r.status !== 200) seen.pages404 = true;
        if (host === 'pages' && r.status === 200 && seen.pages404) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'path' }));
    }
    input.addEventListener('input', render);

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Path lab'), el('span', {}, 'Fix the path so the robot loads on GitHub Pages.')),
        hostRow,
        el('div.pa-grid', {},
            el('div', {}, el('div.w-label', {}, 'Repository'), tree),
            el('div', {},
                el('div.w-label', {}, 'js/bg.js'),
                el('div.pa-code', {}, el('span', {}, 'loader.load(\''), input, el('span', {}, '\', onLoad);')),
                el('div.pa-presets', {}, el('span.w-label', {}, 'Try:'), ...PRESETS.map((p) => el('button.w-btn.ghost', { type: 'button', onclick: () => { input.value = p; render(); } }, p))),
                net)),
        note,
    );
    render();
}
