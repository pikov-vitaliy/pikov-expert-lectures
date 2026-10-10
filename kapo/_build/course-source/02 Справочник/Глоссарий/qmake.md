---
title: "qmake"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# qmake

## Термин
- English: qmake
- Русский вариант: qmake

## Определение
qmake — инструмент Qt, упрощающий кроссплатформенную сборку и генерирующий Makefile из `.pro`/`.pri` описаний. В legacy C++ проектах qmake-файлы являются важным источником зависимостей, include paths и linker flags для SCA.

## Источник
- [Qt Documentation, qmake Manual](https://doc.qt.io/qt-6/qmake-manual.html)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[CMake]] · [[pkg-config]] · [[build scan]]
