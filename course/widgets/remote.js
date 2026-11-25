// Lesson 1.4 "Push and pull": commits fly between your laptop and GitHub, and the panel shows
// what the workshop verifier can see.
import { el, flyDot, fakeHash } from './util.js';

export function mount(root) {
    const local = [{ hash: '3f2a91c', msg: 'First commit' }];
    const remote = [{ hash: '3f2a91c', msg: 'First commit' }];
    let busy = false;
    let pushed = false;

    const localList = el('div.rm-stack');
    const remoteList = el('div.rm-stack');
    const statusLine = el('div.rm-status', { 'aria-live': 'polite' });
    const verifier = el('div.rm-verifier');
    const term = el('pre.gf-term.small');
    const msgs = ['Add About section', 'Add Projects list', 'Fix typo in README', 'Add contact link'];

    const ahead = () => local.filter((c) => !remote.some((r) => r.hash === c.hash)).length;
    const behind = () => remote.filter((c) => !local.some((r) => r.hash === c.hash)).length;
    const row = (c, isNew) => el('div.rm-commit' + (isNew ? '.new' : ''), {}, el('span.gf-hash', {}, c.hash), el('span', {}, c.msg));

    function render() {
        localList.replaceChildren(...local.map((c) => row(c, !remote.some((r) => r.hash === c.hash))).reverse());
        remoteList.replaceChildren(...remote.map((c) => row(c, !local.some((r) => r.hash === c.hash))).reverse());
        const a = ahead(), b = behind();
        statusLine.textContent = a && b ? `Your branch and 'origin/main' have diverged: pull first, then push.`
            : a ? `Your branch is ahead of 'origin/main' by ${a} commit${a > 1 ? 's' : ''}. GitHub doesn't have ${a > 1 ? 'them' : 'it'} yet.`
            : b ? `Your branch is behind 'origin/main' by ${b} commit${b > 1 ? 's' : ''}. Run git pull.`
            : `Your branch is up to date with 'origin/main'.`;
        const latest = remote[remote.length - 1];
        verifier.replaceChildren(el('div.w-label', {}, '🔍 What the verifier sees'), el('div', {}, `Latest commit on GitHub: `, el('b', {}, latest.hash), ` "${latest.msg}"`));
    }

    const go = async (fn) => { if (busy) return; busy = true; try { await fn(); } finally { busy = false; render(); } };

    const commitBtn = el('button.w-btn.ghost', { type: 'button', onclick: () => go(async () => {
        const c = { hash: fakeHash(), msg: msgs[(local.length - 1) % msgs.length] };
        local.push(c);
        term.textContent = `$ git commit -m "${c.msg}"\n[main ${c.hash}] ${c.msg}`;
    }) }, 'git commit');

    const pushBtn = el('button.w-btn', { type: 'button', onclick: () => go(async () => {
        if (behind()) { term.textContent = `$ git push\n! [rejected] main -> main (fetch first)\nhint: GitHub has work you don't have. Run git pull, then push again.`; return; }
        const missing = local.filter((c) => !remote.some((r) => r.hash === c.hash));
        if (!missing.length) { term.textContent = '$ git push\nEverything up-to-date'; return; }
        term.textContent = `$ git push\nEnumerating objects... Writing objects: 100%\nTo github.com:ana/portfolio.git`;
        for (const c of missing) {
            await flyDot(localList, remoteList, { label: c.hash.slice(0, 3) });
            remote.push(c);
            render();
        }
        term.textContent += `\n   ${missing[0].hash}..${missing[missing.length - 1].hash}  main -> main`;
        pushed = true;
        root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'pushed' }));
    }) }, 'git push ⬆');

    const teammateBtn = el('button.w-btn.ghost', { type: 'button', onclick: () => go(async () => {
        const c = { hash: fakeHash(), msg: 'Teammate: add footer' };
        remote.push(c);
        term.textContent = `# Your teammate pushed "${c.msg}" from their laptop.`;
    }) }, '👥 Teammate pushes');

    const pullBtn = el('button.w-btn.ghost', { type: 'button', onclick: () => go(async () => {
        const missing = remote.filter((c) => !local.some((r) => r.hash === c.hash));
        if (!missing.length) { term.textContent = '$ git pull\nAlready up to date.'; return; }
        term.textContent = '$ git pull\nUpdating... Fast-forward';
        for (const c of missing) {
            await flyDot(remoteList, localList, { label: c.hash.slice(0, 3), color: 'var(--neon-purple)' });
            local.push(c);
            render();
        }
    }) }, 'git pull ⬇');

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Push & pull'), el('span', {}, 'Make a commit, then push it to GitHub.')),
        el('div.rm-grid', {},
            el('section.rm-side', {}, el('h4', {}, '💻 Your laptop'), localList),
            el('div.rm-pipe', { 'aria-hidden': 'true' }, el('span', {}, 'origin')),
            el('section.rm-side.gh', {}, el('h4', {}, '☁️ GitHub'), remoteList),
        ),
        el('div.rm-actions', {}, commitBtn, pushBtn, teammateBtn, pullBtn),
        statusLine, verifier, term,
    );
    term.textContent = '$ git status';
    render();
    void pushed;
}
