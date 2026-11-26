// Lesson 5.4 "Chat window lab": a chat box on a mock portfolio. Pin it to the corner, give it a
// scrolling message area, and auto-scroll to the newest message: the three Quest 5 layout checks.
import { el } from './util.js';

const FIXES = [
    { k: 'corner', label: 'position: fixed; bottom; right', css: '#chat {\n  position: fixed;\n  bottom: 16px;\n  right: 16px;\n  width: 300px;\n}' },
    { k: 'box', label: 'max-height + overflow-y: auto', css: '#chat-log {\n  max-height: 220px;\n  overflow-y: auto;\n}' },
    { k: 'auto', label: 'scroll to the newest message', js: 'log.scrollTop = log.scrollHeight; // after adding a message' },
];
const VISITOR = ['hi!', 'what projects have you built?', 'which one is your favourite?', 'what skills do you have?', 'cool, how can I contact you?', 'thanks!', 'one more question…'];
const BOT = ['Hi! Ask me anything about Ana.', 'A weather app, a 3D portfolio and this chatbot.', 'The 3D portfolio: it has a robot!', 'HTML, CSS, JavaScript and Three.js.', 'Email ana@example.com.', 'Any time 👋', 'Go ahead!'];

export function mount(root) {
    const on = new Set();
    let n = 0;
    const buttons = el('div.sb-buttons');
    const log = el('div.cw-log', { 'aria-live': 'polite' });
    const chat = el('div.cw-chat', {}, el('div.cw-title', {}, '💬 Ask Ana\'s bot'), log, el('div.cw-input', {}, 'Type a message…'));
    const page = el('div.cw-page', {},
        el('div.bg-content', {},
            el('header.bg-h', {}, el('h4', {}, 'Ana Rao'), el('p', {}, 'Web developer in training')),
            el('section.bg-card', {}, el('b', {}, 'About'), el('p', {}, 'I build things for the web.')),
            el('section.bg-card', {}, el('b', {}, 'Projects'), el('p', {}, 'Weather app · 3D portfolio · Chatbot')),
            el('section.bg-card', {}, el('b', {}, 'Skills'), el('p', {}, 'HTML · CSS · JavaScript · Three.js'))),
        chat);
    const send = el('button.w-btn', { type: 'button' }, '💬 Visitor sends a message');
    const css = el('pre.pl-prompt');
    const note = el('div.sb-verdict', { 'aria-live': 'polite' });

    const lastVisible = () => {
        const last = log.lastElementChild;
        if (!last) return true;
        const a = last.getBoundingClientRect(), b = log.getBoundingClientRect();
        return a.bottom <= b.bottom + 2 && a.top >= b.top - 2;
    };

    function render() {
        buttons.replaceChildren(...FIXES.map((f) => el('button.pl-part' + (on.has(f.k) ? '.on' : ''), {
            type: 'button', 'aria-pressed': String(on.has(f.k)), onclick: () => { on.has(f.k) ? on.delete(f.k) : on.add(f.k); render(); },
        }, (on.has(f.k) ? '✓ ' : '+ ') + f.label)));
        chat.classList.toggle('corner', on.has('corner'));
        log.classList.toggle('box', on.has('box'));
        css.textContent = [
            ...FIXES.filter((f) => f.css && on.has(f.k)).map((f) => f.css),
            on.has('auto') ? `// chat.js\n${FIXES[2].js}` : '',
        ].filter(Boolean).join('\n\n') || '/* no chat styles yet: the chat box is just part of the page */';
        verdict();
    }

    function verdict() {
        const tips = [];
        if (!on.has('corner')) tips.push('The chat sits at the bottom of the page, so visitors have to scroll to find it. Pin it to the corner.');
        if (!on.has('box')) tips.push(n >= 4 ? 'The chat keeps growing taller with every message. Give the message area a max-height and overflow-y: auto.' : 'Send a few more messages and watch the chat box grow.');
        if (on.has('box') && !on.has('auto') && n > 0 && !lastVisible()) tips.push('The newest message is hidden below; visitors have to scroll the chat themselves. Scroll to the bottom after each message.');
        if (on.has('box') && !on.has('auto') && n > 0 && lastVisible()) tips.push('Send more messages: without auto-scroll, new ones disappear below the edge.');
        note.className = `sb-verdict ${tips.length ? 'bad' : 'good'}`;
        note.textContent = tips[0] || (n >= 6 ? 'A proper chat window: always in the corner, never too tall, newest message in view.' : 'Looking good. Send a few more messages to be sure.');
        if (!tips.length && n >= 6) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'chatwin' }));
    }

    send.addEventListener('click', () => {
        const i = n % VISITOR.length;
        log.append(el('p.cb-msg.user', {}, VISITOR[i]), el('p.cb-msg.bot', {}, BOT[i]));
        n += 1;
        if (on.has('auto')) log.scrollTop = log.scrollHeight;
        verdict();
    });

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Chat window lab'), el('span', {}, 'Build a chat box that behaves.')),
        buttons,
        el('div.cw-frame', {}, page),
        el('div.pf-row', {}, send),
        note,
        el('div.w-label', {}, 'CSS + JS'), css,
    );
    render();
}
