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

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
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

        // 1. Generate the QR code string if data is provided
let footerTemplate = '<div></div>'; 
        if (qrData) {
            const qrDataUri = await QRCode.toDataURL(qrData, { width: 75, margin: 0 });
            
            // The <style> tag below tells Chromium to stop collapsing the footer container
            footerTemplate = `
                <style>
                    #footer { padding: 0 !important; }
                </style>
                <div style="width: 100%; padding-right: 40px; text-align: right; box-sizing: border-box;">
                    <img src="${qrDataUri}" style="width: 75px; height: 75px; display: inline-block;" />
                </div>
            `;
        }
        await page.setViewport({ width: 900, height: 1200 });
        
        const pdfBuffer = await page.pdf({
            width: '900px',
            height: '1273px', 
            printBackground: true,
            displayHeaderFooter: true, // Turns on the independent margin layer
            headerTemplate: '<div></div>', // Empty header
            footerTemplate: footerTemplate, // Inserts the isolated QR code
            margin: { 
                top: '40px', 
                bottom: '120px', // Creates safe empty margin space at the bottom so content never collides
                left: '40px', 
                right: '40px' 
            }
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
