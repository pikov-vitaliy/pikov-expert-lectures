# Вариант 2. Индивидуальный стенд Сканер-ВС 7 в WSL 2

## Когда выбирать

Вариант предназначен для самостоятельной работы на Windows 10/11 с WSL 2, когда отдельный гипервизорный стенд не нужен. Для локальной практики веб-интерфейс открывают через `https://localhost`; сетевой доступ с других компьютеров настраивают только при реальной необходимости.

## Первоисточник команд

Основная последовательность ниже перенесена из предоставленной учебной инструкции, страницы 3-5. Команды дополнительно сверены с актуальной документацией Сканер-ВС 7.x АО «НПО «Эшелон».

В PDF разработчиком продукта названо АО «НПО «Эшелон», но нет отметки об официальном утверждении самого учебного документа разработчиком. Поэтому далее точно разделены:

- команды из предоставленной учебной инструкции;
- уточнения из текущей официальной документации Сканер-ВС 7.x;
- защитные ограничения учебного стенда.

Имена установочного файла могут отличаться. В PDF используется `scanner-signed-deb.run`, а в текущей официальной документации - условное имя `scanner.run`. Всегда подставляйте точное имя свежего файла, полученного от производителя.

## 1. Получите свежий комплект

1. Заполните [форму демоверсии производителя](https://scaner-vs.ru/#form).
2. Получите по почте ссылку на актуальную демоверсию Сканер-ВС 7 Base и файл лицензии.
3. Получите ожидаемый SHA-256 установочного файла непосредственно от производителя либо из подписанного преподавателем реестра хешей. Значение передают по аутентифицированному независимому каналу, а не рядом с тем же файлом или ссылкой.
4. Если доверенного ожидаемого SHA-256 или проверяемой подписи производителя нет, действует **STOP: установочный файл не исполнять**.
5. Не передавайте дистрибутив и лицензию другим слушателям.
6. Зафиксируйте версию Windows и убедитесь, что компьютер соответствует требованиям WSL 2 и Сканер-ВС.

## 2. Подготовьте WSL и Ubuntu

Откройте PowerShell **от имени администратора**. Приглашение `PS C:\>` из PDF вводить не нужно.

Сначала включите WSL без автоматической установки случайного дистрибутива, затем
проверьте уже зарегистрированные имена. Не переиспользуйте личный дистрибутив
для лаборатории и никогда не выполняйте `wsl --unregister` по общему имени:

```powershell
wsl --install --no-distribution
wsl --list --verbose
# После согласования точного имени с преподавателем:
wsl --install --distribution <ТОЧНОЕ_ИМЯ_ИЗ_wsl_--list_--online>
wsl --distribution <ТОЧНОЕ_ЗАРЕГИСТРИРОВАННОЕ_ИМЯ>
```

Важно:

- после включения WSL Windows может потребовать перезагрузку;
- первый вызов `wsl --install` обычно уже устанавливает дистрибутив по умолчанию, поэтому перед вторым вызовом проверьте результат;
- зарегистрированное имя может быть не `Ubuntu`, а, например, `Ubuntu-22.04`; используйте имя из вывода `wsl --list --verbose`;
- актуальная официальная инструкция отдельно рекомендует проверить версию WSL:

```powershell
wsl --version
```

В столбце `VERSION` для используемого дистрибутива должна быть указана версия `2`.

## 3. Передайте файлы и установите Сканер-ВС

Скопируйте полученные `.run` и `.lic` в домашний каталог Ubuntu через `\\wsl$\`, затем запустите Ubuntu. До любого исполнения `.run` укажите точное имя файла и ожидаемый SHA-256 из доверенного реестра. Значение-заполнитель намеренно приводит к STOP:

```bash
set -euo pipefail
readonly INSTALLER='./scanner-signed-deb.run'
readonly EXPECTED_INSTALLER_SHA256='<64_HEX_ИЗ_АУТЕНТИФИЦИРОВАННОГО_РЕЕСТРА>'

[[ "$EXPECTED_INSTALLER_SHA256" =~ ^[[:xdigit:]]{64}$ ]] || {
  echo 'STOP: отсутствует корректный ожидаемый SHA-256.' >&2
  exit 1
}
readonly ACTUAL_INSTALLER_SHA256="$(sha256sum -- "$INSTALLER" | awk '{print $1}')"
[[ "${ACTUAL_INSTALLER_SHA256,,}" == "${EXPECTED_INSTALLER_SHA256,,}" ]] || {
  echo 'STOP: SHA-256 установочного файла не совпал; файл не исполнять.' >&2
  exit 1
}

bash -- "$INSTALLER"
cp license.lic pkg/
cd pkg/
./installer install
```

Хеш фиксируют в паспорте стенда. Не копируйте «ожидаемый» хеш с той же страницы загрузки после получения файла: это не является независимой проверкой происхождения.

Перед выполнением проверьте:

1. `scanner-signed-deb.run` заменен на точное имя полученного `.run`-файла, если оно отличается.
2. Файл лицензии действительно называется `license.lic`; при другом имени следуйте актуальной инструкции производителя.
3. После распаковки создан каталог `pkg`.
4. Лицензия скопирована в `pkg` **до** запуска `./installer install`.
5. Каждый запрос установщика прочитан; не подтверждайте `Yes` или `Enter` вслепую.

Для нативной Astra Linux/Debian на странице 5 строка показана сокращенно как `sudo bash scanner...`. Это не исполнимая команда: многоточие вводить нельзя. Подставьте полное имя выданного файла, например:

```bash
sudo bash ./scanner-signed-deb.run
```

После установки проверьте службу командой из текущей официальной документации:

```bash
systemctl status scanner
```

Ожидаемый статус - `active (running)`.

## 4. Проверьте локальный доступ

1. Откройте на Windows-компьютере `https://localhost`.
2. Убедитесь, что отображается форма входа Сканер-ВС.
3. Выполните первый вход по текущей официальной инструкции.
4. Немедленно смените первоначальный пароль и не фиксируйте новый пароль в отчете или снимках экрана.
5. Если доступ с других компьютеров не требуется, **остановитесь на локальном доступе** и не создавайте `portproxy` или входящее правило брандмауэра.

## 5. Опционально настройте доступ из лабораторной сети

Сначала узнайте адрес WSL командой `ip a` внутри Ubuntu и адрес Windows-хоста командой `ipconfig` в PowerShell. Адрес WSL в режиме NAT может измениться после перезапуска.

Страница 4 предоставленной инструкции показывает параметры на нескольких
визуальных строках. Чтобы не затронуть чужие правила, создайте уникальный ID,
имя firewall rule и файл состояния. Перед созданием проверьте коллизию; если
адрес/порт уже присутствует, нужно **отказаться от создания**, а не удалять или
перезаписывать существующее правило:

```powershell
$LabId = [guid]::NewGuid().ToString('N').Substring(0, 8)
$RuleName = "ScannerVS-Lab-$LabId"
$OwnershipToken = [guid]::NewGuid().ToString('N')
$OwnershipDescription = "ScannerVS-Lab ownership:$OwnershipToken"
$HostAddress = '<IP_Хоста>'
$WslAddress = '<IP_WSL>'
$LabSubnet = '<ЛАБОРАТОРНАЯ_ПОДСЕТЬ_CIDR>'
$StatePath = Join-Path $env:LOCALAPPDATA "$RuleName.json"
$PortProxyCreated = $false
$FirewallCreated = $false

$parsedHostAddress = $null
$parsedWslAddress = $null
if (-not [System.Net.IPAddress]::TryParse($HostAddress, [ref]$parsedHostAddress) -or
    $parsedHostAddress.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork -or
    $parsedHostAddress.Equals([System.Net.IPAddress]::Any)) {
  throw 'HostAddress должен быть конкретным IPv4-адресом Windows-хоста; wildcard запрещён.'
}
if (-not [System.Net.IPAddress]::TryParse($WslAddress, [ref]$parsedWslAddress) -or
    $parsedWslAddress.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork -or
    $parsedWslAddress.Equals([System.Net.IPAddress]::Any)) {
  throw 'WslAddress должен быть конкретным IPv4-адресом WSL; wildcard запрещён.'
}

$labSubnetParts = $LabSubnet.Split('/')
$parsedLabNetwork = $null
$labPrefixLength = 0
if ($labSubnetParts.Count -ne 2 -or
    -not [System.Net.IPAddress]::TryParse($labSubnetParts[0], [ref]$parsedLabNetwork) -or
    $parsedLabNetwork.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork -or
    -not [int]::TryParse($labSubnetParts[1], [ref]$labPrefixLength) -or
    $labPrefixLength -lt 24 -or $labPrefixLength -gt 32) {
  throw 'LabSubnet должен быть узкой лабораторной IPv4-подсетью /24-/32; Any и широкие диапазоны запрещены.'
}

try {
  $listenerCollision = @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object {
    $_.LocalPort -eq 443 -and $_.LocalAddress -in @($HostAddress, '0.0.0.0', '::', '0:0:0:0:0:0:0:0')
  })
}
catch {
  throw "STOP: не удалось достоверно проверить локальные TCP listeners: $($_.Exception.Message)"
}
if ($listenerCollision) {
  throw 'STOP: порт 443 уже занят существующим TCP listener на HostAddress или wildcard; portproxy/firewall не создавать.'
}

$collisionPattern = '^\s*{0}\s+443\s' -f [regex]::Escape($HostAddress)
$collision = netsh interface portproxy show v4tov4 | Select-String -Pattern $collisionPattern
if ($collision) { throw 'Коллизия portproxy: выберите другой изолированный стенд; существующее правило не изменять.' }
if (Get-NetFirewallRule -Name $RuleName -ErrorAction SilentlyContinue) {
  throw 'Коллизия firewall rule: сгенерируйте новый LabId; существующее правило не изменять.'
}
if (Test-Path -LiteralPath $StatePath) {
  throw 'Коллизия state file: существующий файл состояния не перезаписывать; сгенерируйте новый LabId.'
}

function Write-ScannerVsLabState {
  param(
    [Parameter(Mandatory)][pscustomobject]$State,
    [switch]$Create
  )

  $stateTempPath = "$StatePath.$([guid]::NewGuid().ToString('N')).tmp"
  try {
    $State | ConvertTo-Json | Set-Content -LiteralPath $stateTempPath -Encoding UTF8 -ErrorAction Stop
    if ($Create) {
      # File.Move не перезаписывает существующий target: повторная коллизия
      # между проверкой и rename также завершится fail closed.
      [System.IO.File]::Move($stateTempPath, $StatePath)
    }
    else {
      if (-not (Test-Path -LiteralPath $StatePath -PathType Leaf)) {
        throw 'Файл состояния исчез; продолжать изменение сетевой конфигурации небезопасно.'
      }
      [System.IO.File]::Replace($stateTempPath, $StatePath, $null)
    }
  }
  finally {
    Remove-Item -LiteralPath $stateTempPath -Force -ErrorAction SilentlyContinue
  }
}

$State = [pscustomobject]@{
  LabId=$LabId; RuleName=$RuleName; HostAddress=$HostAddress; WslAddress=$WslAddress
  OwnershipToken=$OwnershipToken
  Status='Pending'
  PortProxyCreated=$false; FirewallCreated=$false
}
Write-ScannerVsLabState -State $State -Create
try {
  netsh interface portproxy add v4tov4 listenport=443 listenaddress=$HostAddress connectport=443 connectaddress=$WslAddress
  if ($LASTEXITCODE -ne 0) { throw "Не удалось создать portproxy (код $LASTEXITCODE)." }
  $PortProxyCreated = $true
  $State.PortProxyCreated = $true
  $State.Status = 'PortProxyCreated'
  Write-ScannerVsLabState -State $State

  New-NetFirewallRule -Name $RuleName -DisplayName $RuleName -Group 'Pikov-ScannerVS-Lab' -Description $OwnershipDescription -Direction Inbound -Protocol TCP -LocalPort 443 -LocalAddress $HostAddress -RemoteAddress $LabSubnet -Profile Private -Action Allow -ErrorAction Stop
  $FirewallCreated = $true
  $State.FirewallCreated = $true
  $State.Status = 'Ready'
  Write-ScannerVsLabState -State $State
}
catch {
  $setupError = $_
  $proxyDeleteExitCode = 0
  # Компенсирующий rollback выполняется только для объектов с ID этого запуска.
  $createdRule = Get-NetFirewallRule -Name $RuleName -ErrorAction SilentlyContinue
  if ($createdRule) { $createdRule | Remove-NetFirewallRule -ErrorAction SilentlyContinue }
  if ($PortProxyCreated) {
    netsh interface portproxy delete v4tov4 listenport=443 listenaddress=$HostAddress | Out-Null
    $proxyDeleteExitCode = $LASTEXITCODE
  }

  # Не объявляйте rollback успешным только по факту вызова команд удаления.
  $rollbackRuleStillExists = Get-NetFirewallRule -Name $RuleName -ErrorAction SilentlyContinue
  $rollbackProxyStillExists = netsh interface portproxy show v4tov4 | Select-String -Pattern $collisionPattern
  if ($rollbackRuleStillExists -or $rollbackProxyStillExists) {
    $State.Status = 'RecoveryRequired'
    Write-ScannerVsLabState -State $State
    $proxyDiagnostic = if ($proxyDeleteExitCode -ne 0) { " Код удаления portproxy: $proxyDeleteExitCode." } else { '' }
    throw "Настройка не завершена, rollback неполон.$proxyDiagnostic Файл состояния сохранён для ручного восстановления: $StatePath"
  }

  Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue
  throw $setupError
}
```

Широкое правило без `RemoteAddress`, фиксированное общее DisplayName и общий
`portproxy reset` запрещены. Сохранённый JSON нужен для точного cleanup.

Защитные ограничения:

- разрешайте 443 только собственной или явно разрешенной лабораторной подсети;
- не публикуйте HTTP-порт 80;
- не отключайте целиком Windows Firewall или брандмауэр Hyper-V;
- после перезапуска WSL повторно сверяйте `<IP_WSL>`;
- не используйте общий `netsh interface portproxy reset`: он удалит и чужие правила.

Проверка созданного перенаправления:

```powershell
netsh interface portproxy show all
Get-NetFirewallRule -Name $RuleName
```

## 6. Удалите правила после занятия

Удаляйте только созданные для этого запуска объекты. Если PowerShell-сессия была
закрыта, укажите сохранённый `$StatePath`, затем проверьте схему имени до любой
операции удаления:

```powershell
function Remove-ScannerVsLabRule {
  param([Parameter(Mandatory)][pscustomobject]$State)

  if ($State.LabId -notmatch '^[0-9a-f]{8}$' -or $State.RuleName -ne "ScannerVS-Lab-$($State.LabId)") {
    throw 'Неверный файл состояния; cleanup остановлен.'
  }
  if ($State.OwnershipToken -notmatch '^[0-9a-f]{32}$') {
    throw 'В файле состояния отсутствует корректный маркер владения; cleanup остановлен.'
  }

  $parsedHostAddress = $null
  $parsedWslAddress = $null
  if (-not [System.Net.IPAddress]::TryParse([string]$State.HostAddress, [ref]$parsedHostAddress) -or
      $parsedHostAddress.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
    throw 'HostAddress не является IPv4-литералом; cleanup остановлен.'
  }
  if (-not [System.Net.IPAddress]::TryParse([string]$State.WslAddress, [ref]$parsedWslAddress) -or
      $parsedWslAddress.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
    throw 'WslAddress не является IPv4-литералом; cleanup остановлен.'
  }

  $expectedDescription = "ScannerVS-Lab ownership:$($State.OwnershipToken)"
  $createdRule = Get-NetFirewallRule -Name $State.RuleName -ErrorAction SilentlyContinue
  $pattern = '^\s*{0}\s+443\s+{1}\s+443\s*$' -f `
    [regex]::Escape([string]$State.HostAddress), `
    [regex]::Escape([string]$State.WslAddress)
  $createdProxy = netsh interface portproxy show v4tov4 | Select-String -Pattern $pattern

  # JSON в LOCALAPPDATA не является доказательством владения. Пока живой
  # firewall-маркер не совпал по имени, группе, описанию и LocalAddress,
  # portproxy не удаляется, а state сохраняется для ручного восстановления.
  if ($createdProxy -and -not $createdRule) {
    throw 'Живой маркер владения отсутствует; автоматическое удаление portproxy запрещено.'
  }
  if ($createdRule) {
    if ($createdRule.Group -ne 'Pikov-ScannerVS-Lab' -or $createdRule.Description -ne $expectedDescription) {
      throw 'Маркер владения firewall не совпадает; автоматический cleanup запрещён.'
    }
    $addressFilter = $createdRule | Get-NetFirewallAddressFilter
    $portFilter = $createdRule | Get-NetFirewallPortFilter
    if (@($addressFilter.LocalAddress) -notcontains [string]$State.HostAddress -or
        [string]$portFilter.LocalPort -ne '443' -or
        [string]$portFilter.Protocol -notin @('TCP', '6')) {
      throw 'Параметры firewall-маркера не совпадают с state; автоматический cleanup запрещён.'
    }
  }

  # Удаляем proxy первым: firewall-маркер должен оставаться доступным до
  # успешной проверки владения и результата native-команды.
  if ($createdProxy) {
    netsh interface portproxy delete v4tov4 listenport=443 listenaddress=$State.HostAddress | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Не удалось удалить portproxy (код $LASTEXITCODE)." }
  }
  if ($createdRule) { $createdRule | Remove-NetFirewallRule -ErrorAction Stop }
}

$State = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
$CleanupSucceeded = $false
try {
  Remove-ScannerVsLabRule -State $State
  $CleanupSucceeded = $true
}
finally {
  $ruleStillExists = Get-NetFirewallRule -Name $State.RuleName -ErrorAction SilentlyContinue
  $pattern = '^\s*{0}\s+443\s+{1}\s+443\s*$' -f `
    [regex]::Escape([string]$State.HostAddress), `
    [regex]::Escape([string]$State.WslAddress)
  $proxyStillExists = netsh interface portproxy show v4tov4 | Select-String -Pattern $pattern
  if ($CleanupSucceeded -and -not $ruleStillExists -and -not $proxyStillExists) {
    Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue
  }
  else {
    throw "Cleanup неполон или проверка маркера владения не пройдена. Файл состояния сохранён: $StatePath"
  }
}
```

После удаления повторите `netsh interface portproxy show all` и
`Get-NetFirewallRule -Group 'Pikov-ScannerVS-Lab'`; объект с ID запуска должен
исчезнуть, а посторонние правила — остаться. Сам WSL-дистрибутив автоматически
не удаляется: его происхождение может быть не связано с этим практикумом.

## 7. Выполните практическую работу

Перейдите к [общему сценарию четырех блоков](01-common-workflow.md), используя только собственные или письменно разрешенные цели. Если отдельные ВМ-цели отсутствуют, ограничьтесь специально созданной Host-only сетью или демонстрацией преподавателя.

## Контрольный лист результата

- [ ] Дистрибутив и лицензия получены напрямую от производителя.
- [ ] Зафиксированы версия Windows, версия WSL и точное имя дистрибутива Ubuntu.
- [ ] WSL работает в версии 2.
- [ ] Установочный файл распакован, а `license.lic` помещен в `pkg` до запуска installer.
- [ ] Служба `scanner` имеет статус `active (running)`.
- [ ] Веб-интерфейс открывается через `https://localhost`.
- [ ] Первоначальный пароль изменен.
- [ ] Если использован сетевой доступ, правило ограничено лабораторной подсетью и записано в паспорт стенда.
- [ ] После занятия временные `portproxy` и firewall rule удалены.
- [ ] Заполнен [шаблон отчета](REPORT-TEMPLATE.md) без секретов и лицензии.

## Источники

- Предоставленная учебная инструкция, страницы 3-5 — источник обязательных команд.
- [Официальная установка Сканер-ВС на Windows через WSL](https://docs.etecs.ru/scanner/docs/getting-started/installation/windows-wsl-install/)
- [Официальная установка на Astra Linux и другие DEB-системы](https://docs.etecs.ru/scanner/docs/getting-started/installation/astra-linux-install/)
- [Системные требования](https://docs.etecs.ru/scanner/docs/getting-started/prerequisites/)
- [Первый вход](https://docs.etecs.ru/scanner/docs/getting-started/first-login/)
