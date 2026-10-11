"""Render the reviewed public course snapshot. Requires Markdown 3.10.2, beautifulsoup4.
Original user sources stay outside the build; no network is used by this script.
"""
from pathlib import Path
import re,json,hashlib,html
import markdown
from markdown.extensions.toc import slugify_unicode
from bs4 import BeautifulSoup

root=Path(__file__).resolve().parents[1]
source=root/'_build/course-source'
out=root/'library';out.mkdir(exist_ok=True)
esc=html.escape
repairs=json.loads((root/'_build/external-link-repairs.json').read_text(encoding='utf-8'))
files=sorted(source.rglob('*.md'))
records=[];by_path={};by_stem={};unresolved=[]
for p in files:
 rel=p.relative_to(source).as_posix();text=p.read_text(encoding='utf-8-sig')
 meta=re.match(r'^---\s*\n(.*?)\n---\s*\n',text,re.S)
 body=text[meta.end():] if meta else text
 heading=re.search(r'^# (.+)',body,re.M)
 title=(heading.group(1) if heading else p.stem).strip()
 # Module numbers keep repeated "Конспект" titles distinguishable in search.
 if rel.startswith('01 '):title=p.parent.name.split(' ',1)[0]+'. '+title
 ident=hashlib.sha256(rel.encode()).hexdigest()[:12]
 rec={'path':rel,'file':p,'body':body,'title':title,'id':ident,'href':'doc-'+ident+'.html','section':rel.split('/')[0]}
 records.append(rec);by_path[rel[:-3]]=rec;by_stem.setdefault(p.stem,[]).append(rec)

def shell(title,content,relpath):
 return f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)} — КАПО · Пиков</title><meta name="description" content="{esc(title)}. Авторский курс по композиционному анализу, SBOM, ППК и безопасности цепочки поставки."><link rel="canonical" href="https://kapo.pikov.expert/{relpath}"><link rel="stylesheet" href="../assets/site.css"><script defer src="../assets/site.js"></script></head><body><a class="skip" href="#content">К содержимому</a><header class="topbar"><a class="wordmark" href="../index.html">Пиков / КАПО</a><div class="toplinks"><a href="index.html">Библиотека</a><button type="button" data-theme-toggle>Тёмная тема</button></div></header>{content}<footer>Пиков Виталий Александрович · Авторские учебные материалы.<br><a href="../index.html#standard">Проект стандарта и границы применимости</a> · <a href="https://pikov.expert/">Все лекции</a></footer></body></html>'''

def resolve(target,current):
 target=target.replace('\\|','|').strip()
 if target.endswith('.md'):target=target[:-3]
 if target in by_path:return by_path[target]
 local=(Path(current['path']).parent/target).as_posix()
 if local in by_path:return by_path[local]
 candidates=by_stem.get(target,[])
 if len(candidates)==1:return candidates[0]
 return None

for rec in records:
 body=rec['body'];di=0
 body=re.sub(r'%%.*?%%','',body,flags=re.S)
 if not re.search(r'^# ',body,re.M):body='# '+rec['title']+'\n\n'+body
 # Python-Markdown does not parse fenced code nested inside blockquotes.
 # Render those fences before Markdown so shell comments cannot become headings.
 def quote_code(m):
  code='\n'.join(re.sub(r'^> ?', '',line) for line in m.group(2).splitlines())
  return '\n\n<pre><code class="language-'+esc(m.group(1))+'">'+esc(code)+'</code></pre>\n\n'
 body=re.sub(r'^> ?```([^\n]*)\n(.*?)^> ?```\s*$',quote_code,body,flags=re.S|re.M)
 def diagram(m):
  global di
  name=f"course-{rec['id']}-{di}.svg";di+=1
  if not (root/'assets/course-diagrams'/name).exists():raise RuntimeError('Unrendered diagram '+name)
  return f'\n<figure class="diagram-original"><a href="../assets/course-diagrams/{name}" target="_blank" rel="noopener"><img src="../assets/course-diagrams/{name}" alt="Схема: {esc(rec["title"])}" loading="lazy"></a><figcaption>Схема из авторского курса. Нажмите, чтобы открыть в полном размере.</figcaption></figure>\n'
 body=re.sub(r'```mermaid\s*\n(.*?)```',diagram,body,flags=re.S)
 # Obsidian dataview is a query, not teaching content. Materialise its public results.
 def dataview(m):
  selected=[r for r in records if r['section'].startswith('03 ')] if '03 Практикум' in m.group(1) else [r for r in records if r['path'].endswith('/00 Карта модуля.md')]
  return '\n<ul>'+''.join(f'<li><a href="{r["href"]}">{esc(r["title"])}</a></li>' for r in selected)+'</ul>\n'
 body=re.sub(r'```dataview\s*\n(.*?)```',dataview,body,flags=re.S)
 # Leave wikilink syntax examples inside fenced/inline code untouched.
 protected={}
 def protect(m):
  key=f'CODEBLOCKTOKEN{len(protected)}END';protected[key]=m.group();return key
 body=re.sub(r'```.*?```|`[^`\n]+`',protect,body,flags=re.S)
 def wiki(m):
  raw=m.group(1).replace('\\|','|');parts=raw.split('|',1);target=parts[0];label=parts[1] if len(parts)>1 else target.split('/')[-1]
  target,_,fragment=target.partition('#')
  if target in ['00 Карты/Архитектура пайплайна','Архитектура пайплайна','00 Карты/Архитектура пайплайна.canvas']:
   return f'<a href="../diagrams/facts-and-decisions.html" target="_blank" rel="noopener">{esc(label)} · интерактивная схема</a>'
  hit=resolve(target,rec)
  if hit:
   frag='#'+slugify_unicode(fragment,'-') if fragment else ''
   return f'<a href="{hit["href"]}{frag}">{esc(label)}</a>'
  if target.startswith('99 Служебное/'):
   return esc(label)+' <span class="small">(служебная заметка автора)</span>'
  unresolved.append({'source':rec['path'],'target':target,'label':label})
  return '<span>'+esc(label)+'</span>'
 body=re.sub(r'\[\[([^\]]+)\]\]',wiki,body)
 for k,v in protected.items():body=body.replace(k,v)
 body=re.sub(r'^> \[![^\]]+\]\s*', '> ',body,flags=re.M)
 rendered=markdown.markdown('[TOC]\n\n'+body,extensions=['tables','fenced_code','toc','sane_lists'],extension_configs={'toc':{'slugify':slugify_unicode,'toc_depth':'2-3'}})
 soup=BeautifulSoup(rendered,'html.parser')
 for a in soup.find_all('a',href=True):
  href=a['href']
  if href in repairs:
   fix=repairs[href];a['data-original-url']=href;a['href']=fix['url'];a.string=fix['label'];a['title']=fix['note'];href=a['href']
  if re.match(r'https?://(?:localhost|127\.0\.0\.1)(?::\d+)?',href):
   replacement=soup.new_tag('code');replacement.string=href;a.replace_with(replacement);continue
  if href.startswith('http'):a['target']='_blank';a['rel']='noopener noreferrer'
 for table in soup.find_all('table'):
  wrapper=soup.new_tag('div',attrs={'class':'table-wrap'});table.wrap(wrapper)
 notice='<details class="note small"><summary>Как читать авторский курс и нормативные материалы</summary><p>Это учебные материалы, а не заключение о соответствии конкретного продукта. Организационные модели курса отделяйте от терминов стандарта: ППК в опубликованном проекте — машиночитаемый перечень, а живой реестр его версий является практикой сопровождения. Термин OSA в разных материалах имеет разный охват. Статус и обязательность нормативного документа проверяются отдельно; проект КАПО опубликован как проект первой редакции.</p></details>'
 for original,fix in repairs.items():
  if original in body:
   fallback='' if soup.find('a',href=fix['url']) else f' <a href="{esc(fix["url"])}" target="_blank" rel="noopener noreferrer">{esc(fix["label"])}</a>'
   notice+=f'<p class="note small">{esc(fix["note"])}{fallback}</p>'
 page=f'<main class="reader" id="content"><nav class="breadcrumbs"><a href="../index.html">КАПО</a> / <a href="index.html">Библиотека</a> / <span>{esc(rec["section"])}</span></nav>{notice}{soup}</main>'
 (out/rec['href']).write_text(shell(rec['title'],page,'library/'+rec['href']),encoding='utf-8')

sections=sorted(set(r['section'] for r in records))
options=''.join(f'<option value="{esc(s)}">{esc(s)}</option>' for s in sections)
items=''.join(f'<li data-library-item data-section="{esc(r["section"])}" data-search="{esc(" ".join((r["title"]+" "+r["path"]+" "+re.sub(r"<[^>]+>"," ",r["body"])).lower().split()))}"><small>{esc(r["section"])}</small><a href="{r["href"]}">{esc(r["title"])}</a></li>' for r in records)
index=f'<main class="wrap" id="content"><section><span class="eyebrow">Курс · справочник · практика</span><h1>Библиотека композиционного анализа</h1><p class="lead">{len(records)} материалов: выберите раздел или найдите термин, инструмент, практику и шаблон. Поиск работает по полному тексту.</p><div class="searchbar"><label for="search">Поиск</label><input id="search" data-search type="search" placeholder="Например, статическая линковка"><label for="section">Раздел</label><select id="section" data-section><option value="">Все разделы</option>{options}</select></div><p class="small" data-count role="status">Материалов: {len(records)}</p><p class="empty" data-empty hidden>Ничего не найдено. Попробуйте другой запрос или раздел.</p><ul class="library-list">{items}</ul></section></main>'
(out/'index.html').write_text(shell('Библиотека композиционного анализа',index,'library/'),encoding='utf-8')
public=[{k:v for k,v in r.items() if k not in ['file','body']} for r in records]
(root/'_build/library-index.json').write_text(json.dumps(public,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'_build/unresolved-links.json').write_text(json.dumps(unresolved,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'pages':len(records),'unresolved':len(unresolved)},ensure_ascii=False))
if unresolved:print(json.dumps(unresolved[:30],ensure_ascii=False,indent=2))
