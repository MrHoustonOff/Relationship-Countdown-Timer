# /mrhoustontimer/app/core/config_manager.py
import json
import uuid  # <-- ИМПОРТ для уникальных ID
from pathlib import Path
from datetime import date
from pydantic import BaseModel, Field, ValidationError
from typing import Optional, Literal, List


# --- Pydantic Модели (Наша "Схема Данных" v2.0) ---

class ColorConfig(BaseModel):
    """Схема для блока цветов (без изменений)"""
    color_background: str = "#1a1a1a"
    color_text: str = "#e0e0e0"
    color_accent_primary: str = "#ff8c00"
    color_accent_secondary: str = "#4a4a4a"
    color_arrival_highlight_bg: str = "#2f2c00"
    color_arrival_highlight_sticker: str = "#ffbf00"


class DayNumberConfig(BaseModel):
    """Настройки отображения номера дня (без изменений)"""
    position: Literal["center", "top-left", "top-right", "bottom-left", "bottom-right"] = "center"
    font_multiplier: float = 1.0
    side_font_multiplier: float = 0.5


class ArrivalDayConfig(BaseModel):
    """Настройки для 'Дня Приезда' (без изменений)"""
    use_bg: bool = True
    use_sticker: bool = True
    sticker_emoji: str = "💖"
    sticker_scale: float = 1.5


# --- НОВЫЕ МОДЕЛИ для Таймеров (ТЗ) ---

class CustomTimer(BaseModel):
    """
    Модель для одного "Дополнительного поля" таймера.
    """
    # Уникальный ID, чтобы JS мог с ним работать (удалять/редактировать)
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    enabled: bool = True
    label: str
    date: date


class TimerConfig(BaseModel):
    """
    Новый главный модуль настроек Таймеров (ТЗ)
    """
    limit_text_length: bool = True  # Ограничивать ли длину текста

    # Модуль "До встречи" (ТЗ)
    arrival_timer_enabled: bool = True
    arrival_timer_text: str = "До нашей встречи"

    # Модуль "Сколько вместе" (ТЗ)
    relationship_timer_enabled: bool = True
    relationship_timer_text: str = "Мы вместе уже"

    # Список кастомных таймеров (дети "Сколько вместе")
    custom_timers: List[CustomTimer] = Field(default_factory=list)


# --- ГЛАВНАЯ МОДЕЛЬ КОНФИГА v2.0 ---

class AppConfig(BaseModel):
    """Главная модель конфига (config.json) v2.0"""

    # --- Новые поля (ТЗ) ---
    is_first_launch: bool = True
    language: Literal["ru", "en"] = "ru"

    # --- Ключевые даты (остались только 2) ---
    date_vova_departure: date = date(2025, 1, 1)
    date_vova_arrival: date = date(2025, 12, 31)
    # Эта дата нужна для "Сколько вместе"
    date_relationship_start: date = date(2023, 2, 1)

    # --- Модули настроек ---

    # Настройки таймеров (НОВЫЙ МОДУЛЬ)
    timers: TimerConfig = Field(default_factory=TimerConfig)

    # Настройки календаря (старые)
    sticker_emoji: str = "X"
    sticker_random_rotation_max: int = 15
    calendar_min_scale_limit: float = 0.5
    day_number: DayNumberConfig = Field(default_factory=DayNumberConfig)
    arrival_day: ArrivalDayConfig = Field(default_factory=ArrivalDayConfig)

    # Настройки цветов (старые)
    colors: ColorConfig = Field(default_factory=ColorConfig)

    # Старые поля (date_acquaintance, date_engagement) удалены.
    # Они будут жить внутри 'custom_timers'.


# --- Класс Менеджера (Код тот же, модель AppConfig - новая) ---

class ConfigManager:
    """
    ООП-класс для управления config.json.
    (Этот код почти не изменился, т.к. он гибкий)
    """

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
        """
        Пытается загрузить конфиг.
        Если не найден или невалиден - создает дефолтный.
        """
        try:
            raw_data = self.config_path.read_text(encoding="utf-8")
            self._config = AppConfig.model_validate_json(raw_data)
        except (FileNotFoundError, json.JSONDecodeError, ValidationError) as e:
            # Если файла нет или он "сломан" - создаем новый
            print(f"Config not found or invalid ({e}). Creating defaults.")
            self._config = AppConfig()  # Создаем пустой конфиг v2.0

            # --- Заполняем дефолтные "Доп. поля" (ТЗ) ---
            self._config.timers.custom_timers.append(
                CustomTimer(label="Со дня знакомства", date=date(2023, 1, 1))
            )
            self._config.timers.custom_timers.append(
                CustomTimer(label="Она моя невеста уже", date=date(2024, 1, 1))
            )
            # --- Конец ---

            self._save()  # Сохраняем

    def get_config(self) -> AppConfig:
        if not self._config:
            self.load_or_create_defaults()
        return self._config

    def update_config(self, new_config_data: dict) -> AppConfig:
        """
        Принимает словарь (от API), валидирует его
        и обновляет конфиг.
        """
        try:
            # Pydantic сам разберется со всеми вложенными моделями
            self._config = AppConfig.model_validate(new_config_data)

            # --- ОСОБЫЙ СЛУЧАЙ: "Первый запуск" (ТЗ) ---
            # Если юзер сохраняет конфиг, мы *гарантированно*
            # ставим 'is_first_launch' в 'false'.
            if self._config.is_first_launch:
                print("First launch setup complete. Setting is_first_launch=false.")
                self._config.is_first_launch = False
            # --- Конец ---

            self._save()
            return self._config
        except ValidationError as e:
            print(f"Config update error: {e}")
            raise e