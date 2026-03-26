// FLOW_FIELD — smooth noise flow field continuously deforms heat buffer
// Organic turbulence. Particles stream along vector field, leave heat trails.
// PCB: flow.start / flow.stop / flow.speed X / flow.vortex / flow.calm
(function () {
    const W = 32, N = W * W;
    let running = false, timer = null, t = 0;
    let speed = 1.0;
    let particles = Array.from({length: 60}, () => ({
        x: Math.random() * W, y: Math.random() * W, life: Math.random()
    }));

    // smooth noise via value noise with bilinear interpolation
    const noiseGrid = Array.from({length:17}, ()=>Array.from({length:17}, ()=>Math.random()*Math.PI*4));
    function noise(x, y, z) {
        const ix=Math.floor(x)&15, iy=Math.floor(y)&15, iz=Math.floor(z)&15;
        const fx=x-Math.floor(x), fy=y-Math.floor(y);
        const s=t=>t*t*(3-2*t);
        const lerp=(a,b,t)=>a+(b-a)*t;
        const n00=noiseGrid[ix][iy]+iz, n10=noiseGrid[ix+1][iy]+iz;
        const n01=noiseGrid[ix][iy+1]+iz, n11=noiseGrid[ix+1][iy+1]+iz;
        return lerp(lerp(Math.sin(n00),Math.sin(n10),s(fx)),lerp(Math.sin(n01),Math.sin(n11),s(fx)),s(fy));
    }

    const canvas = document.createElement('canvas');
    canvas.width = W * 4; canvas.height = W * 4;
    canvas.style.cssText = 'display:block;background:#000;border:1px solid #222;margin-bottom:4px;image-rendering:pixelated;';
    const ctx2 = canvas.getContext('2d');
    ctx2.fillStyle = '#000'; ctx2.fillRect(0,0,canvas.width,canvas.height);

    function step() {
        t += 0.008 * speed;

        // decay heat
        if (heat.length === N) {
            for (let i = 0; i < N; i++) heat[i] *= 0.97;
        }

        // dim canvas
        ctx2.fillStyle='rgba(0,0,0,0.15)'; ctx2.fillRect(0,0,canvas.width,canvas.height);

        // move particles along flow field
        for (const p of particles) {
            const angle = noise(p.x * 0.3, p.y * 0.3, t) * Math.PI * 2;
            p.x += Math.cos(angle) * 0.4 * speed;
            p.y += Math.sin(angle) * 0.4 * speed;
            p.life -= 0.005;

            if (p.x < 0 || p.x >= W || p.y < 0 || p.y >= W || p.life <= 0) {
                p.x = Math.random() * W; p.y = Math.random() * W; p.life = 0.5 + Math.random() * 0.5;
            }

            // inject heat at particle position
            const gi = Math.floor(p.y) * W + Math.floor(p.x);
            if (heat.length === N && gi >= 0 && gi < N) heat[gi] = Math.min((heat[gi]||0) + 25, 300);

            // draw particle
            const px = p.x * 4, py = p.y * 4;
            const hue = (angle / Math.PI / 2 * 360 + 200) % 360;
            ctx2.fillStyle = `hsla(${hue},100%,60%,${p.life})`;
            ctx2.fillRect(Math.floor(px), Math.floor(py), 2, 2);
        }
    }

    function loop() { if (!running) return; step(); timer = setTimeout(loop, 30); }
    function start() { if (!running) { running = true; loop(); } }
    function stop()  { running = false; clearTimeout(timer); }

    const mod = document.createElement('div');
    mod.className = 'module'; mod.id = 'pgm-flow';
    mod.innerHTML = '<h3>FLOW_FIELD</h3>';
    mod.appendChild(canvas);
    const row1=document.createElement('div'); row1.style.cssText='display:flex;gap:3px;margin-bottom:3px;';
    const row2=document.createElement('div'); row2.style.cssText='display:flex;gap:3px;';
    [['START',start],['STOP',stop]].forEach(([l,fn])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=l;b.onclick=fn;row1.appendChild(b);
    });
    [['CALM',()=>{speed=0.3;pcb.log('FLOW: calm');}],['STORM',()=>{speed=3.0;pcb.log('FLOW: storm');}],['VORTEX',()=>{speed=0.1;t+=5;pcb.log('FLOW: vortex');}]].forEach(([l,fn])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=l;b.style.fontSize='7px';b.onclick=fn;row2.appendChild(b);
    });
    mod.appendChild(row1); mod.appendChild(row2);
    document.getElementById('sidebar').insertBefore(mod, document.getElementById('sidebar').firstChild);

    const _orig = pcb.run.bind(pcb);
    pcb.run = function(src) {
        const cmd = src.trim();
        if (cmd==='flow.start')  { start(); pcb.log('FLOW: running'); return; }
        if (cmd==='flow.stop')   { stop();  pcb.log('FLOW: stopped'); return; }
        if (cmd==='flow.vortex') { speed=0.1; t+=5; pcb.log('FLOW: vortex'); return; }
        if (cmd==='flow.calm')   { speed=0.3; pcb.log('FLOW: calm'); return; }
        if (cmd==='flow.storm')  { speed=3.0; pcb.log('FLOW: STORM'); return; }
        const m = cmd.match(/^flow\.speed ([0-9.]+)$/);
        if (m) { speed=parseFloat(m[1]); pcb.log('FLOW: speed='+speed); return; }
        _orig(src);
    };

    pcb.log('PGM: FLOW_FIELD loaded. cmds: flow.start / flow.storm / flow.vortex / flow.calm');
})();
