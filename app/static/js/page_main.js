// /mrhoustontimer/app/static/js/page_main.js

/**
 * Инициализирует главную страницу (Таймеры)
 * @param {object} config - Загруженный APP_CONFIG
 */
function initPageMain(config) {
    // ... (код 'arrivalModule', 'relationshipModule', 'customTimersContainer') ...
    const arrivalModule = document.getElementById('timer-arrival-module');
    const relationshipModule = document.getElementById('timer-relationship-module');
    const customTimersContainer = document.getElementById('custom-timers-container');

    // 1. Модуль "До Встречи"
    if (config.timers.arrival_timer_enabled) {
        arrivalModule.style.display = 'flex';
        const titleEl = arrivalModule.querySelector('.timer-module-title');
        const displayEl = arrivalModule.querySelector('.timer-display');
        titleEl.innerText = config.timers.arrival_timer_text;

        // --- ИСПРАВЛЕНИЕ (Твоя Критика 1) ---
        const timer = new Ticker(
            displayEl,
            config.date_vova_arrival,
            'countdown',
            config.timers.timer_completed_message // <-- Берем из config
        );
        timer.start();
    } else {
        arrivalModule.style.display = 'none';
    }

    // 2. Модуль "Мы Вместе"
    if (config.timers.relationship_timer_enabled) {
        relationshipModule.style.display = 'flex';
        const titleEl = relationshipModule.querySelector('.timer-module-title');
        const displayEl = relationshipModule.querySelector('.timer-display');
        titleEl.innerText = config.timers.relationship_timer_text;

        const timer = new Ticker(
            displayEl,
            config.date_relationship_start,
            'elapsed',
            config.timers.timer_completed_message // <-- Передаем
        );
        timer.start();

        customTimersContainer.innerHTML = '';
        for (const customTimer of config.timers.custom_timers) {
            if (customTimer.enabled) {
                createCustomTimerElement(customTimersContainer, customTimer, config); // <-- Передаем config
            }
        }
    } else {
        relationshipModule.style.display = 'none';
    }
}
/**
 * Создает HTML-элемент для одного "кастомного" таймера
 * @param {HTMLElement} container - Куда добавлять
 * @param {object} timerData - Объект таймера из config
 */
function createCustomTimerElement(container, timerData, config) { // <-- Принимаем config
    // ... (код создания entry, label, display) ...
    const entry = document.createElement('div');
    entry.className = 'custom-timer-entry';
    const label = document.createElement('span');
    label.className = 'custom-timer-label';
    label.innerText = timerData.label;
    const display = document.createElement('span');
    display.className = 'custom-timer-display';
    display.id = `timer-${timerData.id}`;
    display.innerText = '--:--:--:--';
    entry.appendChild(label);
    entry.appendChild(display);
    container.appendChild(entry);

    const now = new Date();
    const targetDate = new Date(timerData.date);
    const mode = (targetDate > now) ? 'countdown' : 'elapsed';

    console.log(`--- [DEBUG] createCustomTimer: ...`);

    // --- ИСПРАВЛЕНИЕ (Твоя Критика 1) ---
    const timer = new Ticker(
        display,
        targetDate,
        mode,
        config.timers.timer_completed_message // <-- Берем из config
    );
    timer.start();
}