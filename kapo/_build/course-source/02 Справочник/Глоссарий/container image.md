---
title: "container image"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# container image

## Термин
- English: container image
- Русский вариант: контейнерный образ

## Определение
Container image — переносимый пакет для запуска контейнера, состоящий из manifest/config и набора файловых слоев. В SBOM/ППК образ нужно анализировать не только как имя и тег, но и как digest, слои, ОС-пакеты, языковые зависимости и встроенные бинарные файлы.

## Источник
- [Open Container Initiative, Image Format Specification](https://specs.opencontainers.org/image-spec/)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[image layer]] · [[container image obfuscation]] · [[honest SBOM]] · [[immutability]]
