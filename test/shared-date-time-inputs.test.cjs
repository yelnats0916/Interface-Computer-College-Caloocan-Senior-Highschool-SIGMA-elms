const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {chromium} = require('playwright');
const root=path.join(__dirname,'..');
(async()=>{
    const browser=await chromium.launch({channel:'chrome',headless:true});
    try{
        const page=await browser.newPage();
        await page.setContent('<html><body><div style="padding:20px"><label>Date<input id="date" type="date" value="2026-10-11" min="2026-10-11" max="2026-10-20"></label><label>Time<input id="time" type="time" value="09:00"></label><label>Month<input id="month" type="month" value="2026-10"></label><label>Combined<input id="combined" type="datetime-local" value="2026-10-11T09:00"></label><input id="disabled" type="time" disabled><button id="outside">Outside</button></div></body></html>');
        await page.addStyleTag({content:'body{font:14px Arial;margin:0}label{display:block;margin-bottom:18px}input{box-sizing:border-box;height:40px;border:1px solid #dce4ee;border-radius:8px;padding:0 12px;background:white}'});
        await page.addStyleTag({path:path.join(root,'css/date-time-inputs.css')});
        await page.addStyleTag({path:path.join(root,'css/calendar.css')});
        await page.addStyleTag({path:path.join(root,'css/mobile.css')});
        const calendar=fs.readFileSync(path.join(root,'js/calendar.js'),'utf8');
        await page.addScriptTag({content:"const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];"+calendar.slice(calendar.indexOf('    window.renderSigmaCalendarMonthPanel'),calendar.indexOf('    function updateTopbarCalendarDate'))});
        await page.addScriptTag({path:path.join(root,'js/time-picker-dial.js')});
        await page.addScriptTag({path:path.join(root,'js/date-time-inputs.js')});
        await page.locator('#date').evaluate(node=>node.max='2026-11-20');
        await page.evaluate(()=>{window.events=[];for(const id of ['date','time','month','combined'])for(const type of ['input','change'])document.getElementById(id).addEventListener(type,()=>events.push(id+':'+type));});
        for(const width of [390,1200]){
            await page.setViewportSize({width,height:700});
            await page.locator('#date').click();
            assert.equal(await page.locator('#sigma-field-picker').count(),0);
            assert.equal(await page.locator('#date').evaluate(node=>node===document.activeElement),true);
            await page.locator('#date').fill('2026-10-13');
            assert.equal(await page.locator('#date').inputValue(),'2026-10-13');
            await page.locator('#date').fill('2026-10-11');
            const color=await page.locator('#date + button').evaluate(node=>getComputedStyle(node).color);
            assert.equal(color,'rgb(21, 128, 61)');
            for(const id of ['date','time']){
                const trigger=page.locator('#'+id+' + button');
                await trigger.hover();
                const style=await trigger.evaluate(node=>{const s=getComputedStyle(node);return {radius:s.borderRadius,width:s.width,height:s.height,background:s.backgroundColor};});
                assert.equal(style.radius,'50%');
                assert.equal(style.width,style.height);
                assert.equal(style.background,'rgb(229, 231, 235)');
            }
            assert.equal(await page.locator('#date + button i').evaluate(node=>getComputedStyle(node).fontSize),width<768?'14px':'18px');
            assert.equal(await page.locator('#date + button i').evaluate(node=>node.className),'fa-regular fa-calendar');
            await page.locator('#date + button').click();
            await page.locator('#sigma-field-picker').waitFor();
            await page.locator('#date').click();
            assert.equal(await page.locator('#sigma-field-picker').count(),0);
            await page.locator('#date + button').click();
            await page.locator('#sigma-field-picker').waitFor();
            const anchor=await page.locator('#date + button').boundingBox();
            const panel=await page.locator('#sigma-field-picker').boundingBox();
            assert.ok(Math.abs(panel.y-(anchor.y+anchor.height+6))<1);
            assert.ok(Math.abs(panel.x+panel.width-(anchor.x+anchor.width))<1);
            assert.equal(await page.locator('#sigma-field-picker > .cal-picker-header').innerText(),'October 2026');
            assert.equal(await page.locator('#sigma-field-picker > .cal-picker-header button').count(),3);
            assert.equal(await page.getByRole('button',{name:'Previous month',exact:true}).isDisabled(),true);
            await page.getByRole('button',{name:'Next month',exact:true}).click();
            assert.equal(await page.locator('#sigma-field-picker > .cal-picker-header').innerText(),'November 2026');
            assert.equal(await page.getByRole('button',{name:'Next month',exact:true}).isDisabled(),true);
            await page.getByRole('button',{name:'Previous month',exact:true}).click();
            assert.equal(await page.locator('#sigma-field-picker > .cal-picker-header').innerText(),'October 2026');
            assert.equal(await page.locator('#sigma-field-picker [data-picker-error]').isVisible(),false);
            assert.equal(await page.locator('#sigma-field-picker > .cal-picker-header').evaluate(node=>getComputedStyle(node).paddingBottom),'0px');
            assert.equal(await page.getByRole('button',{name:'Month & Year',exact:true}).count(),1);
            await page.getByRole('button',{name:'Month & Year',exact:true}).click();
            assert.equal(await page.getByRole('button',{name:'Sep',exact:true}).isDisabled(),true);
            await page.getByRole('button',{name:'Oct',exact:true}).click();
            assert.equal(await page.locator('#sigma-field-picker').evaluate(node=>getComputedStyle(node).borderRadius),width<=768?'16px':'18px');
            assert.equal(await page.locator('#sigma-field-picker button.calendar-day-cell').filter({hasText:/^10$/}).isDisabled(),true);
            await page.screenshot({path:path.join(os.tmpdir(),`sigma-custom-date-${width}.png`)});
            await page.locator('#sigma-field-picker button.calendar-day-cell').filter({hasText:/^12$/}).click();
            assert.equal(await page.locator('#date').inputValue(),'2026-10-12');
            await page.locator('#time + button').click();await page.locator('.sigma-time-columns').waitFor();
            assert.equal(await page.locator('[data-time-part="minute"]').count(),60);
            assert.equal(await page.locator('#sigma-field-picker svg').count(),0);
            if(width<768)assert.ok((await page.locator('#sigma-field-picker').boundingBox()).width<=220);
            await page.screenshot({path:path.join(os.tmpdir(),`sigma-custom-time-${width}.png`)});
            await page.getByRole('button',{name:'AM/PM PM',exact:true}).click();
            await page.getByRole('button',{name:'Minute 37',exact:true}).click();
            await page.getByRole('button',{name:'Done',exact:true}).click();
            assert.equal(await page.locator('#time').inputValue(),'21:37');
            await page.locator('#time').evaluate(node=>node.value='09:00');
            await page.locator('#date + button').click();await page.locator('#sigma-field-picker').waitFor();
            await page.locator('#outside').click();assert.equal(await page.locator('#sigma-field-picker').count(),0);
            await page.locator('#time + button').focus();await page.keyboard.press('Enter');await page.locator('#sigma-field-picker').waitFor();
            await page.keyboard.press('Escape');assert.equal(await page.locator('#sigma-field-picker').count(),0);
            assert.equal(await page.locator('#disabled + button').isDisabled(),true);
            assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        }
        await page.locator('#time').evaluate(node=>node.min='10:00');
        await page.locator('#time + button').click();
        await page.getByRole('button',{name:'Done',exact:true}).click();
        assert.equal(await page.locator('#time').inputValue(),'09:00');
        assert.equal(await page.locator('#sigma-field-picker [data-picker-error]').innerText(),'Choose a value within the allowed range.');
        await page.keyboard.press('Escape');
        await page.locator('#month + button').click();await page.getByRole('button',{name:'Nov',exact:true}).click();
        assert.equal(await page.locator('#month').inputValue(),'2026-11');
        await page.locator('#combined + button').click();await page.locator('#sigma-field-picker button.calendar-day-cell').filter({hasText:/^15$/}).click();
        await page.locator('.sigma-time-columns').waitFor();await page.getByRole('button',{name:'Done',exact:true}).click();
        assert.equal(await page.locator('#combined').inputValue(),'2026-10-15T09:00');
        await page.evaluate(()=>{const input=document.createElement('input');input.type='date';input.id='dynamic';document.body.append(input);});
        await page.locator('#dynamic + button').waitFor();
        assert.ok((await page.evaluate(()=>events)).includes('date:change'));
        const live=await browser.newPage({viewport:{width:1200,height:800}});
        await live.addInitScript(()=>sessionStorage.setItem('sigma-authenticated-user',JSON.stringify({id:'0000000',role:'Master Admin'})));
        await live.goto('http://127.0.0.1:5519/admin.html');
        await live.waitForFunction(()=>!!window.SigmaDateTimeInputs);
        await live.evaluate(()=>{
            const panel=document.createElement('div');panel.style.cssText='position:fixed;inset:90px 30px 30px;background:white;z-index:100000;padding:30px;display:flex;align-items:flex-start;gap:16px';
            for(const type of ['date','time']){const input=document.createElement('input');input.type=type;input.id='live-'+type;input.className='sigma-input';input.value=type==='date'?'2026-10-11':'09:00';panel.append(input);}
            document.body.append(panel);
        });
        for(const type of ['date','time']){
            await live.locator('#live-'+type+' + button').click();await live.locator('#sigma-field-picker').waitFor();
            const icon=await live.locator('#live-'+type+' + button i').evaluate(node=>({family:getComputedStyle(node).fontFamily,size:getComputedStyle(node).fontSize,color:getComputedStyle(node.parentElement).color}));
            assert.equal(icon.color,'rgb(21, 128, 61)');assert.equal(icon.size,'18px');
            await live.screenshot({path:path.join(os.tmpdir(),`sigma-live-custom-${type}.png`)});
        }
        console.log('PASS: shared custom date/time/month/datetime pickers, bounds, values/events, disabled, keyboard, dismissal, dynamic inputs, desktop/mobile icons');
    }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
