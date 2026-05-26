const express = require('express');
const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/generate-pdf', async (req, res) => {
    const { html } = req.body;
    if (!html) return res.status(400).json({ error: 'Missing html' });

    let browser;
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath,
            headless: chromium.headless
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
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
