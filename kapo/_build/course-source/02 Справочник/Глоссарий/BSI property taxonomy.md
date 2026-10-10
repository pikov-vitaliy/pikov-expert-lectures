---
title: "BSI property taxonomy"
type: "glossary"
tags: [глоссарий, bsi, cyclonedx, sbom-quality]
status: ready
updated: 2026-06-18
---

# BSI property taxonomy

## Термин
- English: BSI property taxonomy
- Русский вариант: таксономия свойств BSI

## Определение
BSI property taxonomy — набор дополнительных свойств, которыми BSI TR-03183-2 уточняет SBOM-сведения, не всегда покрытые нативными полями формата. В CycloneDX такие признаки обычно кодируются через `properties`, поэтому quality gate должен проверять не только JSON-схему, но и профиль BSI.

## Источник
- [BSI TR-03183-2 v2.1.0, Software Bill of Materials (SBOM)](https://www.bsi.bund.de/SharedDocs/Downloads/EN/BSI/Publications/TechGuidelines/TR03183/BSI-TR-03183-2_v2_1_0.html)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[CycloneDX]] · [[SPDX]] · [[metadata]]
