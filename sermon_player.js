// Papa's Sermon Collection Player JavaScript

class SermonPlayer {
    constructor() {
        this.transcriptData = null;
        this.currentSermon = null;
        this.audioPlayer = document.getElementById('audioPlayer');
        this.currentTranscriptData = null;
        this.currentSegment = null; // Track current segment for auto-scroll behavior
        this.lastPlaybackTime = 0; // Track last playback time
        this.playPauseButton = document.getElementById('playPauseButton');
        
        this.initializePlayer();
        this.loadTranscriptData();
        this.setupEventListeners();
    }

    initializePlayer() {
        // Set up tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Set up progress bar clicking
        const progressBar = document.querySelector('.progress-bar');
        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.seekToPercent(percent);
        });

        // Set up sermon selector toggle
        const toggleButton = document.getElementById('toggleSermonList');
        const sermonSelector = document.querySelector('.sermon-selector');
        
        toggleButton.addEventListener('click', () => {
            sermonSelector.classList.toggle('collapsed');
        });

        // Set up play/pause button
        this.playPauseButton.addEventListener('click', () => {
            this.togglePlayPause();
        });
    }

    async loadTranscriptData() {
        try {
            const response = await fetch('./final_lower/comprehensive_transcript_mapping.json');
            this.transcriptData = await response.json();
            this.populateSermonList();
        } catch (error) {
            console.error('Error loading transcript data:', error);
            this.showError('Failed to load sermon data');
        }
    }

    populateSermonList() {
        const sermonList = document.getElementById('sermonList');
        sermonList.innerHTML = '';

        this.transcriptData.transcripts.forEach((sermon, index) => {
            const sermonItem = document.createElement('div');
            sermonItem.className = 'sermon-item';
            sermonItem.dataset.sermonId = sermon.file;
            
            sermonItem.innerHTML = `
                <h4>${sermon.title}</h4>
                <p>${sermon.file}</p>
            `;
            
            sermonItem.addEventListener('click', () => {
                this.selectSermon(sermon, sermonItem);
            });
            
            sermonList.appendChild(sermonItem);
        });
    }

    async selectSermon(sermon, element) {
        // Update active sermon in list
        document.querySelectorAll('.sermon-item').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');

        this.currentSermon = sermon;
        
        // Reset current segment for new sermon
        this.currentSegment = null;
        this.lastPlaybackTime = 0;
        
        // Update sermon info
        document.getElementById('sermonTitle').textContent = sermon.title;
        document.getElementById('sermonSummary').textContent = sermon.summary;
        
        // Load audio
        const audioPath = `./final_lower/${sermon.file}.mp3`;
        this.audioPlayer.src = audioPath;
        
        // Enable play/pause button
        this.playPauseButton.disabled = false;
        
        // Load transcript
        await this.loadTranscript(sermon.file);
        
        // Update content displays
        this.updateContentDisplays();
        
        // Reset progress
        this.updateProgress();
    }

    async loadTranscript(sermonFile) {
        try {
            const response = await fetch(`./final_lower/${sermonFile}.srt`);
            const srtContent = await response.text();
            this.currentTranscriptData = this.parseSRT(srtContent);
            this.displayTranscript();
        } catch (error) {
            console.error('Error loading transcript:', error);
            document.getElementById('transcriptDisplay').innerHTML = 
                '<p class="error">Transcript not available for this sermon.</p>';
        }
    }

    parseSRT(srtContent) {
        const segments = [];
        const blocks = srtContent.trim().split(/\n\s*\n/);
        
        blocks.forEach(block => {
            const lines = block.trim().split('\n');
            if (lines.length >= 3) {
                const index = lines[0];
                const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
                
                if (timeMatch) {
                    const startTime = this.timeToSeconds(timeMatch[1]);
                    const endTime = this.timeToSeconds(timeMatch[2]);
                    const text = lines.slice(2).join(' ');
                    
                    segments.push({
                        index: parseInt(index),
                        startTime,
                        endTime,
                        text,
                        timeString: timeMatch[1] + ' --> ' + timeMatch[2]
                    });
                }
            }
        });
        
        return segments;
    }

    timeToSeconds(timeString) {
        const [time, ms] = timeString.split(',');
        const [hours, minutes, seconds] = time.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds + ms / 1000;
    }

    secondsToTimeString(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    }

    displayTranscript() {
        console.log('Displaying transcript');
        const transcriptDisplay = document.getElementById('transcriptDisplay');
        
        if (!this.currentTranscriptData || this.currentTranscriptData.length === 0) {
            transcriptDisplay.innerHTML = '<p>No transcript available</p>';
            return;
        }
        
        transcriptDisplay.innerHTML = this.currentTranscriptData.map(segment => `
            <div class="transcript-segment" data-start="${segment.startTime}" data-end="${segment.endTime}">
                <div class="segment-time">${segment.timeString}</div>
                <div class="segment-text">${segment.text}</div>
            </div>
        `).join('');
        
        // Add click listeners to segments
        document.querySelectorAll('.transcript-segment').forEach(segment => {
            segment.addEventListener('click', () => {
                const startTime = parseFloat(segment.dataset.start);
                this.seekToTime(startTime);
            });
        });
    }

    updateContentDisplays() {
        if (!this.currentSermon) return;
        
        this.displayBibleVerses();
        this.displayHymns();
        this.displayThemes();
        this.createProgressMarkers();
    }

    displayBibleVerses() {
        const versesDisplay = document.getElementById('versesDisplay');
        const verses = this.currentSermon.bible_verses || [];
        
        if (verses.length === 0) {
            versesDisplay.innerHTML = '<p>No Bible verses recorded for this sermon</p>';
            return;
        }
        
        versesDisplay.innerHTML = verses.map((verse, index) => {
            const timecode = typeof verse === 'object' ? verse.timecode : '00:00:00,000 --> 00:00:30,000';
            const text = typeof verse === 'object' ? verse.text : verse;
            const startTime = this.timeToSeconds(timecode.split(' --> ')[0]);
            
            return `
                <div class="clickable-item">
                    <button class="timecode-button" data-time="${startTime}">
                        ${timecode.split(' --> ')[0]}
                    </button>
                    <div class="item-text">${text}</div>
                </div>
            `;
        }).join('');

        // Add event listeners to timecode buttons
        versesDisplay.querySelectorAll('.timecode-button').forEach(button => {
            button.addEventListener('click', () => {
                const time = parseFloat(button.dataset.time);
                this.seekToTime(time);
            });
        });
    }

    displayHymns() {
        const hymnsDisplay = document.getElementById('hymnsDisplay');
        const hymns = this.currentSermon.hymns_songs || [];
        
        if (hymns.length === 0) {
            hymnsDisplay.innerHTML = '<p>No hymns or songs recorded for this sermon</p>';
            return;
        }
        
        hymnsDisplay.innerHTML = hymns.map((hymn, index) => {
            const timecode = typeof hymn === 'object' ? hymn.timecode : '00:00:00,000 --> 00:00:30,000';
            const text = typeof hymn === 'object' ? hymn.text : hymn;
            const startTime = this.timeToSeconds(timecode.split(' --> ')[0]);
            
            return `
                <div class="clickable-item">
                    <button class="timecode-button" data-time="${startTime}">
                        ${timecode.split(' --> ')[0]}
                    </button>
                    <div class="item-text">${text}</div>
                </div>
            `;
        }).join('');

        // Add event listeners to timecode buttons
        hymnsDisplay.querySelectorAll('.timecode-button').forEach(button => {
            button.addEventListener('click', () => {
                const time = parseFloat(button.dataset.time);
                this.seekToTime(time);
            });
        });
    }

    displayThemes() {
        const themesDisplay = document.getElementById('themesDisplay');
        const themes = this.currentSermon.themes || [];
        
        if (themes.length === 0) {
            themesDisplay.innerHTML = '<p>No themes recorded for this sermon</p>';
            return;
        }
        
        themesDisplay.innerHTML = themes.map(theme => `
            <div class="theme-item">${theme}</div>
        `).join('');
    }

    createProgressMarkers() {
        const markersContainer = document.getElementById('progressMarkers');
        markersContainer.innerHTML = '';
        
        if (!this.currentSermon || !this.audioPlayer.duration) return;
        
        const duration = this.audioPlayer.duration;
        const allItems = [
            ...(this.currentSermon.bible_verses || []),
            ...(this.currentSermon.hymns_songs || [])
        ];
        
        allItems.forEach(item => {
            if (typeof item === 'object' && item.timecode) {
                const startTime = this.timeToSeconds(item.timecode.split(' --> ')[0]);
                const percent = (startTime / duration) * 100;
                
                const marker = document.createElement('div');
                marker.className = 'progress-marker';
                marker.style.left = `${percent}%`;
                marker.title = item.text;
                markersContainer.appendChild(marker);
            }
        });
    }

    setupEventListeners() {
        // Audio player events
        this.audioPlayer.addEventListener('loadedmetadata', () => {
            this.updateDuration();
            this.createProgressMarkers();
        });
        
        this.audioPlayer.addEventListener('play', () => {
            this.updatePlayPauseButton();
        });
        
        this.audioPlayer.addEventListener('pause', () => {
            this.updatePlayPauseButton();
        });
        
        this.audioPlayer.addEventListener('timeupdate', () => {
            this.updateProgress();
            this.highlightCurrentSegment();
        });
        
        this.audioPlayer.addEventListener('ended', () => {
            this.updateProgress();
            this.updatePlayPauseButton();
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    seekToTime(seconds) {
        this.audioPlayer.currentTime = seconds;
        this.audioPlayer.play();
    }

    seekToPercent(percent) {
        if (this.audioPlayer.duration) {
            const time = this.audioPlayer.duration * percent;
            this.seekToTime(time);
        }
    }

    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        const currentTimeDisplay = document.getElementById('currentTime');
        
        if (this.audioPlayer.duration) {
            const percent = (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100;
            progressFill.style.width = `${percent}%`;
        }
        
        currentTimeDisplay.textContent = this.formatTime(this.audioPlayer.currentTime);
    }

    updateDuration() {
        const durationDisplay = document.getElementById('duration');
        durationDisplay.textContent = this.formatTime(this.audioPlayer.duration);
    }

    currentStatement = null;
    highlightCurrentSegment() {
        if (!this.currentTranscriptData) return;
        
        const currentTime = this.audioPlayer.currentTime;
        
        // Find the current segment based on playback time
        const currentSegment = this.currentTranscriptData.find(segment => 
            currentTime >= segment.startTime && currentTime <= segment.endTime
        );
        
        // Only proceed if we have a segment and it's different from the previous one
        if (currentSegment && currentSegment !== this.currentSegment) {
            // Remove active class from all segments
            document.querySelectorAll('.transcript-segment').forEach(segment => {
                segment.classList.remove('active');
            });
            
            // Find and highlight the current segment element
            const segmentElement = document.querySelector(`[data-start="${currentSegment.startTime}"]`);
            if (segmentElement) {
                segmentElement.classList.add('active');
                
                // Auto-scroll to the new segment when audio is playing
                if (!this.audioPlayer.paused) {
                    segmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    console.log(`Auto-scrolling to new segment: ${currentSegment.startTime}`);
                }
            }
            
            // Update the tracked current segment
            this.currentSegment = currentSegment;
        }
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '00:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    showError(message) {
        console.error(message);
        document.getElementById('sermonList').innerHTML = `<div class="error">${message}</div>`;
    }

    togglePlayPause() {
        if (this.audioPlayer.paused) {
            this.audioPlayer.play();
        } else {
            this.audioPlayer.pause();
        }
    }

    updatePlayPauseButton() {
        const playIcon = this.playPauseButton.querySelector('.play-icon');
        const pauseIcon = this.playPauseButton.querySelector('.pause-icon');
        
        if (this.audioPlayer.paused || this.audioPlayer.ended) {
            playIcon.style.display = 'inline';
            pauseIcon.style.display = 'none';
        } else {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'inline';
        }
    }
}

// Initialize the sermon player when the page loads
let sermonPlayer;
document.addEventListener('DOMContentLoaded', () => {
    sermonPlayer = new SermonPlayer();
});
