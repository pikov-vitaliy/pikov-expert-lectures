---
title: "policy as code"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# policy as code

## Термин
- English: policy as code
- Русский вариант: политика как код

## Определение
Policy as code — представление требований безопасности и compliance в машинно-исполняемых правилах, применяемых автоматически в CI/CD, registry или SCA-платформе. Для SCA это позволяет одинаково проверять лицензии, CVSS/EPSS/KEV, source trust, exceptions и SBOM quality.

## Источник
- [NIST SP 800-218, Secure Software Development Framework (SSDF) 1.1](https://csrc.nist.gov/pubs/sp/800/218/final)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[policy]] · [[security gate]]
