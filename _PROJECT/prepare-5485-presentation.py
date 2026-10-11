"""Prepare the author's existing 24-slide PDF for public teaching use.

Run with explicit source and output PDF paths. The source is never modified.
Requires PyMuPDF. Legal and teaching content is preserved from the source.
"""
import argparse
import hashlib
import json
from pathlib import Path

import pymupdf as fitz


def prepare(source, output, fonts):
    source, output, fonts = Path(source), Path(output), Path(fonts)
    if source.resolve() == output.resolve():
        raise ValueError("Source and output must differ")
    doc = fitz.open(source)
    assert len(doc) == 24, "Expected reviewed 24-slide source"
    author = "Пиков Виталий Александрович"
    lecture = "https://5485-1.pikov.expert/"
    ink = (31 / 255, 56 / 255, 100 / 255)
    muted = (0.30, 0.36, 0.43)
    used_text = {"AuthorRegular": set(), "AuthorBold": set()}
    titles = [page.get_text().splitlines()[0] for page in doc]
    for i, page in enumerate(doc):
        assert page.rect == fitz.Rect(0, 0, 960, 540)
        # Remove only the old author/footer text. Preserve all slide graphics.
        spans = [s for b in page.get_text("dict")["blocks"] if "lines" in b
                 for line in b["lines"] for s in line["spans"]]
        for span in spans:
            if span["bbox"][1] >= 509 or (
                i in (0, 23) and span["text"] == "Виталий Пиков"
            ):
                page.add_redact_annot(fitz.Rect(span["bbox"]), fill=(1, 1, 1))
        page.apply_redactions(images=0, graphics=0)
        page.insert_font(fontname="AuthorRegular", fontfile=str(fonts / "arial.ttf"))
        page.insert_font(fontname="AuthorBold", fontfile=str(fonts / "arialbd.ttf"))

        def text(x, y, value, size=12, bold=False, color=ink):
            used_text["AuthorBold" if bold else "AuthorRegular"].update(value)
            page.insert_text((x, y), value, fontsize=size, color=color,
                             fontname="AuthorBold" if bold else "AuthorRegular")

        text(47, 520, f"© {author} · pikov.expert · Редакция 07.10.2026", 11, color=muted)
        text(735, 520, "5485-1.pikov.expert", 11)
        text(904, 520, str(i + 1), 11, color=muted)
        page.insert_link({"kind": fitz.LINK_URI, "from": fitz.Rect(730, 505, 875, 528), "uri": lecture})
        if i in (0, 23):
            text(75.6, 383 if i == 0 else 239, author, 22, True)
        if i == 0:
            text(75.6, 126, "ОТКРЫТАЯ АВТОРСКАЯ ЛЕКЦИЯ · 24 СЛАЙДА", 16, True)
            text(75.6, 486, f"Материалы лекции: {lecture}", 16)
            page.insert_link({"kind": fitz.LINK_URI, "from": fitz.Rect(75, 470, 650, 492), "uri": lecture})
        if i == 23:
            text(75.6, 391, "Для слушателей и преподавателей", 22, True)
            text(75.6, 426, "Читайте, изучайте и используйте слайды на занятиях с указанием автора.", 17)
            text(75.6, 464, f"Лекция и материалы: {lecture}", 17)
            page.insert_link({"kind": fitz.LINK_URI, "from": fitz.Rect(75, 445, 660, 472), "uri": lecture})
            for label, uri in [
                ("+7 (963) 782-92-78", "tel:+79637829278"),
                ("vitaly@pikov.expert", "mailto:vitaly@pikov.expert"),
                ("https://pikov.expert", "https://pikov.expert/"),
                ("@UnderLineSecurity", "https://t.me/UnderLineSecurity"),
            ]:
                for rect in page.search_for(label):
                    page.insert_link({"kind": fitz.LINK_URI, "from": rect, "uri": uri})
    doc.set_metadata({"title": "Информация ограниченного доступа: от основания до грифа — презентация",
                      "author": author,
                      "subject": "24 слайда для самостоятельного изучения и преподавания. Учебная редакция 07.10.2026.",
                      "keywords": "информационная безопасность, виды тайн, Пиков, pikov.expert"})
    doc.set_toc([[1, title, i + 1] for i, title in enumerate(titles)])
    doc.subset_fonts()
    # Arial aliases space/hyphen to NBSP/soft-hyphen. Preserve exact Unicode
    # in copied author names and URLs, rather than the font's alias mappings.
    for font_name, filename in [("AuthorRegular", "arial.ttf"), ("AuthorBold", "arialbd.ttf")]:
        font = fitz.Font(fontfile=str(fonts / filename))
        pairs = [f"<{font.has_glyph(ord(c)):04x}> <{ord(c):04x}>"
                 for c in sorted(used_text[font_name])]
        cmap = ("/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n"
                "/CIDSystemInfo <</Registry(Adobe)/Ordering(UCS)/Supplement 0>> def\n"
                "/CMapName /Author-UCS def\n/CMapType 2 def\n"
                "1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n")
        for start in range(0, len(pairs), 100):
            group = pairs[start:start + 100]
            cmap += f"{len(group)} beginbfchar\n" + "\n".join(group) + "\nendbfchar\n"
        cmap += "endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n"
        for xref in {entry[0] for page in doc for entry in page.get_fonts() if entry[4] == font_name}:
            unicode_xref = int(doc.xref_get_key(xref, "ToUnicode")[1].split()[0])
            doc.update_stream(unicode_xref, cmap.encode("ascii"))
    output.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output, garbage=4, deflate=True)
    doc.close()
    return {"sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "outputSha256": hashlib.sha256(output.read_bytes()).hexdigest(),
            "pages": 24, "bytes": output.stat().st_size}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("output")
    parser.add_argument("--fonts", default="C:/Windows/Fonts")
    args = parser.parse_args()
    print(json.dumps(prepare(args.source, args.output, args.fonts)))
