// Content checks for the course. Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { MODULES, QUIZ, READY_LESSONS, lessonById } from '../course/course.js';
import { loadQuiz } from '../tools/build-course-seed.mjs';

const ready = MODULES.filter((m) => m.ready);

test('every ready module has content for each lesson, with a quick check and takeaways', async () => {
    for (const m of ready) {
        const content = (await import(`../course/modules/${m.id}.js`)).default;
        for (const l of m.lessons) {
            const lesson = content[l.id.replace('.', '_')];
            assert.ok(lesson, `${l.id} has no content`);
            const types = lesson.blocks.map((b) => b.type);
            assert.ok(types.includes('check'), `${l.id} needs a quick check`);
            assert.ok(types.includes('takeaways'), `${l.id} needs takeaways`);
            for (const b of lesson.blocks.filter((x) => x.type === 'check')) {
                assert.equal(b.options.filter((o) => o.correct).length, 1, `${l.id} check needs exactly one right answer`);
                assert.ok(b.options.every((o) => o.why), `${l.id} check: every option needs a "why"`);
            }
            for (const b of lesson.blocks.filter((x) => x.type === 'widget')) {
                assert.ok(existsSync(new URL(`../course/widgets/${b.name}.js`, import.meta.url)), `${l.id} uses missing widget ${b.name}`);
            }
        }
    }
});

test('quiz answer keys agree with their explanations', () => {
    for (const m of ready) {
        const quiz = loadQuiz(m.id);
        assert.ok(quiz, `${m.id} has no quiz bank`);
        assert.ok(quiz.questions.length >= QUIZ.draw, `${m.id} needs at least ${QUIZ.draw} questions`);
        const ids = new Set();
        for (const q of quiz.questions) {
            assert.ok(!ids.has(q.id), `duplicate question id ${q.id}`);
            ids.add(q.id);
            assert.ok(READY_LESSONS.includes(q.lesson), `${q.id} links to unknown lesson ${q.lesson}`);
            assert.equal(lessonById(q.lesson).module.id, m.id, `${q.id} links to a lesson in another module`);
            assert.ok(q.hint, `${q.id} needs a hint`);
            if (q.kind === 'single') {
                assert.equal(q.explanations.length, q.options.length, `${q.id}: one explanation per option`);
                const flagged = q.explanations.map((e, i) => (e.startsWith('Correct') ? i : -1)).filter((i) => i >= 0);
                assert.deepEqual(flagged, [q.answer], `${q.id}: the "Correct" explanation must be on the answer`);
            } else {
                assert.equal(q.kind, 'order');
                assert.deepEqual([...q.answer].sort(), q.options.map((_, i) => i), `${q.id}: order answer must use every item once`);
                assert.notDeepEqual(q.answer, q.options.map((_, i) => i), `${q.id}: items must not start in the right order`);
            }
        }
    }
});

test('the database seed matches the course content', () => {
    const out = execFileSync(process.execPath, [new URL('../tools/build-course-seed.mjs', import.meta.url).pathname, '--check'], { encoding: 'utf8' });
    assert.match(out, /up to date/);
});

test('the quiz size in the database function matches the course', () => {
    const sql = readFileSync(new URL('../supabase/migrations/20261125000000_course.sql', import.meta.url), 'utf8');
    assert.match(sql, new RegExp(`least\\(${QUIZ.draw}, count\\(\\*\\)\\)`));
    assert.match(sql, new RegExp(`>= ${QUIZ.passMark}`));
});
