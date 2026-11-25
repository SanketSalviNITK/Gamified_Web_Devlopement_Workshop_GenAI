// Lesson 2.6 "Device resizer": drag the screen width and watch a portfolio switch layouts, with the
// matching @media rule highlighted. Switch off the viewport tag to see what phones do without it.
import { el } from './util.js';

const CSS_LINES = [
    { text: '.projects { display: grid;', rule: 'base' },
    { text: '  grid-template-columns: repeat(3, 1fr); }', rule: 'wide' },
    { text: '', rule: null },
    { text: '@media (max-width: 900px) {', rule: 'mid' },
    { text: '  .projects { grid-template-columns: repeat(2, 1fr); } }', rule: 'mid' },
    { text: '', rule: null },
    { text: '@media (max-width: 600px) {', rule: 'narrow' },
    { text: '  h1 { font-size: 1.6rem; }', rule: 'narrow' },
    { text: '  .projects { grid-template-columns: 1fr; } }', rule: 'narrow' },
];

export function mount(root) {
    let width = 1024;
    let viewport = true;
    const seen = new Set();
    const page = el('div.rs-page', {},
        el('header.rs-head', {}, el('h1', {}, 'Ana Rao'), el('p', {}, 'Web developer in training')),
        el('div.rs-projects', {}, ...['Weather app', 'Portfolio', 'Chatbot'].map((p) => el('div.rs-card', {}, el('b', {}, p), el('span', {}, 'HTML · CSS · JS')))));
    const screen = el('div.rs-screen', {}, page);
    const frame = el('div.rs-frame', {}, screen);
    const fit = el('div.rs-fit', {}, frame);
    const code = el('pre.rs-css');
    const label = el('div.rs-label', { 'aria-live': 'polite' });
    const range = el('input', { type: 'range', min: 320, max: 1280, step: 1, value: width, 'aria-label': 'Screen width' });
    const vpBtn = el('button.w-btn.ghost.picked', { type: 'button', 'aria-pressed': 'true' }, '✓ viewport tag');

    const presets = el('div.rs-presets', {}, ...[['📱 Phone', 375], ['📟 Tablet', 768], ['💻 Laptop', 1280]].map(([n, w]) => el('button.w-btn.ghost', { type: 'button', onclick: () => { width = w; range.value = w; render(); } }, n)));
    range.addEventListener('input', () => { width = Number(range.value); render(); });
    vpBtn.addEventListener('click', () => {
        viewport = !viewport;
        vpBtn.textContent = viewport ? '✓ viewport tag' : '✗ no viewport tag';
        vpBtn.classList.toggle('picked', viewport);
        vpBtn.setAttribute('aria-pressed', String(viewport));
        if (!viewport) seen.add('novp');
        render();
    });

    function render() {
        // Without the viewport tag, phones lay the page out at 980px and shrink it to fit.
        const layoutWidth = !viewport && width < 980 ? 980 : width;
        const scaleDown = width / layoutWidth;
        const rule = layoutWidth <= 600 ? 'narrow' : layoutWidth <= 900 ? 'mid' : 'wide';
        page.dataset.layout = rule;
        screen.style.width = `${layoutWidth}px`;
        screen.style.transform = scaleDown < 1 ? `scale(${scaleDown})` : '';
        frame.style.width = `${width}px`;
        frame.style.height = `${Math.round(Math.max(220, page.scrollHeight * scaleDown + 8))}px`;
        // Fit the whole device into the widget.
        const room = fit.clientWidth || 600;
        const zoom = Math.min(1, room / width);
        frame.style.transform = `scale(${zoom})`;
        fit.style.height = `${parseFloat(frame.style.height) * zoom + 4}px`;
        code.replaceChildren(...CSS_LINES.map((l) => el('div' + (l.rule && (l.rule === rule || l.rule === 'base') ? '.on' : ''), {}, l.text || ' ')));
        label.textContent = !viewport && width < 980
            ? `${width}px phone, no viewport tag: the page is laid out at 980px and shrunk to ${Math.round(scaleDown * 100)}%. Tiny text!`
            : `${width}px wide: ${rule === 'narrow' ? 'phone layout (1 column, smaller heading)' : rule === 'mid' ? 'tablet layout (2 columns)' : 'desktop layout (3 columns)'}`;
        seen.add(rule);
        if (seen.has('narrow') && seen.has('mid') && seen.has('wide') && seen.has('novp')) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'responsive' }));
    }

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Device resizer'), el('span', {}, 'Drag the width, then try a phone without the viewport tag.')),
        el('div.rs-controls', {}, presets, range, vpBtn),
        label,
        fit,
        el('div.w-label', {}, 'CSS (active rules lit up)'), code,
    );
    new ResizeObserver(() => render()).observe(fit);
    render();
}
