// /mrhoustontimer/app/static/js/timer.js
/**
 * @fileoverview Класс Ticker для отсчета времени с эффектом частиц из меняющихся цифр.
 */

class Ticker {
    /**
     * Создает экземпляр Ticker.
     * @param {HTMLElement | null} element - DOM-элемент для отображения.
     * @param {Date | string} referenceDate - Дата отсчета.
     * @param {'countdown' | 'elapsed'} [mode='elapsed'] - Режим.
     * @param {string} [completedMessage='Done!'] - Сообщение о завершении.
     * @param {string} [elementId=''] - ID элемента (для определения основного таймера).
     */
    constructor(element, referenceDate, mode = 'elapsed', completedMessage = "Done!", elementId = '') {
        this.element = element;
        this.referenceDate = new Date(referenceDate);
        this.mode = mode;
        this.completedMessage = completedMessage;
        this.elementId = elementId;
        this.intervalId = null;
        /** @private @type {string | null} */
        this.previousTimeString = null; // Для сравнения цифр

        this._update = this._update.bind(this);

        // Проверки валидности
        if (!this.element || !(this.element instanceof HTMLElement)) {
            console.error("[Ticker] Невалидный DOM-элемент:", element);
            this.element = null;
        }
        if (isNaN(this.referenceDate.getTime())) {
             console.error("[Ticker] Невалидная дата:", referenceDate);
             this.referenceDate = new Date();
        }

        // Инициализируем структуру span'ов БЕЗ анимации
        if (this.element) {
            // Создаем span'ы при инициализации
            const initialString = '--:--:--:--';
            this.element.innerHTML = initialString.split('')
                .map((char, index) => `<span class="digit-char digit-${index}">${char}</span>`) // Добавляем индексный класс
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
     * [v3.1] Обновляет DOM и спавнит частицы из изменившихся цифр (только для основных таймеров).
     * @private
     */
    _update() {
        if (!this.element) return;

        const now = new Date();
        let diffMs;
        if (this.mode === 'countdown') diffMs = this.referenceDate.getTime() - now.getTime();
        else diffMs = now.getTime() - this.referenceDate.getTime();

        // Обработка завершения
        if (this.mode === 'countdown' && diffMs < 0) {
            if (this.element.innerText !== this.completedMessage) {
                 // Простое обновление текста без сложной анимации
                 this.element.innerHTML = this.completedMessage;
            }
            this.stop();
            return;
        }

        // Расчет Д:Ч:М:С
        const MS_IN_SECOND = 1000, SECONDS_IN_MINUTE = 60, MINUTES_IN_HOUR = 60, HOURS_IN_DAY = 24;
        const SECONDS_IN_HOUR = SECONDS_IN_MINUTE * MINUTES_IN_HOUR, SECONDS_IN_DAY = SECONDS_IN_HOUR * HOURS_IN_DAY;
        const totalSeconds = Math.floor(Math.abs(diffMs) / MS_IN_SECOND);
        const days = Math.floor(totalSeconds / SECONDS_IN_DAY);
        const hours = Math.floor((totalSeconds % SECONDS_IN_DAY) / SECONDS_IN_HOUR);
        const minutes = Math.floor((totalSeconds % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE);
        const seconds = totalSeconds % SECONDS_IN_MINUTE;

        const currentTimeString = `${this._pad(days)}:${this._pad(hours)}:${this._pad(minutes)}:${this._pad(seconds)}`;

        // --- ОБНОВЛЕНИЕ ЦИФР И ЭФФЕКТ ---
        if (currentTimeString !== this.previousTimeString) {
            const currentChars = currentTimeString.split('');
            const previousChars = (this.previousTimeString || '').split('');
            const spans = this.element.querySelectorAll('.digit-char');

            // Проверяем совпадение длины на всякий случай
            if (spans.length === currentChars.length) {
                currentChars.forEach((newChar, index) => {
                    const span = spans[index];
                    const oldChar = previousChars[index];

                    // Если символ изменился
                    if (newChar !== oldChar) {
                        span.textContent = newChar; // Просто обновляем текст

                        // --- Вызов Эффекта Частиц (Хотелка 1+2) ---
                        // Проверяем, что это один из ОСНОВНЫХ таймеров и эффекты включены
                        const isMainTimer = (this.elementId === 'timer-arrival-display' || this.elementId === 'timer-relationship-display');
                        const isMainPageActive = document.getElementById('page-main')?.classList.contains('active');
                        if (isMainTimer && APP_CONFIG && APP_CONFIG.effects_enabled && isMainPageActive) {
                            spawnParticles({
                                originElement: span, // <-- Источник - сам span с цифрой!
                                symbol: APP_CONFIG.effect_particle_day || '💖',
                                count: 1,      // 1 частица
                                spread: 30,   // Узкий конус вверх/вниз
                                distance: 300, // Близко к цифре
                                duration: 1200 // Быстро исчезает
                            });
                        }
                        // --- Конец Эффекта ---
                    }
                });
            } else {
                 // Аварийное обновление, если структура span'ов сломалась
                 console.warn("[Ticker] Несовпадение количества span'ов и символов, пересоздание структуры.");
                 this.element.innerHTML = currentChars.map((char, index) => `<span class="digit-char digit-${index}">${char}</span>`).join('');
            }
            this.previousTimeString = currentTimeString;
        }
        // --- КОНЕЦ ОБНОВЛЕНИЯ ---
    }

    start() {
        if (!this.element) return;
        if (this.intervalId !== null) return;
        console.debug("[Ticker] Запуск таймера:", this.elementId || this.element.tagName);
        this._update();
        this.intervalId = window.setInterval(this._update, 1000);
    }

    stop() {
        if (this.intervalId !== null) {
            console.debug("[Ticker] Остановка таймера:", this.elementId || this.element?.tagName);
            window.clearInterval(this.intervalId);
            this.intervalId = null;
            this.previousTimeString = null; // Сбрасываем для корректного старта
        }
    }
}