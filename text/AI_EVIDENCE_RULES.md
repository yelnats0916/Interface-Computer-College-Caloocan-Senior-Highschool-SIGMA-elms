# Learning AI: sources, access and generation rules

## Implemented sources

These connections use existing SIGMA screens and their actual saves. Browser caches are not accepted as grades, roster authorization or evidence snapshots.

| Feature / save screen | Server source | Permitted use |
| --- | --- | --- |
| Subject editor and curriculum | `subjects.topics`, `subjects.materials` | Actual titles, instructions, topics, assessment types, rubric and maximum points. Unsaved or deleted curriculum items are rejected. |
| Sections and enrollment | `sections`, active `users` | Match the subject assignment, teacher and enrolled student. Rechecked on each request. |
| Release / schedule controls | `academic_records`, type `release` | Only content released to that section/student and whose scheduled start has arrived. A release is not proof a student studied it. |
| Student assessment submission | `academic_records`, type `submission` | Authenticated student's own current attempt, submitted time and readable extracted document text. Uploads without readable text record submission status but cannot receive a fabricated evaluation. |
| Score panel and gradebook save | `academic_records`, type `score` | Assigned teacher's actual saved score, bounded by the assessment's saved maximum. Student clients cannot supply grades. Blank is unknown, not zero. |
| Private assessment teacher comment | `academic_records`, type `teacher_feedback` | Teacher's saved guidance on the current submitted attempt. Student comments cannot become teacher feedback. |
| Classroom attendance save | `academic_records`, type `attendance` | Actual statuses and unmarked roster entries on an elapsed scheduled class date within the last seven days. Unmarked is never called absent or “forgotten.” |
| Shared and published Grades | `grade_publications` | Teacher: assigned class records, with shared grades preferred over duplicate published copies. Student: own published quarterly results only. Overall student Grades uses quarterly grades, not raw component percentages. |
| Submission AI evaluation | Saved work + saved curriculum + rubric text | Suggested rubric evaluation for teacher review; never writes an official score. Uses the website's four existing evaluation dimensions or custom criteria actually saved on that assessment; selection follows its saved controls. Quizzes remain excluded. |
| SIGMA AI Feedback | Saved current attempt + saved teacher grade + actual teacher feedback/rubric | Supportive learning guidance after grading. Cannot change the grade or infer a topic weakness from a score alone. |
| Reports / AI logs / insights directory | Server-generated `ai_insight_cards`, `ai_logs` | Counts saved descriptive, predictive and prescriptive outputs, including subject/grade views. Deleted outputs are excluded. No browser-produced success log creates a count. |

## Role boundaries

- Students: their own enrollment, submitted work and results; no classmates' individual scores or private teacher workflows.
- Teachers: assigned subject and section only, and active enrolled students. Existing `teacherGrades`, `teacherMaterials` and `teacherAttendance` options remain authoritative.
- Administrators: use the existing relevant permissions for managing learning records. Dashboard learning insights are generated in student/teacher portals, not attributed to another account from an admin-supplied snapshot.
- Student grade insight access honors `studentGrades`. Deleted/archived sections and deleted subjects/users cannot supply evidence. Student subject content must be published.
- No subjects, sections, grades, attendance, submissions or historical activity are manufactured to populate an insight or report.

## Categories

### Descriptive

Summarizes actual recorded results, released learning content, submissions, teacher guidance or an authorized workflow observation. Identifies the supplied date. Does not turn an upload, click, release or completion into a claim of understanding/mastery. Missing teacher grades are not missing student work.

### Predictive

The server must build a trend record with at least three graded assessments on at least two dates, within the same subject, section, school year, quarter, assessment type and graded student cohort. Scores are compared as percentages of their actual maxima.

Class forecasts also require at least five graded students and at least 60% coverage of an active roster of five or more. A predictive card must cite an eligible trend record; quarterly grades or a lone score cannot authorize that category. Forecasts describe tentative direction, not an exact future mark or guaranteed outcome. A qualifying trend may still yield no card if it adds nothing useful.

### Prescriptive

Recommends a concrete next learning/teaching action tied to the cited records, rubric or actual released topic. General study guidance is allowed when only grades are available, phrased as a suggestion rather than an observed weakness. No invented chapters, resources, lessons, deadlines or links.

## Daily cards and narratives

- Server ledger: zero to three new dashboard cards per account per Asia/Manila day, shared across tabs, devices and languages. The AI chooses meaningful cards within the remaining allowance; it does not randomly fill a quota.
- Changed records are fingerprinted individually. Unchanged evidence, a refresh and a new day alone do not produce another daily summary. Areas not selected remain eligible within the remaining allowance. Zero-card output records the inspected evidence as processed.
- Subject/grade popup insights have separate scope/quarter/language caches. Reopening unchanged evidence reuses its saved result without consuming the dashboard quota.
- Per-account generation locks prevent concurrent dashboard requests. Submission evaluation locks are scoped to the work and mode. Failed generation has a five-minute server cooldown.
- Dashboard Read More can use several paragraphs when evidence supports a useful narrative; sparse evidence remains short. It may connect actual topics, dated results and teacher guidance. Reflective questions and workflow reminders are occasional, not mandatory in every card.
- Body emphasis and links use the existing safe insight renderer. Destinations are drawn only from cited, server-supplied website routes. No arbitrary external routes or raw HTML.

## Evaluation integrity and freshness

- Student work must first be saved by that authenticated student. Teacher evaluation requests cannot substitute arbitrary work text.
- Rubric extraction from an uploaded PDF/DOCX is provided by an authorized teacher and tied to the saved assessment rubric URL; it is not treated as independently verified file contents. Canonical saved rubric text takes precedence.
- Replaced submission attempts do not inherit prior grades or AI results for analytics. Existing score records are retained; attempt identity determines eligibility.
- Feedback/evaluation retrieval checks attempt, curriculum and rubric fingerprints; feedback also checks the saved grade and teacher note. Changed evidence requires a fresh result.
- AI suggestions are not fed back into analytics as independent learning evidence. Only actual teacher saves and original academic records can establish performance, preventing circular AI claims and inflated counts.
- No diagnoses, personality/effort judgments, plagiarism or AI-authorship claims, classmate ranking, or invented causal explanations. Document content is untrusted data, never model instructions.

## Current data and operational limits

Existing browser-only academic records are not silently imported. Saves made through the connected screens enter the new server store after authorization. A sync failure is shown to the user; local storage is not relabeled as a live save.

The live database had no subjects, sections, published grades or insight cards when this change was prepared. Empty evidence correctly produces zero cards and no provider request. Subjects and sections remain on hold at the user's request. Syntax checks do not establish provider quality or a complete classroom workflow; those require real authorized academic records.
