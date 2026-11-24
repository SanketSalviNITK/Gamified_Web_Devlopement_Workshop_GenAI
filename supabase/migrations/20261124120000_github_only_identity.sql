-- Only trust GitHub identity details that came from a real GitHub sign-in.
--
-- raw_user_meta_data can be written by whoever signs up (for example
-- supabase.auth.signUp({ email, password, options: { data: { user_name: 'someone' } } })),
-- so copying user_name / provider_id from it would let an email sign-up claim another
-- person's GitHub account and submit their repositories. raw_app_meta_data is set by
-- Supabase Auth itself and records which provider was used, so check that first.
--
-- Accounts that did not sign up with GitHub get an anonymous "raider-..." login and no
-- GitHub id; the verify-quest function only accepts repositories owned by the GitHub id,
-- so they can never pass a quest.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
    app      jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
    via_gh   boolean := (app ->> 'provider') = 'github';
    fallback text := 'raider-' || left(new.id::text, 8);
    login    text := case when via_gh then coalesce(nullif(meta ->> 'user_name', ''), nullif(meta ->> 'preferred_username', ''), fallback) else fallback end;
    gh_id    bigint := case when via_gh and (meta ->> 'provider_id') ~ '^[0-9]+$' then (meta ->> 'provider_id')::bigint end;
    shown    text := left(case when via_gh then coalesce(nullif(meta ->> 'full_name', ''), nullif(meta ->> 'name', ''), login) else 'Raider' end, 40);
begin
    begin
        insert into public.profiles (id, github_login, github_id, display_name)
        values (new.id, login, gh_id, shown)
        on conflict (id) do nothing;
    exception when unique_violation then
        -- Login or GitHub id already taken: keep sign-up working, but without a GitHub identity.
        insert into public.profiles (id, github_login, github_id, display_name)
        values (new.id, login || '-' || left(new.id::text, 4), null, shown)
        on conflict (id) do nothing;
    end;
    return new;
end;
$$;
