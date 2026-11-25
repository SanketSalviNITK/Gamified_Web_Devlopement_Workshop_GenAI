// Module 2: Portfolio with HTML & CSS. Lesson content for learn.html.
// Blocks: text | widget | code | check (self-check, not scored) | tip | takeaways.

export default {
    m2_1: {
        id: 'm2.1',
        blocks: [
            { type: 'text', html: `
                <p>Every web page is built from three layers that work together:</p>
                <ul>
                    <li><b>HTML</b> is the <b>structure</b>: headings, paragraphs, images, links. It says <i>what</i> is on the page.</li>
                    <li><b>CSS</b> is the <b>style</b>: colours, spacing, fonts, layout. It says <i>how it looks</i>.</li>
                    <li><b>JavaScript</b> is the <b>behaviour</b>: things that react when you click or type. You'll use it in Modules 3 to 5.</li>
                </ul>
                <p>HTML is written with <b>tags</b>. Most come in pairs: <code>&lt;h1&gt;</code> opens a heading and <code>&lt;/h1&gt;</code> closes it. Everything in between is the content.</p>` },
            { type: 'widget', name: 'layers', props: {} },
            { type: 'code', caption: 'The skeleton every page shares', code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ana's Portfolio</title>
  <style>
    /* your CSS goes here */
  </style>
</head>
<body>
  <!-- what visitors see goes here -->
</body>
</html>` },
            { type: 'tip', html: `Quest 2 looks for <code>index.html</code> in the root of your repository: that's the file browsers open first. Keep your CSS inside the <code>&lt;style&gt;</code> tag (or a <code>.css</code> file you link), written by you and your AI, without a framework.` },
            { type: 'check', question: 'You want your name in big bold letters at the top of the page. Which layer does that involve?', options: [
                { text: 'HTML for the heading, CSS for how big and bold it looks', correct: true, why: 'Exactly: HTML says "this is a heading", CSS decides its size, colour and font.' },
                { text: 'Only JavaScript', why: 'JavaScript adds behaviour. Showing and styling a heading needs no JavaScript.' },
                { text: 'Only CSS', why: 'CSS styles things, but the heading itself has to exist in the HTML first.' },
            ] },
            { type: 'takeaways', items: [
                'HTML = structure, CSS = style, JavaScript = behaviour.',
                'Tags come in pairs: <h1>…</h1>.',
                'Quest 2 starts from an index.html in the root of your repository.',
            ] },
        ],
    },

    m2_2: {
        id: 'm2.2',
        blocks: [
            { type: 'text', html: `
                <p>You could build a whole page from anonymous <code>&lt;div&gt;</code> boxes, but <b>semantic</b> tags say what each part <i>is</i>. That helps screen readers, search engines, your AI co-pilot and you:</p>
                <ul>
                    <li><code>&lt;header&gt;</code> the top of the page (your name, a tagline)</li>
                    <li><code>&lt;nav&gt;</code> links to the parts of the page</li>
                    <li><code>&lt;main&gt;</code> the main content, containing several <code>&lt;section&gt;</code>s</li>
                    <li><code>&lt;footer&gt;</code> contact details at the bottom</li>
                </ul>
                <p>Give each section an <code>id</code> so links can jump to it: <code>&lt;a href="#projects"&gt;</code> scrolls to <code>&lt;section id="projects"&gt;</code>.</p>` },
            { type: 'widget', name: 'sections', props: {} },
            { type: 'tip', html: `The verifier looks for <b>About</b>, <b>Projects</b> and <b>Skills</b>. Headings, ids or class names all count, so <code>&lt;section id="skills"&gt;&lt;h2&gt;Skills&lt;/h2&gt;</code> is perfect.` },
            { type: 'check', question: 'Which is the best tag for the block that lists your projects?', options: [
                { text: '<section id="projects"> with an <h2>Projects</h2> inside', correct: true, why: 'Semantic, linkable with #projects, and the verifier will find it.' },
                { text: '<div class="box3">', why: 'It works visually, but nothing says what it is, and "box3" means nothing to anyone.' },
                { text: '<footer>', why: 'A footer is for the bottom of the page, like contact details.' },
            ] },
            { type: 'takeaways', items: [
                'Use header, nav, main, section and footer instead of anonymous divs.',
                'Give sections ids so links can jump to them.',
                'Quest 2 needs About, Projects and Skills sections.',
            ] },
        ],
    },

    m2_3: {
        id: 'm2.3',
        blocks: [
            { type: 'text', html: `
                <p>In CSS, <b>every element is a box</b>. From the inside out, each box has four layers:</p>
                <ol>
                    <li><b>Content</b>: the text or image itself.</li>
                    <li><b>Padding</b>: space <i>inside</i> the box, between the content and the border.</li>
                    <li><b>Border</b>: the line around the box.</li>
                    <li><b>Margin</b>: space <i>outside</i> the box, pushing other boxes away.</li>
                </ol>
                <p>Drag the sliders and watch how each layer changes the size of the card.</p>` },
            { type: 'widget', name: 'boxmodel', props: {} },
            { type: 'code', caption: 'A card with every layer of the box model', code: `.card {
  width: 280px;
  padding: 24px;              /* inside */
  border: 2px solid #8b5cf6;
  margin: 16px;               /* outside */
  box-sizing: border-box;     /* width includes padding + border */
}` },
            { type: 'tip', html: `Most designers add <code>* { box-sizing: border-box; }</code> at the top of their CSS: then <code>width</code> means the whole visible box, which is much easier to reason about.` },
            { type: 'check', question: 'Your text touches the edge of its card. Which property adds space between the text and the card’s border?', options: [
                { text: 'padding', correct: true, why: 'Padding is the space inside the box, between content and border.' },
                { text: 'margin', why: 'Margin is outside the border: it moves the whole card away from its neighbours.' },
                { text: 'border', why: 'Border is the line itself. Making it thicker doesn’t add breathing room inside.' },
            ] },
            { type: 'takeaways', items: [
                'Content → padding → border → margin, from the inside out.',
                'Padding is inside the border, margin is outside.',
                'box-sizing: border-box makes width include padding and border.',
            ] },
        ],
    },

    m2_4: {
        id: 'm2.4',
        blocks: [
            { type: 'text', html: `
                <p>To place boxes side by side, modern CSS has two layout systems:</p>
                <ul>
                    <li><b>Flexbox</b> (<code>display: flex</code>) lays items out in <b>one direction</b>, a row or a column. Great for a navigation bar or a row of buttons.</li>
                    <li><b>Grid</b> (<code>display: grid</code>) lays items out in <b>rows and columns</b> at once. Great for a gallery of project cards.</li>
                </ul>
                <p>You set the layout on the <b>parent</b>, and the children arrange themselves. Try it:</p>` },
            { type: 'widget', name: 'flexgrid', props: {} },
            { type: 'code', caption: 'A project gallery that fills the space with as many columns as fit', code: `.projects {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}` },
            { type: 'tip', html: `That one <code>grid-template-columns</code> line makes the gallery responsive on its own: three columns on a laptop, one on a phone. The verifier's "responsive layout" check accepts flex, grid or <code>@media</code> rules.` },
            { type: 'check', question: 'You want a row of three skill badges, evenly spaced. What do you put on their parent?', options: [
                { text: 'display: flex; gap: 1rem;', correct: true, why: 'Flexbox lines the children up in a row, and gap spaces them evenly.' },
                { text: 'margin: auto on each badge only', why: 'Without a flex or grid parent, the badges still stack or flow like text.' },
                { text: 'position: absolute on each badge', why: 'Absolute positioning takes them out of the flow; you would have to place every badge by hand.' },
            ] },
            { type: 'takeaways', items: [
                'Flexbox = one direction; grid = rows and columns.',
                'Set the layout on the parent; children follow.',
                'repeat(auto-fit, minmax(…)) gives a gallery that adapts to any width.',
            ] },
        ],
    },

    m2_5: {
        id: 'm2.5',
        blocks: [
            { type: 'text', html: `
                <p><b>Glassmorphism</b> is the frosted-glass look: semi-transparent cards that blur whatever is behind them. It takes three ingredients:</p>
                <ol>
                    <li>A <b>see-through background</b>: <code>background: rgba(255, 255, 255, 0.12)</code> (the last number is the opacity).</li>
                    <li>A <b>blur</b> of what is behind: <code>backdrop-filter: blur(14px)</code>.</li>
                    <li>A <b>subtle edge</b>: a thin light border and rounded corners.</li>
                </ol>
                <p>It only shows when something colourful sits behind the card, like a gradient, an image, or the 3D scene you'll add in Module 3.</p>` },
            { type: 'widget', name: 'glass', props: {} },
            { type: 'tip', html: `For Safari, add <code>-webkit-backdrop-filter</code> with the same value. Keep text readable: if the background is busy, lower the transparency or increase the blur.` },
            { type: 'check', question: 'Your card is see-through but the background behind it is still sharp. What’s missing?', options: [
                { text: 'backdrop-filter: blur(...)', correct: true, why: 'backdrop-filter blurs whatever is behind the element: that’s the frosted part.' },
                { text: 'filter: blur(...)', why: 'filter blurs the card itself, including your text. backdrop-filter blurs what’s behind it.' },
                { text: 'opacity: 0.5', why: 'opacity fades the whole card, text included, and doesn’t blur anything.' },
            ] },
            { type: 'takeaways', items: [
                'Glass = transparent background + backdrop-filter: blur() + a subtle border.',
                'It needs something colourful behind it to show.',
                'The Quest 2 verifier checks for backdrop-filter with blur.',
            ] },
        ],
    },

    m2_6: {
        id: 'm2.6',
        blocks: [
            { type: 'text', html: `
                <p>Most visitors will open your portfolio on a phone. A <b>responsive</b> page adapts to any screen width. Two pieces make it work:</p>
                <ol>
                    <li>The <b>viewport tag</b> in your <code>&lt;head&gt;</code>. Without it, phones pretend to be a 980px-wide desktop and shrink everything until it's unreadable.</li>
                    <li><b>Flexible layout</b>: flex and grid that wrap, plus <code>@media</code> rules for anything that needs to change on small screens.</li>
                </ol>` },
            { type: 'code', caption: 'The two lines that make a page phone-friendly', code: `<meta name="viewport" content="width=device-width, initial-scale=1">

@media (max-width: 600px) {
  h1 { font-size: 2rem; }
  .projects { grid-template-columns: 1fr; }
}` },
            { type: 'widget', name: 'responsive', props: {} },
            { type: 'text', html: `<p><b>Before you push:</b> paste your <code>index.html</code> below to run the exact checks the Quest 2 verifier will run on GitHub. (It only sees CSS inside your <code>&lt;style&gt;</code> tag here; the real verifier also reads linked <code>.css</code> files.)</p>` },
            { type: 'widget', name: 'preflight', props: { quest: 2 } },
            { type: 'check', question: 'Your page looks perfect on your laptop but tiny and zoomed-out on your phone. What’s the most likely fix?', options: [
                { text: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the head', correct: true, why: 'Without it, phones render the page as a 980px desktop and shrink it to fit.' },
                { text: 'Make all fonts bigger', why: 'Bigger fonts get shrunk too. The phone is zooming out the whole page.' },
                { text: 'Remove all CSS', why: 'The problem is how the phone sizes the page, not your styles.' },
            ] },
            { type: 'takeaways', items: [
                'The viewport meta tag stops phones from zooming out.',
                'Flex and grid that wrap, plus @media rules, adapt the layout.',
                'Run the pre-flight check before you push for Quest 2.',
            ] },
        ],
    },
};
