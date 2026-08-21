import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(projectDir, "..");
const tzDir = join(rootDir, "tz");
const indexPath = join(tzDir, "index.html");
const readmePath = join(tzDir, "README.md");
const generatorPath = join(tzDir, "tools", "build-tz-landing.mjs");
const read = path => readFileSync(path, "utf8");

function slideIds(html) {
  return [...html.matchAll(/<section class="slide(?: [^"]*)?" id="slide-(\d+)"/g)]
    .map(match => Number(match[1]));
}

function assertRequiredMetadata(html, label) {
  assert.match(html, /ym\(109116119, ['"]init['"], \{[^}]*webvisor:false/si, `${label}: Yandex Metrika policy is missing`);
  assert.match(html, /<link rel="canonical" href="https:\/\/tz\.pikov\.expert\/">/, `${label}: canonical URL is missing`);
  assert.match(html, /<meta property="og:url" content="https:\/\/tz\.pikov\.expert\/">/, `${label}: og:url is missing`);
  assert.match(html, /<meta property="og:image" content="https:\/\/pikov\.expert\/photo\.jpg">/, `${label}: og:image is missing`);
  assert.match(html, /<script type="application\/ld\+json">[\s\S]*?"@type": "Course"[\s\S]*?<\/script>/, `${label}: Course JSON-LD is missing`);
}

test("TZ runtime derives the navigation boundary from all 104 slides", () => {
  const html = read(indexPath);
  assert.deepEqual(slideIds(html), Array.from({ length: 104 }, (_, index) => index + 1));
  assert.match(
    html,
    /const slides = Array\.from\(document\.querySelectorAll\('\.slide'\)\);\s+const TOTAL = slides\.length;/,
    "the DOM slide collection must be the single runtime source for TOTAL",
  );
});

test("TZ documentation requires explicit check and write modes", () => {
  const readme = read(readmePath);
  assert.match(readme, /node \.\\tools\\build-tz-landing\.mjs --write/);
  assert.match(readme, /node \.\\tools\\build-tz-landing\.mjs --check/);
  assert.doesNotMatch(readme, /^node \.\\tools\\build-tz-landing\.mjs\s*$/mu);
});

test("TZ generator has read-only check and explicit atomic write modes", t => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "pikov-tz-generator-"));
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));

  const temporaryTools = join(temporaryRoot, "tz", "tools");
  mkdirSync(temporaryTools, { recursive: true });
  const temporaryGenerator = join(temporaryTools, "build-tz-landing.mjs");
  const temporaryIndex = join(temporaryRoot, "tz", "index.html");
  copyFileSync(generatorPath, temporaryGenerator);
  copyFileSync(indexPath, temporaryIndex);

  const run = mode => spawnSync(process.execPath, mode ? [temporaryGenerator, mode] : [temporaryGenerator], {
    cwd: temporaryTools,
    encoding: "utf8",
    stdio: "pipe",
  });

  const currentBefore = read(temporaryIndex);
  const currentMtimeBefore = statSync(temporaryIndex).mtimeMs;
  const currentCheck = run("--check");
  assert.equal(currentCheck.status, 0, currentCheck.stderr);
  assert.match(currentCheck.stdout, /TZ BUILD CHECK OK/);
  assert.equal(read(temporaryIndex), currentBefore, "--check must not rewrite a current snapshot");
  assert.equal(statSync(temporaryIndex).mtimeMs, currentMtimeBefore, "--check must not touch snapshot metadata");

  const stale = "deliberately stale TZ snapshot\n";
  writeFileSync(temporaryIndex, stale, "utf8");
  const staleCheck = run("--check");
  assert.equal(staleCheck.status, 1, "--check must reject a stale snapshot");
  assert.match(staleCheck.stderr, /TZ BUILD CHECK FAIL/);
  assert.equal(read(temporaryIndex), stale, "failed --check must be strictly read-only");

  const implicitMode = run();
  assert.equal(implicitMode.status, 2, "the generator must require --check or --write explicitly");
  assert.equal(read(temporaryIndex), stale, "missing mode must not mutate the snapshot");

  const write = run("--write");
  assert.equal(write.status, 0, write.stderr);
  assert.match(write.stdout, /TZ BUILD WRITE OK/);

  const committed = read(indexPath);
  const generated = read(temporaryIndex);
  assertRequiredMetadata(generated, "generated tz/index.html");
  assert.deepEqual(slideIds(generated), Array.from({ length: 104 }, (_, index) => index + 1));
  assert.equal(generated, committed, "tz/index.html must be an exact deterministic generator output");
  assert.deepEqual(
    readdirSync(join(temporaryRoot, "tz")).filter(name => name.startsWith(".index.html.") && name.endsWith(".tmp")),
    [],
    "atomic write must not leave temporary files behind",
  );

  const secondWrite = run("--write");
  assert.equal(secondWrite.status, 0, secondWrite.stderr);
  assert.equal(read(temporaryIndex), generated, "two writes must produce identical bytes");
});
