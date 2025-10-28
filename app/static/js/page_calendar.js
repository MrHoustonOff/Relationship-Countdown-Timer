// /mrhoustontimer/app/static/js/page_calendar.js (v2.2)

function parseDateAsUTC(dateString) {
    const parts = dateString.split('-').map(Number);
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}
function zeroTime(date) {
    date.setUTCHours(0, 0, 0, 0);
    return date;
}

function initPageCalendar(config, log) {
    console.log("--- [DEBUG] initPageCalendar (v2.3): Старт. ---");
    try {
        const container = document.getElementById('page-calendar');
        container.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        const departureDateStr = config.date_vova_departure.split('T')[0];
        const arrivalDateStr = config.date_vova_arrival.split('T')[0];

        const departureDate = parseDateAsUTC(departureDateStr);
        const arrivalDate = parseDateAsUTC(arrivalDateStr);
        departureDate.setUTCDate(departureDate.getUTCDate() + 1);

        const globalStartDate = zeroTime(departureDate);
        const globalEndDate = zeroTime(arrivalDate);

        console.log(`--- [DEBUG] initPageCalendar: Диапазон UTC: ${globalStartDate.toISOString()} до ${globalEndDate.toISOString()} ---`);

        if (globalStartDate > globalEndDate) {
            console.warn("--- [DEBUG] initPageCalendar: ОШИБКА ДИАПАЗОНА. Рендер отменен.");

            // --- ИСПРАВЛЕНО: "Упси!" из LANG_STRINGS ---
            const upsMessage = document.createElement('div');
            upsMessage.className = 'calendar-empty-message';
            upsMessage.innerHTML = `
                <h2>${LANG_STRINGS.calendar_empty_title}</h2>
                <p>${LANG_STRINGS.calendar_empty_p1}</p>
                <p>${LANG_STRINGS.calendar_empty_p2}</p>
                <p>${LANG_STRINGS.calendar_empty_p3}</p>
            `;
            container.appendChild(upsMessage);
            return;
        }

        let currentDate = new Date(globalStartDate);
        while (currentDate <= globalEndDate) {
            const monthModule = createMonthModule(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), globalStartDate, globalEndDate, config, log);
            grid.appendChild(monthModule);
            currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
            currentDate.setUTCDate(1);
        }

        container.appendChild(grid);

        initCalendarInteraction(container, config);


        console.log("--- [DEBUG] initPageCalendar: УСПЕХ. Календарь (v2.3) отрисован. ---");

    } catch (e) {
        console.error("--- [DEBUG] КРИТИЧЕСКАЯ ОШИБКА в initPageCalendar() ---", e);
    }
}

/**
 * [v2.3] Создает Модуль Месяца
 */
function createMonthModule(year, month, globalStartDate, globalEndDate, config, log) {
    const module = document.createElement('div');
    module.className = 'month-module';

    const title = document.createElement('div');
    title.className = 'month-title';
    // --- ИСПРАВЛЕНО: 'config.language' уже есть в APP_CONFIG ---
    const monthName = new Date(Date.UTC(year, month)).toLocaleString(config.language, { month: 'long', timeZone: 'UTC' });
    title.innerText = `${monthName.toUpperCase()} ${year}`;
    module.appendChild(title);

    // --- ИСПРАВЛЕНО: Дни недели из LANG_STRINGS ---
    const weekHeader = document.createElement('div');
    weekHeader.className = 'week-days-header';
    const WEEK_DAYS_SHORT = LANG_STRINGS.weekdays_short || ['E', 'R', 'R', 'O', 'R', '!', '!'];
    WEEK_DAYS_SHORT.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'week-day';
        dayEl.innerText = day;
        weekHeader.appendChild(dayEl);
    });
    module.appendChild(weekHeader);

    const daysGrid = document.createElement('div');
    daysGrid.className = 'days-grid';
    // ... (вся остальная логика 42 ячеек, стикеров и т.д. БЕЗ ИЗМЕНЕНИЙ) ...
    const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const paddingDays = (firstDayOfMonth === 0) ? 6 : (firstDayOfMonth - 1);
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let i = 0; i < 42; i++) {
        const day = i - paddingDays + 1;
        const cell = document.createElement('div');
        cell.className = 'day-cell';

        if (day < 1 || day > daysInMonth) {
            cell.classList.add('empty'); daysGrid.appendChild(cell); continue;
        }
        const cellDate = new Date(Date.UTC(year, month, day));
        if (cellDate < globalStartDate || cellDate > globalEndDate) {
            cell.classList.add('empty'); daysGrid.appendChild(cell); continue;
        }

        // --- Ячейка ВАЛИДНА ---
        cell.classList.add('in-range');
        const dateString = cellDate.toISOString().split('T')[0];
        cell.dataset.date = dateString;

        // Номер дня
        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        // TODO: Применить config.day_number.position (Этап 5+)
        dayNumber.innerText = day;
        cell.appendChild(dayNumber);

        // --- Проверяем лог (ДО Дня Приезда, чтобы фон приезда перебил) ---
        const logEntry = log.marked_dates[dateString];
        if (logEntry) {
            // (Хотелка 2) Добавляем класс и фон
            cell.classList.add('marked');
            cell.style.backgroundColor = config.calendar_marked_day_color || ''; // Применяем цвет фона

            // Создаем стикер
            const sticker = document.createElement('div');
            sticker.className = 'sticker';
            sticker.innerText = logEntry.sticker;
            // (Хотелка 2) Применяем цвет и масштаб из config
            sticker.style.color = config.sticker_color || '';
            let transform = `rotate(${logEntry.rotation}deg)`;
            if (config.sticker_scale && config.sticker_scale !== 1.0) {
                 transform += ` scale(${config.sticker_scale})`;
            }
            sticker.style.transform = transform;

            cell.appendChild(sticker);
        }

        // --- День Приезда (перебивает фон 'marked', если совпадают) ---
        const arrivalDateStr = globalEndDate.toISOString().split('T')[0];
        if (dateString === arrivalDateStr) {
            if (config.arrival_day.use_bg) {
                cell.style.backgroundColor = config.colors.color_arrival_highlight_bg || ''; // Явный стиль
                cell.classList.add('arrival-highlight-bg'); // Оставляем класс для hover и т.п.
            }
            if (config.arrival_day.use_sticker) {
                 // Удаляем обычный стикер, если он был добавлен ранее
                 const existingSticker = cell.querySelector('.sticker:not(.arrival-sticker)');
                 if (existingSticker) existingSticker.remove();

                 const sticker = document.createElement('div');
                 sticker.className = 'sticker arrival-sticker';
                 sticker.innerText = config.arrival_day.sticker_emoji;
                 let transform = '';
                 // Применяем масштаб из config.arrival_day
                 if (config.arrival_day.sticker_scale && config.arrival_day.sticker_scale !== 1.0) {
                     transform += ` scale(${config.arrival_day.sticker_scale})`;
                 }
                 sticker.style.transform = transform;
                 cell.appendChild(sticker);
            }
        }

        daysGrid.appendChild(cell);
    }

    module.appendChild(daysGrid);

    checkMonthCompletion(module);
    return module;
}

/**
 * [v2.3] Инициализирует "слушатель кликов" для всего календаря
 * (Вызывается из 'initPageCalendar')
 * @param {HTMLElement} container - Элемент #page-calendar
 * @param {object} config - Глобальный APP_CONFIG
 */
function initCalendarInteraction(container, config) {
    console.log("--- [DEBUG] initCalendarInteraction: Активируем 'слушатель' кликов.");

    container.addEventListener('click', async (event) => {
        // 1. Находим ячейку, по которой кликнули
        // .closest() найдет ближайшего родителя (или сам элемент)
        const cell = event.target.closest('.day-cell.in-range');

        // 2. Если клик был *не* по ячейке (а по фону) - игнорируем
        if (!cell) {
            console.log("--- [DEBUG] Клик мимо ячейки.");
            return;
        }

        // 3. Получаем дату из data-атрибута (YYYY-MM-DD)
        const dateString = cell.dataset.date;
        if (!dateString) return; // На всякий случай

        console.log(`--- [DEBUG] Клик по дате: ${dateString}. Отправляем /api/calendar/toggle...`);

        try {
            // 4. Асинхронно стучимся на наш API
            const response = await fetch('/api/calendar/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateString })
            });

            if (!response.ok) {
                throw new Error(`API /api/calendar/toggle ответил ошибкой: ${response.status}`);
            }

            const result = await response.json();
            console.log("--- [DEBUG] API ответил:", result);

            // 5. Обновляем UI (без перезагрузки)
            updateCellSticker(cell, result, config);

            // 6. Обновляем наш *локальный* кэш лога (APP_LOG)
            // Это нужно, чтобы при (будущем) ре-рендере все было OК
            if (result.status === 'added') {
                APP_LOG.marked_dates[dateString] = result.entry;
            } else if (result.status === 'removed') {
                delete APP_LOG.marked_dates[dateString];
            }

        } catch (error) {
            console.error("--- [DEBUG] КРИТИЧЕСКАЯ ОШИБКА при toggle:", error);
            // TODO: Показать юзеру красивую ошибку
        }
    });
}

/**
 * [v2.3] Обновляет ОДНУ ячейку (добавляет/удаляет стикер)
 * @param {HTMLElement} cell - Ячейка, которую обновляем
 * @param {object} result - Ответ от API (result.status, result.entry)
 * @param {object} config - Глобальный APP_CONFIG
 */
function updateCellSticker(cell, result, config) {
    const existingSticker = cell.querySelector('.sticker');
    const parentMonthModule = cell.closest('.month-module');
    const dateString = cell.dataset.date; // Получаем дату для лога

    if (result.status === 'added') {
        if (existingSticker) return;

        cell.classList.add('marked');
        cell.style.backgroundColor = config.calendar_marked_day_color || '';

        // ... (код создания стикера) ...
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
        console.log(`--- [DEBUG] updateCellSticker: Стикер/Фон ДОБАВЛЕН в ${dateString}`);

        // Вызываем проверку ПОСЛЕ изменения DOM
        console.log(`--- [DEBUG] updateCellSticker: Вызываем checkMonthCompletion для ${parentMonthModule?.querySelector('.month-title')?.innerText} ПОСЛЕ добавления ${dateString}`);

        if (config.effects_enabled) {
            spawnParticles({
                originElement: cell,
                symbol: config.effect_particle_day || '💖',
                count: 1, // Одна частица
                spread: 360, // Во все стороны
                distance: 100, // Недалеко
                duration: 800 // Быстрее
            });
        }

        checkMonthCompletion(parentMonthModule);


    } else if (result.status === 'removed') {
        if (existingSticker && !existingSticker.classList.contains('arrival-sticker')) {
            existingSticker.remove();
            cell.classList.remove('marked');
            cell.style.backgroundColor = '';
            console.log(`--- [DEBUG] updateCellSticker: Стикер/Фон УДАЛЕН из ${dateString}`);

            // Вызываем проверку ПОСЛЕ изменения DOM
            console.log(`--- [DEBUG] updateCellSticker: Вызываем checkMonthCompletion для ${parentMonthModule?.querySelector('.month-title')?.innerText} ПОСЛЕ удаления ${dateString}`);
            checkMonthCompletion(parentMonthModule);

        } else {
             console.log(`--- [DEBUG] updateCellSticker: Нечего удалять в ${dateString} (или это arrival-sticker).`);
        }
    }
}
// ... (весь код initCalendarInteraction и updateCellSticker остается ВЫШЕ) ...

// --- НОВЫЙ КОД ДЛЯ ЭТАПА 4.5 (Zoom) ---

// Храним текущее значение зума в памяти
const DEFAULT_MIN_WIDTH = 320; // Дефолтный зум
let currentMinModuleWidth = DEFAULT_MIN_WIDTH; // 'px'
/**
 * [v2.4] Сбрасывает зум к дефолту
 */
function resetCalendarZoom() {
    console.log(`--- [DEBUG] Zoom: Сброс к ${DEFAULT_MIN_WIDTH}px`);
    currentMinModuleWidth = DEFAULT_MIN_WIDTH;
    document.documentElement.style.setProperty(
        '--calendar-module-min-width',
        currentMinModuleWidth + 'px'
    );
}
/**
 * [v2.4] Инициализирует "слушатель" колеса мыши для зума
 */
function initCalendarZoom() {
    const container = document.getElementById('page-calendar');
    console.log("--- [DEBUG] initCalendarZoom: Активируем 'слушатель' колеса мыши.");
    const mainArea = document.querySelector('.app-main');

    mainArea.addEventListener('wheel', (event) => {
        if (!container.classList.contains('active') || !event.ctrlKey) {
            return;
        }
        event.preventDefault();

        // --- ИСПРАВЛЕНИЕ: (Твоя Критика 2A: "Плавный") ---
        const zoomStep = 40; // Увеличиваем шаг (было 20)

        if (event.deltaY < 0) {
            currentMinModuleWidth += zoomStep;
        } else {
            currentMinModuleWidth -= zoomStep;
        }

        if (currentMinModuleWidth < 240) currentMinModuleWidth = 240;
        if (currentMinModuleWidth > 800) currentMinModuleWidth = 800;

        document.documentElement.style.setProperty(
            '--calendar-module-min-width',
            currentMinModuleWidth + 'px'
        );

        console.log(`--- [DEBUG] Zoom: new width = ${currentMinModuleWidth}px`);
    }, { passive: false });
}

/**
 * [НОВОЕ] Проверяет, все ли активные дни в модуле месяца отмечены,
 * и добавляет/убирает класс .month-completed
 * @param {HTMLElement | null} monthModule - Элемент .month-module
 */
/**
 * [ИСПРАВЛЕНО v3.1] Проверяет, все ли *активные дни месяца* отмечены.
 * @param {HTMLElement | null} monthModule - Элемент .month-module
 */
function checkMonthCompletion(monthModule) {
    if (!monthModule) {
        console.warn("--- [DEBUG] checkMonthCompletion: Вызван с null monthModule!");
        return;
    }
    const monthTitle = monthModule.querySelector('.month-title')?.innerText || 'Неизвестный месяц';
    console.log(`--- [DEBUG] checkMonthCompletion: Проверка для ${monthTitle}...`);

    const dayCellsWithDate = monthModule.querySelectorAll('.day-cell[data-date]');
    if (dayCellsWithDate.length === 0) {
        monthModule.classList.remove('month-completed');
        console.log(`--- [DEBUG] checkMonthCompletion: ${monthTitle} - Нет ячеек с датой. Убираем .month-completed.`);
        return;
    }

    let actualDaysInMonthInRange = 0;
    let markedDaysInMonthInRange = 0;
    let daysToCheck = []; // Для лога

    dayCellsWithDate.forEach(cell => {
        if (!cell.classList.contains('empty') && cell.classList.contains('in-range')) {
            actualDaysInMonthInRange++;
            const dateString = cell.dataset.date;
            const isMarked = cell.classList.contains('marked'); // Проверяем класс ПОСЛЕ updateCellSticker
            daysToCheck.push({date: dateString, marked: isMarked}); // Собираем инфо для лога
            if (isMarked) {
                markedDaysInMonthInRange++;
            }
        }
    });

    // Детальный лог проверяемых дней
    // console.log(`--- [DEBUG] checkMonthCompletion: ${monthTitle} - Дни для проверки:`, daysToCheck);

    const isCompleted = (actualDaysInMonthInRange > 0 && markedDaysInMonthInRange === actualDaysInMonthInRange);

    // Логируем результат ПЕРЕД изменением класса
    console.log(`---> [DEBUG] checkMonthCompletion: ${monthTitle} - Итог: Активных дней=${actualDaysInMonthInRange}, Отмечено=${markedDaysInMonthInRange}. Завершен=${isCompleted}. Применяем класс...`);
    const wasCompleted = monthModule.classList.contains('month-completed'); // Запоминаем старое состояние

    monthModule.classList.toggle('month-completed', isCompleted);

    if (isCompleted && !wasCompleted && APP_CONFIG.effects_enabled) { // Используем APP_CONFIG напрямую
        console.log(`--- [DEBUG] ЭФФЕКТ: Месяц ${monthTitle} ЗАВЕРШЕН!`);

        // 1. Частицы из каждого дня
        dayCellsWithDate.forEach(cell => {
            if (cell.classList.contains('in-range')) { // Только из активных дней
                spawnParticles({
                    originElement: cell,
                    symbol: APP_CONFIG.effect_particle_day || '💖',
                    count: 1, // По одной из ячейки
                    spread: 360,
                    distance: 500,
                    duration: 2000
                });
            }
        });
    }

    // Логируем ПОСЛЕ изменения класса
    if (monthModule.classList.contains('month-completed')) {
         console.log(`---> [DEBUG] checkMonthCompletion: ${monthTitle} - Класс .month-completed ДОБАВЛЕН.`);
    } else {
         console.log(`---> [DEBUG] checkMonthCompletion: ${monthTitle} - Класс .month-completed УБРАН.`);
    }
}