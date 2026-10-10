---
title: "OSA Proxy"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# OSA Proxy

## Термин
- English: Open Source Analysis Proxy (OSA Proxy)
- Русский вариант: прокси OSA для пакетных менеджеров

## Определение
OSA Proxy — сервис CodeScoring между пакетными менеджерами и удаленными репозиториями, который анализирует загружаемые компоненты и блокирует небезопасные пакеты по политикам. Это preventive OSA-контроль до попадания зависимости в сборку.

## Источник
- [CodeScoring Documentation, OSA Proxy overview](https://docs.codescoring.ru/en/user-guide/osa-proxy/index)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[OSA]] · [[controlled repository]] · [[CodeScoring]] · [[dependency confusion]]
