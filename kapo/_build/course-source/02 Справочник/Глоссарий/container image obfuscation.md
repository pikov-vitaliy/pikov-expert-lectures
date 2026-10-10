---
title: "container image obfuscation"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# container image obfuscation

## Термин
- English: container image obfuscation
- Русский вариант: обфускация содержимого контейнерного образа

## Определение
Container image obfuscation — состояние, когда содержимое образа трудно однозначно инвентаризировать: слои непрозрачны, файлы удалены/перепакованы, бинарники stripped, пакеты установлены вне менеджера пакетов или отсутствует metadata. Для SCA это повышает риск неполного SBOM и требует binary/layer analysis.

## Источник
- [Open Container Initiative, Image Format Specification](https://specs.opencontainers.org/image-spec/)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[container image]] · [[image layer]] · [[binary analysis]]
