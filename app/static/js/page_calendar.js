// /mrhoustontimer/app/static/js/page_calendar.js

// Массив для хедера дней недели
const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/**
 * Главная функция инициализации страницы "Календарик"
 * @param {object} config - Глобальный APP_CONFIG
 * @param {object} log - Глобальный APP_LOG
 */
function initPageCalendar(config, log) {
    console.log("--- [DEBUG] initPageCalendar: Старт. ---");
    try {
        const container = document.getElementById('page-calendar');
        if (!container) {
            console.error("--- [DEBUG] initPageCalendar: Не найден контейнер #page-calendar!");
            return;
        }

        // 1. Очищаем контейнер (на случай будущих 'ре-рендеров')
        // Мы заменяем "<h1>Календарь (Этап 3)</h1>"
        container.innerHTML = '';

        // 2. Создаем главную сетку
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        // 3. Парсим даты из ТЗ
        // new Date() корректно парсит "YYYY-MM-DD"
        // Важно: 'date_vova_departure' - это *последний* день *до* начала отсчета.
        // Поэтому начинаем со *следующего* дня.
        const startDate = new Date(config.date_vova_departure);
        startDate.setDate(startDate.getDate() + 1); // Начинаем со след. дня

        const endDate = new Date(config.date_vova_arrival);

        console.log(`--- [DEBUG] initPageCalendar: Диапазон дат: ${startDate.toISOString()} до ${endDate.toISOString()} ---`);

        // 4. Генерируем "Модули Месяцев"
        // Мы будем итерировать 'currentDate', начиная с startDate
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            // Создаем модуль для 'currentDate.getMonth()'
            const monthModule = createMonthModule(currentDate.getFullYear(), currentDate.getMonth(), startDate, endDate, config, log);
            grid.appendChild(monthModule);

            // Переходим к первому дню *следующего* месяца
            currentDate.setMonth(currentDate.getMonth() + 1);
            currentDate.setDate(1);
        }

        container.appendChild(grid);
        console.log("--- [DEBUG] initPageCalendar: УСПЕХ. Календарь отрисован. ---");

    } catch (e) {
        console.error("--- [DEBUG] КРИТИЧЕСКАЯ ОШИБКА в initPageCalendar() ---", e);
    }
}

/**
 * Создает HTML-элемент для одного "Модуля Месяца"
 * @param {number} year - Год (e.g. 2025)
 * @param {number} month - Месяц (0-11)
 * @param {Date} globalStartDate - Самый первый день для рендера
 * @param {Date} globalEndDate - Самый последний день для рендера
 * @param {object} config - APP_CONFIG
 * @param {object} log - APP_LOG
 */
function createMonthModule(year, month, globalStartDate, globalEndDate, config, log) {

    // --- 1. Создаем обертки ---
    const module = document.createElement('div');
    module.className = 'month-module';

    // --- 2. Создаем Заголовок Месяца (e.g. "ОКТЯБРЬ 2025") ---
    const title = document.createElement('div');
    title.className = 'month-title';
    // 'ru-RU' - для локализации (в будущем возьмем из config.language)
    const monthName = new Date(year, month).toLocaleString(config.language || 'ru-RU', { month: 'long' });
    title.innerText = `${monthName.toUpperCase()} ${year}`;
    module.appendChild(title);

    // --- 3. Создаем Хедер Дней Недели (Пн, Вт...) ---
    const weekHeader = document.createElement('div');
    weekHeader.className = 'week-days-header';
    for (const day of WEEK_DAYS) {
        const dayEl = document.createElement('div');
        dayEl.className = 'week-day';
        dayEl.innerText = day;
        weekHeader.appendChild(dayEl);
    }
    module.appendChild(weekHeader);

    // --- 4. Создаем Сетку Дней ---
    const daysGrid = document.createElement('div');
    daysGrid.className = 'days-grid';

    // --- 5. Вычисляем "пустые" ячейки в начале месяца ---
    // День недели первого числа месяца (0=Вс, 1=Пн, ...)
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    // Корректируем под наш формат (Пн=0, Вс=6)
    const paddingDays = (firstDayOfMonth === 0) ? 6 : (firstDayOfMonth - 1);

    for (let i = 0; i < paddingDays; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty';
        daysGrid.appendChild(emptyCell);
    }

    // --- 6. Рендерим ячейки с датами ---
    const daysInMonth = new Date(year, month + 1, 0).getDate(); // 30, 31, 28...

    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(year, month, day);

        // Пропускаем дни *вне* нашего глобального диапазона (ТЗ)
        if (cellDate < globalStartDate || cellDate > globalEndDate) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell empty';
            daysGrid.appendChild(emptyCell);
            continue; // Пропускаем этот день
        }

        // --- Создаем ячейку ---
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        // Форматируем дату в "YYYY-MM-DD" для data-атрибута и O(1) поиска
        const dateString = cellDate.toISOString().split('T')[0];
        cell.dataset.date = dateString;

        // Добавляем номер дня
        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        // TODO: Применить .pos-center и т.д. из config.day_number (Этап 5)
        dayNumber.innerText = day;
        cell.appendChild(dayNumber);

        // --- Проверяем Стили Дня Приезда (ТЗ 5.1) ---
        if (dateString === config.date_vova_arrival) {
            if (config.arrival_day.use_bg) {
                cell.classList.add('arrival-highlight-bg');
            }
            if (config.arrival_day.use_sticker) {
                const sticker = document.createElement('div');
                sticker.className = 'sticker arrival-sticker';
                sticker.innerText = config.arrival_day.sticker_emoji;
                // TODO: Применить 'sticker_scale' (Этап 5)
                cell.appendChild(sticker);
            }
        }

        // --- Проверяем отметку в calendar_log.json (ТЗ 5.1) ---
        const logEntry = log.marked_dates[dateString];
        if (logEntry) {
            const sticker = document.createElement('div');
            sticker.className = 'sticker';
            sticker.innerText = logEntry.sticker;
            // Применяем поворот (ТЗ 2.2)
            sticker.style.transform = `rotate(${logEntry.rotation}deg)`;
            cell.appendChild(sticker);
        }

        daysGrid.appendChild(cell);
    }

    module.appendChild(daysGrid);
    return module;
}