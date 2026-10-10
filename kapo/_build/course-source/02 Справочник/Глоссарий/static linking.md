---
title: "static linking"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# static linking

## Термин
- English: static linking
- Русский вариант: статическая линковка

## Определение
Static linking — включение объектного кода библиотеки непосредственно в итоговый исполняемый файл или библиотеку на этапе линковки. Для SCA C/C++ это усложняет обнаружение компонентов и может менять лицензионные обязательства по copyleft/source offer.

## Источник
- [Linux Foundation, Executable and Linking Format (ELF) Specification](https://refspecs.linuxfoundation.org/elf/elf.pdf)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[dynamic linking]] · [[linking]] · [[copyleft]] · [[vendored code]]
