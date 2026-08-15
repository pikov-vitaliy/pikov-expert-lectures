"""Регрессионные проверки практикума.

По умолчанию проверяется ``step3_student``. Только после собственной попытки
открытое готовое решение можно проверить, задав переменную окружения
``REGISTRY_MODULE=step3_student_solution``.
"""

from __future__ import annotations

import importlib
import os
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

MODULE_NAME = os.environ.get("REGISTRY_MODULE", "step3_student")
registry = importlib.import_module(MODULE_NAME)
CODE_DIR = Path(__file__).resolve().parent
SCHEMA_PATH = CODE_DIR / "schema.sql"


class RegistryTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "components.db"
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        self.conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))

    def tearDown(self) -> None:
        self.conn.close()
        self.tmp.cleanup()

    def insert_fixture(
        self,
        name: str = "libalpha",
        version: str = "1.0.0",
        license_spdx: str = "MIT",
        supplier: str = "Example",
        criticality: str = "medium",
    ) -> int:
        cursor = self.conn.execute(
            """
            INSERT INTO components
                (name, version, license_spdx, supplier, criticality)
            VALUES (?, ?, ?, ?, ?)
            """,
            (name, version, license_spdx, supplier, criticality),
        )
        self.conn.commit()
        return int(cursor.lastrowid)


class AddComponentTests(RegistryTestCase):
    def test_add_component_persists_all_fields(self) -> None:
        component_id = registry.add_component(
            self.conn,
            name="libsafe",
            version="2.4.1",
            license_spdx="Apache-2.0",
            supplier="Example Org",
            criticality="high",
        )

        row = self.conn.execute(
            "SELECT * FROM components WHERE id = ?", (component_id,)
        ).fetchone()
        self.assertIsNotNone(row)
        assert row is not None
        self.assertEqual(row["name"], "libsafe")
        self.assertEqual(row["version"], "2.4.1")
        self.assertEqual(row["license_spdx"], "Apache-2.0")
        self.assertEqual(row["supplier"], "Example Org")
        self.assertEqual(row["criticality"], "high")

        # Второе соединение: незакоммиченная транзакция не видна
        # другим соединениям, поэтому данные обязаны быть зафиксированы.
        with closing(sqlite3.connect(self.db_path)) as checker:
            persisted = checker.execute(
                "SELECT name FROM components WHERE id = ?",
                (component_id,),
            ).fetchone()
        self.assertIsNotNone(persisted)
        assert persisted is not None
        self.assertEqual(persisted[0], "libsafe")

    def test_add_component_treats_sql_payload_as_plain_data(self) -> None:
        payload = "x'); DROP TABLE components; --"
        registry.add_component(
            self.conn,
            name=payload,
            version="1.0",
            license_spdx="MIT",
            supplier="Training",
        )

        stored = self.conn.execute("SELECT name FROM components").fetchone()
        self.assertEqual(stored["name"], payload)
        self.assertEqual(
            self.conn.execute("SELECT count(*) FROM components").fetchone()[0],
            1,
        )

    def test_add_component_rejects_blank_name_before_sql(self) -> None:
        with self.assertRaises(ValueError):
            registry.add_component(
                self.conn,
                name="   ",
                version="1.0",
                license_spdx="MIT",
                supplier="Training",
            )

    def test_add_component_rejects_unknown_criticality(self) -> None:
        with self.assertRaises(ValueError):
            registry.add_component(
                self.conn,
                name="libsafe",
                version="1.0",
                license_spdx="MIT",
                supplier="Training",
                criticality="urgent",
            )


class SearchTests(RegistryTestCase):
    def test_search_finds_case_insensitive_substring(self) -> None:
        self.insert_fixture(name="CryptoLibrary")
        rows = registry.search_components(self.conn, "crypto")
        self.assertEqual([row["name"] for row in rows], ["CryptoLibrary"])

    def test_search_does_not_turn_injection_text_into_sql(self) -> None:
        self.insert_fixture(name="libalpha")
        self.insert_fixture(name="libbeta", version="2.0")
        rows = registry.search_components(self.conn, "' OR 1=1 --")
        self.assertEqual(rows, [])

    def test_search_treats_percent_as_literal_character(self) -> None:
        self.insert_fixture(name="codec100%")
        self.insert_fixture(name="codec1000", version="2.0")
        rows = registry.search_components(self.conn, "100%")
        self.assertEqual([row["name"] for row in rows], ["codec100%"])

        # Подчёркивание — второй метасимвол LIKE: терм "b_c" не должен
        # работать как «b, любой символ, c» и находить "abXc"; находится
        # только буквальное "ab_c".
        self.insert_fixture(name="ab_c", version="3.0")
        self.insert_fixture(name="abXc", version="3.0")
        rows = registry.search_components(self.conn, "b_c")
        self.assertEqual([row["name"] for row in rows], ["ab_c"])

    def test_search_rejects_unbounded_limit(self) -> None:
        with self.assertRaises(ValueError):
            registry.search_components(self.conn, "lib", limit=1000)
        # Границы контракта: крайние значения диапазона 1..100 допустимы
        # и не должны бросать исключение.
        registry.search_components(self.conn, "lib", limit=1)
        registry.search_components(self.conn, "lib", limit=100)
        # Значения сразу за границами диапазона отклоняются.
        for bad_limit in (0, -1, 101):
            with self.assertRaises(ValueError):
                registry.search_components(self.conn, "lib", limit=bad_limit)


class OrderingTests(RegistryTestCase):
    def test_list_components_accepts_only_allowlisted_sort_columns(self) -> None:
        self.insert_fixture(name="Zulu")
        self.insert_fixture(name="Alpha", version="2.0")
        rows = registry.list_components(self.conn, sort_by="name")
        self.assertEqual([row["name"] for row in rows], ["Alpha", "Zulu"])

    def test_list_components_rejects_sql_in_sort_column(self) -> None:
        self.insert_fixture()
        with self.assertRaises(ValueError):
            registry.list_components(
                self.conn,
                sort_by="name; DROP TABLE components; --",
            )
        self.assertEqual(
            self.conn.execute("SELECT count(*) FROM components").fetchone()[0],
            1,
        )
        # Полный обход allowlist: каждый разрешённый ключ сортировки
        # обязан работать без исключения.
        for allowed in ("criticality", "license_spdx", "name", "version"):
            registry.list_components(self.conn, sort_by=allowed)
        # Реальный столбец, отсутствующий в allowlist («безопасно
        # выглядит», но не разрешён явно), тоже отклоняется.
        with self.assertRaises(ValueError):
            registry.list_components(self.conn, sort_by="supplier")


class TransactionTests(RegistryTestCase):
    def test_change_license_updates_component_and_adds_audit_event(self) -> None:
        component_id = self.insert_fixture()
        registry.change_license(self.conn, component_id, "BSD-3-Clause")

        component = self.conn.execute(
            "SELECT license_spdx FROM components WHERE id = ?",
            (component_id,),
        ).fetchone()
        audit = self.conn.execute(
            """
            SELECT event_type, component_id
            FROM audit_events
            WHERE component_id = ?
            """,
            (component_id,),
        ).fetchone()
        self.assertEqual(component["license_spdx"], "BSD-3-Clause")
        self.assertEqual(audit["event_type"], "license_changed")

        # Второе соединение: незакоммиченная транзакция не видна
        # другим соединениям — проверяем, что фиксация действительно была.
        with closing(sqlite3.connect(self.db_path)) as checker:
            persisted_license = checker.execute(
                "SELECT license_spdx FROM components WHERE id = ?",
                (component_id,),
            ).fetchone()[0]
            persisted_events = checker.execute(
                "SELECT count(*) FROM audit_events WHERE component_id = ?",
                (component_id,),
            ).fetchone()[0]
        self.assertEqual(persisted_license, "BSD-3-Clause")
        self.assertEqual(persisted_events, 1)

    def test_change_license_rolls_back_when_component_is_missing(self) -> None:
        with self.assertRaises(LookupError):
            registry.change_license(self.conn, 999, "MIT")
        self.assertEqual(
            self.conn.execute("SELECT count(*) FROM audit_events").fetchone()[0],
            0,
        )
        # Второе соединение: незакоммиченная транзакция не видна другим
        # соединениям — в файле БД события аудита тоже быть не должно.
        with closing(sqlite3.connect(self.db_path)) as checker:
            persisted_events = checker.execute(
                "SELECT count(*) FROM audit_events"
            ).fetchone()[0]
        self.assertEqual(persisted_events, 0)

        # Сценарий 2: атомарность при сбое журнала аудита. UPDATE успешен,
        # но INSERT в audit_events падает (учебный триггер имитирует отказ
        # журнала) — изменение лицензии обязано откатиться вместе с ним.
        # Реализация с двумя отдельными commit здесь провалится: лицензия
        # останется изменённой без записи в аудите.
        component_id = self.insert_fixture(license_spdx="Apache-2.0")
        self.conn.execute(
            """
            CREATE TRIGGER block_audit BEFORE INSERT ON audit_events
            BEGIN
                SELECT RAISE(ABORT, 'учебный сбой журнала аудита');
            END
            """
        )
        try:
            # RAISE(ABORT) приходит как подкласс IntegrityError; ловим
            # DatabaseError для устойчивости к деталям драйвера.
            with self.assertRaises(sqlite3.DatabaseError):
                registry.change_license(self.conn, component_id, "MIT")
            with closing(sqlite3.connect(self.db_path)) as checker:
                persisted_license = checker.execute(
                    "SELECT license_spdx FROM components WHERE id = ?",
                    (component_id,),
                ).fetchone()[0]
                persisted_events = checker.execute(
                    "SELECT count(*) FROM audit_events WHERE component_id = ?",
                    (component_id,),
                ).fetchone()[0]
            self.assertEqual(persisted_license, "Apache-2.0")
            self.assertEqual(persisted_events, 0)
        finally:
            self.conn.execute("DROP TRIGGER block_audit")


class LeastPrivilegeTests(RegistryTestCase):
    def test_read_only_connection_can_read_but_cannot_write(self) -> None:
        self.insert_fixture()
        read_only = registry.open_read_only(self.db_path)
        try:
            self.assertEqual(
                read_only.execute("SELECT count(*) FROM components").fetchone()[0],
                1,
            )
            with self.assertRaises(sqlite3.OperationalError):
                read_only.execute(
                    """
                    INSERT INTO components
                        (name, version, license_spdx, supplier, criticality)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    ("forbidden", "1.0", "MIT", "Training", "low"),
                )
        finally:
            read_only.close()

    def test_read_only_connection_handles_uri_reserved_path_characters(self) -> None:
        """``#``/``?`` в пути не должны становиться fragment/query URI."""
        filenames = ["components # training.db"]
        if os.name != "nt":  # Windows запрещает ``?`` в имени файла.
            filenames.append("components ? training.db")

        for filename in filenames:
            with self.subTest(filename=filename):
                special_path = Path(self.tmp.name) / filename
                with closing(sqlite3.connect(special_path)) as writer:
                    writer.execute("CREATE TABLE marker (value TEXT NOT NULL)")
                    writer.execute("INSERT INTO marker(value) VALUES ('expected')")
                    writer.commit()

                read_only = registry.open_read_only(special_path)
                try:
                    self.assertEqual(
                        read_only.execute("SELECT value FROM marker").fetchone()[0],
                        "expected",
                    )
                    with self.assertRaises(sqlite3.OperationalError):
                        read_only.execute(
                            "INSERT INTO marker(value) VALUES ('forbidden')"
                        )
                finally:
                    read_only.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
