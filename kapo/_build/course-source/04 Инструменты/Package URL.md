---
title: "Package URL"
type: tool
tool: "Package URL"
category: identifier
offline: yes
status: ready
updated: 2026-06-17
tags: [инструмент]
---

# Package URL

## Для чего
Package URL (purl) — детерминированная схема координат пакета: по типу экосистемы, имени и версии она указывает на конкретный артефакт в конкретном реестре. В отличие от назначаемых вручную строк [[04 Инструменты/CPE|CPE]], purl вычисляется из метаданных пакета однозначно, поэтому служит первичным ключом компонента в [[04 Инструменты/CycloneDX|CycloneDX]] и [[04 Инструменты/SPDX|SPDX]] и ключом запроса к [[04 Инструменты/OSV.dev|OSV.dev]].

## Как применяют
Каноническая форма: `pkg:type/namespace/name@version?qualifiers#subpath`. Примеры по экосистемам:

```
pkg:npm/lodash@4.17.21
pkg:npm/%40angular/core@17.0.0          # @scope кодируется как %40
pkg:pypi/requests@2.31.0
pkg:maven/org.apache.commons/commons-lang3@3.14.0
pkg:conan/zlib@1.3.1?channel=stable     # C/C++ через Conan
pkg:generic/openssl@3.0.13?download_url=https%3A%2F%2Fdownloads.example.com%2Fopenssl-3.0.13.tar.gz&checksum=sha256:...
```

Ключевые правила: `type` и `name` обязательны; `namespace` зависит от экосистемы (Maven groupId, npm scope); `qualifiers` несут уточнения (`arch`, `repository_url`, `channel`); при нормализации регистр и кодирование приводятся к канону, иначе одна зависимость двоится. В SBOM purl кладётся в `components[].purl`.

## Сильные стороны
- Детерминизм: одинаковый артефакт даёт одинаковую строку — корректная дедупликация и стабильное сопоставление с OSV.
- Покрывает десятки экосистем (`npm`, `pypi`, `maven`, `nuget`, `golang`, `deb`, `conan`, `generic`).
- `pkg:generic` и `qualifiers` (`download_url`, `checksum`) позволяют идентифицировать вендорённые исходники, у которых нет реестра.

## Ограничения
- Не адресует ОС и аппаратные платформы — здесь нужен CPE (`part:o`, `part:h`).
- Для C/C++ без пакетного менеджера каноничного purl часто нет; `pkg:generic` спасает лишь при наличии устойчивого `download_url`/`checksum`.
- Расхождения в кодировании (`%40`, регистр, лишние `qualifiers`) ломают дедупликацию, если не нормализовать.

## Offline / on-premise
Схема не требует сети: purl формируется из локальных метаданных пакета (lockfile, манифест) при генерации SBOM в закрытом контуре. Сетевой доступ нужен лишь следующему шагу — запросу к источнику уязвимостей по этому purl, который тоже разворачивается локально (зеркало OSV).

## Связанные темы
[[01 Курс/М04 Идентификаторы компонентов и уязвимостей/00 Карта модуля|М04 Идентификаторы компонентов и уязвимостей]] · [[01 Курс/М03 Форматы SBOM CycloneDX, SPDX, SWID/00 Карта модуля|М03 Форматы SBOM]] · [[01 Курс/М09 C и C++ legacy без дисциплины пакетного менеджера/00 Карта модуля|М09 C/C++ legacy]]
Практики: [[П24. PURL нормализация и private qualifiers]] · [[П21. Conan graph и package identity]]
Смежные карточки: [[04 Инструменты/CPE|CPE]] · [[04 Инструменты/CycloneDX|CycloneDX]] · [[04 Инструменты/SPDX|SPDX]] · [[04 Инструменты/OSV.dev|OSV.dev]] · [[04 Инструменты/Conan|Conan]]
