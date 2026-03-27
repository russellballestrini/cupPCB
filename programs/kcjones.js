// KCJONES — guided friend with locker, deployed on both manifolds
// Left  (MOAD/unpatched): navigates hot chaotic manifold, heat pulls hard
// Right (patched/calm):   same traversal logic, but heat is low — novelty + friends dominate
// Science: compare trail density, path coverage, and heat wake on each side.
// Kernel globals: scene, friendList, meshVertices, adjacency, heat, THREE, pcb, tick

(function () {

    const TRAIL_LEN  = 120;
    const COLOR_LEFT  = 0xff8800;   // orange  — MOAD side (hot)
    const COLOR_RIGHT = 0x00ffcc;   // cyan    — patched side (calm)

    // ── LOCKER ──────────────────────────────────────────────────────────────
    const locker = {
        visited:     new Set(),
        pathLength:  0,
        discoveries: [],
        heatLedger:  new Map(),   // vIdx → total heat injected (left/MOAD)
        heatLedger2: new Map(),   // vIdx → visit count (right/patched, no heat here)
        friendSeen:  new Map(),
        inventory:   {},
        remember(k, v) { this.inventory[k] = v; },
        recall(k)      { return this.inventory[k]; },
        summary() {
            const coverage = this.visited.size;
            const total    = meshVertices.length / 3 || 1;
            return 'KCJONES | path=' + this.pathLength +
                   ' visited=' + coverage + '/' + total +
                   ' (' + ((coverage / total) * 100).toFixed(1) + '%)' +
                   ' discoveries=' + this.discoveries.length;
        },
    };
    window.kcjonesLocker = locker;

    // write to the visible pcb-real console, not the hidden #pcb-output
    function out(msg) {
        const el = document.getElementById('pcb-real-output');
        if (el) { el.textContent += '\n> ' + msg; el.scrollTop = el.scrollHeight; }
        pcb.log(msg);  // also write to legacy console
    }

    // ── BUILD HELPERS ────────────────────────────────────────────────────────
    function makeSphere(targetScene, color) {
        const m = new THREE.Mesh(
            new THREE.SphereGeometry(22, 12, 12),
            new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.4 })
        );
        targetScene.add(m);
        return m;
    }

    function makeTrail(targetScene, color) {
        const pos = new Float32Array(TRAIL_LEN * 3);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setDrawRange(0, 1);
        const line = new THREE.Line(geo,
            new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }));
        targetScene.add(line);
        return { pos, line, pts: [] };
    }

    function updateTrail(trail, p) {
        trail.pts.unshift(p.clone());
        if (trail.pts.length > TRAIL_LEN) trail.pts.pop();
        for (let i = 0; i < trail.pts.length; i++) {
            trail.pos[i * 3]     = trail.pts[i].x;
            trail.pos[i * 3 + 1] = trail.pts[i].y;
            trail.pos[i * 3 + 2] = trail.pts[i].z;
        }
        trail.line.geometry.attributes.position.needsUpdate = true;
        trail.line.geometry.setDrawRange(0, trail.pts.length);
        trail.line.material.opacity = 0.5 + 0.5 * (trail.pts.length / TRAIL_LEN);
    }

    // ── STATE ────────────────────────────────────────────────────────────────
    let sphere1 = null, trail1 = null;   // left / MOAD
    let sphere2 = null, trail2 = null;   // right / patched
    let vIdx    = 0;
    let ready   = false;
    const p1    = new THREE.Vector3();
    const p2    = new THREE.Vector3();

    function ensureReady() {
        if (ready) return;
        if (meshVertices.length === 0) return;
        if (!adjacency || adjacency.length === 0 || !adjacency[0]) return;
        if (!friendList || friendList.length === 0) return;  // deploy with friends

        // left
        sphere1 = makeSphere(scene, COLOR_LEFT);
        trail1  = makeTrail(scene, COLOR_LEFT);

        // right
        if (window._twinScene2) {
            sphere2 = makeSphere(window._twinScene2, COLOR_RIGHT);
            trail2  = makeTrail(window._twinScene2, COLOR_RIGHT);
        }

        vIdx = Math.floor(Math.random() * (meshVertices.length / 3));
        ready = true;
        pcb.log('KCJONES: deployed on both manifolds. locker open.');
        pcb.log(locker.summary());
    }

    function rebuildRight() {
        if (!window._twinScene2 || sphere2) return;
        sphere2 = makeSphere(window._twinScene2, COLOR_RIGHT);
        trail2  = makeTrail(window._twinScene2, COLOR_RIGHT);
    }

    // ── NAVIGATION ───────────────────────────────────────────────────────────
    // Same logic on both sides. Behavior differs because heat[v] differs.
    // MOAD:    heat is high everywhere → heat term dominates → kcjones clusters in hot zones
    // Patched: heat is near zero      → novelty + friends dominate → broader coverage
    function chooseNext() {
        const nb = (adjacency && adjacency[vIdx]) || [];
        if (nb.length === 0) {
            // no neighbors — jump to a random vertex rather than staying stuck
            return Math.floor(Math.random() * (meshVertices.length / 3));
        }

        let best = nb[0], bestScore = -Infinity;
        for (const n of nb) {
            const nx = meshVertices[n * 3],
                  ny = meshVertices[n * 3 + 1],
                  nz = meshVertices[n * 3 + 2];

            // guide: pull toward active friends
            let guide = 0;
            for (const f of friendList) {
                if (!f.initialized) continue;
                const dx = f.p.x - nx, dy = f.p.y - ny, dz = f.p.z - nz;
                const d = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
                guide += 800 / d;
                if (d < 60) locker.friendSeen.set(f.id, (locker.friendSeen.get(f.id)||0)+1);
            }

            // heat: warm vertices attract (this is what differs between manifolds)
            const heatScore = (heat && n < heat.length) ? heat[n] * 2.0 : 0;

            // novelty: unvisited vertices are preferred
            const novelty = locker.visited.has(n) ? 0 : 3.0;

            const score = guide + heatScore + novelty;
            if (score > bestScore) { bestScore = score; best = n; }
        }
        return best;
    }

    // ── GROWTH INJECTION ─────────────────────────────────────────────────────
    // Left/MOAD: kcjones injects heat, compounding the O(n²) chaos
    // Right/patched: no heat injection — just records visit counts (clean traversal)
    function injectGrowth(v) {
        // MOAD side: add heat
        if (heat && v < heat.length) {
            const amt = 1.0;
            heat[v] = Math.min((heat[v] || 0) + amt, 8.0);
            locker.heatLedger.set(v, (locker.heatLedger.get(v) || 0) + amt);
        }
        // Patched side: only count visits — no heat injection, manifold stays calm
        locker.heatLedger2.set(v, (locker.heatLedger2.get(v) || 0) + 1);
    }

    // ── DISCOVERY ────────────────────────────────────────────────────────────
    function checkDiscovery(v) {
        if (!locker.visited.has(v) && heat && heat[v] > 2.5) {
            locker.discoveries.push({ tick, vIdx: v, heat: heat[v] });
            if (locker.discoveries.length % 20 === 0)
                pcb.log('KCJONES: ' + locker.discoveries.length + ' discoveries. ' + locker.summary());
        }
    }

    // ── FRAME LOOP ────────────────────────────────────────────────────────────
    function frame() {
        requestAnimationFrame(frame);

        ensureReady();
        rebuildRight();
        if (!ready) return;

        // reset if manifold was rebuilt
        if (meshVertices.length > 0 && vIdx >= meshVertices.length / 3) {
            vIdx = 0;
            locker.visited.clear();
        }

        // step
        const next = chooseNext();
        checkDiscovery(next);
        vIdx = next;
        locker.visited.add(vIdx);
        locker.pathLength++;
        injectGrowth(vIdx);

        // left manifold position + trail
        p1.set(meshVertices[vIdx*3], meshVertices[vIdx*3+1], meshVertices[vIdx*3+2]);
        if (sphere1) sphere1.position.copy(p1);
        if (trail1)  updateTrail(trail1, p1);

        // right manifold position + trail — same vIdx, different vertex array
        const ov2 = window._twinOrigVerts2;
        if (ov2 && vIdx * 3 + 2 < ov2.length) {
            p2.set(ov2[vIdx*3], ov2[vIdx*3+1], ov2[vIdx*3+2]);
            if (sphere2) sphere2.position.copy(p2);
            if (trail2)  updateTrail(trail2, p2);
        }

        // emissive: left pulses orange-red with heat, right glows steady cyan
        const localHeat = (heat && heat[vIdx]) ? heat[vIdx] : 0;
        const hotness = Math.min(1, localHeat / 6);
        if (sphere1) sphere1.material.emissive.setRGB(hotness, hotness * 0.4, 0);
        if (sphere2) sphere2.material.emissive.setRGB(0, 0.8, 0.6);  // constant calm cyan
    }

    frame();

    // ── PCB COMMANDS ─────────────────────────────────────────────────────────
    const _origRun = pcb.run.bind(pcb);
    pcb.run = function (src) {
        const cmd = src.trim();
        if (cmd === 'kcjones.locker') {
            out(locker.summary());
            out('friends seen: ' + ([...locker.friendSeen.entries()].map(([k,v])=>k+'='+v).join(' ') || '(none)'));
            const topHeat = [...locker.heatLedger.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
            out('top MOAD heat nodes: ' + (topHeat.length ? topHeat.map(([v,h])=>'v'+v+'='+h.toFixed(1)).join(' ') : '(none yet)'));
            out('inventory: ' + JSON.stringify(locker.inventory));
            return;
        }
        if (cmd === 'kcjones.reset') {
            locker.visited.clear(); locker.pathLength = 0;
            locker.discoveries = []; locker.heatLedger.clear();
            locker.heatLedger2.clear(); locker.friendSeen.clear();
            locker.inventory = {};
            if (trail1) { trail1.pts = []; trail1.line.geometry.setDrawRange(0,0); }
            if (trail2) { trail2.pts = []; trail2.line.geometry.setDrawRange(0,0); }
            ready = false;
            out('KCJONES: reset.');
            return;
        }
        if (cmd.startsWith('kcjones.remember ')) {
            const parts = cmd.slice(17).split('=');
            locker.remember(parts[0].trim(), parts.slice(1).join('=').trim() || true);
            out('KCJONES: remembered ' + parts[0].trim() + ' = ' + JSON.stringify(locker.recall(parts[0].trim())));
            return;
        }
        _origRun(src);
    };

    pcb.log('PGM: KCJONES loaded. cmds: kcjones.locker / kcjones.reset / kcjones.remember key=val');

})();
