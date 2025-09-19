// js/components/saveManager.js

const SaveManager = (() => {
    let saveData = {};
    let sessionStartTime = Date.now();
    const saveKey = 'circleClickerSave';

    async function load() {
        const savedData = localStorage.getItem(saveKey);
        if (savedData) {
            saveData = JSON.parse(savedData);
            console.log('Game data loaded from localStorage.');
        } else {
            try {
                const response = await fetch('res/save_template.json');
                if (!response.ok) throw new Error('Network response was not ok.');
                saveData = await response.json();
                localStorage.setItem(saveKey, JSON.stringify(saveData));
                console.log('New save created from template.');
            } catch (error) {
                console.error('Failed to create new save:', error);
            }
        }
        sessionStartTime = Date.now();
        return saveData;
    }

    function save() {
        if (Object.keys(saveData).length === 0) return;

        const sessionPlaytime = (Date.now() - sessionStartTime) / 1000; // in seconds
        saveData.statistics.playtime += sessionPlaytime;
        saveData.statistics.totalPlayTime += sessionPlaytime;
        sessionStartTime = Date.now(); // Reset session timer

        localStorage.setItem(saveKey, JSON.stringify(saveData));
        console.log('Game saved.');
        updateStatisticsUI(); // Refresh stats display after saving
    }

    function getData() {
        return saveData;
    }

    function updateData(key, value) {
        // Simple key-value update
        if (saveData.hasOwnProperty(key)) {
            saveData[key] = value;
        } else {
            console.warn(`Attempted to update non-existent key: ${key}`);
        }
    }
    
    function updateStatistic(key, value) {
        if (saveData.statistics.hasOwnProperty(key)) {
            saveData.statistics[key] = value;
        } else {
            console.warn(`Attempted to update non-existent statistic: ${key}`);
        }
    }

    function incrementCircleClick(circleType) {
        if (saveData.statistics.totalClicks.hasOwnProperty(circleType)) {
            saveData.statistics.totalClicks[circleType]++;
        }
    }

    function formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    function updateStatisticsUI() {
        if (!saveData || !saveData.statistics) return;

        const stats = saveData.statistics;
        const totalClicks = Object.values(stats.totalClicks).reduce((a, b) => a + b, 0);

        document.getElementById('stat-name').textContent = saveData.name || 'Guest';
        document.getElementById('stat-total-score').textContent = (saveData.totalScore + saveData.singleScore).toLocaleString();
        document.getElementById('stat-playtime').textContent = formatTime(stats.playtime || 0);
        document.getElementById('stat-total-playtime').textContent = formatTime(stats.totalPlayTime || 0);
        document.getElementById('stat-highest-cps').textContent = `${(stats.highestManualClicksPerSecond || 0).toFixed(2)} c/s`;
        document.getElementById('stat-highest-sps').textContent = `${(stats.highestScorePerSecond || 0).toLocaleString()} pts/s`;
        document.getElementById('stat-highest-auto-score').textContent = `${(stats.highestSingleAutoScore || 0).toLocaleString()} pts`;
        
        document.getElementById('stat-total-clicks').textContent = totalClicks.toLocaleString();
        for (const key in stats.totalClicks) {
            const el = document.getElementById(`stat-${key}-clicks`);
            if (el) {
                el.textContent = (stats.totalClicks[key] || 0).toLocaleString();
            }
        }
    }

    return {
        load,
        save,
        getData,
        updateData,
        updateStatistic,
        incrementCircleClick,
        updateStatisticsUI
    };
})();
