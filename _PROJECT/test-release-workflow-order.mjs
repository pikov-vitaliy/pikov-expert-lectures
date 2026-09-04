import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));
const runbook = readFileSync(resolve(projectDir, 'OPERATIONS_RUNBOOK.md'), 'utf8');
const deploy = readFileSync(resolve(projectDir, 'deploy-hosting.ps1'), 'utf8');
const workflow = readFileSync(resolve(projectDir, '..', '.github', 'workflows', 'site-checks.yml'), 'utf8');
const gitignore = readFileSync(resolve(projectDir, '..', '.gitignore'), 'utf8');
const affiliationGuard = readFileSync(resolve(projectDir, 'test-public-affiliation-hygiene.mjs'), 'utf8');
const releaseIndependenceGuard = readFileSync(resolve(projectDir, 'test-public-release-independence.ps1'), 'utf8');
const browserPackage = JSON.parse(readFileSync(resolve(projectDir, '.browser-node', 'package.json'), 'utf8'));
const browserLock = JSON.parse(readFileSync(resolve(projectDir, '.browser-node', 'package-lock.json'), 'utf8'));

const RETIRED_VKR_JPG_HASHES = [
  '284482990cba7f331572ebea2f8a98dde900aa5432c32ab0a7428e83fd33b6d8',
  '053dcabf7cdf2b90c1a17bb8e784622bdfcd9b644a318f9136704d6032b06e14',
  '29903ed8a2fb5d4d2bc2f04cce7e7a0a518efd1aacbbbe8bdafedaf4d1169d63',
  'fd487f72c6b891514fc3a9c371d4b98d170049be57fac7d419befb157fdef68e',
  'ea0e1d060d2fe0e941800a581c6a9a579c7c268eef9dc975edd26690a4bf1ca7',
  '77239f856e1cfe3f8d1d961195655517abe156888ef718858bfb1efe0363252e',
];

test('runbook never stages the whole workspace', () => {
  assert.doesNotMatch(runbook, /^git add -A\s*$/mu);
  assert.match(runbook, /git add --/);
  assert.match(runbook, /pc\//);
});

test('accepted SHA is pushed and CI-verified before deployment', () => {
  const commit = runbook.indexOf('git commit');
  const push = runbook.indexOf('git push');
  const ci = runbook.indexOf('gh run watch');
  const deployStart = runbook.indexOf('deploy-hosting.ps1', ci);
  assert.ok(commit >= 0 && push > commit, 'push must follow commit');
  assert.ok(ci > push, 'CI watch must follow push');
  assert.ok(deployStart > ci, 'deploy must follow successful CI verification');
  assert.match(runbook, /точн(?:ого|ый) SHA/iu);
});

test('deployment accepts only the merged commit refreshed from origin/main', () => {
  const prChecks = runbook.indexOf('gh pr checks');
  const prMerge = runbook.indexOf('gh pr merge');
  const mergedState = runbook.indexOf("$mergedPr.state -ne 'MERGED'", prMerge);
  const switchMain = runbook.indexOf('git switch main', prMerge);
  const pullMain = runbook.indexOf('git pull --ff-only origin main', switchMain);
  const acceptedSha = runbook.indexOf('$acceptedSha = git rev-parse origin/main', pullMain);
  const exactHead = runbook.indexOf("git rev-parse HEAD) -ne $acceptedSha", acceptedSha);
  const exactCiList = runbook.indexOf('gh run list --commit $acceptedSha', acceptedSha);
  const exactCiWatch = runbook.indexOf('gh run watch', exactCiList);
  const exactCiSuccess = runbook.indexOf("$acceptedResult.conclusion -ne 'success'", exactCiWatch);
  const releaseSection = runbook.indexOf('## 6.');
  const deploymentBuild = runbook.indexOf('build-release.ps1', releaseSection);
  const deployment = runbook.indexOf('deploy-hosting.ps1', releaseSection);

  assert.ok(prChecks >= 0 && prMerge > prChecks, 'required PR checks must precede explicit merge');
  assert.ok(mergedState > prMerge && switchMain > mergedState, 'verify that the PR was merged into main');
  assert.ok(switchMain > prMerge, 'checkout main only after PR merge');
  assert.ok(pullMain > switchMain, 'refresh local main from origin/main');
  assert.ok(acceptedSha > pullMain, 'derive accepted SHA from refreshed origin/main');
  assert.ok(exactHead > acceptedSha, 'verify local HEAD equals accepted origin/main SHA');
  assert.ok(exactCiList > acceptedSha, 'select the CI run by exact accepted main SHA');
  assert.ok(exactCiWatch > exactCiList, 'wait for the exact accepted main SHA CI run');
  assert.ok(exactCiSuccess > exactCiWatch, 'require a successful conclusion for the exact main SHA');
  assert.ok(deploymentBuild > exactCiSuccess, 'build deployment artifacts only after accepted main SHA CI');
  assert.ok(deployment > deploymentBuild, 'deploy only after the post-acceptance build');
});

test('build, independence check and deploy use one explicit release date', () => {
  assert.match(runbook, /\$releaseDate\s*=\s*'<YYYY-MM-DD>'/);
  assert.match(runbook, /\$releaseIndex\s*=\s*"\.\\_PROJECT\\RELEASE_INDEX_\$releaseDate\.json"/);
  assert.doesNotMatch(
    runbook,
    /^powershell .*build-release\.ps1(?!.*-ReleaseDate \$releaseDate).*$/gmu,
  );
  assert.doesNotMatch(
    runbook,
    /^powershell .*test-public-release-independence\.ps1(?!.*-ReleaseIndex \$releaseIndex).*$/gmu,
  );
  for (const command of [
    'deploy-hosting.ps1',
    'hosting-check.ps1',
  ]) {
    assert.match(runbook, new RegExp(`${command.replaceAll('.', '\\.')} -ReleaseDate \\$releaseDate`));
  }
  assert.match(runbook, /\$env:RELEASE_DATE=\$releaseDate; node \.\\_PROJECT\\browser-qa-online\.mjs/);
});

test('local release and deployment both enforce public independence', () => {
  assert.match(runbook, /test-public-release-independence\.ps1/);
  assert.match(deploy, /test-public-release-independence\.ps1/);
  assert.match(deploy, /-ReleaseIndex \$releaseIndexPath/);
});

test('CI runs the static content and workflow regression tests', () => {
  for (const name of [
    'test-international-content-currentness.mjs',
    'test-platform-content-currentness.mjs',
    'test-evergreen-course-dates.mjs',
    'test-main-rbpo-publication.mjs',
    'test-main-rbpo-layout.mjs',
    'test-release-workflow-order.mjs',
    'test-release-provenance.mjs',
    'test-deploy-manifest-boundary.mjs',
    'test-root-learning-paths.mjs',
    'test-root-bilingual.mjs',
    'test-pentest-materials.mjs',
    'test-course-map.mjs',
    'test-27-07-accessible-handout.mjs',
    'test-generated-artifact-determinism.mjs',
    'test-root-professional-profile.mjs',
    'test-root-locale-routes.mjs',
    'qa-root-locale-routes.mjs',
    'test-public-affiliation-hygiene.mjs',
    'test-tz-landing.mjs',
    'qa-tz-navigation.mjs',
    'test-spdx-page-metadata.mjs',
    'test-layout-accessibility-regressions.mjs',
    'security_regression_tests.py',
    'dvwa-safety-test.py',
    'juice-shop-safety-test.py',
    'step3_student_solution',
  ]) {
    assert.match(workflow, new RegExp(name.replaceAll('.', '\\.')));
  }

  assert.match(workflow, /playwright(?:\.cmd)? install chromium/);
  assert.match(workflow, /browser-qa\.mjs/);
  assert.match(
    workflow,
    /node\s+\.\\_PROJECT\\update-spdx-page-metadata\.mjs\s+--root\s+\.\\spdx\s+--check/,
    'CI must reject stale generated SPDX metadata',
  );
  assert.match(
    workflow,
    /node\s+\.\\tz\\tools\\build-tz-landing\.mjs\s+--check/,
    'CI must reject a stale generated TZ page without rewriting it',
  );
  assert.match(
    workflow,
    /node\s+\.\\_PROJECT\\build-root-locales\.mjs\s+--check/,
    'CI must reject a stale generated Russian root document',
  );
  assert.match(
    workflow,
    /test-public-release-independence\.ps1\s+-PolicySelfTest/,
    'CI must execute context-aware affiliation policy fixtures',
  );
});

test('CI exposes a manual exact-ref recovery trigger', () => {
  assert.match(
    workflow,
    /^\s{2}workflow_dispatch:\s*$/mu,
    'operators need a fail-closed way to run the same workflow when a push event is not delivered',
  );
});

test('CI checks the complete changed range for whitespace before any build', () => {
  const checkout = workflow.indexOf('- name: Checkout');
  const diffGate = workflow.indexOf('- name: Check changed range formatting', checkout);
  const firstBuild = workflow.indexOf('- name: Build canonical AppSec handouts');
  assert.ok(checkout >= 0 && diffGate > checkout, 'range-aware diff gate must follow checkout');
  assert.ok(firstBuild > diffGate, 'range-aware diff gate must run before any build');

  const gateBody = workflow.slice(diffGate, firstBuild);
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.match(gateBody, /BASE_SHA/);
  assert.match(gateBody, /git merge-base/);
  assert.match(gateBody, /git diff --check [^\r\n]*\$baseSha\.\.HEAD/);
  assert.doesNotMatch(gateBody, /^\s*git diff --check\s*$/mu, 'bare diff --check misses earlier commits in a PR');
});

test('source and nested-release affiliation guards pin every retired branded VKR JPG', () => {
  for (const hash of RETIRED_VKR_JPG_HASHES) {
    assert.match(affiliationGuard, new RegExp(hash), `tracked-source guard is missing ${hash}`);
    assert.match(releaseIndependenceGuard, new RegExp(hash), `nested-release guard is missing ${hash}`);
  }
  assert.match(affiliationGuard, /createHash\(['"]sha256['"]\)/, 'tracked public binaries must be hashed');
  assert.match(affiliationGuard, /publicTracked/, 'the tracked guard must cover the complete public file set');
  assert.match(releaseIndependenceGuard, /Test-Archive[\s\S]*Depth \(\$Depth \+ 1\)/, 'release guard must recurse into nested archives');
});

test('CI rejects tracked-file drift immediately after the release build', () => {
  const build = workflow.indexOf('- name: Build release archives');
  const driftGate = workflow.indexOf('- name: Verify release build did not change tracked files', build);
  const independence = workflow.indexOf('- name: Verify public release independence', build);
  assert.ok(build >= 0, 'release build step is missing');
  assert.ok(driftGate > build, 'tracked-file drift gate must follow the release build');
  assert.ok(independence > driftGate, 'public independence must run only after the drift gate');

  const gateBody = workflow.slice(driftGate, independence);
  assert.match(gateBody, /git status --porcelain=v1 --untracked-files=no/);
  assert.match(gateBody, /if\s*\(\$LASTEXITCODE -ne 0\)/);
  assert.match(gateBody, /\$trackedDrift\.Count -ne 0/);
  assert.match(gateBody, /Tracked files changed during release build/);
});

test('CI creates an accepted release only for an exact push to main', () => {
  const buildStart = workflow.indexOf('- name: Build release archives');
  const buildEnd = workflow.indexOf('- name: Verify release build did not change tracked files', buildStart);
  assert.ok(buildStart >= 0 && buildEnd > buildStart, 'release build step is missing');
  const buildStep = workflow.slice(buildStart, buildEnd);
  assert.match(buildStep, /GITHUB_EVENT_NAME[^\r\n]*-eq\s+['"]push['"]/);
  assert.match(buildStep, /GITHUB_REF[^\r\n]*-eq\s+['"]refs\/heads\/main['"]/);
  assert.match(buildStep, /-AcceptedSourceCommit\s+\$sourceCommit/);
  assert.match(buildStep, /RELEASE_SOURCE_COMMIT/);
  assert.match(buildStep, /RELEASE_ACCEPTED_MAIN/);
  assert.match(buildStep, /else\s*\{[\s\S]*build-release\.ps1\s+-FailOnIssues/);
});

test('CI proves that a candidate release is rejected by the deploy gate', () => {
  const prepareStart = workflow.indexOf('- name: Prepare deploy script');
  assert.ok(prepareStart >= 0, 'deploy prepare step is missing');
  const prepareStep = workflow.slice(prepareStart);
  assert.match(prepareStep, /RELEASE_ACCEPTED_MAIN/);
  assert.match(prepareStep, /-ExpectedSourceCommit\s+\$env:RELEASE_SOURCE_COMMIT/);
  assert.match(prepareStep, /LASTEXITCODE/);
  assert.match(prepareStep, /candidate release was unexpectedly accepted/i);
  assert.match(
    prepareStep,
    /Candidate release rejection verified[\s\S]*\$global:LASTEXITCODE\s*=\s*0/,
    'the expected candidate rejection must not leak its native exit code to the GitHub pwsh wrapper',
  );
});

test('accepted-main runbook repeats the fail-closed tracked-file drift gate after build', () => {
  const releaseStart = runbook.indexOf('## 6.');
  const releaseEnd = runbook.indexOf('Для адресной публикации', releaseStart);
  const releaseBody = runbook.slice(releaseStart, releaseEnd);
  const build = releaseBody.indexOf('build-release.ps1');
  const status = releaseBody.indexOf('git status --porcelain=v1 --untracked-files=no', build);
  const independence = releaseBody.indexOf('test-public-release-independence.ps1', build);

  assert.ok(build >= 0, 'accepted-main release build is missing');
  assert.ok(status > build, 'tracked-file drift must be checked after the accepted-main build');
  assert.ok(independence > status, 'independence check must follow the tracked-file drift gate');
  const gateBody = releaseBody.slice(status, independence);
  assert.match(gateBody, /if\s*\(\$LASTEXITCODE -ne 0\)/);
  assert.match(gateBody, /\$trackedDrift\.Count -ne 0/);
  assert.match(gateBody, /Tracked files changed during release build/);
});

test('CI uses least privilege and an immutable checkout action', () => {
  assert.match(workflow, /^permissions:\s*\n\s+contents:\s*read\s*$/mu);
  assert.match(
    workflow,
    /uses:\s*actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1(?:\s*#\s*v7)?/,
  );
  assert.doesNotMatch(workflow, /uses:\s*actions\/checkout@v\d+/);
  assert.match(
    workflow,
    /uses:\s*actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1[^\r\n]*\r?\n\s+with:\s*\r?\n(?:\s+[^\r\n]+\r?\n)*?\s+persist-credentials:\s*false/,
  );
});

test('CI parses Juice Shop wrappers with Windows PowerShell 5.1', () => {
  const start = workflow.indexOf('- name: Parse Windows PowerShell lab wrappers');
  const end = workflow.indexOf('- name: Run smoke check', start);
  assert.ok(start >= 0 && end > start, 'Windows PowerShell wrapper parse step is missing');
  const step = workflow.slice(start, end);
  assert.match(step, /shell:\s*powershell/);
  for (const wrapper of [
    'preflight-juice-shop-lab.ps1',
    'start-juice-shop-lab.ps1',
    'stop-juice-shop-lab.ps1',
  ]) {
    assert.match(step, new RegExp(wrapper.replaceAll('.', '\\.')));
  }
  assert.match(step, /\[scriptblock\]::Create/);
});

test('CI browser dependency is exact and reproducible from a committed lockfile', () => {
  assert.equal(browserPackage.private, true);
  assert.equal(browserPackage.devDependencies?.playwright, '1.61.0');
  assert.equal(browserPackage.dependencies, undefined);
  assert.equal(browserPackage.scripts, undefined);

  assert.equal(browserLock.lockfileVersion, 3);
  assert.equal(browserLock.packages?.['']?.devDependencies?.playwright, '1.61.0');
  assert.equal(browserLock.packages?.['node_modules/playwright']?.version, '1.61.0');
  assert.equal(browserLock.packages?.['node_modules/playwright-core']?.version, '1.61.0');
  assert.match(browserLock.packages?.['node_modules/playwright']?.integrity ?? '', /^sha512-/);
  assert.match(browserLock.packages?.['node_modules/playwright-core']?.integrity ?? '', /^sha512-/);

  assert.match(gitignore, /^_PROJECT\/\.browser-node\/\*\s*$/mu);
  assert.match(gitignore, /^!_PROJECT\/\.browser-node\/package\.json\s*$/mu);
  assert.match(gitignore, /^!_PROJECT\/\.browser-node\/package-lock\.json\s*$/mu);
});

test('CI installs the locked dependency without lifecycle scripts before explicit browser installation', () => {
  const dependencyInstall = workflow.split(/\r?\n/u).find((line) => /\bnpm ci\b/u.test(line));
  assert.ok(dependencyInstall, 'workflow must use npm ci');
  assert.match(dependencyInstall, /--prefix\s+\.\\_PROJECT\\\.browser-node/);
  assert.match(dependencyInstall, /--ignore-scripts/);
  assert.match(dependencyInstall, /--no-audit/);
  assert.match(dependencyInstall, /--no-fund/);
  assert.doesNotMatch(workflow, /npm install\s+--prefix\s+\.\\_PROJECT\\\.browser-node/);

  const dependencyOffset = workflow.indexOf(dependencyInstall);
  const browserInstallOffset = workflow.search(/playwright(?:\.cmd)? install chromium/);
  assert.ok(browserInstallOffset > dependencyOffset, 'explicit Chromium install must follow npm ci');
});
