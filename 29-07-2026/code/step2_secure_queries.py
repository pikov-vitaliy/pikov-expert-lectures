"""ПЗ-2: параметризованный поиск и allowlist для ORDER BY."""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

_SORT_COLUMNS = {
    "name": "name",
    "version": "version",
    "license_spdx": "license_spdx",
    "criticality": "criticality",
}


def _escape_like(value: str) -> str:
    return value.replace("!", "!!").replace("%", "!%").replace("_", "!_")


def search_by_name(
    conn: sqlite3.Connection,
    term: str,
    *,
    limit: int = 20,
) -> list[sqlite3.Row]:
    if not 1 <= limit <= 100:
        raise ValueError("limit: допустим диапазон от 1 до 100")
    cleaned = term.strip()
    if not cleaned:
        return []
    if len(cleaned) > 100:
        raise ValueError("term: длина превышает 100 символов")

    pattern = f"%{_escape_like(cleaned)}%"
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


def list_components(
    conn: sqlite3.Connection,
    *,
    sort_by: str = "name",
    descending: bool = False,
) -> list[sqlite3.Row]:
    try:
        column = _SORT_COLUMNS[sort_by]
    except KeyError as exc:
        raise ValueError(
            "sort_by: допустимы " + ", ".join(sorted(_SORT_COLUMNS))
        ) from exc
    if not isinstance(descending, bool):
        raise ValueError("descending: ожидается логическое значение")

    direction = "DESC" if descending else "ASC"
    # Оба интерполируемых токена принадлежат закрытым наборам в коде.
    sql = (
        "SELECT id, name, version, license_spdx, supplier, criticality "  # nosec B608
        f"FROM components ORDER BY {column} {direction}, id ASC"
    )
    return list(
        conn.execute(sql).fetchall()
    )


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(
        description="Безопасный поиск по учебному реестру компонентов."
    )
    parser.add_argument("--db", default="components.db", help="путь к SQLite-БД")
    parser.add_argument("--term", default="json", help="фрагмент имени")
    parser.add_argument(
        "--sort",
        default="name",
        choices=sorted(_SORT_COLUMNS),
        help="разрешённый столбец сортировки",
    )
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.is_file():
        parser.error("БД не найдена. Сначала выполните: py step1_schema.py")

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA trusted_schema = OFF")
        matches = search_by_name(connection, args.term)
        all_rows = list_components(connection, sort_by=args.sort)

    print(f"Найдено по строке {args.term!r}: {len(matches)}")
    for row in matches:
        print(f"  {row['name']} {row['version']} — {row['license_spdx']}")
    print(f"Всего компонентов в реестре: {len(all_rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
