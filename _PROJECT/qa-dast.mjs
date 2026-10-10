import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const live = process.argv.includes('--live');
const output = process.env.DAST_QA_OUTPUT || path.join(root,'_PROJECT','.browser-qa-dast-2026-10-10',live?'live':'local');
await fs.mkdir(output,{recursive:true});
const require = createRequire(import.meta.url);
const {chromium} = require(path.join(root,'_PROJECT/.browser-node/node_modules/playwright'));
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({acceptDownloads:true});
const checks = [];
const errors = [];
const check = (label, value) => {assert.ok(value,label);checks.push(label);};
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.svg':'image/svg+xml','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.pdf':'application/pdf','.zip':'application/zip','.md':'text/markdown; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const csp=(await fs.readFile(path.join(root,'dast/.htaccess'),'utf8')).match(/Content-Security-Policy "([^"]+)"/)[1];
let siteBase='https://pikov.expert';
let dastBase='https://dast.pikov.expert';
const servers=[];
if (!live) {
  // Real HTTP servers also exercise Chromium's native download manager.
  for(const domainRoot of [root,path.join(root,'dast')]) {
    const server=http.createServer(async(request,response)=>{
      let relative=decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\/+/, '');
      if(!relative||relative.endsWith('/'))relative+='index.html';
      const target=path.resolve(domainRoot,relative);
      if(!target.startsWith(domainRoot+path.sep)){response.writeHead(404).end();return;}
      try {
        let body=await fs.readFile(target);
        if(target.endsWith('.html'))body=Buffer.from(body.toString('utf8').replaceAll('https://dast.pikov.expert',dastBase).replaceAll('https://pikov.expert',siteBase));
        const headers={'Content-Type':mime[path.extname(target)]||'application/octet-stream'};
        if(domainRoot!==root){headers['Content-Security-Policy']=csp.replace('; upgrade-insecure-requests','');headers['X-Frame-Options']='SAMEORIGIN';}
        response.writeHead(200,headers).end(body);
      }catch{response.writeHead(404).end('Not found');}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));servers.push(server);
  }
  siteBase=`http://127.0.0.1:${servers[0].address().port}`;
  dastBase=`http://127.0.0.1:${servers[1].address().port}`;
}
// Analytics is not a dependency of an educational user journey.
await context.route(/https:\/\/(?:[^/]*\.)?(?:yandex\.(?:ru|com)|yandexadexchange.net)\//,r=>r.fulfill({status:200,body:''}));
context.on('page',p=>{
  p.on('pageerror',e=>errors.push({url:p.url(),message:e.message}));
  p.on('console',m=>{if(m.type()==='error' && /Content Security Policy|Refused to frame/i.test(m.text()))errors.push({url:p.url(),message:m.text()});});
});
const page=await context.newPage();
try {
  for (const width of [1440,390,320]) {
    await page.setViewportSize({width,height:900});
    for(const route of ['/','/ru/','/new/','/new/ru/']) {
      await page.goto(siteBase+route,{waitUntil:'networkidle'});
      check(`${width} ${route} locale`,await page.locator('html').getAttribute('lang')===(route.includes('ru')?'ru':'en'));
      const search=page.locator('input[type="search"]');
      await search.fill(route.includes('ru')?'динамический':'dynamic');
      const link=page.locator(`a[href="${dastBase}/"]:visible`).last();
      await link.waitFor({state:'visible'});
      check(`${width} ${route} DAST search result`,await link.count()>0);
      const theme=page.locator(route.startsWith('/new/')?'[data-theme-toggle]':'#themeToggle');
      await theme.click();
      check(`${width} ${route} theme`,!!await page.locator('html').getAttribute('data-theme'));
      const locale=page.locator(route.startsWith('/new/')?'[data-locale-switch]':'#langToggle');
      const destination=await locale.getAttribute('href');
      check(`${width} ${route} language link`,new URL(destination,'https://pikov.expert').pathname===(route==='/new/'?'/new/ru/':route==='/new/ru/'?'/new/':route==='/'?'/ru/':'/'));
      check(`${width} ${route} reflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(output,`catalogue-${route.replaceAll('/','_')}-${width}.png`)});
      await locale.click();await page.waitForLoadState('networkidle');
      check(`${width} ${route} language switch`,await page.locator('html').getAttribute('lang')===(route.includes('ru')?'en':'ru'));
      await page.goto(siteBase+route,{waitUntil:'networkidle'});
      await search.fill(route.includes('ru')?'динамический':'dynamic');await link.waitFor({state:'visible'});
      if(await link.getAttribute('target')==='_blank') {
        const popupPromise=page.waitForEvent('popup');await link.click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');check(`${width} ${route} opens lecture`,popup.url()===dastBase+'/');await popup.close();
      } else {await link.click();await page.waitForURL(dastBase+'/');check(`${width} ${route} opens lecture`,await page.locator('h1').count()===1);}
    }
    await page.goto(dastBase+'/',{waitUntil:'networkidle'});
    check(`${width} DAST reflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    check(`${width} all images`,await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
    const badAnchors=await page.locator('a[href^="#"]').evaluateAll(links=>links.map(a=>a.getAttribute('href')).filter(h=>h.length>1&&!document.getElementById(decodeURIComponent(h.slice(1)))));
    check(`${width} lecture anchors`,badAnchors.length===0);
    await page.screenshot({path:path.join(output,`dast-${width}.png`)});
    await page.getByRole('link',{name:'Практика для студентов',exact:true}).click();
    check(`${width} practice anchor`,new URL(page.url()).hash==='#student-materials');
    check(`${width} three handouts`,await page.locator('#student-materials a[href^="practice/"]').count()===3);
    await page.locator('#student-materials').screenshot({path:path.join(output,`practice-links-${width}.png`)});
  }
  await page.setViewportSize({width:1440,height:900});
  for(let i=0;i<3;i++) {
    const button=page.locator('.fig-open').nth(i);await button.click();
    const frame=page.frameLocator('.fig-frame iframe').nth(i);
    await frame.locator('svg').first().waitFor({timeout:15000});
    check(`interactive diagram ${i+1}`,await button.getAttribute('aria-expanded')==='true');
    await button.click();check(`collapse diagram ${i+1}`,await button.getAttribute('aria-expanded')==='false');
  }
  await page.locator('#board-next').click();
  check('defect cycle next',/Шаг 2/.test(await page.locator('#board-announce').textContent()));
  await page.locator('#board-branch-btn').click();check('unreproduced finding branch',await page.locator('#board-branch-text').isVisible());
  await page.locator('#board-reset').click();
  check('defect cycle reset',await page.locator('#board-prev').isDisabled());
  await page.locator('#t83').click();check('technology detail dialog',await page.locator('.imap-dialog').isVisible());await page.keyboard.press('Escape');check('dialog closes with Escape',await page.locator('.imap-dialog').count()===0);
  for(const name of ['aflpp_fuzzing_windows10_student','libfuzzer_main_cpp_student','fuzzing_bug_fix_demo']) {
    await page.goto(dastBase+'/practice/'+name+'.html',{waitUntil:'networkidle'});
    for(const width of [1440,390,320]) {await page.setViewportSize({width,height:900});check(`${name} ${width} reflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
    const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'PDF',exact:true}).click();const download=await downloadPromise;const saved=path.join(output,name+'.pdf');await download.saveAs(saved);check(`${name} PDF download bytes`,hash(await fs.readFile(saved))===hash(await fs.readFile(path.join(root,'dast/downloads',name+'.pdf'))));
    await page.getByRole('link',{name:'Лекция DAST',exact:true}).click();check(`${name} return to lecture`,page.url().startsWith(dastBase+'/'));
  }
  for(const name of ['dynamic-analysis-national-standard-draft.pdf','my-first-python-project-v02.zip']) {
    await page.goto(dastBase+'/',{waitUntil:'networkidle'});
    const promise=page.waitForEvent('download');await page.locator(`a[href="downloads/${name}"]`).first().click();const dl=await promise;const saved=path.join(output,name);await dl.saveAs(saved);check(`${name} downloaded unchanged`,hash(await fs.readFile(saved))===hash(await fs.readFile(path.join(root,'dast/downloads',name))));
  }
  if(live) {
    for(const name of await fs.readdir(path.join(root,'dast/downloads'))) {
      const response=await context.request.get('https://dast.pikov.expert/downloads/'+name);
      check(`${name} HTTP 200`,response.status()===200);
      check(`${name} live SHA-256`,hash(await response.body())===hash(await fs.readFile(path.join(root,'dast/downloads',name))));
      if(name.endsWith('.pdf'))check(`${name} PDF MIME`,/application\/pdf/.test(response.headers()['content-type']));
    }
  }
  check('no JavaScript or CSP errors',errors.length===0);
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify({mode:live?'live':'local',checks,errors,status:'passed'},null,2));
  console.log(`DAST ${live?'LIVE':'LOCAL'} E2E OK: ${checks.length} checks`);
} catch(error) {
  await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify({mode:live?'live':'local',checks,errors,status:'failed',failure:error.message},null,2));
  throw error;
} finally {await browser.close();for(const server of servers)await new Promise(resolve=>server.close(resolve));}
