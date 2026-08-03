# Лабораторная работа 2. Безопасный доступ по SSH без потери управления

**Сложность:** средняя<br>
**Время:** 60–75 минут<br>
**Целевая ОС:** учебные Astra Linux Special Edition 1.7 или 1.8<br>
**Формат:** две виртуальные машины

## Результат работы

Вы настроите отдельный ключ SSH с парольной фразой, сверите ключ хоста по доверенному каналу, запретите парольные методы и прямой вход `root`, проверите **эффективную**, а не только записанную конфигурацию и примените её без разрыва контрольной сессии.

## Схема стенда

| Роль | Имя | Учебный адрес |
| --- | --- | --- |
| Клиент администратора | `infra` | `10.0.1.254` |
| SSH-сервер | `server1` | `10.0.1.1` |

Во всех командах замените адреса на фактические. Учётная запись `sa` должна существовать на обеих ВМ, иметь домашний каталог и командную оболочку. На `server1` до копирования ключа временно разрешён парольный вход `sa`.

## Границы и меры безопасности

1. Используйте только учебные ВМ без рабочих данных и создайте снимки обеих машин.
2. Убедитесь, что доступна консоль `server1` в гипервизоре.
3. Не закрывайте текущую консольную или SSH-сессию до успешного входа во втором терминале.
4. Если сетевой экран включён, TCP/22 разрешают только от учебного клиента; отсутствие ответа ICMP не доказывает недоступность SSH.
5. Для максимального уровня назначьте `sa` необходимые атрибуты и метки штатными средствами Astra Linux до начала работы.

## Шаг 1. Предварительная проверка обеих ВМ

На обеих машинах зафиксируйте версию и текущий уровень:

```bash
cat /etc/os-release
test -r /etc/astra_version && cat /etc/astra_version
command -v astra-modeswitch >/dev/null && sudo astra-modeswitch getname
id sa
getent passwd sa
```

На `server1` проверьте пакет сервера. Устанавливайте его только из настроенного учебного репозитория:

```bash
if ! dpkg-query -W -f='${Status}\n' openssh-server 2>/dev/null | grep -q 'install ok installed'; then
    sudo apt update
    sudo apt install openssh-server
fi
sudo systemctl enable --now ssh
sudo systemctl --no-pager --full status ssh
sudo ss -H -ltnp 'sport = :22'
```

На `infra` проверьте маршрут. Интерактивное SSH-подключение до сверки ключа хоста не выполняйте:

```bash
ip route get 10.0.1.1
ping -c 4 10.0.1.1 || echo "ICMP недоступен; доступность SSH проверим безопасно на следующем шаге"
```

Не принимайте неизвестный host key и не вводите временный пароль до независимого сравнения fingerprint.

## Шаг 2. Сверить ключ хоста по доверенному каналу

На консоли `server1` получите fingerprint ключа хоста:

```bash
HOST_KEY_FILE=/etc/ssh/ssh_host_ed25519_key.pub
if ! sudo test -f "$HOST_KEY_FILE"; then
    sudo ls -1 /etc/ssh/ssh_host_*_key.pub
    echo "Выберите существующий публичный ключ хоста и повторите шаг"
    exit 1
fi
sudo ssh-keygen -lf "$HOST_KEY_FILE"
```

Если Ed25519-ключ отсутствует, задайте `HOST_KEY_FILE` как путь к существующему публичному ключу из выведенного списка. Запишите его тип, например `rsa`.

На `infra` посмотрите fingerprint, получаемый по сети:

```bash
HOST_KEY_TYPE=ed25519  # замените на фактический тип с консоли server1
ssh-keyscan -T 5 -t "$HOST_KEY_TYPE" 10.0.1.1 2>/dev/null | ssh-keygen -lf -
```

Сравните SHA256 fingerprint символ в символ с результатом на консоли. `ssh-keyscan` сам по себе не устанавливает доверие: продолжать можно только после независимого сравнения. После совпадения выполните первое интерактивное подключение, подтвердите именно проверенный ключ и введите временный пароль `sa`:

```bash
ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=ask sa@10.0.1.1 exit
```

## Шаг 3. Создать отдельный лабораторный ключ

На `infra` под `sa` выберите **один** поддерживаемый тип ключа. Предпочтительный вариант Ed25519:

```bash
LAB_KEY="$HOME/.ssh/id_ed25519_astra_lab"
if test -e "$LAB_KEY" || test -e "$LAB_KEY.pub"; then
    echo "STOP: лабораторный ключ уже существует"
    exit 1
fi
ssh-keygen -t ed25519 -a 64 -f "$LAB_KEY" \
  -C "sa@infra astra ssh lab"
chmod 700 "$HOME/.ssh"
chmod 600 "$LAB_KEY"
chmod 644 "$LAB_KEY.pub"
umask 077
printf '%s\n' "$LAB_KEY" > "$HOME/astra-lab2-key-path.txt"
```

Если криптографическая политика целевой сборки запрещает Ed25519, согласованный запасной вариант:

```bash
LAB_KEY="$HOME/.ssh/id_rsa_astra_lab"
if test -e "$LAB_KEY" || test -e "$LAB_KEY.pub"; then
    echo "STOP: лабораторный ключ уже существует"
    exit 1
fi
ssh-keygen -t rsa -b 3072 -o -a 64 -f "$LAB_KEY" \
  -C "sa@infra astra ssh lab"
chmod 700 "$HOME/.ssh"
chmod 600 "$LAB_KEY"
chmod 644 "$LAB_KEY.pub"
umask 077
printf '%s\n' "$LAB_KEY" > "$HOME/astra-lab2-key-path.txt"
```

Оба варианта требуют парольную фразу. Дальнейшие команды читают выбранный путь из `astra-lab2-key-path.txt`, поэтому fallback не оставляет скрытых Ed25519-зависимостей.

## Шаг 4. Установить открытый ключ и доказать метод входа

На `infra`:

```bash
LAB_KEY="$(cat "$HOME/astra-lab2-key-path.txt")"
ssh-copy-id -i "$LAB_KEY.pub" sa@10.0.1.1
ssh -vv -i "$LAB_KEY" -o IdentitiesOnly=yes \
  sa@10.0.1.1 true
```

В диагностическом выводе найдите подтверждение аутентификации методом `publickey`. Запрос парольной фразы локального закрытого ключа допустим; запрос пароля учётной записи на сервере — нет.

## Шаг 5. Подготовить безопасное изменение сервера

На `server1` создайте отдельную резервную копию:

```bash
LAB2_BACKUP="/root/astra-lab2-$(date +%Y%m%d-%H%M%S)"
sudo install -d -m 700 "$LAB2_BACKUP" || {
    echo "STOP: не удалось создать резервную директорию"
    exit 1
}
sudo cp -a /etc/ssh "$LAB2_BACKUP/ssh" || {
    echo "STOP: не удалось скопировать /etc/ssh"
    exit 1
}
sudo test -f "$LAB2_BACKUP/ssh/sshd_config" || {
    echo "STOP: резервная копия sshd_config отсутствует"
    exit 1
}
umask 077
printf '%s\n' "$LAB2_BACKUP" > "$HOME/astra-lab2-backup-path.txt" || exit 1
sudo grep -RnsE '^[[:space:]]*(Include|Match|PermitRootLogin|PubkeyAuthentication|PasswordAuthentication|KbdInteractiveAuthentication|ChallengeResponseAuthentication|AuthenticationMethods|AllowUsers|AllowGroups|MaxAuthTries|X11Forwarding|ClientAlive)' \
  /etc/ssh/sshd_config /etc/ssh/sshd_config.d 2>/dev/null
```

OpenSSH обычно использует первое полученное глобальное значение. Поэтому нельзя бездумно дописывать второй набор директив в конец файла. Если главный файл рано подключает каталог `sshd_config.d`, создайте отдельный первый лабораторный drop-in; иначе редактируйте первые действующие глобальные значения до блока `Match` в основном файле:

```bash
if sudo grep -Eq '^[[:space:]]*Include[[:space:]]+/etc/ssh/sshd_config\.d/\*\.conf' \
  /etc/ssh/sshd_config; then
    LAB2_POLICY=/etc/ssh/sshd_config.d/00-astra-lab-hardening.conf
    sudo test ! -e "$LAB2_POLICY" || {
        echo "STOP: $LAB2_POLICY уже существует"
        exit 1
    }
else
    LAB2_POLICY=/etc/ssh/sshd_config
fi
printf '%s\n' "$LAB2_POLICY" > "$HOME/astra-lab2-policy-path.txt"
sudoedit "$LAB2_POLICY"
```

При работе с новым drop-in поместите в него целевой профиль целиком. При работе с основным файлом изменяйте первые активные определения, не создавая поздние дубли. Если `sshd -T` ниже показывает другое значение, найдите более ранний `Include`, drop-in или глобальное определение; резервная копия всего `/etc/ssh` уже создана.

Целевая эффективная конфигурация учебного стенда:

```text
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
AuthenticationMethods publickey
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers sa
```

`ChallengeResponseAuthentication` оставлен для совместимости с обновлениями, где это историческое имя параметра ещё используется. Если SSH нужен другим администраторам, добавьте только заранее проверенные учётные записи в одну строку `AllowUsers`; не лишайте аварийную учётную запись доступа.

## Шаг 6. Проверить синтаксис и эффективные значения

На `server1`:

```bash
sudo /usr/sbin/sshd -t
sudo /usr/sbin/sshd -T -C user=sa,host=infra,addr=10.0.1.254 | \
  grep -E '^(permitrootlogin|pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication|challengeresponseauthentication|authenticationmethods|maxauthtries|x11forwarding|clientaliveinterval|clientalivecountmax|allowusers)\b'
sudo /usr/sbin/sshd -T -C user=root,host=infra,addr=10.0.1.254 | \
  grep -x 'permitrootlogin no'
```

Проверка не пройдена, если среди эффективных значений нет как минимум:

```text
permitrootlogin no
pubkeyauthentication yes
passwordauthentication no
kbdinteractiveauthentication no
authenticationmethods publickey
x11forwarding no
maxauthtries 3
allowusers sa
```

Не применяйте конфигурацию, пока фактический вывод отличается от целевого. Ищите ранний дубль, `Include` или подходящий блок `Match`.

## Шаг 7. Применить без потери доступа

Оставьте текущую консоль или SSH-сессию открытой. На `server1`:

```bash
sudo /usr/sbin/sshd -t || {
    echo "Синтаксис SSH повреждён; конфигурацию не применяем"
    exit 1
}
sudo systemctl reload ssh
sudo systemctl is-active ssh
sudo journalctl -u ssh -n 30 --no-pager
```

Во **втором** терминале на `infra`:

```bash
LAB_KEY="$(cat "$HOME/astra-lab2-key-path.txt")"
ssh -vv -i "$LAB_KEY" -o IdentitiesOnly=yes \
  sa@10.0.1.1 id
```

Только после успешного нового подключения можно закрыть контрольную сессию.

## Шаг 8. Отрицательные проверки

Убедитесь, что сервер не предлагает пароль или keyboard-interactive:

```bash
ssh -vv \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password,keyboard-interactive \
  -o NumberOfPasswordPrompts=1 \
  sa@10.0.1.1
```

Ожидается отказ; среди доступных методов сервер должен оставлять только `publickey` либо не предлагать совместимого метода.

Проверьте запрет прямого входа `root` без интерактивных запросов:

```bash
LAB_KEY="$(cat "$HOME/astra-lab2-key-path.txt")"
ssh -o BatchMode=yes -i "$LAB_KEY" \
  -o IdentitiesOnly=yes root@10.0.1.1 true
```

Ожидается отказ, но это только дополнительная функциональная проверка: у `root` обычно нет лабораторного ключа `sa`, поэтому один такой отказ ещё не доказывает действие `PermitRootLogin no`. Основное доказательство — строка `permitrootlogin no` в эффективной конфигурации для контекста `user=root`. Не устанавливайте отдельный ключ `root` ради теста. Успешный TCP handshake сам по себе не означает успешную аутентификацию.

## Аварийное восстановление

Если второе подключение не работает, не закрывайте контрольную сессию. На консоли `server1`:

```bash
test -r "$HOME/astra-lab2-backup-path.txt" || {
    echo "STOP: файл с путём к резервной копии отсутствует"
    exit 1
}
LAB2_BACKUP="$(cat "$HOME/astra-lab2-backup-path.txt")"
[[ "$LAB2_BACKUP" =~ ^/root/astra-lab2-[0-9]{8}-[0-9]{6}$ ]] || {
    echo "STOP: недопустимый путь резервной копии"
    exit 1
}
sudo test -d "$LAB2_BACKUP/ssh" &&
sudo test -f "$LAB2_BACKUP/ssh/sshd_config" || {
    echo "STOP: резервная копия /etc/ssh неполна; откат не начинаем"
    exit 1
}
if sudo test -f /etc/ssh/sshd_config.d/00-astra-lab-hardening.conf; then
    sudo install -d -m 700 "$LAB2_BACKUP/created-artifacts" || exit 1
    sudo mv /etc/ssh/sshd_config.d/00-astra-lab-hardening.conf \
      "$LAB2_BACKUP/created-artifacts/" || exit 1
fi
sudo cp -a "$LAB2_BACKUP/ssh/sshd_config" /etc/ssh/sshd_config || exit 1
if sudo test -d "$LAB2_BACKUP/ssh/sshd_config.d"; then
    sudo install -d -m 755 /etc/ssh/sshd_config.d || exit 1
    sudo cp -a "$LAB2_BACKUP/ssh/sshd_config.d/." /etc/ssh/sshd_config.d/ || exit 1
fi
sudo /usr/sbin/sshd -t || {
    echo "Откат не прошёл проверку; службу не перезагружаем"
    exit 1
}
sudo systemctl reload ssh
sudo systemctl is-active ssh
```

Для полного возврата удалите из `~sa/.ssh/authorized_keys` только строку с комментарием `sa@infra astra ssh lab`, удалите только отдельный лабораторный ключ на `infra` и восстановите снимки обеих ВМ. Не удаляйте весь `authorized_keys` и не отключайте модули КСЗ.

## Что сдать

1. Версии, текущие уровни и адреса обеих ВМ.
2. Сверенные SHA256 fingerprints ключа хоста.
3. Фрагмент `ssh -vv`, подтверждающий метод `publickey`.
4. Полный отфильтрованный вывод `sshd -T -C`.
5. Результаты двух отрицательных проверок.
6. Путь к резервной копии и описание успешного входа во втором терминале.

## Контрольные вопросы

1. Почему `ssh-keyscan` нельзя считать доверенным источником без сравнения fingerprint?
2. Чем парольная фраза закрытого ключа отличается от пароля удалённой учётной записи?
3. Почему `sshd -t` недостаточно и нужна команда `sshd -T`?
4. Как `AuthenticationMethods publickey` страхует ошибку в настройке других методов?
5. Почему конфигурацию применяют через `reload` и проверяют во второй сессии?

## Критерии зачёта

Работа зачтена, если ключ хоста сверён по доверенному каналу, вход `sa` доказан методом `publickey`, эффективные значения соответствуют профилю, парольные методы и прямой вход `root` отвергаются, а откат выполняется через доступную консоль без удаления чужих ключей.

## Официальные материалы

- [OpenSSH: sshd_config(5)](https://man.openbsd.org/sshd_config)
- [Debian manpages: sshd(8)](https://manpages.debian.org/bookworm/openssh-server/sshd.8.en.html)
- [Debian manpages: ssh-keygen(1)](https://manpages.debian.org/bookworm/openssh-client/ssh-keygen.1.en.html)
- [Рекомендации по безопасной настройке Astra Linux](https://wiki.astralinux.ru/pages/viewpage.action?pageId=137563555)
