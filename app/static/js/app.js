// /mrhoustontimer/app/static/js/app.js
/**
 * @fileoverview Главный скрипт приложения Relationship Countdown Timer.
 * Отвечает за инициализацию приложения: загрузку данных (конфиг, лог, язык),
 * применение стилей, настройку навигации, инициализацию страниц (Главная, Календарь, Настройки)
 * и управление глобальным состоянием UI (например, блюр, "грязная" форма).
 */

// --- Глобальные Переменные Состояния ---

/** @type {object | null} Глобальный объект конфигурации (загружается из /api/config). */
let APP_CONFIG = null;
/** @type {object | null} Глобальный лог календаря (загружается из /api/calendar_log). */
let APP_LOG = null;
/** @type {object} Словарь строк для текущего языка (загружается из /static/lang/*.json). */
let LANG_STRINGS = {};
/** @type {boolean} Флаг, указывающий, есть ли несохраненные изменения в форме настроек. */
let isFormDirty = false;

// --- Константы ---
/** @const {string} ID формы настроек */
const SETTINGS_FORM_ID = 'settings-form'; // Используется в page_settings.js

// --- Инициализация Приложения ---

// Запускаем основную логику после полной загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log("--- [DEBUG] DOMContentLoaded: DOM загружен. Запуск loadApp(). ---");
    loadApp();
});

/**
 * Асинхронная функция для инициализации всего приложения.
 * Выполняет шаги:
 * 1. Загрузка конфигурации (`APP_CONFIG`).
 * 2. Загрузка языковых строк (`LANG_STRINGS`) на основе конфига.
 * 3. Перевод статических элементов UI (`translateUI`).
 * 4. Загрузка лога календаря (`APP_LOG`).
 * 5. Применение динамических стилей (`applyDynamicStyles`).
 * 6. Инициализация навигации (`initNavigation`).
 * 7. Инициализация всех страниц (`initPageMain`, `initPageCalendar`, `initPageSettings`).
 * 8. Инициализация зума календаря (`initCalendarZoom`).
 * Обрабатывает критические ошибки во время загрузки.
 */
async function loadApp() {
    console.log("--- [DEBUG] loadApp: Старт инициализации приложения...");
    try {
        // 1. Загрузка Конфига
        console.log("--- [DEBUG] loadApp: Загрузка /api/config...");
        const configResponse = await fetch('/api/config');
        if (!configResponse.ok) {
            throw new Error(`Ошибка загрузки конфига: API /api/config ответил ${configResponse.status}`);
        }
        APP_CONFIG = await configResponse.json();
        console.log("--- [DEBUG] loadApp: /api/config УСПЕХ. Конфиг:", APP_CONFIG);

        // Проверка наличия базовых полей в конфиге
        if (!APP_CONFIG || !APP_CONFIG.language || !APP_CONFIG.colors) {
            throw new Error("Структура загруженного конфига некорректна.");
        }

        // 2. Загрузка Языка
        console.log(`--- [DEBUG] loadApp: Загрузка языка '${APP_CONFIG.language}'...`);
        await fetchLang(APP_CONFIG.language);

        // 3. Перевод UI
        console.log("--- [DEBUG] loadApp: Перевод UI...");
        translateUI(); // Переводим все элементы с data-lang-key

        // 4. Загрузка Лога Календаря
        console.log("--- [DEBUG] loadApp: Загрузка /api/calendar_log...");
        const logResponse = await fetch('/api/calendar_log');
        if (!logResponse.ok) {
            throw new Error(`Ошибка загрузки лога: API /api/calendar_log ответил ${logResponse.status}`);
        }
        APP_LOG = await logResponse.json();
        console.log("--- [DEBUG] loadApp: /api/calendar_log УСПЕХ. Лог:", APP_LOG);
        // Проверка структуры лога
        if (!APP_LOG || typeof APP_LOG.marked_dates === 'undefined') {
             console.warn("--- [DEBUG] Структура загруженного лога некорректна, используется пустой объект.");
             APP_LOG = { marked_dates: {} }; // Fallback
        }

        // 5. Применение Динамических Стилей
        console.log("--- [DEBUG] loadApp: Применение стилей...");
        applyDynamicStyles(APP_CONFIG.colors);

        // 6. Инициализация Навигации
        console.log("--- [DEBUG] loadApp: Инициализация навигации...");
        initNavigation();

        // 7. Инициализация Страниц и Эффектов
        // Вызываем инициализаторы всех страниц, передавая им config и log
        // (Предполагается, что эти функции объявлены в соответствующих page_*.js файлах)
        if (typeof initPageMain === 'function') {
            console.log("--- [DEBUG] loadApp: Вызов initPageMain()... ---");
            initPageMain(APP_CONFIG);
        } else { console.warn("--- [DEBUG] Функция initPageMain не найдена."); }

        if (typeof initPageCalendar === 'function') {
            console.log("--- [DEBUG] loadApp: Вызов initPageCalendar()... ---");
            initPageCalendar(APP_CONFIG, APP_LOG);
        } else { console.warn("--- [DEBUG] Функция initPageCalendar не найдена."); }

        if (typeof initPageSettings === 'function') {
             console.log("--- [DEBUG] loadApp: Вызов initPageSettings()... ---");
             initPageSettings(APP_CONFIG, APP_LOG);
         } else { console.warn("--- [DEBUG] Функция initPageSettings не найдена (ожидается на Этапе 5)."); }

        if (typeof initCalendarZoom === 'function') {
            console.log("--- [DEBUG] loadApp: Вызов initCalendarZoom()... ---");
            initCalendarZoom();
        } else { console.warn("--- [DEBUG] Функция initCalendarZoom не найдена."); }

        // 8. Логика Первого Запуска (УДАЛЕНА)
        // Приложение всегда открывается на 'page-main' по умолчанию
        console.log("--- [DEBUG] loadApp: Приложение по умолчанию открывается на 'page-main'.");

        console.log("--- [DEBUG] loadApp: Инициализация приложения УСПЕШНО ЗАВЕРШЕНА. ---");

    } catch (error) {
        // --- Обработка Критических Ошибок ---
        console.error("--- [DEBUG] КРИТИЧЕСКАЯ ОШИБКА во время loadApp() ---");
        console.error("Ошибка:", error);
        // Отображаем сообщение об ошибке пользователю вместо приложения
        document.body.innerHTML =
            `<div style="color: #FFCDD2; background: #1F1F1F; padding: 2rem; height: 100vh; font-family: monospace;">
                <h1>Критическая ошибка приложения</h1>
                <p>Не удалось загрузить приложение. Пожалуйста, проверьте консоль (F12) для деталей.</p>
                <pre style="color: #EF9A9A; border: 1px solid #E57373; padding: 1rem; margin-top: 1rem; overflow-wrap: break-word; white-space: pre-wrap;">${error.stack || error.message}</pre>
                <p style="margin-top: 1rem;">Возможные причины: Ошибка сети, поврежденные файлы конфигурации (попробуйте удалить папку в AppData).</p>
            </div>`;
    }
}

// --- Функции Утилиты (i18n, Стили, Навигация) ---

/**
 * Асинхронно загружает файл локализации (.json) для указанного языка.
 * Сохраняет результат в глобальную переменную `LANG_STRINGS`.
 * В случае ошибки пытается загрузить 'ru' как запасной вариант.
 * @param {string} [lang='ru'] - Код языка ('ru', 'en').
 */
async function fetchLang(lang = 'ru') {
    const langFilePath = `/static/lang/${lang}.json`;
    console.debug(`--- [DEBUG] fetchLang: Запрос файла ${langFilePath}...`);
    try {
        const response = await fetch(langFilePath);
        if (!response.ok) {
            // Генерируем ошибку, если файл не найден или сервер вернул ошибку
            throw new Error(`HTTP ${response.status} при загрузке ${langFilePath}`);
        }
        LANG_STRINGS = await response.json();
        console.log(`--- [DEBUG] fetchLang: Язык '${lang}' успешно загружен.`);
        // console.log("Строки:", LANG_STRINGS); // Раскомментируй для отладки строк
    } catch (error) {
        console.error(`--- [DEBUG] КРИТИЧЕСКАЯ ОШИБКА fetchLang() для языка '${lang}':`, error);
        LANG_STRINGS = {}; // Сбрасываем строки в случае ошибки
        // Пытаемся загрузить русский язык как fallback, если текущий язык не русский
        if (lang !== 'ru') {
            console.warn("--- [DEBUG] fetchLang: Попытка загрузить русский язык как запасной...");
            await fetchLang('ru');
        }
    }
}

/**
 * Применяет переводы из `LANG_STRINGS` ко всем DOM-элементам с атрибутом `data-lang-key`.
 * Если ключ перевода не найден, выводит ключ в квадратных скобках.
 */
function translateUI() {
    console.debug("--- [DEBUG] translateUI: Начало перевода элементов UI...");
    let translatedCount = 0;
    let missingKeys = [];
    try {
        document.querySelectorAll('[data-lang-key]').forEach(element => {
            const key = element.dataset.langKey;
            const translation = LANG_STRINGS[key];
            if (translation) {
                // Используем innerHTML для поддержки тегов типа <strong>
                element.innerHTML = translation;
                translatedCount++;
            } else {
                // Выводим предупреждение и ключ, если перевод отсутствует
                if (!missingKeys.includes(key)) missingKeys.push(key);
                element.innerHTML = `[${key}]`;
            }
        });
        if (missingKeys.length > 0) {
             console.warn(`--- [DEBUG] translateUI: Не найдены ключи перевода: ${missingKeys.join(', ')}`);
        }
        console.log(`--- [DEBUG] translateUI: Успешно переведено ${translatedCount} элементов.`);
    } catch (error) {
        console.error("--- [DEBUG] ОШИБКА в translateUI():", error);
    }
}

/**
 * Применяет динамические CSS-переменные на основе загруженной конфигурации.
 * Устанавливает переменные для цветов UI, календаря и стикеров.
 * @param {object} colors - Объект `APP_CONFIG.colors`.
 */
function applyDynamicStyles(colors) {
    console.debug("--- [DEBUG] applyDynamicStyles: Применение CSS-переменных...");
    try {
        const root = document.documentElement;
        // 1. Цвета UI из APP_CONFIG.colors
        if (colors && typeof colors === 'object') {
            Object.keys(colors).forEach(key => {
                const cssVar = `--${key.replace(/_/g, '-')}`;
                const cssVal = colors[key];
                if (typeof cssVal === 'string') { // Простая проверка
                    root.style.setProperty(cssVar, cssVal);
                }
            });
        } else {
            console.warn("--- [DEBUG] applyDynamicStyles: Объект colors не найден или некорректен в конфиге.");
        }
        // 2. Другие параметры из APP_CONFIG
        root.style.setProperty('--calendar-empty-cell-color', APP_CONFIG.calendar_empty_cell_color || 'rgba(0,0,0,0.1)');
        root.style.setProperty('--calendar-marked-day-color', APP_CONFIG.calendar_marked_day_color || '#333');
        root.style.setProperty('--sticker-color', APP_CONFIG.sticker_color || '#FFF');
        root.style.setProperty('--sticker-scale-factor', APP_CONFIG.sticker_scale || 1.0);

        console.log("--- [DEBUG] applyDynamicStyles: CSS-переменные применены.");
    } catch (error) {
        console.error("--- [DEBUG] ОШИБКА в applyDynamicStyles():", error);
    }
}

/**
 * Инициализирует навигацию по страницам (клики по кнопкам хедера).
 * Добавляет логику проверки несохраненных изменений (`isFormDirty`) перед переходом.
 */
function initNavigation() {
    console.debug("--- [DEBUG] initNavigation: Настройка обработчиков кликов навигации...");
    try {
        const navContainer = document.querySelector('.app-header nav');
        if (!navContainer) return;

        // Используем делегирование событий на контейнер nav
        navContainer.addEventListener('click', async (event) => {
            const button = event.target.closest('.nav-button'); // Находим нажатую кнопку
            if (!button || button.classList.contains('active')) {
                return; // Клик не по кнопке или по уже активной
            }

            const targetPageId = button.dataset.page;
            console.log(`--- [DEBUG] Клик навигации: переход на '${targetPageId}'`);

            // Проверка "грязной" формы
            if (isFormDirty) {
                console.warn("--- [DEBUG] initNavigation: Обнаружены несохраненные изменения! Показ модального окна.");
                const choice = await showUnsavedChangesModal(); // Показываем модалку

                if (choice === 'save') {
                    console.log("--- [DEBUG] Модалка: Выбрано 'Сохранить'. Эмуляция клика.");
                    // Находим кнопку сохранения и эмулируем клик
                    const saveBtn = document.getElementById('settings-save-btn');
                    if (saveBtn) saveBtn.click();
                    // Переход не нужен, т.к. сохранение вызовет перезагрузку
                    return; // Прерываем переход

                } else if (choice === 'discard') {
                    console.log("--- [DEBUG] Модалка: Выбрано 'Не сохранять'. Сброс формы и переход.");
                    isFormDirty = false; // Сбрасываем флаг
                    // Восстанавливаем форму из текущего APP_CONFIG
                    if (typeof populateForm === 'function') populateForm(APP_CONFIG);
                    showPage(targetPageId); // Переходим на нужную страницу

                } else { // 'cancel'
                    console.log("--- [DEBUG] Модалка: Выбрано 'Отмена'. Переход отменен.");
                    return; // Остаемся на текущей странице
                }
            } else {
                // Форма чистая, просто переходим
                // Сбрасываем зум календаря, если переходим на него и настройка выключена
                if (targetPageId === 'page-calendar' && !APP_CONFIG?.calendar_save_zoom && typeof resetCalendarZoom === 'function') {
                    resetCalendarZoom();
                }
                showPage(targetPageId);
            }
        });
        console.log("--- [DEBUG] initNavigation: Слушатель кликов навигации успешно добавлен.");
    } catch (error) {
        console.error("--- [DEBUG] ОШИБКА в initNavigation():", error);
    }
}

/**
 * Переключает видимость страниц приложения.
 * Скрывает все `.page-content` и кнопки `.nav-button`, затем показывает
 * и активирует элементы, соответствующие `pageIdToShow`.
 * @param {string} pageIdToShow - ID секции (`<section>`), которую нужно показать (e.g., 'page-main').
 */
function showPage(pageIdToShow) {
    // console.debug(`--- [DEBUG] showPage: Переключение на страницу '${pageIdToShow}'`);
    try {
        const pages = document.querySelectorAll('.page-content');
        const navButtons = document.querySelectorAll('.nav-button');

        // Скрываем все страницы и деактивируем все кнопки
        pages.forEach(page => page.classList.remove('active'));
        navButtons.forEach(btn => btn.classList.remove('active'));

        // Находим и показываем нужную страницу
        const pageToShow = document.getElementById(pageIdToShow);
        if (pageToShow) {
            pageToShow.classList.add('active');
        } else {
            console.warn(`--- [DEBUG] showPage: Страница с ID '${pageIdToShow}' не найдена.`);
        }

        // Находим и активируем соответствующую кнопку навигации
        const buttonToActivate = document.querySelector(`.nav-button[data-page="${pageIdToShow}"]`);
        if (buttonToActivate) {
            buttonToActivate.classList.add('active');
        } else {
             console.warn(`--- [DEBUG] showPage: Кнопка навигации для '${pageIdToShow}' не найдена.`);
        }
    } catch (error) {
        console.error(`--- [DEBUG] ОШИБКА в showPage('${pageIdToShow}'):`, error);
    }
}

/**
 * [v2.5] Показывает модальное окно "Несохраненные изменения".
 * Возвращает Promise, который разрешается выбором пользователя ('save', 'discard', 'cancel').
 * @returns {Promise<'save' | 'discard' | 'cancel'>}
 */
function showUnsavedChangesModal() {
    const modal = document.getElementById('unsaved-changes-modal');
    if (!modal) {
        console.error("--- [DEBUG] Модальное окно 'unsaved-changes-modal' не найдено!");
        return Promise.resolve('cancel'); // Возвращаем 'cancel' по умолчанию
    }
    modal.style.display = 'flex';

    // Переводим текст модального окна при показе
    modal.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.dataset.langKey;
        if (LANG_STRINGS[key]) element.innerText = LANG_STRINGS[key];
    });

    // Возвращаем Promise для ожидания выбора пользователя
    return new Promise((resolve) => {
        // Находим кнопки ВНУТРИ модалки
        const saveBtn = modal.querySelector('#modal-btn-save');
        const discardBtn = modal.querySelector('#modal-btn-discard');
        const cancelBtn = modal.querySelector('#modal-btn-cancel');

        // Используем .onclick для простоты (гарантирует только один обработчик)
        if (saveBtn) saveBtn.onclick = () => { modal.style.display = 'none'; resolve('save'); };
        if (discardBtn) discardBtn.onclick = () => { modal.style.display = 'none'; resolve('discard'); };
        if (cancelBtn) cancelBtn.onclick = () => { modal.style.display = 'none'; resolve('cancel'); };

        // Закрытие по клику на фон
        modal.onclick = (e) => {
            if (e.target === modal) { // Клик именно по фону, а не по содержимому
                modal.style.display = 'none';
                resolve('cancel');
            }
        };
    });
}