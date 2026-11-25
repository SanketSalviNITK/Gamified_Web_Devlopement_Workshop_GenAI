// Lesson 2.2 "Section builder": add semantic parts to a page and watch the HTML, the page outline
// and the real Quest 2 "About, Projects and Skills" verifier check update together.
import { el } from './util.js';
import { RULES, buildContext } from '../../supabase/functions/_shared/checks.js';

const PARTS = [
    { key: 'header', label: 'Header', html: '<header>\n  <h1>Ana Rao</h1>\n</header>' },
    { key: 'nav', label: 'Nav', html: null },
    { key: 'about', label: 'About', html: '<section id="about">\n  <h2>About me</h2>\n  <p>…</p>\n</section>' },
    { key: 'projects', label: 'Projects', html: '<section id="projects">\n  <h2>Projects</h2>\n  …\n</section>' },
    { key: 'skills', label: 'Skills', html: '<section id="skills">\n  <h2>Skills</h2>\n  …\n</section>' },
    { key: 'hobbies', label: 'Hobbies', html: '<section id="hobbies">\n  <h2>Hobbies</h2>\n  …\n</section>' },
    { key: 'footer', label: 'Footer', html: '<footer>\n  <p>Contact: ana@example.com</p>\n</footer>' },
];
const SECTION_KEYS = ['about', 'projects', 'skills', 'hobbies'];

export function mount(root) {
    const on = new Set(['header']);
    const buttons = el('div.sb-buttons');
    const code = el('pre.sb-code');
    const outline = el('div.sb-outline');
    const verdict = el('div.sb-verdict', { 'aria-live': 'polite' });
    const sectionRule = RULES[2].find((r) => r.id === 'sections');

    function html() {
        const sections = SECTION_KEYS.filter((k) => on.has(k));
        const nav = on.has('nav') ? `<nav>\n${sections.map((k) => `  <a href="#${k}">${k[0].toUpperCase() + k.slice(1)}</a>`).join('\n') || '  <!-- add sections to link to -->'}\n</nav>` : null;
        const main = sections.length ? `<main>\n${sections.map((k) => PARTS.find((p) => p.key === k).html.replace(/^/gm, '  ')).join('\n')}\n</main>` : null;
        return [on.has('header') && PARTS[0].html, nav, main, on.has('footer') && PARTS[6].html].filter(Boolean).join('\n');
    }

    function render() {
        buttons.replaceChildren(...PARTS.map((p) => el('button.pl-part' + (on.has(p.key) ? '.on' : ''), {
            type: 'button', 'aria-pressed': String(on.has(p.key)),
            onclick: () => { on.has(p.key) ? on.delete(p.key) : on.add(p.key); render(); },
        }, (on.has(p.key) ? '✓ ' : '+ ') + p.label)));
        const source = html();
        code.textContent = source || '<!-- an empty page -->';
        const sections = SECTION_KEYS.filter((k) => on.has(k));
        outline.replaceChildren(...[
            on.has('header') && el('div.sb-block.header', {}, 'header'),
            on.has('nav') && el('div.sb-block.nav', {}, 'nav', el('span', {}, sections.map((k) => `#${k}`).join('  ') || '(no links yet)')),
            sections.length && el('div.sb-block.main', {}, 'main', ...sections.map((k) => el('div.sb-block.section', {}, `section#${k}`))),
            on.has('footer') && el('div.sb-block.footer', {}, 'footer'),
        ].filter(Boolean));
        const res = sectionRule.test(buildContext({ files: { 'index.html': source }, paths: ['index.html'] }));
        verdict.className = `sb-verdict ${res.pass ? 'good' : 'bad'}`;
        verdict.replaceChildren(el('span.md-pill', {}, 'verifier'), ` ${res.pass ? '✓' : '✗'} About, Projects and Skills sections: ${res.detail}`);
        if (res.pass && on.has('nav') && on.has('footer')) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'sections' }));
    }

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Section builder'), el('span', {}, 'Add the parts of your portfolio. Goal: what Quest 2 needs, plus a nav and footer.')),
        buttons,
        el('div.sb-split', {}, el('div', {}, el('div.w-label', {}, 'HTML'), code), el('div', {}, el('div.w-label', {}, 'Page outline'), outline)),
        verdict,
    );
    render();
}
