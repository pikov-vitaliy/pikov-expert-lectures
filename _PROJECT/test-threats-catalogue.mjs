import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {inflateRawSync} from 'node:zlib';
import {createCsv,csvColumns,labels} from '../threats/_build/catalog-config.mjs';
import {renderThreatRecord} from '../threats/_build/catalog-render.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','threats');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const json=relative=>JSON.parse(read('_build/'+relative));
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const encode=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const source=json('source.json'),decisions=json('decisions.json'),manifest=json('catalog-manifest.json');
const provenance=json('source-provenance.json');
const pages=['index.html','excluded.html'].map(file=>({file,html:read(file)}));
const embedded=(html,id)=>JSON.parse(html.match(new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)</script>`))[1]);

// Inspect the pinned workbook using built-ins; CI does not need Python or Office.
function zipEntries(bytes){
 const eocd=bytes.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));
 assert(eocd>=0,'ZIP directory is present');
 const count=bytes.readUInt16LE(eocd+10),result=new Map();let offset=bytes.readUInt32LE(eocd+16);
 for(let i=0;i<count;i++){
  assert.equal(bytes.readUInt32LE(offset),0x02014b50);
  const method=bytes.readUInt16LE(offset+10),size=bytes.readUInt32LE(offset+20);
  const nameLength=bytes.readUInt16LE(offset+28),extraLength=bytes.readUInt16LE(offset+30),commentLength=bytes.readUInt16LE(offset+32);
  const local=bytes.readUInt32LE(offset+42),name=bytes.subarray(offset+46,offset+46+nameLength).toString('utf8');
  assert(!result.has(name),'Duplicate ZIP member');
  assert.equal(bytes.readUInt32LE(local),0x04034b50);
  const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
  const compressed=bytes.subarray(start,start+size);
  assert([0,8].includes(method),'Supported ZIP compression');
  result.set(name,method===8?inflateRawSync(compressed):compressed);
  offset+=46+nameLength+extraLength+commentLength;
 }
 return result;
}
const entities=value=>value.replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&(lt|gt|amp|quot|apos);/g,(_,n)=>({lt:'<',gt:'>',amp:'&',quot:'"',apos:"'"}[n]));
function workbookRows(entries){
 const strings=[...entries.get('xl/sharedStrings.xml').toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(([,si])=>[...si.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(([,text])=>entities(text)).join('').replace(/_x000D_/g,'').replace(/_x000A_/g,'\n').replace(/\r\n?/g,'\n'));
 const cells=new Map();
 for(const [,attrs,content] of entries.get('xl/worksheets/sheet1.xml').toString('utf8').matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)){
  const ref=attrs.match(/\br="([^"]+)"/)[1],type=attrs.match(/\bt="([^"]+)"/)?.[1],value=content.match(/<v>([\s\S]*?)<\/v>/)?.[1];
  cells.set(ref,value===undefined?null:type==='s'?strings[Number(value)]:Number(value));
 }
 return source.map(record=>Object.fromEntries(Object.keys(record).map((key,i)=>{
  if(key==='row')return [key,record.row];
  const raw=cells.get(String.fromCharCode(65+i)+record.row)??null;
  return [key,['created','updated'].includes(key)&&raw!==null?new Date(Date.UTC(1899,11,30)+raw*86400000).toISOString().slice(0,19).replace('T',' '):raw];
 })));
}
function parseCsv(text){
 const rows=[];let row=[],field='',quoted=false;
 for(let i=text.charCodeAt(0)===0xfeff?1:0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(c===';'&&!quoted){row.push(field);field='';}
  else if((c==='\r'||c==='\n')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);rows.push(row);row=[];field='';}
  else field+=c;
 }
 assert.equal(quoted,false);if(field||row.length){row.push(field);rows.push(row);}return rows;
}
function snapshotTree(directory){
 const result={};
 for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
  const file=path.join(directory,entry.name);
  if(entry.isDirectory())for(const [child,value] of Object.entries(snapshotTree(file)))result[entry.name+'/'+child]=value;
  else result[entry.name]={sha:digest(fs.readFileSync(file)),mtime:fs.statSync(file).mtimeMs};
 }
 return result;
}
function runBuild(directory,args=['--check']){return spawnSync(process.execPath,[path.join(directory,'_build','build.mjs'),...args],{encoding:'utf8'});}
function temporaryCatalogue(fn){
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'pikov-threats-test-'));
 try{fs.cpSync(root,temporary,{recursive:true});return fn(temporary);}
 finally{fs.rmSync(temporary,{recursive:true,force:true});}
}
function catalogueContext(file='index.html',hash='',query=''){
 const html=pages.find(page=>page.file===file).html,elements=new Map(),downloads=[],redirects=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',value:'',hidden:false,listeners:{},classList:{toggle:()=>true},addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(){},focus(){},scrollIntoView(){},click(){},remove(){}});return elements.get(id);};
 element('threat-data').textContent=JSON.stringify(decisions);
 const document={getElementById:element,activeElement:null,querySelectorAll:()=>[],createElement:()=>element('download-anchor'),body:{appendChild(){}},documentElement:{classList:{add(){}}}};
 const location={hash,search:query,pathname:'/'+file,replace:url=>redirects.push(url)};
 class DownloadBlob{constructor(parts){downloads.push(parts.join(''));}}
 const context=vm.createContext({document,location,history:{replaceState(){}},window:{addEventListener(){}},URLSearchParams,URL:{createObjectURL:()=> 'blob:download',revokeObjectURL(){}},Blob:DownloadBlob,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:fn=>fn()});
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
 return {context,elements,downloads,redirects,run:code=>vm.runInContext(code,context)};
}

test('corpus partitions all 227 source records into 177 software and 50 exclusions',()=>{
 assert.equal(source.length,227);assert.deepEqual(source.map(row=>row.id),Array.from({length:227},(_,i)=>i+1));
 assert.equal(decisions.length,227);assert.equal(new Set(decisions.map(row=>row.id)).size,227);
 const count=decision=>decisions.filter(row=>row.decision===decision).length;
 assert.equal(count('include'),68);assert.equal(count('conditional'),109);assert.equal(count('exclude'),50);
 assert.equal(manifest.software,177);assert.equal(manifest.excluded,50);
 assert.equal(new Set([...manifest.softwareIds,...manifest.excludedIds]).size,227);
 assert(!manifest.softwareIds.some(id=>manifest.excludedIds.includes(id)));
 for(const [i,record] of source.entries())for(const [key,value] of Object.entries(record))assert.deepEqual(decisions[i][key],value,`Source field ${record.id}.${key}`);
 assert.equal(digest(encode(source)),provenance.normalizedSourceSha256);
 assert.equal(digest(encode(decisions)),manifest.decisionsSha256);
});

test('public XLSX is the reviewed metadata-only copy and matches all 2724 source values',()=>{
 const workbook=fs.readFileSync(path.join(root,'thrlist.xlsx'));
 assert.equal(digest(workbook),'e412ac6a8a6f49f0e21d532d87d86665c8df95354fa71c9fc0e7201f34f0fa2b');
 assert.equal(digest(workbook),provenance.publicWorkbookSha256);
 assert.equal(manifest.originalSourceSha256,'e189c0971d40cb3093efc0ecc530f344ca6ae1dc3ed3f3916d5e01157058fcb1');
 const entries=zipEntries(workbook);
 assert(![...entries.keys()].some(name=>/vba|macro|externalLinks|embeddings|activeX/i.test(name)));
 for(const [name,content] of entries){
  if(name.endsWith('.rels'))assert.doesNotMatch(content.toString('utf8'),/TargetMode="External"/);
  if(name.endsWith('.xml'))assert.doesNotMatch(content.toString('utf8'),/x15ac:absPath|[A-Z]:\\/);
 }
 assert.doesNotMatch(entries.get('xl/worksheets/sheet1.xml').toString('utf8'),/<f(?:\s|>)|hidden="1"/);
 assert.doesNotMatch(entries.get('xl/workbook.xml').toString('utf8'),/state="(?:hidden|veryHidden)"/);
 assert.deepEqual(workbookRows(entries),source);
});

test('both pages embed the same complete data and preserve archived source records',()=>{
 for(const {html,file} of pages){
  assert.deepEqual(embedded(html,'threat-data'),decisions,file);
  const pageManifest=embedded(html,'catalog-manifest');
  assert.equal(pageManifest.decisionsSha256,manifest.decisionsSha256);
  assert.equal(pageManifest.sourceSha256,provenance.publicWorkbookSha256);
 }
 assert.deepEqual(decisions.filter(row=>row.status==='Архивная').map(row=>row.id),[218,219,220,221,222]);
 assert(decisions.filter(row=>row.status==='Архивная').every(row=>row.notes.includes('https://bdu.fstec.ru/threat/ai')));
});

test('all records and downloads are available in static HTML without JavaScript',()=>{
 for(const {file,html} of pages){
  const expected=decisions.filter(row=>(row.decision==='exclude')===(file==='excluded.html'));
  const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
  assert.deepEqual([...markup.matchAll(/<details class="record" id="ubi-(\d+)"/g)].map(([,id])=>Number(id)),expected.map(row=>row.id));
  assert.match(markup,/<noscript>/);assert.match(markup,/href="thrlist\.xlsx" download/);
  assert.match(markup,/class="brand-back" href="https:\/\/pikov\.expert\/"/);
  assert.match(markup,/актуальность интернет-версии банка не проверялась/);
  for(const [,href] of markup.matchAll(/href="([^"]+)"/g)){
   if(href.startsWith('#')||href.startsWith('https://'))continue;
   assert(fs.existsSync(path.join(root,href.split(/[?#]/)[0])),`Missing local link ${href}`);
  }
 }
});

test('CSV files match complete selections and protect formula-like values',()=>{
 for(const decision of ['software','excluded']){
  const rows=decisions.filter(row=>(row.decision==='exclude')===(decision==='excluded'));
  const csv=read(decision==='software'?'software-threats.csv':'excluded-threats.csv');
  assert.equal(csv,createCsv(rows,csvColumns,labels));
  const parsed=parseCsv(csv);assert.equal(parsed.length,rows.length+1);assert(parsed.every(row=>row.length===20));
 }
 const malicious={...decisions[0],name:'=1+1',object:'@SUM(1)',notes:'"quoted";\nnew line'};
 const parsed=parseCsv(createCsv([malicious],csvColumns,labels));
 assert.equal(parsed[1][1],"'=1+1");assert.equal(parsed[1][2],"'@SUM(1)");assert.equal(parsed[1][18],malicious.notes);
 const rendered=renderThreatRecord({...decisions[0],name:'<img src=x onerror=alert(1)>',rationale:'<script>bad()</script>'},{excluded:false,pageFile:'index.html',labels});
 assert(!rendered.includes('<img'));assert(!rendered.includes('<script>'));assert(rendered.includes('&lt;img'));
});

test('interactive search finds other-catalogue matches and exports the entire selection',()=>{
 const app=catalogueContext();
 assert.equal(app.run('filtered.length'),177);
 assert.equal((app.elements.get('records').innerHTML.match(/<details /g)||[]).length,20);
 app.run('downloadCsv()');assert.equal(parseCsv(app.downloads[0]).length,178);
 app.run("state.query='УБИ.001';render()");
 assert.equal(app.run('filtered.length'),0);
 assert.equal(app.elements.get('other-results').hidden,false);
 assert.equal(app.elements.get('other-results-link').href,'excluded.html?q='+encodeURIComponent('УБИ.001'));
 app.run("state.query='';state.scope='conditional';render()");assert.equal(app.run('filtered.length'),109);
 app.run('reset()');assert.equal(app.run('filtered.length'),177);
});

test('deep links select and open the correct record or redirect to its owning catalogue',()=>{
 const owned=catalogueContext('index.html','#ubi-6');
 assert.equal(owned.run('filtered.length'),1);assert.equal(owned.run('filtered[0].id'),6);assert.equal(owned.elements.get('ubi-6').open,true);
 assert.deepEqual(catalogueContext('index.html','#ubi-1').redirects,['excluded.html#ubi-1']);
 assert.deepEqual(catalogueContext('excluded.html','#ubi-6').redirects,['index.html#ubi-6']);
});

test('analytics runs only on the exact HTTPS production host and never in local copies',()=>{
 const script=pages[0].html.match(/<script data-online-analytics>([\s\S]*?)<\/script>/)[1];
 for(const url of ['file:///C:/private/materials/index.html','http://localhost:51919/','https://preview.example/new/','http://threats.pikov.expert/','https://threats.pikov.expert.evil.test/','https://threats.pikov.expert/?q=private#ubi-6']){
  const location=new URL(url),inserted=[],window={location};
  const document={createElement:()=>({}),getElementsByTagName:()=>[{parentNode:{insertBefore:node=>inserted.push(node)}}]};
  vm.runInNewContext(script,{window,document});
  const expected=location.protocol==='https:'&&location.hostname==='threats.pikov.expert';
  assert.equal(inserted.length,expected?1:0,url);
  if(!expected){assert.equal(window.ym,undefined);continue;}
  assert.equal(inserted[0].src,'https://mc.yandex.ru/metrika/tag.js');
  const init=window.ym.a[0];assert.equal(init[0],109116119);assert.equal(init[1],'init');
  assert.equal(init[2].webvisor,false);assert.equal(init[2].url,'https://threats.pikov.expert/');assert.equal(init[2].referrer,'');
 }
 for(const {html} of pages)assert(!/<noscript>[\s\S]*?mc\.yandex\.ru\/watch/i.test(html));
});

test('generated catalogue is current and --check leaves all files untouched',()=>{
 const before=snapshotTree(root),result=runBuild(root);
 assert.equal(result.status,0,result.stderr||result.stdout);
 assert.deepEqual(snapshotTree(root),before);
});

test('stale output fails check without repair and normal build restores it',()=>temporaryCatalogue(directory=>{
 fs.appendFileSync(path.join(directory,'index.html'),'<!-- stale canary -->');
 const before=snapshotTree(directory),failed=runBuild(directory);
 assert.notEqual(failed.status,0);assert.match(failed.stderr,/Generated catalogue is stale/);
 assert.deepEqual(snapshotTree(directory),before);
 const fixed=runBuild(directory,[]);assert.equal(fixed.status,0,fixed.stderr);assert.equal(runBuild(directory).status,0);
}));

test('tampered source and invalid decisions fail before writing any outputs',()=>temporaryCatalogue(directory=>{
 const originalSource=fs.readFileSync(path.join(directory,'_build/source.json'),'utf8');
 const changed=JSON.parse(originalSource);changed[0].object+=' altered';
 fs.writeFileSync(path.join(directory,'_build/source.json'),JSON.stringify(changed));
 let before=snapshotTree(directory),failed=runBuild(directory,[]);
 assert.notEqual(failed.status,0);assert.match(failed.stderr,/Source fields differ/);assert.deepEqual(snapshotTree(directory),before);
 fs.writeFileSync(path.join(directory,'_build/source.json'),originalSource);
 const file=path.join(directory,'_build/classification-1.json'),classification=JSON.parse(fs.readFileSync(file,'utf8'));
 classification[0].decision='not-a-decision';fs.writeFileSync(file,JSON.stringify(classification));
 before=snapshotTree(directory);failed=runBuild(directory,[]);
 assert.notEqual(failed.status,0);assert.match(failed.stderr,/Invalid decision/);assert.deepEqual(snapshotTree(directory),before);
}));
