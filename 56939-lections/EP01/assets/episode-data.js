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
      "note": "Developed by FSTEC of Russia with nine organisations, including Kaspersky, ISP RAS, Positive Technologies and NPO Echelon; submitted by TC 362; approved 24 October 2024 by order 1504-st; effective 20 December 2024. Foreword and structure; clause 4.7 on normative wording; clause 5.1 on planning and its implementation evidence. English clause wording is an author translation."
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
      "id": "AND72",
      "title": "James P. Anderson · Computer Security Technology Planning Study",
      "url": "https://csrc.nist.gov/files/pubs/conference/1998/10/08/proceedings-of-the-21st-nissc-1998/final/docs/early-cs-papers/ande72a.pdf",
      "note": "ESD-TR-73-51, Vol. I, October 1972. Deputy for Command and Management Systems, HQ Electronic Systems Division (AFSC), L. G. Hanscom Field. Prepared under contract F19628-72-C-0198 by James P. Anderson & Co. Section 3.2.1 introduces the reference monitor; section 3.2.2, on pages 9-10, states three design requirements for the reference validation mechanism, which footnote 3 defines as the combination of hardware and software that implements the reference monitor concept: it must be tamper proof, it must always be invoked, and it must be small enough to be subject to analysis and tests. The 1973-style report number on a 1972 report is a common citation trap."
    },
    {
      "id": "TCSEC",
      "title": "Department of Defense Trusted Computer System Evaluation Criteria · the Orange Book",
      "url": "https://archive.org/details/TCSEC",
      "note": "DoD 5200.28-STD, 26 December 1985. Its own title page records that it supersedes CSC-STD-001-83, dated 15 August 1983. The two designations belong to two different documents; the 1985 standard is the better known one. The issuing organization of the 1983 version is not asserted here. The slide's claim that these criteria also ask about the work behind the product rests on the Life-Cycle Assurance sections 2.1.3.2, 2.2.3.2, 3.1.3.2, 3.2.3.2, 3.3.3.2 and 4.1.3.2; a Design Specification and Verification subsection appears from 3.1.3.2 upward and a Configuration Management subsection from 3.2.3.2 upward, so the assurance demanded of the development work grows with the class."
    },
    {
      "id": "CC21",
      "title": "Common Criteria for Information Technology Security Evaluation · Part 1, version 2.1",
      "url": "https://www.commoncriteriaportal.org/files/ccfiles/ccpart1v21.pdf",
      "note": "August 1999. Annex A.2, paragraph 185: CC version 1.0 was completed by the CCEB in January 1996 and approved by ISO in April 1996 for distribution as a Committee Draft. Annex A.1, paragraphs 181-183, records the earlier national criteria (TCSEC, ITSEC 1.2 in 1991, CTCPEC 3.0 and Federal Criteria 1.0 in early 1993); Annex A.2, paragraph 184, records the start of the CC Project in June 1993. The foreword, page ii, states that CC 2.1 aligns with International Standard ISO/IEC 15408:1999 and that CC 2.0 was issued in May 1998. Paragraph 105 states that the CC does not mandate any specific development methodology or life cycle model, while paragraph 131 gives constraints on the rigour of the development process as an example of an assurance requirement; that pair is the boundary the slide keeps. Note that the Common Criteria portal's ICCC history page gives 1994 for version 1.0; the criteria document itself gives January 1996 and is preferred."
    },
    {
      "id": "NS162",
      "title": "Federal Law 162-FZ · On standardization in the Russian Federation · Article 26",
      "url": "https://www.consultant.ru/document/cons_doc_LAW_181810/0b41c80a4b380c5845a29b37afa6f49390738b18/",
      "note": "Adopted 29 June 2015. Article 26 part 1: documents of the national standardization system are applied voluntarily unless legislation of the Russian Federation provides otherwise. Article 26 part 3: application of a national standard is mandatory for a manufacturer or performer after a public claim that a product conforms to it, including use of the designation in marking or documentation. Named in the foreword of GOST R 56939-2024. Checked 6 September 2026."
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
      "seconds": 65,
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
      "notes": "Hello, and welcome. I'm Vitaliy Pikov. I work with secure software development processes, and I teach the engineering ideas behind them.\n\nThis is the first episode of Secure Software Development in Practice. We'll explore twenty-five processes from a Russian national standard, GOST R 56939-2024. And we'll compare them with international approaches.\n\nOur question is simple. What can a development team actually use?\n\nToday we'll do three things. We'll look at the history behind the subject. We'll learn how to read this standard. And we'll build a small example of a security process plan. You do not need previous knowledge of Russian standards. Just bring your own experience: building software, reviewing it, or helping a team deliver it safely.",
      "sourceIds": [
        "G24"
      ]
    },
    {
      "id": 2,
      "title": "One process. One useful result.",
      "seconds": 95,
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
      "notes": "This series builds on an earlier project. I made a set of Russian-language webinars together with PVS-Studio. For this English series, I want to take that work further. And I want to compare it with international practices in a systematic way.\n\nEach episode will focus on one process. We'll ask three questions. What problem does it address? How do other approaches address a similar problem? And what evidence would show that a team has put the process into practice?\n\nThe audience includes developers, AppSec practitioners, and technical leaders. Maybe you write code. Maybe you design a delivery pipeline. Maybe you decide where the team should invest its limited time. Each of those perspectives matters.\n\nI'm also using this project to develop my professional English and to go deeper in my own research. I'll explain new terms. I'll name the sources. And when something needs a correction, I'll say so openly.\n\nBy the end of an episode, you should have something useful to discuss with your team. A small checklist. A decision record. Or an example you can adapt to your own work.",
      "sourceIds": [
        "G24"
      ]
    },
    {
      "id": 3,
      "title": "Twenty-five processes, connected",
      "seconds": 95,
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
          "text": "Review, analyse and test"
        },
        {
          "label": "Sustain",
          "text": "Deliver updates, handle weaknesses and improve"
        }
      ],
      "quote": "",
      "notes": "The standard gives us the structure of the series: twenty-five processes, and twenty-five core episodes. Episode one follows section five point one. Episode twenty-five follows section five point twenty-five.\n\nThe four groups on this slide are my teaching guide. They are not additional categories defined by the standard. They help us see how four things connect: planning, engineering, verification, and continued support.\n\nHere's an example. A static analysis result is useful only when we know three things. What code was analysed. Who reviews the findings. And how a correction reaches a release. A dependency list is the same. It is useful only when somebody keeps it current and acts on the changes that matter.\n\nWe'll keep coming back to those connections. Some episodes will include a guest who can explain one practice from direct experience. Every core episode will still have its own practical result.\n\nYou can follow the whole series. Or pick an episode that matches a problem you have now. Today we set up the vocabulary and a planning example that later episodes can extend.",
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
      "notes": "Let's start with a small team. The team is fictional. It develops a C++ tool that imports engineering files. The product also has a small service API. It uses third-party components and ships regular updates.\n\nOn Friday afternoon, an analysis tool reports a possible memory error in the file parser. The developer says the finding needs investigation. The security specialist asks if the affected parser is part of the release. The release owner asks if there is time to fix it.\n\nLook at the break between the finding and the investigation. The tool produced information. But the team has not agreed how to use it. The scope is not clear. Nobody set aside time to investigate. And nobody wrote down how the decision is made.\n\nWe cannot solve all of that by buying another tool. We need people who understand their responsibilities. We need suitable tools. We need a way of working we can repeat. And we need evidence that connects those elements to the actual product version.\n\nAn organization may already use an analyzer, and still need to check what it covers, how it is set up, and what happens after a finding. Before proposing another purchase, find out what the team already does and where the actual gap is.\n\nKeep this team in mind. At the end of the episode, we'll return to Friday's release with a more useful set of questions.",
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
      "title": "Three documents before the methodologies",
      "seconds": 135,
      "section": "Foundations",
      "kicker": "EP01 / 05",
      "layout": "timeline",
      "lead": "Trusted-systems research predates the vendor methodologies by decades",
      "items": [
        {
          "label": "1970",
          "text": "Ware report · Security Controls for Computer Systems · RAND R-609"
        },
        {
          "label": "1972",
          "text": "Anderson · Computer Security Technology Planning Study · ESD-TR-73-51"
        },
        {
          "label": "1975",
          "text": "Saltzer and Schroeder · eight design principles · Proceedings of the IEEE"
        },
        {
          "label": "The pattern",
          "text": "Government and academic reports, not vendor programmes"
        }
      ],
      "quote": "",
      "notes": "Our subject is older than the two thousands. Its roots are in government and academic work on trusted systems.\n\nA Defense Science Board task force worked on computer security. Willis Ware chaired it. It finished its report on the eleventh of February, nineteen seventy. The title is Security Controls for Computer Systems. RAND published it, and it was classified confidential. The Defense Advanced Research Projects Agency declassified it on the tenth of October, nineteen seventy-five. RAND then reissued the report for wider distribution.\n\nThe covering memo makes a careful claim. It calls this the first attempt to codify the principles and details of the problem.\n\nIn October nineteen seventy-two, James Anderson wrote the Computer Security Technology Planning Study. He wrote it for the United States Air Force. The report number is on the slide. It introduced the reference monitor. Anderson names three requirements for the mechanism that implements it. It must be tamper proof. It must always be invoked. And it must be small enough to analyse and test.\n\nThen came Saltzer and Schroeder. In September nineteen seventy-five they published The Protection of Information in Computer Systems. It appeared in Proceedings of the IEEE. The paper lists eight design principles. Least privilege and fail-safe defaults are two of them. We still apply them today.\n\nLook at what these three documents are. They are research and defence reports about building systems you can trust. They are not vendor methodologies.",
      "sourceIds": [
        "WARE",
        "AND72",
        "SS75"
      ]
    },
    {
      "id": 6,
      "title": "From evaluating systems to building them",
      "seconds": 140,
      "section": "Foundations",
      "kicker": "EP01 / 06",
      "layout": "cards",
      "lead": "The assurance question moves from the finished product to the work behind it",
      "items": [
        {
          "label": "1983 and 1985",
          "text": "TCSEC, the Orange Book · CSC-STD-001-83, then DoD 5200.28-STD"
        },
        {
          "label": "1996",
          "text": "Common Criteria version 1.0 · first ISO/IEC 15408 edition in 1999"
        },
        {
          "label": "2002",
          "text": "Microsoft launches Trustworthy Computing"
        },
        {
          "label": "2004",
          "text": "SDL integral at Microsoft · the review's selection window opens"
        }
      ],
      "quote": "",
      "notes": "The next stage is about evaluation. How do we judge whether a system deserves trust?\n\nThe United States answered with the Trusted Computer System Evaluation Criteria. People call it the Orange Book. The first version is dated the fifteenth of August, nineteen eighty-three. The better known version is the Department of Defense standard. Its date is the twenty-sixth of December, nineteen eighty-five. It replaced the nineteen eighty-three version. Both document numbers are on the slide.\n\nThen the work became international. Canadian, European and American criteria were brought together in the Common Criteria project. Version one point zero was completed in January nineteen ninety-six. ISO approved it in April that year for distribution as a committee draft. The first ISO edition, ISO slash IEC fifteen thousand four hundred eight, followed in nineteen ninety-nine.\n\nNotice what these documents do. They evaluate a product, and they also ask for evidence about how it was built.\n\nIn January two thousand two, Microsoft launched its Trustworthy Computing initiative. In two thousand four, the SDL became an integral part of development at Microsoft.\n\nThat is where our next slide starts. It uses a twenty twenty-three review. The review gives two dates. The first systematic studies of how to build secure software appeared in two thousand one. From two thousand four onward, organizations began putting security processes into the lifecycle. So two thousand four opens the review's selection window. It does not open the subject.",
      "sourceIds": [
        "TCSEC",
        "CC21",
        "MSH",
        "MLR"
      ]
    },
    {
      "id": 7,
      "title": "A landscape of secure development methods",
      "seconds": 105,
      "section": "The methodology landscape",
      "kicker": "EP01 / 07",
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
      "notes": "The history of secure development has several parallel approaches. One useful map is the twenty twenty-three review by Arina Kudriavtseva and Olga Gadyatskaya. It examines twenty-eight methodologies. It uses publications from two thousand four to twenty twenty-two. They come from industry, government, and academic research.\n\nFollow the timeline from left to right. We selected six milestones for this slide: publications and editions. First comes early lifecycle research. Then come the SDL, Touchpoints, and CLASP publications. Later examples include guidance for agile development, Singapore's Security-by-Design framework, version two of OWASP SAMM, and NIST's SSDF, version one point one.\n\nThese are the dates of the publications or editions we are discussing. They are not all dates when the underlying ideas first appeared. Take Microsoft. It made SDL integral to its development process in two thousand four. But the SDL book discussed in the review appeared in two thousand six.\n\nSo the picture is a landscape. It shows different ways to organize secure development. We should examine what each approach contributes. We should not assume that the newest publication replaces every earlier idea.",
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
      "id": 8,
      "title": "Different ways to organize the work",
      "seconds": 95,
      "section": "The methodology landscape",
      "kicker": "EP01 / 08",
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
      "notes": "The review helps us look past the names. Each approach gives a team a different way to organize its security work.\n\nMicrosoft SDL joins engineering practices with management support and training. Touchpoints, from Gary McGraw, focuses on risk management. That includes architecture analysis and code review. CLASP connects activities to roles. The agile SDL guidance sorts activities into three kinds: done once, repeated in every sprint, or placed in a bucket, a group that comes back on a regular cycle.\n\nThat last idea is practical. A team needs a reasoned schedule for security work. Repeating every activity in every sprint is not automatically the best design.\n\nThe review also looks at maturity approaches. SAMM helps an organization plan how its capability grows. BSIMM describes practices observed in organizations. Those purposes are different from telling a developer the next task to build.\n\nFor our importer team, the shared questions are familiar. Which activity do we need? Who does it? And when? Each approach answers at its own level. We still have to work out what each activity means for our real product and team.",
      "sourceIds": [
        "MLR"
      ]
    },
    {
      "id": 9,
      "title": "Before the standard: a practical problem",
      "seconds": 95,
      "section": "The origins of GOST R 56939",
      "kicker": "EP01 / 09",
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
      "notes": "Why did Russia develop a national standard for secure software development? According to Vitaliy Varenitsa, who took part in that work, talks with colleagues and regulators began around two thousand nine. The practical concern was this. Assessing a finished product did not, by itself, explain how security work was organized all the way through development.\n\nThe proposed standard would make that work more visible. Developers needed one shared reference. It would name the activities, who is responsible, and what evidence supports a claim that the activities were done.\n\nIt was meant to be useful beyond the in-house development method of one large software vendor. Other organizations, including smaller teams, should be able to understand the expectations. Each team should then be able to adapt its implementation to its own products.\n\nThese early talks came before any formal drafting. The national standard would be approved several years later.\n\nFor our series, the useful question is the problem the authors were trying to solve. How do we turn good security intentions into work that other people can understand and check?",
      "sourceIds": [
        "TRANS",
        "GOSTH"
      ]
    },
    {
      "id": 10,
      "title": "The route from research to publication",
      "seconds": 105,
      "section": "The origins of GOST R 56939",
      "kicker": "EP01 / 10",
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
      "notes": "Varenitsa dates the start of the research project to April twenty thirteen. It began after the first discussions, once the author team was formed.\n\nThe history presentation puts the first draft in August twenty thirteen. More drafts and revisions followed in twenty fourteen and twenty fifteen. It describes a discussion with twenty-two organizations, and around two hundred comments and proposals.\n\nThose numbers describe the consultation reported in the history presentation. They do not mean that twenty-two organizations are named as developers in the final standard.\n\nRosstandart approved GOST R five six nine three nine, edition twenty sixteen, on the first of June twenty sixteen. The approval came under order four five eight, s t. It became effective on the first of June twenty seventeen.\n\nKeep the four events separate. Research began. Drafts were discussed. The standard was approved. And the standard became effective. The year in a standard's name does not replace that order of events.\n\nThis also helps us read later revisions. A working draft can hold valuable ideas without being an adopted edition of the national standard.",
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
      "id": 11,
      "title": "Who wrote it, and who was it for?",
      "seconds": 140,
      "section": "The origins of GOST R 56939",
      "kicker": "EP01 / 11",
      "layout": "cards",
      "lead": "Formal authorship, consultation and intended users play different roles",
      "items": [
        {
          "label": "2016 development",
          "text": "NPO Echelon · submitted by Technical Committee 362"
        },
        {
          "label": "2024 development",
          "text": "FSTEC of Russia with nine organisations, including Kaspersky, ISP RAS and Positive Technologies · again submitted by Technical Committee 362"
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
      "notes": "The foreword of the twenty sixteen edition names NPO Echelon as the developer. Technical Committee three six two is named as the submitting committee.\n\nThe twenty twenty-four edition has a different foreword. It names the Federal Service for Technical and Export Control, FSTEC, together with nine organizations. Among them are Kaspersky, the Institute for System Programming of the Russian Academy of Sciences, Positive Technologies and NPO Echelon. Technical Committee three six two submitted it again. That change is worth a moment. One developer in twenty sixteen. The regulator and a group of product companies in twenty twenty-four.\n\nVarenitsa describes a small author group that prepared the main text. Other organizations reviewed the drafts and raised comments. Writing the document and taking part in its consultation were distinct contributions.\n\nHe also stresses the intended audience. The standard was primarily for the people who develop software: architects, programmers, security specialists, and the people who organize their work. Independent assessors were a second audience, because they needed to judge how those practices were put in place.\n\nThat's a useful tension in the design. The material has to guide engineering work. It also has to make those results clear to a reviewer outside the team.\n\nThink of our importer example. A procedure should help the developer look into a finding. It should also help a reviewer understand what happened. A document written only to satisfy a filing rule misses much of that practical purpose.\n\nThe standard, a team's implementation, and a particular certification scheme are three different things. We should first be clear about the actual assessment context. Then we can discuss which form of confirmation is required.",
      "sourceIds": [
        "G16",
        "G24",
        "TRANS"
      ]
    },
    {
      "id": 12,
      "title": "A wider plan than one published document",
      "seconds": 95,
      "section": "The origins of GOST R 56939",
      "kicker": "EP01 / 12",
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
      "notes": "The original idea went further than a single document.\n\nVarenitsa recalls talks about a family of standards. Together they would cover secure development from several angles, and across the software lifecycle. The number of those documents, and the way they were arranged, changed during discussion. The twenty sixteen standard was the first published result of that wider idea.\n\nThe same difference applies to versions. Varenitsa recalls working material from twenty eighteen, twenty nineteen, twenty twenty, and twenty twenty-two. These were steps in ongoing revision work. They were not published national standards with those edition years.\n\nThe two adopted editions for this episode are twenty sixteen and twenty twenty-four. For each one, we can point to a final text and an official approval record.\n\nFor a development team, here's the practical difference. An adopted requirement is one thing. A proposal that may still change is another. An implementation plan needs to say which published edition it follows.",
      "sourceIds": [
        "TRANS",
        "G16",
        "G24"
      ]
    },
    {
      "id": 13,
      "title": "GOST in the international context",
      "seconds": 125,
      "section": "The origins of GOST R 56939",
      "kicker": "EP01 / 13",
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
      "notes": "A national standard can be original and still use international engineering knowledge. These are compatible ideas.\n\nIts design context included Common Criteria, information security management, and software lifecycle standards. The intended result was one common reference, usable by different development organizations.\n\nThe twenty sixteen standard itself points to other documents. It links its use to ISO slash IEC twenty-seven thousand thirty-four and to Common Criteria assurance components. It also has an informative appendix with a related mapping.\n\nThat does not prove that every practice was new. We have already seen earlier work on secure development. To show a specific borrowing, or a specific difference, we have to compare the relevant documents.\n\nThe NIST Secure Software Development Framework gives us a useful check on dates. Its public draft was announced in June twenty nineteen. Final version one point zero came in April twenty twenty. Final version one point one came in February twenty twenty-two.\n\nSo the twenty sixteen GOST cannot have been based on those later SSDF publications. At the same time, being earlier than SSDF does not prove that GOST was the first secure development approach in the world. And similarity does not prove influence in the other direction.\n\nOur comparison asks a more useful question. Which engineering concerns are shared? How are obligations organized? And what evidence does each approach expect? That is something we can study process by process.",
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
      "id": 14,
      "title": "Two editions, different structures",
      "seconds": 105,
      "section": "From the 2016 edition to 2024",
      "kicker": "EP01 / 14",
      "layout": "cards",
      "lead": "The same source term has different normative force",
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
      "notes": "The two editions organize related engineering work in different ways.\n\nSection five of the twenty sixteen standard has nine groups of measures. Section five of the twenty twenty-four edition has twenty-five named processes. These are different units of organization. Subtracting one number from the other does not tell us how many genuinely new practices appeared, or how much safer a product became.\n\nThere's also a concrete change in wording. Look at the Russian verb sleduet. The closest English word is should. Under clause four point two of the twenty sixteen edition, it had recommendation status. Under clause four point seven of the twenty twenty-four edition, the same verb expresses a requirement. Suppose you read an English translation and treat should as advice. Then you will do less than the current edition requires. These labels describe the force of that specific term. An English translation must preserve the force assigned by the relevant edition.\n\nThat's why it is risky to reuse an old checklist without reading the new edition. Familiar words can carry different force.\n\nThe twenty twenty-four edition was approved on the twenty-fourth of October, by order one five zero four, s t. It became effective on the twentieth of December of the same year. Moving to it needs a gap analysis. Which obligations and evidence are already covered? Which ones need adjustment? And which ones need new work? Practices that already work well are a starting point for that analysis.",
      "sourceIds": [
        "G16",
        "G24"
      ],
      "visual": {
        "id": "slide-12",
        "src": "assets/visuals/slide-12.svg?v=5d66ca91925b",
        "alt": "The 2016 edition has nine groups of measures; clause 4.2 assigns recommendation status to a term that expresses a requirement under clause 4.7 of the 2024 edition. The 2024 edition has 25 named processes. Structural counts do not measure a change in security.",
        "caption": "These labels compare the normative force of one term in the original text."
      }
    },
    {
      "id": 15,
      "title": "A process continues after the first tool run",
      "seconds": 100,
      "section": "From the 2016 edition to 2024",
      "kicker": "EP01 / 15",
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
      "notes": "A process needs more than a new heading. It organizes work that continues over time. It needs clear responsibilities, repeatable actions, and results that inform the next cycle.\n\nHere's a memorable example. A team buys an analysis tool for a short time, just before a release. That may produce a report. It does not automatically establish a maintained process for examining changes, reviewing findings, fixing problems, and checking the result again.\n\nLet's follow the loop for our importer team. A relevant code change triggers the analysis. A named engineer runs the check and reviews the findings. The team records a decision. Then the team reviews what should change before the next cycle. At the centre, the evidence connects the finding and the decision to the product version.\n\nTrigger, ownership, evidence, and feedback give us a practical way to examine a process. The twenty sixteen edition already addressed lifecycle work, internal checks, and improvement.\n\nThe practical lesson is simple. A tool becomes useful inside an organized way of working. Planning gives the team the time, people, and agreements to keep that work going.",
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
      "id": 16,
      "title": "When this standard actually binds",
      "seconds": 140,
      "section": "Legal force",
      "kicker": "EP01 / 16",
      "layout": "cards",
      "lead": "A national standard applies voluntarily until another document points at it",
      "items": [
        {
          "label": "Default",
          "text": "Applied voluntarily · the foreword names article 26 of Federal Law 162-FZ of 2015 as the rules of application"
        },
        {
          "label": "Clause 4.14",
          "text": "Regulatory acts, national and industry standards, technical specifications for research and development work, and other documents define which processes apply"
        },
        {
          "label": "In practice",
          "text": "A regulator's order, a customer contract, a certification scheme, or a company's own decision"
        },
        {
          "label": "Once it binds",
          "text": "Every requirement applies · except those that use the words recommended or may"
        },
        {
          "label": "Clause 4.15",
          "text": "Research and development work · only an explicit list of processes in the technical specification imposes the standard · partial lists allowed"
        }
      ],
      "quote": "",
      "notes": "People often ask me one question. Is this standard the law?\n\nNo. In Russia a national standard is applied voluntarily, unless the law says otherwise. The foreword of this edition points to the rules of application. They live in article twenty-six of Federal Law one six two, f z, of twenty fifteen. The standard does not make itself binding.\n\nClause four point fourteen tells us what makes it binding. Here is my working translation. The set of processes a developer must implement is determined by the requirements of regulatory legal acts, national and industry standards, technical specifications for research and development work, and other documents.\n\nSo something else has to point at the standard. In practice that is an order from a regulator, a customer contract, a certification scheme, or a company's own decision. The law adds one more trigger. A public claim of conformity binds you too.\n\nThe same clause adds one sharp detail. Once a document says you must conform, all the requirements apply. The only exceptions are requirements that use the words recommended or may.\n\nClause four point fifteen adds a special rule for research and development work. There the standard can bind only through an explicit list of processes in the technical specification. And that list may be partial.\n\nOne more point. FSTEC co-developed this edition. That is authorship, not law. A regulator writing a standard does not turn it into a legal duty.\n\nSo the useful question is not: is GOST mandatory? The useful question is: what in my situation points at it? Read that way, it is a best-practice baseline. Teams elsewhere use ISO or NIST documents the same way.",
      "sourceIds": [
        "G24",
        "NS162"
      ]
    },
    {
      "id": 17,
      "title": "Shared practices need evidence",
      "seconds": 90,
      "section": "Our comparison method",
      "kicker": "EP01 / 17",
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
      "notes": "What can we conclude from the literature review? It finds substantial overlap in practices. It also finds organizational concerns, such as risk management, culture, policies, and communication.\n\nThe review distinguishes three kinds of work. Work at the level of the organization. Work across the lifecycle. And activities linked to a project stage. So a security programme is more than a list of tools.\n\nEvidence about complete methodologies is limited and uneven. That does not show that secure development fails. It means we have to examine the evaluation method, the context, and the result being measured.\n\nThe review selected accessible English-language material. Its omission of GOST cannot establish that the Russian standard is unique.\n\nAn expert's experience can reveal useful questions. A broader conclusion still needs evidence about the context, the method, and the result.\n\nWe'll compare specific practices and evidence, using named versions. Our NIST baseline is final SSDF one point one. As of September twenty twenty-six, version one point two is still a draft. Let's make the comparison method explicit.",
      "sourceIds": [
        "MLR",
        "N11",
        "N12"
      ]
    },
    {
      "id": 18,
      "title": "Compare obligations, not labels",
      "seconds": 110,
      "section": "Our comparison method",
      "kicker": "EP01 / 18",
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
      "notes": "Here's the method we will use. First, we take one specific requirement or practice. We record who acts, what they do, the scope, and any conditions. Second, we compare the actual work and the expected result.\n\nWe also keep the force of the original wording. Clause four point seven of the twenty twenty-four GOST defines which wording expresses a required condition. When we translate such a condition, we must convey a requirement rather than turn it into an optional recommendation. On the international side, we ask what we are reading. Is it framework guidance, a requirement, or an example of implementation? Similar wording does not automatically give two documents the same authority.\n\nThird, we demonstrate one concrete implementation. We also name the records that would let another person verify the result.\n\nFinally, our conclusion may be substantial overlap, partial overlap, or a complementary practice. If we have not found a counterpart, we will state which sources we reviewed.\n\nThis lets us study the main question of this series without deciding the answer in advance. A useful comparison can show shared engineering ideas. And it can still show important differences in scope, detail, and expected evidence.",
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
      "id": 19,
      "title": "What process 5.1 asks for",
      "seconds": 145,
      "section": "Planning secure development",
      "kicker": "EP01 / 19",
      "layout": "steps",
      "lead": "Five requirements that connect the present to the next action",
      "items": [
        {
          "label": "5.1.2.1",
          "text": "Periodically analyse the current state"
        },
        {
          "label": "5.1.2.2",
          "text": "Periodically analyse resource needs"
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
      "notes": "Now we can read the first process directly. Section five point one is about planning secure software development processes.\n\nIt has five requirements. Periodically analyse the current state of the processes. Periodically analyse resource needs. Develop a plan for improving the processes. Develop a plan for implementing them. And define their scope.\n\nThe two plans must take the analyses into account. That connection matters. A plan can look good on paper. But if it ignores what the team does today, or what resources the team has, it may be impossible to carry out.\n\nI use process improvement plan as a working English label for the plan of process development. In a moment we'll see how it differs from the implementation plan.\n\nFor our small team, the first step is to describe what already happens and what does not. Then we find the biggest gaps. We estimate the capacity needed to close them. And we assign work the team can really do.\n\nThe standard requires periodic analysis, but it does not give us a universal ninety-day schedule. The schedule later in this episode is an illustrative choice for our example.\n\nOne caution before we build the plan. The standard also carries an informative appendix A, initialisation of secure development processes. It repeats almost the same steps for a team that is only starting these processes. Analyse the current state. Analyse the resources needed. Write the result down as a plan. Its artifacts are almost word for word the same as the ones in five point one. The difference is status. Under clause four point sixteen, assessment of the appendix A processes is not mandatory during an external audit. Clause five point one is a full process, and it is assessed. So if you are deciding which of these two very similar texts to implement, that difference is what settles it.",
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
      "id": 20,
      "title": "Start with a defensible scope",
      "seconds": 100,
      "section": "Planning secure development",
      "kicker": "EP01 / 20",
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
      "notes": "What exactly does the plan cover? In our example, the scope includes version two point zero of the importer, its parser module, the small service API, and the libraries that ship with it.\n\nThe repository, the integration configuration, and the release workflow form relevant development context. We record links to them, so the plan connects to actual work.\n\nSuppose the team also has an old prototype. It may sit outside the chosen scope. But the team needs a reason. If code or a dependency from that prototype goes into the release, the boundary needs another look.\n\nThe standard's scope artifact lists the parts the software is made of. That means versions, modules, components and functional subsystems. It also gives the reason for that selection. If we name a product but do not name its relevant parts, we leave room for misunderstanding.\n\nThis is not permission to declare inconvenient components irrelevant. The rationale must make sense for the product and for the obligations that apply to it. In a teaching example, we can keep the scope small. For a real implementation, the team needs to look at the actual relationships. And it needs to keep the boundary up to date as the product changes.",
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
      "id": 21,
      "title": "Assess reality and assign owners",
      "seconds": 95,
      "section": "Planning secure development",
      "kicker": "EP01 / 21",
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
      "notes": "Let's start with three questions. What already works? What needs improvement? What is missing? Introducing a standard does not mean rebuilding everything from zero.\n\nThe current-state record lists which processes are in place and which are not. It assesses the existing processes against this standard, against other standards that apply, and against the team's tools and technologies.\n\nIn our example, parser checks run by hand. Coverage is unclear. The decision history is incomplete. These are fictional findings.\n\nNow we assign responsibilities. The engineering lead owns integration. The AppSec lead helps define investigation criteria and review security evidence. The release owner records decisions under the team's policy. A sponsor resolves conflicts about capacity and priority.\n\nOne person may hold several roles. Even then, it must stay clear who is responsible and who decides.\n\nThis allocation is our implementation example. The standard's implementation-plan artifact must identify the employees responsible for implementing the processes. It does not automatically give AppSec an independent power to block every release. The organization must define that authority. And it must make the link between investigation, review, and the release decision clear.",
      "sourceIds": [
        "G24",
        "EX"
      ]
    },
    {
      "id": 22,
      "title": "Resources include human attention",
      "seconds": 95,
      "section": "Planning secure development",
      "kicker": "EP01 / 22",
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
      "notes": "Resource planning includes time. Time to set up the checks. Time to investigate findings. Time to keep the workflow running. And time to teach people how to use it.\n\nHere's our ninety-day effort. It's fictional. We reserve sixty engineering hours, twenty-four AppSec hours, and twelve hours for release coordination and sponsor decisions. The total is ninety-six person-hours.\n\nThese figures are a teaching example. They are not a benchmark. They are not a percentage required by GOST. No universal percentage can replace an estimate of the actual work.\n\nTools, infrastructure, and the cost of extra training need their own assessment. Dependencies matter too. If the build engineer is not available during the first month, the schedule must show that. Assigning a task does not create capacity.\n\nThe standard's resource-analysis record may include an estimate of the material and human resources the work will need. The chart makes those assumptions open to discussion. Ask the people doing the work if the estimate is realistic. Show it to the people who set priorities. Agree when to update it. Human attention is part of the resource plan.",
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
      "id": 23,
      "title": "Two plans, two questions",
      "seconds": 100,
      "section": "Planning secure development",
      "kicker": "EP01 / 23",
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
      "notes": "Planning gives everyone a shared language: the team, its managers, and the people who ask for the product. Two related plans help them agree on the direction and the work.\n\nThe improvement plan describes how processes will develop. It sets priorities and the order of changes. It takes available resources into account. Our team might make parser analysis repeatable, improve the handling of findings, and then review the results.\n\nThe implementation plan identifies goals, stages, dates, resources, and responsible people. In the middle of the diagram, one task names the parser target, the integration milestone and the owner. On the right, the evidence records coverage and the review of findings.\n\nThe standard allows these plans to be represented in a task management system. A roadmap with linked tasks can keep their different purposes clear, and avoid documents that sit apart from the work.\n\nHere's the practical test: traceability. Why was this change chosen? Which resource assumption supports it? Who does the work? What shows that a stage is finished? A planning page becomes useful when the team can follow those links and act on them.",
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
      "id": 24,
      "title": "A 90-day plan for the importer",
      "seconds": 135,
      "section": "Worked example",
      "kicker": "EP01 / 24",
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
      "notes": "Let's put those parts together in a ninety-day example. The product is the engineering-file importer. Our first goal is to handle findings from parser analysis the same way every time, and to make that work easy to review.\n\nIn days one to thirty, the team confirms the software scope. It writes down the current state. It reviews the resource estimate. It names the owner of each planned action, and the person responsible for the release decision. The result is a small baseline that anyone can look at.\n\nIn days thirty-one to sixty, the engineer connects the chosen parser checks to continuous integration. The team writes down which source targets and configurations are covered. Every finding gets a review record, and the release workflow links to that record.\n\nIn days sixty-one to ninety, the team looks at evidence from two example release cycles. Did the checks run on the intended versions? Did every finding get a decision? Was the agreed capacity enough? The answers shape the next improvement plan.\n\nThe ninety-day period, the two releases, and the detailed tasks are our choices. They do not come from the standard. And finishing this example does not establish conformity with every process in the document.\n\nFor implementation of this GOST, section four point thirteen requires the following in the development environment. Version control. Continuous integration. And task management, including defect tracking. It does not say continuous deployment. That difference is useful when we explain our pipeline choices.",
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
      "id": 25,
      "title": "Five linked records of evidence",
      "seconds": 95,
      "section": "Worked example",
      "kicker": "EP01 / 25",
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
      "notes": "The standard names five matching kinds of evidence. Current-state analysis. Resource analysis. The improvement plan. The implementation plan. And the scope, with the reasons for choosing it.\n\nThese are five kinds of information, not an instruction to create five separate Word files. Existing systems can carry this work. A planning page can link to repository and task records you already keep.\n\nIn our example, the scope names the importer version and components. The baseline links to the checks that ran. The resource record holds estimates and assumptions. The improvement plan explains priorities. The implementation tasks name owners and milestones.\n\nThe standard recognizes forms such as electronic files, logs, and tool results. Choose a form that carries the required information and keeps it traceable.\n\nA one-page template is only an entry point. It does not replace the analysis behind it, and it does not prove effectiveness. A reviewer should be able to follow the links. They should find the right version, understand the decisions, and see which questions are still open. Automation helps when it keeps those connections.",
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
      "id": 26,
      "title": "Every process is written the same way",
      "seconds": 150,
      "section": "Worked example",
      "kicker": "EP01 / 26",
      "layout": "cards",
      "lead": "One shape for all 25 processes: name, goals, requirements, artifacts",
      "items": [
        {
          "label": "Name · 5.1",
          "text": "Planning secure software development processes"
        },
        {
          "label": "Goals · 5.1.1",
          "text": "What the process is for · 5.1.1.1 to 5.1.1.3"
        },
        {
          "label": "Requirements · 5.1.2",
          "text": "What to do · 5.1.2.1 to 5.1.2.5"
        },
        {
          "label": "Artifacts · 5.1.3",
          "text": "What to show afterwards · 5.1.3.1 to 5.1.3.5"
        },
        {
          "label": "In every episode",
          "text": "Goals to understand · then compare · requirements and artifacts to apply"
        }
      ],
      "quote": "",
      "notes": "Before the crosswalk, here is your reading key for the other twenty-four episodes.\n\nClause four point eight says every process has the same four parts. The name of the process. Its goals. Its implementation requirements. And its artifacts of requirement implementation. I will say artifacts, or evidence.\n\nThe numbering follows that shape. Five point one is the name: planning secure software development processes. Goals come first, then requirements, then artifacts. You saw the five requirements earlier, and the five records a moment ago.\n\nSo open any process and read it in that order. What is the work for? What must we do? What must we be able to show afterwards?\n\nTwo details help with the artifacts. Clause four point eleven keeps the form open. An artifact is any information, in any form, that lets someone confirm the requirement was met. A document, a report, a file, a log, the result of a tool or a process. Then read the verb. Here, four of the five records must contain the listed information. For the resource analysis, the verb is may.\n\nIn most of the later processes, the first artifact is what the standard calls a reglament. In English, a written procedure. As a rule, it must cover two things. The duties and roles of the staff, and the details of how the process is carried out. The standard sets no format for it.\n\nThis shape also gives us the plan for every episode. Goals answer our first question: what problem does the process address? Requirements and artifacts answer the third: what can a team do and verify? The second question, the comparison, is where we go next.",
      "sourceIds": [
        "G24"
      ]
    },
    {
      "id": 27,
      "title": "A first international crosswalk",
      "seconds": 110,
      "section": "Comparison result",
      "kicker": "EP01 / 27",
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
      "notes": "Let's make a small comparison, with clear limits. In GOST, the implementation-plan artifact identifies the employees responsible for implementing the processes. NIST SSDF task P O two point one covers roles and responsibilities for secure software development. There is a useful shared concern. People need to know which work belongs to them.\n\nBut the comparison is partial. The GOST artifact also includes goals, timing, stages, and resources. That single SSDF task does not by itself reproduce the complete artifact.\n\nNow look at process improvement. In OWASP SAMM, the Strategy and Metrics practice gives us a useful link. It focuses on an improvement strategy and a roadmap. Again, we need to examine the details, and the purpose of the model, before we claim equivalence.\n\nThese comparisons help us read the first process in a wider engineering context. They do not establish that following one document automatically satisfies the other.\n\nSo our first conclusion is a modest one. Planning, responsibility, and improvement have international counterparts we can recognize. But the exact structure, the wording, and the expected evidence still need to be examined, requirement by requirement. The notes with this episode keep those limits and the source versions.",
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
      "id": 28,
      "title": "Would this survive Friday's release?",
      "seconds": 95,
      "section": "Apply it",
      "kicker": "EP01 / 28",
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
      "notes": "Let's go back to Friday's warning. A plan will not tell us by itself whether that warning is a real vulnerability. The plan helps organize the investigation and the decision.\n\nWe can name the affected version and component. We can find the owner of the investigation, and the person authorized to make the release decision. And we can see what evidence we have, and which results are missing.\n\nWeak planning is easy to spot too. An analyzer with no review owner is incomplete. A roadmap with no capacity is unreliable. A scope with no rationale is hard to defend.\n\nFor this team, I would review the plan after ninety days, and after a material change, such as adding a parser. These are our own recommendations for implementation.\n\nIn a small team, one person may hold several responsibilities. Make the arrangement explicit, and check the capacity. Scaling the implementation does not establish that applicable requirements can be ignored.\n\nHere is the practical test. Can another team member understand the next action? If only the author can explain the plan, then improve it.",
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
      "id": 29,
      "title": "Security Training That Changes Engineering Decisions",
      "seconds": 105,
      "section": "Stay in touch · Next episode",
      "kicker": "EP01 / 29",
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
      "notes": "Today we followed the Russian standard from the early discussions to the editions that were adopted. We connected that history to international work. And we used its first process to organize a practical improvement effort.\n\nYour next step is simple. Choose one product, and start your planning page. Describe the current state. Name the next improvement. Then connect it to an owner, to the capacity you have, and to evidence someone can review. The worksheet with this episode will help you start.\n\nI am Vitaliy Pikov. You can find me at pikov dot expert. Please keep in touch, and share the questions you would like this series to explore.\n\nThe next episode is called Security Training That Changes Engineering Decisions. We'll look at employee training under clause five point two. What do different roles need to learn? How do we practise those skills? And what evidence can show progress beyond attendance?\n\nWe'll build a role and skills matrix, and use a short exercise before and after the training. So, which engineering decision would you most like your security training to improve? Thank you for watching. See you in episode two.",
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
