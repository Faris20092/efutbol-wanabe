const fs = require('fs');
const path = require('path');

const playersPath = path.join(__dirname, '../players.json');

try {
    const rawData = fs.readFileSync(playersPath, 'utf8');
    const players = JSON.parse(rawData);

    console.log(`Loaded ${players.length} players. Updating rarities...`);

    let stats = {
        Iconic: 0,
        Legend: 0,
        Black: 0,
        Gold: 0,
        Silver: 0,
        Bronze: 0,
        White: 0
    };

    const updatedPlayers = players.map(p => {
        const rating = p.overall_rating || 60;
        let rarity = 'White';

        // 1. High Tier (Based on previous logic)
        if (rating >= 90) rarity = 'Iconic';
        else if (rating >= 86) rarity = 'Legend';

        // 2. Black (77-85) vs Gold (74-79) -> Overlap 77-79
        else if (rating >= 80 && rating <= 85) {
            rarity = 'Black';
        }
        else if (rating >= 77 && rating <= 79) {
            // Overlap Zone: Black or Gold
            // User requested "some are gold or black"
            // Let's go 60% Gold, 40% Black for this lower tier of Black
            rarity = Math.random() < 0.4 ? 'Black' : 'Gold';
        }

        // 3. Gold (74-79) vs Silver (70-76) -> Overlap 74-76
        // Note: We already handled >76 above. Now handling <= 76.
        else if (rating > 76 && rating < 77) {
            // Should theoretically be Gold if range is 74-79
            rarity = 'Gold';
        }
        else if (rating >= 74 && rating <= 76) {
            // Overlap Zone: Gold or Silver
            rarity = Math.random() < 0.4 ? 'Gold' : 'Silver';
        }

        // 4. Silver (70-76) vs Bronze (65-72) -> Overlap 70-72
        // We already handled >= 74 above.
        // Range 73-73 is Pure Silver?
        else if (rating === 73) {
            rarity = 'Silver';
        }
        else if (rating >= 70 && rating <= 72) {
            // Overlap Zone: Silver or Bronze
            rarity = Math.random() < 0.4 ? 'Silver' : 'Bronze';
        }

        // 5. Bronze (65-72) vs White (47-66) -> Overlap 65-66
        // We already handled >= 70.
        // Range 67-69 is Pure Bronze
        else if (rating >= 67 && rating <= 69) {
            rarity = 'Bronze';
        }
        else if (rating >= 65 && rating <= 66) {
            // Overlap Zone: Bronze or White
            rarity = Math.random() < 0.4 ? 'Bronze' : 'White';
        }

        // 6. White (< 65)
        else {
            rarity = 'White';
        }

        stats[rarity]++;
        return { ...p, rarity };
    });

    fs.writeFileSync(playersPath, JSON.stringify(updatedPlayers, null, 2));
    console.log('Success! Updated rarities:');
    console.table(stats);

} catch (err) {
    console.error('Error:', err);
}
