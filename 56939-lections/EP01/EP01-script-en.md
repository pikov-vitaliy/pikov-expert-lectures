# EP01 — Where Secure Development Begins

Full spoken English script. Author: Vitaliy Pikov. Prepared: 2026-09-06.
Target: 40:00, including pauses and slide changes. Timings are rehearsal targets, not a measured recording. Text after `Speech:` is spoken; metadata and `Cue:` are not.
Working translations of GOST clauses are the author's, not an official English translation.

Revised after reading the complete July 2025 PVS-Studio webinar transcript. Historical recollections are attributed; adopted editions and requirement wording are checked against final texts.

## 01 | Where secure development begins
Seconds: 60
Section: Welcome
Layout: cover
Lead: History, GOST and a working process
Items:
- EP01 / 25 | Planning secure software development processes
Sources: G24
Speech:
Hello, and welcome. I am Vitaliy Pikov. I work with secure software development processes, and I teach the engineering ideas behind them.

This is the first episode of Secure Software Development in Practice. We will explore twenty-five processes from a Russian national standard, GOST R 56939-2024, and compare them with international approaches.

Our question is simple: what can a development team actually use?

Today, we will look at the history behind the subject, learn how to read this standard, and build a small example of a security process plan. You do not need previous knowledge of Russian standards. Bring your experience of building software, reviewing it, or helping a team deliver it safely.
Cue: Улыбка, короткая пауза после вопроса. Не читать цифровой номер слишком быстро.

## 02 | One process. One useful result.
Seconds: 90
Section: The series
Layout: cards
Lead: A practical question for every episode
Items:
- Understand | What problem does the process address?
- Compare | Where do international practices overlap or differ?
- Apply | What can a team do and verify?
Sources: G24, TRANS
Speech:
This series builds on an earlier Russian-language webinar project that I delivered with PVS-Studio. For this English series, I want to extend that work through a systematic comparison with international practices.

Each episode will focus on one process. We will ask three questions. What problem does it address? How do other approaches address a similar problem? And what evidence would show that a team has put the process into practice?

The audience includes developers, AppSec practitioners, and technical leaders. You may write code, design a delivery pipeline, or decide where the team should invest its limited time. Each of those perspectives matters.

I am also using this project to develop my professional English and deepen my own research. I will explain unfamiliar terms, identify the sources, and make corrections visible when they are needed.

By the end of an episode, you should have something useful to discuss with your team: a small checklist, a decision record, or an example you can adapt to your own environment.
Cue: Личный мотив произнести спокойно, без извинений за английский. Архивное происхождение подтверждено презентацией 2025 года.

## 03 | Twenty-five processes, connected
Seconds: 90
Section: The series
Layout: steps
Lead: EP01 ↔ clause 5.1 · EP25 ↔ clause 5.25
Items:
- Organize | Plan the work, develop skills and assign responsibility
- Engineer | Address threats, design, code, dependencies and builds
- Verify | Review, analyze and test
- Sustain | Deliver updates, handle weaknesses and improve
Sources: G24
Speech:
The standard gives us the structure of the series: twenty-five processes, and twenty-five core episodes. Episode one follows section five point one. Episode twenty-five follows section five point twenty-five.

The four groups on this slide are my teaching guide. They are not additional categories defined by the standard. They help us see how planning, engineering, verification, and continued support connect.

For example, a static analysis result is useful only when we know what code was analyzed, who reviews the findings, and how a correction reaches a release. A dependency inventory is useful only when somebody maintains it and acts on relevant changes.

We will keep returning to those connections. Some episodes will include a guest who can explain a specific practice from direct experience. Every core episode will still have its own practical result.

You can follow the complete series or choose an episode that matches a current problem. Today establishes the vocabulary and a planning example that later episodes can extend.
Cue: Показать четыре группы. Уточнение «my teaching guide» важно: это не новая классификация ГОСТ.

## 04 | Friday's release is blocked
Seconds: 120
Section: The engineering problem
Layout: cards
Lead: Illustrative case · a C++ engineering-file importer
Items:
- A warning | A parser issue appears just before release
- A gap | Nobody agreed who investigates it
- A decision | The release owner lacks reliable evidence
Sources: EX, TRANS
Speech:
Let us begin with a small fictional team. It develops a C++ tool that imports engineering files. The product also has a small service API, uses third-party components, and ships regular updates.

On Friday afternoon, an analysis tool reports a possible memory error in the file parser. The developer says the finding needs investigation. The security specialist asks whether the affected parser is part of the release. The release owner asks whether there is time to fix it.

The tool has produced information, but the team has not agreed how to use it. There is no clear scope, no allocated investigation time, and no recorded decision process.

We cannot solve that entire situation by buying another tool. We need people who understand their responsibilities, suitable tools, and a repeatable way of working. We also need evidence that connects those elements to the actual product version.

The earlier webinar made a related point: an organization may already use an analyzer, yet still need to examine its coverage, configuration, and follow-up. Before proposing another purchase, find out what the team already does and where the actual gap is.

Keep this team in mind. At the end of the episode, we will return to Friday's release with a more useful set of questions.
Cue: История вымышленная. Не говорить, что это конкретный проект заказчика или реальный инцидент.

## 05 | A landscape of secure development methods
Seconds: 90
Section: The methodology landscape
Layout: timeline
Lead: Selected publication / edition dates in a 28-methodology review
Items:
- 2004 | Lifecycle research · Jones and Rastogi
- 2006 | SDL · Touchpoints · CLASP
- 2012 | Microsoft SDL guidance v5.2 / SDL-Agile
- 2020 | OWASP SAMM v2.0
- 2022 | NIST SSDF v1.1
Sources: MLR, MSH, SAMM20, N11
Speech:
The history of secure development contains several parallel approaches. A useful map is the twenty twenty-three review by Arina Kudriavtseva and Olga Gadyatskaya. It examines twenty-eight methodologies through publications from two thousand four to twenty twenty-two, drawn from industry, government, and academia.

This slide selects five publication milestones. Early lifecycle research is followed by the SDL, Touchpoints, and CLASP publications. Later examples include guidance for agile development, version two of OWASP SAMM, and NIST's SSDF version one point one.

These are dates of the publications or editions we are discussing. They are not all dates when the underlying ideas first appeared. Microsoft, for example, made SDL integral to its development process in two thousand four; the SDL book discussed in the review appeared in two thousand six.

The picture is a landscape of different ways to organize secure development. We should examine what each approach contributes, rather than assume that the newest publication replaces every earlier idea.
Cue: Все годы на шкале — выбранные публикации/редакции. В локальном PDF Figure 2 и Table II имеют расхождения; наша шкала собрана по Table II с явными подписями. Не переносить рисунок целиком.

## 06 | Different ways to organize the work
Seconds: 90
Section: The methodology landscape
Layout: cards
Lead: What the reviewed approaches emphasize
Items:
- Microsoft SDL | A coordinated engineering programme
- Touchpoints | Risk management, architecture and code review
- CLASP | Activities connected to roles
- SDL-Agile | One-time · every-sprint · bucket activities
Sources: MLR
Speech:
The review helps us look beyond names. Different approaches give a team different ways to organize its security work.

Microsoft SDL connects engineering practices with management support and training. Gary McGraw's Touchpoints emphasizes risk management, including architecture analysis and code review. CLASP connects activities to roles. The agile SDL guidance distinguishes activities performed once, in every sprint, or periodically from a group of activities called a bucket.

That last distinction is practical. A team needs a reasoned schedule for security work; repeating every activity in every sprint is not automatically the best design.

The review also discusses maturity approaches. SAMM helps structure capability improvement, while BSIMM describes practices observed in organizations. Those purposes differ from giving a developer the next implementation task.

For our importer team, the shared questions are recognizable: which activity do we need, who performs it, and when? The approaches provide useful answers at different levels. Their activities still need to be interpreted in the context of the actual product and team.
Cue: Это характеристика рассмотренных в обзоре редакций, не исчерпывающее описание современных frameworks. Bucket объяснить как группу периодических работ; не как произвольное пропускание проверок.

## 07 | Before the standard: a practical problem
Seconds: 120
Section: The origins of GOST R 56939
Layout: cards
Lead: A participant's account of the problem before formal drafting
Items:
- Around 2009 | Discussions with colleagues and regulators
- The engineering gap | Product assessment also needs confidence in development work
- The intended result | A common reference usable by different development teams
Sources: TRANS, GOSTH
Speech:
Why did Russia develop a national standard for secure software development? The earlier webinar gives us a useful account from someone involved in that work: Vitaliy Varenitsa.

In the July twenty twenty-five discussion, he recalled conversations with colleagues and regulators beginning around two thousand nine. The practical concern was that assessing a finished product did not, by itself, explain how security work was organized throughout its development.

The proposed standard would make that work more explicit. Developers needed a common reference for activities, responsibilities, and the evidence supporting a claim that the activities had been performed.

This was intended to be useful beyond the internal development method of one large software vendor. Different organizations, including smaller teams, should be able to understand the expectations and adapt their implementation to their own products.

There is an important historical boundary here. Around two thousand nine is the starting point recalled by a participant. It is not the approval date of a standard, and it does not mean that secure development began in Russia at that moment.

For our series, the useful question is the problem the authors were trying to solve: how do we turn security intentions into work that other people can understand and evaluate?
Cue: TRANS 00:08:01–00:14:32. Около 2009 — воспоминание участника, не дата утверждённого документа. Не объявлять отсутствие требований во всём мире.

## 08 | The route from research to publication
Seconds: 120
Section: The origins of GOST R 56939
Layout: timeline
Lead: Research start, working drafts, approval and effective date are distinct events
Items:
- 2013 | April: research project starts · August: first draft
- 2014–2015 | Draft review and revision
- 2016 | Approved 1 June · Rosstandart order 458-st
- 2017 | Effective from 1 June
Sources: TRANS, GOSTH, G16
Speech:
The transcript makes the next date more precise. April twenty thirteen marks the start of the research project that supported development of the standard. Varenitsa explains that preparatory discussions and the formation of the author team came earlier.

The retrospective presentation places the first draft in August twenty thirteen. Further drafts and revisions followed in twenty fourteen and twenty fifteen. It describes discussion involving twenty-two organizations and around two hundred comments and proposals.

Those numbers describe the consultation reported in the historical presentation. They do not mean that twenty-two organizations are named as developers in the final standard.

For the formal publication history, we use the official record. Rosstandart approved GOST R five six nine three nine, edition twenty sixteen, on the first of June twenty sixteen, under order four five eight, s t. It became effective on the first of June twenty seventeen.

Keep the four events separate: research began, drafts were discussed, the standard was approved, and the standard became effective. A year in a document's designation does not replace that chronology.

This distinction also helps us read later revisions. A working draft can contain valuable ideas without being an adopted edition of the national standard.
Cue: TRANS 00:17:33–00:20:19; PDF истории с.4; предисловие ГОСТ 2016 и карточка Росстандарта. В речи не повторять «принят Минюстом» и ошибочный май 2016.

## 09 | Who wrote it, and who was it for?
Seconds: 90
Section: The origins of GOST R 56939
Layout: cards
Lead: Formal authorship, consultation and intended users play different roles
Items:
- 2016 development | NPO Echelon · submitted by Technical Committee 362
- Consultation | Other organizations reviewed and commented on drafts
- Primary users | Developers, architects, security specialists and team leaders
- Additional users | Independent assessors reviewing implementation evidence
Sources: G16, TRANS
Speech:
The foreword of the twenty sixteen edition names NPO Echelon as the developer and Technical Committee three six two as the submitting committee.

In the webinar, Varenitsa describes a small author group doing the main drafting work, while other organizations reviewed the proposals and raised comments. That account helps us distinguish writing a document from participating in its consultation.

He also stresses the intended audience. The standard was primarily for the people developing software: architects, programmers, security specialists, and the people organizing their work. Independent assessors were another audience because they needed to evaluate how those practices were implemented.

That is a useful design tension. The material needs to guide engineering work, while also making the results understandable to somebody reviewing it from outside the team.

For our importer example, a procedure should help the developer investigate a finding and help a reviewer understand what happened. A document that only satisfies a filing requirement misses much of that practical purpose.

The standard, a team's implementation, and a particular certification scheme remain distinct subjects. We should identify the actual assessment context before discussing which form of confirmation is required.
Cue: TRANS 00:19:00–00:24:25, 01:14:03–01:17:27. Формальное авторство — предисловие 2016. Не превращать целевую аудиторию в обещание универсальной сертификационной процедуры.

## 10 | A wider plan than one published document
Seconds: 90
Section: The origins of GOST R 56939
Layout: compare
Lead: The original ambition and the published record answer different questions
Items:
- Original ambition | A family of documents covering several perspectives on development
- Published baseline | GOST R 56939-2016, followed by GOST R 56939-2024
- Working material | Recalled drafts and revisions do not establish adopted editions
Sources: TRANS, G16, G24
Speech:
Another detail in the transcript changes the way we tell this history. The original ambition was broader than a single document.

Varenitsa recalls discussions about a family of standards that would address secure development from several perspectives and across the software lifecycle. The number and arrangement of those documents changed during discussion. The twenty sixteen standard was the first published result of that wider intention.

We should describe that as the author's account of the plan. We should not invent an officially approved series structure or assume that every planned volume later appeared.

The same care applies to versions. The speaker mentions working material from twenty eighteen, twenty nineteen, twenty twenty, and twenty twenty-two. Those references show continuing revision work. They do not establish published national standards with those edition years.

The two adopted editions relevant to this episode are twenty sixteen and twenty twenty-four. For each one, we can identify a final text and an official approval record.

This gives us a simple research habit: use recollections to understand intentions and decisions, and use publication records to establish which document actually became the standard.
Cue: TRANS 00:09:41–00:11:06, 00:18:19–00:20:19, 00:29:25. Не называть внутренние версии 2018/2019/2020/2022 опубликованными редакциями ГОСТ.

## 11 | International roots, without a copying claim
Seconds: 120
Section: The origins of GOST R 56939
Layout: compare
Lead: Earlier international work informed the context; chronology limits ancestry claims
Items:
- Design context | Common Criteria · ISO/IEC 27034 · lifecycle standards
- GOST R 56939 | Approved in 2016
- NIST SSDF | Public draft 2019 · final 1.0 in 2020 · final 1.1 in 2022
Sources: TRANS, GOSTH, G16, N19, N20, N11
Speech:
An original national standard can still draw on international engineering knowledge. These are compatible ideas.

The webinar and historical presentation describe the context of Common Criteria, information security management, and software lifecycle standards. Varenitsa's account presents the goal as a usable common reference, rather than a direct translation of one vendor's development methodology.

The twenty sixteen standard itself connects its use to ISO slash IEC twenty-seven thousand thirty-four and Common Criteria assurance components. Its informative appendix includes a related mapping.

That does not prove that every practice was new. We have already seen earlier work on secure development. To establish a specific borrowing or a specific difference, we need to compare the relevant texts.

NIST's Secure Software Development Framework gives us a useful chronological check. Its public draft was announced in June twenty nineteen. Final version one point zero followed in April twenty twenty, and version one point one in February twenty twenty-two.

The twenty sixteen GOST therefore cannot have been based on those later SSDF publications. At the same time, being earlier than SSDF does not prove that GOST was the first secure development approach in the world. Nor does similarity prove influence in the opposite direction.

Our comparison asks a more useful question: which engineering concerns are shared, how are obligations organized, and what evidence does each approach expect? That is something we can investigate process by process.
Cue: TRANS 00:10:19–00:14:32; PDF истории с.3/22. NIST: 11.06.2019 draft, 23.04.2020 final1.0, 03.02.2022 final1.1. Не повторять ошибку пересказа «ГОСТ основан на SSDF» и неподтверждённое мировое первенство.

## 12 | Two editions, different structures
Seconds: 90
Section: From the 2016 edition to 2024
Layout: cards
Lead: Re-read the final text before claiming equivalence
Items:
- 2016 edition | Nine groups of measures · clauses 5.1–5.9
- 2024 edition | Twenty-five named processes · clauses 5.1–5.25
- A wording change | «Следует»: recommendation in 2016 · requirement in 2024
- Migration | Map obligations and evidence; preserve practices that work
Sources: G16, G24, TRANS
Speech:
What changed between the two adopted editions? Start with the final documents, because numbers mentioned in a discussion can describe a different grouping.

Section five of the twenty sixteen standard contains nine groups of measures. Section five of the twenty twenty-four edition contains twenty-five named processes. These are different units of organization. Subtracting the numbers does not tell us how many genuinely new practices appeared, or how much safer a product became.

There is also a concrete wording change. The Russian word shown on the slide, sleduyet, expresses a recommendation under clause four point two of the twenty sixteen edition. Under clause four point seven of the twenty twenty-four edition, it expresses a requirement.

That is why reusing an old checklist without reading the new edition is risky. Familiar words can carry different force.

The twenty twenty-four edition was approved in October and became effective in December of that year. Moving to it calls for a gap analysis: which obligations and evidence are already covered, which need adjustment, and which need new work? Effective existing practices are a starting point for that analysis.
Cue: Оглавление и п.4.2 ГОСТ2016; оглавление и п.4.7 ГОСТ2024. В записи «14 мер» не совпадает с девятью группами финального оглавления. 2024: утверждён24.10, действует20.12. Английский перевод модальности пояснить по конкретной редакции.

## 13 | A process continues after the first tool run
Seconds: 90
Section: From the 2016 edition to 2024
Layout: steps
Lead: A useful lesson from the webinar's discussion of measures and processes
Items:
- Trigger | What event starts the work?
- Ownership | Who performs it and who reviews the result?
- Evidence | Which version, findings and decisions are recorded?
- Feedback | What changes before the next cycle?
Sources: TRANS, G24, EX
Speech:
The webinar contains a useful debate about the language of measures and processes. One concern is that changing a heading does not, by itself, improve engineering. Another point is that a process emphasizes work that continues and is managed over time.

A memorable example is buying an analysis tool for a short period just before a release. That may produce a report. It does not automatically establish a maintained process for examining changes, reviewing findings, fixing problems, and checking the result again.

For our importer team, define the trigger, the owner, the recorded evidence, and the feedback into the next cycle. A relevant code change could trigger analysis. A named engineer could review the findings. The record should connect the finding and decision to the product version.

These four questions are our teaching device, not a quotation defining every process in GOST. The twenty sixteen edition also addressed lifecycle work; we should not portray it as a collection of one-time tool runs.

The practical lesson is that a tool becomes useful within an organized way of working. Planning gives the team the capacity and agreements needed to sustain that work.
Cue: TRANS 00:49:47–00:51:26 и 01:25:22–01:27:08: позиции собеседников различаются. Четыре вопроса — авторский учебный приём; не приписывать 2016 отсутствие регулярных практик.

## 14 | Shared practices need evidence
Seconds: 90
Section: Our comparison method
Layout: compare
Lead: Findings and limits of the multivocal literature review
Items:
- Shared practices | Similar engineering work, organized in different ways
- Organizational work | Risk, culture, people, policy and communication matter
- Effectiveness evidence | Limited and uneven validation of complete methodologies
Sources: MLR, N11, N12, TRANS
Speech:
What does the literature review allow us to conclude? It identifies substantial overlap in practices, together with organizational concerns such as risk management, culture, policies, and communication.

Its synthesis distinguishes organization-level work, work across the lifecycle, and activities associated with a project stage. A security programme therefore involves more than a list of tools.

Evidence about complete methodologies is less consistent. That does not show that secure development fails. It means we must examine the evaluation method, context, and result being measured.

The review selected accessible English-language material. Its omission of GOST cannot establish that the Russian standard is unique.

The webinar also includes personal judgments about maturity, cost, and effectiveness. Those judgments can suggest research questions; they do not establish general conclusions on their own.

We will compare specific practices and evidence using identified versions. Our NIST baseline is final SSDF one point one. Version one point two remains a draft at our September twenty twenty-six check. Let us make the comparison method explicit.
Cue: Результат обзора не равен доказательству причинного снижения уязвимостей. Не говорить «доказательств вообще нет» и не интерпретировать авторскую разметку Waterfall/Agile как статистику отрасли.

## 15 | Compare obligations, not labels
Seconds: 90
Section: Our comparison method
Layout: steps
Lead: Similar goals can still imply different work
Items:
- Read | Actor · action · scope · conditions
- Compare | Shared intent and concrete differences
- Demonstrate | One implementation example with evidence
- Conclude | Partial overlap is a useful result
Sources: G24, N11
Speech:
Here is the method we will use. First, we identify a specific requirement or practice. We record who acts, what they do, the scope, and any conditions. Then we compare the actual work and the expected result.

We also preserve the strength of the original wording. In this GOST, both the Russian words dolzhen and sleduyet express a required condition. Translating every occurrence of sleduyet as an optional English should would lose that meaning.

On the international side, we identify whether we are reading framework guidance, a requirement, or an example of implementation. Similar wording does not automatically give two documents the same authority.

Our conclusion may be substantial overlap, partial overlap, or a complementary practice. If we have not found a counterpart, we will state which sources we reviewed.

This lets us investigate the series' central question without deciding the answer in advance. A useful comparison can reveal shared engineering ideas and still show important differences in scope, detail, and expected evidence.
Cue: Русские термины объяснить, не превращать в упражнение для зрителя. Слайд даёт метод, не формальную сертификационную оценку.

## 16 | What process 5.1 asks for
Seconds: 90
Section: Planning secure development
Layout: steps
Lead: Five obligations that connect the present to the next action
Items:
- 5.1.2.1 | Periodically analyze the current state
- 5.1.2.2 | Periodically analyze resource needs
- 5.1.2.3 | Develop a process improvement plan
- 5.1.2.4 | Develop a process implementation plan
- 5.1.2.5 | Define the scope of the processes
Sources: G24
Speech:
We can now read the first process directly. Section five point one concerns planning secure software development processes.

It contains five requirements. Periodically analyze the current state of the processes. Periodically analyze resource needs. Develop a plan for improving the processes. Develop a plan for implementing them. And define their scope.

The two plans must take the analyses into account. That connection matters. A plan that ignores the team's current practices or available resources may be attractive on paper and impossible to execute.

I use process improvement plan as a working English label for the plan of process development. We will distinguish it from the implementation plan in a moment.

For our small team, the first action is to describe what already happens and what does not. We then identify the most significant gaps, estimate the capacity needed to address them, and assign realistic work.

The standard requires periodic analysis, but it does not give us a universal ninety-day schedule. The schedule later in this episode is an illustrative choice for our example.
Cue: Все пять требований на экране. Не объявлять квартал обязательной частотой ГОСТ.

## 17 | Start with a defensible scope
Seconds: 90
Section: Planning secure development
Layout: table
Lead: Name the software and explain the boundary
Items:
- Included | Importer 2.0 · parser module · service API · shipped libraries
- Connected context | Repository, CI configuration and release workflow
- Boundary to justify | Retired prototype with no code or dependency path into release
- Evidence | Versioned scope record with the selection rationale
Sources: G24, EX
Speech:
What exactly does the plan cover? In our example, the scope includes version two point zero of the importer, its parser module, the small service API, and the libraries that ship with it.

The repository, integration configuration, and release workflow form relevant development context. We record their links so that the plan can be connected to actual work.

Suppose the team also has an old prototype. It may be outside the selected scope, but the team needs a reason. If code or a dependency from that prototype is included in the release, the boundary needs another look.

The standard's scope artifact includes the software composition and a justification for the selection. Naming a product without identifying its relevant parts leaves room for misunderstanding.

This is not permission to declare inconvenient components irrelevant. The rationale must make sense for the product and its applicable obligations. For a teaching example, we can keep the scope small. For a real implementation, the team needs to examine the actual relationships and maintain the boundary as the product changes.
Cue: «Connected context» не смешивать с буквальным составом ПО из 5.1.3.5. Это полезные связанные записи примера.

## 18 | Assess reality and assign owners
Seconds: 90
Section: Planning secure development
Layout: cards
Lead: Illustrative findings, with people who can act
Items:
- Engineering lead | Parser checks run manually; coverage is unclear
- AppSec lead | Review findings and agree investigation criteria
- Release owner | Record release decisions under the team's policy
- Sponsor | Resolve capacity and priority conflicts
Sources: G24, EX, TRANS
Speech:
Begin with practices that already work, practices that need improvement, and capabilities that are missing. Introducing a standard does not mean rebuilding everything from zero.

The current-state record lists implemented and unimplemented processes. It assesses existing processes against this standard, other applicable standards, and the team's tools and technologies.

In our example, parser checks run manually, coverage is unclear, and decision history is incomplete. These are fictional findings.

We assign responsibilities. The engineering lead owns integration. The AppSec lead helps define investigation criteria and review security evidence. The release owner records decisions under the team's policy. A sponsor resolves capacity and priority conflicts.

One person may hold several roles. The arrangement must still make responsibilities and decision authority understandable.

This allocation is our implementation example. The standard's implementation-plan artifact calls for responsible employees. It does not automatically give AppSec an independent power to block every release. The organization must define that authority and make the relationship between investigation, review, and the release decision clear.
Cue: Отличать ответственного за действие от того, кто уполномочен принимать остаточный риск.

## 19 | Resources include human attention
Seconds: 90
Section: Planning secure development
Layout: cards
Lead: Illustrative 90-day estimate · validate it with the team
Items:
- Engineering | 60 person-hours
- AppSec | 24 person-hours
- Release and sponsor | 12 person-hours
- Total | 96 person-hours · tools and infrastructure assessed separately
Sources: G24, EX, TRANS
Speech:
Resource planning includes the time to configure checks, investigate findings, maintain the workflow, and teach people how to use it.

For our fictional ninety-day effort, we reserve sixty engineering hours, twenty-four AppSec hours, and twelve hours for release coordination and sponsor decisions. The total is ninety-six person-hours.

These figures are a teaching example. They are neither a benchmark nor a percentage required by GOST. Likewise, a percentage mentioned in the webinar is not a universal security budget.

Tools, infrastructure, and additional training costs need their own assessment. Dependencies matter too. If the build engineer is unavailable during the first month, the schedule must reflect that. Assigning a task does not create capacity.

The standard's resource-analysis artifact may contain estimated material and human resource indicators. Our table makes those assumptions discussable. Ask the people doing the work whether the estimate is credible, show it to those deciding priorities, and agree when to revise it. Human attention is part of the resource plan.
Cue: Сделать паузу на сумме 96. Часы для всего учебного плана, не недельная нагрузка.

## 20 | Two plans, two questions
Seconds: 90
Section: Planning secure development
Layout: compare
Lead: A roadmap and an execution plan can be linked in one tracker
Items:
- Improvement plan | What capability changes, in what order, with which resources?
- Implementation plan | What work happens, by whom, at which stage, and by when?
- Shared foundation | Current-state analysis and resource analysis
Sources: G24, EX, TRANS
Speech:
The webinar presents planning as a shared language for the team, its managers, and the people requesting the product. Two related plans help those people agree both the direction and the work.

The improvement plan describes how processes will develop. It sets priorities and the sequence of changes, considering available resources. Our team might make parser analysis repeatable, improve the handling of findings, and then review the results.

The implementation plan identifies goals, stages, dates, resources, and responsible people. A task can specify the parser target, integration milestone, owner, and expected evidence.

The standard allows these plans to be represented in a task management system. A roadmap with linked tasks can preserve their different purposes without creating disconnected documents.

The practical test is traceability. Why was this change selected? Which resource assumption supports it? Who performs it? What shows that a stage is complete? A planning page becomes useful when the team can follow those connections and act on them.
Cue: Не говорить, что стандарт требует два отдельных файла или конкретный формат Jira.

## 21 | A 90-day plan for the importer
Seconds: 120
Section: Worked example
Layout: timeline
Lead: Illustrative implementation choices, not a GOST timetable
Items:
- Days 1–30 | Confirm scope and baseline · assign owners · agree capacity
- Days 31–60 | Connect parser checks to CI · record coverage and triage decisions
- Days 61–90 | Review two release cycles · correct gaps · update the next plan
Sources: G24, EX
Speech:
Let us put those elements together in a ninety-day example. The product is the engineering-file importer. Our immediate objective is to make the treatment of parser analysis findings repeatable and reviewable.

During days one to thirty, the team confirms the software scope, records the current state, and reviews the resource estimate. It identifies the owner of each planned action and the person responsible for the release decision. The result is a small baseline that everybody can inspect.

During days thirty-one to sixty, the engineer connects the chosen parser checks to continuous integration. The team records which source targets and configurations are covered. Findings receive a review record, and the release workflow links to that record.

During days sixty-one to ninety, the team reviews evidence from two illustrative release cycles. It asks whether the checks ran on the intended versions, whether findings received decisions, and whether the allocated capacity was sufficient. The answers inform the next improvement plan.

The ninety-day period, two releases, and detailed tasks are our choices. They do not come from the standard. Also, completing this example does not establish conformity with every process in the document.

For implementation of this GOST, section four point thirteen requires version control, continuous integration, and task management, including defect tracking, in the development environment. It does not say continuous deployment. That distinction is useful when we explain our pipeline choices.
Cue: Здесь главная практическая пауза: провести взглядом по трём этапам. Не уходить в live demo настройки анализатора.

## 22 | Five linked records of evidence
Seconds: 90
Section: Worked example
Layout: steps
Lead: A one-page summary points to the underlying records
Items:
- 5.1.3.1 | Current-state analysis
- 5.1.3.2 | Resource analysis
- 5.1.3.3 | Process improvement plan
- 5.1.3.4 | Process implementation plan
- 5.1.3.5 | Scope and selection rationale
Sources: G24, EX, TRANS
Speech:
The standard identifies five corresponding kinds of evidence: current-state analysis, resource analysis, the improvement plan, the implementation plan, and scope with its selection rationale.

These are five kinds of information, not an instruction to create five isolated Word files. The webinar stresses that existing systems can support the work. A planning page can link to maintained repository and task records.

In our example, the scope identifies the importer version and components. The baseline links to checks that ran. The resource record captures estimates and assumptions. The improvement plan explains priorities. Implementation tasks identify owners and milestones.

The standard recognizes forms such as electronic files, logs, and tool results. Choose a form that supports the required information and traceability.

A one-page template is only an entry point. It does not replace the underlying analysis or prove effectiveness. A reviewer should be able to follow the links, identify the relevant version, understand the decisions, and see which questions remain unresolved. Automation helps when it preserves those connections.
Cue: На слайде артефакты 5.1.3.1–5; подробный шаблон приложен Markdown. Не обещать «одной страницы достаточно для соответствия».

## 23 | A first international crosswalk
Seconds: 120
Section: Comparison result
Layout: compare
Lead: Useful connections · bounded conclusions
Items:
- People | GOST 5.1.3.4 ↔ NIST SSDF PO.2.1 · partial overlap
- Improvement | GOST 5.1.2.3 ↔ SAMM Strategy & Metrics · partial overlap
- Difference | GOST explicitly identifies five planning evidence categories
Sources: G24, N11, SAMM
Speech:
We can now make a small, bounded comparison. The implementation-plan artifact in GOST includes responsible employees. NIST SSDF task P O two point one addresses roles and responsibilities for secure software development. There is a useful shared concern: people need to know which work belongs to them.

The comparison is partial. The GOST artifact also includes goals, timing, stages, and resources. That single SSDF task does not by itself reproduce the complete artifact.

For process improvement, OWASP SAMM's Strategy and Metrics practice provides a useful connection through its emphasis on an improvement strategy and roadmap. Again, we need to examine the details and the purpose of the model before claiming equivalence.

These comparisons help us interpret the first process in a wider engineering context. They do not establish that following one document automatically satisfies the other.

Our initial conclusion is modest: planning, responsibility, and improvement have recognizable international counterparts. The exact structure, wording, and evidence expectations still need to be examined requirement by requirement. The accompanying notes preserve those limits and the source versions.
Cue: PO.2.1 произнести «P O, two point one». Сопоставлены узкие положения, не все пять требований полностью.

## 24 | Would this survive Friday's release?
Seconds: 90
Section: Apply it
Layout: cards
Lead: A short review before calling the plan usable
Items:
- Scope | Which version and components are covered, and why?
- Capacity | Who has time and authority to act?
- Evidence | Can we trace an action to its result?
- Review | When do we revisit the assumptions?
Sources: EX, G24, TRANS
Speech:
Return to Friday's warning. A plan will not automatically tell us whether it is a real vulnerability. It helps organize the investigation and the decision.

We can identify the affected version and component, find the investigation owner, and locate the person authorized to make the release decision. We can see the existing evidence and the missing results.

Weak planning is recognizable too. An analyzer without a review owner is incomplete. A roadmap without capacity is unreliable. A scope without a rationale is difficult to defend.

For this team, I would review the plan after ninety days and after a material change, such as adding a parser. These are our implementation recommendations.

In a small team, one person may hold several responsibilities. Make the arrangement explicit and check capacity. Scaling the implementation does not establish that applicable requirements can be ignored.

The practical test is whether another team member can understand the next action. If only the author can explain the plan, improve it.
Cue: Дать зрителю 3–4 секунды на четыре вопроса. Период и триггеры пересмотра — авторский пример.

## 25 | Security Training That Changes Engineering Decisions
Seconds: 90
Section: Stay in touch · Next episode
Layout: closing
Lead: Next: EP02 · Employee training · GOST R 56939-2024, clause 5.2
Contact: Vitaliy Pikov | pikov.expert | https://pikov.expert
Items:
- Roles & skills | What each person needs to learn
- Practical learning | A short exercise before and after training
- Evidence of progress | Look beyond attendance to demonstrated skills
Sources: G24, EX
Speech:
Today, we followed the Russian standard from early discussions to its adopted editions, connected that history to international work, and used its first process to organize a practical improvement effort.

Your next step is simple: choose one product and start your planning page. Describe the current state, identify the next improvement, and connect it to an owner, available capacity, and reviewable evidence. The accompanying worksheet will help you get started.

I am Vitaliy Pikov. You can find me at pikov dot expert. Please keep in touch and share the questions you would like this series to explore.

The next episode is called Security Training That Changes Engineering Decisions. We will examine employee training under clause five point two: what different roles need to learn, how to practise those skills, and what evidence can show progress beyond attendance.

We will build a role and skills matrix and use a short exercise before and after training. Which engineering decision would you most like your security training to improve? Thank you for watching. See you in episode two.
Cue: Произнести «pikov dot expert», выдержать паузу у адреса. Название EP02 прочитать полностью. В конце оставить слайд с контактом и анонсом на несколько секунд; дата выпуска пока не объявлена.
