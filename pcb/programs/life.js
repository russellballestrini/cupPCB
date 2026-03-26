// CONWAY_LIFE — Game of Life on 32x32 grid, alive cells inject heat into manifold
// PCB: life.start / life.stop / life.reset / life.glider / life.gun
(function () {
    const W = 32, N = W * W;
    let grid = new Uint8Array(N);
    let running = false, timer = null, gen = 0;

    const canvas = document.createElement('canvas');
    canvas.width = W * 5; canvas.height = W * 5;
    canvas.style.cssText = 'display:block;background:#000;border:1px solid #222;margin-bottom:4px;image-rendering:pixelated;cursor:pointer;';
    const ctx = canvas.getContext('2d');

    function idx(x, y) { return ((y + W) % W) * W + ((x + W) % W); }

    function randomize() {
        gen = 0;
        for (let i = 0; i < N; i++) grid[i] = Math.random() < 0.3 ? 1 : 0;
    }

    function glider() {
        grid.fill(0); gen = 0;
        [[1,0],[2,1],[0,2],[1,2],[2,2]].forEach(([x,y]) => grid[idx(x+14,y+14)] = 1);
    }

    function gun() {
        grid.fill(0); gen = 0;
        const cells = [[1,5],[1,6],[2,5],[2,6],[11,5],[11,6],[11,7],[12,4],[12,8],[13,3],[13,9],[14,3],[14,9],[15,6],[16,4],[16,8],[17,5],[17,6],[17,7],[18,6],[21,3],[21,4],[21,5],[22,3],[22,4],[22,5],[23,2],[23,6],[25,1],[25,2],[25,6],[25,7],[35,3],[35,4],[36,3],[36,4]];
        cells.forEach(([x,y]) => { if(x<W&&y<W) grid[idx(x,y)]=1; });
    }

    function step() {
        const next = new Uint8Array(N);
        for (let y = 0; y < W; y++) {
            for (let x = 0; x < W; x++) {
                let n = 0;
                for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) if(dx||dy) n+=grid[idx(x+dx,y+dy)];
                const alive = grid[idx(x,y)];
                next[idx(x,y)] = alive ? (n===2||n===3?1:0) : (n===3?1:0);
            }
        }
        grid = next; gen++;
    }

    function render() {
        ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
        for (let i = 0; i < N; i++) {
            if (!grid[i]) continue;
            const x = (i % W) * 5, y = Math.floor(i / W) * 5;
            ctx.fillStyle = '#ffd700'; ctx.fillRect(x, y, 4, 4);
            if (heat.length === N) heat[i] = Math.min((heat[i]||0) + 60, 400);
        }
        document.getElementById('life-gen').textContent = gen;
    }

    function loop() { if (!running) return; step(); render(); timer = setTimeout(loop, 80); }
    function start() { if (!running) { running = true; loop(); } }
    function stop()  { running = false; clearTimeout(timer); }

    // click to toggle cells
    canvas.onclick = (e) => {
        const r = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - r.left) / 5);
        const y = Math.floor((e.clientY - r.top) / 5);
        grid[idx(x,y)] ^= 1; render();
    };

    const mod = document.createElement('div');
    mod.className = 'module'; mod.id = 'pgm-life';
    mod.innerHTML = '<h3>CONWAY_LIFE</h3>';
    mod.appendChild(canvas);
    const row1 = document.createElement('div'); row1.style.cssText='display:flex;gap:3px;margin-bottom:3px;';
    const row2 = document.createElement('div'); row2.style.cssText='display:flex;gap:3px;';
    [['START',start],['STOP',stop],['RST',()=>{stop();randomize();render();}]].forEach(([l,fn])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=l;b.onclick=fn;row1.appendChild(b);
    });
    [['GLIDER',()=>{stop();glider();render();}],['GUN',()=>{stop();gun();render();}]].forEach(([l,fn])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=l;b.style.fontSize='7px';b.onclick=fn;row2.appendChild(b);
    });
    mod.appendChild(row1); mod.appendChild(row2);
    const info=document.createElement('div');
    info.style.cssText='margin-top:4px;font-size:8px;color:#555;';
    info.innerHTML='GEN:<span id="life-gen" style="color:#68ff9a">0</span>';
    mod.appendChild(info);
    document.getElementById('sidebar').insertBefore(mod, document.getElementById('sidebar').firstChild);

    randomize(); render();

    const _orig = pcb.run.bind(pcb);
    pcb.run = function(src) {
        const cmd = src.trim();
        if (cmd==='life.start')  { start(); return; }
        if (cmd==='life.stop')   { stop(); return; }
        if (cmd==='life.reset')  { stop(); randomize(); render(); return; }
        if (cmd==='life.glider') { stop(); glider(); render(); start(); return; }
        if (cmd==='life.gun')    { stop(); gun(); render(); start(); return; }
        _orig(src);
    };

    pcb.log('PGM: CONWAY_LIFE loaded. click grid to paint. cmds: life.start / life.glider / life.gun');
})();
