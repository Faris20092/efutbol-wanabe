require('dotenv').config();
const express = require('express');
// const betterSqlite3 = require('better-sqlite3');
const expressSession = require('express-session');
// const expressSessionBetterSqlite3 = require('express-session-better-sqlite3');
const passport = require('passport');
// const DiscordStrategy = require('passport-discord').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const util = require('util');
const { Strategy } = require('passport');

const app = express();
const PORT = process.env.PORT || 3000;
const CALLBACK_URL = process.env.CALLBACK_URL || ''; // Discord OAuth2 Strategy (legacy, kept for reference)
// passport.use(new DiscordStrategy({
//     clientID: process.env.DISCORD_CLIENT_ID,
//     clientSecret: process.env.DISCORD_CLIENT_SECRET,
//     callbackURL: CALLBACK_URL,
//     scope: ['identify', 'guilds']
// }, (accessToken, refreshToken, profile, done) => {
//     return done(null, profile);
// }));
// Custom strategy for handling missing Google OAuth credentials
function MockGoogleStrategy() {
    Strategy.call(this);
    this.name = 'google';
}
util.inherits(MockGoogleStrategy, Strategy);

MockGoogleStrategy.prototype.authenticate = function (req, options) {
    this.error(new Error('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'));
};

// Get the Replit domain for OAuth callback URL
const REPLIT_DOMAIN = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
const DEFAULT_CALLBACK_URL = `https://${REPLIT_DOMAIN}/auth/google/callback`;

// Google OAuth2 Strategy - Register with proper handling for missing credentials
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use('google', new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || DEFAULT_CALLBACK_URL
    }, (accessToken, refreshToken, profile, done) => {
        const user = {
            id: profile.id,
            username: profile.displayName,
            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
            provider: 'google'
        };
        return done(null, user);
    }));
} else {
    // Use mock strategy when credentials are missing
    passport.use('google', new MockGoogleStrategy());
    console.log('⚠️ Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set');
}

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Create SQLite database for sessions
// const sqliteDb = new betterSqlite3(path.join(__dirname, 'sessions.db'));

// Create the session store
// const BetterSqlite3SessionStore = expressSessionBetterSqlite3(expressSession, sqliteDb);

// File-based session store for persistence across restarts
const FileStore = require('session-file-store')(expressSession);

// Middleware
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressSession({
    store: new FileStore({
        path: path.join(__dirname, 'sessions'),
        ttl: 7 * 24 * 60 * 60, // 7 days in seconds
        retries: 0,
        secret: process.env.SESSION_SECRET || 'efotball-secret-key-change-this'
    }),
    secret: process.env.SESSION_SECRET || 'efotball-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Helper: Get user data from bot's data directory
function getUserData(userId) {
    const dataPath = path.join(__dirname, 'data');
    const userFile = path.join(dataPath, `${userId}.json`);

    if (fs.existsSync(userFile)) {
        return JSON.parse(fs.readFileSync(userFile, 'utf8'));
    }
    return null;
}

// Helper: Save user data
function setUserData(userId, data) {
    const dataPath = path.join(__dirname, 'data');
    if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath);
    }
    const userFile = path.join(dataPath, `${userId}.json`);
    fs.writeFileSync(userFile, JSON.stringify(data, null, 2));
}

const { PACKS: SHARED_PACKS, loadPackLimits, savePackLimits } = require('./shared/pack-config');

// Helper: initialize pack limits file if missing (only iconic currently tracked)
function ensurePackLimitsFile() {
    const limits = loadPackLimits();
    savePackLimits(limits);
}

ensurePackLimitsFile();

// Helper: Get all players data
function getAllPlayers() {
    const playersFile = path.join(__dirname, 'players.json');
    if (fs.existsSync(playersFile)) {
        return JSON.parse(fs.readFileSync(playersFile, 'utf8'));
    }
    return [];
}

// Middleware: Check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}


// Routes
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Discord OAuth2 routes (disabled - kept for reference)
// app.get('/auth/discord', passport.authenticate('discord'));
// app.get('/auth/discord/callback', 
//     passport.authenticate('discord', { failureRedirect: '/login' }),
//     (req, res) => {
//         res.redirect('/dashboard');
//     }
// );

// Google OAuth2 routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error(err);
        res.redirect('/');
    });
});

// Dashboard route
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Contracts route
app.get('/contracts', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contracts.html'));
});

// My Team route
app.get('/my-team', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'my-team.html'));
});

// Game Plan route (Squad Builder)
app.get('/gameplan', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gameplan.html'));
});


// Load players data
let allPlayers = [];
try {
    const playersPath = path.join(__dirname, 'players.json');
    if (fs.existsSync(playersPath)) {
        allPlayers = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
        console.log(`Loaded ${allPlayers.length} players`);
    } else {
        console.error('players.json not found!');
    }
} catch (error) {
    console.error('Error loading players:', error);
}

// Pack Configurations
const PACK_CONFIGS = {
    iconic: {
        cost: 500,
        currency: 'eCoins',
        chances: {
            'Iconic': 0.05,
            'Legend': 0.10,
            'Black': 0.85
        }
    },
    legend: {
        cost: 300,
        currency: 'eCoins',
        chances: {
            'Legend': 0.10,
            'Black': 0.20,
            'Gold': 0.70
        }
    },
    standard: {
        cost: 100,
        currency: 'eCoins',
        chances: {
            'Black': 0.05,
            'Gold': 0.15,
            'Silver': 0.30,
            'Bronze': 0.30,
            'White': 0.20
        }
    }
};

// Contracts route
app.get('/contracts', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contracts.html'));
});

// Special Players route
app.get('/special-players', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'special-players.html'));
});

// API: Get all players
app.get('/api/all-players', (req, res) => {
    res.json({ players: allPlayers });
});

// API: Open Pack
app.post('/api/contracts/open', isAuthenticated, (req, res) => {
    try {
        const { packType, count } = req.body;
        const userId = req.user.id;
        const user = getUserData(userId);

        const packConfig = PACK_CONFIGS[packType];
        if (!packConfig) {
            return res.json({ success: false, message: 'Invalid pack type' });
        }

        const totalCost = packConfig.cost * count;
        const currencyKey = packConfig.currency === 'GP' ? 'gp' : 'eCoins';

        if ((user[currencyKey] || 0) < totalCost) {
            return res.json({ success: false, message: `Insufficient ${packConfig.currency}` });
        }

        // Deduct cost
        user[currencyKey] -= totalCost;

        // Pull players
        const pulledPlayers = [];
        const chances = packConfig.chances;

        for (let i = 0; i < count; i++) {
            // Determine rarity
            const rand = Math.random();
            let accumulatedChance = 0;
            let selectedRarity = null;

            for (const [rarity, chance] of Object.entries(chances)) {
                accumulatedChance += chance;
                if (rand <= accumulatedChance) {
                    selectedRarity = rarity;
                    break;
                }
            }
            if (!selectedRarity) selectedRarity = Object.keys(chances)[Object.keys(chances).length - 1]; // Fallback to last

            // Filter players by rarity
            const pool = allPlayers.filter(p => p.rarity === selectedRarity);
            if (pool.length === 0) {
                // Fallback if no player of rarity found (shouldn't happen with full db)
                pulledPlayers.push(allPlayers[Math.floor(Math.random() * allPlayers.length)]);
            } else {
                const randomPlayer = pool[Math.floor(Math.random() * pool.length)];

                // Check duplicate
                const isDuplicate = user.players.some(p => p.id === randomPlayer.id);
                const playerResult = { ...randomPlayer, isDuplicate };

                if (isDuplicate) {
                    // Give GP for duplicate
                    const duplicateGP = 500; // Flat rate for now
                    user.gp = (user.gp || 0) + duplicateGP;
                } else {
                    user.players.push(randomPlayer);
                }

                pulledPlayers.push(playerResult);
            }
        }

        // Save user data
        setUserData(userId, user);

        res.json({
            success: true,
            newBalance: user[currencyKey],
            players: pulledPlayers
        });

    } catch (error) {
        console.error('Pack opening error:', error);
        res.json({ success: false, message: 'Server error opening pack' });
    }
});

// Mail route
app.get('/mail', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mail.html'));
});

// News route
app.get('/news', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'news.html'));
});

// Daily Game route
app.get('/dailygame', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'daily-game.html'));
});

// Match route
app.get('/match', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'match.html'));
});

// PvP route
app.get('/pvp', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pvp.html'));
});

// Penalty route
app.get('/penalty', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'penalty.html'));
});

// Training route
app.get('/training', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'training.html'));
});

// Leaderboard route
app.get('/leaderboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

// Collection route
app.get('/collection', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'collection.html'));
});

// Profile route
app.get('/profile', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Settings route
app.get('/settings', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

// API Routes
app.get('/api/user', isAuthenticated, (req, res) => {
    const userData = getUserData(req.user.id);
    res.json({
        discord: req.user,
        gameData: userData
    });
});

app.get('/api/players', isAuthenticated, (req, res) => {
    const userData = getUserData(req.user.id);
    if (!userData || !userData.players) {
        return res.json({ players: [] });
    }
    res.json({ players: userData.players });
});

app.get('/api/squad', isAuthenticated, (req, res) => {
    const userData = getUserData(req.user.id);
    if (!userData) {
        return res.json({ squad: { main: [], bench: [] }, formation: '4-3-3' });
    }
    res.json({
        squad: userData.squad || { main: [], bench: [] },
        formation: userData.formation || '4-3-3'
    });
});

app.post('/api/squad/update', isAuthenticated, (req, res) => {
    try {
        const userData = getUserData(req.user.id);
        if (!userData) {
            return res.status(404).json({ error: 'User data not found' });
        }

        const { squad, formation } = req.body;

        if (squad) {
            userData.squad = squad;
        }
        if (formation) {
            userData.formation = formation;
        }

        setUserData(req.user.id, userData);
        res.json({ success: true, message: 'Squad updated successfully!' });
    } catch (error) {
        console.error('Error updating squad:', error);
        res.status(500).json({ error: 'Failed to update squad' });
    }
});

app.get('/api/all-players', isAuthenticated, (req, res) => {
    const allPlayers = getAllPlayers();
    res.json({ players: allPlayers });
});

// Packs API endpoint
app.get('/api/packs', isAuthenticated, (req, res) => {
    res.json({ packs: SHARED_PACKS });
});

// Contract pull endpoint - open packs on web
app.post('/api/contract/pull', isAuthenticated, (req, res) => {
    try {
        const { packType, count = 1 } = req.body;
        const userData = getUserData(req.user.id);

        // Validate pack type
        const pack = SHARED_PACKS[packType];
        if (!pack) {
            return res.status(400).json({ error: 'Invalid pack type' });
        }

        // Calculate total cost
        const totalCost = pack.cost * count;
        const currency = pack.currency === 'eCoins' ? 'eCoins' : 'gp';

        // Check if user can afford
        if ((userData[currency] || 0) < totalCost) {
            return res.status(400).json({ error: `Not enough ${currency}` });
        }

        // Deduct cost
        userData[currency] -= totalCost;

        // Get all players database
        const allPlayersList = getAllPlayers();

        // Pull players
        const pulledPlayers = [];
        for (let i = 0; i < count; i++) {
            // Determine rarity based on pack chances
            const roll = Math.random();
            let cumulative = 0;
            let selectedRarity = 'Silver'; // fallback

            for (const [rarity, chance] of Object.entries(pack.rarity_chances)) {
                cumulative += chance;
                if (roll <= cumulative) {
                    selectedRarity = rarity;
                    break;
                }
            }

            // Filter players by rarity
            const availablePlayers = allPlayersList.filter(p => p.rarity === selectedRarity);
            if (availablePlayers.length === 0) {
                // Fallback to any player if no players of that rarity
                const fallbackPlayers = allPlayersList.filter(p => p.rarity === 'Gold' || p.rarity === 'Silver');
                if (fallbackPlayers.length > 0) {
                    const randomPlayer = fallbackPlayers[Math.floor(Math.random() * fallbackPlayers.length)];
                    availablePlayers.push(randomPlayer);
                }
            }

            if (availablePlayers.length > 0) {
                // Pick random player
                const randomPlayer = { ...availablePlayers[Math.floor(Math.random() * availablePlayers.length)] };
                randomPlayer.id = randomPlayer.id || Math.random().toString(36).slice(2, 10);

                // Check for duplicate
                const isDuplicate = userData.players?.some(p => p.name === randomPlayer.name);
                randomPlayer.isDuplicate = isDuplicate;

                if (isDuplicate) {
                    // Convert to GP bonus
                    const gpBonus = { 'Iconic': 10000, 'Legend': 7500, 'Black': 5000, 'Gold': 2000, 'Silver': 1000, 'Bronze': 500, 'White': 250 };
                    userData.gp = (userData.gp || 0) + (gpBonus[randomPlayer.rarity] || 500);
                } else {
                    // Add to collection
                    if (!userData.players) userData.players = [];
                    userData.players.push({
                        id: randomPlayer.id,
                        name: randomPlayer.name,
                        position: randomPlayer.position,
                        rarity: randomPlayer.rarity,
                        overall: randomPlayer.overall,
                        stats: randomPlayer.stats || {},
                        playingStyle: randomPlayer.playingStyle,
                        club: randomPlayer.club,
                        level: 1,
                        exp: 0
                    });
                }

                pulledPlayers.push(randomPlayer);
            }
        }

        setUserData(req.user.id, userData);

        res.json({
            success: true,
            players: pulledPlayers,
            newBalance: { gp: userData.gp, eCoins: userData.eCoins }
        });
    } catch (error) {
        console.error('Contract pull error:', error);
        res.status(500).json({ error: 'Failed to open pack' });
    }
});

// Mail API endpoints
app.get('/api/mail', isAuthenticated, (req, res) => {
    const userData = getUserData(req.user.id);
    if (!userData) {
        return res.json({ mail: [] });
    }
    res.json({ mail: userData.mail || [] });
});

app.post('/api/mail/claim', isAuthenticated, (req, res) => {
    const { mailId } = req.body;
    const userData = getUserData(req.user.id);

    console.log('Claim request for mail ID:', mailId);
    console.log('User has mail:', userData?.mail?.length || 0);

    if (!userData || !userData.mail) {
        return res.json({ success: false, message: 'No mail found' });
    }

    // Find mail with flexible ID comparison (string or number)
    const mail = userData.mail.find(m => m.id == mailId || m.id === mailId);
    if (!mail) {
        console.log('Mail not found. Available IDs:', userData.mail.map(m => m.id));
        return res.json({ success: false, message: 'Mail not found' });
    }

    if (mail.claimed) {
        return res.json({ success: false, message: 'Already claimed' });
    }

    console.log('Claiming mail:', mail.title || mail.type);

    // Mark as claimed
    mail.claimed = true;

    // Handle new format (rewards object)
    if (mail.rewards) {
        if (mail.rewards.gp) {
            userData.gp = (userData.gp || 0) + mail.rewards.gp;
        }
        if (mail.rewards.eCoins) {
            userData.eCoins = (userData.eCoins || 0) + mail.rewards.eCoins;
        }
        if (mail.rewards.players && mail.rewards.players.length > 0) {
            userData.players = userData.players || [];
            userData.players.push(...mail.rewards.players);
        }
        if (mail.rewards.packs && mail.rewards.packs.length > 0) {
            userData.inventory = userData.inventory || {};
            mail.rewards.packs.forEach(pack => {
                const packKey = `${pack}Pack`;
                userData.inventory[packKey] = (userData.inventory[packKey] || 0) + 1;
            });
        }
    }
    // Handle old format (type, amount, rarity fields)
    else if (mail.type) {
        if (mail.type === 'gp' && mail.amount) {
            userData.gp = (userData.gp || 0) + mail.amount;
        }
        else if (mail.type === 'eCoins' && mail.amount) {
            userData.eCoins = (userData.eCoins || 0) + mail.amount;
        }
        else if (mail.type === 'pack' && mail.rarity) {
            userData.inventory = userData.inventory || {};
            const packKey = `${mail.rarity}Pack`;
            userData.inventory[packKey] = (userData.inventory[packKey] || 0) + 1;
        }
        else if (mail.type === 'trainer' && mail.trainerName) {
            // Add trainer to inventory or handle as needed
            userData.inventory = userData.inventory || {};
            userData.inventory.trainers = userData.inventory.trainers || [];
            userData.inventory.trainers.push(mail.trainerName);
        }
    }

    setUserData(req.user.id, userData);

    res.json({
        success: true,
        rewards: mail.rewards,
        newBalance: {
            gp: userData.gp,
            eCoins: userData.eCoins
        }
    });
});

app.post('/api/mail/claim-all', isAuthenticated, (req, res) => {
    const userData = getUserData(req.user.id);

    if (!userData || !userData.mail) {
        return res.json({ success: false, message: 'No mail found' });
    }

    let claimedCount = 0;
    const totalRewards = {
        gp: 0,
        eCoins: 0,
        players: 0,
        packs: 0
    };

    userData.mail.forEach(mail => {
        if (!mail.claimed) {
            mail.claimed = true;
            claimedCount++;

            // Handle new format (rewards object)
            if (mail.rewards) {
                if (mail.rewards.gp) {
                    userData.gp = (userData.gp || 0) + mail.rewards.gp;
                    totalRewards.gp += mail.rewards.gp;
                }
                if (mail.rewards.eCoins) {
                    userData.eCoins = (userData.eCoins || 0) + mail.rewards.eCoins;
                    totalRewards.eCoins += mail.rewards.eCoins;
                }
                if (mail.rewards.players && mail.rewards.players.length > 0) {
                    userData.players = userData.players || [];
                    userData.players.push(...mail.rewards.players);
                    totalRewards.players += mail.rewards.players.length;
                }
                if (mail.rewards.packs && mail.rewards.packs.length > 0) {
                    userData.inventory = userData.inventory || {};
                    mail.rewards.packs.forEach(pack => {
                        const packKey = `${pack}Pack`;
                        userData.inventory[packKey] = (userData.inventory[packKey] || 0) + 1;
                    });
                    totalRewards.packs += mail.rewards.packs.length;
                }
            }
            // Handle old format (type, amount, rarity fields)
            else if (mail.type) {
                if (mail.type === 'gp' && mail.amount) {
                    userData.gp = (userData.gp || 0) + mail.amount;
                    totalRewards.gp += mail.amount;
                }
                else if (mail.type === 'eCoins' && mail.amount) {
                    userData.eCoins = (userData.eCoins || 0) + mail.amount;
                    totalRewards.eCoins += mail.amount;
                }
                else if (mail.type === 'pack' && mail.rarity) {
                    userData.inventory = userData.inventory || {};
                    const packKey = `${mail.rarity}Pack`;
                    userData.inventory[packKey] = (userData.inventory[packKey] || 0) + 1;
                    totalRewards.packs += 1;
                }
                else if (mail.type === 'trainer' && mail.trainerName) {
                    userData.inventory = userData.inventory || {};
                    userData.inventory.trainers = userData.inventory.trainers || [];
                    userData.inventory.trainers.push(mail.trainerName);
                }
            }
        }
    });

    setUserData(req.user.id, userData);

    res.json({
        success: true,
        claimedCount,
        totalRewards,
        newBalance: {
            gp: userData.gp,
            eCoins: userData.eCoins
        }
    });
});

// News API endpoint
app.get('/api/news', (req, res) => {
    const newsFile = path.join(__dirname, 'news.json');
    if (fs.existsSync(newsFile)) {
        const newsData = JSON.parse(fs.readFileSync(newsFile, 'utf8'));
        res.json({ news: newsData });
    } else {
        res.json({ news: [] });
    }
});

// ====== GAME FEATURE ENDPOINTS ======

// AI Teams data
const AI_TEAMS = [
    { name: 'FC Barcelona', strength: 85 }, { name: 'Real Madrid', strength: 87 },
    { name: 'Manchester City', strength: 86 }, { name: 'Liverpool', strength: 84 },
    { name: 'Bayern Munich', strength: 85 }, { name: 'Paris Saint-Germain', strength: 83 },
    { name: 'Chelsea', strength: 82 }, { name: 'Juventus', strength: 81 },
    { name: 'Arsenal', strength: 80 }, { name: 'Manchester United', strength: 79 },
    { name: 'Brazil', strength: 87 }, { name: 'Argentina', strength: 86 },
    { name: 'France', strength: 88 }, { name: 'Germany', strength: 85 },
    { name: 'Spain', strength: 84 }, { name: 'England', strength: 85 }
];

const MATCH_REWARDS = {
    win: { gp: 5000, eCoins: 10 },
    draw: { gp: 2000, eCoins: 5 },
    loss: { gp: 1000, eCoins: 2 }
};

const PVP_REWARDS = {
    win: { gp: 12000, eCoins: 25 },
    draw: { gp: 6000, eCoins: 15 },
    loss: { gp: 3000, eCoins: 8 }
};

// Match simulation endpoint
app.post('/api/match', isAuthenticated, (req, res) => {
    try {
        const userData = getUserData(req.user.id);
        if (!userData.squad || userData.squad.main.length < 11) {
            return res.status(400).json({ error: 'Need 11 players in squad' });
        }

        const opponent = AI_TEAMS[Math.floor(Math.random() * AI_TEAMS.length)];
        const playerStrength = calculateTeamStrength(userData);

        // Simulate match
        const result = simulateMatch(playerStrength, opponent.strength);
        const rewards = MATCH_REWARDS[result.outcome];

        // Update user data
        userData.gp = (userData.gp || 0) + rewards.gp;
        userData.eCoins = (userData.eCoins || 0) + rewards.eCoins;
        if (!userData.stats) userData.stats = { wins: 0, draws: 0, losses: 0 };
        userData.stats[result.outcome === 'win' ? 'wins' : result.outcome === 'draw' ? 'draws' : 'losses']++;

        setUserData(req.user.id, userData);

        res.json({
            success: true,
            opponent: opponent,
            result: result,
            rewards: rewards,
            newBalance: { gp: userData.gp, eCoins: userData.eCoins }
        });
    } catch (error) {
        console.error('Match error:', error);
        res.status(500).json({ error: 'Failed to simulate match' });
    }
});

// Leaderboard endpoint
app.get('/api/leaderboard', isAuthenticated, (req, res) => {
    try {
        const metric = req.query.metric || 'gp'; // gp, wins, strength
        const scope = req.query.scope || 'global'; // global or server
        const page = parseInt(req.query.page) || 1;

        const dataDir = path.join(__dirname, 'data');
        const users = loadAllUsers(dataDir);

        // Filter and sort
        let filtered = users.map(u => ({
            id: u.id,
            gp: u.gp || 0,
            wins: u.stats?.wins || 0,
            strength: calculateUserStrength(u),
            players: (u.players || []).length
        }));

        filtered.sort((a, b) => {
            if (metric === 'gp') return b.gp - a.gp;
            if (metric === 'wins') return b.wins - a.wins;
            if (metric === 'strength') return b.strength - a.strength;
            return b.gp - a.gp;
        });

        const pageSize = 20;
        const totalPages = Math.ceil(filtered.length / pageSize);
        const start = (page - 1) * pageSize;
        const ranked = filtered.slice(start, start + pageSize).map((u, i) => ({
            rank: start + i + 1,
            ...u
        }));

        res.json({ ranked, page, totalPages, metric });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to load leaderboard' });
    }
});

// Profile/Stats endpoint
app.get('/api/profile/:userId', isAuthenticated, (req, res) => {
    try {
        const targetUserId = req.params.userId || req.user.id;
        const userData = getUserData(targetUserId);

        if (!userData) return res.status(404).json({ error: 'User not found' });

        const profile = {
            id: userData.id,
            gp: userData.gp,
            eCoins: userData.eCoins,
            playerCount: (userData.players || []).length,
            stats: userData.stats || { wins: 0, draws: 0, losses: 0 },
            teamStrength: calculateUserStrength(userData),
            squadSize: userData.squad?.main?.length || 0
        };

        res.json(profile);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to load profile' });
    }
});

// PvP result endpoint
app.post('/api/pvp/result', isAuthenticated, (req, res) => {
    try {
        const { outcome, reward, opponent, score } = req.body;
        const userData = getUserData(req.user.id);

        // Apply rewards
        if (reward) {
            userData.gp = (userData.gp || 0) + (reward.gp || 0);
            userData.eCoins = (userData.eCoins || 0) + (reward.eCoins || 0);
        }

        // Update stats
        if (!userData.stats) userData.stats = { wins: 0, draws: 0, losses: 0 };
        if (outcome === 'win') userData.stats.wins = (userData.stats.wins || 0) + 1;
        else if (outcome === 'draw') userData.stats.draws = (userData.stats.draws || 0) + 1;
        else if (outcome === 'loss') userData.stats.losses = (userData.stats.losses || 0) + 1;

        // Save match history
        if (!userData.matchHistory) userData.matchHistory = [];
        userData.matchHistory.unshift({
            opponent,
            score,
            outcome,
            reward,
            date: new Date().toISOString()
        });

        // Keep only last 50 matches
        if (userData.matchHistory.length > 50) {
            userData.matchHistory = userData.matchHistory.slice(0, 50);
        }

        setUserData(req.user.id, userData);

        res.json({
            success: true,
            newBalance: { gp: userData.gp, eCoins: userData.eCoins },
            stats: userData.stats
        });
    } catch (error) {
        console.error('PvP result error:', error);
        res.status(500).json({ error: 'Failed to save PvP result' });
    }
});

// Account reset endpoint
app.post('/api/account/reset', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;

        // Create fresh user data
        const freshData = {
            id: userId,
            gp: 10000,
            eCoins: 100,
            players: [],
            squad: { main: [], bench: [] },
            formation: '4-3-3',
            mail: [],
            inventory: {},
            stats: { wins: 0, draws: 0, losses: 0 },
            createdAt: new Date().toISOString()
        };

        setUserData(userId, freshData);

        res.json({ success: true, message: 'Account reset successfully' });
    } catch (error) {
        console.error('Account reset error:', error);
        res.status(500).json({ error: 'Failed to reset account' });
    }
});

// Remove player from collection
app.post('/api/player/remove', isAuthenticated, (req, res) => {
    try {
        const { playerId } = req.body;
        const userData = getUserData(req.user.id);

        if (!userData || !userData.players) {
            return res.status(404).json({ error: 'User data not found' });
        }

        // Check if player is in squad or bench
        if (userData.squad) {
            const inSquad = userData.squad.main && userData.squad.main.includes(playerId);
            const inBench = userData.squad.bench && userData.squad.bench.includes(playerId);

            if (inSquad || inBench) {
                return res.status(400).json({
                    error: 'Cannot remove player currently in squad or bench. Remove them from squad first.'
                });
            }
        }

        // Find and remove player
        const playerIndex = userData.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            return res.status(404).json({ error: 'Player not found' });
        }

        const playerName = userData.players[playerIndex].name;
        userData.players.splice(playerIndex, 1);

        setUserData(req.user.id, userData);

        res.json({ success: true, message: `${playerName} has been removed from your collection` });
    } catch (error) {
        console.error('Remove player error:', error);
        res.status(500).json({ error: 'Failed to remove player' });
    }
});

// Squad auto-set endpoint
app.post('/api/squad/autoset', isAuthenticated, (req, res) => {
    try {
        const userData = getUserData(req.user.id);

        if (!userData || !userData.players || userData.players.length === 0) {
            return res.status(400).json({ error: 'No players available to auto-set' });
        }

        const formation = userData.formation || '4-3-3';
        const FORMATIONS = {
            '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'CMF', 'CMF', 'CMF', 'LWF', 'CF', 'RWF'],
            '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LMF', 'CMF', 'CMF', 'RMF', 'CF', 'CF'],
            '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LMF', 'CMF', 'CMF', 'CMF', 'RMF', 'CF', 'CF'],
            '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'DMF', 'DMF', 'AMF', 'AMF', 'AMF', 'CF'],
            '3-4-3': ['GK', 'CB', 'CB', 'CB', 'LMF', 'CMF', 'CMF', 'RMF', 'LWF', 'CF', 'RWF'],
            '4-1-4-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'DMF', 'LMF', 'CMF', 'CMF', 'RMF', 'CF']
        };

        const positions = FORMATIONS[formation] || FORMATIONS['4-3-3'];
        const taken = new Set();
        const newMain = new Array(11).fill(null);

        // Position compatibility
        const compatibility = {
            'GK': ['GK'],
            'CB': ['CB', 'LB', 'RB'],
            'LB': ['LB', 'CB', 'LMF'],
            'RB': ['RB', 'CB', 'RMF'],
            'DMF': ['DMF', 'CMF', 'CB'],
            'CMF': ['CMF', 'DMF', 'AMF'],
            'AMF': ['AMF', 'CMF', 'CF'],
            'LMF': ['LMF', 'LB', 'LWF'],
            'RMF': ['RMF', 'RB', 'RWF'],
            'CF': ['CF', 'AMF'],
            'LWF': ['LWF', 'CF', 'LMF'],
            'RWF': ['RWF', 'CF', 'RMF']
        };

        // First pass: exact position matches
        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];
            const candidates = userData.players
                .filter(p => p.position === pos && !taken.has(p.id))
                .sort((a, b) => b.overall - a.overall);

            if (candidates.length > 0) {
                newMain[i] = candidates[0].id;
                taken.add(candidates[0].id);
            }
        }

        // Second pass: compatible positions
        for (let i = 0; i < positions.length; i++) {
            if (!newMain[i]) {
                const requiredPos = positions[i];
                const compatiblePos = compatibility[requiredPos] || [requiredPos];

                for (const pos of compatiblePos) {
                    const candidates = userData.players
                        .filter(p => p.position === pos && !taken.has(p.id))
                        .sort((a, b) => b.overall - a.overall);

                    if (candidates.length > 0) {
                        newMain[i] = candidates[0].id;
                        taken.add(candidates[0].id);
                        break;
                    }
                }
            }
        }

        // Third pass: fill with best available
        for (let i = 0; i < positions.length; i++) {
            if (!newMain[i]) {
                const candidates = userData.players
                    .filter(p => !taken.has(p.id))
                    .sort((a, b) => b.overall - a.overall);

                if (candidates.length > 0) {
                    newMain[i] = candidates[0].id;
                    taken.add(candidates[0].id);
                }
            }
        }

        // Fill bench with top 7 remaining
        const newBench = userData.players
            .filter(p => !taken.has(p.id))
            .sort((a, b) => b.overall - a.overall)
            .slice(0, 7)
            .map(p => p.id);

        // Update user data
        userData.squad = { main: newMain, bench: newBench };
        setUserData(req.user.id, userData);

        res.json({
            success: true,
            squad: userData.squad,
            message: 'Squad auto-set successfully!'
        });
    } catch (error) {
        console.error('Squad autoset error:', error);
        res.status(500).json({ error: 'Failed to auto-set squad' });
    }
});

// Training endpoint - enhanced with all trainer types
app.post('/api/training', isAuthenticated, (req, res) => {
    try {
        const { playerId, trainerId } = req.body;
        const userData = getUserData(req.user.id);

        const player = userData.players?.find(p => p.id === playerId);
        if (!player) return res.status(404).json({ error: 'Player not found' });

        // Trainer EXP values
        const trainerExp = {
            normal: 5000,
            basic: 50000,
            special: 500000,
            special_coin: 500000
        };

        // Trainer costs
        const trainerCosts = {
            normal: { cost: 1500, currency: 'gp' },
            basic: { cost: 3000, currency: 'gp' },
            special: { cost: 28000, currency: 'gp' },
            special_coin: { cost: 50, currency: 'eCoins' }
        };

        const expGain = trainerExp[trainerId] || 5000;
        const costInfo = trainerCosts[trainerId] || { cost: 1500, currency: 'gp' };

        // Check if can afford
        if ((userData[costInfo.currency] || 0) < costInfo.cost) {
            return res.status(400).json({ error: `Not enough ${costInfo.currency}` });
        }

        // Deduct cost
        userData[costInfo.currency] -= costInfo.cost;

        // Apply EXP
        player.exp = (player.exp || 0) + expGain;
        player.level = player.level || 1;

        // Level up logic - EXP requirement increases per level
        const getExpForLevel = (level) => {
            if (level <= 1) return 1000;
            if (level <= 5) return level * 2000;
            if (level <= 10) return level * 5000;
            return level * 10000;
        };

        let leveledUp = false;
        while (player.exp >= getExpForLevel(player.level)) {
            player.exp -= getExpForLevel(player.level);
            player.level++;
            leveledUp = true;

            // Boost stats (more for Normal trainer - random stats)
            if (!player.stats) player.stats = {};
            if (trainerId === 'normal') {
                // Normal trainer adds 10 random stat points
                const stats = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];
                for (let i = 0; i < 10; i++) {
                    const stat = stats[Math.floor(Math.random() * stats.length)];
                    player.stats[stat] = Math.min(99, (player.stats[stat] || 50) + 1);
                }
            } else {
                // Other trainers boost all stats slightly
                Object.keys(player.stats || {}).forEach(stat => {
                    player.stats[stat] = Math.min(99, (player.stats[stat] || 50) + 1);
                });
            }

            // Recalculate overall
            const statValues = Object.values(player.stats || {});
            if (statValues.length > 0) {
                player.overall = Math.round(statValues.reduce((a, b) => a + b, 0) / statValues.length);
            }
        }

        setUserData(req.user.id, userData);

        res.json({ success: true, player, leveledUp, newBalance: { gp: userData.gp, eCoins: userData.eCoins } });
    } catch (error) {
        console.error('Training error:', error);
        res.status(500).json({ error: 'Failed to train player' });
    }
});

// Legacy training endpoint
app.post('/api/training/train', isAuthenticated, (req, res) => {
    // Forward to main training endpoint
    req.url = '/api/training';
    return app._router.handle(req, res);
});

// Convert player to EXP trainer
app.post('/api/training/convert', isAuthenticated, (req, res) => {
    try {
        const { playerId } = req.body;
        const userData = getUserData(req.user.id);

        const playerIndex = userData.players?.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return res.status(404).json({ error: 'Player not found' });

        const player = userData.players[playerIndex];

        // Check if player is in squad
        if (userData.squad?.main?.includes(playerId)) {
            return res.status(400).json({ error: 'Cannot convert a player in your active squad' });
        }

        // Calculate EXP value based on rarity and level
        const rarityExp = {
            'Iconic': 100000,
            'Legend': 80000,
            'Black': 50000,
            'Gold': 25000,
            'Silver': 15000,
            'Bronze': 10000,
            'White': 5000
        };

        let expValue = rarityExp[player.rarity] || 10000;
        expValue += (player.level || 1) * 5000;
        expValue += Math.floor((player.overall || 50) / 10) * 2000;

        // Remove player from collection
        userData.players.splice(playerIndex, 1);

        // Send EXP trainer to mail
        if (!userData.mail) userData.mail = [];
        userData.mail.push({
            id: Math.random().toString(36).slice(2, 10),
            type: 'trainer',
            trainerName: `${player.name} (Converted)`,
            exp: expValue,
            date: new Date().toISOString().slice(0, 10),
            title: 'Player Converted!',
            message: `${player.name} has been converted to an EXP trainer worth ${expValue.toLocaleString()} EXP!`
        });

        setUserData(req.user.id, userData);

        res.json({ success: true, expValue, playerName: player.name });
    } catch (error) {
        console.error('Convert error:', error);
        res.status(500).json({ error: 'Failed to convert player' });
    }
});

// Training shop
app.post('/api/training/shop', isAuthenticated, (req, res) => {
    try {
        const { itemId } = req.body;
        const userData = getUserData(req.user.id);

        // Shop items configuration
        const shopItems = {
            normal: { cost: 7000, currency: 'gp', qty: 5, trainerName: 'Normal Trainer', exp: 5000 },
            basic: { cost: 8500, currency: 'gp', qty: 3, trainerName: 'Basic Trainer', exp: 50000 },
            special: { cost: 28000, currency: 'gp', qty: 1, trainerName: 'Special Trainer', exp: 500000 },
            premium: { cost: 90, currency: 'eCoins', qty: 2, trainerName: 'Premium Trainer', exp: 500000 }
        };

        const item = shopItems[itemId];
        if (!item) return res.status(400).json({ error: 'Invalid item' });

        // Check if can afford
        if ((userData[item.currency] || 0) < item.cost) {
            return res.status(400).json({ error: `Not enough ${item.currency}` });
        }

        // Deduct cost
        userData[item.currency] -= item.cost;

        // Send trainers to mail
        if (!userData.mail) userData.mail = [];
        for (let i = 0; i < item.qty; i++) {
            userData.mail.push({
                id: Math.random().toString(36).slice(2, 10),
                type: 'trainer',
                trainerName: item.trainerName,
                exp: item.exp,
                date: new Date().toISOString().slice(0, 10),
                title: 'Shop Purchase',
                message: `You purchased a ${item.trainerName}!`
            });
        }

        setUserData(req.user.id, userData);

        res.json({ success: true, qty: item.qty, newBalance: { gp: userData.gp, eCoins: userData.eCoins } });
    } catch (error) {
        console.error('Shop error:', error);
        res.status(500).json({ error: 'Failed to process purchase' });
    }
});

// ====== DAILY PENALTY PATH SYSTEM ======
const START_STEPS = 35;
const ON_SCORE = 8;
const ON_MISS = 4;
const ECOIN_MILESTONE = 19;

function todayKey() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

function ensurePenaltyState(userData) {
    if (!userData.minigames) userData.minigames = {};
    if (!userData.minigames.penalty) {
        userData.minigames.penalty = {
            date: '',
            lastPlay: '',
            remaining: START_STEPS,
            milestones: {}
        };
    }
    return userData.minigames.penalty;
}

// Get penalty status
app.get('/api/penalty/status', isAuthenticated, (req, res) => {
    try {
        const userData = getUserData(req.user.id);
        const state = ensurePenaltyState(userData);

        // Reset milestones if new day
        const today = todayKey();
        if (state.date !== today) {
            state.date = today;
            state.milestones = {};
            setUserData(req.user.id, userData);
        }

        res.json({ success: true, state });
    } catch (error) {
        console.error('Penalty status error:', error);
        res.status(500).json({ error: 'Failed to get penalty status' });
    }
});

// Shoot penalty
app.post('/api/penalty/shoot', isAuthenticated, (req, res) => {
    try {
        const { direction } = req.body;
        const userData = getUserData(req.user.id);
        const state = ensurePenaltyState(userData);
        const today = todayKey();

        // Reset milestones if new day
        if (state.date !== today) {
            state.date = today;
            state.milestones = {};
        }

        // Check if already played today
        if (state.lastPlay === today) {
            return res.json({ success: false, message: 'You already shot today!' });
        }

        // Determine keeper direction
        const directions = ['left', 'center', 'right'];
        const keeperDirection = directions[Math.floor(Math.random() * 3)];
        const scored = direction !== keeperDirection;

        // Calculate progress
        const delta = scored ? ON_SCORE : ON_MISS;
        const oldRemaining = state.remaining;
        state.remaining = Math.max(0, state.remaining - delta);
        const newRemaining = state.remaining;
        state.lastPlay = today;

        const rewards = [];

        // Check milestone: 50 eCoins at position 19
        if (oldRemaining > ECOIN_MILESTONE && newRemaining <= ECOIN_MILESTONE && !state.milestones.ecoin19) {
            if (!userData.mail) userData.mail = [];
            userData.mail.push({
                id: Math.random().toString(36).slice(2, 10),
                type: 'eCoins',
                amount: 50,
                date: today,
                title: 'Daily Game Milestone',
                message: 'You passed step 19 in Daily Game!'
            });
            state.milestones.ecoin19 = true;
            rewards.push('+50 eCoins');
        }

        // Give +500 GP for landing position (35-20 or 18-1)
        if ((newRemaining <= 35 && newRemaining >= 20) || (newRemaining <= 18 && newRemaining >= 1)) {
            state.milestones.gp = state.milestones.gp || {};
            if (!state.milestones.gp[newRemaining]) {
                if (!userData.mail) userData.mail = [];
                userData.mail.push({
                    id: Math.random().toString(36).slice(2, 10),
                    type: 'gp',
                    amount: 500,
                    date: today,
                    title: 'Daily Game Step Reward',
                    message: `You landed on step ${newRemaining}!`
                });
                state.milestones.gp[newRemaining] = true;
                rewards.push('+500 GP');
            }
        }

        // Final reward at 0
        if (newRemaining === 0) {
            const roll = Math.random();
            let finalReward = '';

            if (roll < 0.006) {
                // 0.6% chance: S+ Trainer
                userData.mail.push({
                    id: Math.random().toString(36).slice(2, 10),
                    type: 'trainer',
                    trainerName: 'S+ Trainer',
                    exp: 1000000,
                    date: today,
                    title: '🎉 Daily Game Complete!',
                    message: 'Ultra Rare Reward: S+ Trainer!'
                });
                finalReward = '🧑‍🏫 S+ Trainer (1M EXP)';
            } else if (roll < 0.34) {
                // 33.4% chance: Random pack
                const rarities = ['Iconic', 'Legend', 'Black'];
                const r = rarities[Math.floor(Math.random() * rarities.length)];
                userData.mail.push({
                    id: Math.random().toString(36).slice(2, 10),
                    type: 'pack',
                    rarity: r,
                    date: today,
                    title: '🎉 Daily Game Complete!',
                    message: `You earned a ${r} Pack!`
                });
                finalReward = `📦 ${r} Pack`;
            } else if (roll < 0.67) {
                // 33% chance: 100 eCoins
                userData.mail.push({
                    id: Math.random().toString(36).slice(2, 10),
                    type: 'eCoins',
                    amount: 100,
                    date: today,
                    title: '🎉 Daily Game Complete!',
                    message: 'You earned 100 eCoins!'
                });
                finalReward = '🪙 100 eCoins';
            } else {
                // 33% chance: 5000 GP
                userData.mail.push({
                    id: Math.random().toString(36).slice(2, 10),
                    type: 'gp',
                    amount: 5000,
                    date: today,
                    title: '🎉 Daily Game Complete!',
                    message: 'You earned 5,000 GP!'
                });
                finalReward = '💰 5,000 GP';
            }

            rewards.push(`🎁 Final: ${finalReward}`);

            // Reset path for next cycle
            state.remaining = START_STEPS;
        }

        setUserData(req.user.id, userData);

        res.json({
            success: true,
            scored,
            direction,
            keeperDirection,
            delta,
            oldRemaining,
            newRemaining: state.remaining,
            rewards,
            state
        });
    } catch (error) {
        console.error('Penalty shoot error:', error);
        res.status(500).json({ error: 'Failed to process penalty' });
    }
});

// Legacy penalty endpoint (kept for backwards compatibility)
app.post('/api/penalty', isAuthenticated, (req, res) => {
    try {
        const { score } = req.body;
        const opponentScore = Math.floor(Math.random() * 6);

        let outcome = 'loss';
        let reward = { gp: 1000, eCoins: 3 };

        if (score > opponentScore) {
            outcome = 'win';
            reward = { gp: 5000, eCoins: 15 };
        } else if (score === opponentScore) {
            outcome = 'draw';
            reward = { gp: 2500, eCoins: 7 };
        }

        let userData = getUserData(req.user.id);
        if (!userData) {
            userData = { id: req.user.id, gp: 0, eCoins: 0 };
        }
        userData.gp = (userData.gp || 0) + reward.gp;
        userData.eCoins = (userData.eCoins || 0) + reward.eCoins;

        setUserData(req.user.id, userData);

        res.json({ success: true, outcome, opponentScore, reward, newBalance: { gp: userData.gp, eCoins: userData.eCoins } });
    } catch (error) {
        console.error('Penalty error:', error);
        res.status(500).json({ error: 'Failed to process penalty shootout' });
    }
});

// ====== ADMIN PANEL ======

// Admin email whitelist
const ADMIN_EMAILS = ['pijiiies@gmail.com'];

// Admin authentication middleware
function isAdmin(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const userEmail = req.user.email?.toLowerCase();
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
        return res.status(403).json({ error: 'Admin access denied' });
    }
    return next();
}

// Admin page route (hidden - direct URL access only)
app.get('/admin', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Get user by ID or email (admin only)
app.get('/api/admin/user/:search', isAdmin, (req, res) => {
    try {
        const search = req.params.search.toLowerCase();
        const dataDir = path.join(__dirname, 'data');
        const users = loadAllUsers(dataDir);

        const user = users.find(u =>
            u.id === search ||
            u.id === req.params.search ||
            (u.email && u.email.toLowerCase() === search)
        );

        if (!user) {
            return res.json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error('Admin user search error:', error);
        res.status(500).json({ error: 'Failed to search user' });
    }
});

// List all users (admin only)
app.get('/api/admin/users', isAdmin, (req, res) => {
    try {
        const dataDir = path.join(__dirname, 'data');
        const users = loadAllUsers(dataDir);
        res.json({ success: true, users });
    } catch (error) {
        console.error('Admin users list error:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

// Give currency to user (admin only)
app.post('/api/admin/give-currency', isAdmin, (req, res) => {
    try {
        const { userId, currencyType, amount } = req.body;

        if (!userId || !currencyType || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let userData = getUserData(userId);
        if (!userData) {
            userData = { id: userId, gp: 0, eCoins: 0, players: [], squad: { main: [], bench: [] } };
        }

        if (currencyType === 'gp') {
            userData.gp = (userData.gp || 0) + parseInt(amount);
        } else if (currencyType === 'eCoins') {
            userData.eCoins = (userData.eCoins || 0) + parseInt(amount);
        } else {
            return res.status(400).json({ error: 'Invalid currency type' });
        }

        setUserData(userId, userData);
        res.json({ success: true, newBalance: { gp: userData.gp, eCoins: userData.eCoins } });
    } catch (error) {
        console.error('Admin give currency error:', error);
        res.status(500).json({ error: 'Failed to give currency' });
    }
});

// Add player to user collection (admin only)
app.post('/api/admin/add-player', isAdmin, (req, res) => {
    try {
        const { userId, player } = req.body;

        if (!userId || !player) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let userData = getUserData(userId);
        if (!userData) {
            userData = { id: userId, gp: 0, eCoins: 0, players: [], squad: { main: [], bench: [] } };
        }

        if (!userData.players) userData.players = [];

        // Create new player entry with unique ID
        const newPlayer = {
            id: Math.random().toString(36).slice(2, 10),
            name: player.name,
            position: player.position,
            rarity: player.rarity,
            overall: player.overall,
            stats: player.stats || {},
            playingStyle: player.playingStyle,
            club: player.club,
            level: 1,
            exp: 0
        };

        userData.players.push(newPlayer);
        setUserData(userId, userData);

        res.json({ success: true, player: newPlayer });
    } catch (error) {
        console.error('Admin add player error:', error);
        res.status(500).json({ error: 'Failed to add player' });
    }
});

// Send mail to user(s) (admin only)
app.post('/api/admin/send-mail', isAdmin, (req, res) => {
    try {
        const { userId, title, message, rewards } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Missing title or message' });
        }

        const mailItem = {
            id: Math.random().toString(36).slice(2, 10),
            title: title,
            message: message,
            rewards: rewards || {},
            date: new Date().toISOString().slice(0, 10),
            claimed: false
        };

        if (userId) {
            // Send to specific user
            let userData = getUserData(userId);
            if (!userData) {
                return res.status(404).json({ error: 'User not found' });
            }
            if (!userData.mail) userData.mail = [];
            userData.mail.unshift(mailItem);
            setUserData(userId, userData);
            res.json({ success: true, sentTo: 1 });
        } else {
            // Broadcast to all users
            const dataDir = path.join(__dirname, 'data');
            const users = loadAllUsers(dataDir);
            let count = 0;

            users.forEach(user => {
                if (!user.mail) user.mail = [];
                user.mail.unshift({ ...mailItem, id: Math.random().toString(36).slice(2, 10) });
                setUserData(user.id, user);
                count++;
            });

            res.json({ success: true, sentTo: count });
        }
    } catch (error) {
        console.error('Admin send mail error:', error);
        res.status(500).json({ error: 'Failed to send mail' });
    }
});

// Create news (admin only)
app.post('/api/admin/news', isAdmin, (req, res) => {
    try {
        const { title, content, category } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Missing title or content' });
        }

        const newsFile = path.join(__dirname, 'news.json');
        let newsData = [];

        if (fs.existsSync(newsFile)) {
            try {
                newsData = JSON.parse(fs.readFileSync(newsFile, 'utf8'));
                if (!Array.isArray(newsData)) newsData = [];
            } catch (e) {
                newsData = [];
            }
        }

        const newsItem = {
            id: Math.random().toString(36).slice(2, 10),
            title: title,
            content: content,
            category: category || 'update',
            date: new Date().toISOString().slice(0, 10),
            createdAt: new Date().toISOString()
        };

        newsData.unshift(newsItem);
        fs.writeFileSync(newsFile, JSON.stringify(newsData, null, 2));

        res.json({ success: true, news: newsItem });
    } catch (error) {
        console.error('Admin create news error:', error);
        res.status(500).json({ error: 'Failed to create news' });
    }
});

// Delete news (admin only)
app.delete('/api/admin/news/:id', isAdmin, (req, res) => {
    try {
        const newsId = req.params.id;
        const newsFile = path.join(__dirname, 'news.json');

        if (!fs.existsSync(newsFile)) {
            return res.status(404).json({ error: 'No news found' });
        }

        let newsData = JSON.parse(fs.readFileSync(newsFile, 'utf8'));
        if (!Array.isArray(newsData)) {
            return res.status(404).json({ error: 'No news found' });
        }

        const index = newsData.findIndex(n => n.id === newsId);
        if (index === -1) {
            return res.status(404).json({ error: 'News not found' });
        }

        newsData.splice(index, 1);
        fs.writeFileSync(newsFile, JSON.stringify(newsData, null, 2));

        res.json({ success: true });
    } catch (error) {
        console.error('Admin delete news error:', error);
        res.status(500).json({ error: 'Failed to delete news' });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/ping', (req, res) => {
    res.send('pong');
});

// Helper functions
function calculateTeamStrength(userData) {
    if (!userData.squad?.main) return 0;
    let total = 0;
    userData.squad.main.forEach(playerId => {
        if (playerId) {
            const player = userData.players?.find(p => p.id === playerId);
            if (player) total += player.overall || 0;
        }
    });
    return Math.round(total / 11) || 0;
}

function calculateUserStrength(userData) {
    const players = userData.players || [];
    if (players.length === 0) return 0;
    const sum = players.reduce((a, p) => a + (p.overall || 0), 0);
    return Math.round(sum / Math.min(players.length, 11));
}

function loadAllUsers(dataDir) {
    const users = [];
    if (!fs.existsSync(dataDir)) return users;

    fs.readdirSync(dataDir).forEach(file => {
        if (file.endsWith('.json')) {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
                if (data && data.id) users.push(data);
            } catch (e) { }
        }
    });
    return users;
}

function simulateMatch(playerStrength, opponentStrength) {
    const diff = playerStrength - opponentStrength;
    const winChance = Math.min(0.8, Math.max(0.2, 0.5 + (diff * 0.02)));
    const drawChance = 0.2;

    const rand = Math.random();
    if (rand < winChance) return { outcome: 'win', score: `${Math.floor(Math.random() * 3) + 1}-0` };
    if (rand < winChance + drawChance) return { outcome: 'draw', score: '1-1' };
    return { outcome: 'loss', score: `0-${Math.floor(Math.random() * 3) + 1}` };
}

// ========================================
// DAILY PENALTY SHOOTOUT API
// ========================================

const DAILY_PENALTY_CONFIG = {
    TOTAL_STEPS: 40,
    STEPS_ON_GOAL: 6,
    STEPS_ON_MISS: 4,
    RESET_HOUR_UTC: 2, // Reset at 02:00 UTC
    // Checkpoint rewards: step -> reward
    CHECKPOINTS: {
        5: { type: 'trainer', name: 'Training Item', icon: '🟢' },
        10: { type: 'gp', amount: 1000, name: '+1000 GP', icon: '🔵' },
        15: { type: 'trainer', name: 'Training Item', icon: '🟢' },
        20: { type: 'gp', amount: 2000, name: '+2000 GP', icon: '🔵' },
        25: { type: 'trainer', name: 'Training Item', icon: '🟢' },
        30: { type: 'gp', amount: 3000, name: '+3000 GP', icon: '🔵' },
        35: { type: 'trainer', name: 'Training Item', icon: '🟢' },
        40: { type: 'pack', name: 'Free Black Pack', icon: '⚽' }
    }
};

function getDailyPenaltyResetTime() {
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(DAILY_PENALTY_CONFIG.RESET_HOUR_UTC, 0, 0, 0);
    if (now >= resetTime) {
        resetTime.setUTCDate(resetTime.getUTCDate() + 1);
    }
    return resetTime;
}

function canKickToday(lastKickTime) {
    if (!lastKickTime) return true;
    const lastKick = new Date(lastKickTime);
    const now = new Date();

    // Get today's reset time (02:00 UTC)
    const todayReset = new Date(now);
    todayReset.setUTCHours(DAILY_PENALTY_CONFIG.RESET_HOUR_UTC, 0, 0, 0);

    // If we haven't passed today's reset yet, use yesterday's reset
    if (now < todayReset) {
        todayReset.setUTCDate(todayReset.getUTCDate() - 1);
    }

    return lastKick < todayReset;
}

function calculateGKDive(history = []) {
    const directions = ['left', 'center', 'right'];
    if (history.length === 0) {
        return directions[Math.floor(Math.random() * 3)];
    }

    const lastDive = history[history.length - 1];
    // 70% chance to dive different direction
    if (Math.random() < 0.7) {
        const others = directions.filter(d => d !== lastDive);
        return others[Math.floor(Math.random() * others.length)];
    }
    return lastDive;
}

function ensureDailyPenaltyState(userData) {
    if (!userData.dailyPenalty) {
        userData.dailyPenalty = {
            lastKickTime: null,
            lapPosition: 0,
            gkDiveHistory: [],
            claimedRewards: {}
        };
    }
    return userData.dailyPenalty;
}

// GET Daily Penalty Status
app.get('/api/dailypenalty/status', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        const userData = getUserData(userId);

        if (!userData) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const state = ensureDailyPenaltyState(userData);
        const canKick = canKickToday(state.lastKickTime);
        const nextReset = getDailyPenaltyResetTime();
        const timeUntilReset = nextReset - new Date();

        res.json({
            success: true,
            state: {
                lapPosition: state.lapPosition,
                claimedRewards: state.claimedRewards,
                lastKickTime: state.lastKickTime
            },
            canKick,
            nextResetTime: nextReset.toISOString(),
            timeUntilReset: Math.max(0, Math.floor(timeUntilReset / 1000)),
            checkpoints: DAILY_PENALTY_CONFIG.CHECKPOINTS,
            totalSteps: DAILY_PENALTY_CONFIG.TOTAL_STEPS
        });
    } catch (error) {
        console.error('Daily penalty status error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST Kick Daily Penalty
app.post('/api/dailypenalty/kick', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        const { direction } = req.body;

        if (!['left', 'center', 'right'].includes(direction)) {
            return res.status(400).json({ success: false, message: 'Invalid direction' });
        }

        const userData = getUserData(userId);
        if (!userData) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const state = ensureDailyPenaltyState(userData);

        // Check if can kick today
        if (!canKickToday(state.lastKickTime)) {
            return res.json({
                success: false,
                message: 'Already kicked today. Come back after reset!',
                nextResetTime: getDailyPenaltyResetTime().toISOString()
            });
        }

        // Calculate GK dive direction
        const gkDirection = calculateGKDive(state.gkDiveHistory);

        // Determine if goal or save
        const scored = direction !== gkDirection;
        const stepsGained = scored ?
            DAILY_PENALTY_CONFIG.STEPS_ON_GOAL :
            DAILY_PENALTY_CONFIG.STEPS_ON_MISS;

        // Update lap position
        const oldPosition = state.lapPosition;
        state.lapPosition += stepsGained;

        // Check for rewards at each step passed
        const rewards = [];
        for (let step = oldPosition + 1; step <= state.lapPosition && step <= DAILY_PENALTY_CONFIG.TOTAL_STEPS; step++) {
            const checkpoint = DAILY_PENALTY_CONFIG.CHECKPOINTS[step];
            if (checkpoint && !state.claimedRewards[step]) {
                state.claimedRewards[step] = true;
                rewards.push({ step, ...checkpoint });

                // Apply reward
                if (checkpoint.type === 'gp') {
                    userData.gp = (userData.gp || 0) + checkpoint.amount;
                } else if (checkpoint.type === 'trainer') {
                    if (!userData.inventory) userData.inventory = {};
                    if (!userData.inventory.trainers) userData.inventory.trainers = {};
                    userData.inventory.trainers['S+'] = (userData.inventory.trainers['S+'] || 0) + 1;
                } else if (checkpoint.type === 'pack') {
                    if (!userData.inventory) userData.inventory = { freePacks: { Iconic: 0, Legend: 0, Black: 0 } };
                    if (!userData.inventory.freePacks) userData.inventory.freePacks = { Iconic: 0, Legend: 0, Black: 0 };
                    userData.inventory.freePacks.Black = (userData.inventory.freePacks.Black || 0) + 1;
                }
            }
        }

        // Check for lap completion
        let lapCompleted = false;
        if (state.lapPosition >= DAILY_PENALTY_CONFIG.TOTAL_STEPS) {
            lapCompleted = true;
            state.lapPosition = 0;
            state.claimedRewards = {}; // Reset for new lap
        }

        // Update GK history (keep last 3)
        state.gkDiveHistory.push(gkDirection);
        if (state.gkDiveHistory.length > 3) {
            state.gkDiveHistory.shift();
        }

        // Update last kick time
        state.lastKickTime = new Date().toISOString();

        // Save user data
        setUserData(userId, userData);

        res.json({
            success: true,
            scored,
            playerDirection: direction,
            gkDirection,
            stepsGained,
            newPosition: state.lapPosition,
            rewards,
            lapCompleted,
            nextResetTime: getDailyPenaltyResetTime().toISOString()
        });
    } catch (error) {
        console.error('Daily penalty kick error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔐 Login URL: http://localhost:${PORT}/auth/google`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    process.exit(0);
});
