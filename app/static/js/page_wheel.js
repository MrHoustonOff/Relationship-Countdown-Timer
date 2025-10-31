/**
 * @fileoverview v2.0 - Контроллер для страницы "Колесо Фортуны".
 * Определяет ГЛОБАЛЬНУЮ функцию wheelController, которую найдет Alpine.
 */

// УБИРАЕМ document.addEventListener('alpine:init', ...)
// Alpine.data('wheelController', () => ({ ... })
// и ЗАМЕНЯЕМ на:

function wheelController() {
    return {

        // --- 1. Локальное Состояние ---
        options: [],       // Временный/рабочий список опций
        isSpinning: false, // (Заглушка для кнопки)

        // --- 2. Инициализация ---
        init() {
            console.log("--- [DEBUG] wheelController v2.0: Инициализация...");

            // Ждем, пока $store.app.config точно загрузится
            // (Alpine.store('app').init() - асинхронный)
            Alpine.effect(() => {
                const storeConfig = Alpine.store('app').config;
                if (storeConfig) {
                    console.log("--- [DEBUG] wheel: Config загружен, инициализируем опции.");
                    if (storeConfig.wheel_options && storeConfig.wheel_options.length > 0) {
                        this.options = JSON.parse(JSON.stringify(storeConfig.wheel_options));
                        console.log(`--- [DEBUG] wheel: Загружено ${this.options.length} опций.`);
                    } else {
                        console.log("--- [DEBUG] wheel: Сохраненных опций не найдено.");
                    }
                }
            });
        },

        // --- 3. Методы Управления Списком ---
        addOption() {
            console.log("--- [DEBUG] wheel: Добавление опции...");
            this.options.push({ id: crypto.randomUUID(), label: "Новая опция" });
        },
        removeOption(id) {
            console.log(`--- [DEBUG] wheel: Удаление опции ${id}...`);
            this.options = this.options.filter(opt => opt.id !== id);
        },
        async saveToDefaults() {
            console.log("--- [DEBUG] wheel: Сохранение опций в config...");
            const store = Alpine.store('app');

            if (!store.form) {
                console.error("!!! wheel.saveToDefaults: $store.app.form не найден!");
                alert("Ошибка: Не удалось найти форму настроек.");
                return;
            }

            // 1. Обновляем $store.app.form (копию)
            store.form.wheel_options = JSON.parse(JSON.stringify(this.options));

            // 2. Помечаем форму как "грязную"
            store.markDirty();

            // 3. Вызываем ГЛОБАЛЬНЫЙ метод сохранения и ЖДЕМ ответа
            // (saveSettings вернет true в случае успеха, false в случае ошибки)
            const success = await store.saveSettings(store.form, false); // false = не перезагружать

            // 4. Проверяем результат и запускаем частицы
            if (success) {
                // *** [ НОВОЕ: Эффект Успеха ] ***
                console.log("--- [DEBUG] wheel: Успешно сохранено, запускаем '✅'");
                if (typeof spawnParticles === 'function' && this.$refs.saveButton) {
                    spawnParticles({
                        originElement: this.$refs.saveButton, // Элемент кнопки
                        symbol: '✅',
                        count: 40,
                        spread: 180, // Полукруг вверх
                        distance: 300,
                        duration: 1200
                    });
                }
            } else {
                // *** [ НОВОЕ: Эффект Ошибки ] ***
                console.log("--- [DEBUG] wheel: Ошибка сохранения, запускаем '❌'");
                if (typeof spawnParticles === 'function' && this.$refs.saveButton) {
                    spawnParticles({
                        originElement: this.$refs.saveButton,
                        symbol: '❌',
                        count: 40,
                        spread: 180,
                        distance: 300,
                        duration: 1200
                    });
                }
            }

            // Убираем старый alert
            // alert("Список опций сохранен!");
        },

        // --- 4. Заглушка для Физики ---
        spin() {
            console.log("--- [DEBUG] wheel: SPIN! (Заглушка)...");
        },
    };
} // <-- Конец функции wheelController