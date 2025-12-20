let currentPage = 1;
let totalPages = 1;
let userData = null;

async function init() {
    await loadUserData();
    await loadLeaderboard();
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

async function loadLeaderboard() {
    const metric = document.getElementById('metricSelect').value;
    currentPage = 1; // Reset to page 1 when changing metric
    
    try {
        const response = await fetch(`/api/leaderboard?metric=${metric}&page=${currentPage}`);
        const data = await response.json();
        
        totalPages = data.totalPages || 1;
        displayLeaderboard(data.ranked, metric);
        updatePagination();
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        document.getElementById('tableBody').innerHTML = `
            <div class="empty-state">
                <h3>❌ Failed to load leaderboard</h3>
            </div>
        `;
    }
}

function displayLeaderboard(ranked, metric) {
    const tableBody = document.getElementById('tableBody');
    
    if (!ranked || ranked.length === 0) {
        tableBody.innerHTML = `
            <div class="empty-state">
                <h3>No data available</h3>
            </div>
        `;
        return;
    }
    
    let html = '';
    ranked.forEach((player, index) => {
        const rank = player.rank;
        let medalClass = '';
        let medalEmoji = `#${rank}`;
        
        if (rank === 1) medalClass = 'gold';
        else if (rank === 2) medalClass = 'silver';
        else if (rank === 3) medalClass = 'bronze';
        
        let value = '';
        if (metric === 'gp') value = player.gp.toLocaleString() + ' GP';
        else if (metric === 'wins') value = player.wins + ' Wins';
        else if (metric === 'strength') value = player.strength + ' STR';
        
        html += `
            <div class="rank-row">
                <div class="rank-position ${medalClass}">${medalEmoji}</div>
                <div class="player-name">${player.id.substring(0, 12)}...</div>
                <div class="rank-value">${value}</div>
                <div class="rank-value">${player.players}</div>
            </div>
        `;
    });
    
    tableBody.innerHTML = html;
}

function updatePagination() {
    document.getElementById('pageInfo').textContent = `Page ${currentPage}/${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage <= 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        loadLeaderboardPage();
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        loadLeaderboardPage();
    }
}

async function loadLeaderboardPage() {
    const metric = document.getElementById('metricSelect').value;
    
    try {
        const response = await fetch(`/api/leaderboard?metric=${metric}&page=${currentPage}`);
        const data = await response.json();
        
        displayLeaderboard(data.ranked, metric);
        updatePagination();
        window.scrollTo(0, 0);
    } catch (error) {
        console.error('Error loading page:', error);
    }
}

document.addEventListener('DOMContentLoaded', init);
