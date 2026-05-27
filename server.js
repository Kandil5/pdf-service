const express = require('express');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const app = express();

app.use(express.json({ limit: '50mb' }));

app.post('/generate-pdf', async (req, res) => {
    const { html, qrData } = req.body;
    if (!html) return res.status(400).json({ error: 'Missing html input' });

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: '/usr/bin/google-chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            headless: true
        });

        let finalHtml = html;
        if (qrData) {
            const qrDataUri = await QRCode.toDataURL(qrData, { width: 80, margin: 0 });
            const qrHtml = `<div style="text-align: right; margin-top: 20px; page-break-inside: avoid !important;"><img src="${qrDataUri}" style="width:80px; height:80px; display: inline-block;"/></div>`;
            finalHtml = html.includes('</body>') ? html.replace('</body>', `${qrHtml}</body>`) : html + qrHtml;
        }

        const page = await browser.newPage();
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        await page.setViewport({ width: 900, height: 1200 });

        const pdfBuffer = await page.pdf({
            width: '900px',
            height: '1273px',
            printBackground: true,
            margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' }
        });

        res.json({ base64: pdfBuffer.toString('base64') });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

const port = process.env.PORT || 3000;
app.listen(port);
