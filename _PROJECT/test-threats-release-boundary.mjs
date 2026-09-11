import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const project = dirname(fileURLToPath(import.meta.url));
const repository = dirname(project);
const shell = process.env.PIKOV_TEST_POWERSHELL ?? 'pwsh.exe';
const publicFiles = ['.htaccess', 'excluded-threats.csv', 'excluded.html', 'favicon.svg', 'index.html', 'robots.txt', 'sitemap.xml', 'software-threats.csv', 'thrlist.xlsx'];

function run(script, args) {
  return spawnSync(shell, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], { encoding: 'utf8' });
}
function resultText(result) { return `${result.stdout}\n${result.stderr}`; }

test('release selection is closed, requires all public files and rejects changed workbook bytes', () => {
  const root = mkdtempSync(join(tmpdir(), 'pikov-threats-boundary-'));
  try {
    const site = join(root, 'threats');
    mkdirSync(join(site, '_build'), { recursive: true });
    for (const file of publicFiles) writeFileSync(join(site, file), 'fixture\n');
    copyFileSync(join(repository, 'threats', 'thrlist.xlsx'), join(site, 'thrlist.xlsx'));
    for (const path of ['private.xlsx', 'draft.html', 'README.md', '_build/private.json']) {
      writeFileSync(join(site, path), 'must stay private\n');
    }
    const script = join(root, 'select.ps1');
    // Execute the actual release functions through the PowerShell AST without
    // launching the unrelated full-site builders or mocking their path checks.
    writeFileSync(script, `param([string]$Builder,[string]$Root)
$ErrorActionPreference = 'Stop'
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Builder, [ref]$null, [ref]$null)
$ast.FindAll({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst]}, $true) | ForEach-Object { . ([scriptblock]::Create($_.Extent.Text)) }
$script:ReleaseRepositoryRoot = $Root
@(Get-DomainReleaseFiles -FolderPath (Join-Path $Root 'threats')) | ConvertTo-Json -Compress
`, 'utf8');
    const select = () => run(script, [join(project, 'build-release.ps1'), root]);
    let result = select();
    assert.equal(result.status, 0, resultText(result));
    assert.deepEqual(JSON.parse(result.stdout), publicFiles);
    rmSync(join(site, 'excluded.html'));
    result = select();
    assert.notEqual(result.status, 0, 'missing public page must fail');
    assert.match(resultText(result), /Missing|does not exist/i);
    writeFileSync(join(site, 'excluded.html'), 'fixture\n');
    writeFileSync(join(site, 'thrlist.xlsx'), 'unreviewed replacement');
    result = select();
    assert.notEqual(result.status, 0, 'changed XLSX must fail');
    assert.match(resultText(result), /reviewed public XLSX/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('independence gate rejects missing, extra and tampered threat archive contents', () => {
  const root = mkdtempSync(join(tmpdir(), 'pikov-threats-archive-'));
  try {
    mkdirSync(join(root, '_PROJECT'));
    const payload = join(root, 'payload');
    mkdirSync(payload);
    for (const file of publicFiles) writeFileSync(join(payload, file), 'fixture\n');
    copyFileSync(join(repository, 'threats', 'thrlist.xlsx'), join(payload, 'thrlist.xlsx'));
    const zip = join(root, 'threats.zip');
    const index = join(root, '_PROJECT', 'RELEASE_INDEX_2026-09-11.json');
    writeFileSync(index, JSON.stringify([{ domain: 'threats.pikov.expert', archivePath: zip }]));
    const pack = join(root, 'pack.ps1');
    writeFileSync(pack, `param([string]$Payload,[string]$Archive)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path -LiteralPath $Archive) { Remove-Item -LiteralPath $Archive }
[System.IO.Compression.ZipFile]::CreateFromDirectory($Payload, $Archive)
`);
    const gate = () => {
      const packed = run(pack, [payload, zip]);
      assert.equal(packed.status, 0, resultText(packed));
      return run(join(project, 'test-public-release-independence.ps1'), ['-Root', root, '-ReleaseIndex', index]);
    };
    let result = gate();
    assert.equal(result.status, 0, resultText(result));
    writeFileSync(join(payload, 'draft.html'), 'private draft');
    result = gate();
    assert.notEqual(result.status, 0);
    assert.match(resultText(result), /outside the reviewed|exactly the reviewed/);
    rmSync(join(payload, 'draft.html'));
    rmSync(join(payload, 'excluded.html'));
    result = gate();
    assert.notEqual(result.status, 0);
    assert.match(resultText(result), /exactly the reviewed/);
    writeFileSync(join(payload, 'excluded.html'), 'fixture\n');
    const workbook = readFileSync(join(payload, 'thrlist.xlsx'));
    // An appended ZIP comment marker leaves the container readable but changes
    // its bytes: recursive XML checks alone would not catch this replacement.
    writeFileSync(join(payload, 'thrlist.xlsx'), Buffer.concat([workbook, Buffer.from('changed')]));
    result = gate();
    assert.notEqual(result.status, 0);
    assert.match(resultText(result), /reviewed public[\s\S]*XLSX SHA-256/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('static release checks rendered resources and external scripts, not inline script templates', () => {
  const root = mkdtempSync(join(tmpdir(), 'pikov-static-script-markup-'));
  try {
    const site = join(root, 'site');
    mkdirSync(site);
    for (const file of ['present.svg', 'present.js', 'present.css']) writeFileSync(join(site, file), 'fixture');
    const script = join(root, 'check.ps1');
    writeFileSync(script, `param([string]$Builder,[string]$Root)
$ErrorActionPreference = 'Stop'
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Builder, [ref]$null, [ref]$null)
$ast.FindAll({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst]}, $true) | ForEach-Object { . ([scriptblock]::Create($_.Extent.Text)) }
ConvertTo-Json -InputObject @(Test-StaticRelease -StageRoot $Root -SiteName 'fixture') -Compress
`, 'utf8');
    const check = html => {
      writeFileSync(join(site, 'index.html'), html);
      const result = run(script, [join(project, 'build-release.ps1'), site]);
      assert.equal(result.status, 0, resultText(result));
      return JSON.parse(result.stdout);
    };
    const template = '${pageFile}#ubi-${t.id}';
    const markup = `<html><head><link rel="stylesheet" href="present.css"></head><body>
<a href="index.html#record">Record</a><img src="present.svg">
<script>const record = '<a href="${template}"><img src="missing-inline.png"></a>'; const css = 'url(missing-inline.svg)';</script>
<SCRIPT type="module" data-note="1 > 0" src="present.js">const ignored = '<a href="missing-module.html">';</SCRIPT>
<script type="application/json">{"markup":"<img src='missing-data.png'>"}</script>
</body></html>`;
    assert.deepEqual(check(markup), [], 'inert JS strings and embedded data are not DOM links');

    const broken = check(markup.replace('src="present.js"', 'src="missing-loader.js"')
      .replace('src="present.svg"', 'src="missing-image.svg"')
      .replace('href="index.html#record"', 'href="missing-page.html"')
      .replace('</head>', '<style>.cover{background:url(missing-background.svg)}</style></head>'));
    assert.equal(broken.length, 4);
    for (const resource of ['missing-loader.js', 'missing-image.svg', 'missing-page.html', 'missing-background.svg']) {
      assert(broken.some(issue => issue.issue === `missing local resource: ${resource}`), resource);
    }
    const literal = check(`<a href="${template}">Unresolved DOM link</a>`);
    assert.equal(literal.length, 1, 'template-like values in actual DOM attributes are still rejected');
    assert.match(literal[0].issue, /missing local resource/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
