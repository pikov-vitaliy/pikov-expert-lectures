# Глубокий содержательный аудит учебных материалов pikov.expert

- Статус: `NEEDS CHANGES`.
- Контрольная точка аудита: 15.08.2026.
- Режим работы: read-only для учебного контента и публикации; исправления, commit, push и deploy не выполнялись.

> Дата выше относится только к контрольной точке аудита. Сами лекции остаются универсальными: календарную дату занятия и учебный центр добавлять на страницы и слайды не требуется. Для изменяемых стандартов следует указывать редакцию/версию и официальный постоянный URL, а не формулировку «актуальная версия» без механизма обновления.

## 1. Итоговый вердикт

Сеть материалов сильна по широте тем, авторской визуальной подаче и наличию практики. Техническая сборка релиза целостна, а все 30 проверенных landing pages доступны. Однако единый комплект пока нельзя считать полностью готовым для безусловной выдачи студентам.

Главные причины:

1. В открытом доступе находятся старые AppSec Day 1 материалы с небезопасными и одновременно невоспроизводимыми лабораторными сценариями.
2. DVWA-методичка закрепляет небезопасные Docker-практики, хотя рядом уже есть качественный изолированный Juice Shop wrapper.
3. В нескольких лекциях неверно указан смысл международных источников: MITRE ATT&CK tactics, NIST SP 800-30/SP 800-61, CycloneDX, NIST password guidance, CWE/CVE/NVD.
4. Часть количественных тезисов не имеет проверяемой методики либо ошибочно приписана NIST/ФСТЭК.
5. Несколько практикумов не имеют полного RoE, изоляции, stop conditions, rollback и воспроизводимых fixtures.
6. Есть документные, мобильные и accessibility-дефекты, из-за которых полезное содержание трудно читать или оно недоступно assistive technology.
7. Локальный compliance-слой содержит P1-ошибки: приказ №17 вместо №117, неверные даты/области НПА, устаревший ГОСТ, Windows lifecycle/feature drift и неточности лицензирования ТЗИ.

Иными словами, зелёный `Static QA`/`Browser QA` в release index подтверждает отсутствие базовых технических поломок сборки, но не подтверждает фактологическую, педагогическую и практическую готовность содержания.

## 2. Что именно проверено

Контрольной базой служит `_PROJECT/RELEASE_INDEX_2026-08-15.json` и соответствующие release ZIP.

Аудит привязан к commit `5be877ea76eb023e6ea196799cca0b87f86f4c6c`; на старте `HEAD` и `origin/main` совпадали. Единственным заранее существовавшим незакоммиченным объектом был непубличный `?? pc/`.

- 33 карточки каталога;
- 29 поддоменов и корневой сайт — 30 release targets;
- 4 536 публичных файлов;
- 951 публичный HTML/Markdown: 137 содержательных материалов и 814 сгенерированных страниц SPDX;
- 11 публичных ZIP с 186 вложенными файлами;
- 10 уникальных PDF и 9 уникальных DOCX во вложенных пакетах;
- 82 уникальные PDF-страницы;
- 13 семейств публичных практикумов и отдельный непубличный комплект `pc/`;
- 30 live-сайтов в трёх viewport: 1920×1080, 1366×768 и 390×844 — 90 браузерных прогонов.

Проверки целостности:

- все 4 536 записей release manifest совпадают с ZIP по пути, размеру и SHA-256;
- все 30 release-архивов и вложенные публичные архивы проверены на path traversal, absolute/drive-letter paths и case collisions; подтверждённых нарушений нет;
- live-сервисы и атаки не запускались;
- Docker Compose проверялся только через `config --quiet`;
- Python-тесты выполнялись только во временной копии;
- рабочая копия сохраняла ранее существовавшийся непубличный `?? pc/`.

### Приоритеты

| Приоритет | Значение в этом аудите |
|---|---|
| `P0` | Немедленно прекратить студенческую выдачу конкретного материала до исправления. Это не означает подтверждённую уязвимость сайта. |
| `P1` | Существенная фактологическая, безопасностная или воспроизводимая ошибка; исправить до следующего использования соответствующего блока. |
| `P2` | Значимый пробел качества, доказательности, педагогики или доступности. |
| `P3` | Редактура и улучшение удобства без изменения основного вывода. |

## 3. P0: что временно не выдавать студентам

### 3.1. AppSec Day 1 — старый публичный пакет

Публичные URL на момент проверки возвращают `HTTP 200`:

- `https://appsec-lections.pikov.expert/downloads/day-01-public-materials.zip`;
- `https://appsec-lections.pikov.expert/downloads/day-01-laboratory-materials-and-reports.zip`.

Подтверждённые проблемы:

- `appsec-lections/downloads/day-01/program-and-environment/prepare.sh:7-29` добавляет жёстко заданного пользователя в Docker group, использует mutable image и публикует `3000:3000` без ресурсных/privilege controls;
- инструкция участника повторяет этот путь: `.../md/1. Инструкция...md:90-94,164-170`;
- `.../md/4. Лабник. Безопасность приложений.md:438-481` предлагает memory/YAML bomb против неограниченного контейнера;
- `:507-654` использует внешний URL и SSRF-стенд с публикацией на всех интерфейсах без no-egress сети;
- `:662-890` предлагает buffer overflow + `system()` без disposable/no-network sandbox и без полного cleanup;
- YAML в опубликованном Markdown не создаёт заявленные aliases из-за escaping;
- Compose-блок не проходит parser из-за потерянной вложенности/escape-артефактов;
- Make/C-фрагмент содержит артефакты преобразования и не является надёжно исполнимым;
- PDF-версия сохраняет reviewer comments и расходится с Markdown/DOCX.

Решение перед повторной публикацией:

1. Временно исключить из выдачи оба ZIP, прямые Day 1 participant-materials и `prepare.sh`.
2. Не удалять содержательные лекции, стенограммы и конспекты.
3. Свести практику в один канонический source-of-truth.
4. Построить стенд по уже удачному Juice Shop pattern: digest pin, `--pull never`, `127.0.0.1`, isolated/no-egress network, `--cap-drop ALL`, `no-new-privileges`, CPU/RAM/PID limits, readiness, ownership-labelled cleanup.
5. Для memory/command-execution сценария использовать отдельный disposable, no-network runner с жёсткими лимитами и детерминированным reset.
6. Генерировать MD/DOCX/PDF из одного источника и проверять исполнимые блоки в CI.

### 3.2. DVWA

Публичный `https://pentest.pikov.expert/materials/практика-dvwa-задания.md` возвращает `HTTP 200`.

`pentest/materials/практика-dvwa-задания.md:39-64,118-146,217-225,280-286,318-328` использует mutable `latest`, `--restart unless-stopped`, `curl | sudo sh`, Docker group, выгрузку всех hashes/cookies и общий cleanup.

Решение: временно снять именно DVWA-методичку, сохранив лекцию и Juice Shop. Если DVWA нужен, дать ему такой же digest-pinned, preloaded, loopback/no-egress wrapper с синтетическими данными и минимальным evidence.

## 4. Подтверждённые фактологические и стандартные ошибки

### 4.1. Версии и модели

| Pri | Где | Проблема | Точная коррекция | Первичный источник |
|---|---|---|---|---|
| P1 | `threats-kii/index.html:2040,2049`, `materials.md:548,558` | 14 тактик и старая Defense Evasion. | Enterprise v19.2 — 15 тактик; прежняя Defense Evasion разделена на Stealth и Defense Impairment. | [ATT&CK v19 updates](https://attack.mitre.org/resources/updates/) |
| P1 | `risk/index.html:1855`, `risk/materials.md:381-399` | Withdrawn SP 800-30 (2002), схема 9+7, выдана как текущая. | Либо явно назвать исторической, либо заменить структурой Rev.1: Prepare → Conduct → Maintain. | [SP 800-30 Rev.1](https://csrc.nist.gov/pubs/sp/800/30/r1/final) |
| P1 | `risk/materials.md:1576`, `risk/index.html:3371-3372` | Старое название SP 800-61 и авторская семиступенчатая схема приписана NIST. | Использовать SP 800-61r3 и CSF 2.0; семиступенчатый цикл назвать авторским composite. | [NIST SP 800-61r3](https://csrc.nist.gov/pubs/sp/800/61/r3/final) |
| P1 | `ppk/index.html:1285,1306` | CycloneDX 1.7 датирована мартом 2026. | Версия 1.7 выпущена 21.10.2025; в evergreen-слайде достаточно версии и official link. | [CycloneDX 1.7](https://cyclonedx.org/news/cyclonedx-v1.7-released/) |
| P2 | `sast/index.html:1689`, `threats-kii/index.html:3412`, `materials.md:1196` | `CWE-119 = Buffer Overflow`. | CWE-119 — broad Class; использовать конкретную первопричину CWE-787/125/120/121/122. | [CWE-119](https://cwe.mitre.org/data/definitions/119.html) |
| P2 | `pentest/index.html:1530`, `threats-kii/index.html:3467-3468`, `materials.md:1228-1229` | Смешаны роли CVE и NVD; legacy link. | CVE Program публикует CVE Records; NVD обогащает их CVSS/CWE/CPE; ссылка `cve.org`. | [CVE overview](https://www.cve.org/about/overview), [NVD process](https://nvd.nist.gov/general/cve-process) |
| P2 | AppSec Day 1 AI block `day-01.html:729-846` | Абсолютный тезис «LLM не создаёт новый вид уязвимостей» и неполный/слитый список рисков. | Сохранить связь с классическими принципами, но отдельно показать model/agent-specific mechanisms; явно сопоставить LLM01–LLM10:2025, Agentic Top 10:2026 и AISVS 1.0. | [OWASP LLM Top 10:2025](https://genai.owasp.org/llm-top-10/), [Agentic Top 10:2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/), [AISVS 1.0](https://owasp.org/www-project-artificial-intelligence-security-verification-standard-aisvs-docs/) |

Коррекция самого аудита: MITRE [Version History](https://attack.mitre.org/resources/versions/) сейчас официально помечает ATT&CK v19.2 как current; Agile update опубликован 06.08.2026. Поэтому упоминание v19.2 в `pentest` корректно и не подлежит откату на v19.1. Исправлять нужно только изменяемые counts/permalink и старую модель тактик в `threats-kii`.

### 4.2. Пароли

`windows/index.html:720` задаёт `≥12 + complexity + 90 дней`, а `tz/materials/примеры/пример-сайт.md:413-414` — 8 символов и 90 дней для single-factor admin panel.

Международный default profile по [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver):

- single-factor password — минимум 15 символов;
- при MFA допустим минимум 8;
- разрешить минимум 64 и password managers/paste;
- проверять compromised/common password blocklist;
- применять rate limiting и стойкое salted hashing;
- не вводить обязательные composition rules и календарную ротацию без свидетельства компрометации.

Если конкретный российский/ведомственный профиль действительно требует иной набор, его следует показывать отдельной колонкой с точной нормой и областью применимости, а не выдавать за универсальную best practice.

### 4.3. Статистика и доказательность

| Pri | Где | Почему нельзя оставлять как общий факт | Коррекция |
|---|---|---|---|
| P1 | `sast/index.html:1280-1312` | 1/5/10/50/200 ошибочно приписано NIST и названо универсальной экспонентой. [NIST Planning Report 02-3](https://www.nist.gov/system/files/documents/director/planning/report02-3.pdf) помечает иллюстративную шкалу 1/5/10/15/30 как `Example Only` для общих defects, не security vulnerabilities. | Убрать 200×/универсальную причинность; оставить качественный тезис о rework cost либо точную историческую таблицу с оговоркой. |
| P1 | `windows/index.html:295` | Не найден первичный отчёт ФСТЭК, подтверждающий «до 70% инцидентов» в указанном смысле. | Удалить процент/атрибуцию либо привести отчёт, период, выборку, методику и URL. |
| P2 | `risk/materials.md:1564,1570` | `>90%` для entropy/MTD универсализирует отдельную экспериментальную конфигурацию. | Использовать качественное определение NIST MTD; число — только вместе с threat model и baseline конкретного эксперимента. |
| P2 | `ppk/index.html:819-820` | 85% transitive vulnerabilities — vendor claim без публичной методики/выборки. | Явно атрибутировать CodeScoring или убрать процент; сохранить требование охвата direct + transitive dependencies. |
| P2 | `sast/index.html:1257-1274` | Диапазоны defects/KLOC восходят к Jones 1977/1998 через McConnell, относятся ко всем defects и не доказывают нелинейную причинность. | Пометить как историческую иллюстрацию; использовать собственные baselines. SAST finding ≠ defect ≠ vulnerability. |

Современная опора для процессной части — [NIST SSDF SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final), а не универсальные коэффициенты стоимости.

### 4.4. OWASP Top 10:2025

`appsec-lections/day-02.html:104`, `practice.html:99,111` и `materials/практикум-день-2-набор-заданий.md:7,391` заявляют полный маршрут A01→A10:2025, но ЛР_10 — SSRF/A10:2021. Практической работы по A10:2025 Mishandling of Exceptional Conditions нет.

Допустимы два корректных варианта:

1. Честно назвать маршрут `A01–A09:2025 + историческая A10:2021 SSRF`.
2. Добавить отдельную лабораторную по fail-open/fail-closed, rollback, exception/resource cleanup и проверяемому error handling.

### 4.5. Авторская независимость и исторические примеры

Публичный регрессионный gate проходит: `PUBLIC INDEPENDENCE TEST OK archives=30`. В публичной версии авторство курса не приписывается прежнему учебному центру. В `vkr/index.html:430,478,489` сохранены ровно три ранее согласованных исторических примера с компанией; это допустимые примеры внутри содержания, а не заявление об авторстве или принадлежности курса.

Во внутренних, не публикуемых текущей сборкой README остался P2 housekeeping:

- `README.md:61-65` — устаревшая метка «Новые курсы» с названием прежнего учебного центра;
- `risk/README.md:4,13,22,37` и `threats-kii/README.md:4,12,21,41` — прежняя аффилиация/логотип;
- `tz/README.md:36-37,90,114` — прежние организационные упоминания.

Их следует нейтрализовать отдельной малой правкой, не меняя содержание курсов и не удаляя три разрешённых исторических примера. Регрессионный gate должен продолжать запрещать институциональное авторство, контакты и branding, но разрешать только точно ограниченные учебные примеры.

### 4.6. Локальный регуляторный и платформенный профиль

Этот блок не должен становиться основой всех курсов: российские НПА и продуктовые требования показываются отдельным `local compliance profile` рядом с международной методикой. Тем не менее фактические ошибки в нём необходимо исправить.

| Pri | Где | Подтверждённая проблема | Точная коррекция / источник |
|---|---|---|---|
| P1 | `tzi-dept/index.html:251,276,724`; `lic-tzi/index.html:310,715` | Приказ №17 подан как действующий. | №117 — действующие требования для ГИС и иных охватываемых систем; №17 — исторический до 01.03.2026. [Приказ ФСТЭК России №117](https://publication.pravo.gov.ru/document/0001202506170011). |
| P1 | `tzi-dept/index.html:727` | Для приказа №31 дана неверная дата 28.02.2017. | `Приказ ФСТЭК России от 14.03.2014 №31 (ред. приказа от 15.03.2021 №46)`. [Официальная публикация №46](https://publication.pravo.gov.ru/document/0001202107010126). |
| P1 | `astralinux02/index.html:255,279,281,284` и вложенный ZIP `astralinux01` | ГОСТ Р 50922-96 и дата 01.07.1997 представлены как действующие. | ГОСТ Р 50922-2006 действует с 01.02.2008 и заменил редакцию 1996 года; не называть его безусловно обязательным для любого контекста. [Карточка Росстандарта](https://protect.gost.ru/gost/details/6182acb0-1583-48b4-8964-fdf1643233d6). |
| P1 | `windows/index.html:465-468,480,518,720` | `12 + complexity + 90 дней + история 24` приписаны приказу №21. | Назвать локальным учебным профилем; параметры выводить из политики, модели угроз и конкретного baseline. Международный default вынесен в §4.2. [Изменения приказа №21](https://publication.pravo.gov.ru/document/0001202007100002), [Microsoft security baseline](https://learn.microsoft.com/en-us/intune/device-security/security-baselines/ref-windows-mdm-settings). |
| P1 | `windows/index.html:661,668` | AppLocker ошибочно ограничен Enterprise/Education; используется старое имя WDAC. | `AppLocker и App Control for Business (ранее WDAC)`; enforcement AppLocker поддерживается на всех редакциях Windows 10 2004+ и Windows 11 после KB5024351, отдельные возможности зависят от версии/управления. [Microsoft requirements](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/applocker/requirements-to-use-applocker). |
| P1 | `windows/index.html:751` | Windows Information Protection предлагается как актуальная технология. | WIP удалён начиная с Windows 11 24H2; использовать Microsoft Purview Information Protection / Endpoint DLP. [Removed features](https://learn.microsoft.com/en-us/windows/whats-new/removed-features). |
| P1 | `windows/index.html:989-995` | Device Encryption ошибочно требует Pro/Enterprise и Modern Standby; XTS-AES-128 объявлен недостаточным сам по себе. | Device Encryption доступно во всех редакциях на совместимых устройствах; с Windows 11 24H2 сняты требования DMA/HSTI/Modern Standby. Алгоритм, protector и escrow выбирать по модели угроз и профилю. [BitLocker overview](https://learn.microsoft.com/en-us/windows/security/operating-system-security/data-protection/bitlocker/). |
| P1 | `windows/index.html:753,1042,1064,1086,1148,1158-1159,1231` | Универсализированы требования к шифрованию, сертифицированному антивирусу/токенам/HSM и допустимость отключения Defender. | Привязать каждую меру к виду системы, классу/категории, модели угроз и конкретному НПА. Не отключать Defender только из-за наличия СЗИ от НСД; проверять совместимость и defense in depth. Криптографический профиль/СКЗИ отделить от компетенции ФСТЭК. |
| P1 | `lic-tzi/index.html:522,537-538,543,556` | Неверны канал через ЕПГУ, отдельный 30-дневный анализ, обязательная выездная проверка, «электронная лицензия» и РНП как основание отказа. | Описать предусмотренный ПП №79 канал, общий срок до 45 рабочих дней, документарную оценку по оценочному листу и запись/выписку из реестра; основания отказа — только по действующим нормам. [Изменения ПП №79](https://publication.pravo.gov.ru/Document/View/0001202111290059?index=7&rangeSize=1). |
| P1 | `lic-tzi/index.html:566-577,588,621,629` | Старое «переоформление», универсальные 10 дней/3 500 руб., проверка раз в три года, 90 дней приостановления и годичный запрет. | Использовать термин «внесение изменений в реестр лицензий»; срок, плата, контроль и последствия связывать со сценарием и действующими статьями 18/20 закона №99-ФЗ. [Официальная консолидированная выдача №99-ФЗ](https://ips.pravo.gov.ru/api/ips/legislation/document?baseid=None&hash=fcb8eb99a41f30d017fd7c02ef8ef5699f275d70964b686f7eb114a688e0860d). |
| P1 | `lic-tzi/index.html:641-645,688` | Сертифицированные СЗИ и аттестация объявлены универсальными для любого лицензиата/ГИС/ИСПДн/КИИ. | Разделить требования к лицензиату и форму оценки конкретной системы; приказ №77 не делает аттестацию универсальной для каждой ИСПДн и КИИ. [Приказ ФСТЭК России №77](https://publication.pravo.gov.ru/document/0001202108100027). |
| P1 | `pc-elbrus/index.html:471-495` | СКЗИ приписаны ФСТЭК, области приказов смешаны, заявлен универсальный запрет иностранных криптобиблиотек; №117 назван требованием ФСБ. | Дать матрицу областей №117/21/239/31; требования к СКЗИ вынести в отдельный контур ФСБ/отрасли. Иностранное происхождение библиотеки само по себе не образует универсального запрета для каждой ГИС. |
| P1 | `pc-elbrus/index.html:590` | Указан неподтверждённый «приказ ФСТЭК №79» о контроле ВТСС. | До появления полного названия, даты и области применения ссылку удалить; оставить проверяемое требование проекта защиты/модели угроз/программы оценки. [Официальный перечень актов ФСТЭК](https://publication.pravo.gov.ru/documents/block/foiv041). |

Lifecycle и редакторские поправки:

- `windows`, KOMRAD и Scaner-VS не должны выдавать обычную Windows 10 22H2 за актуальный базовый стенд: её поддержка завершилась 14.10.2025. В evergreen-материале указывать «поддерживаемый выпуск Windows 11» и фиксировать точную сборку в паспорте стенда; Windows 10 допустима как конкретная LTSC/ESU или изолированная legacy-VM. [Windows 10 lifecycle](https://learn.microsoft.com/en-us/windows/release-health/status-windows-10-22h2), [Windows 11 releases](https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information).
- `astralinux01` 1.8.3.7 — реальная закреплённая сборка, не ошибка. Нужен паспорт frozen-стенда и проверка актуальной ветки перед новым потоком. Не заменять команды обновления механически: набор инструментов зависит от ветки. [Таблица сборок Astra](https://wiki.astralinux.ru/pages/viewpage.action?pageId=326852054), [матрица инструментов обновления](https://wiki.astralinux.ru/pages/viewpage.action?pageId=71833307).
- `cert/index.html:476,482,487-488,524,530,536`: унифицировать термин `РБПО`; `kapo/index.html:240`: ППК назвать российским машиночитаемым перечнем, сопоставимым по назначению с SBOM, а не просто «отечественным аналогом»; `lic-tzi/index.html:964`: убрать хрупкое «актуально на 2025 г.» и оставить правило проверки официальных источников.
- Современное расширение Windows: LAPS, Credential Guard/VBS, LSA protection, ASR `audit → pilot → block`, App Control for Business и versioned security baseline.
- Расширение `pc-elbrus`: firmware resilience по [NIST SP 800-193](https://csrc.nist.gov/pubs/sp/800/193/final), TPM 2.0 и UEFI Secure Boot/Measured Boot как отдельные trust anchors.

## 5. Аудит практикумов

### 5.1. Сводная матрица

| Семейство | Вердикт | Главная следующая мера |
|---|---|---|
| `pentest` | `P0 HOLD` только DVWA | Juice Shop оставить; DVWA пересобрать по тому же изолированному шаблону. |
| `appsec-lections` | `P0 HOLD` только старые Day 1 downloads; Day 2 `P1 GUARDRAILS` | Один канонический tested handout; bounded fixtures для LR8/LR11. |
| `astra-hardening` | `NEEDS GUARDRAILS` | Сопоставить legacy/local password profile с NIST SP 800-63B-4; идемпотентный rollback Apache. |
| `astra-intro` | `P1 BLOCK HANDS-ON` для PZ3 | Запретить `[trusted=yes]`; signed ISO/installer; snapshot; standard user. |
| `scaner-vs` | `P1 BLOCK HANDS-ON` полного scanner pack | Collision-safe WSL cleanup; LiveUSB только instructor-led до появления disk guard/wipe procedure. |
| `komrad` | `P1 BLOCK HANDS-ON` вариантов 2/3 | Host-only/Internal, уникальные credentials, export-before-clear, snapshot restore. |
| `27-07-2026` | `NEEDS GUARDRAILS` | Digest-pinned CI image, hashed lock; checklist не объявлять заменой SAST. |
| `29-07-2026` | `P1 BLOCK HANDS-ON` | Исправить SQLite URI read-only bypass и добавить regression tests. |
| `threats-kii` | `NEEDS GUARDRAILS` | Frozen evidence bundle/BDU IDs; отделить нормативный выбор от экспертной гипотезы. |
| `27001` | `READY`, P3 | Student workpaper, timebox и rubric `criterion → evidence → finding`. |
| `p19` | `READY`, P3 | Versioned ASVS/WSTG IDs, timebox и rubric. |
| `ppk` | `P1 BLOCK HANDS-ON` | Убрать широкую DAC-bypass capability и непроверяемый pseudocode. |
| `new-courses/pentest-02` | `PROGRAM ONLY`, не hands-on runbook | Оставить как описание направлений; для каждого модуля подготовить RoE/runbook и owned sandbox. |
| непубличный `pc/` | `READY`, не публиковался | Сохранить как перспективную основу обновления `pc-elbrus`; не выдавать весь vault. |

### 5.2. Точные P1-ошибки практики

1. **SQLite read-only bypass.** `29-07-2026/code/step3_student_solution.py:140-144` формирует `file:{p.as_posix()}?mode=ro`. Путь с `#` обрезается как URI fragment, `mode=ro` теряется и SQLite создаёт другой файл. Исправление: `uri = p.as_uri() + "?mode=ro"`; тесты с `#` и `?`; INSERT обязан завершаться `attempt to write a readonly database`.

2. **KOMRAD выходит в LAN.** `komrad/docs/05-student-faq.md:19-22`, `02-virtualbox-komrad-stand.md:79-106`, `03-practice-variants.md:58-90`: bridged networking, общий admin password, очистка Security log без export и без полного cleanup. Использовать Host-only/Internal, случайный per-run secret, standard account, `wevtutil epl` до Event 1102 и snapshot restore.

3. **Astra Intro обходит доверие к репозиторию.** `astra-intro/materials.md:604-643,682,699-818,850-857`; критичная строка `:816 [trusted=yes]`. Без verified key/fingerprint выполнение должно останавливаться. Нужны signed installer/ISO SHA-256 и snapshot до update.

4. **Scanner WSL меняет host state без владения ресурсом.** `scaner-vs/materials/scanner/03-wsl-individual.md:33-44,55-76,100-140`: нет collision preflight, firewall rule широкое, cleanup по DisplayName. Нужен уникальный Name, refuse-on-collision по name/tuple, before-state, Private profile + RemoteAddress и точечное удаление только созданного правила.

5. **Scanner LiveUSB недостаточно защищает системный диск.** `scaner-vs/materials/scanner/05-live-usb.md:7-43`: instructor-led, serial/model/size/non-system checks, двойное подтверждение, signed image/checksum и verified wipe должны стать обязательными.

6. **PPK выдаёт широкую capability за минимальную.** `ppk/index.html:1099-1125`: `CAP_DAC_READ_SEARCH` обходит DAC. Предпочтительны unprivileged port/reverse proxy, file-specific group/ACL и service-scoped `CapabilityBoundingSet`/`AmbientCapabilities` с `NoNewPrivileges`. `verify-ppk` и `apt-install --from-ppk` в `:1136-1214` нужно либо реализовать, либо явно назвать псевдокодом.

7. **Pentest-02 не является runbook.** `new-courses/pentest-02.html:780-842,943-959` перечисляет credential dumping, persistence, kernel exploits, Wi-Fi MITM, DCSync, OT/cloud и полный pentest без общего RoE. Нужны scope allowlist/denylist, stop conditions, kill switch, no-internet exploitation, synthetic identities, snapshots, evidence redaction и отдельные owned RF/OT/cloud sandboxes.

### 5.3. Воспроизводимость

- `27-07`: эталон 19/19 PASS; starter ожидаемо RED — 8 failures и 3 errors.
- `29-07`: examples 6/6 PASS; starter ожидаемо ERROR 13/13; solution 13/13 PASS, но отдельно воспроизведён URI-bypass выше.
- Python AST: 20/20 файлов PASS.
- Pentest PowerShell `preflight/start/stop`: parser PASS.
- 66/66 shell-блоков: `bash -n` PASS.
- канонический AppSec SSRF fixture: `docker compose config --quiet` PASS; контейнеры не запускались. Это не относится к повреждённому Compose-фрагменту в конвертированном старом Day 1 Markdown, который parser не проходит.

Успешный parser/test не снимает архитектурные ограничения: mutable image, широкий bind, отсутствие resource limits или rollback остаются ошибками даже при валидном синтаксисе.

## 6. Педагогическая готовность

Этот статус — отдельная ось. Например, `29-07-2026` педагогически хорошо собрано, но найденная ошибка read-only URI делает текущую практику небезопасной для выдачи; AppSec педагогически богат, но старый Day 1 package блокируется разделом 3.

Итог по 30 targets:

- `READY`: 6;
- `NEEDS CONTENT`: 16;
- `REFERENCE ONLY`: 3;
- `DO NOT TEACH AS STANDALONE`: 5.

| Target | Учебный статус | Главное дополнение без удаления содержания |
|---|---|---|
| `pikov.expert` | `REFERENCE ONLY` | Три маршрута каталога: начинающий, администратор/ИБ, разработчик/DevSecOps — с prerequisites, результатом и длительностью. |
| `astra-intro` | `NEEDS CONTENT` | Паспорт курса, rubric двух практик и сценарий пяти блоков с offline fallback. |
| `astralinux01` | `NEEDS CONTENT` | 30-минутный кейс выбора редакции/уровня/канала обновлений, шаблон, ключ и rubric. |
| `astralinux02` | `NEEDS CONTENT` | Упражнение по модели доступа/информационных потоков, exit ticket и критерии корректности. |
| `astra-hardening` | `READY` | Одна матрица `outcome → lab → evidence` и базовая/углублённая траектории. |
| `windows` | `DO NOT TEACH AS STANDALONE` | Три read-only станции: DACL/SACL, encryption state, Defender policy; artifact + rubric + teacher route. |
| `pc-elbrus` | `DO NOT TEACH AS STANDALONE` | Сохранить обзор, а самостоятельный курс собрать из более зрелого `pc/`. |
| `komrad` | `NEEDS CONTENT` | Сценарий 90/180 минут, три гипотезы событий, checkpoints, резервные логи и rubric отчёта. |
| `scaner-vs` | `READY` | Единая 100-балльная evidence rubric и лист наблюдений преподавателя для всех вариантов. |
| `cert` | `NEEDS CONTENT` | Кейс выбора схемы/применимости сертификата, карта жизненного цикла, ключ и rubric. |
| `lic-tzi` | `NEEDS CONTENT` | Командный кейс «проверить лицензионное досье» со встроенными дефектами и модельным ответом. |
| `tzi-dept` | `DO NOT TEACH AS STANDALONE` | Кейс проектирования подразделения: RACI, интерфейсы, 90-дневный план и защита решения. |
| `risk` | `NEEDS CONTENT` | Один сквозной кейс: assets → risk register → treatment plan → incident playbook; шаблоны, ключ и rubric. |
| `threats-kii` | `NEEDS CONTENT` | Prerequisite-test и workbook `граница → нарушитель → сценарий → мера → уязвимость`. |
| `tz` | `READY` | Teacher route 5×90 и 100-балльная rubric фрагмента ТЗ. |
| `fstec-sdlc` | `NEEDS CONTENT` | Самооценка вымышленного разработчика: scope, evidence matrix, gaps, 90-day plan, ключ и rubric. |
| `gost56939` | `DO NOT TEACH AS STANDALONE` | Обёртка 45/90 минут: pretest, сортировка процессов, mapping артефактов и exit ticket. |
| `kapo` | `DO NOT TEACH AS STANDALONE` | Кейс допуска компонента: состав → лицензия → уязвимости → policy decision → update/notification. |
| `sast` | `NEEDS CONTENT` | Worksheet `дефект → CWE/root cause → fix → negative test → priority`, ключ и rubric. |
| `p19` | `NEEDS CONTENT` | Треки web/native/system, шаблон finding, модельные ответы и 90-минутный маршрут. |
| `ppk` | `NEEDS CONTENT` | Единый artifact: архитектура + trust boundaries + component inventory/SBOM + admission decision. |
| `27001` | `NEEDS CONTENT` | Одна учебная организация через scope/context → policy/RACI → risk/SoA → audit → management review. |
| `pentest` | `NEEDS CONTENT` | Сценарий пяти пар, checkpoints, unified finding rubric и fallback на готовых evidence. |
| `new-courses` | `REFERENCE ONLY` | Для каждого направления — один demonstration module: passport, lecture, lab, assessment, teacher notes. |
| `is` | `NEEDS CONTENT` | Mini-project с checkpoints: граница ИС, процесс, ER, 3НФ, транзакция, UI traceability. |
| `vkr` | `NEEDS CONTENT` | Workshop 90/180 минут: исправление темы, тезаурус, peer review и rubric; вузовские примеры оставить примерами. |
| `spdx` | `REFERENCE ONLY` | Отдельный модуль 45–60 минут: ID/exception, obligations, SBOM fragment и quiz. |
| `27-07-2026` | `READY` | Date-neutral alias и единый паспорт `outcome → task → evidence → criterion`; датированный вариант сохранить как provenance. |
| `29-07-2026` | `READY` | Pretest, общая 100-балльная rubric и date-neutral alias; историческое имя сохранить. |
| `appsec-lections` | `READY` | Нейтральная стартовая страница по ролям и outcome-map; provenance вынести в отдельный архивный раздел. |

### 6.1. Evergreen без потери происхождения

Содержательные даты стандартов, вступления норм в силу и версии продуктов нужны. Убирать следует только привязку универсальной лекции к конкретному дню занятия.

- `27-07-2026/index.html:738,1831`, `29-07-2026/index.html:8,115,920`: основной title/hero/footer сделать тематическими; существующие URL оставить как исторические aliases/redirects, чтобы не ломать ссылки.
- AppSec `index.html:37-42`, `day-01.html:66-71`, `day-02.html:25-30`, `practice.html:43`, `for-teachers.html:72`: нейтральный курс отделить от архивного provenance. Авторство учебных материалов остаётся за В. А. Пиковым; в `rights/archive` хранится только исторический контекст происхождения без институционального авторства и без его повторения в hero каждого маршрута.
- Формулировки `проверено DD.MM.YYYY` хранить в maintenance/provenance registry; на учебном экране показывать versioned source ID и official link.
- Тайминг `5×90`, относительные минуты и структура учебного дня остаются: это методика, а не календарная дата.

### 6.2. Универсальная архитектура курса

1. `index` — аудитория, prerequisites, длительность, measurable outcomes и итоговый artifact.
2. `slides` — проекционная версия: одна мысль на экран, минимум 28–32 px для основного текста и 44–56 px для заголовка.
3. `handout` — подробный longread, таблицы, команды и источники.
4. `practice` — исходное состояние, task, artifact, checkpoints, stop/rollback/cleanup.
5. `assessment` — pretest, formative checks, post-test и rubric.
6. `teacher` — поминутный маршрут, типовые ошибки и offline fallback.
7. `sources` — карта `claim → versioned primary source`.
8. `downloads` — только проверенный student package.
9. `archive` — происхождение и исторические расписания.

Для каждого результата обязательна строка:

`Outcome → активность → артефакт слушателя → критерий/rubric → источник`.

### 6.3. Маршрут пяти пар для пентеста

1. Роли, этика/RoE, границы и модель действий нарушителя.
2. Scope, методика и план тестирования.
3. Матрица `вопрос → инструмент → доказательство` и локальная демонстрация.
4. Одна проверяемая находка, отчёт, исправление и retest.
5. DoS/DDoS как tabletop по устойчивости, наблюдаемости и реагированию; post-test и transfer plan.

Проектор использует `slides`; нормативные выдержки, большие таблицы, команды и подробные объяснения остаются в `handout`.

## 7. Браузер, проектор и документы

### 7.1. Что технически работает

- 30/30 live URL открылись в каждом из трёх viewport — 90/90 успешных прогонов;
- 816 same-origin/document links проверены, failures = 0;
- HTTP errors = 0, request failures = 0, console errors = 0, page errors = 0;
- offline-core test для 30/30 страниц сохранил весь основной текст (`textRatio = 1.00`); внешние зависимости относятся преимущественно к метрике и web-fonts;
- полный keyboard pass при 1366×768 достиг 1 386 из 1 386 видимых focusable elements; подтверждённых отсутствующих focus indicators — 0.

Это сильный результат для технической доступности URL, ссылочной целостности и полного проверенного keyboard pass. Он не является общим заключением по accessibility: ниже подтверждены проблемы семантики, mobile reflow и чтения конкретных дек и документов.

### 7.2. Подтверждённые browser findings

1. **P1 — `cert.pikov.expert` обрезается во всех viewport.** Document width: `1944 > 1920`, `1390 > 1366`, `414 > 390`; `html/body` скрывают overflow. На mobile нижняя fixed navigation перекрывает содержимое. Нужны безопасный sizing контейнера, reflow и reserve space под controls.

2. **P2 — `29-07-2026` mobile table.** `401 > 390`; таблица находится в предназначенном для горизонтальной прокрутки `.table-wrap`, но document root всё равно выходит за viewport на 11 px. Сохранить внутренний scroll, добавить видимый affordance/gradient и устранить расширение root.

3. **P2 — fixed-canvas decks на mobile.** `vkr`, `astralinux01` и `astralinux02` уменьшают весь слайд до миниатюры; текст порядка 4–10 px практически не читается. Для них нужен отдельный mobile/handout режим, а не масштабирование desktop canvas.

4. **P2 — семантика.** В 16/30 landing pages нет `<main>`; у `27001/index.html:429` финальный DOM не имеет `html@lang`; у SPDX два `h1`; в `astra-intro` 3 из 15 таблиц не имеют header cells.

5. **P2 — подтверждённый контраст видимого текста.** Минимальные найденные отношения: `gost56939` 2,44:1; `p19` 3,19:1; `scaner-vs` 4,02:1; `komrad` 4,34:1; `is` 4,03:1; `vkr` 4,00:1. Нужно довести обычный текст до 4,5:1, крупный — до 3:1 по [WCAG 2.2, SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), не полагаясь только на цвет.

6. **P2/P3 — размер.** При 1366×768 только три страницы имеют видимый элемент меньше 12 effective px; на mobile — 12 страниц. Критичнее всего видимые подзаголовки `astralinux01/02` около 8,1 px. Исправлять по назначению: проектор — основной текст 28–32 px; handout — не уменьшать основной текст ради размещения таблицы, а разрешать reflow/scroll/split.

Автоматические contrast-эвристики на скрытых слайдах не включены в подтверждённые findings: `display:none`/неактивные canvas могли давать ложные `1:1`.

### 7.3. Полный документный контур

Проверено:

- 19 PDF-копий = 10 уникальных PDF, 82 уникальные страницы;
- 18 DOCX-копий = 9 уникальных DOCX;
- все 82 PDF-страницы отрендерены и просмотрены;
- все 9 DOCX экспортированы read-only через Word COM в 64 страницы и полностью отрендерены;
- PPTX/XLSX в публичных вложенных пакетах нет.

#### P1 — старый AppSec lab document опубликован с markup и персональными данными

Уникальный PDF SHA prefix `40651600B255`, DOCX `079F307ED089`:

- страница 20 показывает три неразрешённых reviewer comments;
- comments XML раскрывает полные имена авторов и timestamps;
- пять DOCX содержат именованные Author/Last Modified By, в комментариях — два именованных reviewer;
- страницы 4–28 резервируют около 30% ширины под markup;
- 92,9% glyphs меньше 9 pt, 97,4% — меньше 10 pt;
- median размера кода на страницах 20–28 — 7,22–8,71 pt;
- страница 3 пустая.

Это одновременно privacy, readability и publication-quality blocker. Перед выпуском необходимо принять tracked changes/comments, очистить core/comments/custom metadata, выполнить повторный PDF export и all-page visual QA.

#### P1/P2 — deck PDF недоступен для screen reader и не доказывает сильные claims

`27-07-2026/materials/From_Working_Code_to_Shippable_Product.pdf`, SHA prefix `39241A1DAB8F`, 14 страниц:

- страницы 4 и 7 визуально содержательны, но извлекаемый текст отсутствует;
- 20 `/Figure`, но 0 `/Alt`;
- нет `/Lang`, Title, bookmarks и Sources/References;
- количественные claims на страницах 2, 4, 7–8 и 14 не имеют первичных ссылок;
- тезис о memory-safe languages требует оговорки про `unsafe`, FFI, runtime и логические уязвимости;
- на страницах 3 и 9 часть текста около 8,5–10 pt, что плохо для проектора.

Исправление: tagged PDF, alt text, metadata, outline, source footnotes и отдельный projector deck. Проверяемые C/C++ выводы лучше привязать к [CISA The Case for Memory Safe Roadmaps](https://www.cisa.gov/resources-tools/resources/case-memory-safe-roadmaps), MSRC/Google первичным отчётам и конкретной выборке, а не к универсальному проценту.

#### P2 — остальные document findings

- PDF программы (`2826C15B97CC`) не имеет `/Lang`, две figures не имеют Alt;
- 8/10 PDF не имеют bookmarks, большинство — Title metadata;
- constructor PDF page 5 содержит только пункты 3–5 и большую пустую область;
- filled-map PDF имеет 7 страниц против 6 у DOCX и orphan continuation page 4;
- LR1–3/LR5–6 DOCX не используют Heading styles;
- в таблицах нескольких DOCX нет повторяемых/семантических header rows.

### 7.4. Evidence artifacts

Диагностические файлы не входят в release и остаются под ignored `output/`. Это воспроизводимые, но недолговечные рабочие артефакты: перед удалением `output/` их следует регенерировать либо перенести выбранные доказательства в согласованный audit archive.

- `output/playwright/deep-content-audit-2026-08-15/deep-live-audit.json`;
- `output/playwright/deep-content-audit-2026-08-15/full-keyboard-audit.json`;
- `output/playwright/deep-content-audit-2026-08-15/visible-text-audit.json`;
- `output/playwright/deep-content-audit-2026-08-15/contact-desktop-1920x1080.png`;
- `output/playwright/deep-content-audit-2026-08-15/contact-laptop-1366x768.png`;
- `output/playwright/deep-content-audit-2026-08-15/contact-mobile-390x844.png`;
- `output/playwright/deep-content-audit-2026-08-15/nested-documents/contact-all-82-pages.png`;
- `output/playwright/deep-content-audit-2026-08-15/docx-render/contact-all-64-pages.png`.

## 8. Международный каркас, который стоит сделать основным

Российские нормы и регуляторные профили следует сохранить там, где они нужны, но подавать отдельным слоем `local compliance profile`. Общий каркас курса целесообразно строить так:

### 8.1. Управление и риск

- [NIST CSF 2.0](https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20): GOVERN, IDENTIFY, PROTECT, DETECT, RESPOND, RECOVER;
- NIST SP 800-30 Rev.1 — оценка риска;
- NIST SP 800-61 Rev.3 — incident response как часть CSF 2.0;
- ISO/IEC 27001:2022 и ISO/IEC 27002:2022;
- ISO/IEC 27034-1 для application security.

### 8.2. SSDLC и проверяемые требования

- NIST SSDF SP 800-218 v1.1;
- OWASP SAMM v2;
- OWASP ASVS 5.0.0 с versioned requirement IDs;
- OWASP WSTG v4.2 stable с versioned scenario IDs;
- OWASP Top 10:2025 и API Security Top 10:2023;
- CISA Secure by Design;
- связь `learning outcome → requirement → implementation → test → evidence → rubric`.

### 8.3. Vulnerability intelligence

- MITRE ATT&CK v19.2;
- конкретные CWE root causes, а не broad class по умолчанию;
- CVE Program отдельно от NVD enrichment;
- CVSS v4.0 отдельно от exploit likelihood и business risk;
- EPSS + CISA KEV + asset criticality как разные сигналы приоритизации.

### 8.4. Supply chain, SCA, SBOM и лицензии

- NIST SSDF 1.1;
- [SLSA v1.2](https://slsa.dev/spec/v1.2/) Source/Build Tracks и provenance/attestations;
- [OpenSSF OSPS Baseline](https://baseline.openssf.org/) и Scorecard как сигналы project practices, но не доказательство целостности артефакта;
- [CISA SBOM Minimum Elements 2025](https://www.cisa.gov/sites/default/files/2025-08/2025_CISA_SBOM_Minimum_Elements.pdf): direct/transitive, Known Unknowns, SBOM на каждый build/release, correction process и delivery;
- SPDX License List 3.28.0 и стабильная SPDX Specification 3.0.x;
- CycloneDX 1.7;
- lockfile, immutable digest, signature/attestation и vulnerability/license policy gate.

### 8.5. C/C++

- CERT C/C++ и конкретные CWE;
- ownership/lifetime/bounds/integer arithmetic/unsafe API;
- warnings policy, `-fstack-protector-strong`, `-D_FORTIFY_SOURCE=2/3` по toolchain, PIE/RELRO/NX, CFI где поддерживается;
- ASan/UBSan, fuzzing с coverage и deterministic corpus;
- hardening как defense in depth, но не замена исправлению root cause;
- memory-safe components там, где это технически возможно, с явной границей `unsafe`/FFI/runtime.

### 8.6. AI/agentic applications

- OWASP Top 10 for LLM Applications 2025;
- OWASP Top 10 for Agentic Applications 2026;
- OWASP AISVS 1.0;
- [NIST AI RMF 1.0](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10) и [NIST AI 600-1 GenAI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence);
- tool-specific identity, least privilege, schema validation, egress policy, human confirmation, complete trace и independent result verification.

## 9. Что уже сделано хорошо

1. Pentest Juice Shop wrapper — лучший технический эталон: loopback, isolated network, capability drop, no-new-privileges, limits, readiness, ownership-aware cleanup.
2. Astra hardening labs системно используют before-state, backup, syntax validation, functional/negative checks, evidence и rollback.
3. AppSec Day 2 задаёт правильную общую модель: local-only, synthetic data, minimal evidence, root cause, fix, regression и cleanup.
4. `27-07`/`29-07` используют RED→GREEN и автоматические критерии; в `29-07` найденный URI edge case показывает, зачем нужны adversarial regression tests.
5. P19 аккуратно ограничивает доказательства и требует редактировать секреты.
6. SPDX-справочник соответствует License List Data 3.28.0 и корректно отделяет производный ресурс от официального списка.
7. В Pentest корректно разделены CVSS, EPSS и KEV; EPSS v5 указан верно.
8. Непубличный `pc/` — наиболее зрелый архитектурный практикум: threat model, measurable RTO/RPO, evidence, migration, go/no-go и rubric. Он значительно богаче опубликованного `pc-elbrus`, но весь vault передавать слушателям нельзя.

## 10. План исправлений без потери содержания

### Этап 0 — публикационная безопасность

Не удалять лекционные тексты. Временно убрать только небезопасные student downloads из раздела 3 и связанные прямые пути. На страницах оставить понятное сообщение «практикум проходит техническую актуализацию».

### Этап 1 — точечная фактология

Исправить ATT&CK, NIST SP 800-30/SP 800-61, CycloneDX, password guidance, CWE/CVE/NVD, OWASP A10:2025 и неподтверждённые проценты. До следующего использования соответствующих лекций исправить также все P1 из §4.6: №17/117, №31, ГОСТ Р 50922, Windows feature/lifecycle claims, лицензирование ТЗИ и области регуляторных требований. Это точечные правки текста с высоким эффектом и без удаления содержания.

### Этап 2 — единый безопасный шаблон практикума

Для каждого задания обязательны:

1. scope/RoE и target allowlist;
2. preflight и refusal on collision;
3. loopback/host-only/no-egress по сценарию;
4. immutable images/dependencies;
5. least privilege и resource limits;
6. deterministic success и negative criteria;
7. minimal/redacted evidence;
8. stop condition и rollback;
9. ownership-aware cleanup;
10. rubric и traceability к ASVS/WSTG/SSDF/CWE.

### Этап 3 — педагогическая унификация

На каждой странице сохранить всё полезное содержание, но добавить единый верхний блок:

- для кого материал и prerequisites;
- 3–5 измеримых learning outcomes;
- относительный timebox модулей без календарной даты;
- основной маршрут и optional depth;
- практический artifact/evidence;
- проверка/самопроверка и rubric;
- versioned primary sources.

### Этап 4 — документы, проектор и accessibility

Исправлять по уже сформированному browser/PDF/DOCX scorecard: контраст, mobile reflow, размер текста, перекрытия fixed navigation, semantic landmarks, alt text/tagging, PDF metadata/bookmarks и citations.

### Этап 5 — controlled release

После согласования каждого набора:

1. targeted RED tests;
2. content/source fixes и повторные tests;
3. rebuild nested documents/archives;
4. release integrity and independence gates;
5. 1920×1080, 1366×768 и 390×844 browser QA;
6. scoped commit и push точного SHA;
7. green CI acceptance для этого SHA;
8. scoped deploy именно принятого SHA;
9. live hash/link/header/browser checks и подтверждение совпадения local/repository/live.

## 11. Ограничения заключения

- Это инженерно-методический аудит, а не юридическое заключение и не сертификация.
- `OK` означает отсутствие подтверждённой ошибки в проверенном срезе, а не абсолютную полноту.
- Product versions, vendor support, реестровые записи и НПА требуют повторной проверки перед конкретным применением.
- Статические и parser checks не заменяют controlled execution в disposable lab.
- Никакие существующие учебные страницы, архивы или live-сайты в ходе аудита не изменялись.

## 12. Следующее решение владельца

Рекомендуемый порядок согласования:

1. Разрешить только публикационную паузу для перечисленных P0 downloads, без удаления исходников.
2. Утвердить международную baseline matrix и правила evergreen versioning.
3. Исправить все P1 из §4.6 до следующего использования соответствующих лекций; российский compliance оставить отдельным слоем, не основой общей методики.
4. Согласовать по одному pilot-исправлению: AppSec Day 1, DVWA и `29-07`.
5. После pilot проверить новый единый шаблон и только затем масштабировать на остальные практикумы.
6. Отдельно решить, превращать ли непубличный `pc/` в новый самостоятельный public course вместо прямой доработки старого `pc-elbrus`.
