/**
 * @fileoverview v2.0 (С НУЛЯ)
 * Реактивное ядро приложения на Alpine.js.
 * Шаг 1: Инициализация и загрузка конфига.
 */

document.addEventListener('alpine:init', () => {
    console.log("--- [DEBUG] Alpine.js: Инициализация хранилища...");

    Alpine.store('app', {

        // --- 1. Глобальное Состояние (STATE) ---
        config: null,        // Загрузится из /api/config
        // log: null,        // (Добавим на Шаге 3)
        // lang: {},         // (Добавим на Шаге 2)
        ui: {
            // currentPage: 'page-main', // (Добавим на Шаге 2)
            isLoaded: false,          // Флаг завершения начальной загрузки
            error: null,              // Глобальная ошибка
        },

        // --- 2. Инициализация (INIT) ---
        async init() {
            console.log("--- [DEBUG] Store.init(): Старт...");
            try {
                // Загружаем ПОКА ТОЛЬКО конфиг
                const configRes = await fetch('/api/config');

                if (!configRes.ok) {
                    throw new Error(`Ошибка API /api/config: ${configRes.status}`);
                }

                this.config = await configRes.json();
                console.log("--- [DEBUG] Store.init(): Конфиг загружен.");

                // (Язык и Лог загрузим позже)

                console.log("--- [DEBUG] Store.init(): УСПЕХ.");
                this.ui.isLoaded = true; // <--- Приложение готово к показу!

            } catch (error) {
                console.error("--- [DEBUG] КРИТИЧЕСКАЯ ОШИБКА в Store.init():", error);
                this.ui.error = error.message;
            }
        },

        // --- 3. Методы (ACTIONS) ---
        // (Добавим navigateTo и toggleDate позже)

    });
});