// Main script for the Slide Deck Builder and Web Tools
// Handles file imports, gallery management, and client-side processing
// -----------------------------------------------------------------------------

// Global State
// -----------------------------------------------------------------------------
let slides = []; // For the Slide Builder
let zipFiles = []; // For the Batch Archiver

// DOM Element References (Initialized on Load)
// -----------------------------------------------------------------------------
let elements = {};

// Initialization
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    console.log("Web Tools: DOM Content Loaded"); // Debug
    // Initialize References
    elements = {
        // Shared
        loader: document.getElementById('loader'),
        toast: document.getElementById('toast'),
        toastMsg: document.getElementById('toastMsg'),

        // Tab Navigation
        tabPresentation: document.getElementById('tabPresentation'),
        tabArchiver: document.getElementById('tabArchiver'),
        sectionPresentation: document.getElementById('sectionPresentation'),
        sectionArchiver: document.getElementById('sectionArchiver'),

        // Presentation Builder
        dropZone: document.getElementById('dropZone'),
        fileInput: document.getElementById('fileInput'),
        gallery: document.getElementById('gallery'),
        emptyState: document.getElementById('emptyState'),
        downloadBtn: document.getElementById('downloadBtn'),

        // Batch Archiver
        zipDropZone: document.getElementById('zipDropZone'),
        zipInput: document.getElementById('zipInput'),
        zipList: document.getElementById('zipList'),
        zipEmptyState: document.getElementById('zipEmptyState'),
        zipDownloadBtn: document.getElementById('zipDownloadBtn'),
        zipFileCount: document.getElementById('zipFileCount'),
    };

    console.log("Elements initialized:", elements); // Debug

    if (!elements.dropZone) console.error("CRITICAL: dropZone not found!");
    if (!elements.fileInput) console.error("CRITICAL: fileInput not found!");

    refreshUI();
    refreshZipUI();
    setupEventListeners();
    console.log("Event listeners setup complete"); // Debug
});

// Event Listeners Setup
// -----------------------------------------------------------------------------
function setupEventListeners() {
    // -- Presentation Builder Standard Inputs --
    elements.dropZone.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => {
        handleNewFiles(e.target.files);
        elements.fileInput.value = '';
    });

    // -- Batch Archiver Inputs --
    elements.zipDropZone.addEventListener('click', () => elements.zipInput.click());
    elements.zipInput.addEventListener('change', (e) => {
        handleZipFiles(e.target.files);
        elements.zipInput.value = '';
    });

    // -- Drag and Drop Logic --
    setupDragDrop(elements.dropZone, handleNewFiles);
    setupDragDrop(elements.zipDropZone, handleZipFiles);
}

/**
 * Generic helper to setup drag and drop for any zone
 */
function setupDragDrop(zoneElement, callback) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        zoneElement.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        zoneElement.addEventListener(eventName, () => zoneElement.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        zoneElement.addEventListener(eventName, () => zoneElement.classList.remove('dragover'), false);
    });

    zoneElement.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        callback(dt.files);
    }, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Switches the active view between tools
 */
function switchTab(tabName) {
    const {
        sectionPresentation, sectionArchiver,
        tabPresentation, tabArchiver
    } = elements;

    // Reset styles
    tabPresentation.className = "px-4 py-1.5 text-sm font-medium rounded-md text-gray-500 hover:text-gray-900 transition-all";
    tabArchiver.className = "px-4 py-1.5 text-sm font-medium rounded-md text-gray-500 hover:text-gray-900 transition-all";

    sectionPresentation.classList.add('hidden');
    sectionArchiver.classList.add('hidden');

    // Activate selected
    if (tabName === 'presentation') {
        sectionPresentation.classList.remove('hidden');
        tabPresentation.className = "px-4 py-1.5 text-sm font-medium rounded-md bg-white text-gray-900 shadow-sm transition-all";
    } else {
        sectionArchiver.classList.remove('hidden');
        tabArchiver.className = "px-4 py-1.5 text-sm font-medium rounded-md bg-white text-gray-900 shadow-sm transition-all";
    }
}
// Expose to window for HTML onclick events
window.switchTab = switchTab;


// -----------------------------------------------------------------------------
// FEATURE 1: Slide Deck Builder Logic
// -----------------------------------------------------------------------------

function handleNewFiles(fileList) {
    console.log("handleNewFiles called with:", fileList); // Debug
    if (!fileList || fileList.length === 0) return;

    const newImages = Array.from(fileList).filter(file => {
        console.log("Checking file:", file.name, file.type); // Debug
        return file.type.startsWith('image/');
    });

    if (newImages.length === 0) {
        if (fileList.length > 0) {
            alert("The Slide Deck Builder only accepts images (JPG, PNG). To archive other files, switch to the Batch Archiver tab.");
        }
        return;
    }

    newImages.forEach(file => {
        slides.push({
            file: file,
            id: generateId(),
            name: file.name,
            previewUrl: URL.createObjectURL(file)
        });
    });

    sortSlides(false);
    renderGallery();
    refreshUI();
    showNotification(`Added ${newImages.length} slide(s)`);
}

function sendSlidesToArchiver() {
    if (slides.length === 0) return;

    // Add all current slides to zipFiles
    const files = slides.map(s => s.file);

    // Use the existing handler to process them (handles de-duplication)
    handleZipFiles(files);

    // Switch tabs to show the user
    switchTab('archiver');

    showNotification(`Sent ${files.length} slides to Archiver`);
}
window.sendSlidesToArchiver = sendSlidesToArchiver;

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

function sortSlides(notify = true) {
    slides.sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    renderGallery();
    if (notify) showNotification("Sorted slides by filename");
}

function removeSlide(id) {
    slides = slides.filter(slide => slide.id !== id);
    renderGallery();
    refreshUI();
}
window.removeSlide = removeSlide;

function clearAllSlides() {
    if (slides.length === 0) return;
    if (confirm("Are you sure you want to remove all slides?")) {
        slides = [];
        renderGallery();
        refreshUI();
        showNotification("All slides removed");
    }
}
window.clearAllSlides = clearAllSlides;
window.sortSlides = sortSlides;

function moveSlide(index, direction) {
    if (direction === -1 && index > 0) {
        [slides[index], slides[index - 1]] = [slides[index - 1], slides[index]];
    } else if (direction === 1 && index < slides.length - 1) {
        [slides[index], slides[index + 1]] = [slides[index + 1], slides[index]];
    }
    renderGallery();
}
window.moveSlide = moveSlide;

function renderGallery() {
    const gallery = elements.gallery;
    gallery.innerHTML = '';

    slides.forEach((slide, index) => {
        const card = document.createElement('div');
        card.className = "slide-card bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group relative";

        card.innerHTML = `
            <div class="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-md z-10 shadow-sm">
                ${index + 1}
            </div>
            <button onclick="removeSlide('${slide.id}')" class="absolute top-3 right-3 bg-white/90 text-red-500 hover:bg-red-50 hover:text-red-600 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-105 focus:outline-none" title="Remove Slide">
                <i class="fas fa-times w-4 h-4 flex items-center justify-center text-sm"></i>
            </button>
            <div class="relative w-full border-b border-gray-50">
                <img src="${slide.previewUrl}" class="card-img w-full block" alt="${slide.name}" loading="lazy">
                <div class="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                    <button onclick="moveSlide(${index}, -1)" class="bg-white/90 text-gray-700 hover:text-indigo-600 w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border border-gray-100" ${index === 0 ? 'disabled style="display:none"' : ''} title="Move Left"><i class="fas fa-arrow-left text-xs"></i></button>
                    <button onclick="moveSlide(${index}, 1)" class="bg-white/90 text-gray-700 hover:text-indigo-600 w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border border-gray-100" ${index === slides.length - 1 ? 'disabled style="display:none"' : ''} title="Move Right"><i class="fas fa-arrow-right text-xs"></i></button>
                </div>
            </div>
            <div class="p-4 bg-white">
                <p class="text-xs font-medium text-gray-500 truncate select-none" title="${slide.name}">
                    ${slide.name}
                </p>
            </div>
        `;
        gallery.appendChild(card);
    });
}

function refreshUI() {
    const hasSlides = slides.length > 0;
    elements.downloadBtn.disabled = !hasSlides;

    const sendBtn = document.getElementById('sendToZipBtn');
    if (sendBtn) sendBtn.disabled = !hasSlides;


    if (hasSlides) {
        elements.emptyState.classList.add('hidden');
        elements.dropZone.classList.remove('py-24');
        elements.dropZone.classList.add('py-10');
    } else {
        elements.emptyState.classList.remove('hidden');
        elements.dropZone.classList.add('py-24');
        elements.dropZone.classList.remove('py-10');
    }
}


// -----------------------------------------------------------------------------
// FEATURE 2: Secure Batch Archiver Logic
// -----------------------------------------------------------------------------

function handleZipFiles(fileList) {
    const newFiles = Array.from(fileList);
    if (newFiles.length === 0) return;

    newFiles.forEach(file => {
        // Prevent duplicates by checking name and size
        if (!zipFiles.some(f => f.name === file.name && f.size === file.size)) {
            zipFiles.push(file);
        }
    });

    refreshZipUI();
    showNotification(`Added ${newFiles.length} file(s) to archive`);
}

function removeZipFile(index) {
    zipFiles.splice(index, 1);
    refreshZipUI();
}
window.removeZipFile = removeZipFile;

function clearZipFiles() {
    if (zipFiles.length === 0) return;
    if (confirm("Clear all files from the archiver?")) {
        zipFiles = [];
        refreshZipUI();
        showNotification("Archiver cleared");
    }
}
window.clearZipFiles = clearZipFiles;

function refreshZipUI() {
    const hasFiles = zipFiles.length > 0;
    const {
        zipList, zipEmptyState, zipDownloadBtn,
        zipFileCount, zipDropZone
    } = elements;

    zipDownloadBtn.disabled = !hasFiles;
    zipFileCount.innerText = `${zipFiles.length} file(s)`;

    // Toggle Empty State
    if (hasFiles) {
        zipEmptyState.classList.add('hidden');
        zipDropZone.classList.remove('py-24');
        zipDropZone.classList.add('py-10');
    } else {
        zipEmptyState.classList.remove('hidden');
        zipDropZone.classList.add('py-24'); // Reset to large
        zipDropZone.classList.remove('py-10');
    }

    // Re-render List
    // Clear list but keep empty state element
    Array.from(zipList.children).forEach(child => {
        if (child.id !== 'zipEmptyState') zipList.removeChild(child);
    });

    zipFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = "flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors group";

        // Icon based on file type
        let iconClass = "fa-file text-gray-400";
        if (file.type.includes('image')) iconClass = "fa-file-image text-purple-400";
        else if (file.type.includes('pdf')) iconClass = "fa-file-pdf text-red-400";
        else if (file.type.includes('text') || file.name.endsWith('.md')) iconClass = "fa-file-alt text-blue-400";
        else if (file.type.includes('zip') || file.type.includes('compressed')) iconClass = "fa-file-zipper text-yellow-500";

        // Format size
        const sizeStr = formatBytes(file.size);

        li.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden">
                <i class="fas ${iconClass} w-5 text-center"></i>
                <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-700 truncate">${file.name}</p>
                    <p class="text-xs text-gray-400">${sizeStr}</p>
                </div>
            </div>
            <button onclick="removeZipFile(${index})" class="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                <i class="fas fa-trash-alt text-sm"></i>
            </button>
        `;
        zipList.appendChild(li);
    });
}

function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function generateZip() {
    if (zipFiles.length === 0) return;

    elements.loader.classList.remove('hidden');

    try {
        const zip = new JSZip();

        // Add files to zip
        zipFiles.forEach(file => {
            zip.file(file.name, file);
        });

        // Generate Async
        const content = await zip.generateAsync({ type: "blob" });

        // Save
        const timestamp = new Date().toISOString().slice(0, 10);
        saveAs(content, `Archived_Files_${timestamp}.zip`);

        showNotification("Archive downloaded successfully!");

    } catch (err) {
        console.error("Zip generation failed:", err);
        alert("An error occurred while zipping files.");
    } finally {
        elements.loader.classList.add('hidden');
    }
}
window.generateZip = generateZip;

// -----------------------------------------------------------------------------
// Shared: Export Logic (PPTX)
// -----------------------------------------------------------------------------

async function generatePPTX() {
    if (slides.length === 0) return;
    elements.loader.classList.remove('hidden');

    try {
        let pres = new PptxGenJS();
        pres.layout = 'LAYOUT_16x9';

        for (const slideData of slides) {
            const base64Data = await convertFileToBase64(slideData.file);
            let pptSlide = pres.addSlide();
            pptSlide.addImage({ data: base64Data, x: 0, y: 0, w: '100%', h: '100%' });
        }
        await pres.writeFile({ fileName: `Presentation_${new Date().toISOString().slice(0, 10)}.pptx` });
        showNotification("Presentation exported successfully!");
    } catch (err) {
        console.error("Export failed:", err);
        alert("Error generating presentation.");
    } finally {
        elements.loader.classList.add('hidden');
    }
}
window.generatePPTX = generatePPTX;

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
}

/**
 * Shows a toast notification
 */
function showNotification(message) {
    elements.toastMsg.innerText = message;
    elements.toast.classList.remove('translate-y-32');
    setTimeout(() => {
        elements.toast.classList.add('translate-y-32');
    }, 3000);
}
