const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://pesdb.net/efootball/?featured=0';
const FILE_PATH = 'players.json';

// Static Mapping for Regions (to ensure 100% success even if UI column fails)
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
    return REGION_MAP[nation] || "World";
}

(async () => {
    // 1. READ PLAYERS to get list of IDs we need (Optimization: only fetch what we need? No, difficult to query PESDB by ID batch)
    // We will scrape ALL pages to be safe.

    console.log("📂 Reading players.json...");
    let players = [];
    try {
        const fileContent = fs.readFileSync(FILE_PATH, 'utf8');
        players = JSON.parse(fileContent);
        console.log(`✅ Loaded ${players.length} players locally.`);
    } catch (e) {
        console.error("❌ Failed to read players.json", e);
        process.exit(1);
    }

    // 2. LAUNCH BRAVE BROWSER
    const browserPath = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
    console.log(`🚀 Launching Brave Browser...`);

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: browserPath,
        args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: null
    });
    const page = await browser.newPage();

    // 3. ENABLE COLUMNS (Nationality AND Region)
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    try {
        const settingsBtn = await page.waitForSelector('xpath/.//button[contains(text(), "Settings")]', { timeout: 5000 });
        await settingsBtn.click();
        await new Promise(r => setTimeout(r, 1000));

        const items = ["Nationality", "Region", "Playing Style"];
        for (const item of items) {
            const [label] = await page.$x(`//label[contains(text(), "${item}")]`);
            if (label) await label.click();
            await new Promise(r => setTimeout(r, 500));
        }

        const okBtn = await page.$x('//button[contains(text(), "OK")]');
        if (okBtn.length > 0) await okBtn[0].click();
        await new Promise(r => setTimeout(r, 2000));
        console.log("✅ Nationality, Region & Playing Style columns enabled.");
    } catch (e) {
        console.log("⚠️ Settings issue. Might already be enabled or failed. Proceeding...");
    }

    // 4. ITERATE PAGES
    const nationMap = new Map();
    let pageNum = 359;
    let keepGoing = true;
    let emptyPagesCount = 0;

    while (keepGoing) {
        // Construct URL directly to be robust
        const pageUrl = `${BASE_URL}&page=${pageNum}`;
        console.log(`📄 Scraping Page ${pageNum}... (${nationMap.size} found so far)`);

        // RATE LIMIT HANDLING: Conservative 6s-10s delay to avoid "Too Many Requests"
        const delay = 6000 + Math.floor(Math.random() * 15000);
        console.log(`⏳ Waiting ${Math.round(delay / 1000)}s...`);
        await new Promise(r => setTimeout(r, delay));

        await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });

        // Wait for table or detect "Too Many Requests"
        try {
            // Check for HTTP error text in body just in case
            const bodyText = await page.evaluate(() => document.body.innerText);
            if (bodyText.includes("Too Many Requests")) {
                console.log("🛑 Rate limited! Waiting 60 seconds to cool down...");
                await new Promise(r => setTimeout(r, 30000));
                continue; // Retry same page
            }

            await page.waitForSelector('.players tr', { timeout: 10000 });
        } catch (e) {
            console.log("⚠️ No table found. Possibly end of list or blocked.");
            // Determine if end of list or error
            const isBlocked = await page.evaluate(() => document.body.innerText.includes("403") || document.body.innerText.includes("block"));
            if (isBlocked) {
                console.log("🛑 Blocked! Waiting 60s...");
                await new Promise(r => setTimeout(r, 30000));
                continue;
            }

            emptyPagesCount++;
            if (emptyPagesCount > 2) {
                keepGoing = false;
                break;
            }
            pageNum++;
            continue;
        }

        // Scrape
        const newData = await page.$$eval('.players tr', (rows) => {
            if (rows.length === 0) return [];
            const headerRow = rows[0].parentElement.querySelector('th') ? rows[0].parentElement.querySelectorAll('th') : null;
            if (!headerRow) return [];

            const headers = Array.from(headerRow).map(th => th.innerText.trim());
            const nationIdx = headers.findIndex(h => h.includes('Nationality'));
            const regionIdx = headers.findIndex(h => h.includes('Region'));
            const styleIdx = headers.findIndex(h => h.includes('Playing Style'));
            const nameIdx = headers.findIndex(h => h.includes('Player Name'));

            if (nationIdx === -1) return [];

            return Array.from(rows).map(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length === 0) return null;

                const link = cells[nameIdx]?.querySelector('a')?.href;
                const id = link ? link.split('id=')[1] : null;
                const nation = cells[nationIdx]?.innerText.trim();
                const region = regionIdx !== -1 ? cells[regionIdx]?.innerText.trim() : "Unknown";
                const style = styleIdx !== -1 ? cells[styleIdx]?.innerText.trim() : "No Style";

                return { id, nation, region, style };
            }).filter(x => x && x.id && x.nation);
        });

        if (newData.length > 0) {
            emptyPagesCount = 0;
            let pageUpdates = 0;

            newData.forEach(d => {
                nationMap.set(d.id, { n: d.nation, r: d.region, s: d.style });

                // INCREMENTAL UPDATE: Find and update player immediately
                const playerIndex = players.findIndex(p => p.id.toString() === d.id);
                if (playerIndex !== -1) {
                    players[playerIndex].nationality = d.nation;
                    players[playerIndex].region = d.region;
                    players[playerIndex].playingStyle = d.style;
                    pageUpdates++;
                }
            });

            if (pageUpdates > 0) {
                // SAVE IMMEDIATELY
                try {
                    fs.writeFileSync(FILE_PATH, JSON.stringify(players, null, 2));
                    console.log(`   💾 Saved ${pageUpdates} updates to disk.`);
                } catch (err) {
                    console.error("   ❌ Error saving file:", err);
                }
            }
        }

        pageNum++;

        // Safety break
        if (pageNum > 1500) keepGoing = false; // Increased limit
    }

    await browser.close();
    console.log(`✅ Scraping done. Found ${nationMap.size} players in total.`);
    // Final save is already done incrementally, but one last check won't hurt


    fs.writeFileSync(FILE_PATH, JSON.stringify(updatedPlayers, null, 2));
    console.log(`💾 Saved ${updateCount} players to players.json`);

})();
