/**
 * URL Capture - Main Logic
 * Uses Microlink API to take full-page screenshots.
 */

const API_BASE = 'https://api.microlink.io/';

// DOM Elements
const urlInput = document.getElementById('url-input');
const captureBtn = document.getElementById('capture-btn');
const btnText = captureBtn.querySelector('.btn-text');
const loader = captureBtn.querySelector('.loader');
const errorMessage = document.getElementById('error-message');
const resultSection = document.getElementById('result-section');
const resultImg = document.getElementById('screenshot-img');
const downloadBtn = document.getElementById('download-btn');
const historyGrid = document.getElementById('history-grid');

// State
let currentCaptureUrl = '';
let currentTargetUrl = ''; // Keep track of the original URL for download
let history = JSON.parse(localStorage.getItem('capture_history') || '[]');

/**
 * Initialize the app
 */
function init() {
    renderHistory();
    
    captureBtn.addEventListener('click', handleCapture);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCapture();
    });
    
    downloadBtn.addEventListener('click', downloadScreenshot);
}

/**
 * Handles the capture button click
 */
async function handleCapture() {
    const rawUrl = urlInput.value.trim();
    
    if (!isValidUrl(rawUrl)) {
        showError('Please enter a valid URL (including http:// or https://)');
        return;
    }
    
    hideError();
    setLoading(true);
    
    try {
        const targetUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
        // Fixed clipping issue (e.g., Clien.net) by setting explicit viewport width and scale factor.
        // deviceScaleFactor=1 ensures the width matches the intended pixels exactly.
        const screenshotUrl = `${API_BASE}?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false&fullPage=true&waitFor=10000&animations=true&hide=cookie-banner,.modal,.popup,.overlay,.ad-container,#ad-slot&viewport.width=1400&viewport.deviceScaleFactor=1`;
        
        const response = await fetch(screenshotUrl);
        const data = await response.json();
        
        if (data.status === 'success' && data.data.screenshot) {
            const finalImgUrl = data.data.screenshot.url;
            displayResult(finalImgUrl, targetUrl);
            addToHistory(finalImgUrl, targetUrl);
        } else {
            throw new Error(data.message || 'Failed to capture screenshot');
        }
    } catch (err) {
        console.error('Capture error:', err);
        showError('Could not capture the site. This may be due to bot protection or API limits. Please try again in a moment.');
    } finally {
        setLoading(false);
    }
}

/**
 * Validates the URL string
 */
function isValidUrl(string) {
    try {
        if (!string.includes('.')) return false;
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Toggles loading state UI
 */
function setLoading(isLoading) {
    captureBtn.disabled = isLoading;
    if (isLoading) {
        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        loader.classList.add('hidden');
    }
}

/**
 * Shows error message
 */
function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove('hidden');
}

/**
 * Hides error message
 */
function hideError() {
    errorMessage.classList.add('hidden');
}

/**
 * Displays the result in the main card
 */
function displayResult(imgUrl, targetUrl) {
    currentCaptureUrl = imgUrl;
    currentTargetUrl = targetUrl; // Save the original URL
    resultImg.src = imgUrl;
    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Downloads the current screenshot.
 * Uses a Blob-based approach to bypass cross-origin restrictions.
 * Microlink API with embed=screenshot.url provides Access-Control-Allow-Origin: *
 */
async function downloadScreenshot() {
    if (!currentTargetUrl) {
        showError('No active capture to download.');
        return;
    }

    try {
        downloadBtn.disabled = true;
        downloadBtn.textContent = '다운로드 중...';
        
        // Consistent viewport settings for download as well
        const downloadApiUrl = `${API_BASE}?url=${encodeURIComponent(currentTargetUrl)}&screenshot=true&meta=false&fullPage=true&waitFor=10000&animations=true&hide=cookie-banner,.modal,.popup,.overlay,.ad-container,#ad-slot&embed=screenshot.url&viewport.width=1400&viewport.deviceScaleFactor=1`;

        const response = await fetch(downloadApiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        // Generate a clean filename
        const filename = `screenshot-${new URL(currentTargetUrl).hostname.replace(/\./g, '-')}.png`;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);
        
        hideError();
    } catch (err) {
        console.error('Download failed:', err);
        showError('다운로드에 실패했습니다. 이미지 위에서 마우스 오른쪽 버튼을 클릭하여 "이미지를 다른 이름으로 저장"을 선택해 주세요.');
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = '다운로드';
    }
}

/**
 * Adds a capture to the history
 */
function addToHistory(imgUrl, targetUrl) {
    const item = {
        id: Date.now(),
        url: targetUrl,
        img: imgUrl,
        date: new Date().toLocaleDateString()
    };
    
    history = history.filter(h => h.url !== targetUrl);
    history.unshift(item);
    
    if (history.length > 12) history.pop();
    
    localStorage.setItem('capture_history', JSON.stringify(history));
    renderHistory();
}

/**
 * Renders the history grid
 */
function renderHistory() {
    if (history.length === 0) {
        historyGrid.innerHTML = '<p class="empty-state">No captures yet. Start by entering a URL above!</p>';
        return;
    }
    
    historyGrid.innerHTML = history.map(item => `
        <div class="history-item" data-id="${item.id}">
            <div class="history-thumb" style="background-image: url('${item.img}')"></div>
            <div class="history-info">
                <div class="history-url">${item.url.replace(/^https?:\/\//, '')}</div>
                <div class="history-date">${item.date}</div>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = parseInt(el.dataset.id);
            const item = history.find(h => h.id === id);
            if (item) {
                displayResult(item.img, item.url);
                urlInput.value = item.url;
            }
        });
    });
}

// Start the app
init();
