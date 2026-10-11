import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
test('offline course applies the same link repairs while preserving captured source bytes',()=>{
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'kapo-handout-'));
 try {
  const build=path.join(temporary,'_build'),source=path.join(build,'course-source');
  fs.mkdirSync(source,{recursive:true});fs.mkdirSync(path.join(temporary,'downloads'));
  const repairs=JSON.parse(read('kapo/_build/external-link-repairs.json'));
  const [original,fix]=Object.entries(repairs)[0];
  const markdown=`# Источник\r\n\r\n[Профиль TAdviser](${original})\r\n\r\n${original}\r\n`;
  fs.writeFileSync(path.join(source,'lesson.md'),markdown);
  fs.writeFileSync(path.join(build,'course-sources.json'),JSON.stringify([{path:'lesson.md',normalizedSha256:hash(markdown.replaceAll('\r\n','\n'))}]));
  fs.writeFileSync(path.join(build,'external-link-repairs.json'),JSON.stringify(repairs));
  fs.copyFileSync(path.join(root,'kapo/_build/build-package.py'),path.join(build,'build-package.py'));
  for(const ext of ['pdf','docx'])fs.writeFileSync(path.join(temporary,'downloads/composition-analysis-national-standard-draft.'+ext),'fixture');
  const result=spawnSync('python',['-X','utf8',path.join(build,'build-package.py')],{encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr||String(result.error));
  const contents=spawnSync('python',['-X','utf8','-c','import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); print(z.read("lesson.md").decode("utf-8"))',path.join(temporary,'downloads/sca-osa-course.zip')],{encoding:'utf8',windowsHide:true});
  assert.equal(contents.status,0,contents.stderr);
  assert.ok(!contents.stdout.includes(original),'Published handout still links to the confirmed missing page');
  assert.ok(contents.stdout.includes(`[${fix.label}](${fix.url})`));
  assert.equal(contents.stdout.split(fix.note).length-1,1);
  assert.equal(fs.readFileSync(path.join(source,'lesson.md'),'utf8'),markdown,'Captured source must remain unchanged');
 } finally {
  assert.equal(path.dirname(path.resolve(temporary)),path.resolve(os.tmpdir()));
  assert.ok(path.basename(temporary).startsWith('kapo-handout-'));
  fs.rmSync(temporary,{recursive:true,force:true});
 }
});
test('KAPO publishes the complete course and original figures without the former placeholders or institution branding',()=>{
 const html=read('kapo/index.html');
 assert.doesNotMatch(html,/visual-placeholder|Московский авиационный|\bМАИ\b|mai-logo/i);
 const library=JSON.parse(read('kapo/_build/library-index.json'));
 assert.equal(library.length,691);
 assert.equal(library.filter(x=>x.path.startsWith('03 Практикум/')).length,40);
 assert.equal(library.filter(x=>x.path.endsWith('/00 Карта модуля.md')).length,17);
 assert.deepEqual(JSON.parse(read('kapo/_build/unresolved-links.json')),[]);
 for(const r of library)assert.ok(fs.existsSync(path.join(root,'kapo/library',r.href)),r.href);
 for(let i=1;i<=4;i++){
  assert.match(html,new RegExp(`src="assets/standard-figure-${i}\\.png"`));
  const b=fs.readFileSync(path.join(root,`kapo/assets/standard-figure-${i}.png`));
  assert.ok(b.length>10000);assert.equal(b.subarray(1,4).toString(),'PNG');
 }
 assert.equal((html.match(/<tr>/g)||[]).length,7);
 for(const file of ['composition-analysis-national-standard-draft.pdf','composition-analysis-national-standard-draft.docx'])assert.ok(fs.statSync(path.join(root,'kapo/downloads',file)).size>100000);
});
test('GOST retains the exact eight original teaching screens and exposes nine current landings and preserves the original map privately',()=>{
 const html=read('gost56939/index.html');
 const screens=[...html.matchAll(/<section class="screen"[\s\S]*?<\/section>/g)].map(m=>hash(m[0].replace(/\r\n/g,'\n')));
 assert.equal(screens.length,8);assert.deepEqual(screens,JSON.parse(read('gost56939/_build/original-screen-hashes.json')));
 assert.match(html,/class="materials-link"[^>]+target="_blank"[^>]+rel="noopener noreferrer"/);
 const sources=JSON.parse(read('gost56939/_build/materials-provenance.json'));
 assert.equal(sources.length,10);
 for(const s of sources)assert.equal(hash(fs.readFileSync(path.join(root,'gost56939',s.public),'utf8').replace(/\r\n/g,'\n')),s.publishedSha256,s.public);
 const hub=read('gost56939/materials/index.html');
 assert.equal((hub.match(/<article class="card"(?:\s[^>]*)?>/g)||[]).length,9);
 assert.doesNotMatch(hub,/process-map-original/);
 const archived=sources.find(s=>s.archived);
 assert.equal(hash(read("gost56939/"+archived.archived).replace(/\r\n/g,"\n")),archived.archivedSha256);
 assert.match(read("gost56939/"+archived.public),/http-equiv="refresh"/);
 assert.doesNotMatch(read("gost56939/sitemap.xml"),/process-map-original/);
});
test('Archify maps have real SVG nodes and course diagrams are present',()=>{
 for(const name of ['component-decision','facts-and-decisions']){
  const html=read(`kapo/diagrams/${name}.html`);
  assert.match(html,/<svg[\s>]/);assert.match(html,/viewBox=/);
  const spec=JSON.parse(read(`kapo/_build/diagrams/${name}.json`));
  assert.equal(spec.meta.quality_profile,'showcase');assert.ok(spec.nodes.length>=6);
 }
 assert.equal(fs.readdirSync(path.join(root,'kapo/assets/course-diagrams')).filter(x=>x.endsWith('.svg')).length,29);
});

test('GOST materials catalogue has one link per destination across header, cards and footer',()=>{
 const hub=read('gost56939/materials/index.html');
 const destinations=[...hub.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(m=>new URL(m[1],'https://gost56939.pikov.expert/materials/').href);
 assert.equal(destinations.length,13);
 assert.equal(new Set(destinations).size,destinations.length,'Duplicate navigation destination');
 assert.equal(destinations.filter(url=>url.endsWith('/process-map/index.html')).length,1);
 assert.ok(destinations.includes('https://gost56939.pikov.expert/index.html'));
});
