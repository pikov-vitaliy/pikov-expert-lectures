"""ПЗ-1: создать учебный реестр компонентов из проверенных SQL-файлов."""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

CODE_DIR = Path(__file__).resolve().parent
SCHEMA_PATH = CODE_DIR / "schema.sql"
SEED_PATH = CODE_DIR / "seed.sql"


def build_database(path: str | Path) -> Path:
    """Создать новую БД; существующий файл никогда не перезаписывать."""
    db_path = Path(path).resolve()
    if db_path.exists():
        raise FileExistsError(
            f"{db_path} уже существует. Выберите другое имя или удалите файл вручную."
        )
    db_path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(db_path)
    try:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA trusted_schema = OFF")
        # executescript допустим только для двух доверенных файлов комплекта.
        connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        connection.executescript(SEED_PATH.read_text(encoding="utf-8"))
        connection.commit()
    except Exception:
        connection.close()
        db_path.unlink(missing_ok=True)
        raise
    else:
        connection.close()
    return db_path


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(
        description="Создать учебную SQLite-БД реестра компонентов."
    )
    parser.add_argument(
        "path",
        nargs="?",
        default="components.db",
        help="путь новой БД (по умолчанию components.db)",
    )
    args = parser.parse_args()

    try:
        db_path = build_database(args.path)
    except FileExistsError as exc:
        parser.error(str(exc))

    with sqlite3.connect(db_path) as connection:
        count = connection.execute("SELECT count(*) FROM components").fetchone()[0]
    print(f"Создана БД: {db_path}")
    print(f"Компонентов: {count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
