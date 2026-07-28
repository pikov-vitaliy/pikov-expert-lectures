"""ПЗ-2: изолированная демонстрация CWE-89 на вымышленных данных.

Функция ``unsafe_search`` намеренно уязвима и существует только для сравнения.
Не копируйте её в рабочие проекты. Командная строка использует один
заранее заданный учебный payload и не принимает произвольный SQL.
"""

from __future__ import annotations

import sqlite3
import sys

TRAINING_PAYLOAD = "' OR 1=1 --"


def prepare_demo(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE components (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        ) STRICT;
        INSERT INTO components (name)
        VALUES ('crypto-core'), ('gui-toolkit'), ('json-parser');
        """
    )


def unsafe_search(
    conn: sqlite3.Connection,
    term: str,
) -> list[tuple[int, str]]:
    """НАМЕРЕННО УЯЗВИМО: пользовательская строка становится частью SQL."""
    sql = f"SELECT id, name FROM components WHERE name = '{term}'"
    return list(conn.execute(sql).fetchall())


def safe_search(
    conn: sqlite3.Connection,
    term: str,
) -> list[tuple[int, str]]:
    """БЕЗОПАСНЫЙ ВАРИАНТ: SQL-код и значение передаются раздельно."""
    return list(
        conn.execute(
            "SELECT id, name FROM components WHERE name = ?",
            (term,),
        ).fetchall()
    )


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    with sqlite3.connect(":memory:") as connection:
        prepare_demo(connection)
        unsafe_rows = unsafe_search(connection, TRAINING_PAYLOAD)
        safe_rows = safe_search(connection, TRAINING_PAYLOAD)

    print("Учебная строка:", repr(TRAINING_PAYLOAD))
    print("Небезопасный запрос вернул строк:", len(unsafe_rows))
    print("Параметризованный запрос вернул строк:", len(safe_rows))
    print("Вывод: placeholder отделяет значение от SQL-кода.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
