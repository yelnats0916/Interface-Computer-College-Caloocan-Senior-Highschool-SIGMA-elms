(function(){

'use strict';

let records=[];

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const numeric=v=>v!==null&&v!==undefined&&v!==''&&v!=='-'&&Number.isFinite(Number(v));

function collect(){
 if (!window._gradebookReadCacheActive && window.withGradebookReadCache) return window.withGradebookReadCache(collect);

 const users=window.getStoredJson?.('sigma-admin-users',[])||[];

 const classes=new Map();

 for(const teacher of users.filter(u=>String(u.role).toLowerCase()==='teacher')) for(const c of window.getTeacherAssignedSubjectsAndSections?.(teacher)||[])classes.set(JSON.stringify([c.subject,c.sectionName]),c);

 const rows=[];const seen=new Set();

 for(const quarter of [1,2,3,4]) for(const c of classes.values()) for(const category of ['ww','pt','qa']){

 const students=(window.getStudentsForSection?.(c.sectionName,c.subject)||[]).map(student=>({...student,section:c.sectionName}));
 const items=window.getCategoryDetails?.(category,quarter,c.subject,c.sectionName)||[];

 items.forEach((item,index)=>{

 const key=JSON.stringify([quarter,c.subject,c.sectionName,item.id||item.rawItem?.id||[item.topicIdx,item.itemIdx,category,index]]);if(seen.has(key))return;seen.add(key);

 for(const student of students){

 const scoped={...item,section:c.sectionName,quarter};
 const itemIndex=item.itemIdx??index;

 const effective=window.getEffectiveAssessmentStatusAndScore?.(student,category,itemIndex,item.subjectId||c.subject,quarter,scoped)||{};

 const score=numeric(effective.score)?Number(effective.score):window.getGradebookStudentItemScore?.(student,category,itemIndex,scoped,item.subjectId||c.subject,quarter);

 const raw=String(effective.status||'').toLowerCase();

 const status=['missing','absent','incomplete','excuse','excused'].includes(raw)?(raw==='excuse'?'excused':raw):numeric(score)?'graded':null;

 if(!status)continue;

 const source=item.rawItem||item;

 const type=/quiz/i.test(String(source.type||source.assessmentType||item._category||''))?'Quiz':'Task';

 rows.push({student,subject:c.subject,section:c.sectionName,grade:c.grade||student.gradeLevel||'',category,index,item,quarter,score:numeric(score)?Number(score):null,max:Number(item.max||item.points||source.points||source.totalPoints)||null,status,type});

 }

 });

 }

 return rows;

}

window.openPerformanceSubmission=function(index){

 const r=records[index];if(!r)return;

 if(r.item.offline){window.showToast?.('This is an offline assessment; no online submission is available.');return;}

 window.showAdminClassroom?.(r.section,r.subject,'room');

 window.sigmaGradesState=window.sigmaGradesState||{};

 window.sigmaGradesState.activeQuarter=r.quarter;

 window.sigmaGradesState.selectedSubjectSection={subject:r.subject,sectionName:r.section};

 window.sigmaGradesState.selectedStudent=r.student.fullName||r.student.name||[r.student.firstName,r.student.lastName].filter(Boolean).join(' ');

 window.openGradebookAssessment?.(r.category,r.item.itemIdx??r.index,r.subject,r.section);

};

window.applyPerformanceSearch=function(){
 if (!window._gradebookReadCacheActive && window.withGradebookReadCache) return window.withGradebookReadCache(window.applyPerformanceSearch);

 const body=document.getElementById('performanceReportTableBody');if(!body)return;

 const q=(document.getElementById('perf-search-input')?.value||'').toLowerCase();

 const subject=document.getElementById('perf-filter-subject')?.value||'';

 const type=document.getElementById('perf-filter-type')?.value||'';
 const selectedQuarter=Number(document.getElementById('perf-filter-quarter')?.value)||0;

 const filtered=records.map((r,index)=>({...r,index})).filter(r=>(!selectedQuarter||r.quarter===selectedQuarter)&&(!subject||r.subject===subject)&&(!type||r.type===type)&&JSON.stringify([r.student.fullName,r.student.name,r.student.studentNumber,r.student.id,r.student.uid,r.student.lrn,r.subject,r.section]).toLowerCase().includes(q));

 const percentages=filtered.filter(r=>r.status==='graded'&&r.score!==null&&r.max>0).map(r=>r.score/r.max*100);

 const values=[percentages.length?(percentages.reduce((a,b)=>a+b,0)/percentages.length).toFixed(1)+'%':'N/A',percentages.length?Math.max(...percentages).toFixed(1)+'%':'N/A',filtered.filter(r=>r.status==='graded'&&r.score!==null).length,new Set(filtered.filter(r=>['missing','absent','incomplete'].includes(r.status)||r.status==='graded'&&r.score!==null&&r.max>0&&r.score/r.max<.75).map(r=>r.student.uid||r.student.id||r.student.studentNumber||JSON.stringify([r.student.fullName||r.student.name,r.section]))).size];

 ['avg','highest','passrate','atrisk'].forEach((id,i)=>{const el=document.getElementById('metric-perf-'+id);if(el){el.textContent=values[i];el.classList.toggle('performance-metric-unavailable',values[i]==='N/A');el.title=values[i]==='N/A'?'No scored assessments available for the selected filters.':'';const spot=el.closest('.sigma-interactive-metric-card')?.querySelector('.metric-text-spotlight span:last-child');if(spot){spot.textContent=values[i];spot.classList.toggle('performance-metric-unavailable',values[i]==='N/A');}}});

 renderOverview(filtered);

 body.innerHTML=filtered.map(r=>{const name=r.student.fullName||r.student.name||[r.student.firstName,r.student.lastName].filter(Boolean).join(' ');const avatarHtml=(typeof window.renderUserAvatarHtml==='function'&&window.renderUserAvatarHtml(r.student,'sm'))||'<div class="sigma-user-avatar sigma-user-avatar--sm"><i class="fa-solid fa-user"></i></div>';return `<tr><td><div class="flex items-center gap-3">${avatarHtml}<div class="performance-student-identity"><span>${esc(name)}</span><small class="performance-student-id">ID: ${esc(r.student.studentNumber || r.student.id || r.student.uid || r.student.lrn || '—')}</small></div></div></td><td><div>${esc(r.section)}</div><div>${esc(r.grade)}</div></td><td><div>${esc(r.subject)}</div><small class="performance-quarter-label">Quarter ${r.quarter}</small></td><td><span>${r.type}</span></td><td><span>${r.score===null?'—':esc(r.score)}${r.max?' / '+esc(r.max):''}</span></td><td><span class="performance-assessment-status" data-status="${r.status}">${r.status[0].toUpperCase()+r.status.slice(1)}</span></td><td><div class="flex justify-center"><div class="action-dropdown-container"><button type="button" class="action-dots-btn cursor-pointer" id="perf-dots-btn-${r.index}" aria-label="Assessment actions" onclick="window.togglePerformanceActionDropdown(${r.index},event)"><i class="fa-solid fa-ellipsis"></i></button><div id="perf-action-menu-${r.index}" class="action-dropdown-menu"><button type="button" class="action-dropdown-item cursor-pointer" onclick="window.openPerformanceSubmission(${r.index});this.closest('.action-dropdown-menu').classList.remove('show')"><i class="fa-solid fa-file-lines"></i><span>View Submission</span></button></div></div></div></td></tr>`}).join('')||`<tr><td colspan="7" class="text-xs text-black-fade italic" style="text-align:center;padding:32px;color:rgba(0,0,0,0.45);">${records.length ? 'No assessment records match the selected filters.' : 'No graded assessments or assessment statuses have been recorded for this school year.'}</td></tr>`;
 paginatePerformanceRows();

};

let overviewGradesQuarter = 1;
let overviewGradeFilter = '';
let overviewSectionFilter = '';
let overviewSubjectFilter = '';

function getActiveSYLabel() {
 const active = window.getActiveSchoolYearRecord?.();
 if (active && active.yearStart && active.yearEnd) return `${active.yearStart}-${active.yearEnd}`;
 if (active?.schoolYear) return active.schoolYear;
 return '2026-2027';
}

function computeStudentGradesForQuarter(quarter, gradeFilter = '', sectionFilter = '', subjectFilter = '') {
 if (!window._gradebookReadCacheActive && window.withGradebookReadCache) {
  return window.withGradebookReadCache(() => computeStudentGradesForQuarter(quarter, gradeFilter, sectionFilter, subjectFilter));
 }
 const users = window.getStoredJson?.('sigma-admin-users', []) || [];
 const classes = new Map();
 for (const teacher of users.filter(u => String(u.role).toLowerCase() === 'teacher')) {
  for (const c of window.getTeacherAssignedSubjectsAndSections?.(teacher) || []) {
   if (subjectFilter && c.subject !== subjectFilter) continue;
   if (sectionFilter && c.sectionName !== sectionFilter) continue;
   if (gradeFilter && c.grade && c.grade !== gradeFilter) continue;
   classes.set(JSON.stringify([c.subject, c.sectionName]), c);
  }
 }

 const results = [];
 const seen = new Set();

 for (const c of classes.values()) {
  const students = window.getStudentsForSection?.(c.sectionName, c.subject) || [];
  for (const student of students) {
   if (gradeFilter && student.gradeLevel && student.gradeLevel !== gradeFilter) continue;
   const studentId = student.uid || student.id || student.lrn || student.studentNumber || '';
   const key = JSON.stringify([studentId, c.subject, c.sectionName, quarter]);
   if (seen.has(key)) continue;
   seen.add(key);

   const grade = window.getPublishedSubjectGrade?.(student, c.subject, c.sectionName, quarter, selectedPerfSchoolYear || getActiveSYLabel());
   if (!Number.isFinite(grade)) continue;
   const studentName = student.fullName || student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || 'Student';
   results.push({
    name: studentName,
    subject: c.subject,
    section: c.sectionName,
    grade: Number(grade)
   });
  }
 }
 return results;
}

let overviewGradesSectionFilter = '';

function getAvailableSectionsForGrades(gradeFilter = '', precomputedResults = null) {
 const sectionSet = new Set();
 if (Array.isArray(precomputedResults)) {
  precomputedResults.forEach(r => { if (r.section) sectionSet.add(r.section); });
 }
 if (Array.isArray(records)) {
  records.forEach(r => {
   if (gradeFilter && r.grade && r.grade !== gradeFilter) return;
   if (r.section) sectionSet.add(r.section);
  });
 }
 try {
  const rawSec = JSON.parse(localStorage.getItem('sigma-admin-sections') || '[]');
  if (Array.isArray(rawSec)) {
   rawSec.forEach(s => {
    const sGrade = s.gradeLevel || s.grade || '';
    if (gradeFilter && sGrade && sGrade !== gradeFilter) return;
    const name = s.name || s.sectionName;
    if (name) sectionSet.add(name);
   });
  }
 } catch (_) {}
 return Array.from(sectionSet).sort();
}

function buildGradesSectionSelectorHtml(sections = null) {
 const availableSections = Array.isArray(sections) ? sections : getAvailableSectionsForGrades(overviewGradeFilter);
 const effectiveVal = overviewGradesSectionFilter || overviewSectionFilter || '';
 const options = [
  { value: '', label: 'All Sections' },
  ...availableSections.map(s => ({ value: s, label: s }))
 ];
 const currentLabel = options.find(o => o.value === effectiveVal)?.label || 'All Sections';
 return `
  <div id="perf-grades-section-selector-wrap" class="shrink-0">
   <details class="sigma-quarter-dropdown" style="--quarter-control-width: 145px;">
    <summary aria-label="Student Grades Section Filter">
     <span class="sigma-quarter-full-label truncate">${esc(currentLabel)}</span>
     <span class="sigma-quarter-mobile-label truncate">${esc(currentLabel)}</span>
     <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
    </summary>
    <div class="sigma-quarter-dropdown-menu" style="min-width: calc(100% + 2px); width: max-content;">
     ${options.map(item => `
      <button type="button" aria-pressed="${String(item.value) === String(effectiveVal)}" onclick="this.closest('details').open=false; window.selectPerformanceGradesSection('${esc(item.value)}')">
       <span>${esc(item.label)}</span>
      </button>
     `).join('')}
    </div>
   </details>
  </div>
 `;
}

window.selectPerformanceGradesSection = function(sec) {
 overviewGradesSectionFilter = sec || '';
 const wrap = document.getElementById('perf-grades-section-selector-wrap');
 if (wrap) {
  wrap.outerHTML = buildGradesSectionSelectorHtml();
 }
 const effectiveSection = overviewGradesSectionFilter || overviewSectionFilter || '';
 const results = computeStudentGradesForQuarter(overviewGradesQuarter, overviewGradeFilter, effectiveSection, overviewSubjectFilter);
 const container = document.getElementById('admin-overview-grades-list');
 if (container) {
  container.innerHTML = renderOverviewGradesList(overviewGradesQuarter, overviewGradeFilter, effectiveSection, overviewSubjectFilter, results);
 }
};

function renderOverviewGradesList(quarter, gradeFilter = '', sectionFilter = '', subjectFilter = '', precomputedResults = null) {
 const effectiveSection = sectionFilter || overviewGradesSectionFilter || overviewSectionFilter || '';
 const rawResults = Array.isArray(precomputedResults)
  ? precomputedResults
  : computeStudentGradesForQuarter(quarter, gradeFilter, effectiveSection, subjectFilter);
 const results = effectiveSection ? rawResults.filter(r => r.section === effectiveSection) : rawResults;
 const highGrades = results.filter(r => r.grade >= 90).sort((a, b) => b.grade - a.grade || a.name.localeCompare(b.name));
 const lowGrades = results.filter(r => r.grade < 75).sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));

 const renderEntryRow = (row, isHigh) => `
  <div class="teacher-student-grade-entry" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;font-size:13px;">
   <div style="min-width:0;overflow-wrap:anywhere;">
    <strong style="font-size:13px;font-weight:600;color:#000000;display:block;">${esc(row.name)}</strong>
    <p style="font-size:12px;font-weight:400;color:rgba(0, 0, 0, 0.45);margin:4px 0 0;">${esc(row.subject)} · ${esc(row.section)}</p>
   </div>
   <span class="${isHigh ? 'is-high' : 'is-low'}" style="font-size:13px;font-weight:600;flex-shrink:0;color:${isHigh ? '#15803d' : '#dc2626'} !important;">${row.grade}</span>
  </div>
 `;

 const renderGroup = (title, items, isHigh) => {
  let listHtml = '<p class="teacher-student-grade-empty" style="font-size:12px;color:rgba(0, 0, 0, 0.45);margin:4px 0;">No Students In This Range.</p>';
  if (items.length) {
   listHtml = items.map(row => renderEntryRow(row, isHigh)).join('');
  }
  return `
   <section>
    <h4 style="font-size:13px;font-weight:600;color:#000000;margin:0 0 12px;">${title}</h4>
    <div class="overflow-y-auto pr-1" style="max-height: 220px;">
     ${listHtml}
    </div>
   </section>
  `;
 };

 return `
  <div class="pt-1">
   ${renderGroup('High Grades', highGrades, true)}
   <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
    ${renderGroup('Low Grades', lowGrades, false)}
   </div>
  </div>
 `;
}

window.setAdminOverviewGradesQuarter = function(q) {
 overviewGradesQuarter = Number(q) || 1;
 const effectiveSection = overviewGradesSectionFilter || overviewSectionFilter || '';
 const results = computeStudentGradesForQuarter(overviewGradesQuarter, overviewGradeFilter, effectiveSection, overviewSubjectFilter);
 const container = document.getElementById('admin-overview-grades-list');
 if (container) {
  container.innerHTML = renderOverviewGradesList(overviewGradesQuarter, overviewGradeFilter, effectiveSection, overviewSubjectFilter, results);
 }
};

window.setPerformanceOverviewFilter = function(filterType, val) {
 if (filterType === 'grade') {
  overviewGradeFilter = val;
  overviewGwaLevelFilter = val;
 }
 if (filterType === 'section') {
  overviewSectionFilter = val;
  overviewGradesSectionFilter = val;
 }
 if (filterType === 'subject') overviewSubjectFilter = val;
 if (typeof window.applyPerformanceSearch === 'function') {
  window.applyPerformanceSearch();
 }
};

let selectedPerfSchoolYear = null;

function getAvailableSchoolYears() {
 const yearsMap = new Map();
 let activeRecord = null;
 try {
  if (typeof window.getActiveSchoolYearRecord === 'function') {
   activeRecord = window.getActiveSchoolYearRecord();
  }
 } catch (_) {}
 const activeStart = activeRecord ? (Number(activeRecord.yearStart) || 2026) : 2026;

 try {
  const raw = localStorage.getItem('sigma_school_year_records') || localStorage.getItem('sigma-school-years');
  if (raw) {
   const parsed = JSON.parse(raw);
   if (Array.isArray(parsed)) {
    parsed.forEach(r => {
     if (!r || r.isDeleted) return;
     const yStart = Number(r.yearStart) || (r.name ? Number(String(r.name).match(/\d{4}/)?.[0]) : null);
     const yEnd = Number(r.yearEnd) || (yStart ? yStart + 1 : null);
     const sy = (yStart && yEnd) ? `${yStart}-${yEnd}` : (r.name || r.id);
     if (sy) {
      const isAct = r.status === 'Active' || (activeRecord && (activeRecord.id === r.id || String(activeRecord.yearStart) === String(r.yearStart)));
      const rawStatus = String(r.status || '').trim();
      const isExplicitArchived = rawStatus.toLowerCase().includes('archive') || rawStatus.toLowerCase().includes('complete');
      const isPastYear = yStart && yStart < activeStart;
      const isArchived = !isAct && (isExplicitArchived || isPastYear);
      // Only keep Active or Archived years (exclude future/upcoming inactive years)
      if (isAct || isArchived) {
       yearsMap.set(String(sy), {
        sy: String(sy),
        label: `S.Y. ${sy}`,
        status: isAct ? 'Active' : 'Archived',
        isArchived: isArchived,
        yearStart: yStart || activeStart
       });
      }
     }
    });
   }
  }
 } catch (_) {}

 try {
  const rawArc = localStorage.getItem('sigma_sy_archives');
  if (rawArc) {
   const archives = JSON.parse(rawArc);
   if (Array.isArray(archives)) {
    archives.forEach(arc => {
     if (!arc) return;
     const sy = (arc.yearStart && arc.yearEnd) ? `${arc.yearStart}-${arc.yearEnd}` : arc.syId;
     if (sy && !yearsMap.has(String(sy))) {
      yearsMap.set(String(sy), {
       sy: String(sy),
       label: `S.Y. ${sy}`,
       status: 'Archived',
       isArchived: true,
       yearStart: Number(arc.yearStart) || 2025
      });
     }
    });
   }
  }
 } catch (_) {}

 if (!yearsMap.has('2026-2027')) {
  yearsMap.set('2026-2027', {
   sy: '2026-2027',
   label: 'S.Y. 2026-2027',
   status: 'Active',
   isArchived: false,
   yearStart: 2026
  });
 }

 return Array.from(yearsMap.values()).sort((a, b) => {
  if (a.status === 'Active') return -1;
  if (b.status === 'Active') return 1;
  return (b.yearStart || 0) - (a.yearStart || 0);
 });
}

function buildPerformanceSYSelectorHtml() {
 const years = getAvailableSchoolYears();
 const activeYear = years.find(y => y.status === 'Active') || { sy: '2026-2027', label: 'S.Y. 2026-2027' };
 if (!selectedPerfSchoolYear) selectedPerfSchoolYear = activeYear.sy;
 const currentYearObj = years.find(y => y.sy === selectedPerfSchoolYear) || activeYear;
 const archivedYears = years.filter(y => y.isArchived);

 let archiveHtml = '';
 if (archivedYears.length) {
  archiveHtml = `
   <div class="px-3.5 py-1.5 border-t border-b border-slate-100 text-xs font-bold text-black mt-1">Archived School Years</div>
   ${archivedYears.map(y => `
    <button type="button" class="btn-select-perf-sy w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${y.sy === selectedPerfSchoolYear ? 'bg-slate-100/70 font-semibold' : ''}" onclick="window.selectPerformanceSY('${esc(y.sy)}', '${esc(y.label)}')">
     <i class="fa-solid fa-box-archive text-slate-400"></i>
     <span>${esc(y.label)}</span>
     <span class="ml-auto text-slate-400 text-xs">Archived</span>
    </button>
   `).join('')}
  `;
 }

 return `
  <div class="relative shrink-0" id="perf-sy-selector-wrap">
   <button type="button" id="btn-perf-sy-toggle" class="sigma-btn sigma-btn-white sigma-btn-md gap-2.5 shrink-0" aria-expanded="false" aria-controls="perf-sy-dropdown" aria-haspopup="true" title="Active School Year" onclick="window.togglePerformanceSYDropdown(event)">
    <i class="fa-solid fa-calendar-check text-[#15803d] text-xs" aria-hidden="true"></i>
    <span id="perf-sy-current-label" class="text-xs font-semibold text-black">${esc(currentYearObj.label)}</span>
    <i class="fa-solid fa-chevron-down resource-sy-chevron" aria-hidden="true"></i>
   </button>
   <div id="perf-sy-dropdown" class="hidden absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 font-['Inter']">
    <div class="px-3.5 py-1.5 border-b border-slate-100 text-xs font-bold text-black">Active School Year</div>
    <button type="button" class="btn-select-perf-sy w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 cursor-pointer ${activeYear.sy === selectedPerfSchoolYear ? 'bg-emerald-50 text-emerald-950 font-semibold' : 'hover:bg-slate-50'}" onclick="window.selectPerformanceSY('${esc(activeYear.sy)}', '${esc(activeYear.label)}')">
     <i class="fa-solid fa-calendar-check text-[#15803d]" aria-hidden="true"></i>
     <span>${esc(activeYear.label)}</span>
     <span class="ml-auto text-[#15803d] font-semibold text-xs">Active</span>
    </button>
    ${archiveHtml}
   </div>
  </div>
 `;
}

function buildQuarterSelectorHtml() {
 if (typeof window.renderSharedQuarterDropdown === 'function') {
  return `<div id="perf-quarter-selector-wrap" class="shrink-0">${window.renderSharedQuarterDropdown([1, 2, 3, 4], overviewGradesQuarter, q => `window.selectPerformanceQuarter(${q})`)}</div>`;
 }
 const names = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];
 const label = q => names[Number(q) - 1] || String(q);
 const optionLabel = q => `<span class="sigma-quarter-full-label">${label(q)}</span><span class="sigma-quarter-mobile-label">Q${q}</span>`;
 return `<div id="perf-quarter-selector-wrap" class="shrink-0"><details class="sigma-quarter-dropdown"><summary aria-label="Student grades quarter">${optionLabel(overviewGradesQuarter)}<i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary><div class="sigma-quarter-dropdown-menu">${[1, 2, 3, 4].map(q => `<button type="button" aria-pressed="${Number(q) === Number(overviewGradesQuarter)}" onclick="this.closest('details').open=false; window.selectPerformanceQuarter(${q})">${optionLabel(q)}</button>`).join('')}</div></details></div>`;
}

function buildOverviewFilterDropdownHtml(id, options, currentVal, defaultLabel, filterKey, widthPx = 150) {
 const currentLabel = currentVal || defaultLabel;
 const allItems = [{ value: '', label: defaultLabel }, ...options.map(o => ({ value: o, label: o }))];
 return `
  <details id="${id}" class="sigma-quarter-dropdown" style="--quarter-control-width: ${widthPx}px;">
   <summary aria-label="${esc(defaultLabel)}">
    <span class="sigma-quarter-full-label truncate">${esc(currentLabel)}</span>
    <span class="sigma-quarter-mobile-label truncate">${esc(currentLabel)}</span>
    <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
   </summary>
   <div class="sigma-quarter-dropdown-menu" style="min-width: calc(100% + 2px); width: max-content; max-width: 280px;">
    ${allItems.map(item => `
     <button type="button" aria-pressed="${String(item.value) === String(currentVal)}" onclick="this.closest('details').open=false; window.setPerformanceOverviewFilter('${filterKey}', '${esc(item.value)}')">
      <span>${esc(item.label)}</span>
     </button>
    `).join('')}
   </div>
  </details>
 `;
}

window.togglePerformanceSYDropdown = function(e) {
 if (e) e.stopPropagation();
 const dropdown = document.getElementById('perf-sy-dropdown');
 const toggleBtn = document.getElementById('btn-perf-sy-toggle');
 if (!dropdown || !toggleBtn) return;
 const isHidden = dropdown.classList.contains('hidden');
 dropdown.classList.toggle('hidden', !isHidden);
 toggleBtn.setAttribute('aria-expanded', String(isHidden));
};

window.selectPerformanceSY = function(sy, label) {
 selectedPerfSchoolYear = sy;
 const currentLabel = document.getElementById('perf-sy-current-label');
 if (currentLabel) currentLabel.textContent = label || `S.Y. ${sy}`;
 const dropdown = document.getElementById('perf-sy-dropdown');
 const toggleBtn = document.getElementById('btn-perf-sy-toggle');
 if (dropdown) dropdown.classList.add('hidden');
 if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
 if (typeof refresh === 'function') refresh();
};

window.selectPerformanceQuarter = function(q) {
 overviewGradesQuarter = Number(q) || 1;
 const wrap = document.getElementById('perf-quarter-selector-wrap');
 if (wrap) {
  wrap.outerHTML = buildQuarterSelectorHtml();
 }
 const effectiveSection = overviewGradesSectionFilter || overviewSectionFilter || '';
 const results = computeStudentGradesForQuarter(overviewGradesQuarter, overviewGradeFilter, effectiveSection, overviewSubjectFilter);
 const container = document.getElementById('admin-overview-grades-list');
 if (container) {
  container.innerHTML = renderOverviewGradesList(overviewGradesQuarter, overviewGradeFilter, effectiveSection, overviewSubjectFilter, results);
 }
 const gwaContainer = document.getElementById('admin-overview-gwa-list');
 if (gwaContainer) {
  const allGwaRankings = computeStudentGwaRankings(overviewGradesQuarter, overviewSectionFilter, overviewSubjectFilter);
  gwaContainer.innerHTML = renderOverviewGwaList(allGwaRankings, overviewGwaLevelFilter);
 }
};

document.addEventListener('click', (e) => {
 const syWrap = document.getElementById('perf-sy-selector-wrap');
 if (syWrap && !syWrap.contains(e.target)) {
  const dropdown = document.getElementById('perf-sy-dropdown');
  const toggleBtn = document.getElementById('btn-perf-sy-toggle');
  if (dropdown) dropdown.classList.add('hidden');
  if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
 }
});

let overviewGwaLevelFilter = '';

function computeStudentGwaRankings(quarter, sectionFilter = '', subjectFilter = '') {
 if (!window._gradebookReadCacheActive && window.withGradebookReadCache) {
  return window.withGradebookReadCache(() => computeStudentGwaRankings(quarter, sectionFilter, subjectFilter));
 }
 const users = window.getStoredJson?.('sigma-admin-users', []) || [];
 const sectionsData = window.getStoredJson?.('sigma-admin-sections', []) || [];
 const sectionGradeMap = new Map();
 if (Array.isArray(sectionsData)) {
  sectionsData.forEach(s => {
   const sName = s.name || s.sectionName;
   const sGrade = s.gradeLevel || s.grade || '';
   if (sName && sGrade) sectionGradeMap.set(String(sName).trim().toLowerCase(), String(sGrade).trim());
  });
 }

 const classes = new Map();
 for (const teacher of users.filter(u => String(u.role).toLowerCase() === 'teacher')) {
  for (const c of window.getTeacherAssignedSubjectsAndSections?.(teacher) || []) {
   if (subjectFilter && c.subject !== subjectFilter) continue;
   if (sectionFilter && c.sectionName !== sectionFilter) continue;
   classes.set(JSON.stringify([c.subject, c.sectionName]), c);
  }
 }

 const studentMap = new Map();
 const seenSubjectStudent = new Set();

 for (const c of classes.values()) {
  const students = window.getStudentsForSection?.(c.sectionName, c.subject) || [];
  for (const student of students) {
   const studentName = student.fullName || student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || 'Student';
   const studentId = student.uid || student.id || student.lrn || student.studentNumber || JSON.stringify([studentName, c.sectionName]);
   const subjKey = JSON.stringify([studentId, c.subject, c.sectionName, quarter]);
   if (seenSubjectStudent.has(subjKey)) continue;
   seenSubjectStudent.add(subjKey);

   const grade = window.getPublishedSubjectGrade?.(student, c.subject, c.sectionName, quarter, selectedPerfSchoolYear || getActiveSYLabel());
   if (!Number.isFinite(grade)) continue;
   const rawGradeLevel = student.gradeLevel || c.grade || sectionGradeMap.get(String(c.sectionName || '').trim().toLowerCase()) || '';
   const normalizedGradeLevel = /12/.test(String(rawGradeLevel)) ? 'Grade 12' : (/11/.test(String(rawGradeLevel)) ? 'Grade 11' : (rawGradeLevel || 'Grade 11'));

   const existing = studentMap.get(studentId) || {
    studentId,
    name: studentName,
    section: c.sectionName,
    gradeLevel: normalizedGradeLevel,
    totalGrade: 0,
    subjectCount: 0
   };
   existing.totalGrade += Number(grade);
   existing.subjectCount += 1;
   if (!existing.gradeLevel && normalizedGradeLevel) existing.gradeLevel = normalizedGradeLevel;
   studentMap.set(studentId, existing);
  }
 }

 // Also fallback to any graded assessment records for students who may not have category weights computed yet
 if (studentMap.size === 0 && Array.isArray(records) && records.length > 0) {
  for (const r of records) {
   if (r.status !== 'graded' || r.score === null || !(r.max > 0)) continue;
   if (sectionFilter && r.section !== sectionFilter) continue;
   if (subjectFilter && r.subject !== subjectFilter) continue;
   const student = r.student || {};
   const studentName = student.fullName || student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || 'Student';
   const studentId = student.uid || student.id || JSON.stringify([studentName, r.section]);
   const rawGradeLevel = r.grade || student.gradeLevel || sectionGradeMap.get(String(r.section || '').trim().toLowerCase()) || 'Grade 11';
   const normalizedGradeLevel = /12/.test(String(rawGradeLevel)) ? 'Grade 12' : (/11/.test(String(rawGradeLevel)) ? 'Grade 11' : rawGradeLevel);
   const existing = studentMap.get(studentId) || {
    studentId,
    name: studentName,
    section: r.section,
    gradeLevel: normalizedGradeLevel,
    totalGrade: 0,
    subjectCount: 0
   };
   existing.totalGrade += (r.score / r.max) * 100;
   existing.subjectCount += 1;
   studentMap.set(studentId, existing);
  }
 }

 return Array.from(studentMap.values())
  .filter(s => s.subjectCount > 0)
  .map(s => ({
   ...s,
   gwa: s.totalGrade / s.subjectCount
  }))
  .sort((a, b) => b.gwa - a.gwa || b.subjectCount - a.subjectCount || a.name.localeCompare(b.name));
}

function renderGwaLeaderRows(items, limit = 5) {
 const topItems = items.slice(0, limit);
 if (!topItems.length) {
  return `<p class="text-xs text-black-fade italic py-3 px-3 bg-slate-50/60 rounded-xl text-center m-0" style="color: rgba(0, 0, 0, 0.45);">No GWA Records In This Level.</p>`;
 }
 return topItems.map((r, i) => {
  const studentName = esc(r.name || 'Student');
  let rankBadge = `<span class="font-bold text-slate-500 text-xs w-7 text-center shrink-0">${i + 1}</span>`;
  if (i === 0) {
   rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold text-xs shadow-2xs shrink-0"><i class="fa-solid fa-medal text-amber-500 mr-0.5"></i>1</span>`;
  } else if (i === 1) {
   rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs shadow-2xs shrink-0"><i class="fa-solid fa-medal text-slate-400 mr-0.5"></i>2</span>`;
  } else if (i === 2) {
   rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-bold text-xs shadow-2xs shrink-0"><i class="fa-solid fa-medal text-amber-700 mr-0.5"></i>3</span>`;
  }
  const gwaFormatted = r.gwa.toFixed(2);
  const subtitleParts = [r.gradeLevel, r.section, `${r.subjectCount} ${r.subjectCount === 1 ? 'subject' : 'subjects'}`].filter(Boolean);
  const avatarHtml = (typeof window.renderUserAvatarHtml === 'function' && window.renderUserAvatarHtml(r.student || r.name, 'sm'))
   || `<div class="sigma-user-avatar sigma-user-avatar--sm"><i class="fa-solid fa-user"></i></div>`;
  return `
   <div class="flex items-center justify-between gap-3 py-2.5 px-2.5 rounded-xl hover:bg-slate-50/80 transition-colors border-b border-slate-100/60 last:border-b-0">
    <div class="flex items-center gap-3 min-w-0">
     ${rankBadge}
     ${avatarHtml}
     <div class="min-w-0">
      <strong class="text-xs font-bold text-slate-900 block truncate leading-snug">${studentName}</strong>
      <p class="text-[11px] text-black-fade font-normal m-0 truncate mt-0.5 leading-snug" style="color: rgba(0, 0, 0, 0.45);">${subtitleParts.map(esc).join(' · ')}</p>
     </div>
    </div>
    <span class="text-xs font-bold text-[#15803d] shrink-0 font-['Inter']">${gwaFormatted}</span>
   </div>
  `;
 }).join('');
}

function renderOverviewGwaList(allGwaRankings, activeLevelFilter = '') {
 const effectiveFilter = activeLevelFilter || overviewGradeFilter || '';
 if (effectiveFilter) {
  const levelItems = allGwaRankings.filter(r => r.gradeLevel === effectiveFilter);
  return `
   <div class="pt-1">
    <section class="mb-2 last:mb-0">
     <div class="flex items-center justify-between mb-3 px-1">
      <h4 class="text-xs font-bold text-slate-800 tracking-tight m-0">Top GWA — ${esc(effectiveFilter)}</h4>
     </div>
     <div class="space-y-1">
      ${renderGwaLeaderRows(levelItems, 10)}
     </div>
    </section>
   </div>
  `;
 }

 const grade11Items = allGwaRankings.filter(r => r.gradeLevel === 'Grade 11');
 const grade12Items = allGwaRankings.filter(r => r.gradeLevel === 'Grade 12');

 return `
  <div class="pt-1">
   <section class="mb-5">
    <div class="flex items-center justify-between mb-3 px-1">
     <h4 class="text-xs font-bold text-slate-800 tracking-tight m-0">All Grade Levels (Overall Top GWA)</h4>
    </div>
    <div class="space-y-1">
     ${renderGwaLeaderRows(allGwaRankings, 5)}
    </div>
   </section>
   <div class="border-t border-slate-100 my-4"></div>
   <section class="mb-5">
    <div class="flex items-center justify-between mb-3 px-1">
     <h4 class="text-xs font-bold text-slate-800 tracking-tight m-0">Grade 11 Top GWA</h4>
    </div>
    <div class="space-y-1">
     ${renderGwaLeaderRows(grade11Items, 5)}
    </div>
   </section>
   <div class="border-t border-slate-100 my-4"></div>
   <section class="mb-0">
    <div class="flex items-center justify-between mb-3 px-1">
     <h4 class="text-xs font-bold text-slate-800 tracking-tight m-0">Grade 12 Top GWA</h4>
    </div>
    <div class="space-y-1">
     ${renderGwaLeaderRows(grade12Items, 5)}
    </div>
   </section>
  </div>
 `;
}

function buildGwaLevelSelectorHtml() {
 const effectiveVal = overviewGwaLevelFilter || overviewGradeFilter || '';
 const options = [
  { value: '', label: 'All Levels' },
  { value: 'Grade 11', label: 'Grade 11' },
  { value: 'Grade 12', label: 'Grade 12' }
 ];
 const currentLabel = options.find(o => o.value === effectiveVal)?.label || 'All Levels';
 return `
  <div id="perf-gwa-level-selector-wrap" class="shrink-0">
   <details class="sigma-quarter-dropdown" style="--quarter-control-width: 150px;">
    <summary aria-label="GWA Grade Level Filter">
     <span class="sigma-quarter-full-label truncate">${esc(currentLabel)}</span>
     <span class="sigma-quarter-mobile-label truncate">${esc(currentLabel)}</span>
     <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
    </summary>
    <div class="sigma-quarter-dropdown-menu" style="min-width: calc(100% + 2px); width: max-content;">
     ${options.map(item => `
      <button type="button" aria-pressed="${String(item.value) === String(effectiveVal)}" onclick="this.closest('details').open=false; window.selectPerformanceGwaLevel('${esc(item.value)}')">
       <span>${esc(item.label)}</span>
      </button>
     `).join('')}
    </div>
   </details>
  </div>
 `;
}

window.selectPerformanceGwaLevel = function(level) {
 overviewGwaLevelFilter = level || '';
 const wrap = document.getElementById('perf-gwa-level-selector-wrap');
 if (wrap) {
  wrap.outerHTML = buildGwaLevelSelectorHtml();
 }
 const allGwaRankings = computeStudentGwaRankings(overviewGradesQuarter, overviewSectionFilter, overviewSubjectFilter);
 const container = document.getElementById('admin-overview-gwa-list');
 if (container) {
  container.innerHTML = renderOverviewGwaList(allGwaRankings, overviewGwaLevelFilter);
 }
};

function renderOverview(rows) {

 const host = document.getElementById('performance-live-overview');
 if (!host) return;

 const syLabel = selectedPerfSchoolYear ? `S.Y. ${selectedPerfSchoolYear}` : getActiveSYLabel();

 // Filter rows based on overview filters
 let filteredRows = rows;
 if (overviewGradeFilter) {
  filteredRows = filteredRows.filter(r => (r.grade || r.student?.gradeLevel) === overviewGradeFilter);
 }
 if (overviewSectionFilter) {
  filteredRows = filteredRows.filter(r => r.section === overviewSectionFilter);
 }
 if (overviewSubjectFilter) {
  filteredRows = filteredRows.filter(r => r.subject === overviewSubjectFilter);
 }

 const graded = filteredRows.filter(r => r.status === 'graded' && r.score !== null && r.max > 0);

 const bands = [
  ['Outstanding (90 - 100)', 90, Infinity],
  ['Very Satisfactory (85 - 89)', 85, 90],
  ['Satisfactory (80 - 84)', 80, 85],
  ['Fairly Satisfactory (75 - 79)', 75, 80],
  ['Did Not Meet Expectations (Below 75)', -Infinity, 75]
 ];
 const distribution = bands.map(([label, min, max]) => {
  const count = graded.filter(r => r.score / r.max * 100 >= min && r.score / r.max * 100 < max).length;
  const percent = graded.length ? count / graded.length * 100 : 0;
  return `<div><div class="flex items-center justify-between"><span>${label}</span><span>${count} ${count === 1 ? 'result' : 'results'} (${percent.toFixed(1)}%)</span></div><div class="w-full rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${percent}%;background:#15803d"></div></div></div>`;
 }).join('');
 const distributionPanel = `<section class="grade-distribution-panel bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs mt-6"><div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4"><h3 class="text-base font-bold text-slate-900 tracking-tight font-['Inter'] m-0">DepEd Grade Distribution</h3><span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#15803d] border border-emerald-200/80"><i class="fa-solid fa-chart-pie text-[11px]"></i> Distribution</span></div><div>${graded.length ? distribution : '<p class="text-xs text-black-fade italic py-4 text-center" style="color: rgba(0, 0, 0, 0.45);">No Graded Assessment Results Yet.</p>'}</div></section>`;

 const allGwaRankings = computeStudentGwaRankings(overviewGradesQuarter, overviewSectionFilter, overviewSubjectFilter);

 const topPerformersPanel = `
  <section class="performance-summary-panel bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs h-full flex flex-col font-['Inter']">
   <div class="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 min-h-[46px]">
    <div class="flex items-center gap-2.5 min-w-0">
     <div class="w-8 h-8 rounded-lg bg-emerald-50 text-[#15803d] flex items-center justify-center text-sm font-bold shadow-2xs shrink-0">
      <i class="fa-solid fa-trophy"></i>
     </div>
     <div class="flex items-center gap-1.5 min-w-0">
      <h3 class="text-base font-bold text-slate-900 tracking-tight font-['Inter'] m-0 whitespace-nowrap">Top GWA Performers</h3>
     </div>
    </div>
   </div>
   <div id="admin-overview-gwa-list" class="flex-1 overflow-y-auto max-h-[520px] pr-1">
    ${renderOverviewGwaList(allGwaRankings, overviewGradeFilter)}
   </div>
  </section>
 `;

 const gradesResults = computeStudentGradesForQuarter(overviewGradesQuarter, overviewGradeFilter, overviewSectionFilter, overviewSubjectFilter);

 const studentGradesPanel = `
  <section class="performance-grades-panel bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs h-full flex flex-col font-['Inter']">
   <div class="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 min-h-[46px]">
    <div class="flex items-center gap-2.5 min-w-0">
     <div class="w-8 h-8 rounded-lg bg-emerald-50 text-[#15803d] flex items-center justify-center text-sm font-bold shadow-2xs shrink-0">
      <i class="fa-solid fa-graduation-cap"></i>
     </div>
     <div class="flex items-center gap-1.5 min-w-0">
      <h3 class="text-base font-bold text-slate-900 tracking-tight font-['Inter'] m-0 whitespace-nowrap">Student Grades</h3>
     </div>
    </div>
    <div class="flex items-center gap-2.5 shrink-0">
     ${buildQuarterSelectorHtml()}
    </div>
   </div>
   <div id="admin-overview-grades-list" class="flex-1 overflow-y-auto max-h-[520px] pr-1">
    ${renderOverviewGradesList(overviewGradesQuarter, overviewGradeFilter, overviewSectionFilter, overviewSubjectFilter, gradesResults)}
   </div>
  </section>
 `;

 // Build Grade Level, Section, Subject options
 const gradeLevels = Array.from(new Set(records.map(r => r.grade).filter(Boolean)));
 if (!gradeLevels.includes('Grade 11')) gradeLevels.push('Grade 11');
 if (!gradeLevels.includes('Grade 12')) gradeLevels.push('Grade 12');
 gradeLevels.sort();

 const sectionSet = new Set(records.map(r => r.section).filter(Boolean));
 try {
  const rawSec = JSON.parse(localStorage.getItem('sigma-admin-sections') || '[]');
  if (Array.isArray(rawSec)) rawSec.forEach(s => { const name = s.name || s.sectionName; if (name) sectionSet.add(name); });
 } catch (_) {}
 const sections = Array.from(sectionSet).sort();

 const subjectSet = new Set(records.map(r => r.subject).filter(Boolean));
 try {
  const rawSub = JSON.parse(localStorage.getItem('sigma-admin-subjects') || '[]');
  if (Array.isArray(rawSub)) rawSub.forEach(s => { const name = s.name || s.title || s.subjectName; if (name) subjectSet.add(name); });
 } catch (_) {}
 const subjects = Array.from(subjectSet).sort();

 const filterBarHtml = `
  <div class="performance-overview-filters flex flex-wrap items-center justify-between gap-4 mb-6 font-['Inter']">
   <div class="flex flex-wrap items-center gap-3">
    ${buildOverviewFilterDropdownHtml('perf-overview-grade', gradeLevels, overviewGradeFilter, 'All Grade Levels', 'grade', 165)}
    ${buildOverviewFilterDropdownHtml('perf-overview-section', sections, overviewSectionFilter, 'All Sections', 'section', 150)}
    ${buildOverviewFilterDropdownHtml('perf-overview-subject', subjects, overviewSubjectFilter, 'All Subjects', 'subject', 180)}
   </div>

   <div class="shrink-0">
    ${buildPerformanceSYSelectorHtml()}
   </div>
  </div>
 `;

 host.innerHTML = `
  ${filterBarHtml}
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
   <div class="flex flex-col">
    ${topPerformersPanel}
   </div>
   <div class="flex flex-col">
    ${studentGradesPanel}
   </div>
  </div>
  ${distributionPanel}
 `;
}

function paginatePerformanceRows() {
 const body=document.getElementById('performanceReportTableBody');
 const table=body?.closest('table');if(!table||!window.SigmaLogPagination)return;
 table.dataset.pageSize ||= String(performancePageSize);

 const rows=Array.from(body.rows).filter(row=>row.cells.length>1);
 window.SigmaLogPagination.setRecords(table,rows,row=>row,{reset:true});
 const wrap=table.closest('.performance-records-table-wrap');
 const footer=wrap?.querySelector('.sigma-log-pagination');
 if(footer)wrap.after(footer);
}
function setupPerformanceDropdowns(){
 const toolbar=document.querySelector('.performance-records-toolbar');if(!toolbar)return;
 const search=toolbar.querySelector('#perf-search-input');if(search)toolbar.prepend(search);
 for(const id of ['perf-filter-quarter','perf-filter-subject','perf-filter-type']){
  const select=document.getElementById(id);if(!select)continue;
  toolbar.querySelector(`[data-select-for="${id}"]`)?.remove();
  select.hidden=true;
  const dropdown=document.createElement('details');dropdown.className='sigma-quarter-dropdown performance-filter-dropdown';dropdown.dataset.selectFor=id;
  const summary=document.createElement('summary');summary.setAttribute('aria-label',select.getAttribute('aria-label')|| (id==='perf-filter-subject'?'Filter subject':'Filter assessment type'));
  const label=document.createElement('span');label.textContent=select.selectedOptions[0]?.textContent||select.options[0]?.textContent||'';
  const icon=document.createElement('i');icon.className='fa-solid fa-chevron-down';icon.setAttribute('aria-hidden','true');summary.append(label,icon);
  const menu=document.createElement('div');menu.className='sigma-quarter-dropdown-menu';
  for(const option of select.options){
   const button=document.createElement('button');button.type='button';button.textContent=option.textContent;button.setAttribute('aria-pressed',String(option.selected));
   button.onclick=()=>{select.value=option.value;label.textContent=option.textContent;dropdown.open=false;menu.querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));select.dispatchEvent(new Event('change',{bubbles:true}));summary.focus();};menu.append(button);
  }
  dropdown.append(summary,menu);select.after(dropdown);
 }
}
let performancePageSize=20;
function setupPerformanceTabs() {
 const tabOverview = document.getElementById('performance-tab-overview');
 const tabRecords = document.getElementById('performance-tab-records');
 const panelOverview = document.getElementById('performance-live-overview');
 const panelRecords = document.getElementById('performance-records-panel');
 if (!tabOverview || !tabRecords || !panelOverview || !panelRecords) return;

 const switchTab = (activeId) => {
  const isOverview = activeId === 'overview';
  tabOverview.classList.toggle('active', isOverview);
  tabOverview.setAttribute('aria-selected', String(isOverview));
  tabOverview.setAttribute('aria-pressed', String(isOverview));
  tabRecords.classList.toggle('active', !isOverview);
  tabRecords.setAttribute('aria-selected', String(!isOverview));
  tabRecords.setAttribute('aria-pressed', String(!isOverview));
  panelOverview.hidden = !isOverview;
  panelRecords.hidden = isOverview;
 };

 if (tabOverview.dataset.bound !== 'true') {
  tabOverview.dataset.bound = 'true';
  tabOverview.onclick = () => switchTab('overview');
  tabRecords.onclick = () => switchTab('records');
  switchTab(!panelRecords.hidden ? 'records' : 'overview');
 }
}

function refresh() {
 const view = document.getElementById('reports-performance-view');
 if (!view || view.classList.contains('hidden')) return;
 if (!window._gradebookReadCacheActive && window.withGradebookReadCache) {
  return window.withGradebookReadCache(refresh);
 }

 setupPerformanceTabs();
 records = collect();

 const select = document.getElementById('perf-filter-subject');
 const previous = select?.value;

 if (select) {
  select.innerHTML = '<option value="">All Subjects</option>' + [...new Set(records.map(r => r.subject))].sort().map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  select.value = [...select.options].some(option=>option.value===previous) ? previous : '';
 }

 setupPerformanceDropdowns();
 window.applyPerformanceSearch();
}

window.refreshPerformanceReport = refresh;

let refreshTimer;
function scheduleRefresh() {
 const view = document.getElementById('reports-performance-view');
 if (!view || view.classList.contains('hidden')) return;
 clearTimeout(refreshTimer);
 refreshTimer = setTimeout(refresh, 40);
}

document.addEventListener('DOMContentLoaded', () => {
 setupPerformanceTabs();
 scheduleRefresh();
});
window.addEventListener('hashchange', scheduleRefresh);
window.addEventListener('sigma:grades-published', scheduleRefresh);
['sigma:assessment-scored','sigma-gradebook-updated','sigma-assessment-data-updated','sigma:submission-files-updated','sigma-submissions-cleared','sigma:release-config-updated','focus'].forEach(event=>window.addEventListener(event,scheduleRefresh));
window.addEventListener('storage', event => {
 if (!event.key || /grade|score|submission|sigma_sub_|assessment|sigma-admin-(users|sections|subjects)/i.test(event.key)) scheduleRefresh();
});

})();

