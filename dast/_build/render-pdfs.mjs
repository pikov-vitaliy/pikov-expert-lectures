// Print the public HTML with public HTTPS link annotations, without a live deploy.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const domainRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require(path.resolve(domainRoot, '../_PROJECT/.browser-node/node_modules/playwright'));
const browser = await chromium.launch({headless:true});
const context = await browser.newContext();
const mime = {'.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.hostname !== 'dast.pikov.expert') return route.abort();
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  const target = path.resolve(domainRoot, relative);
  if (!target.startsWith(domainRoot + path.sep)) return route.abort();
  try { await route.fulfill({status:200,contentType:mime[path.extname(target)] || 'application/octet-stream',body:await fs.readFile(target)}); }
  catch { await route.fulfill({status:404,body:'Not found'}); }
});
const page = await context.newPage();
try {
  const files = [['index.html','pns-dynamic-analysis'], ...['aflpp_fuzzing_windows10_student','libfuzzer_main_cpp_student','fuzzing_bug_fix_demo'].map(x=>['practice/'+x+'.html',x])];
  for (const [source, name] of files) {
    await page.goto('https://dast.pikov.expert/' + source, {waitUntil:'networkidle'});
    await page.pdf({path:path.join(domainRoot,'downloads',name+'.pdf'),printBackground:true,preferCSSPageSize:true});
    console.log('PDF OK: ' + name);
  }
} finally { await browser.close(); }
