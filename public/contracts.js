// Global state
let userData = null;
let allPlayers = [];
let ownedPlayerIds = [];
let currentPack = null;
let filteredPlayers = [];

const PACK_EMOJIS = {
    'iconic': '💎',
    'legend': '🏆',
    'standard': '📦'
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

// Define packs (Iconic, Legend, Standard only)
const PACKS_CONFIG = {
    'iconic': {
        name: 'Iconic Pack',
        description: 'Premium pack featuring Iconic stars plus Black-to-White support cards.',
        rarity_chances: {
            'Iconic': 0.12,
            'Black': 0.15,
            'Gold': 0.18,
            'Silver': 0.20,
            'Bronze': 0.15,
            'White': 0.20
        }
    },
    'legend': {
        name: 'Legend Pack',
        description: 'Great chance for Legend and Black players',
        rarity_chances: {
            'Legend': 0.25,
            'Black': 0.40,
            'Gold': 0.25,
            'Silver': 0.08,
            'Bronze': 0.02
        }
    },
    'standard': {
        name: 'Standard Pack',
        description: 'Standard pack with all rarities',
        rarity_chances: {
            'Black': 0.10,
            'Gold': 0.30,
            'Silver': 0.35,
            'Bronze': 0.20,
            'White': 0.05
        }
    }
};

// Initialize
async function init() {
    await loadUserData();
    await loadAllPlayers();
    await loadPacks(); // Load API pack data
    document.getElementById('loading').style.display = 'none';
}

// Load user data
async function loadUserData() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        userData = data;

        // Update UI
        document.getElementById('username').textContent = data.discord.username;
        document.getElementById('userAvatar').src = `https://cdn.discordapp.com/avatars/${data.discord.id}/${data.discord.avatar}.png`;

        // Get owned player IDs
        if (data.gameData && data.gameData.players) {
            ownedPlayerIds = data.gameData.players.map(p => p.id);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load all players
async function loadAllPlayers() {
    try {
        const response = await fetch('/api/all-players');
        const data = await response.json();
        allPlayers = data.players || [];
    } catch (error) {
        console.error('Error loading all players:', error);
    }
}

// Load pack data
async function loadPacks() {
    try {
        console.log('Loading packs from API...');
        const response = await fetch('/api/packs');
        const data = await response.json();
        console.log('API response:', data);

        window.packsData = data.packs || {};
        console.log('Loaded packs:', Object.keys(window.packsData));

        // Verify Iconic pack data
        if (window.packsData.iconic) {
            console.log('Iconic pack data:', window.packsData.iconic);
        } else {
            console.error('Iconic pack not found in API response');
        }
    } catch (error) {
        console.error('Error loading packs:', error);
        // Use fallback data if API fails
        window.packsData = {
            'iconic': {
                name: 'Iconic Moment Pack',
                cost: 500,
                currency: 'eCoins',
                description: 'Limited run pack featuring Iconic stars plus Black-to-White support cards.',
                rarity_chances: {
                    'Iconic': 0.12,
                    'Black': 0.15,
                    'Gold': 0.18,
                    'Silver': 0.20,
                    'Bronze': 0.15,
                    'White': 0.20
                }
            },
            'legend': {
                name: 'Legend Box Draw',
                cost: 25000,
                currency: 'GP',
                description: 'A box draw with a strong emphasis on Legend players.',
                rarity_chances: {
                    'Legend': 0.05,
                    'Black': 0.15,
                    'Gold': 0.25,
                    'Silver': 0.35,
                    'Bronze': 0.20,
                    'White': 0.0
                }
            },
            'standard': {
                name: 'Standard Pack',
                cost: 10000,
                currency: 'GP',
                description: 'A standard pack containing players from Black to White rarity.',
                rarity_chances: {
                    'Black': 0.05,
                    'Gold': 0.20,
                    'Silver': 0.40,
                    'Bronze': 0.25,
                    'White': 0.10
                }
            }
        };
        console.log('Using fallback pack data');
    }
}

// Show pack details (called from HTML onclick)
function showPackDetails(packKey) {
    console.log('showPackDetails called with:', packKey);
    console.log('Available packs in API:', window.packsData ? Object.keys(window.packsData) : 'API data not loaded');
    console.log('Pack config available:', Object.keys(PACKS_CONFIG));

    if (!window.packsData || !window.packsData[packKey]) {
        console.error('Pack not found in API data:', packKey);
        console.error('Available API packs:', window.packsData ? Object.keys(window.packsData) : 'No API data');
        return;
    }

    if (!PACKS_CONFIG[packKey]) {
        console.error('Pack config not found:', packKey);
        return;
    }

    currentPack = packKey;
    const pack = window.packsData[packKey];

    // Show pack details
    renderPackDetails(packKey);

    // Show and update buy controls
    const buyControls = document.getElementById('buyControls');
    buyControls.style.display = 'block';
    document.getElementById('selectedPackName').textContent = pack.name;

    const currencySymbol = pack.currency === 'eCoins' ? '🪙' : '💰';
    document.getElementById('selectedPackCost').textContent = `Cost: ${currencySymbol} ${pack.cost.toLocaleString()} ${pack.currency}`;

    // Update button labels with costs
    document.getElementById('buyPackBtn').textContent = `🎁 Open 1 (${currencySymbol}${pack.cost.toLocaleString()})`;
    document.getElementById('buyPack3Btn').textContent = `🎁 Open 3 (${currencySymbol}${(pack.cost * 3).toLocaleString()})`;
    document.getElementById('buyPack10Btn').textContent = `🎁 Open 10 (${currencySymbol}${(pack.cost * 10).toLocaleString()})`;

    // Filter and render players
    filterAndRenderPlayers();

    document.getElementById('packDetailsContainer').style.display = 'block';

    // Scroll to details
    document.getElementById('packDetailsContainer').scrollIntoView({ behavior: 'smooth' });
}

// Buy pack function with animation sequencing
async function buyPack(count) {
    if (!currentPack) {
        alert('Please select a pack first');
        return;
    }

    const pack = window.packsData[currentPack];
    if (!pack) return;

    const totalCost = pack.cost * count;
    const userBalance = pack.currency === 'eCoins' ? (userData.gameData?.eCoins || 0) : (userData.gameData?.gp || 0);

    if (userBalance < totalCost) {
        alert(`Not enough ${pack.currency}! You need ${totalCost.toLocaleString()} but only have ${userBalance.toLocaleString()}`);
        return;
    }

    try {
        const response = await fetch('/api/contract/pull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packType: currentPack, count })
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.error || 'Failed to open pack');
            return;
        }

        // Update local balances
        userData.gameData.gp = data.newBalance.gp;
        userData.gameData.eCoins = data.newBalance.eCoins;
        document.getElementById('userGP').textContent = data.newBalance.gp.toLocaleString();
        document.getElementById('userECoins').textContent = data.newBalance.eCoins;

        // Update owned player IDs
        data.players.forEach(p => {
            if (!ownedPlayerIds.includes(p.id)) {
                ownedPlayerIds.push(p.id);
            }
        });

        // Show results with animation sequence
        await showPackResultWithAnimation(data.players, currentPack, count);

        // Refresh player grid
        filterAndRenderPlayers();

    } catch (error) {
        console.error('Pack pull error:', error);
        alert('Failed to open pack. Please try again.');
    }
}

// Show pack opening result with animation
async function showPackResultWithAnimation(players, packType, count) {
    const modal = document.getElementById('packResultModal');
    const content = document.getElementById('packResultContent');
    
    // Show modal first
    modal.style.display = 'flex';
    
    // Step 1: Show opening text
    content.innerHTML = `
        <div style="width: 100%; text-align: center; padding: 40px;">
            <h2 style="color: var(--secondary); font-size: 2em; margin-bottom: 20px;">
                🎁 Opening ${count} Pack${count > 1 ? 's' : ''}...
            </h2>
            <div style="font-size: 1.2em; color: #fff;">Preparing your cards...</div>
        </div>
    `;
    
    await delay(1000);
    
    // Step 2: Show rarity GIF animation (10 seconds)
    // Get the highest rarity from pulled players
    const rarities = ['Iconic', 'Legend', 'Black', 'Gold', 'Silver', 'Bronze', 'White'];
    const highestRarity = rarities.find(r => players.some(p => p.rarity === r)) || 'White';
    
    content.innerHTML = `
        <div style="width: 100%; text-align: center;">
            <h2 style="color: var(--secondary); font-size: 2em; margin-bottom: 20px;">
                ${RARITY_EMOJIS[highestRarity]} ${highestRarity} Reveal!
            </h2>
            <img src="/assets/gifs/${highestRarity.toLowerCase()}.gif" 
                 alt="${highestRarity} Animation" 
                 style="max-width: 500px; width: 100%; border-radius: 15px; box-shadow: 0 0 30px rgba(255,237,0,0.5);"
                 onerror="this.style.display='none'" />
            <div style="margin-top: 20px; font-size: 1.2em; color: #fff;">
                ✨ Revealing your players...
            </div>
        </div>
    `;
    
    await delay(10000);
    
    // Step 3: Reveal all cards in a grid
    if (count === 1) {
        // Single card - large display
        showSingleCard(content, players[0]);
    } else {
        // Multiple cards - grid display
        showMultipleCards(content, players);
    }
}

// Show single card (large)
function showSingleCard(content, player) {
    content.innerHTML = `
        <div style="width: 100%; text-align: center;">
            <h2 style="color: var(--secondary); font-size: 2em; margin-bottom: 20px;">
                🎉 You got!
            </h2>
            <div class="contract-player-card" data-rarity="${player.rarity}" 
                 style="width: 300px; margin: 0 auto; padding: 20px; animation: cardReveal 0.5s ease-out;">
                <div class="player-image-container" style="height: 200px;">
                    <div class="player-overall" style="font-size: 1.5em;">${player.overall}</div>
                    <div class="player-position" style="font-size: 1.2em;">${player.position}</div>
                </div>
                <div class="player-rarity" style="font-size: 2em; margin: 15px 0;">
                    ${RARITY_EMOJIS[player.rarity] || '⚽'} ${player.rarity}
                </div>
                <div class="player-name" style="font-size: 1.5em; font-weight: bold;" title="${player.name}">
                    ${player.name}
                </div>
                ${player.isDuplicate ? 
                    '<div style="color: #f59e0b; font-size: 1em; margin-top: 10px;">💰 Duplicate - Converted to GP</div>' : 
                    '<div style="color: #10b981; font-size: 1em; margin-top: 10px;">✨ NEW!</div>'
                }
            </div>
        </div>
    `;
}

// Show multiple cards in grid
function showMultipleCards(content, players) {
    const gridColumns = players.length <= 3 ? players.length : players.length <= 6 ? 3 : players.length <= 9 ? 3 : 5;
    
    content.innerHTML = `
        <div style="width: 100%; text-align: center;">
            <h2 style="color: var(--secondary); font-size: 2em; margin-bottom: 20px;">
                🎉 Your ${players.length} Cards!
            </h2>
            <div style="display: grid; grid-template-columns: repeat(${gridColumns}, 1fr); gap: 15px; justify-content: center;">
                ${players.map((player, index) => `
                    <div class="contract-player-card" data-rarity="${player.rarity}" 
                         style="width: 140px; animation: cardReveal 0.5s ease-out ${index * 0.1}s both;">
                        <div class="player-image-container" style="height: 100px;">
                            <div class="player-overall">${player.overall}</div>
                            <div class="player-position">${player.position}</div>
                        </div>
                        <div class="player-rarity">${RARITY_EMOJIS[player.rarity] || '⚽'}</div>
                        <div class="player-name" style="font-size: 0.9em;" title="${player.name}">
                            ${player.name}
                        </div>
                        ${player.isDuplicate ? 
                            '<div style="color: #f59e0b; font-size: 0.75em;">💰 +GP</div>' : 
                            '<div style="color: #10b981; font-size: 0.75em;">✨ NEW</div>'
                        }
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Utility function for delays
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Legacy function kept for compatibility
function showPackResult(players) {
    showPackResultWithAnimation(players, currentPack, players.length);
}

// Close pack result modal
function closePackResult() {
    document.getElementById('packResultModal').style.display = 'none';
}

function showPackInfoModal() {
    if (!currentPack) {
        alert('Please select a pack first!');
        return;
    }

    const pack = window.packsData[currentPack];
    const packConfig = PACKS_CONFIG[currentPack];

    const modal = document.getElementById('packInfoModal');
    const content = document.getElementById('packInfoContent');

    // Calculate total players per rarity
    const rarityCount = {};
    Object.keys(packConfig.rarity_chances).forEach(rarity => {
        if (packConfig.rarity_chances[rarity] > 0) {
            rarityCount[rarity] = allPlayers.filter(p => p.rarity === rarity).length;
        }
    });

    const currencySymbol = pack.currency === 'eCoins' ? '🪙' : '💰';

    content.innerHTML = `
        <div style="background: rgba(0,0,51,0.6); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: var(--secondary); margin-bottom: 10px;">${PACK_EMOJIS[currentPack]} ${pack.name}</h3>
            <p style="color: #ccc; margin-bottom: 15px;">${pack.description}</p>
            <div style="display: flex; justify-content: space-around; margin-top: 15px;">
                <div>
                    <div style="color: #aaa; font-size: 0.9em;">Cost per Pack</div>
                    <div style="color: var(--secondary); font-size: 1.5em; font-weight: bold;">
                        ${currencySymbol} ${pack.cost.toLocaleString()}
                    </div>
                </div>
                <div>
                    <div style="color: #aaa; font-size: 0.9em;">Currency</div>
                    <div style="color: #fff; font-size: 1.2em; font-weight: bold;">${pack.currency}</div>
                </div>
            </div>
        </div>

        <h3 style="color: var(--secondary); margin: 20px 0 15px;">📊 Drop Rates</h3>
        <div style="background: rgba(0,0,51,0.4); border-radius: 10px; padding: 15px;">
            ${Object.entries(packConfig.rarity_chances)
                .filter(([_, chance]) => chance > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([rarity, chance]) => {
                    const percentage = (chance * 100).toFixed(2);
                    const count = rarityCount[rarity] || 0;
                    const emoji = RARITY_EMOJIS[rarity] || '⚽';
                    return `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; 
                                    border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 1.5em;">${emoji}</span>
                                <span style="color: #fff; font-weight: bold;">${rarity}</span>
                                <span style="color: #aaa; font-size: 0.9em;">(${count} players)</span>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: var(--secondary); font-size: 1.2em; font-weight: bold;">${percentage}%</div>
                                <div style="color: #aaa; font-size: 0.8em;">${(1 / chance).toFixed(1)} pulls avg</div>
                            </div>
                        </div>
                    `;
                }).join('')}
        </div>

        <div style="margin-top: 20px; padding: 15px; background: rgba(0,20,220,0.2); border-radius: 10px; border: 1px solid rgba(255,237,0,0.3);">
            <h4 style="color: var(--secondary); margin-bottom: 10px;">💡 Tips</h4>
            <ul style="color: #ccc; line-height: 1.8; padding-left: 20px;">
                <li>Multi-pull (10x) gives you more chances for high rarities</li>
                <li>Duplicate players are automatically converted to GP</li>
                <li>Check your collection to see which players you still need</li>
                <li>Higher rarity = better stats and higher max level</li>
            </ul>
        </div>

        <button class="btn btn-primary" onclick="closePackInfoModal()" style="width: 100%; margin-top: 20px; padding: 12px;">
            Close
        </button>
    `;

    modal.style.display = 'flex';
}

function closePackInfoModal() {
    document.getElementById('packInfoModal').style.display = 'none';
}

window.buyPack = buyPack;
window.closePackResult = closePackResult;
window.showPackInfoModal = showPackInfoModal;
window.closePackInfoModal = closePackInfoModal;

// Make function globally accessible
window.showPackDetails = showPackDetails;

// Render pack details
function renderPackDetails(packKey) {
    const pack = window.packsData[packKey];
    if (!pack) {
        console.error('Pack not found:', packKey);
        return;
    }

    const container = document.getElementById('packDetails');

    let rarityHTML = '';
    for (const [rarity, chance] of Object.entries(pack.rarity_chances)) {
        if (chance > 0) {
            const emoji = RARITY_EMOJIS[rarity] || '';
            const percentage = (chance * 100).toFixed(1);
            rarityHTML += `
                <div class="rarity-item">
                    <div class="rarity-name">${emoji} ${rarity}</div>
                    <div class="rarity-chance">${percentage}%</div>
                </div>
            `;
        }
    }

    container.innerHTML = `
        <h3>${PACK_EMOJIS[packKey]} ${pack.name}</h3>
        <p style="color: #ccc; margin-bottom: 15px;">${pack.description}</p>
        <h4 style="color: #fff; margin-top: 20px; margin-bottom: 10px;">Drop Rates:</h4>
        <div class="rarity-chances">
            ${rarityHTML}
        </div>
    `;
}

// Filter and render players
function filterAndRenderPlayers() {
    if (!currentPack) return;

    const pack = window.packsData[currentPack];
    const packConfig = PACKS_CONFIG[currentPack];

    if (!pack || !packConfig) {
        console.error('Pack data not found for:', currentPack);
        return;
    }

    const searchTerm = document.getElementById('playerSearch').value.toLowerCase();
    const rarityFilter = document.getElementById('rarityFilter').value;
    const ownedFilter = document.getElementById('ownedFilter').value;

    // Get available rarities in this pack (from config since API doesn't have includeRarities)
    const availableRarities = Object.keys(packConfig.rarity_chances).filter(r => packConfig.rarity_chances[r] > 0);

    // Filter players
    filteredPlayers = allPlayers.filter(player => {
        // Must be in pack's available rarities
        if (!availableRarities.includes(player.rarity)) return false;

        // Search filter
        if (searchTerm && !player.name.toLowerCase().includes(searchTerm)) return false;

        // Rarity filter
        if (rarityFilter && player.rarity !== rarityFilter) return false;

        // Owned filter
        const isOwned = ownedPlayerIds.includes(player.id);
        if (ownedFilter === 'owned' && !isOwned) return false;
        if (ownedFilter === 'not-owned' && isOwned) return false;

        return true;
    });

    // Update stats
    updateStats();

    // Render players
    renderPlayers();
}

// Update statistics
function updateStats() {
    const pack = window.packsData[currentPack];
    const packConfig = PACKS_CONFIG[currentPack];

    if (!pack || !packConfig) return;

    const availableRarities = Object.keys(packConfig.rarity_chances).filter(r => packConfig.rarity_chances[r] > 0);

    const totalInPack = allPlayers.filter(p => availableRarities.includes(p.rarity)).length;
    const ownedInPack = allPlayers.filter(p => availableRarities.includes(p.rarity) && ownedPlayerIds.includes(p.id)).length;
    const notOwnedInPack = totalInPack - ownedInPack;
    const collectionPercent = totalInPack > 0 ? ((ownedInPack / totalInPack) * 100).toFixed(1) : 0;

    document.getElementById('playerCount').textContent = filteredPlayers.length;
    document.getElementById('totalPlayers').textContent = totalInPack;
    document.getElementById('ownedPlayers').textContent = ownedInPack;
    document.getElementById('notOwnedPlayers').textContent = notOwnedInPack;
    document.getElementById('collectionPercent').textContent = collectionPercent + '%';
}

// Render players
function renderPlayers() {
    const container = document.getElementById('playersGrid');
    container.innerHTML = '';

    if (filteredPlayers.length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 20px; grid-column: 1/-1; text-align: center;">No players found</p>';
        return;
    }

    filteredPlayers.forEach(player => {
        const isOwned = ownedPlayerIds.includes(player.id);
        const card = document.createElement('div');
        card.className = `contract-player-card ${isOwned ? 'owned' : ''}`;
        card.dataset.rarity = player.rarity;
        card.onclick = () => showPlayerDetails(player);
        card.style.cursor = 'pointer';

        // Sanitize player name for image
        const playerImageName = player.name.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase().replace(/_+/g, '_').replace(/_+$/g, '');
        const playerImagePng = `/assets/faces/${playerImageName}.png`;
        const playerImageJpg = `/assets/faces/${playerImageName}.jpg`;

        card.innerHTML = `
            <div class="player-image-container">
                <div class="player-overall">${player.overall}</div>
                <div class="player-position">${player.position}</div>
                <img src="${playerImagePng}" alt="${player.name}" 
                     onerror="this.onerror=null; this.src='${playerImageJpg}'; this.onerror=function(){this.src='/assets/faces/default_player.png'}">
            </div>
            <div class="player-rarity">${RARITY_EMOJIS[player.rarity] || '⚽'}</div>
            <div class="player-name" title="${player.name}">${player.name}</div>
        `;

        container.appendChild(card);
    });
}

// Show player details modal
function showPlayerDetails(player) {
    const modal = document.getElementById('playerModal');
    const content = document.getElementById('playerModalContent');

    const stats = player.stats || {};
    const isOwned = ownedPlayerIds.includes(player.id);

    // Get player full image path (240x340 images)
    const sanitizedName = player.name.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase().replace(/_+/g, '_').replace(/_+$/g, '');
    const playerImagePath = `/assets/playerimages/${sanitizedName}.png`;

    // Rarity icons
    const rarityIcons = {
        'Iconic': '💎',
        'Legend': '🌟',
        'Black': '⚫',
        'Gold': '🟡',
        'Silver': '⚪',
        'Bronze': '🟤'
    };

    content.innerHTML = `
        <div class="player-detail-container">
            <div class="player-detail-left">
                <div class="player-detail-card" data-rarity="${player.rarity}">
                    <div class="player-card-position">${player.position}</div>
                    <div class="player-card-rating">${player.overall}</div>
                    <div class="player-card-rarity">${rarityIcons[player.rarity] || '⚽'}</div>
                    <div class="player-card-rarity-bottom">${player.rarity}</div>
                    <img src="${playerImagePath}" alt="${player.name}" class="player-detail-image" 
                         onerror="this.src='/assets/playerimages/default_player.png'">
                </div>
                ${isOwned ? '<p style="color: #27ae60; font-weight: bold; text-align: center; margin-top: 15px;">✓ You own this player</p>' : '<p style="color: #999; text-align: center; margin-top: 15px;">You don\'t own this player yet</p>'}
            </div>
            <div class="player-detail-right">
                <div class="player-detail-header">
                    <div class="player-detail-info">
                        <div class="player-detail-row">
                            <span class="player-detail-label">Overall:</span>
                            <span class="player-detail-value">${player.overall}</span>
                        </div>
                        <div class="player-detail-row">
                            <span class="player-detail-label">Position:</span>
                            <span class="player-detail-value">${player.position}</span>
                        </div>
                    </div>
                    <div class="player-detail-info">
                        <div class="player-detail-row">
                            <span class="player-detail-label">Rarity:</span>
                            <span class="player-detail-value">${player.rarity}</span>
                        </div>
                        <div class="player-detail-row">
                            <span class="player-detail-label">Style:</span>
                            <span class="player-detail-value">${player.playingStyle || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <h3 class="player-detail-section-title">Stats</h3>
                <div class="player-detail-stats">
                    <div class="player-detail-stat">
                        <span class="stat-icon">⚔️</span>
                        <span class="stat-label">Attacking:</span>
                        <span class="stat-value">${stats.attacking || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">🎯</span>
                        <span class="stat-label">Dribbling:</span>
                        <span class="stat-value">${stats.dribbling || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">⚽</span>
                        <span class="stat-label">Passing:</span>
                        <span class="stat-value">${stats.passing || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">🛡️</span>
                        <span class="stat-label">Defending:</span>
                        <span class="stat-value">${stats.defending || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">💪</span>
                        <span class="stat-label">Physicality:</span>
                        <span class="stat-value">${stats.physicality || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">🧤</span>
                        <span class="stat-label">Goalkeeping:</span>
                        <span class="stat-value">${stats.goalkeeping || 0}</span>
                    </div>
                </div>
                
                ${player.skills && player.skills.length > 0 ? `
                    <h3 class="player-detail-section-title">Skills</h3>
                    <div class="player-detail-skills">${player.skills.slice(0, 5).join(', ')}</div>
                ` : ''}
            </div>
        </div>
    `;

    modal.classList.add('active');
    modal.style.display = 'flex';
}

// Close modal
function closeModal() {
    const modal = document.getElementById('playerModal');
    modal.classList.remove('active');
    modal.style.display = 'none';
}

// Make function globally accessible
window.closeModal = closeModal;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Event listeners
    document.getElementById('playerSearch').addEventListener('input', filterAndRenderPlayers);
    document.getElementById('rarityFilter').addEventListener('change', filterAndRenderPlayers);
    document.getElementById('ownedFilter').addEventListener('change', filterAndRenderPlayers);

    // Close modal on outside click
    window.onclick = function (event) {
        const modal = document.getElementById('playerModal');
        if (event.target === modal) {
            closeModal();
        }
    };

    // Initialize
    init();
});
