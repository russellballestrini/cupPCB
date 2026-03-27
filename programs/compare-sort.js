// COMPARE_SORT — broken vs working bubble sort, side by side in lockstep
// Broken:  j < n - i     — one step too far, comparison enters sorted zone
// Working: j < n - i - 1 — correct bound, stops at boundary
// Based on unworkbench.com/programs/bubble-sort.js and test/broken_test.py
// Kernel globals in scope: pcb, scene, heat, adjacency, flickerRate, wobbleBase, friendList

(function () {

    const sidebar = document.getElementById('sidebar');
    const mod = document.createElement('div');
    mod.className = 'module';
    mod.id = 'pgm-compare-sort';
    mod.innerHTML = [
        '<h3>COMPARE SORT</h3>',

        '<div style="display:flex;gap:4px;margin-bottom:3px;">',

            // broken
            '<div style="flex:1;">',
                '<div style="font-size:7px;color:#ff4400;margin-bottom:2px;">BROKEN  j &lt; n-i</div>',
                '<div id="cs-broken-bars" style="display:flex;align-items:flex-end;gap:1px;height:52px;',
                    'background:#000;border:1px solid #331100;padding:2px;"></div>',
                '<div style="font-size:7px;color:#555;margin-top:2px;">',
                    'CMP:<span id="cs-bcmp" style="color:#ffd700;">0</span> ',
                    'SWP:<span id="cs-bswap" style="color:#ffd700;">0</span>',
                '</div>',
            '</div>',

            // working
            '<div style="flex:1;">',
                '<div style="font-size:7px;color:#68ff9a;margin-bottom:2px;">WORKING j &lt; n-i-1</div>',
                '<div id="cs-working-bars" style="display:flex;align-items:flex-end;gap:1px;height:52px;',
                    'background:#000;border:1px solid #003311;padding:2px;"></div>',
                '<div style="font-size:7px;color:#555;margin-top:2px;">',
                    'CMP:<span id="cs-wcmp" style="color:#ffd700;">0</span> ',
                    'SWP:<span id="cs-wswap" style="color:#ffd700;">0</span>',
                '</div>',
            '</div>',

        '</div>',

        '<div style="display:flex;gap:3px;margin-top:4px;">',
            '<button class="btn" id="cs-run">RUN</button>',
            '<button class="btn" id="cs-step">STEP</button>',
            '<button class="btn" id="cs-reset">RST</button>',
        '</div>',

        '<div style="font-size:7px;color:#444;margin-top:4px;">',
            'orange = comparing &nbsp; gold = swap &nbsp; ',
            '<span style="color:#68ff9a;">green = sorted</span>',
        '</div>',
    ].join('');
    sidebar.insertBefore(mod, sidebar.firstChild);

    // --- precompute steps for one variant ---
    // bound: 'broken' uses j < n-i, 'working' uses j < n-i-1
    function precompute(a, variant) {
        const s = [], n = a.length; let b = [...a];
        for (let i = 0; i < n - 1; i++) {
            let sw = false;
            // broken goes one too far: j < n-i  →  last j = n-i-1, accesses b[n-i] (sorted zone)
            // working stops correctly: j < n-i-1 →  last j = n-i-2
            const limit = variant === 'broken' ? n - i : n - i - 1;
            for (let j = 0; j < limit; j++) {
                const inSorted = j >= n - i - 1; // true when broken cursor is in sorted zone
                s.push({ type: 'cmp', j, arr: [...b], sf: n - i, inSorted });
                const right = b[j + 1]; // undefined when j = n-i-1 in broken variant
                if (right !== undefined && b[j] > right) {
                    [b[j], b[j + 1]] = [b[j + 1], b[j]];
                    sw = true;
                    s.push({ type: 'swap', j, arr: [...b], sf: n - i, inSorted });
                }
            }
            if (!sw) { s.push({ type: 'done', arr: [...b], sf: 0, inSorted: false }); return s; }
        }
        s.push({ type: 'done', arr: [...b], sf: 0, inSorted: false });
        return s;
    }

    function renderBars(containerId, a, step) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const mx = Math.max(...a.filter(v => v !== undefined));
        el.innerHTML = '';
        a.forEach((v, i) => {
            const d = document.createElement('div');
            d.style.flex = '1';
            d.style.minWidth = '2px';
            d.style.borderRadius = '1px 1px 0 0';
            d.style.height = (v !== undefined ? Math.max(2, (v / mx) * 48) : 2) + 'px';
            let color = '#444';
            if (step) {
                if (step.type === 'done') {
                    color = '#68ff9a';
                } else if (i >= step.sf) {
                    color = '#68ff9a'; // sorted zone
                } else if (i === step.j || i === step.j + 1) {
                    if (step.inSorted && i >= step.sf - 1) {
                        color = '#ff0000'; // defect: comparison in sorted zone — bright red
                    } else {
                        color = step.type === 'swap' ? '#ffd700' : '#ff6820';
                    }
                }
            }
            d.style.background = color;
            el.appendChild(d);
        });
    }

    // --- state ---
    let arr, brokenSteps, workingSteps, idx, running, timer, bcmp, bswap, wcmp, wswap;

    function rand(n) {
        return Array.from({ length: n }, () => Math.floor(Math.random() * 95) + 5);
    }

    function reset() {
        clearTimeout(timer); running = false;
        arr = rand(20);
        brokenSteps  = precompute([...arr], 'broken');
        workingSteps = precompute([...arr], 'working');
        idx = 0; bcmp = 0; bswap = 0; wcmp = 0; wswap = 0;
        ['cs-bcmp','cs-bswap','cs-wcmp','cs-wswap'].forEach(id => {
            document.getElementById(id).textContent = '0';
        });
        renderBars('cs-broken-bars',  arr, null);
        renderBars('cs-working-bars', arr, null);
        pcb.log('COMPARE_SORT: RESET');
    }

    function applyStep() {
        const bs = brokenSteps[idx];
        const ws = workingSteps[idx] || workingSteps[workingSteps.length - 1];

        renderBars('cs-broken-bars',  bs.arr, bs);
        renderBars('cs-working-bars', ws.arr, ws);

        if (bs.type === 'cmp')  { bcmp++;  document.getElementById('cs-bcmp').textContent  = bcmp; }
        if (bs.type === 'swap') { bswap++; document.getElementById('cs-bswap').textContent = bswap; }
        if (ws.type === 'cmp')  { wcmp++;  document.getElementById('cs-wcmp').textContent  = wcmp; }
        if (ws.type === 'swap') { wswap++; document.getElementById('cs-wswap').textContent = wswap; }

        if (bs.type === 'done') {
            running = false;
            pcb.log('COMPARE_SORT: DONE.' +
                ' BROKEN CMP=' + bcmp + ' SWP=' + bswap +
                ' WORKING CMP=' + wcmp + ' SWP=' + wswap);
        }
        idx++;
    }

    function tick() {
        if (!running || idx >= brokenSteps.length) { running = false; return; }
        applyStep();
        if (running) timer = setTimeout(tick, 60);
    }

    document.getElementById('cs-run').onclick   = () => { if (idx >= brokenSteps.length) reset(); running = true; tick(); };
    document.getElementById('cs-step').onclick  = () => { if (idx < brokenSteps.length) applyStep(); };
    document.getElementById('cs-reset').onclick = reset;

    // --- PCB commands ---
    const _origRun = pcb.run.bind(pcb);
    pcb.run = function (src) {
        const cmd = src.trim();
        if (cmd === 'csort.run')   { if (idx >= brokenSteps.length) reset(); running = true; tick(); return; }
        if (cmd === 'csort.step')  { if (idx < brokenSteps.length) applyStep(); return; }
        if (cmd === 'csort.reset') { reset(); return; }
        _origRun(src);
    };

    reset();
    pcb.log('PGM: COMPARE_SORT loaded. cmds: csort.run / csort.step / csort.reset');

})();
