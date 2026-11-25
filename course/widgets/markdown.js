// Lesson 1.5 "README studio": live Markdown preview with a checklist. The description check is
// the exact rule the Quest 1 verifier runs on GitHub (imported from the verifier's own code).
import { el } from './util.js';
import { RULES, buildContext } from '../../supabase/functions/_shared/checks.js';

const STARTER = `# My Portfolio

`;
const ALLOWED = new Set(['H1', 'H2', 'H3', 'H4', 'P', 'UL', 'OL', 'LI', 'A', 'STRONG', 'EM', 'CODE', 'PRE', 'BLOCKQUOTE', 'BR', 'HR', 'DEL']);

// The preview only renders formatting tags; scripts, images, styles and event handlers are dropped.
function sanitize(html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const walk = (node) => {
        for (const child of [...node.children]) {
            if (!ALLOWED.has(child.tagName)) { child.replaceWith(document.createTextNode(child.textContent)); continue; }
            for (const attr of [...child.attributes]) {
                const keep = child.tagName === 'A' && attr.name === 'href' && /^(https?:|mailto:|#)/i.test(attr.value);
                if (!keep) child.removeAttribute(attr.name);
            }
            if (child.tagName === 'A') { child.setAttribute('target', '_blank'); child.setAttribute('rel', 'noopener'); }
            walk(child);
        }
    };
    walk(doc.body.firstChild);
    return doc.body.firstChild.innerHTML;
}

export function mount(root) {
    const input = el('textarea.md-input', { spellcheck: 'true', 'aria-label': 'README.md', rows: 10 });
    input.value = STARTER;
    const preview = el('div.md-preview');
    const checks = el('ul.md-checks', { 'aria-live': 'polite' });
    const readmeRule = RULES[1].find((r) => r.id === 'readme');

    function update() {
        const text = input.value;
        const render = window.marked ? window.marked.parse(text) : text.replace(/[<>&]/g, '');
        preview.innerHTML = sanitize(render);
        const verdict = readmeRule.test(buildContext({ files: { 'README.md': text }, paths: ['README.md'] }));
        const items = [
            { ok: /^#{1,6}\s+\S/m.test(text), label: 'A heading with your project name', hint: 'Start a line with # and a space.' },
            { ok: verdict.pass, label: 'A real description (the Quest 1 verifier rule)', hint: verdict.detail, verifier: true },
            { ok: /^\s*[-*+]\s+\S/m.test(text), label: 'A bullet list (what you used, or what it does)', hint: 'Start lines with "- ".' },
            { ok: /\[[^\]]+\]\([^)\s]+\)/.test(text), label: 'A link, e.g. to your live site', hint: 'Use [text](https://...).' },
        ];
        checks.replaceChildren(...items.map((i) => el('li' + (i.ok ? '.done' : ''), {},
            el('span', {}, i.label), i.verifier ? el('span.md-pill', {}, 'verifier') : null,
            el('small', {}, i.ok && !i.verifier ? '' : i.hint))));
        if (items.every((i) => i.ok)) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'readme' }));
    }
    input.addEventListener('input', update);

    const copy = el('button.w-btn.ghost', { type: 'button', onclick: async () => {
        try { await navigator.clipboard.writeText(input.value); copy.textContent = '✓ Copied'; } catch { copy.textContent = 'Select the text and copy it'; }
        setTimeout(() => { copy.textContent = '📋 Copy for your repo'; }, 1800);
    } }, '📋 Copy for your repo');

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'README studio'), el('span', {}, 'Type Markdown on the left; GitHub would show the right.')),
        el('div.md-split', {}, el('div', {}, el('div.w-label', {}, 'README.md'), input), el('div', {}, el('div.w-label', {}, 'Preview'), preview)),
        el('div.md-foot', {}, checks, copy),
    );
    update();
}
