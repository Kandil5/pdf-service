const express = require('express');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const app = express();

app.use(express.json({ limit: '50mb' }));

app.post('/generate-pdf', async (req, res) => {
    const { html, qrData } = req.body;

    if (!html) {
        return res.status(400).json({ error: 'Missing html input' });
    }

    let browser;
    try {
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

        let finalHtml = html;

        // ONLY generate and inject QR code if qrData actually exists
        if (qrData) {
            const qrDataUri = await QRCode.toDataURL(qrData, { width: 80, margin: 0 });
            
            const qrHtmlStructure = `
                <div style="position: absolute; bottom: 40px; right: 40px; z-index: 9999;">
                    <img src="${qrDataUri}" style="width:80px; height:80px; display: block;"/>
                </div>
            `;

            finalHtml = html.includes('</body>') 
                ? html.replace('</body>', `${qrHtmlStructure}</body>`) 
                : html + qrHtmlStructure;
        }

        const page = await browser.newPage();
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        
        await page.addStyleTag({
            content: `
                body { 
                    width: 820px !important;
                    max-height: 1190px !important;
                    zoom: 0.95; 
                    margin: 0 auto !important; 
                    padding-left: 40px !important; 
                    padding-right: 40px !important; 
                    box-sizing: border-box !important;
                    position: relative !important;
                }
            `
        });

        await page.setViewport({ width: 900, height: 1200 });
        const pdfBuffer = await page.pdf({
            width: '900px',
            height: '1273px', 
            printBackground: true,
            margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' }
        });

        const base64Pdf = pdfBuffer.toString('base64');
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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
