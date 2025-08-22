class FaceDetectionSlideshow {
    constructor() {
        this.faceData = null;
        this.imageFiles = [];
        this.currentSlideIndex = 0;
        this.isPlaying = true;
        this.intervalId = null;
        this.showBoxes = true;
        this.slideInterval = 5000; // 5 seconds default
        this.autoAdvance = true;
        
        // Zoom transition properties
        this.zoomWhitelist = [0, 12]; // Person IDs to zoom into
        this.zoomEnabled = true;
        this.isZooming = false;
        this.zoomTimeout = null;
        
        // UI visibility
        this.isUIHidden = false;
        
        this.initializeElements();
        this.currentSlideIndex = 0;
        this.isPlaying = true;
        this.intervalId = null;
        this.showBoxes = false;
        this.slideInterval = 5000; // 5 seconds default
        this.autoAdvance = true;
        
        // Zoom transition properties
        this.zoomWhitelist = ["person_0", "person_12"]; // Person IDs to zoom into
        this.zoomEnabled = true;
        this.isZooming = false;
        this.zoomTimeout = null;
        
        this.initializeElements();
        this.loadFaceData();
        this.setupEventListeners();
        this.loadSettings();
    }
    
    initializeElements() {
        this.container = document.getElementById('slideshow-container');
        this.currentImage = document.getElementById('current-image');
        this.faceOverlays = document.getElementById('face-overlays');
        this.imageName = document.getElementById('image-name');
        this.slideCounter = document.getElementById('slide-counter');
        this.peopleCount = document.getElementById('people-count');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.playPauseBtn = document.getElementById('play-pause');
        this.prevBtn = document.getElementById('prev-slide');
        this.nextBtn = document.getElementById('next-slide');
        this.toggleBoxesBtn = document.getElementById('toggle-boxes');
        this.settingsBtn = document.getElementById('settings-btn');
        this.hideUIBtn = document.getElementById('hide-ui-btn');
        
        // Settings modal elements
        this.settingsModal = document.getElementById('settings-modal');
        this.closeBtn = document.querySelector('.close');
        this.transitionTimeSlider = document.getElementById('transition-time');
        this.transitionValueDisplay = document.getElementById('transition-value');
        this.autoAdvanceCheckbox = document.getElementById('auto-advance');
        this.zoomEnabledCheckbox = document.getElementById('zoom-enabled');
        this.zoomWhitelistInput = document.getElementById('zoom-whitelist');
        this.saveSettingsBtn = document.getElementById('save-settings');
        this.cancelSettingsBtn = document.getElementById('cancel-settings');
    }
    
    async loadFaceData() {
        try {
            const response = await fetch('image_person_mappings.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.faceData = await response.json();
            this.imageFiles = Object.keys(this.faceData);
            
            if (this.imageFiles.length === 0) {
                throw new Error('No images found in image person mappings data');
            }
            
            this.loading.style.display = 'none';
            this.initializeSlideshow();
            
        } catch (error) {
            console.error('Error loading face data:', error);
            this.showError('Error loading slideshow data: ' + error.message);
        }
    }
    
    showError(message) {
        this.loading.style.display = 'none';
        this.error.textContent = message;
        this.error.style.display = 'block';
    }
    
    initializeSlideshow() {
        this.showSlide(0);
        if (this.autoAdvance) {
            this.startAutoplay();
        } else {
            this.isPlaying = false;
            this.playPauseBtn.textContent = '▶️ Play';
        }
        
        // Add progress bar
        const progressBar = document.createElement('div');
        progressBar.id = 'progress-bar';
        this.container.appendChild(progressBar);
    }
    
    setupEventListeners() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.previousSlide());
        this.nextBtn.addEventListener('click', () => this.nextSlide());
        this.toggleBoxesBtn.addEventListener('click', () => this.toggleFaceBoxes());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.hideUIBtn.addEventListener('click', () => this.toggleUI());
        
        // Settings modal events
        this.closeBtn.addEventListener('click', () => this.closeSettings());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.cancelSettingsBtn.addEventListener('click', () => this.closeSettings());
        
        // Update transition value display in real-time
        this.transitionTimeSlider.addEventListener('input', (e) => {
            this.transitionValueDisplay.textContent = `${e.target.value}s`;
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowLeft':
                    this.previousSlide();
                    break;
                case 'ArrowRight':
                    this.nextSlide();
                    break;
                case 'KeyF':
                    this.toggleFullscreen();
                    break;
                case 'KeyB':
                    this.toggleFaceBoxes();
                    break;
                case 'KeyS':
                    this.openSettings();
                    break;
                case 'KeyH':
                    // Toggle UI visibility
                    this.toggleUI();
                    break;
                case 'KeyZ':
                    // Manual zoom trigger for testing
                    console.log('⌨️ Z key pressed - Manual zoom trigger');
                    const imageData = this.getImageData(this.imageFiles[this.currentSlideIndex]);
                    console.log('  - Current image:', this.imageFiles[this.currentSlideIndex]);
                    console.log('  - Image data:', imageData);
                    console.log('  - Zoom whitelist:', this.zoomWhitelist);
                    
                    const availablePerson = imageData.people.find(person => 
                        this.zoomWhitelist.includes(person.person_id) && person.face_locations.length > 0
                    );
                    console.log('  - Available person:', availablePerson);
                    
                    if (availablePerson) {
                        console.log('  - Triggering manual zoom');
                        // Use a small delay to ensure the image is ready and no other events interfere
                        setTimeout(() => {
                            this.startZoomTransition(availablePerson, 2000);
                        }, 10);
                    } else {
                        console.log('  - No available person to zoom into');
                        console.log('  - People in image:', imageData.people.map(p => `${p.person_id} (faces: ${p.face_locations.length})`));
                    }
                    break;
                case 'KeyR':
                    // Manual zoom reset
                    this.resetZoom();
                    break;
                case 'KeyT':
                    // Test direct transform application
                    console.log('🧪 T key pressed - Direct transform test');
                    this.currentImage.style.transition = 'transform 2000ms ease';
                    this.currentImage.style.transform = 'scale(2) translate(-25%, -25%)';
                    console.log('  - Applied direct transform:', this.currentImage.style.transform);
                    setTimeout(() => {
                        console.log('  - Transform after 100ms:', this.currentImage.style.transform);
                    }, 100);
                    break;
                case 'Escape':
                    this.closeSettings();
                    break;
            }
        });
        
        // Handle image load events
        this.currentImage.addEventListener('load', () => {
            this.renderFaceOverlays();
        });
        
        this.currentImage.addEventListener('error', () => {
            console.error(`Failed to load image: ${this.imageFiles[this.currentSlideIndex]}`);
            this.nextSlide();
        });
    }
    
    showSlide(index) {
        if (index < 0 || index >= this.imageFiles.length) return;
        
        this.currentSlideIndex = index;
        const imageFile = this.imageFiles[index];
        
        // Reset zoom transformation
        this.resetZoom();
        
        // Update image source - look in images folder
        this.currentImage.src = `../images/${imageFile}`;
        
        // Update slide info
        this.imageName.textContent = imageFile;
        this.slideCounter.textContent = `${index + 1} / ${this.imageFiles.length}`;
        
        // Count people and faces in current image
        const imageData = this.getImageData(imageFile);
        const totalFaces = imageData.people.reduce((sum, person) => sum + person.face_locations.length, 0);
        this.peopleCount.textContent = `${imageData.people.length} people, ${totalFaces} faces detected`;
        
        // Clear existing overlays
        this.faceOverlays.innerHTML = '';
        
        // Schedule zoom transition if auto-advance is enabled and person is in whitelist
        console.log('📸 showSlide: Checking zoom conditions');
        console.log('  - autoAdvance:', this.autoAdvance);
        console.log('  - isPlaying:', this.isPlaying);
        console.log('  - zoomEnabled:', this.zoomEnabled);
        
        if (this.autoAdvance && this.isPlaying && this.zoomEnabled) {
            console.log('  - All conditions met, scheduling zoom transition');
            this.scheduleZoomTransition(imageData);
        } else {
            console.log('  - Zoom conditions not met, skipping zoom transition');
        }
        
        // Update progress bar
        this.updateProgressBar();
    }
    
    getImageData(imageFile) {
        // Return image data from image_person_mappings structure
        return this.faceData[imageFile] || { people: [] };
    }
    
    renderFaceOverlays() {
        if (!this.showBoxes) return;
        
        const imageFile = this.imageFiles[this.currentSlideIndex];
        const imageData = this.getImageData(imageFile);
        
        // Get image dimensions and position
        const imageRect = this.currentImage.getBoundingClientRect();
        const containerRect = this.faceOverlays.getBoundingClientRect();
        
        // Calculate scale factors
        const scaleX = imageRect.width / this.currentImage.naturalWidth;
        const scaleY = imageRect.height / this.currentImage.naturalHeight;
        
        // Calculate image offset within container
        const offsetX = imageRect.left - containerRect.left;
        const offsetY = imageRect.top - containerRect.top;
        
        // Iterate through each person and their faces
        imageData.people.forEach((person, personIndex) => {
            person.face_locations.forEach((faceData, faceIndex) => {
                const location = faceData.location_pixels;
                
                // Create face box element
                const faceBox = document.createElement('div');
                faceBox.className = `face-box ${person.person_id}`;
                
                // Calculate scaled position
                const left = offsetX + (location.left * scaleX);
                const top = offsetY + (location.top * scaleY);
                const width = (location.right - location.left) * scaleX;
                const height = (location.bottom - location.top) * scaleY;
                
                faceBox.style.left = `${left}px`;
                faceBox.style.top = `${top}px`;
                faceBox.style.width = `${width}px`;
                faceBox.style.height = `${height}px`;
                
                // Create label with person ID
                const label = document.createElement('div');
                label.className = 'face-label';
                label.textContent = person.person_id.replace('person_', 'P');
                faceBox.appendChild(label);
                
                this.faceOverlays.appendChild(faceBox);
            });
        });
    }
    
    nextSlide() {
        const nextIndex = (this.currentSlideIndex + 1) % this.imageFiles.length;
        this.showSlide(nextIndex);
    }
    
    previousSlide() {
        const prevIndex = (this.currentSlideIndex - 1 + this.imageFiles.length) % this.imageFiles.length;
        this.showSlide(prevIndex);
    }
    
    togglePlayPause() {
        if (this.isPlaying) {
            this.pauseSlideshow();
        } else {
            this.startAutoplay();
        }
    }
    
    startAutoplay() {
        if (!this.autoAdvance) return;
        
        this.isPlaying = true;
        this.playPauseBtn.textContent = '⏸️ Pause';
        
        this.intervalId = setInterval(() => {
            this.nextSlide();
        }, this.slideInterval);
    }
    
    pauseSlideshow() {
        this.isPlaying = false;
        this.playPauseBtn.textContent = '▶️ Play';
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        // Clear zoom timeout and reset zoom when pausing
        if (this.zoomTimeout) {
            clearTimeout(this.zoomTimeout);
            this.zoomTimeout = null;
        }
        this.resetZoom();
    }
    
    startSlideshow() {
        this.startAutoplay();
    }
    
    stopSlideshow() {
        this.pauseSlideshow();
    }
    
    // Zoom transition methods
    scheduleZoomTransition(imageData) {
        console.log('🎯 scheduleZoomTransition called');
        console.log('  - zoomEnabled:', this.zoomEnabled);
        console.log('  - autoAdvance:', this.autoAdvance);
        console.log('  - isPlaying:', this.isPlaying);
        console.log('  - zoomWhitelist:', this.zoomWhitelist);
        console.log('  - imageData.people:', imageData.people.map(p => p.person_id));
        
        // Add random chance (1 in 5 = 20% chance)
        const randomChance = Math.random();
        const shouldZoom = randomChance < 0.3; // 20% chance (1/5)
        console.log('  - Random chance:', randomChance.toFixed(3));
        console.log('  - Should zoom:', shouldZoom);
        
        if (!shouldZoom) {
            console.log('  - Random chance failed, skipping zoom transition');
            return;
        }
        
        // Clear any existing zoom timeout
        if (this.zoomTimeout) {
            clearTimeout(this.zoomTimeout);
            console.log('  - Cleared existing zoom timeout');
        }
        
        // Find a person in the whitelist that exists in this image
        const availablePerson = imageData.people.find(person => 
            this.zoomWhitelist.includes(person.person_id) && person.face_locations.length > 0
        );
        
        console.log('  - availablePerson:', availablePerson ? availablePerson.person_id : 'none');
        
        if (availablePerson) {
            // Schedule zoom to start at 80% of the slide interval (last 20%)
            const zoomStartTime = this.slideInterval * 0.5;
            const zoomDuration = this.slideInterval * 0.9;
            
            console.log(`  - Scheduling zoom in ${zoomStartTime}ms for ${zoomDuration}ms duration`);
            
            this.zoomTimeout = setTimeout(() => {
                this.startZoomTransition(availablePerson, zoomDuration);
            }, zoomStartTime);
        } else {
            console.log('  - No available person to zoom into');
        }
    }
    
    startZoomTransition(person, duration) {
        console.log('🔍 startZoomTransition called');
        console.log('  - person:', person.person_id);
        console.log('  - person object:', person);
        console.log('  - duration:', duration);
        console.log('  - isZooming:', this.isZooming);
        
        if (this.isZooming) {
            console.log('  - Already zooming, skipping');
            return;
        }
        
        // Get the first face location for this person
        const faceLocation = person.face_locations[0];
        if (!faceLocation) {
            console.log('  - No face location found, skipping');
            return;
        }
        
        console.log('  - faceLocation:', faceLocation);
        console.log('  - faceLocation properties:');
        console.log('    - location_pixels:', faceLocation.location_pixels);
        console.log('    - location_normalized:', faceLocation.location_normalized);
        
        // Check if we have the correct data structure
        if (!faceLocation.location_pixels && !faceLocation.location_normalized) {
            console.log('  - Invalid face location structure, skipping');
            return;
        }
        
        console.log('  - image element:', this.currentImage);
        console.log('  - image naturalWidth/Height:', this.currentImage.naturalWidth, this.currentImage.naturalHeight);
        console.log('  - image loaded:', this.currentImage.complete);
        console.log('  - image src:', this.currentImage.src);
        
        // Check if image is actually loaded
        if (this.currentImage.naturalWidth === 0 || this.currentImage.naturalHeight === 0) {
            console.log('  - Image not loaded yet, waiting for load...');
            this.currentImage.addEventListener('load', () => {
                console.log('  - Image loaded, retrying zoom');
                this.startZoomTransition(person, duration);
            }, { once: true });
            return;
        }
        
        let normalizedX, normalizedY;
        
        // Use normalized coordinates if available (preferred)
        if (faceLocation.location_normalized) {
            const leftNorm = faceLocation.location_normalized.left_normalized;
            const rightNorm = faceLocation.location_normalized.right_normalized;
            const topNorm = faceLocation.location_normalized.top_normalized;
            const bottomNorm = faceLocation.location_normalized.bottom_normalized;
            
            normalizedX = (leftNorm + rightNorm) / 2;
            normalizedY = (topNorm + bottomNorm) / 2;
            
            console.log('  - Using normalized coordinates:');
            console.log('    - left_normalized:', leftNorm);
            console.log('    - right_normalized:', rightNorm);
            console.log('    - top_normalized:', topNorm);
            console.log('    - bottom_normalized:', bottomNorm);
        } else {
            // Fall back to pixel coordinates
            const pixels = faceLocation.location_pixels;
            const centerX = (pixels.left + pixels.right) / 2;
            const centerY = (pixels.top + pixels.bottom) / 2;
            
            normalizedX = centerX / this.currentImage.naturalWidth;
            normalizedY = centerY / this.currentImage.naturalHeight;
            
            console.log('  - Using pixel coordinates:');
            console.log('    - left:', pixels.left);
            console.log('    - right:', pixels.right);
            console.log('    - top:', pixels.top);
            console.log('    - bottom:', pixels.bottom);
            console.log('    - centerX:', centerX);
            console.log('    - centerY:', centerY);
        }
        
        console.log('  - Final normalizedX/Y:', normalizedX, normalizedY);
        
        this.zoomToPosition(normalizedX, normalizedY, duration);
    }
    
    zoomToPosition(normalizedX, normalizedY, duration = 1000) {
        console.log('🎬 zoomToPosition called');
        console.log('  - normalizedX/Y:', normalizedX, normalizedY);
        console.log('  - duration:', duration);
        console.log('  - isZooming:', this.isZooming);
        
        // Validate input parameters
        if (isNaN(normalizedX) || isNaN(normalizedY)) {
            console.error('  - Invalid normalized coordinates (NaN), aborting zoom');
            console.log('  - normalizedX is NaN:', isNaN(normalizedX));
            console.log('  - normalizedY is NaN:', isNaN(normalizedY));
            return;
        }
        
        if (this.isZooming) {
            console.log('  - Already zooming, skipping');
            return;
        }
        
        this.isZooming = true;
        
        // Calculate zoom parameters
        const zoomScale = 2.0; // 2x zoom
        
        // Calculate initial translation based on face position
        let translateX = -(normalizedX - 0.5) * 100 * zoomScale;
        let translateY = -(normalizedY - 0.5) * 100 * zoomScale;
        
        console.log('  - zoomScale:', zoomScale);
        console.log('  - Initial translateX/Y:', translateX, translateY);
        
        // Constrain translation to prevent going too far beyond image edges
        // When zoomed by 2x, the visible area is 50% of the original image
        // So we need to limit translation to keep some image content visible
        
        // Calculate the maximum safe translation (as percentage)
        // At 2x zoom, we can translate up to 50% in each direction before losing all image content
        const maxTranslatePercent = (zoomScale - 1) * 20; // For 2x zoom, this is 50%
        
        // Constrain the translation values
        translateX = Math.max(-maxTranslatePercent, Math.min(maxTranslatePercent, translateX));
        translateY = Math.max(-maxTranslatePercent, Math.min(maxTranslatePercent, translateY));
        
        console.log('  - Max translate percent:', maxTranslatePercent);
        console.log('  - Constrained translateX/Y:', translateX, translateY);
        
        // Validate calculated values
        if (isNaN(translateX) || isNaN(translateY)) {
            console.error('  - Invalid translate values (NaN), aborting zoom');
            this.isZooming = false;
            return;
        }
        
        // Apply zoom transformation with smooth transition
        const transformString = `scale(${zoomScale}) translate(${translateX}%, ${translateY}%)`;
        console.log('  - transform string:', transformString);
        
        this.currentImage.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
        this.currentImage.style.transform = transformString;
        this.currentImage.style.transformOrigin = 'center center';
        
        console.log('  - Applied transform to image');
        console.log('  - Current image style.transform:', this.currentImage.style.transform);
        console.log('  - Current image computed transform:', window.getComputedStyle(this.currentImage).transform);
        
        // Check transform after a small delay to see if it's being overridden
        setTimeout(() => {
            console.log('  - Transform after 100ms:', this.currentImage.style.transform);
            console.log('  - Computed transform after 100ms:', window.getComputedStyle(this.currentImage).transform);
        }, 100);
        
        // Reset zoom flag after transition
        setTimeout(() => {
            this.isZooming = false;
            console.log('  - Zoom transition completed');
        }, duration);
    }
    
    resetZoom() {
        console.log('🔄 resetZoom called');
        console.trace('  - Call stack:'); // This will show us what's calling resetZoom
        
        // Clear any pending zoom timeout
        if (this.zoomTimeout) {
            clearTimeout(this.zoomTimeout);
            this.zoomTimeout = null;
            console.log('  - Cleared zoom timeout');
        }
        
        // Reset image transformation immediately (snap back, no animation)
        this.currentImage.style.transition = 'none'; // Remove any transition for instant snap
        this.currentImage.style.transform = 'scale(1) translate(0%, 0%)';
        this.isZooming = false;
        
        console.log('  - Snapped image transform to scale(1) translate(0%, 0%) instantly');
        
        // Force a reflow to ensure the immediate change is applied
        this.currentImage.offsetHeight;
        
        // Clear transition style immediately since we don't need it
        this.currentImage.style.transition = '';
        console.log('  - Cleared transition styles immediately');
    }
    
    toggleFaceBoxes() {
        this.showBoxes = !this.showBoxes;
        this.toggleBoxesBtn.textContent = this.showBoxes ? '📦 Hide Boxes' : '📦 Show Boxes';
        
        if (this.showBoxes) {
            this.container.classList.remove('boxes-hidden');
            this.renderFaceOverlays();
        } else {
            this.container.classList.add('boxes-hidden');
        }
    }
    
    toggleUI() {
        this.isUIHidden = !this.isUIHidden;
        
        if (this.isUIHidden) {
            document.body.classList.add('ui-hidden');
            this.hideUIBtn.textContent = '👁️ Show UI';
            
            // Show hint for a few seconds
            document.body.classList.add('show-ui-hint');
            setTimeout(() => {
                document.body.classList.remove('show-ui-hint');
            }, 3000);
        } else {
            document.body.classList.remove('ui-hidden');
            this.hideUIBtn.textContent = '👁️ Hide UI';
        }
        
        console.log('UI visibility toggled:', this.isUIHidden ? 'hidden' : 'visible');
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    updateProgressBar() {
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            const progress = ((this.currentSlideIndex + 1) / this.imageFiles.length) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }
    
    // Settings Modal Methods
    openSettings() {
        // Update modal values with current settings
        this.transitionTimeSlider.value = this.slideInterval / 1000;
        this.transitionValueDisplay.textContent = `${this.slideInterval / 1000}s`;
        this.autoAdvanceCheckbox.checked = this.autoAdvance;
        this.zoomEnabledCheckbox.checked = this.zoomEnabled;
        this.zoomWhitelistInput.value = this.zoomWhitelist.join(',');
        
        this.settingsModal.style.display = 'block';
    }
    
    closeSettings() {
        this.settingsModal.style.display = 'none';
    }
    
    saveSettings() {
        // Update slideshow settings
        this.slideInterval = parseFloat(this.transitionTimeSlider.value) * 1000;
        this.autoAdvance = this.autoAdvanceCheckbox.checked;
        this.zoomEnabled = this.zoomEnabledCheckbox.checked;
        
        // Parse zoom whitelist
        try {
            const whitelistText = this.zoomWhitelistInput.value.trim();
            if (whitelistText) {
                this.zoomWhitelist = whitelistText.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            } else {
                this.zoomWhitelist = [];
            }
        } catch (e) {
            console.warn('Invalid zoom whitelist format, keeping current values');
        }
        
        // Save to localStorage
        localStorage.setItem('slideshowSettings', JSON.stringify({
            slideInterval: this.slideInterval,
            autoAdvance: this.autoAdvance,
            zoomEnabled: this.zoomEnabled,
            zoomWhitelist: this.zoomWhitelist
        }));
        
        // Restart slideshow with new interval if playing
        if (this.isPlaying && this.autoAdvance) {
            this.stopSlideshow();
            this.startSlideshow();
        } else if (!this.autoAdvance) {
            this.stopSlideshow();
            this.playPauseBtn.textContent = '▶️ Play';
            this.isPlaying = false;
        }
        
        this.closeSettings();
    }
    
    loadSettings() {
        const savedSettings = localStorage.getItem('slideshowSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                this.slideInterval = settings.slideInterval || 5000;
                this.autoAdvance = settings.autoAdvance !== undefined ? settings.autoAdvance : true;
                this.zoomEnabled = settings.zoomEnabled !== undefined ? settings.zoomEnabled : true;
                this.zoomWhitelist = settings.zoomWhitelist || ["person_0", "person_12"];
            } catch (e) {
                console.warn('Failed to load saved settings, using defaults');
            }
        }
    }
}

// Initialize slideshow when page loads
document.addEventListener('DOMContentLoaded', () => {
    new FaceDetectionSlideshow();
});

// Handle window resize to reposition face overlays
window.addEventListener('resize', () => {
    setTimeout(() => {
        const slideshow = window.slideshow;
        if (slideshow) {
            slideshow.renderFaceOverlays();
        }
    }, 100);
});

// Export for global access
window.slideshow = null;
document.addEventListener('DOMContentLoaded', () => {
    window.slideshow = new FaceDetectionSlideshow();
});