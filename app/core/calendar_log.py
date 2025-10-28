# /mrhoustontimer/app/core/calendar_log.py
import json
import random
from pathlib import Path
from datetime import date
from pydantic import BaseModel, Field, ValidationError
from typing import Optional, Dict

# --- Pydantic Модели ---

class MarkedDateEntry(BaseModel):
    """Запись для одного отмеченного дня"""
    rotation: int
    sticker: str

class CalendarLogModel(BaseModel):
    """
    Корневая модель для calendar_log.json.
    Используем `dict[date, ...]` - Pydantic автоматически
    конвертирует "YYYY-MM-DD" в объекты date и обратно.
    Это и есть наша "Хэш-таблица O(1)" из ТЗ.
    """
    marked_dates: Dict[date, MarkedDateEntry] = Field(default_factory=dict)

# --- Класс Менеджера ---

class CalendarLog:
    """
    ООП-класс для управления calendar_log.json.
    """
    def __init__(self, log_path: Optional[Path] = None):
        self.log_path: Optional[Path] = log_path
        self._log: Optional[CalendarLogModel] = None

    def init_app(self, log_path: Path):
        """Инициализация пути (вызывается из app/__init__.py)"""
        self.log_path = log_path

    def _save(self):
        """Приватный метод для сохранения лога в .json"""
        if not self.log_path or not self._log:
            return
        json_data = self._log.model_dump_json(indent=4)
        self.log_path.write_text(json_data, encoding="utf-8")

    def load_or_create(self):
        """Загружает лог или создает пустой."""
        try:
            raw_data = self.log_path.read_text(encoding="utf-8")
            self._log = CalendarLogModel.model_validate_json(raw_data)
        except (FileNotFoundError, json.JSONDecodeError, ValidationError):
            self._log = CalendarLogModel() # Создаем пустой
            self._save()

    def get_log(self) -> CalendarLogModel:
        """Возвращает загруженный объект лога"""
        if not self._log:
            self.load_or_create()
        return self._log

    def reset_log(self):
        """Очищает календарь (ТЗ 6.2)"""
        self._log.marked_dates.clear()
        self._save()

    def toggle_date(self, date_to_toggle: date, sticker: str, max_rotation: int) -> dict:
        """
        Переключает (добавляет/удаляет) дату.
        Реализует ТЗ 5.2.
        """
        if date_to_toggle in self._log.marked_dates:
            # --- Удаление ---
            del self._log.marked_dates[date_to_toggle]
            self._save()
            return {"status": "removed"}
        else:
            # --- Добавление ---
            rotation = random.randint(-max_rotation, max_rotation)
            entry = MarkedDateEntry(rotation=rotation, sticker=sticker)
            self._log.marked_dates[date_to_toggle] = entry
            self._save()
            # Возвращаем созданную запись, чтобы фронтенд
            # мог ее сразу отрисовать без перезагрузки
            return {"status": "added", "entry": entry.model_dump()}