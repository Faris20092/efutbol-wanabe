import * as THREE from 'three';

// =============================================================================
// CONFIGURATIONS
// =============================================================================
const PITCH_CONFIG = {
    positionX: 0, positionY: 0, positionZ: 0,
    rotationY: 0, scale: 1.0, width: 68, length: 105,
    goalWidth: 7.32, goalHeight: 2.44, goalDepth: 2.0,
    grassColor1: '#2d7a2d', grassColor2: '#3d8a3d', lineColor: '#ffffff',
    get halfLength() { return this.length / 2; },
    get halfWidth() { return this.width / 2; },
    get penaltyAreaLength() { return 16.5; },
    get penaltyAreaWidth() { return 40.3; },
    get goalAreaLength() { return 5.5; },
    get goalAreaWidth() { return 18.32; },
    get centerCircleRadius() { return 9.15; },
    get penaltySpotDistance() { return 11; },
    get penaltyArcRadius() { return 9.15; },
};

const PLAYER_CONFIG = {
    height: 1.8, radius: 0.3,
    walkSpeed: 5, runSpeed: 10, sprintSpeed: 14,
    controlRadius: 1.5, kickPower: 25, passAccuracy: 0.9, shotAccuracy: 0.8,
    aiReactionTime: 0.2, aiAggressiveness: 0.7,
};

const GAME_CONFIG = {
    matchDuration: 3 * 60, // 3 minutes total for gameplay loop speed
    halfDuration: 1.5 * 60,
    ballRadius: 0.22, ballMass: 0.45, ballFriction: 0.98, ballBounce: 0.6, gravity: 20,
    cameraHeight: 25, cameraDistance: 35, cameraAngle: 45, cameraSmoothness: 0.05,
};

const GAME_STATE = {
    LOADING: 'loading', MENU: 'menu', KICKOFF: 'kickoff', PLAYING: 'playing',
    GOAL_SCORED: 'goal_scored', HALFTIME: 'halftime', FULLTIME: 'fulltime', PAUSED: 'paused'
};

const TEAM_COLORS = {
    home: { primary: '#004d98', secondary: '#a50044', gk: '#ffff00' }, // Default Barca
    away: { primary: '#ffffff', secondary: '#ffffff', gk: '#00ff00' }  // Default RM
};

const FORMATION_OFFSETS = {
    '4-3-3': [
        { z: -50, x: 0, isGK: true }, // GK
        { z: -35, x: -25 }, { z: -38, x: -8 }, { z: -38, x: 8 }, { z: -35, x: 25 }, // DEF
        { z: -15, x: -15 }, { z: -20, x: 0 }, { z: -15, x: 15 }, // MID
        { z: 10, x: -30 }, { z: 20, x: 0 }, { z: 10, x: 30 } // FWD
    ],
    '4-2-3-1': [
        { z: -50, x: 0, isGK: true },
        { z: -35, x: -25 }, { z: -38, x: -8 }, { z: -38, x: 8 }, { z: -35, x: 25 }, // DEF
        { z: -20, x: -10 }, { z: -20, x: 10 }, // CDM
        { z: 0, x: -25 }, { z: 5, x: 0 }, { z: 0, x: 25 }, // CAM/W
        { z: 20, x: 0 } // ST
    ]
};

// =============================================================================
// GLOBAL STATE
// =============================================================================
let gameState = GAME_STATE.LOADING;
let scene, camera, renderer, clock;
let playTime = 0;
let homeScore = 0, awayScore = 0;
let homePlayers = [], awayPlayers = [];
let gameBall = null, ballShadow = null;
let controlledPlayer = null;
let matchStats = { home: { shots: 0, possTickets: 0 }, away: { shots: 0, possTickets: 0 } };

let inputs = { W: false, A: false, S: false, D: false, Shift: false };

// =============================================================================
// INITIALIZATION
// =============================================================================
async function init() {
    setupThreeJS();
    setupLighting();
    const pitch = createPitch();
    createGoal(1); // Home Goal
    createGoal(-1); // Away Goal
    gameBall = createBall();

    // Fetch Data
    const data = await fetchMatchData();
    setupTeams(data.home, data.away);

    // UI Events
    bindUIEvents();

    clock = new THREE.Clock();
    renderer.setAnimationLoop(gameLoop);

    gameState = GAME_STATE.MENU;
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('start-match-btn').disabled = false;
    document.getElementById('start-match-btn').textContent = "Play Match";
    document.getElementById('auto-sim-btn').disabled = false;
}

// Fetch user team and random opponent
async function fetchMatchData() {
    let homePlayersData = [];
    let awayPlayersData = [];
    let homeTeamName = "My Team";
    let awayTeamName = "Opponent";
    let homeFormation = '4-3-3';
    let awayFormation = '4-3-3';

    try {
        const [userRes, playersRes] = await Promise.all([
            fetch('/api/user'), fetch('/api/players')
        ]);
        const userData = (await userRes.json()).gameData;
        const allPlayers = (await playersRes.json()).players;

        if (userData && userData.squad && userData.squad.main) {
            homePlayersData = userData.squad.main.map(id => allPlayers.find(p => p.id === id)).filter(p => p);
            if (userData.formation) homeFormation = userData.formation;
        }

        // Dummy Opponent
        awayPlayersData = [...allPlayers].sort(() => 0.5 - Math.random()).slice(0, 11);

        document.getElementById('home-name').textContent = homeTeamName.toUpperCase();
        document.getElementById('away-name').textContent = awayTeamName.toUpperCase();
    } catch (e) {
        console.error("Failed to fetch players, using defaults.");
        // Fallback dummy data
        for (let i = 0; i < 11; i++) {
            homePlayersData.push({ name: `H_Player ${i + 1}`, overall: 80 });
            awayPlayersData.push({ name: `A_Player ${i + 1}`, overall: 80 });
        }
    }

    // Pad if < 11
    while (homePlayersData.length < 11) homePlayersData.push({ name: 'Rookie', overall: 60 });
    while (awayPlayersData.length < 11) awayPlayersData.push({ name: 'Rookie', overall: 60 });

    return {
        home: { players: homePlayersData, formation: homeFormation },
        away: { players: awayPlayersData, formation: awayFormation }
    };
}

// =============================================================================
// THREE.JS SETUP
// =============================================================================
function setupThreeJS() {
    const container = document.getElementById('game-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 100, 500);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    scene.add(sun);
}

function createPitchTex() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; canvas.height = 1400;
    const ctx = canvas.getContext('2d');

    const scaleX = canvas.width / PITCH_CONFIG.length;
    const scaleZ = canvas.height / PITCH_CONFIG.width;

    // Grass stripes
    const stripeWidth = 5 * scaleX;
    for (let x = 0; x < canvas.width; x += stripeWidth * 2) {
        ctx.fillStyle = PITCH_CONFIG.grassColor1; ctx.fillRect(x, 0, stripeWidth, canvas.height);
        ctx.fillStyle = PITCH_CONFIG.grassColor2; ctx.fillRect(x + stripeWidth, 0, stripeWidth, canvas.height);
    }

    ctx.strokeStyle = PITCH_CONFIG.lineColor; ctx.lineWidth = 4; ctx.fillStyle = PITCH_CONFIG.lineColor;

    // Outer bound
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    // Center line
    ctx.beginPath(); ctx.moveTo(canvas.width / 2, 10); ctx.lineTo(canvas.width / 2, canvas.height - 10); ctx.stroke();
    // Center circle
    ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height / 2, PITCH_CONFIG.centerCircleRadius * scaleZ, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height / 2, 5, 0, Math.PI * 2); ctx.fill();

    // Penalty areas
    const penLx = PITCH_CONFIG.penaltyAreaLength * scaleX;
    const penWz = PITCH_CONFIG.penaltyAreaWidth * scaleZ;
    ctx.strokeRect(10, (canvas.height - penWz) / 2, penLx, penWz);
    ctx.strokeRect(canvas.width - 10 - penLx, (canvas.height - penWz) / 2, penLx, penWz);

    // Goal areas
    const goalLx = PITCH_CONFIG.goalAreaLength * scaleX;
    const goalWz = PITCH_CONFIG.goalAreaWidth * scaleZ;
    ctx.strokeRect(10, (canvas.height - goalWz) / 2, goalLx, goalWz);
    ctx.strokeRect(canvas.width - 10 - goalLx, (canvas.height - goalWz) / 2, goalLx, goalWz);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
}

function createPitch() {
    const geo = new THREE.PlaneGeometry(PITCH_CONFIG.length, PITCH_CONFIG.width);
    const mat = new THREE.MeshStandardMaterial({ map: createPitchTex(), roughness: 0.8, metalness: 0.1 });
    const pitch = new THREE.Mesh(geo, mat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.receiveShadow = true;
    scene.add(pitch);
    return pitch;
}

function createGoal(side) {
    const group = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, wireframe: true });

    const w = PITCH_CONFIG.goalWidth, h = PITCH_CONFIG.goalHeight, d = PITCH_CONFIG.goalDepth, r = 0.06;

    // Posts
    const lp = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), postMat); lp.position.set(-w / 2, h / 2, 0); group.add(lp);
    const rp = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), postMat); rp.position.set(w / 2, h / 2, 0); group.add(rp);
    const cb = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 8), postMat); cb.rotation.z = Math.PI / 2; cb.position.set(0, h, 0); group.add(cb);

    // Net back
    const bn = new THREE.Mesh(new THREE.PlaneGeometry(w, h), netMat); bn.position.set(0, h / 2, -d * side); group.add(bn);
    // Net top
    const tn = new THREE.Mesh(new THREE.PlaneGeometry(w, d), netMat); tn.rotation.x = Math.PI / 2; tn.position.set(0, h, -d * side / 2); group.add(tn);

    // The field lies along the Z axis (length) and X axis (width).
    // In our pitch texture, length is X. We need to match coordinates.
    // Wait, Pitch Plane geometry: width is along X, length is along Y in 2D which becomes Z.
    // Length is 105, Width is 68. So goals are at z = +/- halfLength.
    const zPos = side * PITCH_CONFIG.halfLength;
    group.position.set(0, 0, zPos);

    if (side === 1) group.rotation.y = Math.PI; // flip home goal
    scene.add(group);
}

function createBall() {
    const geo = new THREE.SphereGeometry(GAME_CONFIG.ballRadius, 16, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const ball = new THREE.Mesh(geo, mat);
    ball.castShadow = true; ball.position.set(0, GAME_CONFIG.ballRadius, 0);
    ball.userData = { vel: new THREE.Vector3(), inFlight: false, holder: null, lastObj: null };
    scene.add(ball);

    // Simple shadow
    const shadowGeo = new THREE.PlaneGeometry(0.5, 0.5);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false });
    ballShadow = new THREE.Mesh(shadowGeo, shadowMat);
    ballShadow.rotation.x = -Math.PI / 2;
    ballShadow.position.y = 0.01;
    scene.add(ballShadow);

    return ball;
}

// =============================================================================
// PLAYER SETUP
// =============================================================================
function createPlayerMesh(isHome, isGK) {
    const group = new THREE.Group();
    const colors = isHome ? TEAM_COLORS.home : TEAM_COLORS.away;
    const jerseyC = isGK ? colors.gk : colors.primary;
    const height = PLAYER_CONFIG.height;

    const bMat = new THREE.MeshStandardMaterial({ color: jerseyC });
    const sMat = new THREE.MeshStandardMaterial({ color: colors.secondary });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });

    // Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, height * 0.4, 8), bMat); body.position.y = height * 0.5; body.castShadow = true; group.add(body);
    // Shorts
    const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, height * 0.15, 8), sMat); shorts.position.y = height * 0.25; shorts.castShadow = true; group.add(shorts);
    // Head -> adding small indicator cube for directional facing
    const headGroup = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), skinMat); head.castShadow = true; headGroup.add(head);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.1), skinMat); nose.position.set(0, 0, 0.12); headGroup.add(nose);
    headGroup.position.y = height * 0.85;
    group.add(headGroup);

    // controlled indicator (hidden by default)
    const indicator = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    indicator.position.y = height + 0.3;
    indicator.rotation.x = Math.PI;
    indicator.name = "indicator";
    indicator.visible = false;
    group.add(indicator);

    return group;
}

function setupTeams(homeData, awayData) {
    const hForm = FORMATION_OFFSETS[homeData.formation] || FORMATION_OFFSETS['4-3-3'];
    const aForm = FORMATION_OFFSETS[awayData.formation] || FORMATION_OFFSETS['4-3-3'];

    homeData.players.forEach((p, i) => {
        const pos = hForm[i];
        if (!pos) return;
        const mesh = createPlayerMesh(true, pos.isGK);
        // Note: Field X is Width (short side), Field Z is Length (long side).
        // Our formation offsets assumed Z is length and X is width.
        mesh.position.set(pos.x, 0, pos.z);

        const speedMod = p.overall ? (p.overall / 80) : 1;
        mesh.userData = {
            id: 'h' + i, name: p.name, overall: p.overall || 75, isHome: true, isGK: pos.isGK,
            baseX: pos.x, baseZ: pos.z,
            stamina: 100, speedMod: speedMod,
            hasBall: false
        };
        scene.add(mesh);
        homePlayers.push(mesh);
    });

    awayData.players.forEach((p, i) => {
        const pos = aForm[i];
        if (!pos) return;
        const mesh = createPlayerMesh(false, pos.isGK);
        mesh.position.set(pos.x, 0, -pos.z); // Mirror Z
        mesh.rotation.y = Math.PI;

        const speedMod = p.overall ? (p.overall / 80) : 1;
        mesh.userData = {
            id: 'a' + i, name: p.name, overall: p.overall || 75, isHome: false, isGK: pos.isGK,
            baseX: pos.x, baseZ: -pos.z,
            stamina: 100, speedMod: speedMod,
            hasBall: false
        };
        scene.add(mesh);
        awayPlayers.push(mesh);
    });

    controlledPlayer = homePlayers[5] || homePlayers[1]; // Pick a midfielder
    controlledPlayer.getObjectByName('indicator').visible = true;
    updateHUDControlled();
}

// =============================================================================
// INPUTS & UI BINDINGS
// =============================================================================
function bindUIEvents() {
    document.addEventListener('keydown', e => {
        if (e.code === 'KeyW') inputs.W = true;
        if (e.code === 'KeyS') inputs.S = true;
        if (e.code === 'KeyA') inputs.A = true;
        if (e.code === 'KeyD') inputs.D = true;
        if (e.code === 'ShiftLeft') inputs.Shift = true;

        if (gameState === GAME_STATE.PLAYING) {
            if (e.code === 'Space') handleSpaceButton();
            if (e.code === 'KeyE') handleShootTackle();
            if (e.code === 'KeyQ') handleThroughBall();
            if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
        }
    });

    document.addEventListener('keyup', e => {
        if (e.code === 'KeyW') inputs.W = false;
        if (e.code === 'KeyS') inputs.S = false;
        if (e.code === 'KeyA') inputs.A = false;
        if (e.code === 'KeyD') inputs.D = false;
        if (e.code === 'ShiftLeft') inputs.Shift = false;
    });

    document.getElementById('start-match-btn').addEventListener('click', () => {
        document.getElementById('main-menu').classList.remove('visible');
        document.getElementById('hud').classList.add('visible');
        gameState = GAME_STATE.KICKOFF;
        resetPitch();
        gameState = GAME_STATE.PLAYING;
    });

    document.getElementById('resume-btn').addEventListener('click', () => {
        togglePause();
    });
}

function updateHUDControlled() {
    if (controlledPlayer) {
        document.getElementById('controlled-player-name').textContent = controlledPlayer.userData.name;
        document.getElementById('stamina-fill').style.width = controlledPlayer.userData.stamina + '%';
    }
}

function togglePause() {
    if (gameState === GAME_STATE.PLAYING) {
        gameState = GAME_STATE.PAUSED;
        document.getElementById('pause-menu').classList.add('visible');
    } else if (gameState === GAME_STATE.PAUSED) {
        gameState = GAME_STATE.PLAYING;
        document.getElementById('pause-menu').classList.remove('visible');
    }
}

// =============================================================================
// ACTIONS
// =============================================================================
function switchPlayer() {
    if (!controlledPlayer) return;

    // Find closest player to ball that isn't current and isn't GK
    let closest = null, minDist = Infinity;
    homePlayers.forEach(p => {
        if (p !== controlledPlayer && !p.userData.isGK) {
            let d = p.position.distanceTo(gameBall.position);
            if (d < minDist) { minDist = d; closest = p; }
        }
    });

    if (closest) {
        controlledPlayer.getObjectByName('indicator').visible = false;
        controlledPlayer.userData.hasBall = false; // drop ball
        controlledPlayer = closest;
        controlledPlayer.getObjectByName('indicator').visible = true;
        updateHUDControlled();
    }
}

function handleSpaceButton() {
    if (controlledPlayer.userData.hasBall) {
        // Pass
        executePass();
    } else {
        // Switch
        switchPlayer();
    }
}

function executePass() {
    let passer = controlledPlayer;
    let bestTgt = null, bestScore = -Infinity;

    const faceDir = new THREE.Vector3(0, 0, 1).applyQuaternion(passer.quaternion);

    homePlayers.forEach(p => {
        if (p === passer) return;
        const toP = new THREE.Vector3().subVectors(p.position, passer.position).normalize();
        const dist = passer.position.distanceTo(p.position);
        const dot = faceDir.dot(toP);

        let score = (dot * 100) - dist;
        if (dot > 0.3 && score > bestScore) { bestScore = score; bestTgt = p; }
    });

    if (bestTgt) {
        passer.userData.hasBall = false;
        const dir = new THREE.Vector3().subVectors(bestTgt.position, gameBall.position).normalize();
        const pwr = Math.min(PLAYER_CONFIG.kickPower * 0.8, passer.position.distanceTo(bestTgt.position) * 1.5);
        gameBall.userData.vel.copy(dir.multiplyScalar(pwr));
        gameBall.userData.vel.y = 2; // small chip
        gameBall.userData.inFlight = true;
        gameBall.userData.lastObj = passer;
    }
}

function handleThroughBall() {
    let passer = controlledPlayer;
    if (!passer.userData.hasBall) return;

    let fwds = homePlayers.filter(p => !p.userData.isGK && p !== passer);
    let tgt = fwds.reduce((b, c) => c.position.z < b.position.z ? c : b); // Smallest Z is closest to opponent goal (Z < 0)

    passer.userData.hasBall = false;
    let tPos = tgt.position.clone();
    tPos.z -= 15; // aimed ahead
    const dir = new THREE.Vector3().subVectors(tPos, gameBall.position).normalize();
    gameBall.userData.vel.copy(dir.multiplyScalar(PLAYER_CONFIG.kickPower * 0.9));
    gameBall.userData.lastObj = passer;
    gameBall.userData.inFlight = true;
}

function handleShootTackle() {
    if (controlledPlayer.userData.hasBall) {
        // Shoot
        let shooter = controlledPlayer;
        shooter.userData.hasBall = false;

        // Aim at away goal (Z = -halfLength)
        let gZ = -PITCH_CONFIG.halfLength;
        let tPos = new THREE.Vector3(Math.random() * 4 - 2, 1, gZ);
        let dir = new THREE.Vector3().subVectors(tPos, gameBall.position).normalize();

        const pwr = PLAYER_CONFIG.kickPower * 1.2 * shooter.userData.speedMod;
        gameBall.userData.vel.copy(dir.multiplyScalar(pwr));
        gameBall.userData.vel.y = 4;
        gameBall.userData.lastObj = shooter;
        gameBall.userData.inFlight = true;
    } else {
        // Tackle
        let carrier = awayPlayers.find(p => p.userData.hasBall);
        if (carrier) {
            if (controlledPlayer.position.distanceTo(carrier.position) < 2) {
                carrier.userData.hasBall = false;
                controlledPlayer.userData.hasBall = true;
                gameBall.userData.lastObj = controlledPlayer;
            }
        }
    }
}

// =============================================================================
// GAME LOOP & PHYSICS
// =============================================================================
function gameLoop() {
    const dt = Math.min(clock.getDelta(), 0.1);

    if (gameState === GAME_STATE.PLAYING) {
        playTime += dt;
        updateTimeUI();

        handlePlayerMovement(dt);
        updateBallPhysics(dt);
        handleAI(dt);
        updateCamera();
        checkBallControl();
        drawRadar();

        if (playTime >= GAME_CONFIG.matchDuration) {
            endMatch();
        } else if (playTime >= GAME_CONFIG.halfDuration && document.getElementById('half-indicator').textContent === "1ST HALF") {
            doHalfTime();
        }
    }

    renderer.render(scene, camera);
}

function handlePlayerMovement(dt) {
    if (!controlledPlayer) return;

    let v = new THREE.Vector3();
    if (inputs.W) v.z -= 1;
    if (inputs.S) v.z += 1;
    if (inputs.A) v.x -= 1;
    if (inputs.D) v.x += 1;

    let p = controlledPlayer;

    if (v.lengthSq() > 0) {
        v.normalize();
        let speed = inputs.Shift && p.userData.stamina > 0 ? PLAYER_CONFIG.sprintSpeed : PLAYER_CONFIG.runSpeed;
        speed *= p.userData.speedMod;

        if (inputs.Shift && p.userData.stamina > 0) p.userData.stamina -= 20 * dt;

        p.position.add(v.multiplyScalar(speed * dt));
        p.rotation.y = Math.atan2(v.x, v.z);

        // Keep bounds
        p.position.x = Math.max(-PITCH_CONFIG.halfWidth, Math.min(PITCH_CONFIG.halfWidth, p.position.x));
        p.position.z = Math.max(-PITCH_CONFIG.halfLength, Math.min(PITCH_CONFIG.halfLength, p.position.z));
    } else {
        p.userData.stamina = Math.min(100, p.userData.stamina + 10 * dt);
    }
    updateHUDControlled();

    if (p.userData.hasBall) {
        let bo = new THREE.Vector3(0, 0, 0.5).applyQuaternion(p.quaternion);
        gameBall.position.set(p.position.x + bo.x, GAME_CONFIG.ballRadius, p.position.z + bo.z);
        gameBall.userData.vel.set(0, 0, 0);

        // Possession tracking
        matchStats.home.possTickets++;
    }
}

function handleAI(dt) {
    // Basic AI fallback logic for un-controlled home players
    homePlayers.forEach(p => {
        if (p === controlledPlayer) return;
        if (p.userData.isGK) {
            p.position.x = THREE.MathUtils.lerp(p.position.x, gameBall.position.x * 0.3, dt);
            return;
        }

        // Return to formation
        let tx = p.userData.baseX;
        let tz = p.userData.baseZ;

        // Adjust based on ball
        if (gameBall.position.z < 0) {
            tz -= 10; // attack
        } else {
            tz += 10; // defend
        }

        p.position.x = THREE.MathUtils.lerp(p.position.x, tx, dt * 2);
        p.position.z = THREE.MathUtils.lerp(p.position.z, tz, dt * 2);
    });

    // Away Team logic
    let awayHasBall = awayPlayers.some(p => p.userData.hasBall);

    awayPlayers.forEach(p => {
        if (p.userData.isGK) {
            p.position.x = THREE.MathUtils.lerp(p.position.x, gameBall.position.x * 0.3, dt);
            return;
        }

        let speed = PLAYER_CONFIG.runSpeed * p.userData.speedMod;

        if (p.userData.hasBall) {
            matchStats.away.possTickets++;
            // Dribble towards home goal (Z > 0)
            let dir = new THREE.Vector3(0, 0, 1);

            // Random pass/shoot
            if (Math.random() < 0.01) {
                if (p.position.z > PITCH_CONFIG.halfLength - 20) {
                    // Shoot
                    p.userData.hasBall = false;
                    let tgPos = new THREE.Vector3((Math.random() - 0.5) * 5, 1, PITCH_CONFIG.halfLength);
                    let vdir = new THREE.Vector3().subVectors(tgPos, gameBall.position).normalize();
                    gameBall.userData.vel.copy(vdir.multiplyScalar(PLAYER_CONFIG.kickPower));
                    gameBall.userData.inFlight = true;
                    gameBall.userData.lastObj = p;
                } else {
                    // Clear/Pass
                    p.userData.hasBall = false;
                    gameBall.userData.vel.set((Math.random() - 0.5) * 10, 2, 15);
                    gameBall.userData.inFlight = true;
                    gameBall.userData.lastObj = p;
                }
            } else {
                p.position.add(dir.multiplyScalar(speed * dt));
                p.rotation.y = Math.atan2(dir.x, dir.z);
                let bo = new THREE.Vector3(0, 0, 0.5).applyQuaternion(p.quaternion);
                gameBall.position.set(p.position.x + bo.x, GAME_CONFIG.ballRadius, p.position.z + bo.z);
            }
        } else {
            // Chase ball if near, else formation
            let dist = p.position.distanceTo(gameBall.position);
            if (!awayHasBall && dist < 15) {
                let dir = new THREE.Vector3().subVectors(gameBall.position, p.position).normalize();
                p.position.add(dir.multiplyScalar(speed * 1.2 * dt));
                p.rotation.y = Math.atan2(dir.x, dir.z);
            } else {
                let tx = p.userData.baseX;
                let tz = p.userData.baseZ;
                if (gameBall.position.z > 0) tz += 10;

                p.position.x = THREE.MathUtils.lerp(p.position.x, tx, dt * 2);
                p.position.z = THREE.MathUtils.lerp(p.position.z, tz, dt * 2);
            }
        }
    });

}

function updateBallPhysics(dt) {
    let b = gameBall;
    let v = b.userData.vel;

    if (b.userData.inFlight || (!homePlayers.some(p => p.userData.hasBall) && !awayPlayers.some(p => p.userData.hasBall))) {
        // Gravity
        if (b.position.y > GAME_CONFIG.ballRadius) {
            v.y -= GAME_CONFIG.gravity * dt;
        }

        b.position.addScaledVector(v, dt);

        // Ground
        if (b.position.y <= GAME_CONFIG.ballRadius) {
            b.position.y = GAME_CONFIG.ballRadius;
            v.y *= -GAME_CONFIG.ballBounce;
            v.x *= GAME_CONFIG.ballFriction;
            v.z *= GAME_CONFIG.ballFriction;
            if (Math.abs(v.y) < 1) v.y = 0;
            if (v.length() < 0.5) b.userData.inFlight = false;
        }

        // Keep ball on pitch bounds roughly
        if (Math.abs(b.position.x) > PITCH_CONFIG.halfWidth + 2) v.x *= -1;
        if (Math.abs(b.position.z) > PITCH_CONFIG.halfLength + 2) v.z *= -1;

        // Shadow update
        ballShadow.position.x = b.position.x;
        ballShadow.position.z = b.position.z;
    }

    checkGoal();
}

function checkBallControl() {
    if (gameBall.userData.vel.length() > 10) return; // Cannot control fast ball easily

    let all = [...homePlayers, ...awayPlayers];
    let closest = null, minDist = PLAYER_CONFIG.controlRadius;

    all.forEach(p => {
        let d = p.position.distanceTo(gameBall.position);
        if (d < minDist && p.position.y < 1) { minDist = d; closest = p; }
    });

    if (closest && !closest.userData.hasBall) {
        all.forEach(x => x.userData.hasBall = false);
        closest.userData.hasBall = true;
        gameBall.userData.inFlight = false;

        if (closest.userData.isHome && !closest.userData.isGK && closest !== controlledPlayer) {
            controlledPlayer.getObjectByName('indicator').visible = false;
            controlledPlayer = closest;
            controlledPlayer.getObjectByName('indicator').visible = true;
        }
    }
}

function updateCamera() {
    let bPos = gameBall.position;
    let tCamX = bPos.x * 0.3;
    let tCamZ = bPos.z + GAME_CONFIG.cameraDistance;
    let tCamY = GAME_CONFIG.cameraHeight;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, tCamX, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, tCamY, 0.05);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, tCamZ, 0.05);

    let lookTgt = new THREE.Vector3(bPos.x, 0, bPos.z - 5);
    camera.lookAt(lookTgt);
}

// =============================================================================
// MATCH RULES & UI
// =============================================================================
function resetPitch() {
    homePlayers.forEach(p => p.position.set(p.userData.baseX, 0, p.userData.baseZ));
    awayPlayers.forEach(p => p.position.set(p.userData.baseX, 0, p.userData.baseZ));
    homePlayers.forEach(p => p.userData.hasBall = false);
    awayPlayers.forEach(p => p.userData.hasBall = false);

    gameBall.position.set(0, GAME_CONFIG.ballRadius, 0);
    gameBall.userData.vel.set(0, 0, 0);
}

function checkGoal() {
    if (Math.abs(gameBall.position.z) > PITCH_CONFIG.halfLength && Math.abs(gameBall.position.x) < PITCH_CONFIG.goalWidth / 2) {
        if (gameBall.position.y < PITCH_CONFIG.goalHeight) {
            // It's in!
            if (gameBall.position.z < 0) {
                // Away Goal is at -Z (Home scores)
                homeScore++;
                matchStats.home.shots++;
                showGoalAnim('home');
            } else {
                awayScore++;
                matchStats.away.shots++;
                showGoalAnim('away');
            }
        }
    }
}

function showGoalAnim(team) {
    gameState = GAME_STATE.GOAL_SCORED;
    document.getElementById('home-score').textContent = homeScore;
    document.getElementById('away-score').textContent = awayScore;

    let ov = document.getElementById('goal-overlay');
    document.getElementById('goal-scorer').textContent = team === 'home' ? 'YOUR TEAM SCORED!' : 'AI SCORED';
    ov.classList.add('visible');

    setTimeout(() => {
        ov.classList.remove('visible');
        resetPitch();
        gameState = GAME_STATE.PLAYING;
    }, 3000);
}

function updateTimeUI() {
    // scale playTime (max e.g. 180s) to 90 mins
    let matchMin = Math.floor((playTime / GAME_CONFIG.matchDuration) * 90);
    let ds = matchMin.toString().padStart(2, '0') + ":00";
    document.getElementById('match-time').textContent = ds;
}

function doHalfTime() {
    gameState = GAME_STATE.HALFTIME;
    document.getElementById('half-indicator').textContent = "2ND HALF";

    // Swap sides visually
    homePlayers.forEach(p => { p.userData.baseZ *= -1; });
    awayPlayers.forEach(p => { p.userData.baseZ *= -1; });

    resetPitch();

    setTimeout(() => {
        gameState = GAME_STATE.PLAYING;
    }, 2000);
}

function drawRadar() {
    const canvas = document.getElementById('radar-canvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width; const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    // pitch outlines
    ctx.strokeStyle = 'white';
    ctx.strokeRect(0, 0, w, h);
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

    // Scale from 3D coords to radar canvas
    // 3D X: -34 to 34 -> Radar X: 0 to w
    // 3D Z: -52.5 to 52.5 -> Radar Y: 0 to h
    const toRX = (x) => ((x + PITCH_CONFIG.halfWidth) / PITCH_CONFIG.width) * w;
    const toRY = (z) => ((z + PITCH_CONFIG.halfLength) / PITCH_CONFIG.length) * h;

    ctx.fillStyle = TEAM_COLORS.home.primary;
    homePlayers.forEach(p => {
        ctx.beginPath(); ctx.arc(toRX(p.position.x), toRY(p.position.z), 3, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = TEAM_COLORS.away.primary;
    awayPlayers.forEach(p => {
        ctx.beginPath(); ctx.arc(toRX(p.position.x), toRY(p.position.z), 3, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(toRX(gameBall.position.x), toRY(gameBall.position.z), 2, 0, Math.PI * 2); ctx.fill();
}

async function endMatch() {
    gameState = GAME_STATE.FULLTIME;
    document.getElementById('hud').classList.remove('visible');

    let ft = document.getElementById('fulltime-menu');
    ft.classList.add('visible');

    let resTag = "DRAW";
    let color = "#fff";
    if (homeScore > awayScore) { resTag = "VICTORY"; color = "#4CAF50"; }
    else if (homeScore < awayScore) { resTag = "DEFEAT"; color = "#f44336"; }

    document.getElementById('ft-result').textContent = resTag;
    document.getElementById('ft-result').style.color = color;

    document.getElementById('ft-home-score').textContent = homeScore;
    document.getElementById('ft-away-score').textContent = awayScore;

    const tP = matchStats.home.possTickets + matchStats.away.possTickets || 1;
    document.getElementById('ft-home-poss').textContent = Math.round((matchStats.home.possTickets / tP) * 100) + "%";
    document.getElementById('ft-away-poss').textContent = Math.round((matchStats.away.possTickets / tP) * 100) + "%";

    // Reward Call
    try {
        await fetch('/api/match', { method: 'POST' });
        // Handled silently, balance is updated on backend.
    } catch (e) {
        console.error("Match reward failed", e);
    }
}

// =============================================================================
// BOOTSTRAP
// =============================================================================
window.onload = init;
