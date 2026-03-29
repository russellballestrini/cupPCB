// RIDE — jump into a friend, spacebar to push forward across the manifold
// Cookie clicker: each SPACE adds boost that decays smoothly into motion
// Kernel globals in scope: scene, camera, renderer, controls, friendList, pcb

(function () {

    let rideActive = false;
    let rideFriend = null;
    let rideBoost   = 0;

    // matches permission-to-ride.html FRIEND_COLORS and friend-trails.js COLORS — same index as f.idx
    const FRIEND_COLORS = [0x68ff9a, 0xffd700, 0xff6820, 0x00eeff, 0xff3232];

    const BASE_SPEED   = 0.014;   // steady coaster roll
    const BOOST_ADD    = 0.30;    // each spacebar hit — punchy but not wild
    const BOOST_MAX    = 0.72;    // cap
    const BOOST_DECAY  = 0.87;    // friction per frame — quick fade for coaster feel
    const ARRIVE_DIST  = 18;      // auto-advance when this close to target

    // --- spacebar ---
    document.addEventListener('keydown', function (e) {
        if (e.code !== 'Space' || !rideActive || !rideFriend) return;
        e.preventDefault();
        rideBoost = Math.min(rideBoost + BOOST_ADD, BOOST_MAX);
        flashBtn();
    });

    // --- RIDE button ---
    const rideBtn = document.createElement('button');
    rideBtn.style.cssText = [
        'position:fixed', 'top:16px', 'right:16px', 'z-index:9999',
        'font-family:Courier New,monospace', 'font-size:13px', 'font-weight:bold',
        'background:rgba(0,0,0,0.88)', 'border:2px solid #ffd700', 'color:#ffd700',
        'padding:7px 20px', 'cursor:pointer', 'text-transform:uppercase',
        'letter-spacing:2px', 'border-radius:2px', 'transition:border-color 0.1s,color 0.1s',
    ].join(';');
    rideBtn.textContent = 'RIDE \u25b6';
    document.body.appendChild(rideBtn);

    // boost flash visual
    function flashBtn() {
        rideBtn.style.background = 'rgba(255,215,0,0.25)';
        setTimeout(function () { rideBtn.style.background = 'rgba(0,0,0,0.88)'; }, 80);
    }

    // speed bar — thin strip below the ride button showing current boost
    const speedBar = document.createElement('div');
    speedBar.style.cssText = [
        'position:fixed', 'top:54px', 'right:16px', 'z-index:9999',
        'width:0%', 'height:3px', 'background:#ffd700',
        'transition:width 0.05s', 'max-width:160px',
    ].join(';');
    document.body.appendChild(speedBar);

    // --- friend picker ---
    const picker = document.createElement('div');
    picker.style.cssText = [
        'display:none', 'position:fixed', 'top:60px', 'right:16px', 'z-index:9999',
        'background:rgba(0,0,0,0.92)', 'border:1px solid #ffd700',
        'font-family:Courier New,monospace', 'font-size:12px', 'color:#ffd700',
        'padding:6px 0', 'min-width:160px',
    ].join(';');
    document.body.appendChild(picker);

    function buildPicker() {
        picker.innerHTML = '';

        // EXIT row — only shown while riding
        if (rideActive) {
            const exitRow = document.createElement('div');
            exitRow.style.cssText = 'padding:6px 14px;cursor:pointer;border-left:3px solid #ff4400;color:#ff4400;letter-spacing:0.1em;';
            exitRow.textContent = 'EXIT RIDE \u25a0';
            exitRow.onmouseenter = function () { exitRow.style.background = 'rgba(255,68,0,0.12)'; };
            exitRow.onmouseleave = function () { exitRow.style.background = ''; };
            exitRow.onclick = function () { exitRide(); };
            picker.appendChild(exitRow);
            // divider
            const sep = document.createElement('div');
            sep.style.cssText = 'height:1px;background:rgba(255,255,255,0.08);margin:3px 0;';
            picker.appendChild(sep);
        }

        const friends = (typeof friendList !== 'undefined')
            ? friendList.filter(function (f) { return f.initialized; }) : [];
        if (friends.length === 0) {
            picker.innerHTML += '<div style="padding:6px 14px;opacity:0.5;">deploy friends first</div>';
            return;
        }
        friends.forEach(function (f, i) {
            const isCurrent = rideActive && f === rideFriend;
            const col = '#' + FRIEND_COLORS[f.idx % FRIEND_COLORS.length].toString(16).padStart(6, '0');
            const row = document.createElement('div');
            row.style.cssText = 'padding:6px 14px;cursor:pointer;letter-spacing:0.1em;'
                + 'border-left:3px solid ' + (isCurrent ? col : 'transparent') + ';'
                + 'color:' + (isCurrent ? col : '#ffd700') + ';'
                + (isCurrent ? 'background:rgba(255,255,255,0.05);' : '');
            row.textContent = f.id + '  \u2014  observer ' + i + (isCurrent ? '  \u25cf' : '');
            row.onmouseenter = function () { if (!isCurrent) { row.style.borderLeftColor = col; row.style.background = 'rgba(255,215,0,0.08)'; } };
            row.onmouseleave = function () { if (!isCurrent) { row.style.borderLeftColor = 'transparent'; row.style.background = ''; } };
            row.onclick = function () {
                if (isCurrent) { hidePicker(); return; }
                if (rideActive) { switchFriend(f); } else { enterRide(f); }
            };
            picker.appendChild(row);
        });
    }

    function showPicker() { buildPicker(); picker.style.display = 'block'; }
    function hidePicker()  { picker.style.display = 'none'; }

    // swap friend mid-ride without touching controls/FOV
    function switchFriend(f) {
        if (!rideActive || f === rideFriend) return;
        const prev = rideFriend;

        // restore previous friend
        if (prev._rideOrigCompute) { prev.compute = prev._rideOrigCompute; delete prev._rideOrigCompute; }

        // mount new friend
        rideFriend = f;
        rideBoost  = 0;
        f._rideOrigCompute = f.compute;
        f.compute = function () {};

        // re-slow all others (new friend is no longer in "other" set, prev is)
        if (typeof friendList !== 'undefined') {
            friendList.forEach(function (other) {
                if (other === f) {
                    // was being slowed, free it (ride.js now controls it)
                    if (other._rideOrigApply) { other.apply = other._rideOrigApply; delete other._rideOrigApply; }
                } else if (!other._rideOrigApply) {
                    // prev friend needs to be slowed now
                    other._rideOrigApply = other.apply;
                    other.apply = function () { this.p.lerp(this.targetP, 0.004); this.mesh.position.copy(this.p); };
                }
            });
        }

        // update button label
        rideBtn.textContent = '\u25cf ' + f.id;

        hidePicker();
        if (typeof pcb !== 'undefined') pcb.log('RIDE: switched to ' + f.id);
    }

    // --- enter / exit ---
    function enterRide(f) {
        rideFriend  = f;
        rideActive  = true;
        rideBoost   = 0;
        window._rideActive = true;
        hidePicker();

        rideBtn.textContent       = '\u25cf ' + f.id;
        rideBtn.style.borderColor = '#ffd700';
        rideBtn.style.color       = '#ffd700';

        if (typeof controls !== 'undefined') controls.enabled = false;

        // widen FOV for speed sensation
        if (typeof camera !== 'undefined') {
            camera._rideSavedFov = camera.fov;
            camera.fov = 72;
            camera.updateProjectionMatrix();
        }
        const cam2 = window._twinCamera2;
        if (cam2) { cam2._rideSavedFov = cam2.fov; cam2.fov = 72; cam2.updateProjectionMatrix(); }

        // block the ridden friend's auto-advance
        f._rideOrigCompute = f.compute;
        f.compute = function () {};

        // slow ALL other friends to a crawl
        if (typeof friendList !== 'undefined') {
            friendList.forEach(function (other) {
                if (other === f) return;
                other._rideOrigApply = other.apply;
                other.apply = function () {
                    this.p.lerp(this.targetP, 0.004);
                    this.mesh.position.copy(this.p);
                };
            });
        }

        if (typeof pcb !== 'undefined') pcb.log('RIDE: mounted ' + f.id + ' — SPACE to push');
    }

    function exitRide() {
        if (rideFriend) {
            // restore ridden friend
            if (rideFriend._rideOrigCompute) {
                rideFriend.compute = rideFriend._rideOrigCompute;
                delete rideFriend._rideOrigCompute;
            }
            // restore other friends
            if (typeof friendList !== 'undefined') {
                friendList.forEach(function (other) {
                    if (other._rideOrigApply) {
                        other.apply = other._rideOrigApply;
                        delete other._rideOrigApply;
                    }
                });
            }
        }

        rideActive  = false;
        window._rideActive = false;
        rideFriend  = null;
        rideBoost   = 0;
        speedBar.style.width = '0%';

        rideBtn.textContent       = 'RIDE \u25b6';
        rideBtn.style.borderColor = '#ffd700';
        rideBtn.style.color       = '#ffd700';

        if (typeof controls !== 'undefined') { controls.enabled = true; controls.update(); }
        if (typeof camera !== 'undefined' && camera._rideSavedFov) {
            camera.fov = camera._rideSavedFov;
            camera.updateProjectionMatrix();
        }
        const cam2 = window._twinCamera2;
        if (cam2 && cam2._rideSavedFov) { cam2.fov = cam2._rideSavedFov; cam2.updateProjectionMatrix(); }

        if (typeof pcb !== 'undefined') pcb.log('RIDE: dismounted');
    }

    rideBtn.onclick = function (e) {
        e.stopPropagation();
        picker.style.display === 'block' ? hidePicker() : showPicker();
    };
    document.addEventListener('click', function (e) {
        if (!rideBtn.contains(e.target) && !picker.contains(e.target)) hidePicker();
    });

    // --- per-frame ride update ---
    const _dir       = new THREE.Vector3();
    const _smoothDir = new THREE.Vector3();  // lerped direction — prevents camera snap on new target
    const _camPos    = new THREE.Vector3();
    const _lookAt    = new THREE.Vector3();
    const _worldUp   = new THREE.Vector3(0, 1, 0);

    function rideUpdate() {
        if (!rideActive || !rideFriend || !rideFriend.initialized) return;

        const f = rideFriend;

        // decay boost
        rideBoost *= BOOST_DECAY;
        if (rideBoost < 0.001) rideBoost = 0;

        // update speed bar
        speedBar.style.width = Math.round(rideBoost / BOOST_MAX * 160) + 'px';

        // move the friend at constant speed + boost
        const speed = BASE_SPEED + rideBoost;
        const distToTarget = f.p.distanceTo(f.targetP);
        if (distToTarget > 0.01) f.p.lerp(f.targetP, Math.min(1, speed / distToTarget));
        f.mesh.position.copy(f.p);

        // close enough to target — queue next vertex
        if (f.p.distanceTo(f.targetP) < ARRIVE_DIST && f._rideOrigCompute) {
            f._rideOrigCompute.call(f);
        }

        // build chase cam — smooth the direction so camera pans instead of snapping
        _dir.subVectors(f.targetP, f.p);
        if (_dir.length() > 0.001) _dir.normalize();
        // initialise smoothDir on first frame
        if (_smoothDir.lengthSq() < 0.0001) _smoothDir.copy(_dir);
        _smoothDir.lerp(_dir, 0.06);
        if (_smoothDir.lengthSq() > 0.0001) _smoothDir.normalize();

        // pull back and lift based on boost — faster = further back for sense of speed
        const pullBack = 60 + rideBoost * 120;
        const liftUp   = 35 + rideBoost * 40;

        _camPos.copy(f.p)
            .addScaledVector(_smoothDir, -pullBack)
            .addScaledVector(_worldUp, liftUp);

        _lookAt.copy(f.p).addScaledVector(_smoothDir, 40);

        camera.position.copy(_camPos);
        camera.up.copy(_worldUp);
        camera.lookAt(_lookAt);
    }

    // intercept both renderers — set camera right before each draw
    const _origRender = renderer.render.bind(renderer);
    renderer.render = function (s, c) {
        rideUpdate();
        _origRender(s, c);
    };

    function hookRenderer2() {
        const r2 = window._twinRenderer2;
        if (!r2 || r2._rideHooked) return;
        r2._rideHooked = true;
        const _orig2 = r2.render.bind(r2);
        r2.render = function (s, c) {
            if (rideActive) {
                const cam2 = window._twinCamera2;
                if (cam2) {
                    cam2.position.copy(camera.position);
                    cam2.quaternion.copy(camera.quaternion);
                    cam2.up.copy(camera.up);
                }
            }
            _orig2(s, c);
        };
    }
    hookRenderer2();
    const _hookInterval = setInterval(function () {
        if (window._twinRenderer2) { hookRenderer2(); clearInterval(_hookInterval); }
    }, 100);

    pcb.log('PGM: RIDE loaded. RIDE \u25b6 top-right. Mount a friend, press SPACE to fly.');

})();
