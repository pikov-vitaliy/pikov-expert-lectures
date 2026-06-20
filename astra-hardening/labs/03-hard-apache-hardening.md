# Лабораторная работа 3. Установка Apache и настройка безопасности веб-сервера

Сложность: сложная  
Время: 90-120 минут  
Целевая ОС: Astra Linux SE 1.7 или 1.8  
Формат: работа на одной или двух учебных виртуальных машинах

## Цель

Установить Apache2 на Astra Linux SE, создать отдельный виртуальный хост, ограничить лишние возможности сервера, включить HTTPS с самоподписанным сертификатом и проверить доступность сайта.

После выполнения работы слушатель должен уметь:

- устанавливать Apache2 и управлять службой;
- создавать отдельный каталог сайта и виртуальный хост;
- отключать сайт по умолчанию;
- настраивать базовые защитные HTTP-заголовки;
- ограничивать отображение служебной информации Apache;
- выпускать учебный самоподписанный сертификат;
- проверять HTTP и HTTPS с помощью `curl`.

## Схема стенда

Основной вариант - одна виртуальная машина:

| Роль | Имя | Пример IP-адреса |
| --- | --- | --- |
| Веб-сервер | `infra` | `10.0.1.254` |

Дополнительная проверка может выполняться со второй машины `server1`.

Доменное имя для учебного сайта: `infra.astra.test`.

Если DNS в стенде не настроен, добавьте временную запись в `/etc/hosts` на клиенте:

```text
10.0.1.254 infra.astra.test
```

Если IP-адрес вашей ВМ отличается от `10.0.1.254`, замените адрес во всех примерах, записях `/etc/hosts`, командах `curl` и в параметре `subjectAltName` сертификата. Если работа выполняется на одной машине без отдельной сети, можно использовать локальную запись:

```text
127.0.0.1 infra.astra.test
```

**Рекомендуемый режим защищённости** для выполнения лабораторной — «Воронеж» (Усиленный) или «Орёл» (Базовый). В режиме «Смоленск» (Максимальный) возможны ограничения со стороны мандатного контроля целостности и замкнутой программной среды (например, при установке пакетов и редактировании системных конфигураций).

**Рекомендуемая версия Astra Linux SE:** 1.7.4 или новее, либо 1.8. На старых обновлениях 1.7 (до 1.7.4) Apache может не учитывать значение `AstraMode`, заданное во включаемом конфигурационном файле — в этом случае перенесите директиву `AstraMode off` непосредственно в `/etc/apache2/apache2.conf` или в блок `<VirtualHost>`.

Перед началом создайте снимок виртуальной машины.

## Часть 1. Установка Apache2

Перед установкой уточните IP-адрес вашей ВМ:

```bash
ip -4 addr
```

Далее в лабораторной работе используется пример `10.0.1.254`. При другом адресе подставляйте свой IP.

Обновите сведения о пакетах:

```bash
sudo apt update
```

Установите Apache2:

```bash
sudo apt install apache2
```

Проверьте службу:

```bash
sudo systemctl status apache2
sudo systemctl enable apache2
```

Проверьте, что сервер слушает порт 80:

```bash
sudo ss -tlnp | grep :80
```

## Часть 2. Отключение AstraMode для Apache

Создайте отдельный конфигурационный файл:

```bash
sudo nano /etc/apache2/conf-available/astramode_off.conf
```

Добавьте строку:

```apache
AstraMode off
```

Активируйте конфигурацию:

```bash
sudo a2enconf astramode_off
sudo systemctl reload apache2
```

Пояснение: в учебной работе параметр используется для совместимости с типовыми практическими заданиями по Apache в Astra Linux SE. В реальной системе решение об отключении режима должно приниматься по требованиям эксплуатации и документации к конкретному контуру.

## Часть 3. Создание виртуального хоста

Создайте каталог сайта:

```bash
sudo mkdir -p /var/www/infra
sudo chown -R root:www-data /var/www/infra
sudo find /var/www/infra -type d -exec chmod 750 {} \;
```

Создайте главную страницу:

```bash
sudo nano /var/www/infra/index.html
```

Содержимое:

```html
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>infra.astra.test</title>
</head>
<body>
  <h1>infra.astra.test</h1>
  <p>Учебный защищенный веб-сервер Astra Linux SE.</p>
</body>
</html>
```

Ограничьте права на файл:

```bash
sudo chown root:www-data /var/www/infra/index.html
sudo chmod 640 /var/www/infra/index.html
```

Создайте конфигурацию виртуального хоста:

```bash
sudo nano /etc/apache2/sites-available/infra.conf
```

Содержимое:

```apache
<VirtualHost *:80>
    ServerName infra.astra.test
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/infra

    <Directory /var/www/infra>
        Options -Indexes -FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/infra_error.log
    CustomLog ${APACHE_LOG_DIR}/infra_access.log combined
</VirtualHost>
```

Активируйте сайт и отключите сайт по умолчанию:

```bash
sudo a2ensite infra
sudo a2dissite 000-default.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Проверьте:

```bash
curl http://infra.astra.test
curl http://10.0.1.254
```

## Часть 4. Базовое усиление конфигурации Apache

Создайте файл с параметрами безопасности:

```bash
sudo nano /etc/apache2/conf-available/security-hardening.conf
```

Добавьте:

```apache
ServerTokens Prod
ServerSignature Off
TraceEnable Off

Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Referrer-Policy "no-referrer"
Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
```

Включите модуль заголовков и конфигурацию:

```bash
sudo a2enmod headers
sudo a2enconf security-hardening
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Проверьте заголовки:

```bash
curl -I http://infra.astra.test
```

Проверьте, что листинг каталога не работает. Создайте пустой каталог без `index.html`:

```bash
sudo mkdir /var/www/infra/test-no-index
sudo chown root:www-data /var/www/infra/test-no-index
sudo chmod 750 /var/www/infra/test-no-index
```

Затем выполните:

```bash
curl -I http://infra.astra.test/test-no-index/
```

Ожидаемый результат: не должно быть открытого списка файлов.

## Часть 5. Настройка HTTPS с самоподписанным сертификатом

Создайте каталог для ключей:

```bash
sudo mkdir -p /etc/apache2/ssl
sudo chmod 700 /etc/apache2/ssl
```

Создайте закрытый ключ и сертификат:

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/apache2/ssl/infra.key \
  -out /etc/apache2/ssl/infra.crt \
  -subj "/CN=infra.astra.test" \
  -addext "subjectAltName=DNS:infra.astra.test,IP:10.0.1.254"
```

Ограничьте права:

```bash
sudo chmod 600 /etc/apache2/ssl/infra.key
sudo chmod 644 /etc/apache2/ssl/infra.crt
sudo chown root:root /etc/apache2/ssl/infra.key /etc/apache2/ssl/infra.crt
```

Создайте HTTPS-виртуальный хост:

```bash
sudo nano /etc/apache2/sites-available/infra-ssl.conf
```

Содержимое:

```apache
<VirtualHost *:443>
    ServerName infra.astra.test
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/infra

    SSLEngine on
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5:!3DES
    SSLHonorCipherOrder on
    SSLCertificateFile /etc/apache2/ssl/infra.crt
    SSLCertificateKeyFile /etc/apache2/ssl/infra.key

    <Directory /var/www/infra>
        Options -Indexes -FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/infra_ssl_error.log
    CustomLog ${APACHE_LOG_DIR}/infra_ssl_access.log combined
</VirtualHost>
```

Включите SSL:

```bash
sudo a2enmod ssl
sudo a2ensite infra-ssl
sudo apache2ctl configtest
sudo systemctl restart apache2
```

Проверьте:

```bash
curl -k https://infra.astra.test
curl -k -I https://infra.astra.test
```

Ключ `-k` нужен только потому, что сертификат самоподписанный и не доверен клиенту.

Бонусное задание для самостоятельной проверки: объясните, зачем в HTTPS-виртуальном хосте используются директивы `SSLProtocol`, `SSLCipherSuite` и `SSLHonorCipherOrder`, и какие устаревшие протоколы они исключают.

## Часть 6. Дополнительное ограничение доступа

Если по заданию преподавателя веб-сервер должен быть доступен только локально, измените `/etc/apache2/ports.conf`:

```apache
Listen 127.0.0.1:80
Listen 127.0.0.1:443
```

После изменения:

```bash
sudo apache2ctl configtest
sudo systemctl restart apache2
sudo ss -tlnp | grep apache2
```

Проверьте локальный доступ:

```bash
curl http://127.0.0.1
curl -k https://127.0.0.1
```

Проверьте, что по сетевому адресу сайт недоступен:

```bash
curl http://10.0.1.254
```

Ожидаемый результат: подключение по сетевому адресу должно завершиться ошибкой, например `curl: (7) Failed to connect to 10.0.1.254 port 80: Connection refused`. Если у вашей ВМ другой IP-адрес, в сообщении будет указан ваш адрес.

## Что нужно сдать

Подготовьте отчет:

1. Вывод `systemctl status apache2`.
2. Файл или фрагмент `/etc/apache2/sites-available/infra.conf`.
3. Файл или фрагмент `/etc/apache2/conf-available/security-hardening.conf`.
4. Вывод `apache2ctl configtest`.
5. Вывод `curl -I http://infra.astra.test`.
6. Вывод `curl -k -I https://infra.astra.test`.
7. Краткое объяснение, зачем отключены `Indexes`, `ServerSignature`, `TraceEnable` и прямое раскрытие версии Apache.

## Контрольные вопросы

1. Чем виртуальный хост отличается от сайта по умолчанию?
2. Почему не стоит оставлять листинг каталогов включенным?
3. Почему самоподписанный сертификат вызывает предупреждение браузера?
4. Какие риски снижает заголовок `X-Content-Type-Options: nosniff`?
5. Почему перед перезапуском Apache важно выполнять `apache2ctl configtest`?

## Критерии зачета

Работа считается выполненной, если Apache установлен, сайт `infra.astra.test` открывается по HTTP и HTTPS, сайт по умолчанию отключен, конфигурация проходит `apache2ctl configtest`, листинг каталогов не раскрывает файлы, а HTTP-ответ содержит настроенные защитные заголовки.

## Использованные материалы

- Сборник практических заданий, модуль 9: веб-сервер на основе Apache.
- Фрагменты практики из модуля 2: локальное ограничение Apache и доступ через SSH-туннель.
- Методические рекомендации по настройке Astra Linux SE 1.7 и 1.8.
