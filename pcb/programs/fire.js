// FIRE — classic fire simulation on heat buffer, bottom row sparks, heat rises
// The manifold becomes a flame — geometry deforms upward with turbulence
// PCB: fire.start / fire.stop / fire.inferno / fire.cool
(function () {
    const W = 32, N = W * W;
    let running = false, timer = null;
    let intensity = 200;

    const canvas = document.createElement('canvas');
    canvas.width = W * 4; canvas.height = W * 4;
    canvas.style.cssText = 'display:block;background:#000;border:1px solid #222;margin-bottom:4px;image-rendering:pixelated;';
    const ctx = canvas.getContext('2d');

    // fire palette: black → red → orange → yellow → white
    const palette = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let r = Math.min(255, i * 3);
        let g = Math.max(0, Math.min(255, i * 2 - 100));
        let b = Math.max(0, Math.min(255, i * 3 - 220));
        palette[i] = 0xff000000 | (b << 16) | (g << 8) | r;
    }

    function step() {
        if (heat.length !== N) return;
        // spark bottom row
        for (let x = 0; x < W; x++) {
            if (Math.random() < 0.6) heat[(W-1)*W + x] = intensity * (0.7 + Math.random() * 0.3);
        }
        // propagate upward with cooling
        const next = new Float32Array(N);
        for (let y = 0; y < W - 1; y++) {
            for (let x = 0; x < W; x++) {
                const ox = (x + Math.floor(Math.random() * 3) - 1 + W) % W;
                next[y * W + x] = heat[(y + 1) * W + ox] * (0.94 - Math.random() * 0.04);
            }
        }
        // bottom row stays hot
        for (let x = 0; x < W; x++) next[(W-1)*W+x] = heat[(W-1)*W+x];
        for (let i = 0; i < N; i++) heat[i] = next[i];

        // render to canvas
        const img = ctx.createImageData(W, W);
        const dv = new DataView(img.data.buffer);
        for (let i = 0; i < N; i++) {
            const v = Math.min(255, Math.floor(heat[i] / intensity * 255));
            dv.setUint32(i * 4, palette[v], true);
        }
        ctx.putImageData(img, 0, 0);
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
    }

    function loop() { if (!running) return; step(); timer = setTimeout(loop, 30); }
    function start() { if (!running) { running = true; loop(); } }
    function stop()  { running = false; clearTimeout(timer); }

    // double-buffer canvas trick — resize after drawing
    canvas.width = W; canvas.height = W;
    Object.assign(canvas.style, {width: (W*4)+'px', height: (W*4)+'px'});

    const mod = document.createElement('div');
    mod.className = 'module'; mod.id = 'pgm-fire';
    mod.innerHTML = '<h3>FIRE_SIM</h3>';
    mod.appendChild(canvas);
    const row = document.createElement('div'); row.style.cssText='display:flex;gap:3px;';
    [['START',start],['STOP',stop],['INFERNO',()=>{intensity=400;pcb.log('FIRE: INFERNO');}],['COOL',()=>{intensity=80;pcb.log('FIRE: cool');}]].forEach(([l,fn])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=l;b.style.fontSize='7px';b.onclick=fn;row.appendChild(b);
    });
    mod.appendChild(row);
    document.getElementById('sidebar').insertBefore(mod, document.getElementById('sidebar').firstChild);

    const _orig = pcb.run.bind(pcb);
    pcb.run = function(src) {
        const cmd = src.trim();
        if (cmd==='fire.start')   { start(); pcb.log('FIRE: burning'); return; }
        if (cmd==='fire.stop')    { stop();  pcb.log('FIRE: extinguished'); return; }
        if (cmd==='fire.inferno') { intensity=400; pcb.log('FIRE: INFERNO'); return; }
        if (cmd==='fire.cool')    { intensity=80;  pcb.log('FIRE: cooling'); return; }
        _orig(src);
    };

    pcb.log('PGM: FIRE loaded. build manifold, then fire.start');
})();
