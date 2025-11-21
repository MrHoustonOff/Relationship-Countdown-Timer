# /mrhoustontimer/app/core/config_manager.py
"""
Configuration Manager for the Relationship Countdown Timer.

Responsible for loading, validating, saving, and accessing application
settings via `config.json`. Uses Pydantic for schema validation.
"""

import json
import uuid
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Literal, List, Dict, Any

from pydantic import BaseModel, Field, ValidationError, field_validator

# Configure module-level logger
logger = logging.getLogger(__name__)

# --- Helper Functions ---

def _now_factory() -> datetime:
    """Returns current datetime (for default_factory)."""
    return datetime.now()

# --- Pydantic Models ---

class ColorConfig(BaseModel):
    """Schema for UI color settings."""
    # Main Palette
    color_background: str = "#141414"
    color_text: str = "#E8EAED"
    color_text_emphasis: str = "#FFFFFF"
    color_accent_primary: str = "#F48FB1"
    color_accent_secondary: str = "#2A2A2A"
    color_divider: str = "#444444"

    # Effects
    color_glow_effect: str = "#F48FB1"
    color_glow_shadow: str = "#E91E63"

    # Module Backgrounds
    color_timer_arrival_bg: str = "#2A2A2A"
    color_timer_relationship_bg: str = "#2A2A2A"
    color_timer_custom_bg: str = "#212121"
    color_timer_custom_bg_hover: str = "#313131"

    # Timer Digits
    color_timer_countdown: str = "#F48FB1"
    color_timer_elapsed: str = "#AECBFA"

    # Header
    color_nav_active_indicator: str = "#F48FB1"

    # Calendar
    color_arrival_highlight_bg: str = "#4E353F"
    color_arrival_highlight_sticker: str = "#F48FB1"
    color_calendar_day_bg: str = "rgba(0,0,0,0.4)"
    color_calendar_marked_day_bg: str = "#5C3A47"

    @field_validator('*', mode='before')
    @classmethod
    def check_color_format(cls, value: Any) -> Any:
        """Ensures color values are strings."""
        if not isinstance(value, str):
            raise ValueError('Color value must be a string')
        return value

class ArrivalDayConfig(BaseModel):
    """Settings for highlighting the arrival day."""
    use_bg: bool = True
    bg_color: str = "#4E353F"
    use_sticker: bool = True
    sticker_emoji: str = "💖"
    sticker_scale: float = Field(default=1.5, ge=0.1, le=10.0)

class CustomTimer(BaseModel):
    """Schema for a single custom timer."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    enabled: bool = True
    label: str = Field(default="New Timer", max_length=50)
    date: datetime = Field(default_factory=_now_factory)

class WheelOption(BaseModel):
    """Schema for a single Wheel of Fortune sector."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str = Field(default="New Option", max_length=100)

class TimerConfig(BaseModel):
    """Global timer settings."""
    limit_text_length: bool = True
    timer_completed_message: str = Field(default="It happened!", max_length=20)

    # Countdown Timer
    arrival_timer_enabled: bool = True
    arrival_timer_text: str = Field(default="Time until arrival", max_length=50)

    # Relationship Timer
    relationship_timer_enabled: bool = True
    relationship_timer_text: str = Field(default="We have been together", max_length=50)

    # Custom Timers
    custom_timers: List[CustomTimer] = Field(default_factory=list)

class AppConfig(BaseModel):
    """Root configuration model (config.json)."""
    # Global Settings
    is_first_launch: bool = True
    language: Literal["ru", "en"] = "ru"
    animations_enabled: bool = True
    effects_enabled: bool = True
    blur_strength: float = Field(default=1.5, ge=0, le=20)

    # Key Dates
    date_vova_departure: datetime = Field(default_factory=_now_factory)
    date_vova_arrival: datetime = Field(default_factory=_now_factory)
    date_relationship_start: datetime = Field(default_factory=_now_factory)

    # Nested Configs
    timers: TimerConfig = Field(default_factory=TimerConfig)
    wheel_options: List[WheelOption] = Field(default_factory=list)

    # Calendar Settings
    sticker_emoji: str = Field(default="X", max_length=2)
    sticker_color: str = "#F48FB1"
    sticker_scale: float = Field(default=1.0, ge=0.1, le=10.0)
    sticker_random_rotation_max: int = Field(default=15, ge=0, le=180)

    arrival_day: ArrivalDayConfig = Field(default_factory=ArrivalDayConfig)
    calendar_empty_cell_color: str = "rgba(0, 0, 0, 0.15)"
    calendar_marked_day_color: str = "#5C3A47"
    calendar_save_zoom: bool = False

    # Effects
    effect_particle_day: str = Field(default="💖", max_length=2)

    # Colors
    colors: ColorConfig = Field(default_factory=ColorConfig)


# --- Configuration Manager ---

class ConfigManager:
    """Manages configuration loading, saving, and access."""

    def __init__(self, config_path: Optional[Path] = None):
        """Initialize ConfigManager.

        Args:
            config_path: Path to config.json (optional).
        """
        self.config_path: Optional[Path] = config_path
        self._config: Optional[AppConfig] = None

    def init_app(self, config_path: Path):
        """Set config path after instantiation."""
        if not isinstance(config_path, Path):
            raise TypeError("config_path must be a pathlib.Path object")
        self.config_path = config_path
        logger.info(f"Config path set to: {self.config_path}")

    def _save(self):
        """Serialize and write config to disk."""
        if not self.config_path or not self._config:
            logger.error("Save failed: Path or config object missing.")
            return

        try:
            json_data = self._config.model_dump_json(indent=4)
            self.config_path.write_text(json_data, encoding="utf-8")
            logger.debug(f"Config saved to {self.config_path}")
        except (IOError, TypeError) as e:
            logger.critical(f"CRITICAL ERROR saving config: {e}", exc_info=True)

    def backup_and_reset_config(self) -> AppConfig:
        """Create a backup and reset config to defaults.

        Returns:
            New default AppConfig object.
        Raises:
            ValueError: If config path is not set.
            IOError: If backup or reset fails.
        """
        if not self.config_path:
            raise ValueError("Config path not set.")

        timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
        backup_path = self.config_path.parent / f"{self.config_path.stem}.backup.{timestamp}.json"

        try:
            if self.config_path.exists():
                logger.info(f"Creating config backup: {backup_path.name}")
                self.config_path.rename(backup_path)
            else:
                logger.info("Config not found, skipping backup.")

            self._config = None
            self.load_or_create_defaults()

            if self._config is None:
                raise RuntimeError("Failed to create default config after reset.")

            logger.info("Configuration reset to defaults.")
            return self._config

        except (IOError, OSError) as e:
            logger.critical(f"CRITICAL ERROR during config reset: {e}", exc_info=True)
            # Attempt rollback
            if backup_path.exists():
                try:
                    backup_path.rename(self.config_path)
                    logger.info("Rolled back to backup config.")
                except Exception as restore_e:
                    logger.critical(f"FATAL: Backup restore failed: {restore_e}")
            raise e

    def load_or_create_defaults(self):
        """Load config from file or create defaults if missing/invalid."""
        if not self.config_path:
            raise ValueError("Config path not set.")

        try:
            logger.info(f"Loading config from {self.config_path}...")
            raw_data = self.config_path.read_text(encoding="utf-8")
            self._config = AppConfig.model_validate_json(raw_data)
            logger.info("Config loaded and validated.")
        except FileNotFoundError:
            logger.info("Config file not found. Creating defaults...")
            self._create_default_config()
            self._save()
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"Config corrupted or invalid: {e}")
            logger.warning("Creating default config in memory (corrupt file NOT overwritten).")
            self._create_default_config()
        except Exception as e:
            logger.critical(f"Unknown error loading config: {e}", exc_info=True)
            self._create_default_config()

    def _create_default_config(self):
        """Populate _config with default values."""
        self._config = AppConfig()
        # Add default sample timers
        self._config.timers.custom_timers.append(
            CustomTimer(label="Since we met", date=datetime(2023, 1, 1, 12, 0, 0))
        )
        self._config.timers.custom_timers.append(
            CustomTimer(label="Engagement", date=datetime(2024, 1, 1, 12, 0, 0))
        )
        logger.info("Default config object created.")

    def get_config(self) -> AppConfig:
        """Retrieve current configuration."""
        if not self.config_path:
            raise ValueError("Config path not set.")

        if self._config is None:
            logger.info("Config cache empty, loading defaults.")
            self.load_or_create_defaults()

        if self._config is None:
            raise RuntimeError("Failed to retrieve configuration.")

        return self._config

    def update_config(self, new_config_data: Dict[str, Any]) -> AppConfig:
        """Update configuration with new data.

        Args:
            new_config_data: Dictionary containing new settings.

        Returns:
            Updated AppConfig object.

        Raises:
            ValidationError: If Pydantic validation fails.
            ValueError: If path not set.
        """
        if not self.config_path:
            raise ValueError("Config path not set.")
        if not isinstance(new_config_data, dict):
            raise TypeError("new_config_data must be a dictionary")

        try:
            # Validate and update
            updated_config = AppConfig.model_validate(new_config_data)

            if updated_config.is_first_launch:
                logger.info("First launch setup complete. Setting is_first_launch=False.")
                updated_config.is_first_launch = False

            self._config = updated_config
            self._save()
            logger.info("Config updated and saved.")
            return self._config
        except ValidationError as e:
            logger.error(f"Validation error during update: {e}")
            raise e
        except Exception as e:
            logger.error(f"Error updating config: {e}", exc_info=True)
            raise RuntimeError(f"Failed to update config: {e}") from e