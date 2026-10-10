---
title: "debug symbols как evidence"
type: "cpp-handbook"
tags: [c-cpp, legacy, справочник, debug, symbols, dwarf, buildid, evidence]
status: ready
updated: 2026-06-17
---

# debug symbols как evidence

## Почему это важно для SCA/OSA
Когда библиотека вшита статически или бинарь не имеет deb/conan-происхождения, отладочная информация становится сильнейшим доказательством состава. Debug-символы (таблица символов `.symtab`, секции DWARF `.debug_*`, строки в `.comment`/`.rodata`, GNU `build-id`) несут имена функций, пути к исходникам, версию компилятора и иногда саму строку версии библиотеки. Из `EVP_DecryptUpdate` и пути `.../openssl-3.0.11/crypto/evp/evp_enc.c` восстанавливается и компонент, и его версия — там, где `ldd` и манифест молчат.

Это превращает «догадку по имени файла» в подтверждаемый факт: символ из конкретной библиотеки внутри вашего бинаря — прямое evidence того, что код этой библиотеки реально присутствует, даже если отдельного `.so` нет. В терминах SBOM это метод `identity` с техникой `binary-analysis` и осмысленным `confidence`.

## Как это проявляется
Символы и строки версий читаются стандартными утилитами:

```bash
$ nm -D --defined-only ./service | grep -i ssl | head
                 U EVP_DecryptUpdate
                 U SSL_CTX_new          # импортируемые символы OpenSSL
$ strings -a ./service | grep -iE 'openssl [0-9]'
OpenSSL 3.0.11 19 Sep 2023             # строка версии прямо в бинаре
$ readelf -p .comment ./service
  [     0]  GCC: (Debian 12.2.0-14) 12.2.0    # компилятор сборки
$ file ./service
... with debug_info, not stripped         # есть DWARF → исходные пути доступны
$ objdump --dwarf=info ./service | grep -m1 DW_AT_comp_dir
    DW_AT_comp_dir : /build/openssl-3.0.11   # путь сборки → имя и версия компонента
```

В SBOM этот вывод оформляется как identity-evidence:

```json
{
  "evidence": {
    "identity": [
      {
        "field": "version",
        "confidence": 0.7,
        "methods": [
          {
            "technique": "binary-analysis",
            "value": "OpenSSL 3.0.11 19 Sep 2023"
          }
        ]
      }
    ]
  }
}
```

## Слепая зона или приём
Слепая зона — релизные бинари обычно собирают `strip`-нутыми: `.symtab` и `.debug_*` вырезаны, и этот канал доказательств пропадает (см. `stripped binaries`). Тогда остаются только динамическая таблица `.dynsym`, строки в `.rodata` и `build-id`. Приём: сохранять отделённые debug-символы (`.debug`-файлы, debuginfo-пакеты) как отдельный аудиторский артефакт и связывать их с релизным бинарём по `build-id` — так доказательная база остаётся, даже если поставляется stripped-сборка.

## Что делать на проекте
1. До strip снимать с бинаря символы и строки: `nm -D`, `strings -a`, `readelf -p .comment`, `objdump --dwarf=info`.
2. Искать строки версий (`OpenSSL 3.0.11`, `zlib 1.2.13`) и пути сборки (`DW_AT_comp_dir`) — из них восстанавливать имя и версию компонента.
3. Оформлять найденное как identity-evidence в SBOM с техникой `binary-analysis` и честным `confidence` (строка версии — выше, косвенный символ — ниже).
4. Сохранять отделённые debug-символы/debuginfo как артефакт и связывать с релизом по GNU `build-id` (`readelf -n`).
5. Для stripped-поставки заранее договариваться о доступе к debug-символам — иначе доказательная база теряется безвозвратно.
6. Не путать наличие импортируемого символа с фактом версии: символ доказывает присутствие кода, версию подтверждает отдельная строка/путь.

## Связь
- Модуль: [[01 Курс/М09 C и C++ legacy без дисциплины пакетного менеджера/00 Карта модуля|М09. C/C++ legacy]] (бинарный анализ как источник состава), [[01 Курс/М04 Идентификаторы компонентов и уязвимостей/00 Карта модуля|М04. Идентификаторы компонентов и уязвимостей]] (на чём основан присвоенный идентификатор).
- Практики: [[П22. ELF dynamic dependencies]] (чтение символов и секций ELF), [[П23. Статическая линковка как слепая зона]] (когда символы — почти единственная зацепка).
- Нормативка: [[05 Нормативка/CycloneDX ECMA-424]] (поле `evidence.identity`), [[05 Нормативка/BSI TR-03183-2 v2.1.0]] (достоверность данных), [[05 Нормативка/ГОСТ Р 56939-2024]] (доказательность РБПО).
- Смежные заметки: [[06 C C++ legacy/stripped binaries|stripped binaries]] (когда этот канал отрезан), [[06 C C++ legacy/SBOM evidence occurrences|SBOM evidence occurrences]] (символы как метод identity), [[06 C C++ legacy/hash-based identification|hash-based identification]] (хеш как дополняющее доказательство), [[06 C C++ legacy/ldd readelf objdump|ldd readelf objdump]] (инструменты чтения ELF).
