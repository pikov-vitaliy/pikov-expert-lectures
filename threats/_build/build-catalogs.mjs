import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {labels,pageConfigs,softwareThemes,exclusionThemes,csvColumns,createCsv} from './catalog-config.mjs';
import {renderThreatRecord} from './catalog-render.mjs';
const base=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(base);
const args=process.argv.slice(2);
assert(args.every(arg=>arg==='--check')&&args.length<=1,'Usage: node threats/_build/build.mjs [--check]');
const checkOnly=args.includes('--check');
const read=name=>fs.readFileSync(path.join(base,name),'utf8'),json=name=>JSON.parse(read(name));
const source=json('source.json');
const provenance=json('source-provenance.json');
const publication=json('publication.json');
assert.equal(new URL(publication.origin).origin,publication.origin,'Publication origin must not have a path or trailing slash');
assert(publication.origin.startsWith('https://'),'Public origin must use HTTPS');
const decisions=[1,2,3].flatMap(i=>json(`classification-${i}.json`));
const mapping=new Map(decisions.map(t=>[t.id,t]));
assert.equal(source.length,227,'Unexpected source coverage');
assert.equal(mapping.size,227,'Duplicate or missing classification');
assert.equal(decisions.length,227,'Extra classification');
for(const file of ['review-overrides.json','consistency-overrides.json']){
 const overrides=json(file);
 assert.equal(new Set(overrides.map(t=>t.id)).size,overrides.length,`Duplicate override in ${file}`);
 for(const t of overrides){assert(mapping.has(t.id),`Unknown override ${t.id}`);mapping.set(t.id,{...mapping.get(t.id),...t})}
}
const groupRows=json('exclusion-groups.json'),groups=new Map(groupRows.map(t=>[t.id,t.exclusionGroup]));
assert.equal(groups.size,groupRows.length,'Duplicate excluded group');
const analyticFields=['decision','category','softwareObject','rationale','condition'];
// Source fields cannot be overwritten by analysis or review annotations.
const data=source.map(t=>({...t,...Object.fromEntries(analyticFields.map(key=>[key,mapping.get(t.id)?.[key]])),exclusionGroup:groups.get(t.id)||''}));
for(const [i,t] of data.entries()){
 assert.equal(t.id,i+1,'Unexpected source IDs');assert.equal(t.row,i+3,'Unexpected source row');
 assert(Object.hasOwn(labels,t.decision),`Invalid decision ${t.id}`);
 assert(t.rationale?.trim()&&t.object?.trim(),`Missing object or rationale ${t.id}`);
 if(t.decision==='exclude')assert(exclusionThemes.includes(t.exclusionGroup),`Missing exclusion group ${t.id}`);
 else{assert(softwareThemes.includes(t.category)&&t.softwareObject?.trim()&&t.condition?.trim(),`Missing software context ${t.id}`);assert(!t.exclusionGroup,`Software threat is still in exclusion groups ${t.id}`)}
}
const software=data.filter(t=>t.decision!=='exclude'),excluded=data.filter(t=>t.decision==='exclude');
assert.equal(groups.size,excluded.length,'Excluded groups do not match final decisions');
assert.deepEqual([...groups.keys()].sort((a,b)=>a-b),excluded.map(t=>t.id),'Exclusion groups refer to another partition');
assert.equal(new Set([...software,...excluded].map(t=>t.id)).size,source.length,'Catalog coverage mismatch');
assert(!software.some(t=>excluded.some(x=>x.id===t.id)),'Catalogs overlap');
const encode=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
assert.equal(digest(fs.readFileSync(path.join(root,'thrlist.xlsx'))),provenance.publicWorkbookSha256,'Public workbook differs from reviewed metadata-only copy');
assert.equal(digest(encode(source)),provenance.normalizedSourceSha256,'Source fields differ from the supplied workbook snapshot');
const manifest={sourceFile:'thrlist.xlsx',sourceSheet:'Sheet',sourceRows:[3,229],sourceSha256:provenance.publicWorkbookSha256,originalSourceSha256:provenance.originalWorkbookSha256,decisionsSha256:digest(encode(data)),total:data.length,software:software.length,direct:software.filter(t=>t.decision==='include').length,conditional:software.filter(t=>t.decision==='conditional').length,excluded:excluded.length,overlap:0,missing:0,softwareIds:software.map(t=>t.id),excludedIds:excluded.map(t=>t.id)};
const template=read('page.html'),scriptTemplate=read('catalog.js'),outputs=new Map();
const replace=(text,replacements)=>{for(const [token,value] of Object.entries(replacements)){assert(text.includes(token),`Missing template token ${token}`);text=text.replaceAll(token,()=>value)}return text};
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const page of pageConfigs){
 const count=page.kind==='excluded'?excluded.length:software.length;
 const pageData=page.kind==='excluded'?excluded:software;
 const canonical=publication.origin+(page.kind==='software'?'/':'/'+page.file);
 const title=page.title+' | '+publication.siteName;
 const description=page.kind==='excluded'?`Авторская адаптация БДУ ФСТЭК России: ${count} угроз, исключённых из выбранной области анализа ПО, с обоснованиями автора. Неофициальный материал.`:`Авторская адаптация БДУ ФСТЭК России для разработки моделей угроз ПО: ${count} записей с обоснованиями и условиями. Мнение Виталия Пикова, не позиция регулятора.`;
 const structuredData={'@context':'https://schema.org','@type':['CollectionPage','CreativeWork'],name:page.title,url:canonical,inLanguage:'ru',description,isPartOf:{'@type':'WebSite',name:'pikov.expert',url:publication.mainUrl},breadcrumb:{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:publication.sectionName,item:publication.sectionUrl},{'@type':'ListItem',position:2,name:page.catalogTitle,item:canonical}]}};
 const meta=`<meta name="author" content="${escapeHtml(publication.author)}">\n<meta name="robots" content="index, follow">\n<meta name="theme-color" content="#174b3d">\n<link rel="canonical" href="${canonical}">\n<meta property="og:type" content="website">\n<meta property="og:locale" content="ru_RU">\n<meta property="og:site_name" content="${escapeHtml(publication.siteName)}">\n<meta property="og:title" content="${escapeHtml(title)}">\n<meta property="og:description" content="${escapeHtml(description)}">\n<meta property="og:url" content="${canonical}">\n<script type="application/ld+json">${encode(structuredData)}</script>`;
 const publicMeta=meta+'\n<meta property="og:image" content="https://pikov.expert/photo.jpg">';
 const script=replace(scriptTemplate,{'__PAGE_CONFIG__':encode(page),'__DECISION_LABELS__':encode(labels),'__THEMES__':encode(page.kind==='excluded'?exclusionThemes:softwareThemes),'__CSV_COLUMNS__':encode(csvColumns),'__CREATE_CSV__':createCsv.toString(),'__RENDER_RECORD__':renderThreatRecord.toString()});
 new vm.Script(script,{filename:page.file});
 const switches=pageConfigs.map(p=>`<a href="${p.file}"${p.kind===page.kind?' aria-current="page"':''}>${p.kind==='excluded'?'Вне области ПО':'Для ПО'} <small>${p.kind==='excluded'?excluded.length:software.length}</small></a>`).join('');
 const methodCounts=`Оба каталога используют один набор решений: <strong>${software.length}</strong> угроз для ПО (${manifest.direct} с прямой применимостью и ${manifest.conditional} для отдельных классов) и <strong>${excluded.length}</strong> вне области ПО. Вместе — <strong>${data.length}</strong> записей, без пересечений и пропусков. Обоснования на страницах и в выгрузках совпадают.`;
 const rendered=replace(template,{'__PAGE_TITLE__':escapeHtml(title),'__META_DESCRIPTION__':escapeHtml(description),'__PUBLICATION_META__':publicMeta,'__SECTION_URL__':escapeHtml(publication.sectionUrl),'__MAIN_URL__':escapeHtml(publication.mainUrl),'__STATIC_RECORDS__':pageData.map(t=>renderThreatRecord(t,{excluded:page.kind==='excluded',pageFile:page.file,labels})).join(''),'__STATIC_TOTALS__':`${count} ${page.kind==='excluded'?'вне области ПО':'в выборке ПО'}`,'__METHOD_COUNTS__':methodCounts,'__CSV_FILE__':page.csvFile,'__PAGE_SUBTITLE__':page.subtitle,'__PAGE_KIND__':page.kind,'__PAGE_HEADING__':page.heading,'__PAGE_NOTE__':page.note,'__SWITCHER__':switches,'__CATALOG_TITLE__':page.catalogTitle,'__CATALOG_SUBTITLE__':page.catalogSubtitle,'__OTHER_FILE__':page.otherFile,'__OTHER_LABEL__':page.otherLabel,'__THIRD_COLUMN__':page.thirdColumn,'__THREAT_DATA__':encode(data),'__APP_SCRIPT__':script});
 const html=rendered.replace('</body>',`<script id="catalog-manifest" type="application/json">${encode({...manifest,kind:page.kind,count})}</script>\n</body>`);
 outputs.set(page.file,html);outputs.set(page.csvFile,createCsv(page.kind==='excluded'?excluded:software,csvColumns,labels));
}
outputs.set('_build/decisions.json',JSON.stringify(data,null,2)+'\n');
outputs.set('_build/catalog-manifest.json',JSON.stringify(manifest,null,2)+'\n');
outputs.set('favicon.svg',read('favicon.svg'));
// robots.txt and sitemap.xml belong to the repository's site-control generator.
// Validate both embedded datasets before writing either landing page.
for(const file of ['index.html','excluded.html'])assert.deepEqual(JSON.parse(outputs.get(file).match(/<script id="threat-data" type="application\/json">([\s\S]*?)<\/script>/)[1]),data,`Embedded corpus mismatch: ${file}`);
if(checkOnly){
 const stale=[...outputs].filter(([file,content])=>!fs.existsSync(path.join(root,file))||fs.readFileSync(path.join(root,file),'utf8')!==content).map(([file])=>file);
 assert.deepEqual(stale,[],'Generated catalogue is stale; run node threats/_build/build.mjs');
}else{
 for(const [file,content] of outputs)fs.writeFileSync(path.join(root,file+'.tmp'),content);
 for(const file of outputs.keys())fs.renameSync(path.join(root,file+'.tmp'),path.join(root,file));
}
console.log(JSON.stringify({mode:checkOnly?'check':'write',total:manifest.total,software:manifest.software,direct:manifest.direct,conditional:manifest.conditional,excluded:manifest.excluded,overlap:0,missing:0,pages:pageConfigs.map(p=>p.file)}));
