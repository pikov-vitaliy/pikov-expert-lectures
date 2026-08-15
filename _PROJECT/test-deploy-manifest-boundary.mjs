import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));
const releaseDate = '2026-08-15';

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function canonicalTargets(lectures) {
  const firstByFolder = new Map();
  for (const lecture of lectures.lectures) {
    if (!firstByFolder.has(lecture.folder)) firstByFolder.set(lecture.folder, lecture);
  }
  return [
    { kind: 'root', folder: '', domain: 'pikov.expert' },
    ...[...firstByFolder.entries()].map(([folder, lecture]) => ({
      kind: 'domain',
      folder,
      domain: `${lecture.domain}.pikov.expert`,
    })),
  ];
}

function expectedArchiveName(target) {
  return target.kind === 'root'
    ? `pikov.expert-root-release-${releaseDate}.zip`
    : `${target.domain}-release-${releaseDate}.zip`;
}

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'pikov-deploy-boundary-'));
  const fixtureProject = join(root, '_PROJECT');
  mkdirSync(fixtureProject, { recursive: true });
  copyFileSync(join(projectDir, 'deploy-hosting.ps1'), join(fixtureProject, 'deploy-hosting.ps1'));
  copyFileSync(join(projectDir, 'lectures.json'), join(fixtureProject, 'lectures.json'));
  writeFileSync(
    join(fixtureProject, 'test-public-release-independence.ps1'),
    "param([string]$Root, [string]$ReleaseIndex)\nWrite-Output 'FIXTURE INDEPENDENCE OK'\n",
    'utf8',
  );

  const lectures = JSON.parse(readFileSync(join(fixtureProject, 'lectures.json'), 'utf8'));
  const entries = canonicalTargets(lectures).map((target) => {
    const archiveName = expectedArchiveName(target);
    const releaseDir = target.kind === 'root'
      ? join(root, 'release')
      : join(root, target.folder, 'release');
    mkdirSync(releaseDir, { recursive: true });
    const archivePath = join(releaseDir, archiveName);
    writeFileSync(archivePath, `fixture archive for ${target.domain}\n`, 'utf8');
    return {
      ...target,
      archivePath,
      archiveName,
      archiveSha256: sha256(archivePath),
    };
  });

  return { root, fixtureProject, entries };
}

function runPrepare(fixture, entries) {
  const indexPath = join(fixture.fixtureProject, `RELEASE_INDEX_${releaseDate}.json`);
  writeFileSync(indexPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  return spawnSync(
    'pwsh.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', join(fixture.fixtureProject, 'deploy-hosting.ps1'),
      '-Root', fixture.root,
      '-ReleaseDate', releaseDate,
      '-PrepareOnly',
    ],
    { encoding: 'utf8', timeout: 30_000 },
  );
}

function output(result) {
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
}

function assertRejected(result, expectedReason) {
  assert.notEqual(result.status, 0, `unsafe release index was accepted:\n${output(result)}`);
  assert.match(output(result), expectedReason);
}

test('PrepareOnly accepts the exact canonical release index and emits a contained remote target guard', (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));

  const result = runPrepare(fixture, fixture.entries);
  assert.equal(result.status, 0, output(result));
  assert.match(result.stdout, /DEPLOY PREPARE OK/);

  const scriptMatch = result.stdout.match(/^remoteScript=(.+)$/mu);
  assert.ok(scriptMatch, `remote script path missing:\n${output(result)}`);
  const remoteScript = readFileSync(scriptMatch[1].trim(), 'utf8');
  assert.match(remoteScript, /os\.path\.realpath/);
  assert.match(remoteScript, /os\.path\.commonpath/);
  assert.match(remoteScript, /target escapes expected domain root/);
  assert.doesNotMatch(remoteScript, /^\s*target="\$HOME\/\$domain\/www"\s*$/mu);
});

test('PrepareOnly rejects a same-sized index with a missing and duplicated canonical domain', (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const entries = structuredClone(fixture.entries);
  entries.at(-1).domain = entries.at(-2).domain;

  assertRejected(runPrepare(fixture, entries), /canonical domain set|duplicate domain/i);
});

test('PrepareOnly rejects path syntax in domain and archiveName fields', async (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));

  await t.test('domain traversal', () => {
    const entries = structuredClone(fixture.entries);
    entries[0].domain = '../outside';
    assertRejected(runPrepare(fixture, entries), /unsafe domain|canonical domain set/i);
  });

  await t.test('archiveName traversal', () => {
    const entries = structuredClone(fixture.entries);
    entries[0].archiveName = '..\\outside.zip';
    assertRejected(runPrepare(fixture, entries), /unsafe archiveName|archiveName mismatch/i);
  });

  await t.test('archiveName control character', () => {
    const entries = structuredClone(fixture.entries);
    entries[0].archiveName = `pikov.expert-root-release-${releaseDate}\u0007.zip`;
    assertRejected(runPrepare(fixture, entries), /unsafe archiveName|archiveName mismatch/i);
  });
});

test('PrepareOnly binds every archive name and path to its canonical domain target', async (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));

  await t.test('mismatched archive name', () => {
    const entries = structuredClone(fixture.entries);
    entries[1].archiveName = entries[2].archiveName;
    assertRejected(runPrepare(fixture, entries), /archiveName mismatch/i);
  });

  await t.test('redirected archive path with a valid leaf name', () => {
    const entries = structuredClone(fixture.entries);
    const outsideDir = join(fixture.root, 'redirected-release');
    mkdirSync(outsideDir);
    const redirected = join(outsideDir, basename(entries[0].archivePath));
    cpSync(entries[0].archivePath, redirected);
    entries[0].archivePath = redirected;
    entries[0].archiveSha256 = sha256(redirected);
    assertRejected(runPrepare(fixture, entries), /archivePath mismatch/i);
  });
});
