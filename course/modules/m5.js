// Module 5: A chatbot that answers (DOM events + regular expressions). Lesson content for learn.html.
// Blocks: text | widget | code | check (self-check, not scored) | tip | takeaways.

export default {
    m5_1: {
        id: 'm5.1',
        blocks: [
            { type: 'text', html: `
                <p>The browser turns your HTML into a tree of objects called the <b>DOM</b> (Document Object Model). JavaScript can find elements in it, listen for what the visitor does, and add new elements:</p>
                <ul>
                    <li><code>document.querySelector('#chat-input')</code> finds an element, like a CSS selector.</li>
                    <li><code>form.addEventListener('submit', handler)</code> runs your function when something happens: a click, a key, a form being sent.</li>
                    <li><code>input.value</code> is what the visitor typed; <code>document.createElement('p')</code> plus <code>log.append(p)</code> adds a new message.</li>
                </ul>
                <p>Every chat app is built on this loop: <b>listen → read → add to the page</b>. Try it with no fixes first, then add each one.</p>` },
            { type: 'widget', name: 'domlab', props: {} },
            { type: 'code', caption: 'index.html: a form gives you Enter-to-send for free', code: `<div id="chat">
  <div id="chat-log"></div>
  <form id="chat-form">
    <input id="chat-input" type="text" placeholder="Ask me anything…" autocomplete="off">
    <button type="submit">Send</button>
  </form>
</div>
<script src="chat.js" defer></script>` },
            { type: 'tip', html: `<b>Never put a visitor's text into <code>innerHTML</code>.</b> It's parsed as HTML, so someone could type a tag that runs code on your page (called <i>cross-site scripting</i>). <code>textContent</code> always shows text as text. <code>defer</code> on the script tag makes it run after the HTML has loaded, so <code>querySelector</code> can find your elements.` },
            { type: 'check', question: 'You press Enter in your chat form and the page flashes; your message disappears. What\'s missing?', options: [
                { text: 'e.preventDefault() in the submit handler', correct: true, why: 'A form\'s default action is to send the page and reload. preventDefault() stops that.' },
                { text: 'A second event listener', why: 'One listener is enough; the problem is the reload that follows it.' },
                { text: 'innerHTML instead of textContent', why: 'That would make it unsafe, and it wouldn\'t stop the reload.' },
            ] },
            { type: 'takeaways', items: [
                'querySelector finds, addEventListener listens, createElement + append adds.',
                'In a submit handler: preventDefault(), read input.value, then clear it.',
                'Use textContent for anything a visitor typed.',
            ] },
        ],
    },

    m5_2: {
        id: 'm5.2',
        blocks: [
            { type: 'text', html: `
                <p>How does a simple chatbot know what the visitor means? It looks for <b>patterns</b> in the message. A <b>regular expression</b> (regex) is a tiny language for describing text patterns. In JavaScript you write it between slashes:</p>
                <ul>
                    <li><code>/hello/</code> matches the letters "hello" anywhere in the text.</li>
                    <li><code>/hello|hi/</code>: the <code>|</code> means "or".</li>
                    <li><code>/hello/i</code>: the <code>i</code> flag ignores capitals.</li>
                    <li><code>/\\bhi\\b/</code>: <code>\\b</code> marks the edge of a word, so "hi" doesn't match inside "this".</li>
                </ul>
                <p><code>/hello|hi/i.test(message)</code> gives <code>true</code> or <code>false</code>. Solve the three challenges.</p>` },
            { type: 'widget', name: 'regexlab', props: {} },
            { type: 'tip', html: `Regex looks scary because it's dense, but you only need a handful of symbols for a chatbot. Ask your AI co-pilot to <b>explain</b> a pattern piece by piece, then test it here or on a site like regex101.com before you trust it.` },
            { type: 'check', question: 'Your greeting pattern /hi/i also matches "Which project is best?". What\'s the fix?', options: [
                { text: '/\\bhi\\b/i: word boundaries so only the whole word "hi" matches', correct: true, why: '\\b marks where a word starts and ends, so "hi" inside "Which" no longer counts.' },
                { text: '/HI/: use capitals', why: 'Without the i flag it misses "hi" typed in lowercase, and with it, "Which" still matches.' },
                { text: '/hi+/i', why: '+ means "one or more i", which matches even more text, including inside "Which".' },
            ] },
            { type: 'takeaways', items: [
                '/pattern/flags.test(text) answers true or false.',
                '| means or, i ignores case, \\b marks word edges.',
                '\\w+ is a word, \\d a digit, \\. a real dot.',
            ] },
        ],
    },

    m5_3: {
        id: 'm5.3',
        blocks: [
            { type: 'text', html: `
                <p>An <b>intent</b> is what the visitor wants: a greeting, your projects, your contact details. A simple chatbot is just a <b>list of intents</b>, each with a pattern and a reply. For each message, check the patterns in order: <b>the first one that matches wins</b>. If none match, give a friendly <b>fallback</b> reply.</p>
                <p>Real visitors use words you didn't expect, so test with real questions. Fix the patterns and the order until every visitor gets the right answer.</p>` },
            { type: 'widget', name: 'intentlab', props: {} },
            { type: 'tip', html: `Put <b>specific</b> intents before <b>general</b> ones. "Hi, what are your skills?" contains a greeting, but the visitor really wants your skills. A good fallback tells visitors what they <i>can</i> ask, so they're never stuck.` },
            { type: 'check', question: '"Hi, how can I contact you?" gets the greeting reply. The contact pattern does match it. What\'s wrong?', options: [
                { text: 'The greeting intent comes first in the list, and the first match wins', correct: true, why: 'Move contact (more specific) above greeting (more general).' },
                { text: 'The contact pattern needs the g flag', why: 'g (global) is about finding every match; it doesn\'t change which intent is checked first.' },
                { text: 'Regex can\'t match two words', why: 'It can. The problem is the order of the list.' },
            ] },
            { type: 'takeaways', items: [
                'A chatbot = a list of { name, pattern, reply } intents and a loop.',
                'First match wins: put specific intents before general ones.',
                'Always have a fallback that suggests what to ask.',
            ] },
        ],
    },

    m5_4: {
        id: 'm5.4',
        blocks: [
            { type: 'text', html: `
                <p>A chat window that sits at the bottom of the page, grows forever and hides new messages isn't much fun. Three fixes make it feel like a real chat:</p>
                <ol>
                    <li><code>position: fixed</code> with <code>bottom</code> and <code>right</code> pins it to the corner, like Module 3's background, but in front.</li>
                    <li><code>max-height</code> with <code>overflow-y: auto</code> gives the messages their own scroll area.</li>
                    <li><code>log.scrollTop = log.scrollHeight</code> after each new message scrolls to the newest one.</li>
                </ol>` },
            { type: 'widget', name: 'chatwinlab', props: {} },
            { type: 'tip', html: `Your 3D canvas from Modules 3 and 4 uses <code>z-index: -1</code>; give the chat a positive <code>z-index</code> so it stays on top. On phones, make the chat full-width with a media query: <code>@media (max-width: 600px) { #chat { left: 8px; right: 8px; width: auto; } }</code>.` },
            { type: 'check', question: 'New messages appear but you have to scroll the chat yourself to see them. Which line fixes it?', options: [
                { text: 'log.scrollTop = log.scrollHeight; after adding each message', correct: true, why: 'scrollHeight is the full height of the content; scrolling to it shows the newest message.' },
                { text: 'log.style.overflow = \'hidden\'', why: 'That hides the scrollbar and the overflowing messages; it doesn\'t scroll to them.' },
                { text: 'position: fixed on each message', why: 'That would pin every message to the same spot on top of each other.' },
            ] },
            { type: 'takeaways', items: [
                'position: fixed + bottom + right = always in the corner.',
                'max-height + overflow-y: auto = a scrolling message area.',
                'scrollTop = scrollHeight after each message = newest in view.',
            ] },
        ],
    },

    m5_5: {
        id: 'm5.5',
        blocks: [
            { type: 'text', html: `
                <p>Your chatbot works. Now give it <b>personality</b>, with tricks real chat apps use:</p>
                <ul>
                    <li>A short <b>typing delay</b> (<code>setTimeout</code>) so replies don't feel robotic.</li>
                    <li><b>Varied replies</b>: pick a random reply from a list so it doesn't repeat itself.</li>
                    <li><b>Capture groups</b>: the <code>( )</code> in <code>/my name is (\\w+)/i</code> saves the matched word, so the bot can remember the visitor's name.</li>
                    <li><b>Quick-reply buttons</b> for visitors who don't know what to ask.</li>
                </ul>` },
            { type: 'widget', name: 'polishlab', props: {} },
            { type: 'code', caption: 'chat.js for Quest 5: intents, a reply function and the chat loop', code: `const form = document.querySelector('#chat-form');
const input = document.querySelector('#chat-input');
const log = document.querySelector('#chat-log');

const intents = [
  { name: 'projects', pattern: /\\b(projects?|portfolio|built|work)\\b/i, reply: 'I built a weather app, a 3D portfolio and this chatbot.' },
  { name: 'skills',   pattern: /\\b(skills?|languages?|stack)\\b/i,       reply: 'HTML, CSS, JavaScript and Three.js.' },
  { name: 'contact',  pattern: /\\b(contact|email|reach|hire)\\b/i,       reply: 'Email me at you@example.com.' },
  { name: 'greeting', pattern: /\\b(hi|hello|hey)\\b/i,                   reply: 'Hi! Ask me about my projects, skills or contact.' },
];

function reply(message) {
  for (const intent of intents) {
    if (intent.pattern.test(message)) return intent.reply;
  }
  return "Sorry, I didn't get that. Try asking about projects, skills or contact.";
}

function addMessage(who, text) {
  const p = document.createElement('p');
  p.className = who;
  p.textContent = text;
  log.append(p);
  log.scrollTop = log.scrollHeight;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMessage('user', text);
  input.value = '';
  setTimeout(() => addMessage('bot', reply(text)), 600);
});` },
            { type: 'text', html: `<p><b>Before you push:</b> paste your <code>index.html</code> (with the chat window and its CSS) and <code>chat.js</code> to run the Quest 5 checks. This is the final quest: the one that defeats the boss.</p>` },
            { type: 'widget', name: 'preflight', props: { quest: 5, js: 'chat.js' } },
            { type: 'check', question: 'After message.match(/my name is (\\w+)/i) on "My name is Sam", where is "Sam"?', options: [
                { text: 'match[1], the first capture group', correct: true, why: 'match[0] is the whole match ("My name is Sam"); match[1] is what the first ( ) captured.' },
                { text: 'match[0]', why: 'match[0] is the whole matched text: "My name is Sam".' },
                { text: 'match.name', why: 'Unnamed groups are numbered. (Named groups exist: (?<name>\\w+), then match.groups.name.)' },
            ] },
            { type: 'takeaways', items: [
                'setTimeout adds a natural typing delay.',
                'A capture group ( ) saves part of the match in match[1].',
                'Pre-flight your files, push, and submit Quest 5 to finish the raid.',
            ] },
        ],
    },
};
