const fs = require('fs');
const players = JSON.parse(fs.readFileSync('players_updated.json', 'utf8'));
const nations = new Set(players.map(p => p.nationality));
console.log([...nations].sort().join('\n'));
