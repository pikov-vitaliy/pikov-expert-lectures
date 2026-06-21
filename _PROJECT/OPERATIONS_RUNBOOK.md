# Операционный протокол pikov.expert

Дата фиксации: 2026-06-21.

Этот файл является стартовой точкой для следующих изменений сайта. Если задача касается контента, метаданных, публикации, очистки или проверки `pikov.expert`, начинать нужно отсюда и не менять порядок без явной причины.

## 1. Стартовая синхронизация

```powershell
git status --short --branch
git pull --ff-only
git status --short --branch
```

Если дерево не чистое, сначала понять происхождение изменений. Не смешивать чужие незавершенные правки с новой задачей.

## 2. Проверка scope

- Сверить задачу с `_PROJECT\lectures.json`.
- Проверить, затрагивается ли корневой каталог `index.html`.
- Для опубликованных доменов проверять не только локальные файлы, но и живой URL.
- Помнить, что часть материалов может иметь внешний источник, например соседний source-tree, а не только текущую папку.

## 3. Технические инварианты страницы

Для каждой HTML-страницы, которая публикуется как лекция или карточка курса:

- `lang="ru"` на корневом HTML-элементе;
- responsive viewport: `width=device-width, initial-scale=1.0`;
- `title`, `meta description`, canonical URL;
- Yandex Metrika `109116119` с `webvisor:false`;
- OpenGraph: `og:title`, `og:description`, `og:type`, `og:url`, `og:image`;
- JSON-LD `Course`, `CreativeWork` или `ItemList` по типу страницы;
- навигационная ссылка `brand-back` на `https://pikov.expert`, кроме самого корневого каталога;
- отсутствие ссылок на `_PROJECT`, локальные staging-папки, старые `index-v*`, `indexOLD*`, `index1.html`.

## 4. Обязательная локальная цепочка

Запускать в этом порядке:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\update-site-control-files.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\smoke-check.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\build-release.ps1
node .\_PROJECT\browser-qa.mjs
```

Ожидаемые признаки успеха:

- `SMOKE OK`;
- `RELEASE BUILD OK`;
- `BROWSER QA OK`;
- `staticIssues=0`;
- нет новых предупреждений в `git diff --check`.

## 5. Публикация

Публиковать только после зеленой локальной цепочки:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\deploy-hosting.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\hosting-check.ps1
```

После публикации проверить минимум:

```powershell
curl.exe -I https://pikov.expert/
curl.exe -I https://spdx.pikov.expert/
```

Оба ответа должны быть `HTTP/1.1 200 OK` и содержать защитные заголовки:

- `Strict-Transport-Security`;
- `Content-Security-Policy`;
- `X-Content-Type-Options`;
- `X-Frame-Options`;
- `Referrer-Policy`;
- `Permissions-Policy`.

## 6. Git gate

Фиксировать изменения только после успешных проверок:

```powershell
git status --short --branch
git diff --check
git add -A
git diff --cached --check
git commit -m "<короткое действие>"
git push origin main
git status --short --branch
git ls-remote origin refs/heads/main
```

После push дождаться GitHub Actions:

```powershell
gh run list --branch main --limit 1
gh run watch <run-id> --exit-status
```

Закрывать работу можно только когда:

- локальное дерево чистое;
- `main...origin/main` без расхождения;
- remote `refs/heads/main` указывает на новый commit;
- GitHub Actions завершился `success`;
- опубликованный сайт прошел `hosting-check.ps1`.

## 7. Что не делать

- Не деплоить без `build-release.ps1`.
- Не считать локальный успех равным live-успеху.
- Не добавлять HTTPS rewrite в `.htaccess`: редирект выполняется на уровне хостинга, дублирование может создать self-redirect loop за TLS-терминатором.
- Не обновлять дополнительные домены, не входящие в текущий release index, без отдельного решения.
- Не оставлять опубликованное состояние незакоммиченным.
