# /mrhoustontimer/app/__init__.py
"""Инициализация Flask-приложения и его компонентов."""

import os
import sys
from pathlib import Path
from typing import Optional, List

from flask import Flask

# Импортируем синглтоны менеджеров конфигурации и лога календаря
from .core.config_manager import ConfigManager
from .core.calendar_log import CalendarLog

# Создаем глобальные экземпляры менеджеров (синглтоны)
# Пути будут установлены позже в create_app
config_manager: ConfigManager = ConfigManager(None)
calendar_log: CalendarLog = CalendarLog(None)


def resource_path(relative_path: str) -> str:
    """
    Возвращает абсолютный путь к ресурсу, упакованному PyInstaller.

    Когда приложение скомпилировано, PyInstaller создает временную папку
    (_MEIPASS), где лежат все ресурсы.
    """
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        # При запуске из PyInstaller, базовый путь - это _MEIPASS.
        # Поскольку в .spec вы указали ('app/static', 'static'),
        # папки templates и static находятся в корне _MEIPASS.
        base_path = sys._MEIPASS
    else:
        # При запуске в режиме разработки, базовый путь - это корень приложения.
        # (Вероятно, это A:\05_Coding\00_LOVE_TIMER\app)
        base_path = os.path.dirname(os.path.abspath(__file__))

    return os.path.join(base_path, relative_path)
# Определяем абсолютный путь к корневой директории приложения ('app')
APP_ROOT: str = os.path.dirname(os.path.abspath(__file__))
# Определяем абсолютные пути к папкам 'static' и 'templates'
STATIC_FOLDER: str = resource_path('static')
TEMPLATE_FOLDER: str = resource_path('templates')

SOUND_FOLDERS: List[str] = [
    'Heartbeat',
    'switchPage',
    'calendarDay',
    'CalendarMonth',
    'Wheel',
    'PlusButtons',
    'DeleteButtons',
    'WheelBoost',
    'WheelEnd',
    'WheelStop'
]

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

    try:
        print("--- [АУДИО] Проверка/создание папок для звуков...")
        sounds_root_path = save_dir / "sounds"
        sounds_root_path.mkdir(exist_ok=True)  # Создаем /sounds

        app.config['SOUNDS_FOLDER'] = sounds_root_path

        for folder_name in SOUND_FOLDERS:
            (sounds_root_path / folder_name).mkdir(exist_ok=True)  # Создаем /sounds/Heartbeat и т.д.

        print(f"--- [АУДИО] Файловая структура звуков в {sounds_root_path} проверена.")
    except (IOError, OSError) as e:
        print(f"!!! [АУДИО] НЕКРИТИЧНАЯ ОШИБКА: Не удалось создать папки звуков: {e}")

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