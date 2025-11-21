# /mrhoustontimer/run.py
"""
Entry point for the Relationship Countdown Timer application.

Tasks:
1. Enforce Single Instance (prevent multiple windows).
2. Resolve AppData directory for user data storage.
3. Initialize Flask app.
4. Launch PyWebView window.
"""

import os
import socket
import logging
import appdirs
import webview
from app import create_app

# --- Constants ---
APP_NAME = "LoveTimer"
APP_AUTHOR = "MrHouston"
SINGLE_INSTANCE_PORT = 47567  # Port used for the lock
MIN_WINDOW_WIDTH = 700
MIN_WINDOW_HEIGHT = 900
# -----------------

def check_single_instance(port: int) -> socket.socket | None:
    """
    Checks if another instance is running by attempting to bind a local port.

    Args:
        port: Port number to check.

    Returns:
        socket object (lock) if successful, None if port is occupied.
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(("127.0.0.1", port))
        # Keep socket open to maintain the lock
        return sock
    except socket.error:
        print(f"[{APP_NAME}] Application is already running.")
        return None

def get_save_directory(app_name: str, app_author: str) -> str:
    """
    Resolves the user data directory (AppData/Roaming on Windows).
    Creates it if it doesn't exist.

    Returns:
        Absolute path to the storage directory.
    """
    save_dir = appdirs.user_data_dir(app_name, app_author, roaming=True)
    try:
        os.makedirs(save_dir, exist_ok=True)
    except OSError as e:
        print(f"CRITICAL: Could not create save directory {save_dir}: {e}")
        exit(1)
    return save_dir

# --- Main Execution ---
if __name__ == '__main__':
    # 1. Single Instance Check
    instance_socket = check_single_instance(SINGLE_INSTANCE_PORT)
    if instance_socket is None:
        exit()

    # 2. Setup Data Directory
    save_directory = get_save_directory(APP_NAME, APP_AUTHOR)

    print(f"--- {APP_NAME} Startup ---")
    print(f"Data Directory: {save_directory}")

    # 3. Create Flask App
    # Pass the resolved data directory to the factory
    flask_app = create_app(save_directory)
    
    # Enable Flask debug for API error visibility in console.
    # Set to False for production/release builds.
    flask_app.debug = True

    # 4. Launch PyWebView
    print("Launching GUI...")
    window = webview.create_window(
        APP_NAME,
        flask_app,
        min_size=(MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT),
    )

    webview.start(debug=False, icon="icon.ico")

    print(f"--- {APP_NAME} Terminated ---")

    # Release the lock
    instance_socket.close()