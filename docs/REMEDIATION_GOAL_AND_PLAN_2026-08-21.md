# Goal и план устранения замечаний аудита pikov.expert

Дата фиксации: 2026-08-21

Статус: `READY`

Исходный verdict: `NEEDS_CHANGES`

Рабочая папка: `V:\pikov.expert`

Исходный commit: `fe7ca09545497cb9d35e9133ea7a4ed13b3c60b3`

Исходная ветка: `main`, синхронизирована с `origin/main`

Разрешённый непубличный объект, который нельзя добавлять в Git: `pc/`

## 1. Goal prompt

```text
GOAL

Полностью устранить подтверждённые дефекты аудита сети pikov.expert и довести
проект от NEEDS_CHANGES до READY без потери содержательной части учебных
материалов, без присвоения авторства организациям и без возврата прежней
организационной аффилиации.

CONTEXT

- Английский язык остаётся языком по умолчанию для pikov.expert.
- Русская версия должна иметь устойчивый URL, собственные lang, canonical,
  hreflang, OpenGraph и машинно-читаемые метаданные.
- Организация может упоминаться только как исторический или учебный пример.
  Такое упоминание не должно создавать впечатление её авторства или владения
  лекцией.
- Последнее место службы автора описывается нейтрально как
  научно-исследовательский институт государственного сектора.
- Упоминания Министерства обороны допустимы только как предмет лекции,
  нормативный контекст или регуляторная область, но не как личная аффилиация.
- Международный baseline (NIST, OWASP, CWE, MITRE, ISO/IEC, CERT, MISRA,
  SPDX/CycloneDX) является основным; российские требования остаются отдельным
  local-compliance profile.

MANDATORY WORK

1. Исправить навигацию всех 104 слайдов tz.pikov.expert.
2. Сделать генератор TZ воспроизводимым и неразрушающим обязательные metadata.
3. Согласовать URL, состояние языка, lang, canonical, hreflang, OpenGraph,
   ARIA и JSON-LD двуязычной главной страницы.
4. Добавить корректный lang и canonical на SPDX-страницы и остальные
   подтверждённые страницы с пробелами metadata.
5. Исправить недоступную внешнюю ссылку PTES без подмены смысла источника.
6. Усилить автоматическую защиту от возврата прежних брендированных
   изображений и организационной аффилиации.
7. Включить новые regression-тесты и git diff --check в обязательный CI.
8. Связать release index, сборку, deploy gate и отчёт с exact accepted commit.
9. Актуализировать runbook и course-design baseline для bilingual-страниц.
10. Устранить подтверждённые whitespace-ошибки.

NON-NEGOTIABLE CONSTRAINTS

- Сначала RED-тест, затем минимальное исправление, затем GREEN.
- Не удалять и не сокращать содержательную часть лекций ради технической правки.
- Не выполнять широкое форматирование или массовую редактуру вне scope.
- Не использовать git add -A и не включать pc/ в commit/release/deploy.
- Не смешивать исправления с посторонними изменениями рабочего дерева.
- Не публиковать до полного локального gate и зелёного CI точного SHA.
- Deploy выполнять только для реально изменённых доменов.
- После deploy доказать соответствие source -> archive -> live.
- Каждый этап фиксировать в журнале выполнения этого документа.

DONE WHEN

- focused RED->GREEN tests покрывают каждую подтверждённую находку;
- 104/104 слайда доступны через TOC, keyboard, Next/Last и direct hash;
- генератор TZ сохраняет canonical, OpenGraph, JSON-LD и аналитический блок;
- URL и metadata каждого языкового варианта согласованы до выполнения JS;
- публичные страницы имеют корректный document language;
- regression gates исключают текстовую и известную бинарную аффилиацию;
- release artifact содержит source commit и deploy проверяет его;
- полный локальный gate, release build и browser QA зелёные;
- GitHub Actions exact SHA имеет conclusion=success;
- scoped live QA, hashes, links, headers, console и mobile зелёные;
- main == origin/main, рабочее дерево чисто кроме pc/;
- итоговый verdict после независимой повторной проверки: READY.
```

## 2. Разрешение и границы изменений

Владелец проекта отдельным сообщением 2026-08-21 явно разрешил в рамках этого
Goal:

- изменять файлы проекта, необходимые для устранения перечисленных находок;
- выполнять `pull`, создавать scoped commits и выполнять `push`;
- запускать GitHub Actions и проверять exact-SHA run;
- собирать release artifacts;
- выполнять адресный deploy изменённых доменов;
- проводить live-проверку после публикации.

Разрешение не распространяется на:

- удаление учебного содержания, исходных материалов или карантина;
- публикацию `pc/` и иных непубличных данных;
- изменение доменов и материалов, не связанных с подтверждёнными находками;
- переписывание истории Git, force-push или широкое удаление файлов;
- публикацию до прохождения контрольных точек этого плана.

## 3. Зафиксированное исходное состояние

| Область | Исходное доказательство |
|---|---|
| Git | `HEAD == origin/main == fe7ca09545497cb9d35e9133ea7a4ed13b3c60b3` |
| Рабочее дерево | чисто, кроме разрешённого `?? pc/` |
| GitHub Actions | run `31966680739`, `success`, exact исходный SHA |
| Локальные tests | 116/117; единственный fail требует запущенный локальный Juice Shop |
| Root QA | bilingual/runtime/mobile checks пройдены |
| Release | 30 архивов; public-independence gate пройден |
| Source/archive/live | 30/30 корневых `index.html` совпали побайтно |
| Live | 30/30 посадочных страниц HTTPS 200; mobile и console без дефектов |
| Sitemap | 903 записи, 872 уникальных маршрута, подтверждённых HTTP-ошибок нет |
| Внутренние ссылки | 955 проверено, подтверждённых битых нет |
| Аффилиация | текущий публичный текст и известные исправленные изображения чисты |

## 4. Реестр работ

| ID | Приоритет | Находка | Целевой результат |
|---|---:|---|---|
| R-01 | P1 | TZ содержит 104 слайда, но `TOTAL = 100` | количество определяется из фактического набора слайдов; 101–104 доступны всеми маршрутами |
| R-02 | P1 | генератор TZ удаляет обязательные metadata | генератор воспроизводит канонический документ и fail-closed проверяет инварианты |
| R-03 | P2 | `?lang=ru`, переключатель и canonical расходятся | язык, URL, storage и metadata описывают один вариант до и после reload |
| R-04 | P2 | русские ARIA/JSON-LD на английской странице | невидимые интерфейсы и structured data локализованы вместе с документом |
| R-05 | P2 | 812 SPDX-страниц без `lang` | каждая страница объявляет фактический язык документа |
| R-06 | P3 | неполное canonical-покрытие | self-canonical добавлен на подтверждённые страницы без дублирования URL |
| R-07 | P3 | ссылка PTES недоступна | выбран доступный authoritative project source или проверенный archive/fallback с сохранением назначения ссылки |
| R-08 | P2 | старые брендированные JPG могут пройти gates | известные прежние SHA-256 блокируются в source и nested release artifacts |
| R-09 | P1 | bilingual/affiliation tests не входят в CI | обязательный workflow запускает оба теста и контролирует порядок gate |
| R-10 | P2 | release не содержит source commit | index, notes и deploy evidence содержат и проверяют exact source SHA |
| R-11 | P2 | runbook/standard жёстко требуют `lang=ru` | норматив сформулирован для active locale и bilingual root |
| R-12 | P3 | 15 trailing-whitespace warnings | `git diff --check` зелёный локально и в CI |

## 5. Этапы реализации

### Этап 0. Защита baseline и RED-набор

1. Повторно выполнить `git status -sb`, `git rev-parse HEAD` и
   `git rev-parse origin/main`.
2. Не выполнять `pull`, если рабочее дерево изменилось вне этого Goal; сначала
   классифицировать каждый файл.
3. Добавить focused regression tests, которые на исходном состоянии
   воспроизводят R-01, R-02, R-03, R-04, R-05, R-08, R-09 и R-10.
4. Для R-06 и R-07 сохранить точный список URL и HTTP/browser evidence.
5. Записать RED-команды и их ожидаемые причины отказа в журнал выполнения.

Контрольная точка: тесты падают только по ожидаемым подтверждённым дефектам.

### Этап 1. TZ: навигация и безопасный generator

Целевые файлы:

- `tz/index.html`;
- `tz/tools/build-tz-landing.mjs`;
- `tz/README.md`;
- новый или расширенный тест TZ в `_PROJECT/`.

Работы:

1. Убрать независимую константу `TOTAL = 100`; получать количество слайдов из
   DOM/модели генератора и проверять непрерывность ID `slide-1..slide-N`.
2. Добавить тесты direct hash для `slide-101..slide-104`, Last, Next, TOC,
   counter и reload.
3. Перенести обязательные metadata в источник генерации либо сделать
   сохранение/валидацию существующих блоков детерминированным.
4. Генерировать во временный файл, сравнивать, запускать инварианты и только
   после GREEN заменять канонический `tz/index.html`.
5. Исправить README так, чтобы документированный процесс совпадал с безопасным
   поведением инструмента.
6. Удалить только trailing whitespace, не выполнять несвязанное форматирование.

Приёмка:

- 104/104 слайда доступны мышью, клавиатурой, TOC и direct hash;
- генератор повторяем: два последовательных запуска дают одинаковый hash;
- `canonical`, `og:image`, JSON-LD и аналитический блок сохраняются;
- `git diff --check` зелёный.

Откат: scoped revert файлов этапа; до deploy хранить исходный live hash и
предыдущий release archive.

### Этап 2. Двуязычная главная страница

Целевые файлы:

- `index.html` и, если выбран отдельный статический русский URL, его источник;
- `.htaccess`, `robots.txt`, `sitemap.xml` только если этого требует выбранная
  URL-модель;
- `_PROJECT/test-root-bilingual.mjs`;
- `_PROJECT/qa-root-index.mjs` и online browser QA при необходимости.

Архитектурный инвариант:

- английский вариант: устойчивый self-canonical URL, `lang=en`, английские
  title/description/OG/JSON-LD/ARIA;
- русский вариант: устойчивый self-canonical URL, `lang=ru`, русские
  title/description/OG/JSON-LD/ARIA;
- `hreflang=en`, `hreflang=ru` и `x-default` указывают на реальные варианты;
- переключение языка меняет URL, состояние и metadata согласованно;
- reload, copied URL и direct navigation сохраняют выбранный язык;
- legacy `?lang=ru` поддерживается предсказуемо и не создаёт ещё один canonical.

Предпочтительная реализация: отдельный статический URL русской версии, потому
что query-only JavaScript не может изменить исходный HTTP-документ для crawler.
Окончательная схема должна быть зафиксирована тестом до массового изменения.

Приёмка:

- HTTP source и итоговый DOM согласованы для обоих языков;
- нет русских ARIA labels в English document и наоборот;
- JSON-LD Person/WebSite/ItemList локализован;
- keyboard, 320/390/768/1440 px, no-JS fallback и console зелёные;
- видимое содержание, профиль, образование и подтверждённые сертификаты не
  сокращены.

### Этап 3. Document language, canonical и внешние ссылки

Целевые области:

- локальный публичный snapshot `spdx` и детерминированный postprocessor/coverage
  test в текущем репозитории;
- `pentest/handout.html` и ссылка PTES в `pentest/index.html`;
- `27-07-2026/materials/from-working-code-to-shippable-product.html`;
- runtime canonical страницы `27001`, если повторный тест подтвердит дефект;
- общие metadata/coverage tests.

Граница источника SPDX:

- `spdx/SOURCE.md` называет каноническим внешний репозиторий
  `V:\license-list-data-3.28.0` и синхронизацию его `website` в текущий snapshot;
- локальная копия `spdx/source/license-list-data-3.28.0` не содержит `website` и
  не может самостоятельно регенерировать 812 производных страниц;
- внешний canonical repo имеет отдельное пользовательское изменение
  `AGENTS.md`, поэтому в рамках этого Goal его не редактировать и не коммитить;
- безопасное решение текущего scope: versioned детерминированный postprocessor
  в `V:\pikov.expert`, запускаемый после каждой синхронизации, плюс CI coverage
  test. Отдельное исправление upstream generator выполняется только отдельным
  scope после сохранения чужого diff.

Работы:

1. Не редактировать 812 страниц вручную: применить детерминированный
   postprocessor к публичному snapshot и зафиксировать его в release workflow.
2. Вычислять `lang` из реального языка страницы; не маркировать смешанный текст
   неверным языком.
3. Добавить self-canonical из публичного маршрута и тест уникальности.
4. Не включать release/browser snapshots в ручную редактуру исходников.
5. PTES является community model, поэтому заменить URL на доступный
   authoritative project source либо проверенный archive/fallback; сохранить в
   тексте название методики, происхождение и дату проверки ссылки.
6. Проверить sitemap, robots и внутренние ссылки после регенерации.

Приёмка:

- coverage test подтверждает `lang` и canonical для каждого публичного HTML;
- 0 новых дубликатов canonical;
- 0 внутренних 4xx/5xx;
- внешние URL классифицированы как OK, anti-bot/TLS inconclusive или confirmed
  broken, без ложного обещания 100% доступности.

### Этап 4. Аффилиация и regression gates

Целевые файлы:

- `_PROJECT/test-public-affiliation-hygiene.mjs`;
- `_PROJECT/test-public-release-independence.ps1`;
- при необходимости отдельный manifest запрещённых binary hashes;
- `.github/workflows/site-checks.yml`;
- `_PROJECT/test-release-workflow-order.mjs`.

Работы:

1. Добавить шесть известных прежних SHA-256 для `slide-02/50/61.jpg` и
   `thumb-02/50/61.jpg` либо эквивалентный versioned denylist.
2. Проверять hashes во всех tracked public binaries, ZIP и вложенных Office/ZIP.
3. Оставить literal `MASCOM` в тестовом denylist допустимым, но исключить его из
   публикуемого HTML/metadata/archives как личную аффилиацию.
4. Не запрещать корректное учебное упоминание организации как примера; тест
   должен отличать пример от авторства, контакта и владельца курса.
5. Включить bilingual и affiliation tests в обязательный CI.
6. Добавить `git diff --check` в CI и проверку наличия всех обязательных gates.
   Gate должен быть range-aware: для pull request проверяется диапазон
   `base SHA...head SHA`, для push — `before SHA...current SHA` с безопасным
   fallback для нулевого/недоступного before SHA. Checkout обязан иметь
   достаточную историю; `git diff --check` без диапазона в чистом CI checkout не
   считается проверкой.

Приёмка:

- возвращение любого известного прежнего JPG даёт RED;
- текущие исправленные изображения дают GREEN;
- source и nested archive scanning проходят;
- GitHub Actions действительно исполняет focused tests, а не только содержит
  их в репозитории.

### Этап 5. Release provenance и нормативные документы проекта

Целевые файлы:

- `_PROJECT/build-release.ps1`;
- `_PROJECT/deploy-hosting.ps1`;
- release-index schema/tests;
- `_PROJECT/OPERATIONS_RUNBOOK.md`;
- `_PROJECT/COURSE_DESIGN_STANDARD.md`;
- `README.md` при изменении операторского процесса.

Работы:

1. Разделить два класса сборки:
   - candidate из изменённого, ещё не принятого дерева: `dirty=true`, source tree
     digest, строго `deployable=false`;
   - accepted release из чистого принятого `main`: `dirty=false`,
     `sourceCommit=accepted main SHA`, `deployable=true`.
2. Добавить в воспроизводимый accepted release index как минимум
   `sourceCommit`, `sourceRef`, `releaseDate` и policy decision.
   Фактический UTC timestamp хранить в deploy evidence, а не в детерминированном
   manifest/index.
3. Fail closed, если commit не существует, не совпадает с ожидаемым accepted SHA
   или релиз собран из запрещённо грязного дерева.
4. Передать `-ExpectedSourceCommit` в deploy preparation и проверить его до обращения к
   хостингу.
5. Записать exact SHA и per-target hashes в уникальный deploy evidence вида
   `HOSTING_DEPLOY_<date>_<stamp>_<shortsha>.md`; не позволять частичному deploy
   молча перезаписать историю полного.
6. Сохранить обратную совместимость индекса только там, где она безопасна;
   отсутствие provenance в новом релизе должно быть ошибкой.
7. В runbook и course standard заменить фиксированное `lang=ru` на корректный
   язык активной версии и отдельное правило bilingual root.
8. Зафиксировать NIST SSDF PS.3/PW.8, WCAG 2.2 SC 3.1.1/3.1.2 и controlled
   release как нормативные основания технических gates.

Приёмка:

- новый release index содержит exact текущий commit;
- candidate release из dirty tree явно non-deployable;
- tampered/wrong expected SHA воспроизводимо отклоняется до deploy;
- accepted SHA проходит PrepareOnly;
- документация и реальный workflow не противоречат друг другу.

### Этап 6. Полный локальный gate

Минимальная цепочка:

```powershell
$releaseDate = (Get-Date).ToString('yyyy-MM-dd')
$releaseIndex = Join-Path $PWD "_PROJECT\RELEASE_INDEX_$releaseDate.json"
git diff --check
node --test .\_PROJECT\test-*.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\smoke-check.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\build-release.ps1 -ReleaseDate $releaseDate -FailOnIssues
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\test-public-release-independence.ps1 -ReleaseIndex $releaseIndex
$env:RELEASE_DATE = $releaseDate
node .\_PROJECT\browser-qa.mjs
```

Дополнительно:

- focused tests каждого этапа;
- browser QA: 1440×900, 768×1024, 390×844, 320×568;
- direct hash TZ 101–104;
- English/Russian direct URL, switch, reload и no-JS source;
- полный metadata coverage публичного HTML;
- link check и security-header check;
- secret/privacy scan;
- archive/source hash reconciliation.

Juice Shop test не считается дефектом проекта, если его единственная причина —
отсутствие явно требуемого локального сервиса. Для итогового gate сервис должен
быть поднят в owned local sandbox либо тест должен быть формально отмечен как
environment-dependent с отдельным подтверждением.

### Этап 7. Git, CI и адресный deploy

1. Повторно синхронизировать remote refs и убедиться, что target branch не
   изменилась неожиданно.
2. Просмотреть `git diff --stat`, `git diff --check` и полный diff.
3. Добавить в commit только перечисленные файлы; `pc/` проверить отдельно.
4. После явного staging выполнить `git diff --cached --check`,
   `git diff --cached --stat` и просмотреть staged diff.
5. Создать scoped feature branch и commit с указанием remediation Goal.
6. Выполнить push feature branch, открыть PR и дождаться обязательных checks
   exact feature head SHA.
7. Просмотреть PR diff, выполнить merge без обхода checks и получить merge SHA.
8. Переключиться на `main`, выполнить `pull --ff-only` и доказать
   `HEAD == origin/main == accepted merge SHA`.
9. Дождаться отдельного `success` workflow на exact accepted main SHA. Зелёный
   feature SHA не разрешает production deploy.
10. На чистом accepted `main` пересобрать release с
   `sourceCommit=accepted main SHA`, `deployable=true` и проверить PrepareOnly с
   `-ExpectedSourceCommit`.
11. Выполнить deploy только изменённых целей, ожидаемо:
   `pikov.expert`, `tz.pikov.expert`, `spdx.pikov.expert`,
   `pentest.pikov.expert`, а также другие домены только если их исходники реально
   изменены по R-06.
12. Не использовать full deploy, если scoped deploy достаточен.
13. Для remediation deploy передать `-KeepRemoteDeployRoot` и сохранить remote
    backups до независимого verdict `READY`.

### Этап 8. Live QA и закрытие Goal

После deploy проверить:

- HTTP 200, TLS и HTTP->HTTPS;
- CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy и
  Permissions-Policy;
- source/archive/live hashes по каждой изменённой цели;
- TZ 1, 100, 101, 102, 103 и 104 через direct hash/keyboard/TOC;
- оба языка root через direct URL, switch, reload и copied URL;
- SPDX sample + полный HTTP/source coverage;
- canonical/hreflang/OG/JSON-LD;
- mobile/desktop, console, images и links;
- отсутствие прежней организационной аффилиации;
- GitHub exact-SHA success;
- `main == origin/main`, дерево чисто кроме `pc/`.

Rollback должен быть исполнимым, а не декларативным:

1. источником возврата является previous accepted SHA в отдельном чистом
   worktree и его проверенный release index/archive;
2. rollback ограничивается тем же списком изменённых доменов;
3. после возврата проверяются previous source/archive/live hashes и smoke/live
   gates;
4. retained remote deploy root удаляется только после независимого `READY` и
   отдельной проверки, что rollback artifacts больше не нужны.

После этого провести независимый повторный review. Goal закрывается только при
verdict `READY`; иначе новые findings добавляются в реестр, а статус остаётся
`ACTIVE`.

## 6. Матрица доказательств

Для каждого этапа сохраняются:

| Поле | Требование |
|---|---|
| Baseline | commit до изменения и статус дерева |
| RED | команда, exit code и причина ожидаемого отказа |
| Change | точные файлы и краткое обоснование |
| GREEN | команда, exit code и ключевой вывод |
| Diff | `git diff --check`, stat и review scope |
| Commit | локальный и remote SHA |
| CI | workflow URL, head SHA, conclusion |
| Release | release index, archive hashes, source commit |
| Deploy | список доменов, timestamp и accepted SHA |
| Live | URL, HTTP/browser result и hash |
| Rollback | предыдущий release/hash и команда/процедура возврата |

## 7. Журнал выполнения

| Дата/время | Этап | Статус | SHA/артефакт | Доказательство и решение |
|---|---|---|---|---|
| 2026-08-21 | Планирование | `DONE` | `fe7ca09545497cb9d35e9133ea7a4ed13b3c60b3` | Зафиксирован аудит, Goal, scope, gates и разрешение на scoped Git/deploy operations |
| 2026-08-21 | Этап 0 | `DONE` | `4cbb4fe14d25c901f63f11cb9eff9947082df844` | RED подтверждён отдельными тестами: TZ ограничивался 100/104 и генератор терял metadata; root не имел статического `/ru/`, устойчивого URL и локализованного JSON-LD/ARIA; SPDX updater отсутствовал, 1624/1625 файлов требовали metadata; provenance-набор был 0/6 |
| 2026-08-21 | Этап 1 | `DONE` | worktree | TZ unit 3/3, browser 1/1, `--check` read-only, `--write` через same-directory temp + invariants + atomic rename, 104/104 |
| 2026-08-21 | Этап 2 | `DONE` | worktree | Статические `/` и `/ru/`, self-canonical/hreflang/OG, URL+storage+reload, локализованные ARIA/JSON-LD; root browser QA и locale-route QA GREEN; smoke allowlist ограничен `ru/index.html` |
| 2026-08-21 | Этап 3 | `DONE` | worktree | SPDX check `files=1625`, 1624 snapshot-файла изменены только в `lang/xml:lang` и canonical; focused tests 13/13; PTES URL HTTP 200; оба handout canonical проверены |
| 2026-08-21 | Этап 4 | `DONE` | worktree | Affiliation 6/6, workflow-order 16/16, десять прежних visual SHA-256 блокируются в tracked public set и recursive release archives; нейтральный пример компании разрешён при явном авторстве; range-aware `git diff --check` добавлен до build |
| 2026-08-21 | Этап 5 | `DONE` | worktree | Provenance release 9/9 и deploy 21/21: exact clean SHA, authoritative `origin/main`, candidate deny, rollback ancestor, ZIP tree recomputation, child hosting-check и уникальное evidence; PS5/PS7 parse GREEN; стандарты и runbook актуализированы |
| 2026-08-21 | Этап 6 | `DONE` | candidate `2026-08-21` | Node 158/158; Python security 68/68 + DVWA 5/5 + Juice Shop 5/5 + SQL 20/20; штатный loopback Juice Shop start/demo/stop GREEN; candidate 30 архивов, static 0, independence 30/30, release browser 30/30; deploy gate ожидаемо отклонил candidate |
| 2026-08-21 | Этап 7, PR checkpoint | `FIX IN REVIEW` | `ec11a365ad232bc10a982ecf47b7716dd50fd6e6`, PR `#11`, run `32429589310` | Commit и branch опубликованы; архивы, independence и release browser QA в exact PR run прошли. Последний шаг корректно отклонил candidate, но GitHub pwsh wrapper унаследовал ожидаемый native exit code `1` и пометил job failed. Добавлен точечный reset stale `LASTEXITCODE` после содержательной проверки rejection и regression assertion; повторный exact-SHA CI обязателен до merge |
| 2026-08-21 | Этап 7, accepted main | `DONE` | `26785cb615bcb3e44939178044edb59ccd06b2f6` | PR `#11` merged; exact PR run `32430378340` и exact-main push run `32431202217` завершены `success`. Accepted build: 30 архивов, static 0, independence 30/30, source ref `refs/heads/main`, deployable/allow-deploy 30/30. Первая попытка остановилась до remote mutation из-за недоступного alias; read-only preflight подтверждённого Masterhost target прошёл. Пять согласованных доменов опубликованы, backup-архивы и remote root `/home/u548355/_deploy_pikov_20260821-022132586` сохранены; hosting-check дважды `OK=191 WARN=0 FAIL=0` |
| 2026-08-21 | Этап 8, live checkpoint | `FIX IN REVIEW` | `BROWSER_ONLINE_TESTS_2026-08-21.md` | Online browser QA: 30/30, issues 0; source=ZIP=live для `/`, `/ru/` и четырёх остальных изменённых landing pages — 6/6; root resources 2/2. URL-first switch/reload, localized metadata, TZ 104/104, SPDX extensionless/HTML, PTES и handout canonical — GREEN. Дополнительный raw-header test выявил `302 Location: http://pikov.expert/ru/` для `?lang=ru`: Apache за TLS terminator формировал downgrade из относительного RewriteRule. Добавлены RED-тесты для `.htaccess` и generator, затем explicit HTTPS rule; focused tests и smoke GREEN. Follow-up PR, exact-main CI, root-only redeploy и повторный live header test обязательны до READY |
| 2026-08-21 | Этап 8, closure | `READY` | public payload `e0b3e7f25bc7aa389ca16484a3d2aa94446def32`; PR `#12`; runs `32434206881`, `32434865400`; `HOSTING_DEPLOY_2026-08-21_20260821-032104530_e0b3e7f25bc7.md` | Follow-up PR и exact-main push run завершены `success`; независимый review exact SHA и финальный live review дали `READY`. Accepted release: 30 архивов, invalid provenance/policy/static/archive `0`, independence 30/30, browser 30/30. Root-only manifest содержал только `pikov.expert`; remote root `/home/u548355/_deploy_pikov_20260821-032104530` и backup сохранены. Raw `?lang=ru` возвращает ровно `302 Location: https://pikov.expert/ru/`, дополнительные query-параметры не совпадают; `/` и `/ru/` отдают `200` с шестью security headers и работают без JavaScript. Source=ZIP=live для root payload 4/4; нормализованный `.htaccess` совпал source=ZIP=remote; hosting-check `OK=191 WARN=0 FAIL=0`, online browser QA 30/30, PTES HTTP 200; `pc/` остался только untracked и отсутствует в index/commit tree |

## 8. Stop conditions

Работа немедленно останавливается до выяснения причины, если:

- изменился remote target SHA и появились пересекающиеся чужие изменения;
- исправление требует записи во внешний canonical SPDX repo с уже имеющимся
  пользовательским diff; такой repo выделяется в отдельный scope/worktree;
- в diff попали `pc/`, секреты, персональные данные или несвязанные материалы;
- generator удаляет учебное содержание или обязательные metadata;
- массовая регенерация меняет страницы вне ожидаемого шаблонного diff;
- release source commit не совпадает с accepted SHA;
- candidate release помечен deployable либо deploy пытается принять dirty
  candidate как production artifact;
- CI exact SHA не зелёный;
- deploy пытается затронуть домены вне согласованного списка;
- live hash не совпадает с принятым release;
- исправление требует содержательного сокращения или изменения авторства.

Отдельное ограничение по биографии: не менять сведения об образовании, службе,
количестве подготовленных специалистов или сертификатах без доступного
первичного резюме/подтверждающего документа. Ранее указанные пути к части
резюме сейчас недоступны; техническое исправление сайта не является основанием
для реконструкции таких фактов по памяти.

Metadata coverage имеет один reasoned allowlist: ownership-verification HTML
вида `yandex_*.html`, содержимое которого задаётся внешней системой. Любое
расширение allowlist требует отдельного доказательства. SPDX postprocessor имеет
два режима: `--write` только при явной синхронизации snapshot и `--check` в
CI/build; release workflow не должен молча изменять tracked HTML.

## 9. Точка восстановления контекста

При продолжении после паузы или потери контекста:

1. открыть этот Goal и найти первый этап со статусом `PENDING` или `IN_PROGRESS`;
2. выполнить `git status -sb`, `git log --oneline -5`, `git rev-parse HEAD` и
   `git rev-parse origin/main`;
3. сверить состояние с последней строкой журнала и сохранённым evidence;
4. не повторять завершённые изменения без проверки их SHA;
5. продолжать с первой незакрытой контрольной точки.

## 10. Нормативная опора

- NIST SP 800-218 SSDF: PO.3, PS.3, PW.8;
- OWASP ASVS и WSTG для проверяемых security requirements и browser checks;
- WCAG 2.2 SC 3.1.1, 3.1.2, 1.4.3 и keyboard/reflow requirements;
- SLSA provenance principles для связи source, build и release;
- SPDX/CycloneDX practices для воспроизводимого состава и происхождения;
- CWE, CERT C/C++ и MISRA C/C++ как профиль secure implementation для
  соответствующих учебных материалов;
- ГОСТ Р 56939-2024 и применимые требования ФСТЭК как отдельный российский
  local-compliance layer, не заменяющий международный baseline.

## 11. Итоговое правило

Ни один зелёный отдельный тест не означает завершение Goal. Завершение возможно
только после согласованной цепочки:

`RED evidence -> minimal fix -> GREEN focused tests -> full local gate -> scoped
commit -> push -> exact-SHA CI -> release provenance -> scoped deploy -> live
hash/browser/security checks -> independent READY review`.
