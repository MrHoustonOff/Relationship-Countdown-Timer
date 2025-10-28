// /mrhoustontimer/app/static/js/timer.js

/**
 * Универсальный класс 'Ticker' для отсчета времени
 * (Как для обратного отсчета, так и для прошедшего времени)
 */
class Ticker {
    /**
     * @param {HTMLElement} element - Элемент, куда будет выводиться время
     * @param {Date | string} referenceDate - Дата, от которой (или до которой) считаем
     * @param {'countdown' | 'elapsed'} mode - Режим работы
     */
constructor(element, referenceDate, mode = 'elapsed', completedMessage = "Done!") {
        this.element = element;
        this.referenceDate = new Date(referenceDate);
        this.mode = mode;
        this.completedMessage = completedMessage; // <-- НОВОЕ
        this.intervalId = null;
        this._update = this._update.bind(this);
    }

    /**
     * Форматирует число, добавляя 0, если нужно
     * @param {number} num - Число
     * @returns {string} - "08" или "12"
     */
    _pad(num) {
        return num < 10 ? '0' + num : num.toString();
    }

    /**
     * Главная логика обновления
     */
    _update() {
        const now = new Date();
        let diffMs;

        if (this.mode === 'countdown') {
            diffMs = this.referenceDate - now;
        } else {
            diffMs = now - this.referenceDate;
        }

        // --- ИСПРАВЛЕНИЕ (Твоя Критика 1) ---
        if (this.mode === 'countdown' && diffMs < 0) {
            this.element.innerHTML = this.completedMessage; // Используем
            this.stop();
            return;
        }
        // ---

        const totalSeconds = Math.floor(Math.abs(diffMs) / 1000);
        const days = Math.floor(totalSeconds / (3600 * 24));
        const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        this.element.innerHTML =
            `${this._pad(days)}:${this._pad(hours)}:${this._pad(minutes)}:${this._pad(seconds)}`;
    }

    /**
     * Запускает таймер
     */
    start() {
        if (this.intervalId) return; // Уже запущен
        this._update(); // Немедленный первый вызов
        this.intervalId = setInterval(this._update, 1000);
    }

    /**
     * Останавливает таймер
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}