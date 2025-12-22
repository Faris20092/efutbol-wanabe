// Admin Panel JavaScript
let currentUser = null;
let allPlayers = [];
let selectedUserId = null;

// Admin emails - only these can access the admin panel
const ADMIN_EMAILS = ['pijiiies@gmail.com'];

async function init() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        currentUser = data;

        // Check admin access
        const userEmail = data.discord?.email;
        if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('accessDenied').style.display = 'block';
            return;
        }

        // User is admin - show panel
        document.getElementById('loading').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';

        // Update navbar
        document.getElementById('username').textContent = data.discord.username;
        if (data.discord.avatar) {
            document.getElementById('userAvatar').src = data.discord.avatar;
        }

        // Load data
        await loadAllPlayers();
        await loadNews();

        // Setup player search
        document.getElementById('playerSearch').addEventListener('input', filterPlayers);

    } catch (error) {
        console.error('Init error:', error);
        document.getElementById('loading').innerHTML = '❌ Error loading admin panel';
    }
}

async function loadAllPlayers() {
    try {
        const response = await fetch('/api/all-players');
        const data = await response.json();
        allPlayers = data.players || [];
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

function filterPlayers() {
    const search = document.getElementById('playerSearch').value.toLowerCase();
    const select = document.getElementById('playerSelect');
    
    if (search.length < 2) {
        select.innerHTML = '<option value="">-- Type at least 2 characters --</option>';
        return;
    }

    const filtered = allPlayers
        .filter(p => p.name.toLowerCase().includes(search))
        .slice(0, 50);

    if (filtered.length === 0) {
        select.innerHTML = '<option value="">-- No players found --</option>';
        return;
    }

    select.innerHTML = filtered.map(p => 
        `<option value="${p.id}">${p.name} (${p.rarity} ${p.overall})</option>`
    ).join('');
}

async function searchUser() {
    const searchTerm = document.getElementById('userSearch').value.trim();
    if (!searchTerm) {
        alert('Please enter a user ID or email');
        return;
    }

    try {
        const response = await fetch(`/api/admin/user/${encodeURIComponent(searchTerm)}`);
        const data = await response.json();

        if (!data.success) {
            alert(data.error || 'User not found');
            return;
        }

        const result = document.getElementById('userSearchResult');
        result.classList.add('show');
        
        document.getElementById('foundUserId').textContent = data.user.id;
        document.getElementById('foundUsername').textContent = data.user.username || 'Unknown';
        document.getElementById('foundGP').textContent = (data.user.gp || 0).toLocaleString();
        document.getElementById('foundEcoins').textContent = data.user.eCoins || 0;
        document.getElementById('foundPlayers').textContent = (data.user.players || []).length;

        // Auto-fill other forms
        document.getElementById('currencyUserId').value = data.user.id;
        document.getElementById('playerUserId').value = data.user.id;
        document.getElementById('mailUserId').value = data.user.id;
        
        selectedUserId = data.user.id;

    } catch (error) {
        console.error('Search error:', error);
        alert('Failed to search user');
    }
}

async function giveCurrency() {
    const userId = document.getElementById('currencyUserId').value.trim();
    const currencyType = document.getElementById('currencyType').value;
    const amount = parseInt(document.getElementById('currencyAmount').value);

    if (!userId || !amount || amount <= 0) {
        showResult('currencyResult', 'Please fill all fields correctly', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/give-currency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, currencyType, amount })
        });

        const data = await response.json();
        
        if (data.success) {
            showResult('currencyResult', `✅ Successfully gave ${amount.toLocaleString()} ${currencyType} to user!`, 'success');
            document.getElementById('currencyAmount').value = '';
        } else {
            showResult('currencyResult', data.error || 'Failed to give currency', 'error');
        }
    } catch (error) {
        console.error('Give currency error:', error);
        showResult('currencyResult', 'Failed to give currency', 'error');
    }
}

async function addPlayer() {
    const userId = document.getElementById('playerUserId').value.trim();
    const playerId = document.getElementById('playerSelect').value;

    if (!userId || !playerId) {
        showResult('playerResult', 'Please select a user and player', 'error');
        return;
    }

    const player = allPlayers.find(p => p.id === playerId);
    if (!player) {
        showResult('playerResult', 'Player not found', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/add-player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, player })
        });

        const data = await response.json();
        
        if (data.success) {
            showResult('playerResult', `✅ Added ${player.name} to user's collection!`, 'success');
            document.getElementById('playerSearch').value = '';
            document.getElementById('playerSelect').innerHTML = '<option value="">-- Search first --</option>';
        } else {
            showResult('playerResult', data.error || 'Failed to add player', 'error');
        }
    } catch (error) {
        console.error('Add player error:', error);
        showResult('playerResult', 'Failed to add player', 'error');
    }
}

async function sendMail() {
    const userId = document.getElementById('mailUserId').value.trim();
    const title = document.getElementById('mailTitle').value.trim();
    const message = document.getElementById('mailMessage').value.trim();
    const gp = parseInt(document.getElementById('mailGP').value) || 0;
    const eCoins = parseInt(document.getElementById('mailEcoins').value) || 0;
    const pack = document.getElementById('mailPack').value;

    if (!title || !message) {
        showResult('mailResult', 'Please fill title and message', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/send-mail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: userId || null, // null = broadcast to all
                title, 
                message, 
                rewards: { gp, eCoins, packs: pack ? [pack] : [] }
            })
        });

        const data = await response.json();
        
        if (data.success) {
            const target = userId ? 'user' : 'all users';
            showResult('mailResult', `✅ Mail sent to ${target}!`, 'success');
            document.getElementById('mailTitle').value = '';
            document.getElementById('mailMessage').value = '';
            document.getElementById('mailGP').value = '0';
            document.getElementById('mailEcoins').value = '0';
            document.getElementById('mailPack').value = '';
        } else {
            showResult('mailResult', data.error || 'Failed to send mail', 'error');
        }
    } catch (error) {
        console.error('Send mail error:', error);
        showResult('mailResult', 'Failed to send mail', 'error');
    }
}

async function createNews() {
    const title = document.getElementById('newsTitle').value.trim();
    const content = document.getElementById('newsContent').value.trim();
    const category = document.getElementById('newsCategory').value;

    if (!title || !content) {
        showResult('newsResult', 'Please fill title and content', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, category })
        });

        const data = await response.json();
        
        if (data.success) {
            showResult('newsResult', `✅ News created successfully!`, 'success');
            document.getElementById('newsTitle').value = '';
            document.getElementById('newsContent').value = '';
            await loadNews();
        } else {
            showResult('newsResult', data.error || 'Failed to create news', 'error');
        }
    } catch (error) {
        console.error('Create news error:', error);
        showResult('newsResult', 'Failed to create news', 'error');
    }
}

async function loadNews() {
    try {
        const response = await fetch('/api/news');
        const data = await response.json();
        const newsList = document.getElementById('newsList');

        if (!data.news || data.news.length === 0) {
            newsList.innerHTML = '<p style="color: #aaa; text-align: center;">No news yet</p>';
            return;
        }

        newsList.innerHTML = data.news.map(news => `
            <div class="news-item-admin">
                <div>
                    <div class="news-item-title">${news.title}</div>
                    <div class="news-item-date">${news.date || 'No date'}</div>
                </div>
                <button class="admin-btn admin-btn-danger" onclick="deleteNews('${news.id}')" style="padding: 8px 15px; font-size: 0.9em;">
                    🗑️
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Load news error:', error);
    }
}

async function deleteNews(newsId) {
    if (!confirm('Are you sure you want to delete this news?')) return;

    try {
        const response = await fetch(`/api/admin/news/${newsId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (data.success) {
            showResult('newsResult', '✅ News deleted!', 'success');
            await loadNews();
        } else {
            showResult('newsResult', data.error || 'Failed to delete news', 'error');
        }
    } catch (error) {
        console.error('Delete news error:', error);
        showResult('newsResult', 'Failed to delete news', 'error');
    }
}

async function viewAllUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        const usersList = document.getElementById('usersList');

        if (!data.users || data.users.length === 0) {
            usersList.innerHTML = '<p style="color: #aaa; text-align: center;">No users found</p>';
            return;
        }

        usersList.innerHTML = data.users.map(user => `
            <div class="news-item-admin">
                <div>
                    <div class="news-item-title">${user.id}</div>
                    <div class="news-item-date">GP: ${(user.gp || 0).toLocaleString()} | Players: ${(user.players || []).length}</div>
                </div>
                <button class="admin-btn admin-btn-secondary" onclick="selectUser('${user.id}')" style="padding: 8px 15px; font-size: 0.9em;">
                    Select
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('View users error:', error);
        showResult('quickResult', 'Failed to load users', 'error');
    }
}

function selectUser(userId) {
    document.getElementById('currencyUserId').value = userId;
    document.getElementById('playerUserId').value = userId;
    document.getElementById('mailUserId').value = userId;
    document.getElementById('userSearch').value = userId;
    showResult('quickResult', `✅ Selected user: ${userId}`, 'success');
}

function refreshAllData() {
    loadAllPlayers();
    loadNews();
    showResult('quickResult', '✅ Data refreshed!', 'success');
}

function showResult(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = 'result-message ' + type;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        el.className = 'result-message';
    }, 5000);
}

// Initialize
document.addEventListener('DOMContentLoaded', init);
