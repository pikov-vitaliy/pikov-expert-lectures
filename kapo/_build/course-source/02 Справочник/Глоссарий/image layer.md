---
title: "image layer"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# image layer

## Термин
- English: image layer
- Русский вариант: слой контейнерного образа

## Определение
Image layer — файловый changeset, входящий в состав контейнерного образа. Для SCA анализ слоев важен, потому что компонент может появиться и затем быть удален в последующих слоях, а secrets или уязвимые файлы могут остаться в истории образа.

## Источник
- [Open Container Initiative, Image Layer Filesystem Changeset](https://specs.opencontainers.org/image-spec/layer/)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[container image]] · [[container image obfuscation]] · [[hashes]]
