"""Build the offline EP01 review and the detailed Russian lecture.

Run with Python 3.14 and the installed Markdown / Beautiful Soup packages:
    py -3.14 build-review.py
    py -3.14 build-review.py --check
    py -3.14 build-review.py --archive <new-absolute-html-path> --qa-text <result>

All content comes from this directory. Existing dated archives are never replaced.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlsplit

import markdown
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parent
LECTURE_MD = ROOT / "PVS-2025-07-02-lecture.md"
LECTURE_HTML = ROOT / "PVS-2025-07-02-lecture.html"
REVIEW_HTML = ROOT / "review.html"
WORD_RE = re.compile(r"[A-Za-z]+(?:['’\-][A-Za-z]+)*")

CSS = r"""
:root{--paper:#f7f8fa;--ink:#17212b;--blue:#2356a8;--navy:#142c49;--muted:#53677d;--line:#ccd8e5;--white:#fff;--soft:#eaf0f7;--green:#205c4b;color-scheme:light}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:90px}body{margin:0;background:var(--paper);color:var(--ink);font-family:'Segoe UI',Arial,sans-serif;font-size:18px;line-height:1.65}a{color:var(--blue);text-underline-offset:.2em;overflow-wrap:anywhere}a:hover{text-decoration-thickness:2px}a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid #e6942e;outline-offset:4px}button,summary{font:inherit}button{cursor:pointer}img{max-width:100%;height:auto}h1,h2,h3,h4{line-height:1.17;text-wrap:balance}h1,h2{font-family:'Bahnschrift','Segoe UI',Arial,sans-serif;font-weight:650}h1{font-size:clamp(2.5rem,5.8vw,5.4rem);letter-spacing:-.045em;margin:18px 0 26px}h2{font-size:clamp(1.85rem,3.4vw,2.8rem);letter-spacing:-.025em;margin:0 0 22px}h3{font-size:1.35rem;margin:30px 0 14px}h4{font-size:1.12rem;margin:24px 0 10px}p{margin:0 0 1.05em}ul,ol{padding-left:1.35em}li{padding-left:.1em;margin:.4em 0}code,kbd,pre,.mono{font-family:Consolas,'Cascadia Mono',monospace}code{font-size:.86em;overflow-wrap:anywhere}pre{font-size:.87rem;line-height:1.6;max-width:100%;overflow:auto;background:var(--soft);border:1px solid var(--line);padding:18px;white-space:pre-wrap;overflow-wrap:anywhere}pre code{font-size:inherit}blockquote{border-left:4px solid var(--blue);margin:24px 0;padding:12px 22px;background:var(--soft)}blockquote>:last-child{margin-bottom:0}hr{border:0;border-top:1px solid var(--line);margin:32px 0}
.wrap{width:min(1280px,calc(100% - 72px));margin-inline:auto;min-width:0}.skip{position:fixed;top:-100px;left:12px;background:var(--white);padding:10px 20px;z-index:30}.skip:focus{top:12px}.masthead{display:flex;gap:20px;align-items:center;justify-content:space-between;padding-block:25px;border-bottom:1px solid var(--line)}.brand{font-size:1.25rem;letter-spacing:-.03em;text-decoration:none;font-weight:750;color:var(--navy)}.masthead span{font-size:.83rem;color:var(--muted)}.hero{padding:62px 0 55px}.eyebrow{color:var(--blue);font-weight:750;font-size:.78rem;letter-spacing:.13em;text-transform:uppercase}.deck{max-width:960px;font-size:clamp(1.13rem,2vw,1.5rem);line-height:1.55;color:var(--muted)}.hero-grid{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:46px;align-items:end}.edition{border-left:3px solid var(--blue);padding:4px 0 4px 22px;font-size:.96rem;color:var(--muted)}.edition strong{display:block;color:var(--navy);font-size:1.4rem}.hero-links,.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:27px}.button,button.action{display:inline-block;border:1px solid var(--blue);padding:10px 17px;background:var(--blue);color:var(--white);text-decoration:none;border-radius:5px;font-weight:650;font-size:.94rem}.button.secondary,button.action.secondary{color:var(--blue);background:transparent}.button:hover{background:var(--navy);color:var(--white)}.jump-nav{position:sticky;top:0;z-index:10;background:rgba(247,248,250,.98);border-block:1px solid var(--line)}.jump-nav .wrap{display:flex;gap:25px;overflow-x:auto;white-space:nowrap;padding-block:14px;scrollbar-width:thin}.jump-nav a{font-size:.89rem;font-weight:700;text-decoration:none;color:var(--navy)}main>section{padding-block:54px;border-bottom:1px solid var(--line)}.section-intro{max-width:950px;color:var(--muted)}.reading{max-width:900px}.section-label{display:block;margin-bottom:10px;font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:var(--blue);font-weight:750}.metric-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:28px 0 36px;border-block:1px solid var(--line)}.metric{padding:20px 18px 21px 0;min-width:0}.metric strong{font-family:'Bahnschrift','Segoe UI',sans-serif;display:block;color:var(--navy);font-size:2.25rem;font-weight:650;line-height:1.2}.metric span{font-size:.87rem;color:var(--muted)}.columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:30px}.note{border-left:4px solid var(--blue);background:var(--soft);padding:23px 26px;margin-block:26px;min-width:0}.note>:last-child{margin-bottom:0}.note h3{margin-top:0}.notice{padding:19px 23px;background:var(--navy);color:var(--white);border-radius:5px}.notice a{color:#c5ddff}.cover{display:block;width:100%;border:1px solid var(--line);border-radius:5px;margin:24px 0 10px}.caption{font-size:.85rem;color:var(--muted)}.table-wrap{overflow-x:auto;max-width:100%;margin:24px 0;scrollbar-width:thin}.table-wrap table{width:100%;border-collapse:collapse;font-size:.93rem;line-height:1.5}.table-wrap th{text-align:left;color:var(--navy);font-weight:750;background:var(--soft)}.table-wrap th,.table-wrap td{padding:13px 15px;border-bottom:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere}.table-wrap th:first-child,.table-wrap td:first-child{padding-left:12px}.schedule td:first-child{width:62px;color:var(--blue);font-weight:750}.schedule td:nth-child(2){width:140px;white-space:nowrap}.schedule td:nth-child(3){width:40%}.source-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.source-card{min-width:0;background:var(--white);padding:23px;border:1px solid var(--line);border-radius:5px}.source-card h3{margin:0 0 12px;font-size:1.12rem}.source-card p{font-size:.95rem;margin-bottom:12px}.source-card>:last-child{margin-bottom:0}.path{display:block;max-width:100%;margin-top:7px;white-space:normal;overflow-wrap:anywhere;word-break:normal;font-size:.78rem;line-height:1.65;color:var(--muted)}.tag{color:var(--blue);font-size:.79rem;font-weight:750}.document-list{display:grid;gap:12px;list-style:none;margin:24px 0;padding:0}.document-list>li{margin:0;min-width:0;display:grid;grid-template-columns:45px minmax(0,1fr);gap:15px;border-top:1px solid var(--line);padding:19px 0}.document-list .file-number{font-family:'Bahnschrift','Segoe UI',sans-serif;font-size:1.4rem;color:var(--blue)}.document-list h3{margin:0 0 6px;font-size:1.13rem}.document-list p{font-size:.92rem;color:var(--muted);margin:0}.document-list>li>div{min-width:0}.speech-list,.archive-list{display:grid;gap:12px;margin-top:25px}details.entry{min-width:0;border:1px solid var(--line);background:var(--white);border-radius:5px}details.entry>summary{display:grid;grid-template-columns:50px minmax(0,1fr) auto;align-items:start;gap:16px;padding:20px 23px;cursor:pointer;list-style:none}details.entry>summary::-webkit-details-marker{display:none}details.entry>summary:after{content:'+';grid-column:3;font-size:1.55rem;font-weight:400;line-height:1.1;color:var(--blue)}details.entry[open]>summary:after{content:'−'}summary .entry-number{font-family:'Bahnschrift','Segoe UI',sans-serif;color:var(--blue);font-weight:650;font-size:1.18rem}summary .entry-title{font-weight:700;min-width:0;overflow-wrap:anywhere}summary small{display:block;font-weight:400;color:var(--muted);font-size:.81rem;margin-top:5px}.entry-body{padding:8px 28px 28px;min-width:0;border-top:1px solid var(--line)}.speech-text{max-width:920px;font-size:1.06rem;line-height:1.82;margin-top:23px}.speech-text p{margin-bottom:1.25em}.speech-meta{font-size:.85rem;color:var(--muted);margin-block:20px}.source-links{font-size:.86rem;color:var(--muted)}.raw-source{margin-top:24px;border-top:1px solid var(--line);padding-top:15px}.raw-source>summary{font-size:.88rem;color:var(--blue);cursor:pointer}.markdown{min-width:0;overflow-wrap:anywhere}.markdown>h1{font-size:2.25rem;letter-spacing:-.025em;margin-top:28px}.markdown>h2{font-size:1.75rem;margin-top:42px}.markdown>h3{font-size:1.23rem;margin-top:30px}.markdown>h4{font-size:1.08rem}.markdown h1,.markdown h2,.markdown h3,.markdown h4{scroll-margin-top:88px}.markdown .table-wrap{font-size:.9rem}.markdown .table-wrap table{min-width:560px}.markdown .table-wrap th,.markdown .table-wrap td{min-width:100px}.markdown .footnote{font-size:.88rem;border-top:1px solid var(--line);margin-top:35px}.archive-list .markdown{font-size:.98rem}.contents{background:var(--soft);border-left:4px solid var(--blue);padding:24px 29px;margin:30px 0}.contents h2{font-size:1.45rem;margin-bottom:15px}.contents ol{margin:0;padding-left:1.3em;columns:2;column-gap:40px}.contents li{break-inside:avoid;margin:.45em 0;font-size:.94rem}.contents a{text-decoration:none}.lecture-shell{max-width:1000px;margin-inline:auto}.lecture-shell .markdown{max-width:920px;margin-inline:auto;font-size:1.11rem;line-height:1.85}.lecture-shell .markdown>h1{font-size:2.2rem}.lecture-shell .markdown>h2{font-family:'Bahnschrift','Segoe UI',sans-serif;font-size:2rem;border-top:1px solid var(--line);padding-top:32px;margin-top:54px}.lecture-shell .markdown>h3{font-size:1.35rem;line-height:1.35}.lecture-shell .markdown p{margin-bottom:1.15em}.lecture-shell .markdown .table-wrap{font-size:.9rem}.site-footer{padding:34px 0 48px;color:var(--muted);font-size:.87rem}.site-footer strong{color:var(--navy)}.print-only{display:none}
.contents ol,.markdown .toc ol,.markdown .toc ul{list-style:none;padding-left:0}
.lecture-parts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin:30px 0}.lecture-part{min-width:0;padding:23px 25px;border-left:3px solid var(--blue);background:var(--soft)}.lecture-part h2{font-size:1.3rem;line-height:1.3;letter-spacing:0;margin:0 0 13px}.lecture-part h2 a{text-decoration:none}.lecture-part p{font-size:.95rem;line-height:1.6;color:var(--muted);margin:0}.contents .toc-parts{display:block;columns:auto}.contents .toc-parts>li{margin:0 0 21px;padding:0;break-inside:auto}.contents .toc-parts>li>a{font-weight:750}.contents .toc-chapters{columns:2;column-gap:38px;margin:11px 0 0;padding-left:18px;border-left:1px solid var(--line)}.contents .toc-chapters>li{font-size:.89rem;margin:.5em 0;break-inside:avoid}
@media(max-width:900px){body{font-size:17px}.wrap{width:calc(100% - 42px)}.hero-grid{grid-template-columns:minmax(0,1fr)}.edition{max-width:650px}.metric-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.source-grid,.columns{grid-template-columns:minmax(0,1fr)}.contents ol{columns:1}.schedule td:nth-child(2){width:auto}.hero{padding-top:40px}.lecture-shell .markdown{font-size:1.04rem}}
@media(max-width:520px){html{scroll-padding-top:80px}.wrap{width:calc(100% - 28px)}.masthead{align-items:start;gap:12px}.masthead span{text-align:right;max-width:175px;font-size:.74rem}.hero{padding-block:32px}h1{font-size:2.5rem}.hero-grid{gap:23px}.deck{font-size:1.1rem}.jump-nav .wrap{gap:20px;padding-block:12px}.jump-nav a{font-size:.81rem}main>section{padding-block:35px}.metric{padding:18px 13px 18px 0}.metric strong{font-size:1.9rem}.metric span{font-size:.79rem}.table-wrap th,.table-wrap td{padding:10px 9px}.schedule{min-width:650px}.source-card{padding:18px}.source-card h3{font-size:1.05rem}.path{font-size:.74rem}details.entry>summary{grid-template-columns:34px minmax(0,1fr) auto;gap:10px;padding:16px 14px}.entry-body{padding:5px 16px 20px}.speech-text{font-size:1rem}.note{padding:18px}.document-list>li{grid-template-columns:30px minmax(0,1fr);gap:10px}.contents{padding:18px}.markdown>h1{font-size:1.8rem}.markdown>h2,.lecture-shell .markdown>h2{font-size:1.65rem}.markdown>h3{font-size:1.15rem}.lecture-shell .markdown{font-size:1rem}.button,button.action{font-size:.86rem;padding:9px 13px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{@page{margin:17mm}body{background:white;font-size:11pt}.wrap{width:100%;max-width:none}.jump-nav,.hero-links,.actions,.skip,.raw-source{display:none!important}h1{font-size:30pt}h2{font-size:21pt}h3{font-size:15pt}.hero{padding:20px 0}.hero-grid,.source-grid,.columns{display:block}.edition{margin-top:20px}main>section{padding-block:25px}details.entry{break-inside:auto;margin-bottom:15px}details.entry>summary{padding:12px;font-size:12pt}details.entry>summary:after{display:none}.entry-body{padding:0 12px 12px}details.entry:not([open])>.entry-body{display:block!important}details.entry{content-visibility:visible}.table-wrap{overflow:visible}.table-wrap table,.markdown .table-wrap table{min-width:0;font-size:9pt}.cover{max-height:130mm;object-fit:contain}.source-card{margin-bottom:15px;break-inside:avoid}a{color:inherit}.print-only{display:block}.contents ol{columns:1}.site-footer{padding-bottom:0}.metric strong{font-size:25pt}}
@media print{.lecture-shell h2,.lecture-shell h3,.lecture-shell h4{break-after:avoid}.lecture-shell tr{break-inside:avoid}.lecture-shell thead{display:table-header-group}.lecture-shell .contents{background:transparent;border-left:0;padding:0}}
@media(max-width:900px){.lecture-parts{grid-template-columns:minmax(0,1fr);gap:15px}.contents .toc-chapters{columns:1}.lecture-part{padding:18px 20px}.lecture-part h2{font-size:1.18rem}}
@media print{.lecture-parts{display:block;margin:20px 0}.lecture-part{background:transparent;padding:12px 16px;margin-bottom:14px;break-inside:avoid}.lecture-part h2{font-size:14pt}.lecture-part p{font-size:11pt}.contents .toc-chapters{columns:1}.contents .toc-parts>li>a{break-after:avoid}}
"""

JS = r"""
function revealHashTarget() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (!target) return;
  let detail = target.matches('details') ? target : target.closest('details');
  while (detail) {
    detail.open = true;
    detail = detail.parentElement.closest('details');
  }
}
window.addEventListener('hashchange', revealHashTarget);
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (link) requestAnimationFrame(revealHashTarget);
});
revealHashTarget();
document.querySelectorAll('button[data-toggle-group]').forEach(button => {
  button.addEventListener('click', () => {
    const entries = [...document.querySelectorAll(button.dataset.toggleGroup)];
    const open = entries.some(entry => !entry.open);
    entries.forEach(entry => { entry.open = open; });
    button.textContent = open ? button.dataset.closeLabel : button.dataset.openLabel;
    button.setAttribute('aria-expanded', String(open));
  });
});
let printState = [];
window.addEventListener('beforeprint', () => {
  printState = [...document.querySelectorAll('details.entry')].map(entry => [entry, entry.open]);
  printState.forEach(([entry]) => { entry.open = true; });
});
window.addEventListener('afterprint', () => {
  printState.forEach(([entry, open]) => { entry.open = open; });
  printState = [];
});
"""


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def duration(seconds: int) -> str:
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def read_data() -> dict:
    text = (ROOT / "assets" / "episode-data.js").read_text(encoding="utf-8")
    prefix = "window.EP01_DATA"
    if not text.lstrip().startswith(prefix):
        raise ValueError("Expected window.EP01_DATA in assets/episode-data.js")
    data = json.loads(text[text.index("{") :].strip().removesuffix(";"))
    slides = data["slides"]
    if not slides or [slide["id"] for slide in slides] != list(range(1, len(slides) + 1)):
        raise ValueError("Slide IDs must form a consecutive sequence starting at 1")
    if any(not isinstance(slide["seconds"], int) or slide["seconds"] <= 0 for slide in slides):
        raise ValueError("Each slide needs a positive integer duration")
    for slide in slides:
        if not slide["notes"].strip():
            raise ValueError(f"Slide {slide['id']} has no complete speech")
    return data


def safe_url(url: str) -> bool:
    return urlsplit(url).scheme.lower() in {"", "http", "https", "file", "mailto"}


def rendered_markdown(text: str, prefix: str) -> tuple[str, list[tuple[str, str]]]:
    """Render a source independently, keeping its anchors local to its own archive."""
    source = markdown.markdown(text, extensions=["extra", "sane_lists", "toc"], output_format="html")
    soup = BeautifulSoup(source, "html.parser")
    for tag in soup.find_all(["script", "style", "iframe", "object", "embed", "form", "input", "button"]):
        tag.decompose()
    old_ids = {}
    for tag in soup.find_all(True):
        for attribute in list(tag.attrs):
            if attribute.lower().startswith("on") or attribute in {"style", "srcdoc"}:
                del tag[attribute]
        if tag.get("id"):
            old = tag["id"]
            tag["id"] = f"{prefix}-{old}"
            old_ids[old] = tag["id"]
    for link in soup.find_all("a", href=True):
        href = link["href"]
        if href.startswith("#"):
            anchor = unquote(href[1:])
            if anchor in old_ids:
                link["href"] = "#" + old_ids[anchor]
        elif not safe_url(href):
            del link["href"]
        elif not urlsplit(href).scheme:
            parts = urlsplit(href)
            target = (ROOT / unquote(parts.path)).resolve()
            link["href"] = target.as_uri() + ("#" + parts.fragment if parts.fragment else "")
        if str(link.get("href", "")).startswith(("https://", "http://")):
            link["rel"] = "noopener noreferrer"
    for image in soup.find_all("img", src=True):
        # The cover is embedded separately. Keep any local Markdown image readable offline.
        src = image["src"]
        parts = urlsplit(src)
        if not parts.scheme:
            path = (ROOT / unquote(parts.path)).resolve()
            suffix = path.suffix.lower()
            mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}.get(suffix)
            if mime and path.is_file():
                image["src"] = f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")
            else:
                image.replace_with(soup.new_string(image.get("alt", src)))
        elif parts.scheme != "data":
            image.replace_with(soup.new_string(image.get("alt", src)))
    for table in soup.find_all("table"):
        wrapper = soup.new_tag("div", attrs={"class": "table-wrap", "tabindex": "0", "role": "region", "aria-label": "Таблица — прокрутка по горизонтали при необходимости"})
        table.wrap(wrapper)
    headings = [(tag["id"], tag.get_text(" ", strip=True)) for tag in soup.find_all("h2", id=True)]
    return str(soup), headings


def lecture_outline(rendered: str) -> list[dict]:
    """Use the document's own H2/H3 hierarchy and explicit speaker attribution."""
    soup = BeautifulSoup(rendered, "html.parser")
    outline = []
    current = None
    attribution_re = re.compile(r"^(?:Исторический доклад|Совместный практический разбор|Практический разбор|Докладчики?)\s*:", re.I)
    for heading in soup.find_all(["h2", "h3"], id=True):
        item = {"id": heading["id"], "title": heading.get_text(" ", strip=True)}
        if heading.name == "h2":
            current = {**item, "children": [], "attribution": ""}
            for sibling in heading.find_next_siblings():
                if sibling.name in {"h2", "h3"}:
                    break
                if sibling.name == "p":
                    text = sibling.get_text(" ", strip=True)
                    if attribution_re.match(text):
                        current["attribution"] = text
                        break
            outline.append(current)
        elif current is not None and re.match(r"^\d+\.\s", item["title"]):
            current["children"].append(item)
    return outline


def toc_rows(outline: list[dict]) -> str:
    rows = []
    for section in outline:
        children = "".join(f'<li><a href="#{esc(child["id"])}">{esc(child["title"])}</a></li>' for child in section["children"])
        nested = f'<ol class="toc-chapters">{children}</ol>' if children else ""
        rows.append(f'<li><a href="#{esc(section["id"])}">{esc(section["title"])}</a>{nested}</li>')
    return "".join(rows)


def toc(outline: list[dict], title: str = "Содержание") -> str:
    return f'<nav class="contents" id="lecture-contents" aria-label="{esc(title)}"><h2>{esc(title)}</h2><ol class="toc-parts">{toc_rows(outline)}</ol></nav>'


def lecture_parts(outline: list[dict]) -> str:
    parts = [section for section in outline if re.match(r"^Часть\s+[IVX]+\.", section["title"])]
    cards = []
    for part in parts:
        if not part["attribution"]:
            raise ValueError(f"Thematic block needs explicit speaker attribution in Markdown: {part['title']}")
        cards.append(f'<article class="lecture-part"><h2><a href="#{esc(part["id"])}">{esc(part["title"])}</a></h2><p>{esc(part["attribution"])}</p></article>')
    return f'<section class="lecture-parts" aria-label="Основные тематические блоки">{"".join(cards)}</section>' if cards else ""


def shell(title: str, description: str, body: str, date_label: str, *, reader: bool = False) -> str:
    author = "Виталий Пиков — составитель" if reader else "Vitaliy Pikov"
    masthead = "Учебные материалы<br>по безопасной разработке" if reader else f"Secure Software Development in Practice<br>Материалы автора · {esc(date_label)}"
    footer = "Безопасная разработка программного обеспечения" if reader else "Материалы доступны в этом HTML без подключения к сети. Внешние источники открываются по ссылкам."
    return f'''<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(description)}"><meta name="author" content="{esc(author)}"><meta name="color-scheme" content="light">
<style>{CSS}</style></head><body>
<a class="skip" href="#main">Перейти к материалам</a>
<header class="masthead wrap"><a class="brand" href="https://pikov.expert">pikov.expert</a><span>{masthead}</span></header>
{body}
<footer class="site-footer wrap"><strong>{esc(author)} · <a href="https://pikov.expert">pikov.expert</a></strong><br>{footer}</footer>
<script>{JS}</script></body></html>'''


def source_file_cards() -> str:
    candidates = sorted(ROOT.glob("*.txt"))
    cards = []
    for path in candidates:
        label = "Полная транскрипция" if "Транскрипция" in path.name else "Краткий пересказ"
        detail = "Основа подробной тематической лекции; сверка рассказа и вопросов участников." if "Транскрипция" in path.name else "Вспомогательная навигация по темам; не заменяет полный текст."
        cards.append(f'<article class="source-card"><span class="tag">{esc(label)}</span><h3>{esc(path.name)}</h3><p>{detail}</p><a href="{esc(path.as_uri())}">Открыть исходный текст</a><code class="path">{esc(path)}</code></article>')
    return "".join(cards)


def speech_block(data: dict) -> str:
    entries = []
    cursor = 0
    for slide in data["slides"]:
        end = cursor + slide["seconds"]
        text = slide["notes"]
        # Do not normalize whitespace here: the HTML archive must preserve the source.
        paragraphs = "".join(f'<p>{esc(paragraph)}</p>' for paragraph in text.split("\n\n"))
        words = len(WORD_RE.findall(text))
        source_links = ", ".join(f'<a href="#source-{esc(source_id)}">{esc(source_id)}</a>' for source_id in slide.get("sourceIds", []))
        entries.append(f'''<details class="entry speech-entry" id="speech-{slide['id']:02d}">
<summary><span class="entry-number">{slide['id']:02d}</span><span class="entry-title" lang="en">{esc(slide['title'])}<small lang="ru">{duration(cursor)}–{duration(end)} · {words} слов · {esc(slide['section'])}</small></span></summary>
<div class="entry-body"><p class="speech-meta" lang="en">{esc(slide['lead'])}</p><div class="speech-text" lang="en" data-slide="{slide['id']}">{paragraphs}</div><p class="source-links">Источники слайда: {source_links}</p></div></details>''')
        cursor = end
    return "".join(entries)


def markdown_archive(paths: list[Path]) -> tuple[str, list[dict]]:
    entries = []
    manifest = []
    for index, path in enumerate(paths, 1):
        text = path.read_text(encoding="utf-8")
        rendered, _ = rendered_markdown(text, f"doc-{index:02d}")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        title_match = re.search(r"^#\s+(.+)$", text, re.M)
        title = title_match.group(1) if title_match else path.stem
        manifest.append({"name": path.name, "sha256": digest, "characters": len(text)})
        entries.append(f'''<details class="entry archive-entry" id="archive-{index:02d}">
<summary><span class="entry-number">{index:02d}</span><span class="entry-title">{esc(title)}<small>{esc(path.name)}</small></span></summary>
<div class="entry-body"><article class="markdown">{rendered}</article>
<details class="raw-source"><summary>Исходный Markdown целиком</summary><pre><code data-source-file="{esc(path.name)}">{esc(text)}</code></pre></details>
<p class="caption">SHA-256: <code>{digest}</code></p></div></details>''')
    return "".join(entries), manifest


def lecture_content(text: str) -> tuple[str, str, str, list[dict]]:
    """Move the Markdown title into the reader's page hero, without duplicating it."""
    rendered, _ = rendered_markdown(text, "lecture")
    soup = BeautifulSoup(rendered, "html.parser")
    title_node = soup.find("h1")
    title = title_node.get_text(" ", strip=True) if title_node else "Безопасная разработка: история стандартов и организация работы"
    title_id = str(title_node.get("id", "lecture-title")) if title_node else "lecture-title"
    if title_node:
        title_node.decompose()
    return title, title_id, str(soup), lecture_outline(rendered)


def build_lecture(date_label: str, text: str) -> str:
    title, title_id, rendered, headings = lecture_content(text)
    markdown_download = base64.b64encode(text.encode("utf-8")).decode("ascii")
    body = f'''<div class="hero wrap"><span class="eyebrow">Безопасная разработка / история и практика</span>
<h1 id="{esc(title_id)}">{esc(title)}</h1>
<p class="deck">Как развивались методологии безопасной разработки, почему появились национальные стандарты и как связать требования с повседневной инженерной работой.</p>
{lecture_parts(headings)}
<div class="hero-links"><a class="button" href="#lecture-text">Читать лекцию</a><a class="button secondary" href="#lecture-contents">Содержание</a><a class="button secondary" href="data:text/markdown;charset=utf-8;base64,{markdown_download}" download="{esc(LECTURE_MD.name)}">Лекция в Markdown</a></div></div>
<main class="wrap lecture-shell" id="main"><section id="lecture-content">
{toc(headings)}<article class="markdown" id="lecture-text">{rendered}</article></section></main>'''
    return shell(f"{title} · pikov.expert", "Учебные материалы об истории национального стандарта и практическом применении ГОСТ в безопасной разработке программного обеспечения.", body, date_label, reader=True)


def build_review(data: dict, paths: list[Path], qa_text: str, date_label: str) -> tuple[str, dict]:
    slides = data["slides"]
    total_seconds = sum(slide["seconds"] for slide in slides)
    total_words = sum(len(WORD_RE.findall(slide["notes"])) for slide in slides)
    archive, manifest = markdown_archive(paths)
    lecture_text = LECTURE_MD.read_text(encoding="utf-8")
    lecture_rendered, _ = rendered_markdown(lecture_text, "doc-01")
    lecture_topics = toc_rows(lecture_outline(lecture_rendered))
    cover_file = ROOT / data["cover"]
    cover = base64.b64encode(cover_file.read_bytes()).decode("ascii")
    rows = []
    cursor = 0
    for slide in slides:
        end = cursor + slide["seconds"]
        rows.append(f'<tr><td>{slide["id"]:02d}</td><td>{duration(cursor)}–{duration(end)}</td><td lang="en"><a href="#speech-{slide["id"]:02d}">{esc(slide["title"])}</a></td><td>{esc(slide["section"])}</td></tr>')
        cursor = end
    source_cards = []
    for source in data["sources"]:
        url = source["url"]
        link = f'<a href="{esc(url)}">Открыть источник</a>' if safe_url(url) and url and not url.startswith("#") else ""
        source_cards.append(f'<article class="source-card" id="source-{esc(source["id"])}"><span class="tag">{esc(source["id"])}</span><h3>{esc(source["title"])}</h3><p>{esc(source["note"])}</p>{link}</article>')
    files = [
        ("Самостоятельная учебная лекция", LECTURE_MD, "История методологий и стандартов, процессы безопасной разработки и практические примеры."),
        ("Учебная лекция для чтения в браузере", LECTURE_HTML, "Страница для читателя: содержание, полный текст и библиография."),
        ("Презентация EP01", ROOT / "index.html", "Слайды, режим показа, заметки докладчика и контакты с анонсом EP02."),
        ("Английская речь по каждому слайду", ROOT / "EP01-script-en.md", "Редактируемый источник содержания презентации и полной речи."),
        ("История и границы источников", ROOT / "EP01-history-research.md", "Сопоставление исторического рассказа, исследовательских публикаций и нормативных источников."),
        ("Хронометраж", ROOT / "EP01-timing.md", "Плановые интервалы слайдов и расчёт объёма речи."),
    ]
    file_rows = "".join(f'<li><span class="file-number">{i:02d}</span><div><h3><a href="{esc(path.as_uri())}">{esc(label)}</a></h3><p>{esc(detail)}</p><code class="path">{esc(path)}</code></div></li>' for i, (label, path, detail) in enumerate(files, 1))
    body = f'''<div class="hero wrap"><span class="eyebrow">Материалы автора / учебная лекция и выпуск EP01</span>
<div class="hero-grid"><div><h1>Безопасная разработка.<br>Учебная лекция и материалы серии</h1><p class="deck">Самостоятельная лекция на русском языке объясняет историю методологий, создание национального стандарта и организацию безопасной разработки. Рядом сохранены англоязычный выпуск EP01 и материалы для подготовки к записи.</p></div>
<aside class="edition"><strong>{duration(total_seconds)} · EP01</strong>{len(slides)} слайдов с полной английской речью.<br>Подробная русская лекция и {len(paths)} Markdown-документов в архиве.</aside></div>
<div class="hero-links"><a class="button" href="#transcript">Самостоятельная учебная лекция</a><a class="button secondary" href="#speech">Речь для EP01</a><a class="button secondary" href="http://127.0.0.1:8765/">Открыть локальную презентацию</a></div></div>
<nav class="jump-nav" aria-label="Разделы отчёта"><div class="wrap"><a href="#result">Что подготовлено</a><a href="#transcript">Подробная лекция</a><a href="#schedule">План выпуска</a><a href="#sources">Источники</a><a href="#speech">Полная речь</a><a href="#archive">Все {len(paths)} документов</a><a href="#files">Файлы</a></div></nav>
<main class="wrap" id="main">
<section id="result"><span class="section-label">Результат работы</span><h2>Содержание сохранено в двух формах</h2>
<div class="columns"><div><h3>Учебная лекция на русском языке</h3><p>Последовательное изложение связывает исторический контекст, требования стандартов и повседневную работу команды. Лекция рассчитана на самостоятельное изучение; примеры и библиография помогают продолжить работу с темой.</p></div>
<div><h3>Англоязычный выпуск EP01</h3><p>Сценарий, слайды и речь докладчика развивают материал для серии <span lang="en">Secure Software Development in Practice</span>. История связана с практической задачей первого процесса — планированием безопасной разработки.</p></div></div>
<div class="metric-strip"><div class="metric"><strong>{len(slides)}</strong><span>слайдов в обновлённой EP01</span></div><div class="metric"><strong>{duration(total_seconds)}</strong><span>плановая длительность выпуска</span></div><div class="metric"><strong>{total_words:,}</strong><span>английских слов в речи</span></div><div class="metric"><strong>{len(paths)}</strong><span>Markdown-документов целиком</span></div></div>
<h3>Ключевые уточнения истории стандарта</h3>
<div class="table-wrap" tabindex="0" role="region" aria-label="Уточнения редакции 2016 года"><table><thead><tr><th>Вопрос</th><th>Уточнение для лекции</th><th>Основание</th></tr></thead><tbody>
<tr><td>Структура редакции 2016 года</td><td>Девять групп мер в пунктах 5.1–5.9. Редакция 2024 года описывает 25 процессов; единицы группировки различаются.</td><td><a href="#source-G16">Окончательная редакция 2016</a>; <a href="#source-G24">редакция 2024</a></td></tr>
<tr><td>Утверждение и начало действия</td><td>Росстандарт утвердил ГОСТ Р 56939-2016 1 июня 2016 года приказом № 458-ст. Введение в действие — 1 июня 2017 года.</td><td><a href="https://protect.gost.ru/gost/details/286a588e-4a6a-4899-88f7-3c370dea1e1d">Официальная карточка Росстандарта</a></td></tr>
<tr><td>Как читать слово «следует»</td><td>В редакции 2016 года это рекомендация по п. 4.2. В редакции 2024 года формулировки «должен» и «следует» выражают требования согласно п. 4.7.</td><td><a href="#source-G16">ГОСТ Р 56939-2016</a>; <a href="#source-G24">ГОСТ Р 56939-2024</a></td></tr>
</tbody></table></div>
<div class="note"><h3>Основания исторических утверждений</h3><p>Формальные даты, статус редакций и нормативные требования опираются на проверочные источники. История подготовки стандарта отделена от требований окончательных редакций. Подробные основания приведены в библиографии лекции и исследовательских заметках.</p></div>
<p class="notice" id="qa-status">{esc(qa_text)}</p></section>
<section id="transcript"><span class="section-label">Учебные материалы / составитель Виталий Пиков</span><h2>История стандартов и организация безопасной разработки</h2>
<p class="section-intro">В учебном материале сохранены два основных блока: исторический доклад и совместный практический разбор. Введение, практикум, вопросы и библиография помогают изучить материал последовательно и применить его в работе команды.</p>
<div class="hero-links"><a class="button" href="http://127.0.0.1:8765/PVS-2025-07-02-lecture.html">Отдельная лекция в локальном браузере</a><a class="button secondary" href="{esc(LECTURE_MD.as_uri())}">Markdown лекции</a><a class="button secondary" href="#archive-01">Читать здесь без сети</a></div>
<nav class="contents" aria-label="Темы учебной лекции"><h3 style="margin-top:0">Содержание лекции</h3><ol class="toc-parts">{lecture_topics}</ol></nav>
<details class="raw-source" id="history-source-files"><summary>Первичные материалы для работы автора</summary><div class="source-grid">{source_file_cards()}</div></details></section>
<section id="cover"><span class="section-label">Серия / единый визуальный стиль</span><h2 lang="en">{esc(data['title'])}</h2><p class="section-intro" lang="en">{esc(data['subtitle'])}</p><img class="cover" src="data:image/png;base64,{cover}" alt="Обложка EP01 с портретом Vitaliy Pikov"><p class="caption">Бренд серии сохранён. Содержание слайдов и речь обновляются из Markdown-источника.</p></section>
<section id="schedule"><span class="section-label">Обновлённый сценарий</span><h2>План выпуска · {duration(total_seconds)}</h2>
<p class="section-intro">Интервалы ниже — план для репетиции. Фактическая длительность зависит от темпа речи, пауз и монтажа. При 120 словах в минуту чтение текста займёт около {duration(round(total_words / 120 * 60))}; при 125 — около {duration(round(total_words / 125 * 60))}.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="План и хронометраж слайдов"><table class="schedule"><thead><tr><th>Слайд</th><th>Интервал</th><th>Название</th><th>Тема</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
<div class="note"><h3>Подготовка к записи</h3><p>Сначала прочитайте речь с таймером и отметьте места для пауз. Учебная лекция даёт развёрнутое объяснение темы, а англоязычный сценарий помогает выстроить последовательное выступление для выбранной аудитории.</p><p>Финал выпуска содержит имя Vitaliy Pikov, сайт <a href="https://pikov.expert">pikov.expert</a> и анонс второго эпизода.</p></div></section>
<section id="sources"><span class="section-label">Проверочные материалы</span><h2>Источники и границы интерпретации</h2><p class="section-intro">Источники связаны со слайдами через короткие идентификаторы. Полные исследовательские заметки и ссылки также сохранены в Markdown-архиве.</p><div class="source-grid">{''.join(source_cards)}</div></section>
<section id="speech"><span class="section-label">Сценарий докладчика / English</span><h2>Полная речь для {len(slides)} слайдов</h2><p class="section-intro">Текст каждого слайда приведён целиком, без сокращений. Заголовок раскрывает плановый интервал, объём речи и тему.</p>
<div class="actions"><button class="action" data-toggle-group=".speech-entry" data-open-label="Раскрыть всю речь" data-close-label="Свернуть всю речь" aria-expanded="false">Раскрыть всю речь</button></div><div class="speech-list">{speech_block(data)}</div></section>
<section id="archive"><span class="section-label">Полный автономный архив</span><h2>Все {len(paths)} Markdown-документов</h2><p class="section-intro">Каждый документ доступен в оформленном виде и как полный исходный Markdown. Контрольные суммы позволяют сопоставить эту версию с файлами проекта.</p>
<div class="actions"><button class="action secondary" data-toggle-group=".archive-entry" data-open-label="Раскрыть все документы" data-close-label="Свернуть все документы" aria-expanded="false">Раскрыть все документы</button></div><div class="archive-list">{archive}</div></section>
<section id="files"><span class="section-label">Материалы проекта</span><h2>Где лежат результаты</h2><p class="section-intro">Ссылки на файлы рассчитаны на локальный доступ. Полный текст речи и всех Markdown-документов уже включён в этот HTML; локальная презентация доступна при запущенном сервере на порту 8765.</p><ol class="document-list">{file_rows}</ol></section></main>'''
    result = shell("Учебная лекция и материалы EP01 · pikov.expert", "Самостоятельная лекция по истории стандартов и организации безопасной разработки; англоязычный выпуск EP01 и материалы автора.", body, date_label)
    stats = {"slides": len(slides), "planned_seconds": total_seconds, "planned_duration": duration(total_seconds), "english_words": total_words, "markdown_documents": len(paths), "sources": len(data["sources"]), "manifest": manifest}
    return result, stats


def validate(review: str, lecture: str, data: dict, paths: list[Path]) -> None:
    review_soup = BeautifulSoup(review, "html.parser")
    lecture_soup = BeautifulSoup(lecture, "html.parser")
    for soup in [review_soup, lecture_soup]:
        ids = [tag["id"] for tag in soup.find_all(id=True)]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate HTML IDs")
        for link in soup.find_all("a", href=True):
            href = link["href"]
            if href.startswith("#") and unquote(href[1:]) not in ids:
                raise ValueError(f"Broken internal HTML anchor: {href}")
        if soup.find_all(["iframe", "object", "embed"]):
            raise ValueError("Unexpected remote embedded content")
        for element in soup.find_all(src=True):
            if not element["src"].startswith("data:"):
                raise ValueError("The HTML must not require external assets")
        for link in soup.find_all("link", href=True):
            raise ValueError(f"Unexpected stylesheet dependency: {link['href']}")
    for path in paths:
        tag = review_soup.find("code", attrs={"data-source-file": path.name})
        if tag is None or tag.get_text() != path.read_text(encoding="utf-8"):
            raise ValueError(f"Markdown archive mismatch: {path.name}")
    for slide in data["slides"]:
        tag = review_soup.find("div", attrs={"data-slide": str(slide["id"])})
        recovered = "\n\n".join(p.get_text() for p in tag.find_all("p", recursive=False)) if tag else None
        if recovered != slide["notes"]:
            raise ValueError(f"Speech mismatch: slide {slide['id']}")
    title, title_id, expected, _ = lecture_content(LECTURE_MD.read_text(encoding="utf-8"))
    actual = lecture_soup.select_one("#lecture-text")
    heading = lecture_soup.find("h1", id=title_id)
    if actual is None or actual.decode_contents() != expected or heading is None or heading.get_text() != title:
        raise ValueError("Standalone lecture content differs from rendered Markdown")
    download = lecture_soup.select_one('.hero-links a[download]')
    if download is None or base64.b64decode(download["href"].split(",", 1)[1]).decode("utf-8") != LECTURE_MD.read_text(encoding="utf-8"):
        raise ValueError("The standalone Markdown download differs from its source")
    if lecture_soup.select(".metric-strip, .raw-source, #qa-status"):
        raise ValueError("Author-only report elements must not appear in the reader's lecture")
    if any("review.html" in link.get("href", "") for link in lecture_soup.select(".hero-links a")):
        raise ValueError("The reader's lecture must not link to the author report in its main navigation")
    if len(review_soup.select("#qa-status")) != 1:
        raise ValueError("Expected one QA status block")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, help="New absolute HTML path; existing files are never overwritten")
    parser.add_argument("--qa-text", default="Проверена синхронизация полного текста речи и всех Markdown-документов. Визуальная проверка обновлённой версии в браузере ещё не завершена.")
    parser.add_argument("--check", action="store_true", help="Render and validate in memory without writing files")
    args = parser.parse_args()
    if args.archive:
        if not args.archive.is_absolute() or args.archive.suffix.lower() != ".html":
            parser.error("--archive must be a new absolute .html path")
        if args.archive.exists():
            parser.error(f"Archive already exists and will not be replaced: {args.archive}")
    if not LECTURE_MD.is_file():
        parser.error(f"Detailed lecture is not ready: {LECTURE_MD}")
    data = read_data()
    paths = sorted(ROOT.glob("*.md"), key=lambda path: (path != LECTURE_MD, path.name.casefold()))
    date_label = datetime.now().astimezone().strftime("%d.%m.%Y")
    review, stats = build_review(data, paths, args.qa_text, date_label)
    lecture = build_lecture(date_label, LECTURE_MD.read_text(encoding="utf-8"))
    validate(review, lecture, data, paths)
    stats["review_bytes"] = len(review.encode("utf-8"))
    stats["lecture_bytes"] = len(lecture.encode("utf-8"))
    stats["checked_only"] = args.check
    if not args.check:
        REVIEW_HTML.write_text(review, encoding="utf-8", newline="\n")
        LECTURE_HTML.write_text(lecture, encoding="utf-8", newline="\n")
        if args.archive:
            args.archive.parent.mkdir(parents=True, exist_ok=True)
            # Exclusive creation also protects against a second writer racing this build.
            with args.archive.open("x", encoding="utf-8", newline="\n") as handle:
                handle.write(review)
            stats["archive"] = str(args.archive)
    # Windows consoles may use a legacy code page; file contents remain UTF-8.
    print(json.dumps(stats, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
