// FRIEND_TRAILS — friends + trails on both manifolds, throttled to render speed
// Left scene:  uses kernel friendList, meshVertices, scene
// Right scene: shadow friends mirror left traversal using _twinScene2 + _twinOrigVerts2
// Kernel globals: scene, friendList, meshVertices, adjacency, THREE, pcb, tick

(function () {

    const TRAIL_LENGTH  = 60;
    const LERP_SPEED    = 0.018;  // smooth roller-coaster glide
    const ARRIVE_DIST   = 18;     // pick next vertex when this close to current target
    const COLORS        = [0x68ff9a, 0xffd700, 0xff6820, 0x00eeff, 0xff3232];

    // --- trail state per friend instance ---
    const leftTrails  = new Map();  // Friend → { positions, line, points[] }
    const rightTrails = new Map();  // Friend → { positions, line, points[], sphere, p }

    // --- patch a friend instance for smooth coaster movement ---
    function patchSpeed(f) {
        if (f._speedPatched) return;
        f._speedPatched = true;
        const _compute = f.compute.bind(f);
        f.compute = function () {
            // only advance to next vertex once we're close enough to the current target
            if (this.p.distanceTo(this.targetP) < ARRIVE_DIST) _compute();
        };
        f.apply = function () {
            this.p.lerp(this.targetP, LERP_SPEED);
            this.mesh.position.copy(this.p);
        };
    }

    // --- create a Three.js trail line in the given scene ---
    function makeTrail(targetScene, colorHex) {
        const positions = new Float32Array(TRAIL_LENGTH * 3);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setDrawRange(0, 1);
        const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.0 });
        const line = new THREE.Line(geo, mat);
        targetScene.add(line);
        return { positions, line, points: [] };
    }

    // --- ensure left trail ---
    function ensureLeft(f, i) {
        if (leftTrails.has(f)) return;
        patchSpeed(f);
        leftTrails.set(f, makeTrail(scene, COLORS[i % COLORS.length]));
    }

    // --- ensure right shadow friend + trail ---
    function ensureRight(f, i) {
        if (rightTrails.has(f)) return;
        const scene2 = window._twinScene2;
        if (!scene2) return;
        const color = COLORS[i % COLORS.length];

        const sphere = new THREE.Mesh(
            new THREE.CylinderGeometry(12, 12, 3, 6),
            new THREE.MeshPhongMaterial({ color })
        );
        scene2.add(sphere);

        const trail = makeTrail(scene2, color);
        trail.sphere    = sphere;
        trail.p         = new THREE.Vector3();
        trail.curVIdx   = -1;
        trail.segStartP = new THREE.Vector3();
        trail.segEndP   = new THREE.Vector3();
        trail.leftSegLen = 1;
        rightTrails.set(f, trail);
    }

    // --- update one trail ---
    function updateTrail(data, pos) {
        data.points.unshift(pos.clone());
        if (data.points.length > TRAIL_LENGTH) data.points.pop();
        const pts = data.points;
        for (let i = 0; i < pts.length; i++) {
            data.positions[i * 3]     = pts[i].x;
            data.positions[i * 3 + 1] = pts[i].y;
            data.positions[i * 3 + 2] = pts[i].z;
        }
        data.line.geometry.attributes.position.needsUpdate = true;
        data.line.geometry.setDrawRange(0, pts.length);
        data.line.material.opacity = 0.2 + 0.6 * (pts.length / TRAIL_LENGTH);
    }

    // --- cleanup stale entries ---
    function cleanup() {
        for (const [f, data] of leftTrails.entries()) {
            if (!friendList.includes(f)) {
                scene.remove(data.line);
                data.line.geometry.dispose();
                data.line.material.dispose();
                leftTrails.delete(f);
            }
        }
        const scene2 = window._twinScene2;
        for (const [f, data] of rightTrails.entries()) {
            if (!friendList.includes(f)) {
                if (scene2) { scene2.remove(data.line); scene2.remove(data.sphere); }
                data.line.geometry.dispose();
                data.line.material.dispose();
                rightTrails.delete(f);
            }
        }
    }

    // --- main loop ---
    function frame() {
        requestAnimationFrame(frame);

        const ov2 = window._twinOrigVerts2;

        friendList.forEach((f, i) => {
            ensureLeft(f, i);
            ensureRight(f, i);

            // left trail — follows the lerped sphere position
            if (f.initialized) {
                const lt = leftTrails.get(f);
                if (lt) updateTrail(lt, f.p);
            }

            // right shadow — parametric mirror of left friend's edge progress
            const rt = rightTrails.get(f);
            if (rt && ov2 && f.initialized) {
                if (rt.curVIdx !== f.vIdx) {
                    // left friend started a new edge — record start/end in right-space
                    // and the left segment length so we can compute t each frame
                    const pv = (f.prevIdx >= 0) ? f.prevIdx : f.vIdx;
                    rt.segStartP.set(ov2[pv * 3], ov2[pv * 3 + 1], ov2[pv * 3 + 2]);
                    rt.segEndP.set(ov2[f.vIdx * 3], ov2[f.vIdx * 3 + 1], ov2[f.vIdx * 3 + 2]);
                    rt.leftSegLen = f.p.distanceTo(f.targetP) || 1;
                    rt.curVIdx = f.vIdx;
                }
                // t = how far the left friend has travelled on this edge (0→1)
                const leftRemaining = f.p.distanceTo(f.targetP);
                const t = Math.max(0, Math.min(1, 1 - leftRemaining / rt.leftSegLen));
                rt.p.lerpVectors(rt.segStartP, rt.segEndP, t);
                rt.sphere.position.copy(rt.p);
                updateTrail(rt, rt.p);
            }
        });

        if (tick % 120 === 0) cleanup();
    }

    frame();

    // --- PCB commands ---
    const _origRun = pcb.run.bind(pcb);
    pcb.run = function (src) {
        const cmd = src.trim();
        if (cmd === 'trails.clear') {
            for (const [, d] of leftTrails.entries())  { d.points = []; d.line.geometry.setDrawRange(0, 0); }
            for (const [, d] of rightTrails.entries()) { d.points = []; d.line.geometry.setDrawRange(0, 0); }
            pcb.log('FRIEND_TRAILS: cleared');
            return;
        }
        _origRun(src);
    };

    pcb.log('PGM: FRIEND_TRAILS loaded. both manifolds. cmd: trails.clear');

})();
