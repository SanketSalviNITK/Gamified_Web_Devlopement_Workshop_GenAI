// Module 1: Git & GitHub. Lesson content for learn.html.
// Blocks: text | widget | code | check (self-check, not scored) | tip | takeaways.

export default {
    m1_1: {
        id: 'm1.1',
        blocks: [
            { type: 'text', html: `
                <p>You ask your AI co-pilot to "make the header look cooler". It rewrites half of <code>index.html</code>, and now the page is blank. What was there before? Without a saved history, you can only guess.</p>
                <p><b>Version control</b> fixes that. Every time you reach a good point, you save a <b>snapshot</b> of your project, called a <b>commit</b>. Each commit remembers exactly what every file looked like, who saved it and why. You can always travel back.</p>` },
            { type: 'widget', name: 'timeline', props: {} },
            { type: 'text', html: `
                <p><b>Git</b> is the version-control tool almost every developer uses. It runs on your computer, inside your project folder. <b>GitHub</b> is a website that stores a copy of your Git project online, so you can share it, back it up and, in this workshop, have it verified.</p>` },
            { type: 'tip', html: `Working with an AI assistant makes commits even more important: commit <b>before</b> you paste in a big AI change, so you can undo it in one step if it breaks something.` },
            { type: 'check', question: 'Your AI just rewrote your page and broke it. You committed five minutes ago. What can you do?', options: [
                { text: 'Go back to the last commit and get the working version again', correct: true, why: 'Exactly. A commit is a saved snapshot, so you can return to it at any time.' },
                { text: 'Nothing: the old version is gone once the file is saved', why: 'Saving overwrites the file, but your commit still holds the old version. That is what commits are for.' },
                { text: 'Ask the AI to remember what the file looked like', why: 'The AI might guess, but it doesn’t reliably remember your exact file. Git does.' },
            ] },
            { type: 'takeaways', items: [
                'A commit is a snapshot of your whole project at one moment.',
                'Git keeps the history on your computer; GitHub keeps a copy online.',
                'Commit before big AI changes so you can always go back.',
            ] },
        ],
    },

    m1_2: {
        id: 'm1.2',
        blocks: [
            { type: 'text', html: `
                <p>Git looks at your project in three places. Understanding them explains almost every Git message you will ever see:</p>
                <ol>
                    <li><b>Working directory</b>: your actual files. You edit here.</li>
                    <li><b>Staging area</b>: the changes you have chosen to include in the next snapshot. <code>git add</code> puts them here.</li>
                    <li><b>Repository</b>: the saved history of snapshots. <code>git commit</code> turns everything in the staging area into a new commit.</li>
                </ol>` },
            { type: 'widget', name: 'gitflow', props: {} },
            { type: 'code', caption: 'The everyday loop', code: `git status            # what changed? what is staged?
git add index.html    # stage one file
git add .             # or stage every change
git commit -m "Add About section"   # save the snapshot` },
            { type: 'tip', html: `Seeing <code>nothing added to commit</code>? You edited files but didn't stage them. Run <code>git add</code> first.` },
            { type: 'check', question: 'What does git add do?', options: [
                { text: 'Puts your changes in the staging area, ready for the next commit', correct: true, why: 'Right. Staging is choosing what goes into the next snapshot.' },
                { text: 'Uploads your files to GitHub', why: 'That’s git push. git add only works on your computer.' },
                { text: 'Creates a new commit', why: 'git commit creates the snapshot. git add only prepares what goes into it.' },
            ] },
            { type: 'takeaways', items: [
                'Edit in the working directory, stage with git add, save with git commit.',
                'Only staged changes go into a commit.',
                'git status tells you where every change is.',
            ] },
        ],
    },

    m1_3: {
        id: 'm1.3',
        blocks: [
            { type: 'text', html: `
                <p>Every commit carries a <b>message</b>. Months later, the history is a list of these messages, and they are the only way to find "the version before the header broke". Good messages say <b>what changed</b> in a few words, written as an instruction: <i>"Add contact form"</i>, <i>"Fix broken link in README"</i>.</p>
                <p>Each commit also gets a unique ID (a <b>hash</b>, like <code>a1b2c3d</code>), records who made it and when. The workshop's verifier and the projector use that hash to point to your exact work.</p>` },
            { type: 'widget', name: 'commitsort', props: {} },
            { type: 'tip', html: `Commit small and often. One idea per commit makes it easy to undo just the part that went wrong.` },
            { type: 'check', question: 'Which is the most useful commit message?', options: [
                { text: 'Add Skills section with progress bars', correct: true, why: 'Specific and written as an instruction: anyone can tell what this commit does.' },
                { text: 'update', why: 'Update what? In a long history this tells you nothing.' },
                { text: 'final version FINAL v2', why: 'There is never a final version, and this says nothing about what changed.' },
            ] },
            { type: 'takeaways', items: [
                'A commit = snapshot + message + author + time + a unique hash.',
                'Write messages as short instructions: "Add …", "Fix …", "Remove …".',
                'Small, frequent commits are easier to understand and undo.',
            ] },
        ],
    },

    m1_4: {
        id: 'm1.4',
        blocks: [
            { type: 'text', html: `
                <p>So far everything lives on your computer. A <b>remote</b> is a copy of your repository somewhere else, usually on GitHub. Your local repository calls it <code>origin</code>.</p>
                <ul>
                    <li><code>git push</code> sends your new commits up to GitHub.</li>
                    <li><code>git pull</code> brings commits from GitHub down to your computer.</li>
                    <li><code>git clone</code> downloads a whole repository the first time.</li>
                </ul>` },
            { type: 'widget', name: 'remote', props: {} },
            { type: 'code', caption: 'Publishing a new project for the first time', code: `git init
git add .
git commit -m "First commit"
git remote add origin https://github.com/your-name/your-repo.git
git push -u origin main` },
            { type: 'tip', html: `The workshop verifier reads your repository on GitHub, so it only sees what you have <b>pushed</b>, and only if the repository is <b>public</b>.` },
            { type: 'check', question: 'You committed your work but the verifier still sees the old version. Why?', options: [
                { text: 'You haven’t pushed yet, so GitHub doesn’t have the new commit', correct: true, why: 'Yes. Commits stay on your computer until you git push.' },
                { text: 'The commit message was too short', why: 'The message doesn’t affect what GitHub has. Pushing does.' },
                { text: 'You need to run git add again', why: 'Staging is before committing. After committing, the missing step is git push.' },
            ] },
            { type: 'takeaways', items: [
                'origin is the name of your GitHub copy.',
                'push sends commits up; pull brings them down.',
                'The verifier only sees pushed commits in public repositories.',
            ] },
        ],
    },

    m1_5: {
        id: 'm1.5',
        blocks: [
            { type: 'text', html: `
                <p>A <code>README.md</code> is the front page of your repository: GitHub shows it to every visitor. It is written in <b>Markdown</b>, a simple way to format text with symbols:</p>` },
            { type: 'code', caption: 'Markdown in one minute', code: `# Big heading
## Smaller heading
Plain text becomes a paragraph. **Bold** and *italic*.
- a bullet list
- with two items
[A link](https://github.com)` },
            { type: 'text', html: `<p>Write a README for your own project below. The checklist updates as you type, using the same rule the Quest 1 verifier uses: <b>a real sentence of description, not just a heading</b>.</p>` },
            { type: 'widget', name: 'markdown', props: {} },
            { type: 'check', question: 'Which line makes a heading in Markdown?', options: [
                { text: '# My Portfolio', correct: true, why: 'A # at the start of the line makes a heading; ## makes a smaller one.' },
                { text: '**My Portfolio**', why: 'Double asterisks make bold text, not a heading.' },
                { text: '- My Portfolio', why: 'A dash starts a bullet-list item.' },
            ] },
            { type: 'takeaways', items: [
                'README.md is the first thing visitors see on GitHub.',
                '# headings, **bold**, - lists, [text](link) cover most needs.',
                'Quest 1 needs at least a sentence describing your project.',
            ] },
        ],
    },

    m1_6: {
        id: 'm1.6',
        blocks: [
            { type: 'text', html: `
                <p>An AI assistant writes better code when you give it a better brief. Strong prompts usually have five parts:</p>
                <ol>
                    <li><b>Role</b>: who the AI should act as ("You are a patient Git teacher").</li>
                    <li><b>Task</b>: exactly what you want.</li>
                    <li><b>Context</b>: your situation (operating system, project name, what already exists).</li>
                    <li><b>Constraints</b>: what to avoid or include ("explain each command", "no GitHub Desktop").</li>
                    <li><b>Output format</b>: how the answer should look ("numbered steps, commands in code blocks").</li>
                </ol>
                <p>Build a prompt below and see how the answer changes.</p>` },
            { type: 'widget', name: 'promptlab', props: {} },
            { type: 'tip', html: `Never run a command you don't understand. Ask the AI to explain it line by line first. You are the pilot; the AI is your co-pilot.` },
            { type: 'check', question: 'The AI gives you a terminal command you don’t understand. What should you do?', options: [
                { text: 'Ask it to explain the command line by line before running it', correct: true, why: 'Yes. Understanding what you run keeps you in control and is how you learn.' },
                { text: 'Run it: the AI is usually right', why: 'Usually isn’t always. Some commands delete or overwrite files.' },
                { text: 'Ask a different AI to write it again', why: 'Another answer you don’t understand doesn’t help. Ask for an explanation.' },
            ] },
            { type: 'takeaways', items: [
                'Role, task, context, constraints, output format.',
                'Specific prompts get specific, correct answers.',
                'Understand every command before you run it.',
            ] },
        ],
    },
};
