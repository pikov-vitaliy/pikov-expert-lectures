#!/bin/bash
# Загрузка видео занятий курса на хостинг: kamaz-ai/media/day-0N/*.mp4 -> ~/kamaz-ai.pikov.expert/www/media/day-0N/
# Видео не хранятся в git (папка kamaz-ai/media в .gitignore, GitHub не принимает файлы > 100 МБ).
# Выкладка сайта (_PROJECT/deploy-hosting.ps1) папку www/media не стирает (rsync --exclude=/media/)
# и не кладёт в резервную копию (tar --exclude=www/media). Откат на старый SHA – см. OPERATIONS_RUNBOOK.md.
# Запуск из Git Bash:  bash kamaz-ai/_build/upload-media.sh 3      (номер дня, 1–9)
# Повторный запуск сверяет файлы по SHA-256: загружает новые и изменившиеся, у остальных выставляет права.
set -euo pipefail
DAY="${1:?номер дня, например 3}"
[[ "$DAY" =~ ^[1-9]$ ]] || { echo "номер дня – одна цифра 1–9"; exit 2; }
HOST="${HOST:-pikov-hosting}"
SRC="$(cd "$(dirname "$0")/.." && pwd)/media/day-0${DAY}"
DST="kamaz-ai.pikov.expert/www/media/day-0${DAY}"   # из проверенной цифры – безопасно для удалённой оболочки
[ -d "$SRC" ] || { echo "нет папки $SRC"; exit 1; }
NAME_RE='^[A-Za-z0-9][A-Za-z0-9._-]*\.mp4$'          # только такие имена уходят в удалённые команды
ssh -o BatchMode=yes "$HOST" "mkdir -p ~/$DST && chmod 755 ~/kamaz-ai.pikov.expert/www/media ~/$DST"
declare -A REMOTE
while read -r sum name; do REMOTE["$name"]="$sum"; done < <(ssh -o BatchMode=yes "$HOST" "cd ~/$DST && for f in *.mp4; do [ -f \"\$f\" ] && sha256sum \"\$f\"; done" 2>/dev/null || true)
for f in "$SRC"/*.mp4; do
  n="$(basename "$f")"
  [[ "$n" =~ $NAME_RE ]] || { echo "пропуск: недопустимое имя $n"; continue; }
  sum="$(sha256sum "$f" | awk '{print $1}')"
  if [ "${REMOTE[$n]:-}" = "$sum" ]; then
    ssh -o BatchMode=yes "$HOST" "chmod 644 ~/$DST/$n"; echo "есть  $n"; continue
  fi
  echo "грузим $n ($(( $(stat -c %s "$f") / 1048576 )) МБ)"
  scp -q "$f" "$HOST:$DST/$n.part"
  ssh -o BatchMode=yes "$HOST" "cd ~/$DST && [ \"\$(sha256sum $n.part | cut -d' ' -f1)\" = $sum ] && chmod 644 $n.part && mv -f $n.part $n" \
    || { echo "ошибка проверки $n"; exit 3; }
done
ssh -o BatchMode=yes "$HOST" "du -sh ~/$DST; quota -s 2>/dev/null | tail -1"
echo UPLOAD-MEDIA-DONE
