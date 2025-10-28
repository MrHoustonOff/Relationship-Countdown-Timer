# /mrhoustontimer/app/__init__.py
from flask import Flask
from pathlib import Path
from .core.config_manager import ConfigManager
from .core.calendar_log import CalendarLog

# Создаем "синглтоны" наших менеджеров.
# Они будут жить, пока работает приложение.
# Мы инициализируем их здесь, но загрузим данные внутри create_app.
config_manager = ConfigManager(None)
calendar_log = CalendarLog(None)


def create_app(save_dir_path: str):
    """
    Фабрика для создания нашего Flask-приложения.
    """
    app = Flask(__name__)

    # 1. Определяем пути к файлам сохранения
    save_dir = Path(save_dir_path)
    config_path = save_dir / "config.json"
    log_path = save_dir / "calendar_log.json"

    # 2. Инициализируем и загружаем наши менеджеры
    # (они уже созданы выше, мы просто даем им пути)
    config_manager.init_app(config_path)
    calendar_log.init_app(log_path)

    # 3. Загружаем данные или создаем дефолтные файлы
    try:
        config_manager.load_or_create_defaults()
        calendar_log.load_or_create()
    except Exception as e:
        print(f"CRITICAL ERROR: Could not load or create save files: {e}")
        # В реальном приложении здесь можно было бы показать страницу ошибки

    # 4. Регистрируем наши роуты (Blueprints)
    from . import main
    from . import api

    app.register_blueprint(main.main_bp)
    app.register_blueprint(api.api_bp)

    return app