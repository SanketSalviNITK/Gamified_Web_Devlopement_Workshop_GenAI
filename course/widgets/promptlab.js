// Lesson 1.6 "Prompt Lab": switch the five parts of a prompt on and off and watch the AI's answer
// (pre-written examples) get more useful.
import { el, typewriter } from './util.js';

const PARTS = [
    { key: 'role', label: 'Role', text: 'You are a patient Git teacher for beginners.' },
    { key: 'task', label: 'Task', text: 'Help me put my portfolio folder on GitHub with a README.' },
    { key: 'context', label: 'Context', text: "I'm on Windows, my folder is called portfolio, and my empty GitHub repo is https://github.com/ana/portfolio." },
    { key: 'constraints', label: 'Constraints', text: 'Use the terminal only, and explain what each command does.' },
    { key: 'format', label: 'Output format', text: 'Give numbered steps with each command in its own code block.' },
];

const ANSWERS = [
    { min: 0, score: 1, text: 'Git is a version control system. You can use commands like git add, git commit and git push. Let me know what you want to do!' },
    { min: 2, score: 2, text: 'Sure! Run:\ngit init\ngit add .\ngit commit -m "commit"\ngit push\n\nThat should upload your files.' },
    { min: 3, score: 3, text: '1. cd portfolio\n2. git init\n3. Create README.md with a description\n4. git add .\n5. git commit -m "First commit"\n6. git remote add origin https://github.com/ana/portfolio.git\n7. git push -u origin main' },
    { min: 5, score: 5, text: '1. Open PowerShell in your folder:\n   cd portfolio\n   (moves the terminal into your project)\n\n2. Start a repository:\n   git init\n   (creates a hidden .git folder that stores history)\n\n3. Write README.md:\n   # Ana\'s Portfolio\n   My personal site, built in the GenAI web workshop.\n\n4. Stage and save:\n   git add .            (stage every file)\n   git commit -m "First commit"   (save the snapshot)\n\n5. Connect and upload:\n   git remote add origin https://github.com/ana/portfolio.git\n   git push -u origin main   (send it to GitHub)' },
];

export function mount(root) {
    const on = new Set(['task']);
    const toggles = el('div.pl-toggles');
    const promptBox = el('pre.pl-prompt', { 'aria-live': 'polite' });
    const meter = el('div.pl-meter', { role: 'meter', 'aria-valuemin': '1', 'aria-valuemax': '5', 'aria-label': 'Answer quality' });
    const answer = el('pre.pl-answer');
    const verdict = el('div.pl-verdict');
    const ask = el('button.w-btn', { type: 'button' }, '🤖 Ask the AI');

    function render() {
        toggles.replaceChildren(...PARTS.map((p) => el('button.pl-part' + (on.has(p.key) ? '.on' : ''), {
            type: 'button', 'aria-pressed': String(on.has(p.key)),
            onclick: () => { on.has(p.key) ? on.delete(p.key) : on.add(p.key); render(); },
        }, (on.has(p.key) ? '✓ ' : '+ ') + p.label)));
        const used = PARTS.filter((p) => on.has(p.key));
        promptBox.textContent = used.length ? used.map((p) => p.text).join(' ') : '(empty prompt: switch on some parts)';
    }

    ask.addEventListener('click', async () => {
        const n = on.size;
        const a = [...ANSWERS].reverse().find((x) => n >= x.min);
        meter.setAttribute('aria-valuenow', String(a.score));
        meter.style.setProperty('--q', a.score / 5);
        const missing = PARTS.filter((p) => !on.has(p.key)).map((p) => p.label.toLowerCase());
        verdict.textContent = '';
        ask.disabled = true;
        await typewriter(answer, a.text);
        ask.disabled = false;
        verdict.textContent = a.score === 5
            ? 'Excellent: specific steps for your situation, with explanations.'
            : `Answer quality ${a.score}/5. Missing: ${missing.join(', ')}. Add ${missing[0]} and ask again.`;
        if (a.score === 5) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'prompt' }));
    });

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Prompt lab'), el('span', {}, 'Switch on parts of the prompt, then ask.')),
        toggles,
        el('div.w-label', {}, 'Your prompt'), promptBox,
        el('div.pl-row', {}, ask, meter),
        el('div.w-label', {}, 'AI answer'), answer, verdict,
    );
    render();
}
