let userData = null;
let allPlayers = [];
let selectedPlayerId = null;
let selectedTrainerId = null;
let convertSelectedId = null;

const TRAINERS = [
    { id: 'normal', name: '⚪ Normal Trainer', exp: 5000, cost: 1500, currency: 'gp', description: '+10 random stat points' },
    { id: 'basic', name: '🔵 Basic Trainer', exp: 50000, cost: 3000, currency: 'gp', description: 'Standard training' },
    { id: 'special', name: '🟣 Special Trainer', exp: 500000, cost: 28000, currency: 'gp', description: 'High-quality training' },
    { id: 'special_coin', name: '💎 Premium Trainer', exp: 500000, cost: 50, currency: 'eCoins', description: 'Premium training' }
];

const SHOP_ITEMS = [
    { id: 'normal', name: 'Normal Trainer Pack x5', cost: 7000, currency: 'gp', qty: 5, trainerId: 'normal' },
    { id: 'basic', name: 'Basic Trainer Pack x3', cost: 8500, currency: 'gp', qty: 3, trainerId: 'basic' },
    { id: 'special', name: 'Special Trainer', cost: 28000, currency: 'gp', qty: 1, trainerId: 'special' },
    { id: 'premium', name: 'Premium Trainer x2', cost: 90, currency: 'eCoins', qty: 2, trainerId: 'special_coin' }
];

async function init() {
    await loadUserData();
    await loadPlayers();
    renderTrainers();
    renderPlayersList();
    renderShop();
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

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.training-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');

    // Render content if needed
    if (tabName === 'convert') {
        renderConvertPlayersList();
    }
}

function renderTrainers() {
    const container = document.getElementById('trainersContainer');

    container.innerHTML = TRAINERS.map(trainer => {
        const currencySymbol = trainer.currency === 'eCoins' ? '🪙' : '💰';
        const canAfford = trainer.currency === 'eCoins'
            ? (userData.eCoins || 0) >= trainer.cost
            : (userData.gp || 0) >= trainer.cost;

        return `
            <div class="trainer-card ${selectedTrainerId === trainer.id ? 'selected' : ''}" 
                 onclick="selectTrainer('${trainer.id}')">
                <div class="trainer-name">
                    <span>${trainer.name}</span>
                    <span>${trainer.exp.toLocaleString()} EXP</span>
                </div>
                <div class="trainer-cost">${currencySymbol} ${trainer.cost.toLocaleString()} ${trainer.currency.toUpperCase()}</div>
                <div class="trainer-exp">${trainer.description}</div>
                <button class="trainer-button" 
                        onclick="event.stopPropagation(); trainPlayer('${trainer.id}')"
                        ${!canAfford || !selectedPlayerId ? 'disabled' : ''}>
                    ${canAfford ? 'Apply Training' : 'Not Enough Currency'}
                </button>
            </div>
        `;
    }).join('');
}

function renderPlayersList() {
    const container = document.getElementById('playersList');
    const search = document.getElementById('playerSearch').value.toLowerCase();

    const filtered = allPlayers.filter(player =>
        player.name.toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">No players found</div>';
        return;
    }

    container.innerHTML = filtered.map(player => `
        <div class="player-item ${selectedPlayerId === player.id ? 'selected' : ''}" 
             onclick="selectPlayer('${player.id}')">
            <div class="player-info">
                <div class="player-name">${player.name}</div>
                <div class="player-stats">${player.position} | OVR ${player.overall} | ${player.rarity || 'Standard'}</div>
            </div>
            <div class="player-level">Lv.${player.level || 1}</div>
        </div>
    `).join('');
}

function renderConvertPlayersList() {
    const container = document.getElementById('convertPlayersList');
    const search = document.getElementById('convertSearch').value.toLowerCase();

    const filtered = allPlayers.filter(player =>
        player.name.toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">No players to convert</div>';
        return;
    }

    container.innerHTML = filtered.map(player => {
        const convertExp = calculateConvertExp(player);
        return `
            <div class="player-item ${convertSelectedId === player.id ? 'selected' : ''}" 
                 onclick="selectConvertPlayer('${player.id}')">
                <div class="player-info">
                    <div class="player-name">${player.name}</div>
                    <div class="player-stats">${player.position} | OVR ${player.overall} | Lv.${player.level || 1}</div>
                </div>
                <div class="player-level" style="color: #22c55e;">+${convertExp.toLocaleString()}</div>
            </div>
        `;
    }).join('');
}

function calculateConvertExp(player) {
    // Base EXP based on rarity
    const rarityExp = {
        'Iconic': 100000,
        'Legend': 80000,
        'Black': 50000,
        'Gold': 25000,
        'Silver': 15000,
        'Bronze': 10000,
        'White': 5000
    };

    let exp = rarityExp[player.rarity] || 10000;

    // Add bonus for level
    exp += (player.level || 1) * 5000;

    // Add bonus for overall
    exp += Math.floor(player.overall / 10) * 2000;

    return exp;
}

function selectPlayer(playerId) {
    selectedPlayerId = selectedPlayerId === playerId ? null : playerId;
    renderPlayersList();
    renderTrainers();
}

function selectTrainer(trainerId) {
    selectedTrainerId = selectedTrainerId === trainerId ? null : trainerId;
    renderTrainers();
}

function selectConvertPlayer(playerId) {
    convertSelectedId = convertSelectedId === playerId ? null : playerId;

    const preview = document.getElementById('expPreview');
    const convertBtn = document.getElementById('convertBtn');

    if (convertSelectedId) {
        const player = allPlayers.find(p => p.id === convertSelectedId);
        if (player) {
            const exp = calculateConvertExp(player);
            document.getElementById('convertExpValue').textContent = `+${exp.toLocaleString()} EXP`;
            preview.style.display = 'block';
            convertBtn.disabled = false;
        }
    } else {
        preview.style.display = 'none';
        convertBtn.disabled = true;
    }

    renderConvertPlayersList();
}

async function trainPlayer(trainerId) {
    if (!selectedPlayerId) {
        alert('Please select a player first');
        return;
    }

    const trainer = TRAINERS.find(t => t.id === trainerId);
    if (!trainer) return;

    try {
        const response = await fetch('/api/training', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: selectedPlayerId,
                trainerId: trainerId
            })
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.error || 'Training failed');
            return;
        }

        // Update local data
        const playerIndex = allPlayers.findIndex(p => p.id === selectedPlayerId);
        if (playerIndex !== -1) {
            allPlayers[playerIndex] = data.player;
        }

        userData.gp = data.newBalance.gp;
        userData.eCoins = data.newBalance.eCoins;

        document.getElementById('topGP').textContent = data.newBalance.gp.toLocaleString();
        document.getElementById('topEcoins').textContent = data.newBalance.eCoins;

        // Show result modal
        showResultModal('Training Complete!', `
            <p><strong>${data.player.name}</strong> has been trained!</p>
            <p style="margin-top: 15px;">New Level: <span style="color: var(--secondary); font-size: 1.5rem;">${data.player.level || 1}</span></p>
            <p style="margin-top: 10px;">Overall: <span style="color: var(--secondary);">${data.player.overall}</span></p>
        `);

        renderPlayersList();
        renderTrainers();

    } catch (error) {
        console.error('Training error:', error);
        alert('Training failed. Please try again.');
    }
}

async function convertPlayer() {
    if (!convertSelectedId) {
        alert('Please select a player to convert');
        return;
    }

    const player = allPlayers.find(p => p.id === convertSelectedId);
    if (!player) return;

    if (!confirm(`Are you sure you want to convert ${player.name}? This action cannot be undone!`)) {
        return;
    }

    try {
        const response = await fetch('/api/training/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: convertSelectedId })
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.error || 'Conversion failed');
            return;
        }

        // Remove player from local list
        allPlayers = allPlayers.filter(p => p.id !== convertSelectedId);
        convertSelectedId = null;

        // Show result
        showResultModal('Player Converted!', `
            <p><strong>${player.name}</strong> has been converted to an EXP Trainer!</p>
            <p style="margin-top: 15px;">EXP Value: <span style="color: #22c55e; font-size: 1.5rem;">+${data.expValue.toLocaleString()}</span></p>
            <p style="margin-top: 10px; color: #aaa;">Check your mail to use the trainer!</p>
        `);

        document.getElementById('expPreview').style.display = 'none';
        document.getElementById('convertBtn').disabled = true;
        renderConvertPlayersList();
        renderPlayersList();

    } catch (error) {
        console.error('Conversion error:', error);
        alert('Conversion failed. Please try again.');
    }
}

function renderShop() {
    const container = document.getElementById('shopGrid');

    container.innerHTML = SHOP_ITEMS.map(item => {
        const currencySymbol = item.currency === 'eCoins' ? '🪙' : '💰';
        const canAfford = item.currency === 'eCoins'
            ? (userData.eCoins || 0) >= item.cost
            : (userData.gp || 0) >= item.cost;

        return `
            <div class="shop-item">
                <h3>${item.name}</h3>
                <p>Get ${item.qty}x trainer(s)</p>
                <div class="shop-price">${currencySymbol} ${item.cost.toLocaleString()}</div>
                <button class="trainer-button" 
                        onclick="buyShopItem('${item.id}')"
                        ${!canAfford ? 'disabled' : ''}>
                    ${canAfford ? 'Purchase' : 'Not Enough'}
                </button>
            </div>
        `;
    }).join('');
}

async function buyShopItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;

    try {
        const response = await fetch('/api/training/shop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId })
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.error || 'Purchase failed');
            return;
        }

        // Update balances
        userData.gp = data.newBalance.gp;
        userData.eCoins = data.newBalance.eCoins;

        document.getElementById('topGP').textContent = data.newBalance.gp.toLocaleString();
        document.getElementById('topEcoins').textContent = data.newBalance.eCoins;

        showResultModal('Purchase Complete!', `
            <p>You purchased <strong>${item.name}</strong>!</p>
            <p style="margin-top: 15px; color: #aaa;">Trainers have been sent to your mail!</p>
        `);

        renderShop();
        renderTrainers();

    } catch (error) {
        console.error('Shop error:', error);
        alert('Purchase failed. Please try again.');
    }
}

function filterPlayers() {
    renderPlayersList();
}

function filterConvertPlayers() {
    renderConvertPlayersList();
}

function showResultModal(title, bodyHtml) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    document.getElementById('resultModal').classList.add('show');
}

function closeModal() {
    document.getElementById('resultModal').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', init);
