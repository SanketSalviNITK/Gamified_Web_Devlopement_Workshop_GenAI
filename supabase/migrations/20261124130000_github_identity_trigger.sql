-- Fill in a profile's GitHub identity from auth.identities.
--
-- Supabase Auth writes one auth.identities row per linked login method, with the provider's
-- own answer in provider_id / identity_data (users cannot edit it). Taking the GitHub login
-- and numeric id from there works no matter in which order Supabase writes auth.users and
-- its app metadata, and an email sign-up never gets a GitHub identity row.
-- handle_new_user (previous migrations) still creates the profile; this only upgrades it.

create or replace function public.handle_new_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    data  jsonb := coalesce(new.identity_data, '{}'::jsonb);
    gh_id bigint := case when new.provider_id ~ '^[0-9]+$' then new.provider_id::bigint end;
    login text := coalesce(nullif(data ->> 'user_name', ''), nullif(data ->> 'preferred_username', ''));
    shown text := left(coalesce(nullif(data ->> 'full_name', ''), nullif(data ->> 'name', ''), login), 40);
begin
    if new.provider <> 'github' or gh_id is null or login is null then
        return new;
    end if;
    -- The same GitHub account is already linked to another profile: leave this one unlinked.
    if exists (select 1 from public.profiles where github_id = gh_id and id <> new.user_id) then
        return new;
    end if;
    begin
        update public.profiles
           set github_login = login,
               github_id = gh_id,
               display_name = case when display_name in ('Raider') or display_name like 'raider-%' then shown else display_name end
         where id = new.user_id and github_id is null;
    exception when unique_violation then
        -- Login taken by a renamed old account: keep the id (what verification uses), suffix the login.
        update public.profiles
           set github_login = login || '-' || left(new.user_id::text, 4),
               github_id = gh_id,
               display_name = case when display_name in ('Raider') or display_name like 'raider-%' then shown else display_name end
         where id = new.user_id and github_id is null;
    end;
    return new;
end;
$$;

drop trigger if exists on_auth_identity_created on auth.identities;
create trigger on_auth_identity_created
    after insert on auth.identities
    for each row execute function public.handle_new_identity();
