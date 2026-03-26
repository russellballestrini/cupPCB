// AUDIO_REACTIVE — microphone FFT drives heat buffer, manifold dances to sound
// Requires HTTPS or localhost for getUserMedia. Falls back to synthetic signal on file://
// PCB: audio.start / audio.stop / audio.synth / audio.mic
(function () {
    let running = false, animId = null;
    let analyser = null, dataArr = null;
    let synthMode = false, synthT = 0;
    const W = 32, N = W * W;

    const canvas = document.createElement('canvas');
    canvas.width = 160; canvas.height = 60;
    canvas.style.cssText = 'display:block;background:#000;border:1px solid #222;margin-bottom:4px;';
    const ctx = canvas.getContext('2d');

    function renderFrame() {
        if (!running) return;
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0,0,160,60);

        let bins;
        if (synthMode || !analyser) {
            // synthetic: beat + harmonics
            synthT += 0.04;
            bins = new Float32Array(W);
            for (let i = 0; i < W; i++) {
                bins[i] = 0.5 + 0.5 * Math.sin(synthT * (1 + i * 0.3)) *
                          Math.abs(Math.sin(synthT * 0.3 + i * 0.1));
            }
        } else {
            analyser.getFloatFrequencyData(dataArr);
            bins = new Float32Array(W);
            const step = Math.floor(dataArr.length / W);
            for (let i = 0; i < W; i++) {
                let sum = 0;
                for (let j = 0; j < step; j++) sum += dataArr[i * step + j];
                bins[i] = Math.max(0, (sum / step + 80) / 80);
            }
        }

        // map bins to heat buffer (column stripes on 32x32 grid)
        if (heat.length === N) {
            for (let x = 0; x < W; x++) {
                const val = bins[x] * 300;
                for (let y = 0; y < W; y++) {
                    heat[y * W + x] = val * (1 - y / W);
                }
            }
        }

        // draw spectrum
        const bw = 160 / W;
        for (let i = 0; i < W; i++) {
            const v = bins[i];
            ctx.fillStyle = `hsl(${200 + v * 120}, 100%, ${30 + v * 40}%)`;
            ctx.fillRect(i * bw, 60 - v * 55, bw - 1, v * 55);
        }

        animId = requestAnimationFrame(renderFrame);
    }

    async function startMic() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});
            const ac = new AudioContext();
            analyser = ac.createAnalyser();
            analyser.fftSize = 256;
            dataArr = new Float32Array(analyser.frequencyBinCount);
            ac.createMediaStreamSource(stream).connect(analyser);
            synthMode = false;
            document.getElementById('audio-src').textContent = 'MIC';
            pcb.log('AUDIO: microphone active');
        } catch(e) {
            synthMode = true;
            document.getElementById('audio-src').textContent = 'SYNTH';
            pcb.log('AUDIO: mic unavailable, synthetic mode');
        }
        running = true;
        renderFrame();
    }

    function startSynth() {
        synthMode = true; running = true;
        document.getElementById('audio-src').textContent = 'SYNTH';
        renderFrame();
        pcb.log('AUDIO: synthetic signal running');
    }

    function stop() {
        running = false;
        cancelAnimationFrame(animId);
        pcb.log('AUDIO: stopped');
    }

    const mod = document.createElement('div');
    mod.className = 'module'; mod.id = 'pgm-audio';
    mod.innerHTML = '<h3>AUDIO_REACTIVE</h3>';
    mod.appendChild(canvas);
    const row = document.createElement('div'); row.style.cssText='display:flex;gap:3px;';
    [['MIC',startMic],['SYNTH',startSynth],['STOP',stop]].forEach(([l,fn])=>{
        const b=document.createElement('button');b.className='btn';b.textContent=l;b.onclick=fn;row.appendChild(b);
    });
    mod.appendChild(row);
    const info=document.createElement('div');
    info.style.cssText='margin-top:4px;font-size:8px;color:#555;';
    info.innerHTML='SRC:<span id="audio-src" style="color:#00eeff">---</span>';
    mod.appendChild(info);
    document.getElementById('sidebar').insertBefore(mod, document.getElementById('sidebar').firstChild);

    const _orig = pcb.run.bind(pcb);
    pcb.run = function(src) {
        const cmd = src.trim();
        if (cmd==='audio.start') { startMic(); return; }
        if (cmd==='audio.mic')   { startMic(); return; }
        if (cmd==='audio.synth') { stop(); startSynth(); return; }
        if (cmd==='audio.stop')  { stop(); return; }
        _orig(src);
    };

    // auto-start synthetic on load
    startSynth();
    pcb.log('PGM: AUDIO loaded (synth). cmds: audio.mic / audio.synth / audio.stop');
})();
