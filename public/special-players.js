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
    'Black': '🌑',
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
    try {
        const response = await fetch('/api/all-players');
        const data = await response.json();
        const rawPlayers = data.players || [];

        // Map new JSON schema to internal format and DERIVE RARITY
        allPlayers = rawPlayers.map(p => {
            const rating = p.overall_rating || 75;
            let derivedRarity = 'Bronze';
            if (rating >= 90) derivedRarity = 'Iconic';
            else if (rating >= 85) derivedRarity = 'Legend';
            else if (rating >= 82) derivedRarity = 'Black';
            else if (rating >= 78) derivedRarity = 'Gold';
            else if (rating >= 75) derivedRarity = 'Silver';

            // Map Stats (Approximate mapping)
            const stats = {
                attacking: p.stats?.offensive_awareness || 70,
                dribbling: p.stats?.dribbling || 70,
                passing: p.stats?.low_pass || 70,
                defending: p.stats?.defensive_awareness || 70,
                physicality: p.stats?.physical_contact || 70,
                goalkeeping: p.stats?.gk_awareness || 40
            };

            // Normalize rarity from DB (Title Case)
            let finalRarity = derivedRarity;
            if (p.rarity) {
                // Ensure Title Case (e.g. "black" -> "Black")
                finalRarity = p.rarity.charAt(0).toUpperCase() + p.rarity.slice(1).toLowerCase();
            }

            return {
                id: p.id,
                name: p.name,
                rarity: finalRarity, // Use DB rarity if available

                overall: rating,
                position: p.position,
                team: p.team,
                league: p.league,
                stats: stats,
                image: p.image_url // Store external URL if needed
            };
        });

    } catch (e) {
        console.error("Error loading players:", e);
    }
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

        // Display contract banner for this pack
        playersHtml = `
            <div class="featured-player">
                <img src="/assets/contractbanner/${key}.png" 
                     onerror="this.src='/assets/contractbanner/standard.png'">
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
    showConfirmation(count);
}

// Pending purchase state
let pendingPurchase = {
    count: 0,
    isFree: false,
    freeCount: 0
};

// Get free packs for a pack type
function getFreePacks(packKey) {
    if (!userData.inventory || !userData.inventory.freePacks) return 0;
    // Map pack keys to rarity keys
    const keyMap = {
        'iconic': 'Iconic',
        'legend': 'Legend',
        'standard': 'Black'
    };
    const rarityKey = keyMap[packKey] || 'Black';
    return userData.inventory.freePacks[rarityKey] || 0;
}

// Show confirmation modal
function showConfirmation(count) {
    const pack = PACKS[selectedPack];
    if (!pack) return;

    const freeAvailable = getFreePacks(selectedPack);
    const modal = document.getElementById('confirmModal');
    const descEl = document.getElementById('confirmDesc');
    const costEl = document.getElementById('confirmCost');
    const btnEl = document.getElementById('confirmBuyBtn');

    if (count === 1) {
        // 1x spin
        if (freeAvailable > 0) {
            // Free 1x
            descEl.textContent = `Sign a player using your Free ${pack.type} Pack.`;
            costEl.textContent = 'Free 1x';
            btnEl.classList.add('free-btn');
            btnEl.querySelector('.coin-icon').textContent = '🎁';
            pendingPurchase = { count: 1, isFree: true, freeCount: 1 };
        } else {
            // Paid 1x
            descEl.textContent = `Sign a player using eFootball™ Coins. This ${pack.type} Pack costs ${pack.cost} eCoins.`;
            costEl.textContent = pack.cost;
            btnEl.classList.remove('free-btn');
            btnEl.querySelector('.coin-icon').textContent = '🪙';
            pendingPurchase = { count: 1, isFree: false, freeCount: 0 };
        }
    } else {
        // 10x spin
        if (freeAvailable > 0) {
            // Use free packs (max 10)
            const useCount = Math.min(freeAvailable, 10);
            descEl.textContent = `Sign ${useCount} player${useCount > 1 ? 's' : ''} using your Free ${pack.type} Packs.`;
            costEl.textContent = `Free ${useCount}x`;
            btnEl.classList.add('free-btn');
            btnEl.querySelector('.coin-icon').textContent = '🎁';
            pendingPurchase = { count: useCount, isFree: true, freeCount: useCount };
        } else {
            // Paid 10x
            descEl.textContent = `Sign 10 players using eFootball™ Coins. This ${pack.type} Pack bundle costs ${pack.cost10x} eCoins.`;
            costEl.textContent = pack.cost10x;
            btnEl.classList.remove('free-btn');
            btnEl.querySelector('.coin-icon').textContent = '🪙';
            pendingPurchase = { count: 10, isFree: false, freeCount: 0 };
        }
    }

    modal.classList.add('show');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('show');
    pendingPurchase = { count: 0, isFree: false, freeCount: 0 };
}

async function confirmPurchase() {
    if (!pendingPurchase || pendingPurchase.count === 0) return;

    // Capture data before closing modal (which clears it)
    const { count, isFree, freeCount } = pendingPurchase;

    closeConfirmModal();
    await buyPack(count, isFree, freeCount);
}

async function buyPack(count, isFree = false, freeCount = 0) {
    if (!selectedPack) {
        alert('Please select a pack first');
        return;
    }

    const pack = PACKS[selectedPack];
    const totalCost = isFree ? 0 : (count === 10 ? pack.cost10x : pack.cost * count);

    // Check balance if not free
    if (!isFree && (userData.eCoins || 0) < totalCost) {
        alert(`Not enough eCoins! You need ${totalCost} eCoins.`);
        return;
    }

    try {
        // Open pack via API
        console.log(`[Pack] Opening ${selectedPack}, count: ${count}, isFree: ${isFree}`);

        const response = await fetch('/api/contracts/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                packType: selectedPack,
                count: Number(count), // Ensure number
                useFree: !!isFree,
                freeCount: Number(freeCount) || 0
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('API Error:', errText);
            alert(`Server Error: ${response.status}. Please check console.`);
            return;
        }

        const result = await response.json();
        console.log('[Pack] API Result:', result);

        if (!result.success) {
            alert(result.message || 'Failed to open pack');
            return;
        }

        // Update balance
        userData.eCoins = result.newBalance ?? (userData.eCoins - totalCost);
        document.getElementById('topEcoins').textContent = userData.eCoins;

        // Update free packs if used
        if (isFree && userData.inventory && userData.inventory.freePacks) {
            const keyMap = { 'iconic': 'Iconic', 'legend': 'Legend', 'standard': 'Black' };
            const rarityKey = keyMap[selectedPack] || 'Black';
            userData.inventory.freePacks[rarityKey] = Math.max(0, (userData.inventory.freePacks[rarityKey] || 0) - freeCount);
        }

        // Show result
        const pulledPlayers = result.players || [];
        if (pulledPlayers.length === 0) {
            console.error('[Pack] Critical: Server returned success but empty players array!', result);
            alert('Error: Server returned empty player list. Check balance or try again.');
            return;
        }
        showPackResult(pulledPlayers);

    } catch (error) {
        console.error('Buy pack error:', error);
        alert('Error opening pack. Please try again.');
    }
}

// ==========================================
// FIFA STYLE WALKOUT ANIMATION
// ==========================================

// Helper: Extract Country from League
function getCountryFromLeague(league) {
    if (!league) return 'Unknown';
    if (league.includes('England')) return 'England 🏴󠁧󠁢󠁥󠁮󠁧󠁿';
    if (league.includes('Spain')) return 'Spain 🇪🇸';
    if (league.includes('Italy')) return 'Italy 🇮🇹';
    if (league.includes('France')) return 'France 🇫🇷';
    if (league.includes('Germany')) return 'Germany 🇩🇪';
    if (league.includes('Portugal')) return 'Portugal 🇵🇹';
    if (league.includes('Netherlands')) return 'Netherlands 🇳🇱';
    if (league.includes('Brazil')) return 'Brazil 🇧🇷';
    if (league.includes('Argentina')) return 'Argentina 🇦🇷';
    if (league.includes('Japan')) return 'Japan 🇯🇵';
    if (league.includes('Turkey')) return 'Turkey 🇹🇷';
    if (league.includes('Scotland')) return 'Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿';
    return 'World 🌍';
}

async function showPackResult(players) {
    const count = players.length;
    if (count === 0) {
        alert('No players were pulled. Please try again.');
        return;
    }

    // 1. Determine Main Walkout Player (Highest Rated)
    const rarityOrder = ['Iconic', 'Legend', 'Black', 'Gold', 'Silver', 'Bronze', 'White'];

    // Sort logic matching the rarity order + rating
    const sortedPlayers = [...players].sort((a, b) => {
        const aIdx = rarityOrder.indexOf(a.rarity);
        const bIdx = rarityOrder.indexOf(b.rarity);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return (b.overall || 0) - (a.overall || 0);
    });

    const bestPlayer = sortedPlayers[0];
    startWalkoutAnimation(bestPlayer, sortedPlayers);
}

function startWalkoutAnimation(player, allPlayers) {
    const country = player.nationality || getCountryFromLeague(player.league);
    const color = RARITY_STYLES[player.rarity]?.color || '#ffd700';

    // 1. Create Container
    const container = document.createElement('div');
    container.className = 'efw-walkout-container';
    container.style.setProperty('--walkout-color', color);

    container.innerHTML = `
        <div class="walkout-flash" style="position:fixed; inset:0; background:#fff; z-index:10000; pointer-events:none;"></div>
        <div class="walkout-lights-bg"></div>
        <div class="spotlight left"></div>
        <div class="spotlight center"></div>
        <div class="spotlight right"></div>
        
        <div class="walkout-info-container" id="walkoutInfo">
            <div class="walkout-flag" id="woText"></div>
        </div>

        <div class="walkout-card-container" id="woCardContainer">
             <div class="walkout-card-glow"></div>
             <!-- Card injected here -->
        </div>

        <button class="walkout-skip-btn" onclick="skipWalkout()">SKIP >></button>
    `;

    document.body.appendChild(container);

    // Store state for skip
    window.currentWalkoutContainer = container;
    window.currentWalkoutPlayers = allPlayers;

    // ANIMATION SEQUENCE
    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    const infoText = document.getElementById('woText');

    (async () => {
        // T=0: Flash
        const flash = container.querySelector('.walkout-flash');
        flash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' });

        // T=200: Flares (handled by CSS animation delay)

        // T=1000: NATION
        await delay(1000);
        if (!window.currentWalkoutContainer) return;
        infoText.textContent = country;
        infoText.className = 'walkout-flag animate-in-slam'; // Gold Text

        // Fade out at 2200ms (1.2s later)
        await delay(1200);
        infoText.className = 'walkout-flag animate-out-fade';

        // T=2500: POSITION
        await delay(300); // 2200+300 = 2500
        if (!window.currentWalkoutContainer) return;
        infoText.textContent = player.position;
        infoText.className = 'walkout-text-huge animate-in-slam'; // Big Text

        // Fade out at 3700ms
        await delay(1200);
        infoText.className = 'walkout-text-huge animate-out-fade';

        // T=4000: CLUB
        await delay(300); // 3700+300 = 4000
        if (!window.currentWalkoutContainer) return;
        infoText.textContent = player.team;
        infoText.className = 'walkout-text-medium animate-in-fade'; // Medium Text

        // Fade out at 5200ms
        await delay(1200);
        infoText.className = 'walkout-text-medium animate-out-fade';

        // T=5500: REVEAL
        await delay(300); // 5200+300 = 5500
        if (!window.currentWalkoutContainer) return;

        // Build Card HTML
        const cardContainer = document.getElementById('woCardContainer');
        cardContainer.innerHTML += `
            <div class="player-detail-card" data-rarity="${player.rarity}" style="width: 300px; height: 420px; box-shadow: 0 0 60px ${color};">
                <div class="player-card-rating" style="font-size: 2.5em;">${player.overall}</div>
                <div class="player-card-position" style="font-size: 1.2em;">${player.position}</div>
                <div class="player-card-rarity" style="font-size: 2em; top: 80px;">${RARITY_EMOJIS[player.rarity] || '💎'}</div>
                <img src="/assets/playerimages/${player.id}.png" 
                     class="player-detail-image" 
                     onerror="this.onerror=null; this.src='${player.image}'; this.onerror=function(){this.src='/assets/playerimages/default_player.png'}">
                <div class="player-card-rarity-bottom" style="font-size: 1em; padding: 10px;">${player.name}</div>
            </div>
        `;
        cardContainer.classList.add('animate-card-reveal');
        cardContainer.style.opacity = '1';

        const btn = container.querySelector('.walkout-skip-btn');
        if (btn) {
            btn.textContent = "CONTINUE";
            btn.onclick = finishWalkout;
        }

    })();
}

function skipWalkout() {
    // Jump straight to grid view
    finishWalkout();
}

function finishWalkout() {
    const container = window.currentWalkoutContainer;
    const players = window.currentWalkoutPlayers;

    if (container) container.remove();

    // Show grid of all 10 players
    showRevealGrid(players);
}

function showRevealGrid(sortedPlayers) {
    const cardsHtml = sortedPlayers.map((player, index) => {
        return `
            <div class="player-detail-card" data-rarity="${player.rarity}" 
                 style="width: 140px; height: 200px; animation: cardReveal 0.5s ease-out ${index * 0.1}s both; cursor: pointer; margin: 10px;">
                <div class="player-card-rating" style="font-size: 1.8em; top: 30px;">${player.overall || 0}</div>
                <div class="player-card-position" style="font-size: 0.85em;">${player.position}</div>
                <div class="player-card-rarity" style="font-size: 1.2em; top: 70px;">${RARITY_EMOJIS[player.rarity] || '⚽'}</div>
                <img src="/assets/playerimages/${player.id}.png" 
                     class="player-detail-image" 
                     onerror="this.onerror=null; this.src='${player.image}'; this.onerror=function(){this.src='/assets/playerimages/default_player.png'}">
                <div class="player-card-rarity-bottom" style="font-size: 0.7em; padding: 4px;">${truncateName(player.name)}</div>
            </div>
        `;
    }).join('');

    const revealScreen = document.createElement('div');
    revealScreen.className = 'efw-reveal-screen active';

    const gridCols = sortedPlayers.length <= 3 ? sortedPlayers.length : sortedPlayers.length <= 5 ? sortedPlayers.length : 5;

    revealScreen.innerHTML = `
        <h2 style="color: #ffd700; font-size: 2em; margin-bottom: 25px;">🎉 Signings</h2>
        <div style="display: grid; grid-template-columns: repeat(${gridCols}, 1fr); gap: 10px; justify-items: center; max-width: 800px;">
            ${cardsHtml}
        </div>
        <button onclick="cleanupAnimation()" style="margin-top: 30px; padding: 15px 40px; background: #ffd700; border: none; border-radius: 25px; color: #000; font-size: 1.1em; font-weight: bold; cursor: pointer; text-transform: uppercase;">Continue</button>
    `;

    document.body.appendChild(revealScreen);
}

function cleanupAnimation() {
    const overlays = document.querySelectorAll('.efw-background, .efw-cinematic-screen, .efw-reveal-screen, .efw-walkout-container');
    overlays.forEach(el => el.remove());
}

// Mock test
window.testWalkout = async () => {
    const mock = [{
        id: 'test', name: 'Haaland', rarity: 'Iconic', overall: 98, position: 'CF', league: 'England Div 1', team: 'Manchester B', image: ''
    }];
    startWalkoutAnimation(mock[0], mock);
};

document.addEventListener('DOMContentLoaded', init);

// RARITY CONFIGURATION
const RARITY_STYLES = {
    'Iconic': { color: '#db0a5b' },
    'Legend': { color: '#ffd700' },
    'Black': { color: '#ffffff' },
    'Gold': { color: '#f1c40f' },
    'Silver': { color: '#bdc3c7' },
    'Bronze': { color: '#cd7f32' },
    'White': { color: '#fff' }
};


