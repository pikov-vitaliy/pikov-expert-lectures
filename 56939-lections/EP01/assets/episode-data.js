window.EP01_DATA = {
  "title": "Where Secure Development Begins",
  "subtitle": "History, GOST and a working process",
  "author": "Vitaliy Pikov",
  "date": "2026-09-06",
  "cover": "assets/ep01-cover.png",
  "sources": [
    {
      "id": "G24",
      "title": "GOST R 56939-2024 · final edition",
      "url": "https://protect.gost.ru/gost/details/f3818925-a96f-4f55-96e9-46b44720ee64",
      "note": "Foreword and structure; clause 4.7 on normative wording; clause 5.1 on planning and its implementation evidence. English clause wording is an author translation."
    },
    {
      "id": "G16",
      "title": "GOST R 56939-2016 · final edition",
      "url": "https://protect.gost.ru/gost/details/286a588e-4a6a-4899-88f7-3c370dea1e1d",
      "note": "Developed by NPO Echelon and submitted by TC 362. Nine groups of measures in 5.1–5.9; clause 4.2 defines recommendation wording. Approved 1 June 2016; effective 1 June 2017; replaced by the 2024 edition."
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
      "note": "arXiv v2, 4 July 2023, preprint marked In submission. A review of 28 methodologies. Table II lists publication dates; the analysis covers engineering practices, operating models and limits of effectiveness evidence. Publication dates and the origins of ideas are distinct milestones."
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
      "note": "History and current state of secure software development in Russia. GOST R 56939-2016/24. Title translated from Russian. Presentation, 2 July 2025. Pages 2–4 cover the context and drafting history; pages 3 and 22 cover international connections. Recollections describe the authors' intentions; adopted requirements are defined by the final standards."
    },
    {
      "id": "EX",
      "title": "Illustrative teaching example · Vitaliy Pikov",
      "url": "#example-note",
      "note": "Fictional importer, roles, hours, dates, review cadence and tasks. Not a client case, GOST-prescribed schedule, or conformity claim."
    },
    {
      "id": "TRANS",
      "title": "Vitaliy Pikov · Secure development: history and practice",
      "url": "PVS-2025-07-02-lecture.html",
      "note": "Companion Russian lecture on standards, processes and implementation, with a historical account by Vitaliy Varenitsa and references to the applicable editions."
    },
    {
      "id": "N19",
      "title": "NIST SSDF · public draft · June 2019",
      "url": "https://csrc.nist.gov/News/2019/draft-white-paper-on-ssdf",
      "note": "Official announcement of the public draft, 11 June 2019. Later than the adoption of GOST R 56939-2016."
    },
    {
      "id": "N20",
      "title": "NIST SSDF 1.0 · final · April 2020",
      "url": "https://csrc.nist.gov/news/2020/mitigating-risk-of-software-vulns-ssdf",
      "note": "Official announcement of the final white paper, 23 April 2020. Separate from the 2019 draft and SSDF 1.1 of February 2022."
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
      ],
      "visual": {
        "id": "slide-03",
        "src": "assets/visuals/slide-03.svg?v=a5a77ebb680c",
        "alt": "Four connected teaching groups: Organize, Engineer, Verify and Sustain. These are the author's guide to the series, not categories defined by GOST.",
        "caption": "An author's teaching guide to the connections between the 25 processes."
      }
    },
    {
      "id": 4,
      "title": "Friday's release is blocked",
      "seconds": 120,
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
      "notes": "Let us begin with a small fictional team. It develops a C++ tool that imports engineering files. The product also has a small service API, uses third-party components, and ships regular updates.\n\nOn Friday afternoon, an analysis tool reports a possible memory error in the file parser. The developer says the finding needs investigation. The security specialist asks whether the affected parser is part of the release. The release owner asks whether there is time to fix it.\n\nThe tool has produced information, but the team has not agreed how to use it. There is no clear scope, no allocated investigation time, and no recorded decision process.\n\nWe cannot solve that entire situation by buying another tool. We need people who understand their responsibilities, suitable tools, and a repeatable way of working. We also need evidence that connects those elements to the actual product version.\n\nAn organization may already use an analyzer, yet still need to examine its coverage, configuration, and follow-up. Before proposing another purchase, find out what the team already does and where the actual gap is.\n\nKeep this team in mind. At the end of the episode, we will return to Friday's release with a more useful set of questions.",
      "sourceIds": [
        "EX"
      ],
      "visual": {
        "id": "slide-04",
        "src": "assets/visuals/slide-04.svg?v=98f5ac268c97",
        "alt": "A file reaches the C++ parser, analysis produces a finding, and the path toward investigation and a release decision is interrupted by unclear ownership and capacity.",
        "caption": "Illustrative case: a finding is useful only when the team can act on it."
      }
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
          "label": "2017",
          "text": "Singapore Security-by-Design framework"
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
      "notes": "The history of secure development contains several parallel approaches. A useful map is the twenty twenty-three review by Arina Kudriavtseva and Olga Gadyatskaya. It examines twenty-eight methodologies through publications from two thousand four to twenty twenty-two, drawn from industry, government, and academia.\n\nFollow the timeline from left to right. This slide selects six publication and edition milestones. Early lifecycle research is followed by the SDL, Touchpoints, and CLASP publications. Later examples include guidance for agile development, Singapore's Security-by-Design framework, version two of OWASP SAMM, and NIST's SSDF version one point one.\n\nThese are dates of the publications or editions we are discussing. They are not all dates when the underlying ideas first appeared. Microsoft, for example, made SDL integral to its development process in two thousand four; the SDL book discussed in the review appeared in two thousand six.\n\nThe picture is a landscape of different ways to organize secure development. We should examine what each approach contributes, rather than assume that the newest publication replaces every earlier idea.",
      "sourceIds": [
        "MLR",
        "MSH",
        "SAMM20",
        "N11"
      ],
      "visual": {
        "id": "slide-05",
        "src": "assets/visuals/slide-05.svg?v=f6592807876a",
        "alt": "Selected publication and edition milestones: lifecycle research in 2004; SDL, Touchpoints and CLASP publications in 2006; SDL-Agile guidance v5.2 in 2012; Singapore Security-by-Design in 2017; SAMM v2.0 in 2020; SSDF v1.1 in 2022.",
        "caption": "Selected publications and editions from the methodology landscape; the review covers 28 approaches."
      }
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
      "title": "Before the standard: a practical problem",
      "seconds": 120,
      "section": "The origins of GOST R 56939",
      "kicker": "EP01 / 07",
      "layout": "cards",
      "lead": "The practical problem behind the national standard",
      "items": [
        {
          "label": "Around 2009",
          "text": "Discussions with colleagues and regulators"
        },
        {
          "label": "The engineering gap",
          "text": "Product assessment also needs confidence in development work"
        },
        {
          "label": "The intended result",
          "text": "A common reference usable by different development teams"
        }
      ],
      "quote": "",
      "notes": "Why did Russia develop a national standard for secure software development? According to Vitaliy Varenitsa, who contributed to its development, discussions with colleagues and regulators began around two thousand nine. The practical concern was that assessing a finished product did not, by itself, explain how security work was organized throughout its development.\n\nThe proposed standard would make that work more explicit. Developers needed a common reference for activities, responsibilities, and the evidence supporting a claim that the activities had been performed.\n\nThis was intended to be useful beyond the internal development method of one large software vendor. Different organizations, including smaller teams, should be able to understand the expectations and adapt their implementation to their own products.\n\nThese early discussions preceded formal drafting. The national standard would be approved several years later.\n\nFor our series, the useful question is the problem the authors were trying to solve: how do we turn security intentions into work that other people can understand and evaluate?",
      "sourceIds": [
        "TRANS",
        "GOSTH"
      ]
    },
    {
      "id": 8,
      "title": "The route from research to publication",
      "seconds": 120,
      "section": "The origins of GOST R 56939",
      "kicker": "EP01 / 08",
      "layout": "timeline",
      "lead": "Research start, working drafts, approval and effective date are distinct events",
      "items": [
        {
          "label": "2013",
          "text": "April: research project starts · August: first draft"
        },
        {
          "label": "2014–2015",
          "text": "Draft review and revision"
        },
        {
          "label": "2016",
          "text": "Approved 1 June · Rosstandart order 458-st"
        },
        {
          "label": "2017",
          "text": "Effective from 1 June"
        }
      ],
      "quote": "",
      "notes": "Varenitsa dates the start of the research project to April twenty thirteen, after the initial discussions and formation of the author team.\n\nThe retrospective presentation places the first draft in August twenty thirteen. Further drafts and revisions followed in twenty fourteen and twenty fifteen. It describes discussion involving twenty-two organizations and around two hundred comments and proposals.\n\nThose numbers describe the consultation reported in the historical presentation. They do not mean that twenty-two organizations are named as developers in the final standard.\n\nRosstandart approved GOST R five six nine three nine, edition twenty sixteen, on the first of June twenty sixteen, under order four five eight, s t. It became effective on the first of June twenty seventeen.\n\nKeep the four events separate: research began, drafts were discussed, the standard was approved, and the standard became effective. A year in a document's designation does not replace that chronology.\n\nThis distinction also helps us read later revisions. A working draft can contain valuable ideas without being an adopted edition of the national standard.",
      "sourceIds": [
        "TRANS",
        "GOSTH",
        "G16"
      ],
      "visual": {
        "id": "slide-08",
        "src": "assets/visuals/slide-08.svg?v=53a0617542dd",
        "alt": "GOST development milestones: research began in April 2013 and a first draft followed in August; review and revision continued in 2014–2015; Rosstandart approved the standard on 1 June 2016; it became effective on 1 June 2017. Project milestones come from Varenitsa's historical account, while the final two dates are formal publication facts.",
        "caption": "From research to an effective standard: different events, different dates."
      }
    },
    {
      "id": 9,
      "title": "Who wrote it, and who was it for?",
      "seconds": 90,
      "section": "The origins of GOST R 56939",
      "kicker": "EP01 / 09",
      "layout": "cards",
      "lead": "Formal authorship, consultation and intended users play different roles",
      "items": [
        {
          "label": "2016 development",
          "text": "NPO Echelon · submitted by Technical Committee 362"
        },
        {
          "label": "Consultation",
          "text": "Other organizations reviewed and commented on drafts"
        },
        {
          "label": "Primary users",
          "text": "Developers, architects, security specialists and team leaders"
        },
        {
          "label": "Additional users",
          "text": "Independent assessors reviewing implementation evidence"
        }
      ],
      "quote": "",
      "notes": "The foreword of the twenty sixteen edition names NPO Echelon as the developer and Technical Committee three six two as the submitting committee.\n\nVarenitsa describes a small author group preparing the main text, with other organizations reviewing proposals and raising comments. Writing the document and participating in its consultation were distinct contributions.\n\nHe also stresses the intended audience. The standard was primarily for the people developing software: architects, programmers, security specialists, and the people organizing their work. Independent assessors were another audience because they needed to evaluate how those practices were implemented.\n\nThat is a useful design tension. The material needs to guide engineering work, while also making the results understandable to somebody reviewing it from outside the team.\n\nFor our importer example, a procedure should help the developer investigate a finding and help a reviewer understand what happened. A document that only satisfies a filing requirement misses much of that practical purpose.\n\nThe standard, a team's implementation, and a particular certification scheme remain distinct subjects. We should identify the actual assessment context before discussing which form of confirmation is required.",
      "sourceIds": [
        "G16",
        "TRANS"
      ]
    },
    {
      "id": 10,
      "title": "A wider plan than one published document",
      "seconds": 90,
      "section": "The origins of GOST R 56939",
      "kicker": "EP01 / 10",
      "layout": "compare",
      "lead": "The original ambition and the published record answer different questions",
      "items": [
        {
          "label": "Original ambition",
          "text": "A family of documents covering several perspectives on development"
        },
        {
          "label": "Published baseline",
          "text": "GOST R 56939-2016, followed by GOST R 56939-2024"
        },
        {
          "label": "Working material",
          "text": "Recalled drafts and revisions do not establish adopted editions"
        }
      ],
      "quote": "",
      "notes": "The original ambition extended beyond a single document.\n\nVarenitsa recalls discussions about a family of standards that would address secure development from several perspectives and across the software lifecycle. The number and arrangement of those documents changed during discussion. The twenty sixteen standard was the first published result of that wider intention.\n\nThe proposed arrangement changed during development; the original plan and the documents eventually adopted must therefore be distinguished.\n\nThe same distinction applies to versions. Varenitsa recalls working material from twenty eighteen, twenty nineteen, twenty twenty, and twenty twenty-two. These were stages of continuing revision, rather than published national standards with those edition years.\n\nThe two adopted editions relevant to this episode are twenty sixteen and twenty twenty-four. For each one, we can identify a final text and an official approval record.\n\nFor a development team, the practical distinction is between an adopted requirement and a proposal that may still change. An implementation plan needs to identify which published edition it follows.",
      "sourceIds": [
        "TRANS",
        "G16",
        "G24"
      ]
    },
    {
      "id": 11,
      "title": "GOST in the international context",
      "seconds": 120,
      "section": "The origins of GOST R 56939",
      "kicker": "EP01 / 11",
      "layout": "compare",
      "lead": "Earlier international work informed the context; chronology limits ancestry claims",
      "items": [
        {
          "label": "Design context",
          "text": "Common Criteria · ISO/IEC 27034 · lifecycle standards"
        },
        {
          "label": "GOST R 56939",
          "text": "Approved in 2016"
        },
        {
          "label": "NIST SSDF",
          "text": "Public draft 2019 · final 1.0 in 2020 · final 1.1 in 2022"
        }
      ],
      "quote": "",
      "notes": "An original national standard can still draw on international engineering knowledge. These are compatible ideas.\n\nIts design context included Common Criteria, information security management, and software lifecycle standards. The intended result was a common reference usable by different development organizations.\n\nThe twenty sixteen standard itself connects its use to ISO slash IEC twenty-seven thousand thirty-four and Common Criteria assurance components. Its informative appendix includes a related mapping.\n\nThat does not prove that every practice was new. We have already seen earlier work on secure development. To establish a specific borrowing or a specific difference, we need to compare the relevant texts.\n\nNIST's Secure Software Development Framework gives us a useful chronological check. Its public draft was announced in June twenty nineteen. Final version one point zero followed in April twenty twenty, and version one point one in February twenty twenty-two.\n\nThe twenty sixteen GOST therefore cannot have been based on those later SSDF publications. At the same time, being earlier than SSDF does not prove that GOST was the first secure development approach in the world. Nor does similarity prove influence in the opposite direction.\n\nOur comparison asks a more useful question: which engineering concerns are shared, how are obligations organized, and what evidence does each approach expect? That is something we can investigate process by process.",
      "sourceIds": [
        "TRANS",
        "GOSTH",
        "G16",
        "N19",
        "N20",
        "N11"
      ],
      "visual": {
        "id": "slide-11",
        "src": "assets/visuals/slide-11.svg?v=0bfceb2c4127",
        "alt": "On a common time axis, GOST R 56939 was approved in 2016; the first public SSDF draft appeared in 2019, final SSDF 1.0 in 2020, and final SSDF 1.1 in 2022. The timeline does not assert ancestry between the documents.",
        "caption": "Chronology helps test an ancestry claim; similarity alone cannot establish one."
      }
    },
    {
      "id": 12,
      "title": "Two editions, different structures",
      "seconds": 90,
      "section": "From the 2016 edition to 2024",
      "kicker": "EP01 / 12",
      "layout": "cards",
      "lead": "Re-read the final text before claiming equivalence",
      "items": [
        {
          "label": "2016 edition",
          "text": "Nine groups of measures · clauses 5.1–5.9"
        },
        {
          "label": "2024 edition",
          "text": "Twenty-five named processes · clauses 5.1–5.25"
        },
        {
          "label": "A wording change",
          "text": "The same term: recommendation in 2016 · requirement in 2024"
        },
        {
          "label": "Migration",
          "text": "Map obligations and evidence; preserve practices that work"
        }
      ],
      "quote": "",
      "notes": "The two editions organize related engineering work differently.\n\nSection five of the twenty sixteen standard contains nine groups of measures. Section five of the twenty twenty-four edition contains twenty-five named processes. These are different units of organization. Subtracting the numbers does not tell us how many genuinely new practices appeared, or how much safer a product became.\n\nThere is also a concrete wording change. A term used for recommendations under clause four point two of the twenty sixteen edition expresses a requirement under clause four point seven of the twenty twenty-four edition. An English translation must preserve the force assigned by the relevant edition.\n\nThat is why reusing an old checklist without reading the new edition is risky. Familiar words can carry different force.\n\nThe twenty twenty-four edition was approved in October and became effective in December of that year. Moving to it calls for a gap analysis: which obligations and evidence are already covered, which need adjustment, and which need new work? Effective existing practices are a starting point for that analysis.",
      "sourceIds": [
        "G16",
        "G24"
      ],
      "visual": {
        "id": "slide-12",
        "src": "assets/visuals/slide-12.svg?v=244084dc6146",
        "alt": "The 2016 edition has nine groups of measures; clause 4.2 assigns recommendation status to a term that expresses a requirement under clause 4.7 of the 2024 edition. The 2024 edition has 25 named processes. Structural counts do not measure a change in security.",
        "caption": "Read the structure and wording rules of the edition you actually use."
      }
    },
    {
      "id": 13,
      "title": "A process continues after the first tool run",
      "seconds": 90,
      "section": "From the 2016 edition to 2024",
      "kicker": "EP01 / 13",
      "layout": "steps",
      "lead": "Triggers, ownership, evidence and feedback make work repeatable",
      "items": [
        {
          "label": "Trigger",
          "text": "What event starts the work?"
        },
        {
          "label": "Ownership",
          "text": "Who performs it and who reviews the result?"
        },
        {
          "label": "Evidence",
          "text": "Which version, findings and decisions are recorded?"
        },
        {
          "label": "Feedback",
          "text": "What changes before the next cycle?"
        }
      ],
      "quote": "",
      "notes": "A process requires more than a new heading. It organizes work that continues over time, with clear responsibilities, repeatable actions, and results that inform the next cycle.\n\nA memorable example is buying an analysis tool for a short period just before a release. That may produce a report. It does not automatically establish a maintained process for examining changes, reviewing findings, fixing problems, and checking the result again.\n\nFor our importer team, define the trigger, the owner, the recorded evidence, and the feedback into the next cycle. A relevant code change could trigger analysis. A named engineer could review the findings. The record should connect the finding and decision to the product version.\n\nTrigger, ownership, evidence, and feedback give us a practical way to examine a process. The twenty sixteen edition already addressed lifecycle work, internal checks, and improvement.\n\nThe practical lesson is that a tool becomes useful within an organized way of working. Planning gives the team the capacity and agreements needed to sustain that work.",
      "sourceIds": [
        "G24",
        "EX"
      ],
      "visual": {
        "id": "slide-13",
        "src": "assets/visuals/slide-13.svg?v=8cd143d6833c",
        "alt": "A repeating process connects a trigger, assigned work, a recorded decision and review. Product version and evidence remain at the centre of the cycle.",
        "caption": "A teaching model of repeatable work: actions, decisions and feedback remain connected."
      }
    },
    {
      "id": 14,
      "title": "Shared practices need evidence",
      "seconds": 90,
      "section": "Our comparison method",
      "kicker": "EP01 / 14",
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
      "notes": "What does the literature review allow us to conclude? It identifies substantial overlap in practices, together with organizational concerns such as risk management, culture, policies, and communication.\n\nIts synthesis distinguishes organization-level work, work across the lifecycle, and activities associated with a project stage. A security programme therefore involves more than a list of tools.\n\nEvidence about complete methodologies is less consistent. That does not show that secure development fails. It means we must examine the evaluation method, context, and result being measured.\n\nThe review selected accessible English-language material. Its omission of GOST cannot establish that the Russian standard is unique.\n\nAn expert's experience can reveal useful questions. A broader conclusion still needs evidence about the context, method, and result.\n\nWe will compare specific practices and evidence using identified versions. Our NIST baseline is final SSDF one point one. As of September twenty twenty-six, version one point two is still a draft. Let us make the comparison method explicit.",
      "sourceIds": [
        "MLR",
        "N11",
        "N12"
      ]
    },
    {
      "id": 15,
      "title": "Compare obligations, not labels",
      "seconds": 90,
      "section": "Our comparison method",
      "kicker": "EP01 / 15",
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
      "notes": "Here is the method we will use. First, we identify a specific requirement or practice. We record who acts, what they do, the scope, and any conditions. Then we compare the actual work and the expected result.\n\nWe also preserve the strength of the original wording. Clause four point seven of the twenty twenty-four GOST defines which wording expresses a required condition. When translating such a condition, we must convey a requirement rather than turn it into an optional recommendation.\n\nOn the international side, we identify whether we are reading framework guidance, a requirement, or an example of implementation. Similar wording does not automatically give two documents the same authority.\n\nOur conclusion may be substantial overlap, partial overlap, or a complementary practice. If we have not found a counterpart, we will state which sources we reviewed.\n\nThis lets us investigate the series' central question without deciding the answer in advance. A useful comparison can reveal shared engineering ideas and still show important differences in scope, detail, and expected evidence.",
      "sourceIds": [
        "G24",
        "N11"
      ],
      "visual": {
        "id": "slide-15",
        "src": "assets/visuals/slide-15.svg?v=6fbba0ff8a5f",
        "alt": "The comparison method proceeds from reading actors, actions and conditions, to examining differences, demonstrating an implementation, and stating a bounded conclusion.",
        "caption": "Compare what the documents ask people to do and what would demonstrate the result."
      }
    },
    {
      "id": 16,
      "title": "What process 5.1 asks for",
      "seconds": 90,
      "section": "Planning secure development",
      "kicker": "EP01 / 16",
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
      ],
      "visual": {
        "id": "slide-16",
        "src": "assets/visuals/slide-16.svg?v=5b5fac26b044",
        "alt": "Within the defined scope, current-state analysis and resource analysis support both the process improvement plan and the process implementation plan. The five nodes carry clauses 5.1.2.1 through 5.1.2.5.",
        "caption": "Five planning requirements connected by their information dependencies."
      }
    },
    {
      "id": 17,
      "title": "Start with a defensible scope",
      "seconds": 90,
      "section": "Planning secure development",
      "kicker": "EP01 / 17",
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
      ],
      "visual": {
        "id": "slide-17",
        "src": "assets/visuals/slide-17.svg?v=68649a0d4f1d",
        "alt": "Importer 2.0 contains the parser, service API and shipped libraries. Repository, CI configuration and release workflow form connected development context. Excluding a retired prototype requires evidence that it has no code or dependency path into the release.",
        "caption": "Illustrative scope: record what is included, what is connected and why an exclusion is justified."
      }
    },
    {
      "id": 18,
      "title": "Assess reality and assign owners",
      "seconds": 90,
      "section": "Planning secure development",
      "kicker": "EP01 / 18",
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
      "notes": "Begin with practices that already work, practices that need improvement, and capabilities that are missing. Introducing a standard does not mean rebuilding everything from zero.\n\nThe current-state record lists implemented and unimplemented processes. It assesses existing processes against this standard, other applicable standards, and the team's tools and technologies.\n\nIn our example, parser checks run manually, coverage is unclear, and decision history is incomplete. These are fictional findings.\n\nWe assign responsibilities. The engineering lead owns integration. The AppSec lead helps define investigation criteria and review security evidence. The release owner records decisions under the team's policy. A sponsor resolves capacity and priority conflicts.\n\nOne person may hold several roles. The arrangement must still make responsibilities and decision authority understandable.\n\nThis allocation is our implementation example. The standard's implementation-plan artifact calls for responsible employees. It does not automatically give AppSec an independent power to block every release. The organization must define that authority and make the relationship between investigation, review, and the release decision clear.",
      "sourceIds": [
        "G24",
        "EX"
      ]
    },
    {
      "id": 19,
      "title": "Resources include human attention",
      "seconds": 90,
      "section": "Planning secure development",
      "kicker": "EP01 / 19",
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
      "notes": "Resource planning includes the time to configure checks, investigate findings, maintain the workflow, and teach people how to use it.\n\nFor our fictional ninety-day effort, we reserve sixty engineering hours, twenty-four AppSec hours, and twelve hours for release coordination and sponsor decisions. The total is ninety-six person-hours.\n\nThese figures are a teaching example. They are neither a benchmark nor a percentage required by GOST. There is no universal percentage that can replace an estimate of the actual work.\n\nTools, infrastructure, and additional training costs need their own assessment. Dependencies matter too. If the build engineer is unavailable during the first month, the schedule must reflect that. Assigning a task does not create capacity.\n\nThe standard's resource-analysis artifact may contain estimated material and human resource indicators. Our table makes those assumptions discussable. Ask the people doing the work whether the estimate is credible, show it to those deciding priorities, and agree when to revise it. Human attention is part of the resource plan.",
      "sourceIds": [
        "G24",
        "EX"
      ],
      "visual": {
        "id": "slide-19",
        "src": "assets/visuals/slide-19.svg?v=35d9ac1bb9fa",
        "alt": "An illustrative 90-day effort allocates 60 person-hours to engineering, 24 to AppSec, and 12 to release coordination and sponsor decisions, for a total of 96 person-hours. Tools and infrastructure are assessed separately.",
        "caption": "Illustrative total effort for the 90-day plan; validate the estimates with the people doing the work."
      }
    },
    {
      "id": 20,
      "title": "Two plans, two questions",
      "seconds": 90,
      "section": "Planning secure development",
      "kicker": "EP01 / 20",
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
      "notes": "Planning gives the team, its managers, and the people requesting the product a shared language. Two related plans help them agree both the direction and the work.\n\nThe improvement plan describes how processes will develop. It sets priorities and the sequence of changes, considering available resources. Our team might make parser analysis repeatable, improve the handling of findings, and then review the results.\n\nThe implementation plan identifies goals, stages, dates, resources, and responsible people. A task can specify the parser target, integration milestone, owner, and expected evidence.\n\nThe standard allows these plans to be represented in a task management system. A roadmap with linked tasks can preserve their different purposes without creating disconnected documents.\n\nThe practical test is traceability. Why was this change selected? Which resource assumption supports it? Who performs it? What shows that a stage is complete? A planning page becomes useful when the team can follow those connections and act on them.",
      "sourceIds": [
        "G24",
        "EX"
      ],
      "visual": {
        "id": "slide-20",
        "src": "assets/visuals/slide-20.svg?v=bc24c06294e3",
        "alt": "A process improvement goal, repeatable parser checks, is linked to an implementation task with an owner and milestone, and then to evidence of coverage and triage decisions. Current-state and resource analysis support the entire chain.",
        "caption": "Connect the capability in the improvement plan to executable work and its evidence."
      }
    },
    {
      "id": 21,
      "title": "A 90-day plan for the importer",
      "seconds": 120,
      "section": "Worked example",
      "kicker": "EP01 / 21",
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
      ],
      "visual": {
        "id": "slide-21",
        "src": "assets/visuals/slide-21.svg?v=aed543532f55",
        "alt": "The illustrative plan has three equal 30-day periods: establish scope, baseline and ownership; integrate parser checks and record decisions; then review two release cycles, close gaps and update the next plan.",
        "caption": "A 90-day example for the importer: each stage produces something the team can review."
      }
    },
    {
      "id": 22,
      "title": "Five linked records of evidence",
      "seconds": 90,
      "section": "Worked example",
      "kicker": "EP01 / 22",
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
      "notes": "The standard identifies five corresponding kinds of evidence: current-state analysis, resource analysis, the improvement plan, the implementation plan, and scope with its selection rationale.\n\nThese are five kinds of information, not an instruction to create five isolated Word files. Existing systems can support this work: a planning page can link to maintained repository and task records.\n\nIn our example, the scope identifies the importer version and components. The baseline links to checks that ran. The resource record captures estimates and assumptions. The improvement plan explains priorities. Implementation tasks identify owners and milestones.\n\nThe standard recognizes forms such as electronic files, logs, and tool results. Choose a form that supports the required information and traceability.\n\nA one-page template is only an entry point. It does not replace the underlying analysis or prove effectiveness. A reviewer should be able to follow the links, identify the relevant version, understand the decisions, and see which questions remain unresolved. Automation helps when it preserves those connections.",
      "sourceIds": [
        "G24",
        "EX"
      ],
      "visual": {
        "id": "slide-22",
        "src": "assets/visuals/slide-22.svg?v=8c66f578954a",
        "alt": "Five evidence categories mirror the planning requirements: baseline checks and gaps, resource estimates and assumptions, improvement priorities, implementation owners and milestones, and the importer scope with its rationale.",
        "caption": "The same planning structure, now expressed as records a reviewer can follow."
      }
    },
    {
      "id": 23,
      "title": "A first international crosswalk",
      "seconds": 120,
      "section": "Comparison result",
      "kicker": "EP01 / 23",
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
      ],
      "visual": {
        "id": "slide-23",
        "src": "assets/visuals/slide-23.svg?v=f384435815f8",
        "alt": "Two partial overlaps are shown: GOST 5.1.3.4 and NIST SSDF PO.2.1 share a concern with roles and responsibility; GOST 5.1.2.3 and SAMM Strategy and Metrics share a concern with an improvement roadmap. Scope and evidence expectations still differ.",
        "caption": "Bounded comparison: a shared concern is useful, but does not establish full equivalence."
      }
    },
    {
      "id": 24,
      "title": "Would this survive Friday's release?",
      "seconds": 90,
      "section": "Apply it",
      "kicker": "EP01 / 24",
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
      "notes": "Return to Friday's warning. A plan will not automatically tell us whether it is a real vulnerability. It helps organize the investigation and the decision.\n\nWe can identify the affected version and component, find the investigation owner, and locate the person authorized to make the release decision. We can see the existing evidence and the missing results.\n\nWeak planning is recognizable too. An analyzer without a review owner is incomplete. A roadmap without capacity is unreliable. A scope without a rationale is difficult to defend.\n\nFor this team, I would review the plan after ninety days and after a material change, such as adding a parser. These are our implementation recommendations.\n\nIn a small team, one person may hold several responsibilities. Make the arrangement explicit and check capacity. Scaling the implementation does not establish that applicable requirements can be ignored.\n\nThe practical test is whether another team member can understand the next action. If only the author can explain the plan, improve it.",
      "sourceIds": [
        "EX",
        "G24"
      ],
      "visual": {
        "id": "slide-24",
        "src": "assets/visuals/slide-24.svg?v=0a3c1aff77c5",
        "alt": "The importer scenario returns with a connected path: identify the input and covered parser, retain the finding evidence, assign time and ownership for investigation, and record a release decision under the team's policy. This is a review of the process, not proof that a release is safe.",
        "caption": "Return to Friday's release: can the team follow the finding through an owned, evidenced decision?"
      }
    },
    {
      "id": 25,
      "title": "Security Training That Changes Engineering Decisions",
      "seconds": 90,
      "section": "Stay in touch · Next episode",
      "kicker": "EP01 / 25",
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
      "notes": "Today, we followed the Russian standard from early discussions to its adopted editions, connected that history to international work, and used its first process to organize a practical improvement effort.\n\nYour next step is simple: choose one product and start your planning page. Describe the current state, identify the next improvement, and connect it to an owner, available capacity, and reviewable evidence. The accompanying worksheet will help you get started.\n\nI am Vitaliy Pikov. You can find me at pikov dot expert. Please keep in touch and share the questions you would like this series to explore.\n\nThe next episode is called Security Training That Changes Engineering Decisions. We will examine employee training under clause five point two: what different roles need to learn, how to practise those skills, and what evidence can show progress beyond attendance.\n\nWe will build a role and skills matrix and use a short exercise before and after training. Which engineering decision would you most like your security training to improve? Thank you for watching. See you in episode two.",
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
