// Lesson 1.2 "Git simulator": edit files, stage them, commit them, and watch each change move
// between the working directory, the staging area and the repository. A terminal shows the
// matching command and `git status`.
import { el, flipMove, fakeHash } from './util.js';

const FILES = ['index.html', 'style.css', 'README.md'];

export function mount(root) {
    const state = Object.fromEntries(FILES.map((f) => [f, 'clean'])); // clean | modified | staged
    const commits = [{ hash: '3f2a91c', msg: 'First commit', files: FILES.slice() }];
    const goals = { edit: false, stage: false, commit: false };

    const cols = {
        work: el('div.gf-drop'),
        stage: el('div.gf-drop'),
        repo: el('div.gf-drop.gf-commits'),
    };
    const chips = {};
    const term = el('pre.gf-term', { 'aria-live': 'polite' });
    const msgInput = el('input.gf-msg', { type: 'text', placeholder: 'Commit message, e.g. Add About section', 'aria-label': 'Commit message', maxlength: 60 });
    const commitBtn = el('button.w-btn', { type: 'button' }, 'git commit');
    const addAllBtn = el('button.w-btn.ghost', { type: 'button' }, 'git add .');
    const goalList = el('ul.gf-goals');

    const log = (cmd, out) => {
        term.textContent = `$ ${cmd}\n${out}`.trim();
    };
    const statusText = () => {
        const staged = FILES.filter((f) => state[f] === 'staged');
        const modified = FILES.filter((f) => state[f] === 'modified');
        if (!staged.length && !modified.length) return 'On branch main\nnothing to commit, working tree clean';
        let s = 'On branch main';
        if (staged.length) s += '\nChanges to be committed:\n' + staged.map((f) => `        modified:   ${f}`).join('\n');
        if (modified.length) s += '\nChanges not staged for commit:\n' + modified.map((f) => `        modified:   ${f}`).join('\n');
        return s;
    };

    function chip(file) {
        const edit = el('button.gf-act', { type: 'button', 'aria-label': `Edit ${file}` }, '✏️ edit');
        const add = el('button.gf-act', { type: 'button', 'aria-label': `Stage ${file}` }, `git add`);
        edit.addEventListener('click', () => {
            if (state[file] !== 'clean') return;
            state[file] = 'modified';
            goals.edit = true;
            log(`# you changed ${file} in your editor`, statusText());
            render();
        });
        add.addEventListener('click', () => stage(file));
        return el('div.gf-chip', { 'data-file': file }, el('span.gf-name', {}, file), el('span.gf-state'), edit, add);
    }

    function stage(file) {
        if (state[file] !== 'modified') return;
        state[file] = 'staged';
        goals.stage = true;
        flipMove(chips[file], cols.stage);
        log(`git add ${file}`, statusText());
        render(false);
    }

    addAllBtn.addEventListener('click', () => {
        const mod = FILES.filter((f) => state[f] === 'modified');
        if (!mod.length) { log('git add .', '(nothing to stage: edit a file first)'); return; }
        mod.forEach((f) => { state[f] = 'staged'; flipMove(chips[f], cols.stage); });
        goals.stage = true;
        log('git add .', statusText());
        render(false);
    });

    commitBtn.addEventListener('click', () => {
        const staged = FILES.filter((f) => state[f] === 'staged');
        const msg = msgInput.value.trim() || 'Update files';
        if (!staged.length) {
            log(`git commit -m "${msg}"`, 'On branch main\nnothing added to commit (use "git add" to track)' + (FILES.some((f) => state[f] === 'modified') ? '\n\nTip: your edits are not staged yet. Run git add first.' : ''));
            commitBtn.classList.add('shake');
            setTimeout(() => commitBtn.classList.remove('shake'), 400);
            return;
        }
        const hash = fakeHash();
        commits.push({ hash, msg, files: staged });
        staged.forEach((f) => { state[f] = 'clean'; });
        goals.commit = true;
        log(`git commit -m "${msg}"`, `[main ${hash}] ${msg}\n ${staged.length} file${staged.length > 1 ? 's' : ''} changed`);
        msgInput.value = '';
        // staged chips go back to the working directory, clean, and a new commit appears
        staged.forEach((f) => flipMove(chips[f], cols.work));
        render(false);
        const node = cols.repo.lastElementChild;
        node?.animate?.([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1 }, { transform: 'scale(1)' }], { duration: 500 });
        if (goals.edit && goals.stage && goals.commit) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'committed' }));
    });

    function render(placeChips = true) {
        for (const f of FILES) {
            const c = chips[f];
            c.dataset.state = state[f];
            c.querySelector('.gf-state').textContent = state[f] === 'clean' ? 'unchanged' : state[f];
            if (placeChips) (state[f] === 'staged' ? cols.stage : cols.work).append(c);
        }
        cols.repo.replaceChildren(...commits.map((c) => el('div.gf-commit', { title: c.files.join(', ') }, el('span.gf-hash', {}, c.hash), el('span', {}, c.msg))));
        goalList.replaceChildren(
            el('li' + (goals.edit ? '.done' : ''), {}, 'Edit a file'),
            el('li' + (goals.stage ? '.done' : ''), {}, 'Stage it with git add'),
            el('li' + (goals.commit ? '.done' : ''), {}, 'Save a commit'),
        );
    }

    for (const f of FILES) chips[f] = chip(f);
    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Git simulator'), el('span', {}, 'Edit a file, stage it, then commit it.')),
        el('div.gf-cols', {},
            el('section.gf-col', {}, el('h4', {}, '1 · Working directory'), el('p', {}, 'your files'), cols.work, addAllBtn),
            el('div.gf-arrow', { 'aria-hidden': 'true' }, 'git add →'),
            el('section.gf-col', {}, el('h4', {}, '2 · Staging area'), el('p', {}, 'the next snapshot'), cols.stage, el('div.gf-commitbar', {}, msgInput, commitBtn)),
            el('div.gf-arrow', { 'aria-hidden': 'true' }, 'git commit →'),
            el('section.gf-col', {}, el('h4', {}, '3 · Repository'), el('p', {}, 'saved history'), cols.repo),
        ),
        el('div.gf-bottom', {}, term, el('div', {}, el('div.w-label', {}, 'Your goals'), goalList)),
    );
    log('git status', statusText());
    render();
}
