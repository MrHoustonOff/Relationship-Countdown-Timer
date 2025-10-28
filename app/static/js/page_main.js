// /mrhoustontimer/app/static/js/page_main.js (РЕФАКТОРИНГ v3.1)

/**
 * @fileoverview Логика инициализации и управления элементами Главной страницы (Таймеры).
 */

/**
 * Инициализирует главную страницу, создает и запускает таймеры.
 * @param {object} config - Глобальный объект конфигурации APP_CONFIG.
 */
function initPageMain(config) {
    console.log("--- [DEBUG] initPageMain: Инициализация главной страницы...");
    const arrivalModule = document.getElementById('timer-arrival-module');
    const relationshipModule = document.getElementById('timer-relationship-module');
    const customTimersContainer = document.getElementById('custom-timers-container');

    // --- 1. Таймер "До Встречи" ---
    const arrivalDisplayEl = arrivalModule ? arrivalModule.querySelector('.timer-display') : null;
    const arrivalDisplayId = arrivalDisplayEl ? arrivalDisplayEl.id : '';

    if (config.timers.arrival_timer_enabled && arrivalModule && arrivalDisplayEl) {
        arrivalModule.style.display = 'flex';
        const titleEl = arrivalModule.querySelector('.timer-module-title');
        if (titleEl) titleEl.innerText = config.timers.arrival_timer_text;

        // Создаем Ticker с ID
        const arrivalTimer = new Ticker(
            arrivalDisplayEl,
            config.date_vova_arrival,
            'countdown',
            config.timers.timer_completed_message,
            arrivalDisplayId // Передаем ID
        );
        arrivalTimer.start();
    } else if (arrivalModule) {
        arrivalModule.style.display = 'none';
    }

    // --- 2. Таймер "Мы Вместе" и Кастомные ---
    const relationshipDisplayEl = relationshipModule ? relationshipModule.querySelector('.timer-display') : null;
    const relationshipDisplayId = relationshipDisplayEl ? relationshipDisplayEl.id : '';

    if (config.timers.relationship_timer_enabled && relationshipModule && relationshipDisplayEl) {
        relationshipModule.style.display = 'flex';
        const titleEl = relationshipModule.querySelector('.timer-module-title');
        if (titleEl) titleEl.innerText = config.timers.relationship_timer_text;

        // Создаем Ticker с ID
        const relationshipTimer = new Ticker(
            relationshipDisplayEl,
            config.date_relationship_start,
            'elapsed',
            config.timers.timer_completed_message,
            relationshipDisplayId // Передаем ID
        );
        relationshipTimer.start();

        // Рендерим кастомные таймеры
        if (customTimersContainer) {
             customTimersContainer.innerHTML = ''; // Очищаем
             (config.timers.custom_timers || []).forEach(customTimer => {
                 if (customTimer.enabled) {
                     createCustomTimerElement(customTimersContainer, customTimer, config);
                 }
             });
        }
    } else if (relationshipModule) {
        relationshipModule.style.display = 'none';
    }

    // Инициализируем Hover-эффекты ПОСЛЕ создания всех элементов
    initMainPageHovers();
    console.log("--- [DEBUG] initPageMain: Инициализация завершена.");
}

/**
 * [v3.1] Создает HTML-элемент и запускает Ticker для одного кастомного таймера.
 * @param {HTMLElement | null} container - Контейнер для добавления элемента.
 * @param {object} timerData - Данные таймера из config.timers.custom_timers.
 * @param {object} config - Глобальный APP_CONFIG.
 */
function createCustomTimerElement(container, timerData, config) {
    if (!container || !timerData) return;

    const module = document.createElement('div');
    module.className = 'custom-timer-module';

    const label = document.createElement('h3');
    label.className = 'custom-timer-label';
    label.innerText = timerData.label;
    label.title = timerData.label;

    const display = document.createElement('div');
    display.className = 'custom-timer-display';
    const displayId = `timer-${timerData.id}`; // Генерируем ID
    display.id = displayId;
    // display.innerText = '--:--:--:--'; // Ticker сам инициализирует

    module.appendChild(label);
    module.appendChild(display);
    container.appendChild(module);

    const now = new Date();
    const targetDate = new Date(timerData.date);
    const mode = (targetDate > now) ? 'countdown' : 'elapsed';

    // Устанавливаем цвет цифр
    if (mode === 'countdown') display.style.color = config.colors.color_timer_countdown;
    else display.style.color = config.colors.color_timer_elapsed;

    // console.debug(`--- [DEBUG] createCustomTimer: Timer '${timerData.label}' | Mode: ${mode}`);

    // Создаем Ticker с ID
    const timer = new Ticker(
        display,
        targetDate,
        mode,
        config.timers.timer_completed_message,
        displayId // Передаем ID
    );
    timer.start();
}


/**
 * [v3.1 - Условная Анимация] Инициализирует Hover эффекты (пульс + блюр).
 */
function initMainPageHovers() {
    console.log("--- [DEBUG] initMainPageHovers (v3.1): Активируем hover с условной анимацией...");
    const body = document.body;
    const arrivalTimer = document.getElementById('timer-arrival-module');
    const relationshipTimer = document.getElementById('timer-relationship-module');
    const customTimersContainer = document.getElementById('custom-timers-container');

    // Проверяем настройку анимаций один раз
    const animationsEnabled = APP_CONFIG?.animations_enabled ?? true; // Используем optional chaining и дефолт
    console.log("--- [DEBUG] Анимации включены:", animationsEnabled);

    let blurTimeoutId = null;

    // --- Функция для Блюра ---
    const setBlurEffect = (isActive, hoveredElement = null) => {
        clearTimeout(blurTimeoutId);
        document.querySelectorAll('#page-main .timer-module, #page-main .custom-timer-module').forEach(el => {
            el.classList.remove('hover-active');
        });
        if (isActive && hoveredElement) {
            hoveredElement.classList.add('hover-active');
            if (!body.classList.contains('blur-effect-active')) {
                body.classList.add('blur-effect-active');
                // console.log("--- [DEBUG] BLUR: Activated by", hoveredElement.id || hoveredElement.tagName);
            }
        } else {
            blurTimeoutId = setTimeout(() => {
                if (!document.querySelector('#page-main .hover-active')) {
                    if (body.classList.contains('blur-effect-active')) {
                        body.classList.remove('blur-effect-active');
                        // console.log("--- [DEBUG] BLUR: Deactivated");
                    }
                }
            }, 50);
        }
    };

    // --- Функция УПРАВЛЕНИЯ АНИМАЦИЕЙ ---
    const applyAnimation = (element, animationName, isActive) => {
        if (!element) return;
        // Применяем анимацию только если она включена в настройках
        if (animationsEnabled && isActive) {
            element.style.animation = animationName;
        } else {
            element.style.animation = 'none';
        }
    };

    // --- Слушатели ---
    // 1. Hover на Основные Таймеры
    [arrivalTimer, relationshipTimer].forEach(timerModule => {
        if (timerModule) {
            timerModule.addEventListener('mouseenter', () => {
                setBlurEffect(true, timerModule);
                // Применяем анимацию пульса, если включено
                applyAnimation(timerModule, 'heartbeat 1s infinite ease-in-out', true);
            });
            timerModule.addEventListener('mouseleave', (event) => {
                // Всегда убираем анимацию при уходе
                applyAnimation(timerModule, '', false);
                const related = event.relatedTarget;
                if (!related || !related.closest || !(related.closest('.timer-module') || related.closest('.custom-timer-module'))) {
                    setBlurEffect(false); // Убираем блюр, если ушли совсем
                }
            });
        }
    });

    // 2. Hover на Кастомные Таймеры
    if (customTimersContainer) {
        customTimersContainer.addEventListener('mouseenter', (event) => {
            const customModule = event.target.closest('.custom-timer-module');
            if (customModule) {
                setBlurEffect(true, relationshipTimer || customModule); // Помечаем основной для блюра
                // Анимируем основной таймер (если включено)
                applyAnimation(relationshipTimer, 'heartbeat 1s infinite ease-in-out', true);
            }
        }, true);
        customTimersContainer.addEventListener('mouseleave', (event) => {
            const customModule = event.target.closest('.custom-timer-module');
            if (customModule) {
                 const related = event.relatedTarget;
                 const isLeavingToInteractive = related && related.closest && (related.closest('.timer-module') || related.closest('.custom-timer-module'));
                 if (!isLeavingToInteractive) {
                     setBlurEffect(false); // Убираем блюр
                     // Убираем анимацию с основного
                     applyAnimation(relationshipTimer, '', false);
                 }
                 // Если перешли на основной, его mouseenter сам включит анимацию
            }
        }, true);
    }
    console.log("--- [DEBUG] initMainPageHovers: Hover эффекты настроены.");
}