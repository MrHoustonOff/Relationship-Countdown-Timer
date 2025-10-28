# /mrhoustontimer/app/api.py
"""Blueprint для обработки API-запросов приложения."""

from datetime import date
from typing import Tuple, Dict, Any

from flask import Blueprint, jsonify, request, Response, current_app
from pydantic import ValidationError

# Импортируем синглтоны менеджеров конфигурации и лога календаря
from . import config_manager, calendar_log

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