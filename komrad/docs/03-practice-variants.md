# Практическая работа: три варианта

## Общие правила

- Работайте только в учебных виртуальных машинах.
- Не используйте реальные учетные записи, персональные данные и рабочие системы.
- Все IP-адреса заменяйте на адреса своего стенда.
- В отчете фиксируйте факт, действие, результат в KOMRAD и вывод.
- Перед установкой KOMRAD подготовьте VirtualBox, Extension Pack, VM с Astra Linux 1.7/1.8 и сеть между VM.
- Используйте только «Внутреннюю сеть» или Host-only без маршрута в LAN; до начала сделайте снимок чистых VM.

## Вариант 1. Теоретический минимум

Подходит, если не хватает ресурсов VM или установка не успела завершиться.

Задания:

1. Прочитайте раздаточный конспект.
2. Откройте официальную страницу продукта: https://npo-echelon.ru/komrad-siem/
3. Откройте документацию 4.5.X: https://docs.etecs.ru/komrad/docs/intro/
4. Из папки ГОСТов прочитайте названия и назначение документов 59547, 59548, 59709-59712.
5. Составьте таблицу: "этап SIEM" -> "какой ГОСТ помогает обосновать".
6. Ответьте письменно: какие события Windows и Linux вы бы обязательно собирали в организации и почему.

Результат: заполненный отчет без установки.

## Вариант 2. Основной: KOMRAD + Windows

Цель: установить KOMRAD, подключить Windows-источник и увидеть события.

Шаги:

1. Подготовьте VM с Astra Linux 1.7 или 1.8 для KOMRAD в VirtualBox.
2. Получите демоверсию только через официальную страницу вендора
   <https://npo-echelon.ru/komrad-siem/> или используйте проверенный локальный
   комплект преподавателя. Преподаватель заранее фиксирует источник, версию и
   SHA-256 в отдельном реестре и передаёт ожидаемый хеш доверенным каналом.
3. Проверьте `.run` до выдачи прав и запуска. При несовпадении — `STOP`:

```bash
set -euo pipefail
INSTALLER='./ИМЯ_ФАЙЛА_УСТАНОВЩИКА.run'
: "${EXPECTED_INSTALLER_SHA256:?STOP: преподаватель не передал ожидаемый SHA-256}"
[[ "$EXPECTED_INSTALLER_SHA256" =~ ^[[:xdigit:]]{64}$ ]] || { echo 'STOP: неверный формат SHA-256' >&2; exit 1; }
ACTUAL_INSTALLER_SHA256="$(sha256sum -- "$INSTALLER" | awk '{print $1}')"
[[ "${ACTUAL_INSTALLER_SHA256,,}" == "${EXPECTED_INSTALLER_SHA256,,}" ]] || {
  echo 'STOP: SHA-256 установщика не совпал' >&2
  exit 1
}
# При наличии подписи: gpgv --keyring ./komrad-vendor.gpg "$INSTALLER.sig" "$INSTALLER"
chmod +x -- "$INSTALLER"
sudo -- "$INSTALLER"
```

4. Активируйте лицензию по инструкции преподавателя или вендора.
5. Откройте `https://KOMRAD_IP`.
6. Импортируйте образ Windows 10 в VirtualBox и проверьте `ping KOMRAD_IP`.
7. На Windows VM сначала проверьте SHA-256 и подпись WMI-агента, затем запустите
   проверенный файл от имени администратора:

```powershell
$WmiInstaller = Resolve-Path '.\ИМЯ_WMI_УСТАНОВЩИКА.exe'
$ExpectedWmiSha256 = Read-Host 'SHA-256 из отдельного реестра преподавателя'
if ($ExpectedWmiSha256 -notmatch '^[0-9A-Fa-f]{64}$') { throw 'STOP: неверный формат ожидаемого SHA-256.' }
$ActualWmiSha256 = (Get-FileHash -LiteralPath $WmiInstaller -Algorithm SHA256).Hash
if ($ActualWmiSha256 -cne $ExpectedWmiSha256.ToUpperInvariant()) { throw 'STOP: SHA-256 WMI-агента не совпал.' }
$WmiSignature = Get-AuthenticodeSignature -LiteralPath $WmiInstaller
if ($WmiSignature.Status -ne 'Valid') { throw "STOP: подпись WMI-агента невалидна: $($WmiSignature.Status)." }
Start-Process -FilePath $WmiInstaller -Verb RunAs -Wait
```
8. В KOMRAD включите WMI-агент и настройте сбор журнала `Security`.
9. Сгенерируйте события с уникальной одноразовой учётной записью; общий пароль между слушателями запрещён:

```powershell
$LabId = [guid]::NewGuid().ToString('N').Substring(0, 8)
$LabUser = "komrad_$LabId"
$LabPassword = "K!$([guid]::NewGuid().ToString('N').Substring(0, 16))a7"
$LabPassword2 = "K!$([guid]::NewGuid().ToString('N').Substring(0, 16))b8"
$LabUserCreated = $false
net user $LabUser $LabPassword /add
$CreateExitCode = $LASTEXITCODE
if ($CreateExitCode -ne 0) { throw "Не удалось создать $LabUser (код $CreateExitCode)." }
$LabUserCreated = $true
try {
    # Имя встроенной группы локализовано; well-known SID одинаков для RU/EN Windows.
    $AdministratorsSid = [System.Security.Principal.SecurityIdentifier]'S-1-5-32-544'
    $AdministratorsGroup = Get-LocalGroup -SID $AdministratorsSid -ErrorAction Stop
    if ($AdministratorsGroup.SID.Value -ne $AdministratorsSid.Value) {
        throw 'STOP: не удалось однозначно разрешить встроенную группу локальных администраторов.'
    }
    Add-LocalGroupMember -Group $AdministratorsGroup -Member $LabUser -ErrorAction Stop
    net user $LabUser $LabPassword2
    if ($LASTEXITCODE -ne 0) { throw "Не удалось сменить одноразовый пароль $LabUser." }

    New-Item -ItemType Directory -Force C:\LabEvidence -ErrorAction Stop | Out-Null
    $EvidencePath = 'C:\LabEvidence\Security-before-clear.evtx'
    wevtutil epl Security $EvidencePath /ow:true
    $ExportExitCode = $LASTEXITCODE
    if ($ExportExitCode -ne 0) {
        throw "Экспорт Security завершился с кодом $ExportExitCode; журнал НЕ очищен."
    }
    if (-not (Test-Path -LiteralPath $EvidencePath -PathType Leaf)) {
        throw "Файл экспорта не создан; журнал НЕ очищен."
    }
    if ((Get-Item -LiteralPath $EvidencePath).Length -le 0) {
        throw "Файл экспорта пуст; журнал НЕ очищен."
    }
    $EvidenceSha256 = (Get-FileHash -LiteralPath $EvidencePath -Algorithm SHA256).Hash
    Write-Host "EVTX сохранён: $EvidencePath; SHA-256: $EvidenceSha256"

    # Преподаватель вводит подтверждение только после проверки EVTX и приёма событий в KOMRAD.
    $ClearConfirmation = Read-Host 'Преподаватель: для очистки одноразовой VM введите CONFIRM-CLEAR'
    if ($ClearConfirmation -cne 'CONFIRM-CLEAR') {
        throw "Очистка отменена: подтверждение преподавателя не получено."
    }
    wevtutil cl Security
    $ClearExitCode = $LASTEXITCODE
    if ($ClearExitCode -ne 0) {
        throw "Очистка Security завершилась с кодом $ClearExitCode; восстановите VM из снимка."
    }
}
finally {
    if ($LabUserCreated) {
        net user $LabUser /delete
        $DeleteExitCode = $LASTEXITCODE
        if ($DeleteExitCode -ne 0) {
            throw "STOP: не удалось удалить $LabUser (код $DeleteExitCode); восстановите VM из исходного снимка."
        }
    }
}
```

10. Найдите события в "Событиях в реальном времени".
11. Опишите, какие события выглядят рутинными, а какие подозрительными.
12. Экспортируйте только обезличенное доказательство; блок `finally` проверяемо удалит `$LabUser`. Затем восстановите Windows VM из исходного снимка. Не переносите EVTX и пароли за пределы стенда.

Результат: отчет с событиями Windows.

## Вариант 3. Продвинутый: KOMRAD + Windows + Linux

Цель: подключить два разных типа источников и сравнить события.

Выполните все шаги варианта 2, затем добавьте Linux VM.

Шаги для Linux:

1. Создайте или импортируйте вторую Linux/Astra VM в VirtualBox.
2. Проверьте сеть: Linux должен видеть `KOMRAD_IP`.
3. Настройте отправку syslog/auditd по методике преподавателя или документации.
4. Сгенерируйте события:

```bash
logger "KOMRAD lab: test syslog message from Linux source"
LAB_USER="komrad_$(openssl rand -hex 6)"
set -euo pipefail
LAB_USER_CREATED=0

cleanup_lab_user() {
  cleanup_rc=$?
  trap - EXIT INT TERM HUP
  if [[ "$LAB_USER_CREATED" -eq 1 ]]; then
    if ! sudo userdel --remove "$LAB_USER"; then
      echo "STOP: не удалось удалить $LAB_USER; восстановите VM из исходного снимка" >&2
      exit 90
    fi
    if getent passwd "$LAB_USER" >/dev/null; then
      echo "STOP: $LAB_USER остался в системе; восстановите VM из исходного снимка" >&2
      exit 91
    fi
  fi
  exit "$cleanup_rc"
}
trap cleanup_lab_user EXIT INT TERM HUP

for attempt in $(seq 1 10); do
  if ! getent passwd "$LAB_USER" >/dev/null; then break; fi
  LAB_USER="komrad_$(openssl rand -hex 6)"
done
if getent passwd "$LAB_USER" >/dev/null; then
  echo 'STOP: не удалось подобрать свободное имя учебной учётной записи' >&2
  exit 1
fi
sudo useradd --create-home --shell /usr/sbin/nologin "$LAB_USER"
LAB_USER_CREATED=1
logger "KOMRAD lab: created disposable account $LAB_USER"
ssh wronguser@localhost || true
```

Группа `adm` не назначается: для учебного события достаточно создания и
удаления. `trap` гарантирует попытку проверяемой очистки при завершении, ошибке
или прерывании; при неуспехе остановитесь и восстановите исходный снимок VM.

5. Найдите события Linux в KOMRAD.
6. Сравните Windows и Linux:

| Вопрос | Ответ |
|---|---|
| Какой источник подключался проще? | |
| Какие события понятнее после нормализации? | |
| Какие события можно считать признаками инцидента? | |
| Что нужно настроить дополнительно в реальной организации? | |

Результат: отчет с событиями Windows и Linux, выводами и минимум одним предложением по улучшению мониторинга.
