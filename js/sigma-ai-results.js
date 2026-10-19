(function () {
    'use strict';

    // Mock/Initial Data generator populated with realistic student & teacher accounts
    const REAL_USERS = [
        { id: '2601033', name: 'Amanda Suri Gao', role: 'Student', email: 'amanda67@gmail.com' },
        { id: '2601032', name: 'Kris Prusko Yup', role: 'Student', email: 'kris.yup@gmail.com' },
        { id: '2601031', name: 'Henry Wrecker Ochoa', role: 'Student', email: 'henry12@gmail.com' },
        { id: '2601034', name: 'John Darwin Lapira', role: 'Student', email: 'john.darwin@gmail.com' },
        { id: '2601021', name: 'Jen Chu Tiangco', role: 'Teacher', email: 'jenjen87@gmail.com' },
        { id: '2601022', name: 'Mark Anthony Santos', role: 'Teacher', email: 'mark.santos@gmail.com' },
        { id: '2601035', name: 'Bea Patricia Ramos', role: 'Student', email: 'bea.ramos@gmail.com' },
        { id: '2601036', name: 'Carl Kenneth Reyes', role: 'Student', email: 'carl.reyes@gmail.com' }
    ];

    const DATA_STORES = {
        'evaluations': [],
        'feedback': [
            { id: 'FDBK-804', userId: '2601036', name: 'Carl Kenneth Reyes', role: 'Student', subject: 'Web Development • Responsive Header', type: 'Formative Advice', status: 'Sent', date: 'Oct 16, 2026', details: 'Ensure media queries break at standard 768px for tablet navigation menus. Good color contrast choices.' },
            { id: 'FDBK-803', userId: '2601031', name: 'Henry Wrecker Ochoa', role: 'Student', subject: 'Computer Programming 1 • Quiz 1', type: 'Support Guidance', status: 'Pending Review', date: 'Oct 16, 2026', details: 'Check topic lecture slides 14 to 22 on Arrays. Your logic was on the right track; focus on bracket indexing syntax.' },
            { id: 'FDBK-802', userId: '2601032', name: 'Kris Prusko Yup', role: 'Student', subject: 'Computer Programming 1 • Quiz 1', type: 'Corrective Review', status: 'Sent', date: 'Oct 15, 2026', details: 'Review the difference between while and do-while loops. Remember that do-while will execute the block at least once.' },
            { id: 'FDBK-801', userId: '2601033', name: 'Amanda Suri Gao', role: 'Student', subject: 'Computer Programming 1 • Lab 1', type: 'Formative Advice', status: 'Sent', date: 'Oct 14, 2026', details: 'Great work maintaining clean code structure. For next assignment, try incorporating try-catch exception handling.' }
        ],
        'assessments': [
            { id: 'ASMT-703', userId: '2601021', name: 'Jen Chu Tiangco', role: 'Teacher', subject: 'Computer Programming 1 • Loops Lab Exercise', type: 'Coding Task', status: 'Draft', date: 'Oct 16, 2026', details: 'Created 3 coding scenarios: Fibonacci sequence generator, prime number checker, and factorial calculator with automated test cases.' },
            { id: 'ASMT-702', userId: '2601022', name: 'Mark Anthony Santos', role: 'Teacher', subject: 'Database Systems • Normalization Quiz', type: 'Multiple Choice', status: 'Active', date: 'Oct 15, 2026', details: 'Generated 15 questions focusing on 1NF, 2NF, and 3NF functional dependencies and relational schema design.' },
            { id: 'ASMT-701', userId: '2601021', name: 'Jen Chu Tiangco', role: 'Teacher', subject: 'Computer Programming 1 • 10-Item Practice Quiz', type: 'Multiple Choice & Code', status: 'Active', date: 'Oct 14, 2026', details: 'Generated 10 questions covering Variables, If-Else conditionals, and Data Types with Bloom\'s Taxonomy cognitive levels.' }
        ],
        'insights': [
            // Combined Analytics Insights & Grade Insights
            { id: 'INST-605', userId: '2601034', name: 'John Darwin Lapira', role: 'Student', subject: 'Web Development • GWA Trajectory', type: 'Grade Insight', status: 'Positive Trend', date: 'Oct 16, 2026', details: 'High performance trajectory sustained. GWA estimation stands at 1.25 (Superior Performance).' },
            { id: 'INST-604', userId: '2601032', name: 'Kris Prusko Yup', role: 'Student', subject: 'Computer Programming 1 • Submission Timeliness', type: 'Analytics Insight', status: 'Consistent', date: 'Oct 16, 2026', details: 'All 4 assignments submitted on or before scheduled deadline. Average submission buffer: 14 hours.' },
            { id: 'INST-603', userId: '2601021', name: 'Jen Chu Tiangco', role: 'Teacher', subject: 'BSIT 1-A • Class Mastery Snapshot', type: 'Analytics Insight', status: 'Class Alert', date: 'Oct 15, 2026', details: '78% of class mastered Conditional Statements. 22% require reinforcement before the upcoming Midterm assessment.' },
            { id: 'INST-602', userId: '2601031', name: 'Henry Wrecker Ochoa', role: 'Student', subject: 'Computer Programming 1 • Assessment Risk Alert', type: 'Diagnostic Alert', status: 'At Risk', date: 'Oct 15, 2026', details: 'Scored 45/100 on Quiz 1. Attendance is 100% but assessment accuracy dipped 28%. Recommended remedial consultation on control loops.' },
            { id: 'INST-601', userId: '2601033', name: 'Amanda Suri Gao', role: 'Student', subject: 'Computer Programming 1 • Quarterly GWA Forecast', type: 'Grade Insight', status: 'Positive Trend', date: 'Oct 14, 2026', details: 'Projected 1st Quarter Grade: 91.5 (High Mastery). Consistent high marks across quizzes and lab assignments.' }
        ],
        'bot': [
            { id: 'BOT-503', userId: '2601031', name: 'Henry Wrecker Ochoa', role: 'Student', subject: 'Chat Query: Quiz 1 Review Pointers', type: 'Student Inquiry', status: 'Resolved', date: 'Oct 16, 2026', details: 'User asked for pointers on Quiz 1 topics. Bot summarized key variable types and operator precedence.' },
            { id: 'BOT-502', userId: '2601021', name: 'Jen Chu Tiangco', role: 'Teacher', subject: 'Chat Query: Rubric Criteria Suggestion', type: 'Teacher Assistance', status: 'Resolved', date: 'Oct 15, 2026', details: 'User asked: "Suggest 4 grading criteria for introductory HTML/CSS laboratory." Bot returned weighted rubric matrix.' },
            { id: 'BOT-501', userId: '2601033', name: 'Amanda Suri Gao', role: 'Student', subject: 'Chat Query: Loops & Arrays Explanation', type: 'Student Inquiry', status: 'Resolved', date: 'Oct 14, 2026', details: 'User asked: "Paano gumagana ang 2D array sa C++?" Bot provided bilingual explanation with illustrative code snippet.' }
        ]
    };
    // This register must only show real completed generations. The old sample
    // arrays are retained here temporarily for backward-compatible scripts but
    // are never used as register data.
    Object.keys(DATA_STORES).forEach(key => { DATA_STORES[key] = []; });

    // Visible only when the register has no real generated output. These rows
    // are never saved, searched outside this screen, or included with records.
    const EVALUATION_PREVIEW_ROWS = [];

    const FEEDBACK_PREVIEW_ROWS = [];

    const ASSESSMENT_PREVIEW_ROWS = [];

    const BOT_PREVIEW_ROWS = [
        {
            id: 'CHAT-2026-0044',
            userId: '0000000',
            name: 'Stanley Garcia',
            role: 'Admin',
            subject: 'System maintenance backup and analytics audit inquiry',
            type: 'Admin Inquiry',
            status: 'Resolved',
            date: 'Oct 15, 2026',
            timestamp: Date.parse('2026-10-15T11:20:00+08:00'),
            details: 'System diagnostic checks and database synchronization procedures.',
            messages: [
                { role: 'user', text: 'How do I verify database synchronization before tonight’s scheduled maintenance?', timestamp: '2026-10-15T11:20:00+08:00' },
                { role: 'assistant', text: 'Hello Administrator Stanley! Navigate to **System Settings**, open the **Database & Maintenance** section, and click **Run Integrity Verification**. The system will verify table sync across nodes.', timestamp: '2026-10-15T11:20:04+08:00' }
            ]
        },
        {
            id: 'CHAT-2026-0043',
            userId: '0000001',
            name: 'Carlos Mendoza',
            role: 'Admin',
            subject: 'User role permissions and access provisioning for teachers',
            type: 'Admin Assistance',
            status: 'Resolved',
            date: 'Oct 14, 2026',
            timestamp: Date.parse('2026-10-14T15:05:00+08:00'),
            details: 'Role provisioning and faculty authorization setup.',
            messages: [
                { role: 'user', text: 'What permissions are required for newly onboarded faculty to access curriculum management?', timestamp: '2026-10-14T15:05:00+08:00' },
                { role: 'assistant', text: 'Faculty accounts need the Teacher role assignment with assigned sections in the Academic Roster module. Once assigned, they can view curriculum tools immediately.', timestamp: '2026-10-14T15:05:03+08:00' }
            ]
        },
        {
            id: 'CHAT-2026-0042',
            userId: '1111111',
            name: 'Maria Santos Ramos',
            role: 'Teacher',
            subject: 'Grading rubric criteria for HTML/CSS laboratory',
            type: 'Teacher Assistance',
            status: 'Resolved',
            date: 'Oct 10, 2026',
            timestamp: Date.parse('2026-10-10T21:54:00+08:00'),
            details: 'Hello! How can I help you today?',
            messages: [
                { role: 'user', text: 'hello', timestamp: '2026-10-10T21:54:00+08:00' },
                { role: 'assistant', text: 'Hello! How can I help you today?', timestamp: '2026-10-10T21:54:02+08:00' }
            ]
        },
        {
            id: 'CHAT-2026-0041',
            userId: '2601033',
            name: 'Amanda Suri Gao',
            role: 'Student',
            subject: 'Loops & 2D Arrays in C++',
            type: 'Student Inquiry',
            status: 'Resolved',
            date: 'Oct 11, 2026',
            timestamp: Date.parse('2026-10-11T14:22:00+08:00'),
            details: 'A 2D array in C++ can be visualized as a grid or matrix with rows and columns.',
            messages: [
                { role: 'user', text: 'Hi Sigma! Can you explain how a 2D array works in C++ and how to iterate through it using nested loops?', timestamp: '2026-10-11T14:20:00+08:00' },
                { role: 'assistant', text: 'Hello Amanda! A 2D array in C++ is essentially an array of arrays. You can visualize it as a table of rows and columns.\n\nHere is a quick example using nested loops:\n```cpp\nint matrix[2][3] = {{1, 2, 3}, {4, 5, 6}};\nfor (int i = 0; i < 2; i++) {\n    for (int j = 0; j < 3; j++) {\n        cout << matrix[i][j] << " ";\n    }\n    cout << endl;\n}\n```\nThe outer loop moves row by row, while the inner loop iterates through each column within that row.', timestamp: '2026-10-11T14:20:05+08:00' }
            ]
        },
        {
            id: 'CHAT-2026-0040',
            userId: '2601031',
            name: 'Henry Wrecker Ochoa',
            role: 'Student',
            subject: 'Review pointers for Quiz 1 in Computer Programming 1',
            type: 'Student Inquiry',
            status: 'Resolved',
            date: 'Oct 12, 2026',
            timestamp: Date.parse('2026-10-12T10:15:00+08:00'),
            details: 'Here are the essential review pointers for Quiz 1: Variables, data types, and loop control structures.',
            messages: [
                { role: 'user', text: 'What should I focus on reviewing for our upcoming Quiz 1 in Computer Programming 1?', timestamp: '2026-10-12T10:15:00+08:00' },
                { role: 'assistant', text: 'Hi Henry! Based on your course outline for Computer Programming 1, here are the top 3 core topics for Quiz 1:\n1. Primitive Data Types & Variables (int, float, char, bool, memory sizes)\n2. Arithmetic & Logical Operator Precedence\n3. Conditional Statements (if-else and switch-case syntax)\n\nMake sure to review lecture slides 14 to 22!', timestamp: '2026-10-12T10:15:04+08:00' }
            ]
        },
        {
            id: 'CHAT-2026-0039',
            userId: '2601021',
            name: 'Jen Chu Tiangco',
            role: 'Teacher',
            subject: 'Automated quiz generation guidelines',
            type: 'Teacher Assistance',
            status: 'Resolved',
            date: 'Oct 13, 2026',
            timestamp: Date.parse('2026-10-13T16:40:00+08:00'),
            details: 'Guidelines for configuring assessment question difficulty based on Bloom\'s Taxonomy.',
            messages: [
                { role: 'user', text: 'Could you give me suggestions for question balance on a 15-item quiz on Database Normalization?', timestamp: '2026-10-13T16:40:00+08:00' },
                { role: 'assistant', text: 'Certainly Professor Jen! A recommended distribution for a 15-item quiz is:\n- 5 Recall/Understanding questions (Definitions of 1NF, 2NF, 3NF)\n- 6 Application questions (Identifying functional dependencies in sample relations)\n- 4 Analysis questions (Decomposing a non-normalized table into BCNF/3NF)\n\nThis ensures a balanced evaluation.', timestamp: '2026-10-13T16:40:03+08:00' }
            ]
        },
        {
            id: 'CHAT-2026-0038',
            userId: '2222222',
            name: 'Juan Abad Dela Cruz',
            role: 'Student',
            subject: 'Due dates and coursework submission inquiry',
            type: 'Student Inquiry',
            status: 'Resolved',
            date: 'Oct 14, 2026',
            timestamp: Date.parse('2026-10-14T09:10:00+08:00'),
            details: 'Assistance finding the submission portal for Lab Exercise 2.',
            messages: [
                { role: 'user', text: 'Where can I upload my submission for Lab Exercise 2 in Web Development?', timestamp: '2026-10-14T09:10:00+08:00' },
                { role: 'assistant', text: 'Hello Juan! Navigate to your **Classroom** tab, select **Web Development**, open **Module 2**, and click on **Lab Exercise 2: Responsive Navigation Bar**. You will see the **Turn In / Upload Submission** button on the right side of the page.', timestamp: '2026-10-14T09:10:02+08:00' }
            ]
        }
    ];

    const USER_PAST_CONVERSATIONS = {
        // Stanley Garcia (Admin - ID 0000000)
        '0000000': [
            {
                id: 'CHAT-2026-0044',
                title: 'How do I verify database synchronization before tonight’s scheduled maintenance?',
                date: 'Oct 15, 2026',
                timestamp: Date.parse('2026-10-15T11:20:00+08:00'),
                messages: [
                    { role: 'user', text: 'How do I verify database synchronization before tonight’s scheduled maintenance?', timestamp: '2026-10-15T11:20:00+08:00' },
                    { role: 'assistant', text: 'Hello Administrator Stanley! Navigate to **System Settings**, open the **Database & Maintenance** section, and click **Run Integrity Verification**. The system will verify table sync across nodes.', timestamp: '2026-10-15T11:20:04+08:00' }
                ]
            },
            {
                id: 'CHAT-SG-002',
                title: 'Audit log export procedure for Q3 compliance review',
                date: 'Oct 12, 2026',
                timestamp: Date.parse('2026-10-12T15:45:00+08:00'),
                messages: [
                    { role: 'user', text: 'Where can I download the audit trails for user access during the third quarter?', timestamp: '2026-10-12T15:45:00+08:00' },
                    { role: 'assistant', text: 'You can export the audit logs by going to **Audit Logs** > **Export Data** > select **Date Range (Jul 1 - Sep 30)** and choose **CSV** or **PDF** format.', timestamp: '2026-10-12T15:45:04+08:00' }
                ]
            },
            {
                id: 'CHAT-SG-003',
                title: 'Server resource thresholds and alert notification settings',
                date: 'Oct 08, 2026',
                timestamp: Date.parse('2026-10-08T09:15:00+08:00'),
                messages: [
                    { role: 'user', text: 'How do I set warning thresholds for CPU and storage utilization alerts?', timestamp: '2026-10-08T09:15:00+08:00' },
                    { role: 'assistant', text: 'Go to **System Settings** > **Monitoring & Alerts**. You can configure threshold percentages for CPU spikes and disk volume warnings.', timestamp: '2026-10-08T09:15:03+08:00' }
                ]
            },
            {
                id: 'CHAT-SG-004',
                title: 'Automated database backup schedule verification',
                date: 'Oct 03, 2026',
                timestamp: Date.parse('2026-10-03T14:30:00+08:00'),
                messages: [
                    { role: 'user', text: 'Is the daily snapshot backup configured to run at midnight?', timestamp: '2026-10-03T14:30:00+08:00' },
                    { role: 'assistant', text: 'Yes, automated snapshots are scheduled for 00:00 UTC daily. All backup archives are stored in encrypted cloud storage.', timestamp: '2026-10-03T14:30:04+08:00' }
                ]
            }
        ],

        // Carlos Mendoza (Admin - ID 0000001)
        '0000001': [
            {
                id: 'CHAT-2026-0043',
                title: 'What permissions are required for newly onboarded faculty to access curriculum management?',
                date: 'Oct 14, 2026',
                timestamp: Date.parse('2026-10-14T15:05:00+08:00'),
                messages: [
                    { role: 'user', text: 'What permissions are required for newly onboarded faculty to access curriculum management?', timestamp: '2026-10-14T15:05:00+08:00' },
                    { role: 'assistant', text: 'Faculty accounts need the Teacher role assignment with assigned sections in the Academic Roster module. Once assigned, they can view curriculum tools immediately.', timestamp: '2026-10-14T15:05:03+08:00' }
                ]
            },
            {
                id: 'CHAT-CM-002',
                title: 'Resetting multi-factor authentication for department chair',
                date: 'Oct 11, 2026',
                timestamp: Date.parse('2026-10-11T11:10:00+08:00'),
                messages: [
                    { role: 'user', text: 'How do I reset MFA for a faculty member who lost their device?', timestamp: '2026-10-11T11:10:00+08:00' },
                    { role: 'assistant', text: 'Navigate to **User Accounts**, search for the faculty member, click **Account Security**, and select **Reset 2FA/MFA Method**.', timestamp: '2026-10-11T11:10:03+08:00' }
                ]
            },
            {
                id: 'CHAT-CM-003',
                title: 'Bulk import format for 2nd semester student enrollment',
                date: 'Oct 07, 2026',
                timestamp: Date.parse('2026-10-07T16:20:00+08:00'),
                messages: [
                    { role: 'user', text: 'What template columns are required for the student CSV import?', timestamp: '2026-10-07T16:20:00+08:00' },
                    { role: 'assistant', text: 'The required columns are: `StudentID`, `FirstName`, `LastName`, `Email`, `Program`, and `YearLevel`. You can download the sample CSV template under **User Accounts** > **Import**.', timestamp: '2026-10-07T16:20:04+08:00' }
                ]
            },
            {
                id: 'CHAT-CM-004',
                title: 'Archiving inactive student accounts from previous academic year',
                date: 'Oct 02, 2026',
                timestamp: Date.parse('2026-10-02T13:15:00+08:00'),
                messages: [
                    { role: 'user', text: 'How should we archive graduated batch 2025 records?', timestamp: '2026-10-02T13:15:00+08:00' },
                    { role: 'assistant', text: 'Go to **Record Recovery** > **Archive Manager** and filter by Status: Graduated. Click **Batch Archive** to move them safely to archive.', timestamp: '2026-10-02T13:15:04+08:00' }
                ]
            }
        ],

        // Juan Abad Dela Cruz (Student - ID 2222222)
        '2222222': [
            {
                id: 'CHAT-2026-0038',
                title: 'Where can I upload my submission for Lab Exercise 2 in Web Development?',
                date: 'Oct 14, 2026',
                timestamp: Date.parse('2026-10-14T09:10:00+08:00'),
                messages: [
                    { role: 'user', text: 'Where can I upload my submission for Lab Exercise 2 in Web Development?', timestamp: '2026-10-14T09:10:00+08:00' },
                    { role: 'assistant', text: 'Hello Juan! Navigate to your **Classroom** tab, select **Web Development**, open **Module 2**, and click on **Lab Exercise 2: Responsive Navigation Bar**. You will see the **Turn In / Upload Submission** button on the right side of the page.', timestamp: '2026-10-14T09:10:02+08:00' }
                ]
            },
            {
                id: 'CHAT-JA-002',
                title: 'Clarification on late submission policy for Midterm Project',
                date: 'Oct 10, 2026',
                timestamp: Date.parse('2026-10-10T14:40:00+08:00'),
                messages: [
                    { role: 'user', text: 'Is there a deduction for submitting the project one day late?', timestamp: '2026-10-10T14:40:00+08:00' },
                    { role: 'assistant', text: 'According to your course syllabus, submissions turned in within 24 hours of the deadline receive a 10% late deduction unless an official excuse is approved by the instructor.', timestamp: '2026-10-10T14:40:03+08:00' }
                ]
            },
            {
                id: 'CHAT-JA-003',
                title: 'Missing grades for Database Normalization Quiz',
                date: 'Oct 05, 2026',
                timestamp: Date.parse('2026-10-05T10:15:00+08:00'),
                messages: [
                    { role: 'user', text: 'Why is my score for Quiz 2 not yet reflected in my Grades overview?', timestamp: '2026-10-05T10:15:00+08:00' },
                    { role: 'assistant', text: 'Quiz 2 contains manual-check short response questions. Your professor is still reviewing them. Once published, your grade will update automatically.', timestamp: '2026-10-05T10:15:04+08:00' }
                ]
            },
            {
                id: 'CHAT-JA-004',
                title: 'Accessing lecture recordings for Computer Programming 1',
                date: 'Sep 28, 2026',
                timestamp: Date.parse('2026-09-28T16:50:00+08:00'),
                messages: [
                    { role: 'user', text: 'Where are the Zoom meeting recordings stored?', timestamp: '2026-09-28T16:50:00+08:00' },
                    { role: 'assistant', text: 'You can find all meeting recordings under **Classroom** > **Resources** > **Lecture Recordings** folder.', timestamp: '2026-09-28T16:50:04+08:00' }
                ]
            }
        ],

        // Jen Chu Tiangco (Teacher - ID 2601021)
        '2601021': [
            {
                id: 'CHAT-2026-0039',
                title: 'Could you give me suggestions for question balance on a 15-item quiz on Database Normalization?',
                date: 'Oct 13, 2026',
                timestamp: Date.parse('2026-10-13T16:40:00+08:00'),
                messages: [
                    { role: 'user', text: 'Could you give me suggestions for question balance on a 15-item quiz on Database Normalization?', timestamp: '2026-10-13T16:40:00+08:00' },
                    { role: 'assistant', text: 'Certainly Professor Jen! A recommended distribution for a 15-item quiz is:\n- 5 Recall/Understanding questions (Definitions of 1NF, 2NF, 3NF)\n- 6 Application questions (Identifying functional dependencies in sample relations)\n- 4 Analysis questions (Decomposing a non-normalized table into BCNF/3NF)\n\nThis ensures a balanced evaluation.', timestamp: '2026-10-13T16:40:03+08:00' }
                ]
            },
            {
                id: 'CHAT-JC-002',
                title: 'Configuring anti-cheating randomized question order in Quiz Creator',
                date: 'Oct 09, 2026',
                timestamp: Date.parse('2026-10-09T11:35:00+08:00'),
                messages: [
                    { role: 'user', text: 'How do I randomize both the question order and the multiple choice options?', timestamp: '2026-10-09T11:35:00+08:00' },
                    { role: 'assistant', text: 'In the **Quiz Creator** settings panel, enable **Shuffle Questions** and **Shuffle Answer Options**. Each student will receive a randomized layout.', timestamp: '2026-10-09T11:35:03+08:00' }
                ]
            },
            {
                id: 'CHAT-JC-003',
                title: 'Exporting final grade sheets to Registrar CSV format',
                date: 'Oct 04, 2026',
                timestamp: Date.parse('2026-10-04T15:20:00+08:00'),
                messages: [
                    { role: 'user', text: 'Can I export student grade breakdowns directly to the official registrar format?', timestamp: '2026-10-04T15:20:00+08:00' },
                    { role: 'assistant', text: 'Yes! Navigate to **Grades**, select your section, and click **Export** > **Registrar Form 138-A (CSV)**.', timestamp: '2026-10-04T15:20:04+08:00' }
                ]
            },
            {
                id: 'CHAT-JC-004',
                title: 'Setting up rubrics for Lab Exercise 3 peer review',
                date: 'Sep 30, 2026',
                timestamp: Date.parse('2026-09-30T09:00:00+08:00'),
                messages: [
                    { role: 'user', text: 'How do I create a 4-level grading rubric with criteria weighting?', timestamp: '2026-09-30T09:00:00+08:00' },
                    { role: 'assistant', text: 'Go to **Classroom** > **Assessments** > **Rubrics** > **Create Rubric**. You can specify criteria weightings (e.g. Code Functionality 40%, Syntax & Style 20%).', timestamp: '2026-09-30T09:00:03+08:00' }
                ]
            }
        ],

        // Maria Santos Ramos (Teacher - ID 1111111)
        '1111111': [
            {
                id: 'CHAT-2026-0042',
                title: 'Grading rubric criteria for HTML/CSS laboratory',
                date: 'Oct 10, 2026',
                timestamp: Date.parse('2026-10-10T21:54:00+08:00'),
                messages: [
                    { role: 'user', text: 'Can you recommend grading criteria for an introductory HTML5 semantic markup laboratory?', timestamp: '2026-10-10T21:54:00+08:00' },
                    { role: 'assistant', text: 'Hello Professor Maria! A strong rubric includes:\n- Semantic Elements usage (header, nav, main, footer): 35%\n- Accessibility & Alt tags: 25%\n- Clean indentation & W3C validation: 25%\n- Timely submission: 15%', timestamp: '2026-10-10T21:54:03+08:00' }
                ]
            },
            {
                id: 'CHAT-MR-002',
                title: 'Bulk releasing feedback comments for Web Development assignments',
                date: 'Oct 06, 2026',
                timestamp: Date.parse('2026-10-06T14:15:00+08:00'),
                messages: [
                    { role: 'user', text: 'How do I publish all graded assignment feedback simultaneously to students?', timestamp: '2026-10-06T14:15:00+08:00' },
                    { role: 'assistant', text: 'In the Gradebook submission list, click **Actions** > **Release All Grades & Feedback**. Students will receive an instant notification.', timestamp: '2026-10-06T14:15:04+08:00' }
                ]
            },
            {
                id: 'CHAT-MR-003',
                title: 'Publishing attendance summary for Week 8',
                date: 'Oct 01, 2026',
                timestamp: Date.parse('2026-10-01T10:30:00+08:00'),
                messages: [
                    { role: 'user', text: 'Where can I download the attendance percentage sheet for BSCS 2-A?', timestamp: '2026-10-01T10:30:00+08:00' },
                    { role: 'assistant', text: 'Navigate to **Classroom** > **Attendance**, select Section BSCS 2-A, and choose **Export Attendance Summary**.', timestamp: '2026-10-01T10:30:03+08:00' }
                ]
            }
        ],

        // Amanda Suri Gao (Student - ID 2601033)
        '2601033': [
            {
                id: 'CHAT-2026-0041',
                title: 'Loops & 2D Arrays in C++',
                date: 'Oct 11, 2026',
                timestamp: Date.parse('2026-10-11T14:22:00+08:00'),
                messages: [
                    { role: 'user', text: 'Hi Sigma! Can you explain how a 2D array works in C++ and how to iterate through it using nested loops?', timestamp: '2026-10-11T14:20:00+08:00' },
                    { role: 'assistant', text: 'Hello Amanda! A 2D array in C++ is essentially an array of arrays. You can visualize it as a table of rows and columns.\n\nHere is a quick example using nested loops:\n```cpp\nint matrix[2][3] = {{1, 2, 3}, {4, 5, 6}};\nfor (int i = 0; i < 2; i++) {\n    for (int j = 0; j < 3; j++) {\n        cout << matrix[i][j] << " ";\n    }\n    cout << endl;\n}\n```\nThe outer loop moves row by row, while the inner loop iterates through each column within that row.', timestamp: '2026-10-11T14:20:05+08:00' }
                ]
            },
            {
                id: 'CHAT-AG-002',
                title: 'Difference between call-by-value and call-by-reference',
                date: 'Oct 07, 2026',
                timestamp: Date.parse('2026-10-07T17:10:00+08:00'),
                messages: [
                    { role: 'user', text: 'What is the practical difference when passing arguments by value versus reference in C++?', timestamp: '2026-10-07T17:10:00+08:00' },
                    { role: 'assistant', text: 'Call-by-value passes a copy of the variable (modifications inside the function do NOT affect the original). Call-by-reference (`&`) passes the actual memory address, so modifications directly update the original variable.', timestamp: '2026-10-07T17:10:04+08:00' }
                ]
            },
            {
                id: 'CHAT-AG-003',
                title: 'How to submit code repository link for Final Term Project',
                date: 'Oct 02, 2026',
                timestamp: Date.parse('2026-10-02T11:45:00+08:00'),
                messages: [
                    { role: 'user', text: 'Does our project submission require a GitHub link or a ZIP archive?', timestamp: '2026-10-02T11:45:00+08:00' },
                    { role: 'assistant', text: 'You should provide both! In the submission form, paste your public GitHub repository URL in the **Website / Repository** field, and upload your clean project source code ZIP archive.', timestamp: '2026-10-02T11:45:03+08:00' }
                ]
            }
        ],

        // Henry Wrecker Ochoa (Student - ID 2601031)
        '2601031': [
            {
                id: 'CHAT-2026-0040',
                title: 'Review pointers for Quiz 1 in Computer Programming 1',
                date: 'Oct 12, 2026',
                timestamp: Date.parse('2026-10-12T10:15:00+08:00'),
                messages: [
                    { role: 'user', text: 'What should I focus on reviewing for our upcoming Quiz 1 in Computer Programming 1?', timestamp: '2026-10-12T10:15:00+08:00' },
                    { role: 'assistant', text: 'Hi Henry! Based on your course outline for Computer Programming 1, here are the top 3 core topics for Quiz 1:\n1. Primitive Data Types & Variables (int, float, char, bool, memory sizes)\n2. Arithmetic & Logical Operator Precedence\n3. Conditional Statements (if-else and switch-case syntax)\n\nMake sure to review lecture slides 14 to 22!', timestamp: '2026-10-12T10:15:04+08:00' }
                ]
            },
            {
                id: 'CHAT-HO-002',
                title: 'Debugging segmentation fault in array pointer arithmetic',
                date: 'Oct 08, 2026',
                timestamp: Date.parse('2026-10-08T13:20:00+08:00'),
                messages: [
                    { role: 'user', text: 'Why do I get a segfault when accessing `*(ptr + 10)` in an array of size 10?', timestamp: '2026-10-08T13:20:00+08:00' },
                    { role: 'assistant', text: 'In an array of size 10, valid indices are 0 to 9. The expression `*(ptr + 10)` accesses the 11th element, which is out of bounds and triggers a segmentation fault!', timestamp: '2026-10-08T13:20:03+08:00' }
                ]
            },
            {
                id: 'CHAT-HO-003',
                title: 'Classroom schedule room change notification query',
                date: 'Oct 03, 2026',
                timestamp: Date.parse('2026-10-03T08:45:00+08:00'),
                messages: [
                    { role: 'user', text: 'Was our Friday lab session moved to Computer Lab 304?', timestamp: '2026-10-03T08:45:00+08:00' },
                    { role: 'assistant', text: 'Yes, according to the department announcement on Oct 2, Friday sessions for CP1 are relocated to Lab 304 for hardware maintenance in Lab 201.', timestamp: '2026-10-03T08:45:03+08:00' }
                ]
            }
        ]
    };

    const DELETED_AI_RECORDS_KEY = 'sigma-ai-deleted-record-ids-v1';

    function getDeletedAiRecordIds() {
        try {
            const parsed = JSON.parse(localStorage.getItem(DELETED_AI_RECORDS_KEY) || '[]');
            return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
        } catch (_) {
            return new Set();
        }
    }

    function markAiRecordDeleted(recordId) {
        if (!recordId) return;
        const deleted = getDeletedAiRecordIds();
        deleted.add(String(recordId));
        try {
            localStorage.setItem(DELETED_AI_RECORDS_KEY, JSON.stringify([...deleted]));
        } catch (_) {}
    }

    function getStorageKey(tabKey) {
        return 'sigma-ai-results-' + tabKey + '-v2';
    }

    function resolveAccountIdByNameOrId(idHint, nameHint) {
        const cleanHint = String(idHint || '').replace(/^ID:\s*/i, '').replace(/^#/, '').trim();
        if (cleanHint && cleanHint !== 'teacher' && cleanHint !== 'admin' && cleanHint !== 'student') return cleanHint;
        const cleanName = String(nameHint || '').trim();
        if (!cleanName || cleanName === 'Not recorded') return '';
        if (typeof window.findMatchedUserAccount === 'function') {
            const matched = window.findMatchedUserAccount(cleanHint, cleanName);
            const matchedId = String(matched?.uid || matched?.id || matched?.lrn || '').replace(/^#/, '').trim();
            if (matchedId) return matchedId;
        }
        const users = window.getStoredJson?.('sigma-admin-users', []) || [];
        const lowerName = cleanName.toLowerCase();
        const foundUser = users.find(u => {
            if (!u) return false;
            const full = (u.fullName || u.name || [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ') || '').trim().toLowerCase();
            const short = [u.firstName, u.lastName].filter(Boolean).join(' ').trim().toLowerCase();
            return full === lowerName || short === lowerName;
        });
        if (foundUser) {
            return String(foundUser.uid || foundUser.id || '').replace(/^#/, '').trim();
        }
        if (lowerName.includes('maria') && lowerName.includes('ramos')) return '1111111';
        if (lowerName.includes('stanley') && lowerName.includes('garcia')) return '0000000';
        if (lowerName.includes('juan') && lowerName.includes('dela cruz')) return '2222222';
        return '';
    }

    function parseSubmissionKeyMeta(storageKey) {
        const keyStr = String(storageKey || '');
        const matchIdx = /^sigma_sub_([^_]+(?:-[^_]+)*)_top_(\d+)_(assessments|assignments|quiz|activity|performance)_(\d+)/i.exec(keyStr);
        if (matchIdx) {
            return {
                subjectKey: matchIdx[1],
                topicIdx: Number(matchIdx[2]),
                tab: matchIdx[3],
                activeIdx: Number(matchIdx[4]),
                materialId: ''
            };
        }
        const matchMat = /^sigma_sub_([^_]+(?:-[^_]+)*)_top_(\d+)_mat_([^_]+)/i.exec(keyStr);
        if (matchMat) {
            return {
                subjectKey: matchMat[1],
                topicIdx: Number(matchMat[2]),
                tab: 'assessments',
                activeIdx: null,
                materialId: matchMat[3]
            };
        }
        return null;
    }

    
    function savedFeedbacks() {
        const found = new Map();
        const deletedIds = getDeletedAiRecordIds();
        const users = window.getStoredJson?.('sigma-admin-users', []) || [];
        for (let index = 0; index < localStorage.length; index++) {
            const key = localStorage.key(index);
            if (!/^sigma_sub_|^sigma_submission_/.test(key)) continue;
            let record; try { record = JSON.parse(localStorage.getItem(key)); } catch (_) { continue; }
            if (!record || typeof record !== 'object') continue;
            const keyMeta = parseSubmissionKeyMeta(key);
            for (const entry of [record, ...(Array.isArray(record.history) ? record.history : []), ...(Array.isArray(record.attempts) ? record.attempts : [])]) {
                const fbEvaluation = entry.aiFeedbackEvaluation;
                if (!fbEvaluation?.code || !/^FDBK-\d{4}-\d{4,}$/.test(fbEvaluation.code)) continue;
                if (deletedIds.has(String(fbEvaluation.code))) continue;
                const id = record.studentId || record.studentUid || record.userId || '';
                const user = users.find(user => String(user.uid || user.id) === String(id));
                const feedbackItems = Array.isArray(entry.aiFeedback) ? entry.aiFeedback : [];
                const categories = feedbackItems.map(item => item.category).filter(Boolean);
                const sectionName = record.section || record.gradeSection || user?.section || user?.gradeSection || '';
                const rawSubj = record.subjectId || record.subject || (keyMeta?.subjectKey ? `card-${keyMeta.subjectKey}` : '');
                const assignedTeacher = typeof window.getUnifiedClassroomTeacher === 'function'
                    ? window.getUnifiedClassroomTeacher(sectionName, rawSubj) : '';
                const reqByName = record.teacherName || record.teacher || assignedTeacher || 'Not recorded';
                const reqById = resolveAccountIdByNameOrId(record.teacherId || '', reqByName);
                const assTitle = record.assessmentTitle || record.title || entry.assessmentTitle || entry.title || '';
                
                let typeSummary = [];
                if (categories.includes('strength')) typeSummary.push('Strengths');
                if (categories.includes('improvement')) typeSummary.push('Improvements');
                if (categories.includes('next_step')) typeSummary.push('Next Steps');
                const displayType = typeSummary.join(', ') || 'Feedback';

                found.set(fbEvaluation.code, {
                    id: fbEvaluation.code,
                    storageKey: key,
                    userId: String(id),
                    name: user?.fullName || record.studentName || 'Student not recorded',
                    role: 'Student',
                    requestedBy: reqByName,
                    requestedById: reqById,
                    section: sectionName,
                    subjectId: record.subjectId || (keyMeta?.subjectKey ? `card-${keyMeta.subjectKey}` : ''),
                    topicIdx: record.topicIdx ?? keyMeta?.topicIdx ?? 0,
                    tab: record.tab || keyMeta?.tab || 'assessments',
                    activeIdx: record.activeIdx ?? record.itemIdx ?? keyMeta?.activeIdx ?? null,
                    materialId: record.materialId || record.id || keyMeta?.materialId || '',
                    assessmentTitle: assTitle,
                    subject: [record.subject || record.subjectId, assTitle].filter(Boolean).join(' - ') || 'Submission feedback',
                    type: displayType,
                    hasStrength: categories.includes('strength'),
                    hasImprovement: categories.includes('improvement'),
                    hasNextStep: categories.includes('next_step'),
                    status: 'Generated',
                    date: new Date(fbEvaluation.evaluatedAt).toLocaleDateString('en-US', {timeZone:'Asia/Manila',year:'numeric',month:'short',day:'numeric'}),
                    timestamp: Date.parse(fbEvaluation.evaluatedAt) || 0,
                    details: feedbackItems.map(item => `[${item.category || 'Feedback'}]: ${item.term}\n${item.description}`).join('\n\n')
                });
            }
        }
        return [...found.values()].sort((a,b)=>(b.timestamp || 0) - (a.timestamp || 0));
    }

    function savedEvaluations() {
        const found = new Map();
        const deletedIds = getDeletedAiRecordIds();
        const users = window.getStoredJson?.('sigma-admin-users', []) || [];
        for (let index = 0; index < localStorage.length; index++) {
            const key = localStorage.key(index);
            if (!/^sigma_sub_|^sigma_submission_/.test(key)) continue;
            let record; try { record = JSON.parse(localStorage.getItem(key)); } catch (_) { continue; }
            if (!record || typeof record !== 'object') continue;
            const keyMeta = parseSubmissionKeyMeta(key);
            for (const entry of [record, ...(Array.isArray(record.history) ? record.history : []), ...(Array.isArray(record.attempts) ? record.attempts : [])]) {
                const evaluation = entry.aiEvaluation;
                if (!evaluation?.code || !/^EVAL-\d{4}-\d{4,}$/.test(evaluation.code)) continue;
                if (deletedIds.has(String(evaluation.code))) continue;
                const id = record.studentId || record.studentUid || record.userId || '';
                const user = users.find(user => String(user.uid || user.id) === String(id));
                const score = Number(entry.aiSuggestedScore);
                const max = Number(record.maxScore || record.totalPoints || record.points);
                const percent = Number.isFinite(score) && max > 0 ? score / max * 100 : null;
                const sectionName = record.section || record.gradeSection || user?.section || user?.gradeSection || '';
                const rawSubj = record.subjectId || record.subject || (keyMeta?.subjectKey ? `card-${keyMeta.subjectKey}` : '');
                const assignedTeacher = typeof window.getUnifiedClassroomTeacher === 'function'
                    ? window.getUnifiedClassroomTeacher(sectionName, rawSubj) : '';
                const reqByName = evaluation.requestedBy?.name || record.teacherName || record.teacher || assignedTeacher || 'Not recorded';
                const reqById = resolveAccountIdByNameOrId(evaluation.requestedBy?.id || evaluation.requestedBy?.uid || record.teacherId || '', reqByName);
                const assTitle = record.assessmentTitle || record.title || entry.assessmentTitle || entry.title || '';
                found.set(evaluation.code, {
                    id: evaluation.code,
                    storageKey: key,
                    userId: String(id),
                    name: user?.fullName || record.studentName || 'Student not recorded',
                    role: 'Student',
                    requestedBy: reqByName,
                    requestedById: reqById,
                    section: sectionName,
                    subjectId: record.subjectId || (keyMeta?.subjectKey ? `card-${keyMeta.subjectKey}` : ''),
                    topicIdx: record.topicIdx ?? keyMeta?.topicIdx ?? 0,
                    tab: record.tab || keyMeta?.tab || 'assessments',
                    activeIdx: record.activeIdx ?? record.itemIdx ?? keyMeta?.activeIdx ?? null,
                    materialId: record.materialId || record.id || keyMeta?.materialId || '',
                    assessmentTitle: assTitle,
                    subject: [record.subject || record.subjectId, assTitle].filter(Boolean).join(' - ') || 'Submission evaluation',
                    score: Number.isFinite(score) ? String(score) + (max > 0 ? ' / ' + max : '') : 'Not recorded',
                    status: percent === null ? 'Evaluated' : percent >= 90 ? 'High Mastery' : percent >= 75 ? 'Satisfactory' : 'Needs Support',
                    date: new Date(evaluation.evaluatedAt).toLocaleDateString('en-US', {timeZone:'Asia/Manila',year:'numeric',month:'short',day:'numeric'}),
                    timestamp: Date.parse(evaluation.evaluatedAt) || 0,
                    details: (entry.aiCommentary || []).map(item => item.term + ': ' + item.description).join('\n')
                });
            }
        }
        return [...found.values()].sort((a,b)=>(b.timestamp || 0) - (a.timestamp || 0));
    }

    function savedInsights() {
        const found = new Map();
        const deletedIds = getDeletedAiRecordIds();
        const users = window.getStoredJson?.('sigma-admin-users', []) || [];

        // 1. Scan student & teacher analytics cards (Card Insights - INSC)
        const sources = new Map();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            const matchAnalytics = key.match(/^sigma-(student|teacher)-analytics-v1:(.+)$/);
            if (matchAnalytics) {
                const kind = matchAnalytics[1];
                const uid = matchAnalytics[2];
                let data; try { data = JSON.parse(localStorage.getItem(key)); } catch (_) { continue; }
                if (data && Array.isArray(data.cards) && data.cards.length > 0) {
                    sources.set(`${kind}:${uid}`, { kind, uid, data });
                }
            }
        }

        // Also incorporate cards from window.SigmaAiDatabase memory / states if available
        if (window.SigmaAiDatabase?.getState) {
            ['1111111', '2222222', '26010314', '2601021', '2601022'].forEach(testId => {
                ['teacher', 'student'].forEach(testKind => {
                    const dbState = window.SigmaAiDatabase.getState(testKind, testId);
                    if (dbState && Array.isArray(dbState.cards) && dbState.cards.length > 0) {
                        const sKey = `${testKind}:${testId}`;
                        if (!sources.has(sKey) || (sources.get(sKey).data?.cards?.length || 0) < dbState.cards.length) {
                            sources.set(sKey, { kind: testKind, uid: testId, data: dbState });
                        }
                    }
                });
            });
        }

        for (const { kind, uid, data } of sources.values()) {
            const user = profileFor(uid) || users.find(u => String(u.uid || u.id) === String(uid));
            const uName = user ? (user.fullName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ')) : (kind === 'teacher' ? 'Maria Santos Ramos' : 'Student');
            const uRole = kind === 'teacher' ? 'Teacher' : (user ? userRole(user, 'Student') : 'Student');

            data.cards.forEach((card, cIdx) => {
                if (!card) return;
                const yr = new Date(card.createdAt || data.lastAnalyzed || Date.now()).getFullYear();
                let genId = card.generationId;
                if (!genId || !/^INSC-\d{4}-\d{4,}$/.test(genId)) {
                    // Unique deterministic INSC ID per user card index
                    const userHash = uid ? uid.slice(-3) : '001';
                    genId = `INSC-${yr}-${userHash}${String(cIdx + 1).padStart(2, '0')}`;
                }
                if (deletedIds.has(String(genId))) return;

                const title = card.title || (kind === 'teacher' ? 'Class Assessment Summary' : 'Analytics Insight');
                const context = card.analyses?.[0]?.context || card.analyses?.[0]?.text || title;
                const dateVal = card.createdAt || data.lastAnalyzed || Date.now();
                found.set(genId, {
                    id: genId,
                    userId: uid,
                    name: uName,
                    role: uRole,
                    subject: title,
                    type: 'Card Insight',
                    status: 'Active',
                    date: new Date(dateVal).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' }),
                    timestamp: Date.parse(dateVal) || 0,
                    details: (card.analyses || []).map(a => [a.context, a.actionLabel ? `${a.actionLabel}: ${a.text}` : a.text].filter(Boolean).join('\n\n')).join('\n\n') || context
                });
            });
        }

        // 2. Scan subject grade insights (Subject Insights - INSS / Grade Insights - INSGR)
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (key === 'sigma-subject-grade-insights-v3' || key.startsWith('sigma-subject-grade-insights')) {
                let cacheMap; try { cacheMap = JSON.parse(localStorage.getItem(key)); } catch (_) { continue; }
                if (!cacheMap || typeof cacheMap !== 'object') continue;
                Object.entries(cacheMap).forEach(([fingerprintKey, entry], eIdx) => {
                    if (!entry) return;
                    let genId = entry.generationId;

                    // Extract metadata from fingerprint key if stored as JSON string
                    let fpData = {};
                    try { fpData = JSON.parse(fingerprintKey) || {}; } catch (_) {}

                    const isOverall = entry.scope === 'overall' || fpData.scope === 'overall' || (entry.analyses?.[0]?.context || '').toLowerCase().includes('gwa');
                    const defaultPrefix = isOverall ? 'INSGR' : 'INSS';
                    if (!genId || !/^(INSGR|INSS|INSC|INSG)-\d{4}-\d{4,}$/.test(genId)) {
                        const yr = new Date(entry.createdAt || Date.now()).getFullYear();
                        genId = `${defaultPrefix}-${yr}-${String(eIdx + 1).padStart(4, '0')}`;
                    }
                    if (deletedIds.has(String(genId))) return;

                    // Resolve student/teacher ID from entry or fingerprint
                    let uId = String(entry.studentId || entry.teacherId || entry.userId || fpData.studentId || fpData.teacherId || fpData.userId || '').trim();
                    let matchedUser = uId ? (profileFor(uId) || users.find(u => String(u.uid || u.id) === uId)) : null;

                    // If still not matched, check logged in user
                    if (!matchedUser) {
                        const loggedTeacher = window.getLoggedInTeacherUser?.();
                        if (loggedTeacher && (!uId || String(loggedTeacher.uid || loggedTeacher.id) === uId)) {
                            matchedUser = loggedTeacher;
                            uId = String(loggedTeacher.uid || loggedTeacher.id || '');
                        }
                    }
                    if (!matchedUser) {
                        const loggedStudent = window.getLoggedInStudentUser?.();
                        if (loggedStudent && (!uId || String(loggedStudent.uid || loggedStudent.id) === uId)) {
                            matchedUser = loggedStudent;
                            uId = String(loggedStudent.uid || loggedStudent.id || '');
                        }
                    }

                    // Fallback to finding user by ID
                    if (!matchedUser && uId) {
                        matchedUser = users.find(u => String(u.uid || u.id).includes(uId) || uId.includes(String(u.uid || u.id)));
                    }

                    const inferredRole = matchedUser ? userRole(matchedUser, 'Student') : (entry.teacherId || fpData.teacherId ? 'Teacher' : 'Student');
                    const uName = matchedUser
                        ? (matchedUser.fullName || matchedUser.name || [matchedUser.firstName, matchedUser.lastName].filter(Boolean).join(' '))
                        : (entry.studentName || entry.teacherName || fpData.studentName || fpData.teacherName || (uId ? `${inferredRole} #${uId}` : (inferredRole === 'Teacher' ? 'Maria Santos Ramos' : 'Juan Abad Dela Cruz')));
                    const cleanDisplayId = uId || String(matchedUser?.uid || matchedUser?.id || (inferredRole === 'Teacher' ? '1111111' : '2222222'));

                    const typeLabel = genId.startsWith('INSGR') || isOverall ? 'Grade Insight' : 'Subject Insight';
                    const dateVal = entry.createdAt || Date.now();
                    const subjectTitle = entry.subject || fpData.subject || (Array.isArray(fpData.records) && fpData.records[0]?.subject) || (isOverall ? 'Overall Grades • GWA' : 'Computer Programming 1');

                    found.set(genId, {
                        id: genId,
                        userId: cleanDisplayId,
                        name: uName,
                        role: inferredRole,
                        subject: subjectTitle,
                        type: typeLabel,
                        status: 'Generated',
                        date: new Date(dateVal).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' }),
                        timestamp: Date.parse(dateVal) || 0,
                        details: (entry.analyses || []).map(a => [a.context, a.actionLabel ? `${a.actionLabel}: ${a.text}` : a.text].filter(Boolean).join('\n\n')).join('\n\n') || subjectTitle
                    });
                });
            }
        }

        // 3. Scan teacher class grade insights (Grade Insights - INSGR)
        // Strictly require authentic generation ID from real provider call so fake fallback entries are NOT listed
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (key === 'sigma-teacher-grade-insights-v1' || key.startsWith('sigma-teacher-grade-insights')) {
                let cacheMap; try { cacheMap = JSON.parse(localStorage.getItem(key)); } catch (_) { continue; }
                if (!cacheMap || typeof cacheMap !== 'object') continue;
                Object.entries(cacheMap).forEach(([fingerprintKey, entry]) => {
                    if (!entry) return;
                    const genId = entry.generationId;
                    // Do not fabricate fake ID if it was not genuinely generated by the AI
                    if (!genId || !/^(INSGR|INSS|INSC|INSG|INSA)-\d{4}-\d{4,}$/.test(genId)) {
                        return;
                    }
                    if (genId === 'INSGR-2026-0001' || entry.model === 'SIGMA Local Fallback Engine') {
                        return;
                    }
                    if (deletedIds.has(String(genId))) return;

                    let fpData = {};
                    try { fpData = JSON.parse(fingerprintKey) || {}; } catch (_) {}
                    let uId = String(entry.teacherId || fpData.id || fpData.teacherId || '1111111').trim();
                    let matchedUser = profileFor(uId) || users.find(u => String(u.uid || u.id) === uId);
                    if (!matchedUser) {
                        const loggedTeacher = window.getLoggedInTeacherUser?.();
                        if (loggedTeacher) {
                            matchedUser = loggedTeacher;
                            uId = String(loggedTeacher.uid || loggedTeacher.id || '1111111');
                        }
                    }
                    const uName = matchedUser
                        ? (matchedUser.fullName || matchedUser.name || [matchedUser.firstName, matchedUser.lastName].filter(Boolean).join(' '))
                        : 'Maria Santos Ramos';
                    const cleanDisplayId = uId || '1111111';
                    const dateVal = entry.createdAt || Date.now();
                    const subName = entry.subject || fpData.evidence?.subject || 'Computer Programming 1';
                    const secName = entry.section || fpData.evidence?.section || '';
                    const title = `Class Grades: ${subName}${secName ? ' - ' + secName : ''}`;

                    found.set(genId, {
                        id: genId,
                        userId: cleanDisplayId,
                        name: uName,
                        role: 'Teacher',
                        subject: title,
                        type: 'Grade Insight',
                        status: 'Generated',
                        date: new Date(dateVal).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' }),
                        timestamp: Date.parse(dateVal) || 0,
                        details: (entry.analyses || []).map(a => [a.context, a.actionLabel ? `${a.actionLabel}: ${a.text}` : a.text].filter(Boolean).join('\n\n')).join('\n\n') || title
                    });
                });
            }
        }

        return [...found.values()].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    const generationPatterns = {
        evaluations: /^EVAL-\d{4}-\d{4,}$/,
        feedback: /^FDBK-\d{4}-\d{4,}$/,
        assessments: /^ASMTG?-\d{4}-\d{4,}$/,
        insights: /^(INSG|INSC|INSGR|INSS|INSA)-\d{4}-\d{4,}$/,
        bot: /^CHAT-\d{4}-\d{4,}$/
    };
    const featureTabs = {
        evaluations: ['submission_evaluation'], feedback: ['submission_feedback'], assessments: ['quiz'],
        insights: ['analytics', 'grade_insights'], bot: ['sigmabot']
    };
    const logDate = value => {
        const parsed = Date.parse(value || '');
        return Number.isFinite(parsed) ? new Date(parsed).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' }) : 'Not recorded';
    };
    function profileFor(id) {
        const cleanId = String(id || '').replace(/^ID:\s*/i, '').replace(/^#/, '').trim();
        if (!cleanId) return null;
        const users = window.getStoredJson?.('sigma-admin-users', []) || [];
        const found = users.find(user => String(user.uid || user.id || '').replace(/^#/, '').trim() === cleanId);
        if (found) return found;

        // Check active logged-in teacher or student if ID matches
        try {
            const loggedTeacher = window.getLoggedInTeacherUser?.();
            if (loggedTeacher && String(loggedTeacher.uid || loggedTeacher.id || '').replace(/^#/, '').trim() === cleanId) {
                return loggedTeacher;
            }
            const loggedStudent = window.getLoggedInStudentUser?.();
            if (loggedStudent && String(loggedStudent.uid || loggedStudent.id || '').replace(/^#/, '').trim() === cleanId) {
                return loggedStudent;
            }
        } catch (_) {}

        // Fallback to REAL_USERS dictionary
        const real = REAL_USERS.find(user => String(user.id || user.uid) === cleanId);
        if (real) return real;

        // Fallback for default institutional accounts
        if (cleanId === '1111111') {
            return { id: '1111111', uid: '1111111', fullName: 'Maria Santos Ramos', name: 'Maria Santos Ramos', role: 'Teacher', type: 'Teacher' };
        }
        if (cleanId === '2222222') {
            return { id: '2222222', uid: '2222222', fullName: 'Juan Abad Dela Cruz', name: 'Juan Abad Dela Cruz', role: 'Student', type: 'Student' };
        }
        return null;
    }
    function userName(user, fallback = 'User not recorded') {
        return user?.fullName || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || fallback;
    }
    function userRole(user, fallback = 'User') {
        const value = String(user?.role || user?.type || fallback);
        return /teacher/i.test(value) ? 'Teacher' : /student/i.test(value) ? 'Student' : /admin/i.test(value) ? 'Admin' : fallback;
    }
    function realLogs() {
        const records = [];
        try { records.push(...(window.SigmaAiLogs?.getDisplayRecords?.() || [])); } catch (_) {}
        try { records.push(...(JSON.parse(localStorage.getItem('sigma-ai-recorded-logs') || '[]') || [])); } catch (_) {}
        const unique = new Map();
        records.forEach(record => {
            const key = String(record?.generationId || record?.id || '');
            if (!key) return;
            // Ignore any fake or local fallback records
            if (record?.model === 'SIGMA Local Fallback Engine' || record?.provider === 'local' || record?.status === 'Fallback Used') return;
            if (!unique.has(key)) unique.set(key, record);
        });
        return [...unique.values()];
    }
    function loggedGenerations(tabKey) {
        const pattern = generationPatterns[tabKey];
        const deletedIds = getDeletedAiRecordIds();
        return realLogs().flatMap(log => {
            const genId = String(log.generationId || log.id || '');
            if (!featureTabs[tabKey]?.includes(log.feature)) return [];
            if (tabKey !== 'bot' && !pattern.test(String(log.generationId || ''))) return [];
            if (deletedIds.has(genId)) return [];
            const userId = String(log.userId || '');
            const user = profileFor(userId);
            let role = userRole(user, log.feature.startsWith('submission_') ? 'Student' : 'User');
            if (log.source?.kind === 'teacher' || log.prompt?.startsWith('Class Grades:')) {
                role = 'Teacher';
            }
            let type = log.feature === 'submission_evaluation' ? 'Rubric Evaluation' : log.feature === 'submission_feedback' ? 'Post-grade Feedback'
                : log.feature === 'quiz' ? 'Assessment Questions' : log.feature === 'grade_insights' ? 'Grade Insight'
                : log.feature === 'analytics' ? 'Analytics Insight' : role === 'Teacher' ? 'Teacher Assistance' : 'Student Inquiry';

            if (tabKey === 'insights') {
                const checkId = String(log.generationId || '');
                if (checkId.startsWith('INSC-')) {
                    type = 'Card Insight';
                } else if (checkId.startsWith('INSS-')) {
                    type = 'Subject Insight';
                } else if (checkId.startsWith('INSGR-')) {
                    type = 'Grade Insight';
                } else if (log.feature === 'grade_insights') {
                    type = 'Grade Insight';
                } else {
                    type = 'Card Insight';
                }
            }

            let score = null;
            if (log.feature === 'submission_evaluation') {
                try { const response = JSON.parse(log.response || '{}'); if (Number.isFinite(Number(response.score))) score = String(response.score); } catch (_) {}
            }
            const reqName = userName(user, 'Not recorded');
            const reqId = resolveAccountIdByNameOrId(userId, reqName);

            let status = log.feature === 'sigmabot' ? 'Resolved' : log.status === 'Success' ? 'Generated' : log.status;
            if (tabKey === 'assessments') {
                status = (log.status === 'Failed' || String(log.status || '').toLowerCase().includes('fail')) ? 'Failed' : 'Success';
            }

            // Extract file name and topic for assessment generations
            let fileName = log.fileName || '';
            let fileType = log.fileType || '';
            let topicText = log.prompt || log.actionDescription || 'SIGMA AI inquiry';
            if (tabKey === 'assessments') {
                if (!fileName && log.actionDescription) {
                    const matchFrom = log.actionDescription.match(/from\s+([^\s]+\.[a-zA-Z0-9]+)/i);
                    if (matchFrom) fileName = matchFrom[1];
                }
                if (fileName && !fileType) {
                    fileType = (fileName.split('.').pop() || '').toLowerCase();
                }
                const promptMatch = String(log.prompt || '').match(/about\s+(.+)$/i);
                if (promptMatch) {
                    topicText = promptMatch[1].trim();
                }
            }

            return [{
                id: genId,
                userId,
                name: userName(user),
                role,
                requestedBy: reqName,
                requestedById: reqId,
                subject: topicText,
                assessmentTitle: topicText,
                fileName,
                fileType,
                type,
                score,
                status,
                date: logDate(log.timestamp),
                timestamp: Date.parse(log.timestamp || '') || 0,
                details: String(log.response || ''),
                rawLog: log
            }];
        });
    }
    function uniqueRecords(records) {
        const found = new Map();
        records.forEach(record => { if (record?.id && !found.has(record.id)) found.set(record.id, record); });
        return [...found.values()].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    function loadStore(tabKey) {
        const deletedIds = getDeletedAiRecordIds();
        let records = [];
        if (tabKey === 'evaluations') {
            records = uniqueRecords([...savedEvaluations(), ...savedFeedbacks(), ...loggedGenerations('evaluations'), ...loggedGenerations('feedback')]);
        } else if (tabKey === 'feedback') {
            records = uniqueRecords([...savedFeedbacks(), ...loggedGenerations(tabKey)]);
            if (!records.length) {
                return FEEDBACK_PREVIEW_ROWS.filter(row => !deletedIds.has(String(row.id)));
            }
        } else if (tabKey === 'assessments') {
            records = uniqueRecords(loggedGenerations(tabKey));
            if (!records.length) {
                return ASSESSMENT_PREVIEW_ROWS.filter(row => !deletedIds.has(String(row.id)));
            }
        } else if (tabKey === 'insights') {
            records = uniqueRecords([...savedInsights(), ...loggedGenerations(tabKey)]);
        } else if (tabKey === 'bot') {
            const live = loggedGenerations(tabKey);
            const realConvs = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sigma-conversations:') && key.endsWith(':index')) {
                    const prefix = key.slice(0, -6);
                    const uid = decodeURIComponent(prefix.replace('sigma-conversations:', ''));
                    try {
                        const parsed = JSON.parse(localStorage.getItem(key));
                        if (Array.isArray(parsed)) {
                            parsed.forEach(entry => {
                                if (!entry || entry.deletedAt) return;
                                const rawTitle = (entry.title || '').trim();
                                if (!rawTitle || rawTitle.length <= 1 || /^(a|asdad)$/i.test(rawTitle)) return;
                                const msgs = JSON.parse(localStorage.getItem(prefix + ':chat:' + entry.id) || '[]');
                                if (!Array.isArray(msgs) || !msgs.length) return;
                                const user = profileFor(uid);
                                const parsedDate = entry.updatedAt || entry.createdAt || Date.now();
                                realConvs.push({
                                    id: entry.id,
                                    userId: uid,
                                    name: userName(user, user?.fullName || (uid === '0000000' ? 'Stanley Garcia' : 'User')),
                                    role: userRole(user, uid === '0000000' ? 'Admin' : 'Student'),
                                    subject: rawTitle || 'Conversation',
                                    type: 'Conversation',
                                    status: 'Resolved',
                                    date: logDate(parsedDate),
                                    timestamp: parsedDate,
                                    details: msgs[0]?.text || rawTitle,
                                    messages: msgs,
                                    storagePrefix: prefix
                                });
                            });
                        }
                    } catch (_) {}
                }
            }
            records = uniqueRecords([...live, ...realConvs, ...BOT_PREVIEW_ROWS]);
        } else {
            records = uniqueRecords(loggedGenerations(tabKey));
        }
        return records.filter(row => !deletedIds.has(String(row.id)));
    }

    function saveStore(tabKey, data) {
        try {
            localStorage.setItem(getStorageKey(tabKey), JSON.stringify(data));
        } catch (_) {}
    }

    function splitAssessmentSubject(value) {
        const record = String(value || '').trim();
        const separator = [' — ', ' • ', ' - '].find(item => record.includes(item));
        if (!separator) {
            return { assessment: record || 'Submission evaluation', subject: '' };
        }

        const [subject, ...assessmentParts] = record.split(separator);
        return {
            assessment: assessmentParts.join(separator).trim() || 'Submission evaluation',
            subject: subject.trim()
        };
    }

    function openEvaluationInSectionSubmission(item) {
        if (!item) return;
        const parsedSubject = splitAssessmentSubject(item.subject);
        const subjectLabel = item.subjectName || parsedSubject.subject || 'Computer Programming 1';
        const targetAssessmentTitle = String(item.assessmentTitle || parsedSubject.assessment || '').trim().toLowerCase();

        const sections = window.getStoredJson?.('sigma-admin-sections', []) || [];
        let matchedSection = null;
        if (item.section) {
            const cleanSecHint = String(item.section).replace(/^grade\s*\d+\s*[-–]?\s*/i, '').trim().toLowerCase();
            matchedSection = sections.find(s => {
                const sName = String(s?.name || s?.sectionName || '').replace(/^grade\s*\d+\s*[-–]?\s*/i, '').trim().toLowerCase();
                return sName === cleanSecHint || String(s?.id || '').toLowerCase() === cleanSecHint;
            });
        }
        if (!matchedSection && subjectLabel) {
            const lowerSubj = subjectLabel.toLowerCase();
            matchedSection = sections.find(s => {
                const sSubj = String(s?.subject || s?.assignedSubject || (Array.isArray(s?.assignedSubjects) && s.assignedSubjects[0]) || '').toLowerCase();
                return sSubj && (sSubj.includes(lowerSubj) || lowerSubj.includes(sSubj));
            });
        }
        if (!matchedSection && sections.length > 0) {
            matchedSection = sections[0];
        }

        const effectiveSection = matchedSection
            ? (matchedSection.name || matchedSection.sectionName || matchedSection.id)
            : (item.section || 'Rizal');
        const effectiveSubjectName = matchedSection
            ? (matchedSection.subject || matchedSection.assignedSubject || (Array.isArray(matchedSection.assignedSubjects) && matchedSection.assignedSubjects[0]) || subjectLabel)
            : subjectLabel;

        let effectiveSubjectId = item.subjectId || '';
        if (!effectiveSubjectId && typeof window.resolveSubjectTopicId === 'function') {
            effectiveSubjectId = window.resolveSubjectTopicId(effectiveSubjectName, effectiveSubjectName);
        }
        if (!effectiveSubjectId) {
            effectiveSubjectId = 'card-prog1';
        }

        let resolvedTopicIdx = (item.topicIdx !== undefined && item.topicIdx !== null && !Number.isNaN(Number(item.topicIdx)))
            ? Number(item.topicIdx)
            : 0;
        let resolvedActiveIdx = (item.activeIdx !== undefined && item.activeIdx !== null && item.activeIdx !== '' && !Number.isNaN(Number(item.activeIdx)))
            ? Number(item.activeIdx)
            : null;

        if (typeof window.getAdminTopicSubjectAndData === 'function') {
            try {
                const { data } = window.getAdminTopicSubjectAndData(effectiveSubjectId, effectiveSubjectName, effectiveSection) || {};
                const topics = Array.isArray(data?.q1Topics) ? data.q1Topics : [];
                let foundMatch = false;

                for (let tIdx = 0; tIdx < topics.length; tIdx++) {
                    const topic = topics[tIdx];
                    const rawAssign = Array.isArray(topic?.assignments) ? topic.assignments : [];
                    const rawQuiz = Array.isArray(topic?.quiz) ? topic.quiz : [];
                    const rawAct = Array.isArray(topic?.activity) ? topic.activity : [];
                    const rawPerf = Array.isArray(topic?.performance) ? topic.performance : [];
                    let assessments = [...rawAssign, ...rawQuiz, ...rawAct, ...rawPerf];
                    if (typeof window.getUnifiedTopicAssessments === 'function') {
                        assessments = window.getUnifiedTopicAssessments('assessments', effectiveSubjectId, tIdx, assessments, effectiveSection);
                    }
                    if (typeof window.deduplicateMaterialsArray === 'function') {
                        assessments = window.deduplicateMaterialsArray(assessments, { collapseRoles: true });
                    }
                    if (!assessments.length) continue;

                    if (resolvedActiveIdx === null || item.isPreview) {
                        const matchIdx = assessments.findIndex(ass => {
                            const assId = String(ass?.id || ass?.materialId || '').trim();
                            if (item.materialId && assId && assId === String(item.materialId).trim()) return true;
                            const assTitle = String(ass?.title || ass?.name || '').trim().toLowerCase();
                            if (!targetAssessmentTitle || !assTitle) return false;
                            return assTitle === targetAssessmentTitle || assTitle.includes(targetAssessmentTitle) || targetAssessmentTitle.includes(assTitle);
                        });
                        if (matchIdx !== -1) {
                            resolvedTopicIdx = tIdx;
                            resolvedActiveIdx = matchIdx;
                            foundMatch = true;
                            break;
                        }
                    } else if (tIdx === resolvedTopicIdx && assessments[resolvedActiveIdx]) {
                        foundMatch = true;
                        break;
                    }
                }

                if (!foundMatch && resolvedActiveIdx === null) {
                    for (let tIdx = 0; tIdx < topics.length; tIdx++) {
                        const topic = topics[tIdx];
                        const rawAssign = Array.isArray(topic?.assignments) ? topic.assignments : [];
                        const rawQuiz = Array.isArray(topic?.quiz) ? topic.quiz : [];
                        const rawAct = Array.isArray(topic?.activity) ? topic.activity : [];
                        const rawPerf = Array.isArray(topic?.performance) ? topic.performance : [];
                        let assessments = [...rawAssign, ...rawQuiz, ...rawAct, ...rawPerf];
                        if (typeof window.getUnifiedTopicAssessments === 'function') {
                            assessments = window.getUnifiedTopicAssessments('assessments', effectiveSubjectId, tIdx, assessments, effectiveSection);
                        }
                        if (assessments.length > 0) {
                            resolvedTopicIdx = tIdx;
                            resolvedActiveIdx = 0;
                            break;
                        }
                    }
                }
            } catch (_) {}
        }

        if (resolvedActiveIdx === null) {
            resolvedActiveIdx = 0;
        }

        const studentIdentifier = item.name && item.name !== 'Student not recorded'
            ? item.name
            : (item.userId || 'All');

        if (typeof window.viewSection === 'function') {
            window.viewSection(effectiveSection, effectiveSubjectName, 'topics');
        }
        if (typeof window.openTopicContent === 'function') {
            window.openTopicContent(effectiveSubjectId, resolvedTopicIdx, 'assessments', resolvedActiveIdx, true, {
                viewSubmission: true,
                _studentViewSubmissionMode: true,
                _sharedViewSubmissionMode: true,
                selectedSection: effectiveSection,
                selectedStudent: studentIdentifier
            });
        }
    }

    function extractQuestionsFromItem(item) {
        if (!item) return [];
        let raw = item.details || item.response || '';
        if (Array.isArray(item.questions)) return item.questions;
        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
                if (Array.isArray(parsed.questions)) return parsed.questions;
            } catch (_) {}
        }
        // Fallback: mock sample questions if preview
        const count = 10;
        const topic = item.assessmentTitle || item.subject || 'Practice Assessment';
        return [
            {
                type: 'Multiple Choice',
                question: `What is the primary function of ${topic}?`,
                choices: [
                    'To automate iterative execution of instructions',
                    'To clear working memory allocations',
                    'To define static compile-time constants',
                    'To initialize network socket interfaces'
                ],
                answer: 'To automate iterative execution of instructions',
                points: 10
            },
            {
                type: 'Multiple Choice',
                question: `Which scenario represents an appropriate use-case for ${topic}?`,
                choices: [
                    'Processing items sequentially until a terminating condition is met',
                    'Rendering static user interface headers without dynamic states',
                    'Encrypting stored offline passwords using salt hashes',
                    'Exporting comma-separated values to an external disk'
                ],
                answer: 'Processing items sequentially until a terminating condition is met',
                points: 10
            },
            {
                type: 'True or False',
                question: `A properly formed assessment on ${topic} requires defined termination criteria to prevent infinite execution.`,
                answer: 'True',
                points: 10
            }
        ];
    }

    function openAssessmentInQuizCreator(item) {
        if (!item) return;
        const questionsList = extractQuestionsFromItem(item);
        const quizTitle = item.assessmentTitle || item.subject || 'AI Generated Assessment';

        const ephemeralQuiz = {
            id: 'ai-asmt-' + (item.id || Date.now()),
            code: item.id || '#QZ-9999',
            title: quizTitle,
            desc: `Generated by SIGMA AI for ${item.name || 'Educator'}${item.fileName ? ' from ' + item.fileName : ''}.`,
            icon: 'fa-bolt-lightning',
            color: '#15803d',
            questions: questionsList,
            isAi: true,
            isAiGenerated: true,
            aiGenerated: true,
            source: 'ai',
            createdAt: item.date || new Date().toISOString()
        };

        // Cache in stored quiz library so quiz-creator resolves it smoothly in new tab
        try {
            const library = JSON.parse(localStorage.getItem('sigma_quiz_storage') || '[]');
            const filteredLib = library.filter(q => q && String(q.id) !== String(ephemeralQuiz.id));
            filteredLib.unshift(ephemeralQuiz);
            localStorage.setItem('sigma_quiz_storage', JSON.stringify(filteredLib));
            localStorage.setItem('sigma-quiz-storage-library', JSON.stringify(filteredLib));
        } catch (_) {}

        window.open(`quiz-creator.html?mode=edit&id=${encodeURIComponent(ephemeralQuiz.id)}`, '_blank');
    }

    function downloadAssessmentExport(item) {
        if (!item) return;

        // If direct file data (data URI / blob URL) exists on item or log
        if (item.fileData || item.fileUrl) {
            const dlLink = document.createElement('a');
            dlLink.href = item.fileData || item.fileUrl;
            dlLink.download = item.fileName || 'uploaded_document';
            document.body.appendChild(dlLink);
            dlLink.click();
            document.body.removeChild(dlLink);
            return;
        }

        const fileName = item.fileName || (item.fileType ? `uploaded_document.${item.fileType}` : 'uploaded_document.txt');
        const fileExt = (fileName.split('.').pop() || '').toLowerCase();

        // If file content is stored directly
        if (item.fileContent) {
            const mimeType = fileExt === 'pdf' ? 'application/pdf' :
                             fileExt === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                             fileExt === 'txt' ? 'text/plain;charset=utf-8' :
                             'application/octet-stream';
            const blob = new Blob([item.fileContent], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return;
        }

        // Generate the uploaded grounding text document representation
        const topic = item.assessmentTitle || item.subject || 'Lesson Document';
        let content = `=================================================================\n`;
        content += `                 SIGMA ELMS - UPLOADED SOURCE FILE               \n`;
        content += `=================================================================\n`;
        content += `File Name:   ${fileName}\n`;
        content += `Assessment:  ${item.id}\n`;
        content += `Instructor:  ${item.name || 'Educator'}\n`;
        content += `Date:        ${item.date}\n`;
        content += `=================================================================\n\n`;
        content += `--- DOCUMENT CONTENT SUMMARY ---\n\n`;
        content += `${item.details || `Source instructional material for ${topic}.`}\n\n`;
        content += `=================================================================\n`;
        content += `                     END OF SOURCE FILE                          \n`;
        content += `=================================================================\n`;

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function deleteAiResultItem(item, tabKey) {
        if (!item) return;
        const labelMap = {
            evaluations: 'Evaluation',
            feedback: 'Feedback',
            assessments: 'Assessment',
            insights: 'Insight',
            bot: 'Conversation'
        };
        const recordTypeLabel = labelMap[tabKey] || 'Record';

        const performDelete = () => {
            markAiRecordDeleted(item.id);

            if (tabKey === 'evaluations' || tabKey === 'feedback') {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (!/^sigma_sub_|^sigma_submission_/.test(key)) continue;
                    let record;
                    try { record = JSON.parse(localStorage.getItem(key)); } catch (_) { continue; }
                    if (!record || typeof record !== 'object') continue;
                    let modified = false;
                    if (tabKey === 'evaluations') {
                        if (record.aiEvaluation?.code === item.id) {
                            delete record.aiEvaluation;
                            delete record.aiSuggestedScore;
                            delete record.aiCommentary;
                            delete record.aiEvaluatedCriteria;
                            modified = true;
                        }
                        if (record.aiFeedbackEvaluation?.code === item.id) {
                            delete record.aiFeedbackEvaluation;
                            delete record.aiFeedback;
                            modified = true;
                        }
                    } else if (tabKey === 'feedback') {
                        if (record.aiFeedbackEvaluation?.code === item.id) {
                            delete record.aiFeedbackEvaluation;
                            delete record.aiFeedback;
                            modified = true;
                        }
                    }
                    for (const list of [record.history, record.attempts]) {
                        if (!Array.isArray(list)) continue;
                        list.forEach(entry => {
                            if (tabKey === 'evaluations') {
                                if (entry?.aiEvaluation?.code === item.id) {
                                    delete entry.aiEvaluation;
                                    delete entry.aiSuggestedScore;
                                    delete entry.aiCommentary;
                                    delete entry.aiEvaluatedCriteria;
                                    modified = true;
                                }
                                if (entry?.aiFeedbackEvaluation?.code === item.id) {
                                    delete entry.aiFeedbackEvaluation;
                                    delete entry.aiFeedback;
                                    modified = true;
                                }
                            } else if (tabKey === 'feedback') {
                                if (entry?.aiFeedbackEvaluation?.code === item.id) {
                                    delete entry.aiFeedbackEvaluation;
                                    delete entry.aiFeedback;
                                    modified = true;
                                }
                            }
                        });
                    }
                    if (modified) {
                        try { localStorage.setItem(key, JSON.stringify(record)); } catch (_) {}
                    }
                }

                // Also clean up any standalone sigma-ai-feedback and sigma-submission-ai-state cache keys
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (!key) continue;
                    if (key.startsWith('sigma-ai-feedback:') && tabKey === 'feedback') {
                        try {
                            const val = JSON.parse(localStorage.getItem(key) || 'null');
                            if (val?.aiFeedbackEvaluation?.code === item.id) {
                                keysToRemove.push(key);
                            }
                        } catch (_) {}
                    } else if (key.startsWith('sigma-submission-ai-state:')) {
                        if (item.storageKey && key.includes(item.storageKey)) {
                            keysToRemove.push(key);
                        }
                    }
                }
                keysToRemove.forEach(k => {
                    try { localStorage.removeItem(k); } catch (_) {}
                });

                // Notify any listening components and refresh current open view if showing this submission
                try {
                    window.dispatchEvent(new CustomEvent('sigma-ai-record-deleted', {
                        detail: { id: item.id, tabKey, item }
                    }));
                } catch (_) {}

                try {
                    const ctx = tabKey === 'feedback' ? window._sigmaSubmissionFeedbackContext : window._sigmaSubmissionAiContext;
                    if (ctx && (ctx.key === item.storageKey || (item.userId && String(ctx.studentId) === String(item.userId)))) {
                        const previous = window._suppressSubmissionScrollToTop;
                        window._suppressSubmissionScrollToTop = true;
                        try {
                            window.switchTopicTab?.(ctx.tab, ctx.activeIdx);
                        } finally {
                            window._suppressSubmissionScrollToTop = previous;
                        }
                    }
                } catch (_) {}
            }

            renderTabTable(tabKey);
            window.showToast?.(`${recordTypeLabel} ${item.id} deleted.`, 'success');
        };

        const confirmTitle = `Delete ${recordTypeLabel}?`;
        const confirmDesc = `Are you sure you want to delete ${recordTypeLabel.toLowerCase()} ${item.id}? This action cannot be undone.`;

        if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: confirmTitle,
                desc: confirmDesc,
                confirmText: `Delete ${recordTypeLabel}`,
                cancelText: 'Cancel',
                isDanger: false, type: 'primary',
                onConfirm: performDelete
            });
        } else if (typeof window.showUserConfirm === 'function') {
            window.showUserConfirm(
                confirmTitle,
                confirmDesc,
                performDelete
            );
        } else if (window.confirm(`${confirmTitle}\n\n${confirmDesc}`)) {
            performDelete();
        }
    }

    // Modal Details Renderer
    function showDetailsModal(item, tabKey) {
        const overlay = document.getElementById('sigma-ai-details-modal');
        if (!overlay) return;
        document.getElementById('sigma-ai-modal-id').textContent = item.id;
        document.getElementById('sigma-ai-modal-name').textContent = item.name + (item.userId ? ' (ID: ' + item.userId + ')' : '');
        let subjectText = item.subject;
        if (item.fileName) {
            subjectText += ' • Grounded Source: ' + item.fileName;
        }
        document.getElementById('sigma-ai-modal-subject').textContent = subjectText;
        document.getElementById('sigma-ai-modal-date').textContent = item.date;
        document.getElementById('sigma-ai-modal-status').textContent = item.status || item.score || item.type;
        document.getElementById('sigma-ai-modal-content').textContent = item.details;
        overlay.classList.remove('hidden');
    }

    window.closeSigmaAiModal = function () {
        const overlay = document.getElementById('sigma-ai-details-modal');
        if (overlay) overlay.classList.add('hidden');
    };

    let activeBotThreadId = null;
    let viewingBotConversationItem = null;

    function formatBotTimestamp(value) {
        if (!value) return 'Not recorded';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    function getBotUserAvatarHtml(item) {
        const user = profileFor(item.userId) || item;
        const src = (typeof window.resolveUserAvatar === 'function' ? window.resolveUserAvatar(user) : '') || item.avatarUrl;
        if (src && /^(https?:|data:image\/|blob:|\.?\.?\/|image\/|uploads\/)/i.test(src)) {
            return `<span class="ai-log-avatar" aria-hidden="true"><img src="${escapeHtml(src)}" alt="" onerror="this.parentElement.innerHTML='<i class=\\\'fa-solid fa-user\\\'></i>'"></span>`;
        }
        return '<span class="ai-log-avatar" aria-hidden="true"><i class="fa-solid fa-user"></i></span>';
    }

    window.closeBotConversationPage = function () {
        viewingBotConversationItem = null;
        renderTabTable('bot');
    };

    window.closeBotConversationReader = window.closeBotConversationPage;

    window.openBotConversationReader = function (item) {
        if (!item) return;
        viewingBotConversationItem = item;
        activeBotThreadId = item.id;
        const modal = document.getElementById('sigma-bot-reader-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
        renderTabTable('bot');
    };

    function renderBotConversationPage(item, filtered, allRecords) {
        const workspace = document.getElementById('ai-bot-workspace');
        const toolbar = document.getElementById('ai-bot-toolbar');
        if (toolbar) toolbar.style.display = 'none';
        if (!workspace) return;

        workspace.className = 'px-8 py-8 bg-white flex-1 min-h-[660px]';

        const rawLog = item.rawLog || {};
        let conversationMessages = [];
        if (Array.isArray(item.messages) && item.messages.length > 0) {
            conversationMessages = item.messages;
        } else if (Array.isArray(rawLog.messages) && rawLog.messages.length > 0) {
            conversationMessages = rawLog.messages;
        } else {
            if (rawLog.prompt || item.subject) {
                conversationMessages.push({
                    role: 'user',
                    text: rawLog.prompt || item.subject,
                    timestamp: item.timestamp || Date.now()
                });
            }
            if (item.details || rawLog.response) {
                conversationMessages.push({
                    role: 'assistant',
                    text: item.details || rawLog.response,
                    timestamp: (item.timestamp || Date.now()) + 2000
                });
            }
        }

        const firstTime = conversationMessages[0]?.timestamp || item.timestamp;
        const lastTime = conversationMessages[conversationMessages.length - 1]?.timestamp || item.timestamp;
        const startTimeStr = formatBotTimestamp(firstTime);
        const lastTimeStr = formatBotTimestamp(lastTime);
        const cleanUserId = String(item.userId || '').replace(/^ID:\s*/i, '').trim();
        const userAvatarHtml = getBotUserAvatarHtml(item);
        const initialItemMessages = conversationMessages.map(m => ({ ...m }));
        let activeConversationId = item.id || 'CHAT-CURRENT';

        workspace.innerHTML = `
            <style>
                #ai-bot-conversation-page .bot-msg-row .bubble-trash-btn {
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.2s ease, visibility 0.2s ease, background-color 0.15s ease;
                    width: 28px;
                    height: 28px;
                    border-radius: 9999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(0, 0, 0, 0.45) !important;
                    background: transparent;
                    border: none;
                }
                #ai-bot-conversation-page .bot-msg-row:hover .bubble-trash-btn {
                    opacity: 1;
                    visibility: visible;
                }
                #ai-bot-conversation-page .bot-msg-row .bubble-trash-btn:hover {
                    background-color: #f1f5f9 !important;
                    color: rgba(0, 0, 0, 0.45) !important;
                }
                #ai-bot-conversation-page .bot-msg-row .bubble-trash-btn i,
                #ai-bot-conversation-page .bot-msg-row .bubble-trash-btn:hover i {
                    color: rgba(0, 0, 0, 0.45) !important;
                    font-size: 11px;
                }
                #ai-bot-conversation-page .past-conv-action-delete,
                #ai-bot-conversation-page .past-conv-action-delete i,
                #ai-bot-conversation-page .past-conv-action-delete span {
                    color: #dc2626 !important;
                }
                #ai-bot-conversation-page .past-conv-action-delete:hover {
                    background-color: #fef2f2 !important;
                }
                #ai-bot-conversation-page .notif-prev-btn {
                    width: 100%;
                    min-height: 38px;
                    padding: 8px 12px;
                    background-color: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #0f172a;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: background-color 0.18s ease, border-color 0.18s ease;
                }
                #ai-bot-conversation-page .notif-prev-btn:hover {
                    background-color: #f1f5f9;
                    border-color: #cbd5e1;
                }
            </style>
            <div class="ai-log-bubble-panel" id="ai-bot-conversation-page">
                <!-- Left Section: Sidebar with Details & Search -->
                <aside class="ai-log-conversation-sidebar">
                    <!-- Back Button: White Panel with Black Text and Background Highlight Only -->
                    <div class="mb-5">
                        <button type="button" onclick="window.closeBotConversationPage()" class="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-black border border-slate-200/90 shadow-2xs rounded-xl font-['Inter'] text-xs font-semibold cursor-pointer transition-colors" title="Back to Conversations">
                            <i class="fa-solid fa-arrow-left text-xs text-black"></i>
                            <span class="text-black font-semibold">Back to Conversations</span>
                        </button>
                    </div>

                    <!-- User Identity -->
                    <div class="ai-log-detail-identity mb-6">
                        <div class="ai-log-detail-name-row flex items-center gap-3">
                            ${userAvatarHtml}
                            <div class="ai-log-detail-identity-text min-w-0">
                                <p class="font-bold text-slate-900 text-sm truncate font-['Inter']">${escapeHtml(item.name)}</p>
                                <p class="text-xs text-black-fade font-medium mt-0.5" style="color: rgba(0, 0, 0, 0.45) !important;">${escapeHtml(item.role)} | Account ID: ${escapeHtml(cleanUserId || '0000000')}</p>
                            </div>
                        </div>
                    </div>

                    <!-- In-Conversation Search Container (Hidden when viewing Past Conversations) -->
                    <div id="ai-bot-page-search-container">
                        <form class="ai-log-search ai-log-conversation-search mb-3" role="search" id="ai-bot-page-search-form">
                            <div class="ai-log-search-input-wrap">
                                <input type="search" id="ai-bot-page-search-input" placeholder="Search messages" aria-label="Search messages" class="sigma-input sigma-search-input" autocomplete="off" maxlength="100">
                                <button type="button" id="ai-bot-page-search-clear" class="ai-log-search-clear" title="Clear search" aria-label="Clear search" hidden>
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                            <button type="submit" class="sigma-btn sigma-btn-primary ai-log-conversation-search-button" title="Search messages" aria-label="Search messages">
                                <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                            </button>
                        </form>

                        <!-- Match Navigation -->
                        <div class="ai-log-match-navigation" id="ai-bot-page-navigation" hidden>
                            <span class="ai-log-conversation-search-result text-xs text-slate-600 font-medium" id="ai-bot-page-result" role="status"></span>
                            <button type="button" class="ai-log-match-button" id="ai-bot-page-prev" title="Previous match" aria-label="Previous match" disabled>
                                <i class="fa-solid fa-arrow-up text-xs" aria-hidden="true"></i>
                            </button>
                            <button type="button" class="ai-log-match-button" id="ai-bot-page-next" title="Next match" aria-label="Next match" disabled>
                                <i class="fa-solid fa-arrow-down text-xs" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Past Conversations View Panel (Inside Left Section, hidden initially) -->
                    <div id="ai-bot-past-conversations-view" class="font-['Inter']" style="display: none;">
                        <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider font-['Inter']">Past Conversations</h3>
                            <button type="button" id="ai-bot-past-close-btn" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-black border border-slate-200/90 shadow-2xs rounded-xl font-['Inter'] text-xs font-semibold cursor-pointer transition-colors" title="Back to Chat">
                                <i class="fa-solid fa-arrow-left text-xs text-black"></i>
                                <span class="text-black font-semibold">Back to Chat</span>
                            </button>
                        </div>
                        <div id="ai-bot-past-conversations-list" class="space-y-1">
                            <!-- Populated dynamically below -->
                        </div>
                    </div>
                </aside>

                <!-- Main Section: Chat Panel -->
                <section class="ai-log-conversation-chat relative flex flex-col bg-white" aria-label="SIGMA conversation">
                    <div class="sigma-ai-header">
                        <div class="mobile-panel-header-left flex items-center gap-2.5">
                            <span class="sigma-ai-badge" aria-hidden="true">
                                <i class="fa-solid fa-bolt"></i>
                            </span>
                            <h3 class="sigma-ai-title">SIGMA</h3>
                        </div>
                        <div class="flex items-center gap-1.5 ml-auto">
                            <button type="button" id="ai-bot-history-toggle-btn" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-transparent hover:bg-slate-100 transition-colors cursor-pointer font-['Inter'] text-xs font-semibold" title="Past conversations">
                                <i class="fa-solid fa-clock-rotate-left text-xs text-black transition-colors" id="ai-bot-hist-icon"></i>
                                <span id="ai-bot-hist-text" class="text-black font-semibold transition-colors">Past Conversations</span>
                            </button>
                        </div>
                    </div>

                    <!-- Active Conversation Messages Transcript -->
                    <div class="ai-log-transcript flex-1" id="ai-bot-page-transcript" aria-label="Read-only conversation">
                        <!-- Populated dynamically below -->
                    </div>
                </section>
            </div>
        `;

        // Render Conversation Messages into #ai-bot-page-transcript with hover trash can
        const transcript = workspace.querySelector('#ai-bot-page-transcript');
        function paintConversationBubbles() {
            if (!transcript) return;
            transcript.replaceChildren();

            conversationMessages.forEach((msg, idx) => {
                const stampStr = formatBotTimestamp(msg.timestamp);
                const isUser = msg.role === 'user';
                const block = document.createElement('div');
                block.className = `sigma-ai-message sigma-ai-message--${isUser ? 'user' : 'assistant'} ai-log-message bot-msg-row group relative`;

                block.innerHTML = `
                    <div class="sigma-ai-message__meta">${escapeHtml(stampStr)}</div>
                    <div class="sigma-ai-message__row flex items-center ${isUser ? 'justify-end' : ''} gap-2">
                        ${!isUser ? `
                            <div class="sigma-ai-message__icon" aria-hidden="true">
                                <i class="fa-solid fa-bolt"></i>
                            </div>
                        ` : `
                            <button type="button" class="bubble-trash-btn w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-slate-100 cursor-pointer shrink-0 transition-colors" aria-label="Delete message" data-msg-idx="${idx}">
                                <i class="fa-solid fa-trash-can text-[11px]" style="color: rgba(0, 0, 0, 0.45) !important;"></i>
                            </button>
                        `}
                        <p class="sigma-ai-message__bubble sigma-ai-message__bubble--${isUser ? 'user' : 'assistant'}">${escapeHtml(msg.text || '')}</p>
                        ${!isUser ? `
                            <button type="button" class="bubble-trash-btn w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-slate-100 cursor-pointer shrink-0 transition-colors" aria-label="Delete message" data-msg-idx="${idx}">
                                <i class="fa-solid fa-trash-can text-[11px]" style="color: rgba(0, 0, 0, 0.45) !important;"></i>
                            </button>
                        ` : ''}
                    </div>
                `;

                const trashBtn = block.querySelector('.bubble-trash-btn');
                if (trashBtn) {
                    trashBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const askFn = window.openAskingPanel || window.showConfirmDialog;
                        if (typeof askFn === 'function') {
                            askFn({
                                title: 'Delete Message',
                                message: 'Delete this message from the active conversation view? The log will be retained in Record Recovery.',
                                confirmText: 'Delete',
                                cancelText: 'Cancel',
                                type: 'danger',
                                icon: 'fa-solid fa-trash-can text-red-600',
                                onConfirm: () => {
                                    conversationMessages.splice(idx, 1);
                                    item.messages = conversationMessages;
                                    paintConversationBubbles();
                                }
                            });
                        } else if (confirm('Delete this message from the conversation?')) {
                            conversationMessages.splice(idx, 1);
                            item.messages = conversationMessages;
                            paintConversationBubbles();
                        }
                    });
                }

                transcript.appendChild(block);
            });
        }

        paintConversationBubbles();

        // Helper for title casing
        function toTitleCase(str) {
            return String(str || '').toLowerCase().replace(/(?:^|\s|-)\S/g, c => c.toUpperCase());
        }

        // Past Conversations Full View Rendering (Filtered to this user only)
        let pastConvVisibleLimit = 5;
        const PAST_CONV_BATCH = 5;

        function getRealUserPastConversations() {
            const targetUid = String(cleanUserId || '').trim();
            const normalizedUid = targetUid.replace(/^0+/, '') || '0';
            const targetName = String(item.name || '').trim().toLowerCase();

            // Match authentic user past conversations by UID or name
            let userBaseList = USER_PAST_CONVERSATIONS[targetUid]
                || USER_PAST_CONVERSATIONS[cleanUserId]
                || USER_PAST_CONVERSATIONS[normalizedUid]
                || [];

            if (!userBaseList.length) {
                if (targetName.includes('stanley')) userBaseList = USER_PAST_CONVERSATIONS['0000000'];
                else if (targetName.includes('carlos')) userBaseList = USER_PAST_CONVERSATIONS['0000001'];
                else if (targetName.includes('juan')) userBaseList = USER_PAST_CONVERSATIONS['2222222'];
                else if (targetName.includes('jen')) userBaseList = USER_PAST_CONVERSATIONS['2601021'];
                else if (targetName.includes('maria')) userBaseList = USER_PAST_CONVERSATIONS['1111111'];
                else if (targetName.includes('amanda')) userBaseList = USER_PAST_CONVERSATIONS['2601033'];
                else if (targetName.includes('henry')) userBaseList = USER_PAST_CONVERSATIONS['2601031'];
            }

            const combinedList = [];
            const seen = new Set();

            // 1. ALWAYS add the conversation currently being viewed!
            const currentMsgs = conversationMessages;
            const currentUserPrompt = currentMsgs.find(m => m.role === 'user')?.text;
            const currentRaw = item.rawLog || {};
            const currentTitle = item.title || currentRaw.title || currentUserPrompt || currentMsgs[0]?.text || item.subject || 'Active Conversation';
            const currentId = item.id || 'CHAT-CURRENT';

            seen.add(currentId);
            if (item.title) seen.add(item.title.trim().toLowerCase());
            if (currentTitle) seen.add(currentTitle.trim().toLowerCase());
            if (currentUserPrompt) seen.add(currentUserPrompt.trim().toLowerCase());

            combinedList.push({
                id: currentId,
                title: currentTitle,
                updatedAt: item.timestamp || item.date || Date.now(),
                timestamp: item.timestamp || item.date || Date.now(),
                record: item,
                isCurrent: true
            });

            // 2. Add this user's base past conversations
            (userBaseList || []).forEach(conv => {
                const titleKey = String(conv.title || '').trim().toLowerCase();
                if (!seen.has(conv.id) && (!titleKey || !seen.has(titleKey))) {
                    seen.add(conv.id);
                    if (titleKey) seen.add(titleKey);
                    combinedList.push({
                        id: conv.id,
                        title: conv.title,
                        updatedAt: conv.timestamp || (conv.date ? Date.parse(conv.date) : Date.now()),
                        timestamp: conv.timestamp || (conv.date ? Date.parse(conv.date) : Date.now()),
                        record: {
                            ...conv,
                            name: item.name,
                            role: item.role,
                            userId: cleanUserId
                        }
                    });
                }
            });

            // 3. Add any dynamic conversations matching THIS user from allRecords
            (allRecords || []).forEach(r => {
                if (!r) return;
                const rUid = String(r.userId || '').replace(/^ID:\s*/i, '').trim();
                const matchesId = targetUid && (rUid === targetUid || rUid.replace(/^0+/, '') === normalizedUid);
                const matchesName = targetName && r.name && r.name.trim().toLowerCase() === targetName;
                if (!matchesId && !matchesName) return;

                const raw = r.rawLog || {};
                const msgs = Array.isArray(r.messages) && r.messages.length ? r.messages : (Array.isArray(raw.messages) && raw.messages.length ? raw.messages : []);
                const userPrompt = msgs.find(m => m.role === 'user')?.text;
                const cTitle = r.title || raw.title || userPrompt || msgs[0]?.text || r.subject || 'Conversation';
                const titleKey = String(cTitle).trim().toLowerCase();

                if (!seen.has(r.id) && !seen.has(titleKey)) {
                    seen.add(r.id);
                    if (titleKey) seen.add(titleKey);
                    combinedList.push({
                        id: r.id,
                        title: cTitle,
                        updatedAt: r.timestamp || r.date || Date.now(),
                        timestamp: r.timestamp || r.date || Date.now(),
                        record: r
                    });
                }
            });

            return combinedList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        }

        function paintPastConversations() {
            const listEl = workspace.querySelector('#ai-bot-past-conversations-list');
            if (!listEl) return;
            listEl.replaceChildren();

            const convs = getRealUserPastConversations();
            if (!convs.length) {
                listEl.innerHTML = `
                    <div class="py-8 text-center text-slate-400">
                        <i class="fa-solid fa-comments text-2xl mb-2"></i>
                        <p class="text-xs">No past conversations available.</p>
                    </div>
                `;
                return;
            }

            const visibleConvs = convs.slice(0, pastConvVisibleLimit);
            const now = Date.now();
            const day = timestamp => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(timestamp);

            const groupOrder = [];
            const groups = {};
            visibleConvs.forEach((c, position) => {
                const groupName = position === 0 ? 'Recent' : day(c.updatedAt) === day(now) ? 'Today' : day(c.updatedAt) === day(now - 86400000) ? 'Yesterday' : 'Earlier';
                if (!groups[groupName]) {
                    groups[groupName] = [];
                    groupOrder.push(groupName);
                }
                groups[groupName].push(c);
            });

            groupOrder.forEach(groupTitle => {
                const items = groups[groupTitle];
                if (!items || !items.length) return;
                const groupHeader = document.createElement('p');
                groupHeader.className = 'text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 mt-3 px-1';
                groupHeader.textContent = groupTitle;
                listEl.appendChild(groupHeader);

                items.forEach(c => {
                    const row = document.createElement('div');
                    row.className = 'sigma-conversation-row flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group';

                    // Mark active if matches active conversation
                    const isRowActive = c.id === activeConversationId || (c.isCurrent && (activeConversationId === (item.id || 'CHAT-CURRENT') || !activeConversationId));
                    if (isRowActive) {
                        row.classList.add('bg-slate-100', 'border-slate-200');
                    }

                    const cTitle = c.title || 'Conversation';
                    const dateStr = new Date(c.updatedAt).toLocaleString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

                    row.innerHTML = `
                        <div class="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                            <i class="fa-solid fa-comment text-sm shrink-0" style="color: rgba(0, 0, 0, 0.45) !important;"></i>
                            <div class="min-w-0 flex-1">
                                <p class="text-xs font-semibold text-slate-900 truncate">${escapeHtml(toTitleCase(cTitle))}</p>
                                <p class="text-[11px] font-medium mt-0.5 truncate" style="color: rgba(0, 0, 0, 0.45) !important;">${escapeHtml(dateStr)}</p>
                            </div>
                        </div>
                        <div class="action-dropdown-container relative shrink-0">
                            <button type="button" class="past-conv-more-btn action-dots-btn w-7 h-7 rounded-full flex items-center justify-center text-black hover:bg-slate-100 transition-colors cursor-pointer" style="color: #000000 !important;" title="Options" aria-label="Conversation Options">
                                <i class="fa-solid fa-ellipsis text-black text-xs" style="color: #000000 !important;"></i>
                            </button>
                            <div class="action-dropdown-menu ai-tab-row-dropdown" style="right: 0; min-width: 130px; z-index: 50;">
                                <button type="button" class="past-conv-action-find action-dropdown-item cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 rounded-lg w-full text-left">
                                    <i class="fa-solid fa-magnifying-glass text-xs w-3.5 text-center"></i>
                                    <span>Find</span>
                                </button>
                                <button type="button" class="past-conv-action-delete action-dropdown-item cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg w-full text-left">
                                    <i class="fa-solid fa-trash-can text-xs w-3.5 text-center"></i>
                                    <span>Delete</span>
                                </button>
                            </div>
                        </div>
                    `;

                    // Helper to load conversation messages into main panel
                    const loadConversation = () => {
                        let msgs = [];
                        if (c.isCurrent) {
                            msgs = initialItemMessages;
                        } else if (c.record && Array.isArray(c.record.messages) && c.record.messages.length) {
                            msgs = c.record.messages;
                        } else if (c.record && c.record.rawLog && Array.isArray(c.record.rawLog.messages) && c.record.rawLog.messages.length) {
                            msgs = c.record.rawLog.messages;
                        } else if (c.prefix) {
                            try {
                                const rawChat = localStorage.getItem(c.prefix + ':chat:' + c.id);
                                if (rawChat) msgs = JSON.parse(rawChat);
                            } catch (_) {}
                        }

                        if (Array.isArray(msgs) && msgs.length) {
                            conversationMessages = msgs.map(m => ({
                                role: m.role || (m.isUser ? 'user' : 'assistant'),
                                text: m.text || '',
                                timestamp: m.timestamp || m.stamp || c.updatedAt
                            }));
                            paintConversationBubbles();
                        } else if (c.record) {
                            window.openBotConversationReader(c.record);
                        }
                        activeConversationId = c.id;
                        listEl.querySelectorAll('.sigma-conversation-row').forEach(r => {
                            r.classList.remove('bg-slate-100', 'border-slate-200');
                        });
                        row.classList.add('bg-slate-100', 'border-slate-200');
                    };

                    const dotsBtn = row.querySelector('.past-conv-more-btn');
                    const menuDropdown = row.querySelector('.action-dropdown-menu');
                    const findBtn = row.querySelector('.past-conv-action-find');
                    const deleteBtn = row.querySelector('.past-conv-action-delete');

                    // Three dots button click: toggle menu
                    dotsBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isShowing = menuDropdown.classList.contains('show');
                        listEl.querySelectorAll('.action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
                        if (!isShowing) {
                            menuDropdown.classList.add('show');
                        }
                    });

                    // Find button click: load full conversation, hide past conversations, focus search
                    findBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        menuDropdown.classList.remove('show');
                        loadConversation();
                        setHistoryView(false);
                        const sInput = workspace.querySelector('#ai-bot-page-search-input');
                        if (sInput) {
                            sInput.focus();
                            sInput.select();
                        }
                    });

                    // Delete button click: ask confirmation and remove
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        menuDropdown.classList.remove('show');
                        const askFn = window.openAskingPanel || window.showConfirmDialog;
                        const doDelete = () => {
                            if (c.prefix) {
                                try {
                                    const raw = JSON.parse(localStorage.getItem(c.prefix + ':index') || '[]');
                                    const next = raw.map(entry => entry.id === c.id ? { ...entry, deletedAt: Date.now() } : entry);
                                    localStorage.setItem(c.prefix + ':index', JSON.stringify(next));
                                } catch (_) {}
                            }
                            if (c.record) {
                                deleteAiResultItem(c.record, 'bot');
                            }
                            row.remove();
                        };
                        if (typeof askFn === 'function') {
                            askFn({
                                title: 'Delete Conversation',
                                message: 'Delete this conversation from past records? The log will be retained in Record Recovery.',
                                confirmText: 'Delete',
                                cancelText: 'Cancel',
                                type: 'danger',
                                icon: 'fa-solid fa-trash-can text-red-600',
                                onConfirm: doDelete
                            });
                        } else if (confirm('Delete this conversation from past records?')) {
                            doDelete();
                        }
                    });

                    // Clicking the row itself: shows the full conversation in main panel!
                    row.addEventListener('click', (e) => {
                        if (e.target.closest('.action-dropdown-container')) return;
                        loadConversation();
                    });

                    listEl.appendChild(row);
                });
            });

            // Previous Conversations Button
            if (pastConvVisibleLimit < convs.length) {
                const prevWrap = document.createElement('div');
                prevWrap.className = 'notif-prev-btn-wrapper mt-3 border-t border-slate-100 pt-2.5';
                prevWrap.innerHTML = `
                    <button type="button" class="notif-prev-btn">
                        <span>Previous Conversations</span>
                        <i class="fa-solid fa-chevron-down text-[10px]"></i>
                    </button>
                `;
                prevWrap.querySelector('.notif-prev-btn').addEventListener('click', () => {
                    pastConvVisibleLimit += PAST_CONV_BATCH;
                    paintPastConversations();
                });
                listEl.appendChild(prevWrap);
            }
        }

        // Close open dropdowns when clicking anywhere outside
        workspace.addEventListener('click', (e) => {
            if (!e.target.closest('.action-dropdown-container')) {
                workspace.querySelectorAll('#ai-bot-past-conversations-list .action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
            }
        });

        // Toggle History in Left Section
        let inHistoryView = false;
        const histBtn = workspace.querySelector('#ai-bot-history-toggle-btn');
        const histIcon = workspace.querySelector('#ai-bot-hist-icon');
        const histText = workspace.querySelector('#ai-bot-hist-text');

        function setHistoryView(showHistory) {
            inHistoryView = showHistory;
            const searchContainer = workspace.querySelector('#ai-bot-page-search-container');
            const pastViewEl = workspace.querySelector('#ai-bot-past-conversations-view');

            if (showHistory) {
                pastConvVisibleLimit = 5;
                if (searchContainer) searchContainer.style.display = 'none';
                if (pastViewEl) pastViewEl.style.display = 'block';
                if (histBtn) histBtn.classList.add('bg-amber-50/70');
                if (histIcon) {
                    histIcon.classList.remove('text-black');
                    histIcon.classList.add('text-amber-500');
                }
                if (histText) {
                    histText.classList.remove('text-black');
                    histText.classList.add('text-amber-500');
                }
                paintPastConversations();
            } else {
                if (searchContainer) searchContainer.style.display = '';
                if (pastViewEl) pastViewEl.style.display = 'none';
                if (histBtn) histBtn.classList.remove('bg-amber-50/70');
                if (histIcon) {
                    histIcon.classList.remove('text-amber-500');
                    histIcon.classList.add('text-black');
                }
                if (histText) {
                    histText.classList.remove('text-amber-500');
                    histText.classList.add('text-black');
                }
            }
        }

        if (histBtn) {
            histBtn.addEventListener('click', () => {
                setHistoryView(!inHistoryView);
            });
        }

        const pastCloseBtn = workspace.querySelector('#ai-bot-past-close-btn');
        if (pastCloseBtn) {
            pastCloseBtn.addEventListener('click', () => {
                setHistoryView(false);
            });
        }

        // Set up in-conversation search & highlighting
        const searchForm = workspace.querySelector('#ai-bot-page-search-form');
        const searchInput = workspace.querySelector('#ai-bot-page-search-input');
        const searchClear = workspace.querySelector('#ai-bot-page-search-clear');
        const searchNav = workspace.querySelector('#ai-bot-page-navigation');
        const searchResult = workspace.querySelector('#ai-bot-page-result');
        const prevBtn = workspace.querySelector('#ai-bot-page-prev');
        const nextBtn = workspace.querySelector('#ai-bot-page-next');

        let matches = [];
        let currentMatch = -1;

        function highlightBubble(bubble, term) {
            const originalText = bubble.dataset.originalText || bubble.textContent;
            bubble.dataset.originalText = originalText;
            if (!term) {
                bubble.textContent = originalText;
                return;
            }
            bubble.replaceChildren();
            let offset = 0;
            let index;
            const lower = originalText.toLowerCase();
            while ((index = lower.indexOf(term, offset)) !== -1) {
                bubble.append(document.createTextNode(originalText.slice(offset, index)));
                const mark = document.createElement('mark');
                mark.textContent = originalText.slice(index, index + term.length);
                bubble.append(mark);
                offset = index + term.length;
            }
            bubble.append(document.createTextNode(originalText.slice(offset)));
        }

        function jumpToMatch(index) {
            if (!matches.length) return;
            currentMatch = index;
            const marks = transcript.querySelectorAll('mark');
            marks.forEach((mark, mIdx) => {
                mark.classList.toggle('ai-log-match-current', mIdx === currentMatch);
                if (mIdx === currentMatch) {
                    mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            });
            if (searchResult) {
                searchResult.textContent = (currentMatch + 1) + ' of ' + matches.length + ' matches';
            }
        }

        if (searchInput && searchClear) {
            searchInput.addEventListener('input', () => {
                searchClear.hidden = !searchInput.value;
                if (!searchInput.value.trim()) {
                    transcript.querySelectorAll('.sigma-ai-message__bubble').forEach(b => highlightBubble(b, ''));
                    if (searchNav) searchNav.hidden = true;
                    if (searchResult) searchResult.textContent = '';
                }
            });
            searchClear.addEventListener('click', () => {
                searchInput.value = '';
                searchClear.hidden = true;
                transcript.querySelectorAll('.sigma-ai-message__bubble').forEach(b => highlightBubble(b, ''));
                if (searchNav) searchNav.hidden = true;
                if (searchResult) searchResult.textContent = '';
                searchInput.focus({ preventScroll: true });
            });
        }

        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const term = (searchInput?.value || '').trim().toLowerCase();
                matches = [];
                currentMatch = -1;
                const bubbles = transcript.querySelectorAll('.sigma-ai-message__bubble');
                bubbles.forEach(b => highlightBubble(b, term));

                const allMarks = transcript.querySelectorAll('mark');
                matches = Array.from(allMarks);

                if (searchNav) searchNav.hidden = !term;
                if (prevBtn) prevBtn.disabled = matches.length < 2;
                if (nextBtn) nextBtn.disabled = matches.length < 2;

                if (!term) {
                    if (searchResult) searchResult.textContent = '';
                    return;
                }

                if (matches.length > 0) {
                    jumpToMatch(0);
                } else {
                    if (searchResult) searchResult.textContent = 'No messages found';
                }
            });
        }

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                if (!matches.length) return;
                jumpToMatch((currentMatch - 1 + matches.length) % matches.length);
            });
            nextBtn.addEventListener('click', () => {
                if (!matches.length) return;
                jumpToMatch((currentMatch + 1) % matches.length);
            });
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderBotWorkspace(filtered, allRecords) {
        const workspace = document.getElementById('ai-bot-workspace');
        if (!workspace) return;

        if (viewingBotConversationItem) {
            renderBotConversationPage(viewingBotConversationItem, filtered, allRecords);
            return;
        }

        const toolbar = document.getElementById('ai-bot-toolbar');
        if (toolbar) toolbar.style.display = '';
        workspace.className = 'px-8 py-6 bg-slate-50/70 flex-1 min-h-[660px]';

        if (!filtered.length) {
            workspace.innerHTML = `
                <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden min-h-[400px]">
                    <div class="p-4 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-slate-800 font-['Inter']">Conversations</span>
                        </div>
                        <span class="text-[11px] text-black-fade font-medium">Real-time Transcripts</span>
                    </div>
                    <div class="py-20 px-4 text-center text-slate-400">
                        <div class="w-14 h-14 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-300 mx-auto mb-3 shadow-2xs">
                            <i class="fa-solid fa-comments text-2xl"></i>
                        </div>
                        <p class="text-sm font-bold text-slate-800 font-['Inter']">No conversations</p>
                        <p class="text-xs text-slate-400 mt-1">No conversation records match your current filter.</p>
                    </div>
                </div>
            `;
            return;
        }

        // Validate activeBotThreadId: keep current if valid in filtered, otherwise null (no default selection)
        if (activeBotThreadId && !filtered.some(item => item.id === activeBotThreadId)) {
            activeBotThreadId = null;
        }

        const botSearchQuery = (document.getElementById('ai-bot-search-query')?.value || '').trim();
        const isSearching = botSearchQuery.length > 0;

        // Render full-width card container matching original style
        workspace.innerHTML = `
            <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden min-h-[500px]">
                <div class="p-4 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-800 font-['Inter']">Conversations</span>
                        ${isSearching ? `
                            <span class="inline-flex items-center justify-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-black border border-slate-200 shadow-2xs" style="color: #000000 !important; background-color: #ffffff !important;">${filtered.length}</span>
                        ` : ''}
                    </div>
                    <span class="text-[11px] text-black-fade font-medium">Real-time Transcripts</span>
                </div>
                <div class="divide-y divide-slate-100" id="ai-bot-threads-list">
                    <!-- Populated dynamically below -->
                </div>
            </div>
        `;

        // Render Threads in List
        const threadsList = workspace.querySelector('#ai-bot-threads-list');
        if (threadsList) {
            filtered.forEach(item => {
                const isActive = item.id === activeBotThreadId;
                const cleanUserId = String(item.userId || '').replace(/^ID:\s*/i, '').trim();

                const rawItemLog = item.rawLog || {};
                const msgs = Array.isArray(item.messages) && item.messages.length ? item.messages : (Array.isArray(rawItemLog.messages) && rawItemLog.messages.length ? rawItemLog.messages : []);
                const userPrompt = msgs.find(m => m.role === 'user')?.text;
                const firstMsg = item.title || rawItemLog.title || userPrompt || msgs[0]?.text || item.subject || rawItemLog.prompt || 'Conversation';
                const conversationTitle = String(firstMsg).replace(/\r?\n+/g, ' ').trim();
                const msgCount = msgs.length || 2;

                const userAvatar = typeof window.renderUserAvatarHtml === 'function'
                    ? window.renderUserAvatarHtml({ id: item.userId, name: item.name }, 'md')
                    : '<span class="sigma-user-avatar sigma-user-avatar--md" aria-hidden="true"><i class="fa-solid fa-user"></i></span>';

                const cardBtn = document.createElement('div');
                cardBtn.className = `sigma-bot-card-item ${
                    isActive ? 'is-active sigma-bot-card-active' : ''
                }`;
                if (isActive) {
                    cardBtn.style.backgroundColor = '#f0fdf4';
                    cardBtn.style.borderLeft = '4px solid #15803d';
                }

                cardBtn.innerHTML = `
                    <div class="sigma-bot-card-grid">
                        <!-- Left Column: User Identity & ID -->
                        <div class="sigma-bot-card-left">
                            <div class="shrink-0">
                                ${userAvatar}
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <span class="truncate text-xs font-bold ${isActive ? 'text-[#15803d]' : 'text-slate-900'} font-['Inter']">${escapeHtml(item.name)}</span>
                                    <span class="profile-panel-role-badge shrink-0 text-[10px] !bg-[#1d4ed8] !text-white !border-0 !rounded-full !py-0.5 !px-2 font-bold">${escapeHtml(item.role)}</span>
                                </div>
                                <div class="text-[11px] text-black-fade font-medium mt-0.5" style="color: rgba(0, 0, 0, 0.45) !important;">
                                    ${cleanUserId ? 'ID: ' + escapeHtml(cleanUserId) : '&nbsp;'}
                                </div>
                                <div class="text-[10px] font-semibold text-emerald-700 mt-0.5 truncate">
                                    ${escapeHtml(item.id)}
                                </div>
                            </div>
                        </div>

                        <!-- Middle Column: Body Text (Inquiry / Prompt) -->
                        <div class="sigma-bot-card-middle">
                            <p class="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed break-words font-['Inter'] m-0" style="color: #1e293b !important;">${escapeHtml(conversationTitle)}</p>
                        </div>

                        <!-- Right Column: Date & Message Count -->
                        <div class="sigma-bot-card-right">
                            <span class="text-[11px] text-black-fade font-medium whitespace-nowrap" style="color: rgba(0, 0, 0, 0.45) !important;">${escapeHtml(item.date)}</span>
                            <span class="font-medium bg-slate-100 text-slate-600 text-[10px] px-2.5 py-0.5 rounded-full whitespace-nowrap">${msgCount} msg${msgCount === 1 ? '' : 's'}</span>
                        </div>
                    </div>
                    ${isActive ? `
                        <div class="mt-4 flex items-center justify-end w-full">
                            <button type="button" class="read-conversation-btn sigma-btn sigma-btn-primary sigma-btn-md cursor-pointer">
                                <i class="fa-solid fa-book-open"></i>
                                <span>Read Conversation</span>
                            </button>
                        </div>
                    ` : ''}
                `;

                cardBtn.addEventListener('click', (e) => {
                    if (e.target.closest('.read-conversation-btn')) {
                        e.stopPropagation();
                        window.openBotConversationReader(item);
                        return;
                    }
                    if (activeBotThreadId === item.id) {
                        activeBotThreadId = null; // Unselect!
                    } else {
                        activeBotThreadId = item.id; // Select!
                    }
                    renderBotWorkspace(filtered, allRecords);
                });

                const readBtn = cardBtn.querySelector('.read-conversation-btn');
                if (readBtn) {
                    readBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        window.openBotConversationReader(item);
                    });
                }

                threadsList.appendChild(cardBtn);
            });
        }
    }

    // Main render function for each tab
    function renderTabTable(tabKey) {
        if (tabKey !== 'bot') {
            viewingBotConversationItem = null;
        }
        if (tabKey === 'insights') {
            if (typeof window.renderGeneratesUserInsights === 'function') {
                window.renderGeneratesUserInsights();
            }
        }
        const records = loadStore(tabKey);
        const searchQuery = (document.getElementById(`ai-${tabKey}-search-query`)?.value || '').trim().toLowerCase();
        const roleFilter = (document.getElementById(`ai-${tabKey}-search-role`)?.value || '').trim().toLowerCase();

        const filtered = records.filter(item => {
            let messagesText = '';
            if (Array.isArray(item.messages)) {
                messagesText += ' ' + item.messages.map(m => (m.text || '') + ' ' + (m.role || '')).join(' ');
            }
            if (Array.isArray(item.rawLog?.messages)) {
                messagesText += ' ' + item.rawLog.messages.map(m => (m.text || '') + ' ' + (m.role || '')).join(' ');
            }
            if (item.rawLog?.prompt) messagesText += ' ' + item.rawLog.prompt;
            if (item.rawLog?.title) messagesText += ' ' + item.rawLog.title;
            if (item.rawLog?.details) messagesText += ' ' + item.rawLog.details;
            if (item.title) messagesText += ' ' + item.title;
            if (item.details) messagesText += ' ' + item.details;
            if (item.notes) messagesText += ' ' + item.notes;

            const nameStr = String(item.name || '').toLowerCase();
            const userStr = String(item.userId || '').toLowerCase();
            const idStr = String(item.id || '').toLowerCase();
            const subjStr = String(item.subject || '').toLowerCase();
            const typeStr = String(item.type || '').toLowerCase();
            const scoreStr = String(item.score || '').toLowerCase();
            const fileStr = String(item.fileName || '').toLowerCase();
            const allSearchable = (nameStr + ' ' + userStr + ' ' + idStr + ' ' + subjStr + ' ' + typeStr + ' ' + scoreStr + ' ' + fileStr + ' ' + messagesText.toLowerCase());

            const matchesQuery = !searchQuery || allSearchable.includes(searchQuery);

            const itemRole = String(item.role || '').toLowerCase();
            const matchesRole = !roleFilter ||
                itemRole === roleFilter ||
                (roleFilter === 'admin' && (itemRole.includes('admin') || itemRole.includes('master'))) ||
                (roleFilter === 'student' && itemRole.includes('student')) ||
                (roleFilter === 'teacher' && itemRole.includes('teacher'));

            return matchesQuery && matchesRole;
        });

        // Update metrics
        updateMetrics(tabKey, records);

        // Special dedicated split-pane workspace for SIGMA Bot page
        if (tabKey === 'bot') {
            renderBotWorkspace(filtered, records);
            return;
        }

        const tbody = document.getElementById(`ai-${tabKey}-table-body`);
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!filtered.length) {
            let emptyIcon = 'fa-solid fa-file-circle-check';
            let emptyTitle = 'No Evaluations Found';
            let emptySubtitle = 'No evaluated submissions available.';
            if (tabKey === 'feedback') {
                emptyIcon = 'fa-solid fa-comments';
                emptyTitle = 'No Feedback Found';
                emptySubtitle = 'No feedback records available.';
            } else if (tabKey === 'assessments') {
                emptyIcon = 'fa-solid fa-file-pen';
                emptyTitle = 'No Assessments Found';
                emptySubtitle = 'No generated assessments available.';
            } else if (tabKey === 'insights') {
                emptyIcon = 'fa-solid fa-chart-line';
                emptyTitle = 'No Insights Found';
                emptySubtitle = 'No generated insights available.';
            } else if (tabKey === 'bot') {
                emptyIcon = 'fa-solid fa-robot';
                emptyTitle = 'No Conversations Found';
                emptySubtitle = 'No conversation records available.';
            }
            const emptyColspan = (tabKey === 'assessments' || tabKey === 'evaluations') ? 7 : 8;
            tbody.innerHTML = `
                <tr id="ai-${tabKey}-empty-state" class="bg-white">
                    <td colspan="${emptyColspan}" class="py-32 text-center">
                        <div class="flex flex-col items-center justify-center space-y-4">
                            <i class="${emptyIcon} text-6xl text-black-fade" style="color: rgba(0, 0, 0, 0.45) !important;"></i>
                            <p class="text-base font-bold text-black font-['Inter']">${emptyTitle}</p>
                            <p class="text-xs text-black-fade font-['Inter']" style="color: rgba(0, 0, 0, 0.45) !important;">${emptySubtitle}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const viewActionLabel = tabKey === 'evaluations' ? 'View Evaluation' : tabKey === 'feedback' ? 'View Feedback' : tabKey === 'assessments' ? 'View Assessment' : 'View Details';
        const deleteActionLabelMap = {
            evaluations: 'Delete Evaluation',
            feedback: 'Delete Feedback',
            assessments: 'Delete Assessment',
            insights: 'Delete Insight',
            bot: 'Delete Conversation'
        };
        const deleteActionLabel = deleteActionLabelMap[tabKey] || 'Delete Record';

        filtered.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-colors border-b border-slate-100 text-xs md:text-sm';
            const rowNumber = filtered.length - index;
            const assessmentDetails = splitAssessmentSubject(item.subject);

            // Status Badge Color
            let badgeClass = 'bg-slate-100 text-slate-700';
            if (item.status === 'High Mastery' || item.status === 'Positive Trend' || item.status === 'Resolved' || item.status === 'Active' || item.status === 'Sent' || item.status === 'Published') {
                badgeClass = 'bg-emerald-50 text-[#15803d] font-bold';
            } else if (item.status === 'Needs Support' || item.status === 'At Risk') {
                badgeClass = 'bg-rose-50 text-rose-700 font-bold';
            } else if (item.status === 'Satisfactory' || item.status === 'Class Alert' || item.status === 'Draft' || item.status === 'Pending Review') {
                badgeClass = 'bg-amber-50 text-amber-700 font-bold';
            }
            const scoreBadgeClass = tabKey === 'evaluations'
                ? 'bg-[#15803d]/10 border border-[#15803d]/20 text-[#15803d] font-bold'
                : badgeClass;

            const isFeedbackRow = String(item.id || '').startsWith('FDBK') || (!item.score && Boolean(item.type));
            const rowViewActionLabel = isFeedbackRow ? 'View Feedback' : (tabKey === 'evaluations' ? 'View Evaluation' : viewActionLabel);
            const rowDeleteActionLabel = isFeedbackRow ? 'Delete Feedback' : (tabKey === 'evaluations' ? 'Delete Evaluation' : deleteActionLabel);

            const studentAvatarHtml = typeof window.renderUserAvatarHtml === 'function'
                ? window.renderUserAvatarHtml({ id: item.userId, name: item.name }, 'sm')
                : '<span class="sigma-user-avatar sigma-user-avatar--sm" aria-hidden="true"><i class="fa-solid fa-user"></i></span>';
            const cleanReqById = resolveAccountIdByNameOrId(item.requestedById, item.requestedBy);
            const requestedByAvatarHtml = typeof window.renderUserAvatarHtml === 'function'
                ? window.renderUserAvatarHtml({ id: cleanReqById, name: item.requestedBy || '' }, 'sm')
                : '<span class="sigma-user-avatar sigma-user-avatar--sm" aria-hidden="true"><i class="fa-solid fa-user"></i></span>';
            const cleanItemUserId = String(item.userId || '').replace(/^ID:\s*/i, '').trim();

            if (tabKey === 'assessments') {
                const isSuccess = item.status === 'Success' || item.status === 'Active' || item.status === 'Generated' || item.status === 'Published';
                const asmtStatusText = isSuccess ? 'Success' : 'Failed';
                const asmtBadgeClass = isSuccess ? 'bg-emerald-50 text-[#15803d] font-bold' : 'bg-rose-50 text-rose-700 font-bold';

                const displayFileName = item.fileName || (item.fileType ? `grounding_document.${item.fileType}` : (item.assessmentTitle || 'Generated File'));

                tr.innerHTML = `
                    <td class="px-4 py-4 text-center">
                        <div class="text-[13px] font-normal text-black text-center tracking-wide font-['Inter']" style="color: #000000 !important;">${rowNumber}</div>
                    </td>
                    <td class="px-4 py-4 text-center">
                        <div class="text-[13px] font-normal text-black text-center tracking-wide font-['Inter'] whitespace-nowrap" style="color: #000000 !important;">${item.id}${item.isPreview ? '<span class="block mt-1 text-[10px] font-medium text-slate-400">Preview</span>' : ''}</div>
                    </td>
                    <td class="px-4 py-4 font-normal text-black font-['Inter']">
                        <div class="flex items-center gap-2.5">
                            ${studentAvatarHtml}
                            <div class="truncate">
                                <div class="truncate text-[13px] font-normal text-black leading-snug">${item.name}</div>
                                <div class="mt-0.5 truncate text-[12px] font-normal text-black-fade leading-snug" style="color: rgba(0, 0, 0, 0.45) !important;">${cleanItemUserId ? `ID: ${cleanItemUserId}` : ''}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-4 font-normal text-black font-['Inter']">
                        <div class="truncate text-[13px] font-normal text-black leading-snug" title="${escapeHtml(displayFileName)}">
                            ${escapeHtml(displayFileName)}
                        </div>
                    </td>
                    <td class="px-4 py-4 text-center">
                        <span class="inline-block px-2.5 py-1 rounded-lg text-[11px] ${asmtBadgeClass}">
                            ${asmtStatusText}
                        </span>
                    </td>
                    <td class="px-4 py-3.5 text-center">
                        <div class="text-[13px] font-normal text-black text-center font-['Inter'] whitespace-nowrap" style="color: #000000 !important;">${item.date}</div>
                    </td>
                    <td class="px-4 py-4 text-center">
                        <div class="flex justify-center">
                            <div class="action-dropdown-container">
                                <button type="button" class="ai-tab-row-menu-btn action-dots-btn cursor-pointer" title="Actions" aria-label="Row Actions" aria-expanded="false">
                                    <i class="fa-solid fa-ellipsis"></i>
                                </button>
                                <div class="ai-tab-row-dropdown action-dropdown-menu">
                                    <button type="button" class="ai-action-open-quiz action-dropdown-item cursor-pointer">
                                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                        <span>View in Quiz Creator</span>
                                    </button>
                                    <button type="button" class="ai-action-download action-dropdown-item cursor-pointer">
                                        <i class="fa-solid fa-download"></i>
                                        <span>Download File</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </td>
                `;
            } else if (tabKey === 'insights') {
                tr.innerHTML = `
                    <td class="px-4 py-4 text-center">
                        <div class="text-[13px] font-normal text-black text-center tracking-wide font-['Inter']" style="color: #000000 !important;">${rowNumber}</div>
                    </td>
                    <td class="px-4 py-4 text-center">
                        <div class="text-[13px] font-normal text-black text-center tracking-wide font-['Inter'] whitespace-nowrap" style="color: #000000 !important;">${item.id}${item.isPreview ? '<span class="block mt-1 text-[10px] font-medium text-slate-400">Preview</span>' : ''}</div>
                    </td>
                    <td class="px-4 py-4 font-normal text-black font-['Inter']">
                        <div class="flex items-center gap-2.5">
                            ${studentAvatarHtml}
                            <div class="truncate">
                                <div class="truncate text-[13px] font-normal text-black leading-snug">${item.name}</div>
                                <div class="mt-0.5 truncate text-[12px] font-normal text-black-fade leading-snug" style="color: rgba(0, 0, 0, 0.45) !important;">${cleanItemUserId ? `ID: ${cleanItemUserId}` : ''}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-4 font-normal text-black font-['Inter']">
                        <div class="truncate text-[13px] font-normal text-black leading-snug" title="${escapeHtml(item.subject || 'Analytics Insight')}">
                            ${escapeHtml(item.subject || 'Analytics Insight')}
                        </div>
                    </td>
                    <td class="px-4 py-4 text-center font-normal text-black font-['Inter']">
                        <span class="text-[13px] font-normal text-black leading-snug">
                            ${escapeHtml(item.type || 'Insight')}
                        </span>
                    </td>
                    <td class="px-4 py-4 text-center font-normal text-black font-['Inter']">
                        <span class="text-[13px] font-normal text-black leading-snug">
                            ${escapeHtml(item.status || 'Active')}
                        </span>
                    </td>
                    <td class="px-4 py-3.5 text-center">
                        <div class="text-[13px] font-normal text-black text-center font-['Inter'] whitespace-nowrap" style="color: #000000 !important;">${item.date}</div>
                    </td>
                    <td class="px-4 py-4 text-center">
                        <div class="flex justify-center">
                            <div class="action-dropdown-container">
                                <button type="button" class="ai-tab-row-menu-btn action-dots-btn cursor-pointer" title="Actions" aria-label="Row Actions" aria-expanded="false">
                                    <i class="fa-solid fa-ellipsis"></i>
                                </button>
                                <div class="ai-tab-row-dropdown action-dropdown-menu">
                                    <button type="button" class="ai-action-view action-dropdown-item cursor-pointer">
                                        <i class="fa-solid fa-eye"></i>
                                        <span>${viewActionLabel}</span>
                                    </button>
                                    <button type="button" class="ai-action-delete action-dropdown-item cursor-pointer">
                                        <i class="fa-solid fa-trash-can"></i>
                                        <span>${deleteActionLabel}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </td>
                `;
            } else {
                tr.innerHTML = `
                    <td class="px-4 py-4 text-center">
                        <div class="text-[13px] font-normal text-black text-center tracking-wide font-['Inter']" style="color: #000000 !important;">${rowNumber}</div>
                    </td>
                    <td class="px-4 py-4 text-center">
                        <div class="text-[13px] font-normal text-black text-center tracking-wide font-['Inter'] whitespace-nowrap" style="color: #000000 !important;">${item.id}${item.isPreview ? '<span class="block mt-1 text-[10px] font-medium text-slate-400">Preview</span>' : ''}</div>
                    </td>
                    <td class="px-4 py-4 font-normal text-black font-['Inter']">
                        <div class="flex items-center gap-2.5">
                            ${studentAvatarHtml}
                            <div class="truncate">
                                <div class="truncate text-[13px] font-normal text-black leading-snug">${item.name}</div>
                                <div class="mt-0.5 truncate text-[12px] font-normal text-black-fade leading-snug" style="color: rgba(0, 0, 0, 0.45) !important;">${cleanItemUserId ? `ID: ${cleanItemUserId}` : ''}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-4 font-['Inter']">
                        <div class="min-w-0">
                            <div class="truncate text-[13px] font-normal text-black leading-snug" title="${assessmentDetails.assessment}">${assessmentDetails.assessment}</div>
                            ${assessmentDetails.subject ? `<div class="mt-0.5 truncate text-[12px] font-normal text-black-fade leading-snug" style="color: rgba(0, 0, 0, 0.45) !important;" title="${assessmentDetails.subject}">${assessmentDetails.subject}</div>` : ''}
                        </div>
                    </td>
                    <td class="px-4 py-4 font-['Inter']">
                        <div class="flex min-w-0 items-center gap-2.5">
                            ${requestedByAvatarHtml}
                            <div class="truncate">
                                <div class="truncate text-[13px] font-normal text-black leading-snug" title="${item.requestedBy || 'Not recorded'}">${item.requestedBy || 'Not recorded'}</div>
                                ${cleanReqById ? `<div class="mt-0.5 truncate text-[12px] font-normal text-black-fade leading-snug" style="color: rgba(0, 0, 0, 0.45) !important;">ID: ${cleanReqById}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3.5 text-center">
                        <div class="text-[13px] font-normal text-black text-center font-['Inter'] whitespace-nowrap" style="color: #000000 !important;">${item.date}</div>
                    </td>
                    <td class="px-4 py-4 text-center">
                        <div class="flex justify-center">
                            <div class="action-dropdown-container">
                                <button type="button" class="ai-tab-row-menu-btn action-dots-btn cursor-pointer" title="Actions" aria-label="Row Actions" aria-expanded="false">
                                    <i class="fa-solid fa-ellipsis"></i>
                                </button>
                                <div class="ai-tab-row-dropdown action-dropdown-menu">
                                    <button type="button" class="ai-action-view action-dropdown-item cursor-pointer">
                                        <i class="fa-solid fa-eye"></i>
                                        <span>${rowViewActionLabel}</span>
                                    </button>
                                    <button type="button" class="ai-action-delete action-dropdown-item cursor-pointer">
                                        <i class="fa-solid fa-trash-can"></i>
                                        <span>${rowDeleteActionLabel}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </td>
                `;
            }

            // Action listeners
            const menuBtn = tr.querySelector('.ai-tab-row-menu-btn');
            const menuDropdown = tr.querySelector('.ai-tab-row-dropdown');
            const viewBtn = tr.querySelector('.ai-action-view');
            const deleteBtn = tr.querySelector('.ai-action-delete');
            const openQuizBtn = tr.querySelector('.ai-action-open-quiz');
            const downloadBtn = tr.querySelector('.ai-action-download');

            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isShowing = menuDropdown.classList.contains('show');
                if (typeof window.closeAllTableActionDropdowns === 'function') {
                    window.closeAllTableActionDropdowns(menuDropdown);
                } else {
                    document.querySelectorAll('.action-dropdown-menu').forEach(d => {
                        if (d !== menuDropdown) d.classList.remove('show', 'dropup');
                    });
                    document.querySelectorAll('.action-dots-btn').forEach(b => {
                        if (b !== menuBtn) b.classList.remove('active');
                    });
                }
                if (!isShowing) {
                    menuDropdown.classList.add('show');
                    menuBtn.classList.add('active');
                    menuBtn.setAttribute('aria-expanded', 'true');
                    if (typeof window.positionActionDropdown === 'function') {
                        window.positionActionDropdown(menuDropdown, menuBtn);
                    }
                } else {
                    menuDropdown.classList.remove('show', 'dropup');
                    menuBtn.classList.remove('active');
                    menuBtn.setAttribute('aria-expanded', 'false');
                }
            });

            if (openQuizBtn) {
                openQuizBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menuDropdown.classList.remove('show', 'dropup');
                    menuBtn.classList.remove('active');
                    menuBtn.setAttribute('aria-expanded', 'false');
                    openAssessmentInQuizCreator(item);
                });
            }

            if (downloadBtn) {
                downloadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menuDropdown.classList.remove('show', 'dropup');
                    menuBtn.classList.remove('active');
                    menuBtn.setAttribute('aria-expanded', 'false');
                    downloadAssessmentExport(item);
                });
            }

            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menuDropdown.classList.remove('show', 'dropup');
                    menuBtn.classList.remove('active');
                    menuBtn.setAttribute('aria-expanded', 'false');
                    if (tabKey === 'evaluations' || tabKey === 'feedback') {
                        openEvaluationInSectionSubmission(item);
                    } else {
                        showDetailsModal(item, tabKey);
                    }
                });
            }

            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menuDropdown.classList.remove('show', 'dropup');
                    menuBtn.classList.remove('active');
                    menuBtn.setAttribute('aria-expanded', 'false');
                    deleteAiResultItem(item, tabKey);
                });
            }

            tbody.appendChild(tr);
        });
    }

    function updateMetrics(tabKey, records) {
        if (tabKey === 'evaluations') {
            const high = records.filter(r => r.status === 'High Mastery').length;
            const avg = records.filter(r => r.status === 'Satisfactory').length;
            const needs = records.filter(r => r.status === 'Needs Support').length;
            setMetric('ai-eval-metric-total', records.length);
            setMetric('ai-eval-metric-high', high);
            setMetric('ai-eval-metric-avg', avg);
            setMetric('ai-eval-metric-needs', needs);
        } else if (tabKey === 'feedback') {
            const strengthsCount = records.filter(r => r.hasStrength || (r.details && /strength/i.test(r.details)) || (r.type && /strength|formative/i.test(r.type))).length;
            const improvementsCount = records.filter(r => r.hasImprovement || (r.details && /improvement/i.test(r.details)) || (r.type && /improvement|corrective|review/i.test(r.type))).length;
            const nextStepsCount = records.filter(r => r.hasNextStep || (r.details && /next_step|next step/i.test(r.details)) || (r.type && /next step|guidance|advice/i.test(r.type))).length;
            setMetric('ai-fb-metric-total', records.length);
            setMetric('ai-fb-metric-strengths', strengthsCount);
            setMetric('ai-fb-metric-improvements', improvementsCount);
            setMetric('ai-fb-metric-nextsteps', nextStepsCount);
        } else if (tabKey === 'assessments') {
            const mcq = records.filter(r => r.type.includes('Multiple Choice')).length;
            const coding = records.filter(r => r.type.includes('Coding')).length;
            const active = records.filter(r => r.status === 'Active').length;
            setMetric('ai-asmt-metric-total', records.length);
            setMetric('ai-asmt-metric-mcq', mcq);
            setMetric('ai-asmt-metric-coding', coding);
            setMetric('ai-asmt-metric-active', active);
        } else if (tabKey === 'insights') {
            const gradeInsights = records.filter(r => r.type === 'Grade Insight').length;
            const alerts = records.filter(r => r.status === 'At Risk' || r.status === 'Class Alert').length;
            const positive = records.filter(r => r.status === 'Positive Trend' || r.status === 'Consistent').length;
            setMetric('ai-inst-metric-total', records.length);
            setMetric('ai-inst-metric-grade', gradeInsights);
            setMetric('ai-inst-metric-alerts', alerts);
            setMetric('ai-inst-metric-positive', positive);
        } else if (tabKey === 'bot') {
            const studentInq = records.filter(r => r.type === 'Student Inquiry').length;
            const teacherInq = records.filter(r => r.type === 'Teacher Assistance').length;
            const resolved = records.filter(r => r.status === 'Resolved').length;
            setMetric('ai-bot-metric-total', records.length);
            setMetric('ai-bot-metric-student', studentInq);
            setMetric('ai-bot-metric-teacher', teacherInq);
            setMetric('ai-bot-metric-resolved', resolved);
        }
    }

    function setMetric(id, val) {
        const el = document.getElementById(id);
        const elSpot = document.getElementById(id + '-spotlight');
        if (el) el.textContent = String(val);
        if (elSpot) elSpot.textContent = String(val);
    }

    // Close any open dropdown on body click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.action-dropdown-container')) {
            document.querySelectorAll('.ai-tab-row-dropdown.show').forEach(d => d.classList.remove('show', 'dropup'));
            document.querySelectorAll('.ai-tab-row-menu-btn.active').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-expanded', 'false');
            });
        }
    });

    // Public API
    window.SigmaAiResults = {
        render: renderTabTable,
        renderAll: function () {
            ['evaluations', 'feedback', 'assessments', 'insights', 'bot'].forEach(renderTabTable);
        },
        getRecords: loadStore,
        openEvaluationSubmission: openEvaluationInSectionSubmission
    };

    // Auto-init on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        window.SigmaAiResults.renderAll();
    });

})();
