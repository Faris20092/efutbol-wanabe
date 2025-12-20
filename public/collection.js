let allPlayers = [];
let userData = null;

async function init() {
    await loadUserData();
    await loadPlayers();
    populateClubFilter();
    updateStats();
    filterPlayers();
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

function populateClubFilter() {
    const clubs = [...new Set(allPlayers.map(p => p.club).filter(c => c))].sort();
    const select = document.getElementById('clubFilter');

    clubs.forEach(club => {
        const option = document.createElement('option');
        option.value = club;
        option.textContent = club;
        select.appendChild(option);
    });
}

function updateStats() {
    document.getElementById('totalPlayers').textContent = allPlayers.length;
    document.getElementById('iconicCount').textContent = allPlayers.filter(p => p.rarity === 'Iconic').length;
    document.getElementById('legendCount').textContent = allPlayers.filter(p => p.rarity === 'Legend').length;
    document.getElementById('blackCount').textContent = allPlayers.filter(p => p.rarity === 'Black').length;
}

function filterPlayers() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const rarityFilter = document.getElementById('rarityFilter').value;
    const positionFilter = document.getElementById('positionFilter').value;
    const styleFilter = document.getElementById('styleFilter').value;
    const clubFilter = document.getElementById('clubFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;

    let filtered = allPlayers.filter(player => {
        // Name search
        if (search && !player.name.toLowerCase().includes(search)) return false;

        // Rarity filter
        if (rarityFilter && player.rarity !== rarityFilter) return false;

        // Position filter
        if (positionFilter && player.position !== positionFilter) return false;

        // Playing style filter
        if (styleFilter && player.playingStyle !== styleFilter) return false;

        // Club filter
        if (clubFilter && player.club !== clubFilter) return false;

        return true;
    });

    // Sorting
    const [sortField, sortDir] = sortFilter.split('-');
    const sortAsc = sortDir === 'asc';

    const rarityOrder = ['Iconic', 'Legend', 'Black', 'Gold', 'Silver', 'Bronze', 'White'];

    filtered.sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
            case 'overall':
                comparison = (a.overall || 0) - (b.overall || 0);
                break;
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'level':
                comparison = (a.level || 1) - (b.level || 1);
                break;
            case 'rarity':
                comparison = rarityOrder.indexOf(a.rarity || 'White') - rarityOrder.indexOf(b.rarity || 'White');
                break;
            default:
                comparison = (a.overall || 0) - (b.overall || 0);
        }

        return sortAsc ? comparison : -comparison;
    });

    renderPlayers(filtered);
}

function renderPlayers(players) {
    const grid = document.getElementById('playersGrid');

    if (players.length === 0) {
        grid.innerHTML = '<div class="empty-state">No players found matching your filters</div>';
        return;
    }

    grid.innerHTML = players.map(player => {
        const rarityClass = (player.rarity || 'standard').toLowerCase();

        return `
            <div class="player-card" onclick="showPlayerDetail('${player.id}')">
                <div class="player-rarity ${rarityClass}">${player.rarity || 'Standard'}</div>
                <div class="player-name">${player.name}</div>
                <div class="player-stats">
                    ${player.position} | OVR ${player.overall || 0}
                </div>
                <div class="player-stats" style="margin-top: 4px; font-size: 0.8em;">
                    Lv.${player.level || 1} ${player.playingStyle ? `| ${player.playingStyle}` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function showPlayerDetail(playerId) {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;

    // Could implement a modal for player details
    alert(`${player.name}\n\nPosition: ${player.position}\nOverall: ${player.overall}\nLevel: ${player.level || 1}\nRarity: ${player.rarity || 'Standard'}\nClub: ${player.club || 'Unknown'}\nPlaying Style: ${player.playingStyle || 'None'}`);
}

document.addEventListener('DOMContentLoaded', init);
