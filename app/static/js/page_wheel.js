/**
 * ХЕЛПЕР: Изменяет яркость HEX-цвета.
 * @param {string} hex - (e.g., "#F48FB1")
 * @param {number} percent - (e.g., 20 = 20% темнее, -20 = 20% светлее)
 * @returns {string}
 */
function changeColorBrightness(hex, percent) {
    if (!hex) return '#333';
    let hexValue = hex.replace('#', '');
    if (hexValue.length === 3) {
        hexValue = hexValue.split('').map(char => char + char).join('');
    }
    if (hexValue.length !== 6) { return '#333'; }

    // 1. Конвертируем в RGB
    let r = parseInt(hexValue.substring(0, 2), 16);
    let g = parseInt(hexValue.substring(2, 4), 16);
    let b = parseInt(hexValue.substring(4, 6), 16);

    // 2. Применяем % (percent > 0 = темнее, percent < 0 = светлее)
    const factor = (100 - percent) / 100;
    r = Math.min(255, Math.max(0, Math.floor(r * factor)));
    g = Math.min(255, Math.max(0, Math.floor(g * factor)));
    b = Math.min(255, Math.max(0, Math.floor(b * factor)));

    // 3. Конвертируем обратно в HEX
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}


/**
 * Глобальная функция-компонент для Alpine (x-data="wheelController()")
 */
function wheelController() {
    return {
        // --- 1. Локальное Состояние ---
        options: [],
        isSpinning: false,
        wheelData: {
            gradient: 'background-color: var(--color-accent-secondary)',
            textSectors: []
        },

        // --- 2. Инициализация ---
        init() {
            console.log("--- [DEBUG] wheelController v2.3 (Фикс): Инициализация...");

            // *** [ ИСПРАВЛЕНО ] ***
            // УБИРАЕМ Alpine.effect().
            // Просто загружаем 'options' ОДИН РАЗ из $store.app.config.

            // Ждем, пока $store загрузится (на всякий случай)
            Alpine.nextTick(() => {
                const storeConfig = Alpine.store('app').config;
                if (storeConfig && storeConfig.wheel_options && storeConfig.wheel_options.length > 0) {
                    this.options = JSON.parse(JSON.stringify(storeConfig.wheel_options));
                    console.log(`--- [DEBUG] wheel: Загружено ${this.options.length} опций.`);
                } else {
                    // Дефолтные опции для первого раза
                    this.options = [
                        { id: crypto.randomUUID(), label: "Опция 1" },
                        { id: crypto.randomUUID(), label: "Опция 2" },
                        { id: crypto.randomUUID(), label: "Опция 3" },
                    ];
                }

                // *** Первая отрисовка колеса ***
                this.generateWheelVisuals();
            });

            // *** [ ИСПРАВЛЕНО ] ***
            // Этот $watch следит ТОЛЬКО за 'options'
            // и ТОЛЬКО перерисовывает колесо.
            Alpine.watch(() => this.options, () => {
                console.log("--- [DEBUG] wheel (watch): 'options' изменились. Перерисовка...");
                this.generateWheelVisuals();
            }, { deep: true });

            // *** [ НОВОЕ ] ***
            // Отдельный $watch для 'revert'.
            // Он следит за $store.app.config (а не .form),
            // потому что 'revert' копирует 'config' в 'form'.
            Alpine.watch(() => Alpine.store('app').config, (newConfig) => {
                 if (newConfig && !Alpine.store('app').ui.isDirty) {
                     console.log("--- [DEBUG] wheel (watch config): Обнаружен 'revert'. Перезагрузка 'options'...");
                     this.options = JSON.parse(JSON.stringify(newConfig.wheel_options || []));
                 }
            }, { deep: true });
        },

        // --- 3. Методы Управления Списком ---
        addOption() {
        // *** [ НОВОЕ: Лимит 30 ] ***
        if (this.options.length >= 30) {
            console.warn("--- [DEBUG] wheel: Достигнут лимит (30), добавление отменено.");
            return;
        }
        // *** [ КОНЕЦ ] ***

        console.log("--- [DEBUG] wheel: Добавление опции...");
        this.options.push({ id: crypto.randomUUID(), label: "Новая опция" });
    },
        removeOption(id) {
            console.log(`--- [DEBUG] wheel: Удаление опции ${id}...`);
            this.options = this.options.filter(opt => opt.id !== id);
            // $watch() поймает это
        },
        async saveToDefaults() {
            console.log("--- [DEBUG] wheel: Сохранение опций в config...");
            const store = Alpine.store('app');
            if (!store.form) { /* ... (обработка ошибки) ... */ return; }

            // 1. Обновляем $store.app.form
            store.form.wheel_options = JSON.parse(JSON.stringify(this.options));
            // 2. Помечаем 'dirty'
            store.markDirty();
            // 3. Сохраняем БЕЗ перезагрузки
            const success = await store.saveSettings(store.form, false);

            // 4. Запускаем частицы
            if (success) {
                console.log("--- [DEBUG] wheel: Успешно сохранено, запускаем '✅'");
                if (typeof spawnParticles === 'function' && this.$refs.saveButton) {
                    spawnParticles({
                        originElement: this.$refs.saveButton,
                        symbol: '✅', count: 40, spread: 180, distance: 300, duration: 1200
                    });
                }
            } else {
                console.log("--- [DEBUG] wheel: Ошибка сохранения, запускаем '❌'");
                if (typeof spawnParticles === 'function' && this.$refs.saveButton) {
                    spawnParticles({
                        originElement: this.$refs.saveButton,
                        symbol: '❌', count: 40, spread: 180, distance: 300, duration: 1200
                    });
                }
            }
        },

        // --- 4. Заглушка для Физики ---
        spin() {
            console.log("--- [DEBUG] wheel: SPIN! (Заглушка)...");
        },

        // --- 5. Хелперы Визуализации ---
        get sectors() {
            const activeOptions = this.options.filter(opt => opt.label && opt.label.trim() !== '');
            if (activeOptions.length === 0) {
                return [{ id: 'placeholder', label: '?' }];
            }
            return activeOptions;
        },

        generateWheelVisuals() {
            console.log("--- [DEBUG] wheel: generateWheelVisuals() v2.4 (JS-Матан)");

            const currentSectors = this.sectors;
            const total = currentSectors.length;

            const colorDefault = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-secondary').trim() || '#2A2A2A';
            const colorDarker = changeColorBrightness(colorDefault, 20);
            const colorLighter = changeColorBrightness(colorDefault, -15);

            const segmentAngle = 360 / total;
            let gradientString = 'conic-gradient(';
            let textSectors = [];

            // --- МАТАН ---
            // Радиус текста (в % от полу-ширины колеса)
            // 0% = центр, 100% = край.
            // 50% = середина радиуса (идеально для "по центру сектора")
            const textRadiusPercent = 25;

            // Угол 0 в JS - это 3 часа. Угол 0 у нас - 12 часов.
            // Смещение = -90 градусов
            const angleOffsetRad = -Math.PI / 2; // -90 градусов в радианах
            // --- КОНЕЦ МАТАНА ---

            for (let i = 0; i < total; i++) {
                // ... (Логика цвета 'color' - без изменений) ...
                let color;
                if (total > 1 && total % 2 !== 0 && i === total - 1) {
                    color = colorLighter;
                } else {
                    color = (i % 2 === 0) ? colorDefault : colorDarker;
                }

                const startAngle = segmentAngle * i;
                const endAngle = segmentAngle * (i + 1);

                // 1. Градиент (БЕЗ ГРАНИЦ)
                gradientString += `${color} ${startAngle}deg ${endAngle}deg`;
                if (i < total - 1) gradientString += ', ';

                // 2. Данные для текста

                // Угол ЦЕНТРА сектора (в градусах)
                const textAngleDeg = startAngle + (segmentAngle / 2);
                // Угол ЦЕНТРА сектора (в радианах) + смещение
                const textAngleRad = (textAngleDeg * Math.PI / 180) + angleOffsetRad;

                // Координаты X и Y (в %)
                // 50% (центр) + (смещение по радиусу)
                const x = 50 + (textRadiusPercent * Math.cos(textAngleRad));
                const y = 50 + (textRadiusPercent * Math.sin(textAngleRad));

                // Поворот текста (в градусах)
                // (textAngleDeg + 90) = чтобы текст "лежал" на радиусе
                // (Ты просил "text on the radius" (vertical-rl), так что 90)
                // (Если хочешь горизонтально, как в 701dde, ставь 'textAngleDeg')
                const rotation = textAngleDeg + 90 + 180; // <-- 90 = вдоль радиуса
                // const rotation = textAngleDeg; // <-- 0 = горизонтально

                textSectors.push({
                    id: currentSectors[i].id,
                    label: currentSectors[i].label,
                    // Передаем CSS-строки
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`
                });
            }

            gradientString += ')';

            // Обновляем реактивные данные
            this.wheelData = {
                gradient: gradientString,
                textSectors: textSectors
            };
        }
    };
} // <-- Конец функции wheelController