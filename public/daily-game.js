// Daily Penalty Shootout Game
let gameState = null;
let canKick = false;
let checkpoints = {};
let totalSteps = 40;

// Node positions on the pitch (percentage-based, forms a winding path)
const NODE_POSITIONS = [
    { x: 5, y: 85 },   // 0 - Start
    { x: 12, y: 78 },  // 1
    { x: 20, y: 72 },  // 2
    { x: 28, y: 68 },  // 3
    { x: 36, y: 63 },  // 4
    { x: 32, y: 55 },  // 5 - Trainer
    { x: 25, y: 48 },  // 6
    { x: 18, y: 42 },  // 7
    { x: 22, y: 34 },  // 8
    { x: 30, y: 28 },  // 9
    { x: 40, y: 25 },  // 10 - GP
    { x: 50, y: 22 },  // 11
    { x: 60, y: 25 },  // 12
    { x: 68, y: 30 },  // 13
    { x: 72, y: 38 },  // 14
    { x: 68, y: 46 },  // 15 - Trainer
    { x: 60, y: 52 },  // 16
    { x: 52, y: 58 },  // 17
    { x: 45, y: 64 },  // 18
    { x: 50, y: 72 },  // 19
    { x: 58, y: 78 },  // 20 - GP
    { x: 66, y: 82 },  // 21
    { x: 75, y: 78 },  // 22
    { x: 82, y: 72 },  // 23
    { x: 88, y: 65 },  // 24
    { x: 85, y: 56 },  // 25 - Trainer
    { x: 78, y: 48 },  // 26
    { x: 72, y: 40 },  // 27
    { x: 78, y: 32 },  // 28
    { x: 85, y: 25 },  // 29
    { x: 78, y: 18 },  // 30 - GP
    { x: 68, y: 12 },  // 31
    { x: 55, y: 10 },  // 32
    { x: 42, y: 12 },  // 33
    { x: 32, y: 16 },  // 34
    { x: 25, y: 22 },  // 35 - Trainer
    { x: 18, y: 28 },  // 36
    { x: 12, y: 34 },  // 37
    { x: 8, y: 42 },   // 38
    { x: 12, y: 50 },  // 39
    { x: 20, y: 55 },  // 40 - Pack (Finish)
];

async function init() {
    try {
        const response = await fetch('/api/dailypenalty/status');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to load game');
        }

        gameState = data.state;
        canKick = data.canKick;
        checkpoints = data.checkpoints || {};
        totalSteps = data.totalSteps || 40;

        updateDisplay();
        renderPath();
        updatePlayerMarker();

        if (!canKick) {
            showAlreadyPlayed(data.timeUntilReset);
        }

        document.getElementById('loading').style.display = 'none';
    } catch (error) {
        console.error('Init error:', error);
        document.getElementById('loading').innerHTML = '❌ Error loading. <a href="/login" style="color:#00d4ff;">Login</a>';
    }
}

function updateDisplay() {
    const remaining = totalSteps - (gameState?.lapPosition || 0);
    document.getElementById('remainingSteps').textContent = remaining;
}

function renderPath() {
    const container = document.getElementById('pathNodes');
    container.innerHTML = '';

    const currentPos = gameState?.lapPosition || 0;
    const claimedRewards = gameState?.claimedRewards || {};

    for (let i = 0; i <= totalSteps; i++) {
        const pos = NODE_POSITIONS[i] || { x: 50, y: 50 };
        const checkpoint = checkpoints[i];

        const node = document.createElement('div');
        node.className = 'path-node';

        // Determine node type
        if (checkpoint) {
            if (checkpoint.type === 'trainer') {
                node.classList.add('trainer');
                node.innerHTML = '🎯';
            } else if (checkpoint.type === 'gp') {
                node.classList.add('gp');
                node.innerHTML = 'Ⓖ';
            } else if (checkpoint.type === 'pack') {
                node.classList.add('pack');
                node.innerHTML = '⚽';
            }
        } else {
            node.classList.add('regular');
            node.textContent = i;
        }

        // Mark passed nodes
        if (i < currentPos) {
            node.classList.add('passed');
        }

        // Mark current position
        if (i === currentPos) {
            node.classList.add('current');
        }

        node.style.left = `${pos.x}%`;
        node.style.top = `${pos.y}%`;
        node.style.transform = 'translateZ(20px) translate(-50%, -50%)';

        container.appendChild(node);
    }

    // Draw connections between nodes
    drawConnections(container, currentPos);
}

function drawConnections(container, currentPos) {
    for (let i = 0; i < totalSteps; i++) {
        const from = NODE_POSITIONS[i];
        const to = NODE_POSITIONS[i + 1];
        if (!from || !to) continue;

        const connection = document.createElement('div');
        connection.className = 'path-connection';

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        connection.style.left = `${from.x}%`;
        connection.style.top = `${from.y}%`;
        connection.style.width = `${length}%`;
        connection.style.transform = `rotate(${angle}deg) translateZ(5px)`;

        if (i < currentPos) {
            connection.style.opacity = '0.3';
        }

        container.appendChild(connection);
    }
}

function updatePlayerMarker() {
    const marker = document.getElementById('playerMarker');
    const currentPos = gameState?.lapPosition || 0;
    const pos = NODE_POSITIONS[currentPos] || NODE_POSITIONS[0];

    marker.style.left = `${pos.x}%`;
    marker.style.top = `${pos.y}%`;
    marker.style.transform = 'translateZ(30px) translate(-50%, -100%)';
}

function showAlreadyPlayed(timeUntilReset) {
    document.getElementById('penaltySection').style.display = 'none';
    document.getElementById('alreadyPlayed').style.display = 'block';

    // Start countdown
    startCountdown(timeUntilReset);
}

function startCountdown(seconds) {
    const timerEl = document.getElementById('countdownTimer');

    function update() {
        if (seconds <= 0) {
            timerEl.textContent = 'Ready! Refresh the page.';
            return;
        }

        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        timerEl.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        seconds--;
        setTimeout(update, 1000);
    }

    update();
}

async function shootPenalty(direction) {
    // Disable buttons
    document.querySelectorAll('.direction-btn').forEach(btn => btn.disabled = true);

    try {
        const response = await fetch('/api/dailypenalty/kick', {
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

        // Update game state
        gameState.lapPosition = data.newPosition;
        canKick = false;

        // Show result
        showResult(data);

        // Update display
        updateDisplay();
        renderPath();

        // Animate player marker
        animatePlayerMarker(data.newPosition);

    } catch (error) {
        console.error('Shoot error:', error);
        alert('Failed to take penalty. Please try again.');
        location.reload();
    }
}

function animatePlayerMarker(newPos) {
    const marker = document.getElementById('playerMarker');
    const pos = NODE_POSITIONS[newPos] || NODE_POSITIONS[0];

    marker.style.transition = 'all 0.8s ease-out';
    marker.style.left = `${pos.x}%`;
    marker.style.top = `${pos.y}%`;
}

function showResult(data) {
    const modal = document.getElementById('resultModal');
    const icon = document.getElementById('resultIcon');
    const title = document.getElementById('resultTitle');
    const info = document.getElementById('resultInfo');
    const progress = document.getElementById('resultProgress');
    const rewardsDiv = document.getElementById('resultRewards');
    const rewardsList = document.getElementById('rewardsList');

    if (data.scored) {
        icon.textContent = '⚽';
        title.textContent = 'GOAL!';
        title.className = 'result-title goal';
        info.textContent = `You aimed ${data.playerDirection}, keeper went ${data.gkDirection}!`;
        progress.textContent = `+${data.stepsGained} steps`;

        // Show confetti
        showConfetti();
    } else {
        icon.textContent = '🧤';
        title.textContent = 'SAVED!';
        title.className = 'result-title miss';
        info.textContent = `You aimed ${data.playerDirection}, keeper also went ${data.gkDirection}!`;
        progress.textContent = `+${data.stepsGained} steps`;
    }

    // Show rewards if any
    if (data.rewards && data.rewards.length > 0) {
        rewardsDiv.style.display = 'block';
        rewardsList.innerHTML = data.rewards.map(r => `
            <div class="reward-item">
                <span>${r.icon}</span>
                <span>${r.name}</span>
            </div>
        `).join('');
    } else {
        rewardsDiv.style.display = 'none';
    }

    // Check for lap completion
    if (data.lapCompleted) {
        progress.innerHTML += '<br><span style="color: #ffd700;">🎉 LAP COMPLETE! Reset for new lap.</span>';
    }

    modal.classList.add('show');
}

function closeResultModal() {
    document.getElementById('resultModal').classList.remove('show');

    // Show already played message
    showAlreadyPlayed(getSecondsUntilReset());
}

function getSecondsUntilReset() {
    const now = new Date();
    const reset = new Date(now);
    reset.setUTCHours(2, 0, 0, 0);
    if (now >= reset) {
        reset.setUTCDate(reset.getUTCDate() + 1);
    }
    return Math.floor((reset - now) / 1000);
}

function showConfetti() {
    const container = document.getElementById('confettiContainer');
    const colors = ['#ff0', '#f0f', '#0ff', '#0f0', '#f00', '#00f'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        container.appendChild(confetti);

        // Remove after animation
        setTimeout(() => confetti.remove(), 3500);
    }
}

document.addEventListener('DOMContentLoaded', init);
