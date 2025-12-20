let userData = null;
let playerScore = 0;
let aiScore = 0;
let currentKick = 1;
const totalKicks = 5;

async function init() {
    await loadUserData();
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

function shootPenalty(zoneIndex) {
    // Disable all zones
    const zones = document.querySelectorAll('.goal-zone');
    zones.forEach(z => z.classList.add('disabled'));
    
    // Random AI save chance (60% save rate)
    const aiSaves = Math.random() < 0.6;
    
    // Mark the shot zone
    const selectedZone = zones[zoneIndex];
    
    if (aiSaves) {
        selectedZone.classList.add('missed');
        setTimeout(() => {
            updateScore();
        }, 800);
    } else {
        selectedZone.classList.add('scored');
        playerScore++;
        setTimeout(() => {
            updateScore();
        }, 800);
    }
}

function updateScore() {
    // AI takes a shot
    const aiScores = Math.random() < 0.65; // AI has 65% accuracy
    if (aiScores) {
        aiScore++;
    }
    
    currentKick++;
    
    // Update display
    const scoreDisplay = document.querySelector('.score-display');
    scoreDisplay.textContent = `${playerScore} - ${aiScore}`;
    
    // Update kick indicators
    const kickIndicators = document.querySelectorAll('.kick-indicator');
    const prevKick = kickIndicators[currentKick - 2];
    
    if (prevKick) {
        prevKick.classList.remove('current');
        if (playerScore > (currentKick - 2)) {
            // Scored on this kick
            prevKick.classList.add('scored');
        } else {
            // Missed on this kick
            prevKick.classList.add('missed');
        }
    }
    
    if (currentKick <= totalKicks) {
        kickIndicators[currentKick - 1]?.classList.add('current');
        
        // Re-enable zones
        setTimeout(() => {
            const zones = document.querySelectorAll('.goal-zone');
            zones.forEach(z => {
                z.classList.remove('disabled', 'scored', 'missed');
            });
        }, 500);
    } else {
        // Match finished
        setTimeout(() => {
            finishMatch();
        }, 1000);
    }
}

async function finishMatch() {
    const resultDisplay = document.getElementById('resultDisplay');
    const resultTitle = document.getElementById('resultTitle');
    const resultScore = document.getElementById('resultScore');
    const rewardGP = document.getElementById('rewardGP');
    const rewardCoins = document.getElementById('rewardCoins');
    
    // Determine outcome
    let outcome = 'draw';
    let reward = { gp: 2500, eCoins: 7 };
    
    if (playerScore > aiScore) {
        outcome = 'win';
        reward = { gp: 5000, eCoins: 15 };
        resultTitle.textContent = '🎉 VICTORY!';
        resultTitle.classList.add('win');
    } else if (playerScore < aiScore) {
        outcome = 'loss';
        reward = { gp: 1000, eCoins: 3 };
        resultTitle.textContent = '😢 DEFEAT';
        resultTitle.classList.add('loss');
    } else {
        resultTitle.textContent = '⚖️ DRAW';
    }
    
    resultScore.textContent = `${playerScore} - ${aiScore}`;
    rewardGP.textContent = `+${reward.gp.toLocaleString()}`;
    rewardCoins.textContent = `+${reward.eCoins}`;
    
    // Submit to API
    try {
        const response = await fetch('/api/penalty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: playerScore })
        });
        
        const data = await response.json();
        if (data.success) {
            document.getElementById('topGP').textContent = data.newBalance.gp.toLocaleString();
            document.getElementById('topEcoins').textContent = data.newBalance.eCoins;
        }
    } catch (error) {
        console.error('Error submitting penalty result:', error);
    }
    
    resultDisplay.classList.add('show');
}

document.addEventListener('DOMContentLoaded', init);
