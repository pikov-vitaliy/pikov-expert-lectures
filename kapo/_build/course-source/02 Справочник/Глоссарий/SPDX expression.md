---
title: "SPDX expression"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# SPDX expression

## Термин
- English: SPDX License Expression
- Русский вариант: лицензионное выражение SPDX

## Определение
SPDX expression — формальный способ записывать лицензионные условия, включая множественные лицензии, операторы `AND`/`OR` и exceptions. В SCA такие выражения позволяют машинно проверять license policy и различать dual-license от combined obligations.

## Источник
- [SPDX Specification 2.3, Annex D: SPDX License Expressions](https://spdx.github.io/spdx-spec/v2.3/SPDX-license-expressions/)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[SPDX License List]] · [[declared license]] · [[license compatibility]]
