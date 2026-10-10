---
title: "OSS Review Toolkit"
type: tool
tool: "OSS Review Toolkit"
category: license
offline: partial
status: ready
updated: 2026-06-17
tags: [инструмент]
---

# OSS Review Toolkit

> [!info] Роль в линейке лицензионных инструментов
> ORT (OSS Review Toolkit) — это **оркестратор и исполняемая политика**. Там, где [[04 Инструменты/ScanCode Toolkit|ScanCode]] отвечает «какая лицензия найдена», ORT отвечает «можно ли с этим набором лицензий выпускаться» — и превращает ответ в падающий или зелёный CI-gate. ScanCode он использует как один из встроенных сканеров.

## Для чего
Сквозной конвейер лицензионного и зависимостного анализа: строит дерево зависимостей из реальных lock-файлов, досканирует исходники детектором лицензий, прогоняет результат через политику на Kotlin DSL и генерирует отчёты. Главная ценность — этап `evaluate`: правила вычисляют из набора лицензий нарушения (violations) с уровнем `ERROR`/`WARNING`/`HINT`, на которых строится воспроизводимый CI-gate.

## Как применяют
Конвейер из четырёх стадий `analyze → scan → evaluate → report`:

```bash
ort analyze  -i . -o out/                       # дерево зависимостей + заявленные лицензии
ort scan     -i out/analyzer-result.yml -o out/ # детектор лицензий по исходникам
ort evaluate -i out/scan-result.yml -o out/ \
  --rules-file curations/rules.kts \
  --license-classifications-file curations/license-classifications.yml
ort report   -i out/evaluation-result.yml -o out/ -f WebApp,CycloneDX,SpdxDocument
```

Правило политики (`rules.kts`) — блокировать strong copyleft в проприетарной поставке:

```kotlin
fun RuleSet.copyleftRule() = packageRule("STRONG_COPYLEFT_IN_DISTRIBUTION") {
    licenseRule("STRONG_COPYLEFT", LicenseView.CONCLUDED_OR_DECLARED_AND_DETECTED) {
        require { isStrongCopyleft() }   // класс из license-classifications.yml
        error("Лицензия ${license} класса strong copyleft в ${pkg.id.toCoordinates()}.",
              "Получить юридическое заключение либо заменить компонент.")
    }
}
```

`ort evaluate` завершается ненулевым кодом при наличии violations (например, `echo $?` → `2` для severity ERROR) — именно этот код останавливает pipeline.

## Сильные стороны
- Исполняемая политика: лицензионное решение записано в `rules.kts`, версионируется в git и применяется одинаково на каждом прогоне — gate падает по правилу, а не по чьему-то мнению.
- Курации (`CONCLUDED_OR_DECLARED_AND_DETECTED`) поднимают ручной concluded-вердикт выше машинной находки — мост между detected (ScanCode) и concluded (заключение юриста).
- Одна команда покрывает весь путь: разбор зависимостей, детекция лицензий, оценка политикой, отчёты в WebApp/CycloneDX/SPDX.
- Готов к CI: код возврата и машинный `evaluation-result.yml` встраиваются в pipeline без обвязки.

## Ограничения
- Высокий порог входа: политика — это Kotlin DSL, синтаксис чувствителен к версии ORT, правила из старых примеров копировать вслепую нельзя.
- Без подключённого `license-classifications.yml` правила вроде `isStrongCopyleft()` не на что опереться — violations будет `0`, и copyleft пройдёт незамеченным (ложноотрицательно, а не «чисто»).
- Качество зависит от lock-файлов: если `analyze` не нашёл `package-lock.json`/`go.sum`, дерево зависимостей пустое.
- Это батч-инструмент для CI и аналитика, а не интерактивный clearing с reviewer-ом и историей решений по файлам — для этого служит FOSSology.

## Offline / on-premise
Частично. Стадии `scan` и `evaluate` локальны, но `analyze` по умолчанию обращается к реестрам пакетов для разрешения зависимостей, а advisor подтягивает данные об уязвимостях из внешних фидов. В закрытом контуре ORT работает только при наличии зеркал пакетных менеджеров и локальных кэшей; без них стадия `analyze` неполна. Запускается официальным контейнером `ghcr.io/oss-review-toolkit/ort:latest` или собирается под JDK 17+.

## Связанные темы
- Модули: [[01 Курс/М07 Лицензионная чистота и юридический workflow/00 Карта модуля|М07 Лицензионная чистота и юридический workflow]] · [[01 Курс/М05 Инструменты генерации SBOM/00 Карта модуля|М05 Инструменты генерации SBOM]]
- Практики: [[П12. ORT и license policy]] · [[П11. ScanCode для лицензий]] · [[П26. Лицензионная классификация]] · [[П27. Юридическое заключение и реестр лицензий]]
- Смежные карточки: [[04 Инструменты/ScanCode Toolkit]] · [[04 Инструменты/FOSSology]] · [[04 Инструменты/Eclipse SW360]] · [[04 Инструменты/CycloneDX]] · [[04 Инструменты/SPDX]]
