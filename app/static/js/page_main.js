// /mrhoustontimer/app/static/js/page_main.js

/**
 * Инициализирует главную страницу (Таймеры)
 * @param {object} config - Загруженный APP_CONFIG
 */
function initPageMain(config) {
    const arrivalModule = document.getElementById('timer-arrival-module');
    const relationshipModule = document.getElementById('timer-relationship-module');
    const customTimersContainer = document.getElementById('custom-timers-container');

    // 1. Настройка Модуля "До Встречи"
    if (config.timers.arrival_timer_enabled) {
        arrivalModule.style.display = 'flex'; // Показываем

        const titleEl = arrivalModule.querySelector('.timer-module-title');
        const displayEl = arrivalModule.querySelector('.timer-display');

        titleEl.innerText = config.timers.arrival_timer_text;

        const timer = new Ticker(displayEl, config.date_vova_arrival, 'countdown');
        timer.start();
    } else {
        arrivalModule.style.display = 'none'; // Прячем
    }

    // 2. Настройка Модуля "Мы Вместе"
    if (config.timers.relationship_timer_enabled) {
        relationshipModule.style.display = 'flex'; // Показываем

        const titleEl = relationshipModule.querySelector('.timer-module-title');
        const displayEl = relationshipModule.querySelector('.timer-display');

        titleEl.innerText = config.timers.relationship_timer_text;

        const timer = new Ticker(displayEl, config.date_relationship_start, 'elapsed');
        timer.start();

        // 3. Рендеринг "Дополнительных полей"
        customTimersContainer.innerHTML = ''; // Очищаем (на случай перезагрузки)

        for (const customTimer of config.timers.custom_timers) {
            if (customTimer.enabled) {
                createCustomTimerElement(customTimersContainer, customTimer);
            }
        }

    } else {
        relationshipModule.style.display = 'none'; // Прячем
    }
}

/**
 * Создает HTML-элемент для одного "кастомного" таймера
 * @param {HTMLElement} container - Куда добавлять
 * @param {object} timerData - Объект таймера из config
 */
function createCustomTimerElement(container, timerData) {
    // 1. Создаем обертку
    const entry = document.createElement('div');
    entry.className = 'custom-timer-entry';

    // 2. Создаем заголовок
    const label = document.createElement('span');
    label.className = 'custom-timer-label';
    label.innerText = timerData.label;

    // 3. Создаем дисплей таймера
    const display = document.createElement('span');
    display.className = 'custom-timer-display';
    display.id = `timer-${timerData.id}`; // Уникальный ID
    display.innerText = '--:--:--:--';

    // 4. Собираем и добавляем на страницу
    entry.appendChild(label);
    entry.appendChild(display);
    container.appendChild(entry);

    // 5. Запускаем "Тикер" для этого нового элемента
    const timer = new Ticker(display, timerData.date, 'elapsed');
    timer.start();
}