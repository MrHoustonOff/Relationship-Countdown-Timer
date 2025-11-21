# /mrhoustontimer/app/main.py
"""
Blueprint for serving the main HTML pages of the application.
"""

import logging
from flask import Blueprint, render_template, Response, current_app

# Create a Blueprint named 'main'
main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index() -> Response | str:
    """
    Renders the main Single Page Application (SPA) HTML.

    Returns:
        Flask Response containing the rendered 'index.html'.
    """
    try:
        return render_template('index.html')
    except Exception as e:
        current_app.logger.error(f"Rendering error in main/index: {e}", exc_info=True)
        return f"<h1>Interface Load Error</h1><p>{e}</p>", 500