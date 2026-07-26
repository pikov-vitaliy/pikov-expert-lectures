"""Тесты журнала учёта МНИ.

Два вида тестов и разница между ними — главная мысль пятой пары:

  * ФУНКЦИОНАЛЬНЫЕ тесты проверяют, что программа делает то, что должна.
  * РЕГРЕССИОННЫЕ ТЕСТЫ БЕЗОПАСНОСТИ проверяют, что программа НЕ делает того,
    чего не должна. Каждый такой тест — это память об уже найденной
    уязвимости. Пока тест зелёный, дефект не может вернуться в код
    незамеченным. Это процесс 5.18 ГОСТ Р 56939-2024 в самом дешёвом
    исполнении: одна функция вместо целого регламента.

Запуск без установки чего-либо (unittest входит в стандартную библиотеку):
    py -m unittest -v test_journal.py

Запуск через pytest, если он установлен (pytest понимает unittest-классы):
    py -m pytest -v test_journal.py
"""

from __future__ import annotations

import logging
import os
import unittest

import step3_fixed
from step2_class import Journal, Medium, ValidationError

TEST_TOKEN = "test-token-do-not-use-in-production"


# ---------------------------------------------------------------------------
# Функциональные тесты: программа делает то, что должна
# ---------------------------------------------------------------------------
class TestMediumValidation(unittest.TestCase):
    """Проверка правил учёта при создании записи."""

    def test_correct_record_is_created(self) -> None:
        medium = Medium("МНИ-001", "USB-флеш", "ДСП", "Иванова А. П.")
        self.assertEqual(medium.inv, "МНИ-001")
        self.assertEqual(medium.label, "ДСП")

    def test_bad_inventory_number_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            Medium("XYZ-999", "USB-флеш", "ДСП", "Иванова А. П.")

    def test_kind_outside_reference_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            Medium("МНИ-001", "Дискета", "ДСП", "Иванова А. П.")

    def test_label_outside_reference_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            Medium("МНИ-001", "SSD", "Совершенно секретно", "Иванова А. П.")

    def test_record_is_immutable(self) -> None:
        """frozen=True: изменить готовую запись «мимо» журнала нельзя."""
        medium = Medium("МНИ-001", "USB-флеш", "ДСП", "Иванова А. П.")
        with self.assertRaises(Exception):
            medium.label = "Открыто"  # type: ignore[misc]


class TestJournal(unittest.TestCase):
    """Проверка поведения журнала."""

    def setUp(self) -> None:
        self.journal = Journal()
        self.journal.add(Medium("МНИ-001", "USB-флеш", "ДСП", "Иванова А. П."))
        self.journal.add(Medium("МНИ-002", "HDD", "Открыто", "Петров С. И."))

    def test_length(self) -> None:
        self.assertEqual(len(self.journal), 2)

    def test_duplicate_inventory_number_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            self.journal.add(Medium("МНИ-001", "SSD", "Открыто", "Петров С. И."))

    def test_find_by_owner(self) -> None:
        found = self.journal.find("Иванова")
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0].inv, "МНИ-001")

    def test_find_is_case_insensitive(self) -> None:
        self.assertEqual(len(self.journal.find("иванова")), 1)

    def test_all_returns_a_copy(self) -> None:
        """Наружу отдаётся копия: внешний код не может испортить журнал."""
        snapshot = self.journal.all()
        snapshot.clear()
        self.assertEqual(len(self.journal), 2)


# ---------------------------------------------------------------------------
# Регрессионные тесты безопасности: программа НЕ делает того, чего не должна
# ---------------------------------------------------------------------------
class TestSecurityRegressions(unittest.TestCase):
    """Каждый тест закрывает конкретный дефект из step3_defect.py."""

    def setUp(self) -> None:
        os.environ["MEDIA_JOURNAL_ADMIN_TOKEN"] = TEST_TOKEN
        self.connection = step3_fixed.connect()

    def tearDown(self) -> None:
        self.connection.close()

    def test_d3_sql_injection_does_not_leak_confidential(self) -> None:
        """Д3 / CWE-89: строка атаки должна искаться как обычный текст."""
        payload = "%' OR label LIKE '%"
        rows = step3_fixed.find_public(self.connection, payload)
        leaked = [row for row in rows if row[2] == "Конфиденциально"]
        self.assertEqual(leaked, [], "Утекли записи с грифом «Конфиденциально»")

    def test_d3_public_search_never_returns_confidential(self) -> None:
        """Д3: инвариант функции — при ЛЮБОМ вводе только гриф «Открыто»."""
        for payload in ("", "'", "' OR 1=1 --", "%", "_", "Сидорова", "МНИ-003"):
            with self.subTest(payload=payload):
                rows = step3_fixed.find_public(self.connection, payload)
                labels = {row[2] for row in rows}
                self.assertTrue(labels <= {"Открыто"}, f"Вернулись грифы: {labels}")

    def test_d4_path_traversal_is_rejected(self) -> None:
        """Д4 / CWE-22: имя файла с «..» должно быть отклонено."""
        for payload in (
            "../секрет.txt",
            "../../секрет.txt",
            "..\\..\\секрет.txt",
            "подкаталог/../../секрет.txt",
        ):
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    step3_fixed.export_report(self.connection, payload)

    def test_d4_normal_filename_stays_inside_export_dir(self) -> None:
        """Д4: обычное имя файла по-прежнему работает."""
        path = step3_fixed.export_report(self.connection, "report.txt")
        self.assertTrue(path.is_relative_to(step3_fixed.EXPORT_DIR.resolve()))

    def test_d1_token_is_not_hardcoded(self) -> None:
        """Д1 / CWE-798: значение токена берётся из окружения."""
        os.environ["MEDIA_JOURNAL_ADMIN_TOKEN"] = "another-token"
        self.assertEqual(step3_fixed.get_admin_token(), "another-token")

    def test_d2_token_is_not_written_to_log(self) -> None:
        """Д2 / CWE-532: в журнале приложения не должно быть самого токена."""
        with self.assertLogs(level=logging.INFO) as captured:
            step3_fixed.login("ivanova", TEST_TOKEN)
        log_text = "\n".join(captured.output)
        self.assertNotIn(TEST_TOKEN, log_text, "Токен целиком попал в журнал")
        self.assertIn("***", log_text, "Ожидалась маска вместо токена")

    def test_login_rejects_wrong_token(self) -> None:
        """Проверка входа: чужой токен не подходит."""
        self.assertFalse(step3_fixed.login("ivanova", "wrong-token"))

    def test_login_accepts_correct_token(self) -> None:
        self.assertTrue(step3_fixed.login("ivanova", TEST_TOKEN))


if __name__ == "__main__":
    unittest.main(verbosity=2)
