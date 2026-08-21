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
import { basename, delimiter, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));
const releaseDate = '2026-08-15';
const powershellExecutable = process.env.PIKOV_TEST_POWERSHELL ?? 'pwsh.exe';

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function sourceTreeSha256(records) {
  const tree = [...records]
    .sort((left, right) => Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)))
    .map((record) => `${record.path}\t${record.size}\t${record.sha256}\n`)
    .join('');
  return createHash('sha256').update(tree, 'utf8').digest('hex');
}

function runGit(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  return result.stdout.trim();
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
  const archivePayload = join(root, 'archive-payload');
  const payloadPath = join(archivePayload, 'index.html');
  const archiveTemplate = join(root, 'archive-template.zip');
  const archiveBuilder = join(fixtureProject, 'create-fixture-archive.ps1');
  mkdirSync(archivePayload);
  writeFileSync(payloadPath, 'fixture payload\n', 'utf8');
  writeFileSync(
    archiveBuilder,
    [
      'param([string]$Source, [string]$Destination)',
      "Add-Type -AssemblyName 'System.IO.Compression.FileSystem'",
      '[System.IO.Compression.ZipFile]::CreateFromDirectory($Source, $Destination)',
      '',
    ].join('\n'),
    'utf8',
  );
  const archiveBuild = spawnSync(
    powershellExecutable,
    [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', archiveBuilder,
      '-Source', archivePayload,
      '-Destination', archiveTemplate,
    ],
    { encoding: 'utf8', timeout: 30_000 },
  );
  assert.equal(archiveBuild.status, 0, output(archiveBuild));
  const payloadRecord = {
    path: 'index.html',
    size: readFileSync(payloadPath).length,
    sha256: sha256(payloadPath),
  };
  const treeSha256 = sourceTreeSha256([payloadRecord]);
  const entries = canonicalTargets(lectures).map((target) => {
    const archiveName = expectedArchiveName(target);
    const releaseDir = target.kind === 'root'
      ? join(root, 'release')
      : join(root, target.folder, 'release');
    mkdirSync(releaseDir, { recursive: true });
    const archivePath = join(releaseDir, archiveName);
    cpSync(archiveTemplate, archivePath);
    return {
      ...target,
      archivePath,
      archiveName,
      archiveSha256: sha256(archivePath),
      sourceTreeSha256: treeSha256,
    };
  });

  writeFileSync(
    join(root, '.gitignore'),
    '_PROJECT/RELEASE_INDEX_*.json\n_PROJECT/.hosting-deploy-*\n_PROJECT/HOSTING_DEPLOY_*.md\n',
    'utf8',
  );
  runGit(root, ['init', '--initial-branch=main']);
  runGit(root, ['config', 'user.name', 'Pikov release test']);
  runGit(root, ['config', 'user.email', 'release-test@invalid.example']);
  runGit(root, ['add', '.']);
  runGit(root, ['commit', '-m', 'fixture']);
  const sourceCommit = runGit(root, ['rev-parse', 'HEAD']);
  for (const entry of entries) {
    entry.provenanceVersion = 1;
    entry.releaseKind = 'accepted';
    entry.sourceCommit = sourceCommit;
    entry.sourceRef = 'refs/heads/main';
    entry.sourceDirty = false;
    entry.deployable = true;
    entry.policyDecision = 'allow-deploy';
    entry.releaseDate = releaseDate;
  }

  return { root, fixtureProject, entries, sourceCommit };
}

function runPrepare(fixture, entries, { expectedSourceCommit = fixture.sourceCommit, includeExpected = true } = {}) {
  const indexPath = join(fixture.fixtureProject, `RELEASE_INDEX_${releaseDate}.json`);
  writeFileSync(indexPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  const args = [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', join(fixture.fixtureProject, 'deploy-hosting.ps1'),
    '-Root', fixture.root,
    '-ReleaseDate', releaseDate,
    '-PrepareOnly',
  ];
  if (includeExpected) args.push('-ExpectedSourceCommit', expectedSourceCommit);
  return spawnSync(
    powershellExecutable,
    args,
    { encoding: 'utf8', timeout: 30_000 },
  );
}

function runFailedHostingCheck(fixture, entries) {
  const indexPath = join(fixture.fixtureProject, `RELEASE_INDEX_${releaseDate}.json`);
  writeFileSync(indexPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  const fakeBin = join(fixture.root, 'fake-bin');
  mkdirSync(fakeBin);
  writeFileSync(join(fakeBin, 'ssh.cmd'), '@echo off\necho /tmp/pikov-fake-home\nexit /b 0\n', 'utf8');
  writeFileSync(join(fakeBin, 'scp.cmd'), '@echo off\nexit /b 0\n', 'utf8');
  writeFileSync(
    join(fixture.fixtureProject, 'hosting-check.ps1'),
    "param([string]$Root, [string]$ReleaseDate)\nWrite-Output 'FIXTURE HOSTING FAIL'\nexit 1\n",
    'utf8',
  );
  return spawnSync(
    powershellExecutable,
    [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', join(fixture.fixtureProject, 'deploy-hosting.ps1'),
      '-Root', fixture.root,
      '-ReleaseDate', releaseDate,
      '-ExpectedSourceCommit', fixture.sourceCommit,
      '-KeepRemoteDeployRoot',
    ],
    {
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, PATH: `${fakeBin}${delimiter}${process.env.PATH ?? ''}` },
    },
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
  assert.match(remoteScript, /EXPECTED_SOURCE_COMMIT/);
  assert.doesNotMatch(remoteScript, /^\s*target="\$HOME\/\$domain\/www"\s*$/mu);

  const summaryMatch = result.stdout.match(/^summary=(.+)$/mu);
  assert.ok(summaryMatch, `unique deploy evidence path missing:\n${output(result)}`);
  const summaryPath = summaryMatch[1].trim();
  assert.match(basename(summaryPath), new RegExp(`^HOSTING_DEPLOY_${releaseDate}_\\d{8}-\\d{9}_${fixture.sourceCommit.slice(0, 12)}(?:-\\d+)?\\.md$`));
  const summary = readFileSync(summaryPath, 'utf8');
  assert.match(summary, new RegExp(`Source commit: ${fixture.sourceCommit}`));
  assert.match(summary, /^Evidence UTC: \d{4}-\d{2}-\d{2}T.+Z$/mu);
  assert.match(summary, /Status: PREPARED/);
  for (const entry of fixture.entries) {
    assert.match(summary, new RegExp(`${entry.domain.replaceAll('.', '\\.')}.+${entry.archiveSha256}`));
    assert.match(summary, new RegExp(`${entry.domain.replaceAll('.', '\\.')}.+${entry.sourceTreeSha256}`));
  }
});

test('PrepareOnly accepts an exact detached checkout for a previously accepted rollback release', (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  writeFileSync(join(fixture.fixtureProject, 'main-advanced.txt'), 'main advanced after accepted release\n', 'utf8');
  runGit(fixture.root, ['add', '_PROJECT/main-advanced.txt']);
  runGit(fixture.root, ['commit', '-m', 'advance main after accepted release']);
  const currentMain = runGit(fixture.root, ['rev-parse', 'main']);
  assert.notEqual(currentMain, fixture.sourceCommit);
  runGit(fixture.root, ['checkout', '--detach', fixture.sourceCommit]);

  const result = runPrepare(fixture, fixture.entries);
  assert.equal(result.status, 0, output(result));
  const summaryMatch = result.stdout.match(/^summary=(.+)$/mu);
  assert.ok(summaryMatch, output(result));
  const summary = readFileSync(summaryMatch[1].trim(), 'utf8');
  assert.match(summary, /Release source ref: refs\/heads\/main/);
  assert.match(summary, /Deployment checkout ref: detached-HEAD/);
});

test('PrepareOnly rejects an exact but unmerged feature commit', (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  runGit(fixture.root, ['checkout', '-b', 'unmerged-feature']);
  writeFileSync(join(fixture.root, 'feature-only.txt'), 'not accepted by main\n', 'utf8');
  runGit(fixture.root, ['add', 'feature-only.txt']);
  runGit(fixture.root, ['commit', '-m', 'unmerged feature']);
  const featureCommit = runGit(fixture.root, ['rev-parse', 'HEAD']);
  const entries = structuredClone(fixture.entries);
  for (const entry of entries) {
    entry.sourceCommit = featureCommit;
    entry.sourceRef = 'refs/heads/unmerged-feature';
  }

  assertRejected(
    runPrepare({ ...fixture, sourceCommit: featureCommit }, entries),
    /main.*history|accepted main/i,
  );
});

test('PrepareOnly rejects local main commits not present in origin/main', (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  runGit(fixture.root, ['update-ref', 'refs/remotes/origin/main', fixture.sourceCommit]);
  writeFileSync(join(fixture.fixtureProject, 'local-main-only.txt'), 'not accepted by origin/main\n', 'utf8');
  runGit(fixture.root, ['add', '_PROJECT/local-main-only.txt']);
  runGit(fixture.root, ['commit', '-m', 'advance local main only']);
  const localMainCommit = runGit(fixture.root, ['rev-parse', 'HEAD']);
  const entries = structuredClone(fixture.entries);
  for (const entry of entries) entry.sourceCommit = localMainCommit;

  assertRejected(
    runPrepare({ ...fixture, sourceCommit: localMainCommit }, entries),
    /main.*history|accepted main/i,
  );
});

test('a failed child hosting check records FAILED evidence after remote execution', (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));

  const result = runFailedHostingCheck(fixture, fixture.entries);
  assert.notEqual(result.status, 0, output(result));
  const summaryMatch = result.stdout.match(/^summary=(.+)$/mu);
  assert.ok(summaryMatch, output(result));
  const summary = readFileSync(summaryMatch[1].trim(), 'utf8');
  assert.match(summary, /Status: FAILED/);
  assert.match(summary, /FIXTURE HOSTING FAIL|Command failed/i);
});

test('PrepareOnly requires and validates the exact accepted source commit', async (t) => {
  const fixture = makeFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));

  await t.test('missing ExpectedSourceCommit', () => {
    assertRejected(
      runPrepare(fixture, fixture.entries, { includeExpected: false }),
      /ExpectedSourceCommit.*required/i,
    );
  });

  await t.test('expected commit differs from release provenance', () => {
    const otherCommit = 'a'.repeat(40) === fixture.sourceCommit ? 'b'.repeat(40) : 'a'.repeat(40);
    assertRejected(
      runPrepare(fixture, fixture.entries, { expectedSourceCommit: otherCommit }),
      /source commit|HEAD|ExpectedSourceCommit/i,
    );
  });

  await t.test('release index contains a different source commit', () => {
    const entries = structuredClone(fixture.entries);
    entries[0].sourceCommit = 'b'.repeat(40);
    assertRejected(runPrepare(fixture, entries), /source commit/i);
  });

  await t.test('candidate or dirty release is never deployable', () => {
    const entries = structuredClone(fixture.entries);
    for (const entry of entries) {
      entry.releaseKind = 'candidate';
      entry.sourceDirty = true;
      entry.deployable = false;
    }
    assertRejected(runPrepare(fixture, entries), /candidate|dirty|deployable/i);
  });

  await t.test('policy decision must explicitly allow deployment', () => {
    const entries = structuredClone(fixture.entries);
    entries[0].policyDecision = 'deny-deploy';
    assertRejected(runPrepare(fixture, entries), /policy|deploy/i);
  });

  await t.test('release date must match the selected index date', () => {
    const entries = structuredClone(fixture.entries);
    entries[0].releaseDate = '2026-08-14';
    assertRejected(runPrepare(fixture, entries), /release date/i);
  });

  await t.test('source tree digest must match the selected archive', () => {
    const entries = structuredClone(fixture.entries);
    entries[0].sourceTreeSha256 = entries[0].sourceTreeSha256 === 'a'.repeat(64)
      ? 'b'.repeat(64)
      : 'a'.repeat(64);
    assertRejected(runPrepare(fixture, entries), /source tree/i);
  });
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
