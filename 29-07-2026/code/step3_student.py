"""ПЗ-3: рабочий файл слушателя.

Реализуйте функции по контрактам ниже. Проверка:

    py -m unittest -v test_student.py

Стартовое состояние намеренно красное: функции ещё не реализованы.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path


_VALID_CRITICALITY = frozenset({"low", "medium", "high"})


def add_component(
    conn: sqlite3.Connection,
    *,
    name: str,
    version: str,
    license_spdx: str,
    supplier: str,
    criticality: str = "medium",
) -> int:
    """Проверить поля и атомарно добавить компонент.

    Пустое или пробельное ``name`` и неизвестная ``criticality`` —
    ``raise ValueError`` (ещё до обращения к SQL).
    """
    if not name or not name.strip():
        raise ValueError("name: обязательно для заполнения")
    if criticality not in _VALID_CRITICALITY:
        raise ValueError("criticality: допустимы low, medium, high")

    with conn:
        cursor = conn.execute(
            """
            INSERT INTO components
                (name, version, license_spdx, supplier, criticality)
            VALUES (?, ?, ?, ?, ?)
            """,
            (name, version, license_spdx, supplier, criticality),
        )
        return int(cursor.lastrowid)


def _escape_like(value: str) -> str:
    return value.replace("!", "!!").replace("%", "!%").replace("_", "!_")


def search_components(
    conn: sqlite3.Connection,
    term: str,
    *,
    limit: int = 20,
) -> list[sqlite3.Row]:
    """Найти буквальный фрагмент имени, не интерпретируя его как SQL.

    Недопустимый ``limit`` (разрешено от 1 до 100) — ``raise ValueError``.
    """
    if not 1 <= limit <= 100:
        raise ValueError("limit: допустим диапазон от 1 до 100")

    pattern = f"%{_escape_like(term)}%"
    return list(
        conn.execute(
            """
            SELECT id, name, version, license_spdx, supplier, criticality
            FROM components
            WHERE name LIKE ? ESCAPE '!'
            ORDER BY name COLLATE NOCASE, version
            LIMIT ?
            """,
            (pattern, limit),
        ).fetchall()
    )


_SORT_COLUMNS = {
    "name": "name",
    "version": "version",
    "license_spdx": "license_spdx",
    "criticality": "criticality",
}


def list_components(
    conn: sqlite3.Connection,
    *,
    sort_by: str = "name",
    descending: bool = False,
) -> list[sqlite3.Row]:
    """Отсортировать только по явно разрешённым столбцам.

    Неизвестный ``sort_by`` — ``raise ValueError``.
    """
    try:
        column = _SORT_COLUMNS[sort_by]
    except KeyError as exc:
        raise ValueError(
            "sort_by: допустимы " + ", ".join(sorted(_SORT_COLUMNS))
        ) from exc

    direction = "DESC" if descending else "ASC"
    sql = (
        "SELECT id, name, version, license_spdx, supplier, criticality "
        f"FROM components ORDER BY {column} {direction}, id ASC"
    )
    return list(conn.execute(sql).fetchall())


def change_license(
    conn: sqlite3.Connection,
    component_id: int,
    new_license: str,
) -> None:
    """В одной транзакции изменить лицензию и добавить событие аудита.

    Если компонент не найден — ``raise LookupError``; событие аудита
    при этом не добавляется.
    """
    with conn:
        row = conn.execute(
            "SELECT id FROM components WHERE id = ?", (component_id,)
        ).fetchone()
        if row is None:
            raise LookupError(f"Компонент {component_id} не найден")

        conn.execute(
            "UPDATE components SET license_spdx = ? WHERE id = ?",
            (new_license, component_id),
        )
        conn.execute(
            "INSERT INTO audit_events (event_type, component_id) VALUES (?, ?)",
            ("license_changed", component_id),
        )


def open_read_only(path: str | Path) -> sqlite3.Connection:
    """Открыть SQLite-файл так, чтобы запись была запрещена движком."""
    p = Path(path).resolve()
    uri = f"file:{p.as_posix()}?mode=ro"
    return sqlite3.connect(uri, uri=True)
