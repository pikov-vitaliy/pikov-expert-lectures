# Журнал глубокой актуализации учебных материалов pikov.expert

- Статус: `IN PROGRESS`.
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

- [ ] P0: старые AppSec Day 1 и DVWA-раздачи заменены безопасными проверенными пакетами либо сняты с публичной выдачи без удаления исходников.
- [ ] Все P1 фактологические ошибки из аудита исправлены в канонических source-файлах.
- [ ] Все P1 практикумы имеют воспроизводимый безопасный runbook и regression checks.
- [ ] Публичные DOCX очищены от comments/revisions/personal metadata, имеют приемлемую a11y-структуру и пройдены all-page render checks.
- [ ] Публичные PDF пересобраны из канонического source, имеют читаемую проекционную/раздаточную форму, metadata, навигацию и первичные источники.
- [ ] Browser defects исправлены: clipping, mobile reflow, контраст, landmarks/lang/headings/table headers.
- [ ] Педагогический минимум добавлен без переписывания лекций: audience, prerequisites, outcomes, artifact, rubric, teacher route и versioned sources.
- [ ] Полный release build и все repository gates зелёные.
- [ ] Ветка опубликована, CI точного SHA зелёный, изменения приняты в `main`.
- [ ] Развёрнут точный принятый SHA; local/repository/live сверены по hash/link/header/browser checks.
- [ ] `main` и `origin/main` синхронны, рабочая копия чиста кроме намеренно непубличного `pc/`.

## 3. Потоки работ

### A. Международная фактология

- [ ] MITRE ATT&CK v19.1 и 15 Enterprise tactics.
- [ ] NIST SP 800-30 Rev.1 и SP 800-61r3.
- [ ] NIST SP 800-63B-4 password baseline.
- [ ] OWASP Top 10:2025, включая отдельную A10:2025 lab.
- [ ] CWE-119 descendants; CVE/NVD distinction.
- [ ] CycloneDX 1.7 date; SAST/NIST/statistical claims.
- [ ] LLM Top 10:2025, Agentic Top 10:2026, AISVS 1.0.

### B. Платформенный и local compliance слой

- [ ] Приказы №17/117 и дата приказа №31.
- [ ] ГОСТ Р 50922-2006 вместо редакции 1996 года.
- [ ] Windows AppLocker/App Control, WIP removal, BitLocker/Device Encryption.
- [ ] Windows 10 lifecycle и version passport стендов.
- [ ] Лицензирование ТЗИ: каналы, сроки, реестр, контроль, аттестация.
- [ ] Области №117/21/239/31 и отдельный криптографический контур.

### C. Безопасная и воспроизводимая практика

- [ ] AppSec Day 1: один канонический tested source и bounded fixtures.
- [ ] DVWA: digest pin, loopback, no-egress, limits, synthetic evidence.
- [ ] SQLite URI: `Path.as_uri()` и adversarial path tests.
- [ ] Astra Intro: без `[trusted=yes]`, signed source и snapshot.
- [ ] KOMRAD: host-only/internal, unique credentials, log export/restore.
- [ ] Scaner-VS: collision-safe WSL/firewall cleanup и LiveUSB disk guard.
- [ ] PPK: убрать широкую DAC bypass capability; реальный или явно маркированный pseudocode.
- [ ] Pentest-02: program remains reference; hands-on only with per-module RoE/runbook.

### D. UI, документы и доступность

- [ ] `cert`: устранить clipping и перекрытие fixed navigation.
- [ ] `29-07`: document-root overflow при сохранении table scroll.
- [ ] `vkr`, `astralinux01/02`: mobile handout/reflow вместо микрослайда.
- [ ] Контраст подтверждённых страниц ≥ WCAG 2.2 SC 1.4.3.
- [ ] `<main>`, `lang`, единственный H1, table headers.
- [ ] DOCX: comments/tracked changes/privacy/a11y/render.
- [ ] PDF: sources/metadata/bookmarks/tagging/alt/readability.

### E. Педагогическая унификация

- [ ] Для каждого самостоятельного курса: audience + prerequisites + 3–5 measurable outcomes.
- [ ] `Outcome → activity → artifact → criterion/rubric → source`.
- [ ] Slides отделены от handout; teacher route и offline fallback.
- [ ] Датированные 27/29 URL сохранены как provenance, добавлены date-neutral aliases.
- [ ] `pc/` используется только как непубличный структурный эталон.

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
- Следующий шаг: зафиксировать audit/ledger, затем запустить параллельные RED→GREEN потоки A–C.

## 6. Точка восстановления контекста

Если работа прервана, сначала выполнить:

```powershell
Set-Location 'V:\pikov.expert'
git status --short --branch
git log -5 --oneline --decorate
Get-Content '.\_PROJECT\DEEP_CONTENT_REMEDIATION_2026-08-15.md'
```

Затем продолжить с первого незакрытого checkbox. Не начинать заново аудит и не трогать `pc/`.
