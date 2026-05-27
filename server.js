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

        if (qrData) {
            const qrDataUri = await QRCode.toDataURL(qrData, { width: 80, margin: 0 });
            
            // This replaces your exact placeholder element with the image naturally, keeping your structural layout intact
            finalHtml = html.replace(
                /(<div[^>]*id="qr-placeholder"[^>]*>)(<\/div>)/, 
                `$1<img src="${qrDataUri}" style="width:80px;height:80px;display:block;"/>$2`
            );
        }

        const page = await browser.newPage();
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        
        await page.addStyleTag({
            content: `
                body { 
                    width: 820px !important;
                    margin: 0 auto !important; 
                    padding-left: 40px !important; 
                    padding-right: 40px !important; 
                    box-sizing: border-box !important;
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
