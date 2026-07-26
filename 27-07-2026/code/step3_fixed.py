"""Журнал учёта МНИ. Шаг 3, исправленный вариант — ЭТАЛОН.

Тот же функционал, что в step3_defect.py, но все четыре дефекта устранены.
Сравнивайте файлы построчно: важно не «что написано», а «чем одно отличается
от другого».

    Д1  CWE-798  Захардкоженные учётные данные   -> секрет из окружения
    Д2  CWE-532  Секрет в журнале приложения     -> маскирование
    Д3  CWE-89   Внедрение SQL-кода              -> параметризованный запрос
    Д4  CWE-22   Выход за пределы каталога       -> нормализация и проверка пути

Запуск:
    py step3_fixed.py
"""

from __future__ import annotations

import hmac
import logging
import os
import secrets
import sqlite3
import sys
from pathlib import Path

EXPORT_DIR = Path(__file__).parent / "export"


# --- Д1: CWE-798. Секрет читается из переменной окружения ------------------
# В коде остаётся только ИМЯ переменной. Сам секрет живёт в окружении
# процесса, в .env (который добавлен в .gitignore) или в менеджере секретов.
# Сменить секрет теперь можно без пересборки программы.
def get_admin_token() -> str:
    """Вернуть служебный токен администратора из окружения."""
    token = os.environ.get("MEDIA_JOURNAL_ADMIN_TOKEN")
    if not token:
        raise RuntimeError(
            "Не задана переменная окружения MEDIA_JOURNAL_ADMIN_TOKEN. "
            "PowerShell:  $env:MEDIA_JOURNAL_ADMIN_TOKEN = 'ваш-токен'"
        )
    return token


def mask(secret: str) -> str:
    """Вернуть безопасную для журнала заглушку вместо секрета.

    Здесь намеренно НЕ печатается ничего, что вычисляется из самого секрета:
    ни первых символов, ни последних, ни длины. Каждая такая «мелочь» сужает
    перебор: длина отсекает большую часть вариантов, а известные два символа
    с каждого конца — почти всё остальное. Маска вида «ab***yz (длина 21)»
    выглядит аккуратно и при этом раздаёт ровно то, что защищали.

    Аргумент принимается только ради единообразия вызова: значение не
    используется, и это правильно.
    """
    return "***"


def connect() -> sqlite3.Connection:
    """Создать базу в памяти и наполнить её тестовыми данными."""
    connection = sqlite3.connect(":memory:")
    connection.execute(
        "CREATE TABLE media ("
        " inv TEXT PRIMARY KEY,"
        " kind TEXT NOT NULL,"
        " label TEXT NOT NULL,"
        " owner TEXT NOT NULL)"
    )
    connection.executemany(
        "INSERT INTO media (inv, kind, label, owner) VALUES (?, ?, ?, ?)",
        [
            ("МНИ-001", "USB-флеш", "Открыто", "Иванова А. П."),
            ("МНИ-002", "HDD", "Открыто", "Петров С. И."),
            ("МНИ-003", "SSD", "Конфиденциально", "Сидорова М. К."),
            ("МНИ-004", "USB-флеш", "Конфиденциально", "Кузнецов Д. А."),
        ],
    )
    connection.commit()
    return connection


def login(user: str, token: str) -> bool:
    """Проверить служебный токен администратора."""
    # --- Д2: CWE-532. В журнал идёт только маска, но не сам секрет ---------
    logging.info("Попытка входа: пользователь=%s токен=%s", user, mask(token))

    # hmac.compare_digest сравнивает значения за постоянное время.
    # Обычное «==» завершается на первом несовпавшем символе, и по времени
    # ответа секрет можно подобрать посимвольно (атака по времени).
    # Сравниваем байты, а не строки: со строками функция принимает только
    # ASCII и падает на кириллице.
    return hmac.compare_digest(
        token.encode("utf-8"), get_admin_token().encode("utf-8")
    )


def find_public(connection: sqlite3.Connection, query: str) -> list[tuple[str, ...]]:
    """Поиск по журналу для обычного пользователя.

    Возвращает ТОЛЬКО записи с грифом «Открыто» — при любом вводе.
    """
    # --- Д3: CWE-89. Параметризованный запрос ------------------------------
    # Текст запроса — константа, известная на этапе написания кода.
    # Значения передаются отдельно, через «?». База данных разбирает запрос
    # ДО того, как увидит данные, поэтому данные уже не могут стать командой.
    sql = (
        "SELECT inv, kind, label, owner FROM media "
        "WHERE label = 'Открыто' AND owner LIKE ?"
    )
    return connection.execute(sql, (f"%{query}%",)).fetchall()


def export_report(connection: sqlite3.Connection, filename: str) -> Path:
    """Выгрузить журнал в текстовый файл строго внутри каталога export/."""
    EXPORT_DIR.mkdir(exist_ok=True)
    base = EXPORT_DIR.resolve()

    # --- Д4: CWE-22. Нормализация пути и проверка границы ------------------
    # Сначала приводим путь к каноническому виду (resolve убирает «..»),
    # затем проверяем, что результат действительно лежит внутри base.
    # Проверять исходную строку на наличие «..» ненадёжно: способов записать
    # то же самое много (обратные слэши, кодирование, симлинки).
    candidate = (base / filename).resolve()
    if not candidate.is_relative_to(base):
        raise ValueError(
            f"Имя файла {filename!r} выводит за пределы каталога выгрузки"
        )

    rows = connection.execute("SELECT inv, kind, label, owner FROM media").fetchall()
    candidate.write_text(
        "\n".join("\t".join(row) for row in rows),
        encoding="utf-8",
    )
    return candidate


def demo() -> None:
    """Показать, что все четыре дефекта устранены."""
    logging.basicConfig(level=logging.INFO, format="    [ЖУРНАЛ] %(message)s")

    # Токен для демонстрации создаётся здесь же, случайным, на один запуск.
    # Записать сюда строковую константу «для удобства» нельзя: это ровно тот
    # самый Д1, который мы только что чинили, — просто под видом значения
    # по умолчанию. Значение по умолчанию для секрета — это захардкоженный
    # секрет, который никто не замечает.
    if not os.environ.get("MEDIA_JOURNAL_ADMIN_TOKEN"):
        os.environ["MEDIA_JOURNAL_ADMIN_TOKEN"] = secrets.token_urlsafe(16)

    connection = connect()

    print("=" * 70)
    print("Д1 и Д2 устранены")
    print("=" * 70)
    ok = login("ivanova", os.environ["MEDIA_JOURNAL_ADMIN_TOKEN"])
    print(f"    Вход выполнен: {ok}")
    print("    В журнале выше — заглушка. Ни самого токена, ни его длины,")
    print("    ни первых или последних символов там нет. В коде токена тоже нет:")
    print("    он берётся из окружения, а для этого запуска сгенерирован случайно.")

    print()
    print("=" * 70)
    print("Д3 устранён")
    print("=" * 70)
    print("\n  Обычный поиск:")
    for row in find_public(connection, "Иванова"):
        print("     ", row)

    print("\n  Та же строка атаки, что срабатывала раньше:")
    rows = find_public(connection, "%' OR label LIKE '%")
    print(f"      найдено записей: {len(rows)} (строка ищется как обычный текст)")
    leaked = [row for row in rows if row[2] == "Конфиденциально"]
    print(f"      утекло записей с грифом «Конфиденциально»: {len(leaked)}")

    print()
    print("=" * 70)
    print("Д4 устранён")
    print("=" * 70)
    good = export_report(connection, "report.txt")
    print(f"  Обычное имя файла -> {good}")
    try:
        export_report(connection, "../../журнал_украден.txt")
    except ValueError as error:
        print(f"  Имя файла с «..»  -> отклонено: {error}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    demo()
