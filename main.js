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
        // Microlink API Call
        const screenshotUrl = `${API_BASE}?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false&fullPage=true&waitFor=5000&animations=true&hide=cookie-banner,.modal,.popup,.overlay,.ad-container,#ad-slot&viewport.width=1400&viewport.deviceScaleFactor=1`;
        
        const response = await fetch(screenshotUrl);
        const data = await response.json();
        
        if (data.status === 'success' && data.data.screenshot) {
            const finalImgUrl = data.data.screenshot.url;
            displayResult(finalImgUrl, targetUrl);
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
 * Downloads the current screenshot
 */
async function downloadScreenshot(e) {
    e.preventDefault();
    if (!currentCaptureUrl) return;

    try {
        downloadBtn.textContent = '다운로드 중...';
        const response = await fetch(`${API_BASE}?url=${encodeURIComponent(currentTargetUrl)}&screenshot=true&embed=screenshot.url&fullPage=true`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `capture-${new URL(currentTargetUrl).hostname}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        alert('다운로드 중 오류가 발생했습니다. 이미지 우클릭으로 저장해 주세요.');
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

// Start the app
init();
