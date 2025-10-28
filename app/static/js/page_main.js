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
/* [v2.3 - НОВАЯ ВЕРСТКА] Создает HTML-элемент для одного кастомного таймера
 * @param {HTMLElement} container - Куда добавлять (#custom-timers-container)
 * @param {object} timerData - Объект таймера из config
 * @param {object} config - Полный APP_CONFIG для доступа к цветам
 */
function createCustomTimerElement(container, timerData, config) {
    // 1. Создаем ОБЕРТКУ-МОДУЛЬ (Новое!)
    const module = document.createElement('div');
    module.className = 'custom-timer-module'; // Новый класс

    // 2. Создаем заголовок
    const label = document.createElement('h3'); // Используем h3 для семантики
    label.className = 'custom-timer-label';
    label.innerText = timerData.label;
    label.title = timerData.label; // Всплывающая подсказка, если текст обрезан

    // 3. Создаем дисплей таймера
    const display = document.createElement('div'); // Используем div
    display.className = 'custom-timer-display';
    display.id = `timer-${timerData.id}`; // Уникальный ID
    display.innerText = '--:--:--:--';

    // 4. Собираем модуль
    module.appendChild(label);
    module.appendChild(display);

    // 5. Добавляем модуль в главный контейнер
    container.appendChild(module);

    // --- 6. Определяем режим и ЦВЕТ (Твоя Критика 3) ---
    const now = new Date();
    const targetDate = new Date(timerData.date);
    const mode = (targetDate > now) ? 'countdown' : 'elapsed';

    // Применяем цвет цифр ИЗ КОНФИГА
    if (mode === 'countdown') {
        display.style.color = config.colors.color_timer_countdown;
    } else {
        display.style.color = config.colors.color_timer_elapsed;
    }
    // ---

    console.log(`--- [DEBUG] createCustomTimer (v2.3): Таймер '${timerData.label}' | Режим: ${mode}`);

    // 7. Запускаем "Тикер"
    const timer = new Ticker(
        display,
        targetDate,
        mode,
        config.timers.timer_completed_message
    );
    timer.start();
    initMainPageHovers();
}

function initMainPageHovers() {
    console.log("--- [DEBUG] initMainPageHovers (v3.1): Активируем hover с условной анимацией...");
    const body = document.body;
    const arrivalTimer = document.getElementById('timer-arrival-module');
    const relationshipTimer = document.getElementById('timer-relationship-module');
    const customTimersContainer = document.getElementById('custom-timers-container');

    const animationsEnabled = APP_CONFIG.animations_enabled; // Читаем настройку
    console.log("--- [DEBUG] Анимации включены:", animationsEnabled);

    let blurTimeoutId = null;

    // --- Функция для Блюра (без изменений) ---
    const setBlurEffect = (isActive, hoveredElement = null) => { /* ... (код из v3.0) ... */ };

    // --- Функция УПРАВЛЕНИЯ АНИМАЦИЕЙ ---
    const applyAnimation = (element, animationName, isActive) => {
        if (!element) return;
        if (animationsEnabled && isActive) {
            element.style.animation = animationName;
        } else {
            element.style.animation = 'none'; // Убираем анимацию
        }
    };

    // --- Слушатели ---

    // 1. Hover на Основные Таймеры
    [arrivalTimer, relationshipTimer].forEach(timerModule => {
        if (timerModule) {
            timerModule.addEventListener('mouseenter', () => {
                setBlurEffect(true, timerModule);
                applyAnimation(timerModule, 'heartbeat 1s infinite ease-in-out', true); // Применяем, если можно
            });
            timerModule.addEventListener('mouseleave', (event) => {
                applyAnimation(timerModule, '', false); // Убираем анимацию
                const related = event.relatedTarget;
                if (!related || !related.closest || !(related.closest('.timer-module') || related.closest('.custom-timer-module'))) {
                    setBlurEffect(false);
                }
            });
        }
    });

    // 2. Hover на Кастомные Таймеры (Делегирование)
    if (customTimersContainer) {
        customTimersContainer.addEventListener('mouseenter', (event) => {
            const customModule = event.target.closest('.custom-timer-module');
            if (customModule) {
                setBlurEffect(true, relationshipTimer || customModule);
                applyAnimation(relationshipTimer, 'heartbeat 1s infinite ease-in-out', true); // Анимируем основной
            }
        }, true);

        customTimersContainer.addEventListener('mouseleave', (event) => {
            const customModule = event.target.closest('.custom-timer-module');
            if (customModule) {
                 const related = event.relatedTarget;
                 const isLeavingToInteractive = related && related.closest && (related.closest('.timer-module') || related.closest('.custom-timer-module'));

                 if (!isLeavingToInteractive) {
                     setBlurEffect(false);
                     applyAnimation(relationshipTimer, '', false); // Убираем анимацию с основного
                 } else {
                     // Если перешли на основной, его mouseenter сам включит анимацию
                     // Если перешли на другой кастомный, свечение основного остается включенным
                 }
            }
        }, true);
    }
    console.log("--- [DEBUG] initMainPageHovers: Hover эффекты настроены.");
}