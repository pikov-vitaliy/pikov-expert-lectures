"""ПЗ-3: рабочий файл слушателя — шаблон с подсказками.

Реализуйте функции по контрактам ниже. Проверка:

    py -m unittest -v test_student.py

Стартовое состояние намеренно красное: функции ещё не реализованы.

Чтобы увидеть готовое решение, раскомментируйте блоки с пометкой «ГОТОВОЕ РЕШЕНИЕ»
и удалите/закомментируйте соответствующие заглушки ``raise NotImplementedError``.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path


# ГОТОВОЕ РЕШЕНИЕ: _VALID_CRITICALITY = frozenset({"low", "medium", "high"})


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
    raise NotImplementedError("Реализуйте add_component")

    # --- ГОТОВОЕ РЕШЕНИЕ (раскомментируйте и удалите raise выше) ---
    # if not name or not name.strip():
    #     raise ValueError("name: обязательно для заполнения")
    # if criticality not in _VALID_CRITICALITY:
    #     raise ValueError("criticality: допустимы low, medium, high")
    #
    # with conn:
    #     cursor = conn.execute(
    #         """
    #         INSERT INTO components
    #             (name, version, license_spdx, supplier, criticality)
    #         VALUES (?, ?, ?, ?, ?)
    #         """,
    #         (name, version, license_spdx, supplier, criticality),
    #     )
    #     return int(cursor.lastrowid)


# ГОТОВОЕ РЕШЕНИЕ (раскомментируйте):
# def _escape_like(value: str) -> str:
#     return value.replace("!", "!!").replace("%", "!%").replace("_", "!_")


def search_components(
    conn: sqlite3.Connection,
    term: str,
    *,
    limit: int = 20,
) -> list[sqlite3.Row]:
    """Найти буквальный фрагмент имени, не интерпретируя его как SQL.

    Недопустимый ``limit`` (разрешено от 1 до 100) — ``raise ValueError``.
    """
    raise NotImplementedError("Реализуйте search_components")

    # --- ГОТОВОЕ РЕШЕНИЕ (раскомментируйте и удалите raise выше) ---
    # if not 1 <= limit <= 100:
    #     raise ValueError("limit: допустим диапазон от 1 до 100")
    #
    # pattern = f"%{_escape_like(term)}%"
    # return list(
    #     conn.execute(
    #         """
    #         SELECT id, name, version, license_spdx, supplier, criticality
    #         FROM components
    #         WHERE name LIKE ? ESCAPE '!'
    #         ORDER BY name COLLATE NOCASE, version
    #         LIMIT ?
    #         """,
    #         (pattern, limit),
    #     ).fetchall()
    # )


# ГОТОВОЕ РЕШЕНИЕ (раскомментируйте):
# _SORT_COLUMNS = {
#     "name": "name",
#     "version": "version",
#     "license_spdx": "license_spdx",
#     "criticality": "criticality",
# }


def list_components(
    conn: sqlite3.Connection,
    *,
    sort_by: str = "name",
    descending: bool = False,
) -> list[sqlite3.Row]:
    """Отсортировать только по явно разрешённым столбцам.

    Неизвестный ``sort_by`` — ``raise ValueError``.
    """
    raise NotImplementedError("Реализуйте list_components")

    # --- ГОТОВОЕ РЕШЕНИЕ (раскомментируйте и удалите raise выше) ---
    # try:
    #     column = _SORT_COLUMNS[sort_by]
    # except KeyError as exc:
    #     raise ValueError(
    #         "sort_by: допустимы " + ", ".join(sorted(_SORT_COLUMNS))
    #     ) from exc
    #
    # direction = "DESC" if descending else "ASC"
    # sql = (
    #     "SELECT id, name, version, license_spdx, supplier, criticality "
    #     f"FROM components ORDER BY {column} {direction}, id ASC"
    # )
    # return list(conn.execute(sql).fetchall())


def change_license(
    conn: sqlite3.Connection,
    component_id: int,
    new_license: str,
) -> None:
    """В одной транзакции изменить лицензию и добавить событие аудита.

    Если компонент не найден — ``raise LookupError``; событие аудита
    при этом не добавляется.
    """
    raise NotImplementedError("Реализуйте change_license")

    # --- ГОТОВОЕ РЕШЕНИЕ (раскомментируйте и удалите raise выше) ---
    # with conn:
    #     row = conn.execute(
    #         "SELECT id FROM components WHERE id = ?", (component_id,)
    #     ).fetchone()
    #     if row is None:
    #         raise LookupError(f"Компонент {component_id} не найден")
    #
    #     conn.execute(
    #         "UPDATE components SET license_spdx = ? WHERE id = ?",
    #         (new_license, component_id),
    #     )
    #     conn.execute(
    #         "INSERT INTO audit_events (event_type, component_id) VALUES (?, ?)",
    #         ("license_changed", component_id),
    #     )


def open_read_only(path: str | Path) -> sqlite3.Connection:
    """Открыть SQLite-файл так, чтобы запись была запрещена движком."""
    raise NotImplementedError("Реализуйте open_read_only")

    # --- ГОТОВОЕ РЕШЕНИЕ (раскомментируйте и удалите raise выше) ---
    # p = Path(path).resolve()
    # uri = f"{p.as_uri()}?mode=ro"
    # return sqlite3.connect(uri, uri=True)
