# EP01 — A planning example for an engineering-file importer

**Illustrative teaching example.** The product, observations, roles, numbers and schedule below are fictional. This is a starting model for discussion, not a completed conformity assessment. Baseline: GOST R 56939-2024, 5.1.2 and 5.1.3; implementation choices are identified separately.

## 1. Scope and rationale — 5.1.3.5

Software: Importer 2.0, its C++ parser module, small service API and shipped third-party libraries. Include the relevant version and component identifiers in the real record. Rationale: these elements participate in processing externally supplied engineering files or distributing the product.

Connected development context: source repository, build definitions, CI configuration, issue tracker and release workflow. These links support traceability; they do not replace identifying the software composition.

Proposed exclusion: a retired prototype, only after confirming that its code, generated artifacts and dependencies do not flow into the selected release. Record the reason and supporting inspection. A convenient boundary is not automatically a justified boundary.

## 2. Current-state analysis — 5.1.3.1

| Illustrative observation | Evidence to collect in a real assessment | Planning consequence |
|---|---|---|
| Parser analysis is run manually | Recent reports, invocation/configuration and covered targets | Make the activity repeatable and version-linked |
| Finding ownership is unclear | Existing tickets and decision history | Assign investigation and decision responsibilities |
| Coverage is not documented | Build target list versus analyzed target list | Review gaps and record justified boundaries |
| Other secure development processes are not assessed in this exercise | A real inventory of implemented and unimplemented processes is required | Extend the assessment before claiming a complete 5.1.3.1 artifact |

The standard's current-state artifact concerns implemented and unimplemented processes and the sufficiency and conformity of those implemented. This teaching slice intentionally concentrates on one improvement; its four-row table is not a complete organizational assessment.

## 3. Resource analysis — 5.1.3.2

| Stage | Engineering hours | AppSec hours | Release/sponsor hours | Total |
|---|---:|---:|---:|---:|
| Days 1–30 | 12 | 8 | 4 | 24 |
| Days 31–60 | 36 | 8 | 4 | 48 |
| Days 61–90 | 12 | 8 | 4 | 24 |
| **Total** | **60** | **24** | **12** | **96** |

Units: person-hours across the full illustrative 90-day effort. These are estimates to validate with the people doing the work, not recorded effort or a industry benchmark. Tool licences, compute capacity, storage and additional training costs are assessed separately; they are not assumed to be free. Confirm build-engineer availability and the planned release cadence.

The artifact description permits estimated material and human resource indicators. It does not prescribe these figures or a universal percentage of development cost.

## 4. Process improvement plan — 5.1.3.3

Goal: move from ad hoc parser analysis to a repeatable, traceable process with understandable ownership.

Priority order: establish scope and baseline → integrate the selected checks → make findings reviewable → evaluate observed gaps and resource use. Reason: automation without a known target and an owner would preserve the original ambiguity.

Planned organizational change: define investigation ownership and release decision authority in the team's policy. Planned capability change: reliable integration of the selected parser checks. Training: use the allocated AppSec/engineering effort to explain triage records and coverage limitations; reassess if specialist training is needed. Procurement: decide from the resource assessment rather than assume a new product is necessary.

## 5. Implementation plan — 5.1.3.4

| Stage and objective | Owner | Resources | Evidence expected at review |
|---|---|---|---|
| Days 1–30: agreed baseline | Engineering lead with AppSec; sponsor confirms capacity | 24 hours | Versioned scope/rationale, current-state notes, resource assumptions, named owners |
| Days 31–60: repeatable checks and triage | Engineering lead; AppSec reviews criteria | 48 hours | CI run linked to commit, coverage record, finding/decision records, release-workflow links |
| Days 61–90: review actual execution | Release owner coordinates; engineering/AppSec review evidence | 24 hours | Evidence from two illustrative releases, gaps, actual versus estimated effort, updated improvement priorities |

The release owner acts under the team's approved policy. The role title alone does not confer residual-risk acceptance authority. If one person holds several roles, record that explicitly and assess the arrangement in context.

Review trigger chosen for this example: at day 90 and after a material scope or workflow change. If two releases do not occur, revise the evaluation plan; do not manufacture evidence or label the process effective without observation. Store dated versions of the analyses and plans.

## Review questions

Can a reviewer identify the affected product/version, why the next improvement was chosen, who performs the work, who makes the decision, what capacity is available, and where the underlying evidence is stored? Can they distinguish completed actions from future tasks and unassessed processes?

The one-page summary and linked records can live in a repository or task tracker. The standard explicitly allows task-management representations of the two plans. A particular tool, document count and 90-day timetable are not prescribed.

Source: local final GOST text, clauses 4.11–4.13 and 5.1; edition verified in the [official Rosstandart record](https://protect.gost.ru/gost/details/f3818925-a96f-4f55-96e9-46b44720ee64). Methodical details and international comparisons: [EP01-sources.md](EP01-sources.md).
