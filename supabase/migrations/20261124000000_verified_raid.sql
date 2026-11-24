-- Glitch Raid: verified progress.
--
-- Replaces the old "whole state in a broadcast message" model. Students sign in with GitHub,
-- join a cohort, and quests are only marked as passed by the `verify-quest` Edge Function,
-- which inspects their real GitHub repository. Browsers can read the public roster but can
-- never write a pass themselves.
--
-- Run once in the Supabase SQL editor (or `supabase db push`). Safe to re-run.

-- ---------------------------------------------------------------------------
-- Tables

create table if not exists public.profiles (
    id            uuid primary key references auth.users (id) on delete cascade,
    github_login  text not null unique,
    github_id     bigint unique,
    display_name  text not null check (char_length(display_name) between 1 and 40),
    bot_class     text not null default 'architect' check (bot_class in ('architect', 'engineer', 'promptsmith')),
    theme_color   integer check (theme_color between 0 and 16777215),
    is_instructor boolean not null default false,
    created_at    timestamptz not null default now()
);

create table if not exists public.cohorts (
    code       text primary key check (code ~ '^[a-z0-9-]{3,40}$'),
    title      text not null,
    is_open    boolean not null default true,     -- closed cohorts accept no new students
    created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
    user_id     uuid not null references public.profiles (id) on delete cascade,
    cohort_code text not null references public.cohorts (code) on delete cascade,
    joined_at   timestamptz not null default now(),
    primary key (user_id, cohort_code)
);

-- Every verification attempt, passed or failed. Private to the student (and instructors).
create table if not exists public.submissions (
    id          bigint generated always as identity primary key,
    user_id     uuid not null references public.profiles (id) on delete cascade,
    quest_id    smallint not null check (quest_id between 1 and 5),
    repo        text not null,                       -- "owner/name"
    commit_sha  text,
    commit_at   timestamptz,
    passed      boolean not null,
    checks      jsonb not null default '[]'::jsonb,  -- [{id, label, pass, hint}]
    ai_tool     text,
    prompt      text check (char_length(prompt) <= 5000),
    created_at  timestamptz not null default now()
);
create index if not exists submissions_user_quest_idx on public.submissions (user_id, quest_id, created_at desc);

-- Public record of verified passes. Drives the arena, the leaderboard and certificates.
create table if not exists public.quest_passes (
    user_id    uuid not null references public.profiles (id) on delete cascade,
    quest_id   smallint not null check (quest_id between 1 and 5),
    repo       text not null,
    commit_sha text not null,
    passed_at  timestamptz not null default now(),
    primary key (user_id, quest_id)
);

insert into public.cohorts (code, title) values ('workshop', 'Gamified Web Development Workshop')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Profile is created automatically on first GitHub sign-in.
-- The GitHub login and numeric id are copied once, at sign-up, from what GitHub reported;
-- students cannot change them afterwards (see column grants below).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
    login text := coalesce(nullif(meta ->> 'user_name', ''), nullif(meta ->> 'preferred_username', ''), 'raider-' || left(new.id::text, 8));
    gh_id bigint := case when (meta ->> 'provider_id') ~ '^[0-9]+$' then (meta ->> 'provider_id')::bigint end;
    shown text := left(coalesce(nullif(meta ->> 'full_name', ''), nullif(meta ->> 'name', ''), login), 40);
begin
    begin
        insert into public.profiles (id, github_login, github_id, display_name)
        values (new.id, login, gh_id, shown)
        on conflict (id) do nothing;
    exception when unique_violation then
        -- Login already taken (e.g. an old account that was renamed on GitHub): keep sign-up working.
        insert into public.profiles (id, github_login, github_id, display_name)
        values (new.id, login || '-' || left(new.id::text, 4), null, shown)
        on conflict (id) do nothing;
    end;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security

alter table public.profiles     enable row level security;
alter table public.cohorts      enable row level security;
alter table public.enrollments  enable row level security;
alter table public.submissions  enable row level security;
alter table public.quest_passes enable row level security;

create or replace function public.is_instructor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce((select is_instructor from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "profiles are public"           on public.profiles;
drop policy if exists "students edit own profile"     on public.profiles;
drop policy if exists "cohorts are public"            on public.cohorts;
drop policy if exists "instructors manage cohorts"    on public.cohorts;
drop policy if exists "enrollments are public"        on public.enrollments;
drop policy if exists "students join open cohorts"    on public.enrollments;
drop policy if exists "students leave cohorts"        on public.enrollments;
drop policy if exists "students read own submissions" on public.submissions;
drop policy if exists "passes are public"             on public.quest_passes;

create policy "profiles are public" on public.profiles for select using (true);
create policy "students edit own profile" on public.profiles for update
    using (auth.uid() = id) with check (auth.uid() = id);

create policy "cohorts are public" on public.cohorts for select using (true);
create policy "instructors manage cohorts" on public.cohorts for all
    using (public.is_instructor()) with check (public.is_instructor());

create policy "enrollments are public" on public.enrollments for select using (true);
create policy "students join open cohorts" on public.enrollments for insert
    with check (auth.uid() = user_id and exists (select 1 from public.cohorts c where c.code = cohort_code and c.is_open));
create policy "students leave cohorts" on public.enrollments for delete using (auth.uid() = user_id);

create policy "students read own submissions" on public.submissions for select
    using (auth.uid() = user_id or public.is_instructor());
-- No insert/update/delete policies on submissions or quest_passes: only the verify-quest
-- function (service role, via record_verification) can write them.

create policy "passes are public" on public.quest_passes for select using (true);

-- Students may only change cosmetic profile fields.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (display_name, bot_class, theme_color) on public.profiles to authenticated;
revoke insert, update, delete on public.submissions, public.quest_passes from anon, authenticated;
grant select on public.submissions, public.quest_passes, public.cohorts, public.enrollments to anon, authenticated;
grant insert, delete on public.enrollments to authenticated;
-- TRUNCATE ignores row level security, and Supabase's default grants include it.
revoke truncate, trigger, references on public.profiles, public.cohorts, public.enrollments, public.submissions, public.quest_passes from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Roster for the arena / projector: everyone enrolled in a cohort and their verified passes.

create or replace function public.raid_roster(p_cohort text default 'workshop')
returns table (
    user_id       uuid,
    github_login  text,
    display_name  text,
    bot_class     text,
    theme_color   integer,
    joined_at     timestamptz,
    quests_passed integer,
    passes        jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
    select p.id, p.github_login, p.display_name, p.bot_class, p.theme_color, e.joined_at,
           count(q.quest_id)::integer,
           coalesce(
               jsonb_object_agg(q.quest_id::text, jsonb_build_object('repo', q.repo, 'commit', q.commit_sha, 'at', q.passed_at))
                   filter (where q.quest_id is not null),
               '{}'::jsonb)
    from public.enrollments e
    join public.profiles p on p.id = e.user_id
    left join public.quest_passes q on q.user_id = p.id
    where e.cohort_code = p_cohort and not p.is_instructor
    group by p.id, e.joined_at
    order by e.joined_at;
$$;
grant execute on function public.raid_roster(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Written only by the verify-quest Edge Function (service role).
-- Enforces quest order and records the attempt and, if passed, the public pass.

create or replace function public.record_verification(
    p_user      uuid,
    p_quest     smallint,
    p_repo      text,
    p_sha       text,
    p_commit_at timestamptz,
    p_passed    boolean,
    p_checks    jsonb,
    p_tool      text,
    p_prompt    text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    earlier integer;
begin
    if p_passed then
        select count(*) into earlier from public.quest_passes where user_id = p_user and quest_id < p_quest;
        if earlier < p_quest - 1 then
            raise exception 'Quest % is locked: pass quest % first', p_quest, earlier + 1 using errcode = 'P0001';
        end if;
    end if;

    insert into public.submissions (user_id, quest_id, repo, commit_sha, commit_at, passed, checks, ai_tool, prompt)
    values (p_user, p_quest, p_repo, p_sha, p_commit_at, p_passed, coalesce(p_checks, '[]'::jsonb), left(p_tool, 40), left(p_prompt, 5000));

    if p_passed then
        -- Re-verifying an already-passed quest refreshes the evidence but keeps the original pass time.
        insert into public.quest_passes (user_id, quest_id, repo, commit_sha)
        values (p_user, p_quest, p_repo, p_sha)
        on conflict (user_id, quest_id) do update set repo = excluded.repo, commit_sha = excluded.commit_sha;
    end if;

    return jsonb_build_object('passed', p_passed, 'quest', p_quest);
end;
$$;
revoke execute on function public.record_verification(uuid, smallint, text, text, timestamptz, boolean, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.record_verification(uuid, smallint, text, text, timestamptz, boolean, jsonb, text, text) to service_role;

-- How many verification attempts a student made recently (used for rate limiting).
create or replace function public.recent_attempts(p_user uuid, p_window interval default interval '1 hour')
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select count(*)::integer from public.submissions where user_id = p_user and created_at > now() - p_window;
$$;
revoke execute on function public.recent_attempts(uuid, interval) from public, anon, authenticated;
grant execute on function public.recent_attempts(uuid, interval) to service_role;

-- ---------------------------------------------------------------------------
-- Realtime: the arena listens for new passes, enrollments and profile changes.

do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        begin alter publication supabase_realtime add table public.quest_passes; exception when duplicate_object then null; end;
        begin alter publication supabase_realtime add table public.enrollments;  exception when duplicate_object then null; end;
        begin alter publication supabase_realtime add table public.profiles;     exception when duplicate_object then null; end;
    end if;
end;
$$;
