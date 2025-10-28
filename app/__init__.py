# /mrhoustontimer/app/__init__.py
"""Инициализация Flask-приложения и его компонентов."""

import os
from pathlib import Path
from typing import Optional

from flask import Flask

# Импортируем синглтоны менеджеров конфигурации и лога календаря
from .core.config_manager import ConfigManager
from .core.calendar_log import CalendarLog

# Создаем глобальные экземпляры менеджеров (синглтоны)
# Пути будут установлены позже в create_app
config_manager: ConfigManager = ConfigManager(None)
calendar_log: CalendarLog = CalendarLog(None)

# Определяем абсолютный путь к корневой директории приложения ('app')
APP_ROOT: str = os.path.dirname(os.path.abspath(__file__))
# Определяем абсолютные пути к папкам 'static' и 'templates'
STATIC_FOLDER: str = os.path.join(APP_ROOT, 'static')
TEMPLATE_FOLDER: str = os.path.join(APP_ROOT, 'templates')


def create_app(save_dir_path: str) -> Flask:
    """Фабрика для создания и конфигурации экземпляра Flask-приложения.

    Args:
        save_dir_path: Абсолютный путь к директории для сохранения файлов config.json и calendar_log.json.

    Returns:
        Сконфигурированный экземпляр Flask-приложения.
    """
    print(f"--- Инициализация Flask-приложения ---")
    print(f"Static folder: {STATIC_FOLDER}")
    print(f"Template folder: {TEMPLATE_FOLDER}")

    # Создаем экземпляр Flask, явно указывая пути к static и templates
    app = Flask(__name__,
                static_folder=STATIC_FOLDER,
                template_folder=TEMPLATE_FOLDER)

    # --- Конфигурация Менеджеров ---
    save_dir = Path(save_dir_path)
    config_path = save_dir / "config.json"
    log_path = save_dir / "calendar_log.json"

    try:
        # Инициализируем менеджеры путями к файлам
        config_manager.init_app(config_path)
        calendar_log.init_app(log_path)

        # Загружаем данные или создаем файлы по умолчанию
        config_manager.load_or_create_defaults()
        calendar_log.load_or_create()
        print("--- Менеджеры конфигурации и лога успешно инициализированы ---")
    except Exception as e:
        # Критическая ошибка при работе с файлами сохранения
        print(f"!!! КРИТИЧЕСКАЯ ОШИБКА: Не удалось загрузить/создать файлы сохранения: {e}")
        # В реальном приложении здесь можно показать страницу ошибки или выйти
        # exit(1) # Раскомментируй, если нужно прерывать запуск при ошибке

    # --- Регистрация Blueprints (маршрутов) ---
    try:
        from . import main # Маршруты для HTML страниц
        from . import api  # Маршруты для API (/api/...)

        app.register_blueprint(main.main_bp)
        app.register_blueprint(api.api_bp, url_prefix='/api') # Явно указываем префикс API
        print("--- Blueprints (main, api) зарегистрированы ---")
    except ImportError as e:
        print(f"!!! КРИТИЧЕСКАЯ ОШИБКА: Не удалось импортировать blueprints: {e}")
        # exit(1) # Раскомментируй, если нужно прерывать запуск

    return app