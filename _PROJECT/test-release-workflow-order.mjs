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
const browserPackage = JSON.parse(readFileSync(resolve(projectDir, '.browser-node', 'package.json'), 'utf8'));
const browserLock = JSON.parse(readFileSync(resolve(projectDir, '.browser-node', 'package-lock.json'), 'utf8'));

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
    'test-release-workflow-order.mjs',
    'test-deploy-manifest-boundary.mjs',
    'test-root-learning-paths.mjs',
    'test-pentest-materials.mjs',
    'test-course-map.mjs',
    'test-27-07-accessible-handout.mjs',
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
    /uses:\s*actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1[^\n]*\n\s+with:\s*\n\s+persist-credentials:\s*false/,
  );
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
