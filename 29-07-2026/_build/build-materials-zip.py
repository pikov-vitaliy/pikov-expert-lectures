"""Build a deterministic, student-only materials.zip for 29.07.2026."""

from __future__ import annotations

import hashlib
import stat
import sys
import zipfile
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "materials.zip"
MANIFEST = ROOT / "_build" / "materials-zip-manifest.txt"
FIXED_TIME = (2026, 7, 29, 0, 0, 0)

# (source path relative to ROOT, archive path)
FILES = (
    ("index.html", "index.html"),
    ("og-image.png", "og-image.png"),
    ("assets/site.css", "assets/site.css"),
    ("assets/site.js", "assets/site.js"),
    ("assets/metrika.js", "assets/metrika.js"),
    ("materials/ЧИТАТЬ-ПЕРВЫМ.md", "ЧИТАТЬ-ПЕРВЫМ.md"),
    ("materials/konspekt.md", "materials/konspekt.md"),
    ("materials/praktikum.md", "materials/praktikum.md"),
    ("code/.gitignore", "code/.gitignore"),
    ("code/.gitlab-ci.yml", "code/.gitlab-ci.yml"),
    ("code/pyproject.toml", "code/pyproject.toml"),
    ("code/requirements.txt", "code/requirements.txt"),
    ("code/requirements-dev.txt", "code/requirements-dev.txt"),
    ("code/spravka.md", "code/spravka.md"),
    ("code/schema.sql", "code/schema.sql"),
    ("code/seed.sql", "code/seed.sql"),
    ("code/step1_schema.py", "code/step1_schema.py"),
    ("code/demo_unsafe_query.py", "code/demo_unsafe_query.py"),
    ("code/step2_secure_queries.py", "code/step2_secure_queries.py"),
    ("code/step3_student.py", "code/step3_student.py"),
    ("code/test_examples.py", "code/test_examples.py"),
    ("code/test_student.py", "code/test_student.py"),
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def validated_inputs() -> list[tuple[Path, str, bytes]]:
    result: list[tuple[Path, str, bytes]] = []
    seen: set[str] = set()
    for source_relative, archive_name in FILES:
        source = (ROOT / source_relative).resolve()
        try:
            source.relative_to(ROOT.resolve())
        except ValueError as exc:
            raise RuntimeError(f"Источник вышел за корень комплекта: {source}") from exc
        if not source.is_file():
            raise FileNotFoundError(f"Не найден обязательный файл: {source}")

        archive_path = PurePosixPath(archive_name)
        if archive_path.is_absolute() or ".." in archive_path.parts:
            raise RuntimeError(f"Недопустимый путь в архиве: {archive_name}")
        normalized = archive_path.as_posix().casefold()
        if normalized in seen:
            raise RuntimeError(f"Дублирующий путь в архиве: {archive_name}")
        seen.add(normalized)
        result.append((source, archive_path.as_posix(), source.read_bytes()))
    return result


def build() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    inputs = validated_inputs()
    temporary = OUTPUT.with_suffix(".zip.tmp")
    temporary.unlink(missing_ok=True)

    with zipfile.ZipFile(
        temporary,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as archive:
        for _source, archive_name, data in sorted(
            inputs,
            key=lambda item: item[1].casefold(),
        ):
            info = zipfile.ZipInfo(archive_name, date_time=FIXED_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.flag_bits |= 0x800
            archive.writestr(info, data, compresslevel=9)

    with zipfile.ZipFile(temporary, mode="r") as archive:
        archive.testzip()
        actual = sorted(name.casefold() for name in archive.namelist())
        expected = sorted(name.casefold() for _, name in FILES)
        if actual != expected:
            raise RuntimeError("Состав ZIP не совпал с утверждённым списком")

    temporary.replace(OUTPUT)
    archive_data = OUTPUT.read_bytes()
    lines = [
        "materials.zip",
        f"sha256 = {sha256(archive_data)}",
        f"size   = {len(archive_data)} bytes",
        f"files  = {len(inputs)}",
        "",
    ]
    for source, archive_name, data in sorted(
        inputs,
        key=lambda item: item[1].casefold(),
    ):
        lines.append(f"{sha256(data)}  {archive_name}  <-  {source.relative_to(ROOT)}")
    MANIFEST.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Создан: {OUTPUT}")
    print(f"Файлов: {len(inputs)}")
    print(f"SHA-256: {sha256(archive_data)}")


if __name__ == "__main__":
    build()
