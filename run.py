# /mrhoustontimer/run.py
from app import create_app
import os
import appdirs
import socket
import webview  # <-- ИМПОРТ PYWEBVIEW

# --- 1. Реализация "Сингл-Инстанс" ---
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 47567))
except socket.error:
    print("Relationship Countdown Timer уже запущен.")
    exit()

# --- 2. Реализация "AppData" ---
APP_NAME = "Relationship_Countdown_Timer"
APP_AUTHOR = "MrHouston"
# Используем roaming=True, чтобы было в AppData/Roaming (корректнее)
SAVE_DIR = appdirs.user_data_dir(APP_NAME, APP_AUTHOR, roaming=True)

# --- 3. Создание папки ---
os.makedirs(SAVE_DIR, exist_ok=True)

print(f"--- {APP_NAME} ---")
print(f"Файлы сохранения лежат здесь: {SAVE_DIR}")

# --- 4. Создание приложения Flask (как и раньше) ---
# Мы передаем путь к SAVE_DIR в нашу "фабрику"
app = create_app(SAVE_DIR)
app.debug = True  # Включаем debug-режим для API (увидим ошибки в консоли)

# --- 5. ЗАПУСК PYWEBVIEW (НОВОЕ) ---
if __name__ == '__main__':
    print(f"Запуск окна pywebview...")

    # Создаем окно:
    # 1. Заголовок окна (из нашей константы)
    # 2. URL, который нужно открыть (в нашем случае - корень нашего Flask-приложения)
    window = webview.create_window(APP_NAME, app)

    # Запускаем приложение:
    webview.start(debug=True)

    # Код здесь "зависнет", пока пользователь не закроет окно.
    # После закрытия окна, скрипт завершится.
    print(f"--- {APP_NAME} завершен ---")