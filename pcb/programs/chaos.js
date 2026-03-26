// CHAOS_GAME — iterated function systems: Sierpinski, Barnsley fern, dragon curve
// Points accumulate on draw canvas, auto-reify manifold from fractal geometry
// PCB: chaos.sierpinski / chaos.fern / chaos.dragon / chaos.run N
(function () {
    let px = 100, py = 100;
    let currentIFS = null;
    let running = false, timer = null, count = 0;

    const canvas = document.createElement('canvas');
    canvas.width = 160; canvas.height = 100;
    canvas.style.cssText = 'display:block;background:#000;border:1px solid #222;margin-bottom:4px;';
    const ctx = canvas.getContext('2d');

    const IFS = {
        sierpinski: {
            transforms: [
                (x,y)=>[x/2, y/2],
                (x,y)=>[x/2+80, y/2],
                (x,y)=>[x/2+40, y/2+50],
            ],
            weights: [1,1,1], color: '#ffd700'
        },
        fern: {
            transforms: [
                (x,y)=>[0, 0.16*y],
                (x,y)=>[0.85*x+0.04*y, -0.04*x+0.85*y+1.6],
                (x,y)=>[0.2*x-0.26*y, 0.23*x+0.22*y+1.6],
                (x,y)=>[-0.15*x+0.28*y, 0.26*x+0.24*y+0.44],
            ],
            weights: [0.01, 0.85, 0.07, 0.07], color: '#68ff9a',
            scale: (x,y)=>[x*14+80, 95-y*9]
        },
        dragon: {
            transforms: [
                (x,y)=>[0.5*x-0.5*y+50, 0.5*x+0.5*y+10],
                (x,y)=>[-0.5*x-0.5*y+110, 0.5*x-0.5*y+50],
            ],
            weights: [0.5, 0.5], color: '#ff3232'
        }
    };

    function pick(weights) {
        const r = Math.random() * weights.reduce((a,b)=>a+b,0);
        let s = 0;
        for (let i = 0; i < weights.length; i++) { s += weights[i]; if (r < s) return i; }
        return weights.length - 1;
    }

    function setIFS(name) {
        currentIFS = IFS[name];
        px = 100; py = 100; count = 0;
        ctx.fillStyle = '#000'; ctx.fillRect(0,0,160,100);
        // clear draw overlay
        const overlay = document.getElementById('draw-overlay');
        overlay.getContext('2d').clearRect(0,0,overlay.width,overlay.height);
        seedPoints.length = 0;
        document.getElementById('chaos-name').textContent = name.toUpperCase();
    }

    function iterate(n) {
        if (!currentIFS) return;
        const octx = document.getElementById('draw-overlay').getContext('2d');
        const ifs = currentIFS;
        for (let i = 0; i < n; i++) {
            const t = ifs.transforms[pick(ifs.weights)];
            [px, py] = t(px, py);
            let [cx, cy] = ifs.scale ? ifs.scale(px,py) : [px, py];
            cx = Math.max(0, Math.min(159, cx));
            cy = Math.max(0, Math.min(99, cy));
            if (count > 20) { // skip first 20 (burn-in)
                ctx.fillStyle = ifs.color;
                ctx.fillRect(cx, cy, 1, 1);
                if (count % 4 === 0) {
                    const sx = cx + 5, sy = cy + 5;
                    seedPoints.push({x:sx, y:sy});
                    octx.fillStyle='#000'; octx.fillRect(sx,sy,1,1);
                }
            }
            count++;
        }
        document.getElementById('chaos-pts').textContent = seedPoints.length;
    }

    function loop() {
        if (!running) return;
        iterate(200);
        if (seedPoints.length > 60 && seedPoints.length % 200 < 5) buildManifold(seedPoints);
        timer = setTimeout(loop, 30);
    }

    function start() { if (!running) { running = true; loop(); } }
    function stop()  { running = false; clearTimeout(timer); }

    const mod = document.createElement('div');
    mod.className = 'module'; mod.id = 'pgm-chaos';
    mod.innerHTML = '<h3>CHAOS_GAME</h3>';
    mod.appendChild(canvas);
    const row1=document.createElement('div'); row1.style.cssText='display:flex;gap:3px;margin-bottom:3px;';
    const row2=document.createElement('div'); row2.style.cssText='display:flex;gap:3px;';
    [['RUN',start],['STOP',stop]].forEach(([l,fn])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=l;b.onclick=fn;row1.appendChild(b);
    });
    [['SIERP',()=>{setIFS('sierpinski');start();}],['FERN',()=>{setIFS('fern');start();}],['DRAGON',()=>{setIFS('dragon');start();}]].forEach(([l,fn])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=l;b.style.fontSize='7px';b.onclick=fn;row2.appendChild(b);
    });
    mod.appendChild(row1); mod.appendChild(row2);
    const info=document.createElement('div');
    info.style.cssText='margin-top:4px;font-size:8px;color:#555;';
    info.innerHTML='<span id="chaos-name" style="color:#ff3232">---</span> PTS:<span id="chaos-pts" style="color:#ffd700">0</span>';
    mod.appendChild(info);
    document.getElementById('sidebar').insertBefore(mod, document.getElementById('sidebar').firstChild);

    const _orig = pcb.run.bind(pcb);
    pcb.run = function(src) {
        const cmd = src.trim();
        if (cmd==='chaos.sierpinski') { setIFS('sierpinski'); start(); return; }
        if (cmd==='chaos.fern')       { setIFS('fern'); start(); return; }
        if (cmd==='chaos.dragon')     { setIFS('dragon'); start(); return; }
        _orig(src);
    };

    pcb.log('PGM: CHAOS_GAME loaded. cmds: chaos.sierpinski / chaos.fern / chaos.dragon');
})();
