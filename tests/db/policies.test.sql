-- Security and behaviour tests for the verified-raid schema. Run with tests/db/run.sh.
\set ON_ERROR_STOP 1
create table public._results (n serial, name text, ok boolean);
grant all on public._results, public._results_n_seq to anon, authenticated, service_role;

create function public._expect(name text, ok boolean) returns void language sql as $$ insert into public._results (name, ok) values (name, ok) $$;
-- Runs a statement and records whether it failed (as it should).
create function public._expect_denied(name text, stmt text) returns void language plpgsql as $$
begin
    begin execute stmt; insert into public._results (name, ok) values (name, false);
    exception when others then insert into public._results (name, ok) values (name, true); end;
end $$;
grant execute on function public._expect(text, boolean), public._expect_denied(text, text) to anon, authenticated, service_role;

-- 1. GitHub sign-ups create profiles
insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', '{"user_name":"ana-dev","provider_id":"1001","full_name":"Ana"}', '{"provider":"github"}'),
  ('00000000-0000-0000-0000-00000000000b', '{"user_name":"ben","provider_id":"1002"}', '{"provider":"github"}'),
  ('00000000-0000-0000-0000-00000000000c', '{"user_name":"ana-dev","provider_id":"1003"}', '{"provider":"github"}'),
  -- An email sign-up that writes someone else's GitHub identity into its own metadata.
  ('00000000-0000-0000-0000-00000000000d', '{"user_name":"victim-dev","provider_id":"4242","full_name":"Victim"}', '{"provider":"email"}');
select public._expect('profile created from GitHub metadata', (select github_login = 'ana-dev' and github_id = 1001 and display_name = 'Ana' from public.profiles where id = '00000000-0000-0000-0000-00000000000a'));
select public._expect('display name falls back to login', (select display_name = 'ben' from public.profiles where id = '00000000-0000-0000-0000-00000000000b'));
select public._expect('duplicate login does not block sign-up', (select github_login like 'ana-dev-%' from public.profiles where id = '00000000-0000-0000-0000-00000000000c'));
-- GitHub sign-up where Supabase only records the provider after creating the user:
-- the identity row (written from GitHub's own answer) must still link the profile.
insert into auth.users values ('00000000-0000-0000-0000-00000000000e', '{}', '{"provider":"email"}');
insert into auth.identities (user_id, provider, provider_id, identity_data)
values ('00000000-0000-0000-0000-00000000000e', 'github', '5005', '{"user_name":"late-gh","full_name":"Late Linker"}');
select public._expect('GitHub identity row links the profile', (select github_login = 'late-gh' and github_id = 5005 and display_name = 'Late Linker' from public.profiles where id = '00000000-0000-0000-0000-00000000000e'));
-- The impostor adds an email identity: still not linked.
insert into auth.identities (user_id, provider, provider_id, identity_data)
values ('00000000-0000-0000-0000-00000000000d', 'email', '00000000-0000-0000-0000-00000000000d', '{"user_name":"victim-dev","provider_id":"4242"}');
-- Linking a GitHub account that already belongs to someone else is ignored.
insert into auth.users values ('00000000-0000-0000-0000-00000000000f', '{}', '{"provider":"email"}');
insert into auth.identities (user_id, provider, provider_id, identity_data)
values ('00000000-0000-0000-0000-00000000000f', 'github', '1001', '{"user_name":"ana-dev"}');
select public._expect('a GitHub account cannot be linked to two profiles', (select github_id is null from public.profiles where id = '00000000-0000-0000-0000-00000000000f'));
select public._expect('email sign-up cannot claim a GitHub identity', (select github_login like 'raider-%' and github_id is null and display_name = 'Raider' from public.profiles where id = '00000000-0000-0000-0000-00000000000d'));
insert into public.cohorts (code, title, is_open) values ('closed-one', 'Closed', false);

-- 2. Anonymous visitors (the projector)
set role anon;
select public._expect('anon can read profiles', (select count(*) = 6 from public.profiles));
select public._expect('anon can call raid_roster', (select count(*) = 0 from public.raid_roster('workshop')));
select public._expect_denied('anon cannot insert a pass', $q$insert into public.quest_passes values ('00000000-0000-0000-0000-00000000000a', 1, 'x/y', 'abc')$q$);
select public._expect_denied('anon cannot edit profiles', $q$update public.profiles set display_name = 'hax'$q$);
select public._expect_denied('anon cannot truncate passes', 'truncate public.quest_passes');
select public._expect_denied('anon cannot call record_verification', $q$select public.record_verification('00000000-0000-0000-0000-00000000000a', 1::smallint, 'x/y', 'abc', now(), true, '[]', 't', 'p')$q$);
select public._expect_denied('anon cannot join a cohort', $q$insert into public.enrollments (user_id, cohort_code) values ('00000000-0000-0000-0000-00000000000a', 'workshop')$q$);
reset role;

-- 3. A signed-in student (Ana)
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.profiles set display_name = 'Ana B', bot_class = 'engineer', theme_color = 16711680 where id = auth.uid();
select public._expect('student edits own cosmetic fields', (select display_name = 'Ana B' and bot_class = 'engineer' from public.profiles where id = auth.uid()));
select public._expect_denied('student cannot make themselves instructor', $q$update public.profiles set is_instructor = true where id = auth.uid()$q$);
select public._expect_denied('student cannot change their GitHub login', $q$update public.profiles set github_login = 'someone-else' where id = auth.uid()$q$);
select public._expect_denied('student cannot change their GitHub id', $q$update public.profiles set github_id = 1 where id = auth.uid()$q$);
update public.profiles set display_name = 'pwned' where id = '00000000-0000-0000-0000-00000000000b';
select public._expect('student cannot edit someone else''s profile', (select display_name = 'ben' from public.profiles where id = '00000000-0000-0000-0000-00000000000b'));
insert into public.enrollments (user_id, cohort_code) values (auth.uid(), 'workshop');
select public._expect('student joins an open cohort', (select count(*) = 1 from public.enrollments where user_id = auth.uid()));
select public._expect_denied('student cannot enrol someone else', $q$insert into public.enrollments (user_id, cohort_code) values ('00000000-0000-0000-0000-00000000000b', 'workshop')$q$);
select public._expect_denied('student cannot join a closed cohort', $q$insert into public.enrollments (user_id, cohort_code) values (auth.uid(), 'closed-one')$q$);
select public._expect_denied('student cannot record their own pass', $q$insert into public.quest_passes values (auth.uid(), 1, 'x/y', 'abc')$q$);
select public._expect_denied('student cannot write submissions', $q$insert into public.submissions (user_id, quest_id, repo, passed) values (auth.uid(), 1, 'x/y', true)$q$);
select public._expect_denied('student cannot call record_verification', $q$select public.record_verification(auth.uid(), 1::smallint, 'x/y', 'abc', now(), true, '[]', 't', 'p')$q$);
select public._expect_denied('student cannot create cohorts', $q$insert into public.cohorts (code, title) values ('my-cohort', 'Mine')$q$);
select public._expect_denied('student cannot truncate', 'truncate public.submissions');
reset role;
reset request.jwt.claim.sub;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.enrollments (user_id, cohort_code) values (auth.uid(), 'workshop');
reset role;

-- 4. The verify-quest function (service role)
set role service_role;
select public._expect_denied('quest order is enforced', $q$select public.record_verification('00000000-0000-0000-0000-00000000000a', 2::smallint, 'ana-dev/site', 'sha2', now(), true, '[]', 'Claude', 'p')$q$);
select public.record_verification('00000000-0000-0000-0000-00000000000a', 1::smallint, 'ana-dev/site', 'sha1', now(), true, '[{"id":"readme","pass":true}]', 'Claude', 'my prompt');
select public.record_verification('00000000-0000-0000-0000-00000000000a', 2::smallint, 'ana-dev/site', 'sha2', now(), true, '[]', 'Claude', 'p2');
select public.record_verification('00000000-0000-0000-0000-00000000000a', 3::smallint, 'ana-dev/site', 'sha3', now(), false, '[{"id":"mesh","pass":false}]', 'Claude', 'p3');
select public._expect('failed attempt does not create a pass', (select count(*) = 2 from public.quest_passes where user_id = '00000000-0000-0000-0000-00000000000a'));
select public._expect('every attempt is logged', (select count(*) = 3 from public.submissions where user_id = '00000000-0000-0000-0000-00000000000a'));
select public._expect('recent_attempts counts attempts', (select public.recent_attempts('00000000-0000-0000-0000-00000000000a') = 3));
update public.quest_passes set passed_at = '2020-01-01' where quest_id = 1;
select public.record_verification('00000000-0000-0000-0000-00000000000a', 1::smallint, 'ana-dev/site', 'sha1b', now(), true, '[]', 'Claude', 'p');
select public._expect('re-verifying keeps the original pass time', (select passed_at = '2020-01-01' and commit_sha = 'sha1b' from public.quest_passes where user_id = '00000000-0000-0000-0000-00000000000a' and quest_id = 1));
reset role;

-- 5. Reading results
set role anon;
select public._expect('roster shows verified progress', (select quests_passed = 2 and passes ? '2' and passes -> '1' ->> 'commit' = 'sha1b' from public.raid_roster('workshop') where github_login = 'ana-dev'));
select public._expect('roster lists enrolled students only', (select count(*) = 2 from public.raid_roster('workshop')));
select public._expect('anon cannot read submissions (prompts are private)', (select count(*) = 0 from public.submissions));
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public._expect('student reads own submissions', (select count(*) = 4 from public.submissions));
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public._expect('student cannot read others'' submissions', (select count(*) = 0 from public.submissions));
reset role;

-- 6. Instructors
update public.profiles set is_instructor = true where id = '00000000-0000-0000-0000-00000000000b';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public._expect('instructor reads all submissions', (select count(*) = 4 from public.submissions));
insert into public.cohorts (code, title) values ('spring-2027', 'Spring cohort');
select public._expect('instructor creates cohorts', (select count(*) = 1 from public.cohorts where code = 'spring-2027'));
select public._expect('instructors are not raiders on the roster', (select count(*) = 1 from public.raid_roster('workshop')));
reset role;


-- 7. Course: lessons, server-scored quizzes, projector feed
set role anon;
select public._expect('anon reads quiz questions without answers', (select count(*) = 12 from (select id, prompt, options, kind from public.quiz_questions where module = 'm1') x));
select public._expect('module 2 has its own 12 questions', (select count(*) = 12 from (select id from public.quiz_questions where module = 'm2') x));
select public._expect_denied('anon cannot read quiz answers', 'select answer from public.quiz_questions');
select public._expect_denied('anon cannot read explanations', 'select explanations from public.quiz_questions');
select public._expect_denied('anon cannot complete lessons', $q$select public.complete_lesson('m1.1')$q$);
select public._expect_denied('anon cannot answer questions', $q$select public.answer_question(gen_random_uuid(), 'm1.q1', '1')$q$);
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public._expect('student completes a lesson', (select (public.complete_lesson('m1.1') ->> 'new')::boolean));
select public._expect('completing it again is not double-counted', (select not (public.complete_lesson('m1.1') ->> 'new')::boolean));
select public._expect_denied('unknown lessons are rejected', $q$select public.complete_lesson('m9.9')$q$);
select public._expect_denied('student cannot write lesson progress directly', $q$insert into public.lesson_progress values (auth.uid(), 'm1.2')$q$);
select public._expect_denied('student cannot read answers either', 'select answer from public.quiz_questions');

-- Feedback on a right and a wrong answer
select public._expect('right answer is confirmed with its explanation',
  (select (r ->> 'correct')::boolean and r ->> 'explanation' like 'Correct%' from (select public.answer_question('11111111-1111-1111-1111-111111111111', 'm1.q1', '1') r) x));
select public._expect('wrong answer explains why, reveals the right one and links the lesson',
  (select not (r ->> 'correct')::boolean and r ->> 'explanation' like 'Git accepts short messages%' and r ->> 'correct_explanation' like 'Correct%'
          and r ->> 'hint' is not null and r ->> 'lesson' = 'm1.2'
     from (select public.answer_question('11111111-1111-1111-1111-111111111111', 'm1.q2', '0') r) x));
select public._expect('first answer in an attempt is the one that counts',
  (select not (public.answer_question('11111111-1111-1111-1111-111111111111', 'm1.q2', '1') ->> 'correct')::boolean is false
          and (select not correct from public.quiz_answers where attempt_id = '11111111-1111-1111-1111-111111111111' and question_id = 'm1.q2')));
select public._expect('order questions are checked as a sequence',
  (select (public.answer_question('11111111-1111-1111-1111-111111111111', 'm1.q8', '[2,1,3,0]') ->> 'correct')::boolean));
select public._expect_denied('out-of-range choices are rejected', $q$select public.answer_question(gen_random_uuid(), 'm1.q1', '7')$q$);
select public._expect_denied('a quiz cannot be finished early', $q$select public.finish_quiz('m1', '11111111-1111-1111-1111-111111111111')$q$);
-- Answers so far: q1 right, q2 wrong, q8 right. Five more: q3 wrong, q4 q5 q6 q7 right -> 6/8.
select public.answer_question('11111111-1111-1111-1111-111111111111', 'm1.q3', '0');
select public.answer_question('11111111-1111-1111-1111-111111111111', 'm1.q4', '1');
select public.answer_question('11111111-1111-1111-1111-111111111111', 'm1.q5', '1');
select public.answer_question('11111111-1111-1111-1111-111111111111', 'm1.q6', '1');
select public.answer_question('11111111-1111-1111-1111-111111111111', 'm1.q7', '0');
select public._expect('quiz is scored on the server: 6/8 passes',
  (select r ->> 'correct' = '6' and r ->> 'total' = '8' and (r ->> 'passed')::boolean and r -> 'review' ? 'm1.2'
     from (select public.finish_quiz('m1', '11111111-1111-1111-1111-111111111111') r) x));
-- A worse second attempt keeps the best score and doesn't announce again.
select public.answer_question('22222222-2222-2222-2222-222222222222', id, '0') from public.quiz_questions where module = 'm1' and kind = 'single' order by id limit 8;
select public._expect('a worse retry keeps the best score',
  (select not (r ->> 'passed')::boolean and (r ->> 'best')::numeric = 0.75 and (r ->> 'module_passed')::boolean
     from (select public.finish_quiz('m1', '22222222-2222-2222-2222-222222222222') r) x));
select public._expect('projector feed: one lesson and one quiz pass, no failed attempts',
  (select count(*) filter (where kind = 'lesson') = 1 and count(*) filter (where kind = 'quiz_pass' and detail = '6/8') = 1 and count(*) = 2
     from public.raid_events where user_id = auth.uid()));
reset role;
reset request.jwt.claim.sub;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
select public._expect('students cannot see each other''s quiz results', (select count(*) = 0 from public.quiz_results));
select public._expect('students cannot see each other''s answers', (select count(*) = 0 from public.quiz_answers));
select public._expect('students cannot see each other''s lesson progress', (select count(*) = 0 from public.lesson_progress));
reset role;
reset request.jwt.claim.sub;

set role anon;
select public._expect('roster shows lessons and quizzes for the projector',
  (select lessons_done = 1 and quizzes_passed = 1 from public.raid_roster('workshop') where github_login = 'ana-dev'));
reset role;

-- Hardest-question insight: three more students all miss m1.q3.
insert into public.enrollments (user_id, cohort_code) values
  ('00000000-0000-0000-0000-00000000000d', 'workshop'), ('00000000-0000-0000-0000-00000000000e', 'workshop'), ('00000000-0000-0000-0000-00000000000f', 'workshop');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select public.answer_question(gen_random_uuid(), 'm1.q3', '0');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
select public.answer_question(gen_random_uuid(), 'm1.q3', '2');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
select public.answer_question(gen_random_uuid(), 'm1.q3', '1');
reset role;
reset request.jwt.claim.sub;
set role anon;
select public._expect('projector learns which question the class finds hardest',
  (select question_id = 'm1.q3' and answered = 4 and missed = 3 and lesson = 'm1.2' and hint is not null
     from public.cohort_insights('workshop') limit 1));
reset role;

-- 8. Module 2 scoring
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public._expect('module 2: box-model order question is checked as a sequence',
  (select (public.answer_question('33333333-3333-3333-3333-333333333333', 'm2.q5', '[2,1,3,0]') ->> 'correct')::boolean
      and not (public.answer_question('44444444-4444-4444-4444-444444444444', 'm2.q5', '[0,3,1,2]') ->> 'correct')::boolean));
select public._expect('module 2: wrong answer links its own lesson',
  (select r ->> 'lesson' = 'm2.3' and not (r ->> 'correct')::boolean from (select public.answer_question('33333333-3333-3333-3333-333333333333', 'm2.q7', '0') r) x));
select public._expect('module 2 lessons can be completed', (select (public.complete_lesson('m2.4') ->> 'new')::boolean));
reset role;
reset request.jwt.claim.sub;

select format('%s  %s', case when ok then 'PASS' else 'FAIL' end, name) from public._results order by n;
select format('%s passed, %s failed', count(*) filter (where ok), count(*) filter (where not ok)) from public._results;
