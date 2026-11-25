// Lesson 1.3 "Commit judge": decide whether each commit message is useful, with feedback.
import { el } from './util.js';

const MESSAGES = [
    { text: 'Add contact form to portfolio', good: true, why: 'Says exactly what changed, as an instruction.' },
    { text: 'stuff', good: false, why: 'Which stuff? Nobody can find this commit later.' },
    { text: 'Fix broken GitHub link in README', good: true, why: 'Specific: you know what was fixed and where.' },
    { text: 'final FINAL v3', good: false, why: 'Says nothing about the change, and there is never a final version.' },
    { text: 'Make header sticky on scroll', good: true, why: 'Short, specific and starts with a verb.' },
    { text: 'asdfgh', good: false, why: 'Random letters make the history impossible to search.' },
];

export function mount(root) {
    const answers = new Map();
    const list = el('ul.cs-list');
    const score = el('div.cs-score', { 'aria-live': 'polite' });

    function render() {
        list.replaceChildren(...MESSAGES.map((m, i) => {
            const a = answers.get(i);
            const row = el('li.cs-row' + (a === undefined ? '' : a === m.good ? '.right' : '.wrong'));
            const choose = (good) => { answers.set(i, good); render(); };
            row.append(...[
                el('code.cs-msg', {}, m.text),
                el('div.cs-btns', {},
                    el('button.w-btn.ghost' + (a === true ? '.picked' : ''), { type: 'button', 'aria-pressed': String(a === true), onclick: () => choose(true) }, '👍 Useful'),
                    el('button.w-btn.ghost' + (a === false ? '.picked' : ''), { type: 'button', 'aria-pressed': String(a === false), onclick: () => choose(false) }, '👎 Vague'),
                ),
                a === undefined ? null : el('div.cs-why', {}, (a === m.good ? '✓ ' : '✗ ') + m.why),
            ].filter(Boolean));
            return row;
        }));
        const right = [...answers].filter(([i, a]) => MESSAGES[i].good === a).length;
        score.textContent = answers.size ? `${right} of ${answers.size} judged correctly${answers.size === MESSAGES.length ? (right === MESSAGES.length ? '. Perfect!' : '. Check the ones marked ✗.') : ''}` : '';
        if (answers.size === MESSAGES.length && right === MESSAGES.length) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'sorted' }));
    }

    root.append(el('div.w-head', {}, el('span.w-tag', {}, 'Commit judge'), el('span', {}, 'Would future-you understand this message?')), list, score);
    render();
}
