#!/usr/bin/env bash
# Неразрушающий preflight. Установку Docker выполняет администратор заранее.

set -eu

image='bkimminich/juice-shop@sha256:cd58d79c5cb4d82f22fbaf616f9ff43bbd04ba630cd6b448a9ed99cf652fcebf'

command -v docker >/dev/null 2>&1 || {
  echo 'ERROR: Docker CLI не найден. Обратитесь к преподавателю.' >&2
  exit 1
}

docker version >/dev/null 2>&1 || {
  echo 'ERROR: Docker Engine недоступен. Запустите штатно установленный Engine.' >&2
  exit 1
}

docker compose version >/dev/null 2>&1 || {
  echo 'ERROR: Docker Compose v2 недоступен.' >&2
  exit 1
}

docker image inspect "$image" >/dev/null 2>&1 || {
  echo "ERROR: проверенный образ отсутствует: $image" >&2
  echo 'Не скачивайте latest; получите подготовленный образ у преподавателя.' >&2
  exit 1
}

echo 'PREFLIGHT OK'
echo 'Используйте только appsec-lections/lab/juice-shop/compose.yaml.'
