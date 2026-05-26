const express = require('express');
const { chromium } = require('playwright-core');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/generate-pdf', async (req, res) => {
    const { html } = req.body;
    if (!html) return res.status(400).json({ error: 'Missing html' });

    let browser;
    try {
        browser = await chromium.launch();
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        const base64 = pdfBuffer.toString('base64');
        res.json({ base64 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(process.env.PORT || 3000);
