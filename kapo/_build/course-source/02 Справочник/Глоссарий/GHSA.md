---
title: "GHSA"
type: "glossary"
tags: [глоссарий, уязвимости, identifiers]
status: ready
updated: 2026-06-18
---

# GHSA

## Термин
- English: GitHub Security Advisory (GHSA)
- Русский вариант: идентификатор GitHub Security Advisory

## Определение
GHSA — уникальный идентификатор advisory в GitHub Advisory Database с форматом `GHSA-xxxx-xxxx-xxxx`. В SCA он часто связывается с CVE и OSV, а для open source экосистем может появляться раньше классических записей NVD.

## Источник
- [GitHub Docs, About the GitHub Advisory Database](https://docs.github.com/en/code-security/security-advisories/working-with-global-security-advisories-from-the-github-advisory-database/about-the-github-advisory-database)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[OSV]] · [[CVE]] · [[BDU]]
