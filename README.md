# pikov.expert lectures

Открытый учебный проект Виталия Пикова: каталог авторских веб-лекций по информационной безопасности, РБПО, SSDLC, SCA/SBOM, операционным системам, технической защите информации и прикладной разработке учебных материалов.

Онлайн-версия: [pikov.expert](https://pikov.expert/)

## Что внутри

- корневая страница-каталог `pikov.expert`;
- 23 папки под домены третьего уровня;
- 26 карточек лекций и справочных материалов;
- служебные файлы для сайта: `.htaccess`, `robots.txt`, `sitemap.xml`;
- скрипты сборки, проверки, релиза и деплоя в `_PROJECT`;
- локальные QA-сценарии для статической проверки, HTTP-проверки и браузерной проверки.

## Карта лекций

| # | Лекция | URL | Раздел | Статус |
|---:|---|---|---|---|
| 1 | Введение в ОС Astra Linux SE 1.7 | [astra-intro.pikov.expert](https://astra-intro.pikov.expert/) | ОС и платформы | published-snapshot |
| 2 | Astra Linux: экосистема и уровни защищенности | [astralinux01.pikov.expert](https://astralinux01.pikov.expert/) | ОС и платформы | ready-local |
| 3 | Формальные модели безопасности ОС | [astralinux02.pikov.expert](https://astralinux02.pikov.expert/) | ОС и платформы | ready-local |
| 4 | Безопасная настройка Astra Linux 1.7 / 1.8 и ОС Linux | [astra-hardening.pikov.expert](https://astra-hardening.pikov.expert/) | ОС и платформы | published-snapshot |
| 5 | Безопасность ОС Windows | [windows.pikov.expert](https://windows.pikov.expert/) | ОС и платформы | ready-local |
| 6 | Архитектура ЭВМ и аппаратная безопасность | [pc-elbrus.pikov.expert](https://pc-elbrus.pikov.expert/) | ОС и платформы | published-snapshot |
| 7 | KOMRAD Enterprise SIEM 4.5 | [komrad.pikov.expert](https://komrad.pikov.expert/) | ОС и платформы | published-snapshot |
| 8 | Сертификация средств защиты информации | [cert.pikov.expert](https://cert.pikov.expert/) | Регулирование и право | ready-local |
| 9 | Лицензирование в сфере ТЗИ | [lic-tzi.pikov.expert](https://lic-tzi.pikov.expert/) | Регулирование и право | ready-local |
| 10 | Подразделения ТЗИ и их функции | [tzi-dept.pikov.expert](https://tzi-dept.pikov.expert/) | Регулирование и право | published-snapshot |
| 11 | День I. Риски ИБ, безопасность ЗО КИИ, инциденты | [risk.pikov.expert](https://risk.pikov.expert/) | Регулирование и право | published-snapshot |
| 12 | День II. Объекты КИИ: угрозы, меры, уязвимости | [threats-kii.pikov.expert](https://threats-kii.pikov.expert/) | Регулирование и право | published-snapshot |
| 13 | Техническое задание: проверяемые требования и РБПО | [tz.pikov.expert](https://tz.pikov.expert/) | РБПО | ready-local |
| 14 | Подготовка к сертификации процессов РБПО | [fstec-sdlc.pikov.expert](https://fstec-sdlc.pikov.expert/) | РБПО | published-snapshot |
| 15 | Композиционный анализ ПО | [kapo.pikov.expert](https://kapo.pikov.expert/) | РБПО | ready-local |
| 16 | Статический анализ безопасности приложений | [sast.pikov.expert](https://sast.pikov.expert/) | РБПО | published-snapshot |
| 17 | Проверка безопасности приложения | [p19.pikov.expert](https://p19.pikov.expert/) | РБПО | ready-local |
| 18 | Архитектурный анализ / ППК ФСТЭК | [ppk.pikov.expert](https://ppk.pikov.expert/) | РБПО | published-snapshot |
| 19 | Технологии хакеров и оценка защищенности | [pentest.pikov.expert](https://pentest.pikov.expert/) | Новые курсы МАСКОМ | published-snapshot |
| 20 | Статический анализ ПО + PVS-Studio | [new-courses.pikov.expert](https://new-courses.pikov.expert/#pvsstat) | Новые курсы МАСКОМ | ready-local |
| 21 | Пентест базовый | [new-courses.pikov.expert](https://new-courses.pikov.expert/#pentest01) | Новые курсы МАСКОМ | ready-local |
| 22 | Пентест углубленный | [new-courses.pikov.expert](https://new-courses.pikov.expert/pentest-02.html) | Новые курсы МАСКОМ | published-snapshot |
| 23 | Фаззинг-тестирование | [new-courses.pikov.expert](https://new-courses.pikov.expert/#fuzzing) | Новые курсы МАСКОМ | ready-local |
| 24 | Проектирование информационных систем | [is.pikov.expert](https://is.pikov.expert/) | Студенческие курсы | ready-local |
| 25 | Методика формулирования тем ВКР | [vkr.pikov.expert](https://vkr.pikov.expert/) | Студенческие курсы | ready-local |
| 26 | Лицензии SPDX на русском | [spdx.pikov.expert](https://spdx.pikov.expert/) | Справочник | ready-local |

## Структура

```text
.
├── index.html
├── robots.txt
├── sitemap.xml
├── _PROJECT/
│   ├── lectures.json
│   ├── smoke-check.ps1
│   ├── update-site-control-files.ps1
│   ├── build-release.ps1
│   ├── browser-qa.mjs
│   ├── hosting-check.ps1
│   └── deploy-hosting.ps1
├── astra-intro/
├── astralinux01/
├── ...
└── spdx/
```

Папки `release`, временные staging-каталоги, ZIP-архивы, локальные QA-выгрузки и рабочий карантин не входят в репозиторий. Они воспроизводятся скриптами или относятся к локальной эксплуатации.

## Проверка

Перед любыми изменениями, публикацией или повторным аудитом сначала открыть и выполнить порядок из [_PROJECT/OPERATIONS_RUNBOOK.md](_PROJECT/OPERATIONS_RUNBOOK.md). Это обязательная точка входа для синхронизации `git pull --ff-only`, локальных QA-gates, деплоя, `hosting-check`, commit/push и проверки CI.

Минимальная локальная проверка:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\smoke-check.ps1
```

Актуализация `.htaccess`, `robots.txt` и `sitemap.xml`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\update-site-control-files.ps1
```

Сборка релизных ZIP-архивов:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\build-release.ps1
```

Локальная браузерная QA:

```powershell
node .\_PROJECT\browser-qa.mjs
```

Онлайн-проверка опубликованного сайта:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\hosting-check.ps1
node .\_PROJECT\browser-qa-online.mjs
```

## Публикация

Не публиковать сайт напрямую из рабочей папки. Канонический порядок зафиксирован в [_PROJECT/OPERATIONS_RUNBOOK.md](_PROJECT/OPERATIONS_RUNBOOK.md): синхронизация репозитория, актуализация контрольных файлов, smoke, release build, browser QA, deploy, hosting-check, commit, push, GitHub Actions.

Релизная модель простая:

1. обновить контент в доменных папках;
2. выполнить `smoke-check.ps1`;
3. выполнить `update-site-control-files.ps1`;
4. выполнить `build-release.ps1`;
5. проверить сайт локально через `browser-qa.mjs`;
6. развернуть ZIP-архивы на хостинге;
7. выполнить `hosting-check.ps1` и `browser-qa-online.mjs`.

`deploy-hosting.ps1` рассчитан на SSH-доступ к хостингу и использует безопасную Python-распаковку ZIP, чтобы сохранять UTF-8 имена файлов на Linux-сервере.

## Лицензирование

Код служебных скриптов и оригинальные учебные материалы нужно публиковать с ясной лицензией. В проекте есть сторонние документы, логотипы, спецификации и справочные материалы, которые сохраняют права и условия первоисточников. Перед публичным push см. [LICENSE.md](LICENSE.md) и [OPEN_SOURCE_READINESS.md](OPEN_SOURCE_READINESS.md).

## Автор

Виталий Александрович Пиков  
Информационная безопасность, РБПО, SSDLC, SCA/SBOM, DevSecOps, системное программирование и учебные материалы по ИТ.

Контакты:

- Email: [vitaly@pikov.expert](mailto:vitaly@pikov.expert)
- Telegram: [@UnderLineSecurity](https://t.me/UnderLineSecurity)
