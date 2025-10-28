# /mrhoustontimer/app/__init__.py
from flask import Flask
from pathlib import Path
import os
# --- Импорты ядра (с точкой) ---
from .core.config_manager import ConfigManager
from .core.calendar_log import CalendarLog

# Создаем "синглтоны"
config_manager = ConfigManager(None)
calendar_log = CalendarLog(None)

# --- НОВЫЙ "ПУЛЕНЕПРОБИВАЕМЫЙ" КОД ---
# Находим абсолютный путь к папке, где лежит этот файл (__init__.py)
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
# Строим абсолютные пути к папкам static и templates
STATIC_FOLDER = os.path.join(APP_ROOT, 'static')
TEMPLATE_FOLDER = os.path.join(APP_ROOT, 'templates')


# --- КОНЕЦ НОВОГО КОДА ---

def create_app(save_dir_path: str):
    """
    Фабрика для создания нашего Flask-приложения.
    """

    # --- ИСПОЛЬЗУЕМ АБСОЛЮТНЫЕ ПУТИ ---
    app = Flask(__name__,
                static_folder=STATIC_FOLDER,
                template_folder=TEMPLATE_FOLDER)

    # 1. Определяем пути к файлам сохранения
    save_dir = Path(save_dir_path)
    config_path = save_dir / "config.json"
    log_path = save_dir / "calendar_log.json"

    # 2. Инициализируем менеджеры
    config_manager.init_app(config_path)
    calendar_log.init_app(log_path)

    try:
        config_manager.load_or_create_defaults()
        calendar_log.load_or_create()
    except Exception as e:
        print(f"CRITICAL ERROR: Could not load or create save files: {e}")

    # 3. Регистрируем роуты
    from . import main
    from . import api

    app.register_blueprint(main.main_bp)
    app.register_blueprint(api.api_bp)

    return app