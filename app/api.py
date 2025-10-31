# /mrhoustontimer/app/api.py
"""Blueprint для обработки API-запросов приложения."""

from datetime import date, datetime # <-- ДОБАВЬ ИМПОРТ datetime
from typing import Tuple, Dict, Any, Optional, List  # <-- ДОБАВЬ Optional
from pathlib import Path

from flask import Blueprint, jsonify, request, Response, current_app, send_from_directory
from pydantic import ValidationError

# Импортируем синглтоны менеджеров конфигурации и лога календаря
from . import config_manager, calendar_log
from .core.config_manager import CustomTimer, AppConfig, WheelOption
from . import config_manager, calendar_log, SOUND_FOLDERS

# Создаем Blueprint 'api' с префиксом '/api'
api_bp = Blueprint('api', __name__)

# Определяем тип для возвращаемых значений Flask view (Response | Tuple[Response, int])
ResponseType = Response | Tuple[Response, int]


# --- API для Конфигурации (/api/config) ---

@api_bp.route('/config', methods=['GET'])
def get_config() -> ResponseType:
    """Возвращает текущую конфигурацию приложения.

    Метод: GET /api/config
    Возвращает:
        JSON: Объект конфигурации приложения (из config.json).
        500 Internal Server Error: Если произошла ошибка при чтении конфига.
    """
    try:
        current_config = config_manager.get_config()
        # model_dump(mode="json") обеспечивает корректную сериализацию datetime и др.
        return jsonify(current_config.model_dump(mode="json"))
    except Exception as e:
        current_app.logger.error(f"Ошибка при получении конфига: {e}", exc_info=True)
        return jsonify({"error": "Internal server error reading config"}), 500


@api_bp.route('/config', methods=['POST'])
def update_config() -> ResponseType:
    """Обновляет конфигурацию приложения.

    Метод: POST /api/config
    Тело запроса (JSON):
        Новый объект конфигурации, соответствующий схеме AppConfig.
    Возвращает:
        JSON: Обновленный объект конфигурации.
        400 Bad Request: Если тело запроса отсутствует, не является JSON или не соответствует схеме.
        500 Internal Server Error: Если произошла ошибка при сохранении конфига.
    """
    new_data: Optional[Dict[str, Any]] = request.get_json()
    if not new_data:
        current_app.logger.warning("Попытка обновить конфиг без данных в теле запроса.")
        return jsonify({"error": "Request body must contain JSON data"}), 400

    try:
        updated_config = config_manager.update_config(new_data)
        current_app.logger.info("Конфигурация успешно обновлена.")
        return jsonify(updated_config.model_dump(mode="json"))
    except ValidationError as e:
        current_app.logger.warning(f"Ошибка валидации при обновлении конфига: {e.errors()}")
        # Возвращаем ошибки валидации Pydantic для фронтенда
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except Exception as e:
        current_app.logger.error(f"Ошибка при обновлении конфига: {e}", exc_info=True)
        return jsonify({"error": "Internal server error saving config"}), 500

@api_bp.route('/config/defaults', methods=['GET'])
def get_default_config() -> ResponseType:
    """Возвращает дефолтную конфигурацию приложения (простой вариант)."""
    try:
        # *** ИЗМЕНЕНО: Создаем экземпляр импортированного класса ***
        default_config = AppConfig()

        try:
             if not default_config.timers.custom_timers:
                 # *** ИЗМЕНЕНО: Используем импортированный CustomTimer ***
                 default_config.timers.custom_timers.append(
                     CustomTimer(label="Со дня знакомства", date=datetime(2023, 1, 1, 12, 0, 0))
                 )
                 default_config.timers.custom_timers.append(
                     CustomTimer(label="Она моя невеста уже", date=datetime(2024, 1, 1, 12, 0, 0))
                 )
        except Exception as timer_err:
             current_app.logger.warning(f"Не удалось добавить дефолтные таймеры: {timer_err}")

        current_app.logger.info("Возвращаем дефолтный конфиг (простой вариант).")
        return jsonify(default_config.model_dump(mode="json"))

    except Exception as e:
        current_app.logger.error(f"Ошибка при получении дефолтного конфига: {e}", exc_info=True)
        return jsonify({"error": "Internal server error getting default config"}), 500


@api_bp.route('/config/reset_all', methods=['POST'])
def reset_all_config() -> ResponseType:
    """
    Создает бэкап и сбрасывает config.json к дефолтным значениям.
    """
    try:
        current_app.logger.warning("!!! ПОЛУЧЕН ЗАПРОС НА ПОЛНЫЙ СБРОС НАСТРОЕК !!!")

        # Вызываем новый метод менеджера из config_manager.py
        new_default_config = config_manager.backup_and_reset_config()

        current_app.logger.info("Настройки успешно сброшены и создан бэкап.")
        # Возвращаем новый дефолтный конфиг
        return jsonify(new_default_config.model_dump(mode="json"))

    except Exception as e:
        current_app.logger.error(f"Ошибка при полном сбросе конфига: {e}", exc_info=True)
        return jsonify({"error": "Internal server error resetting config"}), 500
# --- API для Календаря (/api/calendar_log, /api/calendar/*) ---

@api_bp.route('/calendar_log', methods=['GET'])
def get_calendar_log() -> ResponseType:
    """Возвращает текущий лог отмеченных дат календаря.

    Метод: GET /api/calendar_log
    Возвращает:
        JSON: Объект лога календаря (из calendar_log.json).
        500 Internal Server Error: Если произошла ошибка при чтении лога.
    """
    try:
        current_log = calendar_log.get_log()
        return jsonify(current_log.model_dump(mode="json"))
    except Exception as e:
        current_app.logger.error(f"Ошибка при получении лога календаря: {e}", exc_info=True)
        return jsonify({"error": "Internal server error reading calendar log"}), 500


@api_bp.route('/calendar/toggle', methods=['POST'])
def toggle_calendar_date() -> ResponseType:
    """Переключает отметку (стикер) на указанной дате.

    Метод: POST /api/calendar/toggle
    Тело запроса (JSON):
        { "date": "YYYY-MM-DD" }
    Возвращает:
        JSON: {"status": "added" | "removed", "entry": Optional[dict]} - результат операции.
        400 Bad Request: Если тело запроса отсутствует, нет ключа 'date' или формат даты неверный.
        500 Internal Server Error: Если произошла ошибка при обновлении лога.
    """
    data: Optional[Dict[str, Any]] = request.get_json()
    if not data:
        current_app.logger.warning("Попытка /calendar/toggle без данных.")
        return jsonify({"error": "Request body must contain JSON data"}), 400

    date_str: Optional[str] = data.get('date')
    if not date_str:
        current_app.logger.warning("Попытка /calendar/toggle без ключа 'date'.")
        return jsonify({"error": "Missing 'date' key in request body"}), 400

    try:
        date_obj = date.fromisoformat(date_str)
    except ValueError:
        current_app.logger.warning(f"Неверный формат даты в /calendar/toggle: {date_str}")
        return jsonify({"error": "Invalid date format, use YYYY-MM-DD"}), 400

    try:
        # Получаем текущие настройки стикера из конфига
        current_config = config_manager.get_config()
        result = calendar_log.toggle_date(
            date_to_toggle=date_obj,
            sticker=current_config.sticker_emoji,
            max_rotation=current_config.sticker_random_rotation_max
        )
        current_app.logger.info(f"Отметка для {date_str} переключена: {result.get('status')}")
        return jsonify(result)
    except Exception as e:
        current_app.logger.error(f"Ошибка при переключении отметки для {date_str}: {e}", exc_info=True)
        return jsonify({"error": "Internal server error updating calendar log"}), 500

@api_bp.route('/audio_manifest', methods=['GET'])
def get_audio_manifest() -> ResponseType:
    """
    Сканирует файловую систему и возвращает JSON-манифест
    с ОТНОСИТЕЛЬНЫМИ HTTP-путями к .mp3 файлам.
    """
    current_app.logger.info("--- [АУДИО] Запрос /api/audio_manifest...")
    manifest: Dict[str, List[str]] = {}

    try:
        # Используем путь, который мы сохранили в app.config
        sounds_dir = current_app.config.get('SOUNDS_FOLDER') # <-- ИЗМЕНЕНО

        if not sounds_dir or not sounds_dir.exists():
            current_app.logger.warning(f"--- [АУДИО] Папка {sounds_dir} не найдена.")
            return jsonify({})

        for folder_name in SOUND_FOLDERS:
            folder_path = sounds_dir / folder_name
            if not folder_path.exists():
                manifest[folder_name] = []
                continue

            # *** [ ИЗМЕНЕНО: Создаем HTTP-пути ] ***
            file_paths = []
            for p in folder_path.glob('*.mp3'):
                # p.name = "HeartBeatOne.mp3"
                # folder_name = "Heartbeat"
                # Результат: "/audio/Heartbeat/HeartBeatOne.mp3"
                http_path = f"/api/audio/{folder_name}/{p.name}"
                file_paths.append(http_path)
            # *** [ КОНЕЦ ИЗМЕНЕНИЙ ] ***

            manifest[folder_name] = file_paths

        current_app.logger.info(f"--- [АУДИО] Манифест успешно создан (HTTP-пути).")
        return jsonify(manifest)

    except Exception as e:
        current_app.logger.error(f"!!! [АУДИО] Ошибка при сканировании папок звуков: {e}", exc_info=True)
        return jsonify({"error": "Internal server error scanning audio"}), 500


@api_bp.route('/audio/<path:category>/<path:filename>')
def serve_audio_file(category: str, filename: str) -> ResponseType:
    """
    Безопасно отдает .mp3 файл из папки AppData/sounds/<category>.
    """
    try:
        sounds_dir = current_app.config.get('SOUNDS_FOLDER')
        if not sounds_dir:
            raise ValueError("Путь к папке 'sounds' не сконфигурирован.")

        if category not in SOUND_FOLDERS:
            current_app.logger.warning(f"[АУДИО] Попытка доступа к неразрешенной папке: {category}")
            return "Forbidden", 403

        directory_path = Path(sounds_dir) / category

        current_app.logger.info(f"--- [АУДИО] Попытка отдать файл: {filename}")
        current_app.logger.info(f"--- [АУДИО] ...из директории: {directory_path}")

        return send_from_directory(
            directory_path,
            filename,
            as_attachment=False
        )

    except FileNotFoundError:
        current_app.logger.error(f"!!! [АУДИО] Файл НЕ НАЙДЕН (404): {category}/{filename}")
        return "File Not Found", 404
    except Exception as e:
        current_app.logger.error(f"!!! [АУДИО] Ошибка при раздаче файла: {e}", exc_info=True)
        return "Server Error", 500

@api_bp.route('/calendar/reset', methods=['POST'])
def reset_calendar() -> ResponseType:
    """Сбрасывает (очищает) лог отмеченных дат календаря.

    Метод: POST /api/calendar/reset
    Возвращает:
        JSON: Пустой объект лога календаря.
        500 Internal Server Error: Если произошла ошибка при сбросе лога.
    """
    try:
        calendar_log.reset_log()
        current_app.logger.info("Лог календаря сброшен.")
        # Возвращаем новый пустой лог для консистентности
        return jsonify(calendar_log.get_log().model_dump(mode="json"))
    except Exception as e:
        current_app.logger.error(f"Ошибка при сбросе лога календаря: {e}", exc_info=True)
        return jsonify({"error": "Internal server error resetting calendar log"}), 500