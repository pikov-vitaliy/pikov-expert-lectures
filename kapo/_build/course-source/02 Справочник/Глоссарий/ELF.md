---
title: "ELF"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# ELF

## Термин
- English: Executable and Linkable Format (ELF)
- Русский вариант: исполняемый и компонуемый формат ELF

## Определение
ELF — формат объектных файлов, исполняемых файлов, shared libraries и core dumps в Unix/Linux-системах. Для SCA C/C++ он важен при binary analysis: по ELF можно исследовать секции, символы, зависимости и признаки компоновки.

## Источник
- [Linux Foundation, Executable and Linking Format (ELF) Specification](https://refspecs.linuxfoundation.org/elf/elf.pdf)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[dynamic linking]] · [[static linking]] · [[binary analysis]] · [[linking]]
