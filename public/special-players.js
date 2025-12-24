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
// EFW MOBILE CONTRACT ANIMATION SYSTEM
// ==========================================

// Global state for animation
let efwState = {
    speed: 40,
    offset: 0,
    isSpinning: false,
    isDecelerating: false,
    targetRarity: null,
    animationId: null,
    wonPlayers: []
};

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

// Create a ball element
function createBallElement(forcedRarity = null) {
    const el = document.createElement('div');
    let type = forcedRarity;

    if (!type) {
        // Weighted random filler balls - PES mobile colorful style!
        const r = Math.random();
        if (r > 0.97) type = 'Iconic';
        else if (r > 0.93) type = 'Legend';
        else if (r > 0.85) type = 'Black';
        else if (r > 0.55) type = 'Gold';  // More gold balls for colorful look
        else if (r > 0.30) type = 'Silver';
        else if (r > 0.10) type = 'Bronze';
        else type = 'White';  // Reduced white probability
    }

    el.className = 'efw-ball';
    el.dataset.rarity = type; // Used by CSS attribute selector
    el.innerText = "EFW";
    return el;
}

// Add ball to track
function addBall(track, forcedRarity = null) {
    track.appendChild(createBallElement(forcedRarity));
}

// MAIN ANIMATION FUNCTION
async function showPackResult(players) {
    const count = players.length;

    // Guard for empty players
    if (count === 0) {
        alert('No players were pulled. Please try again.');
        return;
    }

    // 1. Determine Target Rarity Logic
    const rarityOrder = ['Iconic', 'Legend', 'Black', 'Gold', 'Silver', 'Bronze', 'White'];
    const highestRarity = rarityOrder.find(r => players.some(p => p.rarity === r)) || 'White';

    // Initialize State
    efwState = {
        speed: 60, // Start fast
        offset: 0,
        isSpinning: true,
        isDecelerating: false,
        targetRarity: highestRarity,
        wonPlayers: players,
        animationId: null,
        trackElement: null
    };

    // 2. Build Environment (Stadium, Lights, Spinner)
    const overlay = document.createElement('div');
    overlay.className = 'efw-background';
    overlay.id = 'efwOverlay';

    overlay.innerHTML = `
        <!-- Stadium Lights -->
        <div class="efw-lights">
            <div class="efw-light-beam"></div>
            <div class="efw-light-beam"></div>
            <div class="efw-light-beam"></div>
        </div>

        <!-- Spinner UI -->
        <div class="efw-spinner-wrapper">
            <div class="efw-selector"></div>
            <div class="efw-track" id="efwTrack"></div>
        </div>

        <!-- Status / Controls -->
        <div style="position: absolute; bottom: 15%; text-align: center; z-index: 2020;">
             <h2 style="color: #ffd700; font-size: 2em; margin-bottom: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">
                🎰 Signing ${count}x Player${count > 1 ? 's' : ''}...
            </h2>
            <div id="efwStatus" style="font-size: 1.2em; color: #fff; background: rgba(0,0,0,0.5); padding: 10px 20px; border-radius: 20px; cursor: pointer;">
                👆 Tap screen to stop
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // 3. Initialize Track
    const track = document.getElementById('efwTrack');
    efwState.trackElement = track;

    const BALL_SIZE = 130;
    const GAP = 20;
    const UNIT = BALL_SIZE + GAP;

    // Fill track with enough balls to cover screen + buffer
    const ballsNeeded = Math.ceil(window.innerWidth / UNIT) + 5;
    for (let i = 0; i < ballsNeeded; i++) addBall(track);

    // 4. Start Physics Loop
    function loop() {
        if (!efwState.isSpinning) return;

        // Move Left
        efwState.offset -= efwState.speed;

        // Infinite Scroll Leapfrog logic
        if (efwState.offset <= -UNIT) {
            efwState.offset += UNIT;
            const first = track.firstElementChild;
            track.appendChild(first); // Move first ball to end of line

            // RECYCLE LOGIC: PES Mobile Colorful Deceleration
            if (efwState.isDecelerating && efwState.targetRarity && efwState.speed < 12) {
                // Rigging the spin ONLY when very close to stopping to avoid uniform color trail
                // We'll give it a 30% chance to be the target rarity when slow, otherwise random colorful
                const r = Math.random();
                if (r > 0.7) {
                    first.dataset.rarity = efwState.targetRarity;
                } else {
                    // Still colorful during deceleration
                    const r2 = Math.random();
                    let filler = 'Silver';
                    if (r2 > 0.95) filler = 'Iconic';
                    else if (r2 > 0.85) filler = 'Black';
                    else if (r2 > 0.55) filler = 'Gold';
                    else if (r2 > 0.25) filler = 'Silver';
                    else filler = 'Bronze';
                    first.dataset.rarity = filler;
                }
            } else {
                // Regular random filler during high speed - PES mobile colorful style!
                const r = Math.random();
                let filler = 'Silver';
                if (r > 0.97) filler = 'Iconic';
                else if (r > 0.93) filler = 'Legend';
                else if (r > 0.85) filler = 'Black';
                else if (r > 0.55) filler = 'Gold';  // 30% Gold for more color
                else if (r > 0.30) filler = 'Silver'; // 25% Silver
                else if (r > 0.10) filler = 'Bronze'; // 20% Bronze
                else filler = 'White';  // Only 10% White
                first.dataset.rarity = filler;
            }
        }

        track.style.transform = `translateX(${efwState.offset}px)`;

        // DECELERATION PHYSICS
        if (efwState.isDecelerating) {
            efwState.speed *= 0.99; // Low friction for long glide

            // STOP CONDITION
            if (efwState.speed < 0.2) {
                efwState.speed = 0;
                efwState.isSpinning = false; // Stop loop
                snapToGrid();
                return; // End loop
            }
        }

        efwState.animationId = requestAnimationFrame(loop);
    }

    // 5. Handle Tap
    overlay.onclick = () => {
        if (efwState.isDecelerating) return; // Already stopping
        efwState.isDecelerating = true;
        document.getElementById('efwStatus').innerHTML = "✨ Decelerating...";
        document.getElementById('efwStatus').style.cursor = 'default';
        overlay.onclick = null; // Prevent double tap
    };

    // Start Loop
    loop();
}

// SNAP AND ALIGN LOGIC - ROBUST
function snapToGrid() {
    const track = efwState.trackElement;
    const centerX = window.innerWidth / 2;

    // Find closest ball geometrically
    const balls = Array.from(track.children);
    let closestBall = null;
    let minDiff = Infinity;

    balls.forEach(ball => {
        const rect = ball.getBoundingClientRect();
        const ballCenter = rect.left + (rect.width / 2);
        const diff = Math.abs(centerX - ballCenter);

        if (diff < minDiff) {
            minDiff = diff;
            closestBall = ball;
        }
    });

    if (closestBall) {
        // Magician's Choice
        if (closestBall.dataset.rarity !== efwState.targetRarity) {
            closestBall.dataset.rarity = efwState.targetRarity;
        }

        const rect = closestBall.getBoundingClientRect();
        const diff = (window.innerWidth / 2) - (rect.left + rect.width / 2);

        track.style.transition = 'transform 0.5s ease-out';
        track.style.transform = `translateX(${efwState.offset + diff}px)`;

        // Highlight Effect
        closestBall.style.transform = 'scale(1.1)';
        closestBall.style.transition = 'transform 0.3s ease';
        closestBall.style.boxShadow = `0 0 50px ${RARITY_STYLES[efwState.targetRarity]?.color || '#fff'}`;

        setTimeout(() => {
            startCinematic(efwState.targetRarity);
        }, 1000);
    } else {
        // Failsafe
        console.warn("Snap failed");
        startCinematic(efwState.targetRarity);
    }
}

// CINEMATIC SCREEN
function startCinematic(rarity) {
    const cinematic = document.createElement('div');
    cinematic.className = 'efw-cinematic-screen active';
    cinematic.id = 'efwCinematic';

    const color = RARITY_STYLES[rarity]?.color || '#fff';
    const gifPath = `/assets/gifs/${rarity.toLowerCase()}.gif`;

    cinematic.innerHTML = `
        <div class="efw-cinematic-content">
            <h1 style="font-size: 50px; margin: 0 0 20px 0; text-shadow: 0 0 20px ${color};">EFW</h1>
            <p style="font-size: 20px; color: ${color}; font-weight: bold; text-transform: uppercase; margin-bottom: 30px;">
                OFFICIAL SIGNING
            </p>
            <img src="${gifPath}" 
                 style="max-width: 90%; max-height: 50vh; border-radius: 10px; box-shadow: 0 0 30px ${color}80;"
                 onerror="this.style.display='none'">
            <div class="efw-skip-hint">TAP SCREEN TO SKIP</div>
        </div>
    `;

    document.body.appendChild(cinematic);

    cinematic.onclick = () => {
        cinematic.classList.remove('active');
        setTimeout(() => cinematic.remove(), 300);
        showReveal();
    };

    setTimeout(() => {
        if (document.body.contains(cinematic)) cinematic.click();
    }, 6000);
}

// FINAL REVEAL
function showReveal() {
    // 1. Remove the spinner background overlay
    const overlay = document.getElementById('efwOverlay');
    if (overlay) overlay.remove();

    const rarityOrder = ['Iconic', 'Legend', 'Black', 'Gold', 'Silver', 'Bronze', 'White'];
    const sortedPlayers = [...efwState.wonPlayers].sort((a, b) => {
        const aIdx = rarityOrder.indexOf(a.rarity);
        const bIdx = rarityOrder.indexOf(b.rarity);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return (b.overall || 0) - (a.overall || 0);
    });

    const cardsHtml = sortedPlayers.map((player, index) => {
        // Try multiple paths: ID.png, name.jpg (lowercase), name.png
        const nameSlug = player.name.toLowerCase().replace(/\s+/g, '_');
        return `
            <div class="player-detail-card" data-rarity="${player.rarity}" 
                 style="width: 140px; height: 200px; animation: cardReveal 0.5s ease-out ${index * 0.1}s both; cursor: pointer; margin: 10px;">
                <div class="player-card-rating" style="font-size: 1.8em; top: 30px;">${player.overall || 0}</div>
                <div class="player-card-position" style="font-size: 0.85em;">${player.position}</div>
                <div class="player-card-rarity" style="font-size: 1.2em; top: 70px;">${RARITY_EMOJIS[player.rarity] || '⚽'}</div>
                <img src="/assets/playerimages/${player.id}.png" 
                     class="player-detail-image" 
                     onerror="this.onerror=null; this.src='/assets/faces/${nameSlug}.jpg'; this.onerror=function(){this.src='/assets/playerimages/default_player.png'}">
                <div class="player-card-rarity-bottom" style="font-size: 0.7em; padding: 4px;">${truncateName(player.name)}</div>
                ${player.isDuplicate ? '<div style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(245, 158, 11, 0.9); color: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.6em; font-weight: bold; z-index: 20;">DUPLICATE</div>' : ''}
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

// CLEANUP
function cleanupAnimation() {
    efwState.isSpinning = false;
    if (efwState.animationId) cancelAnimationFrame(efwState.animationId);

    const overlays = document.querySelectorAll('.efw-background, .efw-cinematic-screen, .efw-reveal-screen, #spinOverlay');
    overlays.forEach(el => el.remove());
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
