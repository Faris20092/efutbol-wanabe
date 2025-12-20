let userData = null;

async function init() {
    await loadUserData();
    setupResetConfirm();
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

        // Update account info
        document.getElementById('userName').textContent = user?.username || 'Player';
        document.getElementById('userId').textContent = user?.id || '---';

        // Update game stats
        document.getElementById('playerCount').textContent = (userData.players || []).length;

        const stats = userData.stats || { wins: 0, draws: 0, losses: 0 };
        const totalMatches = (stats.wins || 0) + (stats.draws || 0) + (stats.losses || 0);
        document.getElementById('matchCount').textContent = totalMatches;

        // Account created (approximate based on first data)
        document.getElementById('createdDate').textContent = userData.createdAt || 'Unknown';

    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function setupResetConfirm() {
    const input = document.getElementById('resetConfirm');
    const btn = document.getElementById('resetBtn');

    input.addEventListener('input', () => {
        btn.disabled = input.value.toUpperCase() !== 'RESET';
    });
}

async function resetAccount() {
    const confirm = document.getElementById('resetConfirm').value;
    if (confirm.toUpperCase() !== 'RESET') {
        alert('Please type RESET to confirm');
        return;
    }

    if (!window.confirm('Are you absolutely sure? This cannot be undone!')) {
        return;
    }

    try {
        const response = await fetch('/api/account/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            alert('Account reset successfully! You will be redirected to the dashboard.');
            window.location.href = '/dashboard';
        } else {
            alert(data.error || 'Failed to reset account');
        }
    } catch (error) {
        console.error('Reset error:', error);
        alert('Failed to reset account. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', init);
