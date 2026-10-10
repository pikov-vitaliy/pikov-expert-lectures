---
title: "vendored code"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# vendored code

## Термин
- English: vendored code
- Русский вариант: вендоризованный код

## Определение
Vendored code — сторонний код, скопированный внутрь репозитория продукта вместо подключения через package manager. В SCA он опасен тем, что не виден через обычные manifest/lockfile и требует source/binary matching, license scan и отдельного ownership.

## Источник
- [ScanCode Toolkit documentation](https://scancode-toolkit.readthedocs.io/)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[fork]] · [[binary analysis]] · [[static linking]] · [[ScanCode]]
