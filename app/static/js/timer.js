// /mrhoustontimer/app/static/js/timer.js
/**
 * @fileoverview Ticker class for tracking time and generating particle effects on digit changes.
 */

class Ticker {
    /**
     * Creates a Ticker instance.
     * @param {HTMLElement | null} element - DOM element for display.
     * @param {Date | string} referenceDate - The target or start date.
     * @param {'countdown' | 'elapsed'} [mode='elapsed'] - Timer mode.
     * @param {string} [completedMessage='Done!'] - Message to show when countdown ends.
     * @param {string} [elementId=''] - Element ID (used to identify main timers).
     */
    constructor(element, referenceDate, mode = 'elapsed', completedMessage = "Done!", elementId = '') {
        this.element = element;
        this.referenceDate = new Date(referenceDate);
        this.mode = mode;
        this.completedMessage = completedMessage;
        this.elementId = elementId;
        this.intervalId = null;
        /** @private @type {string | null} */
        this.previousTimeString = null;

        this._update = this._update.bind(this);

        // Validation
        if (!this.element || !(this.element instanceof HTMLElement)) {
            console.error("[Ticker] Invalid DOM element:", element);
            this.element = null;
        }
        if (isNaN(this.referenceDate.getTime())) {
             console.error("[Ticker] Invalid date:", referenceDate);
             this.referenceDate = new Date();
        }

        // Initialize span structure without animation
        if (this.element) {
            const initialString = '--:--:--:--';
            this.element.innerHTML = initialString.split('')
                .map((char, index) => `<span class="digit-char digit-${index}">${char}</span>`)
                .join('');
            this.previousTimeString = initialString;
        }
    }

    _pad(num) {
        const number = Number(num);
        if (isNaN(number)) return "00";
        return number < 10 ? '0' + number : number.toString();
    }

    /**
     * [v3.1] Updates the DOM and spawns particles if digits have changed.
     * @private
     */
    _update() {
        if (!this.element) return;

        const now = new Date();
        let diffMs;
        if (this.mode === 'countdown') {
            diffMs = this.referenceDate.getTime() - now.getTime();
        } else {
            diffMs = now.getTime() - this.referenceDate.getTime();
        }

        // Handle completion
        if (this.mode === 'countdown' && diffMs < 0) {
            if (this.element.innerText !== this.completedMessage) {
                 this.element.innerHTML = this.completedMessage;
            }
            this.stop();
            return;
        }

        // Calculate D:H:M:S
        const MS_IN_SECOND = 1000;
        const SECONDS_IN_MINUTE = 60;
        const MINUTES_IN_HOUR = 60;
        const HOURS_IN_DAY = 24;
        const SECONDS_IN_HOUR = SECONDS_IN_MINUTE * MINUTES_IN_HOUR;
        const SECONDS_IN_DAY = SECONDS_IN_HOUR * HOURS_IN_DAY;

        const totalSeconds = Math.floor(Math.abs(diffMs) / MS_IN_SECOND);
        const days = Math.floor(totalSeconds / SECONDS_IN_DAY);
        const hours = Math.floor((totalSeconds % SECONDS_IN_DAY) / SECONDS_IN_HOUR);
        const minutes = Math.floor((totalSeconds % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE);
        const seconds = totalSeconds % SECONDS_IN_MINUTE;

        const currentTimeString = `${this._pad(days)}:${this._pad(hours)}:${this._pad(minutes)}:${this._pad(seconds)}`;

        // --- Update Digits & Trigger Effects ---
        if (currentTimeString !== this.previousTimeString) {
            const currentChars = currentTimeString.split('');
            const previousChars = (this.previousTimeString || '').split('');
            const spans = this.element.querySelectorAll('.digit-char');

            // Check if span count matches char count
            if (spans.length === currentChars.length) {
                currentChars.forEach((newChar, index) => {
                    const span = spans[index];
                    const oldChar = previousChars[index];

                    // If character changed
                    if (newChar !== oldChar) {
                        span.textContent = newChar;

                        // --- Trigger Particle Effect ---
                        // Only for main timers and if effects are enabled in config
                        const isMainTimer = (this.elementId === 'timer-arrival-display' || this.elementId === 'timer-relationship-display');
                        const isMainPageActive = document.getElementById('page-main')?.classList.contains('active');

                        if (isMainTimer && typeof APP_CONFIG !== 'undefined' && APP_CONFIG.effects_enabled && isMainPageActive) {
                            spawnParticles({
                                originElement: span,
                                symbol: APP_CONFIG.effect_particle_day || '💖',
                                count: 1,
                                spread: 30,
                                distance: 300,
                                duration: 1200
                            });
                        }
                    }
                });
            } else {
                 // Fallback: Rebuild spans if structure is broken
                 this.element.innerHTML = currentChars.map((char, index) => `<span class="digit-char digit-${index}">${char}</span>`).join('');
            }
            this.previousTimeString = currentTimeString;
        }
    }

    start() {
        if (!this.element) return;
        if (this.intervalId !== null) return;
        this._update();
        this.intervalId = window.setInterval(this._update, 1000);
    }

    stop() {
        if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
            this.previousTimeString = null;
        }
    }
}