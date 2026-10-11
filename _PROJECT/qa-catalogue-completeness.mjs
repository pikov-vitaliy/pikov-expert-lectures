import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {readCatalogue} from './new-site-catalogue.mjs';
const project=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(project);
const require=createRequire(import.meta.url),{chromium}=require(path.join(project,'.browser-node/node_modules/playwright'));
const expected=readCatalogue(root).lectures.map(x=>x.url).sort();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b);});});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=process.env.CATALOGUE_BASE_URL||'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
let cases=0;
try {
for(const route of ['/','/ru/','/new/','/new/ru/'])for(const js of [true,false])for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
 const context=await browser.newContext({javaScriptEnabled:js,viewport:{width,height:900},colorScheme:theme,reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+route,{waitUntil:'networkidle'});
 const modern=route.startsWith('/new/'),lang=route.includes('/ru/')?'ru':'en';
 assert.equal(await page.locator('html').getAttribute('lang'),lang,route);
 const links=modern?'[data-material] h3 a':js?'#catalog a.card':'.catalog-fallback li a';
 assert.deepEqual((await page.locator(links).evaluateAll(a=>a.map(x=>x.href))).sort(),expected,route+' catalogue coverage');
 const bounds=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
 assert.ok(bounds.width<=bounds.viewport+1,route+' overflow '+JSON.stringify(bounds));
 if(!modern)assert.equal(await page.locator('#lectureCount').innerText(),String(expected.length));
 if(!modern&&!js){assert.equal(await page.locator('#cat-rbpo').count(),1);assert.equal(await page.locator('#q:visible, #themeToggle:visible, #viewToggle:visible').count(),0);}
 if(js&&width===390&&theme==='light'){
   const toggle=modern?'[data-theme-toggle]':'#themeToggle';await page.locator(toggle).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
   const search=modern?'input[name=q]':'#q';await page.locator(search).fill('dast');
   assert.equal(await page.locator(links+':visible').count(),1,route+' DAST search');
   await page.locator(search).fill('');
   assert.equal(await page.locator(links+':visible').count(),expected.length);
   if(modern){await page.locator('select[name=topic]').selectOption('rbpo');assert.equal(await page.locator(links+':visible').count(),19);await page.locator('select[name=topic]').selectOption('');await page.locator('select[name=kind]').selectOption('course');assert.ok(await page.locator('[data-material][data-kind=course]:visible').count()>0);await page.locator('select[name=kind]').selectOption('');}
   const language=modern?'[data-locale-switch]':'#langToggle';await page.locator(language).click();await page.waitForLoadState('networkidle');assert.equal(await page.locator('html').getAttribute('lang'),lang==='ru'?'en':'ru');
 }
 assert.deepEqual(errors,[],route+' page errors');await context.close();cases++;
}
console.log('CATALOGUE COMPLETENESS QA OK '+JSON.stringify({cases,materials:expected.length,routes:4,widths:[320,390,768,1440],javascript:[true,false],themes:['light','dark']}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
