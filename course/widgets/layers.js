// Lesson 2.1 "Layers": the same page with and without CSS, with every tag linked to the element
// it creates. Hover (or focus) a line of HTML to light up its element, and the other way round.
import { el } from './util.js';

const NODES = [
    { tag: 'header', depth: 0, open: '<header>' },
    { tag: 'h1', depth: 1, text: 'Ana Rao', line: '<h1>Ana Rao</h1>' },
    { tag: 'p', depth: 1, text: 'Web developer in training', line: '<p>Web developer in training</p>', cls: 'tagline' },
    { close: '</header>', depth: 0 },
    { tag: 'section', depth: 0, open: '<section id="projects">' },
    { tag: 'h2', depth: 1, text: 'Projects', line: '<h2>Projects</h2>' },
    { tag: 'div', depth: 1, text: 'Weather app', line: '<div class="card">Weather app</div>', cls: 'card' },
    { tag: 'div', depth: 1, text: '3D portfolio', line: '<div class="card">3D portfolio</div>', cls: 'card' },
    { close: '</section>', depth: 0 },
];

export function mount(root) {
    const source = el('pre.ly-src', { 'aria-label': 'HTML source' });
    const preview = el('div.ly-preview.styled');
    const cssOn = el('button.w-btn.ghost.picked', { type: 'button', 'aria-pressed': 'true' }, '🎨 CSS: on');
    const boxesOn = el('button.w-btn.ghost', { type: 'button', 'aria-pressed': 'false' }, '▢ Show boxes');
    const note = el('div.ly-note', { 'aria-live': 'polite' }, 'Hover a line of HTML to find its element.');

    // Build the preview elements and the matching source lines.
    let parent = preview;
    const stack = [];
    NODES.forEach((n, k) => {
        if (n.close) {
            source.append(el('div.ly-line', { style: { paddingLeft: `${n.depth * 1.2}em` } }, n.close));
            parent = stack.pop();
            return;
        }
        const node = el(n.tag + (n.cls ? '.' + n.cls : ''), { 'data-k': k }, n.text || '');
        parent.append(node);
        const line = el('div.ly-line.tag', { 'data-k': k, tabindex: '0', style: { paddingLeft: `${n.depth * 1.2}em` } }, n.open || n.line);
        source.append(line);
        if (n.open) { stack.push(parent); parent = node; }
    });

    const light = (k) => {
        root.querySelectorAll('.hl').forEach((x) => x.classList.remove('hl'));
        if (k == null) { note.textContent = 'Hover a line of HTML to find its element.'; return; }
        root.querySelectorAll(`[data-k="${k}"]`).forEach((x) => x.classList.add('hl'));
        const n = NODES[k];
        note.textContent = `<${n.tag}> ${({ header: 'groups the top of the page', h1: 'is the main heading', p: 'is a paragraph of text', section: 'groups one part of the page', h2: 'is a section heading', div: 'is a generic box, styled here as a card' })[n.tag]}.`;
    };
    root.addEventListener('mouseover', (e) => { const t = e.target.closest('[data-k]'); if (t && root.contains(t)) light(t.dataset.k); });
    root.addEventListener('focusin', (e) => { const t = e.target.closest('[data-k]'); if (t) light(t.dataset.k); });
    root.addEventListener('mouseleave', () => light(null));

    let peeled = false;
    cssOn.addEventListener('click', () => {
        const on = preview.classList.toggle('styled');
        cssOn.textContent = on ? '🎨 CSS: on' : '🎨 CSS: off';
        cssOn.classList.toggle('picked', on);
        cssOn.setAttribute('aria-pressed', String(on));
        if (!on) peeled = true;
        if (on && peeled) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'layers' }));
    });
    boxesOn.addEventListener('click', () => {
        const on = preview.classList.toggle('boxes');
        boxesOn.classList.toggle('picked', on);
        boxesOn.setAttribute('aria-pressed', String(on));
    });

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Layers'), el('span', {}, 'Switch the CSS off to see the bare HTML structure.')),
        el('div.ly-split', {}, el('div', {}, el('div.w-label', {}, 'index.html'), source), el('div', {}, el('div.w-label', {}, 'In the browser'), preview)),
        el('div.ly-foot', {}, note, el('div.ly-btns', {}, cssOn, boxesOn)),
    );
}
