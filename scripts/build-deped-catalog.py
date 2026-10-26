"""Build the requested SHS planning catalog; no downloadable learning files are created.

Schedules are planning proposals, not an assertion of ICC's approved class program.
The original Core/Applied/Specialized curriculum is used to match the capstone scope.
"""
from pathlib import Path
import json
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://www.deped.gov.ph/wp-content/uploads/2019/01/'
ACADEMIC = 'https://www.deped.gov.ph/k-to-12/about/k-to-12-basic-education-curriculum/academic-track/'
ICC = 'https://home1.interface.edu.ph/index.php/programs/senior-high-school'
GRADING = 'https://www.deped.gov.ph/wp-content/uploads/2015/04/DO_s2015_08.pdf'
definitions = {}

def define(key, name, source, first, second):
    """Each row is an original unit grouping and learning focus, separated by |."""
    def units(text):
        return [tuple(x.strip().split('|', 1)) for x in text.strip().splitlines() if x.strip()]
    definitions[key] = dict(name=name, source=source, units=[units(first), units(second)])

define('OC', 'Oral Communication', 'https://lrmds.deped.gov.ph/detail/15683', '''
Communication Processes and Models|Explain how speakers construct and exchange meaning through messages, feedback, channels, and context.
Verbal, Nonverbal, and Intercultural Communication|Interpret verbal and nonverbal cues and adapt communication respectfully across cultures.
Functions of Communication|Compare the use of communication to regulate, socialize, motivate, inform, and express emotion.
Speech Contexts, Styles, and Acts|Choose appropriate language for interpersonal, public, formal, and informal situations.
''', '''
Communicative Strategies|Practice turn-taking, topic management, repair, and polite interaction in realistic situations.
Speech Types and Audience Analysis|Plan a speech appropriate to its purpose, audience, and speaking situation.
Speech Writing|Organize a focused speech with coherent ideas, suitable language, and reliable supporting information.
Speech Delivery|Develop articulation, modulation, stage presence, gestures, and audience rapport.
''')
define('RW', 'Reading and Writing Skills', 'https://lrmds.deped.gov.ph/detail/14520', '''
Text as Connected Discourse|Examine how sentences and paragraphs form a coherent written message.
Patterns of Development|Compare narration, description, definition, classification, comparison, causation, problem-solution, and persuasion.
Properties of Effective Writing|Improve organization, cohesion, coherence, language use, and mechanics.
''', '''
Critical Reading and Claims|Distinguish explicit and implicit claims and evaluate the evidence supporting them.
Assertions, Counterclaims, and Evidence|Write reasoned responses that cite relevant textual evidence and address alternative views.
Academic and Professional Writing|Develop purposeful texts such as critiques, reports, proposals, and professional correspondence.
''')
define('KPW', 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', 'https://lrmds.deped.gov.ph/detail/14513', '''
Mga Konseptong Pangwika|Ipaliwanag ang mga konsepto at gamit ng wika sa mga pang-araw-araw na sitwasyon.
Kasaysayan ng Wikang Pambansa|Suriin ang mahahalagang yugto at patakarang nakaimpluwensiya sa wikang pambansa.
Mga Sitwasyong Pangwika sa Pilipinas|Iugnay ang paggamit ng wika sa midya, kultura, pamayanan, at lipunan.
''', '''
Kakayahang Komunikatibo|Gamitin ang angkop na wika ayon sa kausap, layunin, at konteksto.
Pananaliksik sa Wika at Kultura|Bumuo ng malinaw at makabuluhang suliranin sa pananaliksik tungkol sa wika at kulturang Pilipino.
Pagbuo at Paglalahad ng Pananaliksik|Mangalap ng datos nang etikal at ilahad ang resulta gamit ang wastong sanggunian.
''')
define('PPT', "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik", 'https://lrmds.deped.gov.ph/detail/14516', '''
Mga Uri at Katangian ng Teksto|Kilalanin ang layunin, katangian, at organisasyon ng iba't ibang teksto.
Mapanuring Pagbasa at Reaksiyon|Suriin ang mga ideya, ebidensiya, at pananaw upang makabuo ng makatwirang reaksiyon.
Pagsulat ng Iba't Ibang Teksto|Gumamit ng malinaw, magkakaugnay, at mabisang pagpapahayag sa sariling pagsulat.
''', '''
Paksa at Disenyo ng Pananaliksik|Tukuyin ang angkop na paksa, suliranin, layunin, at pamamaraan ng pag-aaral.
Pangangalap at Pagsusuri ng Datos|Pumili ng mapagkakatiwalaang sanggunian at pangalagaan ang etika sa pagkuha ng datos.
Papel Pananaliksik|Ayusin at rebisahin ang papel-pananaliksik na may wastong dokumentasyon.
''')
define('LIT', '21st Century Literature from the Philippines and the World', 'https://lrmds.deped.gov.ph/detail/14506', '''
Philippine Literary Histories and Regions|Relate literary works to geographic, linguistic, ethnic, and historical contexts.
Philippine Authors, Genres, and Traditions|Compare representative regional and national texts and recognize writers' contributions.
Literary Elements and Contextual Analysis|Interpret imagery, figurative language, literary devices, and social contexts in selected works.
''', '''
World Literature and Contemporary Genres|Compare texts from different cultures and distinguish emerging literary forms.
Comparative Literary Interpretation|Develop evidence-based interpretations across Philippine and world literary works.
Creative and Multimedia Adaptation|Plan an original adaptation that communicates an interpretation of a studied literary text.
''')
define('ART', 'Contemporary Philippine Arts from the Regions', 'https://lrmds.deped.gov.ph/detail/14507', '''
Integrative Art and Contemporary Forms|Identify and relate contemporary art forms across Philippine regions.
Artists, Contexts, and Cultural Contributions|Investigate how artists and local traditions shape contemporary practice.
Elements, Principles, and Art Criticism|Evaluate artworks through their elements, principles, contexts, and meanings.
''', '''
Local Materials and Artistic Techniques|Select appropriate local materials and examine techniques and performance practices.
Planning a Contemporary Artwork|Develop an achievable concept informed by local context and available resources.
Contemporary Arts Production|Produce, document, present, and reflect on an original contemporary work.
''')
define('MIL', 'Media and Information Literacy', 'https://lrmds.deped.gov.ph/detail/14514', '''
Media, Information, and Technology Literacies|Differentiate related literacies and explain responsible participation in mediated communication.
Media Evolution and Types|Compare traditional and digital media and their influence on communication.
Sources and Information Evaluation|Evaluate reliability, authority, relevance, and bias when selecting information sources.
Media Languages and Representation|Analyze how codes and conventions shape media messages and representation.
Legal, Ethical, and Social Issues|Apply privacy, copyright, attribution, and responsible communication practices.
''', '''
Media Opportunities, Risks, and Trends|Assess media's power, emerging trends, and implications for communities.
People and Text Media|Evaluate people as sources and develop purposeful written media messages.
Visual and Audio Media|Analyze and plan visual and audio information for a specified audience.
Motion and Manipulative Media|Examine how moving images and interactive experiences convey information.
Multimedia Production|Combine suitable media elements in an ethical and audience-focused communication project.
''')
define('GM', 'General Mathematics', 'https://lrmds.deped.gov.ph/detail/14511', '''
Functions and Operations|Model real-life situations with functions and perform function operations and composition.
Rational Functions|Analyze domains, intercepts, asymptotes, graphs, equations, and inequalities of rational functions.
Inverse Functions|Determine and interpret inverse functions and their graphs in practical situations.
Exponential and Logarithmic Functions|Model growth and decay and solve exponential and logarithmic problems.
''', '''
Interest and Annuities|Compare simple and compound interest and calculate present and future values of annuities.
Investments and Loans|Analyze stocks, bonds, consumer loans, business loans, and amortization scenarios.
Propositions and Logical Operations|Translate statements into logical forms and evaluate their truth values.
Arguments and Proof|Evaluate arguments and use appropriate direct or indirect reasoning to justify conclusions.
''')
define('SP', 'Statistics and Probability', 'https://lrmds.deped.gov.ph/search?query=statistics+and+probability+curriculum+guide', '''
Random Variables and Probability Distributions|Construct distributions and interpret expected values and variability.
Normal Distribution|Use normal models, standard scores, and areas under the normal curve.
Sampling and Sampling Distributions|Explain sampling methods and analyze distributions of sample statistics.
''', '''
Estimation of Parameters|Construct and interpret confidence intervals using suitable assumptions.
Hypothesis Testing|Formulate hypotheses, choose appropriate tests, and interpret evidence without overstating conclusions.
Correlation and Regression|Analyze relationships between variables and explain the limits of prediction and causal claims.
''')
define('ELS', 'Earth and Life Science', 'https://lrmds.deped.gov.ph/detail/14509', '''
Earth's Origins and Systems|Explain ideas about the universe and solar system and relationships among Earth's subsystems.
Minerals, Rocks, and Resources|Classify rocks and minerals and assess responsible use of water, energy, and mineral resources.
Earth Processes and History|Relate weathering, plate movements, geologic time, and landscape development.
Natural Hazards and Mitigation|Explain geologic and hydrometeorological hazards and appropriate risk-reduction measures.
''', '''
Life's Origins and Cellular Processes|Relate scientific explanations of life's origins to cells and unifying biological themes.
Bioenergetics|Trace energy through photosynthesis, respiration, and organisms' life processes.
Reproduction and Heredity|Compare reproductive processes and explain how genetic information is transmitted.
Plant and Animal Survival|Connect structures and functions to how plants and animals maintain life.
Evolution and Ecological Interdependence|Use evidence to explain evolution and relationships within ecosystems.
''')
define('PS', 'Physical Science', 'https://lrmds.deped.gov.ph/detail/14519', '''
Formation of Elements and Atomic Models|Explain evidence for element formation and the development of atomic theory.
Chemical Structure and Properties|Relate bonding and molecular structure to properties of substances.
Chemical Reactions and Energy|Interpret chemical changes and factors affecting reaction processes.
Chemistry in Household Products|Evaluate the functions, benefits, and safe use of common chemical products.
''', '''
Astronomy and Scientific Models|Compare historical explanations of planetary motion using evidence and observation.
Motion, Forces, and Universal Laws|Apply physical principles to explain everyday motion and celestial phenomena.
Light, Waves, and Modern Physics|Explain wave and particle descriptions and their scientific applications.
The Cosmos|Relate astronomical evidence to scientific understanding of the universe.
''')
define('PHI', 'Introduction to the Philosophy of the Human Person', 'https://lrmds.deped.gov.ph/detail/14512', '''
Doing Philosophy|Distinguish reflection and holistic thinking from unsupported opinion.
Methods of Philosophizing|Evaluate reasoning, evidence, and truth claims using philosophical methods.
The Human Person as Embodied Spirit|Reflect on human limitations, possibilities, and the relation between body and experience.
The Human Person and the Environment|Evaluate ethical responsibilities toward nature and shared environments.
''', '''
Freedom and Responsibility|Examine choice, consequences, and responsible human action.
Intersubjectivity|Reflect on dignity, dialogue, differences, and relationships with other persons.
The Human Person in Society|Analyze how social structures and institutions influence human life.
Mortality and Meaning|Reflect thoughtfully on finitude, personal priorities, and a meaningful life.
''')
define('PD', 'Personal Development', 'https://lrmds.deped.gov.ph/detail/14517', '''
Knowing Oneself and Holistic Development|Examine personal strengths, limitations, and interconnected aspects of development.
Adolescent Development and Challenges|Reflect on developmental tasks and responsible responses to adolescent challenges.
Stress, Mental Health, and Well-being|Recognize stressors and identify appropriate coping and support resources.
The Brain and Emotional Intelligence|Develop strategies for learning, self-awareness, and managing emotions.
''', '''
Personal and Social Relationships|Practice respectful communication, responsible relationships, and positive social participation.
Family Structures and Influences|Reflect on family relationships and their effects on personal development.
Career Development and Decision-making|Relate interests, abilities, and opportunities to realistic career choices.
Personal Development Plan|Integrate self-reflection and goals into a practical plan for continued growth.
''')
define('UCSP', 'Understanding Culture, Society and Politics', 'https://lrmds.deped.gov.ph/search?query=understanding+culture+society+politics+curriculum+guide', '''
Anthropological and Sociological Perspectives|Use social-science perspectives to examine human behavior and cultural diversity.
Culture, Society, and Human Origins|Explain cultural processes and evidence concerning human biocultural development.
Socialization and Social Organization|Examine identity, norms, groups, and processes of becoming a member of society.
''', '''
Social and Political Institutions|Compare institutions and explain their functions and effects on everyday life.
Stratification and Inequality|Analyze social differences, unequal opportunities, and responses to exclusion.
Social Change and Community Responses|Evaluate processes of cultural, social, and political change and responsible participation.
''')
define('PE1', 'Physical Education and Health 1', 'https://lrmds.deped.gov.ph/detail/14518', '''
Health-related Fitness and Safety|Assess fitness and recognize safe participation, hydration, and activity-related risks.
Energy Systems and Exercise|Relate energy systems to aerobic and muscle- and bone-strengthening activities.
''', '''
Exercise Planning and Fitness Goals|Apply appropriate training principles to a personal exercise plan.
Active Living and Fitness Participation|Monitor participation and connect physical activity with healthy eating, sleep, and stress management.
''')
define('PE2', 'Physical Education and Health 2', 'https://lrmds.deped.gov.ph/detail/14518', '''
Individual and Dual Sports|Apply basic skills, rules, safety, and etiquette in selected sports.
Fitness and Skill Development|Assess sport-related fitness and practice movement skills progressively.
''', '''
Team Sports and Cooperation|Use tactics, teamwork, fair play, and respectful communication during team activities.
Sports Participation and Well-being|Organize safe sports participation and reflect on personal fitness and social benefits.
''')
define('PE3', 'Physical Education and Health 3', 'https://lrmds.deped.gov.ph/detail/14518', '''
Dance, Culture, and Fitness|Relate dance to cultural expression, movement concepts, fitness, and safe participation.
Dance Skills and Composition|Practice rhythmic patterns and movement sequences appropriate to selected dance forms.
''', '''
Dance Performance and Collaboration|Plan and rehearse a collaborative dance presentation with appropriate etiquette.
Dance Participation and Reflection|Evaluate participation, health benefits, and ways to improve movement performance.
''')
define('PE4', 'Physical Education and Health 4', 'https://lrmds.deped.gov.ph/detail/14518', '''
Recreational Activities and Preparation|Plan suitable recreation considering fitness, equipment, weather, and safety.
Outdoor Skills and Environmental Responsibility|Apply responsible participation and care for natural and shared environments.
''', '''
Recreational Participation|Participate safely in selected recreational activities and demonstrate cooperation.
Community Recreation Planning|Develop and evaluate an inclusive and achievable recreation activity plan.
''')

define('EAPP', 'English for Academic and Professional Purposes', BASE+'SHS-Applied_English-for-Academic-and-Professional-Purposes-CG.pdf', '''
Academic Texts and Summarizing|Identify academic text structures and summarize key ideas accurately.
Critique and Critical Approaches|Apply appropriate critical perspectives in a supported evaluation of a text or work.
Concept Papers|Explain concepts through definitions, explanation, and clarification for a specified audience.
''', '''
Position Papers|Construct a reasoned position that considers evidence and alternative claims.
Survey and Field Reports|Design appropriate information gathering and report observations or survey findings clearly.
Academic and Professional Revision|Revise writing for evidence, organization, language, documentation, and audience needs.
''')
define('PR1', 'Practical Research 1', BASE+'SHS-Applied_Research-1-CG.pdf', '''
Inquiry, Research, and Ethics|Differentiate inquiry from research and apply ethical principles in qualitative investigation.
Research Problems and Questions|Develop a feasible qualitative problem with a clear purpose and scope.
Reviewing Related Literature|Evaluate, synthesize, and acknowledge relevant literature and studies.
''', '''
Qualitative Design and Data Collection|Select a suitable design, participants, instruments, and ethical collection procedures.
Qualitative Analysis and Interpretation|Organize qualitative evidence and explain themes supported by collected data.
Reporting and Sharing Research|Write conclusions and recommendations and communicate the completed investigation.
''')
define('PR2', 'Practical Research 2', BASE+'SHS-Applied_Research-2-CG.pdf', '''
Quantitative Inquiry and Ethics|Explain quantitative research, variables, research types, and ethical responsibilities.
Problems, Hypotheses, and Literature|Develop questions, hypotheses, a conceptual framework, and a relevant literature review.
Research Design and Sampling|Choose appropriate quantitative designs, sampling procedures, and instruments.
''', '''
Data Collection and Presentation|Gather data responsibly and organize results using suitable tables and displays.
Quantitative Analysis|Apply appropriate descriptive or inferential techniques and interpret results within their limits.
Conclusions and Research Reporting|Produce evidence-based conclusions, recommendations, and a properly documented report.
''')
define('FPA', 'Filipino sa Piling Larang (Akademik)', BASE+'SHS-Applied_Filipino-Akademik-CG_0.pdf', '''
Kalikasan at Etika ng Akademikong Pagsulat|Tukuyin ang layunin at katangian ng akademikong sulatin at wastong paggamit ng sanggunian.
Pagbubuod at Sintesis|Bumuo ng organisadong abstrak, buod, o sintesis mula sa angkop na mga teksto.
Akademikong Paglalahad|Bumuo ng sulating angkop sa layunin, mambabasa, at pormal na konteksto.
''', '''
Panukala at Posisyong Papel|Maglahad ng malinaw na mungkahi o paninindigan na sinusuportahan ng ebidensiya.
Dokumentasyon ng Pulong at Gawain|Gumawa ng angkop na agenda, katitikan, at kaugnay na dokumentong pang-akademiko.
Rebisyon at Portfolio ng Sulatin|Rebisahin at tipunin ang mga sulatin ayon sa pamantayan ng malinaw at etikal na pagsulat.
''')
define('FPT', 'Filipino sa Piling Larang (Tech-Voc)', BASE+'SHS-Applied_Filipino-Tech-Voc-CG_0.pdf', '''
Komunikasyong Teknikal-Bokasyonal|Kilalanin ang layunin, mambabasa, at katangian ng sulating teknikal-bokasyonal.
Mga Panuto at Manwal|Bumuo ng malinaw at sunod-sunod na panutong angkop sa napiling larangan.
Dokumentasyon ng Proseso|Itala ang proseso, materyales, at pag-iingat sa isang gawaing teknikal.
''', '''
Mga Ulat Teknikal|Maglahad ng maayos at tumpak na ulat tungkol sa gawain o serbisyo.
Dokumentong Panghanapbuhay|Bumuo ng angkop na dokumentong kaugnay ng trabaho, produkto, o serbisyo.
Rebisyon ng Teknikal na Sulatin|Suriin at pagbutihin ang linaw, kaayusan, at kaangkupan ng mga sulatin.
''')
define('ETECH', 'Empowerment Technologies', BASE+'SHS-Applied_Empowerment-Technologies-for-the-Strand.pdf', '''
ICT, Online Safety, and Digital Citizenship|Use digital tools responsibly while evaluating information and protecting privacy.
Productivity Tools|Apply word processing, spreadsheets, and presentation tools to track-related tasks.
Online Platforms and Visual Design|Select platforms and design digital content for an identified audience.
''', '''
Collaborative ICT Development|Plan and manage collaborative digital content using appropriate tools and roles.
ICT for Social Change|Identify a community need and develop a purposeful ICT-based communication project.
Publication, Evaluation, and Reflection|Evaluate a project's usability, ethical practice, impact, and possible improvements.
''')
define('ENT', 'Entrepreneurship', BASE+'SHS-Applied_Entrepreneurship-CG.pdf', '''
Entrepreneurial Competencies and Opportunities|Identify entrepreneurial attributes and evaluate problems as possible business opportunities.
Market Research and Value Proposition|Investigate customer needs and develop a clear product or service proposition.
Business Planning|Plan products, operations, resources, organization, and marketing for a feasible small enterprise.
''', '''
Costs, Pricing, and Financial Planning|Estimate start-up requirements, costs, prices, revenues, and basic financial performance.
Enterprise Implementation|Carry out and document a feasible business activity using responsible practices.
Business Records and Evaluation|Maintain basic records and use results to evaluate and improve the enterprise.
''')
define('III', 'Inquiries, Investigations and Immersion', BASE+'SHS-Applied_Inquiries-Investigations-and-Immersions-CG.pdf', '''
Research Problem and Project Planning|Select a relevant problem and prepare an ethical, feasible investigation plan.
Literature and Research Methods|Refine the literature review, questions, and procedures suited to the investigation.
''', '''
Investigation and Analysis|Gather and analyze evidence systematically and document the investigation process.
Research Report and Presentation|Communicate findings, conclusions, limitations, and recommendations in a final report and presentation.
''')

define('BM', 'Business Mathematics', 'https://lrmds.deped.gov.ph/detail/16008', '''
Fractions, Decimals, and Percentages|Perform accurate business calculations using basic numerical relationships.
Ratios and Proportions|Use direct, inverse, and partitive proportion in business situations.
Buying, Selling, and Discounts|Calculate markups, margins, discounts, profit, and loss in transactions.
''', '''
Compensation and Payroll|Compute appropriate earnings and deductions in illustrative compensation situations.
Interest and Instalment Purchases|Compare interest and instalment arrangements when evaluating transactions.
Business Data Presentation|Organize and interpret business information using suitable tables and graphs.
''')
define('OM', 'Organization and Management', 'https://lrmds.deped.gov.ph/detail/16014', '''
Management Concepts and Theories|Compare management functions, theories, roles, and skills.
The Firm and Its Environment|Analyze business environments using appropriate environmental tools.
Planning and Decision-making|Develop objectives, compare alternatives, and select suitable plans.
Organizing|Analyze organizational structures, authority, delegation, and coordination.
''', '''
Staffing|Explain recruitment, selection, training, compensation, and employee development.
Leading|Compare motivation and leadership approaches and effective workplace communication.
Controlling|Relate performance standards, monitoring, corrective action, and budget control.
Functional Areas and Small Business Management|Connect management functions to operations and the needs of a small enterprise.
''')
define('FABM1', 'Fundamentals of Accountancy, Business and Management 1', 'https://lrmds.deped.gov.ph/detail/16012', '''
Accounting and Its Users|Explain accounting's purpose, branches, users, and business contexts.
Accounting Concepts and the Accounting Equation|Apply basic concepts and analyze effects of transactions on the accounting equation.
Accounts, Documents, and Books|Classify accounts and identify source documents, journals, and ledgers.
Recording Service-business Transactions|Apply debit and credit rules to journalize transactions and prepare a trial balance.
''', '''
Adjustments and the Accounting Cycle|Prepare adjustments and complete the accounting cycle for a service business.
Basic Financial Statements|Prepare and interpret elementary financial statements from organized accounting records.
Merchandising-business Accounting|Record merchandising transactions and determine cost of goods sold and gross profit.
''')
define('FABM2', 'Fundamentals of Accountancy, Business and Management 2', 'https://lrmds.deped.gov.ph/detail/16013', '''
Financial Position and Comprehensive Income|Prepare and interpret statements of financial position and comprehensive income.
Equity and Cash Flows|Explain changes in equity and prepare a cash-flow statement.
Financial Statement Analysis|Use appropriate comparative and ratio analyses to interpret business performance.
''', '''
Banking Documents and Reconciliation|Interpret bank records and prepare a bank reconciliation.
Accounting Practice Set|Integrate documents, journals, ledgers, adjustments, and statements in a practice set.
Income and Business Taxation|Explain basic taxation concepts using the guide's educational examples and applicable references.
''')
define('BF', 'Business Finance', 'https://lrmds.deped.gov.ph/detail/16007', '''
Financial Management and Institutions|Explain financial management, financial markets, and institutional roles.
Financial Analysis and Planning|Interpret business financial information and prepare financial plans and budgets.
Working Capital Management|Evaluate cash, receivables, inventory, and short-term financing decisions.
''', '''
Time Value of Money|Apply present and future values in financial decisions.
Risk, Return, and Investment Decisions|Compare investment and financing alternatives with appropriate consideration of risk.
Personal Finance|Develop responsible plans for earning, spending, saving, borrowing, and investing.
''')
define('AE', 'Applied Economics', 'https://lrmds.deped.gov.ph/detail/16005', '''
Economics and Contemporary Problems|Relate scarcity, choices, and resource allocation to Philippine economic issues.
Demand, Supply, and Markets|Analyze market changes and their effects on prices, consumers, and businesses.
Contemporary Economic Issues|Evaluate evidence concerning economic problems and possible responses.
''', '''
Industry and Environmental Analysis|Examine the business environment and factors affecting an industry.
Business Opportunities and Feasibility|Use economic reasoning to assess costs, benefits, risks, and opportunities.
Socioeconomic Impact|Evaluate a business proposal's potential effects on households, communities, and the economy.
''')
define('BE', 'Business Ethics and Social Responsibility', 'https://lrmds.deped.gov.ph/detail/16006', '''
Business Organizations and Ethical Foundations|Explain business purposes and ethical principles relevant to organizational decisions.
Philosophical and Cultural Perspectives|Compare ethical perspectives and cultural influences on business conduct.
Ethical Issues and Stakeholders|Analyze workplace, consumer, and stakeholder dilemmas using reasoned ethical judgment.
''', '''
Corporate Social Responsibility|Evaluate responsible responses to social and environmental concerns.
Responsible Enterprise Practices|Develop policies that support fairness, accountability, and sustainable operations.
Ethical Decision-making Project|Apply an explicit ethical framework to a documented business case.
''')
define('MKT', 'Principles of Marketing', ACADEMIC, '''
Marketing and the Business Environment|Explain marketing concepts and analyze factors influencing market decisions.
Consumer and Organizational Markets|Compare buying behavior and information needs of different customers.
Segmentation, Targeting, and Positioning|Define a target market and develop a justified positioning strategy.
''', '''
Product and Pricing Decisions|Plan product offerings and pricing suited to customer needs and business objectives.
Distribution and Promotion|Choose appropriate channels and ethical promotional approaches.
Marketing Planning|Integrate market evidence and the marketing mix into an achievable plan.
''')
define('BES', 'Business Enterprise Simulation', ACADEMIC, '''
Enterprise Proposal and Organization|Plan a feasible enterprise and define roles, responsibilities, and ethical practices.
Operations and Market Preparation|Prepare operational procedures, resources, marketing, and financial controls.
''', '''
Enterprise Implementation and Records|Operate the planned activity and document transactions, decisions, and outcomes.
Enterprise Evaluation and Presentation|Analyze performance and present an evidence-based reflection and improvement plan.
''')
define('CW', 'Creative Writing', ACADEMIC, '''
Creative Language and Reading as a Writer|Analyze imagery, diction, figures of speech, and techniques in selected creative texts.
Poetry|Explore poetic elements and forms and revise original poems through feedback.
Fiction|Develop character, setting, plot, conflict, and point of view in an original narrative.
''', '''
Drama|Develop dialogue, character, action, and dramatic structure for a short script.
Writing Workshop|Use constructive criticism to revise creative work with attention to craft and purpose.
Creative Portfolio|Curate and reflect on revised works across the studied genres.
''')
define('WR', 'Introduction to World Religions and Belief Systems', ACADEMIC, '''
Studying Religion and Worldviews|Distinguish religion, spirituality, belief systems, and approaches to respectful comparison.
Judaism|Examine historical development, central teachings, texts, practices, and contemporary issues.
Christianity and Islam|Compare their origins, beliefs, practices, and social contexts without stereotyping adherents.
''', '''
Hinduism and Buddhism|Examine major teachings and practices and their historical and cultural settings.
Confucianism, Taoism, and Shintoism|Compare central concepts and practices in their cultural contexts.
Comparative Religious Understanding|Develop evidence-based comparisons that respect diversity and promote informed dialogue.
''')
define('CN', 'Creative Nonfiction', ACADEMIC, '''
Reading and Analyzing Creative Nonfiction|Distinguish factual grounding from invention and analyze literary techniques in nonfiction.
Forms of Creative Nonfiction|Compare essays, memoirs, profiles, narratives, and other nonfiction forms.
Developing a Factual Narrative|Gather reliable details and shape a coherent narrative ethically.
''', '''
Crafting Creative Nonfiction|Develop scene, voice, characterization, reflection, and structure while remaining faithful to facts.
Workshop and Revision|Evaluate drafts and apply feedback to strengthen accuracy and literary effect.
Nonfiction Portfolio|Present revised work with reflection on sources, ethics, and writing decisions.
''')
define('PPG', 'Philippine Politics and Governance', ACADEMIC, '''
Politics, Governance, and Power|Compare political concepts, ideologies, authority, and forms of power.
State, Nation, and Political History|Relate state formation and Philippine political history to present institutions.
Government Institutions|Explain constitutional structures and the functions of major branches of government.
''', '''
Local Governance and Civil Society|Examine local institutions, decentralization, and citizen organizations.
Elections, Parties, and Participation|Analyze representation, elections, political parties, and responsible civic action.
Citizenship and Governance Issues|Evaluate public issues using evidence and democratic principles.
''')
define('DISS', 'Disciplines and Ideas in the Social Sciences', ACADEMIC, '''
Social Sciences and Their Emergence|Distinguish social sciences from related fields and explain their historical development.
Social-science Disciplines|Compare the objects, questions, and methods of major social-science disciplines.
Foundational Theoretical Perspectives|Analyze society through classical theoretical approaches.
''', '''
Contemporary Theories and Approaches|Compare modern perspectives and apply them to selected social issues.
Filipino Social Thought|Examine contextual approaches to understanding Philippine society.
Applying Social-science Analysis|Develop a supported analysis of a relevant social phenomenon.
''')
define('DIASS', 'Disciplines and Ideas in the Applied Social Sciences', ACADEMIC, '''
Applied Social Sciences|Relate applied fields to their social-science foundations and ethical responsibilities.
Counseling|Explain counseling goals, practitioners, contexts, and the importance of appropriate professional boundaries.
Social Work|Examine social-work roles, services, settings, and responses to community needs.
''', '''
Communication as an Applied Discipline|Explain communication practitioners, audiences, functions, and professional ethics.
Processes and Settings of Practice|Compare how applied professionals work with individuals, groups, and communities.
Evaluating Applied Social-science Services|Assess contributions and limitations of services using relevant evidence.
''')
define('TNCT', 'Trends, Networks and Critical Thinking in the 21st Century Culture', ACADEMIC, '''
Trends and Patterns|Distinguish trends from fads and analyze drivers and emerging patterns.
Local Networks and Community Connections|Map local relationships and examine how connections affect communities.
Global Networks and Interdependence|Explain globalization and connections among economic, political, and cultural systems.
''', '''
Democratic and Participatory Networks|Evaluate civic participation, collaboration, and shared decision-making.
Information and Neural Networks|Compare network concepts and examine implications for contemporary life.
Critical Thinking and Future Scenarios|Evaluate claims and construct reasoned responses to emerging social challenges.
''')
define('CESC', 'Community Engagement, Solidarity and Citizenship', ACADEMIC, '''
Understanding Communities|Analyze community structures, diversity, dynamics, and local relationships.
Engagement, Solidarity, and Citizenship|Explain civic responsibilities and participatory approaches grounded in human dignity.
Community Needs and Partnerships|Gather information ethically and identify priorities with community stakeholders.
''', '''
Community Action Planning|Develop a participatory plan with feasible goals, resources, responsibilities, and evaluation criteria.
Community Action Implementation|Document responsible implementation and collaboration with community partners.
Reflection and Evaluation|Evaluate outcomes and explain lessons for sustained and accountable civic participation.
''')
define('CA', 'Culminating Activity', ACADEMIC, '''
Integrative Project Planning|Choose a project that integrates strand competencies and establish feasible objectives and criteria.
Portfolio Development|Gather and organize evidence of learning with appropriate attribution and reflection.
''', '''
Project Implementation and Documentation|Carry out the project and document decisions, challenges, and responses.
Presentation and Evaluation|Present outputs, reflect on learning, and evaluate outcomes against agreed criteria.
''')
define('DRRR', 'Disaster Readiness and Risk Reduction', ACADEMIC, '''
Disaster Risk Concepts|Explain hazards, exposure, vulnerability, capacities, and disaster risk.
Earthquake and Volcanic Hazards|Interpret appropriate hazard information and identify preventive and protective actions.
Hydrometeorological and Other Hazards|Assess weather-related, landslide, fire, and other relevant local risks.
''', '''
Preparedness and Community Planning|Develop practical preparedness and communication plans using reliable local information.
Emergency Response and Recovery|Explain appropriate response, evacuation, and recovery practices within one's training.
Community Risk-reduction Proposal|Use a local risk assessment to propose achievable prevention and preparedness measures.
''')
define('WI', 'Work Immersion', ACADEMIC, '''
Pre-immersion Orientation|Explain workplace expectations, ethical conduct, safety, rights, and responsibilities.
Workplace Communication and Preparation|Prepare required documents and practice professional communication and confidentiality.
''', '''
Supervised Workplace Learning|Document assigned activities, observations, and skills under appropriate supervision.
Post-immersion Portfolio and Reflection|Compile evidence of participation and reflect on competencies, work habits, and career learning.
''')

# ICC publicly lists CSS and FBS in its TESDA offerings. They are only candidate
# SHS specializations here; the school has not confirmed a Caloocan SHS sequence.
CSS_SOURCE=BASE+'Computer-Systems-Servicing-NC-II-CG.pdf'
define('CSS1', 'Computer Systems Servicing NC II - Foundations', CSS_SOURCE, '''
Entrepreneurial Competencies and Market|Relate personal competencies and local opportunities to computer servicing work.
Occupational Safety and Hand Tools|Select and use tools safely while observing workplace and environmental requirements.
''', '''
Computer Operations and Quality Standards|Apply quality requirements and appropriate computer operations to technical tasks.
Technical Drawing, Measurement, and Components|Interpret technical information and perform measurements and component checks.
''')
define('CSS2', 'Computer Systems Servicing NC II - Installation and Configuration', CSS_SOURCE, '''
Preparing Computer-system Installation|Identify requirements, components, tools, and procedures for installation.
Assembling and Installing Hardware|Assemble and connect computer components following specifications and safety requirements.
''', '''
Operating Systems and Software|Install and configure operating systems, drivers, and applications appropriately.
Installation Testing and Documentation|Test system operation, resolve identified issues, and document installation results.
''')
define('CSS3', 'Computer Systems Servicing NC II - Networks and Servers', CSS_SOURCE, '''
Network Planning and Cabling|Identify network requirements and prepare suitable network media and connections.
Network Configuration and Testing|Configure network devices and connections and verify communication against requirements.
''', '''
Server Setup and Access|Prepare server systems and configure appropriate user access and network services.
Server Testing and Documentation|Check services and security settings and document configuration and test results.
''')
define('CSS4', 'Computer Systems Servicing NC II - Maintenance and Repair', CSS_SOURCE, '''
Preventive Maintenance|Plan and perform appropriate preventive maintenance on computer systems and networks.
Fault Diagnosis|Use systematic procedures and suitable tools to identify hardware, software, and network faults.
''', '''
Repair and Recovery|Carry out appropriate repairs, configuration corrections, and recovery procedures safely.
Final Testing and Service Reporting|Verify restored operation and prepare clear maintenance and service records.
''')
define('FBS', 'Food and Beverage Services NC II', BASE+'Food-and-Beverage-Services-NC-II-CG.pdf', '''
Service Safety, Hygiene, and Preparation|Prepare service areas, equipment, and personnel using appropriate hygiene and safety practices.
Guest Reception and Table Preparation|Welcome guests and prepare tables, reservations, and dining areas to service requirements.
Menu Presentation and Order-taking|Provide accurate information, take orders, and communicate guest requirements professionally.
''', '''
Food and Beverage Service|Apply suitable service procedures and attentive communication during dining service.
Room Service and Guest Concerns|Handle service requests and concerns according to appropriate procedures and limits of responsibility.
Billing, Clearing, and Closing|Process accurate bills and complete clearing, storage, and end-of-service tasks.
''')

records=[]
def add(key, grade, semester, strand='', kind='Core', slot=None, candidate=False, hours=80):
    d=definitions[key]
    code=f'{strand or "CORE"}-{grade}{semester}-{slot or key}'
    name=d['name']
    research=key in ['PR1','PR2','III','WI','CA','BES']
    preset='core' if kind=='Core' else ('tvl-immersion' if research else 'tvl-specialized') if strand in ['ICT','HE'] else 'acad-immersion' if research else 'acad-specialized'
    weights={'core':(25,50,25),'tvl-specialized':(20,60,20),'tvl-immersion':(20,60,20),'acad-immersion':(35,40,25),'acad-specialized':(25,45,30)}[preset]
    note='DepEd-based planning draft. ICC must confirm the grade/semester placement before publication. Topic groups and material descriptions are authored planning outlines, not official DepEd module counts.'
    if candidate:note+=' This specialization/elective selection is a candidate and is not confirmed as an ICC Caloocan SHS offering.'
    if key.startswith('CSS'):note+=' The 640-hour CSS guide is divided into four proposed 160-hour semester segments; competency pacing requires school approval.'
    meta=dict(framework='DepEd K to 12 SHS Core/Applied/Specialized (capstone scope)',sourceUrl=d['source'],gradingSource=GRADING,schoolSource=ICC,schoolScheduleConfirmed=False,specializationConfirmed=not candidate,slot=slot,note=note,materialFilesIncluded=False)
    meta['unitsProvisional']=True
    meta['unitBasis']='User-approved provisional application convention: 20 hours = 1 unit; 80 hours = 3 units; 160 hours = 6 units. Not a verified DepEd or ICC credit-unit rule.'
    meta['note']+=' Unit values use an application convention pending ICC confirmation.'
    topics=[];materials=[]
    for half,rows in enumerate(d['units']):
        q=f'q{(semester-1)*2+half+1}'
        for title,focus in rows:
            tid=f'{code}-T{len(topics)+1:02}'
            mat=dict(id=tid+'-M01',title=title+' - Learning Guide',description=focus+' This material record contains the planned learning focus only; its teaching file will be added later.',type='Lesson',topicId=tid,quarter=q,status='Draft',sourceType='information',fileName='',fileUrl='',url='',videoUrl='',fileType='',authorRole='Admin',isAdmin=True,isTeacher=False)
            materials.append(mat)
            topics.append(dict(id=tid,title=title,description=focus,quarter=q,authorRole='Admin',isAdmin=True,isTeacher=False,materials=[mat],handouts=[mat],allMaterials=[mat],activities=[],assignments=[],quizzes=[],performanceTasks=[],videos=[]))
    records.append(dict(id=code,code=code,name=name,units={20:'1',80:'3',160:'6'}[hours],learningHours=hours,gradeLevel=str(grade),type=kind,strand=strand,weights=dict(zip(['ww','pt','qa'],weights),preset=preset),status='Draft',activeQuarters=[f'q{(semester-1)*2+1}',f'q{(semester-1)*2+2}'],topics=topics,materials=materials,curriculum=meta))

for key,grade,sem in [('OC',11,1),('KPW',11,1),('GM',11,1),('ELS',11,1),('PD',11,1),('RW',11,2),('PPT',11,2),('SP',11,2),('UCSP',11,2),('LIT',11,2),('MIL',12,1),('PHI',12,1),('PS',12,1),('ART',12,2),('PE1',11,1),('PE2',11,2),('PE3',12,1),('PE4',12,2)]:add(key,grade,sem,hours=20 if key.startswith('PE') else 80)
for strand in ['ABM','GAS','HUMSS','ICT','HE']:
    for key,grade,sem in [('EAPP',11,1),('ETECH',11,1),('PR1',11,2),('PR2',12,1),('FPT' if strand in ['ICT','HE'] else 'FPA',12,1),('ENT',12,2),('III',12,2)]:add(key,grade,sem,strand,'Applied')
for key,grade,sem in [('BM',11,1),('OM',11,1),('FABM1',11,2),('MKT',11,2),('FABM2',12,1),('BF',12,1),('AE',12,2),('BE',12,2),('BES',12,2)]:add(key,grade,sem,'ABM','Specialized')
for key,grade,sem in [('WR',11,1),('DISS',11,1),('CW',11,2),('PPG',11,2),('CN',12,1),('DIASS',12,1),('TNCT',12,2),('CESC',12,2),('CA',12,2)]:add(key,grade,sem,'HUMSS','Specialized')
# GAS curriculum explicitly leaves Humanities/Social Science/elective selections to schools.
for key,grade,sem,slot in [('WR',11,1,'HUM1'),('CW',11,2,'HUM2'),('DISS',11,1,'SOC1'),('AE',12,1,'AE'),('OM',12,1,'OM'),('DRRR',11,2,'DRRR'),('BM',11,2,'ELEC1'),('MKT',12,1,'ELEC2'),('WI',12,2,'WI')]:add(key,grade,sem,'GAS','Specialized',slot,candidate=slot in ['HUM1','HUM2','SOC1','ELEC1','ELEC2'])
for key,grade,sem in [('CSS1',11,1),('CSS2',11,2),('CSS3',12,1),('CSS4',12,2)]:add(key,grade,sem,'ICT','Specialized',candidate=True,hours=160)
add('FBS',11,2,'HE','Specialized',candidate=True,hours=160)
for strand in ['ICT','HE']:add('WI',12,2,strand,'Specialized')

out=ROOT/'data'/'curriculum'
out.mkdir(parents=True,exist_ok=True)
bundle=dict(batch='deped-k12-shs-planning-20261022',status='Draft',scope=['ABM','GAS','HUMSS','ICT','HE'],notice='Planning catalog; not an approved ICC class program. ICT/HE specialization coverage and GAS elective choices require ICC confirmation.',subjects=records)
(out/'deped-shs-catalog.json').write_text(json.dumps(bundle,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
counts=Counter(s['strand'] or 'Common Core' for s in records)
report=['# DepEd-based SHS catalog', '', bundle['notice'], '', '## Scope and sources', '', '- Capstone documentation PDF page 7: ABM, GAS, HUMSS, ICT and HE. No STEM, Arts and Design, Sports, or K–10 subjects are included.', '- Curriculum framework: original Core / Applied / Specialized structure used in the document, not the separate Strengthened SHS program.', f'- [ICC SHS programs]({ICC}): programs are listed, but a Caloocan subject/semester checklist and lesson outlines were not found.', f'- [DepEd Academic Track catalog]({ACADEMIC})', f'- [DepEd grading policy, Table 5, PDF page 13]({GRADING})', '', '## Planning decisions', '', '- All records are drafts. Semester placements are proposed and must be checked against ICC’s approved class program.', '- The guides set competencies and time allocations; they do not mandate one universal number of LMS topics or materials. Topic units below group related competencies. One information-only learning-guide record is attached to each topic.', '- Units use the user-approved provisional application convention (20 hours = 1 unit, 80 hours = 3 units, 160 hours = 6 units), pending ICC confirmation. Learning hours are stored separately: typically 80 hours, with 20 hours per PE semester; candidate TVL qualifications use their guide hours.', '- Applied subjects have separate strand records so gradebook weights and track-specific Filipino variants remain unambiguous.', '- GAS Humanities/Social Science/elective choices are candidates, not a claim that ICC selected them.', '- Candidate CSS and Food and Beverage Services are based on DepEd guides and ICC’s TESDA program page; TESDA listings do not establish the actual SHS offering. Other ICT/HE qualifications are not invented.', '- No subject is assigned to a section; none exist. The catalog can be assigned after its school-specific details are confirmed and it is published.', '- No attachments, video URLs, quizzes, scores, due dates, or submissions are created.', '', '## Totals', '', f'- Subjects: {len(records)}', f'- Topics: {sum(len(s["topics"]) for s in records)}', f'- Material information records: {sum(len(s["materials"]) for s in records)}', '', '| Group | Subject records |','|---|---:|']
report += [f'| {group} | {count} |' for group,count in counts.items()]
report += ['', '## Grade / semester / topic counts', '', '| Code | Subject | Grade | Semester | Q1/Q3 topics | Q2/Q4 topics | WW/PT/QA |','|---|---|---:|---:|---:|---:|---|']
for s in records:
    qs=s['activeQuarters'];w=s['weights'];report.append(f'| {s["code"]} | {s["name"]} | {s["gradeLevel"]} | {1 if qs[0]=="q1" else 2} | {sum(t["quarter"]==qs[0] for t in s["topics"])} | {sum(t["quarter"]==qs[1] for t in s["topics"])} | {w["ww"]}/{w["pt"]}/{w["qa"]} |')
report += ['', '## Subject guide references', '']
report += [f'- {d["name"]}: {d["source"]}' for d in definitions.values()]
(out/'README.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
print(json.dumps({'subjects':len(records),'topics':sum(len(s['topics']) for s in records),'materials':sum(len(s['materials']) for s in records),'groups':counts}))
