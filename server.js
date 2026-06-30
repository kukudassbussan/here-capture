const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

app.post('/capture', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--start-maximized'
            ]
        });
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // --- 속도 중심의 로딩 전략 ---
        // networkidle2는 대부분의 리소스가 로드되면 다음으로 넘어가 속도가 빠름
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // 간단한 팝업 제거 로직은 유지
        try {
            await page.evaluate(() => {
                const selectors = ['[class*="popup"], [id*="popup"] '];
                selectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => el.remove());
                });
            });
        } catch (e) {
            console.warn('Could not remove popups:', e.message);
        }
        
        // 최종 렌더링을 위한 짧은 대기
        await new Promise(resolve => setTimeout(resolve, 1000));

        const screenshot = await page.screenshot({
            fullPage: true,
            encoding: 'base64',
            type: 'png'
        });
        
        res.json({ screenshot: `data:image/png;base64,${screenshot}` });

    } catch (error) {
        console.error('Capture failed:', error);
        res.status(500).json({ error: 'Failed to capture screenshot. The site may have loading issues.' });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
