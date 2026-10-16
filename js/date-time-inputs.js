(function () {
    'use strict';
    if (window.SigmaDateTimeInputs) return;
    const selector = 'input[type="date"],input[type="time"],input[type="month"],input[type="datetime-local"]';
    const base = document.currentScript.src;
    if (base && !document.querySelector('link[data-sigma-date-time-styles]')) {
        const stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.dataset.sigmaDateTimeStyles = 'true';
        stylesheet.href = new URL('../css/date-time-inputs.css?v=20261015pickerStyles', base).href;
        document.head.append(stylesheet);
    }
    const controls = new WeakMap(), dependencies = new Map();
    let active = null, popup = null, sequence = 0;
    function dependency(file, available) {
        if (available()) return Promise.resolve();
        if (!dependencies.has(file)) dependencies.set(file, new Promise((resolve, reject) => {
            const script = document.createElement('script'); script.src = new URL(file, base).href;
            script.onload = resolve; script.onerror = () => reject(new Error('Unable to load picker.')); document.head.append(script);
        }));
        return dependencies.get(file);
    }
    function close() {
        sequence++;
        if (active) { active.button.setAttribute('aria-expanded', 'false'); active.input.classList.remove('sigma-picker-open'); }
        popup?.remove(); popup = null; active = null;
    }
    function position() {
        if (!active || !popup) return;
        if (!active.input.isConnected || active.input.disabled || active.input.readOnly) { close(); return; }
        const rect = active.button.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) { close(); return; }
        const width = popup.offsetWidth, height = popup.offsetHeight;
        popup.style.setProperty('position','fixed','important');
        popup.style.setProperty('transform','none','important');
        popup.style.setProperty('z-index','1000000','important');
        popup.style.setProperty('left',`${Math.max(8, Math.min(rect.right-width, innerWidth-width-8))}px`,'important');
        const below = rect.bottom + 6;
        popup.style.setProperty('top',`${Math.max(8, Math.min(below + height > innerHeight-8 && rect.top > height+8 ? rect.top-height-6 : below, innerHeight-height-8))}px`,'important');
    }
    function commit(value, dismiss = true) {
        const input = active?.input;
        if (!input || input.disabled || input.readOnly) return false;
        refreshScheduleBounds(input);
        const old = input.value; input.value = value;
        const invalid = input.validity.rangeUnderflow || input.validity.rangeOverflow || input.validity.stepMismatch || input.validity.badInput;
        if (invalid) { input.value = old; popup.querySelector('[data-picker-error]').textContent = 'Choose a value within the allowed range.'; return false; }
        if (dismiss) close();
        if (old !== input.value) { input.dispatchEvent(new Event('input', {bubbles:true})); input.dispatchEvent(new Event('change', {bubbles:true})); }
        return true;
    }
    const pad = number => String(number).padStart(2,'0');
    function refreshScheduleBounds(input) {
        if (['teacher-exact-date-input','teacher-time-input','teacher-exact-end-date-input','teacher-end-time-input'].includes(input.id)) window.keepScheduleDateTimeForward?.(true);
    }
    function button(label, action, icon, iconStyle = 'fa-solid') {
        const node = document.createElement('button'); node.type = 'button'; node.setAttribute('aria-label',label);
        if (icon) { const glyph = document.createElement('i'); glyph.className = `${iconStyle} ${icon}`; node.append(glyph); node.title=label; }
        else node.textContent = label;
        node.onclick = action; return node;
    }
    function renderCalendar() {
        if (!active || !popup) return;
        const {input} = active;
        popup.replaceChildren();
        popup.classList.add('sigma-field-picker--calendar');
        const header = document.createElement('div'); header.className='cal-picker-header';
        const monthMode = active.mode === 'month';
        const minMonth=input.min.slice(0,7), maxMonth=input.max.slice(0,7);
        const displayedMonth=`${active.year}-${pad(active.month+1)}`;
        const title = new Date(active.year,active.month,1).toLocaleDateString('en',{month:'long',year:'numeric'});
        header.append(button('Previous '+(monthMode?'year':'month'),()=>{if(monthMode)active.year--;else {active.month--;if(active.month<0){active.month=11;active.year--;}}renderCalendar();},'fa-chevron-left'),
            button(monthMode?String(active.year):title,()=>{active.mode=monthMode?'day':'month';renderCalendar();}),
            button('Next '+(monthMode?'year':'month'),()=>{if(monthMode)active.year++;else{active.month++;if(active.month>11){active.month=0;active.year++;}}renderCalendar();},'fa-chevron-right'));
        const content = document.createElement('div');
        header.children[0].className='cal-picker-year-btn';
        header.children[1].className='cal-picker-year-label';
        header.children[2].className='cal-picker-year-btn';
        header.children[0].disabled=!!(minMonth && (monthMode?active.year<=Number(minMonth.slice(0,4)):displayedMonth<=minMonth));
        header.children[2].disabled=!!(maxMonth && (monthMode?active.year>=Number(maxMonth.slice(0,4)):displayedMonth>=maxMonth));
        const selected = input.value.split('T')[0].split('-').map(Number);
        if(monthMode) content.innerHTML=window.renderSigmaCalendarMonthPanel({year:active.year,activeYear:selected[0],activeMonth:(selected[1]||0)-1,onYearChange:'SigmaDateTimeInputs.year',onMonthSelect:'SigmaDateTimeInputs.month'});
        else content.innerHTML=window.renderSigmaCalendarDayPanel({year:active.year,month:active.month,activeYear:selected[0],activeMonth:(selected[1]||0)-1,activeDay:selected[2],onDaySelect:'SigmaDateTimeInputs.day'});
        // The shared month renderer owns its own year header.
        if(monthMode) content.querySelector('.cal-picker-header')?.remove();
        if(monthMode)content.querySelectorAll('.cal-picker-month-btn').forEach((item,index)=>{
            const month=`${active.year}-${pad(index+1)}`;
            item.disabled=!!((minMonth && month<minMonth)||(maxMonth && month>maxMonth));
        });
        for (const item of content.querySelectorAll('button.calendar-day-cell')) {
            const value=`${active.year}-${pad(active.month+1)}-${pad(Number(item.textContent))}`;
            item.disabled = !!((input.min && value < input.min.slice(0,10)) || (input.max && value > input.max.slice(0,10)));
        }
        if(!monthMode)header.classList.add('sigma-field-picker-month-header');
        popup.append(header);
        popup.append(content); calendarFooter(input.type==='month'?'This Month':'Today',()=>{
            const today=new Date();active.year=today.getFullYear();active.month=today.getMonth();
            if(input.type==='month') chooseDate(`${active.year}-${pad(active.month+1)}`);else window.SigmaDateTimeInputs.day(active.year,active.month,today.getDate());
        }); position();
    }
    function calendarFooter(label, action) {
        const error=document.createElement('p');error.dataset.pickerError='true';error.setAttribute('role','status');popup.append(error);
        const row=document.createElement('div');row.className='cal-picker-footer';
        const today=button(label,action);today.className='cal-picker-footer-today';
        const mode=button(active.mode==='month'?'Calendar':'Month & Year',()=>{active.mode=active.mode==='month'?'day':'month';renderCalendar();});mode.className='cal-picker-footer-today';
        row.append(today);
        if(active.input.type!=='month')row.append(mode);
        popup.append(row);
    }
    function footer(todayLabel, todayAction) {
        const error=document.createElement('p'); error.dataset.pickerError='true';error.setAttribute('role','status');popup.append(error);
        const row=document.createElement('div');row.className='sigma-field-picker-footer';
        row.append(button('Clear',()=>commit('')));
        if(todayAction)row.append(button(todayLabel,todayAction));
        row.append(button('Done',close)); popup.append(row);
    }
    function chooseDate(value) {
        if(active.input.type==='datetime-local') {active.date=value;active.mode='time';renderTime();}
        else commit(value);
    }
    function renderTime() {
        popup.replaceChildren();
        popup.classList.remove('sigma-field-picker--calendar');
        popup.classList.add('sigma-field-picker--time');
        const initial=active.input.value.split('T').pop();
        const now=new Date();
        const parts=/^(\d{2}):(\d{2})/.exec(initial);
        const hour24=parts?Number(parts[1]):now.getHours();
        const selected={hour:hour24%12||12,minute:parts?Number(parts[2]):now.getMinutes(),period:hour24>=12?'PM':'AM'};
        const update=()=>{active.time=`${pad(selected.hour%12+(selected.period==='PM'?12:0))}:${pad(selected.minute)}`;};
        update();
        const columns=document.createElement('div');columns.className='sigma-time-columns';popup.append(columns);
        for(const [key,label,values] of [
            ['hour','Hour',Array.from({length:12},(_,i)=>i+1)],
            ['minute','Minute',Array.from({length:60},(_,i)=>i)],
            ['period','AM/PM',['AM','PM']]
        ]) {
            const column=document.createElement('div');column.className='sigma-time-column';
            const heading=document.createElement('div');heading.className='sigma-time-column-label';heading.textContent=label;
            const list=document.createElement('div');list.className='sigma-time-options';list.setAttribute('role','group');list.setAttribute('aria-label',label);
            for(const value of values) {
                const item=button(typeof value==='number'?pad(value):value,()=>{
                    selected[key]=value;update();
                    for(const option of list.children)option.setAttribute('aria-pressed',String(option===item));
                    popup.querySelector('[data-picker-error]').textContent='';
                });
                item.dataset.timePart=key;item.dataset.timeValue=String(value);
                item.setAttribute('aria-label',`${label} ${typeof value==='number'?pad(value):value}`);
                item.setAttribute('aria-pressed',String(selected[key]===value));
                item.addEventListener('keydown',event=>{
                    const index=values.indexOf(value);
                    const next=event.key==='ArrowDown'?Math.min(index+1,values.length-1):event.key==='ArrowUp'?Math.max(index-1,0):event.key==='Home'?0:event.key==='End'?values.length-1:null;
                    if(next===null)return;
                    event.preventDefault();list.children[next].focus();list.children[next].click();
                });
                list.append(item);
            }
            column.append(heading,list);columns.append(column);
        }
        footer(null,null);
        popup.querySelector('.sigma-field-picker-footer button:last-child').onclick=()=>{
            commit(active.input.type==='datetime-local'?`${active.date}T${active.time}`:active.time);
        };
        position();
        for(const list of columns.querySelectorAll('.sigma-time-options')){
            const selectedItem=list.querySelector('[aria-pressed="true"]');
            list.scrollTop=selectedItem.offsetTop-(list.clientHeight-selectedItem.offsetHeight)/2;
        }
    }
    async function open(control) {
        if(control.input.disabled || control.input.readOnly)return;
        refreshScheduleBounds(control.input);
        if(active===control){close();return;}
        close(); active=control; const ticket=sequence;
        try {
            if(control.input.type!=='time')await dependency('calendar.js',()=>typeof window.renderSigmaCalendarDayPanel==='function');
            if(ticket!==sequence || active!==control || !control.input.isConnected)return;
            const parts=control.input.value.split('T')[0].split('-').map(Number), date=parts[0]&&parts[1]?new Date(parts[0],parts[1]-1,parts[2]||1):new Date();
            control.year=date.getFullYear();control.month=date.getMonth();control.mode=control.input.type==='time'?'time':control.input.type==='month'?'month':'day';
            popup=document.createElement('div');popup.className='sigma-field-picker';popup.id='sigma-field-picker';popup.setAttribute('role','dialog');popup.setAttribute('aria-label',control.input.type==='time'?'Choose time':'Choose date');
            document.body.append(popup);control.button.setAttribute('aria-expanded','true');control.input.classList.add('sigma-picker-open');
            if(control.mode==='time')renderTime();else renderCalendar();
            (popup.querySelector('[data-time-part][aria-pressed="true"]')||popup.querySelector('button'))?.focus({preventScroll:true});
        }catch(error){close();console.warn(error.message);}
    }
    function enhance(input) {
        if(controls.has(input)||input.dataset.sigmaNativePicker==='true'||input.hidden||input.classList.contains('hidden'))return;
        const wrapper=document.createElement('span');wrapper.className='sigma-date-time-field';input.before(wrapper);wrapper.append(input);
        const trigger=button(input.type==='time'?'Choose time':'Choose date',()=>open(controls.get(input)),input.type==='time'?'fa-clock':'fa-calendar',input.type==='time'?'fa-solid':'fa-regular');
        trigger.className='sigma-date-time-trigger';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','sigma-field-picker');wrapper.append(trigger);
        controls.set(input,{input,wrapper,button:trigger});
        const empty=document.createElement('span');empty.className='sigma-date-time-empty';empty.setAttribute('aria-hidden','true');wrapper.append(empty);
        const sync=()=>{
            trigger.disabled=input.disabled||input.readOnly;wrapper.hidden=input.hidden;
            const show=input.readOnly&&!input.value&&(input.type==='date'||input.type==='time');
            empty.hidden=!show;empty.textContent=input.type==='date'?'--/--/----':'--:--';
            empty.style.left=getComputedStyle(input).paddingLeft;
            empty.style.font=getComputedStyle(input).font;
            input.classList.toggle('sigma-picker-empty',show);
        };sync();
        input.addEventListener('input',sync);input.addEventListener('change',sync);
        new MutationObserver(sync).observe(input,{attributes:true,attributeFilter:['disabled','readonly','hidden']});
        input.addEventListener('pointerdown',()=>{if(active)close();});
        input.addEventListener('keydown',event=>{if(event.key==='ArrowDown'&&event.altKey)event.preventDefault();});
    }
    function scan(node) {if(node.matches?.(selector))enhance(node);node.querySelectorAll?.(selector).forEach(enhance);}
    document.addEventListener('pointerdown',event=>{if(active&& !popup?.contains(event.target)&&!active.wrapper.contains(event.target))close();},true);
    document.addEventListener('click',event=>{if(active&&!popup?.contains(event.target)&&!active.wrapper.contains(event.target))close();},true);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active){const target=active.button;close();target.focus({preventScroll:true});}});
    window.addEventListener('resize',position);document.addEventListener('scroll',position,true);
    window.SigmaDateTimeInputs={scan,close,open:input=>{if(!input)return;enhance(input);const control=controls.get(input);if(control)return open(control);},year:delta=>{if(active){active.year+=delta;renderCalendar();}},month:month=>{if(!active)return;active.month=month;if(active.input.type==='month')chooseDate(`${active.year}-${pad(month+1)}`);else{active.mode='day';renderCalendar();}},day:(year,month,day)=>{if(active)chooseDate(`${year}-${pad(month+1)}-${pad(day)}`);}};
    function initialize(){
        scan(document);
        new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)scan(node);if(active&&!active.input.isConnected)close();}).observe(document.body,{childList:true,subtree:true});
    }
    if(document.body)initialize();else document.addEventListener('DOMContentLoaded',initialize,{once:true});
})();
