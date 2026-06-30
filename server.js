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
                '--disable-dev-shm-usage', // 메모리 문제 방지
                '--start-maximized'
            ]
        });
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // --- 다단계 로딩 및 대기 전략 ---

        // 1단계: 기본 DOM 구조 로드까지 대기
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });

        // 안전한 팝업 제거 (오류 발생 시에도 중단되지 않도록)
        try {
            await page.evaluate(() => {
                const selectors = ['#login_pop', '[class*="popup"], [id*="popup"] '];
                selectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => el.remove());
                });
            });
        } catch (e) {
            console.warn('Could not remove popups:', e.message);
        }

        // 2단계: 전체 스크롤로 모든 콘텐츠 강제 로드
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 200;
                const scrollInterval = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(scrollInterval);
                        resolve();
                    }
                }, 100);
            });
        });
        
        // 3단계: 네트워크 안정화 대기 (모든 리소스 로드)
        await page.waitForNetworkIdle({ idleTime: 1000, timeout: 60000 });

        // 4단계: 최종 렌더링을 위한 추가 대기
        await new Promise(resolve => setTimeout(resolve, 2000));

        const screenshot = await page.screenshot({
            fullPage: true,
            encoding: 'base64',
            type: 'png'
        });
        
        res.json({ screenshot: `data:image/png;base64,${screenshot}` });

    } catch (error) {
        console.error('Capture failed:', error);
        res.status(500).json({ error: 'Failed to capture screenshot. The site may have rendering issues or complex layouts.' });
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
