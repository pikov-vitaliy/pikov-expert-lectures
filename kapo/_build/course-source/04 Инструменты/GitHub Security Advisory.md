---
title: "GitHub Security Advisory"
type: tool
tool: "GitHub Security Advisory"
category: vuln-source
offline: partial
status: ready
updated: 2026-06-17
tags: [инструмент]
---

# GitHub Security Advisory

## Для чего
GitHub Security Advisory (GHSA) — это **база уязвимостей с привязкой к экосистемам пакетных менеджеров** (npm, PyPI, Maven, Go, RubyGems, NuGet, Composer, Rust crates и др.). В отличие от NVD, где компонент описан через CPE, GHSA сразу указывает имя пакета в его реестре и затронутые диапазоны версий. Каждой записи присваивается собственный идентификатор `GHSA-xxxx-xxxx-xxxx`, который часто (но не всегда) связан с CVE.

## Как применяют
GHSA доступна через GraphQL API GitHub и используется как один из источников экосистемного матчинга в сканерах (Grype, OSV — GHSA входит в агрегат OSV.dev). Запрос advisory по экосистеме:

```graphql
query {
  securityVulnerabilities(ecosystem: NPM, package: "semver", first: 5) {
    nodes { advisory { ghsaId, identifiers { type value } }
            vulnerableVersionRange, firstPatchedVersion { identifier } }
  }
}
```

Фрагмент ответа (то, что реально потребляет SCA — пакет, диапазон, патч):

```json
{ "advisory": { "ghsaId": "GHSA-c2qf-rxjj-qqgw",
    "identifiers": [{ "type": "CVE", "value": "CVE-2022-25883" }] },
  "vulnerableVersionRange": "< 7.5.2", "firstPatchedVersion": { "identifier": "7.5.2" } }
```

Полная база advisories также выгружается из открытого репозитория `advisory-database` в формате OSV (по файлу на запись), что удобно для офлайн-джойна по PURL.

## Сильные стороны
- Координаты сразу в терминах пакетного менеджера и PURL — точный матчинг для OSS без боли с CPE.
- Часто оперативнее NVD: advisory для OSS-пакета нередко появляется раньше или без CVE вовсе.
- Открытая выгрузка `advisory-database` в формате OSV — единый разбор с OSV.dev.
- Богатые метаданные: затронутые/исправленные версии, ссылки на коммиты-фиксы, severity.

## Ограничения
- Покрывает экосистемы пакетных менеджеров; системные библиотеки C/C++ без реестра и проприетарное ПО — вне охвата.
- Severity и диапазоны заполняют мейнтейнеры/GitHub — возможны неполнота и расхождения с NVD.
- Часть записей не имеет CVE-идентификатора, что усложняет сшивку с источниками, работающими только по CVE.
- Не заменяет национальный источник для требований регулятора (БДУ ФСТЭК).

## Offline / on-premise
Частично. Вся база advisories доступна как открытый Git-репозиторий с записями в формате OSV — его можно полностью зеркалировать в закрытый контур и обновлять по расписанию, затем матчить компоненты локально. Онлайн-обращение к GraphQL API GitHub из изолированной сети недоступно; в нём работают с реплицированным дампом.

## Связанные темы
[[01 Курс/М06 Поиск уязвимостей и управление VDR VEX/00 Карта модуля|М06. Поиск уязвимостей и управление VDR/VEX]] · [[01 Курс/М04 Идентификаторы компонентов и уязвимостей/00 Карта модуля|М04. Идентификаторы компонентов и уязвимостей]]

Смежные карточки: [[04 Инструменты/OSV.dev|OSV.dev]] · [[04 Инструменты/CVE|CVE]] · [[04 Инструменты/NVD|NVD]] · [[04 Инструменты/OSS Index|OSS Index]] · [[04 Инструменты/Package URL|Package URL]] · [[04 Инструменты/Grype|Grype]] · [[04 Инструменты/OSV-Scanner|OSV-Scanner]] · [[04 Инструменты/OpenSSF Scorecard|OpenSSF Scorecard]]

Практики: [[П07. OSV-Scanner и lockfiles]] · [[П06. Grype поверх готового SBOM]] · [[П24. PURL нормализация и private qualifiers]]
