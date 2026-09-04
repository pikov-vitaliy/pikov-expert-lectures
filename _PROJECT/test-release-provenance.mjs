import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));
const releaseDate = '2026-08-21';
const powershellExecutable = process.env.PIKOV_TEST_POWERSHELL ?? 'pwsh.exe';

function output(result) {
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
}

function runGit(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, output(result));
  return result.stdout.trim();
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'pikov-release-provenance-'));
  const project = join(root, '_PROJECT');
  const lecture = join(root, 'fixture-course');
  const lectureMaterials = join(lecture, 'materials');
  const russianRoot = join(root, 'ru');
  mkdirSync(project, { recursive: true });
  mkdirSync(lecture, { recursive: true });
  mkdirSync(lectureMaterials, { recursive: true });
  mkdirSync(russianRoot, { recursive: true });
  copyFileSync(join(projectDir, 'build-release.ps1'), join(project, 'build-release.ps1'));
  copyFileSync(join(projectDir, 'deterministic-archive.ps1'), join(project, 'deterministic-archive.ps1'));
  writeFileSync(
    join(project, 'build-astra-hardening-labs.ps1'),
    "param([switch]$Check)\nWrite-Output 'ASTRA FIXTURE OK'\n",
    'utf8',
  );
  writeFileSync(
    join(project, 'lectures.json'),
    `${JSON.stringify({
      updated: releaseDate,
      lectures: [{
        position: 1,
        folder: 'fixture-course',
        domain: 'fixture-course',
        url: 'https://fixture-course.pikov.expert/',
        title: 'Fixture course',
        status: 'ready-local',
      }],
    }, null, 2)}\n`,
    'utf8',
  );
  writeFileSync(join(root, 'index.html'), '<!doctype html>\n<title>Root fixture</title>\n', 'utf8');
  writeFileSync(join(russianRoot, 'index.html'), '<!doctype html>\n<title>Russian root fixture</title>\n', 'utf8');
  writeFileSync(join(russianRoot, 'not-public.html'), '<!doctype html>\n<title>Not allowlisted</title>\n', 'utf8');
  for (const route of ['new', 'new/ru', 'new/about', 'new/ru/about']) {
    mkdirSync(join(root, route), { recursive: true });
    writeFileSync(join(root, route, 'index.html'), '<!doctype html>\n<title>Parallel site fixture</title>\n', 'utf8');
  }
  const parallelAssets = join(root, 'new', 'assets');
  const parallelIllustrations = join(parallelAssets, 'illustrations');
  mkdirSync(parallelIllustrations, { recursive: true });
  writeFileSync(join(parallelAssets, 'styles.css'), 'body { color: #172027; }\n', 'utf8');
  writeFileSync(join(parallelAssets, 'site.js'), '"use strict";\n', 'utf8');
  for (const category of ['rbpo', 'os', 'reg', 'offense', 'edu']) {
    writeFileSync(join(parallelIllustrations, `${category}.webp`), `${category} illustration fixture\n`, 'utf8');
  }
  writeFileSync(join(root, 'new', 'draft.html'), '<!doctype html>\n<title>Private draft</title>\n', 'utf8');
  writeFileSync(join(parallelAssets, 'private-notes.txt'), 'Private notes\n', 'utf8');
  writeFileSync(join(parallelIllustrations, 'source.png'), 'Unapproved original image\n', 'utf8');
  writeFileSync(join(lecture, 'index.html'), '<!doctype html>\n<title>Lecture fixture</title>\n', 'utf8');
  writeFileSync(join(lectureMaterials, 'a.txt'), 'a\n', 'utf8');
  writeFileSync(join(lectureMaterials, 'z.txt'), 'z\n', 'utf8');
  writeFileSync(join(lectureMaterials, 'ä.txt'), 'a umlaut\n', 'utf8');
  writeFileSync(
    join(root, '.gitignore'),
    'release/\n**/release/\n_PROJECT/.release-staging-*\n_PROJECT/RELEASE_INDEX_*.json\n_PROJECT/RELEASE_INDEX_*.md\n',
    'utf8',
  );
  runGit(root, ['init', '--initial-branch=main']);
  runGit(root, ['config', 'user.name', 'Pikov release test']);
  runGit(root, ['config', 'user.email', 'release-test@invalid.example']);
  runGit(root, ['add', '.']);
  runGit(root, ['commit', '-m', 'fixture']);
  const sourceCommit = runGit(root, ['rev-parse', 'HEAD']);
  return { root, project, sourceCommit };
}

function runBuild(fixture, extraArgs = []) {
  return spawnSync(
    powershellExecutable,
    [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', join(fixture.project, 'build-release.ps1'),
      '-Root', fixture.root,
      '-ReleaseDate', releaseDate,
      '-FailOnIssues',
      ...extraArgs,
    ],
    { cwd: fixture.root, encoding: 'utf8', timeout: 120_000 },
  );
}

function runBuildWithCulture(fixture, culture) {
  const wrapper = join(fixture.project, 'run-build-with-culture.ps1');
  writeFileSync(
    wrapper,
    [
      'param([string]$Culture, [string]$BuildScript, [string]$RepositoryRoot, [string]$Date, [string]$AcceptedCommit)',
      '$cultureInfo = [System.Globalization.CultureInfo]::GetCultureInfo($Culture)',
      '[System.Threading.Thread]::CurrentThread.CurrentCulture = $cultureInfo',
      '[System.Threading.Thread]::CurrentThread.CurrentUICulture = $cultureInfo',
      '& $BuildScript -Root $RepositoryRoot -ReleaseDate $Date -AcceptedSourceCommit $AcceptedCommit -FailOnIssues',
      '',
    ].join('\n'),
    'utf8',
  );
  return spawnSync(
    powershellExecutable,
    [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', wrapper,
      '-Culture', culture,
      '-BuildScript', join(fixture.project, 'build-release.ps1'),
      '-RepositoryRoot', fixture.root,
      '-Date', releaseDate,
      '-AcceptedCommit', fixture.sourceCommit,
    ],
    { cwd: fixture.root, encoding: 'utf8', timeout: 120_000 },
  );
}

function readIndex(fixture) {
  return JSON.parse(readFileSync(join(fixture.project, `RELEASE_INDEX_${releaseDate}.json`), 'utf8'));
}

test('dirty working tree builds a nondeployable candidate with a selected-source digest', (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  writeFileSync(join(fixture.root, 'index.html'), '<!doctype html>\n<title>Dirty candidate</title>\n', 'utf8');

  const result = runBuild(fixture);
  assert.equal(result.status, 0, output(result));
  const entries = readIndex(fixture);
  assert.ok(entries.length >= 2);
  for (const entry of entries) {
    assert.equal(entry.provenanceVersion, 1);
    assert.equal(entry.releaseKind, 'candidate');
    assert.equal(entry.sourceCommit, fixture.sourceCommit);
    assert.equal(entry.sourceRef, 'refs/heads/main');
    assert.equal(entry.sourceDirty, true);
    assert.equal(entry.deployable, false);
    assert.equal(entry.policyDecision, 'deny-deploy');
    assert.equal(entry.releaseDate, releaseDate);
    assert.match(entry.sourceTreeSha256, /^[0-9a-f]{64}$/);
  }
});

test('clean accepted build binds every artifact to the requested HEAD commit', (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));

  const result = runBuild(fixture, ['-AcceptedSourceCommit', fixture.sourceCommit]);
  assert.equal(result.status, 0, output(result));
  const entries = readIndex(fixture);
  for (const entry of entries) {
    assert.equal(entry.releaseKind, 'accepted');
    assert.equal(entry.sourceCommit, fixture.sourceCommit);
    assert.equal(entry.sourceRef, 'refs/heads/main');
    assert.equal(entry.sourceDirty, false);
    assert.equal(entry.deployable, true);
    assert.equal(entry.policyDecision, 'allow-deploy');
    assert.equal(entry.releaseDate, releaseDate);
    const manifest = JSON.parse(readFileSync(join(entry.releaseDir, 'MANIFEST.json'), 'utf8'));
    assert.equal(manifest.sourceCommit, fixture.sourceCommit);
    assert.equal(manifest.sourceRef, 'refs/heads/main');
    assert.equal(manifest.deployable, true);
    assert.equal(manifest.policyDecision, 'allow-deploy');
    assert.equal(manifest.sourceTreeSha256, entry.sourceTreeSha256);
    const notes = readFileSync(join(entry.releaseDir, 'RELEASE_NOTES.md'), 'utf8');
    assert.match(notes, new RegExp(`Source commit: ${fixture.sourceCommit}`));
    assert.match(notes, /Deployable: yes/);
  }
});

test('accepted build rejects a dirty tree and a commit other than HEAD', async (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));

  await t.test('wrong accepted commit', () => {
    const wrong = 'a'.repeat(40) === fixture.sourceCommit ? 'b'.repeat(40) : 'a'.repeat(40);
    const result = runBuild(fixture, ['-AcceptedSourceCommit', wrong]);
    assert.notEqual(result.status, 0, output(result));
    assert.match(output(result), /AcceptedSourceCommit|HEAD|source commit/i);
  });

  await t.test('dirty accepted tree', () => {
    writeFileSync(join(fixture.root, 'index.html'), '<!doctype html>\n<title>Dirty accepted</title>\n', 'utf8');
    const result = runBuild(fixture, ['-AcceptedSourceCommit', fixture.sourceCommit]);
    assert.notEqual(result.status, 0, output(result));
    assert.match(output(result), /dirty|tracked/i);
  });
});

test('clean detached worktree can rebuild an explicitly accepted rollback commit', (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const mainResult = runBuildWithCulture(fixture, 'en-US');
  assert.equal(mainResult.status, 0, output(mainResult));
  const mainIndex = readFileSync(join(fixture.project, `RELEASE_INDEX_${releaseDate}.json`), 'utf8');
  const mainManifest = JSON.parse(readFileSync(join(fixture.root, 'fixture-course', 'release', 'MANIFEST.json'), 'utf8'));
  const manifestPaths = mainManifest.files.map((entry) => entry.path);
  assert.deepEqual(manifestPaths, [...manifestPaths].sort(), 'manifest file records are not ordinally sorted');

  writeFileSync(join(fixture.project, 'main-advanced.txt'), 'main advanced after accepted release\n', 'utf8');
  runGit(fixture.root, ['add', '_PROJECT/main-advanced.txt']);
  runGit(fixture.root, ['commit', '-m', 'advance main after accepted release']);
  const currentMain = runGit(fixture.root, ['rev-parse', 'main']);
  assert.notEqual(currentMain, fixture.sourceCommit);
  runGit(fixture.root, ['checkout', '--detach', fixture.sourceCommit]);

  const result = runBuildWithCulture(fixture, 'sv-SE');
  assert.equal(result.status, 0, output(result));
  const detachedIndex = readFileSync(join(fixture.project, `RELEASE_INDEX_${releaseDate}.json`), 'utf8');
  assert.equal(detachedIndex, mainIndex, 'accepted index changed only because the checkout became detached');
  for (const entry of readIndex(fixture)) {
    assert.equal(entry.releaseKind, 'accepted');
    assert.equal(entry.sourceCommit, fixture.sourceCommit);
    assert.equal(entry.sourceRef, 'refs/heads/main');
    assert.equal(entry.policyDecision, 'allow-deploy');
  }
});

test('a clean unmerged feature commit cannot be declared accepted', (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  runGit(fixture.root, ['checkout', '-b', 'unmerged-feature']);
  writeFileSync(join(fixture.root, 'feature-only.txt'), 'not accepted by main\n', 'utf8');
  runGit(fixture.root, ['add', 'feature-only.txt']);
  runGit(fixture.root, ['commit', '-m', 'unmerged feature']);
  const featureCommit = runGit(fixture.root, ['rev-parse', 'HEAD']);

  const result = runBuild(fixture, ['-AcceptedSourceCommit', featureCommit]);
  assert.notEqual(result.status, 0, output(result));
  assert.match(output(result), /main.*history|accepted main/i);
});

test('origin/main is authoritative over a locally advanced main branch', (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  runGit(fixture.root, ['update-ref', 'refs/remotes/origin/main', fixture.sourceCommit]);
  writeFileSync(join(fixture.root, 'local-main-only.txt'), 'not accepted by origin/main\n', 'utf8');
  runGit(fixture.root, ['add', 'local-main-only.txt']);
  runGit(fixture.root, ['commit', '-m', 'advance local main only']);
  const localMainCommit = runGit(fixture.root, ['rev-parse', 'HEAD']);

  const result = runBuild(fixture, ['-AcceptedSourceCommit', localMainCommit]);
  assert.notEqual(result.status, 0, output(result));
  assert.match(output(result), /main.*history|accepted main/i);
});

test('root release includes the locale and parallel homepage without extra drafts or source assets', (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));

  const result = runBuild(fixture);
  assert.equal(result.status, 0, output(result));
  const rootEntry = readIndex(fixture).find(entry => entry.kind === 'root');
  assert.ok(rootEntry);
  const manifest = JSON.parse(readFileSync(join(rootEntry.releaseDir, 'MANIFEST.json'), 'utf8'));
  const paths = manifest.files.map(file => file.path);
  assert.ok(paths.includes('ru/index.html'), 'root release omitted ru/index.html');
  assert.ok(!paths.includes('ru/not-public.html'), 'root release recursively included an unapproved locale file');
  for (const route of ['new/index.html', 'new/ru/index.html', 'new/about/index.html', 'new/ru/about/index.html']) {
    assert.ok(paths.includes(route), `root release omitted ${route}`);
  }
  for (const asset of ['styles.css', 'site.js', ...['rbpo', 'os', 'reg', 'offense', 'edu'].map(category => `illustrations/${category}.webp`)]) {
    assert.ok(paths.includes(`new/assets/${asset}`), `root release omitted ${asset}`);
  }
  for (const excluded of ['new/draft.html', 'new/assets/private-notes.txt', 'new/assets/illustrations/source.png', 'fixture-course/index.html']) {
    assert.ok(!paths.includes(excluded), `root release included unrelated ${excluded}`);
  }
  assert.ok(existsSync(rootEntry.archivePath));
  assert.equal(sha256(rootEntry.archivePath), rootEntry.archiveSha256);
});
