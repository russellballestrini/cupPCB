// WAVE_INTERFERENCE — multiple oscillating point sources superposed onto heat buffer
// Creates moiré / standing wave patterns on the manifold
// PCB: wave.start / wave.stop / wave.sources N / wave.chaos
(function () {
    const W = 32, N = W * W;
    let running = false, timer = null, t = 0;
    let sources = [
        { x: 8,  y: 8,  freq: 1.0, amp: 150 },
        { x: 24, y: 8,  freq: 1.3, amp: 150 },
        { x: 16, y: 24, freq: 0.7, amp: 150 },
    ];

    function step() {
        t += 0.05;
        if (heat.length !== N) return;
        for (let i = 0; i < N; i++) {
            const vx = i % W, vy = Math.floor(i / W);
            let val = 0;
            for (const s of sources) {
                const d = Math.sqrt((vx-s.x)**2 + (vy-s.y)**2);
                val += s.amp * Math.sin(d * 0.8 - t * s.freq * 3);
            }
            heat[i] = val + sources.length * 50;
        }
    }

    function loop() { if (!running) return; step(); timer = setTimeout(loop, 30); }
    function start() { if (!running) { running = true; loop(); } }
    function stop()  { running = false; clearTimeout(timer); }

    function chaos() {
        sources = Array.from({length: 5}, () => ({
            x: Math.random() * W, y: Math.random() * W,
            freq: 0.3 + Math.random() * 2, amp: 80 + Math.random() * 120
        }));
        document.getElementById('wave-n').textContent = sources.length;
    }

    const canvas = document.createElement('canvas');
    canvas.width = W * 4; canvas.height = W * 4;
    canvas.style.cssText = 'display:block;background:#000;border:1px solid #222;margin-bottom:4px;image-rendering:pixelated;';
    const ctx = canvas.getContext('2d');

    // mini preview of wave pattern
    function renderPreview() {
        if (!running) return;
        const img = ctx.createImageData(W, W);
        for (let i = 0; i < N; i++) {
            const v = Math.floor(Math.max(0, Math.min(255, (heat[i] / 300) * 255)));
            img.data[i*4]   = 0;
            img.data[i*4+1] = v >> 1;
            img.data[i*4+2] = v;
            img.data[i*4+3] = 255;
        }
        createImageBitmap(img).then(bm => { ctx.drawImage(bm, 0, 0, canvas.width, canvas.height); });
        requestAnimationFrame(renderPreview);
    }

    const mod = document.createElement('div');
    mod.className = 'module'; mod.id = 'pgm-wave';
    mod.innerHTML = '<h3>WAVE_INTERFERENCE</h3>';
    mod.appendChild(canvas);
    const row = document.createElement('div'); row.style.cssText='display:flex;gap:3px;margin-bottom:3px;';
    [['START',()=>{start();renderPreview();}],['STOP',stop],['CHAOS',chaos]].forEach(([l,fn])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=l;b.onclick=fn;row.appendChild(b);
    });
    mod.appendChild(row);
    const info=document.createElement('div');
    info.style.cssText='font-size:8px;color:#555;';
    info.innerHTML='SOURCES:<span id="wave-n" style="color:#00eeff">3</span>';
    mod.appendChild(info);
    document.getElementById('sidebar').insertBefore(mod, document.getElementById('sidebar').firstChild);

    const _orig = pcb.run.bind(pcb);
    pcb.run = function(src) {
        const cmd = src.trim();
        if (cmd==='wave.start') { start(); renderPreview(); pcb.log('WAVE: running'); return; }
        if (cmd==='wave.stop')  { stop(); pcb.log('WAVE: stopped'); return; }
        if (cmd==='wave.chaos') { chaos(); pcb.log('WAVE: chaos '+sources.length+' sources'); return; }
        const m = cmd.match(/^wave\.sources (\d+)$/);
        if (m) {
            const n = Math.max(1, Math.min(8, parseInt(m[1])));
            sources = Array.from({length:n}, (_,i)=>({x:8+(i*5)%W, y:8+(i*7)%W, freq:0.5+i*0.3, amp:150}));
            document.getElementById('wave-n').textContent = n;
            pcb.log('WAVE: '+n+' sources'); return;
        }
        _orig(src);
    };

    pcb.log('PGM: WAVE_INTERFERENCE loaded. build manifold, then wave.start');
})();
