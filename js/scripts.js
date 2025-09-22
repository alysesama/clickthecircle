document.addEventListener('DOMContentLoaded', async () => {
    // Game configuration will be loaded from circle_table.json
    let levelTable = {};
    let circleTable = {};
    let botclicker_table = {};
    const CIRCLE_TYPES = {
        c1: { color: '#e0e0e0', size: 300 },
        c2: { color: '#2ecc71', size: 275 },
        c4: { color: '#3498db', size: 250 },
        c8: { color: '#9b59b6', size: 225 },
        c16: { color: '#f1c40f', size: 200 },
        c32: { color: '#e67e22', size: 175 },
        c64: { color: '#e74c3c', size: 150 }
    };

    // Sound Effects Pool
    const AUDIO_POOL_SIZE = 36;  // Number of audio elements to pre-create
    const circleHitSoundPool = Array.from({ length: AUDIO_POOL_SIZE }, () => {
        const audio = new Audio('res/sound/circle_hit.mp3');
        audio.volume = 0.6;  // Reduce volume a bit since we'll have multiple sounds
        return audio;
    });
    let currentAudioIndex = 0;

    let score = 0;
    let level = 1;
    let saveData = {};

    // Load game configuration
    async function loadGameConfig() {
        try {
            const response = await fetch('res/circle_table.json');
            if (!response.ok) throw new Error('Failed to load circle_table.json');
            const data = await response.json();
            levelTable = data.level_table;
            circleTable = data.circle_table;
            botclicker_table = data.botclicker_table;
            return true;
        } catch (error) {
            console.error('Error loading game configuration:', error);
            return false;
        }
    }

    // --- Game Initialization ---
    async function initializeGame() {
        try {
            // Load game configuration first
            const configLoaded = await loadGameConfig();
            if (!configLoaded) {
                console.error('Failed to load game configuration');
                return;
            }

            // Wait for SaveManager and components
            saveData = await SaveManager.load();
            await new Promise(resolve => {
                if (document.querySelector('.menu-tab')) {
                    resolve();
                } else {
                    document.addEventListener('componentsLoaded', resolve, { once: true });
                }
            });

            // Apply save data and update UI
            applySaveData();
            updateLevelAndProgress();
            
            // Clear any existing circles
            document.querySelectorAll('.c1').forEach(circle => circle.remove());
            
            // Create initial circles based on current level's max-popup
            const currentLevelData = levelTable[level.toString()];
            if (currentLevelData) {
                const maxPopup = currentLevelData['max-popup'];
                console.log(`Initializing level ${level} with ${maxPopup} circles`);
                for (let i = 0; i < maxPopup; i++) {
                    createRandomCircle();
                }
            }

            // Start autosave interval
            setInterval(SaveManager.save, 1000);

        } catch (error) {
            console.error('Error initializing game:', error);
        }
    }

    function applySaveData() {
        score = saveData.singleScore || 0;
        
        // Calculate current level based on total score
        const totalScore = (saveData.totalScore || 0) + (saveData.singleScore || 0);
        let newLevel = 1;
        
        // Find the highest level that the total score qualifies for
        for (let i = 1; levelTable[i.toString()]; i++) {
            if (totalScore >= levelTable[i.toString()].max) {
                newLevel = i;
            } else {
                break;
            }
        }
        level = newLevel;
        
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

            // Only update manual CPS record if not in auto mode
            if (!isAutoActive && cps > (saveData.statistics.highestManualClicksPerSecond || 0)) {
                SaveManager.updateStatistic('highestManualClicksPerSecond', cps);
            }
            // Always update SPS record regardless of mode
            if (sps > (saveData.statistics.highestScorePerSecond || 0)) {
                SaveManager.updateStatistic('highestScorePerSecond', sps);
            }

            cpsCounterEl.textContent = `${cps.toFixed(2)} clicks/s`;
            spsCounterEl.textContent = `${sps.toFixed(2)} pts/s`;

            // Update progress bar more frequently while auto is active
            if (isAutoActive) {
                updateLevelAndProgress();
            }
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
        // Check if bot is active or waiting for refill
        if (isAutoActive) return;
        const now = Date.now();
        const nextAutoTime = SaveManager.getData().nextAutoTime || 0;
        if (now < nextAutoTime) {
            console.log(`Bot still refilling, ready in ${((nextAutoTime - now) / 1000).toFixed(1)}s`);
            return;
        }

        // Get bot upgrade levels and their values from table
        const botUpgrades = SaveManager.getData().upgradeLevel.botclicker;
        let clickSpeedMs, durationMs, refillTimeMs;

        // Click speed (level 0 = 233ms)
        if (botUpgrades.clickspeed === 0) {
            clickSpeedMs = 233;
        } else {
            const speedEntry = botclicker_table.clickspeed[botUpgrades.clickspeed - 1];
            clickSpeedMs = speedEntry ? speedEntry.value : 100;
        }

        // Duration (level 0 = 10s)
        if (botUpgrades.duration === 0) {
            durationMs = 10000;
        } else {
            const durationEntry = botclicker_table.duration[botUpgrades.duration - 1];
            durationMs = (durationEntry ? durationEntry.value : 30) * 1000;
        }

        // Refill time (level 0 = 180s)
        if (botUpgrades.refilltime === 0) {
            refillTimeMs = 180000;
        } else {
            const refillEntry = botclicker_table.refilltime[botUpgrades.refilltime - 1];
            refillTimeMs = (refillEntry ? refillEntry.value : 60) * 1000;
        }

        // console.log('Bot stats:', {
        //     clickSpeedMs,
        //     durationMs: durationMs / 1000 + 's',
        //     refillTimeMs: refillTimeMs / 1000 + 's'
        // });

        isAutoActive = true;
        autoButton.disabled = true;
        currentAutoSessionScore = 0;

        // Change UI color to green when auto is active
        scoreEl.style.color = '#4caf50';
        cpsCounterEl.style.color = '#4caf50';
        spsCounterEl.style.color = '#4caf50';

        // Reset counters for new auto session
        clicks = 0;
        scoreFromClicks = 0;
        lastCheckTime = Date.now();

        // Start auto clicking with configured speed
        autoInterval = setInterval(() => {
            const circles = document.querySelectorAll('.c1');
            if (circles.length > 0) {
                const randomIndex = Math.floor(Math.random() * circles.length);
                // Always count auto clicks for CPS but not for manual records
                clicks++;
                circles[randomIndex]?.click();
            }
        }, clickSpeedMs);

        // Setup duration bar animation
        autoButtonOverlayDuration.style.transition = `transform ${durationMs / 1000}s linear`;
        autoButtonOverlayDuration.style.transform = 'translate(0, 100%)';

        // Stop auto clicking after duration
        autoTimeout = setTimeout(() => {
            clearInterval(autoInterval);

            if (currentAutoSessionScore > (saveData.statistics.highestSingleAutoScore || 0)) {
                SaveManager.updateStatistic('highestSingleAutoScore', currentAutoSessionScore);
            }
            
            // Calculate and save next available time
            const nextTime = Date.now() + refillTimeMs;
            SaveManager.updateData('nextAutoTime', nextTime);
            
            // Setup refill bar animation
            autoButtonOverlayRefill.style.transition = `transform ${refillTimeMs / 1000}s linear`;
            autoButtonOverlayRefill.style.transform = 'translate(0, -100%)';

            // Enable button after refill time
            refillTimeout = setTimeout(() => {
                isAutoActive = false;
                autoButton.disabled = false;
                autoButtonOverlayDuration.style.transition = 'none';
                autoButtonOverlayDuration.style.transform = 'rotate(0deg)';
                autoButtonOverlayRefill.style.transition = 'none';
                autoButtonOverlayRefill.style.transform = 'rotate(0deg)';

                // Reset UI color back to white
                scoreEl.style.color = 'white';
                cpsCounterEl.style.color = 'white';
                spsCounterEl.style.color = 'white';
            }, refillTimeMs);

        }, durationMs);
    });

    function createRandomCircle() {
        // Get current level data
        const currentLevelData = levelTable[level.toString()];
        if (!currentLevelData) return;

        // Check max circles limit
        const currentCircles = document.querySelectorAll('.c1').length;
        if (currentCircles >= currentLevelData['max-popup']) return;

        // Get available circle types and their rates for current level
        const availableTypes = currentLevelData.available_type;
        const typeRates = currentLevelData.popup_type_rate;

        // Choose random circle type based on rates
        const random = Math.random();
        let cumulativeRate = 0;
        let randomClass = availableTypes[0]; // Default to first type
        
        for (let i = 0; i < availableTypes.length; i++) {
            cumulativeRate += typeRates[i];
            if (random < cumulativeRate) {
                randomClass = availableTypes[i];
                break;
            }
        }

        const type = CIRCLE_TYPES[randomClass];
        const circleUpgrades = SaveManager.getData().upgradeLevel.circle[randomClass];

        // Create circle element
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
                // Get next audio from pool and play it
                const audio = circleHitSoundPool[currentAudioIndex];
                audio.currentTime = 0;
                audio.play();
                currentAudioIndex = (currentAudioIndex + 1) % AUDIO_POOL_SIZE;
            }

            // Get current upgrade levels for this circle
            const currentUpgrades = SaveManager.getData().upgradeLevel.circle[randomClass];
            
            // Get base score from current upgrade level
            // If level is 0, use default score, else use level-1 as index (level 1-5 maps to index 0-4)
            let scoreLevel = currentUpgrades.score;
            let basePoints;
            if (scoreLevel === 0) {
                basePoints = parseInt(randomClass.substring(1));
            } else {
                const scoreTableEntry = circleTable[randomClass].score[scoreLevel - 1];
                basePoints = scoreTableEntry?.value;
                if (basePoints === undefined) {
                    console.warn(`No score value found for ${randomClass} at level ${scoreLevel}, using default`);
                    basePoints = parseInt(randomClass.substring(1));
                }
            }
            let points = basePoints;

            // Check for critical hit
            // If level is 0, use 0% crit chance, else use level-1 as index
            let critLevel = currentUpgrades.critical_chance;
            let critChance;
            if (critLevel === 0) {
                critChance = 0;
            } else {
                const critTableEntry = circleTable[randomClass].critical_chance[critLevel - 1];
                critChance = critTableEntry?.value;
                if (critChance === undefined) {
                    console.warn(`No crit chance found for ${randomClass} at level ${critLevel}, using default`);
                    critChance = 0;
                }
            }
            
            const isCritical = Math.random() < critChance;
            if (isCritical) {
                points *= 2;
            }

            // console.log(`${randomClass} hit:`, {
            //     scoreLevel,
            //     basePoints,
            //     critLevel,
            //     critChance,
            //     isCritical,
            //     finalPoints: points
            // });
            
            // Always update scoreFromClicks for SPS counter
            scoreFromClicks += points;
            
            if (e.isTrusted) { // Manual click
                clicks++;
            } else { // Auto-click
                currentAutoSessionScore += points;
            }
            
            SaveManager.incrementCircleClick(randomClass);
            updateScore(points);
            showScorePopup(x + size / 2, y + size / 2, points, type.color, isCritical);

            circle.style.transform = 'scale(0)';
            setTimeout(() => {
                circle.remove();
                createRandomCircle();
            }, 5);
        });

        document.body.appendChild(circle);
        setTimeout(() => circle.style.transform = 'scale(1)', 5);
    }

    function showScorePopup(x, y, points, color, isCritical) {
        const popup = document.createElement('div');
        popup.classList.add('score-popup');
        popup.textContent = `+${points}${isCritical ? '!' : ''}`; // Add '!' for critical hits
        Object.assign(popup.style, {
            color: color,
            left: `${x - popup.offsetWidth / 2}px`,
            top: `${y}px`,
            fontSize: isCritical ? '24px' : '20px', // Bigger font for critical hits
            fontWeight: isCritical ? 'bold' : 'normal'
        });
        document.body.appendChild(popup);

        setTimeout(() => Object.assign(popup.style, { 
            opacity: '1', 
            transform: `scale(${isCritical ? 1.2 : 1})` // Bigger scale for critical hits
        }), 10);
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
        const totalScore = SaveManager.getData().totalScore + SaveManager.getData().singleScore;
        const currentLevelData = levelTable[level.toString()];
        const nextLevelData = levelTable[(level + 1).toString()];

        // Check for level up
        if (nextLevelData && totalScore >= nextLevelData.max) {
            // Find the highest level that the total score qualifies for
            let newLevel = level;
            while (levelTable[(newLevel + 1).toString()] && 
                   totalScore >= levelTable[(newLevel + 1).toString()].max) {
                newLevel++;
            }
            
            // Update level if it changed
            if (newLevel !== level) {
                level = newLevel;
                levelEl.textContent = `Level ${level}`;
                
                // Update circles when leveling up
                const currentCircles = document.querySelectorAll('.c1');
                const newMaxPopup = levelTable[level.toString()]['max-popup'];
                
                // Remove excess circles if new level has lower max-popup
                if (currentCircles.length > newMaxPopup) {
                    for (let i = newMaxPopup; i < currentCircles.length; i++) {
                        currentCircles[i].remove();
                    }
                }
                
                // Add more circles if new level has higher max-popup
                for (let i = currentCircles.length; i < newMaxPopup; i++) {
                    createRandomCircle();
                }
            }
        }
        
        // Update progress bar
        const currentLevelThreshold = currentLevelData?.max || 0;
        const nextLevelThreshold = nextLevelData?.max || currentLevelThreshold;
        
        const scoreInCurrentLevel = totalScore - currentLevelThreshold;
        const scoreNeededForNextLevel = nextLevelThreshold - currentLevelThreshold;
        
        const progress = (scoreNeededForNextLevel > 0) ? (scoreInCurrentLevel / scoreNeededForNextLevel * 100) : 100;
        progressBarEl.style.width = `${Math.min(progress, 100)}%`;
        levelEl.textContent = `Level ${level}`;
    }

    initializeGame();
});