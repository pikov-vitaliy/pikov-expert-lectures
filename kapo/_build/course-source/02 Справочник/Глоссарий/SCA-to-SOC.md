---
title: "SCA-to-SOC"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# SCA-to-SOC

## Термин
- English: SCA-to-SOC
- Русский вариант: передача SCA-сигналов в SOC

## Определение
SCA-to-SOC — процесс передачи значимых результатов SCA в vulnerability management/SOC: KEV, эксплуатируемые CVE, вредоносные пакеты, supply chain incidents и нарушения policy. Важно передавать не сырые шумные findings, а нормализованные события с component identity, reachability, owner и recommended action.

## Источник
- [OASIS, Common Security Advisory Framework Version 2.0](https://docs.oasis-open.org/csaf/csaf/v2.0/os/csaf-v2.0-os.html)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[Vulnerability triage]] · [[KEV]] · [[CSAF]] · [[malware]]
