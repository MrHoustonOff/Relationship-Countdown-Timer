# /mrhoustontimer/app/core/calendar_log.py
"""Менеджер лога календаря приложения Relationship Countdown Timer.

Отвечает за загрузку, сохранение и модификацию данных об отмеченных
днях в файле calendar_log.json. Использует Pydantic для валидации
структуры данных.
"""

import json
import random
import logging
from pathlib import Path
from datetime import date
from typing import Optional, Dict, Any, Literal

from pydantic import BaseModel, Field, ValidationError

# Настраиваем базовый логгер для этого модуля
logger = logging.getLogger(__name__)
# Установим уровень (можно будет переопределить в Flask)
# logging.basicConfig(level=logging.INFO) # Раскомментируй для локальной отладки

# --- Модели Pydantic для Структуры Лога ---

class MarkedDateEntry(BaseModel):
    """Схема для записи об одном отмеченном дне."""
    rotation: int = Field(..., description="Угол поворота стикера в градусах.")
    sticker: str = Field(..., description="Символ (emoji) стикера.")

class CalendarLogModel(BaseModel):
    """Корневая модель для файла calendar_log.json.

    Использует словарь, где ключ - объект `date`, а значение - `MarkedDateEntry`.
    Pydantic автоматически обрабатывает преобразование строк "YYYY-MM-DD" в `date`.
    """
    marked_dates: Dict[date, MarkedDateEntry] = Field(
        default_factory=dict,
        description="Словарь отмеченных дат. Ключ - дата, значение - информация об отметке."
    )

# --- Класс Менеджера Лога Календаря ---

class CalendarLog:
    """Управляет загрузкой, сохранением и изменением лога календаря."""

    def __init__(self, log_path: Optional[Path] = None):
        """Инициализатор CalendarLog.

        Args:
            log_path: Путь к файлу calendar_log.json (может быть None).
        """
        self.log_path: Optional[Path] = log_path
        # Кэшированный объект лога (Pydantic модель)
        self._log: Optional[CalendarLogModel] = None
        logger.debug("Экземпляр CalendarLog создан.")

    def init_app(self, log_path: Path):
        """Устанавливает путь к файлу лога после создания экземпляра.

        Args:
            log_path: Путь к файлу calendar_log.json.

        Raises:
            TypeError: Если log_path не является объектом Path.
        """
        if not isinstance(log_path, Path):
            raise TypeError("log_path должен быть объектом Path")
        self.log_path = log_path
        logger.info(f"Путь к логу календаря установлен: {self.log_path}")

    def _save(self):
        """Сохраняет текущий объект лога (_log) в файл JSON.

        Выполняет сохранение только если путь и объект лога установлены.
        Логгирует ошибки ввода-вывода.
        """
        if not self.log_path:
            logger.error("Ошибка сохранения лога: Путь к файлу не установлен.")
            return
        if self._log is None:
            logger.error("Ошибка сохранения лога: Объект лога не инициализирован.")
            return

        try:
            # Сериализуем Pydantic модель в JSON с отступами
            json_data = self._log.model_dump_json(indent=4)
            # Записываем в файл
            self.log_path.write_text(json_data, encoding="utf-8")
            logger.debug(f"Лог календаря сохранен в {self.log_path}")
        except (IOError, TypeError) as e:
            logger.critical(f"КРИТИЧЕСКАЯ ОШИБКА сохранения лога календаря: {e}", exc_info=True)
            # В реальном приложении можно добавить механизм бэкапа или уведомления

    def load_or_create(self):
        """Загружает лог календаря из файла или создает пустой в памяти.

        - Если файл не найден, создает пустой лог и сохраняет его.
        - Если файл поврежден (не JSON или не соответствует схеме),
          загружает пустой лог в память, но НЕ перезаписывает поврежденный файл.
        - Логгирует все операции и ошибки.

        Raises:
            ValueError: Если путь к файлу лога не был установлен через init_app.
        """
        if not self.log_path:
            raise ValueError("Путь к файлу лога не установлен перед вызовом load_or_create().")

        try:
            logger.info(f"Попытка загрузки лога календаря из {self.log_path}...")
            raw_data = self.log_path.read_text(encoding="utf-8")
            self._log = CalendarLogModel.model_validate_json(raw_data)
            logger.info("Лог календаря успешно загружен и валидирован.")
        except FileNotFoundError:
            logger.warning(f"Файл лога календаря не найден. Создание нового пустого лога...")
            self._log = CalendarLogModel() # Создаем пустой
            self._save() # Сохраняем его
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"Лог календаря поврежден или невалиден. Ошибка: {e}", exc_info=True)
            logger.error("!!! Загрузка пустого лога в память (старый файл НЕ перезаписан).")
            logger.error("!!! Пожалуйста, исправьте calendar_log.json вручную или удалите его.")
            # Создаем пустой лог ТОЛЬКО в памяти
            self._log = CalendarLogModel()
        except Exception as e:
            logger.critical(f"Неизвестная ошибка при загрузке лога календаря: {e}", exc_info=True)
            # Создаем пустой лог в памяти как fallback
            self._log = CalendarLogModel()

    def get_log(self) -> CalendarLogModel:
        """Возвращает текущий объект лога календаря (из кэша или загружает).

        Returns:
            Объект CalendarLogModel с текущими отмеченными датами.

        Raises:
            ValueError: Если путь к логу не установлен.
            RuntimeError: Если не удалось загрузить или создать лог.
        """
        if not self.log_path:
            raise ValueError("Путь к файлу лога не установлен перед вызовом get_log().")

        if self._log is None:
            logger.info("Кэш лога календаря пуст, вызываем load_or_create().")
            self.load_or_create()

        # Повторная проверка на случай, если load_or_create не смог инициализировать _log
        if self._log is None:
            logger.error("Не удалось получить объект лога календаря после попытки загрузки/создания.")
            # Возвращаем пустой объект, чтобы избежать падения приложения, но логгируем ошибку
            return CalendarLogModel() # Возвращаем пустой по умолчанию в случае крайней ошибки

        return self._log

    def reset_log(self):
        """Очищает все отмеченные даты в логе и сохраняет изменения."""
        if self._log is not None:
            logger.warning("Сброс лога календаря...")
            self._log.marked_dates.clear()
            self._save()
        else:
            logger.error("Попытка сброса лога до его инициализации.")
            # Можно либо загрузить лог, сбросить и сохранить, либо просто ничего не делать
            self.load_or_create() # Загружаем/создаем
            if self._log is not None: # Если успешно
                self.reset_log() # Повторяем попытку

    def toggle_date(self, date_to_toggle: date, sticker: str, max_rotation: int) -> Dict[str, Any]:
        """Добавляет или удаляет отметку для указанной даты.

        Генерирует случайный угол поворота при добавлении.
        Сохраняет изменения в файл.

        Args:
            date_to_toggle: Объект `date`, для которого нужно переключить отметку.
            sticker: Символ (emoji) для использования в качестве стикера.
            max_rotation: Максимальный угол случайного поворота (в градусах).

        Returns:
            Словарь с результатом операции:
            {"status": "added" | "removed", "entry": Optional[dict]}
            где "entry" содержит данные добавленной отметки ({rotation, sticker}).

        Raises:
             RuntimeError: Если объект лога не был инициализирован.
        """
        if self._log is None:
            logger.error(f"Попытка переключить дату {date_to_toggle} до инициализации лога.")
            # Пытаемся загрузить лог перед операцией
            self.get_log()
            if self._log is None: # Если все еще не загружен
                 raise RuntimeError("Объект лога календаря не инициализирован.")

        operation_status: Dict[str, Any] = {}
        if date_to_toggle in self._log.marked_dates:
            # --- Удаление ---
            del self._log.marked_dates[date_to_toggle]
            logger.info(f"Удалена отметка для даты: {date_to_toggle}")
            operation_status = {"status": "removed"}
        else:
            # --- Добавление ---
            try:
                rotation = random.randint(-max_rotation, max_rotation)
            except ValueError: # Если max_rotation отрицательный
                 logger.warning(f"Некорректное значение max_rotation: {max_rotation}. Установлен поворот 0.")
                 rotation = 0

            entry = MarkedDateEntry(rotation=rotation, sticker=sticker)
            self._log.marked_dates[date_to_toggle] = entry
            logger.info(f"Добавлена отметка для даты: {date_to_toggle} (rotation: {rotation})")
            # Возвращаем созданную запись для немедленного обновления UI
            operation_status = {"status": "added", "entry": entry.model_dump()}

        # Сохраняем изменения в файл
        self._save()
        return operation_status