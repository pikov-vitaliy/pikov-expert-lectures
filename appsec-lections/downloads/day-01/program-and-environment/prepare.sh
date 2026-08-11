#!/bin/bash
# Подготовка компьютера к тренингу Kaspersky AppSec (11-12 августа 2026)
# Запусти: bash prepare.sh

set -e

echo "=== Шаг 1/3: Добавление в группу docker ==="
sudo usermod -aG docker superuser
echo "Готово. После перезагрузки/перелогина docker будет работать без sudo."

echo ""
echo "=== Шаг 2/3: Установка docker-compose ==="
sudo apt-get update -qq
sudo apt-get install -y docker-compose-v2
echo "Готово."

echo ""
echo "=== Шаг 3/3: Загрузка образа Juice Shop ==="
echo "(требуется членство в группе docker — если вы ещё не перелогинились,"
echo " этот шаг нужно будет выполнить вручную после перезахода в систему)"
docker pull bkimminich/juice-shop 2>/dev/null && echo "Готово." || {
    echo "Не удалось скачать образ без sudo — выполни после перелогина:"
    echo "  docker pull bkimminich/juice-shop"
}

echo ""
echo "=== Всё готово! ==="
echo "Для запуска Juice Shop:"
echo "  docker run --rm -p 3000:3000 -e NODE_ENV=unsafe bkimminich/juice-shop"
echo "Затем открой http://localhost:3000"
