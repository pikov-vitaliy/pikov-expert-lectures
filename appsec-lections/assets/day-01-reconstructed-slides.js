/*
 * Публичная HTML-декa первого дня.
 *
 * Это самостоятельная редакторская реконструкция для сайта: исходные
 * фотографии используются только при подготовке текста и здесь намеренно
 * не упоминаются, не загружаются и не выдаются как часть интерфейса.
 * Поле `source` сохраняет редакторскую трассируемость к разделам вычищенной
 * стенограммы первого дня; оно выводится в нижней строке каждого слайда.
 *
 * Интеграция: добавьте на страницу <div id="reconstructed-slides"></div>
 * и подключите этот файл с defer. Никаких внешних зависимостей нет.
 */
(() => {
  'use strict';

  const deck = {
    title: 'Безопасность приложений — день 1',
    blocks: [
      {
        id: 'foundations',
        label: '01 · основы',
        title: 'Основы AppSec и поверхность атаки',
        source: '§§ 3–5',
        slides: [
          {
            id: 'appsec-risk',
            title: 'Безопасность приложений — управление риском',
            lead: 'Цель AppSec — не обещать абсолютную защиту, а уменьшать риск на всём жизненном цикле приложения.',
            cards: [
              ['Требования', 'Определяем активы, критичные свойства и критерии приемлемого риска.'],
              ['Архитектура и код', 'Находим границы доверия, задаём защитные свойства и проверяем их тестами.'],
              ['Поставка и эксплуатация', 'Контролируем зависимости, конфигурацию, развёртывание и реагирование.']
            ],
            takeaway: 'Технический контроль всегда связан с владельцем риска и проверяемым результатом.',
            source: '§ 3.1'
          },
          {
            id: 'appsec-scope',
            title: 'Под угрозой — не только веб-сайт',
            lead: 'Клиентское, мобильное, серверное и облачное ПО обрабатывают данные, выполняют действия и получают обновления.',
            cards: [
              ['Клиенты', 'Браузеры, редакторы, мобильные приложения и другие программы пользователя.'],
              ['Сервисы', 'API, фоновые процессы, базы данных, хранилища, интеграции и панели управления.'],
              ['Поставка', 'Библиотеки, пакеты, образы, CI/CD, registry и средства разработки.']
            ],
            takeaway: 'Составляйте карту компонентов и потоков данных до выбора средств защиты.',
            source: '§§ 3.1, 4.1'
          },
          {
            id: 'risk-chain',
            title: 'Как возникает риск',
            lead: 'Риск становится управляемым, когда его раскладывают на причинно-следственную цепочку.',
            steps: [
              ['01', 'Актив', 'Данные, деньги, репутация, непрерывность процесса, интеллектуальная собственность.'],
              ['02', 'Угроза', 'Нежелательное событие и возможный путь его реализации.'],
              ['03', 'Уязвимость', 'Недостаток проектирования, кода, конфигурации или процесса.'],
              ['04', 'Риск', 'Вероятность и последствия для конкретного актива и организации.']
            ],
            takeaway: 'Мера защиты должна уменьшать вероятность, последствия или оба параметра.',
            source: '§ 3.1'
          },
          {
            id: 'cia',
            title: 'Что именно мы защищаем: CIA',
            lead: 'Последствия удобнее обсуждать через конфиденциальность, целостность и доступность.',
            cards: [
              ['Конфиденциальность', 'Кто может узнать данные? Пример: чтение чужого документа или секрета.'],
              ['Целостность', 'Кто и как может изменить данные? Пример: цена, роль, заказ или бизнес-статус.'],
              ['Доступность', 'Может ли законный пользователь получить услугу вовремя?']
            ],
            takeaway: 'В сценарии угрозы фиксируйте актив, нарушаемое свойство и проверяемый контроль.',
            source: '§ 3.2'
          },
          {
            id: 'iaa',
            title: 'Идентификация, аутентификация, авторизация',
            lead: 'Успешный вход не означает право выполнить любое действие.',
            cards: [
              ['Идентификация', 'Субъект сообщает, кем он представляется.'],
              ['Аутентификация', 'Система проверяет доказательство владения учётными данными или фактором.'],
              ['Авторизация', 'Сервер решает, разрешено ли действие над конкретным объектом в этом контексте.']
            ],
            takeaway: 'Проверка «субъект → действие → объект → контекст» выполняется на сервере для каждого запроса.',
            source: '§ 3.3'
          },
          {
            id: 'attack-surface',
            title: 'Поверхность атаки — это все точки взаимодействия',
            lead: 'Не ограничивайтесь маршрутом API: у приложения есть входы, зависимости, роли, файлы, журналы и внешние каналы.',
            cards: [
              ['Входы', 'Формы, API, загрузка файлов, параметры, сообщения и административные интерфейсы.'],
              ['Переходы', 'Браузер → API, API → БД, CI → registry, сервис → внешний ресурс.'],
              ['Полномочия', 'Роли, сервисные учётные записи, токены, разрешения файлов и сети.']
            ],
            takeaway: 'Каждая новая интеграция меняет поверхность атаки.',
            source: '§§ 4.1–4.2'
          },
          {
            id: 'trust-boundary',
            title: 'Граница доверия — место для явного контроля',
            lead: 'На переходе между областями с разным уровнем доверия данные и команды нельзя считать безопасными по умолчанию.',
            steps: [
              ['Проверить вход', 'Формат, семантику, происхождение и полномочия.'],
              ['Ограничить передачу', 'Передавать только нужные данные и минимально необходимые права.'],
              ['Зафиксировать действие', 'Обеспечить наблюдаемость без записи секретов в журнал.'],
              ['Сдержать ошибку', 'Заранее предусмотреть ограничение ущерба и безопасную реакцию.']
            ],
            takeaway: 'Доверие не передаётся автоматически через интерфейс или сетевой вызов.',
            source: '§ 4.1'
          },
          {
            id: 'attack-map',
            title: 'Как построить карту атакуемой поверхности',
            lead: 'Карта превращает абстрактный разговор об угрозах в перечень объектов, сценариев и контролей.',
            steps: [
              ['01', 'Бизнес-цель', 'Определить защищаемые ценности.'],
              ['02', 'Поток данных', 'Нарисовать поток и границы доверия.'],
              ['03', 'Компоненты', 'Перечислить интерфейсы, файлы, зависимости и операции.'],
              ['04', 'Сценарии', 'Сформулировать злоупотребления и ожидаемые контроли.']
            ],
            takeaway: 'Для каждого пункта нужен проверяемый результат: тест, журнал, правило или архитектурное решение.',
            source: '§ 4.2'
          }
        ]
      },
      {
        id: 'owasp-1-3',
        label: '02 · A01–A03',
        title: 'OWASP Top 10:2025 — доступ, конфигурация, поставка',
        source: '§§ 5–9',
        slides: [
          {
            id: 'owasp-language',
            title: 'OWASP — общий язык для разговора о рисках',
            lead: 'OWASP Top 10 помогает структурировать классы проблем, но не заменяет модель угроз и требования конкретной организации.',
            cards: [
              ['Top 10', 'Ориентир для первичного разговора о наиболее значимых классах рисков.'],
              ['ASVS и WSTG', 'Источники проверяемых требований и подходов к тестированию.'],
              ['Модель угроз', 'Связывает общие категории с вашим активом, архитектурой и сценариями злоупотребления.']
            ],
            takeaway: 'Категория — это начало анализа, а не готовый диагноз.',
            source: '§ 5'
          },
          {
            id: 'a01',
            title: 'A01:2025 — нарушение контроля доступа',
            lead: 'Проблема возникает, когда пользователь получает объект или выполняет действие вне своих полномочий.',
            cards: [
              ['Горизонтальное повышение прав', 'Доступ к объекту другого пользователя при подмене идентификатора.'],
              ['Вертикальное повышение прав', 'Обычный пользователь выполняет административное действие.'],
              ['Скрытый маршрут', 'Функция остаётся доступной, хотя ссылка или кнопка скрыта в интерфейсе.']
            ],
            takeaway: 'UI не является границей безопасности: решение принимает сервер.',
            source: '§ 6'
          },
          {
            id: 'a01-controls',
            title: 'A01: проверка доступа должна быть системной',
            lead: 'Защита строится вокруг явной политики и проверки конкретного ресурса.',
            steps: [
              ['Deny by default', 'Доступ разрешается только явным правилом.'],
              ['Централизация', 'Политика авторизации не дублируется в клиентских экранах.'],
              ['Проверка объекта', 'Сервер сопоставляет субъекта, действие, объект и контекст.'],
              ['Негативные тесты', 'Тестируются попытки доступа к чужим объектам и административным действиям.']
            ],
            takeaway: 'Скрыть кнопку — не значит запретить действие.',
            source: '§ 6'
          },
          {
            id: 'a02',
            title: 'A02:2025 — небезопасная конфигурация',
            lead: 'Излишние возможности и подробная диагностика часто становятся частью пути атаки.',
            cards: [
              ['Избыточная экспозиция', 'Устаревшие endpoint’ы, debug-режимы, стандартные учётные записи, открытые сервисы.'],
              ['Информативные ошибки', 'Пути к файлам, версии, стек вызовов и внутренние URL помогают атакующему.'],
              ['Неверные настройки', 'Ошибки TLS, CORS, прав файлов, сетевой экспозиции и заголовков.']
            ],
            takeaway: '«Никто не знает URL» — не контроль безопасности.',
            source: '§ 7'
          },
          {
            id: 'a02-controls',
            title: 'A02: конфигурация — часть защищаемого продукта',
            lead: 'Снижение риска требует повторяемых проверок, а не ручной надежды на корректную среду.',
            steps: [
              ['Минимизировать', 'Отключать неиспользуемые функции, компоненты и учётные записи.'],
              ['Разделять среды', 'Не переносить dev/test-настройки в production.'],
              ['Проверять автоматически', 'Использовать IaC, ревью и проверки конфигурации.'],
              ['Безопасно сообщать об ошибке', 'Пользователю — нейтральное сообщение, деталям — защищённый журнал.']
            ],
            takeaway: 'Конфигурация должна проходить такой же контроль изменений, как код.',
            source: '§ 7'
          },
          {
            id: 'a03',
            title: 'A03:2025 — сбои в цепочке поставки ПО',
            lead: 'Современное приложение состоит не только из собственного кода: риск живёт в зависимостях, сборке и артефактах.',
            cards: [
              ['Компоненты', 'Библиотеки, пакеты, плагины, образы и внешние сервисы.'],
              ['Конвейер', 'CI/CD, registry, секреты, подписи, разрешения и lifecycle-скрипты.'],
              ['Происхождение', 'Кто, как и из какого источника собрал и доставил артефакт.']
            ],
            takeaway: 'Неизвестная зависимость — это неизвестная часть поверхности атаки.',
            source: '§ 8'
          },
          {
            id: 'a03-controls',
            title: 'A03: делайте поставку проверяемой',
            lead: 'Контроль состава и происхождения позволяет быстрее принимать решения об обновлении и исключениях.',
            steps: [
              ['Инвентаризировать', 'Вести SBOM и применять SCA для анализа состава.'],
              ['Фиксировать', 'Использовать lockfile, проверку хешей и доверенные источники.'],
              ['Подтверждать происхождение', 'Строить воспроизводимые сборки, подписывать артефакты, хранить provenance.'],
              ['Ограничивать CI/CD', 'Минимизировать полномочия и доступ к секретам.']
            ],
            takeaway: 'Обновление — это управляемое изменение, а не автоматическое благо.',
            source: '§ 8'
          },
          {
            id: 'labs-1-3',
            title: 'ЛР 1–3: отчёт — это цепочка доказательств',
            lead: 'Флаг или снимок экрана сами по себе не объясняют, что именно было подтверждено и как это исправить.',
            steps: [
              ['Среда и объект', 'Что проверялось и в какой разрешённой учебной среде.'],
              ['Наблюдение', 'Какой ответ или результат подтверждает проблему.'],
              ['Первопричина', 'Какой недостаток проектирования, кода или конфигурации её создал.'],
              ['Исправление и проверка', 'Какая мера устраняет причину и каким тестом это подтверждается.']
            ],
            takeaway: 'Ценность практики — в объяснении причины и проверяемой профилактике.',
            source: '§ 9'
          }
        ]
      },
      {
        id: 'owasp-4-6',
        label: '03 · A04–A06',
        title: 'OWASP Top 10:2025 — криптография, инъекции, проектирование',
        source: '§§ 10–13',
        slides: [
          {
            id: 'a04-6-overview',
            title: 'A04–A06: от криптографии к инвариантам',
            lead: 'Второй блок объединяет ошибки защиты данных, небезопасную интерпретацию ввода и недостатки требований.',
            cards: [
              ['A04 · криптографические сбои', 'Защита данных, ключей, токенов, TLS и проверка подписи.'],
              ['A05 · инъекции', 'Недоверенный ввод меняет смысл инструкции или выполняется в доверенном контексте.'],
              ['A06 · небезопасное проектирование', 'Критичные защитные свойства не определены до реализации.']
            ],
            takeaway: 'Уязвимости проявляются в коде, но часто возникают раньше — в решениях и ограничениях системы.',
            source: '§§ 10–12'
          },
          {
            id: 'a04',
            title: 'A04:2025 — криптографические сбои',
            lead: 'Криптография работает только как часть архитектуры: данные, ключи, протоколы, сроки и проверка должны быть согласованы.',
            cards: [
              ['Данные', 'Классификация: что защищается при хранении и передаче.'],
              ['Ключи и токены', 'Жизненный цикл, хранение, срок действия и отзыв.'],
              ['Протоколы', 'TLS, проверка сертификатов, сессии и безопасное восстановление доступа.']
            ],
            takeaway: 'Замена библиотеки не исправляет небезопасную модель использования.',
            source: '§ 10'
          },
          {
            id: 'jwt',
            title: 'JWT: проверяющий обязан быть строгим',
            lead: 'JWT содержит заголовок, полезную нагрузку и подпись или криптографический тег в зависимости от выбранного профиля.',
            steps: [
              ['Алгоритмы', 'Использовать allow-list допустимых алгоритмов.'],
              ['Подпись и ключ', 'Проверять криптографическую защиту с корректным ключом.'],
              ['Claims', 'Валидировать iss, aud, exp, nbf и другие релевантные утверждения.'],
              ['Негативные тесты', 'Проверять изменение заголовка, claims, подписи и ключа.']
            ],
            takeaway: 'Проблема возникает, когда уязвимый verifier принимает то, что не должен принимать.',
            source: '§ 10'
          },
          {
            id: 'a05',
            title: 'A05:2025 — инъекции меняют смысл инструкции',
            lead: 'Корень проблемы не в «опасных символах», а в смешении недоверенных данных и управляющей конструкции.',
            cards: [
              ['SQL injection', 'Ввод меняет структуру SQL-команды.'],
              ['XSS', 'Внедрённый сценарий выполняется в доверенном контексте браузера.'],
              ['Command injection', 'Ввод попадает в интерпретатор команд или системный процесс.']
            ],
            takeaway: 'Отделяйте данные от кода и выбирайте безопасные API для конкретного контекста.',
            source: '§ 11'
          },
          {
            id: 'sqli-controls',
            title: 'SQL injection: разделяйте код запроса и данные',
            lead: 'Защита строится на параметризации и ограничении полномочий, а не на поиске отдельных символов.',
            steps: [
              ['Параметризация', 'Использовать подготовленные выражения или безопасный query builder.'],
              ['Минимальные права БД', 'Учётная запись приложения не должна иметь лишних привилегий.'],
              ['Серверные ограничения', 'Проверять бизнес-правила и схему данных на стороне сервера.'],
              ['Регрессия', 'Добавлять негативные тесты и правило ревью против конкатенации запросов.']
            ],
            takeaway: 'Ввод должен быть значением, а не частью синтаксиса команды.',
            source: '§ 11.1'
          },
          {
            id: 'xss-controls',
            title: 'XSS: контекст вывода определяет защиту',
            lead: 'Выполнение внедрённого сценария возможно, когда приложение обрабатывает содержимое как доверенный код или HTML.',
            cards: [
              ['Вывод', 'Применять контекстно-зависимое экранирование и безопасные шаблоны.'],
              ['DOM', 'Избегать небезопасных вставок HTML; использовать безопасные DOM API.'],
              ['Дополнительный рубеж', 'CSP усиливает защиту, но не заменяет корректную обработку данных.']
            ],
            takeaway: 'XSS не сводится к cookie: главное последствие — код действует от имени жертвы в доверенном контексте.',
            source: '§ 11.2'
          },
          {
            id: 'web-controls',
            title: 'CSRF, redirect и команды: три разных контекста',
            lead: 'Похожая внешняя симптоматика не означает одинаковую первопричину или исправление.',
            cards: [
              ['CSRF', 'Анти-CSRF-токен, SameSite, проверка Origin/Referer как дополнительный сигнал.'],
              ['Open redirect', 'Серверная allow-list направлений или внутренние относительные маршруты.'],
              ['Command injection', 'Не использовать shell; применять безопасные API с аргументами и allow-list значений.']
            ],
            takeaway: 'Сначала определите интерпретатор и границу доверия, затем выбирайте контроль.',
            source: '§ 11.3'
          },
          {
            id: 'a06',
            title: 'A06:2025 — небезопасное проектирование',
            lead: 'Если защитное свойство не сформулировано до реализации, его нельзя надёжно «добавить» одним фильтром или WAF.',
            cards: [
              ['Злоупотребления', 'Сценарии обхода должны быть видны в требованиях и модели угроз.'],
              ['Инварианты', 'Роли, лимиты, антифрод, сегментация и условия безопасного отказа.'],
              ['Состояние', 'Критичные правила учитывают объект, действие, контекст и переход состояния.']
            ],
            takeaway: 'UI-валидация не заменяет доменную логику, ограничения базы данных и серверные проверки.',
            source: '§ 12'
          },
          {
            id: 'invariants',
            title: 'Бизнес-инварианты закрепляются на сервере',
            lead: 'Пример с корзиной или платежом показывает, почему клиент не должен определять критичный результат.',
            steps: [
              ['Количество', 'Значение должно соответствовать допустимому диапазону.'],
              ['Сумма', 'Рассчитывается на сервере из доверенных данных и не становится отрицательной.'],
              ['Деньги', 'Используется подходящий точный тип, а не двоичная плавающая точка.'],
              ['Операции', 'Скидки, возвраты и права проверяются атомарно с учётом состояния.']
            ],
            takeaway: 'Инвариант должен быть выражен в требованиях, реализации и негативных тестах.',
            source: '§ 12'
          },
          {
            id: 'labs-4-6',
            title: 'ЛР 4–6: фиксируем причину, а не «трюк»',
            lead: 'Отчёт связывает наблюдение с недостатком и проверяемым исправлением, а не превращает практику в набор payload’ов.',
            steps: [
              ['Наблюдение', 'Зафиксировать проверяемый результат в учебной среде.'],
              ['Причина', 'Объяснить уязвимый verifier, смешение данных и кода или нарушенный инвариант.'],
              ['Последствия', 'Описать реалистичный ущерб для пользователя, актива и процесса.'],
              ['Профилактика', 'Сформулировать серверную меру и регрессионную проверку.']
            ],
            takeaway: 'Качественное исправление проверяется тестом, правилом CI/CD, журналом или ревью.',
            source: '§ 13'
          }
        ]
      },
      {
        id: 'ai',
        label: '04 · ИИ',
        title: 'Безопасность ИИ и образовательная практика',
        source: '§§ 14–15',
        slides: [
          {
            id: 'ai-system',
            title: 'ИИ + безопасность + обучение',
            lead: 'Безопасность системы с моделью не сводится к одному prompt: важны данные, политики, инструменты, память, интеграции и люди.',
            cards: [
              ['Модель', 'Генерирует ответ, но не становится самостоятельной границей безопасности.'],
              ['Система', 'Оркестрация, RAG, инструменты, память, интерфейсы и учётные записи.'],
              ['Процесс', 'Проверка источников, контроль изменений, наблюдаемость и решение человека.']
            ],
            takeaway: 'Оценивать нужно архитектуру целиком, а не только качество ответа модели.',
            source: '§ 14'
          },
          {
            id: 'llm-risks',
            title: 'Классы рисков LLM-систем',
            lead: 'Риски меняются вместе с архитектурой; список нужен как отправная точка для моделирования угроз.',
            cards: [
              ['Ввод и вывод', 'Prompt injection, раскрытие чувствительных данных, небезопасная обработка вывода.'],
              ['Данные и поставка', 'Отравление данных/модели, риски внешних моделей, наборов данных и зависимостей.'],
              ['Действия и ресурсы', 'Чрезмерные полномочия агента, утечка инструкций, дезинформация, расход ресурсов.']
            ],
            takeaway: 'Указывайте версию и дату источника: рекомендации и классификации развиваются.',
            source: '§ 14.1'
          },
          {
            id: 'ai-supply-chain',
            title: 'Цепочка поставки ИИ — часть модели доверия',
            lead: 'Модель, набор данных, адаптеры, контейнер, registry и среда развёртывания имеют собственное происхождение и риски.',
            steps: [
              ['Инвентаризировать', 'Знать состав модели, данных, библиотек, образов и подключённых источников.'],
              ['Проверять происхождение', 'Использовать доверенные источники, хеши, подписи и воспроизводимые процессы.'],
              ['Ограничивать обновления', 'Не подключать новые модели, данные и инструменты без оценки изменений.'],
              ['Наблюдать', 'Фиксировать, что именно было использовано для конкретного результата.']
            ],
            takeaway: 'Новая модель или датасет — такое же изменение безопасности, как новая библиотека.',
            source: '§§ 14.1–14.2'
          },
          {
            id: 'agentic',
            title: 'Agentic application: модель действует через инструменты',
            lead: 'Риск возрастает, когда недостоверный ввод влияет на выбор инструмента, его параметры или права исполнения.',
            cards: [
              ['Цель и инструкции', 'Определяют задачу и допустимый контекст.'],
              ['Оркестрация', 'Выбирает последовательность шагов и обрабатывает результаты.'],
              ['Инструменты', 'Выполняют запросы, меняют данные, вызывают сервисы или используют учётные записи.']
            ],
            takeaway: 'Автономность определяется не названием «агент», а доступными действиями и контролями.',
            source: '§ 14.2'
          },
          {
            id: 'agent-controls',
            title: 'Контроль инструментов: наименьшие привилегии',
            lead: 'Модель не должна получать неограниченное право действовать от имени человека или системы.',
            steps: [
              ['Изолировать', 'Разделять среды и использовать отдельные учётные записи.'],
              ['Разрешать явно', 'Задавать allow-list операций, параметров и источников данных.'],
              ['Подтверждать человеком', 'Требовать явного решения для необратимых и финансово значимых действий.'],
              ['Трассировать', 'Журналировать действия, вводить лимиты и независимо проверять результат.']
            ],
            takeaway: 'Надёжный агент ограничен так же строго, как любой другой привилегированный сервис.',
            source: '§ 14.2'
          },
          {
            id: 'misinformation',
            title: 'Достоверность ответа требует отдельного контроля',
            lead: 'Правдоподобный текст не является доказательством: модель может ошибаться, опираться на устаревшие или противоречивые данные.',
            cards: [
              ['Источник', 'Показывать первоисточник, редакцию и дату проверки.'],
              ['Проверка', 'Сопоставлять значимые утверждения с независимым источником или экспертом.'],
              ['Ограничение', 'Не передавать модели право принимать необратимые решения без контроля.']
            ],
            takeaway: 'RAG и fine-tuning помогают работать с контекстом, но не отменяют валидацию результата.',
            source: '§§ 14.1, 14.3'
          },
          {
            id: 'ai-education',
            title: 'ИИ в образовательной практике',
            lead: 'Генеративный ИИ полезен для пояснений, вариантов упражнений и обратной связи, если учащийся сохраняет ответственность за вывод.',
            steps: [
              ['Пояснить', 'Использовать ИИ для разбора понятия и поиска альтернативных объяснений.'],
              ['Проверить', 'Сверять факты, версии, лицензии и безопасность кода с источниками.'],
              ['Обосновать', 'Уметь объяснить решение и показать воспроизводимое доказательство.'],
              ['Оценить', 'Фиксировать критерии качества, ограничения и происхождение материала.']
            ],
            takeaway: 'Сгенерированный текст — черновик; учебный результат — проверенное и объяснённое знание.',
            source: '§ 14.3'
          },
          {
            id: 'day-one-recap',
            title: 'Итог первого дня',
            lead: 'AppSec строится вокруг активов, границ доверия, архитектурных решений и доказуемых защитных свойств.',
            cards: [
              ['Понимать', 'Связывать категорию риска с активом, сценарием и последствиями.'],
              ['Проверять', 'Искать первопричину и подтверждать исправление тестом или контролем.'],
              ['Продолжать', 'Подготовить вопросы по A01–A06, карту поверхности атаки и точки SSDLC.']
            ],
            takeaway: 'Практика ценна тогда, когда она превращается в воспроизводимый процесс безопасной разработки.',
            source: '§ 15'
          }
        ]
      }
    ]
  };

  const flatSlides = deck.blocks.flatMap((block, blockIndex) => block.slides.map((slide) => ({
    ...slide,
    blockId: block.id,
    blockLabel: block.label,
    blockTitle: block.title,
    blockIndex
  })));

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const injectStyles = () => {
    if (document.getElementById('appsec-reconstructed-slides-style')) return;
    const style = document.createElement('style');
    style.id = 'appsec-reconstructed-slides-style';
    style.textContent = `
      .rs-deck { --rs-accent: var(--cyan, #65e5ff); display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; min-width: 0; max-width: 100%; color: var(--text, #f2f7ff); }
      .rs-deck:focus { outline: 2px solid var(--rs-accent); outline-offset: 8px; }
      .rs-topline, .rs-blocks, .rs-controls, .rs-slide-select, .rs-canvas { min-width: 0; max-width: 100%; }
      .rs-topline { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .85rem; }
      .rs-blocks, .rs-controls { display: flex; flex-wrap: wrap; gap: .5rem; }
      .rs-block-button, .rs-control { appearance: none; min-height: 40px; padding: .55rem .75rem; border: 1px solid var(--line, rgba(143,198,255,.2)); border-radius: 8px; background: var(--control-bg, rgba(13,31,53,.76)); color: var(--muted, #adc0d9); font: inherit; font-size: .82rem; font-weight: 750; line-height: 1.1; }
      .rs-block-button:hover, .rs-block-button:focus-visible, .rs-control:hover, .rs-control:focus-visible { border-color: var(--rs-accent); color: var(--text, #f2f7ff); }
      .rs-block-button[aria-current="true"] { border-color: var(--rs-accent); background: color-mix(in srgb, var(--rs-accent) 12%, var(--control-bg, rgba(13,31,53,.92))); color: var(--text, #f2f7ff); }
      .rs-counter { margin: 0; color: var(--muted, #adc0d9); font-size: .85rem; font-variant-numeric: tabular-nums; }
      .rs-progress { width: 100%; height: 3px; overflow: hidden; border-radius: 9px; background: var(--line, rgba(143,198,255,.2)); }
      .rs-progress > span { display: block; width: var(--rs-progress, 0%); height: 100%; background: var(--rs-accent); transition: width 180ms ease; }
      .rs-canvas { position: relative; display: grid; grid-template-rows: auto 1fr auto; min-height: min(66vw, 650px); aspect-ratio: 16 / 9; overflow: hidden; padding: clamp(1.35rem, 4vw, 4.1rem); border: 1px solid var(--line-strong, rgba(108,202,255,.48)); border-radius: 18px; background: var(--rs-canvas-bg); box-shadow: var(--rs-shadow); }
      .rs-canvas::after { position: absolute; right: 2.3%; bottom: 2.5%; width: min(18vw, 180px); aspect-ratio: 1; border: 1px solid color-mix(in srgb, var(--rs-accent) 42%, transparent); border-radius: 50%; box-shadow: 0 0 0 20px color-mix(in srgb, var(--rs-accent) 4%, transparent), 0 0 0 48px color-mix(in srgb, var(--rs-accent) 3%, transparent); content: ""; opacity: .9; pointer-events: none; }
      .rs-head, .rs-content, .rs-foot { position: relative; z-index: 1; }
      .rs-kicker { margin: 0 0 .7rem; color: var(--rs-accent); font-size: clamp(.7rem, 1.25vw, .9rem); font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
      .rs-title { max-width: 960px; margin: 0; font-size: clamp(1.6rem, 4.7vw, 4.5rem); line-height: .98; letter-spacing: -.055em; }
      .rs-lead { max-width: 900px; margin: clamp(.8rem, 2vw, 1.45rem) 0 0; color: var(--muted, #adc0d9); font-size: clamp(.92rem, 1.6vw, 1.24rem); line-height: 1.48; }
      .rs-content { align-self: center; display: grid; gap: clamp(.75rem, 1.8vw, 1.2rem); margin: clamp(1.15rem, 3.4vw, 2.6rem) 0; }
      .rs-card-grid { display: grid; grid-template-columns: repeat(var(--rs-columns, 3), minmax(0, 1fr)); gap: clamp(.6rem, 1.5vw, 1rem); }
      .rs-card { min-width: 0; padding: clamp(.75rem, 1.5vw, 1.1rem); border: 1px solid color-mix(in srgb, var(--rs-accent) 30%, var(--line, rgba(143,198,255,.2))); border-radius: 12px; background: var(--rs-card-bg); }
      .rs-card h3 { margin: 0 0 .38rem; color: var(--rs-accent); font-size: clamp(.84rem, 1.3vw, 1.08rem); line-height: 1.25; }
      .rs-card p { margin: 0; color: var(--text, #f2f7ff); font-size: clamp(.76rem, 1.12vw, .96rem); line-height: 1.42; }
      .rs-steps { display: grid; grid-template-columns: repeat(var(--rs-columns, 4), minmax(0, 1fr)); gap: clamp(.5rem, 1.25vw, .9rem); list-style: none; margin: 0; padding: 0; counter-reset: item; }
      .rs-step { min-width: 0; padding: .1rem .35rem .2rem 0; border-top: 1px solid color-mix(in srgb, var(--rs-accent) 45%, transparent); }
      .rs-step-index { display: block; margin: .55rem 0 .4rem; color: var(--rs-accent); font-size: clamp(1.15rem, 2vw, 1.7rem); font-weight: 850; line-height: 1; }
      .rs-step h3 { margin: 0 0 .34rem; font-size: clamp(.8rem, 1.15vw, 1rem); line-height: 1.25; }
      .rs-step p { margin: 0; color: var(--muted, #adc0d9); font-size: clamp(.72rem, 1.03vw, .9rem); line-height: 1.4; }
      .rs-foot { display: flex; align-items: end; justify-content: space-between; gap: 1rem; border-top: 1px solid var(--line, rgba(143,198,255,.2)); padding-top: .85rem; }
      .rs-takeaway { max-width: 78ch; margin: 0; color: var(--text, #f2f7ff); font-size: clamp(.77rem, 1.12vw, .95rem); font-weight: 700; line-height: 1.42; }
      .rs-source { flex: 0 0 auto; margin: 0; color: var(--muted, #adc0d9); font-size: .69rem; white-space: nowrap; }
      .rs-slide-select { max-width: 100%; min-height: 40px; padding: .45rem .6rem; border: 1px solid var(--line, rgba(143,198,255,.2)); border-radius: 8px; background: var(--control-bg, rgba(13,31,53,.76)); color: var(--text, #f2f7ff); font: inherit; font-size: .82rem; }
      @media (max-width: 820px) { .rs-canvas { min-height: 610px; aspect-ratio: auto; } .rs-card-grid, .rs-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); } .rs-canvas::after { width: 125px; } }
      @media (max-width: 560px) { .rs-topline { align-items: stretch; } .rs-blocks, .rs-controls { width: 100%; } .rs-block-button, .rs-control { flex: 1 1 auto; } .rs-canvas { min-height: 660px; padding: 1.15rem; border-radius: 13px; } .rs-card-grid, .rs-steps { grid-template-columns: 1fr; } .rs-foot { display: grid; gap: .55rem; } .rs-source { white-space: normal; } .rs-title { font-size: clamp(1.65rem, 10vw, 2.45rem); } }
      @media print { .rs-topline, .rs-progress, .rs-slide-select { display: none !important; } .rs-deck { display: block; } .rs-canvas { min-height: auto; aspect-ratio: 16 / 9; box-shadow: none; break-inside: avoid; } }
    `;
    document.head.append(style);
  };

  const mount = (target) => {
    if (!target) return;
    injectStyles();
    target.replaceChildren();
    target.classList.add('rs-deck');
    target.tabIndex = 0;
    target.setAttribute('aria-label', 'Интерактивная коллекция реконструированных слайдов первого дня');

    let activeIndex = 0;

    const topline = make('div', 'rs-topline');
    const blockButtons = make('div', 'rs-blocks');
    const controls = make('div', 'rs-controls');
    const previous = make('button', 'rs-control', '← Назад');
    const next = make('button', 'rs-control', 'Далее →');
    previous.type = 'button';
    next.type = 'button';
    const counter = make('p', 'rs-counter');
    controls.append(previous, next, counter);
    topline.append(blockButtons, controls);

    const select = make('select', 'rs-slide-select');
    select.setAttribute('aria-label', 'Перейти к слайду');
    flatSlides.forEach((slide, index) => {
      const option = make('option', '', `${index + 1}. ${slide.title}`);
      option.value = String(index);
      select.append(option);
    });

    const progress = make('div', 'rs-progress');
    progress.setAttribute('aria-hidden', 'true');
    const progressValue = make('span');
    progress.append(progressValue);
    const canvas = make('article', 'rs-canvas');
    canvas.tabIndex = -1;
    canvas.setAttribute('aria-live', 'polite');
    target.append(topline, select, progress, canvas);

    const show = (index, shouldFocus) => {
      activeIndex = (index + flatSlides.length) % flatSlides.length;
      const slide = flatSlides[activeIndex];
      const block = deck.blocks[slide.blockIndex];
      target.style.setProperty('--rs-progress', `${((activeIndex + 1) / flatSlides.length) * 100}%`);
      target.style.setProperty('--rs-accent', ['var(--cyan)', 'var(--good)', 'var(--amber)', 'var(--violet)'][slide.blockIndex]);
      counter.textContent = `${activeIndex + 1} / ${flatSlides.length}`;
      select.value = String(activeIndex);
      previous.disabled = activeIndex === 0;
      next.disabled = activeIndex === flatSlides.length - 1;
      for (const button of blockButtons.querySelectorAll('button')) {
        button.setAttribute('aria-current', String(button.dataset.block === block.id));
      }

      const head = make('header', 'rs-head');
      head.append(make('p', 'rs-kicker', `${slide.blockLabel} · ${block.title}`), make('h2', 'rs-title', slide.title), make('p', 'rs-lead', slide.lead));
      const content = make('div', 'rs-content');
      if (slide.cards) {
        const grid = make('div', 'rs-card-grid');
        grid.style.setProperty('--rs-columns', String(slide.cards.length));
        for (const [title, body] of slide.cards) {
          const card = make('section', 'rs-card');
          card.append(make('h3', '', title), make('p', '', body));
          grid.append(card);
        }
        content.append(grid);
      }
      if (slide.steps) {
        const steps = make('ol', 'rs-steps');
        steps.style.setProperty('--rs-columns', String(slide.steps.length));
        for (const [indexLabel, title, maybeBody] of slide.steps) {
          const body = maybeBody === undefined ? title : maybeBody;
          const heading = maybeBody === undefined ? `Шаг ${indexLabel}` : title;
          const step = make('li', 'rs-step');
          step.append(make('span', 'rs-step-index', indexLabel), make('h3', '', heading), make('p', '', body));
          steps.append(step);
        }
        content.append(steps);
      }
      const foot = make('footer', 'rs-foot');
      foot.append(make('p', 'rs-takeaway', `Главная мысль: ${slide.takeaway}`), make('p', 'rs-source', `Основание: вычищенная стенограмма, ${slide.source}`));
      canvas.replaceChildren(head, content, foot);
      if (shouldFocus) canvas.focus({ preventScroll: true });
    };

    for (const block of deck.blocks) {
      const button = make('button', 'rs-block-button', block.label);
      button.type = 'button';
      button.dataset.block = block.id;
      button.addEventListener('click', () => show(flatSlides.findIndex((slide) => slide.blockId === block.id), true));
      blockButtons.append(button);
    }
    previous.addEventListener('click', () => show(activeIndex - 1, true));
    next.addEventListener('click', () => show(activeIndex + 1, true));
    select.addEventListener('change', () => show(Number(select.value), true));
    target.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' && activeIndex > 0) { event.preventDefault(); show(activeIndex - 1, true); }
      if (event.key === 'ArrowRight' && activeIndex < flatSlides.length - 1) { event.preventDefault(); show(activeIndex + 1, true); }
      if (event.key === 'Home') { event.preventDefault(); show(0, true); }
      if (event.key === 'End') { event.preventDefault(); show(flatSlides.length - 1, true); }
    });

    show(0, false);
  };

  window.AppSecDay01ReconstructedSlides = Object.freeze({
    deck,
    slideCount: flatSlides.length,
    mount
  });

  document.addEventListener('DOMContentLoaded', () => mount(document.getElementById('reconstructed-slides')), { once: true });
})();
