// /mrhoustontimer/app/static/js/app.js (DEBUG EDITION v2.0)
console.log("--- [DEBUG] app.js: Файл загружен и выполняется. ---");

// Глобальные "хранилища"
let APP_CONFIG = {};
let APP_LOG = {};

// --- 1. Главная Точка Входа ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("--- [DEBUG] DOMContentLoaded: DOM загружен. Запускаем loadApp(). ---");
    loadApp();
});

/**
 * Главная асинхронная функция загрузки приложения
 */
async function loadApp() {
    console.log("--- [DEBUG] loadApp: Старт. ---");
    try {
        // --- ИЗМЕНЕНИЕ: Используем Promise.allSettled для лучшей отладки ---
        console.log("--- [DEBUG] loadApp: Отправляем parallel fetch (allSettled) для /api/config и /api/calendar_log... ---");

        const results = await Promise.allSettled([
            fetch('/api/config'),
            fetch('/api/calendar_log')
        ]);

        // --- [DEBUG] Проверяем результаты ---
        const configResult = results[0];
        const logResult = results[1];

        // 1. Проверка Конфига
        if (configResult.status === 'fulfilled') {
            if (!configResult.value.ok) throw new Error(`API /api/config ответил ошибкой: ${configResult.value.status}`);
            APP_CONFIG = await configResult.value.json();
            console.log("--- [DEBUG] loadApp: /api/config УСПЕХ. Конфиг загружен:", APP_CONFIG);
        } else {
            console.error("--- [DEBUG] loadApp: /api/config КРИТИЧЕСКАЯ ОШИБКА. Запрос упал.", configResult.reason);
            throw configResult.reason;
        }

        // 2. Проверка Лога
        if (logResult.status === 'fulfilled') {
            if (!logResult.value.ok) throw new Error(`API /api/calendar_log ответил ошибкой: ${logResult.value.status}`);
            APP_LOG = await logResult.value.json();
            console.log("--- [DEBUG] loadApp: /api/calendar_log УСПЕХ. Лог загружен:", APP_LOG);
        } else {
            console.error("--- [DEBUG] loadApp: /api/calendar_log КРИТИЧЕСКАЯ ОШИБКА. Запрос упал.", logResult.reason);
            throw logResult.reason;
        }
        // --- Конец ИЗМЕНЕНИЯ ---

        // 3. Применяем динамические стили
        console.log("--- [DEBUG] loadApp: Вызываем applyDynamicStyles()... ---");
        applyDynamicStyles(APP_CONFIG.colors);

        // 4. Настраиваем навигацию
        console.log("--- [DEBUG] loadApp: Вызываем initNavigation()... ---");
        initNavigation();

        // 5. Проверяем "Первый запуск"
        if (APP_CONFIG.is_first_launch) {
            console.warn("--- [DEBUG] ПЕРВЫЙ ЗАПУСК. Показываем настройки. (Пока переключим на главную) ---");
            // showPage('page-settings'); // <-- Будет на Этапе 5
            console.log("--- [DEBUG] loadApp: Вызываем initPageMain() для 'первого запуска'... ---");
            initPageMain(APP_CONFIG);
        } else {
            console.log("--- [DEBUG] loadApp: 'is_first_launch' = false. Вызываем initPageMain()... ---");
            initPageMain(APP_CONFIG);
        }

        // 6. Инициализируем остальные страницы (пока пустые)
        initPageCalendar(APP_CONFIG, APP_LOG); // <-- Будет на Этапе 3
        // initPageSettings(APP_CONFIG, APP_LOG); // <-- Будет на Этапе 5

        console.log("--- [DEBUG] loadApp: Приложение загружено УСПЕШНО. ---");

    } catch (error) {
        // --- [DEBUG] ЭТО САМОЕ ВАЖНОЕ: БЛОК ПЕРЕХВАТА ОШИБОК ---
        console.error("--- [DEBUG] КРИТИЧЕСКАЯ ОШИБКА ВНУТРИ loadApp() ---");
        console.error(error); // Выводим саму ошибку
        document.body.innerHTML =
            `<div style="color: red; padding: 20px; font-family: monospace; background: #222; height: 100vh;">
                <h1>Критическая ошибка JS</h1>
                <p>Не удалось загрузить приложение. Открой консоль (F12) и посмотри ошибку.</p>
                <pre style="color: #ffb3b3; border: 1px solid red; padding: 10px; margin-top: 10px; overflow-wrap: break-word;">${error.stack}</pre>
            </div>`;
    }
}

// --- 2. Модули Инициализации (Без изменений, но с логами) ---

function applyDynamicStyles(colors) {
    try {
        const root = document.documentElement;
        Object.keys(colors).forEach(key => {
            const cssVar = `--${key.replace(/_/g, '-')}`;
            const cssVal = colors[key];
            root.style.setProperty(cssVar, cssVal);
        });
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
        // console.log(`--- [DEBUG] showPage: Переключено на ${pageIdToShow} ---`); // Раскомментируй, если нужно
    } catch (e) {
        console.error("--- [DEBUG] ОШИБКА в showPage() ---", e);
    }
}