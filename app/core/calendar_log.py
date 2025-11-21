# /mrhoustontimer/app/core/calendar_log.py
"""
Calendar Log Manager for the Relationship Countdown Timer.

Responsible for loading, saving, and modifying marked date entries
in the `calendar_log.json` file. Uses Pydantic for data validation.
"""

import json
import random
import logging
from pathlib import Path
from datetime import date
from typing import Optional, Dict, Any

from pydantic import BaseModel, Field, ValidationError

# Configure module-level logger
logger = logging.getLogger(__name__)

# --- Pydantic Models ---

class MarkedDateEntry(BaseModel):
    """Schema for a single marked date entry."""
    rotation: int = Field(..., description="Rotation angle of the sticker in degrees.")
    sticker: str = Field(..., description="Sticker symbol (emoji).")

class CalendarLogModel(BaseModel):
    """Root model for calendar_log.json.

    Maps date objects to MarkedDateEntry. Pydantic automatically handles
    serialization and deserialization of "YYYY-MM-DD" strings to date objects.
    """
    marked_dates: Dict[date, MarkedDateEntry] = Field(
        default_factory=dict,
        description="Dictionary of marked dates."
    )

# --- Calendar Log Manager ---

class CalendarLog:
    """Manages calendar log operations (IO, validation, modification)."""

    def __init__(self, log_path: Optional[Path] = None):
        """Initialize the CalendarLog manager.

        Args:
            log_path: Path to the calendar_log.json file (optional).
        """
        self.log_path: Optional[Path] = log_path
        self._log: Optional[CalendarLogModel] = None
        logger.debug("CalendarLog instance created.")

    def init_app(self, log_path: Path):
        """Set the log file path after instantiation.

        Args:
            log_path: Path object pointing to the log file.

        Raises:
            TypeError: If log_path is not a Path object.
        """
        if not isinstance(log_path, Path):
            raise TypeError("log_path must be a pathlib.Path object")
        self.log_path = log_path
        logger.info(f"Calendar log path set to: {self.log_path}")

    def _save(self):
        """Serialize and write the current log object to disk.

        Proceeds only if log_path and _log are initialized.
        """
        if not self.log_path:
            logger.error("Save failed: Log path not set.")
            return
        if self._log is None:
            logger.error("Save failed: Log object not initialized.")
            return

        try:
            json_data = self._log.model_dump_json(indent=4)
            self.log_path.write_text(json_data, encoding="utf-8")
            logger.debug(f"Calendar log saved to {self.log_path}")
        except (IOError, TypeError) as e:
            logger.critical(f"CRITICAL ERROR saving calendar log: {e}", exc_info=True)

    def load_or_create(self):
        """Load the log from disk or create a new one.

        - Creates a new file if it doesn't exist.
        - Falls back to an empty in-memory log if the file is corrupt,
          without overwriting the corrupt file to allow manual recovery.

        Raises:
            ValueError: If log_path is not set.
        """
        if not self.log_path:
            raise ValueError("Log path must be set before calling load_or_create().")

        try:
            logger.info(f"Attempting to load calendar log from {self.log_path}...")
            raw_data = self.log_path.read_text(encoding="utf-8")
            self._log = CalendarLogModel.model_validate_json(raw_data)
            logger.info("Calendar log successfully loaded and validated.")
        except FileNotFoundError:
            logger.warning("Calendar log file not found. Creating a new one...")
            self._log = CalendarLogModel()
            self._save()
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"Calendar log corrupted or invalid: {e}", exc_info=True)
            logger.error("!!! Loading empty log into memory (corrupt file NOT overwritten).")
            self._log = CalendarLogModel()
        except Exception as e:
            logger.critical(f"Unknown error loading calendar log: {e}", exc_info=True)
            self._log = CalendarLogModel()

    def get_log(self) -> CalendarLogModel:
        """Retrieve the current log object, loading it if necessary.

        Returns:
            The current CalendarLogModel instance.

        Raises:
            ValueError: If log_path is not set.
        """
        if not self.log_path:
            raise ValueError("Log path not set.")

        if self._log is None:
            logger.info("Calendar log cache empty, calling load_or_create().")
            self.load_or_create()

        if self._log is None:
            logger.error("Failed to initialize calendar log.")
            return CalendarLogModel()

        return self._log

    def reset_log(self):
        """Clear all marked dates and save changes."""
        if self._log is not None:
            logger.warning("Resetting calendar log...")
            self._log.marked_dates.clear()
            self._save()
        else:
            logger.error("Attempted to reset log before initialization.")
            self.load_or_create()
            if self._log is not None:
                self.reset_log()

    def toggle_date(self, date_to_toggle: date, sticker: str, max_rotation: int) -> Dict[str, Any]:
        """Toggle the marked status for a specific date.

        Args:
            date_to_toggle: The date to toggle.
            sticker: Emoji symbol to use.
            max_rotation: Maximum random rotation in degrees.

        Returns:
            Dictionary containing operation status ("added" or "removed")
            and the entry data if added.

        Raises:
            RuntimeError: If the log is not initialized.
        """
        if self._log is None:
            logger.error(f"Attempted to toggle date {date_to_toggle} before init.")
            self.get_log()
            if self._log is None:
                raise RuntimeError("Calendar log not initialized.")

        operation_status: Dict[str, Any] = {}
        
        if date_to_toggle in self._log.marked_dates:
            # Remove
            del self._log.marked_dates[date_to_toggle]
            logger.info(f"Removed mark for date: {date_to_toggle}")
            operation_status = {"status": "removed"}
        else:
            # Add
            try:
                rotation = random.randint(-max_rotation, max_rotation)
            except ValueError:
                logger.warning(f"Invalid max_rotation: {max_rotation}. Using 0.")
                rotation = 0

            entry = MarkedDateEntry(rotation=rotation, sticker=sticker)
            self._log.marked_dates[date_to_toggle] = entry
            logger.info(f"Added mark for date: {date_to_toggle} (rot: {rotation})")
            operation_status = {"status": "added", "entry": entry.model_dump()}

        self._save()
        return operation_status