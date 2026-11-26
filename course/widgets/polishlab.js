// Lesson 5.5 "Personality lab": a working chatbot you can talk to. Switch on the touches that make
// it feel alive: a typing delay, varied replies, remembering the visitor's name with a capture
// group, and quick-reply buttons.
import { el } from './util.js';

const FEATURES = [
    { k: 'typing', label: '⌛ typing delay', code: "// typing delay\nshowTyping();\nsetTimeout(() => { hideTyping(); addMessage('bot', answer); }, 700);" },
    { k: 'variety', label: '🎲 varied replies', code: "// varied replies: pick one at random\nconst pick = (list) => list[Math.floor(Math.random() * list.length)];\nreply: pick(['Hi!', 'Hey there!', 'Hello 👋'])" },
    { k: 'name', label: '📛 remember names', code: "// capture group: the ( ) part is saved in match[1]\nconst match = message.match(/my name is (\\w+)/i);\nif (match) { visitorName = match[1]; return `Nice to meet you, ${visitorName}!`; }" },
    { k: 'quick', label: '🔘 quick replies', code: "// quick replies: buttons that send a message for the visitor\nfor (const text of ['Projects', 'Skills', 'Contact']) {\n  const b = document.createElement('button');\n  b.textContent = text;\n  b.onclick = () => send(text);\n  quick.append(b);\n}" },
];
const INTENTS = [
    { re: /\b(projects?|portfolio|built|work)\b/i, replies: ['Ana built a weather app, this 3D portfolio and a chatbot.', 'Check out her 3D portfolio with a waving robot!', 'Three projects so far: weather app, 3D portfolio, chatbot.'] },
    { re: /\b(skills?|languages?|stack|know)\b/i, replies: ['HTML, CSS, JavaScript and Three.js.', 'She speaks fluent HTML, CSS and JavaScript, plus some Three.js.'] },
    { re: /\b(contact|email|reach|hire)\b/i, replies: ['Email ana@example.com.', 'The best way is email: ana@example.com.'] },
    { re: /\b(hi|hello|hey)\b/i, replies: ['Hi! Ask me about projects, skills or contact.', 'Hey there! What would you like to know?', 'Hello 👋 Try asking about Ana\'s projects.'] },
];

export function mount(root) {
    const on = new Set();
    let visitorName = null;
    let answered = 0;
    let timer = 0;
    const buttons = el('div.sb-buttons');
    const log = el('div.cb-log.tall', { 'aria-live': 'polite' });
    const input = el('input.cb-input', { type: 'text', placeholder: 'Try: My name is Sam', 'aria-label': 'Message', autocomplete: 'off' });
    const quick = el('div.cb-quick');
    const form = el('form.cb-form', {}, input, el('button.w-btn', { type: 'submit' }, 'Send'));
    const code = el('pre.pl-prompt');
    const note = el('div.s3-msg', { 'aria-live': 'polite' });

    const add = (who, text) => { const p = el(`p.cb-msg.${who}`); p.textContent = text; log.append(p); log.scrollTop = log.scrollHeight; return p; };

    function answer(message) {
        const pick = (list) => (on.has('variety') ? list[Math.floor(Math.random() * list.length)] : list[0]);
        if (on.has('name')) {
            const m = message.match(/my name is (\w+)/i);
            if (m) { visitorName = m[1]; return `Nice to meet you, ${visitorName}! Ask me about Ana's projects, skills or contact.`; }
        }
        for (const it of INTENTS) {
            if (it.re.test(message)) {
                const r = pick(it.replies);
                return on.has('name') && visitorName ? `${r} Anything else, ${visitorName}?` : r;
            }
        }
        return on.has('name') && /my name is/i.test(message) === false && /\bname\b/i.test(message)
            ? 'Tell me your name like this: "My name is Sam".'
            : 'Sorry, I didn\'t get that. Try asking about projects, skills or contact.';
    }

    function send(text) {
        if (!text.trim()) return;
        add('user', text.trim());
        const reply = answer(text);
        clearTimeout(timer);
        log.querySelector('.typing')?.remove();
        if (on.has('typing')) {
            const dots = add('bot', '…');
            dots.classList.add('typing');
            timer = setTimeout(() => { dots.remove(); done(reply); }, 700);
        } else done(reply);
    }
    function done(reply) {
        add('bot', reply);
        answered += 1;
        status();
    }

    function status() {
        const missing = [];
        if (!on.has('name') || !visitorName) missing.push(on.has('name') ? 'tell the bot "My name is …"' : 'switch on 📛 remember names');
        if (!on.has('typing') && !on.has('variety')) missing.push('switch on a typing delay or varied replies');
        note.textContent = missing.length ? `To finish: ${missing.join(', then ')}.` : `${visitorName ? `It remembers ${visitorName}. ` : ''}Your bot has personality. Now build it into your own portfolio.`;
        if (!missing.length && answered > 0) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'polish' }));
    }

    function render() {
        buttons.replaceChildren(...FEATURES.map((f) => el('button.pl-part' + (on.has(f.k) ? '.on' : ''), {
            type: 'button', 'aria-pressed': String(on.has(f.k)), onclick: () => { on.has(f.k) ? on.delete(f.k) : on.add(f.k); render(); },
        }, f.label)));
        quick.replaceChildren(...(on.has('quick') ? ['Projects', 'Skills', 'Contact'].map((t) => el('button.w-btn.ghost', { type: 'button', onclick: () => send(t) }, t)) : []));
        const chosen = FEATURES.filter((f) => on.has(f.k));
        code.textContent = chosen.length ? chosen.map((f) => f.code).join('\n\n') : '// Switch on a feature to see its code.';
        status();
    }

    form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); input.value = ''; });

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Personality lab'), el('span', {}, 'Talk to the bot, then give it personality.')),
        buttons,
        el('div.sb-split', {}, el('div.cb-page', {}, log, quick, form), el('div', {}, el('div.w-label', {}, 'chat.js'), code)),
        note,
    );
    add('bot', 'Hi! I\'m Ana\'s bot. Ask me anything.');
    render();
    return () => clearTimeout(timer);
}
