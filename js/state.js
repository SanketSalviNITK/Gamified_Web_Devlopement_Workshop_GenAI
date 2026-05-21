// Shared State Engine for the Gamified Web Dev Workshop (Raid Edition)
const STORAGE_KEY = 'gamified_workshop_state';

// Predefined Quests matching the Cybernetic Assembly Lab Sequence
const QUESTS = [
    { id: 1, name: 'Boot Mainframe (Git/GitHub)', xp: 100, state: 'state-git' },
    { id: 2, name: 'Identity Shell (Portfolio)', xp: 200, state: 'state-portfolio' },
    { id: 3, name: 'Holo projection (3D Web)', xp: 300, state: 'state-3dweb' },
    { id: 4, name: 'Chassis Sync (3D Avatar)', xp: 400, state: 'state-avatar' },
    { id: 5, name: 'Consciousness (AI Chatbot)', xp: 500, state: 'state-mindsynced' }
];

// Initial mock participants with unique Bot Designations
const DEFAULT_PARTICIPANTS = [
    {
        username: 'AnyaDev',
        displayName: 'Anya Sen',
        botName: 'A-808', // Custom designation
        currentQuest: 5,
        xp: 1500,
        submissions: {
            1: { url: 'https://github.com/anyadev/forge-boot', tool: 'Gemini', prompt: 'Create a detailed readme detailing git workflows with an interactive ASCII guide.' },
            2: { url: 'https://github.com/anyadev/glass-portfolio', tool: 'ChatGPT', prompt: 'Generate a glassmorphic personal profile card with pure CSS neon gradients.' },
            3: { url: 'https://github.com/anyadev/threejs-scene', tool: 'Claude', prompt: 'Set up an elegant Three.js scene with a spinning coordinate grid and directional orbital lighting.' },
            4: { url: 'https://github.com/anyadev/avatar-readyplayer', tool: 'Gemini', prompt: 'Load a GLB ReadyPlayerMe avatar into Three.js and bind it to basic cursor-follow triggers.' },
            5: { url: 'https://github.com/anyadev/bot-awakened', tool: 'ChatGPT', prompt: 'Write a smalltalk client-side script with regex matches and Web Speech API speaking synthesizers.' }
        }
    },
    {
        username: 'NikhilCode',
        displayName: 'Nikhil R.',
        botName: 'N-404',
        currentQuest: 3,
        xp: 600,
        submissions: {
            1: { url: 'https://github.com/nikhilc/forge-boot', tool: 'Claude', prompt: 'Give me a shell script for quick git commits and branch initializations.' },
            2: { url: 'https://github.com/nikhilc/glass-portfolio', tool: 'Gemini', prompt: 'Build a dark cyber-themed portfolio with multiple section scrolling tabs and animated links.' },
            3: { url: 'https://github.com/nikhilc/threejs-scene', tool: 'ChatGPT', prompt: 'Write a simple model-viewer page to load and auto-rotate a 3D robot model.' }
        }
    },
    {
        username: 'PriyaTech',
        displayName: 'Priya Patel',
        botName: 'P-707',
        currentQuest: 2,
        xp: 300,
        submissions: {
            1: { url: 'https://github.com/priyatech/forge-boot', tool: 'ChatGPT', prompt: 'Explain git init, clone, add, commit, and push in a clean, simple markdown format.' },
            2: { url: 'https://github.com/priyatech/glass-portfolio', tool: 'Claude', prompt: 'Create a premium responsive glassmorphic personal website template for a designer.' }
        }
    },
    {
        username: 'VikramAI',
        displayName: 'Vikram S.',
        botName: 'V-303',
        currentQuest: 1,
        xp: 100,
        submissions: {
            1: { url: 'https://github.com/vikramai/forge-boot', tool: 'Gemini', prompt: 'Guide me step by step on pushing an existing directory to a new github repository.' }
        }
    }
];

class WorkshopState {
    static get() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            const initialState = { participants: DEFAULT_PARTICIPANTS };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
            return initialState;
        }
        return JSON.parse(data);
    }

    static save(state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        window.dispatchEvent(new Event('workshopStateChanged'));
    }

    static generateBotName(username) {
        const firstLetter = username.charAt(0).toUpperCase();
        // Dynamic alphanumeric designation, e.g. S-909 or K-202
        const letters = 'XYZKTW';
        const randomChar = letters.charAt(Math.floor(Math.random() * letters.length));
        const num = Math.floor(Math.random() * 900) + 100; // 100 - 999
        return `${firstLetter}${randomChar}-${num}`;
    }

    static addParticipant(username, displayName) {
        const state = this.get();
        if (state.participants.find(p => p.username.toLowerCase() === username.toLowerCase())) {
            return { error: 'Username already registered.' };
        }
        
        const cleanUsername = username.replace(/[^a-zA-Z0-9_-]/g, '');
        const newParticipant = {
            username: cleanUsername,
            displayName: displayName || username,
            botName: this.generateBotName(cleanUsername),
            currentQuest: 0,
            xp: 0,
            submissions: {}
        };
        state.participants.push(newParticipant);
        this.save(state);
        return { success: true, participant: newParticipant };
    }

    static submitQuest(username, questId, repoUrl, tool, promptText) {
        const state = this.get();
        const participant = state.participants.find(p => p.username.toLowerCase() === username.toLowerCase());
        if (!participant) return { error: 'Participant not found.' };

        questId = parseInt(questId);
        const quest = QUESTS.find(q => q.id === questId);
        if (!quest) return { error: 'Invalid Quest.' };

        // Save submission details
        participant.submissions[questId] = {
            url: repoUrl,
            tool: tool,
            prompt: promptText,
            timestamp: new Date().toISOString()
        };

        // Advance quest tier if higher than current
        if (participant.currentQuest < questId) {
            participant.currentQuest = questId;
            let totalXp = 0;
            for (let i = 1; i <= questId; i++) {
                totalXp += QUESTS.find(q => q.id === i).xp;
            }
            participant.xp = totalXp;
        }

        this.save(state);
        return { success: true, participant: participant };
    }

    static reset() {
        const initialState = { participants: DEFAULT_PARTICIPANTS };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
        window.dispatchEvent(new Event('workshopStateChanged'));
    }
}
