# /mrhoustontimer/run.py
"""Точка входа для приложения Relationship Countdown Timer.

Этот скрипт выполняет следующие задачи:
1. Проверяет, не запущен ли уже другой экземпляр приложения (Single-instance).
2. Определяет и создает директорию для сохранения данных в AppData.
3. Инициализирует Flask-приложение с помощью фабрики `create_app`.
4. Запускает окно pywebview, отображающее интерфейс приложения.
"""

import os
import socket
import appdirs
import webview
from app import create_app

# --- Константы ---
APP_NAME = "Relationship_Countdown_Timer"
APP_AUTHOR = "MrHouston"
SINGLE_INSTANCE_PORT = 47567 # Порт для проверки единственного экземпляра
MIN_WINDOW_WIDTH = 700
MIN_WINDOW_HEIGHT = 900
# ---

def check_single_instance(port: int) -> socket.socket | None:
    """Проверяет, запущен ли уже другой экземпляр, пытаясь занять порт.

    Args:
        port: Номер порта для проверки.

    Returns:
        Объект сокета, если порт свободен (удерживает порт), или None, если порт занят.
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(("127.0.0.1", port))
        # Оставляем сокет открытым, чтобы порт был занят
        return sock
    except socket.error:
        print(f"{APP_NAME} уже запущен.")
        return None

def get_save_directory(app_name: str, app_author: str) -> str:
    """Определяет и создает директорию для сохранения данных в AppData/Roaming.

    Args:
        app_name: Имя приложения.
        app_author: Имя разработчика/компании.

    Returns:
        Абсолютный путь к директории сохранения.
    """
    save_dir = appdirs.user_data_dir(app_name, app_author, roaming=True)
    try:
        os.makedirs(save_dir, exist_ok=True)
    except OSError as e:
        print(f"Ошибка при создании директории сохранения {save_dir}: {e}")
        # В реальном приложении можно попытаться использовать другую директорию или выйти
        exit(1) # Выходим с кодом ошибки
    return save_dir

# --- Основной блок выполнения ---
if __name__ == '__main__':
    # 1. Проверка единственного экземпляра
    instance_socket = check_single_instance(SINGLE_INSTANCE_PORT)
    if instance_socket is None:
        exit() # Выходим, если приложение уже запущено

    # 2. Получение и создание директории сохранения
    save_directory = get_save_directory(APP_NAME, APP_AUTHOR)

    print(f"--- {APP_NAME} ---")
    print(f"Файлы сохранения лежат здесь: {save_directory}")

    # 3. Создание Flask-приложения
    # Передаем путь к директории сохранения в фабрику
    flask_app = create_app(save_directory)
    # Включаем debug-режим Flask для API (показывает ошибки в консоли).
    # Для релизной сборки установить в False.
    flask_app.debug = True

    # 4. Запуск окна pywebview
    print(f"Запуск окна pywebview...")
    window = webview.create_window(
        APP_NAME,       # Заголовок окна
        flask_app,      # Flask-приложение для загрузки
        min_size=(MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT) # Минимальный размер окна
    )

    # Запускаем основной цикл событий pywebview.
    # debug=True включает инструменты разработчика (DevTools, обычно F12).
    # Для релизной сборки установить в False.
    webview.start(debug=True)

    # Этот код выполнится после закрытия окна
    print(f"--- {APP_NAME} завершен ---")

    # Закрываем сокет, освобождая порт
    instance_socket.close()