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
            executablePath: puppeteer.executablePath(),
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
        // 3. Generate the PDF as a binary buffer
        await page.setViewport({ width: 900, height: 1200 });
        const pdfBuffer = await page.pdf({
            width: '900px',
            height: '1273px', // This maintains a standard A4 aspect ratio for 900px width
            printBackground: true,
            margin: {
                top: '40px',    // Adds space at the top of every page
                bottom: '40px', // Adds space at the bottom of every page
                left: '40px',   // Adds space on the left side
                right: '40px'   // Adds space on the right side
            }
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
