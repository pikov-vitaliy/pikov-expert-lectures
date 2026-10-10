---
title: "Sigstore Cosign"
type: tool
tool: "Sigstore Cosign"
category: signing
offline: partial
status: ready
updated: 2026-06-17
tags: [инструмент]
---

# Sigstore Cosign

## Для чего
Cosign подписывает контейнерные образы и произвольные артефакты и прикрепляет к ним подписи и attestations (например, SBOM или provenance), храня их рядом с образом в OCI-реестре. Главная фишка — **keyless-подпись**: вместо долгоживущего приватного ключа Cosign получает короткоживущий сертификат от Fulcio на OIDC-идентичность (кто и в каком pipeline подписал) и заносит факт подписи в публичный transparency log Rekor. На выходе — подпись, которую downstream-потребитель может проверить, не доверяя «на слово».

> [!info] Что Cosign добавляет к SBOM
> SBOM — это просто JSON, который можно подменить между сборкой и проверкой. Cosign превращает его в [[04 Инструменты/in-toto|in-toto]] DSSE-конверт, жёстко привязанный к digest образа, и фиксирует подписанта. Без этого шага attestation не отличается от любого файла, положенного злоумышленником.

## Как применяют
Привязка CycloneDX-SBOM к образу как attestation и проверка с контролем идентичности подписанта (keyless, cosign v2):

```bash
# Прикрепить SBOM как attestation (Fulcio выдаёт сертификат, Rekor логирует факт)
cosign attest \
  --predicate bom.cdx.json \
  --type cyclonedx \
  --yes \
  ghcr.io/org/app@sha256:<digest>

# Проверить attestation С ПРИВЯЗКОЙ к ожидаемому identity и issuer
GITHUB_REPOSITORY='<github-owner>/<repository>'
EXPECTED_CERT_IDENTITY="^https:\/\/github\.com\/${GITHUB_REPOSITORY}\/.+$"

cosign verify-attestation \
  --type cyclonedx \
  --certificate-identity-regexp "$EXPECTED_CERT_IDENTITY" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  ghcr.io/org/app@sha256:<digest>
```

`https://token.actions.githubusercontent.com` — это OIDC issuer для GitHub Actions. Для ручной диагностики открывают не корень issuer, а well-known endpoint: `https://token.actions.githubusercontent.com/.well-known/openid-configuration`.

Для закрытого контура применяется ключевой режим: `cosign generate-key-pair`, затем `cosign sign --key cosign.key ...` и `cosign verify --key cosign.pub ...`. Адресовать объект всегда по `@sha256:<digest>`, а не по тегу — тег переназначаем.

## Сильные стороны
- Keyless-модель снимает проблему хранения и ротации приватных ключей: подписант — это проверяемая OIDC-идентичность CI, а не секрет в переменной.
- Подписи и attestations живут в том же OCI-реестре, что и образ, — отдельная инфраструктура хранения не нужна.
- Запись в Rekor даёт неотрекаемость: факт и время подписи фиксируются в transparency log.
- Один инструмент закрывает и подпись образа, и attestations (SBOM, SLSA-provenance, произвольные предикаты).

## Ограничения
- Проверка без `--certificate-identity*`/`--key` подтверждает лишь целостность подписи, но не *кто* подписал — это фикция доверия, частая ошибка внедрения.
- Keyless-режим требует доступного OIDC-провайдера и сетевого доступа к Fulcio и Rekor; в CI без `id-token: write` (GitHub) или `id_tokens` (GitLab) выпуск подписи невозможен.
- Привязка к digest означает, что подпись «отваливается» при работе по тегу `:latest` — нужно дисциплинированно адресовать образ по digest.
- Cosign подтверждает происхождение и целостность, но не качество содержимого: подпись честна и под пустым или нечестным SBOM.

## Offline / on-premise
Частично. Полностью офлайн работает ключевой режим (`--key`), без Fulcio и Rekor. Keyless-модель в закрытом контуре возможна при развёртывании self-hosted Fulcio, Rekor и OIDC-провайдера; иначе нужен сетевой доступ к публичным сервисам Sigstore. Проверку подписи можно делать офлайн при наличии локального бандла (`--bundle`) и корневых материалов TUF, выгруженных заранее (`cosign initialize` против внутреннего зеркала).

## Связанные темы
- [[01 Курс/М08 Защита цепочки поставки и OSA/00 Карта модуля|М08. Защита цепочки поставки и OSA]] — где подпись встраивается в контур доверия.
- [[П14. Подпись SBOM через Sigstore]] — практика: attestation + verify с привязкой к identity.
- [[П16. GitLab CI security gate]] — где проверка подписи становится обязательным шагом gate.
- Смежные карточки: [[04 Инструменты/in-toto|in-toto]] (формат attestation, который выпускает Cosign), [[04 Инструменты/Witness|Witness]] (альтернативный путь сбора и подписи evidence), [[04 Инструменты/SLSA|SLSA]] (уровень provenance, который подпись помогает закрыть), [[04 Инструменты/CycloneDX|CycloneDX]] (подписываемый формат SBOM).
