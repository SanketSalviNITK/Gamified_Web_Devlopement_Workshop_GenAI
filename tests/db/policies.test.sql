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
  ('00000000-0000-0000-0000-00000000000a', '{"user_name":"ana-dev","provider_id":"1001","full_name":"Ana"}'),
  ('00000000-0000-0000-0000-00000000000b', '{"user_name":"ben","provider_id":"1002"}'),
  ('00000000-0000-0000-0000-00000000000c', '{"user_name":"ana-dev","provider_id":"1003"}');
select public._expect('profile created from GitHub metadata', (select github_login = 'ana-dev' and github_id = 1001 and display_name = 'Ana' from public.profiles where id = '00000000-0000-0000-0000-00000000000a'));
select public._expect('display name falls back to login', (select display_name = 'ben' from public.profiles where id = '00000000-0000-0000-0000-00000000000b'));
select public._expect('duplicate login does not block sign-up', (select github_login like 'ana-dev-%' from public.profiles where id = '00000000-0000-0000-0000-00000000000c'));
insert into public.cohorts (code, title, is_open) values ('closed-one', 'Closed', false);

-- 2. Anonymous visitors (the projector)
set role anon;
select public._expect('anon can read profiles', (select count(*) = 3 from public.profiles));
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

select format('%s  %s', case when ok then 'PASS' else 'FAIL' end, name) from public._results order by n;
select format('%s passed, %s failed', count(*) filter (where ok), count(*) filter (where not ok)) from public._results;
