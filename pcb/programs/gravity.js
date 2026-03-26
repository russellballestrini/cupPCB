// GRAVITY — N-body orbital simulation, gravitational potential maps to heat buffer
// Manifold dimples toward mass concentrations, peaks at Lagrange points
// PCB: gravity.start / gravity.stop / gravity.bodies N / gravity.collapse / gravity.orbit
(function () {
    let bodies = [], running = false, timer = null;
    const W = 32, N = W * W;

    function makeBodies(n) {
        bodies = Array.from({length: n}, (_, i) => {
            const angle = (i / n) * Math.PI * 2;
            const r = 60 + Math.random() * 20;
            return {
                x: 100 + Math.cos(angle) * r,
                y: 100 + Math.sin(angle) * r,
                vx: -Math.sin(angle) * 2.5,
                vy:  Math.cos(angle) * 2.5,
                m: 20 + Math.random() * 30,
            };
        });
    }
    makeBodies(3);

    const canvas = document.createElement('canvas');
    canvas.width = 160; canvas.height = 100;
    canvas.style.cssText = 'display:block;background:#000;border:1px solid #222;margin-bottom:4px;';
    const ctx = canvas.getContext('2d');

    function step() {
        // integrate bodies
        for (let i = 0; i < bodies.length; i++) {
            let ax = 0, ay = 0;
            for (let j = 0; j < bodies.length; j++) {
                if (i === j) continue;
                const dx = bodies[j].x - bodies[i].x, dy = bodies[j].y - bodies[i].y;
                const r2 = dx*dx + dy*dy + 100;
                const f = bodies[j].m / r2;
                ax += f * dx; ay += f * dy;
            }
            bodies[i].vx += ax * 0.3; bodies[i].vy += ay * 0.3;
            bodies[i].x  += bodies[i].vx * 0.3; bodies[i].y += bodies[i].vy * 0.3;
            // wrap
            bodies[i].x = ((bodies[i].x % 200) + 200) % 200;
            bodies[i].y = ((bodies[i].y % 200) + 200) % 200;
        }

        // gravitational potential → heat buffer
        if (heat.length === N) {
            for (let i = 0; i < N; i++) {
                const vx = (i % W) / W * 200, vy = Math.floor(i / W) / W * 200;
                let pot = 0;
                for (const b of bodies) {
                    const dx=vx-b.x, dy=vy-b.y;
                    pot += b.m / Math.sqrt(dx*dx+dy*dy+50);
                }
                heat[i] = pot * 40;
            }
        }

        // draw bodies
        ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(0,0,160,100);
        for (const b of bodies) {
            const r = Math.sqrt(b.m) * 1.2;
            ctx.beginPath();
            ctx.arc(b.x*0.8, b.y*0.5, r, 0, Math.PI*2);
            ctx.fillStyle='#ffd700'; ctx.fill();
        }
    }

    function loop() { if (!running) return; step(); timer = setTimeout(loop, 25); }
    function start() { if (!running) { running = true; loop(); } }
    function stop()  { running = false; clearTimeout(timer); }

    const mod = document.createElement('div');
    mod.className = 'module'; mod.id = 'pgm-gravity';
    mod.innerHTML = '<h3>GRAVITY</h3>';
    mod.appendChild(canvas);
    const row1=document.createElement('div'); row1.style.cssText='display:flex;gap:3px;margin-bottom:3px;';
    const row2=document.createElement('div'); row2.style.cssText='display:flex;gap:3px;';
    [['START',start],['STOP',stop]].forEach(([l,fn])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=l;b.onclick=fn;row1.appendChild(b);
    });
    [[2],[3],[5],[8]].forEach(([n])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=n+'B';
        b.style.fontSize='7px';b.onclick=()=>{stop();makeBodies(n);start();pcb.log('GRAVITY: '+n+' bodies');};row2.appendChild(b);
    });
    mod.appendChild(row1); mod.appendChild(row2);
    document.getElementById('sidebar').insertBefore(mod, document.getElementById('sidebar').firstChild);

    const _orig = pcb.run.bind(pcb);
    pcb.run = function(src) {
        const cmd = src.trim();
        if (cmd==='gravity.start')    { start(); pcb.log('GRAVITY: running'); return; }
        if (cmd==='gravity.stop')     { stop();  pcb.log('GRAVITY: stopped'); return; }
        if (cmd==='gravity.collapse') {
            bodies.forEach(b => { b.x=100+Math.random()*10; b.y=100+Math.random()*10; b.m=100; b.vx=b.vy=0; });
            start(); pcb.log('GRAVITY: COLLAPSE'); return;
        }
        if (cmd==='gravity.orbit') { stop(); makeBodies(4); start(); pcb.log('GRAVITY: orbit'); return; }
        const m = cmd.match(/^gravity\.bodies (\d+)$/);
        if (m) { stop(); makeBodies(parseInt(m[1])); start(); pcb.log('GRAVITY: '+m[1]+' bodies'); return; }
        _orig(src);
    };

    pcb.log('PGM: GRAVITY loaded. build manifold, then gravity.start');
})();
