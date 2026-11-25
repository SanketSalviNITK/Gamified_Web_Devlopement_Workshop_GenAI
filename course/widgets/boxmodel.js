// Lesson 2.3 "Box model lab": sliders for width, padding, border and margin with the box drawn in
// the browser dev-tools colours, plus the size it really takes up.
import { el } from './util.js';

export function mount(root) {
    const v = { width: 200, padding: 20, border: 4, margin: 16, borderBox: false };
    const stage = el('div.bm-stage');
    const margin = el('div.bm-margin');
    const border = el('div.bm-border');
    const padding = el('div.bm-padding');
    const content = el('div.bm-content', {}, 'Weather app');
    margin.append(el('span.bm-tag', {}, 'margin'), border);
    border.append(el('span.bm-tag', {}, 'border'), padding);
    padding.append(el('span.bm-tag', {}, 'padding'), content);
    stage.append(margin);
    const maths = el('div.bm-maths', { 'aria-live': 'polite' });
    const css = el('pre.pl-prompt');
    let moved = new Set();

    const slider = (key, label, min, max) => {
        const out = el('output', {}, `${v[key]}px`);
        const input = el('input', { type: 'range', min, max, value: v[key], 'aria-label': label });
        input.addEventListener('input', () => { v[key] = Number(input.value); out.textContent = `${v[key]}px`; moved.add(key); render(); });
        return el('label.bm-slider', {}, el('span', {}, label), input, out);
    };
    const toggle = el('label.bm-toggle', {}, el('input', { type: 'checkbox', onchange: (e) => { v.borderBox = e.target.checked; moved.add('sizing'); render(); } }), ' box-sizing: border-box');

    function render() {
        const inner = v.borderBox ? Math.max(0, v.width - 2 * v.padding - 2 * v.border) : v.width;
        const visible = inner + 2 * v.padding + 2 * v.border;
        const taken = visible + 2 * v.margin;
        margin.style.padding = `${v.margin}px`;
        border.style.borderWidth = `${v.border}px`;
        padding.style.padding = `${v.padding}px`;
        content.style.width = `${inner}px`;
        maths.replaceChildren(
            el('div', {}, el('b', {}, `${visible}px`), ' visible width = ', v.borderBox
                ? `${v.width} (border-box: padding and border fit inside the width)`
                : `${inner} content + ${2 * v.padding} padding + ${2 * v.border} border`),
            el('div', {}, el('b', {}, `${taken}px`), ` space taken on the page, including ${2 * v.margin}px of margin`),
        );
        css.textContent = `.card {\n  width: ${v.width}px;\n  padding: ${v.padding}px;\n  border: ${v.border}px solid #f59e0b;\n  margin: ${v.margin}px;${v.borderBox ? '\n  box-sizing: border-box;' : ''}\n}`;
        if (moved.size >= 4) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'box' }));
    }

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Box model lab'), el('span', {}, 'Change each layer and watch the card grow.')),
        el('div.bm-grid', {},
            el('div.bm-controls', {}, slider('width', 'width', 100, 280), slider('padding', 'padding', 0, 48), slider('border', 'border', 0, 16), slider('margin', 'margin', 0, 48), toggle),
            stage),
        maths,
        el('div.w-label', {}, 'CSS'), css,
    );
    render();
    moved = new Set();
}
