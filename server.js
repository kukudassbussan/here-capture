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
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
        });
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });

        // --- 지능형 팝업 및 방해 요소 처리 ---
        await page.evaluate(() => {
            // 디시인사이드 로그인 팝업 제거
            const dcLoginPopup = document.querySelector('#login_pop');
            if (dcLoginPopup) dcLoginPopup.remove();

            // 일반적인 쿠키 배너나 하단 고정 배너 제거
            const banners = document.querySelectorAll('[id*="banner"], [class*="banner"], [id*="popup"], [class*="popup"]');
            banners.forEach(banner => banner.remove());
        });

        // --- 페이지 전체 스크롤 다운으로 지연 로딩 콘텐츠 불러오기 ---
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
        
        // 렌더링 안정화를 위한 추가 대기
        await new Promise(resolve => setTimeout(resolve, 3000));

        const screenshot = await page.screenshot({
            fullPage: true,
            encoding: 'base64',
            type: 'png'
        });
        
        res.json({ screenshot: `data:image/png;base64,${screenshot}` });

    } catch (error) {
        console.error('Capture failed:', error);
        res.status(500).json({ error: 'Failed to capture screenshot. The site may be too complex or has loading issues.' });
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
