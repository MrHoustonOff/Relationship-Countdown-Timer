# /mrhoustontimer/app/core/config_manager.py
"""Менеджер конфигурации приложения Relationship Countdown Timer.

Отвечает за загрузку, валидацию (с помощью Pydantic), сохранение
и предоставление доступа к настройкам приложения из файла config.json.
"""

import json
import uuid
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Literal, List, Dict, Any

from pydantic import BaseModel, Field, ValidationError, field_validator

# --- Вспомогательные Функции ---

def _now_factory() -> datetime:
    """Возвращает текущее время (используется для default_factory)."""
    return datetime.now()

def _arrival_30_days_later() -> datetime:
    """Возвращает время через 30 дней от текущего (для дефолтной даты приезда)."""
    # Используем timedelta для корректного расчета
    return datetime.now() + timedelta(days=30)

# --- Модели Pydantic для Структуры Конфига ---

class ColorConfig(BaseModel):
    """Схема для блока цветов интерфейса."""
    # Основная палитра
    color_background: str = "#141414"
    color_text: str = "#E8EAED"
    color_text_emphasis: str = "#FFFFFF"
    color_accent_primary: str = "#F48FB1" # Розовый
    color_accent_secondary: str = "#2A2A2A"
    color_divider: str = "#444444"

    # Эффекты
    color_glow_effect: str = "#F48FB1" # Для градиента (если понадобится)
    color_glow_shadow: str = "#E91E63" # Для drop-shadow

    # Фоны таймеров
    color_timer_arrival_bg: str = "#2A2A2A"
    color_timer_relationship_bg: str = "#2A2A2A"
    color_timer_custom_bg: str = "#212121"
    color_timer_custom_bg_hover: str = "#313131"

    # Цвета цифр таймеров
    color_timer_countdown: str = "#F48FB1" # Розовый
    color_timer_elapsed: str = "#AECBFA" # Голубой

    # Хедер
    color_nav_active_indicator: str = "#F48FB1"

    # Календарь
    color_arrival_highlight_bg: str = "#4E353F"
    color_arrival_highlight_sticker: str = "#F48FB1"
    color_calendar_day_bg: str = "rgba(0,0,0,0.4)"
    color_calendar_marked_day_bg: str = "#5C3A47" # Цвет фона отмеченного дня

    @field_validator('*', mode='before')
    @classmethod
    def check_color_format(cls, value: Any) -> Any:
        """Проверяет, что значение является строкой (базовая проверка)."""
        if not isinstance(value, str):
            # В реальном приложении можно добавить валидацию HEX/RGBA формата
            raise ValueError('Color value must be a string')
        return value

# Модель DayNumberConfig УДАЛЕНА (не используется)

class ArrivalDayConfig(BaseModel):
    """Настройки для выделения дня приезда в календаре."""
    use_bg: bool = True
    bg_color: str = "#4E353F" # Цвет фона (совпадает с marked_day по умолчанию)
    use_sticker: bool = True
    sticker_emoji: str = "💖"
    sticker_scale: float = Field(default=1.5, ge=0.1, le=10.0) # Ограничения на масштаб

class CustomTimer(BaseModel):
    """Схема для одного кастомного таймера."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    enabled: bool = True
    label: str = Field(default="Новый таймер", max_length=50) # Дефолтное название и лимит
    date: datetime = Field(default_factory=_now_factory)

class TimerConfig(BaseModel):
    """Настройки для всех таймеров на главной странице."""
    limit_text_length: bool = True
    timer_completed_message: str = Field(default="Свершилось!", max_length=20)

    # Таймер "До встречи"
    arrival_timer_enabled: bool = True
    arrival_timer_text: str = Field(default="До нашей встречи", max_length=50)

    # Таймер "Мы вместе"
    relationship_timer_enabled: bool = True
    relationship_timer_text: str = Field(default="Мы вместе уже", max_length=50)

    # Кастомные таймеры
    custom_timers: List[CustomTimer] = Field(default_factory=list)

class AppConfig(BaseModel):
    """Корневая модель конфигурации приложения (config.json)."""
    # Глобальные настройки
    is_first_launch: bool = True
    language: Literal["ru", "en"] = "ru"
    animations_enabled: bool = True
    effects_enabled: bool = True
    blur_strength: float = Field(default=1.5, ge=0, le=20)

    # Ключевые даты
    date_vova_departure: datetime = Field(default_factory=_now_factory)
    date_vova_arrival: datetime = Field(default_factory=_now_factory) # Дефолт теперь 'now'
    date_relationship_start: datetime = Field(default_factory=_now_factory)

    # Настройки таймеров (вложенная модель)
    timers: TimerConfig = Field(default_factory=TimerConfig)

    # Настройки календаря
    sticker_emoji: str = Field(default="X", max_length=2) # Лимит на 1-2 символа
    sticker_color: str = "#F48FB1"
    sticker_scale: float = Field(default=1.0, ge=0.1, le=10.0)
    sticker_random_rotation_max: int = Field(default=15, ge=0, le=180)

    # calendar_min_scale_limit: float = 0.5 # УДАЛЕНО (не используется)
    # day_number: DayNumberConfig = Field(default_factory=DayNumberConfig) # УДАЛЕНО (не используется)

    arrival_day: ArrivalDayConfig = Field(default_factory=ArrivalDayConfig)
    calendar_empty_cell_color: str = "rgba(0, 0, 0, 0.15)"
    calendar_marked_day_color: str = "#5C3A47"
    calendar_save_zoom: bool = False

    # Настройки эффектов
    effect_particle_day: str = Field(default="💖", max_length=2)

    # Блок цветов (вложенная модель)
    colors: ColorConfig = Field(default_factory=ColorConfig)


# --- Класс Менеджера Конфигурации ---

class ConfigManager:
    """Управляет загрузкой, сохранением и доступом к конфигурации приложения."""

    def __init__(self, config_path: Optional[Path] = None):
        """Инициализатор ConfigManager.

        Args:
            config_path: Путь к файлу config.json (может быть None при инициализации).
        """
        self.config_path: Optional[Path] = config_path
        self._config: Optional[AppConfig] = None # Кэшированный объект конфига

    def init_app(self, config_path: Path):
        """Устанавливает путь к файлу конфигурации после создания экземпляра.

        Args:
            config_path: Путь к файлу config.json.
        """
        if not isinstance(config_path, Path):
            raise TypeError("config_path должен быть объектом Path")
        self.config_path = config_path
        print(f"[ConfigManager] Путь к конфигу установлен: {self.config_path}")

    def _save(self):
        """Сохраняет текущий объект конфигурации (_config) в файл JSON."""
        if not self.config_path or not self._config:
            print("[ConfigManager] Ошибка сохранения: Путь или объект конфига не установлены.")
            return

        try:
            # Сериализуем Pydantic модель в JSON с отступами
            json_data = self._config.model_dump_json(indent=4)
            # Записываем в файл с кодировкой UTF-8
            self.config_path.write_text(json_data, encoding="utf-8")
            print(f"[ConfigManager] Конфиг сохранен в {self.config_path}")
        except (IOError, TypeError) as e:
            print(f"!!! [ConfigManager] КРИТИЧЕСКАЯ ОШИБКА сохранения конфига: {e}")
            # В реальном приложении здесь можно предпринять меры (бэкап, уведомление)

    def backup_and_reset_config(self) -> AppConfig:
        """
        Создает бэкап текущего конфига и сбрасывает config.json к дефолтным значениям.
        Returns:
            Новый (дефолтный) объект AppConfig.
        Raises:
            IOError: Если не удалось создать бэкап или удалить старый конфиг.
            ValueError: Если путь к конфигу не установлен.
        """
        if not self.config_path:
            raise ValueError("Путь к файлу конфига не установлен.")

        # 1. Создаем имя для бэкапа
        timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
        backup_path = self.config_path.parent / f"{self.config_path.stem}.backup.{timestamp}.json"

        try:
            # 2. Копируем текущий файл (если он существует)
            if self.config_path.exists():
                print(f"[ConfigManager] Создание бэкапа: {backup_path.name}")
                self.config_path.rename(backup_path)
            else:
                print("[ConfigManager] Конфиг не найден, бэкап не требуется.")

            # 3. Сбрасываем кэш и создаем новый дефолтный конфиг
            self._config = None  # Очищаем кэш
            self.load_or_create_defaults()  # Этот метод создаст и сохранит новый дефолтный

            if self._config is None:
                raise RuntimeError("Не удалось создать новый дефолтный конфиг после сброса.")

            print("[ConfigManager] Настройки успешно сброшены к дефолтным.")
            return self._config

        except (IOError, OSError) as e:
            print(f"!!! [ConfigManager] КРИТИЧЕСКАЯ ОШИБКА при бэкапе/сбросе конфига: {e}")
            # Пытаемся восстановить бэкап, если он был создан
            if backup_path.exists():
                try:
                    backup_path.rename(self.config_path)
                    print("[ConfigManager] Восстановлен конфиг из бэкапа.")
                except Exception as restore_e:
                    print(f"!!! [ConfigManager] КРИТИЧЕСКАЯ ОШИБКА: Не удалось восстановить бэкап: {restore_e}")
            raise e

    def load_or_create_defaults(self):
        """Загружает конфигурацию из файла или создает дефолтную, если файл отсутствует или невалиден."""
        if not self.config_path:
            raise ValueError("Путь к файлу конфига не установлен.")

        try:
            print(f"[ConfigManager] Попытка загрузки конфига из {self.config_path}...")
            raw_data = self.config_path.read_text(encoding="utf-8")
            self._config = AppConfig.model_validate_json(raw_data)
            print("[ConfigManager] Конфиг успешно загружен и валидирован.")
        except FileNotFoundError:
            print(f"[ConfigManager] Файл конфига не найден. Создание дефолтного конфига...")
            self._create_default_config()
            self._save() # Сохраняем созданный дефолтный конфиг
        except (json.JSONDecodeError, ValidationError) as e:
            print(f"!!! [ConfigManager] Конфиг поврежден или невалиден. Ошибка: {e}")
            print("!!! [ConfigManager] Создание дефолтного конфига в памяти (старый файл НЕ перезаписан)...")
            # Создаем дефолтный конфиг, но НЕ сохраняем его поверх сломанного
            self._create_default_config()
            # Можно добавить логику бэкапа сломанного файла здесь
        except Exception as e:
            print(f"!!! [ConfigManager] Неизвестная ошибка при загрузке конфига: {e}")
            self._create_default_config() # Создаем дефолтный в памяти

    def _create_default_config(self):
        """Создает объект AppConfig с дефолтными значениями."""
        self._config = AppConfig()
        # Добавляем дефолтные кастомные таймеры
        self._config.timers.custom_timers.append(
            CustomTimer(label="Со дня знакомства", date=datetime(2023, 1, 1, 12, 0, 0))
        )
        self._config.timers.custom_timers.append(
            CustomTimer(label="Она моя невеста уже", date=datetime(2024, 1, 1, 12, 0, 0))
        )
        print("[ConfigManager] Объект дефолтного конфига создан.")


    def get_config(self) -> AppConfig:
        """Возвращает текущий объект конфигурации (из кэша или загружает).

        Returns:
            Объект AppConfig с текущими настройками.

        Raises:
            ValueError: Если путь к конфигу не установлен.
            RuntimeError: Если не удалось загрузить или создать конфиг.
        """
        if not self.config_path:
            raise ValueError("Путь к файлу конфига не установлен перед вызовом get_config().")

        if self._config is None:
            print("[ConfigManager] Кэш конфига пуст, вызываем load_or_create_defaults().")
            self.load_or_create_defaults()

        if self._config is None:
            # Этого не должно произойти, если load_or_create_defaults отработал
            raise RuntimeError("Не удалось получить объект конфигурации.")

        return self._config

    def update_config(self, new_config_data: Dict[str, Any]) -> AppConfig:
        """Обновляет конфигурацию на основе новых данных, валидирует и сохраняет.

        Args:
            new_config_data: Словарь с новыми данными конфигурации.

        Returns:
            Обновленный объект AppConfig.

        Raises:
            ValidationError: Если новые данные не проходят валидацию Pydantic.
            ValueError: Если путь к конфигу не установлен.
            TypeError: Если new_config_data не словарь.
        """
        if not self.config_path:
            raise ValueError("Путь к файлу конфига не установлен перед вызовом update_config().")
        if not isinstance(new_config_data, dict):
            raise TypeError("new_config_data должен быть словарем.")

        try:
            # Pydantic валидирует и обновляет модель из словаря
            # Важно: model_validate создает НОВЫЙ объект, если данные валидны
            updated_config = AppConfig.model_validate(new_config_data)

            # Обрабатываем флаг 'is_first_launch'
            if updated_config.is_first_launch:
                print("[ConfigManager] Первая настройка завершена. Установка is_first_launch=false.")
                updated_config.is_first_launch = False

            # Обновляем кэш и сохраняем
            self._config = updated_config
            self._save()
            print("[ConfigManager] Конфиг успешно обновлен и сохранен.")
            return self._config
        except ValidationError as e:
            # Передаем ошибку валидации дальше
            print(f"!!! [ConfigManager] Ошибка валидации при обновлении: {e}")
            raise e
        except Exception as e:
            # Обработка других возможных ошибок при сохранении или валидации
            print(f"!!! [ConfigManager] Неизвестная ошибка при обновлении конфига: {e}")
            # Можно перевыбросить как кастомное исключение или вернуть старый конфиг
            raise RuntimeError(f"Не удалось обновить конфиг: {e}") from e