---
title: "lockfile"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# lockfile

## Термин
- English: lockfile
- Русский вариант: файл фиксации зависимостей

## Определение
Lockfile — файл, фиксирующий точные версии и иногда integrity-хэши зависимостей, выбранные package manager. В SCA lockfile обычно надежнее manifest для определения реально используемых версий, но его нужно сверять со сборочным артефактом.

## Источник
- [npm Docs, package-lock.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[package manager]] · [[direct dependency]] · [[transitive dependency]]
