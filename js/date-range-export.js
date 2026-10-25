(function(){
'use strict';
window.openSigmaDateRangeExport=function({title,from='',to='',onDownload}){
 document.getElementById('sigma-date-range-export')?._sigmaClose?.();
 const overlay=document.createElement('div');overlay.id='sigma-date-range-export';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','sigma-date-export-title');
 const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 overlay.innerHTML=`<form class="sigma-date-export-panel"><header><button type="button" data-exit aria-label="Close export"><i class="fa-solid fa-xmark date-export-desktop"></i><i class="fa-solid fa-chevron-left date-export-mobile"></i></button><h2 id="sigma-date-export-title">${esc(title)}</h2></header><div class="sigma-date-export-body"><h3>Date Range</h3><div class="sigma-date-export-fields"><label>From Date<input type="date" name="from" value="${esc(from)}"></label><label>To Date<input type="date" name="to" value="${esc(to)}"></label></div><p role="alert" data-error></p></div><footer><button type="submit" class="sigma-btn sigma-btn-green"><i class="fa-solid fa-file-pdf"></i><span>Download PDF</span></button></footer></form>`;
 const previous={body:document.body.style.overflow,root:document.documentElement.style.overflow};const opener=document.activeElement;let busy=false;
 const close=()=>{if(busy)return;overlay.remove();document.body.style.overflow=previous.body;document.documentElement.style.overflow=previous.root;document.removeEventListener('keydown',escape);opener?.focus();};
 const escape=e=>{if(e.key==='Escape')close();};overlay._sigmaClose=close;overlay.querySelector('[data-exit]').onclick=close;
 overlay.querySelector('form').oninput=()=>{overlay.querySelector('[data-error]').textContent='';};
 overlay.querySelector('form').onsubmit=async event=>{event.preventDefault();if(busy)return;const form=event.currentTarget,from=form.elements.from.value,to=form.elements.to.value,error=overlay.querySelector('[data-error]'),button=form.querySelector('[type=submit]');error.textContent='';if(from&&to&&from>to){error.textContent='To Date must be on or after From Date.';return;}busy=true;button.disabled=true;button.setAttribute('aria-busy','true');const html=button.innerHTML;button.innerHTML='<span class="sigma-dot-spinner" aria-hidden="true"></span><span>Downloading</span>';try{await onDownload({from,to});busy=false;close();}catch(e){error.textContent=e.message||'Unable to download PDF.';}finally{busy=false;button.disabled=false;button.removeAttribute('aria-busy');button.innerHTML=html;}};
 document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';document.body.append(overlay);document.addEventListener('keydown',escape);overlay.querySelector('input').focus();return overlay;
};
})();
