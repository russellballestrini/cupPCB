// MOAD_DEMO — Mother Of All Defects: patched vs unpatched, animated
// CWE-407: POCKET.contains = Array.includes O(n) per call — O(n²) total
//          KNOT.contains   = Set.has       O(1) per call — O(n)   total
// Two independent charts. Each auto-scales. Shape is the story.
// POCKET cost climbs. KNOT cost stays flat. That is the defect.
// Kernel globals in scope: pcb, scene, heat, adjacency, flickerRate, wobbleBase, friendList

(function () {

    const sidebar = document.getElementById('sidebar');
    const mod = document.createElement('div');
    mod.className = 'module';
    mod.id = 'pgm-moad-demo';
    mod.innerHTML = [
        '<h3>MOAD DEMO</h3>',

        // legend
        '<div style="display:flex;gap:8px;font-size:8px;margin-bottom:3px;">',
            '<span style="color:#ff4400;">&#9632; POCKET unpatched O(n\xb2)</span>',
            '<span style="color:#68ff9a;">&#9632; KNOT patched O(n)</span>',
        '</div>',

        // single chart — grouped bars, same scale
        '<div style="font-size:7px;color:#555;margin-bottom:2px;">cost per contains() call — each pair = one step</div>',
        '<canvas id="moad-pocket-canvas" height="72"',
            ' style="display:block;width:100%;background:#000;border:1px solid #222;margin-bottom:4px;"></canvas>',

        // stats
        '<div id="moad-stats" style="font-size:9px;color:#ffd700;font-family:Courier New,monospace;',
            'white-space:pre;margin:5px 0 4px;min-height:44px;">',
            'n=0\nPOCKET: 0.000ms total\nKNOT:   0.000ms total',
        '</div>',

        // controls
        '<div style="display:flex;gap:3px;margin-bottom:5px;">',
            '<button class="btn" id="moad-run">RUN</button>',
            '<button class="btn" id="moad-pause">PAUSE</button>',
            '<button class="btn" id="moad-reset">RST</button>',
        '</div>',

        '<div style="font-size:8px;color:#666;margin-bottom:1px;">speed: <span id="moad-speed-label">20</span> steps/frame</div>',
        '<input type="range" id="moad-speed" min="1" max="100" value="20"',
            ' style="width:100%;margin-bottom:4px;accent-color:#ffd700;">',
        '<div style="font-size:8px;color:#666;margin-bottom:1px;">N max: <span id="moad-n-label">2000</span></div>',
        '<input type="range" id="moad-nmax" min="200" max="8000" step="100" value="2000"',
            ' style="width:100%;accent-color:#ffd700;">',
    ].join('');
    sidebar.insertBefore(mod, sidebar.firstChild);

    // --- canvases ---
    function fitCanvas(id) {
        const c = document.getElementById(id);
        c.width = c.parentElement.clientWidth || 100;
        return c;
    }
    const pocketCanvas = fitCanvas('moad-pocket-canvas');
    const pCtx = pocketCanvas.getContext('2d');

    // --- state ---
    let pocket      = [];
    let knot        = new Set();
    let n           = 0;
    let pTotal      = 0;
    let kTotal      = 0;
    let pHistory    = [];   // cost per sample point
    let kHistory    = [];
    let running     = false;
    let paused      = false;
    let rafId       = null;

    const speedSlider = document.getElementById('moad-speed');
    const speedLabel  = document.getElementById('moad-speed-label');
    const nmaxSlider  = document.getElementById('moad-nmax');
    const nmaxLabel   = document.getElementById('moad-n-label');
    const statsEl     = document.getElementById('moad-stats');

    speedSlider.oninput = () => { speedLabel.textContent = speedSlider.value; };
    nmaxSlider.oninput  = () => { nmaxLabel.textContent  = nmaxSlider.value; };

    // --- draw grouped bars: POCKET (red) and KNOT (green) offset side by side per step ---
    function drawGrouped(ctx, pH, kH) {
        const W = ctx.canvas.width;
        const H = ctx.canvas.height;
        ctx.clearRect(0, 0, W, H);
        const len = pH.length;
        if (len === 0) return;

        const maxVal = Math.max(...pH, ...kH, 0.0001);
        const groupW = W / len;
        const barW   = Math.max(1, (groupW / 2) - 1);

        for (let i = 0; i < len; i++) {
            const x = i * groupW;

            // POCKET bar (left of pair)
            const ph = Math.max(1, (pH[i] / maxVal) * (H - 2));
            ctx.fillStyle = '#ff4400';
            ctx.fillRect(x, H - ph, barW, ph);

            // KNOT bar (right of pair, offset by barW+1)
            const kh = Math.max(1, (kH[i] / maxVal) * (H - 2));
            ctx.fillStyle = '#68ff9a';
            ctx.fillRect(x + barW + 1, H - kh, barW, kh);
        }

        // scale label
        ctx.fillStyle = '#444';
        ctx.font = '7px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(maxVal.toFixed(3) + 'ms', W - 2, 9);
    }

    // --- step ---
    function step(stepsPerFrame) {
        const nmax = parseInt(nmaxSlider.value, 10);

        for (let s = 0; s < stepsPerFrame && n < nmax; s++) {
            // POCKET defect: O(n) scan
            const t0 = performance.now();
            pocket.includes(n);
            pocket.push(n);
            const pCost = performance.now() - t0;

            // KNOT fix: O(1) hash
            const t1 = performance.now();
            knot.has(n);
            knot.add(n);
            const kCost = performance.now() - t1;

            pTotal += pCost;
            kTotal += kCost;
            n++;

            // sample every 20 steps — fill chart width evenly
            if (n % 20 === 0) {
                pHistory.push(pCost);
                kHistory.push(kCost);
            }
        }

        drawGrouped(pCtx, pHistory, kHistory);

        // heat spike on manifold proportional to defect cost
        if (typeof heat !== 'undefined' && heat.length > 0 && n % 40 === 0) {
            const idx = Math.floor(Math.random() * heat.length);
            heat[idx] = Math.min((heat[idx] || 0) + 0.3, 2.0);
        }

        statsEl.textContent =
            'n=' + n + '\n' +
            'POCKET: ' + pTotal.toFixed(3) + 'ms total\n' +
            'KNOT:   ' + kTotal.toFixed(3) + 'ms total' +
            (kTotal > 0.001 ? '\nratio:  ' + (pTotal / kTotal).toFixed(1) + 'x' : '');

        if (n >= nmax) {
            running = false;
            pcb.log('MOAD_DEMO: DONE n=' + n +
                ' POCKET=' + pTotal.toFixed(3) + 'ms' +
                ' KNOT='   + kTotal.toFixed(3) + 'ms' +
                ' ratio='  + (pTotal / kTotal).toFixed(1) + 'x');
        }
    }

    function loop() {
        if (!running || paused) return;
        step(parseInt(speedSlider.value, 10));
        if (running) rafId = requestAnimationFrame(loop);
    }

    function start() {
        if (running && !paused) return;
        if (paused) {
            paused = false;
            document.getElementById('moad-pause').textContent = 'PAUSE';
            rafId = requestAnimationFrame(loop);
            return;
        }
        running = true; paused = false;
        rafId = requestAnimationFrame(loop);
    }

    function pause() {
        paused = !paused;
        document.getElementById('moad-pause').textContent = paused ? 'RESUME' : 'PAUSE';
        if (!paused && running) rafId = requestAnimationFrame(loop);
    }

    function reset() {
        running = false; paused = false;
        cancelAnimationFrame(rafId);
        pocket = []; knot = new Set();
        n = 0; pTotal = 0; kTotal = 0;
        pHistory = []; kHistory = [];
        statsEl.textContent = 'n=0\nPOCKET: 0.000ms total\nKNOT:   0.000ms total';
        document.getElementById('moad-pause').textContent = 'PAUSE';
        pCtx.clearRect(0, 0, pocketCanvas.width, pocketCanvas.height);
        pcb.log('MOAD_DEMO: RESET');
    }

    document.getElementById('moad-run').onclick   = start;
    document.getElementById('moad-pause').onclick = pause;
    document.getElementById('moad-reset').onclick = reset;

    const _origRun = pcb.run.bind(pcb);
    pcb.run = function (src) {
        const cmd = src.trim();
        if (cmd === 'moad.run')   { start(); return; }
        if (cmd === 'moad.pause') { pause(); return; }
        if (cmd === 'moad.reset') { reset(); return; }
        _origRun(src);
    };

    pcb.log('PGM: MOAD_DEMO loaded. cmds: moad.run / moad.pause / moad.reset');

})();
