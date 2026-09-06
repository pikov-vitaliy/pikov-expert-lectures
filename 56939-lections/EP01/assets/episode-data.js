window.EP01_DATA = {
  "title": "Where Secure Development Begins",
  "subtitle": "History, GOST and a working process",
  "author": "Vitaliy Pikov",
  "date": "2026-09-06",
  "cover": "assets/ep01-cover.png",
  "sources": [
    {
      "id": "G24",
      "title": "GOST R 56939-2024 · clauses 4 and 5.1",
      "url": "https://protect.gost.ru/gost/details/f3818925-a96f-4f55-96e9-46b44720ee64",
      "note": "Requirements checked against the local final-edition DOCX/PDF; official record verifies edition dates. English clause wording is a working translation."
    },
    {
      "id": "G16",
      "title": "Rosstandart · GOST R 56939-2016 record",
      "url": "https://protect.gost.ru/gost/details/286a588e-4a6a-4899-88f7-3c370dea1e1d",
      "note": "Approved 2016-06-01; effective 2017-06-01; replaced by the 2024 edition."
    },
    {
      "id": "WARE",
      "title": "RAND · Security Controls for Computer Systems",
      "url": "https://www.rand.org/pubs/reports/R609-1.html",
      "note": "Original February 1970 report; the catalogue page describes the 1979 reissue."
    },
    {
      "id": "SS75",
      "title": "Saltzer and Schroeder · The Protection of Information in Computer Systems",
      "url": "https://web.mit.edu/saltzer/www/publications/protection/index.html",
      "note": "Proceedings of the IEEE, September 1975. Selected principles, not a complete account of security history."
    },
    {
      "id": "MSH",
      "title": "Microsoft · History of the SDL",
      "url": "https://www.microsoft.com/en-us/securityengineering/sdl/about",
      "note": "Trustworthy Computing: January 2002; SDL integral to development: 2004."
    },
    {
      "id": "RH",
      "title": "Rosstandart regional centre · Historical milestones",
      "url": "https://csm.omsk.ru/about/90-years/rosstandart-istor-vehi/16107/",
      "note": "Institutional history: standardization committee established 15 September 1925."
    },
    {
      "id": "N11",
      "title": "NIST SP 800-218 · SSDF 1.1 · Final",
      "url": "https://csrc.nist.gov/pubs/sp/800/218/final",
      "note": "Final baseline, 3 February 2022; the narrow example uses Table 1, task PO.2.1."
    },
    {
      "id": "N12",
      "title": "NIST SP 800-218 Rev. 1 · SSDF 1.2 · Draft",
      "url": "https://csrc.nist.gov/pubs/sp/800/218/r1/ipd",
      "note": "Initial public draft, 17 December 2025. Status checked 6 September 2026; recheck before recording."
    },
    {
      "id": "SAMM",
      "title": "OWASP SAMM · Strategy and Metrics · Stream A",
      "url": "https://owaspsamm.org/model/governance/strategy-and-metrics/stream-a/",
      "note": "Maturity model; activity G-SM-A-2 is the roadmap/strategy comparison. Living website, checked 6 September 2026."
    },
    {
      "id": "MLR",
      "title": "Kudriavtseva and Gadyatskaya · A Multivocal Literature Review",
      "url": "https://arxiv.org/html/2211.16987v2",
      "note": "The user-provided 27-page PDF was read in full: arXiv v2, 4 July 2023, marked In submission. Table II p.5: selected publication dates; pp.6–9, 10–16, 16–23: practices, operating models and evidence limitations. Figure 2 and Table II contain date discrepancies; our timeline labels its dates explicitly."
    },
    {
      "id": "SAMM20",
      "title": "OWASP SAMM · Version 2 public release",
      "url": "https://owaspsamm.org/blog/samm2-release/",
      "note": "Official announcement, 31 January 2020; a version-release date, not the first appearance of all SAMM ideas."
    },
    {
      "id": "GOSTH",
      "title": "Vitaliy Varenitsa · Retrospective on GOST R 56939",
      "url": "#history-source-note",
      "note": "User-provided local PDF, 26 pages, title: История создания и актуальное состояние РБПО в России. ГОСТ Р 56939-2016/24. PDF export 2 July 2025. Pages 2–4: context and drafting history; pp.3/22: international connections. Formal approval dates and current requirements are checked against Rosstandart and the final standard. Exact local path and corrections: EP01-history-research.md."
    },
    {
      "id": "EX",
      "title": "Illustrative teaching example · Vitaliy Pikov",
      "url": "#example-note",
      "note": "Fictional importer, roles, hours, dates, review cadence and tasks. Not a client case, GOST-prescribed schedule, or conformity claim."
    }
  ],
  "slides": [
    {
      "id": 1,
      "title": "Where secure development begins",
      "seconds": 60,
      "section": "Welcome",
      "kicker": "EP01 / 01",
      "layout": "cover",
      "lead": "History, GOST and a working process",
      "items": [
        {
          "label": "EP01 / 25",
          "text": "Planning secure software development processes"
        }
      ],
      "quote": "",
      "notes": "Hello, and welcome. I am Vitaliy Pikov. I work with secure software development processes, and I teach the engineering ideas behind them.\n\nThis is the first episode of Secure Software Development in Practice. We will explore twenty-five processes from a Russian national standard, GOST R 56939-2024, and compare them with international approaches.\n\nOur question is simple: what can a development team actually use?\n\nToday, we will look at the history behind the subject, learn how to read this standard, and build a small example of a security process plan. You do not need previous knowledge of Russian standards. Bring your experience of building software, reviewing it, or helping a team deliver it safely.",
      "sourceIds": [
        "G24"
      ]
    },
    {
      "id": 2,
      "title": "One process. One useful result.",
      "seconds": 90,
      "section": "The series",
      "kicker": "EP01 / 02",
      "layout": "cards",
      "lead": "A practical question for every episode",
      "items": [
        {
          "label": "Understand",
          "text": "What problem does the process address?"
        },
        {
          "label": "Compare",
          "text": "Where do international practices overlap or differ?"
        },
        {
          "label": "Apply",
          "text": "What can a team do and verify?"
        }
      ],
      "quote": "",
      "notes": "This series builds on an earlier Russian-language webinar project that I delivered with PVS-Studio. For this English series, I want to extend that work through a systematic comparison with international practices.\n\nEach episode will focus on one process. We will ask three questions. What problem does it address? How do other approaches address a similar problem? And what evidence would show that a team has put the process into practice?\n\nThe audience includes developers, AppSec practitioners, and technical leaders. You may write code, design a delivery pipeline, or decide where the team should invest its limited time. Each of those perspectives matters.\n\nI am also using this project to develop my professional English and deepen my own research. I will explain unfamiliar terms, identify the sources, and make corrections visible when they are needed.\n\nBy the end of an episode, you should have something useful to discuss with your team: a small checklist, a decision record, or an example you can adapt to your own environment.",
      "sourceIds": [
        "G24"
      ]
    },
    {
      "id": 3,
      "title": "Twenty-five processes, connected",
      "seconds": 90,
      "section": "The series",
      "kicker": "EP01 / 03",
      "layout": "steps",
      "lead": "EP01 ↔ clause 5.1 · EP25 ↔ clause 5.25",
      "items": [
        {
          "label": "Organize",
          "text": "Plan the work, develop skills and assign responsibility"
        },
        {
          "label": "Engineer",
          "text": "Address threats, design, code, dependencies and builds"
        },
        {
          "label": "Verify",
          "text": "Review, analyze and test"
        },
        {
          "label": "Sustain",
          "text": "Deliver updates, handle weaknesses and improve"
        }
      ],
      "quote": "",
      "notes": "The standard gives us the structure of the series: twenty-five processes, and twenty-five core episodes. Episode one follows section five point one. Episode twenty-five follows section five point twenty-five.\n\nThe four groups on this slide are my teaching guide. They are not additional categories defined by the standard. They help us see how planning, engineering, verification, and continued support connect.\n\nFor example, a static analysis result is useful only when we know what code was analyzed, who reviews the findings, and how a correction reaches a release. A dependency inventory is useful only when somebody maintains it and acts on relevant changes.\n\nWe will keep returning to those connections. Some episodes will include a guest who can explain a specific practice from direct experience. Every core episode will still have its own practical result.\n\nYou can follow the complete series or choose an episode that matches a current problem. Today establishes the vocabulary and a planning example that later episodes can extend.",
      "sourceIds": [
        "G24"
      ]
    },
    {
      "id": 4,
      "title": "Friday's release is blocked",
      "seconds": 90,
      "section": "The engineering problem",
      "kicker": "EP01 / 04",
      "layout": "cards",
      "lead": "Illustrative case · a C++ engineering-file importer",
      "items": [
        {
          "label": "A warning",
          "text": "A parser issue appears just before release"
        },
        {
          "label": "A gap",
          "text": "Nobody agreed who investigates it"
        },
        {
          "label": "A decision",
          "text": "The release owner lacks reliable evidence"
        }
      ],
      "quote": "",
      "notes": "Let us begin with a small fictional team. It develops a C++ tool that imports engineering files. The product also has a small service API, uses third-party components, and ships regular updates.\n\nOn Friday afternoon, an analysis tool reports a possible memory error in the file parser. The developer says the finding needs investigation. The security specialist asks whether the affected parser is part of the release. The release owner asks whether there is time to fix it.\n\nThe tool has produced information, but the team has not agreed how to use it. There is no clear scope, no allocated investigation time, and no recorded decision process.\n\nWe cannot solve that entire situation by buying another tool. We need people who understand their responsibilities, suitable tools, and a repeatable way of working. We also need evidence that connects those elements to the actual product version.\n\nKeep this team in mind. At the end of the episode, we will return to Friday's release with a more useful set of questions.",
      "sourceIds": [
        "EX"
      ]
    },
    {
      "id": 5,
      "title": "A landscape of secure development methods",
      "seconds": 90,
      "section": "The methodology landscape",
      "kicker": "EP01 / 05",
      "layout": "timeline",
      "lead": "Selected publication / edition dates in a 28-methodology review",
      "items": [
        {
          "label": "2004",
          "text": "Lifecycle research · Jones and Rastogi"
        },
        {
          "label": "2006",
          "text": "SDL · Touchpoints · CLASP"
        },
        {
          "label": "2012",
          "text": "Microsoft SDL guidance v5.2 / SDL-Agile"
        },
        {
          "label": "2020",
          "text": "OWASP SAMM v2.0"
        },
        {
          "label": "2022",
          "text": "NIST SSDF v1.1"
        }
      ],
      "quote": "",
      "notes": "The history of secure development contains several parallel approaches. A useful map is the twenty twenty-three review by Arina Kudriavtseva and Olga Gadyatskaya. It examines twenty-eight methodologies through publications from two thousand four to twenty twenty-two, drawn from industry, government, and academia.\n\nThis slide selects five publication milestones. Early lifecycle research is followed by the SDL, Touchpoints, and CLASP publications. Later examples include guidance for agile development, version two of OWASP SAMM, and NIST's SSDF version one point one.\n\nThese are dates of the publications or editions we are discussing. They are not all dates when the underlying ideas first appeared. Microsoft, for example, made SDL integral to its development process in two thousand four; the SDL book discussed in the review appeared in two thousand six.\n\nThe picture is a landscape of different ways to organize secure development. We should examine what each approach contributes, rather than assume that the newest publication replaces every earlier idea.",
      "sourceIds": [
        "MLR",
        "MSH",
        "SAMM20",
        "N11"
      ]
    },
    {
      "id": 6,
      "title": "Different ways to organize the work",
      "seconds": 90,
      "section": "The methodology landscape",
      "kicker": "EP01 / 06",
      "layout": "cards",
      "lead": "What the reviewed approaches emphasize",
      "items": [
        {
          "label": "Microsoft SDL",
          "text": "A coordinated engineering programme"
        },
        {
          "label": "Touchpoints",
          "text": "Risk management, architecture and code review"
        },
        {
          "label": "CLASP",
          "text": "Activities connected to roles"
        },
        {
          "label": "SDL-Agile",
          "text": "One-time · every-sprint · bucket activities"
        }
      ],
      "quote": "",
      "notes": "The review helps us look beyond names. Different approaches give a team different ways to organize its security work.\n\nMicrosoft SDL connects engineering practices with management support and training. Gary McGraw's Touchpoints emphasizes risk management, including architecture analysis and code review. CLASP connects activities to roles. The agile SDL guidance distinguishes activities performed once, in every sprint, or periodically from a group of activities called a bucket.\n\nThat last distinction is practical. A team needs a reasoned schedule for security work; repeating every activity in every sprint is not automatically the best design.\n\nThe review also discusses maturity approaches. SAMM helps structure capability improvement, while BSIMM describes practices observed in organizations. Those purposes differ from giving a developer the next implementation task.\n\nFor our importer team, the shared questions are recognizable: which activity do we need, who performs it, and when? The approaches provide useful answers at different levels. Their activities still need to be interpreted in the context of the actual product and team.",
      "sourceIds": [
        "MLR"
      ]
    },
    {
      "id": 7,
      "title": "How GOST R 56939 was developed",
      "seconds": 90,
      "section": "The creation of GOST R 56939",
      "kicker": "EP01 / 07",
      "layout": "timeline",
      "lead": "Development history from Varenitsa's retrospective · formal dates from Rosstandart",
      "items": [
        {
          "label": "2013",
          "text": "April: drafting begins · August: first draft"
        },
        {
          "label": "2014–2015",
          "text": "Final draft, then a revised final draft"
        },
        {
          "label": "2016",
          "text": "Approved on 1 June · order 458-st"
        },
        {
          "label": "2017",
          "text": "Effective from 1 June"
        }
      ],
      "quote": "",
      "notes": "Let us now examine the history of this particular Russian standard. GOST R identifies a Russian national standard, followed by its number and edition year.\n\nIn a retrospective presentation, Vitaliy Varenitsa describes the original problem. Vulnerability analysis and product assessment were already developing in Russia, but dedicated requirements for the development process were missing in that context. The proposed response was to make the process itself a subject of requirements and evidence.\n\nAccording to his account, drafting began in April twenty thirteen, and the first draft followed in August. Further drafts appeared in twenty fourteen and twenty fifteen. Public discussion involved twenty-two organizations and around two hundred comments and proposals.\n\nFor the formal dates, we use Rosstandart's official record: approval on the first of June twenty sixteen, and entry into force on the first of June twenty seventeen.\n\nThis is a history of drafting, discussion, and refinement. It is more informative for our series than treating a standard as a document that simply appeared in its final form.",
      "sourceIds": [
        "GOSTH",
        "G16"
      ]
    },
    {
      "id": 8,
      "title": "International connections and the 2024 revision",
      "seconds": 90,
      "section": "The creation of GOST R 56939",
      "kicker": "EP01 / 08",
      "layout": "cards",
      "lead": "Historical design context and the final text serve different purposes",
      "items": [
        {
          "label": "Historical connections",
          "text": "Common Criteria · ISO/IEC 27001 · lifecycle processes"
        },
        {
          "label": "2024 revision",
          "text": "Approved 24 October · effective 20 December"
        },
        {
          "label": "25 processes",
          "text": "Process name → goals → requirements → artifacts"
        },
        {
          "label": "Source discipline",
          "text": "Retrospective for history · final edition for requirements"
        }
      ],
      "quote": "",
      "notes": "The same retrospective connects the standard with international ideas: Common Criteria, information security management, and software lifecycle processes. It also emphasizes introducing security procedures early in development.\n\nThese connections support the research question behind this series. They do not establish a direct copy of Microsoft SDL, or make all of those documents normative references in the current edition.\n\nThe twenty twenty-four revision replaced the twenty sixteen edition. It was approved on the twenty-fourth of October and took effect on the twentieth of December. The official record identifies several organizations involved in its development.\n\nFor this series, we follow its twenty-five processes. The final text gives each process a name, goals, requirements, and implementation artifacts. It does not tie those processes to one particular lifecycle model.\n\nSome pages of the archived presentation still show draft material. We therefore use the retrospective to explain history and the final standard to state requirements. That distinction keeps the history useful while preventing an old proposal from becoming a current obligation in our explanation.",
      "sourceIds": [
        "GOSTH",
        "G24"
      ]
    },
    {
      "id": 9,
      "title": "Shared practices need evidence",
      "seconds": 90,
      "section": "Our comparison method",
      "kicker": "EP01 / 09",
      "layout": "compare",
      "lead": "Findings and limits of the multivocal literature review",
      "items": [
        {
          "label": "Shared practices",
          "text": "Similar engineering work, organized in different ways"
        },
        {
          "label": "Organizational work",
          "text": "Risk, culture, people, policy and communication matter"
        },
        {
          "label": "Effectiveness evidence",
          "text": "Limited and uneven validation of complete methodologies"
        }
      ],
      "quote": "",
      "notes": "What does the literature review allow us to conclude? The authors identify substantial overlap in practices, together with important organizational concerns. They discuss risk management, culture, human behavior, policies, and communication, among other topics.\n\nTheir synthesis distinguishes work at the organization level, work that crosses the lifecycle, and activities associated with a project stage. That helps explain why a security programme involves more than a list of tools.\n\nEvidence about the effectiveness of complete methodologies is much less consistent. We should not turn that limitation into a claim that secure development does not work. It means we need to examine the evaluation method, the context, and the result being measured.\n\nThe review also selected accessible English-language material. Its omission of GOST cannot establish that the Russian standard is unique.\n\nWe will therefore compare specific practices and their evidence, using identified versions. Our NIST baseline is final SSDF one point one; version one point two remains a draft at our September twenty twenty-six check. Let us make the comparison method explicit.",
      "sourceIds": [
        "MLR",
        "N11",
        "N12"
      ]
    },
    {
      "id": 10,
      "title": "Compare obligations, not labels",
      "seconds": 90,
      "section": "Our comparison method",
      "kicker": "EP01 / 10",
      "layout": "steps",
      "lead": "Similar goals can still imply different work",
      "items": [
        {
          "label": "Read",
          "text": "Actor · action · scope · conditions"
        },
        {
          "label": "Compare",
          "text": "Shared intent and concrete differences"
        },
        {
          "label": "Demonstrate",
          "text": "One implementation example with evidence"
        },
        {
          "label": "Conclude",
          "text": "Partial overlap is a useful result"
        }
      ],
      "quote": "",
      "notes": "Here is the method we will use. First, we identify a specific requirement or practice. We record who acts, what they do, the scope, and any conditions. Then we compare the actual work and the expected result.\n\nWe also preserve the strength of the original wording. In this GOST, both the Russian words dolzhen and sleduyet express a required condition. Translating every occurrence of sleduyet as an optional English should would lose that meaning.\n\nOn the international side, we identify whether we are reading framework guidance, a requirement, or an example of implementation. Similar wording does not automatically give two documents the same authority.\n\nOur conclusion may be substantial overlap, partial overlap, or a complementary practice. If we have not found a counterpart, we will state which sources we reviewed.\n\nThis lets us investigate the series' central question without deciding the answer in advance. A useful comparison can reveal shared engineering ideas and still show important differences in scope, detail, and expected evidence.",
      "sourceIds": [
        "G24",
        "N11"
      ]
    },
    {
      "id": 11,
      "title": "What process 5.1 asks for",
      "seconds": 90,
      "section": "Planning secure development",
      "kicker": "EP01 / 11",
      "layout": "steps",
      "lead": "Five obligations that connect the present to the next action",
      "items": [
        {
          "label": "5.1.2.1",
          "text": "Periodically analyze the current state"
        },
        {
          "label": "5.1.2.2",
          "text": "Periodically analyze resource needs"
        },
        {
          "label": "5.1.2.3",
          "text": "Develop a process improvement plan"
        },
        {
          "label": "5.1.2.4",
          "text": "Develop a process implementation plan"
        },
        {
          "label": "5.1.2.5",
          "text": "Define the scope of the processes"
        }
      ],
      "quote": "",
      "notes": "We can now read the first process directly. Section five point one concerns planning secure software development processes.\n\nIt contains five requirements. Periodically analyze the current state of the processes. Periodically analyze resource needs. Develop a plan for improving the processes. Develop a plan for implementing them. And define their scope.\n\nThe two plans must take the analyses into account. That connection matters. A plan that ignores the team's current practices or available resources may be attractive on paper and impossible to execute.\n\nI use process improvement plan as a working English label for the plan of process development. We will distinguish it from the implementation plan in a moment.\n\nFor our small team, the first action is to describe what already happens and what does not. We then identify the most significant gaps, estimate the capacity needed to address them, and assign realistic work.\n\nThe standard requires periodic analysis, but it does not give us a universal ninety-day schedule. The schedule later in this episode is an illustrative choice for our example.",
      "sourceIds": [
        "G24"
      ]
    },
    {
      "id": 12,
      "title": "Start with a defensible scope",
      "seconds": 90,
      "section": "Planning secure development",
      "kicker": "EP01 / 12",
      "layout": "table",
      "lead": "Name the software and explain the boundary",
      "items": [
        {
          "label": "Included",
          "text": "Importer 2.0 · parser module · service API · shipped libraries"
        },
        {
          "label": "Connected context",
          "text": "Repository, CI configuration and release workflow"
        },
        {
          "label": "Boundary to justify",
          "text": "Retired prototype with no code or dependency path into release"
        },
        {
          "label": "Evidence",
          "text": "Versioned scope record with the selection rationale"
        }
      ],
      "quote": "",
      "notes": "What exactly does the plan cover? In our example, the scope includes version two point zero of the importer, its parser module, the small service API, and the libraries that ship with it.\n\nThe repository, integration configuration, and release workflow form relevant development context. We record their links so that the plan can be connected to actual work.\n\nSuppose the team also has an old prototype. It may be outside the selected scope, but the team needs a reason. If code or a dependency from that prototype is included in the release, the boundary needs another look.\n\nThe standard's scope artifact includes the software composition and a justification for the selection. Naming a product without identifying its relevant parts leaves room for misunderstanding.\n\nThis is not permission to declare inconvenient components irrelevant. The rationale must make sense for the product and its applicable obligations. For a teaching example, we can keep the scope small. For a real implementation, the team needs to examine the actual relationships and maintain the boundary as the product changes.",
      "sourceIds": [
        "G24",
        "EX"
      ]
    },
    {
      "id": 13,
      "title": "Assess reality and assign owners",
      "seconds": 90,
      "section": "Planning secure development",
      "kicker": "EP01 / 13",
      "layout": "cards",
      "lead": "Illustrative findings, with people who can act",
      "items": [
        {
          "label": "Engineering lead",
          "text": "Parser checks run manually; coverage is unclear"
        },
        {
          "label": "AppSec lead",
          "text": "Review findings and agree investigation criteria"
        },
        {
          "label": "Release owner",
          "text": "Record release decisions under the team's policy"
        },
        {
          "label": "Sponsor",
          "text": "Resolve capacity and priority conflicts"
        }
      ],
      "quote": "",
      "notes": "The current-state record lists implemented and unimplemented processes. It assesses the sufficiency and conformity of existing processes against this standard, other applicable standards, and the team's tools and technologies.\n\nFor the example, we record that parser checks run manually, coverage is unclear, and the decision history is incomplete. These are illustrative findings, not observations about a real organization.\n\nWe then assign responsibilities. The engineering lead owns the integration work. The AppSec lead helps define the investigation criteria and review the security evidence. The release owner records the release decision under the team's agreed policy. A sponsor resolves conflicts over capacity and priorities.\n\nOne person may hold several roles in a small team. What matters is that the responsibility and the decision authority are understandable.\n\nThis role arrangement is our implementation example. The standard's implementation-plan artifact calls for responsible employees, but it does not automatically give an AppSec specialist an independent power to block every release. That authority needs to be defined in the organization's own arrangements.",
      "sourceIds": [
        "G24",
        "EX"
      ]
    },
    {
      "id": 14,
      "title": "Resources include human attention",
      "seconds": 90,
      "section": "Planning secure development",
      "kicker": "EP01 / 14",
      "layout": "cards",
      "lead": "Illustrative 90-day estimate · validate it with the team",
      "items": [
        {
          "label": "Engineering",
          "text": "60 person-hours"
        },
        {
          "label": "AppSec",
          "text": "24 person-hours"
        },
        {
          "label": "Release and sponsor",
          "text": "12 person-hours"
        },
        {
          "label": "Total",
          "text": "96 person-hours · tools and infrastructure assessed separately"
        }
      ],
      "quote": "",
      "notes": "Resource planning includes more than the price of a tool. It also includes time to configure checks, investigate findings, maintain the workflow, and teach people how to use it.\n\nHere is a deliberately small estimate for our fictional ninety-day improvement effort. We reserve sixty engineering hours, twenty-four AppSec hours, and twelve hours for release coordination and sponsor decisions. The total is ninety-six person-hours.\n\nThese figures are an example, not a benchmark and not a percentage required by GOST. Tool costs, infrastructure capacity, and any additional training costs need their own assessment.\n\nWe should also identify dependencies. If the engineer who maintains the build system is unavailable during the first month, the schedule needs to reflect that fact. Assigning a task does not create capacity.\n\nThe resource-analysis artifact in the standard may contain estimated material and human resource indicators. Our numeric table is one way to make the discussion concrete. The useful test is whether the people responsible for the work agree that the estimate is credible and know what to do when it proves wrong.",
      "sourceIds": [
        "G24",
        "EX"
      ]
    },
    {
      "id": 15,
      "title": "Two plans, two questions",
      "seconds": 90,
      "section": "Planning secure development",
      "kicker": "EP01 / 15",
      "layout": "compare",
      "lead": "A roadmap and an execution plan can be linked in one tracker",
      "items": [
        {
          "label": "Improvement plan",
          "text": "What capability changes, in what order, with which resources?"
        },
        {
          "label": "Implementation plan",
          "text": "What work happens, by whom, at which stage, and by when?"
        },
        {
          "label": "Shared foundation",
          "text": "Current-state analysis and resource analysis"
        }
      ],
      "quote": "",
      "notes": "The two plans answer related but different questions. The improvement plan describes how the processes will develop. It establishes priorities and the sequence of changes, taking resources into account.\n\nFor our team, that might mean making parser analysis repeatable first, then improving the handling of findings, and then reviewing whether the process is effective.\n\nThe implementation plan turns those priorities into work. It identifies goals, stages, dates, resources, and responsible people. A task could specify the parser target, the integration milestone, the owner, and the evidence required for review.\n\nThese plans do not have to be disconnected documents. The standard explicitly allows them to be represented in a task management system. A roadmap with linked tasks can preserve the distinction between improving a capability and executing the work.\n\nThe important connection is traceability: why this change was selected, which resource assumption supports it, who performs it, and what will show that the planned stage is complete. If those links are missing, two beautifully formatted files will not solve the planning problem.",
      "sourceIds": [
        "G24",
        "EX"
      ]
    },
    {
      "id": 16,
      "title": "A 90-day plan for the importer",
      "seconds": 120,
      "section": "Worked example",
      "kicker": "EP01 / 16",
      "layout": "timeline",
      "lead": "Illustrative implementation choices, not a GOST timetable",
      "items": [
        {
          "label": "Days 1–30",
          "text": "Confirm scope and baseline · assign owners · agree capacity"
        },
        {
          "label": "Days 31–60",
          "text": "Connect parser checks to CI · record coverage and triage decisions"
        },
        {
          "label": "Days 61–90",
          "text": "Review two release cycles · correct gaps · update the next plan"
        }
      ],
      "quote": "",
      "notes": "Let us put those elements together in a ninety-day example. The product is the engineering-file importer. Our immediate objective is to make the treatment of parser analysis findings repeatable and reviewable.\n\nDuring days one to thirty, the team confirms the software scope, records the current state, and reviews the resource estimate. It identifies the owner of each planned action and the person responsible for the release decision. The result is a small baseline that everybody can inspect.\n\nDuring days thirty-one to sixty, the engineer connects the chosen parser checks to continuous integration. The team records which source targets and configurations are covered. Findings receive a review record, and the release workflow links to that record.\n\nDuring days sixty-one to ninety, the team reviews evidence from two illustrative release cycles. It asks whether the checks ran on the intended versions, whether findings received decisions, and whether the allocated capacity was sufficient. The answers inform the next improvement plan.\n\nThe ninety-day period, two releases, and detailed tasks are our choices. They do not come from the standard. Also, completing this example does not establish conformity with every process in the document.\n\nFor implementation of this GOST, section four point thirteen requires version control, continuous integration, and task management, including defect tracking, in the development environment. It does not say continuous deployment. That distinction is useful when we explain our pipeline choices.",
      "sourceIds": [
        "G24",
        "EX"
      ]
    },
    {
      "id": 17,
      "title": "Five linked records of evidence",
      "seconds": 90,
      "section": "Worked example",
      "kicker": "EP01 / 17",
      "layout": "steps",
      "lead": "A one-page summary points to the underlying records",
      "items": [
        {
          "label": "5.1.3.1",
          "text": "Current-state analysis"
        },
        {
          "label": "5.1.3.2",
          "text": "Resource analysis"
        },
        {
          "label": "5.1.3.3",
          "text": "Process improvement plan"
        },
        {
          "label": "5.1.3.4",
          "text": "Process implementation plan"
        },
        {
          "label": "5.1.3.5",
          "text": "Scope and selection rationale"
        }
      ],
      "quote": "",
      "notes": "The standard identifies five corresponding kinds of implementation evidence for this process. We need the current-state analysis, resource analysis, improvement plan, implementation plan, and scope with its selection rationale.\n\nThese are five kinds of information. We should not automatically turn them into five isolated documents. A concise planning page can link to records in a repository or task management system.\n\nFor example, the scope record identifies the importer version and components. The baseline links to the checks that actually ran. The resource record captures the estimate and its assumptions. The improvement plan explains the priorities. The implementation tasks identify owners and milestones.\n\nThe standard recognizes evidence in forms such as electronic files, logs, and tool results. The format serves the information and its traceability.\n\nHowever, a one-page template is only an entry point. It does not replace the supporting analysis or prove that the process is effective. A reviewer should be able to follow the links and understand what happened, which version it concerns, and which questions still remain open.",
      "sourceIds": [
        "G24",
        "EX"
      ]
    },
    {
      "id": 18,
      "title": "A first international crosswalk",
      "seconds": 90,
      "section": "Comparison result",
      "kicker": "EP01 / 18",
      "layout": "compare",
      "lead": "Useful connections · bounded conclusions",
      "items": [
        {
          "label": "People",
          "text": "GOST 5.1.3.4 ↔ NIST SSDF PO.2.1 · partial overlap"
        },
        {
          "label": "Improvement",
          "text": "GOST 5.1.2.3 ↔ SAMM Strategy & Metrics · partial overlap"
        },
        {
          "label": "Difference",
          "text": "GOST explicitly identifies five planning evidence categories"
        }
      ],
      "quote": "",
      "notes": "We can now make a small, bounded comparison. The implementation-plan artifact in GOST includes responsible employees. NIST SSDF task P O two point one addresses roles and responsibilities for secure software development. There is a useful shared concern: people need to know which work belongs to them.\n\nThe comparison is partial. The GOST artifact also includes goals, timing, stages, and resources. That single SSDF task does not by itself reproduce the complete artifact.\n\nFor process improvement, OWASP SAMM's Strategy and Metrics practice provides a useful connection through its emphasis on an improvement strategy and roadmap. Again, we need to examine the details and the purpose of the model before claiming equivalence.\n\nThese comparisons help us interpret the first process in a wider engineering context. They do not establish that following one document automatically satisfies the other.\n\nOur initial conclusion is modest: planning, responsibility, and improvement have recognizable international counterparts. The exact structure, wording, and evidence expectations still need to be examined requirement by requirement. The accompanying notes preserve those limits and the source versions.",
      "sourceIds": [
        "G24",
        "N11",
        "SAMM"
      ]
    },
    {
      "id": 19,
      "title": "Would this survive Friday's release?",
      "seconds": 90,
      "section": "Apply it",
      "kicker": "EP01 / 19",
      "layout": "cards",
      "lead": "A short review before calling the plan usable",
      "items": [
        {
          "label": "Scope",
          "text": "Which version and components are covered, and why?"
        },
        {
          "label": "Capacity",
          "text": "Who has time and authority to act?"
        },
        {
          "label": "Evidence",
          "text": "Can we trace an action to its result?"
        },
        {
          "label": "Review",
          "text": "When do we revisit the assumptions?"
        }
      ],
      "quote": "",
      "notes": "Return to the warning on Friday afternoon. A useful plan will not tell us automatically whether the finding is a real vulnerability. It will help the team organize the investigation and the decision.\n\nWe can identify the affected version and component. We can find the engineer responsible for the investigation and the person authorized to make the release decision. We can see what evidence exists and where a missing result needs attention.\n\nWe can also recognize weak planning. A scanner installation without a review owner is incomplete. A roadmap without capacity is unreliable. A scope statement without a rationale is difficult to defend. A plan that is never revisited will gradually stop describing reality.\n\nFor this team, I would review the plan after ninety days and after a material change, such as adding a parser. These triggers are implementation recommendations.\n\nThe practical test is whether another team member can use the plan to understand the next action. If only its author can explain it, the plan needs more work.",
      "sourceIds": [
        "EX",
        "G24"
      ]
    },
    {
      "id": 20,
      "title": "Security Training That Changes Engineering Decisions",
      "seconds": 90,
      "section": "Stay in touch · Next episode",
      "kicker": "EP01 / 20",
      "layout": "closing",
      "lead": "Next: EP02 · Employee training · GOST R 56939-2024, clause 5.2",
      "items": [
        {
          "label": "Roles & skills",
          "text": "What each person needs to learn"
        },
        {
          "label": "Practical learning",
          "text": "A short exercise before and after training"
        },
        {
          "label": "Evidence of progress",
          "text": "Look beyond attendance to demonstrated skills"
        }
      ],
      "quote": "",
      "notes": "Today, we explored the history of secure development, learned how to read the Russian standard, and used its first process to organize a practical improvement effort.\n\nYour next step is simple: choose one product and start your planning page. Describe the current state, identify the next improvement, and connect it to an owner, available capacity, and reviewable evidence. The accompanying worksheet will help you get started.\n\nI am Vitaliy Pikov. You can find me at pikov dot expert. Please keep in touch and share the questions you would like this series to explore.\n\nThe next episode is called Security Training That Changes Engineering Decisions. We will examine employee training under clause five point two: what different roles need to learn, how to practise those skills, and what evidence can show progress beyond attendance.\n\nWe will build a role and skills matrix and use a short exercise before and after training. Which engineering decision would you most like your security training to improve? Thank you for watching. See you in episode two.",
      "sourceIds": [
        "G24",
        "EX"
      ],
      "contact": {
        "name": "Vitaliy Pikov",
        "label": "pikov.expert",
        "url": "https://pikov.expert"
      }
    }
  ]
};
