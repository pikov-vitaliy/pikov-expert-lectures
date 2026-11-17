# Расширенные колоды лекций

Колода для видео и плеера занятия: кадр на экране меняется раз в 15–45 секунд рассказа. Краткая колода темы (HTML, PPTX, PDF) собирается в соседней папке `slides` и здесь не меняется.

## Состав

| Файл | Что это |
|---|---|
| `src/<id>/NN-имя.html` | части колоды: только элементы `<section class="slide">`, по порядку рассказа; `<id>` – день и тема (`11`, `12`) |
| `src/<id>/timed.tsv` | сценарий лекции: номер строки, время начала фразы в секундах, мм:сс, текст; строки `@slide N` – границы прежних блоков |
| `lecdeck.css` | дизайн-система слайдов (1280×720, светлая и тёмная темы) |
| `build.py` | сборка: один HTML, PNG 1920×1080 каждого кадра, `map.json` (кадр – строка сценария), обзорные листы, проверки |
| `nav.js`, `decks.json` | листание и названия колод |
| `_work/` | результат сборки, в git не входит; `_work/ban-extra.txt` – слова, которых не должно быть на слайдах, по одному в строке |

## Сборка

```
python -X utf8 build.py 11                    # вся колода -> _work/d11/
python -X utf8 build.py 11 --part 03-servisy  # одна часть -> _work/d11/parts/03-servisy/ (png, sheet-NN.png, report.txt)
```

Минимальное время кадра раскрытия – поле `min_hold` колоды в `decks.json` (секунды) или ключ `--min-hold S`: шаги короче порога склеиваются, пункты подсвечиваются по два-три, но не позже своей фразы. Для лекций дня 1 – 8 секунд (решение автора курса после просмотра и рецензий 15.11.2026). Для дня 2 – тоже 8 секунд (колоды 21 и 22, 17.11.2026; задание агентам – `_work/BRIEF-day2.md`). Пересчёт номеров строк после вставки блока в сценарий – `_work/renumber_deck_1611.py`. В подписях слайдов не писать пути к файлам («08-Схемы/…»): сайт их переписывает, в видео это выглядит как след подготовки.

Отчёт: число кадров, среднее и самое долгое время на экране, `ОШИБОК` (сборка не принимается), `ЗАМЕЧАНИЙ` (вёрстка и ритм).

## Разметка слайда

```html
<section class="slide" data-at="132">
  <p class="kick">Короткая рубрика</p>
  <h2>Заголовок слайда</h2>
  <div class="body"> … компоненты … </div>
  <p class="src"><svg class="i"><use href="#i-info"/></svg>Источник: автор, издание, год · doi.org/…</p>
</section>
```

- `data-at` – номер строки `timed.tsv` с фразой, на которой слайд появляется. Номера идут строго по возрастанию.
- Слайд без `h2` обязан иметь `data-title="…"` (название в списке слайдов плеера).
- `class="slide dark"` – тёмный слайд для главной мысли; `cover` – титул (`h1`, `.lead`, `.meta`); `sect` – начало раздела (`.no` – крупный номер, `h1`, `.lead`).
- `.body.top` – содержимое от верха, а не по центру.
- Тон любого блока: `t-teal` (модель, по умолчанию), `t-orange` (решение и действие инженера), `t-red` (риск, ошибка), `t-gray`.
- Значки – Lucide: `<svg class="i"><use href="#i-имя"/></svg>`, имена – файлы в `../slides/node_modules/lucide-static/icons/`.
- Рисунок из папки дня: `<img src="@day/08-Схемы/d1-cikl-agenta.png">` (встраивается при сборке).
- Цвета – только токены: `var(--teal)`, `var(--orange)`, `var(--red)`, `var(--ink)`, `var(--muted)`, `var(--surface)`, `var(--line)`, внутри блока с тоном – `var(--c)`, `var(--ct)` (подложка), `var(--ci)` (текст на подложке). Литеральные цвета не писать: колода работает в двух темах.

### Пошаговое раскрытие

```html
<section class="slide" data-at="139" data-steps="140,141,142,143,144"> … пять элементов с class="st" … </section>
```

На шаге k элементы до k-го обычные, k-й выделен, следующие приглушены. Номера в `data-steps` – строки сценария для каждого шага. Если `data-at` меньше первого шага, сначала показывается кадр, где всё приглушено (годится на 2–5 секунд вводной фразы). `data-end="N"` – итоговый кадр без выделения. Несколько элементов на одном шаге: у всех `.st` указать `data-s="номер шага"`.

## Компоненты (внутри `.body`)

| Класс | Разметка | Когда |
|---|---|---|
| `say` | `<p class="say">Модель пишет <b>черновик</b>, проверяет <em>инженер</em></p><p class="sub">пояснение</p>`; размеры `md`, `sm`, `xs` | главная мысль одной фразой |
| `quote` | `<figure class="quote"><blockquote>Слова докладчика, <b>главное</b></blockquote><figcaption><i class="ava">АС</i><span><b>Имя Фамилия</b>должность или событие</span></figcaption></figure>`; размеры `md`, `sm`, `xs` | мысль, которую лектор приводит со ссылкой на человека |
| `list` | `<ul class="list"><li class="st"><b>Тезис</b> – пояснение<small>мелкая строка</small></li></ul>`; варианты `num`, `check`, `cross`, размеры `big`, `sm` | перечисления |
| `cards` | `<div class="cards c3"><div class="card t-orange st"><span class="bdg"><svg class="i">…</svg></span><h3>Название</h3><p>Текст</p></div></div>`; `c3`, `c4`, `c5`, без класса – 2 колонки; `sm`; `card row` – значок слева | 2–5 равноправных понятий |
| `vs` | `<div class="vs"><div class="col t-teal"><h3>Слева</h3><ul><li>…</li></ul></div><div class="col t-red">…</div></div>`; `sm` | сравнение, «можно – нельзя», «было – стало» |
| `split` | `<div class="split s64"><div>…</div><div>…</div></div>`; `s46`, `s73`, `top` | текст и картинка рядом |
| `flow` | `<ol class="flow"><li class="step st"><h3>Шаг</h3><p>Текст</p></li></ol>`; `nonum` – без номеров (тогда можно `.bdg` со значком), `sm` – для 5 шагов | последовательность |
| `ladder` | `<div class="ladder"><div class="rung st"><span class="n">Ступень 1</span><h3>…</h3><p>…</p></div></div>` (до 5) | уровни, «лестница» |
| `stats` | `<div class="stats"><div class="stat t-red"><b>28,6–91,4 %</b><span>подпись</span></div></div>`; `md`, `sm` | одно-три крупных числа |
| `bars` | `<div class="bars" style="--max:100"><div class="bar t-red" style="--v:91.4"><span class="lb">Подпись</span><i></i><b>91,4 %</b></div></div>`; ширина подписи `--lbw` | сравнение чисел полосами |
| `segbar` | `<div class="segbar"><i class="t-teal" style="flex:3">Часть</i><i class="t-orange solid" style="flex:1">Часть</i><i class="off" style="flex:2">вне окна</i></div>` | доли целого, контекстное окно |
| `tbl` | `<table class="tbl"><thead><tr><th>…</th></tr></thead><tbody><tr class="st"><td>…</td></tr></tbody></table>`; `sm`; `tr.hl`, `td.yes`, `td.no` | таблица до 5 строк |
| `svc` | `<div class="svc t-teal"><div class="svc-hd"><i class="logo">G</i><h3>GigaChat</h3><p>Сбербанк</p><div class="tags"><span class="tag">…</span></div></div><dl class="kv"><div class="st"><dt>Вход</dt><dd>…</dd></div></dl></div>` | карточка сервиса или продукта |
| `kv` | `<dl class="kv"><div><dt>Ключ</dt><dd>Значение</dd></div></dl>`; `sm`; ширина ключа `--kw` | свойства в две колонки |
| `term` | `<div class="term"><dfn>Термин</dfn><p>Определение</p></div>` | новое понятие |
| `rule` | `<div class="rule t-orange"><svg class="i">…</svg><div><h3>Правило</h3><p>Текст</p></div></div>`; `sm`, `xs` | правило, предупреждение, вывод |
| `ask` | `<div class="ask t-orange"><span class="q">?</span><ul><li class="st">Вопрос</li></ul></div>` | вопросы к группе |
| `picts` | `<div class="picts c4"><div class="pict st"><svg class="i">…</svg><span>Подпись</span></div></div>`; `c3`, `c4`, `sm` | ряд пиктограмм |
| `timeline` | `<ol class="timeline"><li class="st"><b>16.11</b><span>Тема</span></li></ol>`; `li.now` | даты, этапы |
| `tree` | `<div class="tree" style="--n:4"><div class="root">Корень</div><div class="kids"><div class="kid st t-red"><h3>Ветвь</h3><p>…</p></div></div></div>` | классификация |
| `chat` | `<div class="chat"><div class="msg user"><span class="who">Запрос</span><p>…</p></div><div class="msg bot"><span class="who">Ответ модели</span><p>…</p></div></div>`; `msg bad` – ответ с ошибкой; `<mark>` – выделение | пример диалога |
| `prompt` | `<div class="prompt"><p class="part st t-teal"><span class="tg">Роль</span><span>Текст части запроса</span></p></div>`; ширина метки `--tw` | запрос по частям |
| `doc`, `docs` | `<div class="docs"><div class="doc"><h4>Протокол</h4><i></i><i class="hl"></i><i class="s"></i><b class="stamp t-teal">в чате</b></div></div>` | условный лист документа |
| `fig` | `<figure class="fig"><img src="@day/…png"><figcaption>Подпись</figcaption></figure>` | готовая схема |
| `tag`, `note`, `muted`, `center`, `big-ic` | мелкие помощники | |

Своя схема – встроенный SVG с цветами через `var(--…)` и `currentColor`.

## Правила содержания

- На слайде только то, что есть в сценарии лекции и материалах дня. Новых фактов, чисел, имён и примеров нет. Числа, названия и термины – как в материалах.
- Слайд – тезис, а не стенограмма: обычно до 35 слов.
- Слова докладчика (`quote`) – только то, что сценарий приписывает названному человеку; подпись – имя и событие по списку «Источники дня».
- Ссылка на исследование (`src`) – только когда лектор на него ссылается; формат «Автор et al. Издание, год · doi.org/…» по «Источникам дня».
- Тире «–»; знаков «—» и «→» нет. Без эмодзи.
- Кадр на экране не дольше 60 секунд; новый слайд – не короче 5 секунд, шаг раскрытия – не короче 2,5.
- Один и тот же макет не идёт три раза подряд.
