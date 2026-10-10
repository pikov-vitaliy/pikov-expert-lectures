---
title: "binary analysis"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# binary analysis

## Термин
- English: binary analysis
- Русский вариант: анализ бинарных артефактов

## Определение
Binary analysis — исследование скомпилированных файлов, библиотек, контейнеров или архивов без опоры только на исходные манифесты. В SCA для C/C++ он помогает выявлять реально слинкованные библиотеки, vendored code, stripped binaries и расхождения между исходным SBOM и поставочным артефактом.

## Источник
- [CodeScoring Documentation, CLI agent Johnny](https://docs.codescoring.ru/en/user-guide/agent/index)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[ELF]] · [[build scan]] · [[vendored code]] · [[detection confidence]]
