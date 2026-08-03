# Лабораторная работа 1. Проверка и настройка парольной политики

**Сложность:** базовая<br>
**Время:** 45–60 минут<br>
**Целевая ОС:** учебная Astra Linux Special Edition 1.7 или 1.8<br>
**Формат:** индивидуальная работа на виртуальной машине

## Результат работы

Вы определите фактически используемый PAM-стек, настроите учебную парольную политику штатным интерфейсом либо через уже подключённые PAM-модули, примените сроки действия к тестовой учётной записи и функционально проверите сложность, историю и aging.

После работы слушатель должен уметь:

- отличать настройки для новых учётных записей в `/etc/login.defs` от параметров существующих пользователей;
- определять активные модули `pam_pwquality`, `pam_cracklib` и `pam_pwhistory`;
- пользоваться интерфейсами парольной политики Astra Linux 1.7 и 1.8;
- проверять политику реальной сменой пароля, а не только чтением конфигурации;
- безопасно вернуть учебную ВМ в исходное состояние.

## Границы и меры безопасности

Работа выполняется только на учебной ВМ без рабочих данных. Значения ниже — учебный профиль, а не универсальное нормативное требование. Для реальной системы параметры выводят из модели угроз, политики управления доступом и применимых требований.

Перед началом:

1. Создайте снимок ВМ и убедитесь, что доступна её консоль.
2. Не закрывайте текущую административную сессию до завершения функциональной проверки.
3. Не добавляйте в PAM отсутствующий модуль и не копируйте чужой `common-password`: состав стека зависит от обновления ОС.
4. Используйте только специально создаваемую учётную запись `student-test`.

## Шаг 1. Зафиксировать исходное состояние

Выполните:

```bash
cat /etc/os-release
test -r /etc/astra_version && cat /etc/astra_version
command -v astra-modeswitch >/dev/null && sudo astra-modeswitch getname
sudo -v
```

Проверьте, что имя лабораторной учётной записи свободно. Если команда выводит запись, остановитесь и восстановите чистый снимок либо согласуйте другое уникальное имя с преподавателем:

```bash
if getent passwd student-test >/dev/null; then
    echo "STOP: пользователь student-test уже существует"
    exit 1
fi
```

Найдите активные строки PAM:

```bash
sudo grep -nE '^[[:space:]]*password.*pam_(pwquality|cracklib|pwhistory|unix)\.so' \
  /etc/pam.d/common-password
```

Зафиксируйте результат:

- `pam_pwquality.so` — используйте параметры `pwquality`;
- `pam_cracklib.so` — это другой набор параметров, характерный для части обновлений 1.7;
- `pam_pwhistory.so` — история вынесена в отдельный модуль;
- `remember=` в строке `pam_unix.so` — история реализована текущим стеком без отдельной строки `pam_pwhistory`;
- ни одного ожидаемого варианта — не редактируйте PAM вручную, используйте штатный графический интерфейс и сообщите преподавателю точное обновление ОС.

Создайте неперезаписываемую резервную копию:

```bash
LAB1_BACKUP="/root/astra-lab1-$(date +%Y%m%d-%H%M%S)"
sudo install -d -m 700 "$LAB1_BACKUP" || {
    echo "STOP: не удалось создать резервную директорию"
    exit 1
}
sudo cp -a /etc/pam.d/common-password /etc/login.defs "$LAB1_BACKUP"/ || {
    echo "STOP: не удалось скопировать common-password и login.defs"
    exit 1
}
if sudo test -e /etc/security/opasswd; then
    sudo cp -a /etc/security/opasswd "$LAB1_BACKUP"/ || {
        echo "STOP: не удалось скопировать /etc/security/opasswd"
        exit 1
    }
    echo 'opasswd=present' | sudo tee "$LAB1_BACKUP/opasswd-state.txt" >/dev/null || exit 1
else
    echo 'opasswd=absent' | sudo tee "$LAB1_BACKUP/opasswd-state.txt" >/dev/null || exit 1
fi
sudo test -f "$LAB1_BACKUP/common-password" &&
sudo test -f "$LAB1_BACKUP/login.defs" &&
sudo grep -Eq '^opasswd=(present|absent)$' "$LAB1_BACKUP/opasswd-state.txt" || {
    echo "STOP: резервная копия неполна; настройки не изменяем"
    exit 1
}
umask 077
printf '%s\n' "$LAB1_BACKUP" > "$HOME/astra-lab1-backup-path.txt" || exit 1
sudo ls -la "$LAB1_BACKUP"
```

## Шаг 2. Выбрать один способ настройки

Не смешивайте варианты A и B в одной попытке. После штатной настройки всё равно выполните команды проверки из шага 3.

### Вариант A — штатный интерфейс Astra Linux

В Astra Linux 1.8 откройте три оснастки:

```bash
astra-systemsettings astra_kcm_policy_complexity
astra-systemsettings astra_kcm_policy_history
astra-systemsettings astra_kcm_policy_expiration
```

Если эти модули отсутствуют на Astra Linux 1.7, используйте установленный менеджер безопасности:

```bash
fly-admin-smc
```

Названия пунктов могут отличаться между обновлениями. Настройте учебный профиль:

| Параметр | Учебное значение |
| --- | --- |
| Минимальная длина | 12 символов |
| Строчные, заглавные, цифры, прочие символы | не менее 1 каждого типа |
| Проверка имени пользователя и GECOS | включена |
| Проверка для `root` | включена |
| История | 5 предыдущих паролей |
| Минимальный / максимальный срок | 1 / 60 дней |
| Предупреждение | за 7 дней |

Сохраните настройки и запишите названия реально доступных оснасток в отчёт.

### Вариант B — уже подключённые `pam_pwquality` и `pam_pwhistory`

Этот вариант разрешён только если шаг 1 подтвердил наличие обоих модулей в системе. Если активен `pam_cracklib` или история реализована через `pam_unix remember=`, используйте вариант A либо точную инструкцию преподавателя для вашей сборки.

Откройте PAM-файл безопасным редактором:

```bash
sudoedit /etc/pam.d/common-password
```

В существующей активной строке `pam_pwquality.so` сохраните её управляющее поле и добавьте или приведите параметры к виду:

```text
retry=3 minlen=12 lcredit=-1 ucredit=-1 dcredit=-1 ocredit=-1 usercheck=1 gecoscheck=1 enforce_for_root
```

В существующей строке `pam_pwhistory.so` задайте:

```text
use_authtok remember=5 enforce_for_root
```

Порядок должен оставаться таким: проверка качества, затем история, затем установка хеша через `pam_unix`. Не создавайте дубли строк.

Настройте значения по умолчанию для **новых** учётных записей:

```bash
sudoedit /etc/login.defs
```

В файле должна остаться ровно одна активная строка каждого параметра:

```text
PASS_MIN_DAYS   1
PASS_MAX_DAYS   60
PASS_WARN_AGE   7
```

## Шаг 3. Проверить конфигурацию, а не комментарии

```bash
sudo grep -nE '^[[:space:]]*password.*pam_(pwquality|cracklib|pwhistory|unix)\.so' \
  /etc/pam.d/common-password
sudo grep -nE '^[[:space:]]*PASS_(MIN_DAYS|MAX_DAYS|WARN_AGE)[[:space:]]+' \
  /etc/login.defs
```

Если одна настройка встречается в нескольких активных строках, остановитесь: устраните дубли через выбранный интерфейс и повторите проверку.

Важно: `PASS_*` в `/etc/login.defs` не меняет уже существующие учётные записи. Поэтому дальше сроки будут применены отдельно командой `chage`.

## Шаг 4. Создать только лабораторного пользователя

```bash
sudo adduser --disabled-password --gecos "Astra password lab" student-test
sudo chage -m 1 -M 60 -W 7 student-test
sudo chage -l student-test
```

В выводе `chage -l` проверьте минимум 1 день, максимум 60 дней и предупреждение за 7 дней.

## Шаг 5. Функционально проверить качество и историю

Не используйте опубликованный в методичке пароль: словарная проверка может его отклонить, а известное значение нельзя считать секретом. Придумайте два разных временных значения `P1` и `P2`, каждое длиной не менее 12 символов и со всеми требуемыми классами знаков. Не помещайте их в отчёт и командную строку.

1. Запустите установку пароля:

   ```bash
   sudo passwd student-test
   ```

2. Сначала введите заведомо слабое значение. Ожидается отказ. Если `root` смог установить его, проверка `enforce_for_root` не действует — работу нельзя считать выполненной.
3. Повторите команду и установите `P1`.
4. Повторите команду и установите `P2`.
5. Ещё раз запустите `sudo passwd student-test` и попробуйте вернуть `P1`. Ожидается отказ из-за истории.
6. Убедитесь, что учётная запись работает, затем сразу завершите сеанс:

   ```bash
   su - student-test
   id
   exit
   ```

Формулировка сообщения зависит от локализации и версии PAM. Критерий — фактический отказ, а не конкретный текст ошибки.

## Восстановление

После фиксации результатов удалите только созданную работой учётную запись:

```bash
sudo deluser --remove-home student-test
```

Для полного возврата учебной ВМ используйте снимок. Если после резервного копирования не выполнялись другие административные изменения, можно восстановить два файла:

```bash
test -r "$HOME/astra-lab1-backup-path.txt" || {
    echo "STOP: файл с путём к резервной копии отсутствует"
    exit 1
}
LAB1_BACKUP="$(cat "$HOME/astra-lab1-backup-path.txt")"
[[ "$LAB1_BACKUP" =~ ^/root/astra-lab1-[0-9]{8}-[0-9]{6}$ ]] || {
    echo "STOP: недопустимый путь резервной копии"
    exit 1
}
sudo test -f "$LAB1_BACKUP/common-password" &&
sudo test -f "$LAB1_BACKUP/login.defs" &&
sudo test -f "$LAB1_BACKUP/opasswd-state.txt" || {
    echo "STOP: обязательные файлы резервной копии отсутствуют"
    exit 1
}

OPASSWD_STATE="$(sudo cat "$LAB1_BACKUP/opasswd-state.txt")" || exit 1
case "$OPASSWD_STATE" in
  opasswd=present)
    sudo test -f "$LAB1_BACKUP/opasswd" || {
        echo "STOP: исходный opasswd не сохранён"
        exit 1
    }
    ;;
  opasswd=absent) ;;
  *)
    echo "STOP: некорректный маркер состояния opasswd"
    exit 1
    ;;
esac

sudo cp -a "$LAB1_BACKUP/common-password" /etc/pam.d/common-password || exit 1
sudo cp -a "$LAB1_BACKUP/login.defs" /etc/login.defs || exit 1

if [ "$OPASSWD_STATE" = 'opasswd=present' ]; then
    sudo cp -a "$LAB1_BACKUP/opasswd" /etc/security/opasswd || exit 1
elif sudo test -e /etc/security/opasswd; then
    sudo test ! -e "$LAB1_BACKUP/opasswd.created-during-lab" || exit 1
    sudo mv /etc/security/opasswd "$LAB1_BACKUP/opasswd.created-during-lab" || exit 1
fi
```

Файл `/etc/security/opasswd` хранит историю для `pam_pwhistory`: удаление пользователя через `deluser` само по себе не обязано удалить эту запись. Поэтому ручной откат восстанавливает исходное состояние файла либо перемещает созданный лабораторией файл в резервную директорию. Не продолжайте работу с системой, если PAM повреждён или результат проверки неоднозначен: восстановите снимок ВМ.

## Что сдать

1. Версию и номер обновления Astra Linux, результат `astra-modeswitch getname` (если команда доступна).
2. Вывод активных строк PAM до и после настройки; секреты в выводе отсутствуют.
3. Вывод активных `PASS_*` и `chage -l student-test`.
4. Краткую фиксацию трёх функциональных результатов: слабый пароль отклонён, `P1` и `P2` приняты, повторное использование `P1` отклонено.
5. Путь к резервной копии и выбранный способ восстановления.

## Контрольные вопросы

1. Почему наличие строки в `/etc/login.defs` не доказывает сроки для существующего пользователя?
2. Почему нельзя вставлять строку `pam_pwhistory.so` без проверки наличия модуля и порядка PAM?
3. Что меняет `enforce_for_root`?
4. Почему фиксированный «сложный» пароль из методички не подходит даже для учебного примера?

## Критерии зачёта

Работа зачтена, если определён реальный PAM-стек, нет дублей активных параметров, слабое значение и повторный пароль отклонены, `chage -l` показывает заданные сроки, а восстановление подготовлено и не затрагивает чужие учётные записи.

## Официальные материалы

- [Astra Linux: настройка политик учётных записей](https://wiki.astralinux.ru/pages/viewpage.action?pageId=53643494)
- [Debian manpages: pam_pwquality(8)](https://manpages.debian.org/bookworm/libpam-pwquality/pam_pwquality.8.en.html)
- [Debian manpages: pam_pwhistory(8)](https://manpages.debian.org/bookworm/libpam-modules/pam_pwhistory.8.en.html)
- [Debian manpages: login.defs(5)](https://manpages.debian.org/bookworm/login/login.defs.5.en.html)
- [Debian manpages: chage(1)](https://manpages.debian.org/bookworm/passwd/chage.1.en.html)
