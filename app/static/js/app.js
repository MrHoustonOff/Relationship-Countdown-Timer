/**
 * @fileoverview v2.0 - Реактивное ядро приложения на Alpine.js.
 * Управляет глобальным состоянием (config, log, lang, ui),
 * выполняет API-запросы и предоставляет методы для взаимодействия с UI.
 */

document.addEventListener('alpine:init', () => {
    console.log("--- [DEBUG] Alpine.js: Инициализация хранилища...");

    Alpine.store('app', {

        // --- 1. Глобальное Состояние (STATE) ---
        config: null,        // Загрузится из /api/config
        log: null,           // Загрузится из /api/calendar_log
        lang: {},            // Загрузится из /static/lang/*.json
        ui: {
            currentPage: 'page-main', // 'page-main', 'page-calendar', 'page-settings'
            isLoaded: false,          // Флаг завершения начальной загрузки
            isDirty: false,           // Есть ли несохраненные изменения в настройках
            error: null,              // Глобальная ошибка, если что-то пошло не так
        },

        // --- 2. Инициализация (INIT) ---
        /**
         * Запускается ОДИН РАЗ при загрузке <body>.
         * Загружает все необходимые данные с бэкенда.
         */
        async init() {
            console.log("--- [DEBUG] Store.init(): Старт...");
            try {
                // Загружаем параллельно
                const [configRes, logRes] = await Promise.all([
                    fetch('/api/config'),
                    fetch('/api/calendar_log')
                ]);

                if (!configRes.ok) throw new Error(`Ошибка API /api/config: ${configRes.status}`);
                if (!logRes.ok) throw new Error(`Ошибка API /api/calendar_log: ${logRes.status}`);

                this.config = await configRes.json();
                this.log = await logRes.json();

                // Проверка
                if (!this.config || !this.log || !this.config.language) {
                    throw new Error("Загруженная структура config или log некорректна.");
                }

                // Загружаем язык (последовательно, т.к. нужен config.language)
                const langRes = await fetch(`/static/lang/${this.config.language}.json`);
                if (!langRes.ok) throw new Error(`Ошибка загрузки языка: ${this.config.language}.json`);
                this.lang = await langRes.json();

                // Применяем CSS-переменные из конфига
                this.applyDynamicStyles();

                console.log("--- [DEBUG] Store.init(): УСПЕХ. Config, Log, Lang загружены.");
                this.ui.isLoaded = true; // <--- Приложение готово к показу!

                // TODO: Логика первого запуска (покажем модалку, если is_first_launch)
                if (this.config.is_first_launch) {
                     console.log("--- [DEBUG] ПЕРВЫЙ ЗАПУСК. (Логика модалки будет здесь)");
                     // Пока просто переключим на настройки
                     this.ui.currentPage = 'page-settings';
                }

            } catch (error) {
                console.error("--- [DEBUG] КРИТИЧЕСКАЯ ОШИБКА в Store.init():", error);
                this.ui.error = error.message;
            }
        },

        // --- 3. Методы (ACTIONS) ---

        /**
         * Переключает страницу, проверяя 'грязную' форму.
         * @param {string} pageId - 'page-main', 'page-calendar', 'page-settings'
         */
        async navigateTo(pageId) {
            if (this.ui.currentPage === pageId) return; // Уже здесь

            if (this.ui.isDirty) {
                // TODO: Показать модальное окно (пока alert)
                console.warn("--- [DEBUG] ОБНАРУЖЕНЫ НЕСОХРАНЕННЫЕ ИЗМЕНЕНИЯ!");
                const choice = confirm(this.lang['modal_unsaved_title'] + "\n" + this.lang['modal_unsaved_text']); // Временный alert

                if (!choice) {
                     return; // 'Отмена' - остаемся на странице
                }
                // 'OK' - (пока что 'Discard')
                this.ui.isDirty = false;
                // TODO: Вызвать revertSettings()
            }

            this.ui.currentPage = pageId;

            // Сброс зума, если уходим с календаря (и настройка выключена)
             if (pageId !== 'page-calendar' && this.config && !this.config.calendar_save_zoom && typeof resetCalendarZoom === 'function') {
                resetCalendarZoom();
            }
        },

        /**
         * Применяет динамические стили (цвета) из this.config в :root
         */
        applyDynamicStyles() {
            if (!this.config || !this.config.colors) return;
            console.log("--- [DEBUG] Store: Применение CSS-переменных...");
            const root = document.documentElement;
            // 1. Цвета UI
            Object.keys(this.config.colors).forEach(key => {
                const cssVar = `--${key.replace(/_/g, '-')}`;
                root.style.setProperty(cssVar, this.config.colors[key]);
            });
            // 2. Другие параметры
            root.style.setProperty('--calendar-empty-cell-color', this.config.calendar_empty_cell_color);
            root.style.setProperty('--calendar-marked-day-color', this.config.calendar_marked_day_color);
            root.style.setProperty('--sticker-color', this.config.sticker_color);
            root.style.setProperty('--sticker-scale-factor', this.config.sticker_scale);
        },

        /**
         * Переключает отметку в календаре (API + обновление state).
         * @param {string} dateString - "YYYY-MM-DD"
         * @param {HTMLElement} cell - Элемент .day-cell
         */
        async toggleDate(dateString, cell) {
            if (!dateString || !cell) return;
            console.log(`--- [DEBUG] Store.toggleDate: ${dateString}`);

            // Блокируем ячейку на время запроса
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
                    this.log.marked_dates[dateString] = result.entry;
                } else if (result.status === 'removed') {
                    delete this.log.marked_dates[dateString];
                }

                // Эффект частиц (если включен)
                if (this.config.effects_enabled && result.status === 'added') {
                    spawnParticles({
                         originElement: cell,
                         symbol: APP_CONFIG.effect_particle_day || '💖',
                         count: 1, spread: 360, distance: 400, duration: 1200
                    });
                }

            } catch (error) {
                console.error("--- [DEBUG] Ошибка в toggleDate:", error);
                // TODO: Показать юзеру тост "Ошибка!"
            } finally {
                // Разблокируем ячейку
                cell.style.pointerEvents = 'auto';
                cell.style.opacity = '1';
            }
        }

        // --- Сюда позже добавим saveSettings(), revertSettings() и т.д. ---
    });
});