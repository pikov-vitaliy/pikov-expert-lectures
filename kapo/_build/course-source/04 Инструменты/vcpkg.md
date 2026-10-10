---
title: "vcpkg"
type: tool
tool: "vcpkg"
category: cpp-build
offline: yes
status: ready
updated: 2026-06-17
tags: [инструмент]
---

# vcpkg

> [!info] Контекст
> vcpkg — пакетный менеджер для C/C++ от Microsoft. В manifest‑режиме состав зависимостей объявлен в `vcpkg.json`, а версии пинуются через baseline и overrides в `vcpkg-configuration.json`. Ключевая для SCA особенность: vcpkg сам генерирует SPDX‑SBOM на каждый установленный порт — редкая ситуация, когда C/C++ зависимость приходит вместе с готовым машиночитаемым описанием.

## Для чего
vcpkg собирает и устанавливает C/C++ библиотеки из «портов», интегрируется с CMake через toolchain‑файл и выдаёт цели для линковки. Для инвентаризации он ценен тем, что фиксирует версии (baseline) и кладёт рядом с каждым пакетом SPDX‑документ, описывающий компонент и его происхождение.

## Как применяют
Manifest‑режим с воспроизводимыми версиями:
```jsonc
// vcpkg.json
{
  "dependencies": ["openssl", "zlib", { "name": "boost-asio", "version>=": "1.84.0" }],
  "builtin-baseline": "a1b2c3d4e5f6..."
}
```
Установка и интеграция со сборкой:
```bash
vcpkg install --triplet x64-linux
cmake -B build -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake
```
После установки SBOM каждого порта лежит здесь:
```text
vcpkg_installed/<triplet>/share/openssl/vcpkg.spdx.json
```
Эти per‑package SPDX‑документы агрегируются в общий SBOM проекта.

## Сильные стороны
- Per‑package SPDX «из коробки»: для каждого порта есть `vcpkg.spdx.json` с версией, лицензией и хешами — готовый машинный факт без отдельного генератора.
- `builtin-baseline` + `version>=`/`overrides` дают воспроизводимый и пинуемый состав, эквивалент lockfile.
- Триплет (`x64-linux`, `x64-windows-static`) явно фиксирует платформу и модель линковки — видно, статическая сборка или динамическая.

## Ограничения
- Покрывает только то, что объявлено в `vcpkg.json`. Системные `apt`‑библиотеки, ручной `third_party/` и `FetchContent` вне vcpkg не учитываются.
- SPDX порта описывает сам компонент, но факт его линковки в итоговый бинарь подтверждается только анализом артефакта (`ldd`/`readelf`) или build‑scan.
- Привязка к реестру портов: нестандартная или внутренняя библиотека требует своего overlay‑порта, иначе её в манифесте не будет.

## Offline / on-premise
Да. vcpkg поддерживает asset caching (`X_VCPKG_ASSET_SOURCES`) и binary caching (`VCPKG_BINARY_SOURCES`) — исходники и собранные бинарные пакеты кладутся во внутреннее хранилище/прокси, после чего установка идёт без выхода в интернет. Реестр портов хранится как git‑репозиторий и зеркалируется во внутренний контур.

## Связанные темы
[[01 Курс/М09 C и C++ legacy без дисциплины пакетного менеджера/00 Карта модуля|М09 C/C++ legacy]] · [[01 Курс/М05 Инструменты генерации SBOM/00 Карта модуля|М05 Генерация SBOM]] · [[01 Курс/М03 Форматы SBOM CycloneDX, SPDX, SWID/00 Карта модуля|М03 Форматы SBOM]] · [[П21. Conan graph и package identity]] · [[П31. Пилот CodeScoring make CMake qmake]] · [[04 Инструменты/Conan|Conan]] · [[04 Инструменты/CMake|CMake]] · [[04 Инструменты/SPDX|SPDX]]
