# Стандарт авторского учебного материала pikov.expert

Статус: обязательный внутренний baseline для новых и актуализируемых курсов.

Этот документ не заменяет предметную экспертизу конкретной лекции. Он задаёт
минимальную структуру, по которой материал можно безопасно преподавать,
самостоятельно изучать, проверять и обновлять без привязки к конкретной дате
занятия или учебному центру.

## 1. Инварианты

1. Автор материала — В. А. Пиков; организация может упоминаться только как
   источник, исторический контекст или учебный пример, но не как владелец курса.
2. Учебная страница evergreen: календарные даты занятия не показываются.
   Сохраняются версии стандартов, даты публикации источников, lifecycle и даты
   вступления норм в силу, если без них утверждение становится неточным.
3. Международный baseline основной. Российские требования оформляются как
   отдельный local-compliance profile с областью применимости.
4. Любое hands-on действие выполняется только в owned/local sandbox. Внешние
   адреса, рабочие сервисы и данные не являются учебными целями.
5. Слайды и раздаточный материал решают разные задачи: проектор не используется
   как мелко набранный справочник, а handout не ограничивается одной мыслью на
   экран.

## 2. Паспорт курса

На стартовой странице должны быть явно видимы:

- аудитория и привязка к рабочим ролям;
- prerequisites, включая технические и безопасностные предпосылки;
- длительность в академических часах или относительных блоках;
- 3–5 измеримых learning outcomes с глаголами действия;
- итоговый артефакт слушателя;
- способ оценки и минимальный проходной критерий;
- версия стенда и primary sources;
- offline fallback.

Для профессиональных ролей используется актуальная версия
[NICE Framework Components](https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-resource-center/nice-framework-current-versions).
Особенно релевантны competency areas DevSecOps, Cryptography и Cyber Resiliency,
а для SCA/SBOM — work role Cybersecurity Supply Chain Risk Management.

## 3. Проверяемая конструкция занятия

Каждый outcome оформляется одной строкой:

`Outcome → активность → артефакт → критерий → primary source`.

Пример для secure C/C++:

`Объяснить root cause CWE-787 → исправить bounded-write дефект → patch + negative test + sanitizer log → ASan/UBSan clean, регрессия воспроизводится до исправления и не воспроизводится после → CWE-787 + CERT C + NIST SSDF PW.7/PW.8`.

Недостаточно оценивать «найденный флаг» или успешный запуск инструмента. Нужно
оценивать причинное объяснение, доказательство, исправление и retest.

## 4. Архитектура публичного курса

1. `index` — паспорт, outcomes и карта маршрутов.
2. `slides` — проекционная версия; одна ключевая мысль на экран.
3. `handout` — объяснения, таблицы, команды, ограничения и primary sources.
4. `practice` — исходное состояние, задача, evidence, checkpoints и rollback.
5. `assessment` — pretest, formative checks, post-test и rubric.
6. `teacher` — маршрут преподавателя, вопросы, типовые ошибки и fallback.
7. `sources` — version passport и карта `claim → primary source`.
8. `downloads` — только проверенный student package.
9. `archive` — provenance и исторические расписания, отделённые от курса.

Если все части пока не вынесены в отдельные страницы, стартовая страница должна
давать ссылки или якоря на эквивалентные разделы.

## 5. Контракт безопасного практикума

До первой команды студент видит:

- цель и разрешённый target allowlist;
- RoE и запрет на внешние/рабочие адреса;
- изоляцию сети и отсутствие egress, если он не нужен;
- pinned image/version/digest и проверку целостности;
- least privilege, resource limits и synthetic data;
- preflight с ожидаемым результатом;
- stop condition;
- ownership-aware cleanup и rollback;
- перечень собираемых доказательств без секретов и персональных данных.

Минимальный цикл:

`pre-state → изменение/проверка → positive test → negative test → evidence → remediation → retest → cleanup`.

Для attack-oriented практики дополнительно обязательны scope, письменное
разрешение, запрет persistence/credential reuse и прекращение после минимального
доказательства. Методическая опора —
[NIST SP 800-115](https://csrc.nist.gov/pubs/sp/800/115/final),
[OWASP WSTG](https://owasp.org/www-project-web-security-testing-guide/) и
[OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/).

## 6. Международный baseline по направлениям

| Направление | Основная опора | Проверяемый учебный результат |
|---|---|---|
| SSDLC / DevSecOps | [NIST SSDF](https://csrc.nist.gov/projects/ssdf/publications), OWASP SAMM, ISO/IEC 27034 | security requirement, design review, verification evidence, vulnerability response |
| Web/AppSec | [OWASP Top 10:2025](https://owasp.org/Top10/), ASVS, WSTG | finding с точным ID, root cause, fix, negative test и retest |
| Threat modeling | [NIST SP 800-154](https://csrc.nist.gov/pubs/sp/800/154/ipd), **Initial Public Draft** (не финальный baseline); MITRE ATT&CK current version; OWASP Threat Modeling | DFD/trust boundaries, abuse cases, mitigations и assumptions |
| Secure C/C++ | CWE, CERT C/C++, MISRA C/C++, compiler/sanitizer guidance | устранённый memory-safety root cause и clean dynamic-analysis evidence |
| Supply chain | SSDF PS.3, SLSA, CycloneDX/SPDX, OSV/NVD/CVE | SBOM, provenance, admission decision и update/notification plan |
| Risk / IR | NIST SP 800-30 Rev.1, CSF 2.0, SP 800-61r3 | risk register, treatment decision, playbook и after-action evidence |
| Workforce | NICE Framework current components | mapping outcome к role/competency/TKS, а не только к теме лекции |

Для SSDF и других публикаций NIST использовать текущую финальную редакцию;
draft-редакции маркировать как draft и не выдавать за действующий baseline. Для OWASP и ATT&CK указывать
versioned permalink или проверять current version перед публикацией.

## 7. SCA, SBOM и лицензии

Практика должна охватывать direct и transitive dependencies и разделять:

1. идентификацию компонента и версии;
2. происхождение и целостность;
3. CVE/OSV/NVD enrichment и exploitability context;
4. лицензию, notice/attribution и совместимость;
5. решение о допуске, владельца и срок пересмотра;
6. обновление, отзыв и уведомление потребителей.

Минимальный артефакт: versioned SBOM в CycloneDX или SPDX + policy decision +
evidence источника компонента. OpenSSF Scorecard является сигналом практик
проекта, но не доказательством целостности артефакта. SLSA provenance является
attestation о происхождении/build process, но не заменяет анализ уязвимостей и
лицензий.

## 8. Проектор, mobile и доступность

- основной текст проекционных слайдов: целевой минимум 28 px;
- заголовок: 44–56 px;
- таблица, которую нельзя прочитать с последнего ряда, переносится в handout;
- один `<h1>`, логичная иерархия заголовков и `<main>`;
- `lang` документа соответствует языку активной версии страницы
  ([WCAG 2.2 SC 3.1.1](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html)),
  а иноязычные смысловые фрагменты при необходимости имеют собственный `lang`
  ([WCAG 2.2 SC 3.1.2](https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html));
- bilingual root публикует отдельные устойчивые English/Russian URL с
  `lang="en"`/`lang="ru"`, self-canonical и взаимно согласованными
  `hreflang="en"`, `hreflang="ru"`, `hreflang="x-default"`;
- таблицы имеют `<th>` и `scope`;
- обычный текст соответствует WCAG 2.2 SC 1.4.3 (не менее 4,5:1);
- keyboard focus видим; смысловые SVG имеют доступное имя/альтернативу;
- mobile получает reflow/handout, а не уменьшенный до нескольких пикселей
  фиксированный слайд;
- PDF/DOCX не содержат comments, tracked changes и персональные metadata;
  смысловые изображения имеют alt, документы — язык, заголовки и навигацию.

## 9. Единая rubric, 100 баллов

| Критерий | Баллы |
|---|---:|
| Scope, assumptions и безопасная подготовка | 15 |
| Техническая корректность и воспроизводимость | 25 |
| Evidence: команды, версии, логи, positive/negative tests | 20 |
| Root cause и связь с CWE/ASVS/SSDF/контролем | 15 |
| Исправление, retest и отсутствие регрессии | 15 |
| Качество отчёта, ограничения и cleanup | 10 |

Проходной порог: 70/100 при обязательном выполнении безопасностных критериев.
Нарушение scope/RoE, внешний target или публикация секрета дают `STOP`, а не
компенсируются баллами в других категориях.

## 10. Definition of Done публикации

- focused regression test показал RED до исправления и GREEN после;
- source, archive manifest и release package согласованы по
  `sourceCommit`, `sourceRef`, per-target `sourceTreeSha256` и archive SHA-256;
- ссылки, browser viewports, keyboard, contrast и console проверены;
- PDF/DOCX прошли all-page render и privacy/a11y checks;
- public-independence gate исключает некорректную организационную атрибуцию и
  брендинг; нейтральные примеры компаний допустимы при явном авторстве
  Виталия Пикова;
- commit опубликован, CI точного SHA зелёный;
- candidate release имеет `policyDecision=deny-deploy` и `deployable=false`;
- accepted release собран из чистого tracked tree с явно переданным exact
  accepted SHA, имеет `policyDecision=allow-deploy` и `deployable=true`;
- deploy fail closed проверил тот же SHA через `-ExpectedSourceCommit` до
  обращения к хостингу;
- развернут именно принятый SHA, а уникальное deploy evidence содержит UTC,
  область публикации и per-target source/archive hashes;
- live hash/header/link/browser checks зелёные;
- `main == origin/main`, а рабочее дерево чисто кроме явно непубличных данных.

Нормативная опора controlled release: NIST SSDF
[PS.3](https://csrc.nist.gov/pubs/sp/800/218/final) требует архивировать и
защищать каждый release, а PW.8 — проверять исполняемый код на уязвимости.
Exact-SHA provenance, воспроизводимый manifest, fail-closed policy и
послерелизная проверка являются доказательствами этих практик; они не заменяют
предметное тестирование. Языковые gates реализуют WCAG 2.2 SC 3.1.1/3.1.2.
