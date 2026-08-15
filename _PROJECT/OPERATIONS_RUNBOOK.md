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
$releaseDate = '<YYYY-MM-DD>'
$releaseIndex = ".\_PROJECT\RELEASE_INDEX_$releaseDate.json"
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\update-site-control-files.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\smoke-check.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\build-release.ps1 -ReleaseDate $releaseDate -FailOnIssues
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\test-public-release-independence.ps1 -ReleaseIndex $releaseIndex
$env:RELEASE_DATE=$releaseDate; node .\_PROJECT\browser-qa.mjs
```

Ожидаемые признаки успеха:

- `SMOKE OK`;
- `RELEASE BUILD OK`;
- `PUBLIC INDEPENDENCE TEST OK`;
- `BROWSER QA OK`;
- `staticIssues=0`;
- нет новых предупреждений в `git diff --check`.

Focused-тесты, document render/a11y и browser-проверки изменённых страниц
добавляются к этой цепочке. Они не заменяют полный release gate.

## 5. Git и CI gate

Фиксировать изменения только после успешных локальных проверок. В рабочем
дереве может существовать непубличный пользовательский каталог `pc/`, поэтому
`git add -A` запрещён: staging всегда выполняется по явно перечисленным путям.

```powershell
git status --short --branch
git diff --check
git add -- <явно перечисленные пути>
git diff --cached --check
git diff --cached --stat
git commit -m "<короткое действие>"
git push origin HEAD
$prNumber = <PR-number>
gh pr checks $prNumber --watch --required
gh pr merge $prNumber --merge --delete-branch
$mergedPr = gh pr view $prNumber --json state,baseRefName,mergeCommit | ConvertFrom-Json
if ($mergedPr.state -ne 'MERGED' -or $mergedPr.baseRefName -ne 'main') {
    throw 'PR was not accepted and merged into main'
}

git switch main
git pull --ff-only origin main
$acceptedSha = git rev-parse origin/main
if ((git rev-parse HEAD) -ne $acceptedSha) { throw 'HEAD differs from accepted origin/main SHA' }

$acceptedRun = gh run list --commit $acceptedSha --workflow site-checks.yml --limit 1 --json databaseId,headSha | ConvertFrom-Json | Select-Object -First 1
if ($null -eq $acceptedRun -or $acceptedRun.headSha -ne $acceptedSha) {
    throw 'Exact-SHA CI run for accepted main commit was not found'
}
gh run watch $acceptedRun.databaseId --exit-status
$acceptedResult = gh run view $acceptedRun.databaseId --json headSha,status,conclusion | ConvertFrom-Json
if ($acceptedResult.headSha -ne $acceptedSha -or
    $acceptedResult.status -ne 'completed' -or
    $acceptedResult.conclusion -ne 'success') {
    throw 'Accepted main SHA did not complete CI successfully'
}
```

К публикации принимается не SHA feature-ветки, а только merge commit принятого
PR, полученный после fast-forward синхронизации локальной `main` с
`origin/main`. Публиковать можно только тот точный SHA, для которого GitHub
Actions завершился с `success`. Если после этой проверки в `main` появился
новый commit, нужно снова выполнить `git pull --ff-only origin main`, получить
новый `$acceptedSha` и подтвердить CI именно этого SHA.

## 6. Публикация принятого SHA

Перед публикацией подтвердить, что текущая ветка — `main`, `HEAD` равен
принятому SHA из `origin/main`, а рабочее дерево не содержит незакоммиченных
публичных изменений. Только после успешного exact-SHA CI пересобрать release из
этого SHA и развернуть его:

```powershell
$releaseDate = '<YYYY-MM-DD>'
$releaseIndex = ".\_PROJECT\RELEASE_INDEX_$releaseDate.json"
if ((git rev-parse HEAD) -ne $acceptedSha) { throw 'HEAD differs from accepted SHA' }
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\build-release.ps1 -ReleaseDate $releaseDate -FailOnIssues
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\test-public-release-independence.ps1 -ReleaseIndex $releaseIndex
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\deploy-hosting.ps1 -ReleaseDate $releaseDate
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\hosting-check.ps1 -ReleaseDate $releaseDate
$env:RELEASE_DATE=$releaseDate; node .\_PROJECT\browser-qa-online.mjs
```

Для адресной публикации корня и одного поддомена без повторного развёртывания
всей сети:

```powershell
& .\_PROJECT\deploy-hosting.ps1 -ReleaseDate $releaseDate -OnlyDomains @('pikov.expert', 'example.pikov.expert')
```

`deploy-hosting.ps1` повторно запускает gate публичной независимости, сверяет
SHA-256 release-архивов, делает временные резервные копии, запускает полный
`hosting-check.ps1` и только после успешной проверки удаляет удалённый каталог
`_deploy_pikov_<timestamp>`. Для диагностики неуспешной публикации каталог
сохраняется автоматически; при осознанной ручной диагностике его можно оставить
ключом `-KeepRemoteDeployRoot`.

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

Закрывать работу можно только когда:

- локальное дерево чистое;
- `main...origin/main` без расхождения;
- remote `refs/heads/main` указывает на новый commit;
- GitHub Actions точного опубликованного SHA завершился `success`;
- опубликованный сайт прошел `hosting-check.ps1`.

## 7. Что не делать

- Не деплоить без `build-release.ps1`.
- Не деплоить до commit, push и успешного CI точного SHA.
- Не использовать `git add -A` в этом репозитории и не включать `pc/` в staging.
- Не считать локальный успех равным live-успеху.
- Не добавлять HTTPS rewrite в `.htaccess`: редирект выполняется на уровне хостинга, дублирование может создать self-redirect loop за TLS-терминатором.
- Не обновлять дополнительные домены, не входящие в текущий release index, без отдельного решения.
- Не хранить успешные `_deploy_pikov_*` в домашней папке хостинга: это временные ZIP, распакованные копии и резервные архивы, а не контент сайтов.
- Не оставлять опубликованное состояние незакоммиченным.
