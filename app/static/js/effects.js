// /mrhoustontimer/app/static/js/effects.js
/**
 * @fileoverview Утилиты для создания и анимации визуальных эффектов частиц.
 */

/**
 * Создает и анимирует набор частиц (символов), вылетающих из указанного элемента.
 * Частицы позиционируются абсолютно относительно viewport и удаляются после завершения анимации.
 * Анимация управляется CSS (`particle-fly-out` keyframes) с использованием CSS-переменных
 * `--particle-x` и `--particle-y` для конечной позиции.
 *
 * @param {object} options - Объект с параметрами для создания частиц.
 * @param {HTMLElement | null} options.originElement - DOM-элемент, из центра которого будут вылетать частицы. Если null, функция ничего не делает.
 * @param {string} options.symbol - Символ (например, emoji '💖' или '🎉'), который будет использоваться в качестве частицы.
 * @param {number} [options.count=10] - Количество создаваемых частиц. По умолчанию 10.
 * @param {number} [options.spread=180] - Угол (в градусах), в пределах которого частицы будут разлетаться случайным образом. 180 градусов означает полукруг. 360 - полный круг. По умолчанию 180 (полукруг вверх).
 * @param {number} [options.duration=1200] - Длительность анимации каждой частицы в миллисекундах. Частица будет удалена из DOM по истечении этого времени. По умолчанию 1200 мс.
 * @param {number} [options.distance=300] - Максимальное расстояние (в пикселях), на которое частица может улететь от центра `originElement`. Реальное расстояние будет случайным значением от 50% до 100% этого значения. По умолчанию 300px.
 * @param {string} [options.particleClass=''] - Дополнительный CSS-класс, который будет добавлен к каждой частице (например, 'month-particle' для стилизации частиц месяца). По умолчанию пустая строка.
 */
function spawnParticles({
    originElement,
    symbol,
    count = 10,
    spread = 180,
    duration = 1200,
    distance = 300,
    particleClass = '',
    aim = 1,
    deg_aim = 0
}) {
    // Проверка наличия элемента-источника
    if (!originElement || !(originElement instanceof Element)) {
        console.warn("[spawnParticles] Элемент-источник не найден или некорректен.");
        return;
    }
    if (!symbol) {
        console.warn("[spawnParticles] Символ частицы не указан.");
        return; // Не спавним, если нет символа
    }

    try {
        const originRect = originElement.getBoundingClientRect();
        // Рассчитываем центральную точку элемента относительно viewport
        const originX = originRect.left + originRect.width / 2;
        const originY = originRect.top + originRect.height / 2;

        console.debug(`[spawnParticles] Спавним ${count} частиц '${symbol}' из (${originX.toFixed(0)}px, ${originY.toFixed(0)}px)`);

        // Создаем указанное количество частиц
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('span');
            // Добавляем базовый класс 'particle' и опциональный дополнительный класс
            particle.className = `particle ${particleClass || ''}`.trim();
            particle.textContent = symbol; // Используем textContent для безопасности

            // Устанавливаем начальную позицию в центре элемента-источника
            particle.style.position = 'fixed'; // Используем fixed для позиционирования относительно viewport
            particle.style.left = `${originX}px`;
            particle.style.top = `${originY}px`;
            // Начальный transform для центрирования самой частицы (если нужно точное позиционирование)
            // particle.style.transform = 'translate(-50%, -50%)'; // Раскомментируй, если центр символа важен

            // Рассчитываем случайный угол разлета
            // Смещение -90 градусов для направления "вверх" при spread=180 но я его поменял
            const angleOffset = 90 * aim + deg_aim;
            const randomAngleDeg = (Math.random() * spread - (spread / 2)) + angleOffset;
            const angleRad = randomAngleDeg * (Math.PI / 180);

            // Рассчитываем случайное расстояние
            // Частицы летят на расстояние от 50% до 100% от максимального `distance`
            const currentDistance = (Math.random() * 0.5 + 0.5) * distance;

            // Рассчитываем конечные координаты смещения для анимации
            const endX = Math.cos(angleRad) * currentDistance;
            const endY = Math.sin(angleRad) * currentDistance;

            // Устанавливаем CSS-переменные, которые используются в @keyframes particle-fly-out
            particle.style.setProperty('--particle-x', `${endX.toFixed(2)}px`);
            particle.style.setProperty('--particle-y', `${endY.toFixed(2)}px`);
            // Можно также задать длительность анимации через переменную, если CSS настроен
            // particle.style.animationDuration = `${duration}ms`;

            // Добавляем частицу в DOM (в конец body, чтобы была поверх всего)
            document.body.appendChild(particle);

            // Устанавливаем таймер для удаления частицы после завершения анимации
            setTimeout(() => {
                // Проверяем, существует ли еще частица (на всякий случай)
                if (particle.parentNode) {
                    particle.remove();
                }
            }, duration);
        }
    } catch (error) {
        console.error("[spawnParticles] Ошибка при создании частиц:", error);
    }
}