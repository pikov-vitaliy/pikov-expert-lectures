import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(projectDir);
const productionPowerShell = process.env.PIKOV_TEST_POWERSHELL || "powershell.exe";

function powerShellEnvironment() {
  if (!/^powershell(?:\.exe)?$/i.test(productionPowerShell)) return process.env;
  const userProfile = process.env.USERPROFILE || "C:\\Users\\Default";
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const windowsRoot = process.env.WINDIR || "C:\\Windows";
  return {
    ...process.env,
    PSModulePath: [
      path.join(userProfile, "Documents", "WindowsPowerShell", "Modules"),
      path.join(programFiles, "WindowsPowerShell", "Modules"),
      path.join(windowsRoot, "System32", "WindowsPowerShell", "v1.0", "Modules"),
    ].join(path.delimiter),
  };
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function runPowerShell(script, cwd) {
  const result = spawnSync(
    productionPowerShell,
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script],
    { cwd, encoding: "utf8", timeout: 120_000, env: powerShellEnvironment() },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function installDeterministicArchiveHelper(fixtureRoot) {
  const source = path.join(projectDir, "deterministic-archive.ps1");
  assert.ok(existsSync(source), "deterministic archive helper is missing");
  const destinationRoot = path.join(fixtureRoot, "_PROJECT");
  mkdirSync(destinationRoot, { recursive: true });
  cpSync(source, path.join(destinationRoot, "deterministic-archive.ps1"));
}

function walkFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function rewriteUtf8Newlines(root, newline) {
  for (const file of walkFiles(root)) {
    const bytes = readFileSync(file);
    if (bytes.includes(0)) continue;
    const text = bytes.toString("utf8");
    if (Buffer.from(text, "utf8").compare(bytes) !== 0) continue;
    const normalized = text.replace(/\r\n|\r|\n/g, "\n");
    writeFileSync(file, normalized.replace(/\n/g, newline), "utf8");
  }
}

function setTreeMtime(root, isoDate) {
  const when = new Date(isoDate);
  for (const file of walkFiles(root)) utimesSync(file, when, when);
}

function snapshot(paths) {
  return Object.fromEntries(paths.map(file => {
    const data = readFileSync(file);
    return [path.basename(file), { bytes: data.length, sha256: sha256(data) }];
  }));
}

function snapshotTree(root, base = root) {
  return Object.fromEntries(walkFiles(root).sort().map(file => {
    const data = readFileSync(file);
    return [path.relative(base, file).replaceAll("\\", "/"), {
      bytes: data.length,
      sha256: sha256(data),
    }];
  }));
}

function expandArchive(zipPath, destination) {
  mkdirSync(destination, { recursive: true });
  const command = [
    "$ErrorActionPreference='Stop'",
    `Expand-Archive -LiteralPath '${zipPath.replaceAll("'", "''")}' -DestinationPath '${destination.replaceAll("'", "''")}' -Force`,
  ].join("; ");
  const result = spawnSync(productionPowerShell, ["-NoProfile", "-Command", command], {
    encoding: "utf8",
    timeout: 60_000,
    env: powerShellEnvironment(),
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function assertJsonManifestMatchesZip(manifestPath, zipPath, extractionRoot) {
  expandArchive(zipPath, extractionRoot);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const manifestPaths = manifest.files.map(entry => entry.path).sort();
  const archivePaths = walkFiles(extractionRoot)
    .map(file => path.relative(extractionRoot, file).replaceAll("\\", "/"))
    .sort();
  assert.deepEqual(archivePaths, manifestPaths, "ZIP file set differs from manifest paths");
  for (const entry of manifest.files) {
    const extracted = path.join(extractionRoot, ...entry.path.split("/"));
    assert.ok(existsSync(extracted), `manifest path is absent from ZIP: ${entry.path}`);
    const data = readFileSync(extracted);
    assert.equal(data.length, entry.bytes, `byte count drift for ${entry.path}`);
    assert.equal(sha256(data).toUpperCase(), entry.sha256, `SHA-256 drift for ${entry.path}`);
  }
}

test("27-07 student ZIP is stable across checkout EOL and mtime changes", { timeout: 180_000 }, () => {
  const temp = mkdtempSync(path.join(tmpdir(), "pikov-deterministic-27-"));
  try {
    installDeterministicArchiveHelper(temp);
    const source = path.join(rootDir, "27-07-2026");
    const course = path.join(temp, "27-07-2026");
    cpSync(source, course, {
      recursive: true,
      filter: candidate => {
        const relative = path.relative(source, candidate).replaceAll("\\", "/");
        return !/(^|\/)(release|__pycache__|\.pytest_cache|\.ruff_cache|\.mypy_cache)(\/|$)/i.test(relative)
          && !/\.(?:zip|pdf|docx|pptx|xlsx|eps)$/i.test(relative);
      },
    });

    rewriteUtf8Newlines(course, "\n");
    setTreeMtime(course, "2001-01-01T00:00:00Z");
    const builder = path.join(course, "_build", "build-materials-zip.ps1");
    runPowerShell(builder, temp);
    const archive = path.join(course, "materials.zip");
    const manifest = path.join(course, "_build", "materials-zip-manifest.txt");
    const first = snapshot([archive, manifest]);

    rewriteUtf8Newlines(course, "\r\n");
    setTreeMtime(course, "2031-12-31T23:59:58Z");
    runPowerShell(builder, temp);
    const second = snapshot([archive, manifest]);
    assert.deepEqual(second, first, "27-07 output depends on checkout line endings or mtimes");

    const extracted = path.join(temp, "expanded-27");
    expandArchive(archive, extracted);
    const lines = readFileSync(manifest, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^([0-9a-f]{64}) {2}(.+?)(?: {2}<-.*)?$/i);
      if (!match) continue;
      const extractedFile = path.join(extracted, ...match[2].replaceAll("\\", "/").split("/"));
      assert.ok(existsSync(extractedFile), `27-07 manifest path is absent from ZIP: ${match[2]}`);
      assert.equal(sha256(readFileSync(extractedFile)), match[1].toLowerCase());
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("AppSec Day 1/2 ZIPs are stable across checkout EOL and mtime changes", { timeout: 240_000 }, () => {
  const temp = mkdtempSync(path.join(tmpdir(), "pikov-deterministic-appsec-"));
  try {
    installDeterministicArchiveHelper(temp);
    const source = path.join(rootDir, "appsec-lections");
    const site = path.join(temp, "appsec-lections");
    for (const relative of ["_build", "downloads/day-01", "downloads/day-02", "materials", "lab/juice-shop"]) {
      const from = path.join(source, ...relative.split("/"));
      const to = path.join(site, ...relative.split("/"));
      cpSync(from, to, {
        recursive: true,
        filter: candidate => !/\.(?:zip|pdf|docx|pptx|xlsx|eps)$/i.test(candidate),
      });
    }

    rewriteUtf8Newlines(site, "\n");
    setTreeMtime(site, "2001-01-01T00:00:00Z");
    const builder = path.join(site, "_build", "build-materials-zip.ps1");
    runPowerShell(builder, temp);
    const outputs = [
      "day-01-edited-transcript-and-summaries.zip",
      "day-01-canonical-safe-package.zip",
      "day-01-SHA256SUMS.md",
      "day-01-manifest.json",
      "day-02-edited-transcript-and-protocol.zip",
      "day-02-laboratory-materials.zip",
      "day-02-public-materials.zip",
      "day-02-SHA256SUMS.md",
      "day-02-manifest.json",
    ].map(name => path.join(site, "downloads", name));
    const first = snapshot(outputs);

    rewriteUtf8Newlines(site, "\r\n");
    setTreeMtime(site, "2031-12-31T23:59:58Z");
    runPowerShell(builder, temp);
    const second = snapshot(outputs);
    assert.deepEqual(second, first, "AppSec output depends on checkout line endings or mtimes");

    assertJsonManifestMatchesZip(
      path.join(site, "downloads", "day-01-manifest.json"),
      path.join(site, "downloads", "day-01-canonical-safe-package.zip"),
      path.join(temp, "expanded-day-01"),
    );
    assertJsonManifestMatchesZip(
      path.join(site, "downloads", "day-02-manifest.json"),
      path.join(site, "downloads", "day-02-public-materials.zip"),
      path.join(temp, "expanded-day-02"),
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("site release archives and indexes are reproducible from the same release date", { timeout: 240_000 }, () => {
  const temp = mkdtempSync(path.join(tmpdir(), "pikov-deterministic-release-"));
  try {
    const project = path.join(temp, "_PROJECT");
    const lecture = path.join(temp, "fixture-course");
    mkdirSync(project, { recursive: true });
    mkdirSync(lecture, { recursive: true });
    cpSync(path.join(projectDir, "build-release.ps1"), path.join(project, "build-release.ps1"));
    const archiveHelper = path.join(projectDir, "deterministic-archive.ps1");
    if (existsSync(archiveHelper)) cpSync(archiveHelper, path.join(project, "deterministic-archive.ps1"));
    writeFileSync(
      path.join(project, "build-astra-hardening-labs.ps1"),
      "param([switch]$Check)\nWrite-Output 'ASTRA FIXTURE OK'\nreturn\n",
      "utf8",
    );
    writeFileSync(
      path.join(project, "lectures.json"),
      JSON.stringify({
        updated: "2026-08-15",
        lectures: [{
          position: 1,
          folder: "fixture-course",
          domain: "fixture-course",
          url: "https://fixture-course.pikov.expert/",
          title: "Fixture course",
          status: "ready-local",
        }],
      }),
      "utf8",
    );
    const rootIndex = path.join(temp, "index.html");
    const lectureIndex = path.join(lecture, "index.html");
    writeFileSync(rootIndex, "<!doctype html>\n<title>Root fixture</title>\n", "utf8");
    writeFileSync(lectureIndex, "<!doctype html>\n<title>Lecture fixture</title>\n", "utf8");

    const run = () => {
      const result = spawnSync(
        productionPowerShell,
        [
          "-NoProfile",
          "-File",
          path.join(project, "build-release.ps1"),
          "-Root",
          temp,
          "-ReleaseDate",
          "2026-08-15",
          "-FailOnIssues",
        ],
        { cwd: temp, encoding: "utf8", timeout: 180_000, env: powerShellEnvironment() },
      );
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.match(result.stdout, /RELEASE BUILD OK/);
    };

    setTreeMtime(temp, "2001-01-01T00:00:00Z");
    run();
    const first = {
      root: snapshotTree(path.join(temp, "release"), temp),
      lecture: snapshotTree(path.join(lecture, "release"), temp),
      indexJson: snapshot([path.join(project, "RELEASE_INDEX_2026-08-15.json")]),
      indexMd: snapshot([path.join(project, "RELEASE_INDEX_2026-08-15.md")]),
    };

    writeFileSync(rootIndex, "<!doctype html>\r\n<title>Root fixture</title>\r\n", "utf8");
    writeFileSync(lectureIndex, "<!doctype html>\r\n<title>Lecture fixture</title>\r\n", "utf8");
    utimesSync(rootIndex, new Date("2031-12-31T23:59:58Z"), new Date("2031-12-31T23:59:58Z"));
    utimesSync(lectureIndex, new Date("2031-12-31T23:59:58Z"), new Date("2031-12-31T23:59:58Z"));
    run();
    const second = {
      root: snapshotTree(path.join(temp, "release"), temp),
      lecture: snapshotTree(path.join(lecture, "release"), temp),
      indexJson: snapshot([path.join(project, "RELEASE_INDEX_2026-08-15.json")]),
      indexMd: snapshot([path.join(project, "RELEASE_INDEX_2026-08-15.md")]),
    };
    assert.deepEqual(second, first, "release output depends on checkout line endings, mtimes or wall clock");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
