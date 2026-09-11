"""Remove only the producer's absolute-path metadata from the supplied workbook.

Usage: python threats/_build/sanitize-workbook.py PATH_TO_ORIGINAL_XLSX
The original file is never changed. This script is not required for normal builds.
"""
from pathlib import Path
import hashlib
import io
import re
import sys
import zipfile

ORIGINAL_SHA256 = "e189c0971d40cb3093efc0ecc530f344ca6ae1dc3ed3f3916d5e01157058fcb1"


def sanitize(original: bytes) -> bytes:
    if hashlib.sha256(original).hexdigest() != ORIGINAL_SHA256:
        raise ValueError("Unexpected original workbook; review its provenance first")
    result = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(original)) as source:
        with zipfile.ZipFile(result, "w") as target:
            target.comment = source.comment
            for entry in source.infolist():
                payload = source.read(entry.filename)
                if entry.filename == "xl/workbook.xml":
                    payload, removed = re.subn(rb"<x15ac:absPath\b[^>]*/>", b"", payload)
                    if removed != 1:
                        raise ValueError("Expected exactly one absolute-path metadata element")
                target.writestr(entry, payload)
    with zipfile.ZipFile(io.BytesIO(original)) as before, zipfile.ZipFile(io.BytesIO(result.getvalue())) as after:
        assert before.namelist() == after.namelist()
        assert after.testzip() is None
        for name in before.namelist():
            if name != "xl/workbook.xml":
                assert before.read(name) == after.read(name), name
    return result.getvalue()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: sanitize-workbook.py PATH_TO_ORIGINAL_XLSX")
    supplied = Path(sys.argv[1]).resolve()
    output = Path(__file__).resolve().parent.parent / "thrlist.xlsx"
    if supplied == output:
        raise SystemExit("The original must be separate from the public workbook")
    data = sanitize(supplied.read_bytes())
    output.write_bytes(data)
    print(hashlib.sha256(data).hexdigest() + "  " + str(output))
