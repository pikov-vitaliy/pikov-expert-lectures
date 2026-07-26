"""Журнал учёта МНИ. Шаг 2: объектно-ориентированная модель с валидацией.

Что изменилось по сравнению с шагом 1 и зачем — с точки зрения РБПО:

1. Словарь -> класс `Medium`. У словаря нет схемы: опечатка в ключе
   создаёт новый ключ и молча ломает логику. У класса набор полей фиксирован.
2. `frozen=True` — запись неизменяема после создания. Изменить учётную
   запись «мимо» журнала невозможно: это свойство целостности.
3. Проверка в `__post_init__` — инвариант объекта. Невалидный объект
   просто не может существовать. Это и есть «безопасная конструкция»
   в терминах процесса 5.8 ГОСТ Р 56939-2024.
4. Аннотации типов (`str`, `list[Medium]`) — контракт, который читает
   и человек, и статический анализатор (mypy, ruff).

Запуск:
    py step2_class.py
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass

# Справочники допустимых значений. Проверка «по белому списку» (allowlist)
# всегда надёжнее проверки «по чёрному списку» (denylist): перечислить всё
# разрешённое реально, перечислить всё запрещённое — нет.
ALLOWED_KINDS = ("USB-флеш", "HDD", "SSD", "CD/DVD", "Карта памяти")
ALLOWED_LABELS = ("Открыто", "ДСП", "Конфиденциально")

INV_PATTERN = re.compile(r"^МНИ-\d{3}$")
OWNER_PATTERN = re.compile(r"^[А-ЯЁ][а-яё]+ [А-ЯЁ]\. ?[А-ЯЁ]\.$")


class ValidationError(ValueError):
    """Запись не прошла проверку правил учёта."""


@dataclass(frozen=True)
class Medium:
    """Учётная запись одного машинного носителя информации."""

    inv: str
    kind: str
    label: str
    owner: str

    def __post_init__(self) -> None:
        if not INV_PATTERN.match(self.inv):
            raise ValidationError(
                f"Инвентарный номер {self.inv!r} не соответствует шаблону МНИ-NNN"
            )
        if self.kind not in ALLOWED_KINDS:
            raise ValidationError(
                f"Тип {self.kind!r} не входит в справочник: {', '.join(ALLOWED_KINDS)}"
            )
        if self.label not in ALLOWED_LABELS:
            raise ValidationError(
                f"Гриф {self.label!r} не входит в справочник: {', '.join(ALLOWED_LABELS)}"
            )
        if not OWNER_PATTERN.match(self.owner):
            raise ValidationError(
                f"ФИО {self.owner!r} должно иметь вид «Фамилия И. О.»"
            )


class Journal:
    """Журнал учёта: хранит записи и не допускает дублей инвентарных номеров."""

    def __init__(self) -> None:
        self._records: list[Medium] = []

    def add(self, medium: Medium) -> None:
        """Добавить носитель. Повторный инвентарный номер — ошибка."""
        if any(record.inv == medium.inv for record in self._records):
            raise ValidationError(f"Инвентарный номер {medium.inv} уже есть в журнале")
        self._records.append(medium)

    def find(self, query: str) -> list[Medium]:
        """Найти записи по подстроке в инвентарном номере или в ФИО."""
        needle = query.lower()
        return [
            record
            for record in self._records
            if needle in record.inv.lower() or needle in record.owner.lower()
        ]

    def all(self) -> list[Medium]:
        """Вернуть копию списка записей: наружу отдаём копию, не сам список."""
        return list(self._records)

    def __len__(self) -> int:
        return len(self._records)


def show(journal: Journal) -> None:
    """Вывести журнал в консоль в виде таблицы."""
    print(f"{'Инв. №':<10} {'Тип':<14} {'Гриф':<16} Ответственный")
    print("-" * 64)
    for record in journal.all():
        print(
            f"{record.inv:<10} {record.kind:<14} "
            f"{record.label:<16} {record.owner}"
        )
    print(f"\nВсего записей: {len(journal)}")


if __name__ == "__main__":
    # Windows-консоль по умолчанию работает не в UTF-8 — см. пояснение в step1_list.py.
    sys.stdout.reconfigure(encoding="utf-8")

    journal = Journal()
    journal.add(Medium("МНИ-001", "USB-флеш", "ДСП", "Иванова А. П."))
    journal.add(Medium("МНИ-002", "HDD", "Открыто", "Петров С. И."))
    journal.add(Medium("МНИ-003", "USB-флеш", "ДСП", "Иванова А. П."))

    show(journal)

    print("\nПоиск «Иванова»:")
    for record in journal.find("Иванова"):
        print(" ", record.inv, "—", record.kind)

    # Дальше — три попытки создать заведомо неверные данные.
    # Каждая обязана завершиться ValidationError: это и есть работающий контроль.
    print("\nПроверка контроля ввода:")
    for bad_args in (
        ("XYZ-999", "USB-флеш", "ДСП", "Иванова А. П."),      # неверный инв. номер
        ("МНИ-004", "Дискета", "ДСП", "Иванова А. П."),        # тип вне справочника
        ("МНИ-005", "SSD", "Совершенно секретно", "Иванова А. П."),  # гриф вне справочника
    ):
        try:
            Medium(*bad_args)
        except ValidationError as error:
            print("  отклонено:", error)
        else:
            print("  ОШИБКА: запись принята, хотя не должна была!")
