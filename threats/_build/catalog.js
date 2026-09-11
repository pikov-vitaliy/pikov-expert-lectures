'use strict';
const DATA=JSON.parse(document.getElementById('threat-data').textContent);
const PAGE=__PAGE_CONFIG__;
const labels=__DECISION_LABELS__;
const THEMES=__THEMES__;
const CSV_COLUMNS=__CSV_COLUMNS__;
const createCsv=__CREATE_CSV__;
const renderThreatRecord=__RENDER_RECORD__;
const IS_EXCLUDED=PAGE.kind==='excluded';
const $=id=>document.getElementById(id);
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=id=>'УБИ.'+String(id).padStart(3,'0');
const counts={include:DATA.filter(t=>t.decision==='include').length,conditional:DATA.filter(t=>t.decision==='conditional').length,exclude:DATA.filter(t=>t.decision==='exclude').length};
const belongs=t=>(t.decision==='exclude')===IS_EXCLUDED;
const category=t=>IS_EXCLUDED?t.exclusionGroup:t.category;
const CATALOG=DATA.filter(belongs);
const state={scope:'all',category:'all',query:'',page:1,size:20};
let filtered=[],firstRender=true,notifyTimer;
const normal=v=>String(v??'').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[«»“”]/g,'').replace(/\s+/g,' ').trim();
const index=new Map(DATA.map(t=>[t.id,normal([uid(t.id),t.name,t.object,t.description,t.softwareObject,t.category,t.exclusionGroup,t.rationale,t.condition].join(' '))]));
function radio(name,value,label,count,checked){return `<label class="filter"><input type="radio" name="${name}" value="${escapeHtml(value)}"${checked?' checked':''}><span>${escapeHtml(label)}</span><small>${count}</small></label>`}
function setupFilters(){
 const focused=document.activeElement,focusName=focused?.name,focusValue=focused?.value;
 $('scope-filters').hidden=IS_EXCLUDED;
 if(!IS_EXCLUDED)$('scope-filters').innerHTML='<legend>Применимость</legend>'+[['all','Все для ПО',counts.include+counts.conditional],['include','Прямые',counts.include],['conditional','Для отдельных классов ПО',counts.conditional]].map(([v,l,c])=>radio('scope',v,l,c,state.scope===v)).join('');
 $('category-filters').innerHTML=`<legend>${IS_EXCLUDED?'Область угрозы':'Тематика'}</legend>`+radio('category','all',IS_EXCLUDED?'Все области':'Все темы',CATALOG.length,state.category==='all')+THEMES.map(c=>radio('category',c,c,CATALOG.filter(t=>category(t)===c).length,state.category===c)).join('');
 if(focusName==='scope'||focusName==='category'){const match=[...document.querySelectorAll('input[type=radio]')].find(el=>el.name===focusName&&el.value===focusValue);match?.focus({preventScroll:true})}
}
function record(t,open){return renderThreatRecord(t,{excluded:IS_EXCLUDED,pageFile:PAGE.file,labels},open)}
function render(){
 const query=normal(state.query),num=query.match(/^(?:уби[.\s-]*)?(\d{1,3})$/i);
 const matches=t=>!query||(num?t.id===Number(num[1]):query.split(' ').every(token=>index.get(t.id).includes(token)));
 filtered=CATALOG.filter(t=>(state.scope==='all'||t.decision===state.scope)&&(state.category==='all'||category(t)===state.category)&&matches(t));
 const size=state.size==='all'?Math.max(filtered.length,1):Number(state.size),pages=Math.max(1,Math.ceil(filtered.length/size));state.page=Math.min(state.page,pages);
 const start=(state.page-1)*size,show=filtered.slice(start,start+size);
 $('records').innerHTML=show.map((t,i)=>record(t,!IS_EXCLUDED&&firstRender&&i===0)).join('');firstRender=false;
 $('empty').hidden=filtered.length>0;$('records').hidden=!filtered.length;$('pagination').hidden=!filtered.length;
 $('result-count').textContent=`Найдено угроз: ${filtered.length}`;
 $('page-info').textContent=`${filtered.length?start+1:0}–${Math.min(start+size,filtered.length)} из ${filtered.length}`;
 $('page-number').textContent=`${state.page} / ${pages}`;$('prev').disabled=state.page<=1;$('next').disabled=state.page>=pages;
 $('clear-search').hidden=!state.query;
 $('export-top').disabled=filtered.length===0;$('export-bottom').disabled=filtered.length===0;
 const otherMatches=query?DATA.filter(t=>!belongs(t)&&matches(t)):[];
 $('other-results').hidden=!otherMatches.length;
 if(otherMatches.length){$('other-results-link').textContent=`${IS_EXCLUDED?'В каталоге ПО':'Вне области ПО'} по этому запросу: ${otherMatches.length}`;$('other-results-link').href=PAGE.otherFile+'?q='+encodeURIComponent(state.query)}
 setupFilters();
}
function syncLocation(){const q=state.query?'?q='+encodeURIComponent(state.query):'';try{history.replaceState(null,'',location.pathname+q)}catch{/* Some file:// engines restrict History API; catalog still works. */}}
function reset(){Object.assign(state,{scope:'all',category:'all',query:'',page:1});$('search').value='';syncLocation();render()}
function announce(text){$('notification').textContent=text;clearTimeout(notifyTimer);notifyTimer=setTimeout(()=>$('notification').textContent='',4000)}
function downloadCsv(){
 const csv=createCsv(filtered,CSV_COLUMNS,labels);
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download=PAGE.csvFile;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce(`Выгружено записей: ${filtered.length}. Экспортирована вся текущая выборка.`);
}
$('search').addEventListener('input',e=>{state.query=e.target.value;state.page=1;syncLocation();render()});
$('clear-search').addEventListener('click',()=>{state.query='';$('search').value='';state.page=1;syncLocation();render();$('search').focus()});
$('filters').addEventListener('change',e=>{if(e.target.name==='scope')state.scope=e.target.value;if(e.target.name==='category')state.category=e.target.value;state.page=1;render()});
$('reset').addEventListener('click',reset);$('empty-reset').addEventListener('click',reset);
$('filter-toggle').addEventListener('click',()=>{const open=$('filters').classList.toggle('mobile-open');$('filter-toggle').setAttribute('aria-expanded',String(open))});
$('page-size').addEventListener('change',e=>{state.size=e.target.value;state.page=1;render()});
for(const [id,delta] of [['prev',-1],['next',1]])$(id).addEventListener('click',()=>{state.page+=delta;render();$('results-area').scrollIntoView({behavior:'auto'})});
$('export-top').addEventListener('click',downloadCsv);$('export-bottom').addEventListener('click',downloadCsv);
$('source-total').textContent=DATA.length;$('totals').textContent=IS_EXCLUDED?`${counts.exclude} вне области ПО · ${counts.include+counts.conditional} в каталоге ПО`:`${counts.include+counts.conditional} в выборке ПО · ${counts.exclude} вне области ПО`;
$('method-counts').innerHTML=`Оба каталога используют один набор решений: <strong>${counts.include+counts.conditional}</strong> угроз для ПО (${counts.include} с прямой применимостью и ${counts.conditional} для отдельных классов) и <strong>${counts.exclude}</strong> вне области ПО. Вместе — <strong>${DATA.length}</strong> записей, без пересечений и пропусков. Обоснования на страницах и в выгрузках совпадают.`;
function openHash(){const match=location.hash.match(/^#ubi-(\d+)$/);if(!match)return;const id=Number(match[1]),t=DATA.find(t=>t.id===id);if(!t)return;if(!belongs(t)){location.replace(PAGE.otherFile+'#ubi-'+id);return}state.scope='all';state.category='all';state.query=uid(id);state.page=1;$('search').value=state.query;render();const el=$('ubi-'+id);el.open=true;requestAnimationFrame(()=>el.scrollIntoView({behavior:'auto'}))}
state.query=new URLSearchParams(location.search).get('q')||'';$('search').value=state.query;
render();openHash();window.addEventListener('hashchange',openHash);document.documentElement.classList.add('js-ready');
