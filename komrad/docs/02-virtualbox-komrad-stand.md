# Памятка: стенд KOMRAD в VirtualBox

## Что вы будете делать

1. Установить VirtualBox.
2. Установить Extension Pack той же версии, что и VirtualBox.
3. Подготовить VM с Astra Linux 1.7 или 1.8.
4. Скачать демо-версию KOMRAD Enterprise SIEM 4.5 у вендора или получить файл от преподавателя.
5. Установить KOMRAD в Astra Linux.
6. Импортировать Windows 10 в VirtualBox.
7. Подключить Windows 10 как источник событий.
8. В продвинутом варианте добавить вторую Linux/Astra VM.

## Сеть VirtualBox

Все VM должны видеть друг друга по IP:

- KOMRAD VM;
- Windows 10 VM;
- Linux/Astra VM, если выполняете продвинутый вариант.

Используйте только **«Внутреннюю сеть»** VirtualBox либо отдельную **Host-only**
сеть без маршрута в корпоративную/LAN-сеть. Режим bridge запрещён. До установки
сделайте снимок каждой чистой VM; после практики он является основной точкой
восстановления. NAT допускается временно только для получения проверенного
дистрибутива преподавателем, затем адаптер отключается до генерации событий.

Проверьте в Linux/Astra:

```bash
ip a
ping -c 3 KOMRAD_IP
```

Проверьте в Windows:

```powershell
ipconfig
ping KOMRAD_IP
```

Если VM не видят друг друга, сначала исправьте сеть VirtualBox. Без сети события не попадут в SIEM.

## Установка KOMRAD

Получайте демоверсию только через официальную страницу вендора
<https://npo-echelon.ru/komrad-siem/> либо из подготовленного преподавателем
комплекта. До занятия преподаватель фиксирует в отдельном реестре источник,
точное имя, версию и SHA-256 каждого установщика; ожидаемый хеш передаётся
слушателям по отдельному доверенному каналу. При наличии отделённой подписи
вендора она также проверяется доверенным ключом. Несовпадение — это `STOP`:
такой файл нельзя запускать с правами root.

Проверка Linux-установщика выполняется **до** `chmod` и `sudo`:

```bash
set -euo pipefail
INSTALLER='./ИМЯ_ФАЙЛА_УСТАНОВЩИКА.run'
: "${EXPECTED_INSTALLER_SHA256:?STOP: преподаватель не передал ожидаемый SHA-256}"
[[ "$EXPECTED_INSTALLER_SHA256" =~ ^[[:xdigit:]]{64}$ ]] || {
  echo 'STOP: ожидаемый SHA-256 имеет неверный формат' >&2
  exit 1
}
ACTUAL_INSTALLER_SHA256="$(sha256sum -- "$INSTALLER" | awk '{print $1}')"
[[ "${ACTUAL_INSTALLER_SHA256,,}" == "${EXPECTED_INSTALLER_SHA256,,}" ]] || {
  echo 'STOP: SHA-256 установщика не совпал с реестром преподавателя' >&2
  exit 1
}
# Если вендор предоставил .sig, преподаватель заранее выдаёт доверенный keyring:
# gpgv --keyring ./komrad-vendor.gpg "$INSTALLER.sig" "$INSTALLER"
chmod +x -- "$INSTALLER"
sudo -- "$INSTALLER"
```

Для Astra Linux 1.7 и 1.8 подставьте фактическое имя проверенного файла,
например `komrad_v4.5.22_astra_1.7_amd64.run` или
`komrad_v4.5.22-demo_astra_1.8_amd64.run`. Не копируйте хеш из имени файла и
не вычисляйте «ожидаемое» значение из того же недоверенного экземпляра.

После установки откройте в браузере:

```text
https://KOMRAD_IP
```

Если браузер предупреждает о сертификате, в учебном стенде это ожидаемо. Преподаватель отдельно покажет, как импортировать корневой сертификат, если это понадобится.

## Windows 10 источник

1. Импортируйте образ Windows 10 в VirtualBox.
2. Проверьте сеть до KOMRAD.
3. Проверьте WMI-агент и только затем установите его от имени администратора:

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
4. В KOMRAD включите WMI-агент и настройте сбор журнала `Security`.
5. Сгенерируйте события с уникальной одноразовой учётной записью. Не используйте
фиксированный общий пароль:

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
    # Встроенная группа администраторов имеет локализованное имя. Разрешаем её
    # по well-known SID, а не по английской строке "Administrators".
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

Очистка допустима только в одноразовой учебной VM после экспорта журнала и
подтверждения приёма событий в KOMRAD. Сразу после наблюдения удалите временную
учётную запись (это проверяемо делает блок `finally`), экспортируйте обезличенное
доказательство из SIEM и восстановите VM из исходного снимка. Пароли и EVTX не
включайте в отчёт и не переносите за пределы стенда.

## Linux/Astra источник

Для первого теста используйте безопасное сообщение:

```bash
logger "KOMRAD lab: test syslog message from Linux source"
```

Затем можно сгенерировать учетные события:

```bash
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

Группа `adm` этой учётной записи не требуется: для события достаточно создания
и гарантированного удаления. Обработчик `trap` выполняет удаление при штатном
завершении, ошибке и прерывании; при ошибке очистки работа останавливается и VM
восстанавливается из исходного снимка.

Если SSH в вашей Linux VM не установлен или не запущен, пропустите SSH и зафиксируйте это в отчете.

## Что обязательно записать в отчет

- IP-адрес KOMRAD.
- IP-адрес Windows 10.
- IP-адрес Linux/Astra, если был.
- Какой установщик KOMRAD использовали.
- Какие события сгенерировали.
- Какие события увидели в KOMRAD.
- Какие проблемы возникли и как вы их проверяли.
