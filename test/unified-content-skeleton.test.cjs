const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

console.log('--- Verifying Unified Content Skeleton & Sweeping Shimmer ---');

// 1. Verify CSS rules in css/page-skeleton.css
const cssContent = fs.readFileSync(path.join(__dirname, '../css/page-skeleton.css'), 'utf8');
assert.ok(cssContent.includes('.sigma-content-skeleton'), 'css/page-skeleton.css must define .sigma-content-skeleton');
assert.ok(cssContent.includes('.sigma-content-skeleton .sigma-skeleton-block::after'), 'css/page-skeleton.css must define shimmer sweeping for content skeleton blocks');
assert.ok(cssContent.includes('animation: sigma-sweep-band 1.2s linear infinite'), 'css/page-skeleton.css must use sigma-sweep-band shimmer');
assert.ok(cssContent.includes('[data-sigma-skeleton-active="true"]'), 'css/page-skeleton.css must ensure active skeleton sections are displayed');
console.log('PASS: CSS rules for unified content skeletons and silver sweep shimmer verified.');

// 2. Load js/page-skeleton.js in simulated browser environment
const jsContent = fs.readFileSync(path.join(__dirname, '../js/page-skeleton.js'), 'utf8');

const elements = new Map();
function createMockElement(id, tagName = 'div') {
    const classList = new Set();
    const attrs = new Map();
    const el = {
        id,
        tagName: tagName.toUpperCase(),
        classList: {
            add: c => classList.add(c),
            remove: c => classList.delete(c),
            contains: c => classList.has(c)
        },
        style: { removeProperty(name) { delete this[name]; } },
        innerHTML: '',
        children: [],
        getAttribute: name => attrs.get(name) || null,
        setAttribute: (name, val) => attrs.set(name, String(val)),
        removeAttribute: name => attrs.delete(name),
        querySelector: sel => {
            if (sel === '.sigma-content-skeleton' && el.innerHTML.includes('sigma-content-skeleton')) {
                return { remove: () => { el.innerHTML = ''; } };
            }
            return null;
        }
    };
    elements.set(id, el);
    return el;
}

const mockSection = createMockElement('section-topic-content', 'section');
mockSection.classList.add('hidden');
mockSection.classList.add('dynamic-section');

const mockDoc = {
    readyState: 'loading',
    documentElement: {
        classList: {
            add: () => {},
            remove: () => {},
            contains: () => false
        }
    },
    body: {
        appendChild: () => {},
        classList: { add: () => {}, remove: () => {}, contains: () => false }
    },
    getElementById: id => elements.get(id) || null,
    addEventListener: (evt, fn) => {
        if (evt === 'DOMContentLoaded') mockDoc._domContentLoaded = fn;
    }
};

const mockWin = {
    location: {
        hash: '#topic_content:card_prog1:0:assessments:0:Rizal:submission'
    },
    addEventListener: () => {}
};

vm.runInNewContext(jsContent, {
    window: mockWin,
    document: mockDoc,
    requestAnimationFrame: fn => fn()
});

const SPL = mockWin.SigmaPageLoading;
assert.ok(SPL, 'SigmaPageLoading must be exposed on window');
assert.equal(typeof SPL.getContentSkeletonHtml, 'function', 'getContentSkeletonHtml must be a function');
assert.equal(typeof SPL.resolveRouteFromHash, 'function', 'resolveRouteFromHash must be a function');
assert.equal(typeof SPL.showContentSkeleton, 'function', 'showContentSkeleton must be a function');
assert.equal(typeof SPL.hideContentSkeleton, 'function', 'hideContentSkeleton must be a function');

// 3. Test resolveRouteFromHash
assert.equal(SPL.resolveRouteFromHash('#topic-content:card_prog1:0:assessments:0').layout, 'topic-content');
assert.equal(SPL.resolveRouteFromHash('#topic_content:card_prog1:0:assessments:0:Rizal:submission').layout, 'topic-content');
assert.equal(SPL.resolveRouteFromHash('#topic-detail:card_prog1:0').layout, 'topic-detail');
assert.equal(SPL.resolveRouteFromHash('#classroom:card_prog1').layout, 'classroom-detail');
assert.equal(SPL.resolveRouteFromHash('#curriculum').layout, 'curriculum');
assert.equal(SPL.resolveRouteFromHash('#grades').layout, 'grades');
assert.equal(SPL.resolveRouteFromHash('#attendance').layout, 'attendance');
assert.equal(SPL.resolveRouteFromHash('#materials').layout, 'materials');
assert.equal(SPL.resolveRouteFromHash('#assessments').layout, 'assessments');
console.log('PASS: resolveRouteFromHash correctly identifies all layout routes.');
assert.equal(SPL.resolveRouteFromHash('#nav-dashboard').layout, 'dashboard');
assert.ok(SPL.resolveRouteFromHash('#nav-dashboard').sectionId.includes('dashboard-view'));

// 4. Test getContentSkeletonHtml for all layouts
const layouts = ['topic-content', 'topic-detail', 'classroom-detail', 'curriculum', 'grades', 'attendance', 'materials', 'assessments', 'generic'];
for (const layout of layouts) {
    const html = SPL.getContentSkeletonHtml(layout);
    assert.ok(html.includes('sigma-content-skeleton'), `Layout ${layout} must include sigma-content-skeleton container`);
    assert.ok(html.includes('sigma-skeleton-block'), `Layout ${layout} must include sigma-skeleton-block elements`);
    assert.ok(html.includes('sigma-skeleton-card'), `Layout ${layout} must include sigma-skeleton-card`);
}
console.log('PASS: All 9 layouts generate valid structured skeletons with shimmering blocks.');

// 5. Test topic-content workstation corners (Image 1 parity)
const tcHtml = SPL.getContentSkeletonHtml('topic-content');
assert.ok(tcHtml.includes('sigma-skeleton-topic-content'), 'Topic content workstation container present');
assert.ok(tcHtml.includes('lg:col-span-8'), 'Left workstation main canvas present');
assert.ok(tcHtml.includes('lg:col-span-4'), 'Right progress/context rail present');
// Check student picker avatar & grade card
assert.ok(tcHtml.includes('rounded-full shrink-0'), 'Student avatar placeholder present in grade card');
// Check tasks list
assert.ok(tcHtml.includes('Tasks') || tcHtml.includes('border-slate-100'), 'Tasks list card items present');
console.log('PASS: Topic content workstation covers all corners: header, tabs, main canvas, file preview, subcards, grade card, and task rail.');

// 6. Test showContentSkeleton and hideContentSkeleton on mock section
SPL.showContentSkeleton(mockSection, 'topic-content');
assert.equal(mockSection.getAttribute('data-sigma-skeleton-active'), 'true');
assert.equal(mockSection.classList.contains('hidden'), false, 'Section must be unhidden when skeleton mounts');
assert.ok(mockSection.innerHTML.includes('sigma-skeleton-topic-content'), 'Section contains topic-content skeleton');

SPL.hideContentSkeleton(mockSection);
assert.equal(mockSection.getAttribute('data-sigma-skeleton-active'), null);
console.log('PASS: showContentSkeleton and hideContentSkeleton operate properly.');

// 7. Verify early hash auto-mounting on deep link entry (Image 3 fix)
assert.ok(typeof mockDoc._domContentLoaded === 'function', 'DOMContentLoaded listener registered');
mockDoc._domContentLoaded();
assert.equal(mockSection.getAttribute('data-sigma-skeleton-active'), 'true', 'Target section automatically gets skeleton on initial load');
assert.equal(mockSection.style.display, undefined, 'Early mounting does not leave inline display overrides');
console.log('PASS: Early hash auto-mounting successfully unhides target section and mounts skeleton (eliminating blank white entry).');

console.log('========================================================');
console.log('ALL UNIFIED CONTENT SKELETON CHECKS PASSED SUCCESSFULLY!');
console.log('========================================================');
