// Сцена (scene.json от engine.py) -> PPTX. node build_pptx.js <scene.json> <out.pptx>
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');

const [scenePath, outPath] = process.argv.slice(2);
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
const P = scene.palette;
const hex = (tok) => { const v = P[tok]; if (!v) throw new Error('нет цвета ' + tok); return v.replace('#', '').toUpperCase(); };
const ICON_DIR = path.join(__dirname, 'node_modules', 'lucide-static', 'icons');
const iconCache = {};

async function iconPng(name, color) {
  const key = name + '|' + color;
  if (iconCache[key]) return iconCache[key];
  let svg = fs.readFileSync(path.join(ICON_DIR, name + '.svg'), 'utf8');
  svg = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/stroke="currentColor"/g, `stroke="#${hex(color)}"`)
    .replace(/width="24"/, 'width="256"').replace(/height="24"/, 'height="256"');
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return (iconCache[key] = 'image/png;base64,' + buf.toString('base64'));
}

async function gridBg() {
  const w = 1920, h = 1080, step = 58;
  let lines = '';
  for (let x = 0; x <= w; x += step) lines += `<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`;
  for (let y = 0; y <= h; y += step) lines += `<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${P.dbg}"/>` +
    `<g stroke="#FFFFFF" stroke-opacity="0.035" stroke-width="1.5">${lines}</g></svg>`;
  const file = path.join(path.dirname(outPath), '_grid-bg.png');
  await sharp(Buffer.from(svg)).png().toFile(file);
  return file;
}

function runsToPptx(paras, base) {
  const out = [];
  paras.forEach((runs, pi) => {
    runs.forEach((r, ri) => {
      const o = { bold: !!(r.b || base.bold) };
      if (base.fontSize) o.fontSize = base.fontSize;
      if (r.m) o.fontFace = 'Consolas';
      if (ri === runs.length - 1 && pi < paras.length - 1) o.breakLine = true;
      out.push({ text: r.text, options: o });
    });
  });
  return out;
}

const fmtNum = (v, dec) => v.toFixed(dec).replace('.', ',').replace('-', '−');

(async () => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'Виталий Пиков';
  pres.company = 'pikov.expert';
  pres.title = scene.title;
  pres.subject = 'Искусственный интеллект для инженеров';
  pres.theme = { headFontFace: 'Calibri', bodyFontFace: 'Calibri' };
  const bg = await gridBg();
  pres.defineSlideMaster({
    title: 'CONTENT', background: { color: 'FFFFFF' },
    objects: [{ text: { text: scene.footer, options: { x: 0.6, y: 7.06, w: 10.5, h: 0.3, fontSize: 10, color: hex('muted'), fontFace: 'Calibri', margin: 0 } } }],
    slideNumber: { x: 12.23, y: 7.06, w: 0.5, h: 0.3, fontSize: 10, color: hex('muted'), fontFace: 'Calibri', align: 'right' },
  });
  pres.defineSlideMaster({ title: 'DARK', background: { path: bg } });

  for (const sl of scene.slides) {
    const slide = pres.addSlide({ masterName: sl.bg === 'dark' ? 'DARK' : 'CONTENT' });
    for (const e of sl.els) {
      if (e.t === 'rect') {
        const o = { x: e.x, y: e.y, w: e.w, h: e.h, fill: { color: hex(e.fill) } };
        if (e.radius) o.rectRadius = e.radius;
        o.line = e.line ? { color: hex(e.line), width: 0.75 } : { type: 'none' };
        if (e.shadow) o.shadow = { type: 'outer', blur: 8, offset: 2, angle: 90, color: '101828', opacity: 0.12 };
        slide.addShape(e.radius ? pres.shapes.ROUNDED_RECTANGLE : pres.shapes.RECTANGLE, o);
      } else if (e.t === 'ellipse') {
        slide.addShape(pres.shapes.OVAL, { x: e.x, y: e.y, w: e.w, h: e.h, fill: { color: hex(e.fill) }, line: { type: 'none' } });
      } else if (e.t === 'icon') {
        slide.addImage({ data: await iconPng(e.name, e.color), x: e.x, y: e.y, w: e.w, h: e.h, altText: '' });
      } else if (e.t === 'line') {
        slide.addShape(pres.shapes.LINE, { x: e.x1, y: e.y1, w: Math.max(e.x2 - e.x1, 0), h: Math.max(e.y2 - e.y1, 0.001), line: { color: hex(e.color), width: e.width, dashType: e.dash ? 'dash' : 'solid' } });
      } else if (e.t === 'text') {
        const o = {
          x: e.x, y: e.y, w: e.w, h: e.h, fontSize: e.pt, color: hex(e.color), bold: !!e.bold, align: e.align,
          valign: e.valign, margin: 0, fontFace: e.font === 'mono' ? 'Consolas' : 'Calibri', paraSpaceAfter: e.gap || 0,
          fit: 'none', wrap: true, italic: !!e.italic,
        };
        if (e.role === 'title') { o.isTextBox = false; } else { o.isTextBox = true; }
        slide.addText(runsToPptx(e.paras, e), o);
      } else if (e.t === 'image') {
        slide.addImage({ path: e.src, x: e.x, y: e.y, w: e.w, h: e.h, altText: e.alt });
      } else if (e.t === 'table') {
        const pad = [e.pad[0], e.pad[1], e.pad[0], e.pad[1]];
        const border = { type: 'solid', pt: 0.75, color: hex('line') };
        const head = e.head.map((c) => ({ text: runsToPptx([c], { bold: true, fontSize: e.pt }), options: { fill: { color: hex('graphite') }, color: hex('on_graphite'), bold: true, fontSize: e.pt, fontFace: 'Calibri', margin: pad, border } }));
        const rows = e.rows.map((r, ri) => r.map((c, ci) => ({ text: runsToPptx([c], { bold: ci === 0, fontSize: e.pt }), options: { fill: { color: ri % 2 ? hex('surface') : 'FFFFFF' }, color: hex('ink'), fontSize: e.pt, fontFace: 'Calibri', margin: pad, border } })));
        slide.addTable([head, ...rows], { x: e.x, y: e.y, w: e.w, colW: e.colw, fontSize: e.pt, fontFace: 'Calibri', valign: 'top', autoPage: false });
      } else if (e.t === 'chart') {
        const c = e.chart;
        const data = c.series.map((s) => ({ name: s.name, labels: c.cats, values: s.values }));
        const fmt = c.dec ? '0.' + '0'.repeat(c.dec) : '0';
        const unit = c.unit ? '"' + c.unit + '"' : '';
        const colors = (c.colors || ['teal', 'orange', 'graphite']).slice(0, Math.max(c.series.length, 1)).map(hex);
        const o = {
          x: e.x, y: e.y, w: e.w, h: e.h, barDir: c.type === 'bar' ? 'bar' : 'col', barGrouping: 'clustered', barGapWidthPct: 60,
          chartColors: colors, showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 14, dataLabelColor: hex('ink'),
          dataLabelFontBold: true, dataLabelFormatCode: fmt + unit, dataLabelFontFace: 'Calibri',
          catAxisLabelFontSize: 14, catAxisLabelColor: hex('ink'), catAxisLabelFontFace: 'Calibri', catAxisLineShow: true,
          catAxisLineColor: hex('line'), valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
          showLegend: c.series.length > 1, legendPos: 'b', legendFontSize: 14, legendFontFace: 'Calibri', legendColor: hex('ink'),
        };
        if (c.type === 'bar') o.catAxisOrientation = 'maxMin';
        if (c.series.length === 1 && colors.length === 1) o.chartColors = [colors[0]];
        slide.addChart(pres.charts.BAR, data, o);
      }
    }
  }
  await pres.writeFile({ fileName: outPath });
  fs.unlinkSync(bg);
  console.log('pptx', outPath, scene.slides.length);
})().catch((e) => { console.error(e); process.exit(1); });
