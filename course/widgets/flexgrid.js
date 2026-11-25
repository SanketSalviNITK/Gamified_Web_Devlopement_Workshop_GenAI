// Lesson 2.4 "Layout playground": switch the parent between block, flex and grid, change the
// options and watch the cards rearrange. Two small challenges to solve.
import { el } from './util.js';

const CARDS = ['Weather app', 'Portfolio', 'Chatbot', '3D scene', 'Game'];

export function mount(root) {
    const v = { display: 'block', direction: 'row', justify: 'flex-start', align: 'stretch', wrap: 'nowrap', columns: '3', gap: 12 };
    const box = el('div.fg-box', {}, ...CARDS.map((c, i) => el('div.fg-card', { style: { '--h': `${44 + (i % 3) * 14}px` } }, c)));
    const css = el('pre.pl-prompt');
    const controls = el('div.fg-controls');
    const goals = el('ul.gf-goals');
    const done = new Set();

    const select = (key, label, options, show) => {
        const s = el('select', { 'aria-label': label, onchange: (e) => { v[key] = e.target.value; render(); } }, ...options.map((o) => el('option', { value: o, selected: o === v[key] }, o)));
        return el('label.fg-ctl', { 'data-show': show }, el('span', {}, label), s);
    };

    controls.append(
        el('div.fg-modes', {}, ...['block', 'flex', 'grid'].map((d) => el('button.pl-part', { type: 'button', 'data-mode': d, onclick: () => { v.display = d; render(); } }, `display: ${d}`))),
        select('direction', 'flex-direction', ['row', 'column'], 'flex'),
        select('justify', 'justify-content', ['flex-start', 'center', 'space-between', 'space-around', 'flex-end'], 'flex'),
        select('align', 'align-items', ['stretch', 'flex-start', 'center', 'flex-end'], 'flex'),
        select('wrap', 'flex-wrap', ['nowrap', 'wrap'], 'flex'),
        select('columns', 'grid columns', ['1', '2', '3', '4', 'auto-fit'], 'grid'),
        el('label.fg-ctl', { 'data-show': 'flex grid' }, el('span', {}, 'gap'), el('input', { type: 'range', min: 0, max: 32, value: v.gap, 'aria-label': 'gap', oninput: (e) => { v.gap = Number(e.target.value); render(); } })),
    );

    function render() {
        controls.querySelectorAll('[data-mode]').forEach((b) => { const on = b.dataset.mode === v.display; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
        controls.querySelectorAll('[data-show]').forEach((c) => { c.hidden = !c.dataset.show.split(' ').includes(v.display); });
        const s = box.style;
        s.display = v.display;
        s.flexDirection = v.direction; s.justifyContent = v.justify; s.alignItems = v.align; s.flexWrap = v.wrap;
        s.gap = v.display === 'block' ? '' : `${v.gap}px`;
        s.gridTemplateColumns = v.display === 'grid' ? (v.columns === 'auto-fit' ? 'repeat(auto-fit, minmax(110px, 1fr))' : `repeat(${v.columns}, 1fr)`) : '';
        box.dataset.display = v.display;
        const lines = [`display: ${v.display};`];
        if (v.display === 'flex') lines.push(`flex-direction: ${v.direction};`, `justify-content: ${v.justify};`, `align-items: ${v.align};`, `flex-wrap: ${v.wrap};`, `gap: ${v.gap}px;`);
        if (v.display === 'grid') lines.push(`grid-template-columns: ${s.gridTemplateColumns};`, `gap: ${v.gap}px;`);
        css.textContent = `.projects {\n  ${lines.join('\n  ')}\n}`;
        if (v.display === 'flex' && v.direction === 'row' && v.justify === 'space-between' && v.wrap === 'nowrap') done.add('row');
        if (v.display === 'grid' && v.columns === '3' && v.gap >= 8) done.add('grid');
        goals.replaceChildren(
            el('li' + (done.has('row') ? '.done' : ''), {}, 'A single row with space between the cards'),
            el('li' + (done.has('grid') ? '.done' : ''), {}, 'A 3-column grid with a gap'),
        );
        if (done.size === 2) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'layout' }));
    }

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Layout playground'), el('span', {}, 'Style the parent; the cards follow.')),
        controls,
        el('div.fg-stage', {}, box),
        el('div.gf-bottom', {}, el('div', {}, el('div.w-label', {}, 'CSS'), css), el('div', {}, el('div.w-label', {}, 'Challenges'), goals)),
    );
    render();
}
