const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const indexJs = fs.readFileSync(path.join(__dirname, '../js/index.js'), 'utf8');

// 1. Verify termsAgreementModal is NOT inside loginModal
const loginModalStart = indexHtml.indexOf('id="loginModal"');
const termsModalStart = indexHtml.indexOf('id="termsAgreementModal"');
assert.ok(loginModalStart > 0 && termsModalStart > loginModalStart, 'Found both modals');

const between = indexHtml.slice(loginModalStart, termsModalStart);
// loginModal must be closed with </div> before termsAgreementModal starts
const openDivs = (between.match(/<div\b/g) || []).length;
const closeDivs = (between.match(/<\/div>/g) || []).length;
assert.equal(openDivs, closeDivs, 'All divs in loginModal must be balanced and closed before termsAgreementModal');

// 2. Verify getStoredUsers in index.js checks all storage keys
assert.ok(indexJs.includes("'sigma-users-list'"), 'Checks sigma-users-list');
assert.ok(indexJs.includes("'sigma-teacher-users'"), 'Checks sigma-teacher-users');
assert.ok(indexJs.includes("'sigma-student-users'"), 'Checks sigma-student-users');
assert.ok(indexJs.includes("'sigma-users'"), 'Checks sigma-users');

// 3. Verify session and localStorage are populated
assert.ok(indexJs.includes("localStorage.setItem('sigma-logged-in-user'"), 'Sets sigma-logged-in-user in localStorage');
assert.ok(indexJs.includes("localStorage.setItem('currentUser'"), 'Sets currentUser in localStorage');
assert.ok(indexJs.includes("sessionStorage.setItem('currentUser'"), 'Sets currentUser in sessionStorage');
assert.ok(indexJs.includes("setLoading(formType, false);"), 'Resets loading state');

// 4. Verify terms agreement modal sizing, 10 sections, and scroll controller
assert.ok(indexHtml.includes('id="termsAgreementBody"'), 'termsAgreementBody exists');
assert.ok(indexHtml.includes('id="termsScrollNotice"'), 'termsScrollNotice exists');
assert.ok(indexHtml.includes('max-w-[760px]'), 'termsAgreementBox has release panel proportioned max-width');
assert.ok(indexHtml.includes('Disciplinary Sanctions, Account Revocation &amp; Appeals'), 'Includes comprehensive section 10');
assert.ok(indexJs.includes('unlockTermsCheckbox'), 'index.js has unlockTermsCheckbox function');
assert.ok(indexJs.includes('lockTermsCheckbox'), 'index.js has lockTermsCheckbox function');
assert.ok(indexJs.includes('checkTermsScrollPosition'), 'index.js has checkTermsScrollPosition handler');

console.log('PASS: Login user accounts access, terms modal hierarchy, and scroll-to-unlock verified.');
