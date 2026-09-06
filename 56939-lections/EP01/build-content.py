"""Build browser content and timing report from the editable Markdown script."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent
SOURCES = [
    dict(id='G24', title='GOST R 56939-2024 · final edition', url='https://protect.gost.ru/gost/details/f3818925-a96f-4f55-96e9-46b44720ee64', note='Foreword and structure; clause 4.7 on normative wording; clause 5.1 on planning and its implementation evidence. English clause wording is an author translation.'),
    dict(id='G16', title='GOST R 56939-2016 · final edition', url='https://protect.gost.ru/gost/details/286a588e-4a6a-4899-88f7-3c370dea1e1d', note='Developed by NPO Echelon and submitted by TC 362. Nine groups of measures in 5.1–5.9; clause 4.2 treats sleduyet as a recommendation. Approved 1 June 2016; effective 1 June 2017; replaced by the 2024 edition.'),
    dict(id='WARE', title='RAND · Security Controls for Computer Systems', url='https://www.rand.org/pubs/reports/R609-1.html', note='Original February 1970 report; the catalogue page describes the 1979 reissue.'),
    dict(id='SS75', title='Saltzer and Schroeder · The Protection of Information in Computer Systems', url='https://web.mit.edu/saltzer/www/publications/protection/index.html', note='Proceedings of the IEEE, September 1975. Selected principles, not a complete account of security history.'),
    dict(id='MSH', title='Microsoft · History of the SDL', url='https://www.microsoft.com/en-us/securityengineering/sdl/about', note='Trustworthy Computing: January 2002; SDL integral to development: 2004.'),
    dict(id='RH', title='Rosstandart regional centre · Historical milestones', url='https://csm.omsk.ru/about/90-years/rosstandart-istor-vehi/16107/', note='Institutional history: standardization committee established 15 September 1925.'),
    dict(id='N11', title='NIST SP 800-218 · SSDF 1.1 · Final', url='https://csrc.nist.gov/pubs/sp/800/218/final', note='Final baseline, 3 February 2022; the narrow example uses Table 1, task PO.2.1.'),
    dict(id='N12', title='NIST SP 800-218 Rev. 1 · SSDF 1.2 · Draft', url='https://csrc.nist.gov/pubs/sp/800/218/r1/ipd', note='Initial public draft, 17 December 2025. Status checked 6 September 2026; recheck before recording.'),
    dict(id='SAMM', title='OWASP SAMM · Strategy and Metrics · Stream A', url='https://owaspsamm.org/model/governance/strategy-and-metrics/stream-a/', note='Maturity model; activity G-SM-A-2 is the roadmap/strategy comparison. Living website, checked 6 September 2026.'),
    dict(id='MLR', title='Kudriavtseva and Gadyatskaya · A Multivocal Literature Review', url='https://arxiv.org/html/2211.16987v2', note='arXiv v2, 4 July 2023, preprint marked In submission. A review of 28 methodologies. Table II lists publication dates; the analysis covers engineering practices, operating models and limits of effectiveness evidence. Publication dates and the origins of ideas are distinct milestones.'),
    dict(id='SAMM20', title='OWASP SAMM · Version 2 public release', url='https://owaspsamm.org/blog/samm2-release/', note='Official announcement, 31 January 2020; a version-release date, not the first appearance of all SAMM ideas.'),
    dict(id='GOSTH', title='Vitaliy Varenitsa · Retrospective on GOST R 56939', url='#history-source-note', note='История создания и актуальное состояние РБПО в России. ГОСТ Р 56939-2016/24. Presentation, 2 July 2025. Pages 2–4 cover the context and drafting history; pages 3 and 22 cover international connections. Recollections describe the authors\' intentions; adopted requirements are defined by the final standards.'),
    dict(id='EX', title='Illustrative teaching example · Vitaliy Pikov', url='#example-note', note='Fictional importer, roles, hours, dates, review cadence and tasks. Not a client case, GOST-prescribed schedule, or conformity claim.'),
    dict(id='TRANS', title='Vitaliy Pikov · Secure development: history and practice', url='PVS-2025-07-02-lecture.html', note='Companion Russian lecture on standards, processes and implementation, with a historical account by Vitaliy Varenitsa and references to the applicable editions.'),
    dict(id='N19', title='NIST SSDF · public draft · June 2019', url='https://csrc.nist.gov/News/2019/draft-white-paper-on-ssdf', note='Official announcement of the public draft, 11 June 2019. Later than the adoption of GOST R 56939-2016.'),
    dict(id='N20', title='NIST SSDF 1.0 · final · April 2020', url='https://csrc.nist.gov/news/2020/mitigating-risk-of-software-vulns-ssdf', note='Official announcement of the final white paper, 23 April 2020. Separate from the 2019 draft and SSDF 1.1 of February 2022.'),
]

def field(block, name):
    found = re.search(r'^' + re.escape(name) + r': (.*)$', block, re.M)
    if not found:
        raise ValueError(f'Missing {name}')
    return found.group(1)

def stamp(seconds):
    return f'{seconds // 60:02d}:{seconds % 60:02d}'

slides = []
script = (ROOT / 'EP01-script-en.md').read_text(encoding='utf-8')
target = re.search(r'^Target: (\d+):(\d{2})\b', script, re.M)
assert target and int(target[2]) < 60, 'Expected a Target: mm:ss header'
target_seconds = int(target[1]) * 60 + int(target[2])
for block in re.split(r'^## ', script, flags=re.M)[1:]:
    first = block.splitlines()[0]
    number, title = first.split(' | ', 1)
    screen = block.split('Items:\n', 1)[1].split('\nSources:', 1)[0]
    items = []
    for line in screen.splitlines():
        label, text = line.removeprefix('- ').split(' | ', 1)
        items.append(dict(label=label, text=text))
    speech = block.split('Speech:\n', 1)[1].split('\nCue:', 1)[0].strip()
    slides.append(dict(id=int(number), title=title, seconds=int(field(block, 'Seconds')),
                       section=field(block, 'Section'), kicker=f'EP01 / {int(number):02d}',
                       layout=field(block, 'Layout'), lead=field(block, 'Lead'),
                       items=items, quote='', notes=speech,
                       sourceIds=[s.strip() for s in field(block, 'Sources').split(',')]))
    if re.search(r'^Contact: ', block, re.M):
        name, label, url = field(block, 'Contact').split(' | ', 2)
        assert url.startswith('https://'), 'Contact website must use HTTPS'
        slides[-1]['contact'] = dict(name=name, label=label, url=url)

assert slides and [s['id'] for s in slides] == list(range(1, len(slides) + 1)), 'Slide numbers must be consecutive from 1'
assert all(s['seconds'] > 0 for s in slides), 'Slide durations must be positive'
assert sum(s['seconds'] for s in slides) == target_seconds, f'Timing must sum to {stamp(target_seconds)}'
known = {s['id'] for s in SOURCES}
assert all(set(s['sourceIds']) <= known for s in slides)
data = dict(title='Where Secure Development Begins', subtitle='History, GOST and a working process',
            author='Vitaliy Pikov', date='2026-09-06', cover='assets/ep01-cover.png',
            sources=SOURCES, slides=slides)
(ROOT / 'assets').mkdir(exist_ok=True)
(ROOT / 'assets' / 'episode-data.js').write_text('window.EP01_DATA = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
rows = ['# EP01 — Timing and rehearsal model', '', f'Generated from [the full English script](EP01-script-en.md). Timing slots total **{stamp(target_seconds)}**. Count uses English word tokens, including contractions and hyphenated words; spoken dates/numbers are already expanded in the script.', '', '| Slide | Start–end | Slot | Speech words | Words/min in slot |', '|---|---|---|---|---|']
elapsed = 0
total = 0
for s in slides:
    count = len(re.findall(r"[A-Za-z]+(?:['’\-][A-Za-z]+)*", s['notes']))
    rows.append(f"| {s['id']:02d}. {s['title']} | {stamp(elapsed)}–{stamp(elapsed+s['seconds'])} | {stamp(s['seconds'])} | {count} | {count*60/s['seconds']:.1f} |")
    elapsed += s['seconds']
    total += count
rows += ['', f'**Total: {total} spoken words.**', '', '## Speaking pace sensitivity', '', f'| Articulation pace | Speech alone | Space left inside {stamp(target_seconds)} for pauses/transitions |', '|---|---|---|']
for pace in [110, 115, 120, 125, 130]:
    speaking = round(total * 60 / pace)
    remaining = target_seconds-speaking
    rows.append(f'| {pace} words/min | {stamp(speaking)} | {stamp(remaining) if remaining >= 0 else "exceeds slot by " + stamp(-remaining)} |')
rows += ['', 'Use a recorded rehearsal to select the pace. Slot rates include silence; actual articulation is faster. Do not speed up historical names or clause numbers to meet an arbitrary timestamp. If a slide overruns, trim its example or redistribute time, regenerate this file and check the complete run again.', '', 'The deck has slide navigation and notes; it does not auto-advance or claim to measure speech. Final YouTube chapters must use the edited recording timestamps, not these planning slots.']
(ROOT / 'EP01-timing.md').write_text('\n'.join(rows)+'\n', encoding='utf-8')
print(json.dumps(dict(slides=len(slides), seconds=elapsed, spoken_words=total), ensure_ascii=False))
