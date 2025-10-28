# /mrhoustontimer/app/core/calendar_log.py
import json
import random
from pathlib import Path
from datetime import date
from pydantic import BaseModel, Field, ValidationError
from typing import Optional, Dict


class MarkedDateEntry(BaseModel):
    rotation: int
    sticker: str


class CalendarLogModel(BaseModel):
    marked_dates: Dict[date, MarkedDateEntry] = Field(default_factory=dict)


class CalendarLog:
    def __init__(self, log_path: Optional[Path] = None):
        self.log_path: Optional[Path] = log_path
        self._log: Optional[CalendarLogModel] = None

    def init_app(self, log_path: Path):
        self.log_path = log_path

    def _save(self):
        if not self.log_path or not self._log:
            return
        json_data = self._log.model_dump_json(indent=4)
        self.log_path.write_text(json_data, encoding="utf-8")

    def load_or_create(self):
        """Загружает лог или создает пустой."""
        try:
            raw_data = self.log_path.read_text(encoding="utf-8")
            self._log = CalendarLogModel.model_validate_json(raw_data)

        # --- (ФИКС "Агрессивного" Except) ---
        except (FileNotFoundError, json.JSONDecodeError, ValidationError) as e:
            if isinstance(e, FileNotFoundError):
                print("[CalendarLog] Log file not found. Creating new empty log.")
            elif isinstance(e, (json.JSONDecodeError, ValidationError)):
                print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
                print("!!! [CalendarLog] CRITICAL: calendar_log.json is CORRUPT or INVALID.")
                print(f"!!! Error details: {e}")
                print("!!! Loading an empty log in memory, but NOT overwriting the broken file.")
                print("!!! Please fix calendar_log.json manually or delete it.")
                print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")

            self._log = CalendarLogModel()
            if isinstance(e, FileNotFoundError):
                self._save()  # Сохраняем, только если файла НЕ БЫЛО
        # --- Конец Исправления ---

    def get_log(self) -> CalendarLogModel:
        if not self._log:
            self.load_or_create()
        return self._log

    def reset_log(self):
        self._log.marked_dates.clear()
        self._save()

    def toggle_date(self, date_to_toggle: date, sticker: str, max_rotation: int) -> dict:
        if date_to_toggle in self._log.marked_dates:
            del self._log.marked_dates[date_to_toggle]
            self._save()
            return {"status": "removed"}
        else:
            rotation = random.randint(-max_rotation, max_rotation)
            entry = MarkedDateEntry(rotation=rotation, sticker=sticker)
            self._log.marked_dates[date_to_toggle] = entry
            self._save()
            return {"status": "added", "entry": entry.model_dump()}