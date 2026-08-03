# Лабораторная работа 3. Усиление Apache с проверяемым TLS

**Сложность:** повышенная<br>
**Время:** 120–150 минут<br>
**Целевая ОС:** учебная Astra Linux Special Edition 1.7.4+ или 1.8<br>
**Формат:** серверная ВМ и, при наличии, отдельный клиент

## Результат работы

Вы развернёте отдельный виртуальный хост Apache, минимизируете раскрытие информации и возможности каталога, настроите защитные заголовки, выпустите учебный сертификат с SAN, проверите TLS **с проверкой доверия** и подготовите откат только созданных объектов.

## Схема стенда

| Роль | Имя | Учебный адрес |
| --- | --- | --- |
| Клиент администратора | `infra` | `10.0.1.254` |
| Веб-сервер | `server1` | `10.0.1.1` |

Имя сайта: `server1.astra.test`. Замените пример адреса во всех командах и сертификате, если стенд использует другую сеть. Работа не зависит от лабораторной 2, но использует ту же топологию.

## Границы и решение по AstraMode

Работа выполняется только на снимке ВМ без защищаемых данных.

`AstraMode` управляет обязательной авторизацией Apache. По умолчанию режим включён, даже если директива закомментирована. Глобальное `AstraMode off` снижает защищённость всех виртуальных хостов и **не является hardening**.

В этой лабораторной создаётся анонимный демонстрационный сайт. Поэтому, если обязательная авторизация препятствует учебному сценарию, `AstraMode off` задаётся как документированное исключение **только внутри двух лабораторных `<VirtualHost>`**. Остальные сайты сохраняют безопасное значение по умолчанию. Для рабочего контура это решение не переносится автоматически: приложение либо интегрируют со штатной авторизацией Astra Linux, либо исключение обосновывают и ограничивают проектом защиты.

## Шаг 1. Предварительная проверка

На `server1`:

```bash
cat /etc/os-release
test -r /etc/astra_version && cat /etc/astra_version
command -v astra-modeswitch >/dev/null && sudo astra-modeswitch getname
ip -4 addr
sudo -v

{
  if dpkg-query -W -f='${Status}\n' apache2 2>/dev/null | grep -q 'install ok installed'; then
      echo 'package=installed'
  else
      echo 'package=absent'
  fi
  if systemctl is-active --quiet apache2 2>/dev/null; then echo 'service=active'; else echo 'service=inactive'; fi
  if systemctl is-enabled --quiet apache2 2>/dev/null; then echo 'autostart=enabled'; else echo 'autostart=disabled'; fi
  if sudo test -d /etc/apache2/ssl; then echo 'ssl-dir=present'; else echo 'ssl-dir=absent'; fi
} > "$HOME/astra-lab3-pre-state.txt"
cat "$HOME/astra-lab3-pre-state.txt"
grep -Eq '^package=(installed|absent)$' "$HOME/astra-lab3-pre-state.txt" &&
grep -Eq '^service=(active|inactive)$' "$HOME/astra-lab3-pre-state.txt" &&
grep -Eq '^autostart=(enabled|disabled)$' "$HOME/astra-lab3-pre-state.txt" &&
grep -Eq '^ssl-dir=(present|absent)$' "$HOME/astra-lab3-pre-state.txt" || {
    echo "STOP: не удалось зафиксировать исходное состояние Apache"
    exit 1
}
```

Проверьте, что имена лабораторных объектов свободны:

```bash
for path in \
  /var/www/server1 \
  /etc/apache2/sites-available/server1.conf \
  /etc/apache2/sites-available/server1-ssl.conf \
  /etc/apache2/conf-available/zz-security-hardening.conf \
  /etc/apache2/ssl/server1.key \
  /etc/apache2/ssl/server1.crt \
  /etc/apache2/ssl/server1-openssl.cnf; do
    if sudo test -e "$path"; then
        echo "STOP: уже существует $path"
        exit 1
    fi
done
```

Если Apache ещё не установлен, последние пути могут находиться внутри отсутствующих каталогов — это нормально. Любое найденное совпадение означает, что нужен чистый снимок или другие согласованные имена.

## Шаг 2. Установить Apache и сохранить базовое состояние

Устанавливайте пакеты только из настроенного учебного репозитория:

```bash
sudo apt update
sudo apt install apache2 openssl curl || {
    echo "Установка пакетов не завершена; работу останавливаем"
    exit 1
}
sudo systemctl stop apache2
```

После установки сохраните конфигурацию и состояние компонентов:

```bash
LAB3_BACKUP="/root/astra-lab3-$(date +%Y%m%d-%H%M%S)"
sudo install -d -m 700 "$LAB3_BACKUP" || {
    echo "STOP: не удалось создать резервную директорию"
    exit 1
}
sudo cp -a /etc/apache2 "$LAB3_BACKUP/apache2" || {
    echo "STOP: не удалось скопировать /etc/apache2"
    exit 1
}
sudo test -f "$LAB3_BACKUP/apache2/apache2.conf" || {
    echo "STOP: резервная копия Apache неполна"
    exit 1
}
sudo cp -a "$HOME/astra-lab3-pre-state.txt" "$LAB3_BACKUP/pre-state.txt" || exit 1
umask 077

{
  if a2query -m headers >/dev/null 2>&1; then echo 'headers=enabled'; else echo 'headers=disabled'; fi
  if a2query -m ssl >/dev/null 2>&1; then echo 'ssl=enabled'; else echo 'ssl=disabled'; fi
  if a2query -m socache_shmcb >/dev/null 2>&1; then echo 'socache_shmcb=enabled'; else echo 'socache_shmcb=disabled'; fi
  if a2query -s 000-default >/dev/null 2>&1; then echo '000-default=enabled'; else echo '000-default=disabled'; fi
} | sudo tee "$LAB3_BACKUP/initial-state.txt" >/dev/null || exit 1

sudo grep -Eq '^headers=(enabled|disabled)$' "$LAB3_BACKUP/initial-state.txt" &&
sudo grep -Eq '^ssl=(enabled|disabled)$' "$LAB3_BACKUP/initial-state.txt" &&
sudo grep -Eq '^socache_shmcb=(enabled|disabled)$' "$LAB3_BACKUP/initial-state.txt" &&
sudo grep -Eq '^000-default=(enabled|disabled)$' "$LAB3_BACKUP/initial-state.txt" || {
    echo "STOP: не удалось зафиксировать состояние модулей Apache"
    exit 1
}
printf '%s\n' "$LAB3_BACKUP" > "$HOME/astra-lab3-backup-path.txt" || exit 1
sudo cat "$LAB3_BACKUP/initial-state.txt"
sudo apache2ctl configtest || {
    echo "Базовая конфигурация Apache уже содержит ошибку; работу останавливаем"
    exit 1
}
```

## Шаг 3. Создать содержимое сайта

```bash
sudo install -d -o root -g www-data -m 750 /var/www/server1
sudoedit /var/www/server1/index.html
```

Содержимое:

```html
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>server1.astra.test</title>
</head>
<body>
  <h1>server1.astra.test</h1>
  <p>Учебный веб-сервер Astra Linux SE.</p>
</body>
</html>
```

Ограничьте права:

```bash
sudo chown root:www-data /var/www/server1/index.html
sudo chmod 640 /var/www/server1/index.html
namei -l /var/www/server1/index.html
```

## Шаг 4. Создать HTTP virtual host

```bash
sudoedit /etc/apache2/sites-available/server1.conf
```

Содержимое:

```apache
<VirtualHost *:80>
    ServerName server1.astra.test
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/server1

    <Directory /var/www/server1>
        Options -Indexes -FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/server1_error.log
    CustomLog ${APACHE_LOG_DIR}/server1_access.log combined
</VirtualHost>
```

В исходном варианте директива `AstraMode` отсутствует, поэтому действует безопасное значение по умолчанию. Условное исключение для анонимного стенда рассматривается только после первой проверки HTTP в шаге 6.

## Шаг 5. Добавить базовые ограничения и заголовки

```bash
sudoedit /etc/apache2/conf-available/zz-security-hardening.conf
```

Содержимое:

```apache
ServerTokens Prod
ServerSignature Off
TraceEnable Off
Timeout 45
KeepAlive On
KeepAliveTimeout 5
MaxKeepAliveRequests 100
LimitRequestBody 1048576
LimitXMLRequestBody 1048576

Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Referrer-Policy "no-referrer"
Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
Header always set Content-Security-Policy "default-src 'self'; object-src 'none'; frame-ancestors 'self'; base-uri 'self'"
```

Это **риск-ориентированная адаптация для статического учебного сайта**, а не буквальное воспроизведение консервативного профиля рекомендаций Astra. В официальном профиле для Apache указаны `KeepAlive Off` и `LimitXMLRequestBody 10485760`; здесь keep-alive оставлен включённым с коротким тайм-аутом, а общий и XML-лимиты уменьшены до 1 MiB. Для рабочего приложения выбор подтверждают нагрузочным и функциональным тестированием. Если сервис загружает файлы или принимает крупный XML, лимит рассчитывают по функции сервиса и задают в минимальной необходимой области.

Префикс `zz-` нужен не для красоты: на Debian-подобной схеме включаемых конфигураций штатный `security.conf` может загружаться позже и переопределить ранний `ServerTokens`. Итог всё равно проверяется по реальному HTTP-заголовку.

Активируйте только подготовленные компоненты и поставьте явный guard перед запуском:

```bash
sudo a2enmod headers &&
sudo a2enconf zz-security-hardening &&
sudo a2ensite server1 &&
sudo a2dissite 000-default.conf || {
    echo "Не удалось включить подготовленные компоненты"
    exit 1
}
sudo apache2ctl configtest || {
    echo "Конфигурация Apache ошибочна; службу не запускаем"
    exit 1
}
sudo apache2ctl -S
sudo systemctl enable --now apache2
sudo systemctl --no-pager --full status apache2
sudo ss -H -ltnp 'sport = :80'
```

Если `configtest` не выводит `Syntax OK`, не запускайте и не перезагружайте службу.

## Шаг 6. Проверить HTTP и запрет листинга

На `server1` можно проверить имя без изменения `/etc/hosts`. Сначала зафиксируйте ответ при безопасном значении `AstraMode` по умолчанию:

```bash
HTTP_CODE="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --resolve server1.astra.test:80:127.0.0.1 \
  http://server1.astra.test/)"
printf 'HTTP status with default AstraMode: %s\n' "$HTTP_CODE"
curl --show-error --head --resolve server1.astra.test:80:127.0.0.1 \
  http://server1.astra.test/
```

Если код `200`, оставьте `AstraMode` по умолчанию и запишите выбранный профиль:

```bash
printf '%s\n' 'astramode=default-on' > "$HOME/astra-lab3-astramode-state.txt"
```

Если обязательная авторизация не позволяет выполнить именно анонимный учебный сценарий, преподаватель может разрешить контролируемое исключение. Только тогда добавьте `AstraMode off` **внутрь** созданного `<VirtualHost *:80>`, проверьте и примените:

```bash
sudoedit /etc/apache2/sites-available/server1.conf
sudo apache2ctl configtest || {
    echo "Исключение AstraMode содержит ошибку; конфигурацию не применяем"
    exit 1
}
sudo systemctl reload apache2
printf '%s\n' 'astramode=scoped-off' > "$HOME/astra-lab3-astramode-state.txt"
curl --fail --show-error --resolve server1.astra.test:80:127.0.0.1 \
  http://server1.astra.test/
```

Не добавляйте исключение «на всякий случай» и не переносите его в глобальный файл. В заголовках должны присутствовать настроенные значения; `ServerTokens Prod` должен убрать точную версию Apache и ОС. Эффективное значение проверьте явно:

```bash
curl --silent --head --resolve server1.astra.test:80:127.0.0.1 \
  http://server1.astra.test/ | tr -d '\r' | grep -E '^Server: Apache$'
```

Если вывод содержит версию или имя ОС, не продолжайте: проверьте порядок файлов в `conf-enabled` и наличие более позднего переопределения.

Создайте каталог без `index.html`:

```bash
sudo install -d -o root -g www-data -m 750 /var/www/server1/test-no-index
curl --silent --output /dev/null --write-out '%{http_code}\n' \
  --resolve server1.astra.test:80:127.0.0.1 \
  http://server1.astra.test/test-no-index/
```

Ожидается HTTP `403`. Ответ `200` с перечнем файлов означает, что `Options -Indexes` не действует.

## Шаг 7. Выпустить учебный сертификат с SAN

Создайте каталог и конфигурацию запроса:

```bash
sudo install -d -o root -g root -m 700 /etc/apache2/ssl
sudoedit /etc/apache2/ssl/server1-openssl.cnf
```

Содержимое для адреса `10.0.1.1`:

```ini
[req]
prompt = no
distinguished_name = dn
x509_extensions = server_ext

[dn]
CN = server1.astra.test

[server_ext]
subjectAltName = @alt_names
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = server1.astra.test
IP.1 = 10.0.1.1
```

Выпустите краткоживущий сертификат только для лаборатории:

```bash
sudo openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 30 \
  -keyout /etc/apache2/ssl/server1.key \
  -out /etc/apache2/ssl/server1.crt \
  -config /etc/apache2/ssl/server1-openssl.cnf
sudo chown root:root /etc/apache2/ssl/server1.key /etc/apache2/ssl/server1.crt
sudo chmod 600 /etc/apache2/ssl/server1.key
sudo chmod 644 /etc/apache2/ssl/server1.crt
sudo openssl x509 -in /etc/apache2/ssl/server1.crt -noout \
  -subject -issuer -dates -ext subjectAltName
```

`-nodes` оставляет серверный ключ без парольной фразы, чтобы Apache мог запускаться без оператора; риск компенсируется правами `600`, владельцем `root` и защитой ВМ. В рабочей PKI сертификат выпускает доверенный УЦ, а ключ защищают по принятой модели.

## Шаг 8. Создать HTTPS virtual host

```bash
sudoedit /etc/apache2/sites-available/server1-ssl.conf
```

Содержимое:

```apache
<VirtualHost *:443>
    ServerName server1.astra.test
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/server1

    SSLEngine on
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5:!3DES
    SSLHonorCipherOrder on
    SSLCertificateFile /etc/apache2/ssl/server1.crt
    SSLCertificateKeyFile /etc/apache2/ssl/server1.key

    Header always set Strict-Transport-Security "max-age=300"

    <Directory /var/www/server1>
        Options -Indexes -FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/server1_ssl_error.log
    CustomLog ${APACHE_LOG_DIR}/server1_ssl_access.log combined
</VirtualHost>
```

`SSLProtocol` исключает SSLv3, TLS 1.0 и TLS 1.1. Приведённый `SSLCipherSuite` управляет наборами до TLS 1.2; наборы TLS 1.3 настраиваются средствами, поддерживаемыми конкретными версиями Apache и OpenSSL. Значение HSTS намеренно короткое для учебного домена; рабочую политику проектируют отдельно.

Если в шаге 6 преподаватель разрешил профиль `astramode=scoped-off`, добавьте `AstraMode off` также внутрь **только этого** лабораторного HTTPS virtual host. При профиле `astramode=default-on` директиву не добавляйте.

Активируйте TLS и снова выполните проверку **до** reload:

```bash
sudo a2enmod ssl && sudo a2ensite server1-ssl || {
    echo "Не удалось включить SSL или HTTPS virtual host"
    exit 1
}
sudo apache2ctl configtest || {
    echo "Конфигурация TLS ошибочна; Apache не перезагружаем"
    exit 1
}
sudo apache2ctl -S
sudo systemctl reload apache2
sudo systemctl is-active apache2
sudo ss -H -ltnp 'sport = :443'
```

## Шаг 9. Проверить TLS с проверкой имени и доверия

На `server1`:

```bash
curl --fail --show-error \
  --cacert /etc/apache2/ssl/server1.crt \
  --resolve server1.astra.test:443:127.0.0.1 \
  https://server1.astra.test/

curl --show-error --head \
  --cacert /etc/apache2/ssl/server1.crt \
  --resolve server1.astra.test:443:127.0.0.1 \
  https://server1.astra.test/

openssl s_client -connect 127.0.0.1:443 \
  -servername server1.astra.test \
  -verify_hostname server1.astra.test \
  -CAfile /etc/apache2/ssl/server1.crt -verify_return_error </dev/null
```

Ожидается успешная проверка сертификата, SAN и TLS handshake. `curl -k` отключает проверку доверия и имени; его вывод не принимается как доказательство корректного TLS.

Для проверки с `infra` передайте **только публичный** `server1.crt` по доверенному учебному каналу и используйте тот же `--cacert`. Закрытый `server1.key` никогда не покидает сервер.

## Шаг 10. Перенаправить HTTP на HTTPS

После успешной проверки TLS добавьте в HTTP virtual host сразу после `ServerName`:

```apache
Redirect permanent / https://server1.astra.test/
```

Примените и проверьте:

```bash
sudo apache2ctl configtest || {
    echo "Конфигурация редиректа ошибочна; Apache не перезагружаем"
    exit 1
}
sudo systemctl reload apache2
curl --head --resolve server1.astra.test:80:127.0.0.1 \
  http://server1.astra.test/
```

Ожидается `301` или `308` и `Location: https://server1.astra.test/`.

## Дополнительное задание: слушать только loopback

Выполняйте только по указанию преподавателя. Сначала сохраните файл:

```bash
LAB3_BACKUP="$(cat "$HOME/astra-lab3-backup-path.txt")"
sudo cp -a /etc/apache2/ports.conf "$LAB3_BACKUP/ports.conf.before-loopback" || {
    echo "STOP: не удалось сохранить ports.conf"
    exit 1
}
sudoedit /etc/apache2/ports.conf
```

**Замените**, а не дополните, существующие активные `Listen 80` и `Listen 443`:

```apache
Listen 127.0.0.1:80
Listen 127.0.0.1:443
```

Затем:

```bash
sudo apache2ctl configtest || {
    echo "Конфигурация Listen ошибочна; Apache не перезагружаем"
    exit 1
}
sudo systemctl reload apache2
sudo ss -H -ltnp 'sport = :80'
sudo ss -H -ltnp 'sport = :443'
```

Оба сокета должны быть привязаны к `127.0.0.1`, а не к `0.0.0.0`, `[::]` или сетевому адресу. Для сетевого ограничения рабочего сервера обычно используют также узловой межсетевой экран; смена `Listen` не заменяет сетевую политику.

## Восстановление

Предпочтительный полный откат — возврат снимка ВМ. Для контролируемого ручного отката на чистом учебном стенде:

```bash
test -r "$HOME/astra-lab3-backup-path.txt" || {
    echo "STOP: файл с путём к резервной копии отсутствует"
    exit 1
}
LAB3_BACKUP="$(cat "$HOME/astra-lab3-backup-path.txt")"
[[ "$LAB3_BACKUP" =~ ^/root/astra-lab3-[0-9]{8}-[0-9]{6}$ ]] || {
    echo "STOP: недопустимый путь резервной копии"
    exit 1
}
sudo test -f "$LAB3_BACKUP/apache2/apache2.conf" &&
sudo test -f "$LAB3_BACKUP/pre-state.txt" &&
sudo test -f "$LAB3_BACKUP/initial-state.txt" || {
    echo "STOP: обязательные файлы резервной копии отсутствуют"
    exit 1
}
sudo grep -Eq '^package=(installed|absent)$' "$LAB3_BACKUP/pre-state.txt" &&
sudo grep -Eq '^service=(active|inactive)$' "$LAB3_BACKUP/pre-state.txt" &&
sudo grep -Eq '^autostart=(enabled|disabled)$' "$LAB3_BACKUP/pre-state.txt" &&
sudo grep -Eq '^ssl-dir=(present|absent)$' "$LAB3_BACKUP/pre-state.txt" &&
sudo grep -Eq '^headers=(enabled|disabled)$' "$LAB3_BACKUP/initial-state.txt" &&
sudo grep -Eq '^ssl=(enabled|disabled)$' "$LAB3_BACKUP/initial-state.txt" &&
sudo grep -Eq '^socache_shmcb=(enabled|disabled)$' "$LAB3_BACKUP/initial-state.txt" &&
sudo grep -Eq '^000-default=(enabled|disabled)$' "$LAB3_BACKUP/initial-state.txt" || {
    echo "STOP: файлы состояния неполны или повреждены; откат не начинаем"
    exit 1
}
sudo install -d -m 700 "$LAB3_BACKUP/created-artifacts" || exit 1
sudo systemctl stop apache2

sudo a2dissite server1-ssl server1
sudo a2disconf zz-security-hardening

if test -f "$LAB3_BACKUP/ports.conf.before-loopback"; then
    sudo cp -a "$LAB3_BACKUP/ports.conf.before-loopback" /etc/apache2/ports.conf
fi

if sudo grep -q '^000-default=enabled$' "$LAB3_BACKUP/initial-state.txt"; then
    sudo a2ensite 000-default
fi

sudo mv /etc/apache2/sites-available/server1.conf \
  "$LAB3_BACKUP/created-artifacts/server1.conf"
sudo mv /etc/apache2/sites-available/server1-ssl.conf \
  "$LAB3_BACKUP/created-artifacts/server1-ssl.conf"
sudo mv /etc/apache2/conf-available/zz-security-hardening.conf \
  "$LAB3_BACKUP/created-artifacts/zz-security-hardening.conf"
sudo mv /etc/apache2/ssl/server1.key \
  "$LAB3_BACKUP/created-artifacts/server1.key"
sudo mv /etc/apache2/ssl/server1.crt \
  "$LAB3_BACKUP/created-artifacts/server1.crt"
sudo mv /etc/apache2/ssl/server1-openssl.cnf \
  "$LAB3_BACKUP/created-artifacts/server1-openssl.cnf"
sudo mv /var/www/server1 "$LAB3_BACKUP/created-artifacts/webroot-server1"

for log in \
  /var/log/apache2/server1_error.log \
  /var/log/apache2/server1_access.log \
  /var/log/apache2/server1_ssl_error.log \
  /var/log/apache2/server1_ssl_access.log; do
    if sudo test -e "$log"; then
        sudo mv "$log" "$LAB3_BACKUP/created-artifacts/"
    fi
done

if sudo grep -q '^ssl=disabled$' "$LAB3_BACKUP/initial-state.txt"; then
    sudo a2dismod ssl || exit 1
fi
if sudo grep -q '^socache_shmcb=disabled$' "$LAB3_BACKUP/initial-state.txt"; then
    sudo a2dismod socache_shmcb || exit 1
fi
if sudo grep -q '^headers=disabled$' "$LAB3_BACKUP/initial-state.txt"; then
    sudo a2dismod headers || exit 1
fi

if sudo grep -q '^ssl-dir=absent$' "$LAB3_BACKUP/pre-state.txt"; then
    sudo rmdir /etc/apache2/ssl || {
        echo "Каталог /etc/apache2/ssl не пуст; используйте снимок для полного отката"
        exit 1
    }
fi

sudo apache2ctl configtest || {
    echo "Восстановленная конфигурация ошибочна; Apache не запускаем"
    exit 1
}

if sudo grep -q '^autostart=enabled$' "$LAB3_BACKUP/pre-state.txt"; then
    sudo systemctl enable apache2
else
    sudo systemctl disable apache2
fi

if sudo grep -q '^service=active$' "$LAB3_BACKUP/pre-state.txt"; then
    sudo systemctl start apache2
    sudo systemctl is-active apache2
else
    sudo systemctl stop apache2
fi
```

Команды перемещают созданные объекты и журналы в защищённую резервную директорию, возвращают состояния модулей, сайта по умолчанию и службы. Если до работы пакет Apache отсутствовал, ручной откат намеренно не удаляет установленный пакет и его зависимости; полный возврат обеспечивает снимок ВМ. Если начальное состояние было сложнее чистой установки или появились параллельные изменения, не выполняйте ручной откат — восстановите снимок.

## Что сдать

1. Версию, текущий уровень и фактический IP сервера.
2. Вывод `apache2ctl configtest`, `apache2ctl -S` и точные сокеты 80/443.
3. Оба virtual host и обоснование выбранного значения `AstraMode`.
4. HTTP-код `403` для каталога без index и финальный редирект HTTP → HTTPS.
5. Заголовки HTTPS без раскрытия точной версии Apache.
6. Сведения сертификата с SAN и успешные результаты `curl --cacert` и `openssl s_client -verify_return_error`.
7. Путь к резервной копии и выбранный способ восстановления.

## Контрольные вопросы

1. Почему глобальное `AstraMode off` противоречит hardening и чем ограниченное исключение отличается от него?
2. Почему `configtest` выполняется перед каждым применением конфигурации?
3. Почему `curl -k` не доказывает корректность TLS?
4. Какие версии протокола исключает `SSLProtocol`, и почему строка `SSLCipherSuite` не описывает TLS 1.3 полностью?
5. Почему директивы `Listen` при loopback-ограничении заменяют, а не добавляют рядом?
6. Какие данные нельзя переносить с сервера на клиент при проверке сертификата?

## Критерии зачёта

Работа зачтена, если конфигурация проходит `configtest`, active vhosts и сокеты соответствуют заданию, листинг возвращает `403`, HTTP перенаправляет на HTTPS, защитные заголовки присутствуют, TLS проходит проверку имени и доверия без `-k`, а откат затрагивает только созданные лабораторией объекты.

## Официальные материалы

- [Astra Linux: директива AstraMode](https://wiki.astralinux.ru/pages/viewpage.action?pageId=238749508)
- [Apache HTTP Server: Security Tips](https://httpd.apache.org/docs/2.4/misc/security_tips.html)
- [Apache HTTP Server: mod_ssl](https://httpd.apache.org/docs/2.4/mod/mod_ssl.html)
- [Apache HTTP Server: core directives](https://httpd.apache.org/docs/2.4/mod/core.html)
- [curl: HTTPS scripting](https://curl.se/docs/httpscripting.html)
