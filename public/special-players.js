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

// ==========================================
// SPINNING BALL ANIMATION SYSTEM
// ==========================================

// Get ball style for each rarity
function getBallStyle(rarity) {
    const styles = {
        'Iconic': {
            background: 'radial-gradient(circle at 30% 30%, #ff69b4 0%, #db0a5b 50%, #8b008b 100%)',
            border: '3px solid #ff1493',
            glow: '0 0 20px rgba(255, 20, 147, 0.8)'
        },
        'Legend': {
            background: 'radial-gradient(circle at 30% 30%, #ffd700 0%, #daa520 50%, #8b6508 100%)',
            border: '3px solid #ffd700',
            glow: '0 0 20px rgba(255, 215, 0, 0.8)'
        },
        'Black': {
            background: 'radial-gradient(circle at 30% 30%, #4a4a4a 0%, #2a2a2a 50%, #0a0a0a 100%)',
            border: '3px solid #555',
            glow: '0 0 20px rgba(80, 80, 80, 0.8)'
        },
        'Gold': {
            background: 'radial-gradient(circle at 30% 30%, #ffc300 0%, #b8860b 50%, #8b6508 100%)',
            border: '3px solid #ffc300',
            glow: '0 0 20px rgba(255, 195, 0, 0.8)'
        },
        'Silver': {
            background: 'radial-gradient(circle at 30% 30%, #e0e0e0 0%, #a0a0a0 50%, #707070 100%)',
            border: '3px solid #c0c0c0',
            glow: '0 0 20px rgba(192, 192, 192, 0.8)'
        },
        'Bronze': {
            background: 'radial-gradient(circle at 30% 30%, #e67e22 0%, #cd7f32 50%, #8b4513 100%)',
            border: '3px solid #cd7f32',
            glow: '0 0 20px rgba(205, 127, 50, 0.8)'
        },
        'White': {
            background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #e0e0e0 50%, #c0c0c0 100%)',
            border: '3px solid #fff',
            glow: '0 0 20px rgba(255, 255, 255, 0.6)'
        }
    };
    return styles[rarity] || styles['White'];
}

// Create spinning ball HTML
function createSpinningBall(rarity, index, total) {
    const style = getBallStyle(rarity);
    const angle = (360 / total) * index;
    const radius = 100;
    const radians = (angle - 90) * (Math.PI / 180);
    const x = Math.cos(radians) * radius;
    const y = Math.sin(radians) * radius;

    return `
        <div class="spin-ball" data-rarity="${rarity}" style="
            position: absolute;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: ${style.background};
            border: ${style.border};
            box-shadow: ${style.glow};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 0.7em;
            color: ${rarity === 'White' || rarity === 'Silver' ? '#333' : '#fff'};
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            top: 50%;
            left: 50%;
            margin-left: -25px;
            margin-top: -25px;
            transform: translate(${x}px, ${y}px);
        ">EFW</div>
    `;
}

// Utility delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Global skip flag
let skipAnimation = false;

// Wait for skip or delay
async function waitForSkipOrDelay(ms) {
    const checkInterval = 100;
    let elapsed = 0;
    while (elapsed < ms && !skipAnimation) {
        await delay(checkInterval);
        elapsed += checkInterval;
    }
    skipAnimation = false;
}

// Main pack result with full animation
async function showPackResult(players) {
    skipAnimation = false;
    const count = players.length;

    // Get highest rarity
    const rarityOrder = ['Iconic', 'Legend', 'Black', 'Gold', 'Silver', 'Bronze', 'White'];
    const highestRarity = rarityOrder.find(r => players.some(p => p.rarity === r)) || 'White';
    const highestIndex = rarityOrder.indexOf(highestRarity);

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'spinOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:2000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;';
    document.body.appendChild(overlay);

    // Step 1: Show spinning wheel
    const allRarities = ['Iconic', 'Legend', 'Black', 'Gold', 'Silver', 'Bronze', 'White'];
    const ballsHtml = allRarities.map((r, i) => createSpinningBall(r, i, allRarities.length)).join('');

    overlay.innerHTML = `
        <h2 style="color: #ffd700; font-size: 2em; margin-bottom: 30px;">
            🎰 ${count > 1 ? count + 'x ' : ''}Signing...
        </h2>
        <div style="position: relative; width: 280px; height: 280px;">
            <div id="spinnerWheel" style="position: absolute; width: 100%; height: 100%; animation: spinWheel 0.5s linear infinite;">
                ${ballsHtml}
            </div>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 70px; height: 70px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #0014DC, #000033); border: 4px solid #ffd700; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1em; color: #ffd700; z-index: 10;">EFW</div>
            <div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent; border-top: 20px solid #ffd700; z-index: 20;"></div>
        </div>
        <div style="margin-top: 25px; font-size: 1.2em; color: #fff;">⏳ Determining your players...</div>
    `;

    // Spin for 2 seconds
    await delay(2000);

    // Step 2: Decelerate and stop
    const wheel = document.getElementById('spinnerWheel');
    if (wheel) {
        const targetAngle = (360 / allRarities.length) * highestIndex + 1080;
        wheel.style.animation = 'none';
        wheel.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
        wheel.style.transform = `rotate(${targetAngle}deg)`;
    }

    overlay.querySelector('h2').innerHTML = `🎰 ${count > 1 ? count + 'x ' : ''}Signing...`;
    overlay.querySelector('div[style*="Determining"]').innerHTML = `✨ Stopping on ${highestRarity}...`;

    await delay(3500);

    // Step 3: Highlight winning ball
    const style = getBallStyle(highestRarity);
    overlay.innerHTML = `
        <h2 style="color: #ffd700; font-size: 2em; margin-bottom: 30px;">
            ${RARITY_EMOJIS[highestRarity]} ${highestRarity}!
        </h2>
        <div style="width: 120px; height: 120px; border-radius: 50%; background: ${style.background}; border: ${style.border}; box-shadow: ${style.glow}, 0 0 60px ${style.glow.split(')')[0]}0.5); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.5em; color: ${highestRarity === 'White' || highestRarity === 'Silver' ? '#333' : '#fff'}; animation: ballPulse 0.5s ease-in-out infinite alternate;">EFW</div>
        <div style="margin-top: 30px; font-size: 1em; color: #aaa;">Tap to continue...</div>
    `;

    overlay.onclick = () => { skipAnimation = true; };
    await waitForSkipOrDelay(1500);
    overlay.onclick = null;

    // Step 4: Show GIF (skippable)
    overlay.innerHTML = `
        <div style="text-align: center; cursor: pointer;" onclick="skipAnimation = true;">
            <h2 style="color: #ffd700; font-size: 2em; margin-bottom: 20px;">
                ${RARITY_EMOJIS[highestRarity]} ${highestRarity} Reveal!
            </h2>
            <img src="/assets/gifs/${highestRarity.toLowerCase()}.gif" 
                 alt="${highestRarity}" 
                 style="max-width: 450px; width: 100%; border-radius: 15px; box-shadow: 0 0 30px rgba(255,215,0,0.5);"
                 onerror="this.style.display='none'" />
            <div style="margin-top: 20px; font-size: 1.2em; color: #fff;">✨ Revealing your players...</div>
            <div style="margin-top: 10px; font-size: 0.9em; color: #aaa;">👆 Tap to skip</div>
        </div>
    `;

    await waitForSkipOrDelay(5000);

    // Step 5: Show cards
    const sortedPlayers = [...players].sort((a, b) => {
        const aIdx = rarityOrder.indexOf(a.rarity);
        const bIdx = rarityOrder.indexOf(b.rarity);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return (b.overall || 0) - (a.overall || 0);
    });

    const cardsHtml = sortedPlayers.map((player, index) => {
        const playerImagePath = `/assets/playerimages/${player.id}.png`;
        return `
            <div class="player-detail-card" data-rarity="${player.rarity}" 
                 style="width: 140px; height: 200px; animation: cardReveal 0.5s ease-out ${index * 0.1}s both; cursor: pointer;">
                <div class="player-card-rating" style="font-size: 1.8em; top: 30px;">${player.overall || 0}</div>
                <div class="player-card-position" style="font-size: 0.85em;">${player.position}</div>
                <div class="player-card-rarity" style="font-size: 1.2em; top: 70px;">${RARITY_EMOJIS[player.rarity] || '⚽'}</div>
                <img src="${playerImagePath}" class="player-detail-image" onerror="this.src='/assets/playerimages/default_player.png'">
                <div class="player-card-rarity-bottom" style="font-size: 0.7em; padding: 4px;">${truncateName(player.name)}</div>
                ${player.isDuplicate ? '<div style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(245, 158, 11, 0.9); color: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.6em; font-weight: bold; z-index: 20;">DUPLICATE</div>' : ''}
            </div>
        `;
    }).join('');

    const gridCols = sortedPlayers.length <= 3 ? sortedPlayers.length : sortedPlayers.length <= 5 ? sortedPlayers.length : 5;

    overlay.innerHTML = `
        <h2 style="color: #ffd700; font-size: 2em; margin-bottom: 25px;">🎉 Signings</h2>
        <div style="display: grid; grid-template-columns: repeat(${gridCols}, 1fr); gap: 12px; justify-items: center; max-width: 780px;">
            ${cardsHtml}
        </div>
        <button onclick="document.getElementById('spinOverlay').remove()" style="margin-top: 30px; padding: 15px 40px; background: #ffd700; border: none; border-radius: 25px; color: #000; font-size: 1.1em; font-weight: bold; cursor: pointer; text-transform: uppercase;">Continue</button>
    `;
}

// Mock test function for testing
async function testSpinAnimation(highestRarity = 'Iconic', count = 10) {
    const rarities = ['Iconic', 'Legend', 'Black', 'Gold', 'Silver', 'Bronze', 'White'];
    const rarityIndex = rarities.indexOf(highestRarity);
    const mockPlayers = [];

    mockPlayers.push({ id: 'test-1', name: 'Star Player', rarity: highestRarity, overall: 99, position: 'CF' });

    for (let i = 1; i < count; i++) {
        const lowerRarity = rarities[Math.min(rarityIndex + Math.floor(Math.random() * 3) + 1, rarities.length - 1)];
        mockPlayers.push({
            id: `test-${i + 1}`,
            name: `Player ${i + 1}`,
            rarity: lowerRarity,
            overall: 60 + Math.floor(Math.random() * 30),
            position: ['CF', 'LWF', 'AMF', 'CMF', 'CB', 'GK'][Math.floor(Math.random() * 6)]
        });
    }

    await showPackResult(mockPlayers);
}

window.testSpinAnimation = testSpinAnimation;

document.addEventListener('DOMContentLoaded', init);

