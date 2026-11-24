# Setting up verified progress

Verified progress replaces the old "anyone can broadcast the whole state" model:

* Students **sign in with GitHub**, so the workshop knows which GitHub account they own.
* Quests are marked as passed only by the **`verify-quest` Edge Function**. It downloads the student's repository from GitHub, checks that they own it, that it has new commits since their last quest, and that the code contains what the quest asks for.
* Progress lives in **database tables** protected by row level security. Browsers can read the public roster (names, bot looks, passed quests with repo and commit) but cannot write a pass, edit someone else's profile, or read anyone else's prompts.
* The projector (`arena.html`, `admin.html`) updates live through Supabase Realtime.

Until step 1 is done, every page keeps working in the old unverified mode (the arena shows **● LIVE** instead of **● LIVE · VERIFIED**).

You need: access to the Supabase project, a GitHub account to own the OAuth app, and the [Supabase CLI](https://supabase.com/docs/guides/cli) for step 3.

## 1. Create the tables

In the Supabase dashboard open **SQL Editor**, paste the contents of
[`supabase/migrations/20261124000000_verified_raid.sql`](../supabase/migrations/20261124000000_verified_raid.sql) and run it.
It is safe to run again. It creates:

| Table | What it holds | Who can read | Who can write |
|---|---|---|---|
| `profiles` | GitHub login and id, display name, bot class and colour | everyone | the student (name, class, colour only) |
| `cohorts` | workshop runs, e.g. `workshop`, `spring-2027` | everyone | instructors |
| `enrollments` | who joined which cohort | everyone | the student (join/leave open cohorts) |
| `submissions` | every verification attempt, its checks, AI tool and prompt | the student and instructors | `verify-quest` only |
| `quest_passes` | verified passes with repo and commit | everyone | `verify-quest` only |

It also creates the default cohort `workshop`, the `raid_roster()` function the projector reads, and turns on Realtime for the three public tables.

## 2. Turn on "Sign in with GitHub"

1. On GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
   * Homepage URL: your site, e.g. `https://sanketsalvinitk.github.io/Gamified_Web_Devlopement_Workshop_GenAI/`
   * Authorization callback URL: `https://mfebtydemixnpstekrij.supabase.co/auth/v1/callback`
   * Create it, then **Generate a new client secret**.
2. In Supabase: **Authentication → Sign In / Providers → GitHub**: enable it and paste the client ID and secret.
3. In Supabase: **Authentication → URL Configuration**:
   * Site URL: your site URL.
   * Redirect URLs: add `https://sanketsalvinitk.github.io/Gamified_Web_Devlopement_Workshop_GenAI/**` and, for local testing, `http://localhost:3000/**`.

GitHub shares the student's username, name and email address with the project. Nothing is posted to their account.

## 3. Deploy the verifier

```bash
supabase login
```

```bash
supabase functions deploy verify-quest --project-ref mfebtydemixnpstekrij --use-api
```

(`--use-api` bundles the function on Supabase's side, so Docker is not needed. If the CLI asks for a project config, run `supabase init` in the repository root first; it keeps the existing `supabase/` folders.)

Then give it a GitHub token, so verification isn't limited to GitHub's 60 anonymous requests per hour (shared by everyone). Create a **fine-grained personal access token** with *Public repositories (read-only)* access and no other permissions, and store it as a function secret:

```bash
supabase secrets set GITHUB_TOKEN=<your-token> --project-ref mfebtydemixnpstekrij
```

Each verification makes about 3 GitHub API calls; file contents are downloaded from `raw.githubusercontent.com`, which doesn't count towards the limit. With a token the limit is 5,000 API calls per hour.

## 4. Make yourself an instructor

Sign in once on `participant.html` with your GitHub account, then run in the SQL editor:

```sql
update public.profiles set is_instructor = true where github_login = 'YourGitHubLogin';
```

Instructors can read every student's submissions (including prompts), manage cohorts, and are left off the raid roster.

## 5. Run a workshop

* Everyone uses the default cohort `workshop` unless you create another:

  ```sql
  insert into public.cohorts (code, title) values ('spring-2027', 'Spring 2027 workshop');
  ```

  Then share `participant.html?cohort=spring-2027` with students and open `arena.html?cohort=spring-2027` on the projector. The arena's join card shows the right link.
* Close a cohort to new students: `update public.cohorts set is_open = false where code = 'spring-2027';`
* Students keep their passes across cohorts (passes belong to the student, not the cohort).

## What the verifier checks

Every quest: the repository is public, it belongs to the signed-in student (matched by GitHub account id, so renamed accounts still work), and its latest commit is newer than the student's enrolment (quest 1) or previous quest pass (quests 2-5), with 10 minutes' grace.

| Quest | Checks |
|---|---|
| 1 Git & GitHub | README.md with at least a sentence of description |
| 2 Portfolio | index.html; About, Projects and Skills sections; 8+ hand-written CSS rules; no CSS framework loaded; `backdrop-filter: blur`; viewport meta tag plus flex, grid or `@media` |
| 3 3D Web | Three.js loaded; Scene, camera and WebGLRenderer; a mesh from a geometry; animation loop that changes rotation; canvas `position: fixed` |
| 4 3D Avatar | GLTFLoader `load(...)`; the `.glb`/`.gltf` path exists in the repo (case-sensitive) or is a URL; model rotates on Y |
| 5 Chatbot | chat window with an input; script reads `.value` and writes to the page; 3+ regex patterns; `position: fixed` with bottom and right; auto-scroll |

The rules live in [`supabase/functions/_shared/checks.js`](../supabase/functions/_shared/checks.js). `participant.html` imports the same file to show students what will be checked before they submit.

**Limits to know about:** the checks read the code, they don't open the site in a browser, so code that contains the right pieces but doesn't work will still pass. A student can also fork someone else's finished repository and push one commit. Opening the deployed site in a headless browser (for example from a GitHub Actions workflow) would close both gaps and is the natural next step.

## Tests

```bash
node --test tests/*.test.mjs
```

```bash
PGHOST=localhost PGUSER=postgres tests/db/run.sh
```

The first runs the verifier against sample repositories served by a fake GitHub. The second applies the migration to a scratch database (with a small stand-in for Supabase's `auth` schema) and checks 36 security and behaviour rules: who can read and write what, quest order, and re-verification. Both also run in GitHub Actions on every push.
