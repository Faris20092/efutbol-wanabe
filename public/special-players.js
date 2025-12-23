// Special Players List Page
let userData = null;
let allPlayers = [];
let packInfo = {};
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

    document.getElementById('topGP').textContent = (userData.gp || 0).toLocaleString();
    document.getElementById('topEcoins').textContent = userData.eCoins || 0;
}

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
        topPlayers.forEach(player => {
            const rarityClass = player.rarity === 'Iconic' ? 'iconic' :
                player.rarity === 'Legend' ? 'legend' : '';
            playersHtml += `
                <div class="featured-player ${rarityClass}">
                    <div class="player-rating">${player.overall || 0}</div>
                    <div class="player-position">${player.position || '-'}</div>
                    <div class="player-name-small">${truncateName(player.name)}</div>
                </div>
            `;
        });

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
        const rarityClass = player.rarity === 'Iconic' ? 'iconic' :
            player.rarity === 'Legend' ? 'legend' : '';
        const playerCard = document.createElement('div');
        playerCard.className = `modal-player-card ${rarityClass}`;
        playerCard.innerHTML = `
            <div class="modal-player-rating">${player.overall || 0}</div>
            <div class="modal-player-pos">${player.position || '-'}</div>
            <div class="modal-player-name">${truncateName(player.name)}</div>
        `;
        featuredContainer.appendChild(playerCard);
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
        const card = document.createElement('div');
        card.className = 'all-player-card';
        card.setAttribute('data-rarity', player.rarity);
        card.innerHTML = `
            <div class="all-player-rating-large">${player.overall || 0}</div>
            <div class="all-player-pos">${player.position || '-'}</div>
            <div class="all-player-name-full">${player.name || 'Unknown'}</div>
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
    let resultHtml = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:2000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;">';
    resultHtml += '<h2 style="color:#ffd700;margin-bottom:20px;">🎉 Pack Opened!</h2>';
    resultHtml += '<div style="display:flex;flex-wrap:wrap;gap:15px;justify-content:center;max-width:800px;">';

    players.forEach(player => {
        const rarityColors = {
            'Iconic': 'linear-gradient(135deg, rgba(219,10,91,0.9), rgba(139,0,139,0.95))',
            'Legend': 'linear-gradient(135deg, rgba(218,165,32,0.9), rgba(139,101,8,0.95))',
            'Black': 'linear-gradient(135deg, rgba(50,50,50,0.9), rgba(20,20,20,0.95))',
            'Gold': 'linear-gradient(135deg, rgba(180,150,50,0.8), rgba(120,100,30,0.9))',
            'Silver': 'linear-gradient(135deg, rgba(150,150,150,0.8), rgba(100,100,100,0.9))',
            'Bronze': 'linear-gradient(135deg, rgba(180,120,60,0.8), rgba(120,80,40,0.9))',
            'White': 'linear-gradient(135deg, rgba(200,200,200,0.8), rgba(150,150,150,0.9))'
        };

        resultHtml += `
            <div style="background:${rarityColors[player.rarity] || rarityColors['White']};padding:15px;border-radius:12px;text-align:center;min-width:120px;">
                <div style="font-size:2em;font-weight:bold;color:#fff;">${player.overall || 0}</div>
                <div style="font-size:0.85em;color:rgba(255,255,255,0.8);">${player.position}</div>
                <div style="font-size:0.8em;color:rgba(255,255,255,0.9);margin-top:5px;">${player.name}</div>
                ${player.isDuplicate ? '<div style="color:#f59e0b;font-size:0.75em;margin-top:5px;">DUPLICATE</div>' : ''}
            </div>
        `;
    });

    resultHtml += '</div>';
    resultHtml += '<button onclick="this.parentElement.remove()" style="margin-top:25px;padding:12px 30px;background:#3b82f6;border:none;border-radius:25px;color:#fff;font-size:1em;cursor:pointer;">Continue</button>';
    resultHtml += '</div>';

    document.body.insertAdjacentHTML('beforeend', resultHtml);
}

document.addEventListener('DOMContentLoaded', init);
