/**
 * URL Capture - Main Logic
 * Uses Microlink API to take full-page screenshots.
 */

const API_BASE = 'https://api.microlink.io/';

// DOM Elements
const urlInput = document.getElementById('urlInput');
const captureBtn = document.getElementById('captureBtn');
const spinner = document.getElementById('spinner');
const resultArea = document.getElementById('resultArea');
const screenshotImg = document.getElementById('screenshotImg');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');

// State
let currentCaptureUrl = '';
let currentTargetUrl = ''; 
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
    copyBtn.addEventListener('click', copyLink);
}

/**
 * Handles the capture button click
 */
async function handleCapture() {
    const rawUrl = urlInput.value.trim();
    
    if (!isValidUrl(rawUrl)) {
        alert('올바른 URL을 입력해 주세요. (예: https://google.com)');
        return;
    }
    
    setLoading(true);
    
    try {
        const targetUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
        // Microlink API Call - High resolution (viewport 1920) for better readability
        const screenshotUrl = `${API_BASE}?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false&fullPage=true&waitFor=3000&animations=true&hide=cookie-banner,.modal,.popup,.overlay,.ad-container,#ad-slot&viewport.width=1920&viewport.deviceScaleFactor=2`;
        
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
        alert('캡처에 실패했습니다. 사이트 보안 정책이나 API 제한 때문일 수 있습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
        setLoading(false);
    }
}

/**
 * Validates the URL string
 */
function isValidUrl(string) {
    if (!string.includes('.')) return false;
    return true;
}

/**
 * Toggles loading state UI
 */
function setLoading(isLoading) {
    captureBtn.disabled = isLoading;
    if (isLoading) {
        captureBtn.textContent = '처리 중...';
        spinner.classList.remove('hidden');
        resultArea.classList.add('hidden');
    } else {
        captureBtn.textContent = '지금 캡처하기';
        spinner.classList.add('hidden');
    }
}

/**
 * Displays the result
 */
function displayResult(imgUrl, targetUrl) {
    currentCaptureUrl = imgUrl;
    currentTargetUrl = targetUrl;
    screenshotImg.src = imgUrl;
    resultArea.classList.remove('hidden');
    resultArea.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Downloads the current screenshot - Optimized speed
 */
async function downloadScreenshot(e) {
    e.preventDefault();
    if (!currentCaptureUrl) return;

    try {
        downloadBtn.textContent = '다운로드 중...';
        // Use the already generated image URL for faster direct download if possible
        const response = await fetch(currentCaptureUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const hostname = new URL(currentTargetUrl).hostname;
        a.download = `capture-${hostname}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (err) {
        console.error('Download error:', err);
        // Fallback to API if blob fetch fails
        window.open(currentCaptureUrl, '_blank');
    } finally {
        downloadBtn.textContent = '이미지 다운로드';
    }
}

/**
 * Copies the image link to clipboard
 */
function copyLink() {
    if (!currentCaptureUrl) return;
    navigator.clipboard.writeText(currentCaptureUrl).then(() => {
        alert('이미지 링크가 클립보드에 복사되었습니다.');
    });
}

/**
 * History Management
 */
function addToHistory(imgUrl, targetUrl) {
    const item = {
        id: Date.now(),
        url: targetUrl,
        img: imgUrl,
        date: new Date().toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
    
    // Remove duplicates
    history = history.filter(h => h.url !== targetUrl);
    history.unshift(item);
    if (history.length > 8) history.pop();
    
    localStorage.setItem('capture_history', JSON.stringify(history));
    renderHistory();
}

function deleteHistoryItem(id, e) {
    e.stopPropagation();
    history = history.filter(item => item.id !== id);
    localStorage.setItem('capture_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const historyContainer = document.getElementById('historyGrid');
    if (!historyContainer) return;

    if (history.length === 0) {
        historyContainer.innerHTML = '<p class="empty-state">최근 캡처 내역이 없습니다.</p>';
        return;
    }

    historyContainer.innerHTML = history.map(item => `
        <div class="history-card" onclick="displayResult('${item.img}', '${item.url}')">
            <div class="history-preview" style="background-image: url('${item.img}')"></div>
            <div class="history-details">
                <span class="history-url">${new URL(item.url).hostname}</span>
                <span class="history-date">${item.date}</span>
            </div>
            <button class="delete-btn" onclick="deleteHistoryItem(${item.id}, event)" title="삭제">×</button>
        </div>
    `).join('');
}

// Global functions for inline event handlers
window.displayResult = displayResult;
window.deleteHistoryItem = deleteHistoryItem;

// Start the app
init();
