// Lesson 5.1 "Event lab": wire up a chat form step by step. Each fix is a line of real code, and
// leaving it out shows the classic bug: the page reloads, HTML gets injected, the input stays full.
import { el } from './util.js';

const FIXES = [
    { k: 'prevent', label: 'e.preventDefault()', code: '  e.preventDefault();                 // stop the page reloading' },
    { k: 'text', label: 'textContent (not innerHTML)', code: null },
    { k: 'empty', label: 'ignore empty messages', code: "  if (!text) return;                  // nothing typed" },
    { k: 'clear', label: 'clear the input', code: "  input.value = '';                   // ready for the next one" },
];

export function mount(root) {
    const on = new Set();
    const events = el('ol.ll-log', { 'aria-live': 'polite' });
    const log = el('div.cb-log', { 'aria-live': 'polite' });
    const input = el('input.cb-input', { type: 'text', placeholder: 'Type a message…', 'aria-label': 'Message', autocomplete: 'off' });
    const form = el('form.cb-form', {}, input, el('button.w-btn', { type: 'submit' }, 'Send'));
    const page = el('div.cb-page', {}, el('div.w-label', {}, 'index.html (live)'), log, form);
    const code = el('pre.pl-prompt');
    const note = el('div.sb-verdict');
    const buttons = el('div.sb-buttons');

    const event = (text, kind = '') => { events.append(el('li' + (kind ? `.${kind}` : ''), {}, text)); events.scrollTop = events.scrollHeight; };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') event('keydown: Enter (inside a form, Enter submits it)'); });

    function render() {
        buttons.replaceChildren(...FIXES.map((f) => el('button.pl-part' + (on.has(f.k) ? '.on' : ''), {
            type: 'button', 'aria-pressed': String(on.has(f.k)), onclick: () => { on.has(f.k) ? on.delete(f.k) : on.add(f.k); render(); },
        }, (on.has(f.k) ? '✓ ' : '+ ') + f.label)));
        code.textContent = [
            "const form = document.querySelector('#chat-form');",
            "const input = document.querySelector('#chat-input');",
            "const log = document.querySelector('#chat-log');",
            '',
            "form.addEventListener('submit', (e) => {",
            on.has('prevent') ? FIXES[0].code : null,
            '  const text = input.value.trim();',
            on.has('empty') ? FIXES[2].code : null,
            on.has('text')
                ? "  const p = document.createElement('p');\n  p.textContent = text;                // shown as plain text\n  log.append(p);"
                : '  log.innerHTML += `<p>${text}</p>`;   // ✗ text is treated as HTML',
            on.has('clear') ? FIXES[3].code : null,
            '});',
        ].filter((l) => l !== null).join('\n');
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault(); // the lab never really reloads; it shows what would happen
        const text = input.value.trim();
        event(`submit: form sent, input.value = "${input.value}"`);
        if (!on.has('prevent')) {
            event('No preventDefault(): the browser reloads the page…', 'bad');
            page.classList.add('reload');
            setTimeout(() => page.classList.remove('reload'), 500);
            log.replaceChildren();
            input.value = '';
            note.className = 'sb-verdict bad';
            note.textContent = 'The page reloaded and your messages vanished. A form\'s default action is to send the page somewhere and reload. Add e.preventDefault().';
            return;
        }
        if (!text && on.has('empty')) { event('Empty message ignored', 'good'); return; }
        const p = el('p.cb-msg.user');
        p.textContent = text || ' ';
        log.append(p);
        log.scrollTop = log.scrollHeight;
        const problems = [];
        if (!text) problems.push('An empty bubble appeared. Check if (!text) return; before adding it.');
        if (/[<>]/.test(text) && !on.has('text')) {
            p.classList.add('danger');
            event('innerHTML: the text was parsed as HTML!', 'bad');
            problems.push('With innerHTML your visitor\'s text runs as HTML. Someone could type <img src=x onerror=alert(1)> and run code on your page. Use textContent.');
        } else if (!on.has('text')) {
            problems.push('It works, but innerHTML treats the text as HTML. Type something with < > to see why that\'s dangerous.');
        }
        if (!on.has('clear')) problems.push('The input still holds the old message. Set input.value = \'\' after sending.');
        event(`appended <p> to #chat-log (${log.children.length} message${log.children.length === 1 ? '' : 's'})`, 'good');
        if (on.has('clear')) input.value = '';
        note.className = `sb-verdict ${problems.length ? 'bad' : 'good'}`;
        note.textContent = problems[0] || 'Clean: no reload, safe text, input cleared. That\'s the skeleton of every chat app.';
        if (!problems.length && FIXES.every((f) => on.has(f.k))) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'events' }));
    });

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Event lab'), el('span', {}, 'Send messages, then add each fix.')),
        buttons,
        el('div.sb-split', {}, page, el('div', {}, el('div.w-label', {}, 'chat.js'), code)),
        el('div.w-label', {}, 'Events'), events,
        note,
    );
    note.className = 'sb-verdict';
    note.textContent = 'Type a message and press Enter. Watch what happens with no fixes.';
    render();
}
