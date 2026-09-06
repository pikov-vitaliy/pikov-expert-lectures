# EP01 — Where Secure Development Begins

Full spoken English script. Author: Vitaliy Pikov. Prepared: 2026-09-06.
Target: 30:00, including pauses and slide changes. Timings are rehearsal targets, not a measured recording. Text after `Speech:` is spoken; metadata and `Cue:` are not.
Working translations of GOST clauses are the author's, not an official English translation.

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
Sources: G24
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
Seconds: 90
Section: The engineering problem
Layout: cards
Lead: Illustrative case · a C++ engineering-file importer
Items:
- A warning | A parser issue appears just before release
- A gap | Nobody agreed who investigates it
- A decision | The release owner lacks reliable evidence
Sources: EX
Speech:
Let us begin with a small fictional team. It develops a C++ tool that imports engineering files. The product also has a small service API, uses third-party components, and ships regular updates.

On Friday afternoon, an analysis tool reports a possible memory error in the file parser. The developer says the finding needs investigation. The security specialist asks whether the affected parser is part of the release. The release owner asks whether there is time to fix it.

The tool has produced information, but the team has not agreed how to use it. There is no clear scope, no allocated investigation time, and no recorded decision process.

We cannot solve that entire situation by buying another tool. We need people who understand their responsibilities, suitable tools, and a repeatable way of working. We also need evidence that connects those elements to the actual product version.

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

## 07 | How GOST R 56939 was developed
Seconds: 90
Section: The creation of GOST R 56939
Layout: timeline
Lead: Development history from Varenitsa's retrospective · formal dates from Rosstandart
Items:
- 2013 | April: drafting begins · August: first draft
- 2014–2015 | Final draft, then a revised final draft
- 2016 | Approved on 1 June · order 458-st
- 2017 | Effective from 1 June
Sources: GOSTH, G16
Speech:
Let us now examine the history of this particular Russian standard. GOST R identifies a Russian national standard, followed by its number and edition year.

In a retrospective presentation, Vitaliy Varenitsa describes the original problem. Vulnerability analysis and product assessment were already developing in Russia, but dedicated requirements for the development process were missing in that context. The proposed response was to make the process itself a subject of requirements and evidence.

According to his account, drafting began in April twenty thirteen, and the first draft followed in August. Further drafts appeared in twenty fourteen and twenty fifteen. Public discussion involved twenty-two organizations and around two hundred comments and proposals.

For the formal dates, we use Rosstandart's official record: approval on the first of June twenty sixteen, and entry into force on the first of June twenty seventeen.

This is a history of drafting, discussion, and refinement. It is more informative for our series than treating a standard as a document that simply appeared in its final form.
Cue: История и числа 2013–2015 / 22 / около 200 — доклад Вареницы, PDF-с. 2–4. Архивное «май 2016» исправлено по приказу 01.06.2016; месяц май не читать.

## 08 | International connections and the 2024 revision
Seconds: 90
Section: The creation of GOST R 56939
Layout: cards
Lead: Historical design context and the final text serve different purposes
Items:
- Historical connections | Common Criteria · ISO/IEC 27001 · lifecycle processes
- 2024 revision | Approved 24 October · effective 20 December
- 25 processes | Process name → goals → requirements → artifacts
- Source discipline | Retrospective for history · final edition for requirements
Sources: GOSTH, G24
Speech:
The same retrospective connects the standard with international ideas: Common Criteria, information security management, and software lifecycle processes. It also emphasizes introducing security procedures early in development.

These connections support the research question behind this series. They do not establish a direct copy of Microsoft SDL, or make all of those documents normative references in the current edition.

The twenty twenty-four revision replaced the twenty sixteen edition. It was approved on the twenty-fourth of October and took effect on the twentieth of December. The official record identifies several organizations involved in its development.

For this series, we follow its twenty-five processes. The final text gives each process a name, goals, requirements, and implementation artifacts. It does not tie those processes to one particular lifecycle model.

Some pages of the archived presentation still show draft material. We therefore use the retrospective to explain history and the final standard to state requirements. That distinction keeps the history useful while preventing an old proposal from becoming a current obligation in our explanation.
Cue: Связи с международными документами — PDF-с. 3 и 22. Это не таблица эквивалентности. Состав финальных нормативных ссылок не брать с PDF-с. 8/23; структура — финальный п. 4.8.

## 09 | Shared practices need evidence
Seconds: 90
Section: Our comparison method
Layout: compare
Lead: Findings and limits of the multivocal literature review
Items:
- Shared practices | Similar engineering work, organized in different ways
- Organizational work | Risk, culture, people, policy and communication matter
- Effectiveness evidence | Limited and uneven validation of complete methodologies
Sources: MLR, N11, N12
Speech:
What does the literature review allow us to conclude? The authors identify substantial overlap in practices, together with important organizational concerns. They discuss risk management, culture, human behavior, policies, and communication, among other topics.

Their synthesis distinguishes work at the organization level, work that crosses the lifecycle, and activities associated with a project stage. That helps explain why a security programme involves more than a list of tools.

Evidence about the effectiveness of complete methodologies is much less consistent. We should not turn that limitation into a claim that secure development does not work. It means we need to examine the evaluation method, the context, and the result being measured.

The review also selected accessible English-language material. Its omission of GOST cannot establish that the Russian standard is unique.

We will therefore compare specific practices and their evidence, using identified versions. Our NIST baseline is final SSDF one point one; version one point two remains a draft at our September twenty twenty-six check. Let us make the comparison method explicit.
Cue: Результат обзора не равен доказательству причинного снижения уязвимостей. Не говорить «доказательств вообще нет» и не интерпретировать авторскую разметку Waterfall/Agile как статистику отрасли.

## 10 | Compare obligations, not labels
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

## 11 | What process 5.1 asks for
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

## 12 | Start with a defensible scope
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

## 13 | Assess reality and assign owners
Seconds: 90
Section: Planning secure development
Layout: cards
Lead: Illustrative findings, with people who can act
Items:
- Engineering lead | Parser checks run manually; coverage is unclear
- AppSec lead | Review findings and agree investigation criteria
- Release owner | Record release decisions under the team's policy
- Sponsor | Resolve capacity and priority conflicts
Sources: G24, EX
Speech:
The current-state record lists implemented and unimplemented processes. It assesses the sufficiency and conformity of existing processes against this standard, other applicable standards, and the team's tools and technologies.

For the example, we record that parser checks run manually, coverage is unclear, and the decision history is incomplete. These are illustrative findings, not observations about a real organization.

We then assign responsibilities. The engineering lead owns the integration work. The AppSec lead helps define the investigation criteria and review the security evidence. The release owner records the release decision under the team's agreed policy. A sponsor resolves conflicts over capacity and priorities.

One person may hold several roles in a small team. What matters is that the responsibility and the decision authority are understandable.

This role arrangement is our implementation example. The standard's implementation-plan artifact calls for responsible employees, but it does not automatically give an AppSec specialist an independent power to block every release. That authority needs to be defined in the organization's own arrangements.
Cue: Отличать ответственного за действие от того, кто уполномочен принимать остаточный риск.

## 14 | Resources include human attention
Seconds: 90
Section: Planning secure development
Layout: cards
Lead: Illustrative 90-day estimate · validate it with the team
Items:
- Engineering | 60 person-hours
- AppSec | 24 person-hours
- Release and sponsor | 12 person-hours
- Total | 96 person-hours · tools and infrastructure assessed separately
Sources: G24, EX
Speech:
Resource planning includes more than the price of a tool. It also includes time to configure checks, investigate findings, maintain the workflow, and teach people how to use it.

Here is a deliberately small estimate for our fictional ninety-day improvement effort. We reserve sixty engineering hours, twenty-four AppSec hours, and twelve hours for release coordination and sponsor decisions. The total is ninety-six person-hours.

These figures are an example, not a benchmark and not a percentage required by GOST. Tool costs, infrastructure capacity, and any additional training costs need their own assessment.

We should also identify dependencies. If the engineer who maintains the build system is unavailable during the first month, the schedule needs to reflect that fact. Assigning a task does not create capacity.

The resource-analysis artifact in the standard may contain estimated material and human resource indicators. Our numeric table is one way to make the discussion concrete. The useful test is whether the people responsible for the work agree that the estimate is credible and know what to do when it proves wrong.
Cue: Сделать паузу на сумме 96. Часы для всего учебного плана, не недельная нагрузка.

## 15 | Two plans, two questions
Seconds: 90
Section: Planning secure development
Layout: compare
Lead: A roadmap and an execution plan can be linked in one tracker
Items:
- Improvement plan | What capability changes, in what order, with which resources?
- Implementation plan | What work happens, by whom, at which stage, and by when?
- Shared foundation | Current-state analysis and resource analysis
Sources: G24, EX
Speech:
The two plans answer related but different questions. The improvement plan describes how the processes will develop. It establishes priorities and the sequence of changes, taking resources into account.

For our team, that might mean making parser analysis repeatable first, then improving the handling of findings, and then reviewing whether the process is effective.

The implementation plan turns those priorities into work. It identifies goals, stages, dates, resources, and responsible people. A task could specify the parser target, the integration milestone, the owner, and the evidence required for review.

These plans do not have to be disconnected documents. The standard explicitly allows them to be represented in a task management system. A roadmap with linked tasks can preserve the distinction between improving a capability and executing the work.

The important connection is traceability: why this change was selected, which resource assumption supports it, who performs it, and what will show that the planned stage is complete. If those links are missing, two beautifully formatted files will not solve the planning problem.
Cue: Не говорить, что стандарт требует два отдельных файла или конкретный формат Jira.

## 16 | A 90-day plan for the importer
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

## 17 | Five linked records of evidence
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
Sources: G24, EX
Speech:
The standard identifies five corresponding kinds of implementation evidence for this process. We need the current-state analysis, resource analysis, improvement plan, implementation plan, and scope with its selection rationale.

These are five kinds of information. We should not automatically turn them into five isolated documents. A concise planning page can link to records in a repository or task management system.

For example, the scope record identifies the importer version and components. The baseline links to the checks that actually ran. The resource record captures the estimate and its assumptions. The improvement plan explains the priorities. The implementation tasks identify owners and milestones.

The standard recognizes evidence in forms such as electronic files, logs, and tool results. The format serves the information and its traceability.

However, a one-page template is only an entry point. It does not replace the supporting analysis or prove that the process is effective. A reviewer should be able to follow the links and understand what happened, which version it concerns, and which questions still remain open.
Cue: На слайде артефакты 5.1.3.1–5; подробный шаблон приложен Markdown. Не обещать «одной страницы достаточно для соответствия».

## 18 | A first international crosswalk
Seconds: 90
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

## 19 | Would this survive Friday's release?
Seconds: 90
Section: Apply it
Layout: cards
Lead: A short review before calling the plan usable
Items:
- Scope | Which version and components are covered, and why?
- Capacity | Who has time and authority to act?
- Evidence | Can we trace an action to its result?
- Review | When do we revisit the assumptions?
Sources: EX, G24
Speech:
Return to the warning on Friday afternoon. A useful plan will not tell us automatically whether the finding is a real vulnerability. It will help the team organize the investigation and the decision.

We can identify the affected version and component. We can find the engineer responsible for the investigation and the person authorized to make the release decision. We can see what evidence exists and where a missing result needs attention.

We can also recognize weak planning. A scanner installation without a review owner is incomplete. A roadmap without capacity is unreliable. A scope statement without a rationale is difficult to defend. A plan that is never revisited will gradually stop describing reality.

For this team, I would review the plan after ninety days and after a material change, such as adding a parser. These triggers are implementation recommendations.

The practical test is whether another team member can use the plan to understand the next action. If only its author can explain it, the plan needs more work.
Cue: Дать зрителю 3–4 секунды на четыре вопроса. Период и триггеры пересмотра — авторский пример.

## 20 | Security Training That Changes Engineering Decisions
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
Today, we explored the history of secure development, learned how to read the Russian standard, and used its first process to organize a practical improvement effort.

Your next step is simple: choose one product and start your planning page. Describe the current state, identify the next improvement, and connect it to an owner, available capacity, and reviewable evidence. The accompanying worksheet will help you get started.

I am Vitaliy Pikov. You can find me at pikov dot expert. Please keep in touch and share the questions you would like this series to explore.

The next episode is called Security Training That Changes Engineering Decisions. We will examine employee training under clause five point two: what different roles need to learn, how to practise those skills, and what evidence can show progress beyond attendance.

We will build a role and skills matrix and use a short exercise before and after training. Which engineering decision would you most like your security training to improve? Thank you for watching. See you in episode two.
Cue: Произнести «pikov dot expert», выдержать паузу у адреса. Название EP02 прочитать полностью. В конце оставить слайд с контактом и анонсом на несколько секунд; дата выпуска пока не объявлена.
