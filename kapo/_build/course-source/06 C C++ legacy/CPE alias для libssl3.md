---
title: "CPE alias для libssl3"
type: "cpp-handbook"
tags: [c-cpp, legacy, справочник, cpe, alias, nvd, openssl]
status: ready
updated: 2026-06-17
---

# CPE alias для libssl3

## Почему это важно для SCA/OSA
Матчинг на NVD идёт по строке CPE вида `cpe:2.3:a:<vendor>:<product>:<version>:...`. Проблема в том, что у одного и того же продукта в NVD CPE Dictionary исторически живёт несколько разных написаний `vendor:product`, а имя бинарного артефакта (`libssl3`, `libssl.so.3`) вообще не совпадает ни с одним из них. OpenSSL встречается и как `openssl:openssl`, и как `openssl_project:openssl`; уязвимости при этом могут быть привязаны к одному alias, а ваш SBOM нести другой. Тогда матчинг не находит CVE — и это не ошибка инструмента, а штатная тишина: findings приходит подозрительно мало.

Для C/C++ это бьёт сильнее, чем для экосистемных языков: системный пакет называется `libssl3` (Debian/Ubuntu) или `openssl-libs` (RPM), upstream-проект — `openssl`, а в NVD продукт — `openssl` под двумя vendor. Между «именем `.so`», «именем пакета» и «CPE-продуктом» нет автоматического моста, его строят руками.

## Как это проявляется
Пакет в системе и его upstream-имя расходятся, а NVD знает только третье написание:

```bash
$ dpkg -S /usr/lib/x86_64-linux-gnu/libssl.so.3
libssl3:amd64: /usr/lib/x86_64-linux-gnu/libssl.so.3
$ apt-cache show libssl3 | grep -E '^(Package|Version|Source)'
Package: libssl3
Version: 3.0.11-1~deb12u2
Source: openssl            # ← upstream-имя, а не libssl3
```

В NVD CPE Dictionary тот же продукт имеет минимум два vendor:

```text
cpe:2.3:a:openssl:openssl:3.0.11:*:*:*:*:*:*:*
cpe:2.3:a:openssl_project:openssl:3.0.11:*:*:*:*:*:*:*
```

Если генератор SBOM подставил CPE по имени пакета (`libssl3`) или взял только один alias, часть CVE OpenSSL к компоненту не привяжется. При этом доля версий в CVE задаётся диапазонами (`versionStartIncluding`/`versionEndExcluding`), поэтому даже верный alias с неточной версией даст пропуск.

## Слепая зона или приём
Слепая зона — «один компонент, один CPE». Реальная идентичность libssl3 — это связка `имя .so → имя deb-пакета → Source-пакет → upstream-проект → набор CPE alias в NVD`. Приём: для критичных сетевых библиотек (openssl, libcurl, libxml2) вести не единственный CPE, а список всех известных alias и проверять, к какому из них привязаны нужные CVE. Один зафиксированный alias = потенциальный false negative.

## Что делать на проекте
1. Выгрузить из SBOM C/C++ компоненты с пустым `cpe`, но известным именем/PURL — это вход в alias-worklist.
2. Для каждого восстановить цепочку: `dpkg -S` / `rpm -qf` → `apt-cache show ... | grep Source` (или `rpm -qi`) → upstream-имя.
3. По upstream-имени найти в NVD CPE Dictionary **все** записи `vendor:product`, а не первую; зафиксировать alias списком.
4. Сверять не точную строку версии, а попадание версии в уязвимый диапазон CVE.
5. Приоритизировать: сетевые/криптобиблиотеки размечать первыми, внутренние помечать `CPE отсутствует (internal)`.
6. Хранить worklist как передаваемый артефакт со статусом и приоритетом — NVD добавляет и депрекейтит записи, разовая правка устаревает.

## Связь
- Модуль: [[01 Курс/М04 Идентификаторы компонентов и уязвимостей/00 Карта модуля|М04. Идентификаторы компонентов и уязвимостей]] (alias-проблема CPE — ядро модуля), [[01 Курс/М09 C и C++ legacy без дисциплины пакетного менеджера/00 Карта модуля|М09. C/C++ legacy]] (где имя `.so` ≠ имя пакета ≠ CPE).
- Практики: [[П25. CPE alias worklist]] (ручная разметка), [[П24. PURL нормализация и private qualifiers]] (вторая координата — PURL).
- Нормативка: [[05 Нормативка/БДУ ФСТЭК|БДУ ФСТЭК]] и NVD как источники, [[05 Нормативка/NIST SP 800-218 SSDF]] (RV.1 — поиск уязвимостей в компонентах), [[05 Нормативка/BSI TR-03183-2 v2.1.0]] (полнота идентификаторов SBOM).
- Смежные заметки: [[06 C C++ legacy/dpkg apt metadata|dpkg apt metadata]] (откуда берётся Source-пакет), [[06 C C++ legacy/version normalization|version normalization]] (формат версии для матчинга), [[06 C C++ legacy/detection accuracy|detection accuracy]] (как alias влияет на полноту).
