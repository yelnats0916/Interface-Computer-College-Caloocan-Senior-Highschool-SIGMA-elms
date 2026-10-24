# Question generation: design and review

## Scope and references

The generator uses uploaded or borrowed document text, independent teacher instructions, supported question formats, exact requested counts, a cognitive level from Revised Bloom’s Taxonomy, and a separate difficulty setting.

Revised Bloom’s Taxonomy guides the requested cognitive process. See Cornell’s assessment guidance: https://teaching.cornell.edu/teaching-resources/assessment-evaluation/asking-good-test-questions . The six supported levels are Remember, Understand, Apply, Analyze, Evaluate, and Create. Create requires Essay / Paragraph and a grading guide. Format is not treated as a cognitive level; difficulty is not treated as a taxonomy level.

ISO 9241-110:2020 interaction principles inform interface design: explicit field labels and generation action, visible source selection, controllable type distribution, validation feedback, proposed question levels that the author can review, and preservation of the editor on failure. Reference: https://www.iso.org/standard/75258.html .

ISO 9241-11:2018 provides a usability evaluation framework: https://www.iso.org/standard/63500.html . These references do not establish ISO certification or complete conformity. The adviser must confirm the required part and evaluation scope.

## Implemented behavior

1. Choose an uploaded document or borrowed course document. Actual readable text is required; titles alone, file names and optional instructions are not substituted for source content.
2. Once source content is available, expose Additional Instructions, question type/count, thinking skill and difficulty. Mixed Types exposes Configure Types; counts per type determine the read-only total.
3. The server validates source size, 1–50 questions per request, supported types, exact distribution, a supported thinking skill and Create-format compatibility.
4. A short authenticated request creates an owner-scoped background job; a separate CLI worker calls the provider so the single PHP web worker remains available for other users. Status polling is owner-authorized and retries transient connection failures. Identical in-progress requests reuse the job; a changed request cannot join a different source request. The configured server-side provider receives source text as data and teacher instructions separately. It must return questions, correct answers/grading guidance, Bloom level and a brief alignment rationale. Model credentials are never returned to browsers.
5. Structural validation checks count, distribution, level metadata and answer-key shape. This is not a semantic proof of correctness or Bloom alignment. The teacher reviews source faithfulness, proposed cognitive level, answer keys and grading guidance before publishing.
6. Save Quiz persists the full questions, answers and Bloom metadata in MySQL. Published library quizzes are available to authenticated staff on other devices; drafts are private to their recorded author. Opening a library reloads server records. The browser cache is not the publication authority.

## Verification and remaining evaluation

Automated checks exercise desktop and mobile admin/teacher pages, reveal conditions, explicit mixed counts, separate instructions, provider payload, invalid settings, generated answer-key insertion, review controls and shared library hydration. PHP tests cover provider routing/fallback, malformed responses, supported levels and exact type distributions. A bounded live provider request confirmed a three-question Analyze blueprint with two Multiple Choice questions and one True or False question, all with answer keys. This verification generated no published quizzes or student records.

A usability study is still required before reporting measured ISO 9241-11 outcomes. Ask representative teachers to select a document, configure and generate a quiz, review answers and save it. Record successful completion, errors, time on task and satisfaction, with participants, devices and connection conditions documented. Do not invent study results. A subject teacher should also review a representative question set for factual accuracy and cognitive alignment.
