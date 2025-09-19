document.addEventListener('DOMContentLoaded', () => {
    // Function to load HTML components
    async function loadComponent(url, placeholderId) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            }
            const text = await response.text();
            document.getElementById(placeholderId).innerHTML = text;
        } catch (error) {
            console.error('Error loading component:', error);
        }
    }

    // Load components and then initialize their JS
    async function loadAndInit() {
        await Promise.all([
            loadComponent('components/menu.html', 'menu-placeholder'),
            loadComponent('components/upgrade.html', 'upgrade-placeholder')
        ]);

        // Now that the HTML is loaded, initialize the JS that depends on it
        initializeMenuControls();
        initializeNameChange();
        initializeBgChanger();
        initializeSettingButtons();
        initializeUpgrade(); // Keep this for any logic inside the upgrade panel itself

        // Dispatch a custom event to notify that components are loaded
        document.dispatchEvent(new CustomEvent('componentsLoaded'));

        // Initialize buttons that are always present in index.html
        const upgradeButton = document.querySelector('.upgrade-button');
        const upgradeOverlay = document.querySelector('.upgrade-tab-overlay');
        
        // This check is needed because the overlay is loaded dynamically
        if (upgradeButton && upgradeOverlay) {
            const closeButton = upgradeOverlay.querySelector('.close-button');
            const upgradeToggleSound = new Audio('res/sound/menu_toggle.mp3');

            const playSound = () => {
                if (SaveManager.getData()['setting-sound']) {
                    upgradeToggleSound.play();
                }
            };

            upgradeButton.addEventListener('click', () => {
                playSound();
                upgradeOverlay.classList.add('visible');
            });

            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    playSound();
                    upgradeOverlay.classList.remove('visible');
                });
            }

            upgradeOverlay.addEventListener('click', (event) => {
                if (event.target === upgradeOverlay) {
                    playSound();
                    upgradeOverlay.classList.remove('visible');
                }
            });
        }
    }

    loadAndInit();
});
