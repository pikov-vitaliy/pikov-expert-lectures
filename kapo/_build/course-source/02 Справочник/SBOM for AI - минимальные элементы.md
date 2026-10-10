---
title: "SBOM for AI - минимальные элементы"
type: "handbook"
tags: [ai, sbom, справочник]
updated: 2026-06-17
---

# SBOM for AI: минимальные элементы

## Зачем это в курсе
Блок SBOM for AI важен как расширение классической темы SBOM/ППК. AI-система остается программной системой, поэтому обычный SBOM не исчезает: компоненты runtime, библиотеки, контейнеры, API, инфраструктура и зависимости по-прежнему должны быть учтены. Но для AI этого мало: модель, датасеты, обучение, lineage, метрики и AI-specific controls становятся частью состава поставки.

## Семь кластеров G7
| Кластер | Минимальный смысл для SCA/OSA |
|---|---|
| Metadata | Кто создал SBOM, версия SBOM, формат и версия формата, подпись автора, инструмент, версия инструмента, timestamp, контекст генерации и dependency relationship |
| System Level Properties | Имя, producer, version, timestamp, системные компоненты, data flow, data usage, input/output properties, область применения |
| Models | Имя модели, identifier, version, producer, hash, hash algorithm, properties, input/output, training properties, model license, external references |
| Datasets | Dataset name, description, content, identifier, hash, provenance, statistical properties, sensitivity, dependency relationship, dataset license |
| Infrastructure | Runtime, frameworks, package managers, firmware, hardware/HBOM-ссылки и специализированная AI-инфраструктура |
| Security Properties | General и AI-specific controls, compliance, policy information, vulnerability referencing |
| KPI | Security metrics и operational performance KPIs: robustness, incident resolution time, latency, throughput, uptime |

## Что добавить к обычному SBOM
- Для модели: producer, version, hash weights/model artifact, architecture/properties, known limitations, lineage, external references, license и признак open weight/open architecture/open data/open training.
- Для датасетов: origin, collection methods, preprocessing/curation/labelling, synthetic-data method, sensitivity, copyright или иная лицензионная природа.
- Для системы: data flow между компонентами, external services, multi-agent communication, API endpoints, input/output modalities и intended application area.
- Для безопасности: prompt injection controls, input/output filters, anomaly detection, access control, differential privacy, vulnerability reference repository.

## Практический вывод
SBOM for AI нельзя использовать как отдельный красивый паспорт. Он должен подключаться к тем же контурам, что и обычный SBOM: vulnerability management, license workflow, controlled repository, attestation, release readiness и incident response.

## Связанные материалы
[[01 Курс/М16 SBOM for AI и честный SBOM контейнерных образов/00 Карта модуля]] · [[08 Шаблоны/Чек-лист SBOM for AI]] · [[05 Нормативка/G7 SBOM for AI Minimum Elements 2026]] · [[05 Нормативка/SLSA|SLSA]] · [[05 Нормативка/in-toto|in-toto]]
