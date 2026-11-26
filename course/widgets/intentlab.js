// Lesson 5.3 "Intent router": a chatbot is a list of intents, each a regex and a reply. The first
// pattern that matches wins. Edit the patterns and the order until every visitor gets the right answer.
import { el } from './util.js';

const START = [
    { name: 'greeting', pattern: '\\b(hi|hello|hey)\\b', reply: 'Hi! I\'m Ana\'s bot. Ask me about her projects, skills or how to contact her.' },
    { name: 'projects', pattern: 'project|portfolio', reply: 'Ana has built a weather app, this 3D portfolio and a chatbot.' },
    { name: 'skills', pattern: 'skill|language|stack', reply: 'HTML, CSS, JavaScript and Three.js.' },
    { name: 'contact', pattern: 'contact|email', reply: 'Email ana@example.com and she\'ll get back to you.' },
];
const FALLBACK = 'Sorry, I didn\'t get that. Try asking about projects, skills or contact.';
const TESTS = [
    ['hey!', 'greeting'],
    ['Show me your work', 'projects'],
    ['Which projects use JavaScript?', 'projects'],
    ['what languages do you know?', 'skills'],
    ['Hi, what are your skills?', 'skills'],
    ['How can I reach you?', 'contact'],
    ['this bot is cool', 'fallback'],
];

export function mount(root) {
    const intents = START.map((x) => ({ ...x }));
    const table = el('div.in-table');
    const results = el('ul.rx-rows');
    const code = el('pre.pl-prompt');
    const note = el('div.sb-verdict');
    const tryInput = el('input.cb-input.in-try', { type: 'text', placeholder: 'Try your own message…', 'aria-label': 'Try a message' });
    const tryOut = el('div.s3-msg', { 'aria-live': 'polite' });

    const compile = (p) => { try { return new RegExp(p, 'i'); } catch { return null; } };
    function route(message) {
        for (const it of intents) {
            const re = compile(it.pattern);
            if (re && re.test(message)) return it;
        }
        return { name: 'fallback', reply: FALLBACK };
    }

    function renderTable() {
        table.replaceChildren(el('div.in-row.head', {}, el('span', {}, '#'), el('span', {}, 'intent'), el('span', {}, 'pattern (i flag on)'), el('span', {}, 'order')),
            ...intents.map((it, i) => {
                const input = el('input.rx-input', { type: 'text', value: it.pattern, spellcheck: 'false', 'aria-label': `${it.name} pattern`,
                    oninput: (e) => { it.pattern = e.target.value; e.target.classList.toggle('bad', !compile(it.pattern)); check(); } });
                const move = (d) => { const j = i + d; if (j < 0 || j >= intents.length) return; [intents[i], intents[j]] = [intents[j], intents[i]]; renderTable(); check(); };
                return el('div.in-row', {}, el('span.in-num', {}, String(i + 1)), el('b', {}, it.name), input,
                    el('span.in-move', {},
                        el('button.w-btn.ghost', { type: 'button', 'aria-label': `Move ${it.name} up`, disabled: i === 0, onclick: () => move(-1) }, '↑'),
                        el('button.w-btn.ghost', { type: 'button', 'aria-label': `Move ${it.name} down`, disabled: i === intents.length - 1, onclick: () => move(1) }, '↓')));
            }));
    }

    function check() {
        let ok = 0;
        results.replaceChildren(...TESTS.map(([msg, want]) => {
            const got = route(msg);
            const good = got.name === want;
            if (good) ok += 1;
            let why = '';
            if (!good && got.name === 'fallback') why = `Nothing matched. Add a word from this message to the ${want} pattern.`;
            else if (!good) {
                const wantIdx = intents.findIndex((x) => x.name === want);
                const wantRe = wantIdx >= 0 ? compile(intents[wantIdx].pattern) : null;
                why = wantRe && wantRe.test(msg) ? `"${got.name}" matched first. The first match wins: move ${want} above ${got.name}.` : `"${got.name}" matched instead. Make ${want} match this message.`;
            }
            return el('li.rx-row' + (good ? '.good' : '.bad'), {},
                el('span.rx-want', {}, `→ ${want}`),
                el('span.rx-text', {}, msg, why ? el('small.in-why', {}, why) : null),
                el('span.rx-mark', {}, good ? '✓' : got.name));
        }));
        code.textContent = `const intents = [\n${intents.map((it) => `  { name: '${it.name}', pattern: /${it.pattern}/i, reply: '…' },`).join('\n')}\n];\n\nfunction reply(message) {\n  for (const intent of intents) {\n    if (intent.pattern.test(message)) return intent.reply;  // first match wins\n  }\n  return "${FALLBACK.replace(/"/g, '\\"')}";\n}`;
        note.className = `sb-verdict ${ok === TESTS.length ? 'good' : 'bad'}`;
        note.textContent = ok === TESTS.length ? `All ${TESTS.length} visitors get the right answer. That's your chatbot's brain.` : `${ok} of ${TESTS.length} visitors routed correctly.`;
        if (ok === TESTS.length) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'intents' }));
        tryReply();
    }
    function tryReply() {
        const m = tryInput.value.trim();
        tryOut.textContent = m ? `🤖 (${route(m).name}) ${route(m).reply}` : '';
    }
    tryInput.addEventListener('input', tryReply);

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Intent router'), el('span', {}, 'Every visitor should reach the right reply.')),
        table,
        el('div.w-label', {}, 'Visitors'), results,
        note,
        tryInput, tryOut,
        el('div.w-label', {}, 'chat.js'), code,
    );
    renderTable();
    check();
}
