---
title: "dependency confusion"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# dependency confusion

## Термин
- English: dependency confusion
- Русский вариант: подмена зависимости через конфликт источников

## Определение
Dependency confusion — атака на цепочку поставки, при которой пакет с тем же именем публикуется во внешнем репозитории и ошибочно выбирается вместо внутреннего. Защита требует контролируемых репозиториев, namespace/pinning и запрета неявного выхода в публичные registry.

## Источник
- [OWASP Top 10 CI/CD Security Risks, Dependency Chain Abuse](https://owasp.org/www-project-top-10-ci-cd-security-risks/CICD-SEC-03-Dependency-Chain-Abuse)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[typosquatting]] · [[namesquatting]] · [[controlled repository]] · [[OSA Proxy]]
