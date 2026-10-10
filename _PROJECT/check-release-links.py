"""Check every HTML/CSS/sitemap reference against the actual release ZIPs.

No network access or third-party packages. JavaScript-created fragment targets
are checked by browser QA; this gate checks paths across ALL managed origins,
including additional sites that have no card in the lecture catalogue.
"""
import argparse
import json
import re
import sys
import zipfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
from xml.etree import ElementTree

OWN_HOST = re.compile(r"^(?:[a-z0-9-]+\.)?pikov\.expert$")
LOCAL_HOST = re.compile(r"^(?:localhost|127(?:\.\d+){3}|0\.0\.0\.0|::1)$")


class References(HTMLParser):
    def __init__(self, source, content):
        super().__init__(convert_charrefs=True)
        self.source = self.base = source
        self.references = []
        self.feed(content)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'base' and attrs.get('href'):
            self.base = urljoin(self.source, attrs['href'])
        for key in ('href', 'src', 'poster', 'data'):
            if key == 'data' and tag != 'object':
                continue
            value = attrs.get(key, '').strip()
            if value:
                self.references.append(urljoin(self.base, value))
        if attrs.get('srcset') and not attrs['srcset'].startswith('data:'):
            for candidate in attrs['srcset'].split(','):
                if candidate.strip():
                    self.references.append(urljoin(self.base, candidate.strip().split()[0]))
        if attrs.get('style'):
            self.references.extend(css_references(self.base, attrs['style']))


def css_references(source, content):
    return [urljoin(source, match[1]) for match in
            re.finditer(r'''url\(\s*['"]?([^\s)'";]+)''', content)
            if not match[1].startswith('data:')]


def markdown_references(source, content):
    # Commands/examples are not links in the rendered handout. Local lab URLs
    # intentionally point at the student's machine; check hosted/relative paths.
    content = re.sub(r'(?ms)^\s*(```|~~~).*?^\s*\1[^\n]*$', '', content)
    content = re.sub(r'`[^`\n]*`', '', content)
    values = re.findall(r'!?\[[^\]\n]+\]\(<?([^\s)>]+)', content)
    values += re.findall(r'(?m)^\s*\[[^\]]+\]:\s*<?([^\s>]+)', content)
    for value in values:
        url = urljoin(source, value)
        parsed = urlsplit(url)
        if parsed.scheme in ('http', 'https') and not LOCAL_HOST.fullmatch(parsed.hostname or ''):
            yield url


def resolve_internal(url, payload):
    parsed = urlsplit(url)
    if parsed.scheme == 'file' or LOCAL_HOST.fullmatch(parsed.hostname or ''):
        return 'link to a local machine'
    if parsed.scheme not in ('http', 'https') or not OWN_HOST.fullmatch(parsed.hostname or ''):
        return None
    host = parsed.hostname
    if host not in payload:
        return 'unmanaged site origin'
    # URL paths are case-sensitive on the Linux host, unlike the local checkout.
    name = unquote(parsed.path).lstrip('/')
    if '\\' in name or '..' in name.split('/'):
        return 'unsafe URL path'
    if not name or name.endswith('/'):
        name += 'index.html'
    if name in payload[host] or name.rstrip('/') + '/index.html' in payload[host]:
        return None
    return 'missing file in release'


def audit(index_path):
    index = json.loads(index_path.read_text(encoding='utf-8-sig'))
    payload, references, html_count = {}, [], 0
    for target in index:
        domain = target['domain']
        if domain in payload:
            raise ValueError('Duplicate release origin: ' + domain)
        with zipfile.ZipFile(target['archivePath']) as archive:
            payload[domain] = {x.filename for x in archive.infolist() if not x.is_dir()}
            for name in sorted(payload[domain]):
                source = 'https://' + domain + '/' + name
                if name.lower().endswith(('.html', '.htm')):
                    html_count += 1
                    content = archive.read(name).decode('utf-8-sig')
                    parsed = References(source, content)
                    references.extend((source, u) for u in parsed.references)
                    for style in re.findall(r'<style\b[^>]*>(.*?)</style>', content, re.I | re.S):
                        references.extend((source, u) for u in css_references(source, style))
                elif name.lower().endswith('.css'):
                    references.extend((source, u) for u in css_references(source, archive.read(name).decode('utf-8-sig')))
                elif name.lower().endswith(('.md', '.markdown')):
                    references.extend((source, u) for u in markdown_references(source, archive.read(name).decode('utf-8-sig')))
                elif name == 'sitemap.xml':
                    doc = ElementTree.fromstring(archive.read(name))
                    references.extend((source, node.text) for node in doc.iter() if node.tag.endswith('}loc') or node.tag == 'loc')
    issues = []
    for domain, names in payload.items():
        if 'index.html' not in names:
            issues.append({'source': domain, 'url': '/', 'issue': 'missing entry page'})
    for source, url in references:
        issue = resolve_internal(url, payload)
        if issue:
            issues.append({'source': source, 'url': url, 'issue': issue})
    return {'targets': len(payload), 'html': html_count, 'references': len(references), 'issues': issues}


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--index', type=Path)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    project = Path(__file__).parent
    date = json.loads((project / 'lectures.json').read_text(encoding='utf-8-sig'))['updated']
    result = audit(args.index or project / ('RELEASE_INDEX_' + date + '.json'))
    if args.report:
        args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({**result, 'issues': result['issues'][:30]}, ensure_ascii=False))
    return 1 if result['issues'] else 0


if __name__ == '__main__':
    sys.exit(main())
