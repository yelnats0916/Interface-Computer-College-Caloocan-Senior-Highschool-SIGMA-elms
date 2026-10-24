(function () {
    'use strict';

    const ROLE_ORDER = {
        'Admin': 1,
        'Teacher': 2,
        'Student': 3,
        '': 4
    };

    const VALID_ROLES = ['Admin', 'Teacher', 'Student'];
    const VALID_GENDERS = ['Male', 'Female'];

    let batchStep = 1;
    let batchEntries = [];
    let batchCreatedAccounts = [];
    let batchUploadedFileName = '';
    let batchUploadedFileObj = null;
    let batchUploadedFileExt = '';
    let batchSavePending = false;
    let nextRowUid = 1;

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatPersonName(value) {
        return String(value || '')
            .replace(/[^a-zA-ZñÑ\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/(?:^|\s)\S/g, c => c.toUpperCase());
    }

    function normalizeRoleValue(raw) {
        const clean = String(raw || '').trim().toLowerCase();
        if (!clean) return '';
        if (clean === 'admin' || clean === 'administrator' || clean === 'system admin' || clean === 'school admin') return 'Admin';
        if (clean === 'teacher' || clean === 'faculty' || clean === 'instructor' || clean === 'adviser' || clean === 'professor') return 'Teacher';
        if (clean === 'student' || clean === 'learner' || clean === 'pupil') return 'Student';
        return '';
    }

    function normalizeGenderValue(raw) {
        const clean = String(raw || '').trim().toLowerCase();
        if (!clean) return '';
        if (clean === 'male' || clean === 'm' || clean === 'lalaki' || clean === 'boy' || clean === 'man') return 'Male';
        if (clean === 'female' || clean === 'f' || clean === 'babae' || clean === 'girl' || clean === 'woman') return 'Female';
        return '';
    }

    function normalizeEmailPrefix(raw) {
        const str = String(raw || '').trim().toLowerCase();
        if (!str) return '';
        const localPart = str.split('@')[0] || '';
        return localPart.replace(/[^a-z0-9.]/g, '').replace(/^\.+|\.+$/g, '').slice(0, 64);
    }

    function getActiveBranchName() {
        const singleBranchSelect = document.getElementById('edit-user-school-branch');
        if (singleBranchSelect && singleBranchSelect.value) {
            return singleBranchSelect.value.trim();
        }
        try {
            const branches = JSON.parse(localStorage.getItem('sigma-school-branches') || '[]');
            if (Array.isArray(branches) && branches.length > 0) {
                const first = branches[0];
                const name = typeof first === 'string' ? first : (first?.name || first?.branchName || '');
                if (name) return String(name).trim();
            }
        } catch (_) {}
        return 'Interface Computer College Caloocan';
    }

    function getBranchCodeForName(branchName) {
        if (typeof window.getSchoolBranchCode === 'function') {
            return window.getSchoolBranchCode(branchName) || '01';
        }
        return '01';
    }

    function buildPasswordPreview(lastName, id) {
        const cleanLast = String(lastName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanId = String(id || '').trim();
        if (!cleanLast || !cleanId || cleanId === 'Not Generated') return '';
        return `${cleanLast}${cleanId}`;
    }

    function getExistingUsers() {
        try {
            const primary = JSON.parse(localStorage.getItem('sigma-managed-users') || 'null');
            if (Array.isArray(primary) && primary.length) return primary;
            const fallback = JSON.parse(localStorage.getItem('sigma-users-list') || '[]');
            return Array.isArray(fallback) ? fallback : [];
        } catch (_) {
            return [];
        }
    }

    function sortBatchEntriesByRole(entries) {
        return entries.slice().sort((a, b) => {
            const orderA = ROLE_ORDER[a.role] ?? 4;
            const orderB = ROLE_ORDER[b.role] ?? 4;
            if (orderA !== orderB) return orderA - orderB;
            return (a._seq || 0) - (b._seq || 0);
        });
    }

    function createBlankEntry(overrides = {}) {
        return {
            _uid: nextRowUid++,
            _seq: nextRowUid,
            branch: overrides.branch || getActiveBranchName(),
            role: normalizeRoleValue(overrides.role),
            firstName: formatPersonName(overrides.firstName),
            middleName: formatPersonName(overrides.middleName),
            lastName: formatPersonName(overrides.lastName),
            gender: normalizeGenderValue(overrides.gender),
            emailPrefix: normalizeEmailPrefix(overrides.emailPrefix || overrides.email || overrides.gmail),
            previewId: '',
            previewPassword: '',
            _errors: {}
        };
    }

    function showNoticeDialog(title, message, isError = true) {
        if (typeof window.showAlertDialog === 'function') {
            window.showAlertDialog({
                title: title || 'Notice',
                message: message || '',
                buttonText: 'OK',
                icon: isError ? 'fa-solid fa-triangle-exclamation text-amber-500' : 'fa-solid fa-circle-check text-[#15803d]'
            });
        } else if (typeof window.showUserConfirm === 'function') {
            window.showUserConfirm(title || 'Notice', message || '', null, true);
        } else if (window.SigmaFeedback?.notice) {
            window.SigmaFeedback.notice(message || title);
        } else {
            alert(`${title}\n\n${message}`);
        }
    }

    function loadExternalScript(src, globalName) {
        if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
        return new Promise((resolve, reject) => {
            const existing = Array.from(document.querySelectorAll('script')).find(s => s.src === src);
            if (existing) {
                if (globalName && window[globalName]) {
                    resolve(window[globalName]);
                    return;
                }
                existing.addEventListener('load', () => resolve(globalName ? window[globalName] : true), { once: true });
                existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(globalName ? window[globalName] : true);
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    }

    async function ensureParserLibraries(ext) {
        if (ext === 'xlsx' || ext === 'xls') {
            if (!window.XLSX) {
                await loadExternalScript('https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js', 'XLSX');
            }
        } else if (ext === 'docx' || ext === 'doc') {
            if (!window.JSZip) {
                await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip').catch(() => null);
            }
            if (!window.mammoth) {
                await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', 'mammoth').catch(() => null);
            }
        } else if (ext === 'pdf') {
            if (!window.pdfjsLib) {
                await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib');
            }
            if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
        }
    }

    // ─── PARSING ENGINE FOR EXCEL, CSV, WORD (DOCX/DOC), AND PDF ───

    function classifyHeaderCell(cellText) {
        const norm = String(cellText || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!norm) return null;

        if (/^(institutional\s+role|user\s+role|account\s+role|role|user\s+type|account\s+type|position|designation)$/.test(norm)) return 'role';
        if (/^(firstname|first\s+name|given\s+name|fname|first)$/.test(norm)) return 'firstName';
        if (/^(middlename|middle\s+name|middle\s+initial|mname|middle|m\s+i|mi)$/.test(norm)) return 'middleName';
        if (/^(lastname|last\s+name|surname|family\s+name|lname|last)$/.test(norm)) return 'lastName';
        if (/^(fullname|full\s+name|complete\s+name|student\s+name|teacher\s+name|user\s+name|name)$/.test(norm)) return 'fullName';
        if (/^(gender|sex)$/.test(norm)) return 'gender';
        if (/^(gmail|email|email\s+address|gmail\s+address|gmail\s+username|e\s+mail)$/.test(norm)) return 'emailPrefix';
        if (/^(school\s+branch|branch|campus)$/.test(norm)) return 'branch';
        if (/^(no|number|row|#|\s*id\s*|id\s+number|student\s+id|user\s+id|login\s+id)$/.test(norm)) return 'ignore';
        return null;
    }

    function splitFullNameParts(rawFullName) {
        const text = String(rawFullName || '').trim();
        if (!text) return { firstName: '', middleName: '', lastName: '' };

        if (text.includes(',')) {
            const [lastPart, restPart] = text.split(',').map(s => s.trim());
            const restTokens = (restPart || '').split(/\s+/).filter(Boolean);
            if (restTokens.length === 0) {
                return { firstName: '', middleName: '', lastName: formatPersonName(lastPart) };
            }
            if (restTokens.length === 1) {
                return { firstName: formatPersonName(restTokens[0]), middleName: '', lastName: formatPersonName(lastPart) };
            }
            return {
                firstName: formatPersonName(restTokens.slice(0, -1).join(' ')),
                middleName: formatPersonName(restTokens[restTokens.length - 1]),
                lastName: formatPersonName(lastPart)
            };
        }

        const tokens = text.split(/\s+/).filter(Boolean);
        if (tokens.length === 1) {
            return { firstName: formatPersonName(tokens[0]), middleName: '', lastName: '' };
        }
        if (tokens.length === 2) {
            return { firstName: formatPersonName(tokens[0]), middleName: '', lastName: formatPersonName(tokens[1]) };
        }
        return {
            firstName: formatPersonName(tokens[0]),
            middleName: formatPersonName(tokens.slice(1, -1).join(' ')),
            lastName: formatPersonName(tokens[tokens.length - 1])
        };
    }

    function isLikelyNoiseRow(cells) {
        const nonEmpty = cells.map(c => String(c ?? '').trim()).filter(Boolean);
        if (!nonEmpty.length) return true;
        const joined = nonEmpty.join(' ').toLowerCase();
        if (/^(interface computer college|sigma elms|batch user|user account template|instructions?:|note:|fill in all required)/i.test(joined) && nonEmpty.length <= 2) {
            return true;
        }
        return false;
    }

    function parseRowsFrom2DTable(rows2D) {
        if (!Array.isArray(rows2D) || !rows2D.length) return [];

        let headerRowIndex = -1;
        let headerMap = {};

        for (let r = 0; r < Math.min(rows2D.length, 15); r++) {
            const row = Array.isArray(rows2D[r]) ? rows2D[r] : [];
            const candidateMap = {};
            let matchedHeaders = 0;

            row.forEach((cell, colIdx) => {
                const field = classifyHeaderCell(cell);
                if (field && field !== 'ignore' && !Object.values(candidateMap).includes(field)) {
                    candidateMap[colIdx] = field;
                    matchedHeaders++;
                } else if (field === 'ignore') {
                    candidateMap[colIdx] = 'ignore';
                }
            });

            if (matchedHeaders >= 2) {
                headerRowIndex = r;
                headerMap = candidateMap;
                break;
            }
        }

        const extracted = [];
        const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

        for (let r = startRow; r < rows2D.length; r++) {
            const rawRow = Array.isArray(rows2D[r]) ? rows2D[r] : [];
            const cells = rawRow.map(c => String(c ?? '').trim());
            if (isLikelyNoiseRow(cells)) continue;

            // Skip repeated header rows in multi-page tables
            let repeatedHeaderMatches = 0;
            cells.forEach(cell => {
                const f = classifyHeaderCell(cell);
                if (f && f !== 'ignore') repeatedHeaderMatches++;
            });
            if (repeatedHeaderMatches >= 2) continue;

            if (headerRowIndex >= 0) {
                const record = {
                    branch: getActiveBranchName(),
                    role: '',
                    firstName: '',
                    middleName: '',
                    lastName: '',
                    gender: '',
                    emailPrefix: ''
                };

                let hasFullNameCol = false;
                let fullNameVal = '';

                Object.entries(headerMap).forEach(([colIdxStr, field]) => {
                    const colIdx = Number(colIdxStr);
                    const val = cells[colIdx] !== undefined ? cells[colIdx] : '';
                    if (field === 'ignore') return;
                    if (field === 'fullName') {
                        hasFullNameCol = true;
                        fullNameVal = val;
                    } else if (field === 'role') {
                        record.role = normalizeRoleValue(val);
                    } else if (field === 'gender') {
                        record.gender = normalizeGenderValue(val);
                    } else if (field === 'emailPrefix') {
                        record.emailPrefix = normalizeEmailPrefix(val);
                    } else if (field === 'firstName') {
                        record.firstName = formatPersonName(val);
                    } else if (field === 'middleName') {
                        record.middleName = formatPersonName(val);
                    } else if (field === 'lastName') {
                        record.lastName = formatPersonName(val);
                    }
                });

                if (hasFullNameCol && fullNameVal && (!record.firstName && !record.lastName)) {
                    const split = splitFullNameParts(fullNameVal);
                    if (!record.firstName) record.firstName = split.firstName;
                    if (!record.middleName) record.middleName = split.middleName;
                    if (!record.lastName) record.lastName = split.lastName;
                }

                const hasAnyData = Boolean(
                    record.role || record.firstName || record.middleName ||
                    record.lastName || record.gender || record.emailPrefix
                );
                if (hasAnyData) {
                    extracted.push(createBlankEntry(record));
                }
            } else {
                // Headerless table row: preserve positional columns if 5-6 columns, or classify tokens
                const record = parseHeaderlessRowCells(cells);
                if (record) extracted.push(createBlankEntry(record));
            }
        }

        return extracted;
    }

    function parseHeaderlessRowCells(cells) {
        const trimmed = cells.map(c => String(c ?? '').trim());
        // Strip leading numbering column if it's just "1", "2.", etc.
        const working = trimmed.slice();
        if (working.length > 1 && /^\d+[.)]?$/.test(working[0])) {
            working.shift();
        }
        if (!working.some(Boolean)) return null;

        // Check standard 5 or 6 column template order:
        // [Role, Firstname, Middlename, Lastname, Gender, Gmail?]
        const firstRole = normalizeRoleValue(working[0]);
        const fifthGender = normalizeGenderValue(working[4]);
        if ((working.length >= 5) && (firstRole || fifthGender)) {
            return {
                role: firstRole,
                firstName: formatPersonName(working[1] || ''),
                middleName: formatPersonName(working[2] || ''),
                lastName: formatPersonName(working[3] || ''),
                gender: fifthGender,
                emailPrefix: normalizeEmailPrefix(working[5] || '')
            };
        }

        // Otherwise inspect cells for role, gender, email, and name parts
        let role = '';
        let gender = '';
        let emailPrefix = '';
        const nameCandidates = [];

        for (const cell of working) {
            if (!cell) {
                nameCandidates.push('');
                continue;
            }
            if (!role && normalizeRoleValue(cell)) {
                role = normalizeRoleValue(cell);
                continue;
            }
            if (!gender && normalizeGenderValue(cell)) {
                gender = normalizeGenderValue(cell);
                continue;
            }
            if (!emailPrefix && (cell.includes('@') || /^[a-z0-9]+(\.[a-z0-9]+)+$/i.test(cell))) {
                emailPrefix = normalizeEmailPrefix(cell);
                continue;
            }
            if (/^interface computer college|main campus$/i.test(cell)) {
                continue;
            }
            nameCandidates.push(cell);
        }

        while (nameCandidates.length && !nameCandidates[0] && nameCandidates.every(c => !c)) {
            break;
        }

        let firstName = '';
        let middleName = '';
        let lastName = '';

        const nonEmptyNames = nameCandidates.filter(Boolean);
        if (nameCandidates.length >= 3 && nonEmptyNames.length >= 1) {
            firstName = formatPersonName(nameCandidates[0] || '');
            middleName = formatPersonName(nameCandidates[1] || '');
            lastName = formatPersonName(nameCandidates[2] || '');
        } else if (nonEmptyNames.length === 2) {
            firstName = formatPersonName(nonEmptyNames[0]);
            middleName = '';
            lastName = formatPersonName(nonEmptyNames[1]);
        } else if (nonEmptyNames.length === 1) {
            const split = splitFullNameParts(nonEmptyNames[0]);
            firstName = split.firstName;
            middleName = split.middleName;
            lastName = split.lastName;
        }

        if (!role && !firstName && !middleName && !lastName && !gender && !emailPrefix) {
            return null;
        }
        return { role, firstName, middleName, lastName, gender, emailPrefix };
    }

    function parseKeyValueOrLinesText(rawText) {
        const lines = String(rawText || '')
            .replace(/\r\n?/g, '\n')
            .split('\n')
            .map(l => l.trim());

        // 1. Check if text contains Key: Value pairs (e.g. Firstname: Juan, Role: Student)
        const kvRegex = /^(school\s*branch|branch|institutional\s*role|user\s*role|role|firstname|first\s*name|given\s*name|middlename|middle\s*name|middle\s*initial|lastname|last\s*name|surname|full\s*name|name|gender|sex|gmail|email(?:\s*address)?)\s*[:\-–]\s*(.*)$/i;
        const kvMatches = lines.filter(l => kvRegex.test(l));

        if (kvMatches.length >= 2) {
            const records = [];
            let current = null;
            let seenKeys = new Set();

            const pushCurrent = () => {
                if (!current) return;
                if (current.role || current.firstName || current.middleName || current.lastName || current.gender || current.emailPrefix) {
                    records.push(createBlankEntry(current));
                }
                current = null;
                seenKeys = new Set();
            };

            for (const line of lines) {
                if (!line) {
                    if (current && seenKeys.size >= 2) pushCurrent();
                    continue;
                }
                const match = line.match(kvRegex);
                if (!match) continue;
                const field = classifyHeaderCell(match[1]);
                const val = (match[2] || '').trim();
                if (!field || field === 'ignore') continue;

                if (!current || (field !== 'branch' && seenKeys.has(field))) {
                    pushCurrent();
                    current = {};
                }
                seenKeys.add(field);

                if (field === 'role') current.role = normalizeRoleValue(val);
                else if (field === 'gender') current.gender = normalizeGenderValue(val);
                else if (field === 'emailPrefix') current.emailPrefix = normalizeEmailPrefix(val);
                else if (field === 'firstName') current.firstName = formatPersonName(val);
                else if (field === 'middleName') current.middleName = formatPersonName(val);
                else if (field === 'lastName') current.lastName = formatPersonName(val);
                else if (field === 'fullName') {
                    const split = splitFullNameParts(val);
                    current.firstName = split.firstName;
                    current.middleName = split.middleName;
                    current.lastName = split.lastName;
                }
            }
            pushCurrent();
            if (records.length > 0) return records;
        }

        // 2. Otherwise parse as delimited rows (tabs, pipes, commas, semicolons, or multi-space columns)
        const nonEmptyLines = lines.filter(Boolean);
        const rows2D = nonEmptyLines.map(line => {
            if (line.includes('\t')) return line.split('\t').map(s => s.trim());
            if (line.includes('|')) return line.split('|').map(s => s.trim()).filter((_, idx, arr) => !(idx === 0 && !arr[0]) && !(idx === arr.length - 1 && !arr[arr.length - 1]));
            if (line.includes(';')) return line.split(';').map(s => s.trim());
            if (line.split(',').length >= 3) return line.split(',').map(s => s.trim());
            if (/\s{2,}/.test(line)) return line.split(/\s{2,}/).map(s => s.trim());
            return line.split(/\s+/).map(s => s.trim());
        });

        return parseRowsFrom2DTable(rows2D);
    }

    function parseCsvStringTo2D(csvText) {
        const rows = [];
        let row = [];
        let current = '';
        let inQuotes = false;
        const text = String(csvText || '').replace(/^\uFEFF/, '');

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const next = text[i + 1];
            if (inQuotes) {
                if (ch === '"' && next === '"') {
                    current += '"';
                    i++;
                } else if (ch === '"') {
                    inQuotes = false;
                } else {
                    current += ch;
                }
            } else {
                if (ch === '"') {
                    inQuotes = true;
                } else if (ch === ',') {
                    row.push(current.trim());
                    current = '';
                } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
                    if (ch === '\r') i++;
                    row.push(current.trim());
                    rows.push(row);
                    row = [];
                    current = '';
                } else if (ch === '\r') {
                    row.push(current.trim());
                    rows.push(row);
                    row = [];
                    current = '';
                } else {
                    current += ch;
                }
            }
        }
        if (current.length > 0 || row.length > 0) {
            row.push(current.trim());
            rows.push(row);
        }
        return rows;
    }

    async function parseExcelOrCsvFile(file, ext) {
        if (ext === 'csv') {
            const text = await file.text();
            const rows2D = parseCsvStringTo2D(text);
            return parseRowsFrom2DTable(rows2D);
        }
        await ensureParserLibraries(ext);
        if (!window.XLSX) {
            throw new Error('Excel reader library is still loading. Please try again.');
        }
        const buffer = await file.arrayBuffer();
        const workbook = window.XLSX.read(buffer, { type: 'array' });
        let allEntries = [];
        for (const sheetName of (workbook.SheetNames || [])) {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) continue;
            const rows2D = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            const parsed = parseRowsFrom2DTable(rows2D);
            if (parsed.length) {
                allEntries = allEntries.concat(parsed);
            }
        }
        return allEntries;
    }

    async function parseWordFile(file, ext) {
        await ensureParserLibraries(ext);
        const buffer = await file.arrayBuffer();

        // 1. Direct OOXML (<w:tbl> and <w:p>) extraction via JSZip to preserve empty table cells accurately
        if (window.JSZip) {
            try {
                const zip = await window.JSZip.loadAsync(buffer);
                const docXmlFile = zip.file('word/document.xml');
                if (docXmlFile) {
                    const xmlText = await docXmlFile.async('string');
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

                    const tables = Array.from(xmlDoc.getElementsByTagNameNS('*', 'tbl'));
                    let tableEntries = [];
                    for (const tbl of tables) {
                        const trList = Array.from(tbl.getElementsByTagNameNS('*', 'tr'));
                        const rows2D = trList.map(tr => {
                            const tcList = Array.from(tr.children).filter(el => el.localName === 'tc');
                            return tcList.map(tc => {
                                const paragraphs = Array.from(tc.getElementsByTagNameNS('*', 'p'));
                                const pTexts = paragraphs.map(p =>
                                    Array.from(p.getElementsByTagNameNS('*', 't')).map(t => t.textContent || '').join('')
                                );
                                return pTexts.join(' ').trim();
                            });
                        });
                        const parsed = parseRowsFrom2DTable(rows2D);
                        if (parsed.length) tableEntries = tableEntries.concat(parsed);
                    }
                    if (tableEntries.length > 0) return tableEntries;

                    // If no tables in DOCX, extract paragraphs (<w:p>)
                    const paragraphs = Array.from(xmlDoc.getElementsByTagNameNS('*', 'p')).map(p => {
                        const runs = Array.from(p.getElementsByTagNameNS('*', 't')).map(t => t.textContent || '');
                        return runs.join('').trim();
                    }).filter(Boolean);
                    if (paragraphs.length > 0) {
                        const parsedFromParagraphs = parseKeyValueOrLinesText(paragraphs.join('\n'));
                        if (parsedFromParagraphs.length > 0) return parsedFromParagraphs;
                    }
                }
            } catch (_) {
                // Fall through to Mammoth or text fallback
            }
        }

        // 2. Mammoth HTML table & raw text extraction
        if (window.mammoth) {
            try {
                const htmlRes = await window.mammoth.convertToHtml({ arrayBuffer: buffer });
                if (htmlRes?.value && htmlRes.value.includes('<table')) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = htmlRes.value;
                    const tables = Array.from(tempDiv.querySelectorAll('table'));
                    let htmlTableEntries = [];
                    for (const tbl of tables) {
                        const rows2D = Array.from(tbl.querySelectorAll('tr')).map(tr =>
                            Array.from(tr.querySelectorAll('th, td')).map(td => (td.textContent || '').trim())
                        );
                        const parsed = parseRowsFrom2DTable(rows2D);
                        if (parsed.length) htmlTableEntries = htmlTableEntries.concat(parsed);
                    }
                    if (htmlTableEntries.length > 0) return htmlTableEntries;
                }
                const rawRes = await window.mammoth.extractRawText({ arrayBuffer: buffer });
                if (rawRes?.value) {
                    const parsed = parseKeyValueOrLinesText(rawRes.value);
                    if (parsed.length > 0) return parsed;
                }
            } catch (_) {}
        }

        // 3. Fallback for plain-text or HTML-based .doc files
        const rawText = await file.text();
        if (rawText && rawText.includes('<table')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawText;
            const rows2D = Array.from(tempDiv.querySelectorAll('tr')).map(tr =>
                Array.from(tr.querySelectorAll('th, td')).map(td => (td.textContent || '').trim())
            );
            const parsed = parseRowsFrom2DTable(rows2D);
            if (parsed.length > 0) return parsed;
        }
        return parseKeyValueOrLinesText(rawText);
    }

    async function parsePdfFile(file) {
        await ensureParserLibraries('pdf');
        if (!window.pdfjsLib) {
            throw new Error('PDF reader library is still loading. Please try again.');
        }
        const buffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
        try {
            const allVisualLines = [];
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageLines = [];

                for (const item of (textContent.items || [])) {
                    const str = String(item.str || '');
                    if (!str.trim()) continue;
                    const x = Number(item.transform?.[4] || 0);
                    const y = Number(item.transform?.[5] || 0);
                    const width = Number(item.width || str.length * 5);

                    let line = pageLines.find(l => Math.abs(l.y - y) <= 4);
                    if (!line) {
                        line = { y, items: [] };
                        pageLines.push(line);
                    }
                    line.items.push({ str: str.trim(), x, width });
                }

                // Sort top-to-bottom (higher Y is higher on PDF page)
                pageLines.sort((a, b) => b.y - a.y);

                for (const line of pageLines) {
                    line.items.sort((a, b) => a.x - b.x);
                    const cells = [];
                    for (const item of line.items) {
                        const prev = cells[cells.length - 1];
                        if (prev && (item.x - prev.endX) <= 10) {
                            prev.text = `${prev.text} ${item.str}`.trim();
                            prev.endX = Math.max(prev.endX, item.x + item.width);
                        } else {
                            cells.push({
                                text: item.str,
                                x: item.x,
                                endX: item.x + item.width
                            });
                        }
                    }
                    allVisualLines.push(cells);
                }
            }

            // Check if PDF has a table header row so we can align columns by X coordinate
            // (preserving empty cells when a field like Middlename or Gender is blank in a row!)
            let headerIdx = -1;
            let headerAnchors = [];

            for (let i = 0; i < Math.min(allVisualLines.length, 20); i++) {
                const lineCells = allVisualLines[i];
                const anchors = [];
                let matched = 0;
                for (const cell of lineCells) {
                    const field = classifyHeaderCell(cell.text);
                    if (field) {
                        anchors.push({ field, x: cell.x, endX: cell.endX, label: cell.text });
                        if (field !== 'ignore') matched++;
                    }
                }
                if (matched >= 2 && anchors.length >= 2) {
                    headerIdx = i;
                    headerAnchors = anchors.sort((a, b) => a.x - b.x);
                    break;
                }
            }

            if (headerIdx >= 0 && headerAnchors.length >= 2) {
                const rows2D = [];
                rows2D.push(headerAnchors.map(a => a.label));

                for (let i = headerIdx + 1; i < allVisualLines.length; i++) {
                    const lineCells = allVisualLines[i];
                    const rowValues = new Array(headerAnchors.length).fill('');
                    for (const cell of lineCells) {
                        let bestCol = 0;
                        let bestDist = Infinity;
                        headerAnchors.forEach((anchor, idx) => {
                            const dist = Math.abs(cell.x - anchor.x);
                            if (dist < bestDist) {
                                bestDist = dist;
                                bestCol = idx;
                            }
                        });
                        rowValues[bestCol] = rowValues[bestCol]
                            ? `${rowValues[bestCol]} ${cell.text}`.trim()
                            : cell.text;
                    }
                    rows2D.push(rowValues);
                }

                const tableParsed = parseRowsFrom2DTable(rows2D);
                if (tableParsed.length > 0) return tableParsed;
            }

            // Fallback: try general 2D rows or key-value / line text
            const plainRows2D = allVisualLines.map(line => line.map(c => c.text));
            const generalTableParsed = parseRowsFrom2DTable(plainRows2D);
            if (generalTableParsed.length > 0) return generalTableParsed;

            const joinedText = allVisualLines.map(line => line.map(c => c.text).join('  ')).join('\n');
            return parseKeyValueOrLinesText(joinedText);
        } finally {
            await pdf.destroy();
        }
    }

    // ─── TEMPLATE & CREDENTIALS DOWNLOADERS ───

    const SAMPLE_TEMPLATE_POOL = [
        // Admins
        { role: 'Admin', firstName: 'Clarissa', middleName: 'Mendoza', lastName: 'Bautista', gender: 'Female', gmail: 'clarissa.bautista.icc@gmail.com' },
        { role: 'Admin', firstName: 'Eduardo', middleName: 'Ramos', lastName: 'Castillo', gender: 'Male', gmail: 'eduardo.castillo.icc@gmail.com' },
        { role: 'Admin', firstName: 'Veronica', middleName: 'Pascual', lastName: 'Mercado', gender: 'Female', gmail: 'veronica.mercado.icc@gmail.com' },
        { role: 'Admin', firstName: 'Gregorio', middleName: 'Salazar', lastName: 'Ocampo', gender: 'Male', gmail: 'gregorio.ocampo.icc@gmail.com' },
        // Teachers
        { role: 'Teacher', firstName: 'Rafael', middleName: 'Santos', lastName: 'Dela Cruz', gender: 'Male', gmail: 'rafael.delacruz.icc@gmail.com' },
        { role: 'Teacher', firstName: 'Patricia', middleName: 'Aquino', lastName: 'Navarro', gender: 'Female', gmail: 'patricia.navarro.icc@gmail.com' },
        { role: 'Teacher', firstName: 'Lorenzo', middleName: 'Tolentino', lastName: 'Velasco', gender: 'Male', gmail: 'lorenzo.velasco.icc@gmail.com' },
        { role: 'Teacher', firstName: 'Marissa', middleName: 'Dizon', lastName: 'Magbanua', gender: 'Female', gmail: 'marissa.magbanua.icc@gmail.com' },
        { role: 'Teacher', firstName: 'Benjamin', middleName: 'Flores', lastName: 'de Guzman', gender: 'Male', gmail: 'benjamin.deguzman.icc@gmail.com' },
        { role: 'Teacher', firstName: 'Camille', middleName: 'Legaspi', lastName: 'Sarmiento', gender: 'Female', gmail: 'camille.sarmiento.icc@gmail.com' },
        // Students
        { role: 'Student', firstName: 'Marco', middleName: 'Reyes', lastName: 'Villanueva', gender: 'Male', gmail: 'marco.villanueva2026@gmail.com' },
        { role: 'Student', firstName: 'Hannah', middleName: 'Garcia', lastName: 'Soriano', gender: 'Female', gmail: 'hannah.soriano2026@gmail.com' },
        { role: 'Student', firstName: 'Gabriel', middleName: 'Bautista', lastName: 'Mendoza', gender: 'Male', gmail: 'gabriel.mendoza2026@gmail.com' },
        { role: 'Student', firstName: 'Beatriz', middleName: 'Lopez', lastName: 'Pangilinan', gender: 'Female', gmail: 'beatriz.pangilinan2026@gmail.com' },
        { role: 'Student', firstName: 'Adrian', middleName: 'Fernandez', lastName: 'Quizon', gender: 'Male', gmail: 'adrian.quizon2026@gmail.com' },
        { role: 'Student', firstName: 'Sophia', middleName: 'galang', lastName: 'Enriquez', gender: 'Female', gmail: 'sophia.enriquez2026@gmail.com' }
    ];

    function getFiveSampleTemplateRows() {
        const existingUsers = getExistingUsers();
        const norm = s => String(s || '').trim().toLowerCase();

        const isUnused = candidate => {
            const cPrefix = normalizeEmailPrefix(candidate.gmail);
            const cEmail = `${cPrefix}@gmail.com`;
            return !existingUsers.some(u => {
                const uFname = norm(u.firstName || u.fname);
                const uMname = norm(u.middleName || u.mname || u.middlename);
                const uLname = norm(u.lastName || u.lname);
                const uEmail = norm(u.email);
                const uPrefix = uEmail.split('@')[0];
                const sameName = uFname === norm(candidate.firstName) &&
                    uMname === norm(candidate.middleName) &&
                    uLname === norm(candidate.lastName);
                const sameEmail = uEmail === cEmail || uPrefix === cPrefix;
                return sameName || sameEmail;
            });
        };

        const availableAdmins = SAMPLE_TEMPLATE_POOL.filter(p => p.role === 'Admin' && isUnused(p));
        const availableTeachers = SAMPLE_TEMPLATE_POOL.filter(p => p.role === 'Teacher' && isUnused(p));
        const availableStudents = SAMPLE_TEMPLATE_POOL.filter(p => p.role === 'Student' && isUnused(p));

        const pickOrFallback = (list, role, index) => {
            if (list[index]) return list[index];
            const suffix = String(Date.now()).slice(-3) + index;
            if (role === 'Admin') {
                return { role: 'Admin', firstName: 'Clarissa', middleName: 'Mendoza', lastName: 'Bautista', gender: 'Female', gmail: `clarissa.bautista.${suffix}@gmail.com` };
            }
            if (role === 'Teacher') {
                return { role: 'Teacher', firstName: index === 0 ? 'Rafael' : 'Patricia', middleName: index === 0 ? 'Santos' : 'Aquino', lastName: index === 0 ? 'Dela Cruz' : 'Navarro', gender: index === 0 ? 'Male' : 'Female', gmail: `teacher.sample.${suffix}@gmail.com` };
            }
            return { role: 'Student', firstName: index === 0 ? 'Marco' : 'Hannah', middleName: index === 0 ? 'Reyes' : 'Garcia', lastName: index === 0 ? 'Villanueva' : 'Soriano', gender: index === 0 ? 'Male' : 'Female', gmail: `student.sample.${suffix}@gmail.com` };
        };

        // 5 accounts across different roles in mixed order so automatic role sorting (1. Admin -> 2. Teacher -> 3. Student) is clearly demonstrated
        const selected = [
            pickOrFallback(availableStudents, 'Student', 0),
            pickOrFallback(availableAdmins, 'Admin', 0),
            pickOrFallback(availableTeachers, 'Teacher', 0),
            pickOrFallback(availableStudents, 'Student', 1),
            pickOrFallback(availableTeachers, 'Teacher', 1)
        ];

        return selected.map(item => [
            item.role,
            formatPersonName(item.firstName),
            formatPersonName(item.middleName),
            formatPersonName(item.lastName),
            item.gender,
            item.gmail
        ]);
    }

    function computeCrc32(bytes) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) {
            crc ^= bytes[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
            }
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function buildStoredZipBytes(filesList) {
        const encoder = new TextEncoder();
        const entries = filesList.map(f => {
            const nameBytes = encoder.encode(f.name);
            const dataBytes = typeof f.content === 'string' ? encoder.encode(f.content) : f.content;
            const crc = computeCrc32(dataBytes);
            return { nameBytes, dataBytes, crc, offset: 0 };
        });

        let localSize = 0;
        let centralSize = 0;
        for (const e of entries) {
            e.offset = localSize;
            localSize += 30 + e.nameBytes.length + e.dataBytes.length;
            centralSize += 46 + e.nameBytes.length;
        }

        const totalSize = localSize + centralSize + 22;
        const out = new Uint8Array(totalSize);
        const view = new DataView(out.buffer);
        let pos = 0;

        for (const e of entries) {
            view.setUint32(pos, 0x04034b50, true);
            view.setUint16(pos + 4, 20, true);
            view.setUint16(pos + 6, 0, true);
            view.setUint16(pos + 8, 0, true);
            view.setUint16(pos + 10, 0, true);
            view.setUint16(pos + 12, 0, true);
            view.setUint32(pos + 14, e.crc, true);
            view.setUint32(pos + 18, e.dataBytes.length, true);
            view.setUint32(pos + 22, e.dataBytes.length, true);
            view.setUint16(pos + 26, e.nameBytes.length, true);
            view.setUint16(pos + 28, 0, true);
            out.set(e.nameBytes, pos + 30);
            out.set(e.dataBytes, pos + 30 + e.nameBytes.length);
            pos += 30 + e.nameBytes.length + e.dataBytes.length;
        }

        const centralOffset = pos;
        for (const e of entries) {
            view.setUint32(pos, 0x02014b50, true);
            view.setUint16(pos + 4, 20, true);
            view.setUint16(pos + 6, 20, true);
            view.setUint16(pos + 8, 0, true);
            view.setUint16(pos + 10, 0, true);
            view.setUint16(pos + 12, 0, true);
            view.setUint16(pos + 14, 0, true);
            view.setUint32(pos + 16, e.crc, true);
            view.setUint32(pos + 20, e.dataBytes.length, true);
            view.setUint32(pos + 24, e.dataBytes.length, true);
            view.setUint16(pos + 28, e.nameBytes.length, true);
            view.setUint16(pos + 30, 0, true);
            view.setUint16(pos + 32, 0, true);
            view.setUint16(pos + 34, 0, true);
            view.setUint16(pos + 36, 0, true);
            view.setUint32(pos + 38, 0, true);
            view.setUint32(pos + 42, e.offset, true);
            out.set(e.nameBytes, pos + 46);
            pos += 46 + e.nameBytes.length;
        }

        view.setUint32(pos, 0x06054b50, true);
        view.setUint16(pos + 4, 0, true);
        view.setUint16(pos + 6, 0, true);
        view.setUint16(pos + 8, entries.length, true);
        view.setUint16(pos + 10, entries.length, true);
        view.setUint32(pos + 12, centralSize, true);
        view.setUint32(pos + 16, centralOffset, true);
        view.setUint16(pos + 20, 0, true);

        return out;
    }

    function buildDocxTemplateBlob(headers, rows) {
        const xmlEsc = s => String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

        const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

        const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

        const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:sz w:val="20"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

        const allTableRows = [headers, ...rows];
        let trXml = '';
        allTableRows.forEach((rowCells, rIdx) => {
            const isHeader = rIdx === 0;
            let tcXml = '';
            rowCells.forEach(cellVal => {
                const shading = isHeader ? `<w:shd w:val="clear" w:color="auto" w:fill="15803D"/>` : '';
                const rPr = isHeader
                    ? `<w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="20"/></w:rPr>`
                    : `<w:rPr><w:color w:val="1E293B"/><w:sz w:val="20"/></w:rPr>`;
                tcXml += `<w:tc>
          <w:tcPr>
            <w:tcW w:w="2200" w:type="dxa"/>
            ${shading}
            <w:tcMar>
              <w:top w:w="120" w:type="dxa"/>
              <w:bottom w:w="120" w:type="dxa"/>
              <w:left w:w="140" w:type="dxa"/>
              <w:right w:w="140" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          <w:p>
            <w:r>${rPr}<w:t xml:space="preserve">${xmlEsc(cellVal)}</w:t></w:r>
          </w:p>
        </w:tc>`;
            });
            trXml += `<w:tr>${tcXml}</w:tr>`;
        });

        const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:spacing w:after="120"/></w:pPr>
      <w:r><w:rPr><w:b/><w:color w:val="15803D"/><w:sz w:val="28"/></w:rPr><w:t>SIGMA ELMS - Batch User Account Creation Template (5 Sample Users)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:color w:val="475569"/><w:sz w:val="18"/></w:rPr><w:t>Includes Admin, Teacher, and Student sample accounts. Upload this file directly into Batch Create User Accounts.</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="13200" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="1900"/>
        <w:gridCol w:w="2100"/>
        <w:gridCol w:w="2100"/>
        <w:gridCol w:w="2100"/>
        <w:gridCol w:w="1500"/>
        <w:gridCol w:w="3500"/>
      </w:tblGrid>
      ${trXml}
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>
      <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/>
    </w:sectPr>
  </w:body>
</w:document>`;

        const zipBytes = buildStoredZipBytes([
            { name: '[Content_Types].xml', content: contentTypesXml },
            { name: '_rels/.rels', content: relsXml },
            { name: 'word/_rels/document.xml.rels', content: docRelsXml },
            { name: 'word/styles.xml', content: stylesXml },
            { name: 'word/document.xml', content: documentXml }
        ]);

        return new Blob([zipBytes], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
    }

    function buildPdfTemplateBlob(headers, rows) {
        const pdfEsc = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
        const xPositions = [40, 145, 235, 325, 415, 475];
        const commands = [];

        // Header banner & title
        commands.push('0.082 0.502 0.239 rg');
        commands.push(`BT /F2 14 Tf 40 545 Td (${pdfEsc('SIGMA ELMS - Batch User Account Template (5 Sample Users)')}) Tj ET`);
        commands.push('0.35 0.40 0.48 rg');
        commands.push(`BT /F1 9 Tf 40 528 Td (${pdfEsc('Includes Admin, Teacher, and Student sample accounts. Upload this PDF directly into Batch Create User Accounts.')}) Tj ET`);

        // Table Header Row Background
        commands.push('0.082 0.502 0.239 rg');
        commands.push('34 492 724 22 re f');

        // Table Header Text
        commands.push('1 1 1 rg');
        headers.forEach((h, cIdx) => {
            commands.push(`BT /F2 10 Tf ${xPositions[cIdx]} 500 Td (${pdfEsc(h)}) Tj ET`);
        });

        // Data Rows
        let y = 472;
        rows.forEach((rowCells, rIdx) => {
            if (rIdx % 2 === 1) {
                commands.push('0.96 0.98 0.96 rg');
                commands.push(`34 ${y - 6} 724 20 re f`);
            }
            commands.push('0.12 0.16 0.23 rg');
            rowCells.forEach((val, cIdx) => {
                if (val) {
                    commands.push(`BT /F1 10 Tf ${xPositions[cIdx]} ${y} Td (${pdfEsc(val)}) Tj ET`);
                }
            });
            y -= 24;
        });

        const streamContent = commands.join('\n');
        const objects = [
            '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
            '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
            '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n',
            `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
            '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
            '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n'
        ];

        let pdfText = '%PDF-1.4\n';
        const offsets = [0];
        for (const obj of objects) {
            offsets.push(pdfText.length);
            pdfText += obj;
        }
        const xrefStart = pdfText.length;
        pdfText += `xref\n0 ${objects.length + 1}\n`;
        pdfText += '0000000000 65535 f \n';
        for (let i = 1; i <= objects.length; i++) {
            pdfText += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
        }
        pdfText += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

        return new Blob([pdfText], { type: 'application/pdf' });
    }

    function triggerBlobDownload(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    window.downloadBatchUserTemplate = function (format = 'xlsx') {
        const fmt = String(format || 'xlsx').trim().toLowerCase();
        const headers = ['Institutional Role', 'Firstname', 'Middlename', 'Lastname', 'Gender', 'Gmail'];
        const sampleRows = getFiveSampleTemplateRows();

        if (fmt === 'docx' || fmt === 'doc') {
            const fileName = 'SIGMA_Batch_User_Template.docx';
            const docxBlob = buildDocxTemplateBlob(headers, sampleRows);
            const docxFile = new File([docxBlob], fileName, {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            if (window._sigmaUploadedFiles instanceof Map) {
                window._sigmaUploadedFiles.set(fileName, docxFile);
                window._sigmaUploadedFiles.set(fileName.toLowerCase(), docxFile);
            }
            if (typeof window.sigmaStoreDocument === 'function') {
                window.sigmaStoreDocument(fileName, docxFile, { name: fileName, type: 'docx' }).catch(() => {});
            }
            // Open in built-in SIGMA Document Viewer (viewer.html) AND download the .docx file
            if (typeof window.openDocumentViewer === 'function') {
                window.openDocumentViewer(fileName, docxFile, 'docx');
            }
            triggerBlobDownload(docxBlob, fileName);
            return;
        }

        if (fmt === 'pdf') {
            const fileName = 'SIGMA_Batch_User_Template.pdf';
            const pdfBlob = buildPdfTemplateBlob(headers, sampleRows);
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
            if (window._sigmaUploadedFiles instanceof Map) {
                window._sigmaUploadedFiles.set(fileName, pdfFile);
                window._sigmaUploadedFiles.set(fileName.toLowerCase(), pdfFile);
            }
            if (typeof window.sigmaStoreDocument === 'function') {
                window.sigmaStoreDocument(fileName, pdfFile, { name: fileName, type: 'pdf' }).catch(() => {});
            }
            if (typeof window.openDocumentViewer === 'function') {
                window.openDocumentViewer(fileName, pdfFile, 'pdf');
            }
            triggerBlobDownload(pdfBlob, fileName);
            return;
        }

        // Default: Excel (.xlsx) with 5 sample users of different roles
        const allRows = [headers, ...sampleRows];
        if (typeof window.XLSX !== 'undefined') {
            const ws = window.XLSX.utils.aoa_to_sheet(allRows);
            ws['!cols'] = [
                { wch: 22 },
                { wch: 22 },
                { wch: 22 },
                { wch: 22 },
                { wch: 16 },
                { wch: 32 }
            ];
            headers.forEach((_, colIdx) => {
                const ref = window.XLSX.utils.encode_cell({ r: 0, c: colIdx });
                if (ws[ref]) {
                    ws[ref].s = {
                        font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Arial', sz: 11 },
                        fill: { fgColor: { rgb: '15803D' } },
                        alignment: { horizontal: 'center', vertical: 'center' }
                    };
                }
            });
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, 'Batch Users');
            window.XLSX.writeFile(wb, 'SIGMA_Batch_User_Template.xlsx');
        } else {
            const csv = allRows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            triggerBlobDownload(blob, 'SIGMA_Batch_User_Template.csv');
        }
    };

    window.openUploadedBatchFileInViewer = function () {
        if (!batchUploadedFileObj) return;
        const ext = (batchUploadedFileExt || batchUploadedFileName.split('.').pop() || 'docx').toLowerCase();
        if (typeof window.openDocumentViewer === 'function') {
            window.openDocumentViewer(batchUploadedFileName || batchUploadedFileObj.name, batchUploadedFileObj, ext);
        }
    };

    window.downloadBatchCreatedCredentialsExcel = function () {
        if (!batchCreatedAccounts.length) return;
        const rows = [
            ['No.', 'Institutional Role', 'Login ID', 'Full Name', 'Gender', 'Gmail', 'Password', 'School Branch']
        ];
        batchCreatedAccounts.forEach((acc, idx) => {
            rows.push([
                idx + 1,
                acc.role,
                acc.id,
                acc.fullName,
                acc.gender,
                acc.email,
                acc.password,
                acc.branch
            ]);
        });

        if (typeof window.XLSX !== 'undefined') {
            const ws = window.XLSX.utils.aoa_to_sheet(rows);
            ws['!cols'] = [
                { wch: 6 },
                { wch: 18 },
                { wch: 16 },
                { wch: 30 },
                { wch: 12 },
                { wch: 30 },
                { wch: 22 },
                { wch: 32 }
            ];
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, 'Created Credentials');
            window.XLSX.writeFile(wb, 'SIGMA_Batch_Created_Credentials.xlsx');
        } else {
            const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'SIGMA_Batch_Created_Credentials.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    // ─── UI RENDERING & STEP MANAGEMENT ───

    function updateBatchStepHeaderUI() {
        const backBtn = document.getElementById('batch-user-back-btn');
        const nextBtn = document.getElementById('batch-user-next-btn');
        const saveBtn = document.getElementById('batch-user-save-btn');
        const addAnotherBtn = document.getElementById('batch-user-add-another-btn');
        const finishBtn = document.getElementById('batch-user-finish-btn');
        const exportAllBtn = document.getElementById('batch-user-export-btn');

        const setBtnVisibility = (btn, show) => {
            if (!btn) return;
            btn.classList.toggle('hidden', !show);
            if (!show) {
                btn.style.setProperty('display', 'none', 'important');
            } else {
                btn.style.removeProperty('display');
            }
        };

        for (let i = 1; i <= 3; i++) {
            const stepContainer = document.getElementById(`batch-user-step-${i}`);
            if (stepContainer) stepContainer.classList.toggle('hidden', i !== batchStep);

            const bar = document.getElementById(`batch-step-bar-${i}`);
            const track = document.getElementById(`batch-step-bar-${i}-track`);
            const label = document.getElementById(`batch-step-bar-${i}-label`);

            if (bar) {
                bar.classList.toggle('bg-[#15803d]/10', i === batchStep);
                bar.classList.toggle('bg-slate-100', i !== batchStep);
            }
            if (label && track) {
                if (i <= batchStep) {
                    label.className = 'text-base font-bold capitalize tracking-normal transition-colors text-[#15803d] mb-3';
                    track.className = 'w-full h-1.5 bg-[#15803d] transition-all';
                } else {
                    label.className = 'text-base font-bold capitalize tracking-normal transition-colors text-slate-500 mb-3';
                    track.className = 'w-full h-1.5 bg-slate-200 transition-all';
                }
            }
        }

        setBtnVisibility(backBtn, batchStep === 2);
        setBtnVisibility(nextBtn, batchStep === 1);
        setBtnVisibility(saveBtn, batchStep === 2);
        setBtnVisibility(exportAllBtn, batchStep === 3);
        setBtnVisibility(addAnotherBtn, batchStep === 3);
        setBtnVisibility(finishBtn, batchStep === 3);

        if (nextBtn) {
            const hasEntries = batchEntries.length > 0;
            nextBtn.disabled = !hasEntries;
            nextBtn.style.opacity = hasEntries ? '1' : '0.5';
            nextBtn.style.cursor = hasEntries ? 'pointer' : 'not-allowed';
        }
    }

    function getRoleSectionMeta(role) {
        if (role === 'Admin') {
            return {
                title: '1. Admin Accounts',
                badgeClass: 'bg-emerald-100 text-[#15803d] border-emerald-200',
                icon: 'fa-solid fa-user-shield text-[#15803d]'
            };
        }
        if (role === 'Teacher') {
            return {
                title: '2. Teacher Accounts',
                badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
                icon: 'fa-solid fa-chalkboard-user text-blue-700'
            };
        }
        if (role === 'Student') {
            return {
                title: '3. Student Accounts',
                badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
                icon: 'fa-solid fa-graduation-cap text-amber-700'
            };
        }
        return {
            title: 'Unassigned Role (Select Role Required)',
            badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
            icon: 'fa-solid fa-circle-exclamation text-rose-600'
        };
    }

    function isEntryComplete(entry) {
        return Boolean(
            VALID_ROLES.includes(entry.role) &&
            entry.firstName.trim() &&
            entry.middleName.trim() &&
            entry.lastName.trim() &&
            VALID_GENDERS.includes(entry.gender) &&
            entry.emailPrefix.trim()
        );
    }

    function renderBatchStep1Review() {
        const container = document.getElementById('batch-user-review-container');
        const summaryBar = document.getElementById('batch-user-summary-bar');
        const fileBadge = document.getElementById('batch-uploaded-file-badge');
        const fileBadgeName = document.getElementById('batch-uploaded-file-name');
        const viewUploadedBtn = document.getElementById('batch-view-uploaded-doc-btn');
        if (!container) return;

        if (fileBadge && fileBadgeName) {
            if (batchUploadedFileName) {
                fileBadgeName.textContent = batchUploadedFileName;
                fileBadge.classList.remove('hidden');
                if (viewUploadedBtn) {
                    const canViewInBuiltInViewer = Boolean(
                        batchUploadedFileObj && ['docx', 'doc', 'pdf'].includes(batchUploadedFileExt)
                    );
                    viewUploadedBtn.classList.toggle('hidden', !canViewInBuiltInViewer);
                }
            } else {
                fileBadge.classList.add('hidden');
                if (viewUploadedBtn) viewUploadedBtn.classList.add('hidden');
            }
        }

        if (!batchEntries.length) {
            if (summaryBar) summaryBar.classList.add('hidden');
            container.innerHTML = `
                <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-8 text-center space-y-2">
                    <div class="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-[#15803d]">
                        <i class="fa-solid fa-users-viewfinder text-lg"></i>
                    </div>
                    <p class="text-sm font-bold text-black">No Imported Accounts Yet</p>
                    <p class="text-xs text-slate-500 max-w-md mx-auto">
                        Upload an Excel (.xlsx, .csv), Word (.docx, .doc), or PDF (.pdf) file above to automatically populate and review user account forms here.
                    </p>
                </div>
            `;
            updateBatchStepHeaderUI();
            return;
        }

        const adminCount = batchEntries.filter(e => e.role === 'Admin').length;
        const teacherCount = batchEntries.filter(e => e.role === 'Teacher').length;
        const studentCount = batchEntries.filter(e => e.role === 'Student').length;
        const incompleteCount = batchEntries.filter(e => !isEntryComplete(e)).length;

        if (summaryBar) {
            summaryBar.classList.remove('hidden');
            summaryBar.innerHTML = `
                <div class="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div class="flex flex-wrap items-center gap-2 text-xs font-bold">
                        <span class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-black">
                            Total Imported: ${batchEntries.length}
                        </span>
                        <span class="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#15803d]">
                            Admin: ${adminCount}
                        </span>
                        <span class="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
                            Teacher: ${teacherCount}
                        </span>
                        <span class="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                            Student: ${studentCount}
                        </span>
                        ${incompleteCount > 0 ? `
                            <span class="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-1.5">
                                <i class="fa-solid fa-circle-exclamation"></i>
                                ${incompleteCount} Incomplete (Fill Blank Fields)
                            </span>
                        ` : `
                            <span class="px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-[#15803d] flex items-center gap-1.5">
                                <i class="fa-solid fa-circle-check"></i>
                                All Fields Complete
                            </span>
                        `}
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button type="button" onclick="window.organizeBatchEntriesByRole()"
                            class="sigma-btn sigma-btn-white sigma-btn-sm gap-1.5 text-xs font-semibold cursor-pointer">
                            <i class="fa-solid fa-arrow-down-short-wide text-[#15803d]"></i>
                            <span>Organize (Admin → Teacher → Student)</span>
                        </button>
                        <button type="button" onclick="window.addBatchUserEmptyRow()"
                            class="sigma-btn sigma-btn-white sigma-btn-sm gap-1.5 text-xs font-semibold cursor-pointer">
                            <i class="fa-solid fa-plus text-[#15803d]"></i>
                            <span>Add Row</span>
                        </button>
                    </div>
                </div>
            `;
        }

        const activeBranch = getActiveBranchName();
        const roleGroups = ['Admin', 'Teacher', 'Student', ''];
        let html = '';
        let globalNumber = 0;

        for (const roleKey of roleGroups) {
            const groupItems = batchEntries.filter(e => (VALID_ROLES.includes(e.role) ? e.role : '') === roleKey);
            if (!groupItems.length) continue;

            const meta = getRoleSectionMeta(roleKey);
            html += `
                <div class="space-y-4 pt-2">
                    <div class="flex items-center justify-between border-b border-slate-200 pb-2.5">
                        <div class="flex items-center gap-2.5">
                            <i class="${meta.icon} text-sm"></i>
                            <h3 class="text-base font-bold text-black font-['Inter']">${escapeHtml(meta.title)}</h3>
                            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full border ${meta.badgeClass}">
                                ${groupItems.length} ${groupItems.length === 1 ? 'Account' : 'Accounts'}
                            </span>
                        </div>
                    </div>
                    <div class="space-y-6">
            `;

            for (const entry of groupItems) {
                globalNumber++;
                const complete = isEntryComplete(entry);
                const err = entry._errors || {};
                const borderClass = Object.keys(err).length > 0
                    ? 'border-rose-400 bg-rose-50/10'
                    : (complete ? 'border-slate-200 bg-white' : 'border-amber-300 bg-white');

                html += `
                    <div id="batch-entry-card-${entry._uid}" class="rounded-2xl border-2 ${borderClass} p-6 space-y-5 shadow-2xs transition-all">
                        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-full bg-[#15803d] text-white text-xs font-bold flex items-center justify-center">
                                    ${globalNumber}
                                </span>
                                <span class="text-sm font-bold text-black font-['Inter']">
                                    ${escapeHtml([entry.firstName, entry.middleName, entry.lastName].filter(Boolean).join(' ') || 'New User Account')}
                                </span>
                                <span data-status-badge="${entry._uid}" class="text-[11px] font-bold px-2.5 py-0.5 rounded-full ${complete ? 'bg-emerald-100 text-[#15803d]' : 'bg-amber-100 text-amber-800'}">
                                    ${complete ? 'Ready for Creation' : 'Blank Fields Required'}
                                </span>
                            </div>
                            <button type="button" onclick="window.removeBatchUserRow(${entry._uid})"
                                class="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
                                <i class="fa-solid fa-trash-can"></i>
                                <span>Remove</span>
                            </button>
                        </div>

                        <!-- Row 1: School Branch & Institutional Role (Matching Create User Account Form) -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-2.5">
                                <label class="sigma-subject-label text-sm font-bold text-black capitalize tracking-normal ml-1">School Branch</label>
                                <div class="relative">
                                    <select disabled class="sigma-subject-select w-full bg-slate-100/70 border-b-2 border-slate-200 rounded-none px-4 py-3.5 text-sm font-medium text-slate-500 outline-none appearance-none cursor-not-allowed font-['Inter'] shadow-none">
                                        <option value="${escapeHtml(activeBranch)}">${escapeHtml(activeBranch)}</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none"></i>
                                </div>
                            </div>

                            <div class="space-y-2.5">
                                <label class="sigma-subject-label text-sm font-bold text-black capitalize tracking-normal ml-1">
                                    Institutional Role <span class="text-red-500">*</span>
                                </label>
                                <div class="relative">
                                    <select id="batch-role-${entry._uid}"
                                        onchange="window.updateBatchEntryField(${entry._uid}, 'role', this.value, true)"
                                        class="sigma-subject-select w-full bg-slate-50 border-b-2 ${err.role || !entry.role ? 'border-rose-500' : 'border-slate-300'} rounded-none px-4 py-3.5 text-sm font-medium text-black outline-none hover:bg-slate-100 focus:bg-slate-100 focus:border-black transition-all appearance-none cursor-pointer font-['Inter'] shadow-none">
                                        <option value="" ${!entry.role ? 'selected' : ''}>Select Role</option>
                                        <option value="Admin" ${entry.role === 'Admin' ? 'selected' : ''}>Admin</option>
                                        <option value="Teacher" ${entry.role === 'Teacher' ? 'selected' : ''}>Teacher</option>
                                        <option value="Student" ${entry.role === 'Student' ? 'selected' : ''}>Student</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-xs text-black pointer-events-none"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Row 2: Firstname, Middlename, Lastname (Matching Create User Account Form) -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="space-y-2.5">
                                <label class="sigma-subject-label text-sm font-bold text-black capitalize tracking-normal ml-1">
                                    Firstname <span class="text-red-500">*</span>
                                </label>
                                <input type="text" id="batch-fname-${entry._uid}" maxlength="40"
                                    placeholder="Enter first name"
                                    value="${escapeHtml(entry.firstName)}"
                                    oninput="this.value = this.value.replace(/[^a-zA-ZñÑ\\s]/g, '').replace(/(?:^|\\s)\\S/g, c => c.toUpperCase()); window.updateBatchEntryField(${entry._uid}, 'firstName', this.value, false)"
                                    class="sigma-subject-input w-full bg-slate-50 border-b-2 ${err.firstName || !entry.firstName ? 'border-rose-500' : 'border-slate-300'} rounded-none px-4 py-3.5 text-sm font-medium text-black outline-none hover:bg-slate-100 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                            </div>

                            <div class="space-y-2.5">
                                <label class="sigma-subject-label text-sm font-bold text-black capitalize tracking-normal ml-1">
                                    Middlename <span class="text-red-500">*</span>
                                </label>
                                <input type="text" id="batch-mname-${entry._uid}" maxlength="40"
                                    placeholder="Enter middle name"
                                    value="${escapeHtml(entry.middleName)}"
                                    oninput="this.value = this.value.replace(/[^a-zA-ZñÑ\\s]/g, '').replace(/(?:^|\\s)\\S/g, c => c.toUpperCase()); window.updateBatchEntryField(${entry._uid}, 'middleName', this.value, false)"
                                    class="sigma-subject-input w-full bg-slate-50 border-b-2 ${err.middleName || !entry.middleName ? 'border-rose-500' : 'border-slate-300'} rounded-none px-4 py-3.5 text-sm font-medium text-black outline-none hover:bg-slate-100 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                            </div>

                            <div class="space-y-2.5">
                                <label class="sigma-subject-label text-sm font-bold text-black capitalize tracking-normal ml-1">
                                    Lastname <span class="text-red-500">*</span>
                                </label>
                                <input type="text" id="batch-lname-${entry._uid}" maxlength="40"
                                    placeholder="Enter last name"
                                    value="${escapeHtml(entry.lastName)}"
                                    oninput="this.value = this.value.replace(/[^a-zA-ZñÑ\\s]/g, '').replace(/(?:^|\\s)\\S/g, c => c.toUpperCase()); window.updateBatchEntryField(${entry._uid}, 'lastName', this.value, false)"
                                    class="sigma-subject-input w-full bg-slate-50 border-b-2 ${err.lastName || !entry.lastName ? 'border-rose-500' : 'border-slate-300'} rounded-none px-4 py-3.5 text-sm font-medium text-black outline-none hover:bg-slate-100 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                            </div>
                        </div>

                        <!-- Row 3: Gender & Gmail (Matching Create User Account Form) -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-2.5">
                                <label class="sigma-subject-label text-sm font-bold text-black capitalize tracking-normal ml-1">
                                    Gender <span class="text-red-500">*</span>
                                </label>
                                <div class="relative">
                                    <select id="batch-gender-${entry._uid}"
                                        onchange="window.updateBatchEntryField(${entry._uid}, 'gender', this.value, false)"
                                        class="sigma-subject-select w-full bg-slate-50 border-b-2 ${err.gender || !entry.gender ? 'border-rose-500' : 'border-slate-300'} rounded-none px-4 py-3.5 text-sm font-medium text-black outline-none hover:bg-slate-100 focus:bg-slate-100 focus:border-black transition-all appearance-none cursor-pointer font-['Inter'] shadow-none">
                                        <option value="" ${!entry.gender ? 'selected' : ''}>Select Gender</option>
                                        <option value="Male" ${entry.gender === 'Male' ? 'selected' : ''}>Male</option>
                                        <option value="Female" ${entry.gender === 'Female' ? 'selected' : ''}>Female</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-xs text-black pointer-events-none"></i>
                                </div>
                            </div>

                            <div class="space-y-2.5">
                                <label class="sigma-subject-label text-sm font-bold text-black capitalize tracking-normal ml-1">
                                    Gmail <span class="text-red-500">*</span>
                                </label>
                                <div class="relative flex items-center">
                                    <input type="text" id="batch-email-${entry._uid}" maxlength="64"
                                        placeholder="gmail username"
                                        value="${escapeHtml(entry.emailPrefix)}"
                                        oninput="this.value = this.value.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase(); window.updateBatchEntryField(${entry._uid}, 'emailPrefix', this.value, false)"
                                        class="sigma-subject-input w-full bg-slate-50 border-b-2 ${err.emailPrefix || !entry.emailPrefix ? 'border-rose-500' : 'border-slate-300'} rounded-none pl-4 pr-28 py-3.5 text-sm font-medium text-black outline-none hover:bg-slate-100 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                                    <span class="absolute right-4 text-xs font-bold text-black pointer-events-none select-none">@gmail.com</span>
                                </div>
                            </div>
                        </div>
                        ${err.message ? `
                            <div class="text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-1">
                                <i class="fa-solid fa-circle-exclamation"></i>
                                <span>${escapeHtml(err.message)}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        updateBatchStepHeaderUI();
    }

    function renderBatchStep2Credentials() {
        const container = document.getElementById('batch-user-step2-container');
        if (!container) return;

        const roleGroups = ['Admin', 'Teacher', 'Student'];
        let html = '';
        let globalIdx = 0;

        for (const roleKey of roleGroups) {
            const groupItems = batchEntries.filter(e => e.role === roleKey);
            if (!groupItems.length) continue;

            const meta = getRoleSectionMeta(roleKey);
            html += `
                <div class="space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-200 pb-2.5">
                        <div class="flex items-center gap-2.5">
                            <i class="${meta.icon} text-sm"></i>
                            <h3 class="text-base font-bold text-black font-['Inter']">${escapeHtml(meta.title)}</h3>
                            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full border ${meta.badgeClass}">
                                ${groupItems.length} ${groupItems.length === 1 ? 'Account' : 'Accounts'}
                            </span>
                        </div>
                    </div>
                    <div class="space-y-5">
            `;

            for (const entry of groupItems) {
                globalIdx++;
                const fullName = [entry.firstName, entry.middleName, entry.lastName].filter(Boolean).join(' ');
                const fullEmail = `${entry.emailPrefix}@gmail.com`;

                html += `
                    <div class="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-2xs">
                        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-full bg-[#15803d] text-white text-xs font-bold flex items-center justify-center">
                                    ${globalIdx}
                                </span>
                                <div>
                                    <h4 class="text-sm font-bold text-black font-['Inter']">${escapeHtml(fullName)}</h4>
                                    <p class="text-xs text-slate-500">${escapeHtml(entry.role)} • ${escapeHtml(entry.gender)} • ${escapeHtml(entry.branch)}</p>
                                </div>
                            </div>
                            <span class="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-[#15803d] border border-emerald-200">
                                ID: ${escapeHtml(entry.previewId || 'Pending')}
                            </span>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-2">
                                <label class="sigma-subject-label text-sm font-bold text-black capitalize tracking-normal ml-1">ID Number</label>
                                <input type="text" value="${escapeHtml(entry.previewId)}" readonly disabled
                                    class="sigma-subject-input w-full bg-slate-100/70 border-b-2 border-slate-200 rounded-none px-4 py-3.5 text-sm font-bold text-slate-700 outline-none cursor-not-allowed font-['Inter'] shadow-none">
                            </div>

                            <div class="space-y-2">
                                <label class="sigma-subject-label text-sm font-bold text-black capitalize tracking-normal ml-1">Gmail <span class="text-red-500">*</span></label>
                                <input type="text" value="${escapeHtml(fullEmail)}" readonly disabled
                                    class="sigma-subject-input w-full bg-slate-100/70 border-b-2 border-slate-200 rounded-none px-4 py-3.5 text-sm font-medium text-slate-700 outline-none cursor-not-allowed font-['Inter'] shadow-none">
                            </div>
                        </div>

                        <!-- Green Account Preview (Matching Create User Account Step 2) -->
                        <div class="pt-2">
                            <span class="sigma-label mb-2.5 block">Account Preview</span>
                            <div class="max-w-xl rounded-[20px] bg-[#15803d] border border-green-700/40 p-5 space-y-3.5 shadow-md">
                                <div class="flex items-center justify-between gap-6">
                                    <span class="text-xs font-bold uppercase tracking-wider text-green-100">Login ID</span>
                                    <span class="text-base font-bold text-white tracking-tight">${escapeHtml(entry.previewId)}</span>
                                </div>
                                <div class="h-px bg-white/30"></div>
                                <div class="flex items-center justify-between gap-6">
                                    <span class="text-xs font-bold uppercase tracking-wider text-green-100">Password</span>
                                    <span class="text-base font-bold text-white tracking-tight font-mono">${escapeHtml(entry.previewPassword)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        updateBatchStepHeaderUI();
    }

    function renderBatchStep3SendCredentials() {
        const container = document.getElementById('batch-user-step3-container');
        if (!container) return;

        const roleGroups = ['Admin', 'Teacher', 'Student'];
        let html = `
            <div class="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-[#15803d] text-white flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-black">${batchCreatedAccounts.length} User ${batchCreatedAccounts.length === 1 ? 'Account' : 'Accounts'} Created Successfully</p>
                        <p class="text-xs text-slate-600">Organized by Role (Admin → Teacher → Student). Send credentials individually via Gmail or download the full list.</p>
                    </div>
                </div>
            </div>
        `;

        for (const roleKey of roleGroups) {
            const groupItems = batchCreatedAccounts
                .map((acc, idx) => ({ acc, idx }))
                .filter(item => item.acc.role === roleKey);
            if (!groupItems.length) continue;

            const meta = getRoleSectionMeta(roleKey);
            html += `
                <div class="space-y-4 pt-2">
                    <div class="flex items-center justify-between border-b border-slate-200 pb-2.5">
                        <div class="flex items-center gap-2.5">
                            <i class="${meta.icon} text-sm"></i>
                            <h3 class="text-base font-bold text-black font-['Inter']">${escapeHtml(meta.title)}</h3>
                            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full border ${meta.badgeClass}">
                                ${groupItems.length} Created
                            </span>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            `;

            for (const { acc, idx } of groupItems) {
                html += `
                    <div class="space-y-3">
                        <div class="relative overflow-hidden rounded-[24px] bg-[#15803d] p-6 border-2 border-white/20 shadow-none">
                            <div class="absolute top-0 right-0 p-4 opacity-10">
                                <i class="fa-solid fa-shield-halved text-7xl"></i>
                            </div>
                            <div class="relative z-10 space-y-4">
                                <div class="flex items-center gap-3 border-b border-white/20 pb-4">
                                    <img src="image/ICC logo.jpg" alt="ICC Logo"
                                        class="w-10 h-10 rounded-full border-2 border-white/30 bg-white object-contain">
                                    <div class="min-w-0">
                                        <p class="text-[10px] font-medium uppercase tracking-widest text-white/70">
                                            Institutional Credentials • ${escapeHtml(acc.role)}
                                        </p>
                                        <h4 class="text-base font-bold text-white truncate">${escapeHtml(acc.fullName)}</h4>
                                        <p class="text-xs text-white/80 truncate">${escapeHtml(acc.email)}</p>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div class="space-y-1">
                                        <span class="text-[10px] font-bold uppercase tracking-wider text-white/60 block">Login ID</span>
                                        <div class="text-xl font-bold text-white tracking-tight">${escapeHtml(acc.id)}</div>
                                    </div>
                                    <div class="space-y-1">
                                        <span class="text-[10px] font-bold uppercase tracking-wider text-white/60 block">Password</span>
                                        <div class="text-base font-bold text-white/95 font-mono tracking-wider break-all">${escapeHtml(acc.password)}</div>
                                    </div>
                                </div>

                                <div class="pt-3 border-t border-white/10 flex items-center justify-between">
                                    <p class="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Confidential Information</p>
                                    <i class="fa-solid fa-qrcode text-white/30 text-lg"></i>
                                </div>
                            </div>
                        </div>

                        <button type="button" onclick="window.sendBatchUserCredentialViaGmail(${idx})"
                            class="sigma-btn sigma-btn-secondary sigma-btn-md w-full !rounded-2xl gap-2.5 text-black font-semibold cursor-pointer">
                            <i class="fa-solid fa-envelope text-red-500"></i>
                            <span class="text-black font-semibold">Send via Gmail (${escapeHtml(acc.email)})</span>
                        </button>
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        updateBatchStepHeaderUI();
    }

    // ─── INTERACTION HANDLERS ───

    window.updateBatchEntryField = function (uid, field, rawValue, shouldReRender = false) {
        const entry = batchEntries.find(e => e._uid === uid);
        if (!entry) return;

        if (field === 'role') entry.role = normalizeRoleValue(rawValue);
        else if (field === 'gender') entry.gender = normalizeGenderValue(rawValue);
        else if (field === 'emailPrefix') entry.emailPrefix = normalizeEmailPrefix(rawValue);
        else if (field === 'firstName') entry.firstName = formatPersonName(rawValue);
        else if (field === 'middleName') entry.middleName = formatPersonName(rawValue);
        else if (field === 'lastName') entry.lastName = formatPersonName(rawValue);

        if (entry._errors) {
            delete entry._errors[field];
            delete entry._errors.message;
        }

        if (shouldReRender) {
            batchEntries = sortBatchEntriesByRole(batchEntries);
            renderBatchStep1Review();
            return;
        }

        // Update card border & badge in place without losing focus
        const inputIds = {
            role: `batch-role-${uid}`,
            firstName: `batch-fname-${uid}`,
            middleName: `batch-mname-${uid}`,
            lastName: `batch-lname-${uid}`,
            gender: `batch-gender-${uid}`,
            emailPrefix: `batch-email-${uid}`
        };
        const inputEl = document.getElementById(inputIds[field]);
        if (inputEl) {
            const hasVal = Boolean(entry[field] && String(entry[field]).trim());
            inputEl.classList.toggle('border-rose-500', !hasVal);
            inputEl.classList.toggle('border-slate-300', hasVal);
        }

        const badge = document.querySelector(`[data-status-badge="${uid}"]`);
        const complete = isEntryComplete(entry);
        if (badge) {
            badge.className = `text-[11px] font-bold px-2.5 py-0.5 rounded-full ${complete ? 'bg-emerald-100 text-[#15803d]' : 'bg-amber-100 text-amber-800'}`;
            badge.textContent = complete ? 'Ready for Creation' : 'Blank Fields Required';
        }
        const card = document.getElementById(`batch-entry-card-${uid}`);
        if (card) {
            card.classList.toggle('border-slate-200', complete);
            card.classList.toggle('border-amber-300', !complete);
            card.classList.remove('border-rose-400', 'bg-rose-50/10');
        }
    };

    window.organizeBatchEntriesByRole = function () {
        batchEntries = sortBatchEntriesByRole(batchEntries);
        renderBatchStep1Review();
    };

    window.addBatchUserEmptyRow = function () {
        batchEntries.push(createBlankEntry({ branch: getActiveBranchName() }));
        renderBatchStep1Review();
    };

    window.removeBatchUserRow = function (uid) {
        batchEntries = batchEntries.filter(e => e._uid !== uid);
        renderBatchStep1Review();
    };

    window.handleBatchFileInputChange = async function (input) {
        const file = input?.files?.[0];
        if (!file) return;
        await processBatchUploadedFile(file);
        input.value = '';
    };

    async function processBatchUploadedFile(file) {
        const fileName = String(file.name || '').trim();
        const ext = (fileName.split('.').pop() || '').toLowerCase();
        const allowed = new Set(['xlsx', 'xls', 'csv', 'docx', 'doc', 'pdf']);

        if (!allowed.has(ext)) {
            showNoticeDialog('Unsupported File Format', 'Please upload a PDF (.pdf), Word Document (.docx, .doc), or Excel / CSV (.xlsx, .xls, .csv) file.', true);
            return;
        }

        const uploadLabel = document.getElementById('batch-upload-status-label');
        if (uploadLabel) {
            uploadLabel.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-[#15803d] mr-1.5"></i> Reading ${escapeHtml(fileName)}...`;
        }

        try {
            let parsedEntries = [];
            if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
                parsedEntries = await parseExcelOrCsvFile(file, ext);
            } else if (ext === 'docx' || ext === 'doc') {
                parsedEntries = await parseWordFile(file, ext);
            } else if (ext === 'pdf') {
                parsedEntries = await parsePdfFile(file);
            }

            if (!parsedEntries.length) {
                showNoticeDialog(
                    'No User Records Found',
                    `Could not find readable user rows in "${fileName}". Make sure the file contains user names or columns (Institutional Role, Firstname, Middlename, Lastname, Gender, Gmail).`,
                    true
                );
                return;
            }

            const branch = getActiveBranchName();
            parsedEntries.forEach((entry, idx) => {
                entry.branch = branch;
                entry._seq = idx + 1;
            });

            batchUploadedFileName = fileName;
            batchUploadedFileObj = file;
            batchUploadedFileExt = ext;
            if (window._sigmaUploadedFiles instanceof Map) {
                window._sigmaUploadedFiles.set(fileName, file);
                window._sigmaUploadedFiles.set(fileName.toLowerCase(), file);
            }
            if (typeof window.sigmaStoreDocument === 'function') {
                window.sigmaStoreDocument(fileName, file, { name: fileName, type: ext }).catch(() => {});
            }
            batchEntries = sortBatchEntriesByRole(parsedEntries);
            renderBatchStep1Review();
        } catch (err) {
            console.error('Batch file parse error:', err);
            showNoticeDialog('Import Error', err?.message || `Could not read "${fileName}". Please check the file and try again.`, true);
        } finally {
            if (uploadLabel) {
                uploadLabel.textContent = 'Click to upload or drag & drop PDF, Word (.docx, .doc), or Excel (.xlsx, .csv)';
            }
        }
    }

    function validateAllBatchEntries() {
        if (!batchEntries.length) {
            showNoticeDialog('No Accounts to Create', 'Please upload a file or add at least one user account first.', true);
            return false;
        }

        const existingUsers = getExistingUsers();
        const normalizeStr = s => String(s || '').trim().toLowerCase();
        const seenNamesInBatch = new Set();
        const seenEmailsInBatch = new Set();

        let firstErrorUid = null;
        let firstErrorMessage = '';

        for (let i = 0; i < batchEntries.length; i++) {
            const entry = batchEntries[i];
            entry._errors = {};

            if (!VALID_ROLES.includes(entry.role)) entry._errors.role = true;
            if (!entry.firstName.trim()) entry._errors.firstName = true;
            if (!entry.middleName.trim()) entry._errors.middleName = true;
            if (!entry.lastName.trim()) entry._errors.lastName = true;
            if (!VALID_GENDERS.includes(entry.gender)) entry._errors.gender = true;
            if (!entry.emailPrefix.trim()) entry._errors.emailPrefix = true;

            if (Object.keys(entry._errors).length > 0) {
                entry._errors.message = 'All fields (Role, Firstname, Middlename, Lastname, Gender, and Gmail) are required.';
                if (!firstErrorUid) {
                    firstErrorUid = entry._uid;
                    firstErrorMessage = `Row #${i + 1}: Please fill in all blank required fields (Institutional Role, Firstname, Middlename, Lastname, Gender, and Gmail).`;
                }
                continue;
            }

            // Duplicate check against existing system users (Same Name + Gender + Role)
            const fullDisplayName = `${entry.firstName} ${entry.middleName} ${entry.lastName}`.trim();
            const dupSystemUser = existingUsers.find(u => {
                const uFname = normalizeStr(u.firstName || u.fname);
                const uMname = normalizeStr(u.middleName || u.mname || u.middlename);
                const uLname = normalizeStr(u.lastName || u.lname);
                const uGender = normalizeStr(u.gender);
                const uRole = normalizeRoleValue(u.role || u.type);
                return uFname === normalizeStr(entry.firstName) &&
                    uMname === normalizeStr(entry.middleName) &&
                    uLname === normalizeStr(entry.lastName) &&
                    uGender === normalizeStr(entry.gender) &&
                    uRole === entry.role;
            });

            if (dupSystemUser) {
                const dupId = dupSystemUser.id || dupSystemUser.uid || 'N/A';
                entry._errors.firstName = true;
                entry._errors.lastName = true;
                entry._errors.message = `An active ${entry.role} account for "${fullDisplayName}" (${entry.gender}) already exists with Login ID: ${dupId}.`;
                if (!firstErrorUid) {
                    firstErrorUid = entry._uid;
                    firstErrorMessage = entry._errors.message;
                }
                continue;
            }

            // Duplicate check within the batch itself (Same Name + Gender + Role)
            const batchNameKey = [
                normalizeStr(entry.firstName),
                normalizeStr(entry.middleName),
                normalizeStr(entry.lastName),
                normalizeStr(entry.gender),
                entry.role
            ].join('|');

            if (seenNamesInBatch.has(batchNameKey)) {
                entry._errors.firstName = true;
                entry._errors.lastName = true;
                entry._errors.message = `Duplicate entry in batch for "${fullDisplayName}" (${entry.role}).`;
                if (!firstErrorUid) {
                    firstErrorUid = entry._uid;
                    firstErrorMessage = entry._errors.message;
                }
                continue;
            }
            seenNamesInBatch.add(batchNameKey);

            // Email duplicate check against existing system users and within batch
            const fullEmail = `${entry.emailPrefix.toLowerCase()}@gmail.com`;
            const dupEmailUser = existingUsers.find(u => {
                const uEmail = normalizeStr(u.email);
                const uPrefix = uEmail.split('@')[0];
                return uEmail === fullEmail || uPrefix === normalizeStr(entry.emailPrefix);
            });
            const isMasterAdminDup = entry.emailPrefix.toLowerCase() === 'stanley' || fullEmail === 'stanley@gmail.com';

            if (dupEmailUser || isMasterAdminDup) {
                const ownerName = dupEmailUser
                    ? (dupEmailUser.fullName || `${dupEmailUser.firstName || ''} ${dupEmailUser.lastName || ''}`.trim())
                    : 'Master Admin';
                entry._errors.emailPrefix = true;
                entry._errors.message = `Gmail "${fullEmail}" is already in use by ${ownerName}.`;
                if (!firstErrorUid) {
                    firstErrorUid = entry._uid;
                    firstErrorMessage = entry._errors.message;
                }
                continue;
            }

            if (seenEmailsInBatch.has(fullEmail)) {
                entry._errors.emailPrefix = true;
                entry._errors.message = `Gmail "${fullEmail}" is used more than once in this batch.`;
                if (!firstErrorUid) {
                    firstErrorUid = entry._uid;
                    firstErrorMessage = entry._errors.message;
                }
                continue;
            }
            seenEmailsInBatch.add(fullEmail);
        }

        if (firstErrorUid !== null) {
            renderBatchStep1Review();
            const cardEl = document.getElementById(`batch-entry-card-${firstErrorUid}`);
            cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            showNoticeDialog('Review Required', firstErrorMessage, true);
            return false;
        }

        return true;
    }

    async function allocatePreviewIdsByRole() {
        const branch = getActiveBranchName();
        const branchCode = getBranchCodeForName(branch);
        batchEntries = sortBatchEntriesByRole(batchEntries);

        for (const role of ['Admin', 'Teacher', 'Student']) {
            const roleItems = batchEntries.filter(e => e.role === role);
            if (!roleItems.length) continue;

            let startId = '';
            try {
                const res = await window.SigmaDatabase.request('users', {
                    query: { action: 'next_id', role, branchCode }
                });
                startId = String(res?.id || '');
            } catch (_) {
                startId = '';
            }

            const prefix = startId.length >= 6 ? startId.slice(0, 6) : '';
            const startSeq = startId.length > 6 ? parseInt(startId.slice(6), 10) : 1;

            roleItems.forEach((entry, idx) => {
                const seqNum = (Number.isFinite(startSeq) ? startSeq : 1) + idx;
                const generatedId = prefix ? `${prefix}${seqNum}` : `Pending-${idx + 1}`;
                entry.previewId = generatedId;
                entry.previewPassword = buildPasswordPreview(entry.lastName, generatedId);
            });
        }
    }

    window.handleBatchUserStepNext = async function () {
        if (batchStep !== 1) return;
        if (!validateAllBatchEntries()) return;

        const nextBtn = document.getElementById('batch-user-next-btn');
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1.5"></i><span>Generating IDs...</span>`;
        }

        try {
            await allocatePreviewIdsByRole();
            batchStep = 2;
            renderBatchStep2Credentials();
            const bodyEl = document.getElementById('batch-user-form-body');
            if (bodyEl) bodyEl.scrollTop = 0;
        } catch (err) {
            showNoticeDialog('ID Generation Error', err?.message || 'Could not generate preview IDs. Please try again.', true);
        } finally {
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.innerHTML = `<span>Next</span>`;
            }
        }
    };

    window.handleBatchUserStepBack = function () {
        if (batchStep === 2) {
            batchStep = 1;
            renderBatchStep1Review();
            const bodyEl = document.getElementById('batch-user-form-body');
            if (bodyEl) bodyEl.scrollTop = 0;
        }
    };

    window.handleBatchUserSave = async function () {
        if (batchSavePending || batchStep !== 2) return;
        if (!validateAllBatchEntries()) {
            batchStep = 1;
            renderBatchStep1Review();
            return;
        }

        const saveBtn = document.getElementById('batch-user-save-btn');
        const saveLabel = document.getElementById('batch-user-save-label');
        const saveSpinner = document.getElementById('batch-user-save-loading');

        batchSavePending = true;
        if (saveBtn) saveBtn.disabled = true;
        if (saveSpinner) saveSpinner.classList.remove('hidden');

        try {
            // Organize strictly by role: 1. Admin, 2. Teacher, 3. Student
            batchEntries = sortBatchEntriesByRole(batchEntries);

            const defaultsRes = await window.SigmaDatabase.request('users', {
                query: { action: 'permission_defaults' }
            });
            const roleDefaultPerms = defaultsRes?.roles || {};

            const branch = getActiveBranchName();
            const branchCode = getBranchCodeForName(branch);
            const createdList = [];

            for (let i = 0; i < batchEntries.length; i++) {
                const entry = batchEntries[i];
                if (saveLabel) {
                    saveLabel.textContent = `Creating ${i + 1} of ${batchEntries.length}...`;
                }

                const fullName = [entry.firstName, entry.middleName, entry.lastName].filter(Boolean).join(' ');
                const fullEmail = `${entry.emailPrefix.toLowerCase()}@gmail.com`;
                const defaultPerms = roleDefaultPerms[entry.role] || {};

                const accountPayload = {
                    firstName: entry.firstName,
                    middleName: entry.middleName,
                    lastName: entry.lastName,
                    fullName: fullName,
                    gender: entry.gender,
                    branch: branch,
                    email: fullEmail,
                    role: entry.role,
                    type: entry.role.toUpperCase(),
                    status: 'Active',
                    permissions: defaultPerms,
                    createdAt: new Date().toISOString(),
                    createdVia: 'admin-panel'
                };

                const saved = await window.SigmaDatabase.request('users', {
                    data: {
                        action: 'create',
                        branchCode,
                        passwordAutoGenerated: true,
                        user: accountPayload
                    }
                });

                const canonical = saved?.record;
                if (!canonical?.id) {
                    throw new Error(`The server did not confirm the saved account for ${fullName}.`);
                }

                const generatedPassword = buildPasswordPreview(entry.lastName, canonical.id);
                const latestUsers = getExistingUsers();
                const savedIndex = latestUsers.findIndex(u => String(u.id || u.uid) === String(canonical.id));
                if (savedIndex < 0) latestUsers.unshift(canonical);
                else latestUsers[savedIndex] = canonical;

                localStorage.setItem('sigma-managed-users', JSON.stringify(latestUsers));
                localStorage.setItem('sigma-users-list', JSON.stringify(latestUsers));
                window.commitUserSeq?.(entry.role);

                createdList.push({
                    id: canonical.id,
                    uid: canonical.id,
                    firstName: canonical.firstName || entry.firstName,
                    middleName: canonical.middleName || entry.middleName,
                    lastName: canonical.lastName || entry.lastName,
                    fullName: canonical.fullName || fullName,
                    gender: canonical.gender || entry.gender,
                    role: canonical.role || entry.role,
                    email: canonical.email || fullEmail,
                    branch: canonical.branch || branch,
                    password: generatedPassword
                });
            }

            batchCreatedAccounts = createdList;
            if (typeof window.renderUserAccountsTable === 'function') {
                window.renderUserAccountsTable();
            }

            batchStep = 3;
            renderBatchStep3SendCredentials();
            const bodyEl = document.getElementById('batch-user-form-body');
            if (bodyEl) bodyEl.scrollTop = 0;
        } catch (err) {
            console.error('Batch user creation error:', err);
            showNoticeDialog('Batch Creation Error', err?.message || 'An error occurred while creating accounts.', true);
        } finally {
            batchSavePending = false;
            if (saveBtn) saveBtn.disabled = false;
            if (saveSpinner) saveSpinner.classList.add('hidden');
            if (saveLabel) saveLabel.textContent = 'Create Accounts';
        }
    };

    window.sendBatchUserCredentialViaGmail = function (idx) {
        const acc = batchCreatedAccounts[idx];
        if (!acc) return;
        const subject = encodeURIComponent('Your SIGMA ELMS Login Credentials');
        const body = encodeURIComponent(
            `Hello ${acc.firstName},\n\nYour ${acc.role} account has been created successfully.\n\nLogin ID: ${acc.id}\nPassword: ${acc.password}\n\nYou can log in at the portal using either your ID or Gmail address.\n\nBest regards,\nInterface Computer College`
        );
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(acc.email)}&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');
    };

    window.resetBatchUserModal = function () {
        batchStep = 1;
        batchEntries = [];
        batchCreatedAccounts = [];
        batchUploadedFileName = '';
        batchUploadedFileObj = null;
        batchUploadedFileExt = '';
        renderBatchStep1Review();
        const bodyEl = document.getElementById('batch-user-form-body');
        if (bodyEl) bodyEl.scrollTop = 0;
    };

    window.finishBatchUserCreation = function () {
        const count = batchCreatedAccounts.length;
        const firstCreated = batchCreatedAccounts[0];
        window.toggleBatchUserOverlay(false);
        if (typeof window.renderUserAccountsTable === 'function') {
            window.renderUserAccountsTable();
        }
        if (count > 0 && typeof window.showCreationBar === 'function') {
            window.showCreationBar({
                type: 'user',
                label: count === 1 ? 'Created Account' : `Batch Created ${count} Accounts`,
                primaryLabel: count === 1 ? 'Full Name' : 'Accounts Created',
                primaryValue: count === 1 ? firstCreated.fullName : `${count} Users (Organized by Role)`,
                secondaryLabel: count === 1 ? 'Login ID' : 'First Login ID',
                secondaryValue: firstCreated?.id || '-',
                status: 'published'
            });
        }
    };

    window.toggleBatchUserOverlay = function (show) {
        const overlay = document.getElementById('batch-user-overlay');
        if (!overlay) return;

        if (show) {
            overlay.classList.remove('hidden');
            overlay.style.removeProperty('display');
            if (typeof window.pushModalHistoryState === 'function') {
                window.pushModalHistoryState('batch-user-overlay');
            }
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';

            batchStep = 1;
            batchEntries = [];
            batchCreatedAccounts = [];
            batchUploadedFileName = '';
            batchUploadedFileObj = null;
            batchUploadedFileExt = '';

            if (typeof window.populateUserSchoolBranchSelect === 'function') {
                window.populateUserSchoolBranchSelect('');
            }
            const branchDisplay = document.getElementById('batch-user-school-branch');
            if (branchDisplay) {
                const branchName = getActiveBranchName();
                branchDisplay.innerHTML = `<option value="${escapeHtml(branchName)}">${escapeHtml(branchName)}</option>`;
            }

            renderBatchStep1Review();
            overlay.scrollTop = 0;
            const bodyEl = document.getElementById('batch-user-form-body');
            if (bodyEl) bodyEl.scrollTop = 0;
        } else {
            overlay.classList.add('hidden');
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            batchStep = 1;
            batchEntries = [];
            batchCreatedAccounts = [];
            batchUploadedFileName = '';
            batchUploadedFileObj = null;
            batchUploadedFileExt = '';
        }
    };

    window.handleBatchUserExit = function () {
        if (batchStep >= 3) {
            window.finishBatchUserCreation();
            return;
        }
        const doExit = () => window.toggleBatchUserOverlay(false);

        if (batchEntries.length > 0) {
            if (typeof window.openAskingPanel === 'function') {
                window.openAskingPanel({
                    title: 'Discard Batch Import?',
                    desc: 'You have imported user accounts that have not been created yet. Are you sure you want to discard them and leave?',
                    type: 'warning',
                    confirmText: 'Discard',
                    cancelText: 'Stay',
                    showCancel: true,
                    onConfirm: doExit
                });
                return;
            }
        }
        doExit();
    };

    // Drag & drop binding for the upload zone
    document.addEventListener('DOMContentLoaded', () => {
        const dropZone = document.getElementById('batch-user-dropzone');
        if (!dropZone) return;

        ['dragenter', 'dragover'].forEach(evtName => {
            dropZone.addEventListener(evtName, e => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('border-[#15803d]', 'bg-emerald-50/40');
            });
        });

        ['dragleave', 'drop'].forEach(evtName => {
            dropZone.addEventListener(evtName, e => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('border-[#15803d]', 'bg-emerald-50/40');
            });
        });

        dropZone.addEventListener('drop', async e => {
            const file = e.dataTransfer?.files?.[0];
            if (file) await processBatchUploadedFile(file);
        });
    });
})();
