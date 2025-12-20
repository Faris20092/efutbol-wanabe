let userData = null;
let penaltyState = null;

const START_STEPS = 35;
const ON_SCORE = 8;
const ON_MISS = 4;

// Milestones: position 19 gives 50 eCoins, positions 35-20 and 18-1 give 500 GP each
const ECOIN_MILESTONE = 19;
const GP_POSITIONS = [];
for (let i = 35; i >= 20; i--) GP_POSITIONS.push(i);
for (let i = 18; i >= 1; i--) GP_POSITIONS.push(i);

async function init() {
    await loadUserData();
    await loadPenaltyState();

    // Check if already played today
    const today = new Date().toISOString().slice(0, 10);
    if (penaltyState && penaltyState.lastPlay === today) {
        // Already played - show path view directly
        document.getElementById('penaltyView').classList.add('hidden');
        document.getElementById('pathView').classList.add('active');
        document.getElementById('alreadyPlayedMsg').style.display = 'block';
    }

    updateDisplay();
    renderPathGrid();
}

async function loadUserData() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        userData = data.gameData;

        // Update header currency display
        document.getElementById('topGP').textContent = (userData.gp || 0).toLocaleString();
        document.getElementById('topEcoins').textContent = userData.eCoins || 0;

        // Update user info
        if (data.discord || data.user) {
            const user = data.discord || data.user;
            document.getElementById('username').textContent = user.username || 'Player';
            if (user.avatar) {
                document.getElementById('userAvatar').src = user.avatar;
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

async function loadPenaltyState() {
    try {
        const response = await fetch('/api/penalty/status');
        const data = await response.json();
        penaltyState = data.state || {
            date: '',
            lastPlay: '',
            remaining: START_STEPS,
            milestones: {}
        };
    } catch (error) {
        console.error('Error loading penalty state:', error);
        penaltyState = {
            date: '',
            lastPlay: '',
            remaining: START_STEPS,
            milestones: {}
        };
    }
}

function updateDisplay() {
    // Update remaining steps
    document.getElementById('remainingSteps').textContent = penaltyState?.remaining || START_STEPS;

    // Update next reward info
    updateNextReward();
}

function updateNextReward() {
    const remaining = penaltyState?.remaining || START_STEPS;
    const milestones = penaltyState?.milestones || {};

    let nextRewardIcon = '💰';
    let nextRewardText = '500 GP on next step';

    // Check if 50 eCoins at 19 is still available
    if (remaining > ECOIN_MILESTONE && !milestones.ecoin19) {
        nextRewardIcon = '🪙';
        nextRewardText = `50 eCoins at step ${ECOIN_MILESTONE}`;
    } else if (remaining <= 0) {
        nextRewardIcon = '🎁';
        nextRewardText = 'Final reward waiting!';
    } else {
        nextRewardIcon = '💰';
        nextRewardText = `500 GP per step (current: ${remaining})`;
    }

    document.getElementById('nextRewardIcon').textContent = nextRewardIcon;
    document.getElementById('nextRewardText').textContent = nextRewardText;
}

async function shootPenalty(direction) {
    // Disable buttons
    document.getElementById('btnLeft').disabled = true;
    document.getElementById('btnCenter').disabled = true;
    document.getElementById('btnRight').disabled = true;

    try {
        const response = await fetch('/api/penalty/shoot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ direction })
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.message || 'Error taking penalty');
            location.reload();
            return;
        }

        // Update state
        penaltyState = data.state;

        // Show result overlay
        const resultOverlay = document.getElementById('resultOverlay');
        const resultTitle = document.getElementById('resultTitle');
        const resultText = document.getElementById('resultText');
        const resultProgress = document.getElementById('resultProgress');
        const resultRewards = document.getElementById('resultRewards');

        if (data.scored) {
            resultTitle.textContent = '⚽ GOAL!';
            resultTitle.className = 'result-title goal';
            resultText.textContent = `You aimed ${direction}, keeper went ${data.keeperDirection}!`;
            resultProgress.textContent = `Progress: -${ON_SCORE} steps`;
        } else {
            resultTitle.textContent = '❌ SAVED!';
            resultTitle.className = 'result-title miss';
            resultText.textContent = `You aimed ${direction}, keeper also went ${data.keeperDirection}!`;
            resultProgress.textContent = `Progress: -${ON_MISS} steps`;
        }

        // Show rewards if any
        if (data.rewards && data.rewards.length > 0) {
            resultRewards.style.display = 'block';
            resultRewards.innerHTML = '🎁 Rewards: ' + data.rewards.join(', ');
        } else {
            resultRewards.style.display = 'none';
        }

        // Update currency display
        document.getElementById('topGP').textContent = (userData.gp || 0).toLocaleString();
        document.getElementById('topEcoins').textContent = userData.eCoins || 0;
        document.getElementById('remainingSteps').textContent = penaltyState.remaining;

        resultOverlay.classList.add('show');

    } catch (error) {
        console.error('Error shooting penalty:', error);
        alert('Failed to take penalty. Please try again.');
        location.reload();
    }
}

function showPathView() {
    document.getElementById('penaltyView').classList.add('hidden');
    document.getElementById('pathView').classList.add('active');
    renderPathGrid();
    updateDisplay();
}

function renderPathGrid() {
    const grid = document.getElementById('pathGrid');
    const remaining = penaltyState?.remaining || START_STEPS;
    const milestones = penaltyState?.milestones || {};

    let html = '';

    // Create nodes from 35 to 0 (36 total nodes)
    for (let step = START_STEPS; step >= 0; step--) {
        let nodeClass = 'path-node';
        let reward = '';
        let icon = '';

        // Determine node type
        if (step === 0) {
            nodeClass += ' finish';
            icon = '🎁';
            reward = 'FINISH!';
        } else if (step === ECOIN_MILESTONE) {
            nodeClass += ' ecoin';
            icon = '🪙';
            reward = '50 eCoins';
        } else if (GP_POSITIONS.includes(step)) {
            nodeClass += ' gp';
            icon = '💰';
            reward = '500 GP';
        }

        // Mark current position
        if (step === remaining) {
            nodeClass += ' current';
        }

        // Mark passed positions
        if (step > remaining) {
            nodeClass += ' passed';
        }

        html += `
            <div class="${nodeClass}">
                <span class="node-step">${step === 0 ? icon : step}</span>
                ${reward ? `<span class="node-reward">${step === 0 ? 'REWARD' : (icon || '')}</span>` : ''}
            </div>
        `;
    }

    grid.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', init);
