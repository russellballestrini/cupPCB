// LORENZ — Lorenz attractor particle traces heat into nearest manifold vertex
// Butterfly orbits in 3D, projects onto mesh, deforms geometry over time
// PCB: lorenz.start / lorenz.stop / lorenz.reset / lorenz.chaos
(function () {
    let x = 0.1, y = 0, z = 0;
    let sigma = 10, rho = 28, beta = 8/3;
    let running = false, timer = null;
    let trail = [];
    const TRAIL = 200;

    const canvas = document.createElement('canvas');
    canvas.width = 180; canvas.height = 80;
    canvas.style.cssText = 'display:block;background:#000;border:1px solid #222;margin-bottom:4px;';
    const ctx = canvas.getContext('2d');

    function step(dt) {
        const dx = sigma * (y - x);
        const dy = x * (rho - z) - y;
        const dz = x * y - beta * z;
        x += dx * dt; y += dy * dt; z += dz * dt;
        trail.push([x, y, z]);
        if (trail.length > TRAIL) trail.shift();

        // project attractor onto heat buffer via nearest-vertex approximation
        if (heat.length > 0 && meshVertices.length > 0) {
            const nx = Math.floor(((x + 30) / 60) * (heat.length - 1));
            const ni = Math.max(0, Math.min(heat.length - 1, nx));
            heat[ni] = Math.min(heat[ni] + 40, 500);
        }

        // draw trail on mini canvas
        ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0,0,180,80);
        ctx.beginPath();
        trail.forEach(([tx,ty], i) => {
            const px = (tx + 30) / 60 * 180;
            const py = (ty + 30) / 60 * 80;
            i === 0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
        });
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 0.8; ctx.stroke();
    }

    function loop() { if (!running) return; for(let i=0;i<3;i++) step(0.005); timer = setTimeout(loop, 20); }
    function start() { if (!running) { running = true; loop(); } }
    function stop()  { running = false; clearTimeout(timer); }
    function reset() { stop(); x=0.1; y=0; z=0; trail=[]; ctx.clearRect(0,0,180,80); }

    const mod = document.createElement('div');
    mod.className = 'module'; mod.id = 'pgm-lorenz';
    mod.innerHTML = '<h3>LORENZ_ATTRACTOR</h3>';
    mod.appendChild(canvas);
    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:3px;';
    ['START','STOP','RST'].forEach((lbl,i) => {
        const b = document.createElement('button'); b.className='btn'; b.textContent=lbl;
        b.onclick = [start, stop, reset][i]; btns.appendChild(b);
    });
    mod.appendChild(btns);
    const info = document.createElement('div');
    info.style.cssText = 'margin-top:4px;font-size:8px;color:#555;';
    info.innerHTML = 'σ:<span id="lor-s" style="color:#ffd700">10</span> ρ:<span id="lor-r" style="color:#ffd700">28</span>';
    mod.appendChild(info);
    document.getElementById('sidebar').insertBefore(mod, document.getElementById('sidebar').firstChild);

    const _orig = pcb.run.bind(pcb);
    pcb.run = function(src) {
        const cmd = src.trim();
        if (cmd==='lorenz.start') { start(); pcb.log('LORENZ: butterfly running'); return; }
        if (cmd==='lorenz.stop')  { stop();  pcb.log('LORENZ: stopped'); return; }
        if (cmd==='lorenz.reset') { reset(); pcb.log('LORENZ: reset'); return; }
        if (cmd==='lorenz.chaos') {
            stop(); rho=99; x=Math.random()*2-1; y=Math.random()*2-1; z=Math.random()*10;
            document.getElementById('lor-r').textContent=rho; start();
            pcb.log('LORENZ: chaos mode rho=99'); return;
        }
        _orig(src);
    };

    pcb.log('PGM: LORENZ loaded. cmds: lorenz.start / lorenz.chaos');
})();
