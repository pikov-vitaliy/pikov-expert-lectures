---
title: "false negative"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# false negative

## Термин
- English: false negative
- Русский вариант: ложноотрицательный результат

## Определение
False negative — ситуация, когда инструмент должен был обнаружить угрозу, уязвимость или компонент, но не сделал этого. В SCA это особенно опасно для C/C++ и контейнеров, где зависимость может быть спрятана в бинарнике, слое образа или vendored source.

## Источник
- [NIST CSRC Glossary, false negative](https://csrc.nist.gov/glossary/term/false_negative)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[false positive]] · [[detection confidence]] · [[binary analysis]]
