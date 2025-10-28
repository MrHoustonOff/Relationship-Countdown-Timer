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
            cell.classList.add('empty');
            daysGrid.appendChild(cell);
            continue;
        }
        const cellDate = new Date(Date.UTC(year, month, day));
        if (cellDate < globalStartDate || cellDate > globalEndDate) {
            cell.classList.add('empty');
            daysGrid.appendChild(cell);
            continue;
        }
        cell.classList.add('in-range');
        const dateString = cellDate.toISOString().split('T')[0];
        cell.dataset.date = dateString;
        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.innerText = day;
        cell.appendChild(dayNumber);
        const arrivalDateStr = globalEndDate.toISOString().split('T')[0];
        if (dateString === arrivalDateStr) {
            if (config.arrival_day.use_bg) {
                cell.classList.add('arrival-highlight-bg');
            }
            if (config.arrival_day.use_sticker) {
                const sticker = document.createElement('div');
                sticker.className = 'sticker arrival-sticker';
                sticker.innerText = config.arrival_day.sticker_emoji;
                let transformStyles = '';
                if (config.arrival_day.sticker_scale) {
                    transformStyles += ` scale(${config.arrival_day.sticker_scale})`;
                }
                sticker.style.transform = transformStyles;
                cell.appendChild(sticker);
            }
        }
        const logEntry = log.marked_dates[dateString];
        if (logEntry) {
            const sticker = document.createElement('div');
            sticker.className = 'sticker';
            sticker.innerText = logEntry.sticker;
            sticker.style.transform = `rotate(${logEntry.rotation}deg)`;
            cell.appendChild(sticker);
        }
        daysGrid.appendChild(cell);
    }

    module.appendChild(daysGrid);
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
    // Находим стикер (если он уже есть)
    const existingSticker = cell.querySelector('.sticker');

    if (result.status === 'added') {
        // Если стикер уже есть (например, 'arrival-sticker') - ничего не делаем
        // (хотя API не должен был этого допустить, но защита не помешает)
        if (existingSticker) return;

        // Создаем новый стикер
        const sticker = document.createElement('div');
        sticker.className = 'sticker';
        sticker.innerText = result.entry.sticker;
        sticker.style.transform = `rotate(${result.entry.rotation}deg)`;

        cell.appendChild(sticker);
        console.log(`--- [DEBUG] updateCellSticker: Стикер ДОБАВЛЕН в ${cell.dataset.date}`);

    } else if (result.status === 'removed') {
        // Если стикер ЕСТЬ и он НЕ "arrival-sticker"
        if (existingSticker && !existingSticker.classList.contains('arrival-sticker')) {
            existingSticker.remove();
            console.log(`--- [DEBUG] updateCellSticker: Стикер УДАЛЕН из ${cell.dataset.date}`);
        } else {
             console.log(`--- [DEBUG] updateCellSticker: Нечего удалять (или это arrival-sticker).`);
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