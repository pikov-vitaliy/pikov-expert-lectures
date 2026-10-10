---
title: "CycloneDX-first"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# CycloneDX-first

## Термин
- English: CycloneDX-first
- Русский вариант: подход с приоритетом CycloneDX

## Определение
CycloneDX-first — методический выбор, при котором основным рабочим форматом SBOM является CycloneDX, а экспорт в SPDX/ППК строится как производный артефакт. Такой подход оправдан, когда важны VEX, dependency graph, services, properties, evidence и расширения для supply chain risk.

## Источник
- [CycloneDX Specification Overview](https://cyclonedx.org/specification/overview/)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[CycloneDX]] · [[SPDX]] · [[sbom enrichment]]
