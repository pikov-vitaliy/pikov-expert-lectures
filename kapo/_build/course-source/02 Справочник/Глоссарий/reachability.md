---
title: "reachability"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# reachability

## Термин
- English: reachability
- Русский вариант: достижимость уязвимого кода

## Определение
Reachability — анализ того, может ли потенциально уязвимый код реально выполняться из приложения. В SCA он помогает снизить шум, но не отменяет необходимость patch/remediation, если exploitability не доказана достаточно надежно.

## Источник
- [CodeScoring Documentation, Vulnerability reachability analysis](https://docs.codescoring.ru/agent/reachability.en/)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[VEX]] · [[Vulnerability triage]] · [[binary analysis]]
