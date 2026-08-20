import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectDir = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(projectDir);
const updater = join(projectDir, "update-spdx-page-metadata.mjs");
const productionSpdx = join(rootDir, "spdx");

function runUpdater(spdxRoot, mode) {
  return spawnSync(
    process.execPath,
    [updater, "--root", spdxRoot, mode],
    { encoding: "utf8", timeout: 30_000 },
  );
}

function commandOutput(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function xhtml(title) {
  return `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML+RDFa 1.0//EN" "http://www.w3.org/MarkUp/DTD/xhtml-rdfa-1.dtd">\n<html xmlns="http://www.w3.org/1999/xhtml">\n  <head>\n    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />\n    <title>${title}</title>\n  </head>\n  <body><h1>${title}</h1></body>\n</html>\n`;
}

function canonicalValues(html) {
  return [...html.matchAll(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/giu)]
    .map(match => match[1]);
}

function snapshot(root) {
  const result = {};
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile()) result[entry.name] = readFileSync(join(root, entry.name));
  }
  result["licenses/index.html"] = readFileSync(join(root, "licenses", "index.html"));
  return result;
}

test("SPDX updater repairs XHTML metadata, detects drift and is byte-idempotent", (t) => {
  const fixture = mkdtempSync(join(tmpdir(), "pikov-spdx-metadata-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  mkdirSync(join(fixture, "licenses"), { recursive: true });

  writeFileSync(fixture + "/index.html", xhtml("SPDX index"), "utf8");
  const staleApache = xhtml("Apache-2.0")
    .replace(
      '<html xmlns="http://www.w3.org/1999/xhtml">',
      '<html lang="ru" xml:lang="ru" xmlns="http://www.w3.org/1999/xhtml">',
    )
    .replace(
      "  </head>",
      '    <link rel="canonical" href="https://wrong.example/Apache-2.0" />\n'
        + '    <link rel="canonical" href="https://duplicate.example/Apache-2.0" />\n'
        + "  </head>",
    );
  writeFileSync(fixture + "/Apache-2.0.html", staleApache, "utf8");
  writeFileSync(fixture + "/Apache-2.0", xhtml("Apache-2.0 extensionless"), "utf8");
  writeFileSync(fixture + "/GPL-1.0+.html", xhtml("GPL-1.0+"), "utf8");
  writeFileSync(
    join(fixture, "licenses", "index.html"),
    '<!doctype html>\n<html lang="ru"><head><link rel="canonical" href="/" /><title>Redirect</title></head><body></body></html>\n',
    "utf8",
  );

  const staleSnapshot = snapshot(fixture);
  const red = runUpdater(fixture, "--check");
  assert.notEqual(red.status, 0, "--check must reject stale SPDX metadata before repair");
  assert.match(commandOutput(red), /metadata.*stale|stale.*metadata/i);
  assert.deepEqual(snapshot(fixture), staleSnapshot, "--check modified stale files");

  const write = runUpdater(fixture, "--write");
  assert.equal(write.status, 0, commandOutput(write));
  const first = snapshot(fixture);

  const apache = readFileSync(join(fixture, "Apache-2.0.html"), "utf8");
  const extensionless = readFileSync(join(fixture, "Apache-2.0"), "utf8");
  const plus = readFileSync(join(fixture, "GPL-1.0+.html"), "utf8");
  const root = readFileSync(join(fixture, "index.html"), "utf8");
  const redirect = readFileSync(join(fixture, "licenses", "index.html"), "utf8");

  assert.match(apache, /<html\b[^>]*\blang="en"[^>]*\bxml:lang="en"/iu);
  assert.match(extensionless, /<html\b[^>]*\blang="en"[^>]*\bxml:lang="en"/iu);
  assert.match(root, /<html\b[^>]*\blang="ru"[^>]*\bxml:lang="ru"/iu);
  assert.deepEqual(canonicalValues(apache), ["https://spdx.pikov.expert/Apache-2.0.html"]);
  assert.deepEqual(canonicalValues(extensionless), ["https://spdx.pikov.expert/Apache-2.0.html"]);
  assert.deepEqual(canonicalValues(plus), ["https://spdx.pikov.expert/GPL-1.0+.html"]);
  assert.deepEqual(canonicalValues(root), ["https://spdx.pikov.expert/"]);
  assert.deepEqual(canonicalValues(redirect), ["https://spdx.pikov.expert/"]);

  const secondWrite = runUpdater(fixture, "--write");
  assert.equal(secondWrite.status, 0, commandOutput(secondWrite));
  assert.deepEqual(snapshot(fixture), first, "second --write changed normalized bytes");

  const green = runUpdater(fixture, "--check");
  assert.equal(green.status, 0, commandOutput(green));
  assert.match(green.stdout, /SPDX METADATA CHECK OK/);
});

test("SPDX updater fails closed when a public page has no closing head", (t) => {
  const fixture = mkdtempSync(join(tmpdir(), "pikov-spdx-malformed-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  writeFileSync(
    join(fixture, "Broken.html"),
    '<!doctype html>\n<html lang="en"><head><link rel="canonical" href="https://spdx.pikov.expert/Broken.html"><body></body></html>\n',
    "utf8",
  );

  const result = runUpdater(fixture, "--check");
  assert.notEqual(result.status, 0);
  assert.match(commandOutput(result), /Broken\.html: missing <\/head> element/);
});

test("checked-in public SPDX snapshot has exact language and canonical metadata", () => {
  const result = runUpdater(productionSpdx, "--check");
  assert.equal(result.status, 0, commandOutput(result));
  assert.match(result.stdout, /SPDX METADATA CHECK OK/);
});
