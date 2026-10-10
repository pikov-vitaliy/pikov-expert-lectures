---
title: "Syft"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# Syft

## Термин
- English: Syft
- Русский вариант: генератор SBOM Syft

## Определение
Syft — CLI-инструмент и Go-библиотека Anchore для генерации SBOM из контейнерных образов и файловых систем. В SCA его часто используют как upstream generator для Grype, поэтому важны формат вывода, qualifiers и полнота catalogers.

## Источник
- [Anchore Syft](https://github.com/anchore/syft)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[Grype]] · [[cdxgen]] · [[CycloneDX]] · [[SPDX]]
