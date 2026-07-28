"""ПЗ-3: рабочий файл слушателя.

Реализуйте функции по контрактам ниже. Проверка:

    py -m unittest -v test_student.py

Стартовое состояние намеренно красное: функции ещё не реализованы.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path


def add_component(
    conn: sqlite3.Connection,
    *,
    name: str,
    version: str,
    license_spdx: str,
    supplier: str,
    criticality: str = "medium",
) -> int:
    """Проверить поля и атомарно добавить компонент."""
    raise NotImplementedError("Реализуйте add_component")


def search_components(
    conn: sqlite3.Connection,
    term: str,
    *,
    limit: int = 20,
) -> list[sqlite3.Row]:
    """Найти буквальный фрагмент имени, не интерпретируя его как SQL."""
    raise NotImplementedError("Реализуйте search_components")


def list_components(
    conn: sqlite3.Connection,
    *,
    sort_by: str = "name",
    descending: bool = False,
) -> list[sqlite3.Row]:
    """Отсортировать только по явно разрешённым столбцам."""
    raise NotImplementedError("Реализуйте list_components")


def change_license(
    conn: sqlite3.Connection,
    component_id: int,
    new_license: str,
) -> None:
    """В одной транзакции изменить лицензию и добавить событие аудита."""
    raise NotImplementedError("Реализуйте change_license")


def open_read_only(path: str | Path) -> sqlite3.Connection:
    """Открыть SQLite-файл так, чтобы запись была запрещена движком."""
    raise NotImplementedError("Реализуйте open_read_only")
