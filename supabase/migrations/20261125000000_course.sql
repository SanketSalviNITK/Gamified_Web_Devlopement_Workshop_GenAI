-- Course: lessons, server-scored quizzes, and a public feed of milestones for the projector.
--
-- * Quiz answers and explanations are never readable by browsers: answer_question() checks
--   one answer at a time and returns the feedback, and finish_quiz() scores an attempt from the
--   answers already recorded, so a score cannot be invented by the page.
-- * Lesson progress, answers and quiz results are private to the student (and instructors).
-- * raid_events is the public feed the arena listens to: "finished a lesson", "passed a quiz".
--   Failed attempts are never published.
-- Lesson and question content is seeded by the generated *_course_seed.sql migration.

create table if not exists public.course_lessons (
    id     text primary key check (id ~ '^m[0-9]+\.[0-9]+$'),
    module text not null check (module ~ '^m[0-9]+$')
);

create table if not exists public.lesson_progress (
    user_id      uuid not null references public.profiles (id) on delete cascade,
    lesson_id    text not null references public.course_lessons (id) on delete cascade,
    completed_at timestamptz not null default now(),
    primary key (user_id, lesson_id)
);

create table if not exists public.quiz_questions (
    id           text primary key,
    module       text not null check (module ~ '^m[0-9]+$'),
    kind         text not null check (kind in ('single', 'order')),
    lesson       text references public.course_lessons (id),
    prompt       text not null,
    code         text,
    options      jsonb not null,
    hint         text,
    answer       jsonb not null,        -- secret: index (single) or ordered indices (order)
    explanations jsonb not null,        -- secret: one per option (single) or one overall (order)
    active       boolean not null default true
);

create table if not exists public.quiz_answers (
    user_id     uuid not null references public.profiles (id) on delete cascade,
    attempt_id  uuid not null,
    question_id text not null references public.quiz_questions (id) on delete cascade,
    choice      jsonb not null,
    correct     boolean not null,
    answered_at timestamptz not null default now(),
    primary key (user_id, attempt_id, question_id)   -- the first answer in an attempt is the one that counts
);
create index if not exists quiz_answers_question_idx on public.quiz_answers (question_id, user_id, answered_at);

create table if not exists public.quiz_results (
    user_id    uuid not null references public.profiles (id) on delete cascade,
    module     text not null,
    attempts   integer not null default 0,
    best_score numeric(4, 3) not null default 0,
    passed     boolean not null default false,
    passed_at  timestamptz,
    primary key (user_id, module)
);

create table if not exists public.raid_events (
    id         bigint generated always as identity primary key,
    user_id    uuid not null references public.profiles (id) on delete cascade,
    kind       text not null check (kind in ('lesson', 'quiz_pass')),
    ref        text not null,
    detail     text,
    created_at timestamptz not null default now()
);
create index if not exists raid_events_user_idx on public.raid_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Access

alter table public.course_lessons  enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_questions  enable row level security;
alter table public.quiz_answers    enable row level security;
alter table public.quiz_results    enable row level security;
alter table public.raid_events     enable row level security;

drop policy if exists "lessons are public"            on public.course_lessons;
drop policy if exists "own lesson progress"           on public.lesson_progress;
drop policy if exists "questions are public"          on public.quiz_questions;
drop policy if exists "own quiz answers"              on public.quiz_answers;
drop policy if exists "own quiz results"              on public.quiz_results;
drop policy if exists "raid events are public"        on public.raid_events;

create policy "lessons are public" on public.course_lessons for select using (true);
create policy "own lesson progress" on public.lesson_progress for select using (auth.uid() = user_id or public.is_instructor());
create policy "questions are public" on public.quiz_questions for select using (active);
create policy "own quiz answers" on public.quiz_answers for select using (auth.uid() = user_id or public.is_instructor());
create policy "own quiz results" on public.quiz_results for select using (auth.uid() = user_id or public.is_instructor());
create policy "raid events are public" on public.raid_events for select using (true);

-- Browsers only read; all writes go through the functions below.
revoke all on public.course_lessons, public.lesson_progress, public.quiz_questions, public.quiz_answers,
              public.quiz_results, public.raid_events from anon, authenticated;
grant select on public.course_lessons, public.lesson_progress, public.quiz_answers, public.quiz_results,
               public.raid_events to anon, authenticated;
-- Question text and options are public; answer and explanations are not.
grant select (id, module, kind, lesson, prompt, code, options, hint, active) on public.quiz_questions to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Lessons

create or replace function public.complete_lesson(p_lesson text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    me uuid := auth.uid();
    inserted integer;
begin
    if me is null then raise exception 'Sign in first' using errcode = '28000'; end if;
    if not exists (select 1 from public.course_lessons where id = p_lesson) then
        raise exception 'Unknown lesson %', p_lesson using errcode = '22023';
    end if;
    insert into public.lesson_progress (user_id, lesson_id) values (me, p_lesson) on conflict do nothing;
    get diagnostics inserted = row_count;
    if inserted > 0 then
        insert into public.raid_events (user_id, kind, ref) values (me, 'lesson', p_lesson);
    end if;
    return jsonb_build_object('lesson', p_lesson, 'new', inserted > 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- Quizzes

create or replace function public.answer_question(p_attempt uuid, p_question text, p_choice jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    me uuid := auth.uid();
    q public.quiz_questions;
    is_correct boolean;
    recent integer;
begin
    if me is null then raise exception 'Sign in first' using errcode = '28000'; end if;
    select * into q from public.quiz_questions where id = p_question and active;
    if not found then raise exception 'Unknown question %', p_question using errcode = '22023'; end if;

    select count(*) into recent from public.quiz_answers where user_id = me and answered_at > now() - interval '1 hour';
    if recent >= 300 then raise exception 'Too many answers this hour. Take a break and come back.' using errcode = 'P0001'; end if;

    if q.kind = 'single' then
        if jsonb_typeof(p_choice) <> 'number' or (p_choice)::int not between 0 and jsonb_array_length(q.options) - 1 then
            raise exception 'Choose one of the options' using errcode = '22023';
        end if;
    elsif jsonb_typeof(p_choice) <> 'array' or jsonb_array_length(p_choice) <> jsonb_array_length(q.options) then
        raise exception 'Put every item in order' using errcode = '22023';
    end if;
    is_correct := p_choice = q.answer;

    insert into public.quiz_answers (user_id, attempt_id, question_id, choice, correct)
    values (me, p_attempt, p_question, p_choice, is_correct)
    on conflict do nothing;

    return jsonb_build_object(
        'correct', is_correct,
        'answer', q.answer,
        'explanation', case when q.kind = 'single' then q.explanations ->> (p_choice)::int else q.explanations ->> 0 end,
        'correct_explanation', case when q.kind = 'single' then q.explanations ->> (q.answer)::int else q.explanations ->> 0 end,
        'hint', q.hint,
        'lesson', q.lesson
    );
end;
$$;

create or replace function public.finish_quiz(p_module text, p_attempt uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    me uuid := auth.uid();
    total integer;
    right_answers integer;
    needed integer;
    score numeric;
    was_passed boolean;
    now_passed boolean;
    best numeric;
    review jsonb;
begin
    if me is null then raise exception 'Sign in first' using errcode = '28000'; end if;
    select count(*), count(*) filter (where a.correct) into total, right_answers
      from public.quiz_answers a join public.quiz_questions q on q.id = a.question_id
     where a.user_id = me and a.attempt_id = p_attempt and q.module = p_module;
    -- A quiz draws 8 questions (course/course.js QUIZ.draw), or all of them if the bank is smaller.
    select least(8, count(*)) into needed from public.quiz_questions where module = p_module and active;
    if needed = 0 then raise exception 'This module has no quiz yet' using errcode = '22023'; end if;
    if total < needed then raise exception 'Answer all % questions first', needed using errcode = '22023'; end if;

    score := round(right_answers::numeric / total, 3);
    select coalesce(bool_or(passed), false) into was_passed from public.quiz_results where user_id = me and module = p_module;

    insert into public.quiz_results as r (user_id, module, attempts, best_score, passed, passed_at)
    values (me, p_module, 1, score, score >= 0.7, case when score >= 0.7 then now() end)
    on conflict (user_id, module) do update set
        attempts   = r.attempts + 1,
        best_score = greatest(r.best_score, excluded.best_score),
        passed     = r.passed or excluded.passed,
        passed_at  = coalesce(r.passed_at, excluded.passed_at)
    returning passed, best_score into now_passed, best;

    if now_passed and not was_passed then
        insert into public.raid_events (user_id, kind, ref, detail) values (me, 'quiz_pass', p_module, right_answers || '/' || total);
    end if;

    select coalesce(jsonb_agg(distinct q.lesson), '[]'::jsonb) into review
      from public.quiz_answers a join public.quiz_questions q on q.id = a.question_id
     where a.user_id = me and a.attempt_id = p_attempt and not a.correct and q.lesson is not null;

    return jsonb_build_object('module', p_module, 'correct', right_answers, 'total', total, 'score', score,
                              'passed', score >= 0.7, 'best', best, 'module_passed', now_passed, 'review', review);
end;
$$;

-- ---------------------------------------------------------------------------
-- Projector: roster with learning progress, and the questions a cohort finds hardest.

drop function if exists public.raid_roster(text);
create function public.raid_roster(p_cohort text default 'workshop')
returns table (
    user_id        uuid,
    github_login   text,
    display_name   text,
    bot_class      text,
    theme_color    integer,
    joined_at      timestamptz,
    quests_passed  integer,
    passes         jsonb,
    lessons_done   integer,
    quizzes_passed integer
)
language sql
stable
security definer
set search_path = ''
as $$
    select p.id, p.github_login, p.display_name, p.bot_class, p.theme_color, e.joined_at,
           (select count(*)::integer from public.quest_passes q where q.user_id = p.id),
           coalesce((select jsonb_object_agg(q.quest_id::text, jsonb_build_object('repo', q.repo, 'commit', q.commit_sha, 'at', q.passed_at))
                       from public.quest_passes q where q.user_id = p.id), '{}'::jsonb),
           (select count(*)::integer from public.lesson_progress l where l.user_id = p.id),
           (select count(*)::integer from public.quiz_results r where r.user_id = p.id and r.passed)
    from public.enrollments e
    join public.profiles p on p.id = e.user_id
    where e.cohort_code = p_cohort and not p.is_instructor
    order by e.joined_at;
$$;
grant execute on function public.raid_roster(text) to anon, authenticated;

create or replace function public.cohort_insights(p_cohort text default 'workshop')
returns table (question_id text, prompt text, lesson text, hint text, answered integer, missed integer)
language sql
stable
security definer
set search_path = ''
as $$
    with firsts as (   -- each student's first-ever answer to each question
        select distinct on (a.user_id, a.question_id) a.user_id, a.question_id, a.correct
          from public.quiz_answers a
          join public.enrollments e on e.user_id = a.user_id and e.cohort_code = p_cohort
          join public.profiles p on p.id = a.user_id and not p.is_instructor
         order by a.user_id, a.question_id, a.answered_at
    )
    select q.id, q.prompt, q.lesson, q.hint, count(*)::integer, count(*) filter (where not f.correct)::integer
      from firsts f join public.quiz_questions q on q.id = f.question_id
     group by q.id, q.prompt, q.lesson, q.hint
    having count(*) >= 3 and count(*) filter (where not f.correct) * 10 >= count(*) * 4   -- at least 3 answers, 40%+ missed
     order by count(*) filter (where not f.correct)::numeric / count(*) desc, count(*) desc
     limit 3;
$$;
grant execute on function public.cohort_insights(text) to anon, authenticated;

revoke execute on function public.complete_lesson(text), public.answer_question(uuid, text, jsonb), public.finish_quiz(text, uuid) from public, anon;
grant execute on function public.complete_lesson(text), public.answer_question(uuid, text, jsonb), public.finish_quiz(text, uuid) to authenticated;

do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        begin alter publication supabase_realtime add table public.raid_events; exception when duplicate_object then null; end;
    end if;
end;
$$;
