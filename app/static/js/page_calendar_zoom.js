/**
 * @fileoverview v2.0 - Отделенная утилита для управления зумом календаря.
 * Ждет загрузки DOM, прежде чем запускаться.
 */

const DEFAULT_MIN_WIDTH = 320; // Дефолтная мин. ширина модуля в px
let currentMinModuleWidth = DEFAULT_MIN_WIDTH;

/**
 * Сбрасывает CSS-переменную '--calendar-module-min-width' к дефолтному значению.
 */
function resetCalendarZoom() {
    console.log(`--- [DEBUG] Zoom: Сброс к ${DEFAULT_MIN_WIDTH}px`);
    currentMinModuleWidth = DEFAULT_MIN_WIDTH;
    document.documentElement.style.setProperty(
        '--calendar-module-min-width',
        `${currentMinModuleWidth}px`
    );
}

/**
 * Инициализирует обработчик события 'wheel' (колесо мыши) для зума календаря
 */
function initCalendarZoom() {
    // Находим контейнер и основную область один раз
    const container = document.getElementById('page-calendar');
    const mainArea = document.querySelector('.app-main');

    if (!container || !mainArea) {
        // Эта ошибка теперь не должна появляться
        console.error("--- [DEBUG] initCalendarZoom: Не найден container или mainArea!");
        return;
    }
    console.log("--- [DEBUG] initCalendarZoom: Активация слушателя колеса мыши для зума.");

    mainArea.addEventListener('wheel', (event) => {
        // Проверяем класс 'active' у контейнера.
        if (!container.classList.contains('active') || !event.ctrlKey) {
            return;
        }

        event.preventDefault(); // Предотвращаем стандартный зум страницы

        const zoomStep = 40;
        const minWidth = 240;
        const maxWidth = 800;

        if (event.deltaY < 0) {
            currentMinModuleWidth += zoomStep;
        } else {
            currentMinModuleWidth -= zoomStep;
        }

        currentMinModuleWidth = Math.max(minWidth, Math.min(maxWidth, currentMinModuleWidth));

        document.documentElement.style.setProperty(
            '--calendar-module-min-width',
            `${currentMinModuleWidth}px`
        );

    }, { passive: false });
}

// --- Запускаем Инициализацию Зума ---
// ЖДЕМ, ПОКА DOM БУДЕТ ГОТОВ, ПРЕЖДЕ ЧЕМ ЧТО-ТО ИСКАТЬ
//document.addEventListener('DOMContentLoaded', () => {
//    console.log("--- [DEBUG] Zoom: DOMContentLoaded. Запуск initCalendarZoom...");
//    if (typeof resetCalendarZoom === 'function') {
//        resetCalendarZoom(); // Устанавливаем дефолт
//    }
//    if (typeof initCalendarZoom === 'function') {
//        initCalendarZoom(); // Вешаем слушатель колеса
//    }
//});