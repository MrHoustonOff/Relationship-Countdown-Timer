// /mrhoustontimer/app/static/js/app.js (v2.3)
console.log("--- [DEBUG] app.js: Файл загружен и выполняется. ---");

let APP_CONFIG = {};
let APP_LOG = {};
let LANG_STRINGS = {}; // <-- НОВОЕ: Хранилище строк языка

// --- 1. Главная Точка Входа ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("--- [DEBUG] DOMContentLoaded: DOM загружен. Запускаем loadApp(). ---");
    loadApp();
});

/**
 * [v2.3] Главная функция загрузки
 */
async function loadApp() {
    console.log("--- [DEBUG] loadApp: Старт. ---");
    try {
        console.log("--- [DEBUG] loadApp: Отправляем fetch для /api/config... ---");
        // 1. Сначала грузим ТОЛЬКО конфиг. Язык нужен немедленно.
        const configResponse = await fetch('/api/config');
        if (!configResponse.ok) throw new Error(`API /api/config ответил ошибкой: ${configResponse.status}`);
        APP_CONFIG = await configResponse.json();
        console.log("--- [DEBUG] loadApp: /api/config УСПЕХ. Конфиг загружен:", APP_CONFIG);

        // 2. ГРУЗИМ ЯЗЫК (НОВОЕ)
        console.log(`--- [DEBUG] loadApp: Вызываем fetchLang('${APP_CONFIG.language}')... ---`);
        await fetchLang(APP_CONFIG.language);

        // 3. ПЕРЕВОДИМ UI (НОВОЕ)
        console.log("--- [DEBUG] loadApp: Вызываем translateUI()... ---");
        translateUI();

        // 4. Грузим лог календаря
        console.log("--- [DEBUG] loadApp: Отправляем fetch для /api/calendar_log... ---");
        const logResponse = await fetch('/api/calendar_log');
        if (!logResponse.ok) throw new Error(`API /api/calendar_log ответил ошибкой: ${logResponse.status}`);
        APP_LOG = await logResponse.json();
        console.log("--- [DEBUG] loadApp: /api/calendar_log УСПЕХ. Лог загружен:", APP_LOG);

        // 5. Применяем стили
        console.log("--- [DEBUG] loadApp: Вызываем applyDynamicStyles()... ---");
        applyDynamicStyles(APP_CONFIG.colors);

        // 6. Настраиваем навигацию
        console.log("--- [DEBUG] loadApp: Вызываем initNavigation()... ---");
        initNavigation();

        // 7. Проверяем "Первый запуск"
        if (APP_CONFIG.is_first_launch) {
            console.warn("--- [DEBUG] ПЕРВЫЙ ЗАПУСК. Показываем настройки. (Пока переключим на главную) ---");
            // showPage('page-settings'); // <-- Будет на Этапе 5
            console.log("--- [DEBUG] loadApp: Вызываем initPageMain() для 'первого запуска'... ---");
            initPageMain(APP_CONFIG);
        } else {
            console.log("--- [DEBUG] loadApp: 'is_first_launch' = false. Вызываем initPageMain()... ---");
            initPageMain(APP_CONFIG);
        }

        // 8. Инициализируем остальные страницы
        console.log("--- [DEBUG] loadApp: Вызываем initPageCalendar()... ---");
        initPageCalendar(APP_CONFIG, APP_LOG); // <-- Использует LANG_STRINGS
        // initPageSettings(APP_CONFIG, APP_LOG);

        // Инициализируем "слушатель" зума ОДИН РАЗ
        console.log("--- [DEBUG] loadApp: Вызываем initCalendarZoom()... ---");
        initCalendarZoom();


        console.log("--- [DEBUG] loadApp: Приложение загружено УСПЕШНО. ---");

    } catch (error) {
        console.error("--- [DEBUG] КРИТИЧЕСКАЯ ОШИБКА ВНУТРИ loadApp() ---", error);
        document.body.innerHTML =
            `<div style="color: red; padding: 20px;"><h1>Ошибка JS</h1><pre>${error.stack}</pre></div>`;
    }
}

// --- НОВЫЕ ФУНКЦИИ i18n ---

/**
 * [НОВОЕ] Загружает .json файл с языком
 * @param {string} lang - 'ru' или 'en'
 */
async function fetchLang(lang = 'ru') {
    try {
        const response = await fetch(`/static/lang/${lang}.json`);
        if (!response.ok) throw new Error(`Не найден файл языка: ${lang}.json`);
        LANG_STRINGS = await response.json();
        console.log(`--- [DEBUG] fetchLang: Язык '${lang}' загружен.`, LANG_STRINGS);
    } catch (e) {
        console.error("--- [DEBUG] КРИТИЧЕСКАЯ ОШИБКА fetchLang() ---", e);
        // Пытаемся загрузить 'ru' как запасной
        if (lang !== 'ru') {
            await fetchLang('ru');
        }
    }
}

/**
 * [НОВОЕ] Пробегается по DOM и переводит все элементы с [data-lang-key]
 */
function translateUI() {
    try {
        document.querySelectorAll('[data-lang-key]').forEach(element => {
            const key = element.dataset.langKey;
            if (LANG_STRINGS[key]) {
                element.innerText = LANG_STRINGS[key];
            } else {
                console.warn(`--- [DEBUG] translateUI: Не найден ключ '${key}' в LANG_STRINGS.`);
                element.innerText = `[${key}]`; // Показываем ключ, если нет перевода
            }
        });
        console.log("--- [DEBUG] translateUI: УСПЕХ. UI переведен. ---");
    } catch (e) {
        console.error("--- [DEBUG] ОШИБКА в translateUI() ---", e);
    }
}
// ---

// ... (applyDynamicStyles, initNavigation, showPage - без изменений) ...
function applyDynamicStyles(colors) { // Принимает APP_CONFIG.colors
    try {
        const root = document.documentElement;
        // 1. Цвета UI из APP_CONFIG.colors
        Object.keys(colors).forEach(key => {
            const cssVar = `--${key.replace(/_/g, '-')}`;
            const cssVal = colors[key];
            root.style.setProperty(cssVar, cssVal);
        });
        // 2. Параметры Календаря НЕ из APP_CONFIG.colors
        root.style.setProperty('--calendar-empty-cell-color', APP_CONFIG.calendar_empty_cell_color);
        root.style.setProperty('--calendar-marked-day-color', APP_CONFIG.calendar_marked_day_color);
        // --- НОВЫЕ СТРОКИ ---
        root.style.setProperty('--sticker-color', APP_CONFIG.sticker_color);
        root.style.setProperty('--sticker-scale-factor', APP_CONFIG.sticker_scale);
        // ---

        console.log("--- [DEBUG] applyDynamicStyles: УСПЕХ. Стили применены. ---");
    } catch (e) {
        console.error("--- [DEBUG] ОШИБКА в applyDynamicStyles() ---", e);
    }
}
function initNavigation() {
    try {
        const navButtons = document.querySelectorAll('.nav-button');
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetPageId = button.dataset.page;

                if (targetPageId === 'page-calendar' && !APP_CONFIG.calendar_save_zoom) {
                    resetCalendarZoom();
                }

                showPage(targetPageId);
            });
        });
        console.log("--- [DEBUG] initNavigation: УСПЕХ. Навигация настроена. ---");
    } catch (e) {
        console.error("--- [DEBUG] ОШИБКА в initNavigation() ---", e);
    }
}
function showPage(pageIdToShow) {
    try {
        const navButtons = document.querySelectorAll('.nav-button');
        const pages = document.querySelectorAll('.page-content');
        pages.forEach(page => page.classList.remove('active'));
        navButtons.forEach(btn => btn.classList.remove('active'));
        const pageToShow = document.getElementById(pageIdToShow);
        const buttonToActivate = document.querySelector(`.nav-button[data-page="${pageIdToShow}"]`);
        if (pageToShow) pageToShow.classList.add('active');
        if (buttonToActivate) buttonToActivate.classList.add('active');
    } catch (e) {
        console.error("--- [DEBUG] ОШИБКА в showPage() ---", e);
    }
}