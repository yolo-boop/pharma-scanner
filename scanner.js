// ========================================
// CONFIGURATION
// ========================================

// Person 1's API URL - UPDATE THIS WHEN PERSON 1 SHARES THE URL
const API_BASE_URL = 'http://localhost:3000'; // Change this later

// Mock mode - set to true for testing without blockchain
const MOCK_MODE = true; // Set to false when Person 1's API is ready

// Camera stream
let stream = null;
let scanning = false;

// ========================================
// CAMERA FUNCTIONS
// ========================================

async function startScanner() {
    try {
        // Request camera access
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' } // Use back camera on mobile
        });
        
        const video = document.getElementById('video');
        video.srcObject = stream;
        
        // Update UI
        document.getElementById('startButton').classList.add('hidden');
        document.getElementById('stopButton').classList.remove('hidden');
        
        // Start scanning
        scanning = true;
        requestAnimationFrame(scan);
        
        console.log('Camera started successfully');
        
    } catch (error) {
        console.error('Camera error:', error);
        showError('Cannot access camera. Please allow camera permissions.');
    }
}

function stopScanner() {
    scanning = false;
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    const video = document.getElementById('video');
    video.srcObject = null;
    
    // Update UI
    document.getElementById('startButton').classList.remove('hidden');
    document.getElementById('stopButton').classList.add('hidden');
    
    console.log('Camera stopped');
}

// ========================================
// QR CODE SCANNING
// ========================================

function scan() {
    if (!scanning) return;
    
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Set canvas size to video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Scan for QR code
        const code = jsQR(imageData.data, canvas.width, canvas.height);
        
        if (code) {
            console.log('QR Code detected:', code.data);
            
            // Stop scanning
            scanning = false;
            stopScanner();
            
            // Extract blockchain ID from QR data
            const blockchainId = extractBlockchainId(code.data);
            
            // Verify medicine
            verifyMedicine(blockchainId);
            return;
        }
    }
    
    // Continue scanning
    requestAnimationFrame(scan);
}

function extractBlockchainId(qrData) {
    // QR might contain just the ID or a URL with ID
    // Handle both formats
    
    // Format 1: Just the ID (0x7a8f9b2c...)
    if (qrData.startsWith('0x')) {
        return qrData;
    }
    
    // Format 2: URL with ID parameter (https://...?id=0x7a8f9b2c...)
    if (qrData.includes('id=')) {
        const urlParams = new URLSearchParams(qrData.split('?')[1]);
        return urlParams.get('id');
    }
    
    // Format 3: Full URL (extract ID from path)
    const match = qrData.match(/0x[a-fA-F0-9]+/);
    if (match) {
        return match[0];
    }
    
    // If no ID found, return as-is
    return qrData;
}

// ========================================
// MANUAL VERIFICATION
// ========================================

function verifyManual() {
    const manualId = document.getElementById('manualId').value.trim();
    
    if (!manualId) {
        showError('Please enter a Blockchain ID');
        return;
    }
    
    verifyMedicine(manualId);
}

// ========================================
// MEDICINE VERIFICATION
// ========================================

async function verifyMedicine(blockchainId) {
    console.log('Verifying medicine:', blockchainId);
    
    // Hide all sections
    hideAllSections();
    
    // Show loading
    document.getElementById('loadingSection').classList.remove('hidden');
    
    // Verify
    if (MOCK_MODE) {
        await verifyMedicineMock(blockchainId);
    } else {
        await verifyMedicineReal(blockchainId);
    }
}

// ========================================
// MOCK VERIFICATION (For testing tonight)
// ========================================

async function verifyMedicineMock(blockchainId) {
    // Simulate network delay
    await sleep(2000);
    
    // Mock data - simulate authentic medicine
    // You can change this to test fake medicine scenario
    const isAuthentic = true; // Change to false to test fake scenario
    
    if (isAuthentic) {
        const medicineData = {
            name: 'Paracetamol',
            batchNumber: 'BATCH001',
            manufacturer: 'PharmaCorp India',
            mfgDate: '2024-01-15',
            expiryDate: '2026-01-15',
            blockchainId: blockchainId
        };
        
        showAuthentic(medicineData);
    } else {
        showFake();
    }
}

// ========================================
// REAL VERIFICATION (For tomorrow)
// ========================================

async function verifyMedicineReal(blockchainId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/verify/${blockchainId}`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.valid) {
                // Authentic medicine
                const medicineData = {
                    name: data.medicine.name || data.medicine.medicineName,
                    batchNumber: data.medicine.batchNumber,
                    manufacturer: data.medicine.manufacturer || data.medicine.manufacturerName,
                    mfgDate: formatDate(data.medicine.mfgDate),
                    expiryDate: formatDate(data.medicine.expiryDate),
                    blockchainId: blockchainId
                };
                
                showAuthentic(medicineData);
            } else {
                // Not found - fake
                showFake();
            }
        } else {
            // Not found - fake
            showFake();
        }
        
    } catch (error) {
        console.error('Verification error:', error);
        showError('Cannot connect to blockchain. Please check internet connection.');
    }
}

// ========================================
// UI DISPLAY FUNCTIONS
// ========================================

function showAuthentic(data) {
    hideAllSections();
    
    document.getElementById('authenticSection').classList.remove('hidden');
    
    // Fill in medicine details
    document.getElementById('medicineName').textContent = data.name;
    document.getElementById('batchNumber').textContent = data.batchNumber;
    document.getElementById('manufacturer').textContent = data.manufacturer;
    document.getElementById('mfgDate').textContent = data.mfgDate;
    document.getElementById('expiryDate').textContent = data.expiryDate;
    document.getElementById('blockchainId').textContent = data.blockchainId;
    
    console.log('Authentic medicine verified:', data);
}

function showFake() {
    hideAllSections();
    document.getElementById('fakeSection').classList.remove('hidden');
    console.log('Fake/unregistered medicine detected');
}

function showError(message) {
    hideAllSections();
    document.getElementById('errorSection').classList.remove('hidden');
    document.getElementById('errorMessage').textContent = message;
    console.error('Error:', message);
}

function hideAllSections() {
    document.getElementById('scannerSection').classList.add('hidden');
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('authenticSection').classList.add('hidden');
    document.getElementById('fakeSection').classList.add('hidden');
    document.getElementById('errorSection').classList.add('hidden');
}

function scanAgain() {
    hideAllSections();
    document.getElementById('scannerSection').classList.remove('hidden');
    document.getElementById('manualId').value = '';
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDate(dateInput) {
    // Handle different date formats from blockchain
    if (!dateInput) return 'N/A';
    
    // If it's a timestamp (number)
    if (typeof dateInput === 'number') {
        const date = new Date(dateInput * 1000); // Convert from seconds to milliseconds
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    // If it's already a date string
    if (typeof dateInput === 'string') {
        const date = new Date(dateInput);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    return 'N/A';
}

// ========================================
// CONSOLE MESSAGE
// ========================================

console.log('=================================');
console.log('Medicine Verification Scanner');
console.log('=================================');
console.log('Mock Mode:', MOCK_MODE);
console.log('API URL:', API_BASE_URL);
console.log('=================================');