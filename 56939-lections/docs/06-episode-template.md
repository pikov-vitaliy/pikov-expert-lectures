# Episode preparation template

Copy this template into `EPnn-brief.md` when work on that episode starts. This is an intentionally unfilled template; placeholders below are not research findings. Keep supporting Markdown files in this directory. Apply [the editorial rules](02-editorial-rules.md).

## Identity and learning outcome

- Episode ID: `EPnn`
- GOST reference: `GOST R 56939-2024, clause 5.n`
- Exact Russian process title: `[copy and verify against the working source]`
- English video title: `[engineering problem | GOST 56939 #nn]`
- Author: Vitaliy Pikov
- Status: `research / review / ready to record / recorded / ready to publish / published`
- Source check date: `[YYYY-MM-DD]`
- Primary viewers: AppSec practitioners, technical leads, and developers
- Required background: `[only what is needed for this episode]`
- After watching, the viewer can: `[one observable action]`
- Main engineering question: `[one sentence]`
- Deliverable: `[one useful artifact and how to check it]`
- Explicitly outside this episode: `[relevant limits]`

## Opening

Explain a concrete failure or decision in under a minute. Show what the viewer will be able to do by the end. Introduce only the terms needed to understand it.

Suggested original wording:

> What evidence would convince you that [specific process] is actually working? Today we will examine this question through one process from GOST R 56939-2024 and compare it with [reference and version]. We will build [artifact], test it against [scenario], and identify the limits of the comparison.

## Sources and provision types

| Field | GOST side | International side |
|---|---|---|
| Source, publisher, version, status | `[verified]` | `[verified]` |
| Clause / task / practice identifier | `[verified]` | `[verified]` |
| Source link or local locator | `[verified]` | `[verified]` |
| Provision type | `[requirement / recommendation / example / observed practice]` | `[requirement / recommendation / example / observed practice]` |
| Original modality and its meaning in this document | `[verify section 4.7 where relevant]` | `[verify source conventions]` |
| Subject, action, object | `[record]` | `[record]` |
| Conditions and scope | `[record]` | `[record]` |
| Evidence or expected outcome | `[record]` | `[record]` |
| Access date and reading limits | `[record]` | `[record]` |

If you translate Russian requirements, mark the translation as the author's translation. An official English document title does not make your translation of its clauses official.

## Comparison record

- Common objective: `[what both provisions address]`
- Supported overlap: `[specific actions and conditions]`
- GOST-specific detail in this pair: `[supported difference]`
- International-source detail missing from the selected GOST passage: `[supported difference]`
- Normative force and applicability: `[do not infer equal obligation from similar actions]`
- Classification: `Substantial overlap / Partial overlap / Complementary practice / No counterpart identified in the reviewed sources / Not assessed`
- Evidence supporting classification: `[clause-level reasoning]`
- Confidence and unresolved questions: `[state limits]`
- Reviewed by and date: `[actual reviewer, or state that no external review occurred]`

Do not score uniqueness from the number of links. If no counterpart is identified, list the sources searched. Do not generalize one pair into a conclusion about the whole process or standard.

## Engineering example

- Product context and assumptions: `[small, self-contained example]`
- Failure or threat: `[observable scenario]`
- Chosen control or decision: `[action and owner]`
- Artifact before the change: `[what was missing or wrong]`
- Artifact after the change: `[what changed]`
- Verification: `[how a viewer can distinguish success from failure]`
- Toolchain / OS / dependencies / configuration: `[if applicable]`
- Actual run evidence: `[result, date, scope; do not claim an unexecuted test]`
- Limitations and residual risks: `[what the example does not establish]`

## Research evidence when relevant

- Claim being investigated: `[specific]`
- Paper or dataset, authors, year, source link: `[primary source]`
- Population, sample, method, and measured outcome: `[verified]`
- Result in this context: `[paraphrase with source]`
- Alternative explanations and transfer limits: `[state]`
- If no suitable study was found: `[record that fact]`

## Recording outline

| Target time | Segment | Slide or demonstration |
|---|---|---|
| 00:00–01:00 | Problem and learning outcome | `[opening]` |
| 01:00–04:00 | Terms and product context | `[small diagram]` |
| 04:00–08:00 | GOST process and selected requirements | `[source-backed explanation]` |
| 08:00–15:00 | International comparison | `[a few provisions and their differences]` |
| 15:00–24:00 | Worked example or focused guest excerpt | `[artifact and verification]` |
| 24:00–28:00 | Limits and common implementation mistakes | `[counterexample]` |
| 28:00–30:00 | Findings and viewer exercise | `[one action to try]` |

These are planning targets. Generate published timestamps from the final edit.

## English rehearsal

- Target terms: `[10–15 items with meaning and pronunciation notes]`
- Useful phrases: `[5–7 sentences you can explain naturally]`
- Two-minute explanation: `[record, listen, revise]`
- Terms easily confused: `[e.g. defect / vulnerability / warning]`
- Caption corrections: `[acronyms, clause IDs, negations, names]`

Useful original phrases:

- “The shared objective is …”
- “The overlap is limited to …”
- “This requirement applies when …”
- “Our example produces evidence of …”
- “This result does not establish …”
- “We did not identify a counterpart in the sources we reviewed.”

## Optional guest brief

- Guest and publicly verified topic experience: `[record]`
- Contribution: `[case, challenge, or decision]`
- Questions: `[three focused questions]`
- Translation/reading brief sent: `[only if actually sent]`
- Recording and excerpt use agreed: `[actual status]`
- Factual excerpt review: `[actual status]`
- Sponsorship or other relevant relationship: `[if any]`

## Readiness check

- [ ] Exact process and source versions are verified.
- [ ] Provision type, modality, and applicability are recorded on both sides.
- [ ] Each material comparison is supported; open questions are visible.
- [ ] Example and verification match the claim; any commands were actually run.
- [ ] Slides and demonstration are readable in the intended video size.
- [ ] Speech and English captions preserve technical meaning.
- [ ] The handout includes the sources, artifact, and one viewer exercise.
- [ ] Guest material and the intended use of external material are settled where relevant.
- [ ] No unresolved substantive content error remains.
- [ ] The author has made the publication decision.

## After release

- Actual publication date and URL: `[only after publication]`
- Production hours by stage: `[actual]`
- Seven-day feedback: `[same observation window for comparisons]`
- Twenty-eight-day feedback: `[when available]`
- Corrections: `[original claim, corrected claim, source, affected content, date]`
- Decision for the next episode: `[one specific improvement]`
