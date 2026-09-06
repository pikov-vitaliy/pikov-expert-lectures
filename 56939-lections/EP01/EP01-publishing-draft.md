# EP01 — YouTube publishing draft

Prepared 2026-09-06. Draft text only: nothing has been uploaded or posted. Replace planned chapter times with the final edited recording times; add the actual public materials URL when one exists. Local filesystem paths must not be put in the public description.

## Title

Where Secure Development Begins: History, GOST & a Practical Plan | EP01

Series: **Secure Software Development in Practice**
Subtitle: **25 Processes from GOST R 56939 Compared with Global Practices**

## Description

What turns a security intention into work a software team can actually perform?

In this first episode, Vitaliy Pikov introduces a 25-part series exploring the processes of GOST R 56939-2024 and comparing them with international secure development practices.

We use a review of 28 secure-development methodologies to explore publication milestones, ways of organizing security work, and the limits of effectiveness evidence. The history of the Russian standard follows early conversations around 2009, research and drafting from 2013, approval in 2016 and entry into force in 2017. Vitaliy Varenitsa's account explains the early discussions and the authors' original intentions.

The expanded history separates the author's recollections from official records. It covers the original plan for a family of documents, the roles of developers and reviewers, international connections and the transition to the 2024 edition. We also examine why nine groups of measures cannot be compared arithmetically with 25 processes, and why requirement wording must be read in its specific edition.

The practical section builds an illustrative plan for a C++ engineering-file importer: current-state analysis, resources, process improvement, implementation planning, scope and evidence. We look for existing useful practices before proposing new tools, distinguish one-time checks from maintained processes, and connect planning records to work the team can review.

You will also see a bounded comparison with NIST SSDF 1.1 and OWASP SAMM. Similar engineering concerns do not automatically mean equivalent requirements.

The 90-day schedule and resource figures are teaching examples. English translations of GOST clauses are the author's working translations. Framework versions and links were checked on 6 September 2026; SSDF 1.2 was listed as a draft at that check.

Sources:

- [GOST R 56939-2024, official record](https://protect.gost.ru/gost/details/f3818925-a96f-4f55-96e9-46b44720ee64)
- [GOST R 56939-2016, official record](https://protect.gost.ru/gost/details/286a588e-4a6a-4899-88f7-3c370dea1e1d)
- [NIST SSDF public draft announcement, June 2019](https://csrc.nist.gov/News/2019/draft-white-paper-on-ssdf)
- [NIST SSDF 1.0 final announcement, April 2020](https://csrc.nist.gov/news/2020/mitigating-risk-of-software-vulns-ssdf)
- [NIST SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final)
- [OWASP SAMM: Strategy and Metrics](https://owaspsamm.org/model/governance/strategy-and-metrics/stream-a/)
- [Microsoft SDL history](https://www.microsoft.com/en-us/securityengineering/sdl/about)
- [RAND: Security Controls for Computer Systems](https://www.rand.org/pubs/reports/R609-1.html)
- [Saltzer and Schroeder](https://web.mit.edu/saltzer/www/publications/protection/index.html)
- [Secure Software Development Methodologies: A Multivocal Literature Review](https://arxiv.org/abs/2211.16987)
- [OWASP SAMM v2 release announcement](https://owaspsamm.org/blog/samm2-release/)

Historical source: Vitaliy Varenitsa, “История создания и актуальное состояние РБПО в России. ГОСТ Р 56939-2016/24”, presentation at the MASCOM / PVS-Studio webinar, 2 July 2025.

The series builds on an earlier Russian-language webinar project delivered with PVS-Studio. The companion Russian lecture covers the history of the standards and practical ways to organize secure development. The international comparison and worked example extend that teaching material.

Author: **Vitaliy Pikov — [pikov.expert](https://pikov.expert)**.

Next episode: **Security Training That Changes Engineering Decisions** — employee training under clause 5.2, role and skills mapping, practical exercises and evidence of progress.

## Planned chapters — update after editing

```text
00:00 Where secure development begins
01:00 The series and its practical promise
04:00 A release problem in a fictional C++ team
06:00 Methodology publications and different operating models
09:00 The problem behind the Russian standard
11:00 Research, drafts, approval and effective date
13:00 Authors, reviewers and intended users
14:30 The original plan for a family of standards
16:00 International connections and the SSDF timeline
18:00 Two editions: structure and requirement wording
19:30 From a tool run to a maintained process
21:00 Shared practices and effectiveness evidence
22:30 Our comparison method
24:00 The five planning requirements
30:00 Two plans, two questions
31:30 A 90-day planning example
35:00 The first international crosswalk
37:00 Applying the plan to the release decision
38:30 Stay in touch and the next episode
```

## Pinned comment draft

Which planning problem is hardest in your team: defining scope, assigning ownership, reserving capacity, or keeping the plan current? Share an example without confidential product or customer details.

## Final publication fields still to set

Public materials URL; actual recording/version-check date; final timestamps; selected subtitle track. These are publication inputs, not blockers for rehearsing the completed draft. No guest or release date is currently announced.
