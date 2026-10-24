"""Author additional topic-aligned coursework with optional, separate rubrics."""
from pathlib import Path
import json, hashlib
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/reading-writing-additional';OUT.mkdir(parents=True,exist_ok=True)
base=json.loads((ROOT/'output/reading-writing-assessments/assessment-manifest.json').read_text())
# Topic, type, rubric, title, context, steps, submission, assessment criteria.
items=[
(1,'Activity',False,'Repairing a Disconnected Paragraph',
 'Work with this deliberately disordered practice text: Finally, the group checked the draft. A reading circle needs a clear plan. Next, members selected a short text. First, they agreed on a purpose. This made the discussion easier to follow.',
 ['Reorder all five sentences into a connected paragraph.','Identify the introductory sentence and explain your chosen order in 60 to 80 words.','Circle three transitions or referring expressions and explain what each connects.'],
 'One revised paragraph and a brief explanation. Completion requires all five original ideas, a logical sequence, and three explained links.',
 ['Sequence of ideas','Explanation of order','Cohesive links','Sentence accuracy']),
(1,'Assignment',True,'From Notes to a Connected Explanation',
 'Use these supplied notes for an imagined peer reading group: four learners; one shared article; each reads independently; members list questions; the group compares interpretations; members write a final reflection. No meeting date, fee, or school policy is implied.',
 ['Turn the notes into an outline with an introduction, two body points, and a conclusion.','Write a 220 to 280 word explanation for a classmate who has never joined such a group.','Mark five cohesive devices and explain how each links two ideas in a short annotation.'],
 'One PDF or DOCX containing the outline, explanation, and five annotations.',
 ['Accurate use of supplied notes','Logical paragraph structure','Purposeful cohesion and annotations','Language and mechanics']),
(1,'Activity',False,'Tracing Reference Chains',
 'Analyze this practice passage: Lea brought a short article to the group. She asked each member to read it. The readers noted two questions. These questions guided their discussion. The activity ended with a reflection, which summarized the ideas they had explored.',
 ['List six pronouns or referring expressions and identify their exact referents.','Explain whether each reference is clear; revise any reference that could confuse a reader.','Write two original connected sentences using one pronoun and one demonstrative expression.'],
 'A six-row reference table and two original sentences. Complete every row and explain any revision.',
 ['Accurate referents','Clarity of explanations','Appropriate revisions','Original connected sentences']),
(2,'Assignment',True,'Comparing Two Ways to Develop One Idea',
 'Choose a familiar topic such as preparing a reading space or planning study time. Use personal observations without identifying other learners. Label imagined examples as imagined.',
 ['Write a 160 to 200 word cause-and-effect paragraph and a 160 to 200 word problem-solution paragraph about the same topic.','Label the main idea, evidence or examples, and transitions in each paragraph.','Write a 120 to 150 word comparison explaining which pattern best serves a stated audience and purpose.'],
 'The two labeled paragraphs and the comparison in one document.',
 ['Distinct and accurate patterns','Relevant support for each pattern','Audience-based comparison','Organization and editing']),
(2,'Assignment',False,'A Definition Supported by Examples',
 'Define responsible participation in a classroom reading discussion. This is a writing exercise, not a statement of school rules.',
 ['Draft a precise one-sentence definition.','Develop it into a 180 to 220 word paragraph using two specific examples and one non-example.','Underline the defining features and add a 50 to 70 word note explaining how the examples support them.'],
 'One paragraph plus the explanation. Include a definition, two examples, one non-example, and the requested annotations.',
 ['Precision of definition','Specific supporting examples','Useful non-example','Clarity of annotations']),
(2,'Assignment',True,'Classification for a Reading Resource Guide',
 'Imagine a class wants a guide to reading resources. You may classify resources by purpose, difficulty, or format, but use one consistent basis. You do not need to buy or download anything.',
 ['Create three categories using one stated classification principle.','Write a 250 to 300 word guide with a clear introduction, balanced categories, and two examples per category.','Explain in 80 to 100 words why your categories are useful and how you handled an example that could fit more than one category.'],
 'The guide and a short justification of the classification principle.',
 ['Consistent classification principle','Balanced categories and examples','Reasoned treatment of overlap','Organization and language']),
(3,'Activity',True,'An Editing Clinic for Clear Sentences',
 'Revise this invented draft: Our group plan are useful it helps everyone. First we shared ideas, the final version was finished before drafting. The notes was placed there because it is important. Every learner always understand a text after one reading.',
 ['Identify six distinct issues involving organization, reference, agreement, punctuation, or unsupported wording.','Prepare a table showing the original wording, revision, and reason for each change.','Rewrite the passage in 100 to 140 words while preserving a sensible message about planning group work.'],
 'The six-row editing table and the revised passage.',
 ['Accurate diagnosis of problems','Effective revisions','Reasons tied to writing properties','Clarity of revised passage']),
(3,'Performance Task',True,'A Before and After Writing Portfolio',
 'Prepare an original information article explaining a study strategy to fellow senior high school learners. Treat personal experience as experience and avoid unsupported guarantees about learning.',
 ['Draft a 350 to 450 word article with an introduction, connected body paragraphs, and a conclusion.','Review it against organization, coherence, cohesion, language use, and mechanics; record at least eight concrete changes.','Submit the first and final drafts with a 150 to 200 word reflection linking three changes to the intended audience.'],
 'One portfolio containing both drafts, the revision log, and reflection.',
 ['Organization and audience fit','Quality of revision evidence','Coherence and cohesion','Editing and reflective explanation']),
(3,'Assignment',True,'Revising for a Different Audience',
 'Start with this informal message: Hey, just read the thing before we meet. Bring some questions, and if you are confused ask someone. We will talk about it and do notes later. Rewrite it as an informative message to a new member of a peer reading group.',
 ['Write a 180 to 220 word revision that clarifies preparation, discussion, and reflection.','Use an appropriate tone without inventing official requirements, deadlines, or penalties.','Annotate five changes and explain which property of effective writing each improves.'],
 'The revised message and five explanatory annotations.',
 ['Audience and tone','Clear organization of information','Explanations of five revisions','Language and mechanics']),
(4,'Activity',False,'Sorting Explicit and Implicit Claims',
 'Read this invented proposal excerpt: A voluntary reading circle should meet once each week. Members could share questions about a chosen text. Students who discuss their reading become more thoughtful readers. The library is the best place for the group.',
 ['Identify four claims and quote the exact wording of each.','Classify each as fact, value, or policy; explain any classification that depends on interpretation.','State one implied assumption and identify which sentence led you to infer it.'],
 'A four-row claim table and one supported inference. Every classification needs a reason; do not treat the invented claims as established facts.',
 ['Identification of claims','Reasoned classification','Supported inference','Clear explanations']),
(4,'Activity',True,'Checking the Context Behind a Claim',
 'Compare these invented messages about the same voluntary reading circle. A student invitation says, Join us to exchange interpretations and enjoy a shared text. A funding request says, The group needs reusable discussion sheets and a quiet meeting place. Neither message supplies outcome data.',
 ['Identify the likely audience and purpose of each message.','Explain in 150 to 200 words how these contexts shape word choice, emphasis, and omitted information.','List two questions a critical reader should ask before accepting a claim that the group improves achievement.'],
 'A context comparison and two evidence-seeking questions.',
 ['Audience and purpose analysis','Text-based comparison of emphasis','Quality of critical questions','Clarity and organization']),
(4,'Assignment',True,'A Critical Reading Annotation',
 'Analyze this invented argument: All students should join a daily reading club because reading together is always better than reading alone. One friend enjoyed a club last term, so every class will benefit. The school should replace independent reading time with club meetings.',
 ['Annotate at least five features such as claim, reason, example, assumption, generalization, or policy proposal.','Write a 250 to 300 word evaluation distinguishing what the text states from what it leaves unproven.','Propose two specific kinds of evidence that could test the main claim; do not fabricate findings.'],
 'The annotated argument and an evidence-focused evaluation.',
 ['Accurate annotations','Evaluation of reasoning','Appropriate evidence proposals','Textual support and organization']),
(5,'Assignment',False,'Assertion and Counterclaim Practice',
 'Consider this practice assertion: Every group reading task should use a single shared interpretation. It is a claim to examine, not a classroom rule.',
 ['Write one reasoned counterclaim in 80 to 100 words.','Acknowledge one possible strength of the assertion without abandoning your position.','Name one type of evidence needed to compare the two positions and explain why it would be relevant.'],
 'A counterclaim, a fair concession, and an evidence note. Complete all three parts without inventing data.',
 ['Clear counterclaim','Fair concession','Relevant evidence need','Reasoned explanation']),
(5,'Assignment',True,'An Evidence Relevance Audit',
 'Evaluate three supplied statements supporting the claim that a voluntary discussion group improves comprehension: one member says it is enjoyable; a group attendance list shows regular participation; a reading response shows a learner corrected an interpretation after discussion. These are invented examples for evaluating evidence.',
 ['Create a table explaining what each statement can and cannot establish.','Rank their relevance to the comprehension claim and justify the ranking.','Write a 200 to 250 word recommendation identifying further evidence needed and two limits on any conclusion.'],
 'The evidence table, ranking, and cautious recommendation.',
 ['Distinction between evidence and conclusion','Reasoned relevance ranking','Recognition of limitations','Quality of additional evidence plan']),
(5,'Performance Task',True,'A Balanced Position Paper on Reading Choices',
 'Take a position on whether a peer reading group should choose one common text or allow individual text choices. Use supplied or freely accessible sources and record their actual details; no paid source is required.',
 ['Write a 500 to 650 word position paper with a clear thesis, two reasons, and specific support.','Present a credible counterclaim fairly, make a justified concession, and respond with relevant evidence or clearly labeled reasoning.','Use at least two traceable sources; distinguish their findings from your interpretation and include a reference list.'],
 'A position paper and reference list with accessible source details.',
 ['Clear position and coherent reasoning','Relevant traceable evidence','Fair counterclaim and response','Organization and responsible attribution']),
(6,'Performance Task',True,'A Small Project Proposal for Peer Reading',
 'Propose a feasible voluntary peer reading session. This is a planning simulation; no actual event, purchase, collection of money, or contact with an outside organization is required.',
 ['Prepare a 450 to 600 word proposal covering need, objectives, intended participants, activities, timeline, responsibilities, and evaluation.','Include a simple resource table; label estimates and explain assumptions rather than inventing approved budgets.','Add a 120 to 150 word feasibility note that addresses one risk and one inclusive participation measure.'],
 'One proposal with the resource table and feasibility note.',
 ['Alignment of needs objectives and activities','Feasible timeline and resources','Evaluation and inclusive planning','Professional structure and clarity']),
(6,'Activity',False,'Turning a Casual Request into a Formal Letter',
 'Revise this imagined request: Hi, can our reading group use a quiet space? We want to talk about a short text and write notes. Let us know. Thanks. No permission is being requested from a real person in this exercise.',
 ['Write a 180 to 220 word formal request with an appropriate salutation, purpose, relevant details, requested action, and courteous close.','Use clearly labeled placeholders for an addressee, proposed date, and room rather than inventing approved arrangements.','Annotate four language or format changes that make the letter suitable for its audience.'],
 'One formal letter and four annotations. Include all required letter parts and clearly marked placeholders.',
 ['Complete letter structure','Specific courteous request','Appropriate placeholders','Audience-aware revisions']),
(6,'Performance Task',True,'A Professional Application Writing Set',
 'Respond to a simulated volunteer reading facilitator opportunity. Prepare an application using only your actual skills or clearly marked placeholders. Do not include sensitive personal data, real contact details, or fabricated credentials.',
 ['Create a concise one-page resume emphasizing relevant skills and learning experiences.','Write a 250 to 300 word application letter linking two supported strengths to the simulated role.','Add a 100 to 150 word reflection explaining how you checked consistency, accuracy, tone, and audience fit across the documents.'],
 'A resume, application letter, and reflection in one PDF or DOCX.',
 ['Relevant and truthful qualifications','Specific application argument','Consistency and professional conventions','Clarity editing and reflection']),
]
RUBRIC_EVIDENCE={2: ['Preserves all six supplied notes without adding unsupported arrangements.', 'Uses an outline and paragraphs that make the process easy for a new member to follow.', 'Identifies five cohesive devices and explains each connection accurately.', 'Uses clear sentences, appropriate vocabulary, and accurate punctuation.'], 4: ['Develops cause and effect distinctly from problem and solution.', 'Supports both paragraphs with specific, relevant examples rather than unsupported claims.', 'Explains the stronger pattern by linking purpose, audience, and paragraph features.', 'Uses logical organization, effective transitions, and edited language.'], 6: ['States and consistently applies one basis for classification.', 'Develops three balanced categories with two relevant examples each.', 'Explains a plausible overlap and justifies how it is handled.', 'Presents a readable guide with clear transitions and accurate language.'], 7: ['Accurately identifies six distinct problems in the supplied draft.', 'Corrects the identified problems without changing the intended message.', 'Gives a specific, accurate reason for each of the six changes.', 'Produces a connected 100 to 140 word revision with readable sentences.'], 8: ['Develops an information article with a clear structure suited to fellow learners.', 'Shows first and final drafts and at least eight purposeful logged changes.', 'Uses connected paragraphs, clear references, and purposeful transitions.', 'Edits the final draft and explains three audience-focused changes in the reflection.'], 9: ['Uses a tone and explanations suitable for a new group member.', 'Clearly organizes preparation, discussion, and reflection without invented rules.', 'Links five annotated changes to relevant properties of effective writing.', 'Uses clear sentences, appropriate word choice, and accurate punctuation.'], 11: ['Identifies the likely audience and purpose of both messages.', 'Uses details from both texts to explain emphasis, word choice, and omission.', 'Asks two relevant questions that seek evidence about the achievement claim.', 'Presents a logically connected and clearly written comparison.'], 12: ['Identifies and explains at least five features using the supplied wording.', 'Separates stated reasons, assumptions, generalizations, and unproven conclusions.', 'Proposes two specific kinds of evidence capable of testing the main claim.', 'Supports the evaluation with textual details in a coherent structure.'], 14: ['Explains the limits of what enjoyment, attendance, and a revised response establish.', 'Ranks relevance to comprehension using reasons rather than preference alone.', 'Acknowledges two meaningful limits and avoids claiming that the examples prove improvement.', 'Recommends further evidence suited to testing the comprehension claim.'], 15: ['Maintains a clear position supported by two coherent reasons.', 'Uses at least two traceable sources relevant to the reasons and distinguishes interpretation.', 'Represents a credible counterclaim fairly and gives a supported concession and response.', 'Organizes the paper clearly and attributes borrowed information consistently.'], 16: ['Connects a defined need to objectives, participants, and suitable activities.', 'Provides workable responsibilities, a timeline, and clearly labeled resource estimates.', 'Includes an appropriate evaluation method, one risk, and an inclusive participation measure.', 'Uses a complete proposal structure with concise professional language.'], 18: ['Presents relevant actual skills or clearly marked placeholders without fabricated credentials.', 'Links two supported strengths to the simulated facilitator role in the letter.', 'Keeps the resume and letter consistent and follows professional document conventions.', 'Edits all documents and explains accuracy, tone, and audience checks in the reflection.']}
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyCopy',fontName='Helvetica',fontSize=10,leading=14,spaceAfter=8))
styles.add(ParagraphStyle(name='DocTitle',fontName='Helvetica-Bold',fontSize=18,leading=22,spaceAfter=12))
styles.add(ParagraphStyle(name='SectionLabel',fontName='Helvetica-Bold',fontSize=11,leading=15,spaceBefore=10,spaceAfter=6))
styles.add(ParagraphStyle(name='SmallCopy',fontName='Helvetica',fontSize=9,leading=12,spaceAfter=6))
def p(t,style='BodyCopy'):return Paragraph(escape(t),styles[style])
def footer(canvas,doc):
 canvas.setFont('Helvetica',8);canvas.setFillColor(colors.HexColor('#607080'));canvas.drawString(42,27,'Reading and Writing Skills | Interface Computer College Caloocan');canvas.drawRightString(A4[0]-42,27,str(doc.page))
def build(path,story):SimpleDocTemplate(str(path),pagesize=A4,rightMargin=42,leftMargin=42,topMargin=40,bottomMargin=44).build(story,onFirstPage=footer,onLaterPages=footer)
manifest=[]
for sequence,(topicno,kind,hasrubric,title,context,steps,submit,criteria) in enumerate(items,1):
 topic=base[topicno-1];identifier=f'RW-11-12-EXTRA-T{topicno:02d}-{sequence:02d}'
 stem=f'RW_Additional_{sequence:02d}'
 meta=f'{kind} | {topic["topicTitle"]} | Quarter {3 if topic["quarter"]=="q3" else 4}'
 story=[p(title,'DocTitle'),p(meta,'SmallCopy'),p('Purpose','SectionLabel'),p('Connect and organize ideas using clear reference chains, transitions, and paragraph structure.' if topicno==1 else topic['goal']),p('Context and source material','SectionLabel'),p(context),p('Instructions','SectionLabel')]
 story.extend(p(f'{i}. {step}') for i,step in enumerate(steps,1))
 story += [p('Submission and completion requirements','SectionLabel'),p(submit),p('Assessment','SectionLabel'),p('Use the separate scoring rubric attached to this item. Total: 100 points.' if hasrubric else 'No separate rubric is attached. Completion is checked against the requirements above. Review your work for accuracy, relevance, and clear expression.')]
 instructions=OUT/(stem+'_Instructions.pdf');build(instructions,story)
 assets={'instructions':{'fileName':instructions.name,'sha256':hashlib.sha256(instructions.read_bytes()).hexdigest(),'pages':len(PdfReader(instructions).pages)}}
 if hasrubric:
  story=[p('Scoring rubric','DocTitle'),p(title,'SectionLabel'),p(meta,'SmallCopy'),p('Total: 100 points. Apply each criterion independently using the levels below.','BodyCopy')]
  for label,points,step in zip(criteria,[30,30,25,15],RUBRIC_EVIDENCE[sequence]):
   story += [p(f'{label} - {points} points','SectionLabel'),p('Evidence: '+step)]
  rows=[[p('Level','SmallCopy'),p('Multiplier','SmallCopy'),p('Evidence for this criterion','SmallCopy')]]
  levels=[('4 Accomplished','1.00','Meets the stated requirement accurately, completely, and consistently.'),('3 Proficient','0.75','Meets most requirements; minor gaps do not obscure the work.'),('2 Developing','0.50','Meets some requirements, with important gaps or inconsistencies.'),('1 Beginning','0.25','Provides limited evidence and needs substantial improvement.'),('0 No evidence','0.00','Provides no assessable evidence for this criterion.')]
  rows.extend([[p(t,'SmallCopy') for t in row] for row in levels]);table=Table(rows,colWidths=[100,65,A4[0]-249],hAlign='LEFT');table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#eef2f5')),('GRID',(0,0),(-1,-1),.4,colors.HexColor('#cbd5e1')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7)]))
  story += [Spacer(1,8),table,Spacer(1,9),p('For each criterion: maximum points x level multiplier. Add the four results and round the total to two decimal places.','SmallCopy'),p('Total ____ / 100    Strength ______________________________','SmallCopy'),p('Next step _____________________________________________','SmallCopy')]
  rubric=OUT/(stem+'_Rubric.pdf');build(rubric,story);assets['rubric']={'fileName':rubric.name,'sha256':hashlib.sha256(rubric.read_bytes()).hexdigest(),'pages':len(PdfReader(rubric).pages)}
 manifest.append({'id':identifier,'type':kind,'category':kind,'title':title,'description':steps[0]+' '+submit,'topicId':topic['topicId'],'topicTitle':topic['topicTitle'],'quarter':topic['quarter'],'competencyCodes':topic['codes'],'hasRubric':hasrubric,'assets':assets})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps({'items':len(manifest),'rubrics':sum(m['hasRubric'] for m in manifest),'pdfs':sum(len(m['assets']) for m in manifest),'maxPages':max(a['pages'] for m in manifest for a in m['assets'].values())}))
