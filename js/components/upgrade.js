// Sound Effects
const upgradeToggleSound = new Audio('res/sound/menu_toggle.mp3');

let circleTable = null;
let botclickerTable = null;

async function loadUpgradeTables() {
    try {
        const response = await fetch('res/circle_table.json');
        if (!response.ok) throw new Error('Failed to load circle_table.json');
        const data = await response.json();
        circleTable = data.circle_table;
        botclickerTable = data.botclicker_table;
        return true;
    } catch (error) {
        console.error('Error loading upgrade tables:', error);
        return false;
    }
}

// Initialize when DOM is loaded and components are ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for custom componentsLoaded event
    document.addEventListener('componentsLoaded', async () => {
        console.log('Initializing upgrade system...');
        // Wait for SaveManager to load
        await SaveManager.load();
        const success = await loadUpgradeTables();
        if (success) {
            updateBotclickerUI();
            updateCircleUI();
            console.log('Upgrade system initialized successfully');
        }
    });
});

function initializeUpgrade() {
    // This function is kept for compatibility with loader.js
    // The actual initialization is handled by the DOMContentLoaded event
    console.log('Legacy initializeUpgrade called');
}

function updateBotclickerUI() {
    const types = [
        { key: 'clickspeed', label: 'Click speed' },
        { key: 'duration', label: 'Duration time' },
        { key: 'refilltime', label: 'Refill time' }
    ];
    const currentLevels = SaveManager.getData().upgradeLevel.botclicker;

    types.forEach(type => {
        // Find the row by label text
        const labelEl = Array.from(document.querySelectorAll('.detail-label'))
            .find(el => el.textContent === type.label);
        if (!labelEl) return;

        const container = labelEl.closest('.detail-row');
        if (!container) return;

        // Update progress bubbles
        const bubbles = container.querySelectorAll('.progress-bubble');
        const upgrades = botclickerTable[type.key];
        
        bubbles.forEach((bubble, index) => {
            const parentPart = bubble.parentElement;
            if (index < currentLevels[type.key]) {
                parentPart.classList.remove('inactive');
                parentPart.classList.add('active');
            } else {
                parentPart.classList.remove('active');
                parentPart.classList.add('inactive');
            }
            bubble.textContent = upgrades[index].value;
        });

        // Update upgrade button
        const upgradeBtn = container.querySelector('.upgrade-btn');
        if (upgradeBtn) {
            if (currentLevels[type.key] >= upgrades.length) {
                upgradeBtn.textContent = 'MAX';
                upgradeBtn.disabled = true;
            } else {
                const nextUpgrade = upgrades[currentLevels[type.key]];
                upgradeBtn.textContent = nextUpgrade.cost;
                upgradeBtn.disabled = SaveManager.getData().singleScore < nextUpgrade.cost;

                upgradeBtn.onclick = () => {
                    if (SaveManager.getData().singleScore >= nextUpgrade.cost) {
                        // Deduct cost
                        const currentScore = SaveManager.getData().singleScore;
                        const newScore = currentScore - nextUpgrade.cost;
                        SaveManager.updateData('singleScore', newScore);
                        
                        // Update level
                        const newLevels = {...SaveManager.getData().upgradeLevel.botclicker};
                        newLevels[type.key]++;
                        SaveManager.updateData('upgradeLevel', {
                            ...SaveManager.getData().upgradeLevel,
                            botclicker: newLevels
                        });

                        // Play sound and save
                        if (SaveManager.getData()['setting-sound']) {
                            upgradeToggleSound.play();
                        }
                        SaveManager.save();

                        // Update UIs
                        updateBotclickerUI();
                        document.getElementById('score').textContent = newScore.toString().padStart(8, '0');
                    }
                };
            }
        }
    });
}

function updateCircleUI() {
    const circleTypes = ['c1', 'c2', 'c4', 'c8', 'c16', 'c32', 'c64'];
    const upgradeTypes = [
        { key: 'critical_chance', label: 'Critical Chance' },
        { key: 'score', label: 'Scoring' }
    ];
    const currentLevels = SaveManager.getData().upgradeLevel.circle;

    circleTypes.forEach(circleType => {
        const circleSection = document.querySelector(`.${circleType}-icon`);
        if (!circleSection) return;

        upgradeTypes.forEach(upgradeType => {
            // Find the row by label text within this circle's section
            const container = circleSection.closest('.upgrade-item');
            if (!container) return;

            const labelEl = Array.from(container.querySelectorAll('.detail-label'))
                .find(el => el.textContent === upgradeType.label);
            if (!labelEl) return;

            const row = labelEl.closest('.detail-row');
            if (!row) return;

            // Update progress bubbles
            const bubbles = row.querySelectorAll('.progress-bubble');
            const upgrades = circleTable[circleType][upgradeType.key];
            
            bubbles.forEach((bubble, index) => {
                const parentPart = bubble.parentElement;
                if (index < currentLevels[circleType][upgradeType.key]) {
                    parentPart.classList.remove('inactive');
                    parentPart.classList.add('active');
                } else {
                    parentPart.classList.remove('active');
                    parentPart.classList.add('inactive');
                }
                bubble.textContent = upgrades[index].value;
            });

            // Update upgrade button
            const upgradeBtn = row.querySelector('.upgrade-btn');
            if (upgradeBtn) {
                if (currentLevels[circleType][upgradeType.key] >= upgrades.length) {
                    upgradeBtn.textContent = 'MAX';
                    upgradeBtn.disabled = true;
                } else {
                    const nextUpgrade = upgrades[currentLevels[circleType][upgradeType.key]];
                    upgradeBtn.textContent = nextUpgrade.cost;
                    upgradeBtn.disabled = SaveManager.getData().singleScore < nextUpgrade.cost;

                    upgradeBtn.onclick = () => {
                        if (SaveManager.getData().singleScore >= nextUpgrade.cost) {
                            // Deduct cost
                            const currentScore = SaveManager.getData().singleScore;
                            const newScore = currentScore - nextUpgrade.cost;
                            SaveManager.updateData('singleScore', newScore);
                            
                            // Update level
                            const newCircleLevels = {...SaveManager.getData().upgradeLevel.circle};
                            newCircleLevels[circleType][upgradeType.key]++;
                            SaveManager.updateData('upgradeLevel', {
                                ...SaveManager.getData().upgradeLevel,
                                circle: newCircleLevels
                            });

                            // Play sound and save
                            if (SaveManager.getData()['setting-sound']) {
                                upgradeToggleSound.play();
                            }
                            SaveManager.save();

                            // Update UIs
                            updateCircleUI();
                            document.getElementById('score').textContent = newScore.toString().padStart(8, '0');
                        }
                    };
                }
            }
        });
    });
}
