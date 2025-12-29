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

// Get ball style for each rarity - returns CSS gradient and border color
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
    const radius = 120; // Distance from center

    return `
        <div class="spin-ball" data-rarity="${rarity}" style="
            position: absolute;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: ${style.background};
            border: ${style.border};
            box-shadow: ${style.glow};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 0.8em;
            color: ${rarity === 'White' || rarity === 'Silver' ? '#333' : '#fff'};
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            transform: rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg);
        ">EFW</div>
    `;
}

// Global variable to track if animation should skip
let skipAnimation = false;

// Show pack opening result with full spinning animation
async function showPackResultWithAnimation(players, packType, count) {
    const modal = document.getElementById('packResultModal');
    const content = document.getElementById('packResultContent');
    skipAnimation = false;

    // Show modal first
    modal.style.display = 'flex';

    // Get the highest rarity from pulled players
    const rarities = ['Iconic', 'Legend', 'Black', 'Gold', 'Silver', 'Bronze', 'White'];
    const highestRarity = rarities.find(r => players.some(p => p.rarity === r)) || 'White';
    const highestIndex = rarities.indexOf(highestRarity);

    // Step 1: Show spinning wheel
    const allRarities = ['Iconic', 'Legend', 'Black', 'Gold', 'Silver', 'Bronze', 'White'];
    const ballsHtml = allRarities.map((r, i) => createSpinningBall(r, i, allRarities.length)).join('');

    content.innerHTML = `
        <div style="width: 100%; text-align: center; padding: 20px;">
            <h2 style="color: var(--secondary); font-size: 2em; margin-bottom: 30px;">
                🎰 ${count > 1 ? count + 'x ' : ''}Signing...
            </h2>
            <div class="spinner-container" style="
                position: relative;
                width: 300px;
                height: 300px;
                margin: 0 auto;
            ">
                <div class="spinner-wheel" style="
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    animation: spinWheel 0.5s linear infinite;
                ">
                    ${ballsHtml}
                </div>
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: radial-gradient(circle at 30% 30%, #0014DC, #000033);
                    border: 4px solid var(--secondary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 1.2em;
                    color: var(--secondary);
                    z-index: 10;
                ">EFW</div>
                <div style="
                    position: absolute;
                    top: -15px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 15px solid transparent;
                    border-right: 15px solid transparent;
                    border-top: 25px solid var(--secondary);
                    z-index: 20;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
                "></div>
            </div>
            <div style="margin-top: 20px; font-size: 1.2em; color: #fff;">
                ⏳ Determining your players...
            </div>
        </div>
    `;

    // Spin for 2 seconds (simulating API wait)
    await delay(2000);

    // Step 2: Decelerate and stop on target rarity
    const targetAngle = (360 / allRarities.length) * highestIndex + 1080; // 3 full rotations + target
    const wheel = content.querySelector('.spinner-wheel');
    if (wheel) {
        wheel.style.animation = 'none';
        wheel.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
        wheel.style.transform = `rotate(${targetAngle}deg)`;
    }

    // Update text
    content.querySelector('h2').innerHTML = `🎰 ${count > 1 ? count + 'x ' : ''}Signing...`;
    content.querySelector('div[style*="Determining"]').innerHTML = `✨ Stopping on ${highestRarity}...`;

    await delay(3500);

    // Step 3: Show the highest rarity ball highlighted
    const style = getBallStyle(highestRarity);
    content.innerHTML = `
        <div style="width: 100%; text-align: center; padding: 20px;">
            <h2 style="color: var(--secondary); font-size: 2em; margin-bottom: 30px;">
                ${RARITY_EMOJIS[highestRarity]} ${highestRarity}!
            </h2>
            <div style="
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: ${style.background};
                border: ${style.border};
                box-shadow: ${style.glow}, 0 0 60px ${style.glow.split(')')[0]}0.5);
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 900;
                font-size: 1.5em;
                color: ${highestRarity === 'White' || highestRarity === 'Silver' ? '#333' : '#fff'};
                animation: ballPulse 0.5s ease-in-out infinite alternate;
            ">EFW</div>
            <div style="margin-top: 30px; font-size: 1em; color: #aaa;">
                Tap anywhere to continue...
            </div>
        </div>
    `;

    // Allow skip or auto-continue
    await waitForSkipOrDelay(1500);

    // Step 4: Show rarity GIF animation (skippable)
    content.innerHTML = `
        <div id="gifContainer" style="width: 100%; text-align: center; cursor: pointer;" onclick="skipAnimation = true;">
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
            <div style="margin-top: 15px; font-size: 0.9em; color: #aaa;">
                👆 Tap to skip
            </div>
        </div>
    `;

    // Wait for GIF (skippable) - reduced to 5 seconds or skip
    await waitForSkipOrDelay(5000);

    // Step 5: Reveal all cards
    if (count === 1) {
        showSingleCard(content, players[0]);
    } else {
        showMultipleCards(content, players);
    }
}

// Helper: Wait for skip or delay
async function waitForSkipOrDelay(ms) {
    const checkInterval = 100;
    let elapsed = 0;
    while (elapsed < ms && !skipAnimation) {
        await delay(checkInterval);
        elapsed += checkInterval;
    }
    skipAnimation = false;
}

// Show single card (large) - using player-detail-card design
function showSingleCard(content, player) {
    const playerImagePath = `/assets/playerimages/${player.id}.png`;

    content.innerHTML = `
// Single card - update overall rating access
        <div style="width: 100%; text-align: center;">
            <h2 style="color: var(--secondary); font-size: 2em; margin-bottom: 30px;">
                🎉 Signings
            </h2>
            <div style="display: flex; justify-content: center;">
                <div class="player-detail-card" data-rarity="${player.rarity}" 
                     style="width: 200px; height: 280px; animation: cardReveal 0.5s ease-out; cursor: pointer;">
                    <div class="player-card-rating">${player.overall || player.overall_rating || 0}</div>
                    <div class="player-card-position">${player.position}</div>
                    <div class="player-card-rarity">${RARITY_EMOJIS[player.rarity] || '⚽'}</div>
                    <img src="${playerImagePath}" class="player-detail-image" 
                         onerror="this.src='/assets/playerimages/default_player.png'">
                    <div class="player-card-rarity-bottom">${player.name}</div>
                </div>
            </div>
            <div style="margin-top: 20px;">
                ${player.isDuplicate ?
            '<div style="color: #f59e0b; font-size: 1.2em;">💰 Duplicate - Converted to GP</div>' :
            '<div style="color: #10b981; font-size: 1.2em;">✨ NEW!</div>'
        }
            </div>
        </div>

// Multiple cards sorting
    const sortedPlayers = [...players].sort((a, b) => {
        const aIndex = rarityOrder.indexOf(a.rarity);
        const bIndex = rarityOrder.indexOf(b.rarity);
        if (aIndex !== bIndex) return aIndex - bIndex;
        // If same rarity, sort by overall rating
        const ratingA = a.overall || a.overall_rating || 0;
        const ratingB = b.overall || b.overall_rating || 0;
        return ratingB - ratingA;
    });

// Multiple cards rendering
        return `
        < div class="player-detail-card" data - rarity="${player.rarity}"
    style = "width: 140px; height: 200px; animation: cardReveal 0.5s ease-out ${animationDelay}s both; cursor: pointer; flex-shrink: 0;" >
                <div class="player-card-rating" style="font-size: 1.8em; top: 30px;">${player.overall || player.overall_rating || 0}</div>
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

    content.innerHTML = `
        < div style = "width: 100%; text-align: center;" >
            <h2 style="color: var(--secondary); font-size: 2em; margin-bottom: 25px;">
                🎉 Signings
            </h2>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; justify-items: center; max-width: 780px; margin: 0 auto;">
                ${cardsHtml}
            </div>
        </div >
        `;
}

// Helper function to truncate names
function truncateName(name) {
    if (!name) return '';
    return name.length > 12 ? name.slice(0, 11) + '…' : name;
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
        < div style = "background: rgba(0,0,51,0.6); padding: 20px; border-radius: 10px; margin-bottom: 20px;" >
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
        </div >

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
        < div class="rarity-item" >
                    <div class="rarity-name">${emoji} ${rarity}</div>
                    <div class="rarity-chance">${percentage}%</div>
                </div >
        `;
        }
    }

    container.innerHTML = `
        < h3 > ${ PACK_EMOJIS[packKey] } ${ pack.name }</h3 >
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
        card.className = `contract - player - card ${ isOwned ? 'owned' : '' } `;
        card.dataset.rarity = player.rarity;
        card.onclick = () => showPlayerDetails(player);
        card.style.cursor = 'pointer';

        // Get player image from local assets using player ID
        const playerImagePng = `/ assets / faces / ${ player.id }.png`;
        const playerImageJpg = `/ assets / faces / ${ player.id }.jpg`;

        card.innerHTML = `
        < div class="player-image-container" >
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

    // Get player full image path using player ID
    const playerImagePath = `/ assets / playerimages / ${ player.id }.png`;

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
        < div class="player-detail-container" >
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
        </div >
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

// ==========================================
// MOCK TEST FUNCTION - for testing spin animation
// Call from browser console: testSpinAnimation('Iconic', 10)
// ==========================================
async function testSpinAnimation(highestRarity = 'Iconic', count = 10) {
    // Create mock players based on the highest rarity
    const rarities = ['Iconic', 'Legend', 'Black', 'Gold', 'Silver', 'Bronze', 'White'];
    const rarityIndex = rarities.indexOf(highestRarity);

    const mockPlayers = [];

    // Add one player of the highest rarity
    mockPlayers.push({
        id: 'mock-1',
        name: 'Test Player',
        rarity: highestRarity,
        overall: 99,
        position: 'CF',
        stats: { attacking: 99, dribbling: 99, passing: 99, defending: 50, physicality: 80, goalkeeping: 10 }
    });

    // Fill rest with lower rarities
    for (let i = 1; i < count; i++) {
        const lowerRarity = rarities[Math.min(rarityIndex + Math.floor(Math.random() * 3) + 1, rarities.length - 1)];
        mockPlayers.push({
            id: `mock - ${ i + 1 } `,
            name: `Mock Player ${ i + 1 } `,
            rarity: lowerRarity,
            overall: 60 + Math.floor(Math.random() * 30),
            position: ['CF', 'LWF', 'RWF', 'AMF', 'CMF', 'DMF', 'CB', 'LB', 'RB', 'GK'][Math.floor(Math.random() * 10)],
            stats: { attacking: 70, dribbling: 70, passing: 70, defending: 70, physicality: 70, goalkeeping: 70 }
        });
    }

    console.log('Testing spin animation with:', { highestRarity, count, players: mockPlayers });
    await showPackResultWithAnimation(mockPlayers, 'test', count);
}

// Expose test function globally
window.testSpinAnimation = testSpinAnimation;
