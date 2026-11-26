// Lesson 5.2 "Regex lab": write a pattern that matches every green line and none of the red ones.
// Matches are highlighted live, and common mistakes get a specific hint.
import { el } from './util.js';

const CHALLENGES = [
    {
        title: 'Spot a greeting',
        start: 'hi',
        yes: ['hi', 'Hello there!', 'HEY, nice site'],
        no: ['this is great', 'which project is best?', 'they said no'],
        hint: (re) => {
            if (re.test('this is great') || re.test('which project is best?')) return '"hi" is hiding inside "this" and "which". Wrap the words in \\b (word boundary): \\b(hi|hello|hey)\\b';
            if (re.test('they said no')) return '"hey" is hiding inside "they". Use \\b so it only matches the whole word.';
            if (!re.test('HEY, nice site') || !re.test('Hello there!')) return 'Capitals count. Add the i flag (ignore case), and use | for "or": hi|hello|hey';
            return null;
        },
    },
    {
        title: 'Questions about your work',
        start: 'project',
        yes: ['Show me your projects', 'What have you built?', 'Got a portfolio?'],
        no: ['hello', 'What\'s your email?', 'Do you like pizza?'],
        hint: (re) => (!re.test('What have you built?') || !re.test('Got a portfolio?') ? 'People ask in different words. List several with |: project|built|portfolio' : null),
    },
    {
        title: 'Find an email address',
        start: '@',
        yes: ['mail me: ana@example.com', 'ana.rao@uni.edu', 'contact me at sam99@mail.co'],
        no: ['ana at example dot com', 'follow @ana', 'email me!'],
        hint: (re) => (re.test('follow @ana') ? 'A lone @ isn\'t an email. Ask for letters before it and a dot after: \\w+@\\w+\\.\\w+' : 'Build it from parts: \\w+ (letters or digits), then @, then \\w+, then \\. (a real dot), then \\w+'),
    },
];

const CHEATS = [['a|b', 'a or b'], ['\\b', 'word edge'], ['i', 'flag: ignore case'], ['\\w', 'letter, digit or _'], ['\\d', 'digit'], ['+', 'one or more'], ['?', 'optional'], ['\\.', 'a real dot'], ['( )', 'group'], ['^ $', 'start / end']];

export function mount(root) {
    let level = 0;
    const solved = new Set();
    const saved = CHALLENGES.map((c) => ({ p: c.start, f: '' }));
    const pattern = el('input.rx-input', { type: 'text', spellcheck: 'false', 'aria-label': 'Pattern' });
    const flags = el('input.rx-flags', { type: 'text', spellcheck: 'false', maxlength: 4, 'aria-label': 'Flags', placeholder: 'flags' });
    const tabs = el('div.sb-buttons');
    const rows = el('ul.rx-rows', { 'aria-live': 'polite' });
    const note = el('div.sb-verdict');

    function highlight(text, re) {
        const m = re.exec(text);
        if (!m) return [text];
        return [text.slice(0, m.index), el('mark', {}, m[0] || '·'), text.slice(m.index + m[0].length)];
    }

    function render() {
        const ch = CHALLENGES[level];
        tabs.replaceChildren(...CHALLENGES.map((c, i) => el('button.pl-part' + (i === level ? '.on' : ''), {
            type: 'button', onclick: () => { saved[level] = { p: pattern.value, f: flags.value }; level = i; pattern.value = saved[i].p; flags.value = saved[i].f; render(); },
        }, `${solved.has(i) ? '✓' : `${i + 1}.`} ${c.title}`)));
        let re;
        try { re = new RegExp(pattern.value, flags.value.replace(/[^gimsuy]/g, '').replace('g', '')); }
        catch (err) { rows.replaceChildren(el('li.rx-row.bad', {}, `That pattern has a syntax error: ${err.message}`)); note.className = 'sb-verdict bad'; note.textContent = 'Fix the pattern: maybe a ( without a ), or a stray \\ at the end.'; return; }
        let ok = 0;
        const all = [...ch.yes.map((t) => [t, true]), ...ch.no.map((t) => [t, false])];
        rows.replaceChildren(...all.map(([t, want]) => {
            const got = pattern.value !== '' && re.test(t);
            const good = got === want;
            if (good) ok += 1;
            return el('li.rx-row' + (good ? '.good' : '.bad'), {},
                el('span.rx-want', {}, want ? 'should match' : 'should NOT match'),
                el('span.rx-text', {}, ...(got ? highlight(t, re) : [t])),
                el('span.rx-mark', {}, good ? '✓' : '✗'));
        }));
        if (ok === all.length) {
            solved.add(level);
            note.className = 'sb-verdict good';
            note.textContent = solved.size === CHALLENGES.length ? `All ${CHALLENGES.length} solved! In JavaScript: /${pattern.value}/${flags.value}.test(message)` : `Solved! /${pattern.value}/${flags.value} → try the next challenge.`;
            if (solved.size === CHALLENGES.length) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'regex' }));
            tabs.querySelectorAll('button')[level].textContent = `✓ ${ch.title}`;
        } else {
            note.className = 'sb-verdict bad';
            note.textContent = `${ok} of ${all.length} lines right. ${ch.hint(re) || 'Keep going: check the red lines.'}`;
        }
    }
    pattern.addEventListener('input', render);
    flags.addEventListener('input', render);

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Regex lab'), el('span', {}, 'Match every green line and none of the red.')),
        tabs,
        el('div.rx-bar', {}, el('span', {}, '/'), pattern, el('span', {}, '/'), flags),
        rows,
        note,
        el('div.rx-cheats', {}, ...CHEATS.map(([c, d]) => el('span', {}, el('code', {}, c), ` ${d}`))),
    );
    pattern.value = CHALLENGES[0].start;
    render();
}
