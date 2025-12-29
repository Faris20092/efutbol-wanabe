// FM-Style Match Engine
let userData = null;
let allPlayers = [];
let matchState = null;
let chanceResolve = null;
let chanceTimeout = null;
let cooldownUntil = 0;

const COOLDOWN_MS = 20000; // 20 second cooldown

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
    { name: 'Manchester United', strength: 79, formation: '4-2-3-1' },
    { name: 'Brazil', strength: 87, formation: '4-2-3-1' },
    { name: 'Argentina', strength: 86, formation: '4-3-3' },
    { name: 'France', strength: 88, formation: '4-2-3-1' },
    { name: 'Germany', strength: 85, formation: '4-2-3-1' },
    { name: 'Spain', strength: 84, formation: '4-3-3' },
    { name: 'England', strength: 85, formation: '4-3-3' }
];

// Formation positions (percentage from top-left)
const FORMATION_POSITIONS = {
    '4-3-3': [
        { x: 50, y: 90, isGK: true },  // GK
        { x: 15, y: 70 }, { x: 38, y: 75 }, { x: 62, y: 75 }, { x: 85, y: 70 }, // DEF
        { x: 30, y: 50 }, { x: 50, y: 45 }, { x: 70, y: 50 }, // MID
        { x: 20, y: 25 }, { x: 50, y: 20 }, { x: 80, y: 25 }  // ATT
    ],
    '4-2-3-1': [
        { x: 50, y: 90, isGK: true },
        { x: 15, y: 70 }, { x: 38, y: 75 }, { x: 62, y: 75 }, { x: 85, y: 70 },
        { x: 35, y: 55 }, { x: 65, y: 55 },
        { x: 20, y: 35 }, { x: 50, y: 30 }, { x: 80, y: 35 },
        { x: 50, y: 15 }
    ],
    '3-5-2': [
        { x: 50, y: 90, isGK: true },
        { x: 30, y: 75 }, { x: 50, y: 78 }, { x: 70, y: 75 },
        { x: 10, y: 50 }, { x: 35, y: 55 }, { x: 50, y: 50 }, { x: 65, y: 55 }, { x: 90, y: 50 },
        { x: 35, y: 20 }, { x: 65, y: 20 }
    ],
    '4-4-2': [
        { x: 50, y: 90, isGK: true },
        { x: 15, y: 70 }, { x: 38, y: 75 }, { x: 62, y: 75 }, { x: 85, y: 70 },
        { x: 15, y: 45 }, { x: 38, y: 50 }, { x: 62, y: 50 }, { x: 85, y: 45 },
        { x: 35, y: 20 }, { x: 65, y: 20 }
    ],
    '3-4-3': [
        { x: 50, y: 90, isGK: true },
        { x: 30, y: 75 }, { x: 50, y: 78 }, { x: 70, y: 75 },
        { x: 15, y: 50 }, { x: 40, y: 55 }, { x: 60, y: 55 }, { x: 85, y: 50 },
        { x: 20, y: 22 }, { x: 50, y: 18 }, { x: 80, y: 22 }
    ]
};

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
    let total = 0;
    let count = 0;

    userData.squad.main.forEach(playerId => {
        if (playerId) {
            const player = allPlayers.find(p => p.id === playerId);
            if (player) {
                total += player.overall || 0;
                count++;
            }
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
        if (Date.now() < cooldownUntil) {
            updateCooldownDisplay();
            return;
        }
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
        if (playersInSquad >= 11) {
            document.getElementById('playBtn').disabled = false;
        }
    }
}

// ==========================
// MATCH START
// ==========================
async function startMatch() {
    // Set cooldown
    cooldownUntil = Date.now() + COOLDOWN_MS;
    localStorage.setItem('matchCooldown', cooldownUntil);

    // Select opponent
    const opponent = AI_TEAMS[Math.floor(Math.random() * AI_TEAMS.length)];
    const playerStrength = calculateTeamStrength();
    const homeFormation = userData.formation || '4-3-3';

    // Initialize match state
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
        },
        events: []
    };

    // Update UI
    document.getElementById('matchSetup').style.display = 'none';
    document.getElementById('matchLive').classList.add('active');
    document.getElementById('opponentName').textContent = opponent.name;
    document.getElementById('opponentStrength').textContent = opponent.strength;
    document.getElementById('liveOpponentName').textContent = opponent.name;
    document.getElementById('homeFormation').textContent = homeFormation;
    document.getElementById('awayFormation').textContent = opponent.formation;
    document.getElementById('matchEvents').innerHTML = '';

    // Draw players on pitch
    drawPlayersOnPitch(homeFormation, opponent.formation);

    // Reset stats display
    updateStatsDisplay();

    // Add kick-off event
    addEvent(0, '⚽', 'Kick off! The match begins!', 'normal');

    // Generate and process match events
    const events = generateMatchTimeline(playerStrength, opponent.strength);
    await processMatchEvents(events);
}

// ==========================
// PITCH VISUALIZATION
// ==========================
function drawPlayersOnPitch(homeFormation, awayFormation) {
    const pitch = document.getElementById('fmPitch');

    // Remove existing player dots (but keep ball and penalty areas)
    pitch.querySelectorAll('.fm-player-dot').forEach(dot => dot.remove());

    // Home team (bottom half, attacking upwards)
    const homePositions = FORMATION_POSITIONS[homeFormation] || FORMATION_POSITIONS['4-3-3'];
    homePositions.forEach((pos, i) => {
        const dot = document.createElement('div');
        dot.className = `fm-player-dot home ${pos.isGK ? 'gk' : ''}`;
        dot.style.left = `${pos.x}%`;
        dot.style.top = `${100 - pos.y + 50}%`; // Flip for home team (bottom half)
        if (pos.y > 50) dot.style.top = `${100 - (pos.y - 50)}%`;
        else dot.style.top = `${50 + (50 - pos.y)}%`;
        pitch.appendChild(dot);
    });

    // Away team (top half, attacking downwards) - mirror positions
    const awayPositions = FORMATION_POSITIONS[awayFormation] || FORMATION_POSITIONS['4-4-2'];
    awayPositions.forEach((pos, i) => {
        const dot = document.createElement('div');
        dot.className = `fm-player-dot away ${pos.isGK ? 'gk' : ''}`;
        dot.style.left = `${pos.x}%`;
        // Place in top half (y is inverted)
        if (pos.y > 50) dot.style.top = `${pos.y - 50}%`;
        else dot.style.top = `${50 - pos.y}%`;
        pitch.appendChild(dot);
    });
}

function moveBall(x, y) {
    const ball = document.getElementById('fmBall');
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
// STATS
// ==========================
function updateStatsDisplay() {
    const s = matchState.stats;

    // Possession
    document.getElementById('possHome').textContent = `${s.possession.home}%`;
    document.getElementById('possAway').textContent = `${s.possession.away}%`;
    document.getElementById('possBarHome').style.width = `${s.possession.home}%`;
    document.getElementById('possBarAway').style.width = `${s.possession.away}%`;

    // Shots
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
    const change = Math.floor(Math.random() * 5) + 2;
    if (forHome) {
        matchState.stats.possession.home = Math.min(70, matchState.stats.possession.home + change);
        matchState.stats.possession.away = 100 - matchState.stats.possession.home;
    } else {
        matchState.stats.possession.away = Math.min(70, matchState.stats.possession.away + change);
        matchState.stats.possession.home = 100 - matchState.stats.possession.away;
    }
}

// ==========================
// EVENT GENERATION
// ==========================
function generateMatchTimeline(playerStrength, opponentStrength) {
    const events = [];
    const playerChance = (playerStrength / (playerStrength + opponentStrength));
    const opponentChance = 1 - playerChance;

    // Generate events for each 5-minute block
    for (let minute = 5; minute <= 90; minute += 5) {
        const rand = Math.random();

        // Half time
        if (minute === 45) {
            events.push({ minute: 45, type: 'halftime' });
            continue;
        }

        // Random event based on probabilities
        if (rand < 0.15) {
            // Goal attempt
            const isHome = Math.random() < playerChance;
            const scored = Math.random() < (isHome ? 0.35 : 0.30);

            if (scored) {
                events.push({
                    minute,
                    type: isHome ? 'goal_player' : 'goal_opponent',
                    isHome
                });
            } else {
                events.push({
                    minute,
                    type: 'shot_saved',
                    isHome
                });
            }
        } else if (rand < 0.25) {
            // Shot off target
            events.push({
                minute,
                type: 'shot_miss',
                isHome: Math.random() < playerChance
            });
        } else if (rand < 0.35) {
            // Corner
            events.push({
                minute,
                type: 'corner',
                isHome: Math.random() < playerChance
            });
        } else if (rand < 0.42) {
            // Foul / Card
            const isHome = Math.random() < 0.5;
            const isCard = Math.random() < 0.25;
            events.push({
                minute,
                type: isCard ? 'card' : 'foul',
                isHome
            });
        } else if (rand < 0.55) {
            // Commentary
            events.push({
                minute,
                type: 'commentary',
                isHome: Math.random() < playerChance
            });
        }
    }

    // Interactive chance (40% probability)
    if (Math.random() < 0.4) {
        const chanceMinute = 15 + Math.floor(Math.random() * 70);
        const kinds = ['Chance', 'Free Kick', 'Penalty'];
        events.push({
            minute: chanceMinute,
            type: 'chance',
            kind: kinds[Math.floor(Math.random() * kinds.length)]
        });
    }

    // Full time
    events.push({ minute: 90, type: 'fulltime' });

    // Sort by minute
    events.sort((a, b) => a.minute - b.minute);

    return events;
}

// ==========================
// EVENT PROCESSING
// ==========================
async function processMatchEvents(events) {
    for (const event of events) {
        await sleep(1200 + Math.random() * 800);

        matchState.currentMinute = event.minute;
        document.getElementById('matchTime').textContent = `${event.minute}'`;

        // Update half indicator
        if (event.minute <= 45) {
            document.getElementById('halfIndicator').textContent = '1ST HALF';
        } else {
            document.getElementById('halfIndicator').textContent = '2ND HALF';
        }

        // Process event
        await handleEvent(event);
        updateStatsDisplay();

        // Scroll commentary
        const eventsContainer = document.getElementById('matchEvents');
        eventsContainer.scrollTop = eventsContainer.scrollHeight;
    }

    // Match finished
    await sleep(1500);
    showMatchResult();
}

async function handleEvent(event) {
    const squadPlayers = getSquadPlayerNames();
    const randomPlayer = squadPlayers[Math.floor(Math.random() * squadPlayers.length)] || 'Player';

    switch (event.type) {
        case 'goal_player':
            matchState.playerScore++;
            matchState.stats.shots.home++;
            matchState.stats.shotsOnTarget.home++;
            adjustPossession(true);
            updateScore();
            moveBall(50, 10);
            highlightPitchArea(50, 10);
            addEvent(event.minute, '⚽', `GOAL!! ${randomPlayer} scores! What a finish!`, 'goal-home');
            break;

        case 'goal_opponent':
            matchState.opponentScore++;
            matchState.stats.shots.away++;
            matchState.stats.shotsOnTarget.away++;
            adjustPossession(false);
            updateScore();
            moveBall(50, 90);
            highlightPitchArea(50, 90);
            addEvent(event.minute, '⚽', `Goal for ${matchState.opponent.name}. They take the lead!`, 'goal-away');
            break;

        case 'shot_saved':
            if (event.isHome) {
                matchState.stats.shots.home++;
                matchState.stats.shotsOnTarget.home++;
                moveBall(50, 15);
                addEvent(event.minute, '🧤', `Shot by ${randomPlayer}! Great save by the keeper!`, 'chance');
            } else {
                matchState.stats.shots.away++;
                matchState.stats.shotsOnTarget.away++;
                moveBall(50, 85);
                addEvent(event.minute, '🧤', `Shot from ${matchState.opponent.name}! Saved!`, 'normal');
            }
            adjustPossession(event.isHome);
            break;

        case 'shot_miss':
            if (event.isHome) {
                matchState.stats.shots.home++;
                moveBall(45 + Math.random() * 10, 5);
                addEvent(event.minute, '🎯', `${randomPlayer} shoots! Goes wide...`, 'normal');
            } else {
                matchState.stats.shots.away++;
                moveBall(45 + Math.random() * 10, 95);
                addEvent(event.minute, '🎯', `${matchState.opponent.name} with a shot. Off target!`, 'normal');
            }
            break;

        case 'corner':
            if (event.isHome) {
                matchState.stats.corners.home++;
                moveBall(95, 5);
                addEvent(event.minute, '🚩', `Corner kick for your team.`, 'normal');
            } else {
                matchState.stats.corners.away++;
                moveBall(5, 95);
                addEvent(event.minute, '🚩', `Corner kick for ${matchState.opponent.name}.`, 'normal');
            }
            break;

        case 'foul':
            if (event.isHome) {
                matchState.stats.fouls.home++;
                addEvent(event.minute, '⚠️', `Foul by ${randomPlayer}. Free kick given.`, 'normal');
            } else {
                matchState.stats.fouls.away++;
                addEvent(event.minute, '⚠️', `Foul by ${matchState.opponent.name}. Free kick!`, 'normal');
            }
            moveBall(50, 50);
            break;

        case 'card':
            if (event.isHome) {
                matchState.stats.fouls.home++;
                addEvent(event.minute, '🟨', `Yellow card! ${randomPlayer} is booked.`, 'card');
            } else {
                matchState.stats.fouls.away++;
                addEvent(event.minute, '🟨', `Yellow card for ${matchState.opponent.name} player.`, 'card');
            }
            break;

        case 'commentary':
            const comments = event.isHome ? [
                `Good passing by ${randomPlayer} in midfield.`,
                `${randomPlayer} makes a great run down the wing.`,
                `Solid defending from your team.`,
                `Your team dominates possession.`
            ] : [
                `${matchState.opponent.name} building up an attack.`,
                `Pressure from ${matchState.opponent.name}.`,
                `${matchState.opponent.name} probing for an opening.`
            ];
            const ballY = event.isHome ? 30 + Math.random() * 30 : 40 + Math.random() * 30;
            moveBall(30 + Math.random() * 40, ballY);
            addEvent(event.minute, '📢', comments[Math.floor(Math.random() * comments.length)], 'normal');
            adjustPossession(event.isHome);
            break;

        case 'chance':
            addEvent(event.minute, '🎯', `${event.kind} opportunity! Choose your shot!`, 'chance');
            const result = await showChanceOverlay(event.kind);

            if (result.scored) {
                matchState.playerScore++;
                matchState.stats.shots.home++;
                matchState.stats.shotsOnTarget.home++;
                updateScore();
                moveBall(50, 10);
                highlightPitchArea(50, 10);
                addEvent(event.minute, '⚽', `GOAL!! ${event.kind} converted by ${randomPlayer}!`, 'goal-home');
            } else {
                matchState.stats.shots.home++;
                addEvent(event.minute, '❌', `${event.kind} saved! Keeper guessed right!`, 'normal');
            }
            break;

        case 'halftime':
            moveBall(50, 50);
            addEvent(45, '⏸️', 'HALF TIME. Teams head to the dressing room.', 'halftime');
            await sleep(1500);
            addEvent(46, '▶️', 'Second half begins!', 'halftime');
            break;

        case 'fulltime':
            moveBall(50, 50);
            addEvent(90, '🏁', 'FULL TIME! The referee blows the final whistle.', 'halftime');
            break;
    }
}

function getSquadPlayerNames() {
    if (!userData.squad?.main) return ['Player'];

    const names = [];
    userData.squad.main.forEach(playerId => {
        if (playerId) {
            const player = allPlayers.find(p => p.id === playerId);
            if (player) {
                // Get last name
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

                const directions = ['left', 'center', 'right'];
                const keeperDirection = directions[Math.floor(Math.random() * 3)];
                resolve({
                    scored: Math.random() < 0.3,
                    direction: 'center',
                    keeperDirection
                });
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
        chanceResolve({
            scored: finalScored,
            direction,
            keeperDirection
        });
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

    // Update server
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

    // Hide live match, show result
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
    document.getElementById('matchResult').classList.remove('show');
    document.getElementById('matchLive').classList.remove('active');
    document.getElementById('matchSetup').style.display = 'block';
    document.getElementById('matchEvents').innerHTML = '';

    // Reset ball position
    moveBall(50, 50);

    matchState = null;
    checkCooldown();
    updateCooldownDisplay();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

document.addEventListener('DOMContentLoaded', init);
