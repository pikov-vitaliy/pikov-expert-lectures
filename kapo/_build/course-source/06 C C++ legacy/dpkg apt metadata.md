---
title: "dpkg apt metadata"
type: "cpp-handbook"
tags: [c-cpp, legacy, справочник, dpkg, apt, deb, mapping, elf]
status: ready
updated: 2026-06-17
---

# dpkg apt metadata

## Почему это важно для SCA/OSA
Динамическая зависимость C/C++ видна как файл `.so` без имени компонента, версии и лицензии — голый путь вроде `/usr/lib/x86_64-linux-gnu/libssl.so.3`. Метаданные пакетного менеджера дистрибутива — это мост от этого пути к полноценной координате: `dpkg`/`apt` знают, какой deb-пакет владеет файлом, какая у него версия, из какого Source-пакета он собран и под какой лицензией поставлен. Без этого моста системная библиотека остаётся безымянным артефактом, который не матчится ни на что.

Для Debian/Ubuntu и совместимых (в т.ч. отечественных deb-сборок) это основной способ обогатить ELF-зависимость до уровня, пригодного для SBOM и матчинга. Связка «файл → пакет → версия → Source → лицензия» восстанавливает ровно те поля, которых требуют минимальные элементы SBOM, и делает это из данных, уже лежащих в системе сборки.

## Как это проявляется
Полная цепочка от `.so` к координате идёт через несколько команд `dpkg`/`apt`:

```bash
$ ldd ./service | grep ssl
        libssl.so.3 => /usr/lib/x86_64-linux-gnu/libssl.so.3
$ dpkg -S /usr/lib/x86_64-linux-gnu/libssl.so.3
libssl3:amd64: /usr/lib/x86_64-linux-gnu/libssl.so.3
$ dpkg-query -W -f='${Package} ${Version} ${Source}\n' libssl3
libssl3 3.0.11-1~deb12u2 openssl          # Source ≠ Package — важно для CPE/upstream
$ apt-cache show libssl3 | grep -E '^(Homepage|Architecture)'
Homepage: https://www.openssl.org/
Architecture: amd64
$ cat /usr/share/doc/libssl3/copyright | head -1   # лицензия пакета
```

Отсюда собирается PURL `pkg:deb/debian/libssl3@3.0.11-1~deb12u2?arch=amd64`, а из поля `Source: openssl` — upstream-имя для CPE и нормализации версии. Без `dpkg -S` тот же `.so` остался бы `pkg:generic/...` без матчинга.

## Слепая зона или приём
Слепая зона — metadata описывает только то, что установлено как deb-пакет. Если библиотека собрана из исходников и положена руками в `/usr/local/lib`, `dpkg -S` ответит «no path found» — пакетного владельца нет, и обогащать нечего. Так же `dpkg` ничего не знает о статически вшитых библиотеках и о файлах из `third_party/`. Приём: трактовать «нет владельца пакета» как сигнал «это не системная зависимость» и переводить такой артефакт в worklist ручной разметки, а не считать его отсутствующим.

## Что делать на проекте
1. Снять список `.so` через `ldd`/`readelf -d` и для каждого выполнить `dpkg -S <путь>` — получить пакет-владельца.
2. Для каждого пакета взять версию и `Source` через `dpkg-query -W -f='${Package} ${Version} ${Source}'` — Source нужен для CPE и upstream-версии.
3. Собрать PURL `pkg:deb/<distro>/<pkg>@<version>?arch=<arch>`, сохранив `arch` (различающий qualifier).
4. Лицензию брать из `/usr/share/doc/<pkg>/copyright`, не угадывать по имени.
5. Файлы, для которых `dpkg -S` не нашёл владельца (`/usr/local/...`, `third_party/`, статика), выносить в реестр unresolved.
6. Фиксировать дистрибутив и его версию: одна и та же `.so` в разных deb-средах имеет разные версии пакета.

## Связь
- Модуль: [[01 Курс/М09 C и C++ legacy без дисциплины пакетного менеджера/00 Карта модуля|М09. C/C++ legacy]] (маппинг ELF → DEB — опорный механизм модуля), [[01 Курс/М04 Идентификаторы компонентов и уязвимостей/00 Карта модуля|М04. Идентификаторы компонентов и уязвимостей]] (deb-метаданные дают PURL/версию/Source для CPE).
- Практики: [[П22. ELF dynamic dependencies]] (снятие `.so` и маппинг на пакеты), [[П19. C C++ make build inventory]] (инвентаризация сборки).
- Нормативка: [[05 Нормативка/CISA Minimum Elements for SBOM]] (имя, версия, supplier как базовые элементы), [[05 Нормативка/BSI TR-03183-2 v2.1.0]] (полнота идентификаторов), [[05 Нормативка/NIST SP 800-218 SSDF]] (RV.1).
- Смежные заметки: [[06 C C++ legacy/Astra Debian RPM среды|Astra Debian RPM среды]] (rpm-эквивалент через `rpm -qf`), [[06 C C++ legacy/CPE alias для libssl3|CPE alias для libssl3]] (Source → upstream → CPE), [[06 C C++ legacy/version normalization|version normalization]] (deb-версии с epoch/ревизией), [[06 C C++ legacy/unresolved libraries|unresolved libraries]] (файлы без пакета-владельца).
