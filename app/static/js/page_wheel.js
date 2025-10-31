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

        // *** [ НОВОЕ: Состояние Физики ] ***
        angle: 0,          // Текущий угол поворота (в градусах)
        velocity: 0,       // Текущая скорость (градусов/кадр)
        friction: 0.998,   // Трение (0.998 = медленно, 0.99 = быстро)
        isSpinning: false, // Флаг, что идет кручение
        animationFrameId: null, // ID для requestAnimationFrame

        // Константы Физики (можем вынести в настройки)
        MIN_VELOCITY: 0.01,   // Скорость, на которой колесо "останавливается"
        MAX_VELOCITY: 70,    // Максимальный "кламп" скорости
        FRICTION_FAST: 0.998, // Самое быстрое (твое "сейчас")
        FRICTION_SLOW: 0.99, // Самое медленное ("повесомее")

        particleList: [
            '👉','👈', '🌚', '💕','❤️','🫦','😶‍🌫️','😍','👍','🤦‍♂️',
            '🥲','🤬','🤡','💩','👺','👽','👿','🐽','🐒','🐳',
            '🦉','👁️','👀','🧌','🤷‍♂️','🙆‍♂️','🕺','💃','👃','🤌'
        ],

        previousAngle: 0,    // Угол в прошлом кадре
        boundaryAngles: [],  // Массив углов границ [0, 90, 180, 270]

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
            this.update = this.update.bind(this); // Привязываем 'this'
            this.update(); // Запускаем цикл
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
            // Игнорируем, если уже крутится (пока нет "докрутки")
            if (this.isSpinning) {
                // --- СТУЛ 2: "ДОКРУЧИВАНИЕ" ---
                this.friction = Math.random() * (this.FRICTION_FAST - this.FRICTION_SLOW) + this.FRICTION_SLOW;
                console.log("--- [DEBUG] wheel: Докручиваем (Текущая v и f: " + this.velocity.toFixed(2) + ")" + this.friction.toFixed(3));

                let boost;
                // (Твоя логика: "чем быстрее, тем меньше сила")
                if (this.velocity > 30) {
                    boost = (Math.random() * 2.5) + 2.5; // (5-10)
                } else if (this.velocity > 15) {
                    boost = (Math.random() * 5) + 5; // (10-20)
                } else {
                    boost = (Math.random() * 7.5) + 10; // (20-35)
                }

                console.log("--- [DEBUG] wheel: +++ Boost: " + boost.toFixed(2));
                this.velocity += boost;

                let particleCount = 0;
                // Проверяем НОВУЮ скорость
                if (this.velocity > 30) {
                    particleCount = 6;
                } else if (this.velocity > 20) {
                    particleCount = 4;
                } else if (this.velocity > 10) {
                    particleCount = 2;
                } else if (this.velocity > 0) {
                    particleCount = 1;
                }

                if (particleCount > 0 && typeof spawnParticles === 'function' && this.$refs.spinButton) {
                    console.log(`--- [DEBUG] wheel: Запуск ${particleCount} частиц докрутки!`);
                    spawnParticles({
                        originElement: this.$refs.spinButton, // Наша кнопка
                        symbol: '🔥', // Огонь!
                        count: particleCount,
                        spread: 360, // Во все стороны
                        distance: 250, // Не слишком далеко
                        duration: 5000 // Быстро
                    });
                }
            } else {
                console.log("--- [DEBUG] wheel: Начальный спин!");

                // 1. Рандомное Трение (Твоя идея)
                this.friction = Math.random() * (this.FRICTION_FAST - this.FRICTION_SLOW) + this.FRICTION_SLOW;
                console.log("--- [DEBUG] wheel: Новое трение: " + this.friction.toFixed(4));

                // 2. Рандомный Сильный Импульс
                this.velocity = (Math.random() * 50) + 30; // (50-100)

                this.isSpinning = true;
            }
            if (this.velocity > this.MAX_VELOCITY) {
                console.warn("--- [DEBUG] wheel: СКОРОСТЬ МАКСИМАЛЬНА! (Clamped)");
                this.velocity = this.MAX_VELOCITY;
            }
        },
        /**
         * "Игровой Цикл" - вызывается 60 раз/сек
         */
        update() {
            // (Этот код мы уже писали в Этапе 3, просто убедись, что он есть)
            if (this.velocity > this.MIN_VELOCITY) {
                this.isSpinning = true;

                // 1. Применяем трение (замедление)
                this.velocity *= this.friction;

                // 2. Обновляем угол
                this.angle += this.velocity;
                this.angle %= 360; // Держим угол 0-360

                // Проверяем, "перепрыгнули" ли мы через 0 (360)
                // (e.g., previousAngle = 359.8, angle = 0.5)
                if (this.angle < this.previousAngle) {
                    // Мы пересекли ГЛАВНУЮ границу (0/360)
                    this.triggerSectorCross();
                }

                // Проверяем остальные границы (90, 180, 270...)
                for (const boundary of this.boundaryAngles) {
                    // Если граница была МЕЖДУ прошлым углом и текущим
                    if (this.previousAngle < boundary && this.angle >= boundary) {
                        this.triggerSectorCross();
                    }
                }

            } else if (this.isSpinning) {
                // Колесо остановилось
                this.isSpinning = false;
                this.velocity = 0;
                this.triggerStopEffect();
                console.log("--- [DEBUG] wheel: Остановка.");
            }

            this.previousAngle = this.angle;

            // 3. Запрашиваем следующий кадр
            this.animationFrameId = requestAnimationFrame(this.update);
        },

        stopSpin() {
            if (!this.isSpinning) return; // Нечего останавливать

            console.log("--- [DEBUG] wheel: STOP! (Клик по стрелке)");

            // (Твоя "минимальная прокрутка")
            this.velocity = Math.min(this.velocity, 1); // Еле-еле
            this.friction = 0.95; // Огромное трение, остановится за ~3-4 кадра
        },
        triggerSectorCross() {
            console.log("--- [ЗВУК] ПЕРЕСЕКЛА!");

            // Выпускаем "галочку" из стрелки
            if (typeof spawnParticles === 'function' && this.$refs.wheelPointer) {
                 spawnParticles({
                    originElement: this.$refs.wheelPointer,
                    symbol: '✨', // Огонек (пока что)
                    count: 1,
                    spread: 45, // Вниз
                    distance: 600, // Близко
                    duration: 500,
                    aim: -1,
                    deg_aim: 45
                });
            }
            // (Здесь будет `AudioManager.playRandom('wheel_tick')`)
        },
        // --- 5. Хелперы Визуализации ---
        get sectors() {
            const activeOptions = this.options.filter(opt => opt.label && opt.label.trim() !== '');
            if (activeOptions.length === 0) {
                return [{ id: 'placeholder', label: '?' }];
            }
            return activeOptions;
        },
        triggerStopEffect() {
            console.log("--- [ЭФФЕКТ] Колесо остановилось, запускаем ВЗРЫВ!");

            // Проверяем, что эффекты включены в ГЛОБАЛЬНОМ конфиге
            if (!Alpine.store('app').config.effects_enabled) return;

            if (typeof spawnParticles !== 'function' || !this.$refs.wheelSpinner) {
                 console.warn("--- [ЭФФЕКТ] spawnParticles или wheelSpinner не найден!");
                 return;
            }

            // 1. Выбираем случайный символ из списка
            const randomSymbol = this.particleList[Math.floor(Math.random() * this.particleList.length)];

            // 2. Запускаем "взрыв"
            spawnParticles({
                originElement: this.$refs.wheelSpinner, // Центр колеса
                symbol: randomSymbol, // Твой случайный символ
                count: 100,        // Много!
                spread: 360,      // Во все стороны
                distance: 500,    // Далеко
                duration: 5000,   // Долго
                particleClass: 'wheel-stop-particle' // (Для кастомного CSS)
            });
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
            let newBoundaryAngles = [];

            const textRadiusPercent = 25;

            const angleOffsetRad = -Math.PI / 2; // -90 градусов в радианах

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

                gradientString += `${color} ${startAngle}deg ${endAngle}deg`;
                if (i < total - 1) gradientString += ', ';

                if (startAngle > 0) {
                    newBoundaryAngles.push(startAngle);
                }

                const textAngleDeg = startAngle + (segmentAngle / 2);
                const textAngleRad = (textAngleDeg * Math.PI / 180) + angleOffsetRad;

                const x = 50 + (textRadiusPercent * Math.cos(textAngleRad));
                const y = 50 + (textRadiusPercent * Math.sin(textAngleRad));

                const rotation = textAngleDeg + 90 + 180; // <-- 90 = вдоль радиуса

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

            this.boundaryAngles = newBoundaryAngles;
            console.log("--- [DEBUG] wheel: Границы секторов:", this.boundaryAngles);
        }
    };
} // <-- Конец функции wheelController