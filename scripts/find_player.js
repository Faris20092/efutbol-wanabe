const fs = require('fs');
const path = require('path');

const playersPath = path.join(__dirname, '../players.json');
const players = JSON.parse(fs.readFileSync(playersPath, 'utf8'));

const target = players.find(p => p.name.includes('Vipotnik') || p.original_name.includes('Vipotnik'));
console.log(JSON.stringify(target, null, 2));
