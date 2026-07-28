"""Проверки готовых примеров первых двух практических занятий."""

from __future__ import annotations

import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

import demo_unsafe_query
import step1_schema
import step2_secure_queries


class SchemaExampleTests(unittest.TestCase):
    def test_build_database_creates_seeded_registry(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "components.db"
            step1_schema.build_database(db_path)

            with closing(sqlite3.connect(db_path)) as conn:
                count = conn.execute("SELECT count(*) FROM components").fetchone()[0]
                foreign_keys = conn.execute("PRAGMA foreign_keys").fetchone()[0]
            self.assertEqual(count, 4)
            self.assertEqual(foreign_keys, 0)

    def test_build_database_refuses_to_overwrite_existing_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "components.db"
            db_path.touch()
            with self.assertRaises(FileExistsError):
                step1_schema.build_database(db_path)


class InjectionDemoTests(unittest.TestCase):
    def setUp(self) -> None:
        self.conn = sqlite3.connect(":memory:")
        demo_unsafe_query.prepare_demo(self.conn)

    def tearDown(self) -> None:
        self.conn.close()

    def test_intentionally_unsafe_query_demonstrates_injection(self) -> None:
        payload = "' OR 1=1 --"
        rows = demo_unsafe_query.unsafe_search(self.conn, payload)
        self.assertEqual(len(rows), 3)

    def test_parameterized_query_treats_payload_as_data(self) -> None:
        payload = "' OR 1=1 --"
        rows = demo_unsafe_query.safe_search(self.conn, payload)
        self.assertEqual(rows, [])


class SecureQueryExampleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "components.db"
        step1_schema.build_database(self.db_path)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")

    def tearDown(self) -> None:
        self.conn.close()
        self.tmp.cleanup()

    def test_search_uses_literal_substring(self) -> None:
        rows = step2_secure_queries.search_by_name(self.conn, "json")
        self.assertEqual([row["name"] for row in rows], ["json-parser"])

    def test_ordering_rejects_unknown_identifier(self) -> None:
        with self.assertRaises(ValueError):
            step2_secure_queries.list_components(
                self.conn,
                sort_by="name; DROP TABLE components; --",
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
