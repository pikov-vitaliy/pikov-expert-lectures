"""Журнал учёта МНИ. Шаг 3: хранение в базе данных SQLite.

!!! ВНИМАНИЕ: В ЭТОМ ФАЙЛЕ НАМЕРЕННО ОСТАВЛЕНЫ ЧЕТЫРЕ ДЕФЕКТА БЕЗОПАСНОСТИ. !!!
Это учебный образец для практического задания № 3. Не переносите этот код
в рабочие проекты. Исправленный вариант — в файле step3_fixed.py.

Ваша задача:
  1. Запустить файл и своими глазами увидеть, как срабатывает каждый дефект.
  2. Найти строку, в которой дефект возникает.
  3. Назвать класс дефекта (идентификатор CWE) и исправить его.

Подсказка: дефекты помечены комментарием «ДЕФЕКТ». Всего их четыре:
    Д1 — в объявлении константы после импортов;
    Д2 — в функции login();
    Д3 — в функции find_public();
    Д4 — в функции export_report().

Запуск:
    py step3_defect.py
"""

from __future__ import annotations

import logging
import os
import sqlite3
import sys
from pathlib import Path

EXPORT_DIR = Path(__file__).parent / "export"

# ---------------------------------------------------------------------------
# ДЕФЕКТ Д1. Секрет прямо в исходном коде.
# Такой токен уезжает в систему контроля версий и остаётся в её истории
# навсегда — даже если строку потом удалить. Сменить его можно только
# пересборкой и перевыпуском программы.
# ---------------------------------------------------------------------------
ADMIN_TOKEN = "s3cr3t-admin-token-2026"


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
    # -----------------------------------------------------------------------
    # ДЕФЕКТ Д2. Секрет попадает в журнал приложения.
    # Журналы обычно читает больше людей, чем исходный код: их собирают
    # в SIEM, выгружают в тикеты, прикладывают к обращениям в поддержку.
    # -----------------------------------------------------------------------
    logging.info("Попытка входа: пользователь=%s токен=%s", user, token)
    return token == ADMIN_TOKEN


def find_public(connection: sqlite3.Connection, query: str) -> list[tuple[str, ...]]:
    """Поиск по журналу для обычного пользователя.

    По замыслу функция обязана показывать ТОЛЬКО записи с грифом «Открыто».
    Записи с грифом «Конфиденциально» она возвращать не должна никогда.
    """
    # -----------------------------------------------------------------------
    # ДЕФЕКТ Д3. SQL-запрос собирается склейкой строк.
    # Значение, пришедшее от пользователя, становится частью текста запроса,
    # то есть частью команды, а не данными. Пользователь получает возможность
    # дописать в запрос собственное условие.
    # -----------------------------------------------------------------------
    sql = (
        "SELECT inv, kind, label, owner FROM media "
        "WHERE label = 'Открыто' AND owner LIKE '%" + query + "%'"
    )
    print(f"    [SQL] {sql}")
    return connection.execute(sql).fetchall()


def export_report(connection: sqlite3.Connection, filename: str) -> Path:
    """Выгрузить журнал в текстовый файл внутри каталога export/."""
    EXPORT_DIR.mkdir(exist_ok=True)

    # -----------------------------------------------------------------------
    # ДЕФЕКТ Д4. Имя файла приходит снаружи и подставляется
    # в путь как есть. Если в нём есть «..», файл уходит за пределы export/.
    # -----------------------------------------------------------------------
    path = Path(os.path.join(EXPORT_DIR, filename))

    lines = [
        f"{inv}\t{kind}\t{label}\t{owner}"
        for inv, kind, label, owner in connection.execute("SELECT * FROM media")
    ]
    # Сам файл не создаём: для учебного разбора достаточно увидеть,
    # КУДА он был бы записан.
    return path.resolve()


def demo() -> None:
    """Показать все три дефекта в работе."""
    logging.basicConfig(level=logging.INFO, format="    [ЖУРНАЛ] %(message)s")
    connection = connect()

    print("=" * 70)
    print("Д1 и Д2. Секрет в коде и секрет в журнале")
    print("=" * 70)
    login("ivanova", "s3cr3t-admin-token-2026")
    print(f"    Токен виден прямо в исходном коде: {ADMIN_TOKEN!r}")
    print("    Он же только что попал в журнал приложения — строка выше.")

    print()
    print("=" * 70)
    print("Д3. Внедрение SQL-кода")
    print("=" * 70)
    print("\n  Обычный поиск — работает как задумано:")
    for row in find_public(connection, "Иванова"):
        print("     ", row)

    print("\n  Тот же поиск, но пользователь ввёл специальную строку:")
    attack = "%' OR label LIKE '%"
    rows = find_public(connection, attack)
    for row in rows:
        print("     ", row)

    leaked = [row for row in rows if row[2] == "Конфиденциально"]
    print(f"\n  Утекло записей с грифом «Конфиденциально»: {len(leaked)}")
    print("  Функция обязана была вернуть 0 таких записей.")

    print()
    print("=" * 70)
    print("Д4. Выход за пределы каталога выгрузки")
    print("=" * 70)
    good = export_report(connection, "report.txt")
    print(f"  Обычное имя файла      -> {good}")
    bad = export_report(connection, "../../журнал_украден.txt")
    print(f"  Имя файла с «..»       -> {bad}")
    inside = str(bad).startswith(str(EXPORT_DIR.resolve()))
    print(f"  Файл остался внутри export/? {'да' if inside else 'НЕТ — выход за каталог'}")


if __name__ == "__main__":
    # logging по умолчанию пишет в stderr, поэтому настраиваем оба потока.
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    demo()
