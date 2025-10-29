/**
 * @fileoverview v2.2 (с Ticker)
 * Реактивное ядро.
 * Шаг 3: Добавлен alpineTicker для страницы таймеров.
 */

// --- Утилита Ticker (x-init) ---
function alpineTicker(elementId, getTargetDate, getMode, getCompletedMsg) {
    return {
        // State
        element: null,
        intervalId: null,
        previousTimeString: '--:--:--:--',

        // Getters
        get targetDate() { return new Date(getTargetDate()); },
        get mode() { return getMode(); },
        get completedMessage() { return getCompletedMsg(); },

        // --- Init (ИСПРАВЛЕНО) ---
        init() {
            // (ФИКС №2)
            // Мы "откладываем" init, чтобы Alpine успел отрендерить
            // дочерний div, который мы ищем по ID.
            Alpine.nextTick(() => {
                this.element = document.getElementById(elementId);
                if (!this.element) {
                    // Эта ошибка теперь не должна появляться
                    console.error(`[Ticker] Не найден элемент: #${elementId}`);
                    return;
                }
                // Создаем span'ы
                this.element.innerHTML = this.previousTimeString.split('')
                    .map((char, i) => `<span class="digit-char digit-${i}">${char}</span>`)
                    .join('');

                // $watch следит за изменениями
                Alpine.watch(() => [this.targetDate, this.mode, this.completedMessage], () => {
                    console.log(`[Ticker] ${elementId}: Обнаружено изменение. (Пере)Запуск...`);
                    this.stop();
                    if (this.targetDate && !isNaN(this.targetDate.getTime())) {
                       this.start();
                    }
                });

                // Запускаем таймер ПЕРВЫЙ РАЗ
                 if (this.targetDate && !isNaN(this.targetDate.getTime())) {
                       this.start();
                 }
            });
        }, // Конец init

        // --- Methods ---
        start() {
            if (this.intervalId) return; // Уже запущен
            this.update(); // Немедленный апдейт
            this.intervalId = setInterval(() => this.update(), 1000);
        },
        stop() {
            clearInterval(this.intervalId);
            this.intervalId = null;
        },

        // --- update (ИСПРАВЛЕНО) ---
        update() {
            if (!this.element) return;

            const now = new Date();
            let diffMs;

            // (ФИКС №1)
            // 'this.referenceDate' заменен на 'this.targetDate'
            if (this.mode === 'countdown') {
                diffMs = this.targetDate.getTime() - now.getTime();
            } else {
                diffMs = now.getTime() - this.targetDate.getTime(); // <-- ВОТ ФИКС
            }
            // --- (Конец фикса) ---

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

                        if (isMainTimer && store && store.config && store.config.effects_enabled && store.ui.currentPage === 'page-main') {
                            if (typeof spawnParticles === 'function') {
                                spawnParticles({
                                     originElement: span,
                                    symbol: store.config.effect_particle_day || '💖',
                                    count: 1, spread: 30, distance: 300, duration: 1200
                                });
                            } else {
                                console.warn("[Ticker] Функция spawnParticles не найдена. (effects.js не загружен?)");
                            }
                        }
                    }
                });
                this.previousTimeString = currentTimeString;
            }
        }
    };
}

// --- Инициализация Alpine ---
document.addEventListener('alpine:init', () => {
    console.log("--- [DEBUG] Alpine.js: Инициализация хранилища...");

    Alpine.store('app', {
        // ... (Все из v2.1: config, log, lang, ui) ...
        config: null,
        log: null,
        lang: {},
        ui: {
            currentPage: 'page-main',
            isLoaded: false,
            error: null,
            hoverTargetType: null // null | 'header-button' | 'arrival' | 'relationship'
        },

        // --- 2. Инициализация (INIT) ---
        // ... (v2.1 init() остается без изменений) ...
        async init() {
            console.log("--- [DEBUG] Store.init(): Старт...");
            try {
                console.log("--- [DEBUG] Store.init(): Запрос config и log...");
                const [configRes, logRes] = await Promise.all([
                    fetch('/api/config'),
                    fetch('/api/calendar_log')
                ]);
                if (!configRes.ok) throw new Error(`Ошибка API /api/config: ${configRes.status}`);
                if (!logRes.ok) throw new Error(`Ошибка API /api/calendar_log: ${logRes.status}`);
                this.config = await configRes.json();
                this.log = await logRes.json();
                console.log("--- [DEBUG] Store.init(): Config и Log получены.");
                if (!this.config || !this.log || !this.config.language) {
                    throw new Error("Структура config или log некорректна.");
                }
                console.log(`--- [DEBUG] Store.init(): Запрос языка ${this.config.language}...`);
                const langRes = await fetch(`/static/lang/${this.config.language}.json`);
                if (!langRes.ok) throw new Error(`Ошибка загрузки языка: ${this.config.language}.json`);
                this.lang = await langRes.json();
                console.log("--- [DEBUG] Store.init(): Язык загружен.");
                this.applyDynamicStyles();
                console.log("--- [DEBUG] Store.init(): УСПЕХ. Config, Log, Lang загружены.");
                this.ui.isLoaded = true;

                if (typeof resetCalendarZoom === 'function') {
                    resetCalendarZoom();
                } else { console.warn("[App.init] resetCalendarZoom не найдена"); }
                if (typeof initCalendarZoom === 'function') {
                    initCalendarZoom();
                } else { console.warn("[App.init] initCalendarZoom не найдена"); }

                if (this.config.is_first_launch) {
                     console.log("--- [DEBUG] ПЕРВЫЙ ЗАПУСК. (Логика модалки будет здесь)");
                     this.navigateTo('page-settings');
                }
            } catch (error) {
                console.error("--- [DEBUG] КРИТИЧЕСКАЯ ОШИБКА в Store.init():", error);
                this.ui.error = error.message;
            }
        },

        // --- 3. Методы (ACTIONS) ---
        // ... (v2.1 navigateTo() и applyDynamicStyles() остаются без изменений) ...
        navigateTo(pageId) {
            if (this.ui.currentPage === pageId) return;
            this.ui.currentPage = pageId;
            console.log(`--- [DEBUG-REACTIVE] UI: Текущая страница изменилась на ${pageId}`);
        },
        applyDynamicStyles() {
            if (!this.config || !this.config.colors) {
                console.warn("--- [DEBUG] Store.applyDynamicStyles: Объект colors не найден в конфиге.");
                return;
            }
            console.log("--- [DEBUG] Store: Применение CSS-переменных...");
            const root = document.documentElement;
            try {
                Object.keys(this.config.colors).forEach(key => {
                    const cssVar = `--${key.replace(/_/g, '-')}`;
                    root.style.setProperty(cssVar, this.config.colors[key]);
                });
                root.style.setProperty('--calendar-empty-cell-color', this.config.calendar_empty_cell_color);
                root.style.setProperty('--calendar-marked-day-color', this.config.calendar_marked_day_color);
                root.style.setProperty('--sticker-color', this.config.sticker_color);
                root.style.setProperty('--sticker-scale-factor', this.config.sticker_scale);
                const blurValue = parseInt(this.config.blur_strength, 10);
                if (!isNaN(blurValue) && blurValue >= 0) {
                     root.style.setProperty('--blur-strength', `${blurValue}px`);
                     console.log(`--- [DEBUG] Store: Установлен --blur-strength: ${blurValue}px`);
                } else {
                     console.warn("[App.applyDynamicStyles] Некорректное значение blur_strength в конфиге.");
                     root.style.setProperty('--blur-strength', '3px'); // Дефолт на всякий случай
                }

                console.log("--- [DEBUG] Store: CSS-переменные применены.");
            } catch (error) {
                 console.error("--- [DEBUG] Ошибка в applyDynamicStyles:", error);
            }
        },

        /**
         * (НОВОЕ) Переключает отметку в календаре (API + обновление state).
         * @param {string} dateString - "YYYY-MM-DD"
         * @param {HTMLElement} cell - Элемент .day-cell
         */
        async toggleDate(dateString, cell) {
            if (!dateString || !cell || !this.log) return; // Добавлена проверка this.log
            console.log(`--- [DEBUG] Store.toggleDate: ${dateString}`);

            cell.style.pointerEvents = 'none';
            cell.style.opacity = '0.5';

            try {
                const response = await fetch('/api/calendar/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date: dateString })
                });

                if (!response.ok) throw new Error(`API /calendar/toggle Error: ${response.status}`);

                const result = await response.json();
                console.log("--- [DEBUG] Ответ API:", result);

                // --- РЕАКТИВНОЕ ОБНОВЛЕНИЕ ---
                // Alpine.js отследит эту мутацию и *сам* перерисует UI
                if (result.status === 'added' && result.entry) {
                    // Важно: Pydantic возвращает строки для дат, Alpine нужен объект Date
                    this.log.marked_dates[dateString] = result.entry;
                } else if (result.status === 'removed') {
                    delete this.log.marked_dates[dateString];
                }

                // Эффект частиц (если включен)
                if (this.config.effects_enabled && result.status === 'added') {
                    if (typeof spawnParticles === 'function') {
                        spawnParticles({
                             originElement: cell,
                             symbol: this.config.effect_particle_day || '💖', // Используем this.config
                             count: 1, spread: 360, distance: 400, duration: 1200
                        });
                    }
                }

            } catch (error) {
                console.error("--- [DEBUG] Ошибка в toggleDate:", error);
                // TODO: Показать юзеру тост "Ошибка!"
            } finally {
                cell.style.pointerEvents = 'auto';
                cell.style.opacity = '1';
            }
        }, // Конец toggleDate

        // --- 4. Getters (НОВОЕ) ---
        /**
         * Вычисляет режим ('countdown' или 'elapsed') для кастомного таймера.
         */
        getCustomTimerMode(dateString) {
            const targetDate = new Date(dateString);
            return (targetDate > new Date()) ? 'countdown' : 'elapsed';
        },

        /**
         * Вычисляет цвет цифр для кастомного таймера.
         */
        getCustomTimerColor(dateString) {
            if (!this.config) return null;
            const mode = this.getCustomTimerMode(dateString);
            return mode === 'countdown'
                ? this.config.colors.color_timer_countdown
                : this.config.colors.color_timer_elapsed;
        },

/**
         * (v2.5 - ФИКС UTC) [GETTER] Вычисляет и кэширует диапазон месяцев.
         */
        get calendarMonths() {
            // Ждем загрузки config и lang
            if (!this.config || !this.lang || !this.lang.weekdays_short) {
                // Убрали лог об ошибке, т.к. Alpine сам его вызовет при загрузке
                return [];
            }
            console.log("--- [DEBUG] Store: Пересчет calendarMonths()...");

            try {
                // --- (ИСПРАВЛЕНО UTC ПАРСИНГ) ---
                // Pydantic дает строки ISO 8601 ("YYYY-MM-DDTHH:mm:ss...").
                // Нам нужно НАЧАЛО ДНЯ в UTC.
                const parseDateStrToUTCMidnight = (isoString) => {
                    if (!isoString) return null;
                    try {
                        // 1. Создаем Date объект (он будет в ЛОКАЛЬНОМ поясе)
                        const localDate = new Date(isoString);
                        // 2. Получаем UTC год, месяц, день
                        const year = localDate.getUTCFullYear();
                        const month = localDate.getUTCMonth();
                        const day = localDate.getUTCDate();
                        // 3. Собираем Date объект, который представляет 00:00:00 UTC
                        return new Date(Date.UTC(year, month, day));
                    } catch (e) {
                        console.error(`Ошибка парсинга даты UTC: ${isoString}`, e);
                        return null; // Возвращаем null при ошибке
                    }
                };

                const departureDateUTC = parseDateStrToUTCMidnight(this.config.date_vova_departure);
                const arrivalDateUTC = parseDateStrToUTCMidnight(this.config.date_vova_arrival);

                // Проверка на ошибки парсинга
                if (!departureDateUTC || !arrivalDateUTC) {
                    console.error("--- [DEBUG] Store.calendarMonths: Не удалось спарсить даты UTC.");
                    return [];
                }

                // Календарь начинается со СЛЕДУЮЩЕГО дня после отъезда (в UTC)
                // Создаем новую дату, чтобы не мутировать departureDateUTC
                const startDateUTC = new Date(departureDateUTC.getTime() + 86400000); // +1 день
                const endDateUTC = arrivalDateUTC;
                // --- (КОНЕЦ ИСПРАВЛЕНИЙ UTC) ---

                // Сравниваем getTime() - это всегда UTC миллисекунды
                if (startDateUTC.getTime() > endDateUTC.getTime()) {
                    console.warn("--- [DEBUG] Store.calendarMonths: ОШИБКА ДИАПАЗОНА (Начало > Конец).");
                    return [];
                }

                const months = [];
                // Итерация по UTC месяцам
                let currentDateUTC = new Date(Date.UTC(startDateUTC.getUTCFullYear(), startDateUTC.getUTCMonth(), 1));

                // Цикл идет, пока ПЕРВОЕ число текущего месяца МЕНЬШЕ ИЛИ РАВНО конечной дате
                while (currentDateUTC.getTime() <= endDateUTC.getTime()) {
                    const year = currentDateUTC.getUTCFullYear();
                    const month = currentDateUTC.getUTCMonth(); // 0-11
                    // Передаем миллисекунды UTC в generateMonthGrid
                    months.push(this.generateMonthGrid(year, month, startDateUTC.getTime(), endDateUTC.getTime()));
                    // Переходим к следующему месяцу UTC
                    currentDateUTC.setUTCMonth(currentDateUTC.getUTCMonth() + 1);
                }
                console.log(`--- [DEBUG] Store: Сгенерировано ${months.length} месяцев.`);
                return months;

            } catch (e) {
                 console.error("--- [DEBUG] КРИТИЧЕСКАЯ ОШИБКА в calendarMonths:", e);
                 return [];
            }
        },

/**
         * (v2.6 - ФИКС cell) [HELPER] Генерирует массив из 42 дней для сетки одного месяца.
         */
        generateMonthGrid(year, month, globalStartUTCms, globalEndUTCms) {
            const monthName = new Date(Date.UTC(year, month)).toLocaleString(this.config.language || 'ru', { month: 'long', timeZone: 'UTC' });
            const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0=Вс, 1=Пн UTC
            const paddingDays = (firstDayOfMonth === 0) ? 6 : (firstDayOfMonth - 1);
            const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
            const daysArray = [];

            console.log(`--- [DEBUG] generateMonthGrid (${year}-${month}): Start`); // Добавим лог

            for (let i = 0; i < 42; i++) {
                const dayOfMonth = i - paddingDays + 1;

                // *** ИСПРАВЛЕНО: Полное определение cell ***
                const cell = {
                    // Уникальный ключ для x-for в ЭТОМ месяце
                    key: `${year}-${month}-${i}`,
                    day: dayOfMonth,
                    isPadding: true,    // По умолчанию считаем пустой ячейкой
                    isInRange: false,   // По умолчанию вне диапазона
                    dateString: null,   // "YYYY-MM-DD" (только для дней isInRange)
                    isArrival: false    // Это день приезда?
                };
                // *** КОНЕЦ ИСПРАВЛЕНИЯ ***

                // Если это валидный день текущего месяца
                if (dayOfMonth >= 1 && dayOfMonth <= daysInMonth) {
                    const cellDateUTCms = Date.UTC(year, month, dayOfMonth);

                    // Если день ВНУТРИ глобального диапазона календаря
                    if (cellDateUTCms >= globalStartUTCms && cellDateUTCms <= globalEndUTCms) {
                        cell.isPadding = false; // Не пустая
                        cell.isInRange = true;  // Активная
                        const dateObj = new Date(cellDateUTCms);
                        // Формируем "YYYY-MM-DD" строку для API и лога
                        cell.dateString = `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}`;

                        // Проверяем, это день приезда?
                        if (cellDateUTCms === globalEndUTCms) {
                            cell.isArrival = true;
                        }
                    } else {
                        // День месяца, но ВНЕ глобального диапазона (например, до отъезда+1)
                        cell.isPadding = false; // Показываем число, но ячейка неактивна
                        cell.isInRange = false;
                    }
                }
                // Если dayOfMonth < 1 или > daysInMonth, то cell остается с isPadding: true

                daysArray.push(cell);
            }

            // --- Дебаг Ключей ---
            const keys = daysArray.map(d => d.key);
            // console.log("Generated Day Keys:", keys); // Раскомментируй, если снова будут ошибки ключей
            const uniqueKeys = new Set(keys);
            if (uniqueKeys.size !== keys.length) {
                console.error(`!!! ДУБЛИКАТЫ КЛЮЧЕЙ в ${year}-${month} !!!`);
            }
            if (keys.some(k => k === undefined)) {
                 console.error(`!!! UNDEFINED КЛЮЧ в ${year}-${month} !!!`);
            }
            // --- Конец Дебага ---

            return {
                key: `${year}-${month}`, // Ключ для x-for месяцев
                title: `${monthName.toUpperCase()} ${year}`,
                weekdays: this.lang.weekdays_short,
                days: daysArray // Массив из 42 объектов cell
            };
        }, // Конец generateMonthGrid

        /**
         * (НОВОЕ) [HELPER] Рассчитывает стиль transform для стикера
         */
        getStickerTransform(dateString) {
            // Добавлена проверка this.log
            const entry = this.log?.marked_dates?.[dateString];
            if (!entry) return '';
            let transform = `rotate(${entry.rotation}deg)`;
            if (this.config?.sticker_scale !== 1.0) {
                 transform += ` scale(${this.config.sticker_scale})`;
            }
            return transform;
        },

        /**
         * (НОВОЕ) [HELPER] Рассчитывает стиль transform для стикера ДНЯ ПРИЕЗДА
         */
        getArrivalStickerTransform() {
            if (!this.config?.arrival_day) return '';
            let transform = '';
            if (this.config.arrival_day.sticker_scale !== 1.0) {
                transform += ` scale(${this.config.arrival_day.sticker_scale})`;
            }
            return transform;
        },

        /**
         * (НОВОЕ) [HELPER] Проверяет, завершен ли месяц.
         */
        isMonthCompleted(month) {
            // Добавлена проверка this.log
            if (!this.log?.marked_dates || !month?.days) return false;
            // Ищем первый день, который в диапазоне, но НЕ отмечен
            const notMarkedDay = month.days.find(day =>
                day.isInRange && !this.log.marked_dates[day.dateString]
            );
            // Если такой не найден И в месяце есть хотя бы один активный день
            return !notMarkedDay && month.days.some(day => day.isInRange);
        },
        /**
         * (НОВОЕ) [HELPER] Запускает эффект завершения месяца.
         */
        triggerMonthCompletionEffect(monthElement, monthData) {
            if (!this.config?.effects_enabled || !monthElement || !monthData?.days) return;

            console.log(`--- [DEBUG] ЭФФЕКТ: Месяц ${monthData.title} ЗАВЕРШЕН!`);

            // Находим все *активные* ячейки дней
            const dayCells = monthElement.querySelectorAll('.day-cell.in-range');

            // 1. Частицы дня из каждой ячейки
            dayCells.forEach(cell => {
                if (typeof spawnParticles === 'function') {
                    spawnParticles({
                        originElement: cell,
                        symbol: this.config.effect_particle_day || '💖',
                        count: 1, spread: 360, distance: 400, duration: 1200
                    });
                }
            });

            // 2. Частицы месяца из центра модуля (если символ задан)
            if (this.config.effect_particle_month && typeof spawnParticles === 'function') {
                 spawnParticles({
                     originElement: monthElement, // Центр модуля
                     symbol: this.config.effect_particle_month,
                     count: 20, spread: 360,
                     distance: Math.max(window.innerWidth / 2, window.innerHeight / 2, 600),
                     duration: 1800,
                     particleClass: 'month-particle' // Для возможной стилизации
                 });
            }
        },
        setHoverTarget(type) {
            this.ui.hoverTargetType = type;
        },
         // Конец triggerMonthCompletionEffect

    });
});