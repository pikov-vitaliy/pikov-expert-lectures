---
title: "transitive dependency"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# transitive dependency

## Термин
- English: transitive dependency
- Русский вариант: транзитивная зависимость

## Определение
Transitive dependency — компонент, который не указан проектом напрямую, но подтягивается через другую зависимость. В SCA такие компоненты часто являются основным источником неожиданных уязвимостей, license obligations и сложности remediation.

## Источник
- [CycloneDX Specification Overview](https://cyclonedx.org/specification/overview/)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[direct dependency]] · [[dependencies]] · [[package manager]]
