# Журнал глубокой актуализации учебных материалов pikov.expert

- Статус: `LOCAL RELEASE VERIFIED`; полный release build и независимый локальный review зелёные, commit/CI/main/deploy ещё не выполнены.
- Базовый commit: `5be877ea76eb023e6ea196799cca0b87f86f4c6c`.
- Рабочая ветка: `agent/deep-content-remediation`.
- Источник требований: `_PROJECT/DEEP_CONTENT_AUDIT_2026-08-15.md`.
- Область: 30 release targets, практикумы, публичные архивы, PDF/DOCX, браузерные представления и корневой каталог.

## 1. Инварианты владельца

1. Содержательная часть лекций сохраняется; удаление допускается только для дубликата, ошибочной атрибуции или небезопасной раздаваемой версии после появления безопасной замены.
2. Авторство учебных материалов принадлежит В. А. Пикову. Прежний учебный центр не указывается как автор/владелец курса.
3. Три согласованных исторических примера компании в ВКР сохраняются как примеры, а не как авторская атрибуция.
4. Лекции evergreen: календарные даты занятий не добавляются. Версии стандартов, даты вступления норм в силу и версии платформ сохраняются, когда они содержательно необходимы.
5. Международный baseline — основной: NIST, OWASP, MITRE, CISA, FIRST, OpenSSF, SLSA, CWE/CVE. Российские нормы показываются отдельным `local compliance profile` с областью применимости.
6. Практика выполняется только в owned/local sandbox с RoE, allowlist, containment, stop condition, rollback и ownership-aware cleanup.
7. `pc/` — непубличный пользовательский Obsidian vault. Его нельзя изменять, удалять или включать в staging.
8. Публикация выполняется только после RED→GREEN tests, полного build/QA, push точного SHA и успешного CI этого SHA.

## 2. Критерии завершения

- [x] P0: старые AppSec Day 1 и DVWA-раздачи заменены безопасными проверенными пакетами либо сняты с публичной выдачи без удаления исходников.
- [x] Подтверждённые P1 фактологические ошибки исправлены в канонических source-файлах и прошли независимый повторный review замороженного снимка.
- [x] P1-практикумы получили воспроизводимые bounded runbook, STOP/rollback/ownership checks и regression tests; итоговый общий gate зелёный.
- [x] Legacy AppSec DOCX с comments/revisions/personal metadata исключены из публичных пакетов и сохранены только как непубличный source.
- [x] Legacy PDF исключены из публичных пакетов; содержательная колода 27-07 заменена доступным HTML-handout с источниками и browser QA.
- [x] Browser defects исправлены: clipping, mobile reflow, контраст, landmarks/lang/headings/table headers; финальный release-snapshot прошёл 30/30 целей и 90/90 viewport-проверок без замечаний.
- [x] Педагогический минимум опубликован в course map: audience, prerequisites, outcomes, artifact, rubric, teacher route и versioned sources.
- [x] Полный release build зелёный: 30 архивов, `staticIssues=0`, public-independence 30/30, browser QA 30/30 целей и 90/90 viewport-проверок, `issues=0`.
- [ ] Ветка опубликована, CI точного SHA зелёный, изменения приняты в `main`.
- [ ] Развёрнут точный принятый SHA; local/repository/live сверены по hash/link/header/browser checks.
- [ ] `main` и `origin/main` синхронны, рабочая копия чиста кроме намеренно непубличного `pc/`.

## 3. Потоки работ

### A. Международная фактология

- [x] MITRE ATT&CK v19.2 и 15 Enterprise tactics; version/counts привязаны к official permalink.
- [x] NIST SP 800-30 Rev.1 и SP 800-61r3.
- [x] NIST SP 800-63B-4 password baseline.
- [x] OWASP Top 10:2025: честная карта A01–A09:2025 + историческая SSRF A10:2021; отсутствие отдельной A10:2025 lab указано явно.
- [x] CWE-119 descendants; CVE/NVD distinction.
- [x] CycloneDX 1.7: дата релиза 21.10.2025 и official source.
- [x] SAST/NIST/statistical claims.
- [x] LLM Top 10:2025, Agentic Top 10:2026, AISVS 1.0 разведены по назначению и версии.

### B. Платформенный и local compliance слой

- [x] Приказы №17/117 и дата приказа №31.
- [x] ГОСТ Р 50922-2006 вместо редакции 1996 года.
- [x] Windows AppLocker/App Control, WIP removal, BitLocker/Device Encryption.
- [x] Windows 10 lifecycle и version passport стендов.
- [x] Лицензирование ТЗИ: каналы, сроки, реестр, контроль, аттестация.
- [x] Области №117/21/239/31 и отдельный криптографический контур.

### C. Безопасная и воспроизводимая практика

- [x] AppSec Day 1: один канонический tested source и bounded fixtures.
- [x] DVWA и Juice Shop: digest pin, loopback-only proxy, no-egress, resource limits, synthetic evidence и ownership-aware cleanup.
- [x] SQLite URI: `Path.as_uri()` и adversarial path tests.
- [x] Astra Intro: без `[trusted=yes]`, signed source, frozen profile и snapshot.
- [x] KOMRAD: host-only/internal, unique credentials, fail-closed log export/restore и installer verification.
- [x] Scaner-VS: collision-safe WSL/firewall cleanup, ownership state, signed/hash-gated media и LiveUSB disk guard.
- [x] PPK: широкая DAC bypass capability удалена; pseudocode явно маркирован.
- [x] Pentest-02: программа остаётся reference-only; hands-on только с per-module RoE/runbook.

### D. UI, документы и доступность

- [x] `cert`: устранены clipping и перекрытие fixed navigation на всех слайдах.
- [x] `29-07`: document-root overflow устранён при сохранении table scroll.
- [x] `vkr`, `astralinux01/02`: mobile handout/reflow вместо микрослайда.
- [x] Контраст подтверждённых страниц ≥ WCAG 2.2 SC 1.4.3.
- [x] `<main>`, `lang`, единственный H1, table headers.
- [x] Небезопасные legacy DOCX удалены из публичной раздачи; source сохранён непублично для будущей чистой пересборки.
- [x] Проблемный PDF заменён доступным HTML; публикация старого PDF закрыта fail-closed gate'ом.

### E. Педагогическая унификация

- [x] Для каждого release target: audience + prerequisites + measurable outcome.
- [x] `Outcome → activity → artifact → criterion/rubric → source` опубликовано в course map.
- [x] Slides, handout, teacher route и offline fallback разведены в карте курса там, где они существуют.
- [x] Датированные 27/29 URL сохранены только как provenance; student-facing заголовки и материалы сделаны evergreen.
- [x] `pc/` использован только как непубличный структурный эталон и не изменён.

## 4. Обязательные проверки

### До изменения поведения

1. Добавить focused regression test.
2. Запустить и зафиксировать ожидаемый RED.
3. Выполнить минимальную source-правку.
4. Повторить focused test до GREEN.

### Локальный полный gate

```powershell
git diff --check
& .\_PROJECT\smoke-check.ps1
& .\_PROJECT\build-release.ps1 -Root 'V:\pikov.expert' -ReleaseDate '2026-08-15' -FailOnIssues
& .\_PROJECT\test-public-release-independence.ps1 -ReleaseIndex '.\_PROJECT\RELEASE_INDEX_2026-08-15.json'
$env:RELEASE_DATE='2026-08-15'; node .\_PROJECT\browser-qa.mjs
```

Дополнительно выполняются все focused tests изменённых каталогов, документный all-page render/a11y audit и проверки безопасных practical fixtures без запуска атак против внешних адресов.

### Git/CI/deploy

1. Проверить diff и явно перечислить staged paths; `git add -A` запрещён из-за `pc/`.
2. Commit в рабочей ветке.
3. Push точного SHA и green GitHub Actions.
4. Merge принятого SHA в `main`; сверить `origin/main`.
5. Пересобрать/развернуть только принятый SHA.
6. Выполнить hosting-check, online browser QA и live hash/header/link checks.

## 5. Журнал выполнения

### 2026-08-15 — старт remediation

- `git fetch --prune origin`: выполнено.
- `main == origin/main == 5be877ea76eb023e6ea196799cca0b87f86f4c6c`: подтверждено.
- Создана ветка `agent/deep-content-remediation`.
- На старте незакоммичены только `_PROJECT/DEEP_CONTENT_AUDIT_2026-08-15.md` и ранее существовавший `pc/`.
- `.codegraph/` отсутствует; индекс не создаётся по решению владельца репозитория.
- `gh 2.89.0` установлен; GitHub auth для `pikov-vitaliy` подтверждён.
- Audit correction: official MITRE Version History подтверждает current ATT&CK v19.2; ошибочная рекомендация отката на v19.1 удалена.
- Audit/ledger сохранены в commit `117f091`, ветка опубликована; открыт draft PR `#5`.
- Добавлен `_PROJECT/test-layout-accessibility-regressions.mjs`.
- RED подтверждён: `node .\_PROJECT\test-layout-accessibility-regressions.mjs` завершился с 25 ожидаемыми layout/a11y failures (16 missing main, `27001` lang, SPDX H1, cert overflow 3 viewport, 29-07 root overflow, Astra subtitle size и 3 headerless tables).
- Запущены параллельные RED→GREEN потоки A–C; UI GREEN выполняется после завершения пересекающихся source-правок.
- Общая семантика частично исправлена без изменения визуальной структуры: `article.content` заменён на `main` на пяти страницах, презентация ГОСТ обёрнута в `main`, SPDX получил один H1 и `main`, bundled-страница `27001` после распаковки принудительно сохраняет `lang=ru` и корневой `main`.
- Layout/a11y test расширен проверкой шести вручную подтверждённых WCAG 2.2 SC 1.4.3 failures. RED воспроизведён; локально исправлены `gost56939`, `p19`, `is`, `vkr`, после чего эти четыре контрастных нарушения исчезли из повторного browser-run.
- Для мобильного `vkr` сначала добавлена регрессия на отсутствие читаемого handout (RED), затем внедрён синхронизируемый со слайдом текстовый transcript ≥16 px (GREEN). Растровая презентация и свайп-навигация сохранены.
- Текущий focused gate уменьшился с 25 до 17 remaining failures; остаток относится к пересекающимся агентским каталогам и будет закрыт после интеграции их патчей.
- Международный focused test прошёл повторно у root: 9/9 GREEN; существующие Pentest materials 10/10 и UI 8/8 также GREEN. Помимо ATT&CK исправлены SP 800-30 Rev.1, SP 800-61r3 attribution, CWE-119 descendants, CVE/NVD roles, SAST historical/example-only claims и неподтверждённый MTD percentage.
- Внутренние `README.md`, `risk/README.md`, `threats-kii/README.md`, `tz/README.md` очищены от прежней организационной атрибуции и несуществующих logo paths; три согласованных исторических примера в `vkr/index.html` сохранены.
- Международный блок сохранён отдельным commit `330286b`: focused currentness 9/9, Pentest materials 10/10 и Pentest UI 8/8 GREEN; commit опубликован в draft PR `#5`.
- Платформенный/local-compliance блок завершён без публикации: новый focused test сначала зафиксировал 9 ожидаемых содержательных RED, после правок прошёл 10/10 GREEN. Восемь изменённых HTML прошли browser smoke без `pageerror`, scoped `git diff --check` чист. Исправлены области и даты приказов, Windows lifecycle/features/password baseline, ГОСТ Р 50922, лицензирование ТЗИ и разграничение контуров ФСТЭК/ФСБ.
- Платформенный блок пока не закоммичен: его страницы пересекаются с завершающим layout/a11y проходом. Commit будет создан только после совместного browser GREEN, чтобы не фиксировать промежуточное состояние.
- GitHub Actions для международного commit `330286b1d5373d670e90077148a00e835599120e` завершился `success`: workflow `Site checks`, run `31888706928`, job `95021638475`, длительность 4 мин 12 с.
- Добавлен focused evergreen-test: исходный запуск 15/25 GREEN и 10 ожидаемых RED. В `risk` и `threats-kii` удалены даты конкретного расписания и устаревающие подписи «май 2026»; тайминги блоков и содержательные даты НПА сохранены. Поднабор этих четырёх файлов прошёл 4/4 GREEN, international currentness остался 9/9 GREEN.
- Операционный runbook переведён на безопасный порядок `local gates → explicit-path commit → push → CI exact SHA → build/deploy → live QA`; executable `git add -A` удалён, `pc/` явно исключён, public-independence gate указан и для сборки, и для deployment. Новый workflow-order test сначала дал 0/3 RED, после правки — 3/3 GREEN; deploy script повторно прошёл PowerShell parse.
- После строгого integration review runbook дополнительно закрыт от публикации feature-branch SHA: обязательны merge принятого PR, `git switch main`, `git pull --ff-only`, равенство `HEAD == origin/main` и отдельный успешный GitHub Actions run именно для итогового main SHA. Регрессия расширена до 6/6 GREEN.
- Для Juice Shop и DVWA исправлена тонкая ошибка Docker-семантики: уязвимое приложение больше не публикует host-порт напрямую и находится только в сети `internal: true` с `gateway_mode_ipv4=isolated`. Loopback-порт публикует отдельный минимальный Alpine TCP-proxy с фиксированным upstream, digest pin, non-root UID, read-only rootfs, `cap_drop: ALL`, `no-new-privileges`, bounded logging и CPU/RAM/PID limits. Запуск запрещён на Docker Engine ниже 28.0.0 из-за известной исторической слабости loopback-публикации в L2.
- Runtime-проверка Juice Shop: HTTP 200; binding `127.0.0.1:3000`; host bindings приложения `{}`; `Internal=true`; gateway отсутствует, режим `isolated`; TCP к `1.1.1.1:80` и `host.docker.internal:8000` заблокирован (`exit 7`); все созданные контейнеры и сети удалены.
- DVWA переведён со стороннего образа 2018 года на официальный `ghcr.io/digininja/dvwa` по multi-arch digest, с отдельной MariaDB 10.11.15 по digest и health-зависимостями. Runtime-проверка трёхсервисного контура выполнена на временном `127.0.0.1:18000`, поскольку существующий пользовательский контейнер занимает `0.0.0.0/[::]:8000`: HTTP 200; host bindings приложения и БД `{}`; только proxy опубликован на loopback; `Internal=true`, gateway отсутствует; TCP к Интернету и Docker-хосту заблокирован (`exit 7`); `down --volumes` удалил контейнеры, сети и volume. Идентификатор, состояние и bindings существующего контейнера до и после проверки совпали.
- Штатный Windows PowerShell 5.1 preflight корректно отказал на занятом порту и не изменил существующий контейнер. До любого `compose down` stop-path теперь перечисляет project-labelled containers, networks и volumes, проверяет точные owner/config labels и отказывается от мутации при коллизии; после удаления отдельно проверяются остаточные объекты и listener. DVWA safety contract — 5/5, включая доказательство, что чужой одноимённый объект не удаляется.
- AppSec Day 1 и SSRF переведены на те же ownership-aware wrappers. Реальный SSRF-прогон: `127.0.0.1:18080`, синтетический internal marker вернулся с HTTP 200, публикация только на loopback; после `stop.ps1` контейнеры, сети и listener отсутствовали. Focused AppSec contract — 17/17 до финальной пересборки пакетов.
- Повторный независимый gate после этих правок: international currentness 9/9, platform currentness 10/10, course map 6/6 и полный layout/a11y regression GREEN; Compose-схемы проходят `docker compose config --quiet`, Pentest Juice Shop safety contract — 5/5, DVWA safety contract — 5/5.
- Deploy boundary закрыта до `rsync --delete`: индекс обязан точно совпадать с 30 canonical targets, поля `domain/archiveName/archivePath` связаны с реестром и проверяются fail closed, удалённый target разрешается строго под `$HOME/<domain>/www`. Mutation/PrepareOnly regression — 9/9 GREEN; workflow имеет `permissions: contents: read`, immutable `actions/checkout` SHA и `persist-credentials: false`, workflow-order regression — 7/7 GREEN.

## 6. Точка восстановления контекста

Если работа прервана, сначала выполнить:

```powershell
Set-Location 'V:\pikov.expert'
git status --short --branch
git log -5 --oneline --decorate
Get-Content '.\_PROJECT\DEEP_CONTENT_REMEDIATION_2026-08-15.md'
```

Затем продолжить с первого незакрытого checkbox. Не начинать заново аудит и не трогать `pc/`.
