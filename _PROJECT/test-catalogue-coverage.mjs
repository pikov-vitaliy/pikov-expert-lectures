import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readCatalogue} from './new-site-catalogue.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const catalogue=readCatalogue(root),registry=JSON.parse(read('_PROJECT/lectures.json'));
test('every independently published section is represented and aliases stay out of the catalogue',()=>{
 const cards=new Set(catalogue.lectures.map(x=>x.url));
 assert.equal(cards.size,catalogue.lectures.length);
 assert.deepEqual([...cards].sort(),registry.lectures.map(x=>x.url).sort());
 for(const entry of registry.additionalSites){assert.ok(entry.redirectTo,'Unlisted site: '+entry.domain);assert.ok(cards.has(entry.redirectTo));assert.ok(!cards.has(entry.url));}
 assert.equal(registry.summary.cards,cards.size);
 assert.equal(registry.summary.thirdLevelDomains,new Set(catalogue.lectures.map(x=>new URL(x.url).hostname)).size);
 assert.equal(registry.summary.publishedThirdLevelDomains,new Set([...registry.lectures,...registry.additionalSites].map(x=>x.domain)).size);
});
test('both classic locales carry accurate counters and a complete no-JavaScript catalogue',()=>{
 for(const file of ['index.html','ru/index.html']){const html=read(file);assert.equal(Number(html.match(/id="lectureCount">(\d+)/)[1]),catalogue.lectures.length);const fallback=html.match(/<noscript>([\s\S]*?)<\/noscript>/)[1];const links=[...fallback.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(links.sort(),catalogue.lectures.map(x=>x.url).sort());}
});
