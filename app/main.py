# /mrhoustontimer/app/main.py
from flask import Blueprint, render_template

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """
    Отдает нашу главную (и единственную) HTML-страницу.
    """
    # Мы пока не создали этот файл, но создадим на Этапе 2
    return render_template('index.html')

