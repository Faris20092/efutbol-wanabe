// Special Players List Page
let userData = null;
let allPlayers = [];
let ownedPlayerIds = [];
let selectedPack = null;

// Pack definitions matching existing system
const PACKS = {
    iconic: {
        name: 'Iconic Pack',
        type: 'Show Time',
        cost: 500,
        cost10x: 4500,
        currency: 'eCoins',
        rarities: ['Iconic', 'Legend', 'Black']
    },
    legend: {
        name: 'Legend Pack',
        type: 'Epic',
        cost: 300,
        cost10x: 2700,
        currency: 'eCoins',
        rarities: ['Legend', 'Black', 'Gold']
    },
    standard: {
        name: 'Standard Pack',
        type: 'Standard',
        cost: 100,
        cost10x: 900,
        currency: 'eCoins',
        rarities: ['Black', 'Gold', 'Silver', 'Bronze', 'White']
    }
};

const RARITY_EMOJIS = {
    'Iconic': '💎',
    'Legend': '🌟',
    'Black': '⚫',
    'Gold': '🟡',
    'Silver': '⚪',
    'Bronze': '🟤',
    'White': '⬜'
};

async function init() {
    try {
        await loadUserData();
        await loadAllPlayers();
        renderPackCarousel();
    } catch (error) {
        console.error('Init error:', error);
        document.getElementById('packCarousel').innerHTML = '<p style="color:#ef4444;">Error loading. Please refresh.</p>';
    }
}

async function loadUserData() {
    const response = await fetch('/api/user');
    const data = await response.json();
    userData = data.gameData;

    // Load owned player IDs
    if (userData.players) {
        ownedPlayerIds = userData.players.map(p => p.id);
    }

    document.getElementById('topGP').textContent = (userData.gp || 0).toLocaleString();
    document.getElementById('topEcoins').textContent = userData.eCoins || 0;
}

// Added fix for API response structure
async function loadAllPlayers() {
    const response = await fetch('/api/all-players');
    const data = await response.json();
    allPlayers = data.players || [];
}

function getTopPlayersForPack(packKey, count = 3) {
    const pack = PACKS[packKey];
    if (!pack) return [];

    // Filter players by pack's rarities
    const eligiblePlayers = allPlayers.filter(p => pack.rarities.includes(p.rarity));

    // Sort by overall rating descending
    eligiblePlayers.sort((a, b) => (b.overall || 0) - (a.overall || 0));

    // Prioritize players with images if possible?
    // For now just top rated.

    return eligiblePlayers.slice(0, count);
}

function getAllPlayersForPack(packKey) {
    const pack = PACKS[packKey];
    if (!pack) return [];

    return allPlayers
        .filter(p => pack.rarities.includes(p.rarity))
        .sort((a, b) => (b.overall || 0) - (a.overall || 0));
}

function renderPackCarousel() {
    const carousel = document.getElementById('packCarousel');
    carousel.innerHTML = '';

    Object.entries(PACKS).forEach(([key, pack]) => {
        const topPlayers = getTopPlayersForPack(key, 3);

        const packEl = document.createElement('div');
        packEl.className = 'pack-item';
        packEl.onclick = () => openPackModal(key);

        let playersHtml = '';

        // Display contract banner
        playersHtml = `
            <div class="featured-player">
                <img src="/assets/contractbanner/contractbanner.png" 
                     onerror="this.src='/assets/contractbanner/contractbanner.jpg'">
            </div>
        `;

        packEl.innerHTML = `
            <div class="pack-type">${pack.type}</div>
            <div class="pack-name">${pack.name}</div>
            <div class="featured-players">
                ${playersHtml}
            </div>
            <div class="buy-buttons">
                <button class="buy-btn" onclick="event.stopPropagation(); selectPackAndBuy('${key}', 1)">
                    👤 ×1 | <span class="cost">${pack.cost}</span> 🪙
                </button>
                <button class="buy-btn" onclick="event.stopPropagation(); selectPackAndBuy('${key}', 10)">
                    👤 ×10 | <span class="cost">${pack.cost10x}</span> 🪙
                </button>
            </div>
        `;

        carousel.appendChild(packEl);
    });
}

function truncateName(name) {
    if (!name) return '';
    return name.length > 12 ? name.slice(0, 12) + '...' : name;
}

function openPackModal(packKey) {
    selectedPack = packKey;
    const pack = PACKS[packKey];
    const topPlayers = getTopPlayersForPack(packKey, 5);

    // Update modal header
    document.getElementById('modalPackType').textContent = pack.type;
    document.getElementById('modalPackName').textContent = pack.name;
    document.getElementById('cost1x').textContent = pack.cost;
    document.getElementById('cost10x').textContent = pack.cost10x;

    // Render featured players
    const featuredContainer = document.getElementById('modalFeatured');
    featuredContainer.innerHTML = '';

    topPlayers.forEach((player, index) => {
        // Use full image for modal cards using player ID
        const playerImagePng = `/assets/playerimages/${player.id}.png`;

        // CSS Class logic for rarity
        let rarityClass = 'base'; // Default
        const rLower = (player.rarity || '').toLowerCase();
        if (rLower.includes('iconic') || rLower.includes('show time')) rarityClass = 'iconic';
        else if (rLower.includes('legend') || rLower.includes('epic')) rarityClass = 'legend';

        const card = document.createElement('div');

        // Structure: div.pes-player-card.[RARITY]
        // Structure: div.pes-player-card.[RARITY]
        card.innerHTML = `
            <div class="pes-player-card ${rarityClass}">
                <div class="player-card-rating">${player.overall || 0}</div>
                <div class="player-card-position">${player.position || 'CMF'}</div>
                <div class="player-card-rarity">${RARITY_EMOJIS[player.rarity] || '💎'}</div>
                <img src="${playerImagePng}" class="player-detail-image" 
                     onerror="this.src='/assets/playerimages/default_player.png'">
                <div class="player-card-rarity-bottom">${truncateName(player.name)}</div>
            </div>
        `;

        const featuredCard = card.firstElementChild;
        featuredCard.onclick = () => showPlayerDetails(player);

        featuredContainer.appendChild(featuredCard);
    });

    // Add "See All" card
    const seeAllCard = document.createElement('div');
    seeAllCard.className = 'see-all-card';
    seeAllCard.onclick = showAllPlayers;
    seeAllCard.innerHTML = `<div class="see-all-text">See All</div>`;
    featuredContainer.appendChild(seeAllCard);

    // Show modal
    document.getElementById('packModal').classList.add('show');
    document.getElementById('featuredView').style.display = 'block';
    document.getElementById('allPlayersView').classList.remove('show');
}

function closePackModal() {
    document.getElementById('packModal').classList.remove('show');
    selectedPack = null;
}

function showAllPlayers() {
    if (!selectedPack) return;

    const players = getAllPlayersForPack(selectedPack);
    const grid = document.getElementById('allPlayersGrid');
    grid.innerHTML = '';

    players.forEach(player => {
        // Use full image using player ID
        const playerImagePng = `/assets/playerimages/${player.id}.png`;

        const card = document.createElement('div');
        // Wrapper style
        card.style.cursor = 'pointer';
        card.onclick = () => showPlayerDetails(player);

        // Use player-detail-card scaled down for grid
        card.innerHTML = `
            <div class="player-detail-card" data-rarity="${player.rarity || 'Base'}" style="width: 100%; aspect-ratio: 240/340;">
                <div class="player-card-position" style="font-size: 0.8em; padding: 2px 6px;">${player.position || 'CMF'}</div>
                <div class="player-card-rating" style="font-size: 2em; top: 30px;">${player.overall || 0}</div>
                <div class="player-card-rarity" style="font-size: 1.5em; top: 75px;">${RARITY_EMOJIS[player.rarity] || '💎'}</div>
                <img src="${playerImagePng}" class="player-detail-image" 
                     onerror="this.src='/assets/playerimages/default_player.png'">
                <div class="player-card-rarity-bottom" style="bottom: 5px; font-size: 0.7em;">${player.rarity || 'Standard'}</div>
            </div>
            <div class="modal-player-name" style="margin-top: 5px; font-size: 0.8em; color: rgba(255,255,255,0.7); text-align: center;">
                ${truncateName(player.name)}
            </div>
        `;
        grid.appendChild(card);
    });

    // Switch views
    document.getElementById('featuredView').style.display = 'none';
    document.getElementById('allPlayersView').classList.add('show');
}

function hideSeeAll() {
    document.getElementById('featuredView').style.display = 'block';
    document.getElementById('allPlayersView').classList.remove('show');
}

// Show player details modal matching photo reference
function showPlayerDetails(player) {
    const modal = document.getElementById('playerModal');
    const content = document.getElementById('playerModalContent');

    const stats = player.stats || {};
    const isOwned = ownedPlayerIds.includes(player.id);

    // Use full image using player ID
    const playerImagePng = `/assets/playerimages/${player.id}.png`;

    content.innerHTML = `
        <div class="player-detail-container">
            <div class="player-detail-left">
                <!-- Unified Design Card (Standard Size 240x340 controlled by CSS class) -->
                <div class="player-detail-card" data-rarity="${player.rarity || 'Base'}">
                    <div class="player-card-rating">${player.overall || 0}</div>
                    <div class="player-card-position">${player.position || 'CMF'}</div>
                    <div class="player-card-rarity">${RARITY_EMOJIS[player.rarity] || '💎'}</div>
                    <img src="${playerImagePng}" class="player-detail-image" 
                         onerror="this.src='/assets/playerimages/default_player.png'">
                    <div class="player-card-rarity-bottom">${truncateName(player.name)}</div>
                </div>
                
                <div style="margin-top: 20px; color: #4ade80; font-size: 1.1em; font-weight: bold; text-align: center;">
                     ${isOwned ? '✔ You own this player' : ''}
                </div>
            </div>
            
            <div class="player-detail-right">
                <div class="player-detail-header-grid">
                    <div class="detail-info-box">
                        <span class="detail-label">Overall:</span>
                        <span class="detail-value">${player.overall}</span>
                    </div>
                    <div class="detail-info-box">
                        <span class="detail-label">Rarity:</span>
                        <span class="detail-value">${player.rarity}</span>
                    </div>
                    <div class="detail-info-box">
                        <span class="detail-label">Position:</span>
                        <span class="detail-value">${player.position}</span>
                    </div>
                    <div class="detail-info-box">
                        <span class="detail-label">Style:</span>
                        <span class="detail-value" style="font-size: 0.9em;">${player.playingStyle || 'N/A'}</span>
                    </div>
                </div>
                
                <h3 style="color: #00d4ff; margin-bottom: 15px; font-size: 1.2em;">Stats</h3>
                <div class="player-detail-stats">
                    <div class="player-detail-stat">
                        <span class="stat-icon">⚔️</span>
                        <span class="stat-label">ATTACKING:</span>
                        <span class="stat-value" style="color: ${getStatColor(stats.attacking)}">${stats.attacking || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">🎯</span>
                        <span class="stat-label">DRIBBLING:</span>
                        <span class="stat-value" style="color: ${getStatColor(stats.dribbling)}">${stats.dribbling || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">⚽</span>
                        <span class="stat-label">PASSING:</span>
                        <span class="stat-value" style="color: ${getStatColor(stats.passing)}">${stats.passing || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">🛡️</span>
                        <span class="stat-label">DEFENDING:</span>
                        <span class="stat-value" style="color: ${getStatColor(stats.defending)}">${stats.defending || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">💪</span>
                        <span class="stat-label">PHYSICALITY:</span>
                        <span class="stat-value" style="color: ${getStatColor(stats.physicality)}">${stats.physicality || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">🧤</span>
                        <span class="stat-label">GOALKEEPING:</span>
                        <span class="stat-value" style="color: ${getStatColor(stats.goalkeeping)}">${stats.goalkeeping || 0}</span>
                    </div>
                </div>
                
                ${player.skills && player.skills.length > 0 ? `
                    <h3 style="color: #00d4ff; margin: 20px 0 10px; font-size: 1.2em;">Skills</h3>
                    <div style="background: rgba(10, 20, 40, 0.6); padding: 15px; border-radius: 10px; color: #ccc; font-size: 0.9em; line-height: 1.6; border: 1px solid rgba(255,255,255,0.05);">
                        ${player.skills.join(', ')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function closePlayerModal() {
    document.getElementById('playerModal').classList.remove('active');
}

function getStatColor(value) {
    if (!value) return '#fff';
    if (value >= 90) return '#00d4ff'; // Cyan for elite
    if (value >= 80) return '#27ae60'; // Green for good
    if (value >= 70) return '#f1c40f'; // Yellow for average
    if (value >= 60) return '#e67e22'; // Orange for below average
    return '#e74c3c'; // Red for poor
}

async function selectPackAndBuy(packKey, count) {
    selectedPack = packKey;
    await buyPack(count);
}

async function buyPack(count) {
    if (!selectedPack) {
        alert('Please select a pack first');
        return;
    }

    const pack = PACKS[selectedPack];
    const totalCost = count === 10 ? pack.cost10x : pack.cost * count;

    // Check balance
    if ((userData.eCoins || 0) < totalCost) {
        alert(`Not enough eCoins! You need ${totalCost} eCoins.`);
        return;
    }

    try {
        // Open pack via API
        const response = await fetch('/api/contracts/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                packType: selectedPack,
                count: count
            })
        });

        const result = await response.json();

        if (!result.success) {
            alert(result.message || 'Failed to open pack');
            return;
        }

        // Update balance
        userData.eCoins = result.newBalance || (userData.eCoins - totalCost);
        document.getElementById('topEcoins').textContent = userData.eCoins;

        // Show result
        showPackResult(result.players || []);

    } catch (error) {
        console.error('Buy pack error:', error);
        alert('Error opening pack. Please try again.');
    }
}

function showPackResult(players) {
    // Sort players by rarity (highest first)
    const rarityOrder = ['Iconic', 'Legend', 'Black', 'Gold', 'Silver', 'Bronze', 'White'];
    const sortedPlayers = [...players].sort((a, b) => {
        const aIndex = rarityOrder.indexOf(a.rarity);
        const bIndex = rarityOrder.indexOf(b.rarity);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return (b.overall || 0) - (a.overall || 0);
    });

    // Generate cards HTML
    const cardsHtml = sortedPlayers.map((player, index) => {
        const playerImagePath = `/assets/playerimages/${player.id}.png`;
        const animationDelay = index * 0.1;

        return `
            <div class="player-detail-card" data-rarity="${player.rarity}" 
                 style="width: 140px; height: 200px; animation: cardReveal 0.5s ease-out ${animationDelay}s both; cursor: pointer; flex-shrink: 0;">
                <div class="player-card-rating" style="font-size: 1.8em; top: 30px;">${player.overall || 0}</div>
                <div class="player-card-position" style="font-size: 0.85em;">${player.position}</div>
                <div class="player-card-rarity" style="font-size: 1.2em; top: 70px;">${RARITY_EMOJIS[player.rarity] || '⚽'}</div>
                <img src="${playerImagePath}" class="player-detail-image" 
                     onerror="this.src='/assets/playerimages/default_player.png'">
                <div class="player-card-rarity-bottom" style="font-size: 0.7em; padding: 4px;">${truncateName(player.name)}</div>
                ${player.isDuplicate ?
                '<div style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(245, 158, 11, 0.9); color: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.6em; font-weight: bold; z-index: 20;">DUPLICATE</div>' :
                ''
            }
            </div>
        `;
    }).join('');

    // Determine grid columns based on player count
    const gridCols = sortedPlayers.length <= 3 ? sortedPlayers.length : sortedPlayers.length <= 5 ? sortedPlayers.length : 5;

    let resultHtml = `
        <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:2000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;">
            <h2 style="color:#ffd700;margin-bottom:25px;font-size:2em;">🎉 Signings</h2>
            <div style="display: grid; grid-template-columns: repeat(${gridCols}, 1fr); gap: 12px; justify-items: center; max-width: 780px;">
                ${cardsHtml}
            </div>
            <button onclick="this.parentElement.remove()" style="margin-top:30px;padding:15px 40px;background:var(--secondary);border:none;border-radius:25px;color:#000;font-size:1.1em;font-weight:bold;cursor:pointer;text-transform:uppercase;">Continue</button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', resultHtml);
}

document.addEventListener('DOMContentLoaded', init);
