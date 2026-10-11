"""Create the public Markdown handout from a closed, hash-checked manifest."""
from pathlib import Path,PurePosixPath
import json,hashlib,zipfile,re,io
root=Path(__file__).resolve().parents[1]
source=root/'_build/course-source'
manifest=json.loads((root/'_build/course-sources.json').read_text(encoding='utf-8'))
repairs=json.loads((root/'_build/external-link-repairs.json').read_text(encoding='utf-8'))
entries={}
for item in manifest:
 rel=PurePosixPath(item['path'])
 if rel.is_absolute() or '..' in rel.parts or rel.suffix not in ['.md','.canvas']:raise ValueError('Unsafe handout path')
 p=source.joinpath(*rel.parts)
 if p.is_symlink() or not p.is_file():raise ValueError('Invalid handout file')
 data=p.read_bytes()
 if hashlib.sha256(data.decode('utf-8').replace('\r\n','\n').encode('utf-8')).hexdigest()!=item['normalizedSha256']:raise ValueError('Handout source drift: '+str(rel))
 if rel.suffix=='.md':
  text=data.decode('utf-8-sig')
  text=re.sub(r'\[\[99 Служебное/([^\]|]+)(?:\\?\|([^\]]+))?\]\]',lambda m:(m[2] or m[1])+' (редакционная заметка автора)',text)
  for original,fix in repairs.items():
   if original in text:
    text=re.sub(r'\[[^\]]*\]\('+re.escape(original)+r'\)',lambda m:'['+fix['label']+']('+fix['url']+')',text)
    text=text.replace(original,fix['url']).rstrip()+'\n\n> '+fix['note']+'\n'
  data=text.replace('\r\n','\n').encode('utf-8')
 entries[rel.as_posix()]=data.decode('utf-8').replace('\r\n','\n').encode('utf-8')
entries['README.md']='''# Курс SCA/OSA — Пиков Виталий Александрович

691 учебная заметка и карта архитектуры. Начните с `00 Карты/Главная карта.md`.
Заметки можно открыть в Obsidian или читать как Markdown. Для просмотра схем Mermaid нужен поддерживающий их просмотрщик; веб-версия содержит готовые SVG.

Веб-версия: https://kapo.pikov.expert/
Проект стандарта: https://kapo.pikov.expert/#standard

Это авторские учебные материалы. Организационная модель сопровождения ППК не заменяет определение ППК в нормативном документе. В опубликованном проекте ППК — машиночитаемый документ; реестр его версий — отдельная практика управления. Проект первой редакции не следует выдавать за утверждённый стандарт. Применимость требований и актуальные версии инструментов проверяются для конкретной задачи.
Служебные ссылки на редакционные заметки заменены текстом; рабочие документы и переписки в архив не включены.
Подтверждённые недоступные внешние ссылки заменены теми же адресами, что и в веб-библиотеке; пояснения приведены в соответствующих заметках. Исходные авторские файлы сохранены отдельно без изменений.
'''.encode('utf-8')
buf=io.BytesIO()
with zipfile.ZipFile(buf,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name in sorted(entries):
  info=zipfile.ZipInfo(name,(2026,10,10,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.create_system=3;info.external_attr=0o100644<<16
  z.writestr(info,entries[name])
target=root/'downloads/sca-osa-course.zip';target.write_bytes(buf.getvalue())
downloads=['composition-analysis-national-standard-draft.docx','composition-analysis-national-standard-draft.pdf','sca-osa-course.zip']
checks=''.join(hashlib.sha256((root/'downloads'/n).read_bytes()).hexdigest()+'  '+n+'\n' for n in downloads)
(root/'downloads/SHA256SUMS.txt').write_text(checks,encoding='utf-8',newline='\n')
print(f'KAПO course package: {len(entries)} entries; {len(buf.getvalue())} bytes')
