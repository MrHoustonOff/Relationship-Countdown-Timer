// /mrhoustontimer/app/static/js/app.js

/**
 * @fileoverview Core application logic (v2.2).
 * Manages global state (Alpine store), audio, settings forms, and interactive components.
 */

/* ==========================================================================
   1. Audio Manager
   ========================================================================== */

const AudioManager = {
    sounds: {},      // Store for { soundId: new Howl(...) }
    soundsCache: {}, // Cache for categories { categoryName: [Howl, Howl] }

    // Audio Constants
    SOUND_MAX_VOLUME: 0.8,      // Target volume (0.0 - 1.0)
    MAX_SOUND_DURATION_MS: 3000, // Max duration before fade-out
    PITCH_RANGE: 0.2,           // Pitch variation (0.9 - 1.1)
    CLICK_FADE_IN_MS: 10,       // Anti-click fade-in duration
    CLICK_FADE_OUT_MS: 50,      // Smooth fade-out duration

    /**
     * Initializes the audio system. Called after audioManifest is loaded.
     * @param {object} manifest - The audio manifest from the store.
     */
    init(manifest) {
        if (typeof Howl === 'undefined') {
            console.error("[AudioManager] Howler.js not loaded. Audio disabled.");
            return;
        }

        if (!manifest || Object.keys(manifest).length === 0) {
            console.warn("[AudioManager] Audio manifest is empty.");
            return;
        }

        try {
            // 1. Create Howl objects
            for (const category in manifest) {
                if (!manifest[category] || manifest[category].length === 0) continue;

                manifest[category].forEach((filePath, index) => {
                    const soundId = `${category}_${index}`;
                    this.sounds[soundId] = new Howl({
                        src: [filePath],
                        volume: 0, // Start silent
                        loop: (category === 'Heartbeat')
                    });
                });
            }

            // 2. Cache sounds by category
            this.soundsCache = {};
            for (const soundId in this.sounds) {
                const category = soundId.split('_')[0];
                if (!this.soundsCache[category]) {
                    this.soundsCache[category] = [];
                }
                this.soundsCache[category].push(this.sounds[soundId]);
            }
        } catch (error) {
            console.error("[AudioManager] Critical error loading sounds:", error);
        }
    },

    /**
     * Starts the heartbeat sound with a fade-in.
     * @param {number} duration - Fade-in duration in ms.
     */
    playHeartbeat(duration) {
        const sound = this.sounds['Heartbeat_0'];
        if (!sound) return;

        if (sound.playing()) {
            sound.fade(sound.volume(), this.SOUND_MAX_VOLUME * 2, duration);
        } else {
            sound.volume(0);
            sound.play();
            sound.fade(0, this.SOUND_MAX_VOLUME * 2, duration);
        }
    },

    /**
     * Stops the heartbeat sound with a fade-out.
     * @param {number} duration - Fade-out duration in ms.
     */
    stopHeartbeat(duration) {
        const sound = this.sounds['Heartbeat_0'];
        if (!sound || !sound.playing()) return;

        sound.off('fade'); // Cancel previous fades
        sound.fade(sound.volume(), 0, duration);

        sound.once('fade', () => {
            if (sound.volume() === 0) {
                sound.stop();
            }
        });
    },

    /**
     * Plays a random sound from a category with pitch variation.
     * @param {string} category - The sound category (e.g., 'switchPage').
     * @param {boolean} usePitch - Whether to apply random pitch shifting.
     */
    playRandom(category, usePitch = false) {
        if (typeof Alpine !== 'undefined' && !Alpine.store('app').config.effects_enabled) return;

        const soundList = this.soundsCache[category];
        if (!soundList || soundList.length === 0) return;

        const sound = soundList[Math.floor(Math.random() * soundList.length)];

        // Apply pitch
        if (usePitch) {
            const pitch = 1.0 + (Math.random() * this.PITCH_RANGE) - (this.PITCH_RANGE / 2);
            sound.rate(pitch);
        } else {
            sound.rate(1.0);
        }

        // Play with fade-in/out to avoid clicking artifacts
        sound.volume(0);
        const playId = sound.play();

        sound.fade(0, this.SOUND_MAX_VOLUME, this.CLICK_FADE_IN_MS, playId);

        setTimeout(() => {
            sound.fade(this.SOUND_MAX_VOLUME, 0, this.CLICK_FADE_OUT_MS, playId);
        }, this.MAX_SOUND_DURATION_MS - this.CLICK_FADE_OUT_MS);
    }
};

/* ==========================================================================
   2. Global Helper Functions
   ========================================================================== */

/**
 * Converts a HEX or RGBA string to an "r, g, b" string.
 * @param {string} hex - The color string.
 * @returns {string} - "r, g, b"
 */
function hexToRgb(hex) {
    if (!hex) return '0, 0, 0';

    // Handle RGBA
    if (hex.startsWith('rgba')) {
        try {
            return hex.split('(')[1].split(')')[0].split(',').slice(0, 3).join(',');
        } catch (e) {
            return '0, 0, 0';
        }
    }

    // Handle HEX
    let hexValue = hex.replace('#', '');
    if (hexValue.length === 3) {
        hexValue = hexValue.split('').map(char => char + char).join('');
    }

    const r = parseInt(hexValue.substring(0, 2), 16) || 0;
    const g = parseInt(hexValue.substring(2, 4), 16) || 0;
    const b = parseInt(hexValue.substring(4, 6), 16) || 0;

    return `${r}, ${g}, ${b}`;
}

/**
 * Safely accesses nested properties of an object.
 * @param {object} obj - The source object.
 * @param {string} path - Dot-notation path (e.g., "timers.custom_timers").
 * @returns {*} - The value or undefined.
 */
const getDescendantProp = (obj, path) => {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

/**
 * Adjusts the brightness of a HEX color.
 * @param {string} hex - The input color.
 * @param {number} percent - Adjustment percent (+ for darker, - for lighter).
 * @returns {string} - The new HEX color.
 */
function changeColorBrightness(hex, percent) {
    if (!hex) return '#333';
    let hexValue = hex.replace('#', '');
    if (hexValue.length === 3) {
        hexValue = hexValue.split('').map(char => char + char).join('');
    }
    if (hexValue.length !== 6) return '#333';

    let r = parseInt(hexValue.substring(0, 2), 16);
    let g = parseInt(hexValue.substring(2, 4), 16);
    let b = parseInt(hexValue.substring(4, 6), 16);

    const factor = (100 - percent) / 100;
    r = Math.min(255, Math.max(0, Math.floor(r * factor)));
    g = Math.min(255, Math.max(0, Math.floor(g * factor)));
    b = Math.min(255, Math.max(0, Math.floor(b * factor)));

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

/* ==========================================================================
   3. Alpine Component: Settings Form
   ========================================================================== */

function settingsForm() {
    return {
        // Local state. Initialized via init().
        form: null,

        // --- Internal Parsing Helpers ---
        _getDatePart(isoString) {
            if (!isoString) return '';
            try {
                const date = new Date(isoString);
                if (isNaN(date.getTime())) return '';
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            } catch (e) {
                return '';
            }
        },
        _getTimePart(isoString) {
            if (!isoString) return '00:00:00';
            try {
                const date = new Date(isoString);
                if (isNaN(date.getTime())) return '00:00:00';
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                return `${hours}:${minutes}:${seconds}`;
            } catch (e) {
                return '00:00:00';
            }
        },

        // --- Initialization ---
        init() {
            // 1. Sync: Store -> Local Form
            // Loads data when the component mounts or when a revert happens.
            Alpine.effect(() => {
                const storeForm = Alpine.store('app').form;
                const storeConfig = Alpine.store('app').config;
                const isDirty = Alpine.store('app').ui.isDirty;
                const sourceData = storeForm || storeConfig;

                if (sourceData && !isDirty) {
                    this.loadFormFromStore(sourceData);
                }
            });

            // 2. Sync: Local Form -> Store
            // Watches for any changes in the local form and updates the global store.
            let firstRun = true;
            Alpine.watch(() => this.form, (newFormData) => {
                if (firstRun || !newFormData) {
                    firstRun = false;
                    return;
                }

                const store = Alpine.store('app');
                if (!store.form) return;

                // Global fields
                store.form.language = newFormData.language;
                store.form.animations_enabled = newFormData.animations_enabled;
                store.form.effects_enabled = newFormData.effects_enabled;
                store.form.blur_strength = newFormData.blur_strength;

                // Date fields (reconstruct ISO strings)
                this.updateStoreFromLocalForm('date_vova_departure');
                this.updateStoreFromLocalForm('date_vova_arrival');
                this.updateStoreFromLocalForm('date_relationship_start');

                // Objects (deep copy)
                store.form.timers = JSON.parse(JSON.stringify(newFormData.timers));
                store.form.arrival_day = JSON.parse(JSON.stringify(newFormData.arrival_day));
                store.form.colors = JSON.parse(JSON.stringify(newFormData.colors));

                // Simple fields
                store.form.calendar_save_zoom = newFormData.calendar_save_zoom;
                store.form.sticker_emoji = newFormData.sticker_emoji;
                store.form.sticker_color = newFormData.sticker_color;
                store.form.sticker_scale = newFormData.sticker_scale;
                store.form.sticker_random_rotation_max = newFormData.sticker_random_rotation_max;
                store.form.calendar_marked_day_color = newFormData.calendar_marked_day_color;
                store.form.calendar_empty_cell_color = newFormData.calendar_empty_cell_color;

                store.markDirty();
            }, { deep: true });
        },

        // --- Helper Methods ---

        loadFormFromStore(sourceForm) {
            if (!sourceForm) return;
            const configCopy = JSON.parse(JSON.stringify(sourceForm));

            // Deconstruct dates into Date and Time parts for HTML inputs
            configCopy.date_vova_departure_date = this._getDatePart(configCopy.date_vova_departure);
            configCopy.date_vova_departure_time = this._getTimePart(configCopy.date_vova_departure);
            configCopy.date_vova_arrival_date = this._getDatePart(configCopy.date_vova_arrival);
            configCopy.date_vova_arrival_time = this._getTimePart(configCopy.date_vova_arrival);
            configCopy.date_relationship_start_date = this._getDatePart(configCopy.date_relationship_start);
            configCopy.date_relationship_start_time = this._getTimePart(configCopy.date_relationship_start);

            this.form = configCopy;
        },

        updateStoreFromLocalForm(fieldName) {
            const store = Alpine.store('app');
            if (!this.form || !store.form) return;

            const datePart = this.form[`${fieldName}_date`];
            const timePart = this.form[`${fieldName}_time`];

            if (datePart && timePart) {
                const fullTimePart = timePart.length === 5 ? timePart + ':00' : timePart;
                store.form[fieldName] = `${datePart}T${fullTimePart}`;
            }
        },

        getCustomTimerDatePart(timerId) {
            if (!this.form?.timers?.custom_timers) return '';
            const timer = this.form.timers.custom_timers.find(t => t.id === timerId);
            return timer ? this._getDatePart(timer.date) : '';
        },

        getCustomTimerTimePart(timerId) {
            if (!this.form?.timers?.custom_timers) return '00:00:00';
            const timer = this.form.timers.custom_timers.find(t => t.id === timerId);
            return timer ? this._getTimePart(timer.date) : '00:00:00';
        },

        updateCustomTimerDateTime(timerId, part, value) {
            if (!this.form?.timers?.custom_timers) return;
            const timer = this.form.timers.custom_timers.find(t => t.id === timerId);
            if (!timer) return;

            let currentDate = this._getDatePart(timer.date);
            let currentTime = this._getTimePart(timer.date);

            if (part === 'date') {
                currentDate = value;
            } else if (part === 'time') {
                currentTime = value.length === 5 ? value + ':00' : value;
            }
            timer.date = `${currentDate}T${currentTime}`;
        },

        // --- Action Methods ---

        resetField(fieldName) {
            const store = Alpine.store('app');
            if (!store.defaults) return;

            const defaultValue = getDescendantProp(store.defaults, fieldName);
            if (defaultValue === undefined) return;

            const clonedDefault = JSON.parse(JSON.stringify(defaultValue));

            if (fieldName.startsWith('date_')) {
                this.form[`${fieldName}_date`] = this._getDatePart(clonedDefault);
                this.form[`${fieldName}_time`] = this._getTimePart(clonedDefault);
            } else if (fieldName.startsWith('timers.')) {
                const key = fieldName.split('.')[1];
                if (this.form.timers) this.form.timers[key] = clonedDefault;
            } else if (fieldName.startsWith('arrival_day.')) {
                const key = fieldName.split('.')[1];
                if (this.form.arrival_day) this.form.arrival_day[key] = clonedDefault;
            } else if (fieldName.startsWith('colors.')) {
                const key = fieldName.split('.')[1];
                if (this.form.colors) this.form.colors[key] = clonedDefault;
            } else {
                this.form[fieldName] = clonedDefault;
            }
        },

        save() {
            Alpine.store('app').saveSettings(Alpine.store('app').form);
        },

        revert() {
            Alpine.store('app').revertSettings();
        },

        addTimer() {
            AudioManager.playRandom('PlusButtons', true);
            const newTimer = {
                id: crypto.randomUUID(),
                enabled: true,
                label: "New Timer",
                date: new Date().toISOString().split('.')[0].replace('Z', '')
            };
            this.form.timers.custom_timers.push(newTimer);
        },

        removeTimer(timerId) {
            AudioManager.playRandom('DeleteButtons', true);
            this.form.timers.custom_timers = this.form.timers.custom_timers.filter(
                t => t.id !== timerId
            );
        },

        resetCalendarLog() {
            Alpine.store('app').resetCalendarLog();
        },

        resetAllSettings() {
            Alpine.store('app').resetAllSettings();
        }
    };
}

/* ==========================================================================
   4. Alpine Component: Wheel Controller
   ========================================================================== */

function wheelController() {
    const store = Alpine.store('app');
    return {
        // State
        options: [],
        wheelData: {
            gradient: 'background-color: var(--color-accent-secondary)',
            textSectors: []
        },

        // Physics State
        angle: 0,
        velocity: 0,
        friction: 0.998,
        isSpinning: false,
        animationFrameId: null,

        // Physics Constants
        MIN_VELOCITY: 0.05,
        MAX_VELOCITY: 70,
        FRICTION_FAST: 0.998,
        FRICTION_SLOW: 0.99,

        particleList: [
            '👉', '👈', '🌚', '💕', '❤️', '🫦', '😶‍🌫️', '😍', '👍', '🤦‍♂️',
            '🥲', '🤬', '🤡', '💩', '👺', '👽', '👿', '🐽', '🐒', '🐳',
            '🦉', '👁️', '👀', '🧌', '🤷‍♂️', '🙆‍♂️', '🕺', '💃', '👃', '🤌'
        ],

        previousAngle: 0,
        boundaryAngles: [],

        // --- Initialization ---
        init() {
            Alpine.nextTick(() => {
                const storeConfig = Alpine.store('app').config;
                if (storeConfig && storeConfig.wheel_options && storeConfig.wheel_options.length > 0) {
                    this.options = JSON.parse(JSON.stringify(storeConfig.wheel_options));
                } else {
                    this.options = [
                        { id: crypto.randomUUID(), label: "Option 1" },
                        { id: crypto.randomUUID(), label: "Option 2" },
                        { id: crypto.randomUUID(), label: "Option 3" },
                    ];
                }
                this.generateWheelVisuals();
            });

            // Watch for option changes
            Alpine.watch(() => this.options, () => {
                this.generateWheelVisuals();
            }, { deep: true });

            // Watch for revert actions
            Alpine.watch(() => Alpine.store('app').config, (newConfig) => {
                if (newConfig && !Alpine.store('app').ui.isDirty) {
                    this.options = JSON.parse(JSON.stringify(newConfig.wheel_options || []));
                }
            }, { deep: true });

            this.update = this.update.bind(this);
            this.update();
        },

        // --- Option Management ---
        addOption() {
            if (this.options.length >= 30) return;
            AudioManager.playRandom('PlusButtons', true);
            this.options.push({ id: crypto.randomUUID(), label: "New Option" });
        },

        removeOption(id) {
            AudioManager.playRandom('DeleteButtons', true);
            this.options = this.options.filter(opt => opt.id !== id);
        },

        async saveToDefaults() {
            const store = Alpine.store('app');
            if (!store.form) return;

            store.form.wheel_options = JSON.parse(JSON.stringify(this.options));
            store.markDirty();
            const success = await store.saveSettings(store.form, false);

            if (typeof spawnParticles === 'function' && this.$refs.saveButton) {
                const symbol = success ? '✅' : '❌';
                AudioManager.playRandom('PlusButtons', true);
                spawnParticles({
                    originElement: this.$refs.saveButton,
                    symbol: symbol, count: 40, spread: 180, distance: 300, duration: 1200
                });
            }
        },

        // --- Physics & Animation ---
        spin() {
            if (this.isSpinning) {
                // "Boost" logic if already spinning
                this.friction = Math.random() * (this.FRICTION_FAST - this.FRICTION_SLOW) + this.FRICTION_SLOW;
                let boost;

                if (this.velocity > 30) boost = (Math.random() * 2.5) + 2.5;
                else if (this.velocity > 15) boost = (Math.random() * 5) + 5;
                else boost = (Math.random() * 7.5) + 10;

                this.velocity += boost;

                let particleCount = 0;
                if (this.velocity > 30) particleCount = 6;
                else if (this.velocity > 20) particleCount = 4;
                else if (this.velocity > 10) particleCount = 2;
                else if (this.velocity > 0) particleCount = 1;

                AudioManager.playRandom('WheelBoost', true);
                if (particleCount > 0 && typeof spawnParticles === 'function' && this.$refs.spinButton) {
                    spawnParticles({
                        originElement: this.$refs.spinButton,
                        symbol: '🔥',
                        count: particleCount, spread: 360, distance: 250, duration: 5000
                    });
                }
            } else {
                // Initial Spin
                this.friction = Math.random() * (this.FRICTION_FAST - this.FRICTION_SLOW) + this.FRICTION_SLOW;
                this.velocity = (Math.random() * 50) + 30;
                this.isSpinning = true;
            }

            if (this.velocity > this.MAX_VELOCITY) {
                this.velocity = this.MAX_VELOCITY;
            }
        },

        stopSpin() {
            if (!this.isSpinning) return;
            AudioManager.playRandom('WheelStop', true);
            this.velocity = Math.min(this.velocity, 1);
            this.friction = 0.95; // High friction to stop quickly
        },

        update() {
            if (this.velocity > this.MIN_VELOCITY) {
                this.isSpinning = true;
                this.velocity *= this.friction;
                this.angle += this.velocity;
                this.angle %= 360;

                // Check boundary crossings for clicking sound
                if (this.angle < this.previousAngle) {
                    this.triggerSectorCross();
                }
                for (const boundary of this.boundaryAngles) {
                    if (this.previousAngle < boundary && this.angle >= boundary) {
                        this.triggerSectorCross();
                    }
                }
            } else if (this.isSpinning) {
                this.isSpinning = false;
                this.velocity = 0;
                this.triggerStopEffect();
            }

            this.previousAngle = this.angle;
            this.animationFrameId = requestAnimationFrame(this.update);
        },

        triggerSectorCross() {
            AudioManager.playRandom('Wheel', true);
            if (typeof spawnParticles === 'function' && this.$refs.wheelPointer && store.ui.currentPage === 'page-wheel') {
                spawnParticles({
                    originElement: this.$refs.wheelPointer,
                    symbol: '✨', count: 1, spread: 45, distance: 600, duration: 500,
                    aim: -1, deg_aim: 45
                });
            }
        },

        triggerStopEffect() {
            AudioManager.playRandom('WheelEnd', true);
            if (!Alpine.store('app').config.effects_enabled) return;
            if (typeof spawnParticles !== 'function' || !this.$refs.wheelSpinner) return;

            const randomSymbol = this.particleList[Math.floor(Math.random() * this.particleList.length)];
            if (store.ui.currentPage === 'page-wheel') {
                spawnParticles({
                    originElement: this.$refs.wheelSpinner,
                    symbol: randomSymbol, count: 100, spread: 360, distance: 500, duration: 5000,
                    particleClass: 'wheel-stop-particle'
                });
            }
        },

        get sectors() {
            const activeOptions = this.options.filter(opt => opt.label && opt.label.trim() !== '');
            return activeOptions.length === 0 ? [{ id: 'placeholder', label: '?' }] : activeOptions;
        },

        generateWheelVisuals() {
            const currentSectors = this.sectors;
            const total = currentSectors.length;
            const colorDefault = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-secondary').trim() || '#2A2A2A';
            const colorDarker = changeColorBrightness(colorDefault, 20);
            const colorLighter = changeColorBrightness(colorDefault, -15);
            const segmentAngle = 360 / total;

            let gradientString = 'conic-gradient(';
            let textSectors = [];
            let newBoundaryAngles = [];
            const textRadiusPercent = 25;
            const angleOffsetRad = -Math.PI / 2;

            for (let i = 0; i < total; i++) {
                let color;
                if (total > 1 && total % 2 !== 0 && i === total - 1) {
                    color = colorLighter;
                } else {
                    color = (i % 2 === 0) ? colorDefault : colorDarker;
                }

                const startAngle = segmentAngle * i;
                const endAngle = segmentAngle * (i + 1);

                gradientString += `${color} ${startAngle}deg ${endAngle}deg`;
                if (i < total - 1) gradientString += ', ';

                if (startAngle > 0) newBoundaryAngles.push(startAngle);

                const textAngleDeg = startAngle + (segmentAngle / 2);
                const textAngleRad = (textAngleDeg * Math.PI / 180) + angleOffsetRad;
                const x = 50 + (textRadiusPercent * Math.cos(textAngleRad));
                const y = 50 + (textRadiusPercent * Math.sin(textAngleRad));
                const rotation = textAngleDeg + 270;

                textSectors.push({
                    id: currentSectors[i].id,
                    label: currentSectors[i].label,
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`
                });
            }

            gradientString += ')';
            this.wheelData = { gradient: gradientString, textSectors: textSectors };
            this.boundaryAngles = newBoundaryAngles;
        }
    };
}

/* ==========================================================================
   5. Alpine Component: Ticker
   ========================================================================== */

function alpineTicker(elementId, getTargetDate, getMode, getCompletedMsg) {
    return {
        element: null,
        intervalId: null,
        previousTimeString: '--:--:--:--',

        get targetDate() { return new Date(getTargetDate()); },
        get mode() { return getMode(); },
        get completedMessage() { return getCompletedMsg(); },

        init() {
            Alpine.nextTick(() => {
                this.element = document.getElementById(elementId);
                if (!this.element) return;

                // Initialize spans
                this.element.innerHTML = this.previousTimeString.split('')
                    .map((char, i) => `<span class="digit-char digit-${i}">${char}</span>`)
                    .join('');

                // Watch for changes
                Alpine.watch(() => [this.targetDate, this.mode, this.completedMessage], () => {
                    this.stop();
                    if (this.targetDate && !isNaN(this.targetDate.getTime())) {
                        this.start();
                    }
                });

                if (this.targetDate && !isNaN(this.targetDate.getTime())) {
                    this.start();
                }
            });
        },

        start() {
            if (this.intervalId) return;
            this.update();
            this.intervalId = setInterval(() => this.update(), 1000);
        },

        stop() {
            clearInterval(this.intervalId);
            this.intervalId = null;
        },

        update() {
            if (!this.element) return;

            const now = new Date();
            let diffMs;

            if (this.mode === 'countdown') {
                diffMs = this.targetDate.getTime() - now.getTime();
            } else {
                diffMs = now.getTime() - this.targetDate.getTime();
            }

            if (this.mode === 'countdown' && diffMs < 0) {
                this.element.innerHTML = this.completedMessage;
                this.stop();
                return;
            }

            const totalSeconds = Math.floor(Math.abs(diffMs) / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const pad = (num) => (num < 10 ? '0' + num : num.toString());
            const currentTimeString = `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

            if (currentTimeString !== this.previousTimeString) {
                const spans = this.element.querySelectorAll('.digit-char');
                const currentChars = currentTimeString.split('');

                currentChars.forEach((newChar, index) => {
                    const span = spans[index];
                    if (span && newChar !== (this.previousTimeString[index] || '')) {
                        span.textContent = newChar;

                        const isMainTimer = (elementId === 'timer-arrival-display' || elementId === 'timer-relationship-display');
                        const store = Alpine.store('app');

                        if (isMainTimer && store?.config?.effects_enabled && store.ui.currentPage === 'page-main') {
                            if (typeof spawnParticles === 'function') {
                                spawnParticles({
                                    originElement: span,
                                    symbol: store.config.effect_particle_day || '💖',
                                    count: 1, spread: 30, distance: 300, duration: 1200
                                });
                            }
                        }
                    }
                });
                this.previousTimeString = currentTimeString;
            }
        }
    };
}

/* ==========================================================================
   6. Alpine Store: App
   ========================================================================== */

document.addEventListener('alpine:init', () => {
    Alpine.store('app', {
        config: null,
        log: null,
        lang: {},
        form: null,
        defaults: null,
        audioManifest: {},
        ui: {
            currentPage: 'page-main',
            isLoaded: false,
            error: null,
            hoverTargetType: null,
            isDirty: false,
            isSaving: false
        },

        /**
         * Initializes the application store, fetches config, and setups initial state.
         */
        async init() {
            try {
                const [configRes, logRes, defaultsRes, audioRes] = await Promise.all([
                    fetch('/api/config'),
                    fetch('/api/calendar_log'),
                    fetch('/api/config/defaults'),
                    fetch('/api/audio_manifest')
                ]);

                if (!configRes.ok) throw new Error(`API /api/config Error: ${configRes.status}`);
                if (!logRes.ok) throw new Error(`API /api/calendar_log Error: ${logRes.status}`);
                if (!defaultsRes.ok) throw new Error(`API /api/config/defaults Error: ${defaultsRes.status}`);
                if (!audioRes.ok) throw new Error(`API /api/audio_manifest Error: ${audioRes.status}`);

                this.config = await configRes.json();
                this.log = await logRes.json();
                this.defaults = await defaultsRes.json();
                this.audioManifest = await audioRes.json();

                if (!this.config || !this.log || !this.config.language) {
                    throw new Error("Invalid config or log structure.");
                }

                const langRes = await fetch(`/static/lang/${this.config.language}.json`);
                if (!langRes.ok) throw new Error(`Error loading language: ${this.config.language}.json`);
                this.lang = await langRes.json();

                this.applyDynamicStyles();
                this.ui.isLoaded = true;

                this.form = Alpine.reactive(JSON.parse(JSON.stringify(this.config)));

                if (typeof resetCalendarZoom === 'function') resetCalendarZoom();
                if (typeof initCalendarZoom === 'function') initCalendarZoom();

                if (AudioManager) AudioManager.init(this.audioManifest);

                if (this.config.is_first_launch) {
                    Alpine.deferLoading = false;
                    Alpine.nextTick(() => {
                        const modalElement = document.getElementById('first-launch-modal');
                        if (modalElement && modalElement._x_dataStack) {
                            modalElement._x_dataStack[0].isVisible = true;
                        }
                    });
                }
            } catch (error) {
                console.error("[Store.init] Critical Error:", error);
                this.ui.error = error.message;
            }
        },

        // --- Actions ---

        async resetCalendarLog() {
            const confirmText = this.lang['settings_danger_reset_calendar_confirm'] || "Are you sure you want to reset the calendar?";
            if (!confirm(confirmText)) return;

            try {
                const response = await fetch('/api/calendar/reset', { method: 'POST' });
                if (!response.ok) throw new Error('API Error');

                this.log = await response.json();
                const successText = this.lang['settings_danger_reset_calendar_success'] || "Calendar reset!";
                alert(successText);
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        },

        navigateTo(pageId) {
            if (this.ui.currentPage === pageId) return;
            AudioManager.playRandom('switchPage', true);
            this.ui.currentPage = pageId;
        },

        applyDynamicStyles() {
            if (!this.config?.colors) return;
            const root = document.documentElement;

            try {
                for (const [key, value] of Object.entries(this.config.colors)) {
                    const cssVar = `--${key.replace(/_/g, '-')}`;
                    const cssVarRgb = `${cssVar}-rgb`;
                    root.style.setProperty(cssVar, value);
                    root.style.setProperty(cssVarRgb, hexToRgb(value));
                }
                root.style.setProperty('--calendar-empty-cell-color', this.config.calendar_empty_cell_color);
                root.style.setProperty('--calendar-marked-day-color', this.config.calendar_marked_day_color);
                root.style.setProperty('--sticker-color', this.config.sticker_color);

                const blurValue = parseInt(this.config.blur_strength, 10);
                if (!isNaN(blurValue) && blurValue >= 0) {
                    root.style.setProperty('--blur-strength', `${blurValue}px`);
                } else {
                    root.style.setProperty('--blur-strength', '3px');
                }
            } catch (error) {
                console.error("[Store.applyDynamicStyles] Error:", error);
            }
        },

        async toggleDate(dateString, cell) {
            if (!dateString || !cell || !this.log) return;

            AudioManager.playRandom('calendarDay', true);
            cell.style.pointerEvents = 'none';
            cell.style.opacity = '0.5';

            try {
                const response = await fetch('/api/calendar/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date: dateString })
                });

                if (!response.ok) throw new Error(`API Error: ${response.status}`);
                const result = await response.json();

                if (result.status === 'added' && result.entry) {
                    this.log.marked_dates[dateString] = result.entry;
                } else if (result.status === 'removed') {
                    delete this.log.marked_dates[dateString];
                }

                if (this.config.effects_enabled && result.status === 'added') {
                    if (typeof spawnParticles === 'function') {
                        spawnParticles({
                            originElement: cell,
                            symbol: this.config.effect_particle_day || '💖',
                            count: 1, spread: 360, distance: 400, duration: 1200
                        });
                    }
                }
            } catch (error) {
                console.error("[Store.toggleDate] Error:", error);
            } finally {
                cell.style.pointerEvents = 'auto';
                cell.style.opacity = '1';
            }
        },

        // --- Getters & Helpers ---

        getCustomTimerMode(dateString) {
            const targetDate = new Date(dateString);
            return (targetDate > new Date()) ? 'countdown' : 'elapsed';
        },

        getCustomTimerColor(dateString) {
            if (!this.config) return null;
            const mode = this.getCustomTimerMode(dateString);
            return mode === 'countdown'
                ? this.config.colors.color_timer_countdown
                : this.config.colors.color_timer_elapsed;
        },

        /**
         * Calculates the range of months for the calendar.
         * Correctly parses UTC dates to ensure timezone consistency.
         */
        get calendarMonths() {
            if (!this.config || !this.lang?.weekdays_short) return [];

            try {
                // Helper to parse ISO strings (YYYY-MM-DD...) into a Date object representing UTC Midnight.
                const parseDateStrToUTCMidnight = (isoString) => {
                    if (!isoString) return null;
                    try {
                        const localDate = new Date(isoString);
                        return new Date(Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate()));
                    } catch (e) {
                        return null;
                    }
                };

                const departureDateUTC = parseDateStrToUTCMidnight(this.config.date_vova_departure);
                const arrivalDateUTC = parseDateStrToUTCMidnight(this.config.date_vova_arrival);

                if (!departureDateUTC || !arrivalDateUTC) return [];

                // Calendar starts day AFTER departure
                const startDateUTC = new Date(departureDateUTC.getTime() + 86400000);
                const endDateUTC = arrivalDateUTC;

                if (startDateUTC.getTime() > endDateUTC.getTime()) return [];

                const months = [];
                let currentDateUTC = new Date(Date.UTC(startDateUTC.getUTCFullYear(), startDateUTC.getUTCMonth(), 1));

                while (currentDateUTC.getTime() <= endDateUTC.getTime()) {
                    const year = currentDateUTC.getUTCFullYear();
                    const month = currentDateUTC.getUTCMonth();
                    months.push(this.generateMonthGrid(year, month, startDateUTC.getTime(), endDateUTC.getTime()));
                    currentDateUTC.setUTCMonth(currentDateUTC.getUTCMonth() + 1);
                }
                return months;
            } catch (e) {
                console.error("[Store.calendarMonths] Critical Error:", e);
                return [];
            }
        },

        /**
         * Generates a 42-cell grid for a single month.
         */
        generateMonthGrid(year, month, globalStartUTCms, globalEndUTCms) {
            const monthName = new Date(Date.UTC(year, month)).toLocaleString(this.config.language || 'ru', { month: 'long', timeZone: 'UTC' });
            const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay();
            const paddingDays = (firstDayOfMonth === 0) ? 6 : (firstDayOfMonth - 1);
            const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
            const daysArray = [];

            for (let i = 0; i < 42; i++) {
                const dayOfMonth = i - paddingDays + 1;
                const cell = {
                    key: `${year}-${month}-${i}`,
                    day: dayOfMonth,
                    isPadding: true,
                    isInRange: false,
                    dateString: null,
                    isArrival: false
                };

                if (dayOfMonth >= 1 && dayOfMonth <= daysInMonth) {
                    const cellDateUTCms = Date.UTC(year, month, dayOfMonth);

                    if (cellDateUTCms >= globalStartUTCms && cellDateUTCms <= globalEndUTCms) {
                        cell.isPadding = false;
                        cell.isInRange = true;
                        const dateObj = new Date(cellDateUTCms);
                        cell.dateString = `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}`;

                        if (cellDateUTCms === globalEndUTCms) {
                            cell.isArrival = true;
                        }
                    } else {
                        cell.isPadding = false;
                        cell.isInRange = false;
                    }
                }
                daysArray.push(cell);
            }

            return {
                key: `${year}-${month}`,
                title: `${monthName.toUpperCase()} ${year}`,
                weekdays: this.lang.weekdays_short,
                days: daysArray
            };
        },

        getStickerTransform(dateString) {
            const entry = this.log?.marked_dates?.[dateString];
            if (!entry) return '';
            let transform = `rotate(${entry.rotation}deg)`;
            if (this.config?.sticker_scale !== 1.0) {
                transform += ` scale(${this.config.sticker_scale})`;
            }
            return transform;
        },

        getArrivalStickerTransform() {
            if (!this.config?.arrival_day) return '';
            let transform = '';
            if (this.config.arrival_day.sticker_scale !== 1.0) {
                transform += ` scale(${this.config.arrival_day.sticker_scale})`;
            }
            return transform;
        },

        isMonthCompleted(month) {
            if (!this.log?.marked_dates || !month?.days) return false;
            const notMarkedDay = month.days.find(day =>
                day.isInRange && !this.log.marked_dates[day.dateString]
            );
            return !notMarkedDay && month.days.some(day => day.isInRange);
        },

        triggerMonthCompletionEffect(monthElement, monthData) {
            if (!this.config?.effects_enabled || !monthElement || !monthData?.days) return;

            const dayCells = monthElement.querySelectorAll('.day-cell.in-range');
            dayCells.forEach(cell => {
                if (typeof spawnParticles === 'function') {
                    spawnParticles({
                        originElement: cell,
                        symbol: this.config.effect_particle_day || '💖',
                        count: 1, spread: 360, distance: 400, duration: 1200
                    });
                }
            });

            AudioManager.playRandom('CalendarMonth', true);

            if (this.config.effect_particle_month && typeof spawnParticles === 'function') {
                spawnParticles({
                    originElement: monthElement,
                    symbol: this.config.effect_particle_month,
                    count: 20, spread: 360,
                    distance: Math.max(window.innerWidth / 2, window.innerHeight / 2, 600),
                    duration: 1800,
                    particleClass: 'month-particle'
                });
            }
        },

        setHoverTarget(type) {
            if (type === this.ui.hoverTargetType) return;
            this.ui.hoverTargetType = type;

            if (!this.config.animations_enabled) return;

            const shouldPlayHeartbeat = (type === 'arrival' || type === 'relationship');

            if (shouldPlayHeartbeat) {
                if (AudioManager) AudioManager.playHeartbeat(2000);
            } else {
                if (AudioManager) AudioManager.stopHeartbeat(1000);
            }
        },

        handleFirstLaunchOK() {
            this.navigateTo('page-settings');
            this.markDirty();
        },

        markDirty() {
            if (!this.ui.isDirty) {
                this.ui.isDirty = true;
                document.body.classList.add('form-dirty');
            }
        },

        async saveSettings(formData, doReload = true) {
            if (!formData || this.ui.isSaving) return false;
            this.ui.isSaving = true;

            try {
                const response = await fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    this.ui.isSaving = false;
                    return false;
                }

                this.config = await response.json();
                this.form = Alpine.reactive(JSON.parse(JSON.stringify(this.config)));
                this.ui.isDirty = false;
                document.body.classList.remove('form-dirty');
                this.applyDynamicStyles();
                this.ui.isSaving = false;

                if (doReload) {
                    setTimeout(() => { window.location.reload(); }, 1000);
                }
                return true;

            } catch (error) {
                console.error("[Store.saveSettings] Error:", error);
                alert(`Error: ${error.message}`);
                this.ui.isSaving = false;
                return false;
            }
        },

        revertSettings() {
            if (this.config) {
                this.form = Alpine.reactive(JSON.parse(JSON.stringify(this.config)));
            }
            this.ui.isDirty = false;
            document.body.classList.remove('form-dirty');
            this.applyDynamicStyles();
        },

        async resetAllSettings() {
            const confirmText = this.lang['settings_danger_reset_all_confirm'] || "ARE YOU SURE? This will reset ALL settings to defaults and cannot be undone.";
            if (!confirm(confirmText)) return;

            this.ui.isSaving = true;

            try {
                const response = await fetch('/api/config/reset_all', { method: 'POST' });
                if (!response.ok) throw new Error('API Error');

                alert("All settings reset. Reloading...");
                window.location.reload();
            } catch (error) {
                alert(`Error: ${error.message}`);
                this.ui.isSaving = false;
            }
        }
    });
});