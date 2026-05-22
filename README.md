# 🎮 Gamified Web Development Workshop (GenAI)

![Cybernetic Aesthetic Banner](https://img.shields.io/badge/UI-Glassmorphism-06b6d4?style=for-the-badge) ![State Sync](https://img.shields.io/badge/Sync-Supabase_Realtime-22c55e?style=for-the-badge) ![Deployment](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge)

Welcome to the **Gamified Web Development Workshop**, an interactive, multiplayer, cyber-themed educational experience. This platform teaches students web development (HTML, CSS, JS, and Three.js) by having them use Generative AI tools (ChatGPT, Gemini, Claude) as their "coding assistants."

**Live Demo / Participant Link:** [Play on Vercel](https://gamified-web-devlopement-workshop-genai.vercel.app/) *(Update this link if your Vercel deployment URL differs)*

---

## 🌟 Key Features

* **Real-time Multiplayer Sync**: Uses **Supabase Realtime Channels** to synchronize participant progress instantly across all devices. No backend server required.
* **3D Admin Dashboard (`admin.html`)**: A stunning Three.js projector view for instructors. It dynamically renders a physical "robot capsule" for every connected participant, evolving visually as they complete quests.
* **Participant Deck (`participant.html`)**: A personal control panel where students receive missions, track their XP, and submit their GitHub repository links.
* **AI Evaluator**: An automated validation engine that fetches the participant's submitted GitHub repository via the GitHub API and "evaluates" if they successfully completed the required code changes for the mission.
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
This project relies on Supabase for real-time WebSocket communication.
1. Create a free project on [Supabase](https://supabase.com).
2. You do **not** need to set up a database schema. The app uses *Supabase Realtime Broadcast Channels* which are stateless.
3. In your Supabase dashboard, go to your project settings -> API.
4. Open `js/state.js` and replace the Supabase URL and Anon Key with your own:
```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### 3. Deploy to Vercel
This project contains a `vercel.json` file for routing and security headers. 
1. Push your repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Vercel will automatically detect the static files and deploy them.

---

## 🕹️ How to Play (Workshop Flow)

1. **Instructor**: Opens `admin.html` on a projector or shared screen. This is the global scoreboard and 3D visualization arena.
2. **Participants**: Open `participant.html` on their local laptops.
3. Participants enter their GitHub username to register. Their "capsule" instantly materializes on the instructor's projector.
4. Participants click **"View Intel"** on their active quest to get the Meta-Prompt.
5. They feed the Meta-Prompt to an AI (like ChatGPT), get the code, and apply it to their local codebase.
6. They push their code to their GitHub repo.
7. They submit their GitHub Repo URL in the Participant Deck. The automated **AI Evaluator** validates their repo.
8. If successful, they earn XP, their capsule upgrades on the projector, and the next mission unlocks!

---

## 🛡️ Instructor Notes
* The actual prompt instructions are stored in the `Walkthrough/` folder as `.md` files.
* An `Instructor_Prompts/` folder contains pre-filled, test-ready prompts for live demonstrations. This folder is in `.gitignore` so students cannot access the answers via the repository!
