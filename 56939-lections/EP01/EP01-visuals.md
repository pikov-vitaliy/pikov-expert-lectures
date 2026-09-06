# EP01 — Каталог учебных визуализаций

Дата: 2026-09-06. Автор учебного материала: Vitaliy Pikov.

Этот файл задаёт содержание локальных SVG-иллюстраций для английской презентации и самостоятельной русской лекции. Каждая JSON-запись описывает одну иллюстрацию: подписи, доступное текстовое описание, пояснение и идентификаторы источников из каталога EP01. Английские и русские версии предназначены для соответствующего языка материала.

Схемы показывают связи и учебные примеры; расстояния, размеры блоков и стрелки не измеряют эффективность, безопасность или нормативную эквивалентность. Исключения — хронологические координаты шкал и диаграмма явно заданного учебного бюджета времени. Годы на шкале методологий обозначают выбранные публикации и редакции, а не обязательные даты возникновения идей. Пример на 90 дней и 96 человеко-часов не является требованием ГОСТ.

## slide-03

Четыре связанные области дают зрителю маршрут серии. Подпись явно относит группировку к учебному объяснению автора; она не вводит новую классификацию стандарта.

```json
{
  "id": "slide-03", "kind": "flow", "lang": "en",
  "alt": "Four connected teaching groups: Organize, Engineer, Verify and Sustain. These are the author's guide to the series, not categories defined by GOST.",
  "caption": "An author's teaching guide to the connections between the 25 processes.",
  "sourceIds": ["G24"],
  "nodes": [
    {"label": "01", "title": "Organize", "detail": "Plans, skills, owners"},
    {"label": "02", "title": "Engineer", "detail": "Design, code, builds"},
    {"label": "03", "title": "Verify", "detail": "Review, analyze, test"},
    {"label": "04", "title": "Sustain", "detail": "Updates and improvement"}
  ],
  "note": "Teaching groups, not an official GOST classification or a prescribed sequence."
}
```

## slide-04

Условный импортёр связывает техническое предупреждение с организационной проблемой. Разрыв расположен перед расследованием: информация уже получена, но дальнейшая работа не согласована.

```json
{
  "id": "slide-04", "kind": "release", "lang": "en",
  "alt": "A file reaches the C++ parser, analysis produces a finding, and the path toward investigation and a release decision is interrupted by unclear ownership and capacity.",
  "caption": "Illustrative case: a finding is useful only when the team can act on it.",
  "sourceIds": ["EX"],
  "gap": true,
  "nodes": [
    {"label": "01", "title": "Input file", "detail": "Engineering data"},
    {"label": "02", "title": "Parser", "detail": "C++ importer"},
    {"label": "03", "title": "Finding", "detail": "Possible memory error"},
    {"label": "04", "title": "Investigate", "detail": "Owner? Capacity?"},
    {"label": "05", "title": "Decide", "detail": "Release evidence?"}
  ],
  "note": "The team has a warning; it still needs an agreed response."
}
```

## slide-05

Шкала показывает выборку публикаций из обзора, не превращая историю в цепочку «один подход заменил другой». Координаты опираются на годы; подписи отделяют публикацию от появления практики.

```json
{
  "id": "slide-05", "kind": "timeline", "lang": "en",
  "alt": "Selected publication and edition milestones: lifecycle research in 2004; SDL, Touchpoints and CLASP publications in 2006; SDL-Agile guidance v5.2 in 2012; Singapore Security-by-Design in 2017; SAMM v2.0 in 2020; SSDF v1.1 in 2022.",
  "caption": "Selected publications and editions from the methodology landscape; the review covers 28 approaches.",
  "sourceIds": ["MLR", "MSH", "SAMM20", "N11"],
  "axis": [2004, 2022],
  "nodes": [
    {"year": 2004, "label": "2004", "title": "Lifecycle research", "detail": "Jones and Rastogi"},
    {"year": 2006, "label": "2006", "title": "SDL / Touchpoints", "detail": "CLASP"},
    {"year": 2012, "label": "2012", "title": "SDL-Agile", "detail": "Guidance v5.2"},
    {"year": 2017, "label": "2017", "title": "Security-by-Design", "detail": "Singapore framework"},
    {"year": 2020, "label": "2020", "title": "SAMM v2.0", "detail": "Capability improvement"},
    {"year": 2022, "label": "2022", "title": "SSDF v1.1", "detail": "NIST SP 800-218"}
  ],
  "note": "Publication dates are not necessarily the dates when the practices first appeared."
}
```

## slide-08

Отдельные узлы проекта, утверждения и введения в действие защищают от смешения событий. Группировка 2014–2015 годов обозначена диапазоном, а не выдуманной точной датой.

```json
{
  "id": "slide-08", "kind": "timeline", "lang": "en",
  "alt": "GOST development milestones: research began in April 2013 and a first draft followed in August; review and revision continued in 2014–2015; Rosstandart approved the standard on 1 June 2016; it became effective on 1 June 2017. Project milestones come from Varenitsa's historical account, while the final two dates are formal publication facts.",
  "caption": "From research to an effective standard: different events, different dates.",
  "sourceIds": ["TRANS", "GOSTH", "G16"],
  "axis": [2013, 2017],
  "nodes": [
    {"year": 2013, "label": "2013", "title": "Research & first draft", "detail": "April start · August draft", "tone": "account"},
    {"year": 2014.5, "label": "2014–2015", "title": "Review & revision", "detail": "Working drafts", "tone": "account"},
    {"year": 2016, "label": "1 June 2016", "title": "Approved", "detail": "Rosstandart · 458-st", "tone": "formal"},
    {"year": 2017, "label": "1 June 2017", "title": "Effective", "detail": "GOST R 56939-2016", "tone": "formal"}
  ],
  "note": "Project history: Varenitsa's account. Approval and effective dates: the final standard."
}
```

## slide-11

Хронология ограничивает заявления о заимствовании. Линия означает течение времени, а не документально доказанную связь происхождения ГОСТ и SSDF.

```json
{
  "id": "slide-11", "kind": "timeline", "lang": "en",
  "alt": "On a common time axis, GOST R 56939 was approved in 2016; the first public SSDF draft appeared in 2019, final SSDF 1.0 in 2020, and final SSDF 1.1 in 2022. The timeline does not assert ancestry between the documents.",
  "caption": "Chronology helps test an ancestry claim; similarity alone cannot establish one.",
  "sourceIds": ["G16", "N19", "N20", "N11"],
  "axis": [2016, 2022],
  "nodes": [
    {"year": 2016, "label": "2016", "title": "GOST R 56939", "detail": "Approved", "tone": "gost"},
    {"year": 2019, "label": "2019", "title": "SSDF public draft", "detail": "11 June", "tone": "ssdf"},
    {"year": 2020, "label": "2020", "title": "SSDF 1.0", "detail": "Final white paper", "tone": "ssdf"},
    {"year": 2022, "label": "2022", "title": "SSDF 1.1", "detail": "NIST SP 800-218", "tone": "ssdf"}
  ],
  "note": "Dates establish sequence, not a proven line of influence."
}
```

## slide-12

Сравнение обложек и смысла «следует» содержательнее графика роста числа заголовков. Девять групп мер и двадцать пять процессов не являются сопоставимыми единицами прогресса.

```json
{
  "id": "slide-12", "kind": "editions", "lang": "en",
  "alt": "The 2016 edition has nine groups of measures; clause 4.2 assigns recommendation status to a term that expresses a requirement under clause 4.7 of the 2024 edition. The 2024 edition has 25 named processes. Structural counts do not measure a change in security.",
  "caption": "These labels compare the normative force of one term in the original text.",
  "sourceIds": ["G16", "G24"],
  "nodes": [
    {"label": "2016", "title": "9 groups of measures", "detail": "Recommendation · clause 4.2"},
    {"label": "2024", "title": "25 named processes", "detail": "Requirement · clause 4.7"}
  ],
  "note": "Different structural units: 25 minus 9 is not a measure of improvement."
}
```

## slide-13

Обратная связь отличает поддерживаемый порядок работы от отдельного запуска инструмента. Версия продукта и свидетельства находятся в центре, потому что связывают действия с конкретным состоянием ПО.

```json
{
  "id": "slide-13", "kind": "loop", "lang": "en",
  "alt": "A repeating process connects a trigger, assigned work, a recorded decision and review. Product version and evidence remain at the centre of the cycle.",
  "caption": "A teaching model of repeatable work: actions, decisions and feedback remain connected.",
  "sourceIds": ["G24", "EX"],
  "center": "Version + evidence",
  "nodes": [
    {"label": "01", "title": "Trigger", "detail": "Change, release, new risk"},
    {"label": "02", "title": "Assigned work", "detail": "Perform and review"},
    {"label": "03", "title": "Recorded decision", "detail": "Finding and response"},
    {"label": "04", "title": "Review & improve", "detail": "Update the next cycle"}
  ],
  "note": "Running a tool is one action inside the process."
}
```

## slide-15

Короткий путь сопоставления заменяет абстрактный список действий конкретным вопросом на каждом шаге. Последний узел разрешает обоснованный частичный результат.

```json
{
  "id": "slide-15", "kind": "flow", "lang": "en",
  "alt": "The comparison method proceeds from reading actors, actions and conditions, to examining differences, demonstrating an implementation, and stating a bounded conclusion.",
  "caption": "Compare what the documents ask people to do and what would demonstrate the result.",
  "sourceIds": ["G24", "N11"],
  "nodes": [
    {"label": "01", "title": "Read", "detail": "Actor, action, conditions"},
    {"label": "02", "title": "Compare", "detail": "Shared intent, differences"},
    {"label": "03", "title": "Demonstrate", "detail": "Example and evidence"},
    {"label": "04", "title": "Conclude", "detail": "State the limits"}
  ],
  "note": "Partial overlap is useful; it does not establish full equivalence."
}
```

## slide-16

Обе аналитические работы образуют основание двух планов. Область применения окружает карту; порядок узлов не изображает обязательную очерёдность внедрения.

```json
{
  "id": "slide-16", "kind": "planning", "lang": "en",
  "alt": "Within the defined scope, current-state analysis and resource analysis support both the process improvement plan and the process implementation plan. The five nodes carry clauses 5.1.2.1 through 5.1.2.5.",
  "caption": "Five planning requirements connected by their information dependencies.",
  "sourceIds": ["G24"],
  "nodes": [
    {"label": "5.1.2.1", "title": "Current state", "detail": "Periodically analyze"},
    {"label": "5.1.2.2", "title": "Resource needs", "detail": "Periodically analyze"},
    {"label": "5.1.2.3", "title": "Improvement plan", "detail": "Develop capabilities"},
    {"label": "5.1.2.4", "title": "Implementation plan", "detail": "Organize the work"},
    {"label": "5.1.2.5", "title": "Scope", "detail": "Define the boundary"}
  ],
  "note": "Both plans take the analyses into account. This is a map of connections, not a required sequence."
}
```

## slide-17

Видимая граница помогает отличить состав продукта от связанного контекста разработки. Исключение требует обоснования и не определяется лишь возрастом прототипа.

```json
{
  "id": "slide-17", "kind": "boundary", "lang": "en",
  "alt": "Importer 2.0 contains the parser, service API and shipped libraries. Repository, CI configuration and release workflow form connected development context. Excluding a retired prototype requires evidence that it has no code or dependency path into the release.",
  "caption": "Illustrative scope: record what is included, what is connected and why an exclusion is justified.",
  "sourceIds": ["G24", "EX"],
  "title": "Importer 2.0",
  "components": ["Parser module", "Service API", "Shipped libraries"],
  "context": ["Repository", "CI configuration", "Release workflow"],
  "exclusion": "Retired prototype: no code or dependency path into release",
  "note": "Keep a versioned scope record and the selection rationale."
}
```

## slide-19

Единственная диаграмма объёма в наборе использует заданные в учебном примере числа. Общий ноль и одинаковая единица делают соотношение трудозатрат честным и понятным.

```json
{
  "id": "slide-19", "kind": "bars", "lang": "en",
  "alt": "An illustrative 90-day effort allocates 60 person-hours to engineering, 24 to AppSec, and 12 to release coordination and sponsor decisions, for a total of 96 person-hours. Tools and infrastructure are assessed separately.",
  "caption": "Illustrative total effort for the 90-day plan; validate the estimates with the people doing the work.",
  "sourceIds": ["G24", "EX"],
  "unit": "person-hours", "total": 96,
  "nodes": [
    {"label": "Engineering", "value": 60, "unit": "person-hours"},
    {"label": "AppSec", "value": 24, "unit": "person-hours"},
    {"label": "Release & sponsor", "value": 12, "unit": "person-hours"}
  ],
  "note": "A teaching estimate, not a benchmark or a GOST percentage. Tools and infrastructure are separate."
}
```

## slide-20

Переход от возможности к исполнимой задаче и свидетельству результата раскрывает разницу двух планов. Общий трекер может хранить эти связи без требования отдельных файлов.

```json
{
  "id": "slide-20", "kind": "flow", "lang": "en",
  "alt": "A process improvement goal, repeatable parser checks, is linked to an implementation task with an owner and milestone, and then to evidence of coverage and triage decisions. Current-state and resource analysis support the entire chain.",
  "caption": "Connect the capability in the improvement plan to executable work and its evidence.",
  "sourceIds": ["G24", "EX"],
  "nodes": [
    {"label": "IMPROVEMENT PLAN", "title": "Capability", "detail": "Repeatable parser checks"},
    {"label": "IMPLEMENTATION PLAN", "title": "Task", "detail": "Owner and milestone"},
    {"label": "RESULT", "title": "Evidence", "detail": "Coverage and decisions"}
  ],
  "note": "Shared foundation: current-state analysis and resource analysis. The plans may be linked in one tracker."
}
```

## slide-21

Каждый период заканчивается проверяемым результатом. Шкала представляет только учебный пример, не обязательную частоту анализа и не обещание полного внедрения за квартал.

```json
{
  "id": "slide-21", "kind": "roadmap", "lang": "en",
  "alt": "The illustrative plan has three equal 30-day periods: establish scope, baseline and ownership; integrate parser checks and record decisions; then review two release cycles, close gaps and update the next plan.",
  "caption": "A 90-day example for the importer: each stage produces something the team can review.",
  "sourceIds": ["G24", "EX"],
  "nodes": [
    {"label": "Days 1–30", "title": "Establish baseline", "detail": "Scope, owners, capacity"},
    {"label": "Days 31–60", "title": "Integrate & record", "detail": "CI checks, triage evidence"},
    {"label": "Days 61–90", "title": "Review & improve", "detail": "Two cycles, next plan"}
  ],
  "note": "Illustrative implementation choices, not a timetable required by GOST."
}
```

## slide-22

Расположение повторяет карту требований на слайде 16. Теперь в каждом узле — сведения, которые можно проследить до конкретного продукта, работы и решения.

```json
{
  "id": "slide-22", "kind": "planning", "lang": "en",
  "alt": "Five evidence categories mirror the planning requirements: baseline checks and gaps, resource estimates and assumptions, improvement priorities, implementation owners and milestones, and the importer scope with its rationale.",
  "caption": "The same planning structure, now expressed as records a reviewer can follow.",
  "sourceIds": ["G24", "EX"],
  "nodes": [
    {"label": "5.1.3.1", "title": "Current-state record", "detail": "Checks and known gaps"},
    {"label": "5.1.3.2", "title": "Resource record", "detail": "96 h and assumptions"},
    {"label": "5.1.3.3", "title": "Improvement plan", "detail": "Priorities and sequence"},
    {"label": "5.1.3.4", "title": "Implementation plan", "detail": "Owners and milestones"},
    {"label": "5.1.3.5", "title": "Scope record", "detail": "Importer 2.0 and rationale"}
  ],
  "note": "Five information categories, not five compulsory isolated files. A summary links to the underlying evidence."
}
```

## slide-23

Две узкие пары показывают содержательное совпадение без заявления об эквивалентности документов. Связующий текст обозначает общую задачу, а не процент покрытия.

```json
{
  "id": "slide-23", "kind": "crosswalk", "lang": "en",
  "alt": "Two partial overlaps are shown: GOST 5.1.3.4 and NIST SSDF PO.2.1 share a concern with roles and responsibility; GOST 5.1.2.3 and SAMM Strategy and Metrics share a concern with an improvement roadmap. Scope and evidence expectations still differ.",
  "caption": "Bounded comparison: a shared concern is useful, but does not establish full equivalence.",
  "sourceIds": ["G24", "N11", "SAMM"],
  "rows": [
    {"left": "GOST 5.1.3.4", "bridge": "Roles & responsibility", "right": "SSDF PO.2.1"},
    {"left": "GOST 5.1.2.3", "bridge": "Improvement roadmap", "right": "SAMM Strategy & Metrics"}
  ],
  "note": "Partial overlap in both rows. Compare the full wording, scope and evidence expectations."
}
```

## slide-24

Возвращение к исходной схеме завершает учебную историю. Устранён разрыв в организации работы, но схема не выдаёт решение о безопасности конкретного выпуска.

```json
{
  "id": "slide-24", "kind": "release", "lang": "en",
  "alt": "The importer scenario returns with a connected path: identify the input and covered parser, retain the finding evidence, assign time and ownership for investigation, and record a release decision under the team's policy. This is a review of the process, not proof that a release is safe.",
  "caption": "Return to Friday's release: can the team follow the finding through an owned, evidenced decision?",
  "sourceIds": ["G24", "EX"],
  "gap": false,
  "nodes": [
    {"label": "SCOPE", "title": "Input file", "detail": "Relevant scenario"},
    {"label": "VERSION", "title": "Parser", "detail": "Covered component"},
    {"label": "EVIDENCE", "title": "Finding", "detail": "Recorded result"},
    {"label": "CAPACITY", "title": "Investigate", "detail": "Owner and time"},
    {"label": "POLICY", "title": "Decide", "detail": "Decision and review"}
  ],
  "note": "A usable decision process does not predetermine whether the release should proceed."
}
```

## ru-sdl-timeline

Русская версия шкалы поддерживает §2 самостоятельной лекции. Она сохраняет то же различение публикаций, редакций и появления практик, что и английский слайд.

```json
{
  "id": "ru-sdl-timeline", "kind": "timeline", "lang": "ru",
  "alt": "Выбранные публикации и редакции: исследование жизненного цикла 2004 года; SDL, Touchpoints и CLASP в 2006 году; руководство SDL-Agile v5.2 в 2012 году; сингапурский Security-by-Design в 2017 году; SAMM v2.0 в 2020 году; SSDF v1.1 в 2022 году. Это не даты первого возникновения всех идей.",
  "caption": "Выбранные публикации и редакции из истории методологий. Обзор рассматривает 28 подходов; шкала не исчерпывает их историю.",
  "sourceIds": ["MLR", "MSH", "SAMM20", "N11"],
  "axis": [2004, 2022],
  "nodes": [
    {"year": 2004, "label": "2004", "title": "Жизненный цикл", "detail": "Jones и Rastogi"},
    {"year": 2006, "label": "2006", "title": "SDL / Touchpoints", "detail": "CLASP"},
    {"year": 2012, "label": "2012", "title": "SDL-Agile", "detail": "Руководство v5.2"},
    {"year": 2017, "label": "2017", "title": "Security-by-Design", "detail": "Сингапурский framework"},
    {"year": 2020, "label": "2020", "title": "SAMM v2.0", "detail": "Развитие возможностей"},
    {"year": 2022, "label": "2022", "title": "SSDF v1.1", "detail": "NIST SP 800-218"}
  ],
  "note": "Год публикации или редакции не обязательно совпадает с началом применения практики."
}
```

## ru-gost-timeline

Шкала дополняет точную таблицу §4. История проектов атрибутирована Варенице, а даты принятого документа проверяются по окончательному стандарту.

```json
{
  "id": "ru-gost-timeline", "kind": "timeline", "lang": "ru",
  "alt": "В апреле 2013 года началась НИР, в августе появился первый проект; в 2014–2015 годах продолжались рассмотрение и доработка; 1 июня 2016 года Росстандарт утвердил ГОСТ Р 56939-2016; 1 июня 2017 года стандарт введён в действие. Проектные этапы приведены по докладу Вареницы, две последние даты — по окончательному стандарту.",
  "caption": "Подготовка проекта, утверждение и введение стандарта в действие — разные этапы.",
  "sourceIds": ["TRANS", "GOSTH", "G16"],
  "axis": [2013, 2017],
  "nodes": [
    {"year": 2013, "label": "2013", "title": "НИР и первый проект", "detail": "Апрель · август", "tone": "account"},
    {"year": 2014.5, "label": "2014–2015", "title": "Обсуждение и доработка", "detail": "Рабочие редакции", "tone": "account"},
    {"year": 2016, "label": "1 июня 2016", "title": "Утверждение", "detail": "Росстандарт · № 458-ст", "tone": "formal"},
    {"year": 2017, "label": "1 июня 2017", "title": "Введение в действие", "detail": "ГОСТ Р 56939-2016", "tone": "formal"}
  ],
  "note": "Проектные этапы: доклад Вареницы. Формальные даты: окончательный стандарт."
}
```

## ru-process-loop

Схема §7 показывает организационную устойчивость практики, не противопоставляя редакцию 2016 года якобы исключительно разовым мероприятиям.

```json
{
  "id": "ru-process-loop", "kind": "loop", "lang": "ru",
  "alt": "Поддерживаемый процесс соединяет событие, назначенную работу, зафиксированное решение и пересмотр порядка работы. В центре сохраняется связь с версией продукта и свидетельствами результата.",
  "caption": "Учебная модель поддерживаемого процесса: действия, решения и обратная связь остаются связанными.",
  "sourceIds": ["G24", "EX"],
  "center": "Версия + свидетельства",
  "nodes": [
    {"label": "01", "title": "Событие", "detail": "Изменение, релиз, риск"},
    {"label": "02", "title": "Исполнение", "detail": "Работа и ответственный"},
    {"label": "03", "title": "Решение", "detail": "Результат и действия"},
    {"label": "04", "title": "Пересмотр", "detail": "Следующий цикл работы"}
  ],
  "note": "Запуск инструмента — одно из действий; результаты ещё нужно обработать."
}
```

## ru-planning-evidence

Карта §16 объединяет пять категорий информации. Она подчёркивает содержательные связи и не требует пяти изолированных документов.

```json
{
  "id": "ru-planning-evidence", "kind": "planning", "lang": "ru",
  "alt": "В выбранной области применения анализ исходного состояния и анализ ресурсов поддерживают план развития и план реализации процессов. Все пять категорий информации связаны с продуктом и обоснованием области.",
  "caption": "Пять связанных результатов планирования по процессу 5.1 ГОСТ Р 56939-2024.",
  "sourceIds": ["G24"],
  "nodes": [
    {"label": "5.1.3.1", "title": "Исходное состояние", "detail": "Практики и пробелы"},
    {"label": "5.1.3.2", "title": "Анализ ресурсов", "detail": "Люди, время, средства"},
    {"label": "5.1.3.3", "title": "План развития", "detail": "Приоритеты и очередь"},
    {"label": "5.1.3.4", "title": "План реализации", "detail": "Работы, сроки, участники"},
    {"label": "5.1.3.5", "title": "Область применения", "detail": "Состав и обоснование"}
  ],
  "note": "Пять категорий сведений не означают пять обязательных отдельных файлов."
}
```

## ru-testing-map

Схема §9 связывает метод проверки с объектом внимания. Размещение блоков не изображает стадии зрелости, гарантированное покрытие или обязательный порядок проверок.

```json
{
  "id": "ru-testing-map", "kind": "flow", "lang": "ru",
  "alt": "Четыре взаимодополняющих направления проверки: анализ архитектуры рассматривает решения и границы доверия; статический анализ исследует исходный код; динамические проверки и фаззинг исследуют выполняемую программу; тестирование на проникновение рассматривает сценарии атакующего в заданных условиях.",
  "caption": "Разные методы отвечают на разные вопросы о продукте; их результаты полезны в сочетании.",
  "sourceIds": ["G24", "EX"],
  "nodes": [
    {"label": "АРХИТЕКТУРА", "title": "Решения", "detail": "Границы доверия"},
    {"label": "СТАТИЧЕСКИЙ АНАЛИЗ", "title": "Исходный код", "detail": "Дефекты реализации"},
    {"label": "ДИНАМИКА И ФАЗЗИНГ", "title": "Поведение", "detail": "Входы и исполнение"},
    {"label": "ПЕНТЕСТ", "title": "Сценарии атаки", "detail": "Заданные условия"}
  ],
  "note": "Связанные виды проверки, а не обязательная последовательность или измерение покрытия."
}
```

## ru-response-cycle

Цикл для §18 объединяет работу с сообщениями, решениями, исправлениями и последующим сопровождением. Это учебная схема; конкретные правила задаются применимым процессом и продуктом.

```json
{
  "id": "ru-response-cycle", "kind": "loop", "lang": "ru",
  "alt": "Работа с недостатком связывает регистрацию и анализ сообщения, решение об ответственных и действиях, исправление с проверкой, а затем обновление и сопровождение. Версия продукта и принятое решение должны оставаться прослеживаемыми.",
  "caption": "Учебная схема работы с недостатком на протяжении сопровождения продукта.",
  "sourceIds": ["G24", "EX"],
  "center": "Версия + решение",
  "nodes": [
    {"label": "01", "title": "Сообщение", "detail": "Регистрация и анализ"},
    {"label": "02", "title": "Решение", "detail": "Действия и участники"},
    {"label": "03", "title": "Исправление", "detail": "Изменение и проверка"},
    {"label": "04", "title": "Сопровождение", "detail": "Обновление и обратная связь"}
  ],
  "note": "Конкретный порядок зависит от продукта, риска и применимых условий."
}
```

## ru-practical-plan

Схема §22 демонстрирует одну проверяемую цепочку в практической работе. Сохранена формулировка самостоятельного упражнения про сервис обработки файлов, без переноса часов и сроков английского примера.

```json
{
  "id": "ru-practical-plan", "kind": "flow", "lang": "ru",
  "alt": "Для сервиса обработки файлов выявленный пробел — отсутствие общего порядка обработки предупреждений — связывается с улучшением, задачей с участником и сроком, затем с сохранённым результатом проверки реального изменения.",
  "caption": "Практическая работа: проследите связь от выявленного пробела до результата исполнения.",
  "sourceIds": ["G24", "EX"],
  "nodes": [
    {"label": "ПРОБЛЕМА", "title": "Пробел", "detail": "Нет порядка обработки"},
    {"label": "ПРИОРИТЕТ", "title": "Улучшение", "detail": "Согласовать действия"},
    {"label": "ИСПОЛНЕНИЕ", "title": "Работа", "detail": "Участник и срок"},
    {"label": "ПРОВЕРКА", "title": "Результат", "detail": "Реальное изменение"}
  ],
  "note": "Каждая связь должна объясняться исходным состоянием, областью и доступными ресурсами."
}
```
