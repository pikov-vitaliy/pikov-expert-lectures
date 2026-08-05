# Лекции pikov.expert

[![Site checks](https://github.com/pikov-vitaliy/pikov-expert-lectures/actions/workflows/site-checks.yml/badge.svg?branch=main)](https://github.com/pikov-vitaliy/pikov-expert-lectures/actions/workflows/site-checks.yml)

Исходный репозиторий открытого учебного проекта [pikov.expert](https://pikov.expert/) — каталога авторских веб-лекций и материалов Виталия Пикова по информационной безопасности, управлению уязвимостями, РБПО/SSDLC, SCA/SBOM, операционным системам, технической защите информации и прикладной разработке.

[Исходный код](https://github.com/pikov-vitaliy/pikov-expert-lectures) · [Сообщить о проблеме](https://github.com/pikov-vitaliy/pikov-expert-lectures/issues)

## Состояние репозитория

Актуально по реестру [`_PROJECT/lectures.json`](_PROJECT/lectures.json) на **5 августа 2026 года**:

| Показатель | Значение |
|---|---:|
| Записей в каталоге | 31 |
| Канонических папок материалов | 28 |
| Тематических разделов | 6 |
| `ready-local` | 19 |
| `published-snapshot` | 12 |
| Уникальных URL в `sitemap.xml` вместе с корнем | 30 |

Несколько записей могут вести в одну папку: например, базовый пентест, углублённый пентест, статический анализ и фаззинг представлены страницами или якорями домена `new-courses.pikov.expert`.

### Источники истины

- [`_PROJECT/lectures.json`](_PROJECT/lectures.json) — машиночитаемый реестр URL, папок, разделов, статусов и каталожных позиций;
- [`index.html`](index.html) — визуальный каталог на главной странице;
- [`_PROJECT/OPERATIONS_RUNBOOK.md`](_PROJECT/OPERATIONS_RUNBOOK.md) — обязательный порядок проверки, сборки и публикации;
- [`sitemap.xml`](sitemap.xml), [`robots.txt`](robots.txt) и `.htaccess` — генерируемые контрольные файлы сайта.

Статусы отражают происхождение локальной рабочей версии, а не доступность сайта в данный момент:

- `ready-local` — в канонической папке находится рабочий локальный материал из подготовленного исходного комплекта;
- `published-snapshot` — локальный `index.html` первоначально получен с опубликованной страницы и далее сопровождается в репозитории.

## Карта лекций и материалов

| # | Лекция или материал | URL | Раздел | Статус |
|---:|---|---|---|---|
| 1 | Введение в ОС Astra Linux SE 1.7 | [astra-intro.pikov.expert](https://astra-intro.pikov.expert/) | ОС и платформы | `published-snapshot` |
| 2 | Astra Linux: экосистема и уровни защищенности | [astralinux01.pikov.expert](https://astralinux01.pikov.expert/) | ОС и платформы | `ready-local` |
| 3 | Формальные модели безопасности ОС | [astralinux02.pikov.expert](https://astralinux02.pikov.expert/) | ОС и платформы | `ready-local` |
| 4 | Безопасная настройка Astra Linux 1.7 / 1.8 и ОС Linux | [astra-hardening.pikov.expert](https://astra-hardening.pikov.expert/) | ОС и платформы | `published-snapshot` |
| 5 | Безопасность ОС Windows | [windows.pikov.expert](https://windows.pikov.expert/) | ОС и платформы | `ready-local` |
| 6 | Архитектура ЭВМ и аппаратная безопасность | [pc-elbrus.pikov.expert](https://pc-elbrus.pikov.expert/) | ОС и платформы | `published-snapshot` |
| 7 | KOMRAD Enterprise SIEM 4.5 | [komrad.pikov.expert](https://komrad.pikov.expert/) | ОС и платформы | `published-snapshot` |
| 8 | Сканер-ВС 7 и компонент «Инспектор»: двухдневный практикум | [scaner-vs.pikov.expert](https://scaner-vs.pikov.expert/) | ОС и платформы | `ready-local` |
| 9 | Сертификация средств защиты информации | [cert.pikov.expert](https://cert.pikov.expert/) | Регулирование и право | `ready-local` |
| 10 | Лицензирование в сфере ТЗИ | [lic-tzi.pikov.expert](https://lic-tzi.pikov.expert/) | Регулирование и право | `ready-local` |
| 11 | Подразделения ТЗИ и их функции | [tzi-dept.pikov.expert](https://tzi-dept.pikov.expert/) | Регулирование и право | `published-snapshot` |
| 12 | День I. Риски ИБ, безопасность ЗО КИИ, инциденты | [risk.pikov.expert](https://risk.pikov.expert/) | Регулирование и право | `published-snapshot` |
| 13 | День II. Объекты КИИ: угрозы, меры, уязвимости | [threats-kii.pikov.expert](https://threats-kii.pikov.expert/) | Регулирование и право | `published-snapshot` |
| 14 | Техническое задание: проверяемые требования и РБПО | [tz.pikov.expert](https://tz.pikov.expert/) | РБПО | `ready-local` |
| 15 | Подготовка к сертификации процессов РБПО | [fstec-sdlc.pikov.expert](https://fstec-sdlc.pikov.expert/) | РБПО | `published-snapshot` |
| 16 | РБПО — разработка безопасного программного обеспечения | [gost56939.pikov.expert](https://gost56939.pikov.expert/) | РБПО | `ready-local` |
| 17 | Композиционный анализ ПО | [kapo.pikov.expert](https://kapo.pikov.expert/) | РБПО | `ready-local` |
| 18 | Статический анализ безопасности приложений | [sast.pikov.expert](https://sast.pikov.expert/) | РБПО | `published-snapshot` |
| 19 | Нефункциональное тестирование безопасности ПО | [p19.pikov.expert](https://p19.pikov.expert/) | РБПО | `ready-local` |
| 20 | Архитектурный анализ / ППК ФСТЭК | [ppk.pikov.expert](https://ppk.pikov.expert/) | РБПО | `published-snapshot` |
| 21 | Информационная безопасность и системы менеджмента ИБ | [27001.pikov.expert](https://27001.pikov.expert/) | РБПО | `ready-local` |
| 22 | Технологии хакеров и оценка защищенности | [pentest.pikov.expert](https://pentest.pikov.expert/) | Новые курсы МАСКОМ | `published-snapshot` |
| 23 | Статический анализ ПО + PVS-Studio | [new-courses.pikov.expert](https://new-courses.pikov.expert/#pvsstat) | Новые курсы МАСКОМ | `ready-local` |
| 24 | Пентест базовый | [new-courses.pikov.expert](https://new-courses.pikov.expert/#pentest01) | Новые курсы МАСКОМ | `ready-local` |
| 25 | Пентест углубленный | [new-courses.pikov.expert/pentest-02.html](https://new-courses.pikov.expert/pentest-02.html) | Новые курсы МАСКОМ | `published-snapshot` |
| 26 | Фаззинг-тестирование | [new-courses.pikov.expert](https://new-courses.pikov.expert/#fuzzing) | Новые курсы МАСКОМ | `ready-local` |
| 27 | Проектирование информационных систем | [is.pikov.expert](https://is.pikov.expert/) | Студенческие курсы | `ready-local` |
| 28 | Методика формулирования тем ВКР | [vkr.pikov.expert](https://vkr.pikov.expert/) | Студенческие курсы | `ready-local` |
| 29 | Лицензии SPDX на русском | [spdx.pikov.expert](https://spdx.pikov.expert/) | Справочник | `ready-local` |
| 30 | Жизненный цикл безопасного ПО: языки, стеки и четыре дефекта | [27-07-2026.pikov.expert](https://27-07-2026.pikov.expert/) | РБПО | `ready-local` |
| 31 | Языки, архитектура и безопасный SQL | [29-07-2026.pikov.expert](https://29-07-2026.pikov.expert/) | РБПО | `ready-local` |

## Структура

```text
.
├── index.html                         # главный каталог
├── .htaccess
├── robots.txt
├── sitemap.xml
├── _PROJECT/
│   ├── lectures.json                  # канонический реестр
│   ├── OPERATIONS_RUNBOOK.md          # эксплуатационный порядок
│   ├── update-site-control-files.ps1  # контрольные файлы
│   ├── smoke-check.ps1                # статические проверки
│   ├── build-release.ps1              # релизные ZIP-архивы
│   ├── browser-qa.mjs                 # локальная браузерная QA
│   ├── browser-qa-online.mjs          # браузерная QA опубликованных URL
│   ├── hosting-check.ps1              # HTTP-проверка хостинга
│   └── deploy-hosting.ps1             # адресная или полная публикация
├── astra-intro/                       # канонические папки сайтов
├── scaner-vs/
├── 27-07-2026/
├── 29-07-2026/
├── ...
├── spdx/
├── LICENSE.md
├── LICENSE-CODE.md
├── LICENSE-CONTENT.md
└── NOTICE.md
```

Каждая каноническая папка представляет отдельный поддомен либо набор страниц одного поддомена. Основной вход — `index.html`; рядом могут находиться локальные стили, изображения и разрешённые к распространению учебные материалы.

## Требования к рабочему месту

- Git и Windows PowerShell 5.1 (`powershell.exe`) — для проверки и сборки;
- Node.js 18+ и npm — для браузерной QA;
- GitHub CLI `gh` — для проверки workflow точного commit;
- `ssh` и `scp` с настроенным alias `pikov-hosting` — только для публикации;
- на сервере публикации: Bash, Python 3, `sha256sum`, `tar`, `rsync` и стандартные Unix-утилиты.

Python-зависимости внутри учебных папок `27-07-2026/code` и `29-07-2026/code` не нужны для сборки статического сайта.

## Локальная проверка и сборка

Перед работой прочитайте [`_PROJECT/OPERATIONS_RUNBOOK.md`](_PROJECT/OPERATIONS_RUNBOOK.md) и убедитесь, что не смешиваете свои изменения с чужими незавершёнными файлами.

Обязательная цепочка для изменений сайта выполняется в таком порядке:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\update-site-control-files.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\smoke-check.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\build-release.ps1 -FailOnIssues
node .\_PROJECT\browser-qa.mjs
```

Ожидаемый результат: `SMOKE OK`, `RELEASE BUILD OK`, `BROWSER QA OK`, `staticIssues=0` и отсутствие ошибок `git diff --check`.

`update-site-control-files.ps1` перезаписывает `.htaccess`, `robots.txt` и `sitemap.xml` корня и доменных папок, поэтому после его запуска необходимо просмотреть diff до commit.

Для браузерной QA нужен Node.js 18+ и Playwright с Chromium. Локальные зависимости можно установить в уже исключённую из Git служебную папку:

```powershell
npm install --prefix .\_PROJECT\.browser-node --save-exact playwright@1.61.0
npm exec --prefix .\_PROJECT\.browser-node -- playwright install chromium
```

Если Playwright установлен в другом месте, путь к его `node_modules` можно передать через переменную `PLAYWRIGHT_NODE_MODULES`.

## Публикация

Публикация выполняется только после зелёной локальной цепочки и только из релизных архивов. `build-release.ps1` создаёт обязательный `RELEASE_INDEX_<дата>.json`, который используют последующие браузерные, HTTP- и deploy-проверки.

Для обычного адресного обновления корня и выбранного поддомена безопаснее явно ограничить область:

```powershell
& .\_PROJECT\deploy-hosting.ps1 -OnlyDomains @('pikov.expert', 'example.pikov.expert')
```

Полная публикация всех целей текущего release index — только когда это действительно входит в задачу:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\deploy-hosting.ps1
```

Без `-OnlyDomains` скрипт обрабатывает все цели release index. На сервере содержимое каждой выбранной цели синхронизируется командой с семантикой `rsync --delete`: файлы, которых нет в релизе, удаляются. Скрипт использует настроенный SSH alias `pikov-hosting`, создаёт временные резервные архивы, сам запускает `hosting-check.ps1` и сохраняет удалённый диагностический каталог при неуспешной публикации. Автоматического отката нет; порядок проверки и критерии завершения описаны в runbook.

Повторная HTTP- и браузерная проверка уже опубликованного сайта без деплоя:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\hosting-check.ps1
node .\_PROJECT\browser-qa-online.mjs
```

GitHub Actions при push в `main` и в pull request:

- проверяет синтаксис служебных PowerShell-скриптов;
- запускает `smoke-check.ps1`;
- собирает релиз с `build-release.ps1 -FailOnIssues`;
- проверяет подготовку деплоя через `deploy-hosting.ps1 -PrepareOnly`.

CI **не публикует** сайт и не заменяет локальную браузерную и последующую онлайн-проверку.

Рекомендуемый production gate: строгие локальные проверки → commit только файлов текущей задачи → push → успешный workflow для точного SHA → адресный deploy → live QA. Не используйте широкое `git add -A` в рабочем дереве с посторонними изменениями.

Текущий live QA не является полной проверкой TLS и мобильной адаптивности: предупреждения `hosting-check.ps1` не всегда дают ненулевой код, а `browser-qa-online.mjs` работает с одним desktop viewport и допускает HTTPS-ошибки браузерного контекста. Сертификат, защитные HTTP-заголовки и ключевые мобильные экраны следует проверять отдельно.

## Что хранится в Git

В репозитории находятся исходные HTML-страницы, собственные ресурсы сайта, служебные скрипты и разрешённые учебные материалы. Файл [`.gitignore`](.gitignore) исключает, в частности:

- воспроизводимые каталоги `release`, временные staging-папки, отчёты QA и журналы;
- локальные зависимости Playwright и состояние редакторов/агентов;
- универсальные ZIP-архивы и высокорисковые сторонние форматы (`PDF`, `PPTX`, `DOCX`, `XLSX`, `EPS`) без отдельного решения о правах;
- преподавательские материалы, ответы и сторонние раздаточные комплекты.

Осознанные исключения из общих ignore-правил:

- три уже отслеживаемых офлайн-комплекта практикумов Сканер-ВС в `scaner-vs/materials/downloads/`: `all-labs-markdown.zip`, `scanner-labs-markdown.zip` и `inspector-labs-markdown.zip`; они нужны слушателям для работы без доступа к сайту;
- зафиксированное свидетельство браузерной проверки [`_PROJECT/BROWSER_TESTS_2026-08-05_SCANER_VS.md`](_PROJECT/BROWSER_TESTS_2026-08-05_SCANER_VS.md).

Новые архивы и локальные отчёты QA не добавляются автоматически: для каждого такого файла требуется отдельное решение о назначении, правах и необходимости хранения в Git.

## Лицензирование

- [Общая модель лицензирования](LICENSE.md);
- [MIT License для автоматизации в `_PROJECT`](LICENSE-CODE.md);
- [CC BY 4.0 для оригинальных учебных материалов](LICENSE-CONTENT.md);
- [уведомления и условия для сторонних материалов](NOTICE.md).

Лицензия на оригинальный контент не распространяется автоматически на товарные знаки, тексты стандартов, документацию производителей, снимки экранов, логотипы и другие сторонние объекты. Перед добавлением таких файлов необходимо отдельно подтвердить источник, право на распространение и требуемую атрибуцию.

## Как обновлять каталог

При добавлении или изменении материала:

1. обновите каноническую папку и [`_PROJECT/lectures.json`](_PROJECT/lectures.json);
2. синхронизируйте карточку в корневом [`index.html`](index.html);
3. выполните обязательную локальную цепочку в порядке из runbook;
4. проверьте только относящиеся к задаче изменения перед commit;
5. после push дождитесь успешного завершения workflow **Site checks**.

## Автор

**Виталий Александрович Пиков**

Информационная безопасность, РБПО, SSDLC, SCA/SBOM, DevSecOps, системное программирование и учебные материалы по ИТ.

- Email: [vitaly@pikov.expert](mailto:vitaly@pikov.expert)
- Telegram: [@UnderLineSecurity](https://t.me/UnderLineSecurity)
