// /mrhoustontimer/app/static/js/effects.js

/**
 * Создает и анимирует частицы, вылетающие из элемента.
 * @param {object} options
 * @param {HTMLElement} options.originElement - Элемент, из которого вылетают частицы.
 * @param {string} options.symbol - Символ частицы (💖, 🎉).
 * @param {number} [options.count=10] - Количество частиц.
 * @param {number} [options.spread=180] - Угол разлета (в градусах).
 * @param {number} [options.duration=1200] - Длительность анимации (в мс).
 * @param {number} [options.distance=300] - Максимальное расстояние вылета (в px).
 * @param {string} [options.particleClass=''] - Дополнительный класс для частиц (e.g., 'month-particle').
 */
function spawnParticles({
    originElement,
    symbol,
    count = 10,
    spread = 180, // Разлет в полукруге вверх
    duration = 1200,
    distance = 300,
    particleClass = ''
}) {
    if (!originElement) return;

    const originRect = originElement.getBoundingClientRect();
    // Центр элемента относительно viewport
    const originX = originRect.left + originRect.width / 2;
    const originY = originRect.top + originRect.height / 2;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('span');
        particle.className = `particle ${particleClass}`;
        particle.innerText = symbol;

        // Начальная позиция = центр originElement
        particle.style.left = `${originX}px`;
        particle.style.top = `${originY}px`;

        // Случайный угол внутри 'spread' (смещаем на -90, чтобы летели вверх)
        const angleRad = (Math.random() * spread - (spread / 2) - 90) * (Math.PI / 180);
        // Случайное расстояние
        const currentDistance = Math.random() * distance * 0.5 + distance * 0.5; // От 50% до 100% distance

        // Конечные координаты для CSS переменной
        const endX = Math.cos(angleRad) * currentDistance;
        const endY = Math.sin(angleRad) * currentDistance;

        // Устанавливаем CSS переменные для анимации
        particle.style.setProperty('--particle-x', `${endX}px`);
        particle.style.setProperty('--particle-y', `${endY}px`);

        // Добавляем частицу в body
        document.body.appendChild(particle);

        // Удаляем частицу после анимации
        setTimeout(() => {
            particle.remove();
        }, duration);
    }
}