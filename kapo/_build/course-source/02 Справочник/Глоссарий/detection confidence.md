---
title: "detection confidence"
type: "glossary"
tags: [глоссарий]
status: ready
updated: 2026-06-18
---

# detection confidence

## Термин
- English: detection confidence
- Русский вариант: уверенность обнаружения

## Определение
Detection confidence — оценка надежности finding: насколько данные сканера, идентификаторы, версии и evidence подтверждают, что компонент или уязвимость действительно присутствует. Низкая уверенность требует ручной проверки, нормализации PURL/CPE и анализа бинарного артефакта.

## Источник
- [NIST CSRC Glossary, evidence](https://csrc.nist.gov/glossary/term/evidence)

## Как проверять понимание
Слушатель должен уметь объяснить термин на примере реального компонента или артефакта: где он появляется в SBOM/ППК или SCA/OSA-процессе, какой риск возникает при ошибке, какие данные подтверждают вывод и какой контроль нужен в CI/CD, регламенте или отчете.

## Связанные темы
[[SCA]] · [[SBOM]] · [[ППК]] · [[policy gate]] · [[evidence]] · [[false positive]] · [[false negative]] · [[matchability]] · [[binary analysis]]
