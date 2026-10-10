---
title: "direct dependency"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# direct dependency

## Термин
- English: direct dependency
- Русский вариант: прямая зависимость

## Определение
Direct dependency — компонент, который проект явно указывает в manifest, build file, lockfile или настройках сборки. Прямые зависимости проще назначить владельцу, но они могут подтягивать транзитивные компоненты с отдельными уязвимостями и лицензиями.

## Источник
- [CycloneDX Specification Overview](https://cyclonedx.org/specification/overview/)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[transitive dependency]] · [[dependencies]] · [[lockfile]]
