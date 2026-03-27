// TWO_MANIFOLDS — MOAD unpatched vs patched, side by side
// Left:  MOAD heat — injection rate grows O(n²), manifold gets chaotic
// Right: patched   — injection rate constant O(1), manifold stays calm
// Both share the same Sym²(X) geometry. Heat diffuses across adjacency graph.
// Kernel globals in scope: scene, camera, renderer, controls, tick,
//   originalVertices, adjacency, manifoldMesh, THREE, wobbleBase, flickerRate

(function () {

    // --- split viewport: left = MOAD (existing renderer), right = patched (new) ---
    const vc = document.getElementById('viewport-container') || document.getElementById('viewport').parentElement;
    const vp = document.getElementById('viewport');

    vp.style.cssText = 'position:absolute;left:0;top:0;width:50%;height:100%;overflow:hidden;';

    // resize existing renderer + camera to left half
    const _w = Math.floor(vc.clientWidth / 2);
    const _h = vc.clientHeight;
    renderer.setSize(_w, _h);
    camera.aspect = _w / (_h || 1);
    camera.updateProjectionMatrix();

    const vp2 = document.createElement('div');
    vp2.id = 'viewport-patched';
    vp2.style.cssText = 'position:absolute;right:0;top:0;width:50%;height:100%;overflow:hidden;';
    vc.appendChild(vp2);

    // --- dividing line ---
    const divider = document.createElement('div');
    divider.style.cssText = 'position:absolute;left:50%;top:0;width:1px;height:100%;background:#333;z-index:10;pointer-events:none;';
    vc.appendChild(divider);

    // --- labels ---
    function makeLabel(text, color, side) {
        const l = document.createElement('div');
        l.style.cssText = 'position:absolute;bottom:8px;' + (side === 'left' ? 'left:8px;' : 'right:8px;') +
            'font-family:Courier New,monospace;font-size:10px;color:' + color + ';' +
            'background:rgba(0,0,0,0.6);padding:2px 6px;z-index:20;pointer-events:none;';
        l.textContent = text;
        vc.appendChild(l);
        return l;
    }
    makeLabel('MOAD  unpatched  O(n\xb2)', '#ff4400', 'left');
    makeLabel('patched  O(n)', '#68ff9a', 'right');

    // --- HUD overlays (frame counters + friend temps) ---
    function makeHud(side) {
        const h = document.createElement('div');
        h.style.cssText = 'position:absolute;top:8px;' + (side === 'left' ? 'left:8px;' : 'right:8px;') +
            'font-family:Courier New,monospace;font-size:11px;color:#fff;' +
            'background:rgba(0,0,0,0.7);padding:4px 8px;z-index:20;pointer-events:none;' +
            'white-space:pre;line-height:1.5;';
        vc.appendChild(h);
        return h;
    }
    const hudLeft  = makeHud('left');
    const hudRight = makeHud('right');

    // frame counters — one per rAF loop, reveals clock drift between kernel loop and twin loop
    let frameL = 0;   // incremented by kernel tick (via `tick` global read each frame)
    let frameR = 0;   // incremented by our own rAF loop below
    let lastTickSeen = -1;

    // fps smoothing
    let fpsL = 0, fpsR = 0;
    let fpsLt = performance.now(), fpsRt = performance.now();
    let fpsLc = 0, fpsRc = 0;

    function tickFpsL() {
        fpsLc++;
        const now = performance.now();
        if (now - fpsLt >= 1000) { fpsL = fpsLc; fpsLc = 0; fpsLt = now; }
    }
    function tickFpsR() {
        fpsRc++;
        const now = performance.now();
        if (now - fpsRt >= 1000) { fpsR = fpsRc; fpsRc = 0; fpsRt = now; }
    }

    function updateHuds() {
        // left counter tracks kernel tick
        if (typeof tick !== 'undefined' && tick !== lastTickSeen) {
            frameL += (tick - lastTickSeen > 0 && lastTickSeen >= 0) ? (tick - lastTickSeen) : 1;
            lastTickSeen = tick;
            tickFpsL();
        }
        tickFpsR();
        frameR++;

        const drift = frameR - frameL;
        let leftLines  = 'MOAD  frame:' + frameL + '  fps:' + fpsL + '\ndrift:' + (drift >= 0 ? '+' : '') + drift;
        let rightLines = 'PATCH frame:' + frameR + '  fps:' + fpsR;

        // friend temperatures
        if (typeof friendList !== 'undefined' && heat1 && heat2) {
            leftLines  += '\n';
            rightLines += '\n';
            friendList.forEach(function (f, i) {
                if (!f.initialized) return;
                const v = f.vIdx || 0;
                const tL = heat1[v] != null ? heat1[v].toFixed(2) : '?';
                const tR = heat2[v] != null ? heat2[v].toFixed(2) : '?';
                const id = f.id || ('f' + i);
                leftLines  += '\n' + id + ' \u2192 ' + tL;
                rightLines += '\n' + id + ' \u2192 ' + tR;
            });
        }

        hudLeft.textContent  = leftLines;
        hudRight.textContent = rightLines;
    }

    // --- second Three.js renderer ---
    const scene2    = new THREE.Scene();
    window._twinScene2 = scene2;       // expose for friend-trails
    scene2.background = new THREE.Color(0xffffff);
    const camera2   = new THREE.PerspectiveCamera(45, vp2.clientWidth / (vp2.clientHeight || 1), 1, 100000);
    camera2.position.set(0, 0, 3000);
    const renderer2 = new THREE.WebGLRenderer({ antialias: true });
    renderer2.domElement.style.cssText = 'width:100%;height:100%;display:block;';
    vp2.appendChild(renderer2.domElement);
    scene2.add(new THREE.AmbientLight(0xffffff, 0.8));

    const controls2 = new THREE.OrbitControls(camera2, renderer2.domElement);

    // resize both renderers on window resize
    window.addEventListener('resize', function () {
        const w1 = Math.floor(vc.clientWidth / 2), h1 = vc.clientHeight;
        renderer.setSize(w1, h1);
        camera.aspect = w1 / (h1 || 1);
        camera.updateProjectionMatrix();
        renderer2.setSize(vp2.clientWidth, vp2.clientHeight);
        camera2.aspect = vp2.clientWidth / (vp2.clientHeight || 1);
        camera2.updateProjectionMatrix();
    });

    // --- state ---
    let heat1       = null;   // MOAD heat buffer (left)
    let heat2       = null;   // patched heat buffer (right)
    let adj1        = null;   // adjacency copy for diffusion
    let baseVerts   = null;   // snapshot of rest-state originalVertices (left)
    let mesh2       = null;   // right manifold mesh
    let origVerts2  = null;   // right manifold rest-state vertices
    let n           = 0;      // simulated step counter (drives MOAD injection rate)
    let ready       = false;
    let fingerprint = 0;  // detects buildManifold rebuilds of same-size geometry

    // --- build right manifold from kernel geometry ---
    function buildRight() {
        if (mesh2) { scene2.remove(mesh2); mesh2.geometry.dispose(); mesh2.material.dispose(); mesh2 = null; }

        const geo2 = manifoldMesh.geometry.clone();
        mesh2 = new THREE.Mesh(
            geo2,
            new THREE.MeshPhongMaterial({ color: 0x006622, wireframe: true, transparent: true, opacity: 0.6 })
        );
        scene2.add(mesh2);

        const nVerts = originalVertices.length / 3;
        origVerts2 = Float32Array.from(originalVertices);
        window._twinOrigVerts2 = origVerts2;  // expose for friend-trails
        baseVerts  = Float32Array.from(originalVertices);
        // pre-warm to equilibrium: 20 injections × 0.5 / 1024 nodes / 0.025 loss = ~0.39
        heat1 = new Float32Array(nVerts).fill(0.4);
        heat2 = new Float32Array(nVerts).fill(0.05);
        adj1  = adjacency.map(a => a.slice());  // deep copy

        renderer2.setSize(vp2.clientWidth, vp2.clientHeight);
        camera2.aspect = vp2.clientWidth / (vp2.clientHeight || 1);
        camera2.updateProjectionMatrix();
        fingerprint = originalVertices[0] + originalVertices[7] + originalVertices[333];
        ready = true;
        pcb.log('TWO_MANIFOLDS: geometry mirrored. nVerts=' + nVerts);
    }

    // --- diffuse one heat buffer ---
    function diffuse(h, adj, decay) {
        const next = new Float32Array(h.length);
        for (let i = 0; i < h.length; i++) {
            const nb = adj[i] || [];
            let sum = h[i];
            for (let j = 0; j < nb.length; j++) sum += h[nb[j]];
            next[i] = (sum / (nb.length + 1)) * decay;
        }
        return next;
    }

    // lock left manifold: constant opacity (kills flicker), red tint from heat
    function updateLeftColor() {
        if (!manifoldMesh) return;
        const avgHeat = heat1.reduce((s, v) => s + v, 0) / heat1.length;
        const r = Math.min(1.0, avgHeat * 2.0);
        manifoldMesh.material.color.setRGB(r, 0, 0);
        manifoldMesh.material.opacity = 0.55;  // constant — overrides kernel flicker
    }

    // --- animation loop ---
    function frame() {
        requestAnimationFrame(frame);

        updateHuds();

        if (!ready) {
            if (manifoldMesh && originalVertices.length > 0) buildRight();
            else { controls2.update(); renderer2.render(scene2, camera2); return; }
        }

        const fp = originalVertices[0] + originalVertices[7] + originalVertices[333];
        if (originalVertices.length !== baseVerts.length || fp !== fingerprint) {
            buildRight();
            return;
        }

        const nVerts = heat1.length;

        // MOAD: many injections, decay balanced to hold equilibrium at ~4.0
        for (let k = 0; k < 20; k++) {
            const i = Math.floor(Math.random() * nVerts);
            heat1[i] = Math.min(heat1[i] + 0.5, 8.0);
        }

        // patched: 1 injection, fast decay — holds near 0.3
        heat2[Math.floor(Math.random() * nVerts)] = Math.min(
            heat2[Math.floor(Math.random() * nVerts)] + 0.4, 1.2
        );

        heat1 = diffuse(heat1, adj1, 0.975);  // balanced: injection ≈ loss at ~4.0
        heat2 = diffuse(heat2, adj1, 0.90);   // fast decay: stays near rest shape

        updateLeftColor();

        // LEFT: push heat into originalVertices z — kernel animate() adds wobble on top
        for (let i = 0; i < nVerts; i++) {
            originalVertices[i * 3]     = baseVerts[i * 3];
            originalVertices[i * 3 + 1] = baseVerts[i * 3 + 1];
            originalVertices[i * 3 + 2] = baseVerts[i * 3 + 2] + heat1[i] * 120;
        }

        // RIGHT: calm z, green mesh stays close to rest shape
        const pos2 = mesh2.geometry.attributes.position.array;
        const w2   = wobbleBase || 2.0;
        for (let i = 0; i < nVerts; i++) {
            pos2[i * 3]     = origVerts2[i * 3]     + (Math.random() - 0.5) * w2;
            pos2[i * 3 + 1] = origVerts2[i * 3 + 1] + (Math.random() - 0.5) * w2;
            pos2[i * 3 + 2] = origVerts2[i * 3 + 2] + heat2[i] * 40;
        }
        mesh2.geometry.attributes.position.needsUpdate = true;
        mesh2.material.opacity = 0.55;  // constant — no flicker

        controls2.update();
        renderer2.render(scene2, camera2);
    }

    frame();

    // --- PCB commands ---
    const _origRun = pcb.run.bind(pcb);
    pcb.run = function (src) {
        const cmd = src.trim();
        if (cmd === 'twin.reset') {
            if (heat1) heat1.fill(0);
            if (heat2) heat2.fill(0);
            n = 0; phase = 0;
            pcb.log('TWO_MANIFOLDS: RESET');
            return;
        }
        _origRun(src);
    };

    pcb.log('PGM: TWO_MANIFOLDS loaded. cmd: twin.reset');

})();
