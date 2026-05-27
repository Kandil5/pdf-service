const express = require('express');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
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
        // 1. Launch Puppeteer with the correct Docker paths
        browser = await puppeteer.launch({
            executablePath: '/usr/bin/google-chrome', // MUST be this path for your Dockerfile
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            headless: true
        });

        // 2. Generate QR code image data
        const qrDataUri = await QRCode.toDataURL('SF:TEST-001|ERP:PV186629|CRM:C017473', { width: 120, margin: 1 });
        
        // This HTML wrapper forces the QR code to sit cleanly at the bottom right corner of the page
        const qrHtmlStructure = `
            <div style="width: 100%; display: flex; justify-content: flex-end; margin-top: 30px; box-sizing: border-box;">
                <div style="text-align: center;">
                    <img src="${qrDataUri}" style="width:120px; height:120px; display: block;"/>
                    <span style="font-family: sans-serif; font-size: 10px; color: #666;">Scan Document</span>
                </div>
            </div>
        `;

        // Inject the QR code wrapper right before the closing body tag
        const htmlWithQr = html.includes('</body>') 
            ? html.replace('</body>', `${qrHtmlStructure}</body>`) 
            : html + qrHtmlStructure;

        const page = await browser.newPage();

        // 3. Set the HTML content received from Salesforce
        await page.setContent(htmlWithQr, { waitUntil: 'networkidle0' });
        
        await page.addStyleTag({
            content: `
                body { 
                    width: 820px !important; /* 900px total width minus 80px for left/right margins */
                    margin: 0 auto !important; 
                    padding-left: 40px !important; 
                    padding-right: 40px !important; 
                    box-sizing: border-box !important;
                }
            `
        });

        // 4. Generate the PDF as a binary buffer
        await page.setViewport({ width: 900, height: 1200 });
        const pdfBuffer = await page.pdf({
            width: '900px',
            height: '1273px', 
            printBackground: true,
            margin: {
                top: '40px',    
                bottom: '40px', 
                left: '40px',   
                right: '40px'   
            }
        });

        // 5. Convert the binary PDF to a Base64 string for Salesforce
        const base64Pdf = pdfBuffer.toString('base64');

        // 6. Send it back in the exact JSON format your LWC expects
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
