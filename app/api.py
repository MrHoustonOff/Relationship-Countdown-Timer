# /mrhoustontimer/app/api.py
"""
Blueprint for handling Application API requests.
Connects the frontend with ConfigManager and CalendarLog.
"""

from datetime import date, datetime
from typing import Tuple, Dict, Any, Optional, List
from pathlib import Path

from flask import Blueprint, jsonify, request, Response, current_app, send_from_directory
from pydantic import ValidationError

# Import core managers and constants
from . import config_manager, calendar_log, SOUND_FOLDERS
from .core.config_manager import CustomTimer, AppConfig

# Create 'api' Blueprint
api_bp = Blueprint('api', __name__)

# Type alias for Flask route responses
ResponseType = Response | Tuple[Response, int]


# ==============================================================================
# Configuration API (/api/config)
# ==============================================================================

@api_bp.route('/config', methods=['GET'])
def get_config() -> ResponseType:
    """
    Retrieve the current application configuration.

    Method: GET /api/config
    Returns:
        JSON: AppConfig object.
        500: If reading config fails.
    """
    try:
        current_config = config_manager.get_config()
        return jsonify(current_config.model_dump(mode="json"))
    except Exception as e:
        current_app.logger.error(f"Error getting config: {e}", exc_info=True)
        return jsonify({"error": "Internal server error reading config"}), 500


@api_bp.route('/config', methods=['POST'])
def update_config() -> ResponseType:
    """
    Update the application configuration.

    Method: POST /api/config
    Body: JSON object matching AppConfig schema.
    Returns:
        JSON: Updated AppConfig object.
        400: Validation error.
        500: Save error.
    """
    new_data: Optional[Dict[str, Any]] = request.get_json()
    if not new_data:
        current_app.logger.warning("Update config attempt with empty body.")
        return jsonify({"error": "Request body must contain JSON data"}), 400

    try:
        updated_config = config_manager.update_config(new_data)
        current_app.logger.info("Configuration successfully updated.")
        return jsonify(updated_config.model_dump(mode="json"))
    except ValidationError as e:
        current_app.logger.warning(f"Config validation failed: {e.errors()}")
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except Exception as e:
        current_app.logger.error(f"Error saving config: {e}", exc_info=True)
        return jsonify({"error": "Internal server error saving config"}), 500


@api_bp.route('/config/defaults', methods=['GET'])
def get_default_config() -> ResponseType:
    """
    Retrieve the default configuration structure.
    Used for resetting fields in the settings UI.
    """
    try:
        # Initialize a fresh AppConfig instance (contains default values)
        default_config = AppConfig()
        
        # Note: Default custom timers are already added in the AppConfig/ConfigManager logic
        # No need to duplicate logic here.

        current_app.logger.info("Serving default configuration.")
        return jsonify(default_config.model_dump(mode="json"))

    except Exception as e:
        current_app.logger.error(f"Error generating default config: {e}", exc_info=True)
        return jsonify({"error": "Internal server error getting default config"}), 500


@api_bp.route('/config/reset_all', methods=['POST'])
def reset_all_config() -> ResponseType:
    """
    Create a backup and reset config.json to defaults.
    """
    try:
        current_app.logger.warning("!!! REQUEST RECEIVED: FULL CONFIG RESET !!!")
        new_default_config = config_manager.backup_and_reset_config()
        current_app.logger.info("Config reset successful. Backup created.")
        return jsonify(new_default_config.model_dump(mode="json"))

    except Exception as e:
        current_app.logger.error(f"Error resetting config: {e}", exc_info=True)
        return jsonify({"error": "Internal server error resetting config"}), 500


# ==============================================================================
# Calendar API (/api/calendar_log, /api/calendar/*)
# ==============================================================================

@api_bp.route('/calendar_log', methods=['GET'])
def get_calendar_log() -> ResponseType:
    """
    Retrieve the calendar log (marked dates).

    Method: GET /api/calendar_log
    Returns:
        JSON: CalendarLogModel object.
    """
    try:
        current_log = calendar_log.get_log()
        return jsonify(current_log.model_dump(mode="json"))
    except Exception as e:
        current_app.logger.error(f"Error getting calendar log: {e}", exc_info=True)
        return jsonify({"error": "Internal server error reading calendar log"}), 500


@api_bp.route('/calendar/toggle', methods=['POST'])
def toggle_calendar_date() -> ResponseType:
    """
    Toggle a marked date (sticker) in the calendar.

    Method: POST /api/calendar/toggle
    Body: { "date": "YYYY-MM-DD" }
    Returns:
        JSON: { "status": "added"|"removed", "entry": ... }
    """
    data: Optional[Dict[str, Any]] = request.get_json()
    if not data or 'date' not in data:
        return jsonify({"error": "Missing 'date' key in request body"}), 400

    date_str = data['date']
    try:
        date_obj = date.fromisoformat(date_str)
    except ValueError:
        current_app.logger.warning(f"Invalid date format in toggle: {date_str}")
        return jsonify({"error": "Invalid date format, use YYYY-MM-DD"}), 400

    try:
        current_config = config_manager.get_config()
        result = calendar_log.toggle_date(
            date_to_toggle=date_obj,
            sticker=current_config.sticker_emoji,
            max_rotation=current_config.sticker_random_rotation_max
        )
        current_app.logger.info(f"Toggled date {date_str}: {result.get('status')}")
        return jsonify(result)
    except Exception as e:
        current_app.logger.error(f"Error toggling date {date_str}: {e}", exc_info=True)
        return jsonify({"error": "Internal server error updating calendar log"}), 500


@api_bp.route('/calendar/reset', methods=['POST'])
def reset_calendar() -> ResponseType:
    """
    Clear all marked dates from the calendar.
    """
    try:
        calendar_log.reset_log()
        current_app.logger.info("Calendar log cleared.")
        return jsonify(calendar_log.get_log().model_dump(mode="json"))
    except Exception as e:
        current_app.logger.error(f"Error resetting calendar: {e}", exc_info=True)
        return jsonify({"error": "Internal server error resetting calendar log"}), 500


# ==============================================================================
# Audio API (/api/audio_manifest, /api/audio/*)
# ==============================================================================

@api_bp.route('/audio_manifest', methods=['GET'])
def get_audio_manifest() -> ResponseType:
    """
    Scans the configured audio directory and returns a manifest.
    Returns JSON: { "CategoryName": ["/api/audio/CategoryName/File.mp3", ...] }
    """
    current_app.logger.info("[AUDIO] Requesting manifest...")
    manifest: Dict[str, List[str]] = {}

    try:
        sounds_dir = current_app.config.get('SOUNDS_FOLDER')

        if not sounds_dir or not sounds_dir.exists():
            current_app.logger.warning(f"[AUDIO] Sounds directory not found: {sounds_dir}")
            return jsonify({})

        for folder_name in SOUND_FOLDERS:
            folder_path = sounds_dir / folder_name
            if not folder_path.exists():
                manifest[folder_name] = []
                continue

            file_paths = []
            for p in folder_path.glob('*.mp3'):
                # Construct relative HTTP path for the frontend
                http_path = f"/api/audio/{folder_name}/{p.name}"
                file_paths.append(http_path)

            manifest[folder_name] = file_paths

        current_app.logger.info("[AUDIO] Manifest generated.")
        return jsonify(manifest)

    except Exception as e:
        current_app.logger.error(f"[AUDIO] Error scanning audio folders: {e}", exc_info=True)
        return jsonify({"error": "Internal server error scanning audio"}), 500


@api_bp.route('/audio/<path:category>/<path:filename>')
def serve_audio_file(category: str, filename: str) -> ResponseType:
    """
    Safely serves an .mp3 file from the AppData sounds directory.
    Validates that the category is in the allowed whitelist.
    """
    try:
        sounds_dir = current_app.config.get('SOUNDS_FOLDER')
        if not sounds_dir:
            raise ValueError("SOUNDS_FOLDER not configured.")

        if category not in SOUND_FOLDERS:
            current_app.logger.warning(f"[AUDIO] Access denied for category: {category}")
            return "Forbidden", 403

        directory_path = Path(sounds_dir) / category

        return send_from_directory(
            directory_path,
            filename,
            as_attachment=False
        )

    except FileNotFoundError:
        current_app.logger.error(f"[AUDIO] File not found: {category}/{filename}")
        return "File Not Found", 404
    except Exception as e:
        current_app.logger.error(f"[AUDIO] Error serving file: {e}", exc_info=True)
        return "Server Error", 500