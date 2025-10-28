# /mrhoustontimer/app/main.py
"""Blueprint для отображения основных HTML-страниц приложения."""

from flask import Blueprint, render_template, Response

# Создаем Blueprint с именем 'main'
# __name__ помогает Flask найти шаблоны и статические файлы относительно этого модуля
main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index() -> Response | str:
    """Отображает главную и единственную HTML-страницу приложения (SPA).

    Returns:
        Flask Response с отрендеренным HTML-шаблоном 'index.html'.
    """
    try:
        # Пытаемся отрендерить основной шаблон
        return render_template('index.html')
    except Exception as e:
        # В случае ошибки рендеринга (например, шаблон не найден)
        # возвращаем простое сообщение об ошибке
        print(f"!!! ОШИБКА РЕНДЕРИНГА в main.py/index: {e}")
        # Можно вернуть более информативную HTML-страницу ошибки
        return f"<h1>Ошибка загрузки интерфейса</h1><p>{e}</p>", 500

# Сюда можно добавить другие маршруты для HTML-страниц, если они понадобятся.
# Например:
# @main_bp.route('/about')
# def about():
#     return render_template('about.html')