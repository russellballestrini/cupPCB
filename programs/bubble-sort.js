// BUBBLE_SORT — ARK kernel program
// Injects sidebar module + PCB commands into the running kernel.
// Kernel globals in scope: pcb, scene, heat, adjacency, flickerRate, wobbleBase, friendList

(function () {

    // --- sidebar module (kernel CSS applies: .module, .btn, h3) ---
    const sidebar = document.getElementById('sidebar');
    const mod = document.createElement('div');
    mod.className = 'module';
    mod.id = 'pgm-bubble-sort';
    mod.innerHTML = [
        '<h3>BUBBLE_SORT</h3>',
        '<div id="bs-bars" style="display:flex;align-items:flex-end;gap:1px;height:56px;',
            'background:#000;border:1px solid #222;padding:2px;margin-bottom:5px;"></div>',
        '<div style="display:flex;gap:3px;">',
            '<button class="btn" id="bs-run">RUN</button>',
            '<button class="btn" id="bs-step">STEP</button>',
            '<button class="btn" id="bs-reset">RST</button>',
        '</div>',
        '<div style="margin-top:4px;font-size:8px;color:#555;">',
            'CMP:<span id="bs-cmp" style="color:#ffd700">0</span> ',
            'SWP:<span id="bs-swap" style="color:#ffd700">0</span>',
        '</div>',
    ].join('');
    sidebar.insertBefore(mod, sidebar.firstChild);

    // --- sort engine ---
    let arr, steps, idx, running, timer, cmp, swaps;

    function rand(n) {
        return Array.from({ length: n }, () => Math.floor(Math.random() * 95) + 5);
    }

    function precompute(a) {
        const s = [], n = a.length; let b = [...a];
        for (let i = 0; i < n - 1; i++) {
            let sw = false;
            for (let j = 0; j < n - i - 1; j++) {
                s.push({ type: 'cmp',  j, arr: [...b], sf: n - i });
                if (b[j] > b[j + 1]) {
                    [b[j], b[j + 1]] = [b[j + 1], b[j]];
                    sw = true;
                    s.push({ type: 'swap', j, arr: [...b], sf: n - i });
                }
            }
            if (!sw) { s.push({ type: 'done', arr: [...b], sf: 0 }); return s; }
        }
        s.push({ type: 'done', arr: [...b], sf: 0 });
        return s;
    }

    function render(a, step) {
        const el = document.getElementById('bs-bars');
        if (!el) return;
        const mx = Math.max(...a);
        el.innerHTML = '';
        a.forEach((v, i) => {
            const d = document.createElement('div');
            d.style.flex = '1';
            d.style.minWidth = '2px';
            d.style.borderRadius = '1px 1px 0 0';
            d.style.height = Math.max(2, (v / mx) * 52) + 'px';
            let color = '#444';
            if (step) {
                if ((step.type === 'cmp' || step.type === 'swap') && (i === step.j || i === step.j + 1))
                    color = step.type === 'swap' ? '#ffd700' : '#ff6820';
                else if (step.sf !== undefined && i >= step.sf) color = '#68ff9a';
                if (step.type === 'done') color = '#68ff9a';
            }
            d.style.background = color;
            el.appendChild(d);
        });
    }

    function applyStep(s) {
        render(s.arr, s);
        if (s.type === 'cmp')  { cmp++;   document.getElementById('bs-cmp').textContent  = cmp; }
        if (s.type === 'swap') { swaps++;  document.getElementById('bs-swap').textContent = swaps; }
        if (s.type === 'done') { running = false; pcb.log('BUBBLE_SORT: DONE. CMP=' + cmp + ' SWP=' + swaps); }
    }

    function reset() {
        clearTimeout(timer); running = false;
        arr = rand(24); steps = precompute(arr); idx = 0; cmp = 0; swaps = 0;
        document.getElementById('bs-cmp').textContent  = '0';
        document.getElementById('bs-swap').textContent = '0';
        render(arr, null);
        pcb.log('BUBBLE_SORT: RESET');
    }

    function tick() {
        if (!running || idx >= steps.length) { running = false; return; }
        applyStep(steps[idx++]);
        if (running) timer = setTimeout(tick, 40);
    }

    document.getElementById('bs-run').onclick   = () => { if (idx >= steps.length) reset(); running = true; tick(); };
    document.getElementById('bs-step').onclick  = () => { if (idx < steps.length) applyStep(steps[idx++]); };
    document.getElementById('bs-reset').onclick = reset;

    // --- PCB command hooks ---
    const _origRun = pcb.run.bind(pcb);
    pcb.run = function (src) {
        const cmd = src.trim();
        if (cmd === 'sort.run')   { if (idx >= steps.length) reset(); running = true; tick(); return; }
        if (cmd === 'sort.reset') { reset(); return; }
        if (cmd === 'sort.heat')  {
            // bubble sort the manifold heat buffer in-place, one swap per frame
            (function () {
                var a = [...heat], i = 0, j = 0, n = a.length;
                var id = setInterval(function () {
                    if (i >= n - 1) { clearInterval(id); heat = a; pcb.log('SORT.HEAT: DONE'); return; }
                    if (j < n - i - 1) { if (a[j] > a[j + 1]) { var t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; } j++; }
                    else { j = 0; i++; }
                    heat = a;
                }, 16);
            })();
            pcb.log('SORT.HEAT: sorting manifold heat buffer...');
            return;
        }
        _origRun(src);
    };

    reset();
    pcb.log('PGM: BUBBLE_SORT loaded. cmds: sort.run / sort.heat / sort.reset');

})();
