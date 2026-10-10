---
title: "IgnoredVulns"
type: "glossary"
tags: [глоссарий, исключения, уязвимости]
status: ready
updated: 2026-06-18
---

# IgnoredVulns

## Термин
- English: ignored vulnerabilities
- Русский вариант: игнорируемые уязвимости

## Определение
IgnoredVulns — перечень уязвимостей, временно исключенных из блокирующих проверок по утвержденному правилу. Такое исключение должно иметь scope, justification, owner, expiry и evidence, иначе оно становится скрытым принятием риска.

## Источник
- [CodeScoring Documentation, Scan command](https://docs.codescoring.ru/en/user-guide/agent/scan)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[VEX]] · [[exception]] · [[Vulnerability triage]]
