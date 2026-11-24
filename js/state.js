// Shared State Engine for the Gamified Web Dev Workshop.
//
// Two modes:
//   database (normal)  Progress lives in Supabase tables. Students sign in with GitHub and only
//                      the verify-quest function can mark a quest as passed. Browsers read the
//                      public roster (raid_roster) and get live updates through Supabase Realtime.
//   legacy (fallback)  Used only until the database migration has been applied: the original
//                      localStorage + broadcast model, where any browser could change progress.
//
// Pages read progress with WorkshopState.get() and listen for the 'workshopStateChanged' event.
// Await WorkshopState.ready before the first read if you need the loaded roster.
const STORAGE_KEY = 'gamified_workshop_state';

// Supabase project (the publishable key is meant to be public; the tables' row level security protects the data)
const SUPABASE_URL = 'https://mfebtydemixnpstekrij.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sDuyNE11RgAuegqxWqOPow_YchE0f2c';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
let realtimeChannel = null;

const QUESTS = [
    { id: 1, name: 'Boot Mainframe (Git/GitHub)', xp: 100, state: 'state-git' },
    { id: 2, name: 'Identity Shell (Portfolio)', xp: 200, state: 'state-portfolio' },
    { id: 3, name: 'Holo projection (3D Web)', xp: 300, state: 'state-3dweb' },
    { id: 4, name: 'Chassis Sync (3D Avatar)', xp: 400, state: 'state-avatar' },
    { id: 5, name: 'Consciousness (AI Chatbot)', xp: 500, state: 'state-mindsynced' }
];

// Which cohort this page shows: ?cohort=spring-2027, otherwise the default "workshop" cohort.
const COHORT = (() => {
    const c = new URLSearchParams(location.search).get('cohort');
    return c && /^[a-z0-9-]{3,40}$/.test(c) ? c : 'workshop';
})();

const xpForQuests = (n) => QUESTS.filter((q) => q.id <= n).reduce((sum, q) => sum + q.xp, 0);

const DEFAULT_PARTICIPANTS = [];

class WorkshopState {
    static mode = 'loading';
    static cohort = COHORT;
    static client = supabaseClient;
    static cache = { participants: [] };
    static ready = null;

    // ------------------------------------------------------------------ startup
    static async init() {
        if (!supabaseClient) return this.useLegacy('Supabase library not loaded');
        try {
            await this.refresh();
        } catch (err) {
            // Fall back only when the schema is missing (migration not applied yet).
            const missing = ['PGRST202', '42883', '42P01'].includes(err?.code) || /raid_roster|schema cache/i.test(err?.message || '');
            if (missing) return this.useLegacy('database migration not applied yet');
            console.error('[WorkshopState] Could not load the roster, retrying:', err?.message || err);
        }
        this.mode = 'database';
        this.subscribeDatabase();
        setInterval(() => this.refresh().catch(() => {}), 20000); // safety net if a realtime event is missed
    }

    static async refresh() {
        const { data, error } = await supabaseClient.rpc('raid_roster', { p_cohort: COHORT });
        if (error) throw error;
        this.cache = { participants: (data || []).map(toParticipant) };
        window.dispatchEvent(new Event('workshopStateChanged'));
    }

    static subscribeDatabase() {
        let timer = null;
        const soon = () => { clearTimeout(timer); timer = setTimeout(() => this.refresh().catch(() => {}), 300); };
        supabaseClient
            .channel(`raid-db-${COHORT}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'quest_passes' }, soon)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, soon)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, soon)
            .subscribe();
    }

    static get() {
        return this.mode === 'legacy' ? this.legacyGet() : this.cache;
    }

    // Writes only exist in legacy mode. In database mode progress changes only through verified
    // submissions (participant.html -> verify-quest), so these refuse instead of faking it.
    static refuse(action) {
        const message = `${action} is disabled: progress is verified on the server from students' GitHub repositories.`;
        console.warn('[WorkshopState]', message);
        return { error: message };
    }

    static addParticipant(username, displayName) {
        return this.mode === 'legacy' ? this.legacyAddParticipant(username, displayName) : this.refuse('Adding participants by hand');
    }

    static submitQuest(username, questId, repoUrl, tool, promptText) {
        return this.mode === 'legacy' ? this.legacySubmitQuest(username, questId, repoUrl, tool, promptText) : this.refuse('Submitting quests without verification');
    }

    static reset() {
        return this.mode === 'legacy' ? this.legacySave({ participants: DEFAULT_PARTICIPANTS }) : this.refuse('Resetting progress from the browser');
    }

    static save(state) {
        return this.mode === 'legacy' ? this.legacySave(state) : this.refuse('Saving state from the browser');
    }

    // ------------------------------------------------------------------ legacy mode (pre-migration)
    static useLegacy(reason) {
        console.warn(`[WorkshopState] Legacy mode (${reason}). Progress is NOT verified. Apply supabase/migrations to enable verified progress.`);
        this.mode = 'legacy';
        window.dispatchEvent(new Event('workshopStateChanged'));
        if (!supabaseClient) return;
        realtimeChannel = supabaseClient.channel('workshop-raid-state', { config: { broadcast: { ack: false } } });
        realtimeChannel.on('broadcast', { event: 'state_sync' }, (payload) => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.payload));
            window.dispatchEvent(new Event('workshopStateChanged'));
        });
        realtimeChannel.on('broadcast', { event: 'request_state' }, () => {
            const state = this.legacyGet();
            if (state && state.participants && state.participants.length > 0) this.broadcastFullState(state);
        });
        realtimeChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') realtimeChannel.send({ type: 'broadcast', event: 'request_state', payload: {} });
        });
    }

    static broadcastFullState(state) {
        if (realtimeChannel) realtimeChannel.send({ type: 'broadcast', event: 'state_sync', payload: state });
    }

    static legacyGet() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            const initialState = { participants: DEFAULT_PARTICIPANTS };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
            return initialState;
        }
        return JSON.parse(data);
    }

    static legacySave(state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        window.dispatchEvent(new Event('workshopStateChanged'));
        this.broadcastFullState(state);
    }

    static generateBotName(username) {
        const firstLetter = username.charAt(0).toUpperCase();
        const letters = 'XYZKTW';
        const randomChar = letters.charAt(Math.floor(Math.random() * letters.length));
        const num = Math.floor(Math.random() * 900) + 100;
        return `${firstLetter}${randomChar}-${num}`;
    }

    static legacyAddParticipant(username, displayName) {
        const state = this.legacyGet();
        if (state.participants.find((p) => p.username.toLowerCase() === username.toLowerCase())) {
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
        this.legacySave(state);
        return { success: true, participant: newParticipant };
    }

    static legacySubmitQuest(username, questId, repoUrl, tool, promptText) {
        const state = this.legacyGet();
        const participant = state.participants.find((p) => p.username.toLowerCase() === username.toLowerCase());
        if (!participant) return { error: 'Participant not found.' };
        questId = parseInt(questId);
        const quest = QUESTS.find((q) => q.id === questId);
        if (!quest) return { error: 'Invalid Quest.' };
        participant.submissions[questId] = { url: repoUrl, tool, prompt: promptText, timestamp: new Date().toISOString() };
        if (participant.currentQuest < questId) {
            participant.currentQuest = questId;
            participant.xp = xpForQuests(questId);
        }
        this.legacySave(state);
        return { success: true, participant };
    }
}

// Database roster row -> the participant shape the projector pages already understand.
function toParticipant(row) {
    const passes = row.passes || {};
    return {
        id: row.user_id,
        username: row.github_login,
        displayName: row.display_name,
        botName: `${row.github_login.charAt(0).toUpperCase()}X-${String(row.github_login.length * 97 % 900 + 100)}`,
        currentQuest: row.quests_passed,
        xp: xpForQuests(row.quests_passed),
        cls: row.bot_class,
        themeColor: row.theme_color,
        joinedAt: row.joined_at,
        verified: true,
        submissions: Object.fromEntries(Object.entries(passes).map(([quest, p]) => [quest, {
            url: `https://github.com/${p.repo}`,
            commit: p.commit,
            timestamp: p.at,
        }])),
    };
}

WorkshopState.ready = WorkshopState.init();
