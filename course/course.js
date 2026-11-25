// Course outline: the single list of modules and lessons.
// Used by learn.html (syllabus and lesson player), the arena (how much learning exists, for boss
// health) and tools/build-course-seed.mjs (which lessons the database counts).
//
// A module with `ready: true` has its lesson content in course/modules/<id>.js and a quiz bank in
// supabase/seed/quizzes/<id>.json. Other modules show their planned lessons and their lab.

export const QUIZ = { draw: 8, passMark: 0.7 };

export const MODULES = [
    {
        id: 'm1',
        quest: 1,
        title: 'Git & GitHub',
        codename: 'Boot Mainframe',
        summary: 'Save every version of your work, publish it on GitHub, and learn to direct your AI co-pilot.',
        ready: true,
        lessons: [
            { id: 'm1.1', title: 'Why version control?', minutes: 4 },
            { id: 'm1.2', title: 'The three areas of Git', minutes: 6 },
            { id: 'm1.3', title: 'Commits that tell a story', minutes: 4 },
            { id: 'm1.4', title: 'GitHub: your code in the cloud', minutes: 5 },
            { id: 'm1.5', title: 'README in Markdown', minutes: 5 },
            { id: 'm1.6', title: 'Prompting your AI co-pilot', minutes: 6 },
        ],
    },
    {
        id: 'm2',
        quest: 2,
        title: 'Portfolio with HTML & CSS',
        codename: 'Identity Shell',
        summary: 'Structure a page with HTML, style it with your own CSS, and make it look great on any screen.',
        ready: true,
        lessons: [
            { id: 'm2.1', title: 'How a web page is built', minutes: 5 },
            { id: 'm2.2', title: 'Semantic sections', minutes: 5 },
            { id: 'm2.3', title: 'The box model', minutes: 6 },
            { id: 'm2.4', title: 'Flexbox and grid', minutes: 7 },
            { id: 'm2.5', title: 'Glassmorphism', minutes: 5 },
            { id: 'm2.6', title: 'Responsive design', minutes: 7 },
        ],
    },
    {
        id: 'm3',
        quest: 3,
        title: '3D on the web',
        codename: 'Holo Projection',
        summary: 'Render and animate a 3D scene behind your portfolio with Three.js.',
        ready: false,
        lessons: [
            { id: 'm3.1', title: 'Scene, camera, renderer' },
            { id: 'm3.2', title: 'Meshes: geometry + material' },
            { id: 'm3.3', title: 'Light and colour' },
            { id: 'm3.4', title: 'The animation loop' },
            { id: 'm3.5', title: 'A canvas behind your page' },
        ],
    },
    {
        id: 'm4',
        quest: 4,
        title: 'Your 3D avatar',
        codename: 'Chassis Sync',
        summary: 'Load a .glb model into your scene, place it, scale it and bring it to life.',
        ready: false,
        lessons: [
            { id: 'm4.1', title: '3D model formats' },
            { id: 'm4.2', title: 'GLTFLoader' },
            { id: 'm4.3', title: 'Paths and assets' },
            { id: 'm4.4', title: 'Position, scale and rotation' },
        ],
    },
    {
        id: 'm5',
        quest: 5,
        title: 'A chatbot that answers',
        codename: 'Consciousness',
        summary: 'Build a chat window and give it answers with JavaScript and regular expressions.',
        ready: false,
        lessons: [
            { id: 'm5.1', title: 'Events and the DOM' },
            { id: 'm5.2', title: 'Regular expressions' },
            { id: 'm5.3', title: 'Matching intents' },
            { id: 'm5.4', title: 'A chat window that scrolls' },
        ],
    },
];

export const READY_LESSONS = MODULES.filter((m) => m.ready).flatMap((m) => m.lessons.map((l) => l.id));
export const READY_QUIZZES = MODULES.filter((m) => m.ready).map((m) => m.id);

// How much each kind of progress damages the boss (relative units).
export const DAMAGE = { quest: 10, quiz: 4, lesson: 1 };
// XP shown on leaderboards.
export const XP = { lesson: 10, quiz: 50 };

export const lessonById = (id) => {
    for (const m of MODULES) {
        const i = m.lessons.findIndex((l) => l.id === id);
        if (i >= 0) return { module: m, lesson: m.lessons[i], index: i };
    }
    return null;
};
