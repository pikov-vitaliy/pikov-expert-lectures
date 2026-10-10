---
title: "GitLab CI"
type: tool
tool: "GitLab CI"
category: platform
offline: yes
status: ready
updated: 2026-06-17
tags: [инструмент]
---

# GitLab CI

> [!info] Контекст
> CI/CD-оркестратор GitLab: pipeline описывается файлом `.gitlab-ci.yml` в корне репозитория, задачи (`jobs`) исполняются раннерами. В курсе это место, где живёт **CI security gate** — точка, в которой SCA/OSA-проверка останавливает сборку по заранее согласованному порогу (критичность уязвимостей, запрещённые лицензии, провал quality gate на SBOM).

## Для чего
Запускает SCA/OSA-инструменты как шаги конвейера и превращает их результат в решение «пропустить / остановить». Ключевая идея gate: сборка валится **кодом возврата задачи** (статус `failed`, exit code 1), а не строкой в логе, которую никто не читает. Так проверка состава становится управляемой, а не информационной.

## Как применяют
Gate из трёх шагов — генерация SBOM, сканирование с порогом, отдельный fail по лицензиям:

```yaml
stages: [sca]

sca_scan:
  stage: sca
  image: alpine:3.20
  before_script:
    - apk add --no-cache curl jq
    - curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh  | sh -s -- -b /usr/local/bin
    - curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin
  script:
    - syft dir:. -o cyclonedx-json=sbom.cdx.json
    - grype sbom:sbom.cdx.json --fail-on high --only-fixed -o table | tee grype-report.txt
  artifacts:
    when: always
    paths: [sbom.cdx.json, grype-report.txt]
    expire_in: 1 week
```

Перед жёсткой блокировкой gate обкатывают в режиме `allow_failure: true`, собирают статистику и согласуют порог. Артефакты (SBOM, отчёт сканера) сохраняются и доступны на вкладке **Job artifacts**.

## Сильные стороны
- Естественная точка для CI-gate: проверка привязана к конкретному коммиту, результат виден в MR, exit code раннера = решение.
- `artifacts` дают воспроизводимый след: SBOM и отчёт сканера сохраняются вместе со сборкой и доступны аудиту.
- Любой SCA/OSA-инструмент в виде контейнера или бинаря встраивается шагом без привязки к вендору; этапы кэшируются.

## Ограничения
- Gate на сборке — **наблюдающе-блокирующий по релизу**, а не по входу: он останавливает pipeline, но не мешает разработчику затянуть пакет на dev-машину (это зона controlled repository / OSA Proxy).
- Качество находок целиком зависит от вложенного сканера и его фидов; сам GitLab CI не вычисляет уязвимости.
- На офлайн-раннере шаги, тянущие установочные скрипты и базы сканера из сети, падают — нужен предзаполненный кэш и примонтированные БД.

## Offline / on-premise
Да. Self-managed GitLab и раннеры разворачиваются в закрытом контуре. Условие работы gate офлайн — заранее загруженные образы, бинари инструментов и кэш баз сканера (например, `GRYPE_DB_CACHE_DIR` с примонтированной базой); шаги не должны зависеть от доступа в публичную сеть на каждый запуск.

## Связанные темы
- Модули: [[01 Курс/М08 Защита цепочки поставки и OSA/00 Карта модуля|М08. Защита цепочки поставки и OSA]] · [[01 Курс/М06 Поиск уязвимостей и управление VDR VEX/00 Карта модуля|М06. Поиск уязвимостей и VDR/VEX]]
- Практики: [[П16. GitLab CI security gate]] · [[П34. SBOM quality gate]] · [[П18. OSA Proxy режимы и ограничения]]
- Смежные карточки: [[JFrog Artifactory]] · [[Nexus Repository]] · [[04 Инструменты/Grype|Grype]] · [[04 Инструменты/Trivy|Trivy]]
