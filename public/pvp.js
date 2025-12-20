let userData = null;
let allPlayers = [];
let battleState = null;
let selectedMode = null;

const AI_OPPONENTS = [
    { name: 'FC Barcelona', strength: 85, tier: 'elite' },
    { name: 'Real Madrid', strength: 87, tier: 'elite' },
    { name: 'Manchester City', strength: 86, tier: 'elite' },
    { name: 'Liverpool', strength: 84, tier: 'elite' },
    { name: 'Bayern Munich', strength: 85, tier: 'elite' },
    { name: 'Paris Saint-Germain', strength: 83, tier: 'pro' },
    { name: 'Chelsea', strength: 82, tier: 'pro' },
    { name: 'Juventus', strength: 81, tier: 'pro' },
    { name: 'Arsenal', strength: 80, tier: 'pro' },
    { name: 'Manchester United', strength: 79, tier: 'amateur' },
    { name: 'AC Milan', strength: 78, tier: 'amateur' },
    { name: 'Inter Milan', strength: 79, tier: 'amateur' },
    { name: 'Atletico Madrid', strength: 80, tier: 'pro' },
    { name: 'Borussia Dortmund', strength: 79, tier: 'amateur' },
    { name: 'Tottenham Hotspur', strength: 78, tier: 'amateur' }
];

const REWARDS = {
    quick: {
        win: { gp: 3000, eCoins: 8 },
        draw: { gp: 1500, eCoins: 4 },
        loss: { gp: 750, eCoins: 2 }
    },
    ranked: {
        win: { gp: 6000, eCoins: 15 },
        draw: { gp: 3000, eCoins: 8 },
        loss: { gp: 1500, eCoins: 4 }
    }
};

async function init() {
    await loadUserData();
    await loadPlayers();
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

function selectMode(mode) {
    selectedMode = mode;

    // Highlight selected mode
    document.querySelectorAll('.mode-card').forEach(card => card.classList.remove('selected'));
    event.target.closest('.mode-card').classList.add('selected');

    // Check if squad is ready
    const playersInSquad = userData.squad?.main?.filter(id => id !== null && id !== undefined).length || 0;
    if (playersInSquad < 11) {
        alert(`You need 11 players in your squad! Currently have ${playersInSquad}/11`);
        return;
    }

    // Start battle
    startBattle(mode);
}

function startBattle(mode) {
    const playerStrength = calculateTeamStrength();

    // Select opponent based on mode
    let opponents = AI_OPPONENTS;
    if (mode === 'ranked') {
        // Ranked mode: prefer stronger opponents
        opponents = AI_OPPONENTS.filter(o => o.strength >= playerStrength - 5);
        if (opponents.length === 0) opponents = AI_OPPONENTS;
    }

    const opponent = opponents[Math.floor(Math.random() * opponents.length)];

    battleState = {
        playerScore: 0,
        opponentScore: 0,
        currentMinute: 0,
        opponent,
        playerStrength,
        mode
    };

    // Update UI
    document.getElementById('modeSelection').style.display = 'none';
    document.getElementById('battleArena').style.display = 'block';
    document.getElementById('playerStrength').textContent = playerStrength;
    document.getElementById('opponentName').textContent = opponent.name;
    document.getElementById('opponentStrength').textContent = opponent.strength;
    document.getElementById('battleResult').classList.remove('show');
    document.getElementById('battleLog').innerHTML = '';

    // Start simulation
    simulateBattle();
}

async function simulateBattle() {
    const log = document.getElementById('battleLog');
    const playerStr = battleState.playerStrength;
    const opponentStr = battleState.opponent.strength;

    // Calculate win probability
    const diff = playerStr - opponentStr;
    const playerWinChance = Math.min(0.7, Math.max(0.3, 0.5 + (diff * 0.02)));

    // Generate events
    const events = [];
    const eventMinutes = [5, 15, 25, 35, 45, 55, 65, 75, 85, 90];

    for (const minute of eventMinutes) {
        const rand = Math.random();

        if (rand < playerWinChance * 0.3) {
            events.push({ minute, type: 'goal', team: 'player', msg: `⚽ ${minute}' GOAL! Your team scores!` });
        } else if (rand < playerWinChance * 0.3 + (1 - playerWinChance) * 0.3) {
            events.push({ minute, type: 'goal', team: 'opponent', msg: `⚽ ${minute}' ${battleState.opponent.name} scores!` });
        } else if (rand < 0.6) {
            const comments = [
                `${minute}' Great save by the keeper!`,
                `${minute}' Close! Off the crossbar!`,
                `${minute}' Brilliant defensive block!`,
                `${minute}' Counter-attack cleared!`,
                `${minute}' Strong tackle in midfield!`
            ];
            events.push({ minute, type: 'event', msg: comments[Math.floor(Math.random() * comments.length)] });
        }
    }

    // Process events with animation
    for (const event of events) {
        await sleep(800 + Math.random() * 500);

        const div = document.createElement('div');

        if (event.type === 'goal') {
            if (event.team === 'player') {
                battleState.playerScore++;
                div.className = 'log-entry log-goal';
            } else {
                battleState.opponentScore++;
                div.className = 'log-entry log-goal-opponent';
            }
        } else {
            div.className = 'log-entry log-event';
        }

        div.textContent = event.msg;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
    }

    // End match
    await sleep(1500);
    endBattle();
}

async function endBattle() {
    const rewards = REWARDS[battleState.mode];
    let outcome, reward;

    if (battleState.playerScore > battleState.opponentScore) {
        outcome = 'win';
        reward = rewards.win;
    } else if (battleState.playerScore < battleState.opponentScore) {
        outcome = 'loss';
        reward = rewards.loss;
    } else {
        outcome = 'draw';
        reward = rewards.draw;
    }

    // Update server
    try {
        const response = await fetch('/api/pvp/result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                outcome,
                reward,
                opponent: battleState.opponent.name,
                score: `${battleState.playerScore}-${battleState.opponentScore}`
            })
        });

        const data = await response.json();
        if (data.success) {
            document.getElementById('topGP').textContent = data.newBalance.gp.toLocaleString();
            document.getElementById('topEcoins').textContent = data.newBalance.eCoins;
        }
    } catch (error) {
        console.error('PvP result error:', error);
    }

    // Show result
    const resultTitle = document.getElementById('resultTitle');
    resultTitle.textContent = outcome === 'win' ? '🏆 VICTORY!' : outcome === 'loss' ? '😞 DEFEAT' : '🤝 DRAW';
    resultTitle.className = 'result-title ' + outcome;

    document.getElementById('resultScore').textContent = `${battleState.playerScore} - ${battleState.opponentScore}`;
    document.getElementById('rewardGP').textContent = `+${reward.gp.toLocaleString()}`;
    document.getElementById('rewardECoins').textContent = `+${reward.eCoins}`;

    document.getElementById('battleResult').classList.add('show');
}

function resetBattle() {
    battleState = null;
    selectedMode = null;

    document.getElementById('battleArena').style.display = 'none';
    document.getElementById('modeSelection').style.display = 'grid';
    document.querySelectorAll('.mode-card').forEach(card => card.classList.remove('selected'));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

document.addEventListener('DOMContentLoaded', init);
