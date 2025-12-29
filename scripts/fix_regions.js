const fs = require('fs');

const FILE_PATH = 'players.json';

// Static Mapping for Regions
const REGION_MAP = {
    // Europe
    "Albania": "Europe", "Andorra": "Europe", "Armenia": "Europe", "Austria": "Europe", "Azerbaijan": "Europe",
    "Belarus": "Europe", "Belgium": "Europe", "Bosnia and Herzegovina": "Europe", "Bulgaria": "Europe",
    "Croatia": "Europe", "Cyprus": "Europe", "Czech Republic": "Europe", "Denmark": "Europe", "England": "Europe",
    "Estonia": "Europe", "Faroe Islands": "Europe", "Finland": "Europe", "France": "Europe", "Georgia": "Europe",
    "Germany": "Europe", "Gibraltar": "Europe", "Greece": "Europe", "Hungary": "Europe", "Iceland": "Europe",
    "Ireland": "Europe", "Italy": "Europe", "Kazakhstan": "Europe", "Kosovo": "Europe", "Latvia": "Europe",
    "Liechtenstein": "Europe", "Lithuania": "Europe", "Luxembourg": "Europe", "Malta": "Europe", "Moldova": "Europe",
    "Montenegro": "Europe", "Netherlands": "Europe", "North Macedonia": "Europe", "Northern Ireland": "Europe",
    "Norway": "Europe", "Poland": "Europe", "Portugal": "Europe", "Romania": "Europe", "Russia": "Europe",
    "San Marino": "Europe", "Scotland": "Europe", "Serbia": "Europe", "Slovakia": "Europe", "Slovenia": "Europe",
    "Spain": "Europe", "Sweden": "Europe", "Switzerland": "Europe", "Turkey": "Europe", "Ukraine": "Europe",
    "Wales": "Europe", "Israel": "Europe",

    // South America
    "Argentina": "South America", "Bolivia": "South America", "Brazil": "South America", "Chile": "South America",
    "Colombia": "South America", "Ecuador": "South America", "Paraguay": "South America", "Peru": "South America",
    "Uruguay": "South America", "Venezuela": "South America",

    // North & Central America
    "Antigua and Barbuda": "North & Central America", "Barbados": "North & Central America", "Canada": "North & Central America",
    "Costa Rica": "North & Central America", "Cuba": "North & Central America", "Curacao": "North & Central America",
    "Dominican Republic": "North & Central America", "El Salvador": "North & Central America", "Grenada": "North & Central America",
    "Guatemala": "North & Central America", "Haiti": "North & Central America", "Honduras": "North & Central America",
    "Jamaica": "North & Central America", "Mexico": "North & Central America", "Panama": "North & Central America",
    "Saint Kitts and Nevis": "North & Central America", "Trinidad and Tobago": "North & Central America",
    "United States": "North & Central America", "USA": "North & Central America",

    // Africa
    "Algeria": "Africa", "Angola": "Africa", "Benin": "Africa", "Burkina Faso": "Africa", "Burundi": "Africa",
    "Cameroon": "Africa", "Cape Verde": "Africa", "Central African Republic": "Africa", "Comoros": "Africa",
    "Congo": "Africa", "DR Congo": "Africa", "Ivory Coast": "Africa", "Côte d'Ivoire": "Africa", "Egypt": "Africa",
    "Equatorial Guinea": "Africa", "Gabon": "Africa", "Gambia": "Africa", "Ghana": "Africa", "Guinea": "Africa",
    "Guinea-Bissau": "Africa", "Kenya": "Africa", "Liberia": "Africa", "Libya": "Africa", "Madagascar": "Africa",
    "Malawi": "Africa", "Mali": "Africa", "Mauritania": "Africa", "Morocco": "Africa", "Mozambique": "Africa",
    "Namibia": "Africa", "Nigeria": "Africa", "Rwanda": "Africa", "Sao Tome and Principe": "Africa", "Senegal": "Africa",
    "Sierra Leone": "Africa", "South Africa": "Africa", "Sudan": "Africa", "Tanzania": "Africa", "Togo": "Africa",
    "Tunisia": "Africa", "Uganda": "Africa", "Zambia": "Africa", "Zimbabwe": "Africa",
    "Cote d'Ivoire": "Africa", // Manual Fix

    // Asia-Oceania
    "Afghanistan": "Asia-Oceania", "Australia": "Asia-Oceania", "Bahrain": "Asia-Oceania", "China": "Asia-Oceania",
    "Fiji": "Asia-Oceania", "India": "Asia-Oceania", "Indonesia": "Asia-Oceania", "Iran": "Asia-Oceania",
    "Iraq": "Asia-Oceania", "Japan": "Asia-Oceania", "Jordan": "Asia-Oceania", "Kuwait": "Asia-Oceania",
    "Kyrgyzstan": "Asia-Oceania", "Lebanon": "Asia-Oceania", "Malaysia": "Asia-Oceania", "New Zealand": "Asia-Oceania",
    "North Korea": "Asia-Oceania", "Oman": "Asia-Oceania", "Palestine": "Asia-Oceania", "Philippines": "Asia-Oceania",
    "Qatar": "Asia-Oceania", "Saudi Arabia": "Asia-Oceania", "South Korea": "Asia-Oceania", "Syria": "Asia-Oceania",
    "Tajikistan": "Asia-Oceania", "Thailand": "Asia-Oceania", "Turkmenistan": "Asia-Oceania", "United Arab Emirates": "Asia-Oceania",
    "Uzbekistan": "Asia-Oceania", "Vietnam": "Asia-Oceania"
};

function getRegion(nation) {
    if (!nation) return "World";
    if (REGION_MAP[nation]) return REGION_MAP[nation];

    // Fuzzy matching or common variations
    if (nation === "Korea Republic") return "Asia-Oceania";
    if (nation === "USA") return "North & Central America";
    return "World";
}

// Main Execution
try {
    console.log("📂 Reading players.json...");
    const rawData = fs.readFileSync(FILE_PATH, 'utf8');
    const players = JSON.parse(rawData);

    let updatedCount = 0;

    players.forEach(p => {
        if (p.nationality && p.region === "Unknown") {
            const newRegion = getRegion(p.nationality);
            if (newRegion !== "Unknown") {
                p.region = newRegion;
                updatedCount++;
            }
        } else if (p.nationality && !p.region) {
            const newRegion = getRegion(p.nationality);
            if (newRegion !== "Unknown") {
                p.region = newRegion;
                updatedCount++;
            }
        }
    });

    fs.writeFileSync(FILE_PATH, JSON.stringify(players, null, 2));
    console.log(`✅ Success! Updated region for ${updatedCount} players.`);

} catch (err) {
    console.error("❌ Error:", err);
}
