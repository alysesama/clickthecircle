document.addEventListener('DOMContentLoaded', async () => {
    const TOTAL_CIRCLES = 20;
    const LEVEL_THRESHOLDS = [0, 10, 100, 1000, 10000, 100000];
    const CIRCLE_TYPES = {
        c1: { points: 1, color: '#e0e0e0', size: 300 },
        c2: { points: 2, color: '#2ecc71', size: 275 },
        c4: { points: 4, color: '#3498db', size: 250 },
        c8: { points: 8, color: '#9b59b6', size: 225 },
        c16: { points: 16, color: '#f1c40f', size: 200 },
        c32: { points: 32, color: '#e67e22', size: 175 },
        c64: { points: 64, color: '#e74c3c', size: 150 }
    };
    const CIRCLE_CLASSES = Object.keys(CIRCLE_TYPES);

    // Sound Effects
    const circleHitSound = new Audio('res/sound/circle_hit.mp3');

    let score = 0;
    let level = 1;
    let saveData = {};

    // --- Game Initialization ---
    async function initializeGame() {
        // Wait for components to be loaded before trying to access their elements
        await new Promise(resolve => {
            if (document.querySelector('.menu-tab')) {
                resolve();
            } else {
                document.addEventListener('componentsLoaded', resolve, { once: true });
            }
        });

        saveData = await SaveManager.load();
        applySaveData();
        
        // Initial setup
        updateLevelAndProgress();
        for (let i = 0; i < TOTAL_CIRCLES; i++) {
            createRandomCircle();
        }

        // Start autosave interval
        setInterval(SaveManager.save, 1000);
    }

    function applySaveData() {
        score = saveData.singleScore || 0;
        updateScore(0); // Update UI with loaded score
        
        // Apply settings
        const savedColor = saveData['setting-color'];
        if (savedColor) {
            if (savedColor.startsWith('url(')) {
                 let bgOverlay = document.getElementById('background-overlay');
                 if(bgOverlay) bgOverlay.style.backgroundImage = savedColor;
            } else {
                document.body.style.backgroundColor = savedColor;
            }
        }

        SaveManager.updateStatisticsUI();
    }
    
    const scoreEl = document.getElementById('score');
    const levelEl = document.getElementById('level');
    const progressBarEl = document.getElementById('progress-bar');
    const cpsCounterEl = document.getElementById('cps-counter');
    const spsCounterEl = document.getElementById('sps-counter');
    const autoButton = document.querySelector('.auto-button');

    let clicks = 0;
    let scoreFromClicks = 0;
    let lastCheckTime = Date.now();

    // CPS and SPS Calculation
    setInterval(() => {
        const now = Date.now();
        const timeDiff = (now - lastCheckTime) / 1000;

        if (timeDiff > 0) {
            const cps = (clicks / timeDiff);
            const sps = (scoreFromClicks / timeDiff);

            if (cps > (saveData.statistics.highestManualClicksPerSecond || 0)) {
                SaveManager.updateStatistic('highestManualClicksPerSecond', cps);
            }
            if (sps > (saveData.statistics.highestScorePerSecond || 0)) {
                SaveManager.updateStatistic('highestScorePerSecond', sps);
            }

            cpsCounterEl.textContent = `${cps.toFixed(2)} clicks/s`;
            spsCounterEl.textContent = `${sps.toFixed(2)} pts/s`;
        }

        clicks = 0;
        scoreFromClicks = 0;
        lastCheckTime = now;
    }, 1000);

    // Auto button logic
    const autoButtonOverlayDuration = document.querySelector('.auto-button-overlay.duration');
    const autoButtonOverlayRefill = document.querySelector('.auto-button-overlay.refill');
    let isAutoActive = false;
    let autoInterval;
    let autoTimeout;
    let refillTimeout;
    let currentAutoSessionScore = 0;

    autoButton.addEventListener('click', () => {
        if (isAutoActive) return;

        isAutoActive = true;
        autoButton.disabled = true;
        currentAutoSessionScore = 0;

        autoInterval = setInterval(() => {
            const circles = document.querySelectorAll('.c1');
            if (circles.length > 0) {
                const randomIndex = Math.floor(Math.random() * circles.length);
                circles[randomIndex]?.click();
            }
        }, 5);

        autoButtonOverlayDuration.style.transition = 'transform 30s linear';
        autoButtonOverlayDuration.style.transform = 'translate(0, 100%)';

        autoTimeout = setTimeout(() => {
            clearInterval(autoInterval);

            if (currentAutoSessionScore > (saveData.statistics.highestSingleAutoScore || 0)) {
                SaveManager.updateStatistic('highestSingleAutoScore', currentAutoSessionScore);
            }
            
            autoButtonOverlayRefill.style.transition = 'transform 60s linear';
            autoButtonOverlayRefill.style.transform = 'translate(0, -100%)';

            refillTimeout = setTimeout(() => {
                isAutoActive = false;
                autoButton.disabled = false;
                autoButtonOverlayDuration.style.transition = 'none';
                autoButtonOverlayDuration.style.transform = 'rotate(0deg)';
                autoButtonOverlayRefill.style.transition = 'none';
                autoButtonOverlayRefill.style.transform = 'rotate(0deg)';
            }, 60000);

        }, 30000);
    });

    function createRandomCircle() {
        if (document.querySelectorAll('.c1').length >= TOTAL_CIRCLES) return;

        const randomClass = CIRCLE_CLASSES[Math.floor(Math.random() * CIRCLE_CLASSES.length)];
        const type = CIRCLE_TYPES[randomClass];

        const circle = document.createElement('div');
        circle.classList.add('c1', randomClass);

        const size = type.size;
        const x = Math.random() * (window.innerWidth - size);
        const y = Math.random() * (window.innerHeight - size);

        Object.assign(circle.style, {
            left: `${x}px`,
            top: `${y}px`,
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: type.color
        });

        circle.addEventListener('click', (e) => {
            if (SaveManager.getData()['setting-sound']) {
                circleHitSound.currentTime = 0;
                circleHitSound.play();
            }

            const points = type.points;
            
            if (e.isTrusted) { // Manual click
                clicks++;
                scoreFromClicks += points;
            } else { // Auto-click
                currentAutoSessionScore += points;
            }
            
            SaveManager.incrementCircleClick(randomClass);
            updateScore(points);
            showScorePopup(x + size / 2, y + size / 2, points, type.color);

            circle.style.transform = 'scale(0)';
            setTimeout(() => {
                circle.remove();
                createRandomCircle();
            }, 5);
        });

        document.body.appendChild(circle);
        setTimeout(() => circle.style.transform = 'scale(1)', 5);
    }

    function showScorePopup(x, y, points, color) {
        const popup = document.createElement('div');
        popup.classList.add('score-popup');
        popup.textContent = `+${points}`;
        Object.assign(popup.style, {
            color: color,
            left: `${x - popup.offsetWidth / 2}px`,
            top: `${y}px`
        });
        document.body.appendChild(popup);

        setTimeout(() => Object.assign(popup.style, { opacity: '1', transform: 'scale(1)' }), 10);
        setTimeout(() => popup.style.top = `${y - 50}px`, 50);
        setTimeout(() => {
            popup.style.opacity = '0';
            setTimeout(() => popup.remove(), 200);
        }, 250);
    }

    function updateScore(points) {
        score += points;
        SaveManager.updateData('singleScore', score);
        scoreEl.textContent = score.toString().padStart(8, '0');
        updateLevelAndProgress();
    }

    function updateLevelAndProgress() {
        const currentLevelThreshold = LEVEL_THRESHOLDS[level - 1];
        const nextLevelThreshold = LEVEL_THRESHOLDS[level] || Infinity;

        if (score >= nextLevelThreshold && level < LEVEL_THRESHOLDS.length - 1) {
            level++;
            levelEl.textContent = `Level ${level}`;
        }
        
        const scoreInCurrentLevel = score - currentLevelThreshold;
        const scoreNeededForNextLevel = nextLevelThreshold - currentLevelThreshold;
        
        const progress = scoreNeededForNextLevel > 0 ? (scoreInCurrentLevel / scoreNeededForNextLevel) * 100 : 100;
        progressBarEl.style.width = `${Math.min(progress, 100)}%`;
    }

    initializeGame();
});