// Lesson 2.5 "Glass tuner": sliders for transparency, blur, border and corners over a colourful
// scene. The generated CSS is checked with the real Quest 2 "glassmorphism" verifier rule.
import { el } from './util.js';
import { RULES, buildContext } from '../../supabase/functions/_shared/checks.js';

export function mount(root) {
    const v = { alpha: 0.5, blur: 0, edge: 0.0, radius: 6 };
    const card = el('div.gl-card', {}, el('h4', {}, 'Ana Rao'), el('p', {}, 'Web developer in training'), el('div.gl-chips', {}, el('span', {}, 'HTML'), el('span', {}, 'CSS'), el('span', {}, 'Three.js')));
    const scene = el('div.gl-scene', {}, el('i.b1'), el('i.b2'), el('i.b3'), card);
    const css = el('pre.pl-prompt');
    const verdict = el('div.sb-verdict', { 'aria-live': 'polite' });
    const glassRule = RULES[2].find((r) => r.id === 'glass');

    const slider = (key, label, min, max, step, fmt) => {
        const out = el('output', {}, fmt(v[key]));
        const input = el('input', { type: 'range', min, max, step, value: v[key], 'aria-label': label });
        input.addEventListener('input', () => { v[key] = Number(input.value); out.textContent = fmt(v[key]); render(); });
        return el('label.bm-slider', {}, el('span', {}, label), input, out);
    };

    function render() {
        card.style.background = `rgba(255, 255, 255, ${v.alpha})`;
        card.style.backdropFilter = card.style.webkitBackdropFilter = v.blur ? `blur(${v.blur}px)` : 'none';
        card.style.border = `1px solid rgba(255, 255, 255, ${v.edge})`;
        card.style.borderRadius = `${v.radius}px`;
        const text = `.card {\n  background: rgba(255, 255, 255, ${v.alpha});\n${v.blur ? `  backdrop-filter: blur(${v.blur}px);\n  -webkit-backdrop-filter: blur(${v.blur}px);\n` : ''}  border: 1px solid rgba(255, 255, 255, ${v.edge});\n  border-radius: ${v.radius}px;\n}`;
        css.textContent = text;
        const pass = glassRule.test(buildContext({ files: { 'style.css': text }, paths: ['style.css'] }));
        const looksGlass = pass && v.alpha >= 0.05 && v.alpha <= 0.35 && v.edge >= 0.1;
        verdict.className = `sb-verdict ${pass ? 'good' : 'bad'}`;
        verdict.replaceChildren(el('span.md-pill', {}, 'verifier'), pass
            ? (looksGlass ? ' ✓ Glassmorphism detected, and it looks like frosted glass.' : ' ✓ The verifier accepts this. For the real glass look, keep the background between 0.05 and 0.35 and add a light edge.')
            : ' ✗ No backdrop-filter blur yet: the background behind the card is still sharp.');
        if (looksGlass) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'glass' }));
    }

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Glass tuner'), el('span', {}, 'Turn the solid card into frosted glass.')),
        el('div.bm-grid', {},
            el('div.bm-controls', {},
                slider('alpha', 'background opacity', 0, 0.8, 0.01, (x) => x.toFixed(2)),
                slider('blur', 'backdrop blur', 0, 30, 1, (x) => `${x}px`),
                slider('edge', 'border opacity', 0, 0.6, 0.01, (x) => x.toFixed(2)),
                slider('radius', 'corner radius', 0, 32, 1, (x) => `${x}px`)),
            scene),
        verdict,
        el('div.w-label', {}, 'CSS'), css,
    );
    render();
}
