---
title: "dynamic linking"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# dynamic linking

## Термин
- English: dynamic linking
- Русский вариант: динамическая линковка

## Определение
Dynamic linking — связывание программы с библиотекой во время загрузки или выполнения через внешнюю shared library. Для SCA и лицензий C/C++ это влияет на состав поставки, обязательства по notices/source offer и точность binary analysis.

## Источник
- [Linux Foundation, Executable and Linking Format (ELF) Specification](https://refspecs.linuxfoundation.org/elf/elf.pdf)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[static linking]] · [[linking]] · [[ELF]] · [[license compatibility]]
