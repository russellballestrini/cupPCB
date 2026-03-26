// REACTION_DIFFUSION — Gray-Scott model on manifold adjacency graph
// B concentration → heat buffer → manifold deformation
// PCB: rd.start / rd.stop / rd.reset / rd.spots / rd.stripes / rd.mitosis
(function () {
    const W = 32, N = W * W;
    let A = new Float32Array(N).fill(1);
    let B = new Float32Array(N);
    let running = false, timer = null;
    let f = 0.055, k = 0.062;

    function seed() {
        A.fill(1); B.fill(0);
        for (let i = 13; i < 19; i++)
            for (let j = 13; j < 19; j++)
                { B[i*W+j] = 1; A[i*W+j] = 0; }
    }
    seed();

    function step() {
        const nA = new Float32Array(N), nB = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            const nb = (adjacency && adjacency[i]) || [];
            let lapA = 0, lapB = 0;
            for (const n of nb) { lapA += A[n] - A[i]; lapB += B[n] - B[i]; }
            if (nb.length) { lapA /= nb.length; lapB /= nb.length; }
            const a = A[i], b = B[i], abb = a * b * b;
            nA[i] = Math.max(0, Math.min(1, a + 1.0 * lapA - abb + f * (1 - a)));
            nB[i] = Math.max(0, Math.min(1, b + 0.5 * lapB + abb - (k + f) * b));
        }
        A = nA; B = nB;
        if (heat.length === N) for (let i = 0; i < N; i++) heat[i] = B[i] * 300;
    }

    function loop() { if (!running) return; step(); step(); timer = setTimeout(loop, 30); }
    function start() { if (!running) { running = true; loop(); } }
    function stop()  { running = false; clearTimeout(timer); }

    // sidebar
    const mod = document.createElement('div');
    mod.className = 'module'; mod.id = 'pgm-rd';
    mod.innerHTML = [
        '<h3>REACTION_DIFFUSION</h3>',
        '<div style="display:flex;gap:3px;">',
        '<button class="btn" id="rd-start">RUN</button>',
        '<button class="btn" id="rd-stop">STOP</button>',
        '<button class="btn" id="rd-reset">RST</button>',
        '</div>',
        '<div style="margin-top:5px;display:flex;gap:3px;flex-wrap:wrap;">',
        '<button class="btn" id="rd-spots" style="font-size:7px;">SPOTS</button>',
        '<button class="btn" id="rd-stripes" style="font-size:7px;">STRIPES</button>',
        '<button class="btn" id="rd-mitosis" style="font-size:7px;">MITOSIS</button>',
        '</div>',
        '<div style="margin-top:4px;font-size:8px;color:#555;">f:<span id="rd-f" style="color:#ffd700">0.055</span> k:<span id="rd-k" style="color:#ffd700">0.062</span></div>',
    ].join('');
    document.getElementById('sidebar').insertBefore(mod, document.getElementById('sidebar').firstChild);

    document.getElementById('rd-start').onclick  = () => { start(); pcb.log('RD: running'); };
    document.getElementById('rd-stop').onclick   = () => { stop();  pcb.log('RD: stopped'); };
    document.getElementById('rd-reset').onclick  = () => { stop(); seed(); pcb.log('RD: reset'); };
    document.getElementById('rd-spots').onclick  = () => { stop(); f=0.055; k=0.062; seed(); document.getElementById('rd-f').textContent=f; document.getElementById('rd-k').textContent=k; start(); };
    document.getElementById('rd-stripes').onclick= () => { stop(); f=0.037; k=0.060; seed(); document.getElementById('rd-f').textContent=f; document.getElementById('rd-k').textContent=k; start(); };
    document.getElementById('rd-mitosis').onclick= () => { stop(); f=0.028; k=0.053; seed(); document.getElementById('rd-f').textContent=f; document.getElementById('rd-k').textContent=k; start(); };

    const _orig = pcb.run.bind(pcb);
    pcb.run = function(src) {
        const cmd = src.trim();
        if (cmd==='rd.start')   { start(); pcb.log('RD: running'); return; }
        if (cmd==='rd.stop')    { stop();  pcb.log('RD: stopped'); return; }
        if (cmd==='rd.reset')   { stop(); seed(); pcb.log('RD: reset'); return; }
        if (cmd==='rd.spots')   { stop(); f=0.055; k=0.062; seed(); start(); return; }
        if (cmd==='rd.stripes') { stop(); f=0.037; k=0.060; seed(); start(); return; }
        if (cmd==='rd.mitosis') { stop(); f=0.028; k=0.053; seed(); start(); return; }
        _orig(src);
    };

    pcb.log('PGM: REACTION_DIFFUSION loaded. build manifold first, then rd.spots');
})();
