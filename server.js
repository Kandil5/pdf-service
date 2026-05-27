const puppeteer = require('puppeteer');
const express = require('express'); // Or whatever framework you use
const app = express();

async function startApp() {
    // 1. LAUNCH PUPPETEER CORRECTLY
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu' // Disables hardware graphics (crucial for servers)
        ],
        headless: true // Ensures no window tries to pop open
    });

    // 2. RENDER NEEDS A PORT TO STAY ALIVE
    // If your script just runs once and finishes, Render thinks it failed.
    // It must listen to a web port to stay active.
    const port = process.env.PORT || 3000;
    app.get('/', (req, res) => res.send('Puppeteer Bot is running!'));
    
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

startApp().catch(err => {
    console.error("Initialization Error:", err);
    process.exit(1);
});
