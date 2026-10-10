---
title: "package manager"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# package manager

## Термин
- English: package manager
- Русский вариант: пакетный менеджер

## Определение
Package manager — инструмент, который разрешает, скачивает, устанавливает и обновляет зависимости из package registry. В SCA пакетный менеджер является источником manifest/lockfile и одновременно точкой риска dependency confusion, typosquatting и неконтролируемых обновлений.

## Источник
- [OSV-Scanner documentation](https://google.github.io/osv-scanner/)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[lockfile]] · [[Conan]] · [[PURL]] · [[dependency confusion]]
