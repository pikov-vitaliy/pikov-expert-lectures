---
title: "vcpkg manifests"
type: "cpp-handbook"
tags: [c-cpp, legacy, справочник, vcpkg, сборка]
status: ready
updated: 2026-06-17
---

# vcpkg manifests

## Почему это важно для SCA/OSA
vcpkg в режиме манифеста (`vcpkg.json`) — это попытка дать C/C++ воспроизводимость уровня lock-файла. Но ключевой нюанс для SCA в том, что версии в `vcpkg.json` сами по себе ничего не фиксируют: реальные версии определяет `builtin-baseline` — это git-commit реестра портов. Манифест без baseline означает плавающие версии: на разных машинах и в разное время один и тот же `vcpkg.json` соберёт разный состав. Поэтому для композиционного анализа `vcpkg.json` надо читать в паре с baseline и с `vcpkg.json` блоком `overrides`, который пинит конкретные версии.

Вторая хорошая новость: современный vcpkg при установке порта генерирует per-package SPDX SBOM (`vcpkg.spdx.json`) внутри дерева установки. Это готовое evidence с именами, версиями и лицензиями, которое не нужно реконструировать бинарным анализом.

## Как это проявляется
Версия компонента определяется не строкой `"version>="`, а триадой «baseline + overrides + версионные ограничения»:

```json
{
  "name": "demo-app",
  "version-string": "0.1.0",
  "dependencies": [ "openssl", "fmt", { "name": "zlib", "version>=": "1.3" } ],
  "builtin-baseline": "a1b2c3d4...",
  "overrides": [ { "name": "openssl", "version": "3.2.1" } ]
}
```

`builtin-baseline` — это git commit реестра портов, который задаёт версии по умолчанию; `overrides` — жёсткий пин конкретной зависимости.

> [!example] Где брать фактические версии и SBOM
> ```bash
> vcpkg install        # в каталоге с vcpkg.json: ставит зависимости по baseline в vcpkg_installed/
> # после установки:
> find . -name vcpkg.spdx.json        # per-package SPDX SBOM каждого порта
> cat vcpkg_installed/<triplet>/share/openssl/vcpkg.spdx.json | jq '.packages[].versionInfo'
> ```
> `vcpkg.spdx.json` отдаёт имя, версию и лицензию порта — это первичный источник состава, точнее, чем разбор `vcpkg.json`.

## Слепая зона или приём
Слепая зона — манифест без `builtin-baseline`. Версии в нём плавают, и зафиксированный однажды SBOM перестаёт соответствовать тому, что соберётся завтра. Вторая ловушка — читать только `vcpkg.json` и игнорировать `vcpkg-configuration.json`, где могут быть подключены приватные registries: оттуда приходят порты, которых нет в публичном реестре, и их версии/лицензии нужно проверять отдельно.

> [!tip] Берите SBOM из дерева установки, а не из манифеста
> Источник истины — `vcpkg.spdx.json` после установки плюс зафиксированный baseline. Разбор `vcpkg.json` руками — только дополнение: он не знает, во что baseline развернул диапазоны.

## Что делать на проекте
1. Проверьте наличие `builtin-baseline` в `vcpkg.json`; его отсутствие — повод понизить confidence (версии плавают).
2. Соберите все `vcpkg.spdx.json` из `vcpkg_installed/` как первичное evidence: имя, версия, лицензия каждого порта.
3. Сверьте `overrides` — это жёсткие пины, они переопределяют baseline.
4. Откройте `vcpkg-configuration.json`: при наличии приватных registries отметьте их порты для отдельной проверки версий и лицензий.
5. Сопоставьте состав из SPDX с `ldd` готового артефакта — статически слинкованные порты в `ldd` не появятся, их даёт только SBOM установки.
6. Зафиксируйте baseline-commit в provenance сборки, чтобы SBOM был воспроизводим.

## Связь
- Модуль: [[01 Курс/М09 C и C++ legacy без дисциплины пакетного менеджера/00 Карта модуля|М09. C/C++ legacy]]
- Практики: [[П19. C C++ make build inventory]] · [[П04. Генерация SBOM через cdxgen для C C++]] · [[П21. Conan graph и package identity]]
- Нормативка: [[05 Нормативка/ГОСТ Р 56939-2024]] · [[05 Нормативка/BSI TR-03183-2 v2.1.0]] · [[05 Нормативка/SPDX ISO IEC 5962]] · [[05 Нормативка/NIST SP 800-218 SSDF]]
- Смежные заметки: [[06 C C++ legacy/Conan recipe package id graph|Conan package id graph]] · [[06 C C++ legacy/CMake target_link_libraries|CMake target_link_libraries]] · [[06 C C++ legacy/статическая линковка|статическая линковка]] · [[06 C C++ legacy/version normalization|version normalization]]
