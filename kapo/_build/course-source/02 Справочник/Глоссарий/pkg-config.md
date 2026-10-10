---
title: "pkg-config"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# pkg-config

## Термин
- English: pkg-config
- Русский вариант: pkg-config

## Определение
pkg-config — helper tool, используемый при компиляции и линковке приложений и библиотек для подстановки корректных compiler/linker options. В SCA C/C++ `.pc`-файлы могут раскрывать скрытые библиотеки, include paths и версии зависимостей.

## Источник
- [freedesktop.org, pkg-config](https://www.freedesktop.org/wiki/Software/pkg-config/)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[CMake]] · [[qmake]] · [[ELF]] · [[dynamic linking]]
