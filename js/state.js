// Shared State Engine for the Gamified Web Dev Workshop (Supabase Multiplayer Edition)
const STORAGE_KEY = 'gamified_workshop_state';

// Supabase Credentials
const SUPABASE_URL = 'https://mfebtydemixnpstekrij.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sDuyNE11RgAuegqxWqOPow_YchE0f2c';

// Initialize Supabase Client (if CDN script is loaded)
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
let realtimeChannel = null;

// Predefined Quests matching the Cybernetic Assembly Lab Sequence
const QUESTS = [
    { id: 1, name: 'Boot Mainframe (Git/GitHub)', xp: 100, state: 'state-git' },
    { id: 2, name: 'Identity Shell (Portfolio)', xp: 200, state: 'state-portfolio' },
    { id: 3, name: 'Holo projection (3D Web)', xp: 300, state: 'state-3dweb' },
    { id: 4, name: 'Chassis Sync (3D Avatar)', xp: 400, state: 'state-avatar' },
    { id: 5, name: 'Consciousness (AI Chatbot)', xp: 500, state: 'state-mindsynced' }
];

// Initial mock participants with unique Bot Designations
const DEFAULT_PARTICIPANTS = [];

class WorkshopState {
    static initRealtime() {
        if (!supabaseClient) {
            console.warn("Supabase CDN not loaded. Falling back to LocalStorage only.");
            return;
        }

        // Initialize a broadcast channel for ephemeral state syncing
        realtimeChannel = supabaseClient.channel('workshop-raid-state', {
            config: {
                broadcast: { ack: false },
            },
        });

        // Listen for state sync broadcasts from other users
        realtimeChannel.on('broadcast', { event: 'state_sync' }, payload => {
            console.log('📡 [Supabase] Received global state sync over network');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.payload));
            window.dispatchEvent(new Event('workshopStateChanged'));
        });

        // Listen for state requests from new users who just joined
        realtimeChannel.on('broadcast', { event: 'request_state' }, () => {
            console.log('📡 [Supabase] Network peer requested state, broadcasting...');
            const state = this.get();
            if (state && state.participants && state.participants.length > 0) {
                this.broadcastFullState(state);
            }
        });

        // Connect to the channel
        realtimeChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('🚀 Connected to Supabase Realtime Network!');
                
                // Immediately request the latest state from any active admin/users
                realtimeChannel.send({
                    type: 'broadcast',
                    event: 'request_state',
                    payload: {}
                });
            }
        });
    }

    static broadcastFullState(state) {
        if (realtimeChannel) {
            realtimeChannel.send({
                type: 'broadcast',
                event: 'state_sync',
                payload: state
            });
        }
    }

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
        // Broadcast change over network instantly!
        this.broadcastFullState(state);
    }

    static generateBotName(username) {
        const firstLetter = username.charAt(0).toUpperCase();
        const letters = 'XYZKTW';
        const randomChar = letters.charAt(Math.floor(Math.random() * letters.length));
        const num = Math.floor(Math.random() * 900) + 100;
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

        participant.submissions[questId] = {
            url: repoUrl,
            tool: tool,
            prompt: promptText,
            timestamp: new Date().toISOString()
        };

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
        this.save(initialState);
    }
}

// Auto-initialize real-time multiplayer connection when the file loads
setTimeout(() => {
    WorkshopState.initRealtime();
}, 200);
