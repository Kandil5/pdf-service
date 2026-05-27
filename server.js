const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

// Increase JSON payload limit because Salesforce HTML templates can be large
app.use(express.json({ limit: '50mb' }));

app.post('/generate-pdf', async (req, res) => {
    const { html } = req.body;

    if (!html) {
        return res.status(400).json({ error: 'Missing HTML content' });
    }

    let browser;
    try {
        // 1. Launch Puppeteer with the correct Docker settings
        browser = await puppeteer.launch({
            executablePath: '/usr/bin/google-chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            headless: true
        });

        const page = await browser.newPage();

        // 2. Set the HTML content received from Salesforce
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // 3. Generate the PDF as a binary buffer
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true // Keeps colors/styles intact
        });

        // 4. Convert the binary PDF to a Base64 string for Salesforce
        const base64Pdf = pdfBuffer.toString('base64');

        // 5. Send it back in the exact JSON format your LWC expects
        res.json({ base64: base64Pdf });

    } catch (error) {
        console.error('PDF Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// A basic homepage check so Render knows the server is alive
app.get('/', (req, res) => {
    res.send('Puppeteer PDF Service is Active!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
