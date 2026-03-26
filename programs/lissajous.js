// LISSAJOUS — parametric Lissajous curves injected as seed points, manifold auto-reifies
// Ratio a:b produces knots, figure-8s, flowers. δ phase shift rotates the pattern.
// PCB: liss.go / liss.a N / liss.b N / liss.flower / liss.knot / liss.spin
(function () {
    let a = 3, b = 2, delta = Math.PI / 4;
    let spinning = false, spinTimer = null;

    const canvas = document.createElement('canvas');
    canvas.width = 160; canvas.height = 80;
    canvas.style.cssText = 'display:block;background:#000;border:1px solid #222;margin-bottom:4px;';
    const ctx = canvas.getContext('2d');

    function draw() {
        ctx.fillStyle = '#000'; ctx.fillRect(0,0,160,80);
        ctx.beginPath();
        const steps = 400;
        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * Math.PI * 2;
            const x = 80 + 70 * Math.sin(a * t + delta);
            const y = 40 + 35 * Math.sin(b * t);
            i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
        }
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.2; ctx.stroke();
        document.getElementById('liss-ab').textContent = a+':'+b;
    }

    function inject() {
        // generate seed points from Lissajous curve and reify manifold
        const overlay = document.getElementById('draw-overlay');
        const octx = overlay.getContext('2d');
        octx.clearRect(0,0,overlay.width,overlay.height);
        seedPoints.length = 0;

        const steps = 80, cx = 100, cy = 100, rx = 70, ry = 70;
        for (let i = 0; i < steps; i++) {
            const t = (i / steps) * Math.PI * 2;
            const x = cx + rx * Math.sin(a * t + delta);
            const y = cy + ry * Math.sin(b * t);
            seedPoints.push({x, y});
            octx.fillStyle = '#000'; octx.fillRect(x, y, 2, 2);
        }
        buildManifold(seedPoints);
        draw();
        pcb.log('LISS: a='+a+' b='+b+' delta='+delta.toFixed(2)+' reified');
    }

    function spin() {
        spinning = !spinning;
        if (!spinning) { clearInterval(spinTimer); return; }
        spinTimer = setInterval(() => { delta += 0.03; inject(); }, 100);
    }

    const mod = document.createElement('div');
    mod.className = 'module'; mod.id = 'pgm-liss';
    mod.innerHTML = '<h3>LISSAJOUS</h3>';
    mod.appendChild(canvas);
    const row1 = document.createElement('div'); row1.style.cssText='display:flex;gap:3px;margin-bottom:3px;';
    const row2 = document.createElement('div'); row2.style.cssText='display:flex;gap:3px;';
    [['INJECT',inject],['SPIN',spin]].forEach(([l,fn])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=l;b.onclick=fn;row1.appendChild(b);
    });
    [['3:2',()=>{a=3;b=2;draw();}],['5:4',()=>{a=5;b=4;draw();}],['7:6',()=>{a=7;b=6;draw();}],['2:1',()=>{a=2;b=1;draw();}]].forEach(([l,fn])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=l;b.style.fontSize='7px';b.onclick=fn;row2.appendChild(b);
    });
    mod.appendChild(row1); mod.appendChild(row2);
    const info=document.createElement('div');
    info.style.cssText='margin-top:4px;font-size:8px;color:#555;';
    info.innerHTML='a:b=<span id="liss-ab" style="color:#ffd700">3:2</span>';
    mod.appendChild(info);
    document.getElementById('sidebar').insertBefore(mod, document.getElementById('sidebar').firstChild);

    draw();

    const _orig = pcb.run.bind(pcb);
    pcb.run = function(src) {
        const cmd = src.trim();
        if (cmd==='liss.go')     { inject(); return; }
        if (cmd==='liss.spin')   { spin(); pcb.log('LISS: spin '+(spinning?'on':'off')); return; }
        if (cmd==='liss.flower') { a=5; b=4; delta=Math.PI/3; inject(); return; }
        if (cmd==='liss.knot')   { a=7; b=6; delta=Math.PI/6; inject(); return; }
        const ma = cmd.match(/^liss\.a (\d+)$/), mb = cmd.match(/^liss\.b (\d+)$/);
        if (ma) { a=parseInt(ma[1]); draw(); pcb.log('LISS: a='+a); return; }
        if (mb) { b=parseInt(mb[1]); draw(); pcb.log('LISS: b='+b); return; }
        _orig(src);
    };

    pcb.log('PGM: LISSAJOUS loaded. cmds: liss.go / liss.spin / liss.flower / liss.knot');
})();
