import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
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
