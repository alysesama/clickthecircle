// js/components/menu.js
document.addEventListener('DOMContentLoaded', () => {
    const menuTab = document.querySelector('.menu-tab');
    if (!menuTab) return;

    initializeMenuControls();
    initializeNameChange();
    initializeBgChanger();
    initializeSettingButtons();

});

function initializeMenuControls() {
    const menuButton = document.querySelector('.menu-button');
    const menuOverlay = document.querySelector('.menu-tab-overlay');
    const closeButton = document.querySelector('.close-button');
    const menuToggleSound = new Audio('res/sound/menu_toggle.mp3');

    if (menuButton && menuOverlay && closeButton) {
        const playSound = () => {
            if (SaveManager.getData()['setting-sound']) {
                menuToggleSound.play();
            }
        };

        menuButton.addEventListener('click', () => {
            playSound();
            menuOverlay.classList.add('visible');
        });

        closeButton.addEventListener('click', () => {
            playSound();
            menuOverlay.classList.remove('visible');
        });

        menuOverlay.addEventListener('click', (event) => {
            if (event.target === menuOverlay) {
                playSound();
                menuOverlay.classList.remove('visible');
            }
        });
    }
}

function initializeNameChange() {
    const editNameBtn = document.getElementById('edit-name-btn');
    const statNameEl = document.getElementById('stat-name');

    editNameBtn.addEventListener('click', () => {
        const currentName = statNameEl.textContent;
        const newName = prompt('Enter your new name:', currentName);

        if (newName && newName.trim() !== '') {
            const validatedName = newName.trim().substring(0, 20);
            SaveManager.updateData('name', validatedName);
            statNameEl.textContent = validatedName;
            SaveManager.save();
            console.log(`Name changed to: ${validatedName}`);
        }
    });
}

function initializeBgChanger() {
    const bgChanger = document.querySelector('.bg-changer');
    if (!bgChanger) return;

    // Tab switching
    const navButtons = bgChanger.querySelectorAll('.nav-btn');
    const tabContents = bgChanger.querySelectorAll('.color-adjust-content');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.style.display = 'none');
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-content`).style.display = 'flex';
        });
    });

    function applyAndSaveColor(color) {
        document.body.style.backgroundColor = color;
        SaveManager.updateData('setting-color', color);
    }

    // Preset and HEX
    bgChanger.addEventListener('click', (e) => {
        if (e.target.closest('.preset-color')) {
            const presetDiv = e.target.closest('.preset-color');
            applyAndSaveColor(presetDiv.dataset.color);
            bgChanger.querySelector('.preset-color.active')?.classList.remove('active');
            presetDiv.classList.add('active');
        }
        if (e.target.closest('.hex-confirm-btn')) {
            const hexInput = bgChanger.querySelector('.hex-input');
            if (/^#([0-9A-F]{3}){1,2}$/i.test(hexInput.value)) {
                applyAndSaveColor(hexInput.value);
            } else {
                alert('Invalid HEX color code.');
            }
        }
    });

    // RGB/HSL Confirm
    document.getElementById('rgb-confirm-btn').addEventListener('click', () => {
        const r = document.getElementById('rgb-r').value;
        const g = document.getElementById('rgb-g').value;
        const b = document.getElementById('rgb-b').value;
        applyAndSaveColor(`rgb(${r}, ${g}, ${b})`);
    });

    document.getElementById('hsl-confirm-btn').addEventListener('click', () => {
        const h = document.getElementById('hsl-h').value;
        const s = document.getElementById('hsl-s').value;
        const l = document.getElementById('hsl-l').value;
        applyAndSaveColor(`hsl(${h}, ${s}%, ${l}%)`);
    });

    // Image background functionality (from original script, slightly adapted)
    const imageUploadContainer = document.querySelector('.image-upload-container');
    const bgImageInput = document.getElementById('bg-image-input');
    const browseBtn = document.querySelector('.browse-btn');
    const brightnessSlider = document.getElementById('bg-brightness-slider');
    let bgOverlay = document.getElementById('background-overlay');
    if (!bgOverlay) {
        bgOverlay = document.createElement('div');
        bgOverlay.id = 'background-overlay';
        document.body.insertBefore(bgOverlay, document.body.firstChild);
    }

    const handleFile = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.body.style.backgroundColor = '';
                bgOverlay.style.backgroundImage = `url(${e.target.result})`;
                bgOverlay.style.filter = `brightness(${brightnessSlider.value})`;
                SaveManager.updateData('setting-color', `url(${e.target.result})`);
            };
            reader.readAsDataURL(file);
        }
    };

    browseBtn.addEventListener('click', () => bgImageInput.click());
    bgImageInput.addEventListener('change', (e) => e.target.files.length && handleFile(e.target.files[0]));
    imageUploadContainer.addEventListener('dragover', (e) => { e.preventDefault(); imageUploadContainer.classList.add('dragover'); });
    imageUploadContainer.addEventListener('dragleave', () => imageUploadContainer.classList.remove('dragover'));
    imageUploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadContainer.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
            bgImageInput.files = e.dataTransfer.files;
        }
    });
    brightnessSlider.addEventListener('input', () => {
        bgOverlay.style.filter = `brightness(${brightnessSlider.value})`;
    });

    // RGB and HSL Sliders setup (from original script)
    const setupColorSystem = (type) => {
        const sliders = { r: document.getElementById('rgb-r'), g: document.getElementById('rgb-g'), b: document.getElementById('rgb-b'), h: document.getElementById('hsl-h'), s: document.getElementById('hsl-s'), l: document.getElementById('hsl-l') };
        const inputs = { r: document.getElementById('rgb-r-input'), g: document.getElementById('rgb-g-input'), b: document.getElementById('rgb-b-input'), h: document.getElementById('hsl-h-input'), s: document.getElementById('hsl-s-input'), l: document.getElementById('hsl-l-input') };
        const preview = document.getElementById(`${type}-preview`);
        const components = (type === 'rgb') ? ['r', 'g', 'b'] : ['h', 's', 'l'];

        const updatePreview = () => {
            let color;
            if (type === 'rgb') {
                const [r, g, b] = components.map(c => sliders[c].value);
                color = `rgb(${r}, ${g}, ${b})`;
            } else {
                const [h, s, l] = components.map(c => sliders[c].value);
                color = `hsl(${h}, ${s}%, ${l}%)`;
            }
            preview.style.backgroundColor = color;
        };

        components.forEach(c => {
            sliders[c].addEventListener('input', () => { inputs[c].value = sliders[c].value; updatePreview(); });
            inputs[c].addEventListener('input', () => { sliders[c].value = inputs[c].value; updatePreview(); });
        });
        updatePreview();
    };

    setupColorSystem('rgb');
    setupColorSystem('hsl');
}

function initializeSettingButtons() {
    const soundBtn = document.querySelector('.menu-sound');
    const resetBtn = document.querySelector('.menu-reset');
    const soundImg = soundBtn?.querySelector('img');

    if (!soundBtn || !resetBtn || !soundImg) return;

    // Function to update the sound icon based on save data
    function updateSoundIcon() {
        const isSoundOn = SaveManager.getData()['setting-sound'];
        soundImg.src = isSoundOn ? 'res/img/menu_sound_on.svg' : 'res/img/menu_sound_off.svg';
    }

    // Set initial state when components are loaded
    document.addEventListener('componentsLoaded', updateSoundIcon, { once: true });
    
    // Sound button click listener
    soundBtn.addEventListener('click', () => {
        const currentState = SaveManager.getData()['setting-sound'];
        SaveManager.updateData('setting-sound', !currentState);
        updateSoundIcon();
        SaveManager.save(); // Immediately save the change
    });

    // Reset button click listener
    resetBtn.addEventListener('click', () => {
        const isConfirmed = confirm('Are you sure you want to reset all your progress? This action cannot be undone.');
        if (isConfirmed) {
            // Use localStorage.clear() to ensure everything is wiped before reload.
            localStorage.clear();
            location.reload();
        }
    });
}
