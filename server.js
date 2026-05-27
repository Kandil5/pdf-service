const puppeteer = require('puppeteer');

async function run() {
    const browser = await puppeteer.launch({
        // This tells it to use the Chrome we installed via Docker
        executablePath: '/usr/bin/google-chrome', 
        // These settings stop Chrome from crashing in a server environment
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });

    // Your scraping/automation code goes here...
    
    await browser.close();
}
