// Lesson 1.1 "Time machine": scrub through commits of a page, watch an AI change break it,
// then restore the last good version in one click.
import { el } from './util.js';

const VERSIONS = [
    { hash: '3f2a91c', msg: 'First commit', lines: ['<h1>Ana Rao</h1>'] },
    { hash: '8b41d0e', msg: 'Add About section', lines: ['<h1>Ana Rao</h1>', '<section id="about">', '  <p>I build things for the web.</p>', '</section>'] },
    { hash: 'c77e5a2', msg: 'Add Projects list', lines: ['<h1>Ana Rao</h1>', '<section id="about">', '  <p>I build things for the web.</p>', '</section>', '<section id="projects">', '  <li>Weather app</li>', '  <li>3D portfolio</li>', '</section>'] },
    { hash: 'e09b4f1', msg: 'AI: make the header cooler', broken: true, lines: ['<h1 style="display:none">Ana Rao</h1>', '<section id="about" hidden>', '  <p>I build things for the web.</p>', '</section>', '<section id="projects" hidden>', '  <li>Weather app</li>', '  <li>3D portfolio</li>', '</section>'] },
];

function preview(v) {
    if (v.broken) return el('div.tl-page.broken', {}, el('div.tl-blank', {}, '(blank page)'), el('div.tl-err', {}, 'Everything is hidden!'));
    const page = el('div.tl-page');
    page.append(el('div.tl-h1', {}, 'Ana Rao'));
    if (v.lines.some((l) => l.includes('about'))) page.append(el('div.tl-sec', {}, el('b', {}, 'About'), el('span', {}, 'I build things for the web.')));
    if (v.lines.some((l) => l.includes('projects'))) page.append(el('div.tl-sec', {}, el('b', {}, 'Projects'), el('span', {}, '• Weather app  • 3D portfolio')));
    return page;
}

export function mount(root) {
    let current = VERSIONS.length - 1;
    let restored = false;
    const history = VERSIONS.slice();

    const rail = el('div.tl-rail', { role: 'tablist', 'aria-label': 'Commit history' });
    const code = el('pre.tl-code', { 'aria-live': 'polite' });
    const view = el('div.tl-view');
    const status = el('div.tl-status', { 'aria-live': 'polite' });
    const restore = el('button.w-btn.tl-restore', { type: 'button' }, '⏪ Restore the last good version');

    function render() {
        rail.replaceChildren(...history.map((v, i) => el('button.tl-node' + (i === current ? '.on' : '') + (v.broken ? '.bad' : '') + (v.restore ? '.fix' : ''), {
            type: 'button', role: 'tab', 'aria-selected': String(i === current),
            onclick: () => { current = i; render(); },
        }, el('span.tl-dot'), el('span.tl-hash', {}, v.hash), el('span.tl-msg', {}, v.msg))));
        const v = history[current];
        const prev = history[current - 1];
        code.replaceChildren(...v.lines.map((line) => el('div' + (prev && !prev.lines.includes(line) ? '.add' : ''), {}, line)));
        view.replaceChildren(preview(v));
        status.textContent = v.broken
            ? 'This commit broke the page. Every earlier snapshot is still safe in the history.'
            : v.restore ? 'Back to a working page, and even the broken attempt is still in the history if you need it.'
            : `Viewing commit ${v.hash}: "${v.msg}". Drag through the history to travel in time.`;
        restore.hidden = restored || !history[history.length - 1].broken;
    }

    restore.addEventListener('click', () => {
        const good = VERSIONS[2];
        history.push({ ...good, hash: '5d0c3b8', msg: `Restore "${good.msg}"`, restore: true, broken: false });
        current = history.length - 1;
        restored = true;
        render();
        root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'restored' }));
    });

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Time machine'), el('span', {}, 'Click a commit to see the page at that moment.')),
        rail,
        el('div.tl-split', {}, el('div', {}, el('div.w-label', {}, 'index.html'), code), el('div', {}, el('div.w-label', {}, 'In the browser'), view)),
        el('div.tl-foot', {}, status, restore),
    );
    render();
}
