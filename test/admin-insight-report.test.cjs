const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        const calls = [];
        await page.route('http://sigma.test/**', route => {
            const url = new URL(route.request().url());
            if (!url.pathname.includes('/api/')) return route.fulfill({body: '<html></html>', contentType:'text/html'});
            calls.push({method:route.request().method(), action:url.searchParams.get('action')});
            return route.fulfill({json:{success:true,users:[
                {id:'student-1',name:'Juan Dela Cruz',role:'student',lastAnalyzed:1791700000000,cards:[{title:'Complete Pending Learning Tasks',area:'submissions',analyses:[{category:'prescriptive',actionLabel:'Try',text:'<script>alert(1)</script> Complete the remaining task.'}]}]},
                {id:'teacher-1',name:'Maria Ramos',role:'teacher',cards:[]}
            ]}});
        });
        await page.goto('http://sigma.test/admin.html');
        await page.setContent(fs.readFileSync(path.join(root,'php/includes/ai_insight_report.php'),'utf8'));
        await page.addStyleTag({content:'.hidden{display:none}body{font-family:Arial;margin:20px}'});
        for (const css of ['sigma-analytics.css','admin-insight-report.css']) await page.addStyleTag({path:path.join(root,'css',css)});
        const source=fs.readFileSync(path.join(root,'js/sigma-analytics.js'),'utf8');
        const renderer=source.slice(source.indexOf('    function renderSigmaGradeMonitoringCardHtml('),source.indexOf('    function createSigmaCardElement('));
        await page.addScriptTag({content:renderer});
        await page.evaluate(()=>sessionStorage.setItem('sigma-authenticated-user',JSON.stringify({id:'0000000'})));
        await page.addScriptTag({path:path.join(root,'js/ai-database-store.js')});
        await page.addScriptTag({path:path.join(root,'js/admin-insight-report.js')});
        await page.locator('#reports-ai-view').evaluate(node=>node.classList.remove('hidden'));
        await page.getByText('Select User Insights to review saved cards by account.').waitFor();
        assert.equal(await page.getByText('1,248').count(),0);
        assert.equal(await page.getByRole('searchbox').count(),0);
        await page.getByRole('tab',{name:'User Insights'}).click();
        await page.getByRole('heading',{name:'Find a user'}).waitFor();
        assert.equal(await page.locator('.insight-user-search-empty').count(),1);
        assert.equal(await page.getByRole('combobox').count(),0);
        const search = page.getByRole('searchbox',{name:'Search user insights by name'});
        await search.fill('Juan');
        await page.getByRole('heading',{name:'Find a user'}).waitFor();
        assert.equal(await page.getByRole('button',{name:'View insights for Juan Dela Cruz'}).count(),0);
        await page.getByRole('button',{name:'Search user insights'}).click();
        await page.getByRole('button',{name:'View insights for Juan Dela Cruz'}).waitFor();
        await page.getByRole('button',{name:'Clear search'}).click();
        await page.getByRole('heading',{name:'Find a user'}).waitFor();
        await search.fill('Juan');
        await page.getByRole('button',{name:'Search user insights'}).click();
        await page.getByRole('button',{name:'View insights for Juan Dela Cruz'}).click();
        await page.getByRole('heading',{name:'Juan Dela Cruz'}).waitFor();
        await page.getByText('ID: student-1').waitFor();
        await page.getByRole('heading',{name:'SIGMA AI Insights'}).waitFor();
        for (const title of ['Subject Insights','Grade Insights']) await page.getByRole('heading',{name:title}).waitFor();
        assert.equal(await page.getByRole('heading',{name:'Assessment Insights'}).count(),0);
        assert.equal(await page.locator('.insight-generated-card').count(),1);
        assert.equal(await page.locator('.insight-user-panel script').count(),0);
        for(const width of [390,1200]){
            await page.setViewportSize({width,height:850});
            assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
            await page.screenshot({path:path.join(os.tmpdir(),`sigma-admin-insights-${width}.png`),fullPage:true});
        }
        assert.equal(await page.getByRole('button',{name:'Back to User Insights'}).count(),0);
        assert.equal(await page.getByRole('button',{name:'Refresh insights'}).count(),0);
        assert.equal(await page.getByRole('tab').count(),0);
        assert.ok(calls.some(call=>call.action==='report'));
        assert.ok(calls.every(call=>call.method==='GET'&&['report','logs'].includes(call.action)));
        const live=await fetch('http://localhost/sigma-elms/php/api/ai_records.php?action=report',{headers:{'X-Sigma-Actor':'0000000'}});
        const data=await live.json(); assert.equal(data.success,true,JSON.stringify(data));
        assert.ok(Array.isArray(data.users));
        const student=data.users.find(user=>user.role==='student');
        if(student){
            const denied=await fetch('http://localhost/sigma-elms/php/api/ai_records.php?action=report',{headers:{'X-Sigma-Actor':student.id}});
            assert.equal((await denied.json()).success,false);
        }
        console.log(`PASS: shared card rendering, desktop/mobile, filtering, escaping, no generation, live database (${data.users.length} users), admin-only access`);
    }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
