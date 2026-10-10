---
title: "SCA"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# SCA

## Термин
- English: Software Composition Analysis (SCA)
- Русский вариант: композиционный анализ программного обеспечения

## Определение
SCA — процесс выявления, анализа и управления open source и сторонними компонентами ПО, включая уязвимости, лицензии, зависимости и SBOM. Для secure C/C++ SCA должен учитывать сборку, линковку, бинарные артефакты и vendored code, а не только манифесты пакетных менеджеров.

## Источник
- [OWASP DevSecOps Guideline, Software Composition Analysis](https://owasp.org/www-project-devsecops-guideline/latest/02d-Software-Composition-Analysis)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[OSA]] · [[SCS]] · [[компонент]] · [[заимствование]]
