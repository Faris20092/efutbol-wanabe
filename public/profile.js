let userData = null;
let allPlayers = [];

async function init() {
    await loadUserData();
    await loadPlayers();
    updateDisplay();
}

async function loadUserData() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        const user = data.discord || data.user;
        userData = data.gameData;

        // Update header
        document.getElementById('topGP').textContent = (userData.gp || 0).toLocaleString();
        document.getElementById('topEcoins').textContent = userData.eCoins || 0;

        // Update profile card
        document.getElementById('userName').textContent = user?.username || 'Player';
        document.getElementById('userId').textContent = `ID: ${user?.id?.slice(0, 8) || '---'}...`;

        if (user?.avatar) {
            if (user.avatar.startsWith('http')) {
                document.getElementById('userAvatar').src = user.avatar;
            } else {
                document.getElementById('userAvatar').src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
            }
        }
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

function calculateTeamStrength() {
    if (!userData.squad?.main) return 0;
    let total = 0;
    let count = 0;

    userData.squad.main.forEach(playerId => {
        if (playerId) {
            const player = allPlayers.find(p => p.id === playerId);
            if (player) {
                total += player.overall || 0;
                count++;
            }
        }
    });

    return count > 0 ? Math.round(total / count) : 0;
}

function updateDisplay() {
    // Stats
    document.getElementById('gpStat').textContent = (userData.gp || 0).toLocaleString();
    document.getElementById('ecoinsStat').textContent = (userData.eCoins || 0).toLocaleString();
    document.getElementById('playersStat').textContent = allPlayers.length;
    document.getElementById('strengthStat').textContent = calculateTeamStrength();

    // Match record
    const stats = userData.stats || { wins: 0, draws: 0, losses: 0 };
    document.getElementById('winsStat').textContent = stats.wins || 0;
    document.getElementById('drawsStat').textContent = stats.draws || 0;
    document.getElementById('lossesStat').textContent = stats.losses || 0;

    const totalMatches = (stats.wins || 0) + (stats.draws || 0) + (stats.losses || 0);
    const winRate = totalMatches > 0 ? Math.round((stats.wins || 0) / totalMatches * 100) : 0;
    document.getElementById('winRate').textContent = `${winRate}%`;
}

document.addEventListener('DOMContentLoaded', init);
