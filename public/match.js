// FM-Style Match Engine with Player Movement
let userData = null;
let allPlayers = [];
let matchState = null;
let chanceResolve = null;
let chanceTimeout = null;
let cooldownUntil = 0;
let playerAnimationInterval = null;
let matchRunning = false;

const COOLDOWN_MS = 20000;

const MATCH_REWARDS = {
    win: { gp: 5000, eCoins: 10 },
    draw: { gp: 2000, eCoins: 5 },
    loss: { gp: 1000, eCoins: 2 }
};

const AI_TEAMS = [
    { name: 'FC Barcelona', strength: 85, formation: '4-3-3' },
    { name: 'Real Madrid', strength: 87, formation: '4-3-3' },
    { name: 'Manchester City', strength: 86, formation: '4-2-3-1' },
    { name: 'Liverpool', strength: 84, formation: '4-3-3' },
    { name: 'Bayern Munich', strength: 85, formation: '4-2-3-1' },
    { name: 'Paris Saint-Germain', strength: 83, formation: '4-3-3' },
    { name: 'Chelsea', strength: 82, formation: '3-4-3' },
    { name: 'Juventus', strength: 81, formation: '3-5-2' },
    { name: 'Arsenal', strength: 80, formation: '4-3-3' },
    { name: 'Manchester United', strength: 79, formation: '4-2-3-1' }
];

// Base formation positions (will be animated)
const FORMATION_POSITIONS = {
    '4-3-3': [
        { x: 50, y: 92, isGK: true },
        { x: 15, y: 75 }, { x: 38, y: 78 }, { x: 62, y: 78 }, { x: 85, y: 75 },
        { x: 30, y: 55 }, { x: 50, y: 50 }, { x: 70, y: 55 },
        { x: 20, y: 30 }, { x: 50, y: 25 }, { x: 80, y: 30 }
    ],
    '4-2-3-1': [
        { x: 50, y: 92, isGK: true },
        { x: 15, y: 75 }, { x: 38, y: 78 }, { x: 62, y: 78 }, { x: 85, y: 75 },
        { x: 35, y: 60 }, { x: 65, y: 60 },
        { x: 20, y: 40 }, { x: 50, y: 35 }, { x: 80, y: 40 },
        { x: 50, y: 20 }
    ],
    '3-5-2': [
        { x: 50, y: 92, isGK: true },
        { x: 30, y: 78 }, { x: 50, y: 80 }, { x: 70, y: 78 },
        { x: 10, y: 55 }, { x: 35, y: 58 }, { x: 50, y: 52 }, { x: 65, y: 58 }, { x: 90, y: 55 },
        { x: 35, y: 25 }, { x: 65, y: 25 }
    ],
    '4-4-2': [
        { x: 50, y: 92, isGK: true },
        { x: 15, y: 75 }, { x: 38, y: 78 }, { x: 62, y: 78 }, { x: 85, y: 75 },
        { x: 15, y: 50 }, { x: 38, y: 55 }, { x: 62, y: 55 }, { x: 85, y: 50 },
        { x: 35, y: 25 }, { x: 65, y: 25 }
    ],
    '3-4-3': [
        { x: 50, y: 92, isGK: true },
        { x: 30, y: 78 }, { x: 50, y: 80 }, { x: 70, y: 78 },
        { x: 15, y: 55 }, { x: 40, y: 58 }, { x: 60, y: 58 }, { x: 85, y: 55 },
        { x: 20, y: 28 }, { x: 50, y: 22 }, { x: 80, y: 28 }
    ]
};

// Store current player positions for animation
let homePlayers = [];
let awayPlayers = [];
let ballPosition = { x: 50, y: 50 };
let possessionTeam = 'home'; // 'home' or 'away'

async function init() {
    await loadUserData();
    await loadPlayers();
    updateSquadStatus();
    checkCooldown();
}

async function loadUserData() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        userData = data.gameData;
        document.getElementById('topGP').textContent = (userData.gp || 0).toLocaleString();
        document.getElementById('topEcoins').textContent = userData.eCoins || 0;
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

async function loadPlayers() {
    try {
        const response = await fetch('/api/players');
        const data = await response.json();
        allPlayers = data.players || [];
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

function calculateTeamStrength() {
    if (!userData.squad?.main) return 0;
    let total = 0, count = 0;
    userData.squad.main.forEach(playerId => {
        if (playerId) {
            const player = allPlayers.find(p => p.id === playerId);
            if (player) { total += player.overall || 0; count++; }
        }
    });
    return count > 0 ? Math.round(total / count) : 0;
}

function updateSquadStatus() {
    const playersInSquad = userData.squad?.main?.filter(id => id !== null && id !== undefined).length || 0;
    const strength = calculateTeamStrength();
    document.getElementById('playerStrength').textContent = strength;
    document.getElementById('playerCount').textContent = `${playersInSquad}/11`;
    const playBtn = document.getElementById('playBtn');
    if (playersInSquad >= 11) {
        document.getElementById('squadStatus').textContent = '✅ Squad Ready!';
        playBtn.disabled = false;
    } else {
        document.getElementById('squadStatus').innerHTML = `❌ Need ${11 - playersInSquad} more players!`;
        playBtn.disabled = true;
    }
}

function checkCooldown() {
    const stored = localStorage.getItem('matchCooldown');
    if (stored) {
        cooldownUntil = parseInt(stored);
        if (Date.now() < cooldownUntil) { updateCooldownDisplay(); }
    }
}

function updateCooldownDisplay() {
    const now = Date.now();
    if (now < cooldownUntil) {
        const remaining = Math.ceil((cooldownUntil - now) / 1000);
        document.getElementById('cooldownMsg').style.display = 'block';
        document.getElementById('cooldownMsg').textContent = `⏳ Wait ${remaining}s before next match`;
        document.getElementById('playBtn').disabled = true;
        setTimeout(updateCooldownDisplay, 1000);
    } else {
        document.getElementById('cooldownMsg').style.display = 'none';
        const playersInSquad = userData.squad?.main?.filter(id => id !== null && id !== undefined).length || 0;
        if (playersInSquad >= 11) document.getElementById('playBtn').disabled = false;
    }
}

// ==========================
// MATCH START
// ==========================
async function startMatch() {
    cooldownUntil = Date.now() + COOLDOWN_MS;
    localStorage.setItem('matchCooldown', cooldownUntil);

    const opponent = AI_TEAMS[Math.floor(Math.random() * AI_TEAMS.length)];
    const playerStrength = calculateTeamStrength();
    const homeFormation = userData.formation || '4-3-3';

    matchState = {
        playerScore: 0,
        opponentScore: 0,
        currentMinute: 0,
        opponent: opponent,
        playerStrength: playerStrength,
        homeFormation: homeFormation,
        stats: {
            possession: { home: 50, away: 50 },
            shots: { home: 0, away: 0 },
            shotsOnTarget: { home: 0, away: 0 },
            corners: { home: 0, away: 0 },
            fouls: { home: 0, away: 0 }
        }
    };

    matchRunning = true;
    possessionTeam = 'home';

    // UI updates
    document.getElementById('matchSetup').style.display = 'none';
    document.getElementById('matchLive').classList.add('active');
    document.getElementById('opponentName').textContent = opponent.name;
    document.getElementById('opponentStrength').textContent = opponent.strength;
    document.getElementById('liveOpponentName').textContent = opponent.name;
    document.getElementById('homeFormation').textContent = homeFormation;
    document.getElementById('awayFormation').textContent = opponent.formation;
    document.getElementById('matchEvents').innerHTML = '';

    // Initialize player positions
    initializePlayers(homeFormation, opponent.formation);
    drawPlayers();
    updateStatsDisplay();

    // Start continuous player animation
    startPlayerAnimation();

    addEvent(0, '⚽', 'Kick off! The match has begun!', 'normal');

    // Run the match simulation
    await runMatch();
}

// ==========================
// PLAYER INITIALIZATION
// ==========================
function initializePlayers(homeFormation, awayFormation) {
    const homeBase = FORMATION_POSITIONS[homeFormation] || FORMATION_POSITIONS['4-3-3'];
    const awayBase = FORMATION_POSITIONS[awayFormation] || FORMATION_POSITIONS['4-4-2'];

    // Home team (bottom half - attacking upward)
    homePlayers = homeBase.map((pos, i) => ({
        id: i,
        baseX: pos.x,
        baseY: pos.isGK ? 95 : 50 + (pos.y - 50) * 0.9, // Map to bottom half
        x: pos.x,
        y: pos.isGK ? 95 : 50 + (pos.y - 50) * 0.9,
        isGK: pos.isGK || false,
        vx: 0,
        vy: 0
    }));

    // Away team (top half - attacking downward, mirror Y)
    awayPlayers = awayBase.map((pos, i) => ({
        id: i,
        baseX: pos.x,
        baseY: pos.isGK ? 5 : 50 - (pos.y - 50) * 0.9, // Map to top half (mirrored)
        x: pos.x,
        y: pos.isGK ? 5 : 50 - (pos.y - 50) * 0.9,
        isGK: pos.isGK || false,
        vx: 0,
        vy: 0
    }));

    ballPosition = { x: 50, y: 50 };
}

// ==========================
// PLAYER ANIMATION
// ==========================
function startPlayerAnimation() {
    if (playerAnimationInterval) clearInterval(playerAnimationInterval);

    playerAnimationInterval = setInterval(() => {
        if (!matchRunning) return;

        // Animate all players
        animatePlayers();
        drawPlayers();
        updateBallPosition();

    }, 100); // 10 FPS for smooth movement
}

function animatePlayers() {
    const ballInfluence = 0.3; // How much ball affects player positions
    const randomWander = 2; // Random movement range
    const returnForce = 0.1; // Force to return to base position

    // Animate home players
    homePlayers.forEach(p => {
        if (p.isGK) {
            // GK moves slightly based on ball X
            p.x = p.baseX + (ballPosition.x - 50) * 0.15;
            p.y = p.baseY;
            return;
        }

        // Calculate target based on ball position and possession
        let targetX = p.baseX;
        let targetY = p.baseY;

        if (possessionTeam === 'home') {
            // Push forward when attacking
            targetY = p.baseY - 8;
            // Move towards ball area
            targetX = p.baseX + (ballPosition.x - 50) * ballInfluence * 0.5;
        } else {
            // Fall back when defending
            targetY = p.baseY + 5;
        }

        // Add randomness
        targetX += (Math.random() - 0.5) * randomWander;
        targetY += (Math.random() - 0.5) * randomWander;

        // Smooth movement
        p.x += (targetX - p.x) * 0.15;
        p.y += (targetY - p.y) * 0.15;

        // Keep in bounds
        p.x = Math.max(5, Math.min(95, p.x));
        p.y = Math.max(45, Math.min(98, p.y));
    });

    // Animate away players
    awayPlayers.forEach(p => {
        if (p.isGK) {
            p.x = p.baseX + (ballPosition.x - 50) * 0.15;
            p.y = p.baseY;
            return;
        }

        let targetX = p.baseX;
        let targetY = p.baseY;

        if (possessionTeam === 'away') {
            // Push forward when attacking
            targetY = p.baseY + 8;
            targetX = p.baseX + (ballPosition.x - 50) * ballInfluence * 0.5;
        } else {
            // Fall back when defending
            targetY = p.baseY - 5;
        }

        targetX += (Math.random() - 0.5) * randomWander;
        targetY += (Math.random() - 0.5) * randomWander;

        p.x += (targetX - p.x) * 0.15;
        p.y += (targetY - p.y) * 0.15;

        p.x = Math.max(5, Math.min(95, p.x));
        p.y = Math.max(2, Math.min(55, p.y));
    });
}

function updateBallPosition() {
    // Ball follows play - smooth movement
    const nearestPlayer = possessionTeam === 'home'
        ? homePlayers.filter(p => !p.isGK)[Math.floor(Math.random() * 10)]
        : awayPlayers.filter(p => !p.isGK)[Math.floor(Math.random() * 10)];

    if (nearestPlayer && Math.random() < 0.05) { // Occasional ball movement
        const targetX = nearestPlayer.x + (Math.random() - 0.5) * 15;
        const targetY = nearestPlayer.y + (Math.random() - 0.5) * 10;
        ballPosition.x += (targetX - ballPosition.x) * 0.3;
        ballPosition.y += (targetY - ballPosition.y) * 0.3;
    }

    // Keep ball in bounds
    ballPosition.x = Math.max(5, Math.min(95, ballPosition.x));
    ballPosition.y = Math.max(5, Math.min(95, ballPosition.y));

    // Update ball element
    const ball = document.getElementById('fmBall');
    ball.style.left = `${ballPosition.x}%`;
    ball.style.top = `${ballPosition.y}%`;
}

function drawPlayers() {
    const pitch = document.getElementById('fmPitch');

    // Update or create home player dots
    homePlayers.forEach((p, i) => {
        let dot = document.getElementById(`home-player-${i}`);
        if (!dot) {
            dot = document.createElement('div');
            dot.id = `home-player-${i}`;
            dot.className = `fm-player-dot home ${p.isGK ? 'gk' : ''}`;
            pitch.appendChild(dot);
        }
        dot.style.left = `${p.x}%`;
        dot.style.top = `${p.y}%`;
    });

    // Update or create away player dots
    awayPlayers.forEach((p, i) => {
        let dot = document.getElementById(`away-player-${i}`);
        if (!dot) {
            dot = document.createElement('div');
            dot.id = `away-player-${i}`;
            dot.className = `fm-player-dot away ${p.isGK ? 'gk' : ''}`;
            pitch.appendChild(dot);
        }
        dot.style.left = `${p.x}%`;
        dot.style.top = `${p.y}%`;
    });
}

function moveBallTo(x, y, duration = 800) {
    ballPosition.x = x;
    ballPosition.y = y;
    const ball = document.getElementById('fmBall');
    ball.style.transition = `all ${duration}ms ease`;
    ball.style.left = `${x}%`;
    ball.style.top = `${y}%`;
}

function highlightPitchArea(x, y) {
    const pitch = document.getElementById('fmPitch');
    const highlight = document.createElement('div');
    highlight.className = 'fm-pitch-highlight';
    highlight.style.left = `${x}%`;
    highlight.style.top = `${y}%`;
    pitch.appendChild(highlight);
    setTimeout(() => highlight.remove(), 1000);
}

// ==========================
// MATCH SIMULATION (Slower, FM-style)
// ==========================
async function runMatch() {
    // Match runs from minute 0 to 90
    // Each minute takes about 1-2 seconds real time = 90-180 seconds total (1.5 - 3 min)

    for (let minute = 1; minute <= 90; minute++) {
        if (!matchRunning) break;

        matchState.currentMinute = minute;
        document.getElementById('matchTime').textContent = `${minute}'`;
        document.getElementById('halfIndicator').textContent = minute <= 45 ? '1ST HALF' : '2ND HALF';

        // Wait based on minute (slower pace)
        await sleep(800 + Math.random() * 400); // ~1 second per minute

        // Change possession occasionally
        if (Math.random() < 0.15) {
            possessionTeam = possessionTeam === 'home' ? 'away' : 'home';
            adjustPossession(possessionTeam === 'home');
        }

        // Generate events at specific minutes
        await generateMinuteEvent(minute);

        // Update stats display
        updateStatsDisplay();

        // Scroll commentary
        const eventsContainer = document.getElementById('matchEvents');
        eventsContainer.scrollTop = eventsContainer.scrollHeight;

        // Half time
        if (minute === 45) {
            await handleHalfTime();
        }
    }

    // Full time
    await handleFullTime();
}

async function generateMinuteEvent(minute) {
    const rand = Math.random();
    const playerChance = matchState.playerStrength / (matchState.playerStrength + matchState.opponent.strength);
    const squadPlayers = getSquadPlayerNames();
    const randomPlayer = squadPlayers[Math.floor(Math.random() * squadPlayers.length)] || 'Player';

    // Only generate notable events sometimes (not every minute)
    if (rand > 0.25) return; // 75% of minutes have no commentary

    const eventRand = Math.random();

    if (eventRand < 0.12) {
        // Goal attempt
        const isHome = Math.random() < playerChance;
        const scored = Math.random() < (isHome ? 0.30 : 0.25);

        if (scored) {
            await handleGoal(minute, isHome, randomPlayer);
        } else {
            await handleShotSaved(minute, isHome, randomPlayer);
        }
    } else if (eventRand < 0.20) {
        // Shot miss
        await handleShotMiss(minute, Math.random() < playerChance, randomPlayer);
    } else if (eventRand < 0.28) {
        // Corner
        await handleCorner(minute, Math.random() < playerChance);
    } else if (eventRand < 0.35) {
        // Foul
        await handleFoul(minute, Math.random() < 0.5, randomPlayer);
    } else if (eventRand < 0.45) {
        // Card (rare)
        if (Math.random() < 0.2) {
            await handleCard(minute, Math.random() < 0.5, randomPlayer);
        }
    } else if (eventRand < 0.60) {
        // Attacking play commentary
        await handleAttackingPlay(minute, Math.random() < playerChance, randomPlayer);
    } else {
        // General play commentary
        await handleGeneralPlay(minute, Math.random() < playerChance, randomPlayer);
    }

    // Chance overlay (rare)
    if (Math.random() < 0.015 && minute > 10 && minute < 85) {
        const kinds = ['Chance', 'Free Kick', 'Penalty'];
        await handleChance(minute, kinds[Math.floor(Math.random() * kinds.length)], randomPlayer);
    }
}

async function handleGoal(minute, isHome, playerName) {
    if (isHome) {
        matchState.playerScore++;
        matchState.stats.shots.home++;
        matchState.stats.shotsOnTarget.home++;
        possessionTeam = 'away'; // Kick off goes to opponent
        moveBallTo(50, 10, 500);
        highlightPitchArea(50, 10);
        await sleep(300);
        addEvent(minute, '⚽', `GOOOAAL!! ${playerName} scores for your team!`, 'goal-home');
    } else {
        matchState.opponentScore++;
        matchState.stats.shots.away++;
        matchState.stats.shotsOnTarget.away++;
        possessionTeam = 'home';
        moveBallTo(50, 90, 500);
        highlightPitchArea(50, 90);
        await sleep(300);
        addEvent(minute, '⚽', `Goal for ${matchState.opponent.name}!`, 'goal-away');
    }
    updateScore();
    await sleep(1500); // Pause for goal celebration
    moveBallTo(50, 50, 500);
}

async function handleShotSaved(minute, isHome, playerName) {
    if (isHome) {
        matchState.stats.shots.home++;
        matchState.stats.shotsOnTarget.home++;
        moveBallTo(50, 15, 400);
        addEvent(minute, '🧤', `${playerName} shoots! Great save by the goalkeeper!`, 'chance');
    } else {
        matchState.stats.shots.away++;
        matchState.stats.shotsOnTarget.away++;
        moveBallTo(50, 85, 400);
        addEvent(minute, '🧤', `Shot from ${matchState.opponent.name}! Saved!`, 'normal');
    }
    possessionTeam = isHome ? 'away' : 'home';
}

async function handleShotMiss(minute, isHome, playerName) {
    if (isHome) {
        matchState.stats.shots.home++;
        moveBallTo(45 + Math.random() * 10, 3, 400);
        addEvent(minute, '🎯', `${playerName} fires wide! Close but not enough.`, 'normal');
    } else {
        matchState.stats.shots.away++;
        moveBallTo(45 + Math.random() * 10, 97, 400);
        addEvent(minute, '🎯', `${matchState.opponent.name} shoots wide.`, 'normal');
    }
}

async function handleCorner(minute, isHome) {
    if (isHome) {
        matchState.stats.corners.home++;
        moveBallTo(95, 5, 300);
        addEvent(minute, '🚩', 'Corner kick for your team.', 'normal');
    } else {
        matchState.stats.corners.away++;
        moveBallTo(5, 95, 300);
        addEvent(minute, '🚩', `Corner kick for ${matchState.opponent.name}.`, 'normal');
    }
}

async function handleFoul(minute, isHome, playerName) {
    if (isHome) {
        matchState.stats.fouls.home++;
        addEvent(minute, '⚠️', `Foul by ${playerName}. Free kick given.`, 'normal');
    } else {
        matchState.stats.fouls.away++;
        addEvent(minute, '⚠️', `Foul by ${matchState.opponent.name} player.`, 'normal');
    }
    possessionTeam = isHome ? 'away' : 'home';
}

async function handleCard(minute, isHome, playerName) {
    if (isHome) {
        matchState.stats.fouls.home++;
        addEvent(minute, '🟨', `Yellow card! ${playerName} is booked for a reckless challenge.`, 'card');
    } else {
        matchState.stats.fouls.away++;
        addEvent(minute, '🟨', `Yellow card shown to ${matchState.opponent.name} player.`, 'card');
    }
}

async function handleAttackingPlay(minute, isHome, playerName) {
    if (isHome) {
        possessionTeam = 'home';
        moveBallTo(40 + Math.random() * 20, 20 + Math.random() * 25, 600);
        const comments = [
            `${playerName} makes a dangerous run into the box!`,
            `Quick passing in the final third.`,
            `${playerName} looks for an opening...`,
            `Your team pressing high up the pitch.`
        ];
        addEvent(minute, '⚡', comments[Math.floor(Math.random() * comments.length)], 'normal');
    } else {
        possessionTeam = 'away';
        moveBallTo(40 + Math.random() * 20, 55 + Math.random() * 25, 600);
        addEvent(minute, '⚡', `${matchState.opponent.name} building pressure.`, 'normal');
    }
}

async function handleGeneralPlay(minute, isHome, playerName) {
    const comments = isHome ? [
        `${playerName} controls the ball in midfield.`,
        `Good possession by your team.`,
        `${playerName} spreads the play wide.`,
        `Patient build-up from the back.`
    ] : [
        `${matchState.opponent.name} with the ball.`,
        `Passing sequence by ${matchState.opponent.name}.`,
        `${matchState.opponent.name} looking for space.`
    ];

    possessionTeam = isHome ? 'home' : 'away';
    moveBallTo(30 + Math.random() * 40, 35 + Math.random() * 30, 600);
    addEvent(minute, '📢', comments[Math.floor(Math.random() * comments.length)], 'normal');
}

async function handleChance(minute, kind, playerName) {
    addEvent(minute, '🎯', `${kind.toUpperCase()} for your team!`, 'chance');
    await sleep(500);

    const result = await showChanceOverlay(kind);

    if (result.scored) {
        matchState.playerScore++;
        matchState.stats.shots.home++;
        matchState.stats.shotsOnTarget.home++;
        updateScore();
        moveBallTo(50, 10, 500);
        highlightPitchArea(50, 10);
        addEvent(minute, '⚽', `GOAL!! ${playerName} converts the ${kind}!`, 'goal-home');
        await sleep(1500);
        moveBallTo(50, 50, 500);
    } else {
        matchState.stats.shots.home++;
        addEvent(minute, '❌', `${kind} missed! The keeper made a great save!`, 'normal');
    }
}

async function handleHalfTime() {
    moveBallTo(50, 50, 500);
    addEvent(45, '⏸️', 'HALF TIME. The players head to the dressing rooms.', 'halftime');
    await sleep(2500);
    addEvent(46, '▶️', 'Second half underway!', 'halftime');
    possessionTeam = 'away';
}

async function handleFullTime() {
    matchRunning = false;
    if (playerAnimationInterval) clearInterval(playerAnimationInterval);

    moveBallTo(50, 50, 500);
    addEvent(90, '🏁', 'FULL TIME! The referee blows the final whistle.', 'halftime');

    await sleep(2000);
    showMatchResult();
}

// ==========================
// STATS & UI
// ==========================
function updateStatsDisplay() {
    const s = matchState.stats;
    document.getElementById('possHome').textContent = `${s.possession.home}%`;
    document.getElementById('possAway').textContent = `${s.possession.away}%`;
    document.getElementById('possBarHome').style.width = `${s.possession.home}%`;
    document.getElementById('possBarAway').style.width = `${s.possession.away}%`;
    updateStatBar('shots', s.shots.home, s.shots.away);
    updateStatBar('sot', s.shotsOnTarget.home, s.shotsOnTarget.away);
    updateStatBar('corners', s.corners.home, s.corners.away);
    updateStatBar('fouls', s.fouls.home, s.fouls.away);
}

function updateStatBar(stat, home, away) {
    document.getElementById(`${stat}Home`).textContent = home;
    document.getElementById(`${stat}Away`).textContent = away;
    const total = home + away || 1;
    document.getElementById(`${stat}BarHome`).style.width = `${(home / total) * 100}%`;
    document.getElementById(`${stat}BarAway`).style.width = `${(away / total) * 100}%`;
}

function adjustPossession(forHome) {
    const change = Math.floor(Math.random() * 3) + 1;
    if (forHome) {
        matchState.stats.possession.home = Math.min(65, matchState.stats.possession.home + change);
        matchState.stats.possession.away = 100 - matchState.stats.possession.home;
    } else {
        matchState.stats.possession.away = Math.min(65, matchState.stats.possession.away + change);
        matchState.stats.possession.home = 100 - matchState.stats.possession.away;
    }
}

function getSquadPlayerNames() {
    if (!userData.squad?.main) return ['Player'];
    const names = [];
    userData.squad.main.forEach(playerId => {
        if (playerId) {
            const player = allPlayers.find(p => p.id === playerId);
            if (player) {
                const nameParts = player.name.split(' ');
                names.push(nameParts[nameParts.length - 1]);
            }
        }
    });
    return names.length > 0 ? names : ['Player'];
}

function addEvent(minute, icon, text, type) {
    const container = document.getElementById('matchEvents');
    const div = document.createElement('div');
    div.className = `fm-event ${type}`;
    div.innerHTML = `
        <span class="fm-event-time">${minute}'</span>
        <span class="fm-event-icon">${icon}</span>
        <span class="fm-event-text">${text}</span>
    `;
    container.appendChild(div);
}

function updateScore() {
    document.getElementById('liveScore').textContent = `${matchState.playerScore} - ${matchState.opponentScore}`;
}

// ==========================
// CHANCE OVERLAY
// ==========================
function showChanceOverlay(kind) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('chanceOverlay');
        document.getElementById('chanceTitle').textContent = `🎯 ${kind.toUpperCase()}! Choose your shot!`;
        overlay.classList.add('active');

        let timeLeft = 10;
        document.getElementById('chanceTimer').textContent = `Time remaining: ${timeLeft}s`;
        chanceResolve = resolve;

        chanceTimeout = setInterval(() => {
            timeLeft--;
            document.getElementById('chanceTimer').textContent = `Time remaining: ${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(chanceTimeout);
                overlay.classList.remove('active');
                resolve({ scored: Math.random() < 0.3, direction: 'center', keeperDirection: 'center' });
            }
        }, 1000);
    });
}

function selectChance(direction) {
    clearInterval(chanceTimeout);
    document.getElementById('chanceOverlay').classList.remove('active');

    const directions = ['left', 'center', 'right'];
    const keeperDirection = directions[Math.floor(Math.random() * 3)];
    const scored = direction !== keeperDirection;

    const title = document.getElementById('chanceTitle').textContent;
    let successRate = 0.5;
    if (title.includes('PENALTY')) successRate = 0.75;
    else if (title.includes('FREE KICK')) successRate = 0.35;

    const finalScored = Math.random() < successRate && scored;

    if (chanceResolve) {
        chanceResolve({ scored: finalScored, direction, keeperDirection });
    }
}

// ==========================
// MATCH RESULT
// ==========================
async function showMatchResult() {
    let outcome, reward;
    if (matchState.playerScore > matchState.opponentScore) {
        outcome = 'win';
        reward = MATCH_REWARDS.win;
    } else if (matchState.playerScore < matchState.opponentScore) {
        outcome = 'loss';
        reward = MATCH_REWARDS.loss;
    } else {
        outcome = 'draw';
        reward = MATCH_REWARDS.draw;
    }

    try {
        const response = await fetch('/api/match', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            document.getElementById('topGP').textContent = data.newBalance.gp.toLocaleString();
            document.getElementById('topEcoins').textContent = data.newBalance.eCoins;
        }
    } catch (error) {
        console.error('Error updating match result:', error);
    }

    document.getElementById('matchLive').classList.remove('active');
    document.getElementById('finalScore').textContent = `${matchState.playerScore} - ${matchState.opponentScore}`;

    const outcomeEl = document.getElementById('matchOutcome');
    const outcomeText = { win: 'VICTORY!', draw: 'DRAW', loss: 'DEFEAT' };
    outcomeEl.textContent = outcomeText[outcome];
    outcomeEl.className = 'result-outcome ' + outcome;

    document.getElementById('rewardGP').textContent = `+${reward.gp.toLocaleString()}`;
    document.getElementById('rewardECoins').textContent = `+${reward.eCoins}`;

    document.getElementById('matchResult').classList.add('show');
}

function resetMatch() {
    matchRunning = false;
    if (playerAnimationInterval) clearInterval(playerAnimationInterval);

    document.getElementById('matchResult').classList.remove('show');
    document.getElementById('matchLive').classList.remove('active');
    document.getElementById('matchSetup').style.display = 'block';
    document.getElementById('matchEvents').innerHTML = '';

    // Remove player dots
    document.querySelectorAll('.fm-player-dot').forEach(dot => dot.remove());

    moveBallTo(50, 50);
    matchState = null;
    homePlayers = [];
    awayPlayers = [];

    checkCooldown();
    updateCooldownDisplay();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

document.addEventListener('DOMContentLoaded', init);
