# /mrhoustontimer/app/api.py
from flask import Blueprint, jsonify, request
from pydantic import ValidationError
from datetime import date

# Импортируем наши "синглтоны" менеджеров
from . import config_manager, calendar_log

api_bp = Blueprint('api', __name__, url_prefix='/api')


# --- API для Конфига (ТЗ 2.1, ТЗ 6) ---

@api_bp.route('/config', methods=['GET'])
def get_config():
    """Возвращает весь config.json"""
    # Pydantic модели можно легко превратить в dict для JSON
    return jsonify(config_manager.get_config().model_dump(mode="json"))


@api_bp.route('/config', methods=['POST'])
def update_config():
    """Обновляет config.json (для страницы настроек)"""
    new_data = request.get_json()
    if not new_data:
        return jsonify({"error": "No data provided"}), 400

    try:
        updated_config = config_manager.update_config(new_data)
        return jsonify(updated_config.model_dump(mode="json"))
    except ValidationError as e:
        # Pydantic вернет красивые ошибки валидации
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400


# --- API для Календаря (ТЗ 2.2, ТЗ 5.2) ---

@api_bp.route('/calendar_log', methods=['GET'])
def get_calendar_log():
    """Возвращает весь calendar_log.json"""
    return jsonify(calendar_log.get_log().model_dump(mode="json"))


@api_bp.route('/calendar/toggle', methods=['POST'])
def toggle_calendar_date():
    """Переключает отметку на дне (ТЗ 5.2)"""
    data = request.get_json()
    date_str = data.get('date')

    if not date_str:
        return jsonify({"error": "No 'date' provided"}), 400

    try:
        date_obj = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({"error": "Invalid date format, use YYYY-MM-DD"}), 400

    # Берем настройки стикера из текущего конфига
    config = config_manager.get_config()

    result = calendar_log.toggle_date(
        date_to_toggle=date_obj,
        sticker=config.sticker_emoji,
        max_rotation=config.sticker_random_rotation_max
    )

    return jsonify(result)


@api_bp.route('/calendar/reset', methods=['POST'])
def reset_calendar():
    """Сбрасывает календарь (ТЗ 6.2)"""
    calendar_log.reset_log()
    # Возвращаем новый (пустой) лог
    return jsonify(calendar_log.get_log().model_dump(mode="json"))