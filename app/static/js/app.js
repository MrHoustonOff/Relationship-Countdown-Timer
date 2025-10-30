/**
 * @fileoverview v2.2 (с Ticker)
 * Реактивное ядро.
 * Шаг 3: Добавлен alpineTicker для страницы таймеров.
 */
const getDescendantProp = (obj, path) => {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};
// --- Alpine Компонент для Формы Настроек (v3.0 - ЛОКАЛЬНОЕ СОСТОЯНИЕ) ---
function settingsForm() {
    return {
        // --- 1. Локальное Состояние ---
        form: {
            language: 'ru',
            animations_enabled: true,
            effects_enabled: true,
            date_vova_departure_date: '',
            date_vova_departure_time: '',
            date_vova_arrival_date: '',
            date_vova_arrival_time: '',
            date_relationship_start_date: '',
            date_relationship_start_time: '',

            timers: {
                limit_text_length: true,
                timer_completed_message: '',
                arrival_timer_enabled: true,
                arrival_timer_text: '',
                relationship_timer_enabled: true,
                relationship_timer_text: '',
                custom_timers: [] // (Пока пустой, реализуем на Шаге 2)
            }
            // (Сюда будем добавлять поля из будущих модулей)
        },

        // --- Хелперы для парсинга (внутренние) ---
        _getDatePart(isoString) {
            if (!isoString) return '';
            try {
                const date = new Date(isoString);
                if (isNaN(date.getTime())) return '';
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            } catch (e) { return ''; }
        },
        _getTimePart(isoString) {
            if (!isoString || !isoString.includes('T')) return '00:00:00';
            try {
                const date = new Date(isoString);
                if (isNaN(date.getTime())) return '00:00:00';
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                return `${hours}:${minutes}:${seconds}`;
            } catch (e) { return '00:00:00'; }
        },

        // --- 2. Инициализация Компонента ---
        init() {
console.log("--- [DEBUG] settingsForm() v3.7: Инициализация...");

            // *** СЛУШАТЕЛЬ (Revert/Save/Load) ***
            Alpine.effect(() => {
                const storeForm = Alpine.store('app').form;
                const isDirty = Alpine.store('app').ui.isDirty;
                if (storeForm && !isDirty) {
                     console.log("--- [DEBUG] settingsForm (effect): Загрузка данных из $store.app.form...");
                     this.loadFormFromStore(storeForm);
                }
            });

            // *** СИНХРОНИЗАТОР (Local -> Store) ***
            let firstRun = true;
            Alpine.watch(() => this.form, (newFormData) => {
                if (firstRun || !newFormData) {
                    firstRun = false; return;
                }
                console.log("--- [DEBUG] settingsForm (watch): Локальная форма изменилась. Синхронизация с $store...");

                const store = Alpine.store('app');
                if (!store.form) return;

                // 1. Синхронизируем "Global"
                store.form.language = newFormData.language;
                store.form.animations_enabled = newFormData.animations_enabled;
                store.form.effects_enabled = newFormData.effects_enabled;

                // 2. Собираем ISO строки
                this.updateStoreFromLocalForm('date_vova_departure');
                this.updateStoreFromLocalForm('date_vova_arrival');
                this.updateStoreFromLocalForm('date_relationship_start');

                // *** НОВОЕ: Синхронизируем "Timers" (глубокое копирование) ***
                // Простое присваивание (store.form.timers = newFormData.timers)
                // НЕ сработает, если this.form - это proxy.
                // Вместо этого, копируем каждое свойство.
                store.form.timers.limit_text_length = newFormData.timers.limit_text_length;
                store.form.timers.timer_completed_message = newFormData.timers.timer_completed_message;
                store.form.timers.arrival_timer_enabled = newFormData.timers.arrival_timer_enabled;
                store.form.timers.arrival_timer_text = newFormData.timers.arrival_timer_text;
                store.form.timers.relationship_timer_enabled = newFormData.timers.relationship_timer_enabled;
                store.form.timers.relationship_timer_text = newFormData.timers.relationship_timer_text;
                store.form.timers.custom_timers = newFormData.timers.custom_timers;
                // 3. Помечаем форму как "грязную"
                store.markDirty();
            }, { deep: true });
        },

        // --- 3. Методы-Хелперы (Внутренние) ---
        loadFormFromStore(sourceForm) {
            if (!sourceForm) {
                 console.warn("--- [DEBUG] loadFormFromStore: sourceForm пуст.");
                 return;
            }
            // "Global" поля
            this.form.language = sourceForm.language;
            this.form.animations_enabled = sourceForm.animations_enabled;
            this.form.effects_enabled = sourceForm.effects_enabled;
            // "Dates" поля
            this.form.date_vova_departure_date = this._getDatePart(sourceForm.date_vova_departure);
            this.form.date_vova_departure_time = this._getTimePart(sourceForm.date_vova_departure);
            this.form.date_vova_arrival_date = this._getDatePart(sourceForm.date_vova_arrival);
            this.form.date_vova_arrival_time = this._getTimePart(sourceForm.date_vova_arrival);
            this.form.date_relationship_start_date = this._getDatePart(sourceForm.date_relationship_start);
            this.form.date_relationship_start_time = this._getTimePart(sourceForm.date_relationship_start);

            // *** НОВОЕ: "Timers" (глубокое копирование) ***
            // Мы должны скопировать объект timers целиком, чтобы x-model="form.timers.X" работал
            if (sourceForm.timers) {
                // Используем JSON-копирование для вложенного объекта 'timers'
                this.form.timers = JSON.parse(JSON.stringify(sourceForm.timers));
            } else {
                 console.warn("--- [DEBUG] loadFormFromStore: sourceForm.timers не найден!");
            }
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
            if (!this.form.timers.custom_timers) return '';
            const timer = this.form.timers.custom_timers.find(t => t.id === timerId);
            return timer ? this._getDatePart(timer.date) : '';
        },
        getCustomTimerTimePart(timerId) {
            if (!this.form.timers.custom_timers) return '00:00:00';
            const timer = this.form.timers.custom_timers.find(t => t.id === timerId);
            return timer ? this._getTimePart(timer.date) : '00:00:00';
        },
        updateCustomTimerDateTime(timerId, part, value) {
            if (!this.form.timers.custom_timers) return;
            const timer = this.form.timers.custom_timers.find(t => t.id === timerId);
            if (!timer) return;

            // Используем _getDatePart и _getTimePart для получения текущих значений
            let currentDate = this._getDatePart(timer.date);
            let currentTime = this._getTimePart(timer.date);

            if (part === 'date') {
                currentDate = value;
            } else if (part === 'time') {
                currentTime = value.length === 5 ? value + ':00' : value;
            }

            // Обновляем ISO строку ПРЯМО В 'this.form'
            // $watch() поймает это изменение и вызовет markDirty()
            timer.date = `${currentDate}T${currentTime}`;
        },
        // --- 4. Методы-Прокси (для кнопок) ---

        /**
         * (ИСПРАВЛЕНО) Сбрасывает поле, ОБНОВЛЯЯ ЛОКАЛЬНЫЙ 'this.form'
         */
        resetField(fieldName) {
            console.log(`--- [DEBUG] settingsForm: Сброс поля ${fieldName}...`);
            const store = Alpine.store('app');
            if (!store.defaults) {
                 console.error("!!! resetField: $store.app.defaults не загружен!");
                 return;
            }

            // 1. Получаем дефолтное значение (может быть вложенным)
            const defaultValue = getDescendantProp(store.defaults, fieldName);
            if (defaultValue === undefined) {
                 console.warn(`!!! resetField: Дефолтное значение для ${fieldName} не найдено.`);
                 return;
            }

            // 2. ОБНОВЛЯЕМ ЛОКАЛЬНЫЙ 'this.form'
            // Нам нужно обновить *все* связанные части (например, date и time для даты)

            if (fieldName.startsWith('date_')) {
                // Это поле даты
                this.form[`${fieldName}_date`] = this._getDatePart(defaultValue);
                this.form[`${fieldName}_time`] = this._getTimePart(defaultValue);
            } else if (fieldName.startsWith('timers.')) {
                // Это поле таймера (timers.limit_text_length)
                const parts = fieldName.split('.'); // ['timers', 'limit_text_length']
                const key = parts[1];
                if (this.form.timers && key) {
                    this.form.timers[key] = JSON.parse(JSON.stringify(defaultValue));
                }
            } else {
                // Это простое поле (language, ...)
                this.form[fieldName] = JSON.parse(JSON.stringify(defaultValue));
            }

            // $watch() поймает это изменение.
            console.log(`--- [DEBUG] settingsForm: Локальное поле ${fieldName} сброшено.`);
        },
        save() {
            Alpine.store('app').saveSettings(Alpine.store('app').form);
        },
        revert() {
             Alpine.store('app').revertSettings();
             // Alpine.effect() поймает это и перезагрузит this.form
        },
        addTimer() {
            console.log("--- [DEBUG] settingsForm: Добавление нового таймера...");
            // Создаем новый таймер с дефолтными значениями
            const newTimer = {
                id: crypto.randomUUID(), // Генерируем UUID на клиенте
                enabled: true,
                label: "Новый таймер",
                date: new Date().toISOString().split('.')[0] // Текущее время (без мс)
            };
            this.form.timers.custom_timers.push(newTimer);
            // $watch() поймает это изменение и вызовет markDirty()
        },
        removeTimer(timerId) {
            console.log(`--- [DEBUG] settingsForm: Удаление таймера ${timerId}...`);
            this.form.timers.custom_timers = this.form.timers.custom_timers.filter(
                t => t.id !== timerId
            );
            // $watch() поймает это изменение и вызовет markDirty()
        }
    }
}
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
        form: null,
        defaults: null,
        ui: {
            currentPage: 'page-main',
            isLoaded: false,
            error: null,
            hoverTargetType: null, // null | 'header-button' | 'arrival' | 'relationship'\
            isDirty: false,
            isSaving: false
        },

        // --- 2. Инициализация (INIT) ---
        // ... (v2.1 init() остается без изменений) ...
        async init() {
            console.log("--- [DEBUG] Store.init(): Старт...");
            try {
                console.log("--- [DEBUG] Store.init(): Запрос config, log и defaults...");

                const [configRes, logRes, defaultsRes] = await Promise.all([
                    fetch('/api/config'),
                    fetch('/api/calendar_log'),
                    fetch('/api/config/defaults') // <-- НОВЫЙ ЗАПРОС
                ]);

                if (!configRes.ok) throw new Error(`Ошибка API /api/config: ${configRes.status}`);
                if (!logRes.ok) throw new Error(`Ошибка API /api/calendar_log: ${logRes.status}`);
                if (!defaultsRes.ok) throw new Error(`API /api/config/defaults: ${defaultsRes.status}`);

                this.config = await configRes.json();
                this.log = await logRes.json();
                this.defaults = await defaultsRes.json();

                console.log("--- [DEBUG] Store.init(): Config, Log, Defaults получены.");

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

                if (this.config) {
                     this.form = Alpine.reactive(JSON.parse(JSON.stringify(this.config)));
                     console.log("--- [DEBUG] Store.init(): Создана копия конфига в this.form.");
                } else {
                    throw new Error("Не удалось создать копию конфига."); }

                if (typeof resetCalendarZoom === 'function') {
                    resetCalendarZoom();
                } else { console.warn("[App.init] resetCalendarZoom не найдена"); }
                if (typeof initCalendarZoom === 'function') {
                    initCalendarZoom();
                } else { console.warn("[App.init] initCalendarZoom не найдена"); }

                if (this.config.is_first_launch) {
                     console.log("--- [DEBUG] ПЕРВЫЙ ЗАПУСК: Показываем модальное окно...");
                     // Используем Alpine.deferLoading = false и nextTick для гарантии
                     Alpine.deferLoading = false;
                     Alpine.nextTick(() => {
                         // Находим Alpine-компонент модального окна по ID
                         const modalElement = document.getElementById('first-launch-modal');
                         if (modalElement && modalElement._x_dataStack) {
                             // Устанавливаем его локальное свойство isVisible в true
                             modalElement._x_dataStack[0].isVisible = true;
                             console.log("--- [DEBUG] Модальное окно первого запуска показано.");
                         } else {
                             console.error("!!! Не удалось найти Alpine-компонент #first-launch-modal");
                         }
                     });

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
        handleFirstLaunchOK() {
            console.log("--- [DEBUG] handleFirstLaunchOK: Переход на страницу настроек.");
            this.navigateTo('page-settings');
            this.markDirty();
            // Важно: Мы НЕ меняем is_first_launch здесь.
            // Флаг должен сброситься только после УСПЕШНОГО СОХРАНЕНИЯ
            // настроек в первый раз (это будет в функции saveSettings).
        },
        markDirty() {
            if (!this.ui.isDirty) {
                console.log("--- [DEBUG] Форма помечена как 'грязная'");
                this.ui.isDirty = true;
                // Добавляем класс к body для показа кнопки Сохранить
                 document.body.classList.add('form-dirty');
            }
        },

        /**
         * (НОВОЕ - Заглушка) Сбрасывает поле к значению по умолчанию.
         * @param {string} fieldName - Имя поля в this.form (e.g., 'language')
         */
        resetField(fieldName) {
        if (!this.defaults || !this.form) {
             console.error("!!! resetField: Defaults или Form не загружены.");
             return;
        }
        console.log(`--- [DEBUG] Сброс поля ${fieldName}...`);

        // Функция для доступа к вложенным свойствам объекта по строке
        const getDescendantProp = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);
        // Функция для установки вложенного свойства
        const setDescendantProp = (obj, path, value) => {
            const parts = path.split('.');
            const last = parts.pop();
            const target = parts.reduce((acc, part) => acc[part] = acc[part] || {}, obj);
            if (target && last) target[last] = value;
        };

        const defaultValue = getDescendantProp(this.defaults, fieldName);

        if (defaultValue !== undefined) {
             // Клонируем дефолтное значение на всякий случай (особенно для объектов/массивов)
             const clonedDefault = JSON.parse(JSON.stringify(defaultValue));
             setDescendantProp(this.form, fieldName, clonedDefault);
             console.log(`--- [DEBUG] Поле ${fieldName} сброшено к`, clonedDefault);
             this.markDirty(); // Помечаем форму как измененную
        } else {
             console.warn(`!!! resetField: Дефолтное значение для ${fieldName} не найдено.`);
            }
        },

        /**
     * (РЕАЛИЗОВАНО) Сохраняет текущие настройки из this.form.
     */
    async saveSettings(formData) {
        if (!formData) {
             console.error("!!! saveSettings: Нет данных формы для сохранения.");
             return false;
        }
        console.log("--- [DEBUG] Попытка сохранения настроек...");

        this.ui.isSaving = true;
        // (Опционально) Можно добавить индикатор загрузки

        try {
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData) // Отправляем данные из this.form
            });

            if (!response.ok) {
                 let errorDetails = "Неизвестная ошибка";
                 try {
                     const errorData = await response.json();
                     errorDetails = JSON.stringify(errorData.details || errorData.error);
                 } catch (e) {
                     errorDetails = await response.text(); // Если ответ не JSON
                 }
                 console.error(`!!! Ошибка сохранения (${response.status}):`, errorDetails);
                 alert(`Ошибка сохранения настроек:\n${errorDetails}`);
                 this.ui.isSaving = false;
                 return false; // Сигнал об ошибке
            }

             console.log("--- [DEBUG] Настройки успешно сохранены.");
             this.config = await response.json();
             this.ui.isDirty = false;
             document.body.classList.remove('form-dirty');
             this.applyDynamicStyles();

            // *** ИЗМЕНЕНО: Добавляем задержку перед перезагрузкой ***
             console.log("--- [DEBUG] Задержка перед перезагрузкой (1 секунда)...");
             setTimeout(() => {
                 console.log("--- [DEBUG] Перезагрузка приложения...");
                 window.location.reload();
             }, 0); // 1000 миллисекунд = 1 секунда
             // *** КОНЕЦ ИЗМЕНЕНИЙ ***
             return true; // Сигнал об успехе (хотя мы уже перезагружаемся)

         } catch (error) {
              console.error("!!! КРИТИЧЕСКАЯ ошибка fetch при сохранении:", error);
              alert(`Критическая ошибка при сохранении: ${error.message}`);
              this.ui.isSaving = false;
              return false;
         } finally {
             // (Опционально) Убрать индикатор загрузки
             }
        },

        /**
         * (НОВОЕ - Заглушка) Отменяет изменения и возвращает форму к this.config.
         */
        revertSettings() {
            console.log("--- [DEBUG] Отмена изменений...");
            // *** ИСПРАВЛЕНО: Явно копируем config обратно в form ***
            if (this.config) {
                this.form = Alpine.reactive(JSON.parse(JSON.stringify(this.config)));
                 console.log("--- [DEBUG] revertSettings: this.form восстановлен из this.config.");
            } else {
                 console.error("!!! revertSettings: Не удалось восстановить форму, т.к. this.config пуст.");
            }
            // *** КОНЕЦ ИСПРАВЛЕНИЙ ***
            this.ui.isDirty = false;
            document.body.classList.remove('form-dirty');
            this.applyDynamicStyles(); // Восстанавливаем стили
        },
         // Конец triggerMonthCompletionEffect

    });
});