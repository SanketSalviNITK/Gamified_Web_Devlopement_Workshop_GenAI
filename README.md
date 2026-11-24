# 🎮 Gamified Web Development Workshop (GenAI)

![Cybernetic Aesthetic Banner](https://img.shields.io/badge/UI-Glassmorphism-06b6d4?style=for-the-badge) ![State Sync](https://img.shields.io/badge/Sync-Supabase_Realtime-22c55e?style=for-the-badge) ![Deployment](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge)

Welcome to the **Gamified Web Development Workshop**, an interactive, multiplayer, cyber-themed educational experience. This platform teaches students web development (HTML, CSS, JS, and Three.js) by having them use Generative AI tools (ChatGPT, Gemini, Claude) as their "coding assistants."

**Live workshop:** [sanketsalvinitk.github.io/Gamified_Web_Devlopement_Workshop_GenAI](https://sanketsalvinitk.github.io/Gamified_Web_Devlopement_Workshop_GenAI/) (hosted on GitHub Pages)

---

## 🌟 Key Features

* **Verified progress**: Students sign in with GitHub. A Supabase Edge Function checks each submission against the student's real repository (ownership, new commits, and the code each quest requires) before it counts. Progress is stored in Supabase tables with row level security and pushed live to every screen. See [docs/SETUP_VERIFIED_PROGRESS.md](docs/SETUP_VERIFIED_PROGRESS.md).
* **3D Admin Dashboard (`admin.html`)**: A stunning Three.js projector view for instructors. It dynamically renders a physical "robot capsule" for every connected participant, evolving visually as they complete quests.
* **Participant Deck (`participant.html`)**: A personal control panel where students receive missions, track their XP, and submit their GitHub repository links.
* **Quest verifier**: Shows students exactly what will be checked, then reports each check with a hint for anything missing.
* **In-Game Mission Intel**: Instructions and GenAI "Meta-Prompts" are fetched dynamically from markdown files and rendered in the browser using `marked.js`.

---

## 🗺️ The Missions (Quests)

The workshop is divided into 5 progressive levels, taking students from zero coding knowledge to having a fully functional, 3D-integrated chatbot portfolio.

1. **Boot Mainframe (Git/GitHub)**: Initialize a local repository and push a foundational `README.md` to GitHub.
2. **Identity Shell (Portfolio)**: Prompt an AI to build a beautiful, responsive, glassmorphism-themed portfolio using pure HTML/CSS.
3. **Holo Projection (3D Web)**: Inject a Three.js canvas as a fixed background rendering a glowing 3D primitive.
4. **Chassis Sync (3D Avatar)**: Upgrade the Three.js scene to dynamically load a `.glb` external 3D model (like a Ready Player Me avatar) using the `GLTFLoader`.
5. **Consciousness (AI Chatbot)**: Implement a custom JavaScript-based chatbot interface pinned to the screen that answers user queries via regex mapping.

---

## 🚀 Setup & Installation

If you want to fork and run your own version of this workshop:

### 1. Clone the Repository
```bash
git clone https://github.com/SanketSalviNITK/Gamified_Web_Devlopement_Workshop_GenAI.git
cd Gamified_Web_Devlopement_Workshop_GenAI
```

### 2. Configure Supabase
This project uses Supabase for GitHub sign-in, the progress database, the `verify-quest` function and realtime updates.
Follow **[docs/SETUP_VERIFIED_PROGRESS.md](docs/SETUP_VERIFIED_PROGRESS.md)**: run one SQL migration, enable GitHub sign-in, and deploy the function.
To use your own Supabase project, replace the URL and publishable key in `js/state.js`:
```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR_PUBLISHABLE_KEY';
```
Until the migration has been applied, the pages fall back to the original unverified mode.

### 3. Publish on GitHub Pages
The site is plain static files, so GitHub Pages serves it as-is:
1. In the repository go to **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
2. Keep the empty `.nojekyll` file in the root: it stops GitHub Pages from skipping folders that start with `_` (the verifier's shared rules live in `supabase/functions/_shared/`).
3. Add the site address to Supabase's allowed redirect URLs (see the setup guide) so GitHub sign-in returns students to it.

---

## 🕹️ How to Play (Workshop Flow)

1. **Instructor**: Opens `admin.html` on a projector or shared screen. This is the global scoreboard and 3D visualization arena.
2. **Participants**: Open `participant.html` on their local laptops.
3. Participants sign in with GitHub. Their bot instantly materializes on the instructor's projector.
4. Participants click **"View Intel"** on their active quest to get the Meta-Prompt.
5. They feed the Meta-Prompt to an AI (like ChatGPT), get the code, and apply it to their local codebase.
6. They push their code to their GitHub repo.
7. They submit their GitHub Repo URL in the Participant Deck. The **quest verifier** checks the repository on GitHub.
8. If successful, they earn XP, their capsule upgrades on the projector, and the next mission unlocks!

---

## 🛡️ Instructor Notes
* The actual prompt instructions are stored in the `Walkthrough/` folder as `.md` files.
* An `Instructor_Prompts/` folder contains pre-filled, test-ready prompts for live demonstrations. This folder is in `.gitignore` so students cannot access the answers via the repository!

---

## ⚔️ Glitch Arena (new projector view)

`arena.html` is a redesigned projector view, built entirely with Three.js: every bot, the boss, the arena and all effects are procedural, with no external 3D models. It runs alongside the original `admin.html`.

**Live by default.** The arena reads the same shared state as `participant.html` and `admin.html` (`js/state.js`). With verified progress set up it shows **● LIVE · VERIFIED** and every hit is a quest the server checked on GitHub; add `?cohort=<code>` to show a specific cohort.
* Every registered participant becomes a bot, starting in a stasis pod.
* Every quest they pass is a critical hit that bolts on the next part. The banner and feed name the student, the module and the submitted repository.
* Boss health is the cohort's real progress: 100% minus quests passed out of 5 per participant (the same formula as `admin.html`). A new participant joining makes the boss stronger.
* When every participant has passed all five quests, the boss is defeated.
* Students choose their bot's class and chassis colour on the participant page; the bot rebuilds live on the projector.

**Features**
* **Bots that assemble part by part:** Stasis Pod → Power Core (M1) → Chassis in the student's colour (M2) → Holo Wings (M3) → Avatar Head (M4) → Voice Core (M5). Proportions, eyes and antenna come from the username, and the class (Architect, Engineer, Promptsmith) adds drones, a cannon arm or orbiting glyphs.
* **The Glitch Overlord:** armour plates break off as its health falls (and grow back if new raiders make it stronger), it reacts to hits, taunts the room, and shatters to free ARIA when defeated.
* **An evil laugh that fades with its health:** a synthesised robotic "MWAHAHAHA" with a booming echo at full health, shorter and stuttering by half health, a weak "heh… heh?" near the end, and a final broken laugh on defeat. The boss throws its head back and shakes as it laughs.
* **Raid presentation:** camera swoops to the bot that lands a critical hit, phase breaks, cohort combos, a floor that heals from corrupted pink to cyan, bloom and glitch effects, and a victory screen with honours.
* Sound is off until you press **M** or the speaker button (browsers block autoplay).

**Try it** (`node server.js`, then):
* `http://localhost:3000/arena.html` is the live raid. Register and submit quests in `participant.html` (another tab works for local testing). Press `H` for instructor shortcuts.
* `arena.html?demo=1` runs a simulated 24-student raid for rehearsals, with extra mechanics that need course features not built yet: quiz-breakable shields, rage mode, ambush quizzes.
* `arena.html?view=lineup` shows one bot at every stage side by side (`C` changes class, `K` changes colour).
* `arena-control.html` is a game-master remote (taunt, shockwave, re-sync; all actions in demo mode). It talks to the arena over `BroadcastChannel`, so it must be open in the same browser.
* Options: `?n=40` and `?speed=2` (demo only), `?motion=reduced` (no camera swoops, shake or heavy glitching; also follows the OS reduced-motion setting).
