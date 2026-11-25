// "Pre-flight check": paste your index.html and run the same quest checks the verifier runs on
// GitHub, before pushing. (Ownership and freshness checks need GitHub, so they only run there.)
import { el } from './util.js';
import { QUESTS, buildContext, runQuestChecks } from '../../supabase/functions/_shared/checks.js';

export function mount(root, { quest = 2 } = {}) {
    const input = el('textarea.md-input', { spellcheck: 'false', rows: 10, 'aria-label': 'Your index.html', placeholder: 'Paste the full contents of your index.html here…' });
    const run = el('button.w-btn', { type: 'button' }, `✈️ Run the Quest ${quest} checks`);
    const out = el('ul.pf-results', { 'aria-live': 'polite' });
    const summary = el('div.pf-summary');

    run.addEventListener('click', () => {
        const text = input.value;
        if (!text.trim()) { summary.textContent = 'Paste your index.html first.'; out.replaceChildren(); return; }
        const results = runQuestChecks(quest, buildContext({ files: { 'index.html': text }, paths: ['index.html'] }));
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
        input,
        el('div.pf-row', {}, run),
        summary, out,
    );
}
