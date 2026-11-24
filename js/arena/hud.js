// Projector HUD: DOM overlay drawn above the WebGL canvas.
// Sized to be readable from the back of a room.
import * as THREE from 'three';
import { CLASSES, hex, escapeHtml } from './util.js';

const $ = (id) => document.getElementById(id);

export class Hud {
    constructor(camera) {
        this.camera = camera;
        this.v = new THREE.Vector3();
        this.layer = $('float-layer');
        this.bubbles = new Map();
        this.plates = new Map();
        this.lastHp = 1;
        this.bannerTimer = null;
        this.comboTimer = null;
    }

    project(world) {
        const v = this.v.copy(world).project(this.camera);
        return {
            x: (v.x * 0.5 + 0.5) * window.innerWidth,
            y: (-v.y * 0.5 + 0.5) * window.innerHeight,
            on: v.z < 1 && v.x > -1.1 && v.x < 1.1 && v.y > -1.1 && v.y < 1.1,
        };
    }

    // ---------- boss bar ----------
    setBoss(hpFrac, phaseLabel, hpValue) {
        $('boss-fill').style.width = `${hpFrac * 100}%`;
        $('boss-chip').style.width = `${hpFrac * 100}%`;
        $('boss-pct').textContent = `${Math.ceil(hpFrac * 100)}%`;
        $('boss-hp').textContent = `${Math.ceil(hpValue).toLocaleString()} HP`;
        $('boss-phase').textContent = phaseLabel;
        if (hpFrac < this.lastHp) {
            const bar = $('boss-bar');
            bar.classList.remove('hit');
            void bar.offsetWidth;
            bar.classList.add('hit');
        }
        this.lastHp = hpFrac;
    }

    setDefeated(on) { document.body.classList.toggle('defeated', on); }

    setShield(shield) {
        const el = $('shield');
        if (!shield) { el.classList.remove('on'); return; }
        el.classList.add('on');
        $('shield-text').textContent = `${shield.have} / ${shield.need} quiz passes`;
        $('shield-fill').style.width = `${(shield.have / shield.need) * 100}%`;
    }

    setRage(secs) {
        const el = $('rage');
        el.classList.toggle('on', secs > 0);
        document.body.classList.toggle('rage', secs > 0);
        if (secs > 0) $('rage-time').textContent = `${Math.ceil(secs)}s`;
    }

    // ---------- feed / board ----------
    feed(html, kind = 'info') {
        const list = $('feed-list');
        const li = document.createElement('li');
        li.className = `feed-item ${kind}`;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        li.innerHTML = `<span class="feed-time">${time}</span><span class="feed-body">${html}</span>`;
        list.prepend(li);
        while (list.children.length > 5) list.lastChild.remove();
    }

    board(rows) {
        $('board-list').innerHTML = rows.map((r, i) => `
            <li class="board-row${i === 0 ? ' first' : ''}">
                <span class="rank">${i + 1}</span>
                <span class="swatch" style="--c:${hex(r.color)}"></span>
                <span class="name">${escapeHtml(r.name)}</span>
                <span class="cls" title="${CLASSES[r.cls].label}" style="color:${hex(CLASSES[r.cls].color)}">${CLASSES[r.cls].icon}</span>
                <span class="xp">${r.xp.toLocaleString()}<small> XP</small></span>
            </li>`).join('');
    }

    count(n) { $('join-count').textContent = n; }

    // ---------- big moments ----------
    banner(title, sub = '', kind = 'info', dur = 2.6) {
        const el = $('banner');
        el.className = `hud banner ${kind}`;
        $('banner-title').textContent = title;
        $('banner-sub').innerHTML = sub;
        void el.offsetWidth;
        el.classList.add('show');
        clearTimeout(this.bannerTimer);
        this.bannerTimer = setTimeout(() => el.classList.remove('show'), dur * 1000);
    }

    combo(n) {
        const el = $('combo');
        $('combo-n').textContent = `×${n}`;
        el.classList.remove('pop');
        void el.offsetWidth;
        el.classList.add('show', 'pop');
        el.style.setProperty('--heat', Math.min(1, n / 15));
        clearTimeout(this.comboTimer);
        this.comboTimer = setTimeout(() => el.classList.remove('show'), 5000);
    }

    damage(world, text, kind = 'normal') {
        const p = this.project(world);
        if (!p.on) return;
        const el = document.createElement('div');
        el.className = `dmg ${kind}`;
        el.textContent = text;
        el.style.left = `${p.x + (Math.random() - 0.5) * 60}px`;
        el.style.top = `${p.y + (Math.random() - 0.5) * 30}px`;
        this.layer.appendChild(el);
        setTimeout(() => el.remove(), 1400);
    }

    bubble(id, getWorld, text, kind = 'bot', dur = 3) {
        let b = this.bubbles.get(id);
        if (!b) {
            const el = document.createElement('div');
            el.className = `bubble ${kind}`;
            this.layer.appendChild(el);
            b = { el, getWorld };
            this.bubbles.set(id, b);
        }
        b.getWorld = getWorld;
        b.el.textContent = text;
        b.el.classList.add('show');
        b.until = performance.now() + dur * 1000;
    }

    // ---------- nameplates ----------
    addPlate(id, name, color) {
        const el = document.createElement('div');
        el.className = 'plate';
        el.innerHTML = `<i style="background:${hex(color)}"></i>${escapeHtml(name)}`;
        this.layer.appendChild(el);
        this.plates.set(id, { el, hot: 0 });
    }

    removePlate(id) {
        const p = this.plates.get(id);
        if (p) { p.el.remove(); this.plates.delete(id); }
    }

    hot(id, secs = 2.5) {
        const p = this.plates.get(id);
        if (p) p.hot = performance.now() + secs * 1000;
    }

    update(raiders, showPlates = true) {
        const now = performance.now();
        for (const r of raiders) {
            const p = this.plates.get(r.id);
            if (!p) continue;
            const s = this.project(r.bot.anchor.getWorldPosition(this.v.clone()));
            const hot = p.hot > now;
            p.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
            p.el.classList.toggle('hot', hot);
            p.el.style.display = s.on && showPlates ? '' : 'none';
        }
        for (const [id, b] of this.bubbles) {
            if (now > b.until) { b.el.classList.remove('show'); continue; }
            const s = this.project(b.getWorld());
            b.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
            b.el.style.display = s.on ? '' : 'none';
        }
    }

    // ---------- ambush quiz ----------
    ambush(q, secs) {
        const el = $('ambush');
        $('ambush-q').textContent = q.q;
        $('ambush-opts').innerHTML = q.options.map((o, i) => `<li data-i="${i}"><b>${'ABCD'[i]}</b>${escapeHtml(o)}</li>`).join('');
        $('ambush-result').textContent = '';
        el.classList.remove('resolved');
        el.classList.add('show');
        const bar = $('ambush-timer');
        bar.style.transition = 'none';
        bar.style.width = '100%';
        void bar.offsetWidth;
        bar.style.transition = `width ${secs}s linear`;
        bar.style.width = '0%';
    }

    ambushResolve(q, correct, total) {
        const el = $('ambush');
        el.classList.add('resolved');
        [...$('ambush-opts').children].forEach((li, i) => li.classList.toggle('correct', i === q.answer));
        $('ambush-result').innerHTML = `<b>${correct}/${total}</b> raiders answered correctly. Volley incoming!`;
        setTimeout(() => el.classList.remove('show'), 3200);
    }

    // ---------- victory ----------
    victory(mvps) {
        $('victory-list').innerHTML = mvps.map((m) => `
            <li>
                <span class="award">${m.award}</span>
                <span class="who"><i style="background:${hex(m.color)}"></i>${escapeHtml(m.name)}</span>
                <span class="stat">${m.stat}</span>
            </li>`).join('');
        $('victory').classList.add('show');
    }

    hideVictory() { $('victory').classList.remove('show'); }
}
