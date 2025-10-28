# /mrhoustontimer/app/core/config_manager.py
import json
import uuid
from pathlib import Path
from datetime import date, datetime, timedelta
from pydantic import BaseModel, Field, ValidationError
from typing import Optional, Literal, List


# ... (ColorConfig, DayNumberConfig - без изменений) ...
class ColorConfig(BaseModel):
    color_background: str = "#1a1a1a"
    color_text: str = "#e0e0e0"
    color_accent_primary: str = "#ff8c00"
    color_accent_secondary: str = "#4a4a4a"
    color_arrival_highlight_bg: str = "#2f2c00"
    color_arrival_highlight_sticker: str = "#ffbf00"


class DayNumberConfig(BaseModel):
    position: Literal["center", "top-left", "top-right", "bottom-left", "bottom-right"] = "center"
    font_multiplier: float = 1.0
    side_font_multiplier: float = 0.5


class ArrivalDayConfig(BaseModel):
    use_bg: bool = True
    use_sticker: bool = True
    sticker_emoji: str = "💖"
    sticker_scale: float = 1.5  # <-- Фикс "вылета" стикера


# ... (CustomTimer, TimerConfig - без изменений) ...
class CustomTimer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    enabled: bool = True
    label: str
    date: datetime  # <-- Используем datetime


class TimerConfig(BaseModel):
    limit_text_length: bool = True
    arrival_timer_enabled: bool = True
    arrival_timer_text: str = "До нашей встречи"
    relationship_timer_enabled: bool = True
    relationship_timer_text: str = "Мы вместе уже"
    timer_completed_message: str = Field(default="Свершилось!", max_length=20)
    custom_timers: List[CustomTimer] = Field(default_factory=list)


class AppConfig(BaseModel):
    is_first_launch: bool = True
    language: Literal["ru", "en"] = "ru"

    # --- ИСПРАВЛЕНИЕ: (Твой Пункт 3) ---
    # Возвращаем дефолты к 'now()', чтобы вызвать твое "Упси!" сообщение
    date_vova_departure: datetime = Field(default_factory=datetime.now)
    date_vova_arrival: datetime = Field(default_factory=datetime.now)
    date_relationship_start: datetime = Field(default_factory=datetime.now)
    # ---

    timers: TimerConfig = Field(default_factory=TimerConfig)
    sticker_emoji: str = "X"
    sticker_random_rotation_max: int = 15
    calendar_min_scale_limit: float = 0.5
    day_number: DayNumberConfig = Field(default_factory=DayNumberConfig)
    arrival_day: ArrivalDayConfig = Field(default_factory=ArrivalDayConfig)
    colors: ColorConfig = Field(default_factory=ColorConfig)

    # --- ИСПРАВЛЕНИЕ: (Твой Пункт 2) ---
    # Делаем "потемнее"
    calendar_empty_cell_color: str = "rgba(0, 0, 0, 0.15)"

    calendar_save_zoom: bool = False
    # ---


class ConfigManager:
    # ... (init, init_app, _save - без изменений) ...
    def __init__(self, config_path: Optional[Path] = None):
        self.config_path: Optional[Path] = config_path
        self._config: Optional[AppConfig] = None

    def init_app(self, config_path: Path):
        self.config_path = config_path

    def _save(self):
        if not self.config_path or not self._config:
            return
        json_data = self._config.model_dump_json(indent=4)
        self.config_path.write_text(json_data, encoding="utf-8")

    def load_or_create_defaults(self):
        try:
            raw_data = self.config_path.read_text(encoding="utf-8")
            self._config = AppConfig.model_validate_json(raw_data)
        except (FileNotFoundError, json.JSONDecodeError, ValidationError) as e:
            print(f"!!! [ConfigManager] Config not found or invalid. Error: {e}")
            print("!!! [ConfigManager] Creating new default config...")
            self._config = AppConfig()
            self._config.timers.custom_timers.append(
                CustomTimer(label="Со дня знакомства", date=datetime(2023, 1, 1, 12, 0, 0))
            )
            self._config.timers.custom_timers.append(
                CustomTimer(label="Она моя невеста уже", date=datetime(2024, 1, 1, 12, 0, 0))
            )
            self._save()

    # ... (get_config, update_config - без изменений) ...
    def get_config(self) -> AppConfig:
        if not self._config:
            self.load_or_create_defaults()
        return self._config

    def update_config(self, new_config_data: dict) -> AppConfig:
        try:
            self._config = AppConfig.model_validate(new_config_data)
            if self._config.is_first_launch:
                print("First launch setup complete. Setting is_first_launch=false.")
                self._config.is_first_launch = False
            self._save()
            return self._config
        except ValidationError as e:
            print(f"Config update error: {e}")
            raise e