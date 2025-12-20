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
    { name: 'FC Barcelona', strength: 85 },
    { name: 'Real Madrid', strength: 87 },
    { name: 'Manchester City', strength: 86 },
    { name: 'Liverpool', strength: 84 },
    { name: 'Bayern Munich', strength: 85 },
    { name: 'Paris Saint-Germain', strength: 83 },
    { name: 'Chelsea', strength: 82 },
    { name: 'Juventus', strength: 81 },
    { name: 'Arsenal', strength: 80 },
    { name: 'Manchester United', strength: 79 },
    { name: 'Brazil', strength: 87 },
    { name: 'Argentina', strength: 86 },
    { name: 'France', strength: 88 },
    { name: 'Germany', strength: 85 },
    { name: 'Spain', strength: 84 },
    { name: 'England', strength: 85 }
];

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

async function startMatch() {
    // Set cooldown
    cooldownUntil = Date.now() + COOLDOWN_MS;
    localStorage.setItem('matchCooldown', cooldownUntil);

    // Select opponent
    const opponent = AI_TEAMS[Math.floor(Math.random() * AI_TEAMS.length)];
    const playerStrength = calculateTeamStrength();

    // Initialize match state
    matchState = {
        playerScore: 0,
        opponentScore: 0,
        currentMinute: 0,
        opponent: opponent,
        playerStrength: playerStrength,
        events: []
    };

    // Update UI
    document.getElementById('matchSetup').style.display = 'none';
    document.getElementById('matchLive').classList.add('active');
    document.getElementById('opponentName').textContent = opponent.name;
    document.getElementById('opponentStrength').textContent = opponent.strength;
    document.getElementById('liveOpponentName').textContent = opponent.name;

    // Generate and process match events
    const events = generateMatchTimeline(playerStrength, opponent.strength);
    await processMatchEvents(events);
}

function generateMatchTimeline(playerStrength, opponentStrength) {
    const events = [];

    // Calculate probabilities
    const playerChance = (playerStrength / (playerStrength + opponentStrength)) * 0.5;
    const opponentChance = (opponentStrength / (playerStrength + opponentStrength)) * 0.5;

    // First half events (5-44 minutes)
    const firstHalfCount = 4 + Math.floor(Math.random() * 3);
    const firstHalfMinutes = [];
    for (let i = 0; i < firstHalfCount; i++) {
        let minute = 5 + Math.floor(Math.random() * 40);
        if (!firstHalfMinutes.includes(minute)) firstHalfMinutes.push(minute);
    }
    firstHalfMinutes.sort((a, b) => a - b);

    firstHalfMinutes.forEach(minute => {
        const rand = Math.random();
        if (rand < playerChance * 0.6) {
            events.push({
                minute,
                type: 'goal_player',
                message: `⚽ GOOOAL!! Your team scores! What a strike! 🔥`
            });
        } else if (rand < (playerChance * 0.6) + (opponentChance * 0.6)) {
            events.push({
                minute,
                type: 'goal_opponent',
                message: `⚽ ${matchState?.opponent?.name || 'Opponent'} scores! Time to fight back! 😤`
            });
        } else if (rand < 0.8) {
            const comments = [
                '🥅 INCREDIBLE SAVE! The keeper is on fire!',
                '😱 So close! Just inches away!',
                '🛡️ DEFENSIVE MASTERCLASS! What a tackle!',
                '🟨 Yellow card! Things are heating up!',
                '⚡ Lightning fast counter attack!',
                '🎯 CROSSBAR! Unlucky!'
            ];
            events.push({
                minute,
                type: 'comment',
                message: comments[Math.floor(Math.random() * comments.length)]
            });
        }
    });

    // Half time
    events.push({
        minute: 45,
        type: 'halftime',
        message: '☕ HALF TIME! Time for tactical adjustments!'
    });

    // Second half events (46-89 minutes)
    const secondHalfCount = 4 + Math.floor(Math.random() * 3);
    const secondHalfMinutes = [];
    for (let i = 0; i < secondHalfCount; i++) {
        let minute = 46 + Math.floor(Math.random() * 44);
        if (!secondHalfMinutes.includes(minute)) secondHalfMinutes.push(minute);
    }
    secondHalfMinutes.sort((a, b) => a - b);

    secondHalfMinutes.forEach(minute => {
        const rand = Math.random();
        if (rand < playerChance * 0.6) {
            events.push({
                minute,
                type: 'goal_player',
                message: `⚽ SPECTACULAR GOAL!! Your team is unstoppable! 🚀`
            });
        } else if (rand < (playerChance * 0.6) + (opponentChance * 0.6)) {
            events.push({
                minute,
                type: 'goal_opponent',
                message: `⚽ Opponent strikes back! The battle intensifies! 🔥`
            });
        } else if (rand < 0.7) {
            const lateComments = [
                '💨 PACE! Lightning speed down the wing!',
                '🔄 Substitution! Fresh legs coming on!',
                '⏰ Time is ticking! Every second counts!',
                '🎪 SKILL MOVE! The crowd goes wild! 🤯'
            ];
            events.push({
                minute,
                type: 'comment',
                message: lateComments[Math.floor(Math.random() * lateComments.length)]
            });
        }
    });

    // Random interactive chance (40% chance)
    if (Math.random() < 0.4) {
        const chanceMinute = 10 + Math.floor(Math.random() * 75);
        const kinds = ['Chance', 'Free Kick', 'Penalty'];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];

        events.push({
            minute: chanceMinute,
            type: 'chance',
            kind: kind,
            message: `🎯 ${kind.toUpperCase()} OPPORTUNITY! Choose your shot! ⚡`
        });
    }

    // Full time
    events.push({
        minute: 90,
        type: 'fulltime',
        message: '⏱️ FULL TIME! What an amazing match!'
    });

    // Sort by minute
    events.sort((a, b) => a.minute - b.minute);

    return events;
}

async function processMatchEvents(events) {
    const eventsContainer = document.getElementById('matchEvents');

    for (const event of events) {
        // Small delay between events
        await sleep(1500 + Math.random() * 1000);

        // Update time
        matchState.currentMinute = event.minute;
        document.getElementById('matchTime').textContent = `⏰ ${event.minute}'`;

        // Handle event type
        if (event.type === 'goal_player') {
            matchState.playerScore++;
            updateScore();
            addEventToLog(event, 'event-goal');
        } else if (event.type === 'goal_opponent') {
            matchState.opponentScore++;
            updateScore();
            addEventToLog(event, 'event-goal-opponent');
        } else if (event.type === 'chance') {
            addEventToLog(event, 'event-comment');

            // Show chance overlay and wait for selection
            const result = await showChanceOverlay(event.kind);

            if (result.scored) {
                matchState.playerScore++;
                updateScore();
                addEventToLog({
                    minute: event.minute,
                    message: `⚽ ${event.kind.toUpperCase()} GOAL! You aimed ${result.direction}! 🎯`
                }, 'event-goal');
            } else {
                addEventToLog({
                    minute: event.minute,
                    message: `❌ ${event.kind} saved! Keeper guessed ${result.keeperDirection}! 🧤`
                }, 'event-comment');
            }
        } else if (event.type === 'halftime') {
            addEventToLog(event, 'event-halftime');
        } else if (event.type === 'fulltime') {
            addEventToLog(event, 'event-halftime');
        } else {
            addEventToLog(event, 'event-comment');
        }

        // Scroll events to bottom
        eventsContainer.scrollTop = eventsContainer.scrollHeight;
    }

    // Match finished - show results
    await sleep(1500);
    showMatchResult();
}

function updateScore() {
    document.getElementById('liveScore').textContent = `${matchState.playerScore} - ${matchState.opponentScore}`;
}

function addEventToLog(event, className) {
    const container = document.getElementById('matchEvents');
    const div = document.createElement('div');
    div.className = `match-event ${className}`;
    div.innerHTML = `<strong>${event.minute}'</strong> ${event.message}`;
    container.appendChild(div);
}

function showChanceOverlay(kind) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('chanceOverlay');
        document.getElementById('chanceTitle').textContent = `🎯 ${kind.toUpperCase()}! Choose your shot!`;
        overlay.classList.add('active');

        let timeLeft = 10;
        document.getElementById('chanceTimer').textContent = `Time remaining: ${timeLeft}s`;

        chanceResolve = resolve;

        // Timer countdown
        chanceTimeout = setInterval(() => {
            timeLeft--;
            document.getElementById('chanceTimer').textContent = `Time remaining: ${timeLeft}s`;

            if (timeLeft <= 0) {
                clearInterval(chanceTimeout);
                overlay.classList.remove('active');

                // Auto-resolve with random outcome
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

    // Adjust success rate based on type (stored in title)
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

async function showMatchResult() {
    // Determine outcome
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
    outcomeEl.textContent = outcome.toUpperCase();
    outcomeEl.className = 'match-outcome ' + outcome;

    document.getElementById('rewardGP').textContent = `+${reward.gp.toLocaleString()}`;
    document.getElementById('rewardECoins').textContent = `+${reward.eCoins}`;

    document.getElementById('matchResult').classList.add('show');
}

function resetMatch() {
    document.getElementById('matchResult').classList.remove('show');
    document.getElementById('matchLive').classList.remove('active');
    document.getElementById('matchSetup').style.display = 'block';
    document.getElementById('matchEvents').innerHTML = '';

    matchState = null;
    checkCooldown();
    updateCooldownDisplay();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

document.addEventListener('DOMContentLoaded', init);
