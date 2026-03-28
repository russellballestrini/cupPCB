// RIDE — jump into a friend and chase them first-person across the manifold
// Sonic / Flash chase cam: camera behind + above, looking at friend's head
// Kernel globals in scope: scene, camera, renderer, controls, friendList, pcb

(function () {

    let rideActive = false;
    let rideFriend = null;

    // --- RIDE button (top-right, gold) ---
    const rideBtn = document.createElement('button');
    rideBtn.style.cssText = [
        'position:fixed',
        'top:16px',
        'right:16px',
        'z-index:9999',
        'font-family:Courier New,monospace',
        'font-size:13px',
        'font-weight:bold',
        'background:rgba(0,0,0,0.88)',
        'border:2px solid #ffd700',
        'color:#ffd700',
        'padding:7px 20px',
        'cursor:pointer',
        'text-transform:uppercase',
        'letter-spacing:2px',
        'border-radius:2px',
    ].join(';');
    rideBtn.textContent = 'RIDE \u25b6';
    document.body.appendChild(rideBtn);

    // --- friend picker dropdown ---
    const picker = document.createElement('div');
    picker.style.cssText = [
        'display:none',
        'position:fixed',
        'top:54px',
        'right:16px',
        'z-index:9999',
        'background:rgba(0,0,0,0.92)',
        'border:1px solid #ffd700',
        'font-family:Courier New,monospace',
        'font-size:12px',
        'color:#ffd700',
        'padding:6px 0',
        'min-width:140px',
    ].join(';');
    document.body.appendChild(picker);

    function buildPicker() {
        picker.innerHTML = '';
        const friends = (typeof friendList !== 'undefined') ? friendList.filter(function (f) { return f.initialized; }) : [];
        if (friends.length === 0) {
            picker.innerHTML = '<div style="padding:6px 14px;opacity:0.5;">deploy friends first</div>';
            return;
        }
        friends.forEach(function (f, i) {
            const row = document.createElement('div');
            row.style.cssText = 'padding:6px 14px;cursor:pointer;border-left:3px solid transparent;letter-spacing:0.1em;';
            row.textContent = f.id + '  \u2014  observer ' + i;
            row.onmouseenter = function () { row.style.borderLeftColor = '#ffd700'; row.style.background = 'rgba(255,215,0,0.08)'; };
            row.onmouseleave = function () { row.style.borderLeftColor = 'transparent'; row.style.background = ''; };
            row.onclick = function () { enterRide(f); };
            picker.appendChild(row);
        });
    }

    function showPicker() {
        buildPicker();
        picker.style.display = 'block';
    }

    function hidePicker() {
        picker.style.display = 'none';
    }

    function enterRide(f) {
        rideFriend = f;
        rideActive = true;
        hidePicker();
        rideBtn.textContent = 'EXIT \u25a0';
        rideBtn.style.borderColor = '#ff4400';
        rideBtn.style.color = '#ff4400';
        if (typeof controls !== 'undefined') {
            controls.enabled = false;
        }
        // widen FOV for speed sensation
        if (typeof camera !== 'undefined') {
            camera._rideSavedFov = camera.fov;
            camera.fov = 72;
            camera.updateProjectionMatrix();
        }
        if (typeof pcb !== 'undefined') pcb.log('RIDE: jumped into ' + f.id);
    }

    function exitRide() {
        rideActive = false;
        rideFriend = null;
        rideBtn.textContent = 'RIDE \u25b6';
        rideBtn.style.borderColor = '#ffd700';
        rideBtn.style.color = '#ffd700';
        if (typeof controls !== 'undefined') {
            controls.enabled = true;
            controls.update();
        }
        // restore FOV
        if (typeof camera !== 'undefined' && camera._rideSavedFov) {
            camera.fov = camera._rideSavedFov;
            camera.updateProjectionMatrix();
        }
        if (typeof pcb !== 'undefined') pcb.log('RIDE: dismounted');
    }

    rideBtn.onclick = function (e) {
        e.stopPropagation();
        if (rideActive) {
            exitRide();
        } else {
            picker.style.display === 'block' ? hidePicker() : showPicker();
        }
    };

    document.addEventListener('click', function (e) {
        if (!rideBtn.contains(e.target) && !picker.contains(e.target)) {
            hidePicker();
        }
    });

    // --- camera math ---
    const _dir    = new THREE.Vector3();
    const _camPos = new THREE.Vector3();
    const _lookAt = new THREE.Vector3();
    const _worldUp = new THREE.Vector3(0, 1, 0);

    function applyRideCamera() {
        if (!rideActive || !rideFriend || !rideFriend.initialized) return;

        const f = rideFriend;

        // direction of travel: friend → target
        _dir.subVectors(f.targetP, f.p);
        const spd = _dir.length();
        if (spd > 0.001) _dir.normalize();

        // chase cam: pull back behind friend, lift up
        const pullBack = Math.max(spd * 6, 220);
        const liftUp   = 90;

        _camPos.copy(f.p)
            .addScaledVector(_dir, -pullBack)
            .addScaledVector(_worldUp, liftUp);

        // look slightly ahead of the friend (toward target)
        _lookAt.copy(f.p).addScaledVector(_dir, 50);

        camera.position.copy(_camPos);
        camera.up.copy(_worldUp);
        camera.lookAt(_lookAt);
    }

    // inject into renderer.render so camera is set every frame before draw
    const _origRender = renderer.render.bind(renderer);
    renderer.render = function (s, c) {
        applyRideCamera();
        _origRender(s, c);
    };

    pcb.log('PGM: RIDE loaded. RIDE \u25b6 button top-right. Deploy friends first.');

})();
