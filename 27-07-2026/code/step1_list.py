"""Журнал учёта машинных носителей информации (МНИ). Шаг 1.

Учебное приложение курса «Специалист по процессам РБПО».
На этом шаге данные живут в памяти процесса: никакой базы, никаких файлов.
Задача шага — получить работающую программу за 20 минут.

Почему имена функций и переменных латиницей: это стандарт кодирования
(ГОСТ Р 56939-2024, процесс 5.8 «Кодирование»). Стандарт кодирования — одна
из 12 практик экстремального программирования и обязательное требование
процесса. Комментарии и сообщения пользователю — по-русски.

Запуск:
    py step1_list.py
"""

import sys

# Журнал: список словарей. Каждый словарь — одна учётная запись.
journal: list[dict[str, str]] = []


def add(inv: str, kind: str, label: str, owner: str) -> dict[str, str]:
    """Добавить носитель в журнал и вернуть добавленную запись."""
    record = {"inv": inv, "kind": kind, "label": label, "owner": owner}
    journal.append(record)
    return record


def show() -> None:
    """Вывести журнал в консоль в виде таблицы."""
    print(f"{'Инв. №':<10} {'Тип':<14} {'Гриф':<16} Ответственный")
    print("-" * 64)
    for record in journal:
        print(
            f"{record['inv']:<10} {record['kind']:<14} "
            f"{record['label']:<16} {record['owner']}"
        )
    print(f"\nВсего записей: {len(journal)}")


def find(query: str) -> list[dict[str, str]]:
    """Найти записи, где подстрока встречается в инв. номере или в ФИО."""
    needle = query.lower()
    return [
        record
        for record in journal
        if needle in record["inv"].lower() or needle in record["owner"].lower()
    ]


if __name__ == "__main__":
    # Windows-консоль по умолчанию работает не в UTF-8, и кириллица в выводе
    # может упасть с UnicodeEncodeError. Одна строка снимает вопрос.
    sys.stdout.reconfigure(encoding="utf-8")

    add("МНИ-001", "USB-флеш", "ДСП", "Иванова А. П.")
    add("МНИ-002", "HDD", "Открыто", "Петров С. И.")
    add("МНИ-003", "USB-флеш", "ДСП", "Иванова А. П.")

    show()

    print("\nПоиск «Иванова»:")
    for record in find("Иванова"):
        print(" ", record["inv"], "—", record["kind"])
