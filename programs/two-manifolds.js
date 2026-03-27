// TWO_MANIFOLDS — MOAD unpatched vs patched, side by side (left/right desktop, top/bottom mobile)
// Left/Top:  MOAD heat — injection rate grows O(n²), manifold gets chaotic
// Right/Bottom: patched — injection rate constant O(1), manifold stays calm
// Both share the same Sym²(X) geometry. Heat diffuses across adjacency graph.
// Kernel globals in scope: scene, camera, renderer, controls, tick,
//   originalVertices, adjacency, manifoldMesh, THREE, wobbleBase, flickerRate

(function () {

    const vc = document.getElementById('viewport-container') || document.getElementById('viewport').parentElement;
    const vp = document.getElementById('viewport');

    function isMobile() { return window.innerWidth <= 768; }

    // --- create elements ---
    const vp2 = document.createElement('div');
    vp2.id = 'viewport-patched';
    vc.appendChild(vp2);

    const divider = document.createElement('div');
    divider.style.zIndex = '10';
    divider.style.pointerEvents = 'none';
    divider.style.background = '#333';
    divider.style.position = 'absolute';
    vc.appendChild(divider);

    const LABEL_BASE = 'position:absolute;font-family:Courier New,monospace;font-size:10px;background:rgba(0,0,0,0.6);padding:2px 6px;z-index:20;pointer-events:none;';
    const HUD_BASE   = 'position:absolute;font-family:Courier New,monospace;font-size:11px;color:#fff;background:rgba(0,0,0,0.7);padding:4px 8px;z-index:20;pointer-events:none;white-space:pre;line-height:1.5;';

    const labelLeft = document.createElement('div');
    labelLeft.textContent = 'MOAD  unpatched  O(n\xb2)';
    vc.appendChild(labelLeft);

    const labelRight = document.createElement('div');
    labelRight.textContent = 'patched  O(n)';
    vc.appendChild(labelRight);

    const hudLeft  = document.createElement('div');
    vc.appendChild(hudLeft);
    const hudRight = document.createElement('div');
    vc.appendChild(hudRight);

    // --- layout: apply position/size based on orientation ---
    function layoutViewports() {
        const mobile = isMobile();
        if (mobile) {
            vp.style.cssText  = 'position:absolute;left:0;top:0;width:100%;height:50%;overflow:hidden;';
            vp2.style.cssText = 'position:absolute;left:0;top:50%;width:100%;height:50%;overflow:hidden;';
            divider.style.left   = '0';
            divider.style.top    = '50%';
            divider.style.width  = '100%';
            divider.style.height = '1px';
            divider.style.removeProperty && divider.style.removeProperty('right');

            labelLeft.style.cssText  = LABEL_BASE + 'color:#ff4400;top:6px;left:8px;';
            labelRight.style.cssText = LABEL_BASE + 'color:#68ff9a;top:calc(50% + 6px);left:8px;';
            hudLeft.style.cssText    = HUD_BASE + 'top:6px;right:8px;';
            hudRight.style.cssText   = HUD_BASE + 'top:calc(50% + 6px);right:8px;';
        } else {
            vp.style.cssText  = 'position:absolute;left:0;top:0;width:50%;height:100%;overflow:hidden;';
            vp2.style.cssText = 'position:absolute;right:0;top:0;width:50%;height:100%;overflow:hidden;';
            divider.style.left   = '50%';
            divider.style.top    = '0';
            divider.style.width  = '1px';
            divider.style.height = '100%';

            labelLeft.style.cssText  = LABEL_BASE + 'color:#ff4400;bottom:8px;left:8px;';
            labelRight.style.cssText = LABEL_BASE + 'color:#68ff9a;bottom:8px;right:8px;';
            hudLeft.style.cssText    = HUD_BASE + 'top:8px;left:8px;';
            hudRight.style.cssText   = HUD_BASE + 'top:8px;right:8px;';
        }
    }

    function resizeRenderers() {
        layoutViewports();
        const mobile = isMobile();
        if (mobile) {
            const w = vc.clientWidth, h = Math.floor(vc.clientHeight / 2);
            renderer.setSize(w, h);
            camera.aspect = w / (h || 1);
        } else {
            const w = Math.floor(vc.clientWidth / 2), h = vc.clientHeight;
            renderer.setSize(w, h);
            camera.aspect = w / (h || 1);
        }
        camera.updateProjectionMatrix();
        renderer2.setSize(vp2.clientWidth, vp2.clientHeight);
        camera2.aspect = vp2.clientWidth / (vp2.clientHeight || 1);
        camera2.updateProjectionMatrix();
    }

    // apply initial layout
    layoutViewports();
    // resize left renderer to its new half
    {
        const mobile = isMobile();
        let w, h;
        if (mobile) {
            w = vc.clientWidth; h = Math.floor(vc.clientHeight / 2);
        } else {
            w = Math.floor(vc.clientWidth / 2); h = vc.clientHeight;
        }
        renderer.setSize(w, h);
        camera.aspect = w / (h || 1);
        camera.updateProjectionMatrix();
    }

    // --- second Three.js renderer ---
    const scene2    = new THREE.Scene();
    window._twinScene2 = scene2;
    scene2.background = new THREE.Color(0xffffff);
    const camera2   = new THREE.PerspectiveCamera(45, vp2.clientWidth / (vp2.clientHeight || 1), 1, 100000);
    camera2.position.set(0, 0, 3000);
    const renderer2 = new THREE.WebGLRenderer({ antialias: true });
    renderer2.domElement.style.cssText = 'width:100%;height:100%;display:block;';
    vp2.appendChild(renderer2.domElement);
    scene2.add(new THREE.AmbientLight(0xffffff, 0.8));

    const controls2 = new THREE.OrbitControls(camera2, renderer2.domElement);

    window.addEventListener('resize', resizeRenderers);
    window.addEventListener('orientationchange', function () { setTimeout(resizeRenderers, 200); });

    // --- HUD state ---
    let frameL = 0, frameR = 0, lastTickSeen = -1;
    let fpsL = 0, fpsR = 0, fpsLt = performance.now(), fpsRt = performance.now(), fpsLc = 0, fpsRc = 0;

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

    // --- state ---
    let heat1 = null, heat2 = null, adj1 = null;
    let baseVerts = null, mesh2 = null, origVerts2 = null;
    let n = 0, ready = false, fingerprint = 0;

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
        window._twinOrigVerts2 = origVerts2;
        baseVerts  = Float32Array.from(originalVertices);
        heat1 = new Float32Array(nVerts).fill(0.4);
        heat2 = new Float32Array(nVerts).fill(0.05);
        adj1  = adjacency.map(a => a.slice());

        resizeRenderers();
        fingerprint = originalVertices[0] + originalVertices[7] + originalVertices[333];
        ready = true;
        pcb.log('TWO_MANIFOLDS: geometry mirrored. nVerts=' + nVerts);
    }

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

    function updateLeftColor() {
        if (!manifoldMesh) return;
        const avgHeat = heat1.reduce((s, v) => s + v, 0) / heat1.length;
        const r = Math.min(1.0, avgHeat * 2.0);
        manifoldMesh.material.color.setRGB(r, 0, 0);
        manifoldMesh.material.opacity = 0.55;
    }

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

        for (let k = 0; k < 20; k++) {
            const i = Math.floor(Math.random() * nVerts);
            heat1[i] = Math.min(heat1[i] + 0.5, 8.0);
        }

        heat2[Math.floor(Math.random() * nVerts)] = Math.min(
            heat2[Math.floor(Math.random() * nVerts)] + 0.4, 1.2
        );

        heat1 = diffuse(heat1, adj1, 0.975);
        heat2 = diffuse(heat2, adj1, 0.90);

        updateLeftColor();

        for (let i = 0; i < nVerts; i++) {
            originalVertices[i * 3]     = baseVerts[i * 3];
            originalVertices[i * 3 + 1] = baseVerts[i * 3 + 1];
            originalVertices[i * 3 + 2] = baseVerts[i * 3 + 2] + heat1[i] * 120;
        }

        const pos2 = mesh2.geometry.attributes.position.array;
        const w2   = wobbleBase || 2.0;
        for (let i = 0; i < nVerts; i++) {
            pos2[i * 3]     = origVerts2[i * 3]     + (Math.random() - 0.5) * w2;
            pos2[i * 3 + 1] = origVerts2[i * 3 + 1] + (Math.random() - 0.5) * w2;
            pos2[i * 3 + 2] = origVerts2[i * 3 + 2] + heat2[i] * 40;
        }
        mesh2.geometry.attributes.position.needsUpdate = true;
        mesh2.material.opacity = 0.55;

        controls2.update();
        renderer2.render(scene2, camera2);
    }

    frame();

    const _origRun = pcb.run.bind(pcb);
    pcb.run = function (src) {
        const cmd = src.trim();
        if (cmd === 'twin.reset') {
            if (heat1) heat1.fill(0);
            if (heat2) heat2.fill(0);
            n = 0;
            pcb.log('TWO_MANIFOLDS: RESET');
            return;
        }
        _origRun(src);
    };

    pcb.log('PGM: TWO_MANIFOLDS loaded. cmd: twin.reset');

})();
