# Операционный протокол pikov.expert

Дата актуализации: 2026-08-21.

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

- `lang` корневого HTML-элемента совпадает с языком активной версии страницы;
- иноязычные фрагменты размечены собственным `lang`, когда это требуется
  [WCAG 2.2 SC 3.1.2](https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html);
- для bilingual root английская версия имеет `lang="en"` и self-canonical URL,
  русская — `lang="ru"` и свой self-canonical URL; обе версии публикуют
  согласованные `hreflang="en"`, `hreflang="ru"` и `hreflang="x-default"`;
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

Сборка без `-AcceptedSourceCommit` всегда создаёт candidate release. Даже из
чистого дерева он имеет `policyDecision=deny-deploy` и `deployable=false` и
предназначен только для локальных static/independence/browser gates. Для
изменённого tracked tree дополнительно записывается `sourceDirty=true`.
`sourceTreeSha256` в каждой записи связывает выбранное содержимое конкретной
цели с manifest и архивом.

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

`-AcceptedSourceCommit` связывает артефакты с exact clean `HEAD` и отклоняет
commit вне локально доступной истории `main`, но сам по себе не доказывает, что
это текущий принятый tip с зелёным CI. Такое решение даёт только цепочка
PR → merged `main` → синхронизированный `origin/main` → exact-SHA CI `success`
из раздела 5. Detached accepted build разрешён исключительно для rollback по
процедуре 6.1 на ранее подтверждённый accepted SHA. Для воспроизводимости
accepted index использует логический `sourceRef=refs/heads/main` независимо от
main/detached checkout; фактический checkout ref записывается только в
недетерминированное deploy evidence.

```powershell
$releaseDate = '<YYYY-MM-DD>'
$releaseIndex = ".\_PROJECT\RELEASE_INDEX_$releaseDate.json"
if ((git rev-parse HEAD) -ne $acceptedSha) { throw 'HEAD differs from accepted SHA' }
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\build-release.ps1 -ReleaseDate $releaseDate -AcceptedSourceCommit $acceptedSha -FailOnIssues
$trackedDrift = @(git status --porcelain=v1 --untracked-files=no)
if ($LASTEXITCODE -ne 0) {
    throw 'Could not inspect tracked files after release build'
}
if ($trackedDrift.Count -ne 0) {
    $trackedDrift | ForEach-Object { Write-Host $_ }
    throw 'Tracked files changed during release build'
}
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\test-public-release-independence.ps1 -ReleaseIndex $releaseIndex
$releaseEntries = @(Get-Content -LiteralPath $releaseIndex -Encoding UTF8 -Raw | ConvertFrom-Json)
$invalidProvenance = @($releaseEntries | Where-Object {
    $_.sourceCommit -ne $acceptedSha -or
    $_.releaseKind -ne 'accepted' -or
    $_.sourceDirty -ne $false -or
    $_.deployable -ne $true -or
    $_.policyDecision -ne 'allow-deploy'
})
if ($invalidProvenance.Count -ne 0) { throw 'Accepted release provenance mismatch' }
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\deploy-hosting.ps1 -ReleaseDate $releaseDate -ExpectedSourceCommit $acceptedSha -KeepRemoteDeployRoot
powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\hosting-check.ps1 -ReleaseDate $releaseDate
$env:RELEASE_DATE=$releaseDate; node .\_PROJECT\browser-qa-online.mjs
```

Проверка `--untracked-files=no` намеренно не затрагивает непубличный каталог
`pc/`, но завершает публикацию ошибкой при любом staged или unstaged изменении
отслеживаемого файла, которое появилось во время повторной сборки принятого SHA.
Tracked source manifests и checksum-файлы должны быть воспроизводимы и уже
находиться в Git в точном состоянии, соответствующем исходным материалам.
Release index, release manifests и ZIP воспроизводимо регенерируются из
accepted SHA и остаются ignored build artifacts; процесс публикации запрещает
их подмену между accepted build и deploy.

Для адресной публикации корня и одного поддомена без повторного развёртывания
всей сети:

```powershell
& .\_PROJECT\deploy-hosting.ps1 -ReleaseDate $releaseDate -ExpectedSourceCommit $acceptedSha -OnlyDomains @('pikov.expert', 'example.pikov.expert') -KeepRemoteDeployRoot
```

`deploy-hosting.ps1` повторно запускает gate публичной независимости, сверяет
exact `ExpectedSourceCommit`, accepted policy и SHA-256 release-архивов, а
per-target source-tree hash пересчитывает по путям, размерам и содержимому
файлов непосредственно из выбранного ZIP. Затем он делает временные резервные
копии и запускает полный `hosting-check.ps1` в дочернем процессе: его ненулевой
exit code переводит попытку в `FAILED`. Каждая попытка получает отдельное
свидетельство
`_PROJECT\HOSTING_DEPLOY_<date>_<stamp>_<shortsha>.md` со статусом
`PREPARED`, `DEPLOYED` или `FAILED`, UTC-временем, exact SHA и хешами всех
выбранных целей: частичный deploy не перезаписывает историю полного.

Эти проверки обнаруживают stale или внутренне несогласованные артефакты, но не
заменяют криптографическую подпись/attestation: процесс с write-доступом к
ignored index и ZIP способен согласованно заменить оба файла и пересчитать
хеши. Поэтому accepted-сборка и deploy выполняются в одной контролируемой
exact-SHA CI/операторской цепочке с ограниченным доступом к workspace. Для
защиты от враждебного процесса в той же среде потребуется подписанная
attestation либо свежая изолированная пересборка перед публикацией.

Для remediation и rollback удалённый `_deploy_pikov_<timestamp>` сохраняется
ключом `-KeepRemoteDeployRoot`. Без этого ключа скрипт удаляет его только после
успешного deploy и post-deploy check. Успешный retained-каталог удаляется лишь
после независимого verdict `READY` и проверки, что его backups больше не нужны.

### 6.1. Исполнимый rollback на предыдущий принятый SHA

Источник rollback — previous accepted SHA и его заново проверенный release из
отдельного чистого worktree. Область возврата должна точно совпадать со списком
доменов неудачной публикации. До запуска нужно подтвердить сохранённые
exact-SHA CI `success` и deploy/release evidence этого previous SHA:

```powershell
$previousAcceptedSha = '<40-hex previous accepted main SHA>'
$rollbackDomains = @('pikov.expert', 'example.pikov.expert')
$rollbackDate = '<YYYY-MM-DD>'
$rollbackWorktree = Join-Path (Split-Path -Parent $PWD) "pikov-rollback-$($previousAcceptedSha.Substring(0, 12))"

git worktree add --detach $rollbackWorktree $previousAcceptedSha
Push-Location $rollbackWorktree
try {
    if ((git rev-parse HEAD) -ne $previousAcceptedSha) { throw 'Rollback worktree SHA mismatch' }
    if (@(git status --porcelain=v1 --untracked-files=no).Count -ne 0) { throw 'Rollback worktree is dirty' }
    powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\build-release.ps1 -ReleaseDate $rollbackDate -AcceptedSourceCommit $previousAcceptedSha -FailOnIssues
    $rollbackIndex = ".\_PROJECT\RELEASE_INDEX_$rollbackDate.json"
    powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\test-public-release-independence.ps1 -ReleaseIndex $rollbackIndex
    powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\deploy-hosting.ps1 -ReleaseDate $rollbackDate -ExpectedSourceCommit $previousAcceptedSha -OnlyDomains $rollbackDomains -KeepRemoteDeployRoot
    powershell -NoProfile -ExecutionPolicy Bypass -File .\_PROJECT\hosting-check.ps1 -ReleaseDate $rollbackDate
    $env:RELEASE_DATE=$rollbackDate; node .\_PROJECT\browser-qa-online.mjs
} finally {
    Pop-Location
}
```

После независимого `READY` удалить worktree командой
`git worktree remove $rollbackWorktree` и отдельно удалить только exact
retained remote path из deploy evidence. Перед `ssh ... rm -rf` путь обязан
пройти проверку ожидаемого `$HOME/_deploy_pikov_<timestamp>`; удаление по glob,
пустой переменной или непроверенному пути запрещено.

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
