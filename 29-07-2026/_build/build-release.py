"""Build a deterministic local release package for the 29.07 lecture site."""

from __future__ import annotations

import hashlib
import json
import runpy
import stat
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
RELEASE_DIR = ROOT / "release"
RELEASE_NAME = "29-07-2026.pikov.expert-release-2026-07-28.zip"
RELEASE_ZIP = RELEASE_DIR / RELEASE_NAME
FIXED_TIME = (2026, 7, 28, 0, 0, 0)
CONTENT_DATE = "2026-07-28T00:00:00Z"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def zip_entry(name: str, data: bytes) -> tuple[zipfile.ZipInfo, bytes]:
    info = zipfile.ZipInfo(name, date_time=FIXED_TIME)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.create_system = 3
    info.external_attr = (stat.S_IFREG | 0o644) << 16
    info.flag_bits |= 0x800
    return info, data


def build() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    materials_namespace = runpy.run_path(
        str(ROOT / "_build" / "build-materials-zip.py")
    )
    materials_namespace["build"]()
    material_sources = {
        source for source, _archive_name in materials_namespace["FILES"]
    }
    public_relative = sorted(
        {
            ".htaccess",
            "robots.txt",
            "sitemap.xml",
            "materials.zip",
            *material_sources,
        },
        key=str.casefold,
    )

    public: dict[str, bytes] = {}
    for relative in public_relative:
        path = ROOT / relative
        if not path.is_file():
            raise FileNotFoundError(f"Не найден файл релиза: {path}")
        public[relative.replace("\\", "/")] = path.read_bytes()

    manifest_object = {
        "artifact": RELEASE_NAME,
        "content_date_utc": CONTENT_DATE,
        "file_count": len(public),
        "files": [
            {
                "path": name,
                "sha256": digest(data),
                "size": len(data),
            }
            for name, data in sorted(public.items(), key=lambda item: item[0].casefold())
        ],
        "source": "V:/pikov.expert/29-07-2026",
    }
    manifest_data = (
        json.dumps(
            manifest_object,
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
        + "\n"
    ).encode("utf-8")
    notes_data = (
        "# Release 29-07-2026\n\n"
        "- Две лекции: языки программирования, Shift Left и архитектура БПО.\n"
        "- Три практических занятия: схема SQL, CWE-89, транзакции и CI.\n"
        "- Студенческий комплект не содержит преподавательский эталон.\n"
        "- Runtime-зависимости отсутствуют; требуется Python 3.11+.\n"
        "- Архив materials.zip собран воспроизводимо из утверждённого списка.\n"
    ).encode("utf-8")

    sums_inside = [
        f"{digest(data)}  {name}"
        for name, data in sorted(public.items(), key=lambda item: item[0].casefold())
    ]
    sums_inside.extend(
        [
            f"{digest(manifest_data)}  MANIFEST.json",
            f"{digest(notes_data)}  RELEASE_NOTES.md",
        ]
    )
    sums_data = ("\n".join(sums_inside) + "\n").encode("utf-8")

    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    (RELEASE_DIR / "MANIFEST.json").write_bytes(manifest_data)
    (RELEASE_DIR / "RELEASE_NOTES.md").write_bytes(notes_data)

    temporary = RELEASE_ZIP.with_suffix(".zip.tmp")
    temporary.unlink(missing_ok=True)
    payload = {
        **public,
        "MANIFEST.json": manifest_data,
        "RELEASE_NOTES.md": notes_data,
        "SHA256SUMS.txt": sums_data,
    }
    with zipfile.ZipFile(
        temporary,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as archive:
        for name, data in sorted(payload.items(), key=lambda item: item[0].casefold()):
            info, entry_data = zip_entry(name, data)
            archive.writestr(info, entry_data, compresslevel=9)

    with zipfile.ZipFile(temporary, mode="r") as archive:
        if archive.testzip() is not None:
            raise RuntimeError("CRC-проверка релизного ZIP не пройдена")
        if sorted(archive.namelist(), key=str.casefold) != sorted(
            payload,
            key=str.casefold,
        ):
            raise RuntimeError("Состав релизного ZIP не совпал с манифестом")

    temporary.replace(RELEASE_ZIP)
    external_sums = sums_inside + [f"{digest(RELEASE_ZIP.read_bytes())}  {RELEASE_NAME}"]
    (RELEASE_DIR / "SHA256SUMS.txt").write_text(
        "\n".join(external_sums) + "\n",
        encoding="utf-8",
    )
    print(f"Создан: {RELEASE_ZIP}")
    print(f"Публичных файлов: {len(public)}")
    print(f"SHA-256: {digest(RELEASE_ZIP.read_bytes())}")


if __name__ == "__main__":
    build()
