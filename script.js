// Main script for the Slide Deck Builder
// Handles file imports, gallery management, and PPTX generation
// -----------------------------------------------------------------------------

// Global state for holding our slide data
let slides = [];

// DOM Element references for quick access
const elements = {
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    gallery: document.getElementById('gallery'),
    emptyState: document.getElementById('emptyState'),
    downloadBtn: document.getElementById('downloadBtn'),
    loader: document.getElementById('loader'),
    toast: document.getElementById('toast'),
    toastMsg: document.getElementById('toastMsg')
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    refreshUI();
    setupEventListeners();
});

function setupEventListeners() {
    const { dropZone, fileInput } = elements;

    // File input trigger
    dropZone.addEventListener('click', () => fileInput.click());

    // Handle manual file selection
    fileInput.addEventListener('change', (e) => {
        handleNewFiles(e.target.files);
        // Reset input value so we can select the same file again if needed
        fileInput.value = '';
    });

    // Drag and drop events
    // Prevent default behaviors for all drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone on drag over
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    // Remove highlight when dragging leaves or drops
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    // Handle the actual drop
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        handleNewFiles(dt.files);
    }, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Process incoming files, filter for images, and update state.
 * @param {FileList} fileList - The list of files from input or drop event
 */
function handleNewFiles(fileList) {
    // Convert FileList to Array and filter only images
    const newImages = Array.from(fileList).filter(file => file.type.startsWith('image/'));

    if (newImages.length === 0) return;

    // Create objects for each file with metadata
    newImages.forEach(file => {
        slides.push({
            file: file,
            id: generateId(),
            name: file.name,
            // Create a temporary URL for previewing the image
            previewUrl: URL.createObjectURL(file)
        });
    });

    // Automatically sort files by name for convenience
    sortSlides(false);

    renderGallery();
    refreshUI();

    showNotification(`Added ${newImages.length} slide(s)`);
}

/**
 * Generates a simple random ID for slide tracking
 */
function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

/**
 * Natural sort meant for filenames (e.g., Slide 1, Slide 2, Slide 10)
 */
function sortSlides(notify = true) {
    slides.sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    renderGallery();

    if (notify) {
        showNotification("Sorted slides by filename");
    }
}

/**
 * Delete a specific slide by ID
 */
function removeSlide(id) {
    slides = slides.filter(slide => slide.id !== id);
    renderGallery();
    refreshUI();
}

/**
 * Clear all slides from state
 */
function clearAllSlides() {
    if (slides.length === 0) return;

    if (confirm("Are you sure you want to remove all slides?")) {
        slides = [];
        renderGallery();
        refreshUI();
        showNotification("All slides removed");
    }
}

/**
 * Move a slide in the array (array swap)
 */
function moveSlide(index, direction) {
    // direction: -1 for left, 1 for right
    if (direction === -1 && index > 0) {
        [slides[index], slides[index - 1]] = [slides[index - 1], slides[index]];
    } else if (direction === 1 && index < slides.length - 1) {
        [slides[index], slides[index + 1]] = [slides[index + 1], slides[index]];
    }
    renderGallery();
}

/**
 * Renders the grid of slide cards
 */
function renderGallery() {
    const gallery = elements.gallery;
    gallery.innerHTML = '';

    slides.forEach((slide, index) => {
        const card = document.createElement('div');
        // Using Tailwind classes here for structure, custom CSS for specific animations
        card.className = "slide-card bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group relative";

        card.innerHTML = `
            <!-- Slide Number Badge -->
            <div class="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-md z-10 shadow-sm">
                ${index + 1}
            </div>

            <!-- Delete Button (appears on hover) -->
            <button 
                onclick="removeSlide('${slide.id}')"
                class="absolute top-3 right-3 bg-white/90 text-red-500 hover:bg-red-50 hover:text-red-600 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-105 focus:outline-none" 
                title="Remove Slide"
            >
                <i class="fas fa-times w-4 h-4 flex items-center justify-center text-sm"></i>
            </button>

            <!-- Image Preview -->
            <div class="relative w-full border-b border-gray-50">
                <img src="${slide.previewUrl}" class="card-img w-full block" alt="${slide.name}" loading="lazy">
                
                <!-- Navigation Controls (appear on hover) -->
                <div class="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                    <button 
                        onclick="moveSlide(${index}, -1)" 
                        class="bg-white/90 text-gray-700 hover:text-indigo-600 w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border border-gray-100 disabled:opacity-50" 
                        ${index === 0 ? 'disabled style="display:none"' : ''}
                        title="Move Left"
                    >
                        <i class="fas fa-arrow-left text-xs"></i>
                    </button>
                    <button 
                        onclick="moveSlide(${index}, 1)" 
                        class="bg-white/90 text-gray-700 hover:text-indigo-600 w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border border-gray-100 disabled:opacity-50" 
                        ${index === slides.length - 1 ? 'disabled style="display:none"' : ''}
                        title="Move Right"
                    >
                        <i class="fas fa-arrow-right text-xs"></i>
                    </button>
                </div>
            </div>

            <!-- Footer info -->
            <div class="p-4 bg-white">
                <p class="text-xs font-medium text-gray-500 truncate select-none" title="${slide.name}">
                    ${slide.name}
                </p>
            </div>
        `;

        gallery.appendChild(card);
    });
}

/**
 * Updates UI state based on whether we have content or not
 */
function refreshUI() {
    const hasSlides = slides.length > 0;

    elements.downloadBtn.disabled = !hasSlides;

    if (hasSlides) {
        elements.emptyState.classList.add('hidden');
        elements.dropZone.classList.remove('py-24');
        elements.dropZone.classList.add('py-10'); // Compact mode
    } else {
        elements.emptyState.classList.remove('hidden');
        elements.dropZone.classList.add('py-24'); // Large mode
        elements.dropZone.classList.remove('py-10');
    }
}

/**
 * Displays a toast notification with the given message
 */
function showNotification(message) {
    const { toast, toastMsg } = elements;

    toastMsg.innerText = message;

    // Slide up
    toast.classList.remove('translate-y-24');

    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-y-24');
    }, 3000);
}

// -----------------------------------------------------------------------------
// Export Logic
// -----------------------------------------------------------------------------

async function generatePPTX() {
    if (slides.length === 0) return;

    // Show loading overlay
    elements.loader.classList.remove('hidden');

    try {
        // Create new presentation instance
        let pres = new PptxGenJS();

        // Set standard 16:9 widescreen layout
        pres.layout = 'LAYOUT_16x9';

        // Loop through all our slides
        for (const slideData of slides) {
            // Convert the actual File object to a base64 string
            const base64Data = await convertFileToBase64(slideData.file);

            let pptSlide = pres.addSlide();

            // Add the image to the slide covering the full area
            pptSlide.addImage({
                data: base64Data,
                x: 0,
                y: 0,
                w: '100%',
                h: '100%'
            });
        }

        // Save the file
        await pres.writeFile({ fileName: `Presentation_${new Date().toISOString().slice(0, 10)}.pptx` });

        showNotification("Presentation exported successfully!");

    } catch (err) {
        console.error("Export failed:", err);
        alert("Sorry, something went wrong while generating the PowerPoint. Please check the console for details.");
    } finally {
        // Hide loader regardless of success/failure
        elements.loader.classList.add('hidden');
    }
}

/**
 * Helper to turn a File object into a base64 string for the library
 */
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
}
