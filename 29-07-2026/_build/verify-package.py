"""Structural verification for the local 29.07 lecture package."""

from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlsplit

from lxml import html


ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def verify_html() -> None:
    document = html.fromstring(INDEX.read_text(encoding="utf-8"))
    require(len(document.xpath("//title")) == 1, "Должен быть один title")
    require(len(document.xpath("//h1")) == 1, "Должен быть один h1")
    inline_scripts = document.xpath("//script[not(@src)]")
    require(inline_scripts, "Нет структурированных данных JSON-LD")
    for script in inline_scripts:
        require(
            script.get("type") == "application/ld+json",
            "Исполняемый inline script запрещён CSP",
        )
        json.loads(script.text or "")
    require(not document.xpath("//*[@style]"), "Inline style запрещён CSP")
    require(
        not document.xpath("//*[@onclick or @onload or @onerror]"),
        "Inline event handler запрещён",
    )

    ids = [value for value in document.xpath("//*[@id]/@id")]
    require(len(ids) == len(set(ids)), "Найдены дублирующиеся HTML id")
    id_set = set(ids)
    for anchor in document.xpath("//a[starts-with(@href, '#')]/@href"):
        require(anchor[1:] in id_set, f"Нет цели для якоря {anchor}")
    for target in document.xpath("//*[@data-section]/@data-section"):
        require(target in id_set, f"Нет секции data-section={target}")

    for attribute in ("href", "src"):
        for value in document.xpath(f"//*[@{attribute}]/@{attribute}"):
            parsed = urlsplit(value)
            if parsed.scheme or value.startswith(("#", "data:", "mailto:")):
                continue
            relative = unquote(parsed.path).lstrip("/")
            require((ROOT / relative).is_file(), f"Нет локального ресурса: {value}")

    htaccess = (ROOT / ".htaccess").read_text(encoding="utf-8")
    require("'unsafe-inline'" not in htaccess, "CSP содержит unsafe-inline")
    require("'unsafe-eval'" not in htaccess, "CSP содержит unsafe-eval")
    require("script-src 'self'" in htaccess, "Не найден строгий script-src")


def verify_markdown() -> None:
    for path in sorted((ROOT / "materials").glob("*.md")):
        text = path.read_text(encoding="utf-8")
        fences = sum(1 for line in text.splitlines() if line.startswith("```"))
        require(fences % 2 == 0, f"Несбалансированный code fence: {path.name}")
        require(text.count("# ") >= 1, f"Нет заголовка в {path.name}")


def verify_zip(path: Path, forbidden: tuple[str, ...]) -> None:
    require(path.is_file(), f"Нет архива: {path}")
    with zipfile.ZipFile(path) as archive:
        require(archive.testzip() is None, f"CRC-проверка не пройдена: {path.name}")
        names = archive.namelist()
        require(len(names) == len(set(name.casefold() for name in names)), "Дубли ZIP")
        for name in names:
            normalized = name.replace("\\", "/").casefold()
            require(not normalized.startswith("/"), f"Абсолютный путь в ZIP: {name}")
            require("../" not in normalized, f"Выход из каталога в ZIP: {name}")
            require(
                not any(part.casefold() in normalized for part in forbidden),
                f"Закрытый материал попал в ZIP: {name}",
            )


def verify_source_boundaries() -> None:
    verify_zip(
        ROOT / "materials.zip",
        ("_teacher", "solutions", ".docx", "расписание", "__pycache__"),
    )
    releases = list((ROOT / "release").glob("*.zip"))
    require(len(releases) == 1, "Ожидается один релизный ZIP")
    verify_zip(
        releases[0],
        ("_teacher", "_build", "solutions", ".docx", "расписание", "__pycache__"),
    )


def verify_public_text() -> None:
    public_paths = [
        INDEX,
        ROOT / "assets" / "site.css",
        ROOT / "assets" / "site.js",
        *sorted((ROOT / "materials").glob("*.md")),
        *sorted((ROOT / "code").glob("*")),
    ]
    secret_patterns = (
        "-----BEGIN PRIVATE KEY-----",
        "AKIA[0-9A-Z]{16}",
        "sk-[A-Za-z0-9]{20,}",
    )
    for path in public_paths:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        for pattern in secret_patterns:
            require(not re.search(pattern, text), f"Секретоподобная строка: {path.name}")


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    verify_html()
    verify_markdown()
    verify_source_boundaries()
    verify_public_text()
    print("PACKAGE VERIFY OK")


if __name__ == "__main__":
    main()
