// learn.html: syllabus, lesson player and server-scored quizzes.
//
// Routes:  #/               overview of the course and your progress
//          #/m1             a module: lessons, quiz, lab
//          #/lesson/m1.2    a lesson
//          #/quiz/m1        the module quiz
//
// Signed in (verified mode): progress is saved in Supabase and every lesson / quiz pass shows up
// on the projector. Not signed in: lessons work and progress is kept in this browser only;
// quizzes need sign-in because they are scored on the server.
import { MODULES, QUIZ, XP, lessonById } from './course.js';
import { el, esc } from './widgets/util.js';

const WIDGETS = {
    timeline: () => import('./widgets/timeline.js'),
    gitflow: () => import('./widgets/gitflow.js'),
    commitsort: () => import('./widgets/commitsort.js'),
    remote: () => import('./widgets/remote.js'),
    markdown: () => import('./widgets/markdown.js'),
    promptlab: () => import('./widgets/promptlab.js'),
};
const QUEST_XP = [0, 100, 300, 600, 1000, 1500];
const LOCAL_KEY = 'course_progress_v1';

const S = {
    sb: null, verified: false, user: null, profile: null,
    lessons: new Set(), quizzes: new Map(), quests: new Set(),
};
// js/state.js declares WorkshopState with `class`, which is global but not a property of window.
// eslint-disable-next-line no-undef
const WS = () => (typeof WorkshopState !== 'undefined' ? WorkshopState : null);
const main = document.getElementById('main');
// replaceChildren() turns null into the text "null", so drop empty items first.
const put = (node, ...kids) => node.replaceChildren(...kids.flat().filter((k) => k !== null && k !== undefined && k !== false));
const nav = document.getElementById('course-nav');

// ---------------------------------------------------------------------------- data

function loadLocal() {
    try { return new Set(JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')); } catch { return new Set(); }
}
function saveLocal() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify([...S.lessons])); } catch { /* private mode */ }
}

async function boot() {
    try { await WS()?.ready; } catch { /* fall back to local */ }
    S.sb = WS()?.client || null;
    S.verified = WS()?.mode === 'database';
    if (S.verified) {
        const { data: { session } } = await S.sb.auth.getSession();
        if (session) {
            S.user = session.user;
            await S.sb.from('enrollments').upsert({ user_id: S.user.id, cohort_code: WS().cohort }, { onConflict: 'user_id,cohort_code', ignoreDuplicates: true });
            await refreshProgress();
            // Lessons finished before signing in are saved to the account now.
            const local = loadLocal();
            for (const id of local) if (!S.lessons.has(id) && lessonById(id)?.module.ready) await completeLesson(id, { quiet: true });
        }
        S.sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') location.reload(); });
    }
    if (!S.user) S.lessons = loadLocal();
    renderHeader();
    route();
}

async function refreshProgress() {
    const id = S.user.id;
    const [profile, lessons, quizzes, quests] = await Promise.all([
        S.sb.from('profiles').select('github_login, display_name').eq('id', id).single(),
        S.sb.from('lesson_progress').select('lesson_id').eq('user_id', id),
        S.sb.from('quiz_results').select('module, best_score, passed, attempts').eq('user_id', id),
        S.sb.from('quest_passes').select('quest_id').eq('user_id', id),
    ]);
    S.profile = profile.data;
    S.lessons = new Set((lessons.data || []).map((r) => r.lesson_id));
    S.quizzes = new Map((quizzes.data || []).map((r) => [r.module, r]));
    S.quests = new Set((quests.data || []).map((r) => r.quest_id));
}

async function completeLesson(id, { quiet = false } = {}) {
    const isNew = !S.lessons.has(id);
    S.lessons.add(id);
    if (S.user) {
        const { error } = await S.sb.rpc('complete_lesson', { p_lesson: id });
        if (error) { toast(`Couldn't save your progress: ${error.message}`, 'bad'); return; }
    } else saveLocal();
    if (isNew && !quiet) toast(S.user ? `+${XP.lesson} XP · your bot just hit the Glitch Overlord on the projector!` : `Lesson complete. Sign in to save progress and join the raid.`, 'good');
    renderHeader();
}

const xp = () => [...S.lessons].filter((l) => lessonById(l)).length * XP.lesson
    + [...S.quizzes.values()].filter((q) => q.passed).length * XP.quiz
    + QUEST_XP[Math.min(5, S.quests.size)];

function moduleProgress(m) {
    const lessonsDone = m.lessons.filter((l) => S.lessons.has(l.id)).length;
    const quiz = S.quizzes.get(m.id);
    return { lessonsDone, total: m.lessons.length, quiz, lab: S.quests.has(m.quest) };
}

function nextStep() {
    for (const m of MODULES) {
        if (!m.ready) continue;
        const l = m.lessons.find((x) => !S.lessons.has(x.id));
        if (l) return { href: `#/lesson/${l.id}`, label: `Lesson ${l.id.slice(1)}: ${l.title}` };
        if (!S.quizzes.get(m.id)?.passed) return { href: `#/quiz/${m.id}`, label: `${m.title} quiz` };
        if (!S.quests.has(m.quest)) return { href: `#/${m.id}`, label: `${m.title} lab` };
    }
    return null;
}

// ---------------------------------------------------------------------------- chrome

function signIn() {
    if (!S.verified) return toast('Sign-in is not available yet.', 'bad');
    S.sb.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: location.href.split('#')[0] + location.hash } });
}

function renderHeader() {
    const box = document.getElementById('who');
    const total = MODULES.filter((m) => m.ready).reduce((n, m) => n + m.lessons.length + 1 + 1, 0);
    const done = MODULES.filter((m) => m.ready).reduce((n, m) => { const p = moduleProgress(m); return n + p.lessonsDone + (p.quiz?.passed ? 1 : 0) + (p.lab ? 1 : 0); }, 0);
    document.documentElement.style.setProperty('--journey', total ? done / total : 0);
    put(box, 
        el('span.xp', { title: 'Experience points' }, `⚡ ${xp().toLocaleString()} XP`),
        S.user
            ? el('button.btn-ghost', { type: 'button', onclick: () => S.sb.auth.signOut() }, `@${S.profile?.github_login || 'you'} · Sign out`)
            : S.verified ? el('button.btn-main', { type: 'button', onclick: signIn }, 'Sign in with GitHub') : null,
    );
    renderNav();
}

function renderNav() {
    const here = location.hash || '#/';
    put(nav, ...MODULES.map((m) => {
        const p = moduleProgress(m);
        const items = m.ready ? [
            ...m.lessons.map((l) => el('a.nav-item' + (here === `#/lesson/${l.id}` ? '.on' : '') + (S.lessons.has(l.id) ? '.done' : ''), { href: `#/lesson/${l.id}` },
                el('span.nav-dot'), `${l.id.slice(1)} ${l.title}`)),
            el('a.nav-item.quiz' + (here === `#/quiz/${m.id}` ? '.on' : '') + (p.quiz?.passed ? '.done' : ''), { href: `#/quiz/${m.id}` }, el('span.nav-dot'), 'Quiz'),
            el('a.nav-item.lab' + (p.lab ? '.done' : ''), { href: `#/${m.id}` }, el('span.nav-dot'), 'Lab: verify on GitHub'),
        ] : [el('div.nav-soon', {}, 'Lessons coming soon · lab open')];
        return el('section.nav-mod' + (here.includes(m.id) ? '.open' : ''), {},
            el('a.nav-head', { href: `#/${m.id}` }, el('span.nav-num', {}, m.id.toUpperCase()), el('span', {}, m.title),
                m.ready ? el('span.nav-count', {}, `${p.lessonsDone}/${p.total}`) : null),
            el('div.nav-items', {}, ...items));
    }));
}

let toastTimer;
function toast(text, kind = 'info') {
    const t = document.getElementById('toast');
    t.className = `toast show ${kind}`;
    t.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 4200);
}

// ---------------------------------------------------------------------------- router

function route() {
    const hash = location.hash || '#/';
    const [, a, b] = hash.split('/');
    renderNav();
    window.scrollTo({ top: 0 });
    if (a === 'lesson' && lessonById(b)) return showLesson(b);
    if (a === 'quiz' && MODULES.some((m) => m.id === b)) return showQuiz(b);
    const mod = MODULES.find((m) => m.id === a);
    if (mod) return showModule(mod);
    return showOverview();
}
window.addEventListener('hashchange', route);

// ---------------------------------------------------------------------------- overview

function progressBar(value, label) {
    return el('div.bar', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(value * 100)), 'aria-label': label },
        el('i', { style: { width: `${Math.round(value * 100)}%` } }));
}

function showOverview() {
    const next = nextStep();
    put(main, 
        el('section.hero', {},
            el('div', {},
                el('p.eyebrow', {}, 'Gamified Web Development with GenAI'),
                el('h1', {}, 'Learn it. Build it. ', el('span.grad', {}, 'Prove it on GitHub.')),
                el('p.lead', {}, 'Each module has short interactive lessons, a quiz that explains every answer, and a lab that the verifier checks in your real GitHub repository. Every step you finish is a hit on the Glitch Overlord on the class projector.'),
                el('div.hero-actions', {},
                    next ? el('a.btn-main', { href: next.href }, `▶ ${S.lessons.size ? 'Continue' : 'Start'}: ${next.label}`) : el('span.btn-main', {}, '🏆 Everything available is complete!'),
                    !S.user && S.verified ? el('button.btn-ghost', { type: 'button', onclick: signIn }, 'Sign in to save progress') : null),
            ),
            el('div.ring', { 'aria-hidden': 'true' }, el('div.ring-in', {}, el('b', {}, `${xp()}`), el('span', {}, 'XP'))),
        ),
        el('div.mod-grid', {}, ...MODULES.map((m) => {
            const p = moduleProgress(m);
            return el('a.mod-card' + (m.ready ? '' : '.soon'), { href: `#/${m.id}` },
                el('div.mod-top', {}, el('span.mod-num', {}, `Module ${m.id.slice(1)}`), el('span.mod-code', {}, m.codename)),
                el('h3', {}, m.title),
                el('p', {}, m.summary),
                m.ready ? el('div.mod-progress', {},
                    el('div', {}, el('small', {}, `Lessons ${p.lessonsDone}/${p.total}`), progressBar(p.lessonsDone / p.total, 'Lessons')),
                    el('div.mod-badges', {},
                        el('span.badge' + (p.quiz?.passed ? '.on' : ''), {}, p.quiz ? `Quiz ${Math.round(p.quiz.best_score * 100)}%` : 'Quiz'),
                        el('span.badge' + (p.lab ? '.on' : ''), {}, p.lab ? 'Lab ✓' : 'Lab')),
                ) : el('div.mod-progress', {}, el('span.badge', {}, 'Lessons coming soon'), el('span.badge' + (p.lab ? '.on' : ''), {}, p.lab ? 'Lab ✓' : 'Lab open')),
            );
        })),
    );
}

// ---------------------------------------------------------------------------- module

function labCard(m) {
    const done = S.quests.has(m.quest);
    const cohort = WS()?.cohort;
    const href = `participant.html?submit=${m.quest}${cohort && cohort !== 'workshop' ? `&cohort=${cohort}` : ''}`;
    return el('div.step-card.lab' + (done ? '.done' : ''), {},
        el('div', {}, el('h3', {}, `🧪 Lab: ${m.codename}`),
            el('p', {}, done ? 'Verified on GitHub. Your bot gained its next part.' : `Build Quest ${m.quest} with your AI co-pilot, push it to GitHub, then let the verifier check your repository.`)),
        el('a.btn-main', { href }, done ? 'Open your deck' : 'Open the lab ↗'));
}

function showModule(m) {
    const p = moduleProgress(m);
    put(main, 
        el('nav.crumbs', {}, el('a', { href: '#/' }, 'Course'), ' / ', el('span', {}, `Module ${m.id.slice(1)}`)),
        el('header.page-head', {}, el('p.eyebrow', {}, `Module ${m.id.slice(1)} · ${m.codename}`), el('h1', {}, m.title), el('p.lead', {}, m.summary)),
        el('ol.lesson-list', {}, ...m.lessons.map((l) => el('li' + (S.lessons.has(l.id) ? '.done' : ''), {},
            m.ready ? el('a', { href: `#/lesson/${l.id}` }, el('span.ll-num', {}, l.id.slice(1)), el('span.ll-title', {}, l.title), l.minutes ? el('span.ll-min', {}, `${l.minutes} min`) : null, el('span.ll-state', {}, S.lessons.has(l.id) ? '✓' : '→'))
                : el('div.ll-soon', {}, el('span.ll-num', {}, l.id.slice(1)), el('span.ll-title', {}, l.title), el('span.ll-min', {}, 'soon'))))),
        m.ready ? el('div.step-card' + (p.quiz?.passed ? '.done' : ''), {},
            el('div', {}, el('h3', {}, '🧠 Module quiz'), el('p', {}, p.quiz ? `Best score ${Math.round(p.quiz.best_score * 100)}% · ${p.quiz.attempts} attempt${p.quiz.attempts === 1 ? '' : 's'}${p.quiz.passed ? ' · passed' : ` · ${Math.round(QUIZ.passMark * 100)}% to pass`}` : `${QUIZ.draw} questions, ${Math.round(QUIZ.passMark * 100)}% to pass. Every answer is explained.`)),
            el('a.btn-main', { href: `#/quiz/${m.id}` }, p.quiz ? 'Retake quiz' : 'Take the quiz')) : null,
        labCard(m),
    );
}

// ---------------------------------------------------------------------------- lesson

async function showLesson(id) {
    const { module: m, lesson, index } = lessonById(id);
    if (!m.ready) return showModule(m);
    put(main, el('div.loading', {}, 'Loading lesson…'));
    const content = (await import(`./modules/${m.id}.js`)).default[id.replace('.', '_')];
    const prev = m.lessons[index - 1], next = m.lessons[index + 1];
    let checkPassed = S.lessons.has(id);

    const completeBtn = el('button.btn-main', { type: 'button' }, S.lessons.has(id) ? '✓ Completed' : 'Complete lesson');
    const nextLink = el('a.btn-ghost', { href: next ? `#/lesson/${next.id}` : `#/quiz/${m.id}` }, next ? `Next: ${next.title} →` : 'Take the quiz →');
    const gate = el('p.gate', { 'aria-live': 'polite' }, checkPassed ? '' : 'Answer the quick check correctly to complete this lesson.');
    const syncGate = () => { completeBtn.disabled = !checkPassed; gate.textContent = checkPassed ? '' : 'Answer the quick check correctly to complete this lesson.'; };
    completeBtn.addEventListener('click', async () => {
        completeBtn.disabled = true;
        await completeLesson(id);
        completeBtn.textContent = '✓ Completed';
        nextLink.classList.replace('btn-ghost', 'btn-main');
        renderNav();
    });

    const body = el('article.lesson');
    for (const block of content.blocks) body.append(await renderBlock(block, () => { checkPassed = true; syncGate(); }));
    syncGate();

    put(main, 
        el('nav.crumbs', {}, el('a', { href: '#/' }, 'Course'), ' / ', el('a', { href: `#/${m.id}` }, `Module ${m.id.slice(1)}`), ' / ', el('span', {}, `Lesson ${id.slice(1)}`)),
        el('div.lesson-dots', { 'aria-hidden': 'true' }, ...m.lessons.map((l) => el('a' + (l.id === id ? '.on' : '') + (S.lessons.has(l.id) ? '.done' : ''), { href: `#/lesson/${l.id}`, title: l.title }))),
        el('header.page-head', {}, el('p.eyebrow', {}, `Lesson ${id.slice(1)} · ${lesson.minutes} min`), el('h1', {}, lesson.title)),
        body,
        el('footer.lesson-foot', {},
            prev ? el('a.btn-ghost', { href: `#/lesson/${prev.id}` }, `← ${prev.title}`) : el('span'),
            el('div.foot-main', {}, gate, completeBtn, nextLink)),
    );
}

async function renderBlock(b, onCheckPassed) {
    switch (b.type) {
        case 'text': return el('div.prose', { html: b.html });
        case 'tip': return el('aside.tip', { html: `<b>💡 Tip</b> ${b.html}` });
        case 'code': return el('figure.code', {}, b.caption ? el('figcaption', {}, b.caption) : null, el('pre', {}, el('code', {}, b.code)));
        case 'takeaways': return el('section.takeaways', {}, el('h3', {}, 'Key takeaways'), el('ul', {}, ...b.items.map((i) => el('li', {}, i))));
        case 'widget': {
            const box = el('div.widget', { 'data-widget': b.name });
            const loader = WIDGETS[b.name];
            if (loader) (await loader()).mount(box, b.props || {});
            box.addEventListener('widget-goal', () => box.classList.add('goal'));
            return box;
        }
        case 'check': {
            const fb = el('div.check-fb', { 'aria-live': 'polite' });
            const opts = b.options.map((o, i) => el('button.opt', { type: 'button', onclick: () => {
                opts.forEach((x) => x.classList.remove('picked', 'right', 'wrong'));
                opts[i].classList.add('picked', o.correct ? 'right' : 'wrong');
                fb.className = `check-fb ${o.correct ? 'good' : 'bad'}`;
                fb.textContent = (o.correct ? '✓ ' : '✗ Not quite. ') + o.why + (o.correct ? '' : ' Try again.');
                if (o.correct) onCheckPassed();
            } }, el('span.opt-key', {}, 'ABCD'[i]), el('span', {}, o.text)));
            return el('section.check', {}, el('h3', {}, '✅ Quick check'), el('p', {}, b.question), el('div.opts', {}, ...opts), fb);
        }
        default: return el('div');
    }
}

// ---------------------------------------------------------------------------- quiz

async function showQuiz(moduleId) {
    const m = MODULES.find((x) => x.id === moduleId);
    const head = [
        el('nav.crumbs', {}, el('a', { href: '#/' }, 'Course'), ' / ', el('a', { href: `#/${m.id}` }, `Module ${m.id.slice(1)}`), ' / ', el('span', {}, 'Quiz')),
        el('header.page-head', {}, el('p.eyebrow', {}, `Module ${m.id.slice(1)} quiz`), el('h1', {}, m.title)),
    ];
    if (!m.ready) return put(main, ...head, el('p.lead', {}, 'This quiz is coming soon.'));
    if (!S.user) {
        return put(main, ...head, el('div.step-card', {},
            el('div', {}, el('h3', {}, 'Sign in to take the quiz'), el('p', {}, 'Quizzes are scored on the server so the projector shows real results. Your answers stay private; only a pass is announced.')),
            S.verified ? el('button.btn-main', { type: 'button', onclick: signIn }, 'Sign in with GitHub') : el('p', {}, 'Sign-in is not available yet.')));
    }
    put(main, ...head, el('div.loading', {}, 'Loading questions…'));
    const { data, error } = await S.sb.from('quiz_questions').select('id, kind, lesson, prompt, code, options, hint').eq('module', moduleId);
    if (error || !data?.length) return put(main, ...head, el('p.lead', {}, `Couldn't load the quiz${error ? `: ${error.message}` : '.'}`));
    const questions = data.map((q) => ({ q, r: Math.random() })).sort((a, b) => a.r - b.r).slice(0, QUIZ.draw).map((x) => x.q);
    const attempt = crypto.randomUUID();
    let i = 0, right = 0;

    const stage = el('section.quiz');
    const bar = progressBar(0, 'Quiz progress');
    put(main, ...head, el('div.quiz-top', {}, el('span.quiz-count'), bar), stage);

    const showQuestion = () => {
        const q = questions[i];
        main.querySelector('.quiz-count').textContent = `Question ${i + 1} of ${questions.length} · ${right} correct`;
        bar.firstChild.style.width = `${(i / questions.length) * 100}%`;
        const fb = el('div.quiz-fb', { 'aria-live': 'polite' });
        const nextBtn = el('button.btn-main', { type: 'button', hidden: true }, i + 1 < questions.length ? 'Next question →' : 'See my results');
        nextBtn.addEventListener('click', () => { i += 1; i < questions.length ? showQuestion() : finish(); });

        const submit = async (choice, optionButtons) => {
            optionButtons.forEach((b) => { b.disabled = true; });
            const { data: res, error: err } = await S.sb.rpc('answer_question', { p_attempt: attempt, p_question: q.id, p_choice: choice });
            if (err) { fb.className = 'quiz-fb bad'; fb.textContent = err.message; optionButtons.forEach((b) => { b.disabled = false; }); return; }
            if (res.correct) right += 1;
            if (q.kind === 'single') {
                optionButtons[res.answer]?.classList.add('right');
                if (!res.correct) optionButtons[choice]?.classList.add('wrong');
            }
            const lesson = res.lesson && lessonById(res.lesson);
            fb.className = `quiz-fb ${res.correct ? 'good' : 'bad'}`;
            put(fb, 
                el('p.fb-title', {}, res.correct ? '✓ Correct!' : '✗ Not this time'),
                el('p', {}, res.explanation),
                !res.correct && q.kind === 'single' ? el('p', {}, el('b', {}, `Right answer (${'ABCD'[res.answer]}): `), String(res.correct_explanation || '').replace(/^Correct:\s*/, '')) : null,
                !res.correct && q.kind === 'order' ? el('p', {}, el('b', {}, 'Right order: '), res.answer.map((k) => q.options[k]).join('  →  ')) : null,
                !res.correct && res.hint ? el('p.fb-hint', {}, `💡 ${res.hint}`) : null,
                !res.correct && lesson ? el('a.fb-link', { href: `#/lesson/${res.lesson}`, target: '_blank' }, `📖 Review lesson ${res.lesson.slice(1)}: ${lesson.lesson.title}`) : null,
            );
            nextBtn.hidden = false;
            nextBtn.focus();
            main.querySelector('.quiz-count').textContent = `Question ${i + 1} of ${questions.length} · ${right} correct`;
        };

        let body;
        if (q.kind === 'single') {
            const buttons = q.options.map((o, k) => el('button.opt', { type: 'button', onclick: () => submit(k, buttons) }, el('span.opt-key', {}, 'ABCD'[k]), el('span', {}, o)));
            body = el('div.opts', {}, ...buttons);
        } else {
            let order = q.options.map((_, k) => k);
            const list = el('ol.order-list');
            const draw = () => list.replaceChildren(...order.map((k, pos) => el('li', {},
                el('code', {}, q.options[k]),
                el('span.order-btns', {},
                    el('button.mini', { type: 'button', 'aria-label': 'Move up', disabled: pos === 0, onclick: () => { [order[pos - 1], order[pos]] = [order[pos], order[pos - 1]]; draw(); } }, '↑'),
                    el('button.mini', { type: 'button', 'aria-label': 'Move down', disabled: pos === order.length - 1, onclick: () => { [order[pos + 1], order[pos]] = [order[pos], order[pos + 1]]; draw(); } }, '↓')))));
            draw();
            const check = el('button.btn-main', { type: 'button', onclick: () => { list.querySelectorAll('button').forEach((b) => { b.disabled = true; }); submit(order, [check]); } }, 'Check my order');
            body = el('div', {}, list, check);
        }
        put(stage, 
            el('h2.quiz-q', {}, q.prompt),
            q.code ? el('pre.quiz-code', {}, q.code) : null,
            body, fb, el('div.quiz-next', {}, nextBtn));
    };

    const finish = async () => {
        bar.firstChild.style.width = '100%';
        put(stage, el('div.loading', {}, 'Scoring on the server…'));
        const { data: res, error: err } = await S.sb.rpc('finish_quiz', { p_module: moduleId, p_attempt: attempt });
        if (err) return put(stage, el('p.lead', {}, `Couldn't score the quiz: ${err.message}`));
        const wasPassed = S.quizzes.get(moduleId)?.passed;
        await refreshProgress();
        renderHeader();
        const pct = Math.round(res.score * 100);
        put(stage, el('div.result' + (res.passed ? '.pass' : '.fail'), {},
            el('div.score-ring', { style: { '--p': res.score } }, el('b', {}, `${pct}%`), el('span', {}, `${res.correct}/${res.total}`)),
            el('h2', {}, res.passed ? (pct === 100 ? 'Flawless! 🏆' : 'Quiz passed! 🎉') : 'Almost there'),
            el('p.lead', {}, res.passed
                ? (wasPassed ? `Your best score is ${Math.round(res.best * 100)}%.` : `+${XP.quiz} XP. Your pass just landed on the projector as a hit on the Glitch Overlord.`)
                : `You need ${Math.round(QUIZ.passMark * 100)}% to pass. Review the lessons below, then try again: you'll get a fresh set of questions.`),
            res.review?.length ? el('div.review', {}, el('h3', {}, 'Worth reviewing'), el('ul', {}, ...res.review.map((l) => {
                const info = lessonById(l);
                return el('li', {}, el('a', { href: `#/lesson/${l}` }, `📖 Lesson ${l.slice(1)}: ${info?.lesson.title || l}`));
            }))) : null,
            el('div.hero-actions', {},
                el('button.btn-ghost', { type: 'button', onclick: () => showQuiz(moduleId) }, '↻ Try again'),
                res.passed ? el('a.btn-main', { href: `#/${moduleId}` }, 'Go to the lab →') : null),
        ));
    };

    showQuestion();
}

boot();
export { esc };
