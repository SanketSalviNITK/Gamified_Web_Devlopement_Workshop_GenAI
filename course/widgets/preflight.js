// "Pre-flight check": paste your index.html and run the same quest checks the verifier runs on
// GitHub, before pushing. (Ownership and freshness checks need GitHub, so they only run there.)
import { el } from './util.js';
import { QUESTS, buildContext, runQuestChecks } from '../../supabase/functions/_shared/checks.js';

export function mount(root, { quest = 2, js = null } = {}) {
    const input = el('textarea.md-input', { spellcheck: 'false', rows: 10, 'aria-label': 'Your index.html', placeholder: 'Paste the full contents of your index.html here…' });
    // Optional second file, e.g. bg.js for Quest 3 (the verifier reads every .js file in the repo).
    const jsInput = js ? el('textarea.md-input', { spellcheck: 'false', rows: 10, 'aria-label': `Your ${js}`, placeholder: `Paste ${js} here (leave empty if your script is inside index.html)…` }) : null;
    const run = el('button.w-btn', { type: 'button' }, `✈️ Run the Quest ${quest} checks`);
    const out = el('ul.pf-results', { 'aria-live': 'polite' });
    const summary = el('div.pf-summary');

    run.addEventListener('click', () => {
        const text = input.value;
        if (!text.trim()) { summary.textContent = 'Paste your index.html first.'; out.replaceChildren(); return; }
        const files = { 'index.html': text };
        if (jsInput && jsInput.value.trim()) files[js] = jsInput.value;
        const results = runQuestChecks(quest, buildContext({ files, paths: Object.keys(files) }));
        const ok = results.filter((r) => r.pass).length;
        summary.className = `pf-summary ${ok === results.length ? 'good' : 'bad'}`;
        summary.textContent = ok === results.length
            ? `✓ All ${results.length} checks pass. Commit, push, and submit Quest ${quest} for the real verification.`
            : `${ok} of ${results.length} checks pass. Fix the ones below, then run it again.`;
        out.replaceChildren(...results.map((r) => el('li.check-item' + (r.pass ? '.pass' : '.fail'), {},
            el('span.mark', {}, r.pass ? '✓' : '✗'),
            el('span', {}, r.label, r.detail ? el('span.detail', {}, r.detail) : '', !r.pass && r.hint ? el('span.hint', {}, r.hint) : ''))));
        if (ok === results.length) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'preflight' }));
    });

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Pre-flight check'), el('span', {}, `Quest ${quest}: ${QUESTS[quest]}`)),
        jsInput ? el('div.pf-files', {}, el('div', {}, el('div.w-label', {}, 'index.html'), input), el('div', {}, el('div.w-label', {}, js), jsInput)) : input,
        el('div.pf-row', {}, run),
        summary, out,
    );
}
