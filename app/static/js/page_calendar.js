// /mrhoustontimer/app/static/js/page_calendar.js
/**
 * @fileoverview Логика для рендеринга, взаимодействия и эффектов страницы Календаря.
 * Включает создание сетки месяцев, обработку кликов по дням,
 * обновление UI, проверку завершенности месяца и управление зумом.
 */

// --- Вспомогательные Функции для Дат ---

/**
 * Парсит строку даты "YYYY-MM-DD" и возвращает объект Date в UTC.
 * Используется для избежания проблем с часовыми поясами при сравнении дат.
 * @param {string} dateString - Строка даты в формате "YYYY-MM-DD".
 * @returns {Date} Объект Date, представляющий начало дня (00:00:00) в UTC.
 */
function parseDateAsUTC(dateString) {
    // Разделяем строку на [год, месяц, день] и преобразуем в числа
    const parts = dateString.split('-').map(Number);
    // Date.UTC ожидает месяц 0-11, поэтому вычитаем 1
    // Возвращает миллисекунды с эпохи UTC, создаем из них объект Date
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

/**
 * Устанавливает время объекта Date на 00:00:00 UTC.
 * Модифицирует переданный объект Date.
 * @param {Date} date - Объект Date для модификации.
 * @returns {Date} Тот же объект Date с обнуленным временем.
 */
function zeroTime(date) {
    if (date instanceof Date && !isNaN(date)) {
        date.setUTCHours(0, 0, 0, 0);
    }
    return date;
}

// --- Инициализация Страницы Календаря ---

/**
 * Главная функция инициализации страницы "Календарик".
 * Очищает контейнер, рассчитывает диапазон дат, рендерит сетку месяцев
 * и активирует обработчики событий (клики, зум).
 * @param {object} config - Глобальный объект конфигурации APP_CONFIG.
 * @param {object} log - Глобальный объект лога календаря APP_LOG.
 */
function initPageCalendar(config, log) {
    console.log("--- [DEBUG] initPageCalendar: Старт инициализации...");
    try {
        const container = document.getElementById('page-calendar');
        if (!container) {
            console.error("--- [DEBUG] initPageCalendar: Критическая ошибка - контейнер #page-calendar не найден!");
            return;
        }
        container.innerHTML = ''; // Очищаем предыдущее содержимое

        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        // Определяем диапазон дат для отображения
        const departureDateStr = config.date_vova_departure.split('T')[0];
        const arrivalDateStr = config.date_vova_arrival.split('T')[0];

        const departureDateUTC = parseDateAsUTC(departureDateStr);
        const arrivalDateUTC = parseDateAsUTC(arrivalDateStr);

        // Календарь начинается со *следующего* дня после отъезда
        departureDateUTC.setUTCDate(departureDateUTC.getUTCDate() + 1);

        const globalStartDate = zeroTime(new Date(departureDateUTC)); // Работаем с копиями
        const globalEndDate = zeroTime(new Date(arrivalDateUTC));

        console.log(`--- [DEBUG] initPageCalendar: Рассчитанный диапазон UTC: ${globalStartDate.toISOString()} до ${globalEndDate.toISOString()}`);

        // Проверка валидности диапазона
        if (globalStartDate > globalEndDate) {
            console.warn("--- [DEBUG] initPageCalendar: ОШИБКА ДИАПАЗОНА Дат (Начало > Конец). Рендер календаря отменен.");
            displayCalendarErrorMessage(container); // Показываем сообщение об ошибке
            return; // Прерываем выполнение
        }

        // Рендерим модули для каждого месяца в диапазоне
        let currentDate = new Date(globalStartDate);
        while (currentDate <= globalEndDate) {
            const currentYear = currentDate.getUTCFullYear();
            const currentMonth = currentDate.getUTCMonth(); // 0-11

            console.debug(`--- [DEBUG] initPageCalendar: Рендеринг месяца ${currentYear}-${currentMonth + 1}`);
            const monthModule = createMonthModule(currentYear, currentMonth, globalStartDate, globalEndDate, config, log);
            if (monthModule) { // Проверяем, что модуль создан
                 grid.appendChild(monthModule);
            }

            // Переходим к следующему месяцу
            currentDate.setUTCMonth(currentMonth + 1);
            currentDate.setUTCDate(1); // Устанавливаем на первое число
        }

        container.appendChild(grid); // Добавляем сетку в контейнер

        // Инициализируем обработчики событий
        initCalendarInteraction(container, config); // Обработка кликов
        // initCalendarZoom(container); // Инициализация зума вызывается в app.js

        console.log("--- [DEBUG] initPageCalendar: УСПЕХ. Календарь отрисован и интерактивность включена.");

    } catch (error) {
        console.error("--- [DEBUG] КРИТИЧЕСКАЯ ОШИБКА в initPageCalendar():", error);
        // Можно отобразить сообщение об ошибке пользователю
        const container = document.getElementById('page-calendar');
        if(container) container.innerHTML = `<h2 style='color: red;'>Ошибка рендеринга календаря!</h2><pre>${error.stack}</pre>`;
    }
}

/**
 * Отображает сообщение об ошибке неверного диапазона дат в календаре.
 * @param {HTMLElement} container - DOM-элемент контейнера календаря (#page-calendar).
 */
function displayCalendarErrorMessage(container) {
    const upsMessage = document.createElement('div');
    upsMessage.className = 'calendar-empty-message';
    // Используем строки из LANG_STRINGS для текста
    upsMessage.innerHTML = `
        <h2>${LANG_STRINGS.calendar_empty_title || 'Ошибка!'}</h2>
        <p>${LANG_STRINGS.calendar_empty_p1 || 'Неверный диапазон дат.'}</p>
        <p>${LANG_STRINGS.calendar_empty_p2 || 'Проверьте даты отъезда и приезда в настройках.'}</p>
        <p>${LANG_STRINGS.calendar_empty_p3 || ''}</p>
    `;
    container.appendChild(upsMessage);
}

// --- Создание Модуля Месяца ---

/**
 * Создает DOM-структуру для одного модуля месяца в календаре.
 * @param {number} year - Год (e.g., 2025).
 * @param {number} month - Месяц (0-11).
 * @param {Date} globalStartDate - Глобальная дата начала отображения календаря (UTC).
 * @param {Date} globalEndDate - Глобальная дата окончания отображения календаря (UTC).
 * @param {object} config - Глобальный объект конфигурации APP_CONFIG.
 * @param {object} log - Глобальный объект лога календаря APP_LOG.
 * @returns {HTMLElement | null} Созданный DOM-элемент .month-module или null в случае ошибки.
 */
function createMonthModule(year, month, globalStartDate, globalEndDate, config, log) {
    try {
        const module = document.createElement('div');
        module.className = 'month-module';

        // 1. Заголовок месяца
        const title = document.createElement('div');
        title.className = 'month-title';
        const monthName = new Date(Date.UTC(year, month)).toLocaleString(config.language || 'ru', { month: 'long', timeZone: 'UTC' });
        title.innerText = `${monthName.toUpperCase()} ${year}`;
        module.appendChild(title);

        // 2. Хедер дней недели
        const weekHeader = document.createElement('div');
        weekHeader.className = 'week-days-header';
        const WEEK_DAYS_SHORT = LANG_STRINGS?.weekdays_short || ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']; // Запасной вариант
        WEEK_DAYS_SHORT.forEach(dayName => {
            const dayEl = document.createElement('div');
            dayEl.className = 'week-day';
            dayEl.innerText = dayName;
            weekHeader.appendChild(dayEl);
        });
        module.appendChild(weekHeader);

        // 3. Сетка дней (6x7 = 42 ячейки)
        const daysGrid = document.createElement('div');
        daysGrid.className = 'days-grid';

        const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0=Вс, 1=Пн
        const paddingDays = (firstDayOfMonth === 0) ? 6 : (firstDayOfMonth - 1); // Смещение для начала с Пн
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate(); // Кол-во дней в месяце

        for (let i = 0; i < 42; i++) {
            const dayOfMonth = i - paddingDays + 1; // Рассчитываем число месяца (может быть <= 0 или > daysInMonth)
            const cell = document.createElement('div');
            cell.className = 'day-cell';

            // Проверяем, является ли день валидным числом текущего месяца
            if (dayOfMonth < 1 || dayOfMonth > daysInMonth) {
                cell.classList.add('empty'); // Ячейка вне текущего месяца
            } else {
                const cellDate = new Date(Date.UTC(year, month, dayOfMonth));
                // Проверяем, входит ли дата ячейки в глобальный диапазон отображения
                if (cellDate < globalStartDate || cellDate > globalEndDate) {
                    cell.classList.add('empty'); // Ячейка вне глобального диапазона
                } else {
                    // --- Ячейка Валидна и в Диапазоне ---
                    cell.classList.add('in-range');
                    const dateString = cellDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
                    cell.dataset.date = dateString;

                    // Добавляем номер дня
                    const dayNumber = document.createElement('span');
                    dayNumber.className = 'day-number';
                    dayNumber.innerText = dayOfMonth;
                    cell.appendChild(dayNumber);

                    // Проверяем лог на наличие отметки (ДО стилей дня приезда)
                    const logEntry = log?.marked_dates?.[dateString]; // Безопасный доступ
                    if (logEntry) {
                        applyMarkedStyle(cell, logEntry, config); // Применяем стили отметки
                    }

                    // Проверяем, является ли это днем приезда
                    const arrivalDateStr = globalEndDate.toISOString().split('T')[0];
                    if (dateString === arrivalDateStr) {
                        applyArrivalDayStyle(cell, config); // Применяем стили дня приезда
                    }
                }
            }
            daysGrid.appendChild(cell); // Добавляем ячейку в сетку
        }
        module.appendChild(daysGrid);

        // Проверяем начальное состояние завершенности месяца
        checkMonthCompletion(module);

        return module;

    } catch (error) {
         console.error(`--- [DEBUG] Ошибка при создании модуля месяца ${year}-${month+1}:`, error);
         return null; // Возвращаем null, чтобы избежать добавления сломанного модуля
    }
}

/**
 * Применяет стили для отмеченного дня (фон и стикер).
 * @param {HTMLElement} cell - DOM-элемент ячейки дня.
 * @param {object} logEntry - Запись из лога для этой даты ({rotation, sticker}).
 * @param {object} config - Глобальный APP_CONFIG.
 */
function applyMarkedStyle(cell, logEntry, config) {
    cell.classList.add('marked');
    cell.style.backgroundColor = config.calendar_marked_day_color || '';

    const sticker = document.createElement('div');
    sticker.className = 'sticker';
    sticker.innerText = logEntry.sticker;
    sticker.style.color = config.sticker_color || '';
    let transform = `rotate(${logEntry.rotation}deg)`;
    if (config.sticker_scale && config.sticker_scale !== 1.0) {
         transform += ` scale(${config.sticker_scale})`;
    }
    sticker.style.transform = transform;
    cell.appendChild(sticker);
}

/**
 * Применяет стили для дня приезда (фон и/или стикер).
 * Удаляет обычный стикер, если он конфликтует со стикером приезда.
 * @param {HTMLElement} cell - DOM-элемент ячейки дня.
 * @param {object} config - Глобальный APP_CONFIG.
 */
function applyArrivalDayStyle(cell, config) {
    if (config.arrival_day.use_bg) {
        cell.style.backgroundColor = config.colors.color_arrival_highlight_bg || '';
        // Добавляем класс только если фон включен (для CSS hover и т.п.)
        cell.classList.add('arrival-highlight-bg');
    }
    if (config.arrival_day.use_sticker) {
        // Удаляем обычный стикер, если он есть
        cell.querySelector('.sticker:not(.arrival-sticker)')?.remove();

        // Добавляем стикер приезда, если его еще нет
        if (!cell.querySelector('.arrival-sticker')) {
            const sticker = document.createElement('div');
            sticker.className = 'sticker arrival-sticker';
            sticker.innerText = config.arrival_day.sticker_emoji;
            let transform = '';
            if (config.arrival_day.sticker_scale && config.arrival_day.sticker_scale !== 1.0) {
                transform += ` scale(${config.arrival_day.sticker_scale})`;
            }
            sticker.style.transform = transform;
            cell.appendChild(sticker);
        }
    }
}


// --- Взаимодействие с Календарем ---

/**
 * Инициализирует обработчик кликов для контейнера календаря (делегирование событий).
 * @param {HTMLElement} container - DOM-элемент контейнера календаря (#page-calendar).
 * @param {object} config - Глобальный APP_CONFIG.
 */
function initCalendarInteraction(container, config) {
    if (!container) return;
    console.log("--- [DEBUG] initCalendarInteraction: Активация слушателя кликов.");

    // Используем один слушатель на весь контейнер
    container.addEventListener('click', async (event) => {
        // Находим ближайшую кликабельную ячейку дня (.day-cell.in-range)
        const cell = event.target.closest('.day-cell.in-range');
        if (!cell) {
            // console.debug("--- [DEBUG] Клик мимо активной ячейки.");
            return; // Клик был не по активной ячейке
        }

        const dateString = cell.dataset.date;
        if (!dateString) return; // Нет даты - игнорируем

        console.log(`--- [DEBUG] Клик по дате: ${dateString}. Отправка запроса /api/calendar/toggle...`);

        try {
            // Отправляем запрос на бэкенд для переключения статуса даты
            const response = await fetch('/api/calendar/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateString })
            });

            if (!response.ok) {
                // Пытаемся получить текст ошибки от API
                let errorDetails = await response.text();
                try { errorDetails = JSON.parse(errorDetails); } catch(e) {} // Пытаемся парсить как JSON
                console.error(`--- [DEBUG] Ошибка API /calendar/toggle (${response.status}):`, errorDetails);
                throw new Error(`API Error ${response.status}`);
            }

            const result = await response.json();
            console.log("--- [DEBUG] Ответ API /calendar/toggle:", result);

            // Обновляем UI ячейки на основе ответа API
            updateCellSticker(cell, result, config);

            // Обновляем локальный кэш лога (APP_LOG)
            if (result.status === 'added' && result.entry) {
                APP_LOG.marked_dates[dateString] = result.entry;
            } else if (result.status === 'removed') {
                delete APP_LOG.marked_dates[dateString];
            }

        } catch (error) {
            console.error("--- [DEBUG] КРИТИЧЕСКАЯ ОШИБКА при обработке клика /calendar/toggle:", error);
            // TODO: Показать уведомление пользователю об ошибке
            // alert(`Ошибка при обновлении отметки: ${error.message}`);
        }
    });
}

/**
 * [v3.4] Обновляет DOM-элемент ячейки дня (стикер и фон) после клика.
 * @param {HTMLElement} cell - DOM-элемент ячейки дня для обновления.
 * @param {object} result - Ответ от API ({status: 'added'|'removed', entry?: object}).
 * @param {object} config - Глобальный APP_CONFIG.
 */
function updateCellSticker(cell, result, config) {
    const dateString = cell.dataset.date;
    const parentMonthModule = cell.closest('.month-module');
    const isArrivalDay = cell.classList.contains('arrival-highlight-bg') || cell.querySelector('.arrival-sticker');

    console.log(`--- [DEBUG] updateCellSticker START for ${dateString}: status=${result.status}, isArrival=${isArrivalDay}`);

    // Удаляем существующий ОБЫЧНЫЙ стикер перед добавлением/удалением фона
    cell.querySelector('.sticker:not(.arrival-sticker)')?.remove();

    if (result.status === 'added' && result.entry) {
        // Добавляем класс и фон
        cell.classList.add('marked');
        // Не меняем фон, если это день приезда с включенным фоном
        if (!isArrivalDay || !config.arrival_day.use_bg) {
             cell.style.backgroundColor = config.calendar_marked_day_color || '';
        }
        console.log(`--- [DEBUG] updateCellSticker: Added .marked class and background (if not arrival bg) to ${dateString}`);

        // Создаем и добавляем новый стикер (если это не день приезда со стикером)
        if (!isArrivalDay || !config.arrival_day.use_sticker) {
            const sticker = document.createElement('div');
            sticker.className = 'sticker';
            sticker.innerText = result.entry.sticker;
            sticker.style.color = config.sticker_color || '';
            let transform = `rotate(${result.entry.rotation}deg)`;
            if (config.sticker_scale && config.sticker_scale !== 1.0) {
                 transform += ` scale(${config.sticker_scale})`;
            }
            sticker.style.transform = transform;
            cell.appendChild(sticker);
            console.log(`--- [DEBUG] updateCellSticker: Sticker element appended to ${dateString}`);
        } else {
             console.log(`--- [DEBUG] updateCellSticker: Not adding regular sticker to arrival day.`);
        }

        // Вызов эффекта дня
        if (config.effects_enabled) {
            spawnParticles({ /* ... (параметры эффекта дня) ... */ });
        }

    } else if (result.status === 'removed') {
        // Убираем класс и фон (если это не день приезда с включенным фоном)
        cell.classList.remove('marked');
        if (!isArrivalDay || !config.arrival_day.use_bg) {
            cell.style.backgroundColor = ''; // Сбрасываем инлайн-стиль
             console.log(`--- [DEBUG] updateCellSticker: Removed .marked class and background from ${dateString}`);
        } else {
             console.log(`--- [DEBUG] updateCellSticker: Kept arrival background on ${dateString}`);
        }
        // Обычный стикер уже удален в начале функции
    }

    // Вызываем проверку завершенности ПОСЛЕ следующего кадра отрисовки
    requestAnimationFrame(() => {
        console.log(`--- [DEBUG] updateCellSticker: Calling checkMonthCompletion AFTER rAF for ${dateString}`);
        checkMonthCompletion(parentMonthModule);
    });
     console.log(`--- [DEBUG] updateCellSticker END for ${dateString}`);
}


// --- Проверка Завершенности Месяца ---

/**
 * [v3.2] Проверяет, все ли активные дни месяца в текущем диапазоне отмечены.
 * Добавляет или убирает класс 'month-completed' у DOM-элемента модуля месяца.
 * Вызывает эффект завершения месяца, если он только что был завершен.
 * @param {HTMLElement | null} monthModule - DOM-элемент .month-module для проверки.
 */
function checkMonthCompletion(monthModule) {
    if (!monthModule) {
        console.warn("--- [DEBUG] checkMonthCompletion: Вызван с null monthModule!");
        return;
    }
    const monthTitle = monthModule.querySelector('.month-title')?.innerText || 'Неизвестный месяц';
    // console.log(`--- [DEBUG] checkMonthCompletion: Проверка для ${monthTitle}...`);

    const dayCellsWithDate = monthModule.querySelectorAll('.day-cell[data-date]');
    if (dayCellsWithDate.length === 0) {
        monthModule.classList.remove('month-completed');
        // console.log(`--- [DEBUG] checkMonthCompletion: ${monthTitle} - Нет ячеек с датой.`);
        return;
    }

    let actualDaysInMonthInRange = 0;
    let markedDaysInMonthInRange = 0;

    dayCellsWithDate.forEach(cell => {
        // Считаем только активные, кликабельные дни
        if (!cell.classList.contains('empty') && cell.classList.contains('in-range')) {
            actualDaysInMonthInRange++;
            // Проверяем наличие класса 'marked' (самый надежный способ после обновления UI)
            if (cell.classList.contains('marked')) {
                markedDaysInMonthInRange++;
            }
            // Альтернативная проверка по логу (менее надежно из-за асинхронности)
            // const dateString = cell.dataset.date;
            // if (APP_LOG?.marked_dates?.[dateString]) { markedDaysInMonthInRange++; }
        }
    });

    // Условие: все активные дни (>0) должны быть отмечены
    const isCompleted = (actualDaysInMonthInRange > 0 && markedDaysInMonthInRange === actualDaysInMonthInRange);
    const wasCompleted = monthModule.classList.contains('month-completed'); // Предыдущее состояние

    // console.log(`---> [DEBUG] checkMonthCompletion: ${monthTitle} - Итог: Активных=${actualDaysInMonthInRange}, Отмечено=${markedDaysInMonthInRange}. Завершен=${isCompleted}.`);

    // Применяем или убираем класс
    monthModule.classList.toggle('month-completed', isCompleted);

    // Вызываем эффект ТОЛЬКО при ПЕРЕХОДЕ в состояние 'completed'
    if (isCompleted && !wasCompleted && APP_CONFIG?.effects_enabled) {
        console.log(`--- [DEBUG] ЭФФЕКТ: Месяц ${monthTitle} ЗАВЕРШЕН!`);
        triggerMonthCompletionEffect(monthModule, dayCellsWithDate);
    }

    // Логируем изменение класса (опционально)
    // if (isCompleted && !wasCompleted) console.log(`---> [DEBUG] ${monthTitle} - Класс .month-completed ДОБАВЛЕН.`);
    // if (!isCompleted && wasCompleted) console.log(`---> [DEBUG] ${monthTitle} - Класс .month-completed УБРАН.`);
}

/**
 * Запускает анимацию частиц для завершенного месяца.
 * @param {HTMLElement} monthModule - DOM-элемент .month-module.
 * @param {NodeListOf<Element>} dayCellsWithDate - Коллекция ячеек с датами в этом месяце.
 */
function triggerMonthCompletionEffect(monthModule, dayCellsWithDate) {
    // 1. Частицы дня из каждой активной ячейки
    dayCellsWithDate.forEach(cell => {
        if (cell.classList.contains('in-range')) {
            spawnParticles({
                originElement: cell,
                symbol: APP_CONFIG.effect_particle_day || '💖',
                count: 1, spread: 360, distance: 400, duration: 1200
            });
        }
    });
    // 2. Частицы месяца из центра модуля (если символ задан)
    if (APP_CONFIG.effect_particle_month) {
         spawnParticles({
             originElement: monthModule,
             symbol: APP_CONFIG.effect_particle_month, // 🎉 - убрали из дефолта
             count: 20, spread: 360,
             distance: Math.max(window.innerWidth / 2, window.innerHeight / 2, 600),
             duration: 1800,
             particleClass: 'month-particle'
         });
    }
}


// --- Управление Зумом Календаря ---

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
        `${currentMinModuleWidth}px` // Убедимся, что добавляем 'px'
    );
}

/**
 * Инициализирует обработчик события 'wheel' (колесо мыши) для зума календаря
 * при зажатой клавише Ctrl. Модифицирует CSS-переменную '--calendar-module-min-width'.
 */
function initCalendarZoom() {
    // Находим контейнер и основную область один раз
    const container = document.getElementById('page-calendar');
    const mainArea = document.querySelector('.app-main');

    if (!container || !mainArea) {
        console.error("--- [DEBUG] initCalendarZoom: Не найден container или mainArea!");
        return;
    }
    console.log("--- [DEBUG] initCalendarZoom: Активация слушателя колеса мыши для зума.");

    mainArea.addEventListener('wheel', (event) => {
        // Зум работает только на активной странице календаря и с зажатым Ctrl
        if (!container.classList.contains('active') || !event.ctrlKey) {
            return;
        }

        event.preventDefault(); // Предотвращаем стандартный зум страницы/скролл

        const zoomStep = 40; // Шаг изменения ширины в px
        const minWidth = 240; // Минимально допустимая ширина
        const maxWidth = 800; // Максимально допустимая ширина

        // Определяем направление скролла
        if (event.deltaY < 0) { // Колесо вверх - увеличиваем
            currentMinModuleWidth += zoomStep;
        } else { // Колесо вниз - уменьшаем
            currentMinModuleWidth -= zoomStep;
        }

        // Ограничиваем значения в пределах min/max
        currentMinModuleWidth = Math.max(minWidth, Math.min(maxWidth, currentMinModuleWidth));

        // Применяем новое значение к CSS-переменной
        document.documentElement.style.setProperty(
            '--calendar-module-min-width',
            `${currentMinModuleWidth}px` // Убедимся, что добавляем 'px'
        );

        // console.debug(`--- [DEBUG] Zoom: new width = ${currentMinModuleWidth}px`);
    }, { passive: false }); // passive: false необходимо для preventDefault()
}