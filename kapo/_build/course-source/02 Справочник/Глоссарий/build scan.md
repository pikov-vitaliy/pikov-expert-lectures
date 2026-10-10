---
title: "build scan"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# build scan

## Термин
- English: build scan
- Русский вариант: сканирование сборки

## Определение
Build scan — проверка проекта на этапе сборки, когда доступны фактические манифесты, lockfile, бинарные зависимости и параметры компоновки. Для C/C++ это критичнее простого source scan, потому что часть зависимостей проявляется только через CMake/qmake/pkg-config, Conan, статическую или динамическую линковку.

## Источник
- [CodeScoring Documentation, Integration stages](https://docs.codescoring.ru/integration-stages/)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[CMake]] · [[binary analysis]] · [[CodeScoring]] · [[Johnny]]
