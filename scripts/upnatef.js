const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// ================= KONFIGURASI =================
const FILE_PATH = 'players.json';       // File database boss
const BASE_URL = 'https://efootballhub.net/efootball23/search/players?normalPlayer=true&GridView=false&page='; // FIX: Remove '1' at end
const START_PAGE = 1;
const MAX_PAGE = 70;  // <-- Reduced for testing, boss can increase. 1428 is A LOT.
// ===============================================

// MAPPING REGION (Auto set region based on country)
const REGION_MAP = {
    // ASIA & OCEANIA
    "Japan": "Asia-Oceania", "South Korea": "Asia-Oceania", "Thailand": "Asia-Oceania",
    "Malaysia": "Asia-Oceania", "Vietnam": "Asia-Oceania", "Indonesia": "Asia-Oceania",
    "China": "Asia-Oceania", "Australia": "Asia-Oceania", "Saudi Arabia": "Asia-Oceania",
    "Iran": "Asia-Oceania", "Qatar": "Asia-Oceania", "Uzbekistan": "Asia-Oceania", "Iraq": "Asia-Oceania",

    // EUROPE
    "England": "Europe", "France": "Europe", "Germany": "Europe", "Italy": "Europe",
    "Spain": "Europe", "Portugal": "Europe", "Netherlands": "Europe", "Belgium": "Europe",
    "Croatia": "Europe", "Denmark": "Europe", "Norway": "Europe", "Sweden": "Europe",
    "Poland": "Europe", "Turkey": "Europe", "Russia": "Europe", "Ukraine": "Europe",
    "Scotland": "Europe", "Wales": "Europe", "Serbia": "Europe", "Switzerland": "Europe",
    "Austria": "Europe", "Hungary": "Europe", "Czech Republic": "Europe", "Greece": "Europe",

    // SOUTH AMERICA
    "Brazil": "South America", "Argentina": "South America", "Uruguay": "South America",
    "Colombia": "South America", "Chile": "South America", "Ecuador": "South America",
    "Peru": "South America", "Paraguay": "South America", "Venezuela": "South America",

    // AFRICA
    "Nigeria": "Africa", "Senegal": "Africa", "Egypt": "Africa", "Morocco": "Africa",
    "Cameroon": "Africa", "Ghana": "Africa", "Ivory Coast": "Africa", "Algeria": "Africa",
    "Tunisia": "Africa", "Mali": "Africa", "South Africa": "Africa",

    // NORTH & CENTRAL AMERICA
    "USA": "North & Central America", "Mexico": "North & Central America",
    "Canada": "North & Central America", "Costa Rica": "North & Central America",
    "Jamaica": "North & Central America", "Panama": "North & Central America"
};

function getRegion(nation) {
    return REGION_MAP[nation] || "World";
}

(async () => {
    // 1. BACA DATABASE SEDIA ADA
    console.log("📂 Membaca players.json...");
    let players = [];
    try {
        players = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    } catch (e) {
        console.error("❌ Error: File players.json tak jumpa!");
        process.exit(1);
    }

    // Buat Set ID utk carian pantas
    const myPlayerIDs = new Set(players.map(p => p.id.toString()));
    console.log(`✅ Loaded: ${players.length} players dalam database.`);
    console.log(`🚀 Mula operasi update (Page ${START_PAGE} - ${MAX_PAGE})...`);

    // 2. LAUNCH BRAVE BROWSER
    const browserPath = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
    console.log(`🚀 Launching Brave Browser...`);

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: browserPath,
        args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // OPTIMIZATION: Block gambar berat, tapi LEPASKAN gambar bendera
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const url = req.url();
        const type = req.resourceType();
        // Kalau image, check URL dia. Kalau ada 'flag' atau 'nation', OK. Lain-lain BLOCK.
        if (type === 'image') {
            if (url.includes('flag') || url.includes('nation')) req.continue();
            else req.abort();
        } else if (type === 'font' || type === 'stylesheet') {
            req.abort(); // Jimat data
        } else {
            req.continue();
        }
    });

    // 3. LOOP PAGE
    let pageNum = START_PAGE;
    let totalUpdated = 0;

    while (pageNum <= MAX_PAGE) {
        console.log(`\n📄 Checking Page ${pageNum}...`);

        try {
            await page.goto(`${BASE_URL}${pageNum}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Tunggu table
            await page.waitForSelector('table tbody tr', { timeout: 15000 });

            // --- SCRAPING LOGIC ---
            const scrapedData = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('table tbody tr'));

                return rows.map(row => {
                    // A. AMBIL ID DARI LINK
                    const linkEl = row.querySelector('a[href*="/player/"]');
                    const href = linkEl ? linkEl.getAttribute('href') : '';
                    const id = href ? href.split('/').pop() : null;

                    if (!id) return null;

                    // B. AMBIL NEGARA (DARI TITLE BENDERA)
                    const flagImg = row.querySelector('img[src*="nation"], img[src*="flag"]');
                    const nation = flagImg ? (flagImg.getAttribute('title') || flagImg.getAttribute('alt')) : "Unknown";

                    // C. AMBIL POSITION & PLAYING STYLE
                    let position = "Unknown";
                    let style = "No Style";

                    // Text biasa ada dlm cell yg sama dgn Nama atau sebelah
                    // eHub format: Cell ada nama, bawah nama ada "LWF Roaming Flank"
                    const nameCell = linkEl.closest('td');
                    if (nameCell) {
                        const text = nameCell.innerText;
                        // Contoh output text: "Vinicius Junior\nLWF Roaming Flank"
                        const lines = text.split('\n');

                        if (lines.length > 1) {
                            const details = lines[1].trim().split(' '); // ["LWF", "Roaming", "Flank"]
                            if (details.length > 0) {
                                position = details[0]; // "LWF"

                                // Gabung baki jadi style: "Roaming Flank"
                                if (details.length > 1) {
                                    style = details.slice(1).join(' ');
                                }
                            }
                        }
                    }

                    return { id, nation, position, style };
                }).filter(p => p !== null);
            });
            // --- END SCRAPING ---

            // 4. MATCHING & UPDATING
            let pageMatches = 0;
            scrapedData.forEach(data => {
                // Check ID: Kita hanya update player yg boss dah ada
                if (myPlayerIDs.has(data.id)) {
                    let player = players.find(p => p.id.toString() === data.id);
                    if (player) {
                        // Masukkan data baru
                        player.nationality = data.nation;
                        player.region = getRegion(data.nation); // Auto-region
                        player.position = data.position;
                        player.playing_style = data.style;

                        pageMatches++;
                        totalUpdated++;
                    }
                }
            });

            console.log(`   ✅ Jumpa: ${scrapedData.length} player. Update: ${pageMatches} orang kita.`);

            // 5. SAVE TERUS (Supaya selamat)
            if (pageMatches > 0) {
                fs.writeFileSync(FILE_PATH, JSON.stringify(players, null, 2));
                console.log(`   💾 Data saved! Total updated: ${totalUpdated}`);
            }

        } catch (e) {
            console.log(`   ⚠️  Error page ${pageNum} (Skip): ${e.message}`);
        }

        pageNum++;
        // Rehat 2-3 saat elak kena kick
        await new Promise(r => setTimeout(r, 4500));
    }

    await browser.close();
    console.log(`\n🎉 SELESAI BOSS! ${totalUpdated} player berjaya diupdate dengan style & region.`);
})();