// LANGTON_ANT — multiple ants on 32x32 toroidal grid, heat trails burn into manifold
// Classic Turing-complete cellular automaton. Emergent highways appear after ~10k steps.
// PCB: ant.start / ant.stop / ant.reset / ant.ants N / ant.turbo
(function () {
    const W = 32, N = W * W;
    let grid = new Uint8Array(N); // 0=white 1=black
    let ants = [];
    let running = false, timer = null, steps = 0, turbo = false;
    const DIRS = [[0,-1],[1,0],[0,1],[-1,0]]; // N E S W

    function makeAnts(n) {
        grid.fill(0); steps = 0;
        ants = Array.from({length:n}, (_, i) => ({
            x: Math.floor(W/2) + (i%3)*2, y: Math.floor(W/2) + Math.floor(i/3)*2,
            dir: i % 4
        }));
    }
    makeAnts(1);

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = W;
    canvas.style.cssText = 'display:block;background:#000;border:1px solid #222;margin-bottom:4px;image-rendering:pixelated;width:'+(W*4)+'px;height:'+(W*4)+'px;';
    const ctx = canvas.getContext('2d');

    function step(n) {
        for (let s = 0; s < n; s++) {
            for (const ant of ants) {
                const i = ant.y * W + ant.x;
                if (grid[i] === 0) { ant.dir = (ant.dir + 1) % 4; grid[i] = 1; }
                else               { ant.dir = (ant.dir + 3) % 4; grid[i] = 0; }
                ant.x = (ant.x + DIRS[ant.dir][0] + W) % W;
                ant.y = (ant.y + DIRS[ant.dir][1] + W) % W;
            }
            steps++;
        }
    }

    function render() {
        const img = ctx.createImageData(W, W);
        for (let i = 0; i < N; i++) {
            const v = grid[i] ? 255 : 30;
            img.data[i*4]=v; img.data[i*4+1]=Math.floor(v*0.8); img.data[i*4+2]=0; img.data[i*4+3]=255;
        }
        for (const ant of ants) {
            const i = ant.y*W+ant.x;
            img.data[i*4]=0; img.data[i*4+1]=200; img.data[i*4+2]=255; img.data[i*4+3]=255;
        }
        ctx.putImageData(img, 0, 0);

        // heat: black cells inject
        if (heat.length === N) {
            for (let i = 0; i < N; i++) {
                if (grid[i]) heat[i] = Math.min((heat[i]||0)+15, 350);
                else heat[i] *= 0.98;
            }
        }
        document.getElementById('ant-steps').textContent = steps;
    }

    function loop() {
        if (!running) return;
        step(turbo ? 50 : 5);
        render();
        timer = setTimeout(loop, 30);
    }
    function start() { if (!running) { running=true; loop(); } }
    function stop()  { running=false; clearTimeout(timer); }

    const mod = document.createElement('div');
    mod.className = 'module'; mod.id = 'pgm-ant';
    mod.innerHTML = '<h3>LANGTON_ANT</h3>';
    mod.appendChild(canvas);
    const row1=document.createElement('div'); row1.style.cssText='display:flex;gap:3px;margin-bottom:3px;';
    const row2=document.createElement('div'); row2.style.cssText='display:flex;gap:3px;';
    [['START',start],['STOP',stop],['RST',()=>{stop();makeAnts(ants.length);render();}]].forEach(([l,fn])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=l;b.onclick=fn;row1.appendChild(b);
    });
    [[1],[2],[4],[8]].forEach(([n])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=n+'A';
        b.style.fontSize='7px';b.onclick=()=>{stop();makeAnts(n);start();};row2.appendChild(b);
    });
    mod.appendChild(row1); mod.appendChild(row2);
    const info=document.createElement('div');
    info.style.cssText='margin-top:4px;font-size:8px;color:#555;';
    info.innerHTML='STEPS:<span id="ant-steps" style="color:#ffd700">0</span>';
    mod.appendChild(info);
    document.getElementById('sidebar').insertBefore(mod, document.getElementById('sidebar').firstChild);

    render();

    const _orig = pcb.run.bind(pcb);
    pcb.run = function(src) {
        const cmd = src.trim();
        if (cmd==='ant.start')  { start(); pcb.log('ANT: marching'); return; }
        if (cmd==='ant.stop')   { stop();  pcb.log('ANT: stopped'); return; }
        if (cmd==='ant.reset')  { stop(); makeAnts(ants.length); render(); pcb.log('ANT: reset'); return; }
        if (cmd==='ant.turbo')  { turbo=!turbo; pcb.log('ANT: turbo '+(turbo?'ON':'OFF')); return; }
        const m = cmd.match(/^ant\.ants (\d+)$/);
        if (m) { stop(); makeAnts(parseInt(m[1])); start(); pcb.log('ANT: '+m[1]+' ants'); return; }
        _orig(src);
    };

    pcb.log('PGM: LANGTON_ANT loaded. cmds: ant.start / ant.turbo / ant.ants 4');
})();
