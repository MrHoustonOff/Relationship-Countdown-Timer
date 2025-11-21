<div align='center'>
 
# LoveTimer

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

![icon](https://github.com/user-attachments/assets/950f2762-b6e2-460c-942b-8cf99548eecb)

**LoveTimer** is a customizable desktop dashboard for tracking relationship milestones, managing joint calendars, and decision-making.

</div>

---

## Interface

### Timers
The core functionality includes two primary logic timers and an unlimited custom list:

1.  **Countdown ("Time until arrival"):** Tracks time remaining to a specific target date.
2.  **Elapsed ("Time together"):** Tracks time passed since a specific date.
3.  **Custom Timers:** Users can create, label, and delete an unlimited number of personal timers via settings.

**Customizability:** All text labels, date targets, and colors (digits, backgrounds) are fully configurable via the Settings panel.

<div align='center'>
<img width="800" alt="image" src="https://github.com/user-attachments/assets/f9cab316-aec3-4e31-92d1-581ba153059b" />
</div>

---

### Calendar

An interactive grid system for tracking visits and important dates.

*   **Logic:** Automatically generates months based on the "Departure" and "Arrival" date range configured in settings.
*   **Interaction:** Clicking a date toggles a sticker (emoji) and saves the state to `calendar_log.json`.
*   **Zoom:** Supports dynamic scaling (Ctrl + Mouse Wheel).

<div align='center'>
<img width="800" alt="image" src="https://github.com/user-attachments/assets/79ac64e7-5838-4768-95b4-1170ff15bd4d" />
</div>
  
---

##Wheel of Fortune

A physics-based decision-making tool.

*   **Config:** Options are added/removed via the UI and persist in `config.json`.
*   **Physics:** Includes momentum, friction, and visual feedback (particle effects) upon stopping.

<div align='center'>
<img width="800" alt="image" src="https://github.com/user-attachments/assets/e2ada6ea-be14-4df2-8c05-ddf7a3298971" />
</div>

---

## Audio Structure

**Important:** The application includes a fully functional audio engine (Howler.js backend), but **no audio files are distributed with this repository**.

To enable sound effects, the user must provide their own `.mp3` files. On the first launch, the application creates the necessary directory structure in your OS User Data folder (e.g., `%AppData%/MrHouston/LoveTimer` on Windows).

**Directory Structure / Структура папок:**

Place your `.mp3` files inside the corresponding folders:

```text
AppData/Roaming/LoveTimer/sounds/
├── calendarDay/      # Toggling a date 
├── CalendarMonth/    # Month completion 
├── DeleteButtons/    # UI delete actions 
├── Heartbeat/        # Hover effects 
├── PlusButtons/      # UI add actions
├── switchPage/       # Navigation 
├── Wheel/            # Wheel spinning tick 
├── WheelBoost/       # Wheel acceleration 
├── WheelEnd/         # Wheel stop 
└── WheelStop/        # Manual stop
```

*The system will automatically pick up any random file from the appropriate folder.*


---

## Tech Stack

*   **Backend:** Python 3.12+, Flask.
*   **GUI:** PyWebView (Edge Chromium engine).
*   **Frontend:** HTML5, CSS3 (Variables, Flex/Grid), JavaScript (ES6+).
*   **State Management:** Alpine.js (Reactive stores).
*   **Data:** JSON persistence (Pydantic validation).

---

## Installation & Build
### Requirements
*   Python 3.10+
*   Pip

### Development

1.  Clone the repository:
    ```bash
    git clone https://github.com/MrHoustonOff/Relationship-Countdown-Timer
    cd LoveTimer
    ```

2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

3.  Run the application:
    ```bash
    python run.py
    ```

### Build .exe

To create a standalone executable for Windows:

```bash
pyinstaller LoveTimer.spec --noconfirm --clean
```

The output file will be located in the `dist/` folder.
