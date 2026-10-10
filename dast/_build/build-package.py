"""Build the reviewed student ZIP deterministically from repository sources."""
from pathlib import Path, PurePosixPath
import hashlib
import io
import json
import re
import stat
import zipfile

DOMAIN = Path(__file__).resolve().parents[1]
SOURCE = DOMAIN / '_build' / 'student-source'
LABS = ('aflpp_fuzzing_windows10_student', 'libfuzzer_main_cpp_student', 'fuzzing_bug_fix_demo')


def build():
    manifest = json.loads((DOMAIN / '_build' / 'student-source-manifest.json').read_text(encoding='utf-8'))
    entries = {}
    for record in manifest['files']:
        relative = PurePosixPath(record['path'])
        if relative.is_absolute() or '..' in relative.parts or any(p.startswith('.') for p in relative.parts):
            raise ValueError('Unsafe student source path')
        source = SOURCE.joinpath(*relative.parts)
        if source.is_symlink() or not source.resolve().is_relative_to(SOURCE.resolve()):
            raise ValueError('Student source escapes its directory')
        content = source.read_bytes()
        if hashlib.sha256(content).hexdigest() != record['sha256']:
            raise ValueError('Student source differs from reviewed manifest: ' + str(relative))
        if content.startswith((b'\x7fELF', b'MZ')):
            raise ValueError('Executable binaries must be built by students')
        entries[str(relative)] = content
    for name in LABS:
        for extension in ('.pdf', '.md'):
            entries[name + extension] = (DOMAIN / 'downloads' / (name + extension)).read_bytes()
        html = (DOMAIN / 'practice' / (name + '.html')).read_text(encoding='utf-8')
        # A standalone handout works when opened directly from the extracted ZIP.
        html = re.sub(r'<nav class="lab-nav"[\s\S]*?</nav>', '', html)
        html = re.sub(r'<script>\(function\(m,e,t,r,i,k,a\)[\s\S]*?</script>', '', html)
        html = html.replace('<link rel="icon" href="/favicon.svg" type="image/svg+xml">', '')
        entries[name + '.html'] = html.encode('utf-8')
    entries['README.md'] = '''# Практика динамического анализа

Автор методичек: Пиков Виталий Александрович — https://pikov.expert/
Лекция и актуальный комплект: https://dast.pikov.expert/

Начните с aflpp_fuzzing_windows10_student.html, затем откройте
libfuzzer_main_cpp_student.html и fuzzing_bug_fix_demo.html.
Каждая методичка также доступна в PDF и Markdown.

Исходники: src/main.cpp и src/main_libfuzzer.cpp. Начальный корпус: in/.
Образцы результатов автора: out*/default/queue и out*/default/crashes;
они показывают формат артефактов и не являются результатами вашего запуска.
Отдельный пример входа libFuzzer: examples/libfuzzer-crash.
Двоеточия в именах AFL заменены на подчёркивания для распаковки в Windows;
содержимое входных файлов сохранено побайтово.

Работайте с этими примерами в собственной WSL2/Ubuntu или Linux VM.
Программы необходимо собрать по методичкам. Готовые бинарники, история Git,
конфигурация редактора и служебные отчёты не входят в публичную учебную выдачу.
Публичное имя ZIP сохранено для команд распаковки из методичек.
'''.encode('utf-8')
    entries['SHA256SUMS.txt'] = ''.join(f'{hashlib.sha256(data).hexdigest()}  {name}\n' for name, data in sorted(entries.items())).encode()
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, content in sorted(entries.items()):
            info = zipfile.ZipInfo('my-first-python-project/' + name, (2026, 10, 10, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, content, compresslevel=9)
    output = DOMAIN / 'downloads' / 'my-first-python-project-v02.zip'
    output.write_bytes(buffer.getvalue())
    downloads = sorted(p for p in output.parent.iterdir() if p.is_file() and p.name != 'SHA256SUMS.txt')
    (output.parent / 'SHA256SUMS.txt').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in downloads), encoding='utf-8', newline='\n')
    print(f'DAST PACKAGE OK: {len(entries)} files, {output.stat().st_size} bytes')


if __name__ == '__main__':
    build()
