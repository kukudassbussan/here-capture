const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

// URL Capture Endpoint
app.post('/capture', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).send({ error: 'URL is required' });
    }

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // <- this one doesn't works in Windows
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // Set a modern user agent and a referer to bypass some bot detections
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36');

        await page.setViewport({ width: 1280, height: 720 });

        if (url.includes('bobaedream.co.kr')) {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }); // Faster timeout for bobaedream
            await new Promise(resolve => setTimeout(resolve, 500)); // Shorter wait time
        } else {
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const screenshotBuffer = await page.screenshot({ 
            fullPage: true, 
            quality: 80, // Use JPEG for smaller file size
            type: 'jpeg'
        });

        res.setHeader('Content-Type', 'image/jpeg');
        res.send(screenshotBuffer);

    } catch (error) {
        console.error('Capture error:', error);
        // More specific error handling
        if (error.message.includes('403')) {
            res.status(500).send({ error: 'Capture failed. The target site is blocking our service (403 Forbidden).' });
        } else if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
            res.status(500).send({ error: 'Capture failed. The URL could not be found.' });
        } else {
            res.status(500).send({ error: 'An unexpected error occurred during capture.' });
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
