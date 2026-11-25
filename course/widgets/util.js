// Small DOM helpers shared by the lesson widgets.

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** el('div.card#id', { onclick, 'aria-label': 'x' }, child, 'text', ...) */
export function el(spec, attrs = {}, ...children) {
    const [tagPart, ...rest] = spec.split(/(?=[.#])/);
    const node = document.createElement(tagPart || 'div');
    for (const r of rest) {
        if (r.startsWith('.')) node.classList.add(r.slice(1));
        else if (r.startsWith('#')) node.id = r.slice(1);
    }
    for (const [k, v] of Object.entries(attrs || {})) {
        if (v === undefined || v === null || v === false) continue;
        if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
        if (c === null || c === undefined || c === false) continue;
        node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
}

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Move a node into a new parent with a smooth FLIP animation. */
export function flipMove(node, newParent, before = null) {
    const first = node.getBoundingClientRect();
    newParent.insertBefore(node, before);
    if (reducedMotion()) return;
    const last = node.getBoundingClientRect();
    const dx = first.left - last.left, dy = first.top - last.top;
    node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { duration: 550, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

/** A glowing dot that flies from one element to another, then calls done(). */
export function flyDot(from, to, { color = 'var(--neon-cyan)', label = '' } = {}) {
    return new Promise((resolve) => {
        const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
        const dot = el('div.fly-dot', { style: { background: color, left: `${a.left + a.width / 2}px`, top: `${a.top + a.height / 2}px` } }, label);
        document.body.append(dot);
        if (reducedMotion()) { dot.remove(); resolve(); return; }
        const anim = dot.animate([
            { transform: 'translate(-50%, -50%) scale(.6)', opacity: 0 },
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.15 },
            { transform: `translate(calc(-50% + ${b.left + b.width / 2 - a.left - a.width / 2}px), calc(-50% + ${b.top + b.height / 2 - a.top - a.height / 2}px)) scale(1)`, opacity: 1 },
        ], { duration: 800, easing: 'cubic-bezier(.4,0,.2,1)' });
        anim.onfinish = () => { dot.remove(); resolve(); };
    });
}

export const fakeHash = () => Math.random().toString(16).slice(2, 9).padEnd(7, '0');

export function typewriter(node, text, { speed = 12 } = {}) {
    node.textContent = '';
    if (reducedMotion()) { node.textContent = text; return Promise.resolve(); }
    return new Promise((resolve) => {
        let i = 0;
        const step = () => {
            i = Math.min(text.length, i + Math.max(1, Math.round(text.length / 160)));
            node.textContent = text.slice(0, i);
            if (i < text.length) setTimeout(step, speed); else resolve();
        };
        step();
    });
}
