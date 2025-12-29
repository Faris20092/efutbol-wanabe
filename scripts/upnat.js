const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const TARGET_URL = 'https://pesdb.net/efootball/?featured=0';
const FILE_PATH = 'players.json'; // File yang boss dah ada

(async () => {
    // 1. BACA DATA LAMA DULU
    console.log("📂 Reading existing player file...");
    let players = [];
    try {
        const fileContent = fs.readFileSync(FILE_PATH, 'utf-8');
        // FIX: Baca sebagai JSON Array biasa, bukan split line
        players = JSON.parse(fileContent);
        console.log(`✅ Loaded ${players.length} players. Ready to patch nationality!`);
    } catch (e) {
        console.error("❌ Error: Tak jumpa file 'players.json' atau format salah.", e);
        process.exit(1);
    }

    // 2. SETUP PUPPETEER
    const bravePath = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
    console.log(`🚀 Launching Brave Browser from: ${bravePath}`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            executablePath: bravePath,
            args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
        });
    } catch (err) {
        console.error("❌ Failed to launch Brave. Please check the path.", err);
        process.exit(1);
    }
    const page = await browser.newPage();

    console.log("🚀 Going to PESDB to fetch Nations...");
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });

    // 3. ENABLE COLUMN "NATIONALITY" & "REGION"
    try {
        const settingsBtn = await page.waitForSelector('xpath/.//button[contains(text(), "Settings")]');
        await settingsBtn.click();
        await new Promise(r => setTimeout(r, 1000));

        // Tick Nationality & Region
        const itemsToClick = ["Nationality", "Region"];
        for (const item of itemsToClick) {
            const [label] = await page.$x(`//label[contains(text(), "${item}")]`);
            if (label) await label.click();
        }

        const okBtn = await page.$x('//button[contains(text(), "OK")]');
        if (okBtn.length > 0) await okBtn[0].click();

        console.log("⏳ Table refreshing...");
        await new Promise(r => setTimeout(r, 3000));
    } catch (e) {
        console.log("⚠️ Settings issue, trying to proceed...");
    }

    // 4. MULA SCRAPE NATION MAP (ID -> Nation)
    const nationMap = new Map(); // Simpan: "1001" -> "Argentina"
    let hasNext = true;
    let pageNum = 1;

    while (hasNext) {
        console.log(`Scanning Page ${pageNum}... (Collecting Nations)`);

        // Cari column index
        const headers = await page.$$eval('.players th', ths => ths.map(t => t.innerText.trim()));
        const nationIdx = headers.findIndex(h => h.includes('Nationality'));
        const regionIdx = headers.findIndex(h => h.includes('Region'));
        const nameIdx = headers.findIndex(h => h.includes('Player Name'));

        // Ambil ID & Nation row by row
        const newMapData = await page.$$eval('.players tr', (rows, nIdx, rIdx, nmIdx) => {
            return rows.map(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length === 0) return null;

                // Extract ID dari link
                const link = cells[nmIdx]?.querySelector('a')?.href;
                const id = link ? link.split('id=')[1] : null;

                const nation = cells[nIdx]?.innerText.trim() || "Unknown";
                const region = cells[rIdx]?.innerText.trim() || "Unknown";

                return { id, nation, region };
            }).filter(item => item && item.id);
        }, nationIdx, regionIdx, nameIdx);

        // Simpan dalam Map
        newMapData.forEach(p => {
            // FIX: p.nation (bukan p.nationality yang undefined)
            nationMap.set(p.id, { n: p.nation, r: p.region });
        });

        // Next Page Logic
        const nextButton = await page.$('.pages b + a');
        if (nextButton) {
            await nextButton.click();
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            pageNum++;
        } else {
            hasNext = false;
        }
    }

    await browser.close();

    // 5. UPDATE FILE DATA LAMA
    console.log("🔄 Updating players with new Nationality data...");

    let updatedCount = 0;
    const updatedPlayers = players.map(p => {
        const found = nationMap.get(p.id);
        if (found) {
            p.nationality = found.n;
            p.region = found.r;
            updatedCount++;
        } else {
            // Kalau tak jumpa (jarang berlaku), letak default
            if (!p.nationality) p.nationality = "World";
            if (!p.region) p.region = "World";
        }
        return p;
    });

    console.log(`Mapped ${updatedCount} players with new data.`);

    // 6. SAVE BALIK (Format JSON Array yang betul)
    const writeStream = fs.createWriteStream('players_updated.json');
    writeStream.write(JSON.stringify(updatedPlayers, null, 2));
    writeStream.end();

    console.log("✅ SIAP BOSS! Data baru ada dalam 'players_updated.json'");

})();