import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(projectDir);
const lectureDir = path.join(rootDir, "27-07-2026");
const indexPath = path.join(lectureDir, "index.html");
const handoutPath = path.join(lectureDir, "materials", "from-working-code-to-shippable-product.html");
const require = createRequire(import.meta.url);
const playwrightRoot = path.join(projectDir, ".browser-node", "node_modules", "playwright");

function read(relativePath) {
  return fs.readFileSync(path.join(lectureDir, relativePath), "utf8");
}

const index = read("index.html");
const readFirst = read(path.join("materials", "ЧИТАТЬ-ПЕРВЫМ.md"));
const konspekt = read(path.join("materials", "konspekt.md"));
const praktikum = read(path.join("materials", "praktikum.md"));
const buildScript = read(path.join("_build", "build-materials-zip.ps1"));
const sitemap = read("sitemap.xml");
const releaseBuilder = fs.readFileSync(path.join(projectDir, "build-release.ps1"), "utf8");
const releaseIndependence = fs.readFileSync(path.join(projectDir, "test-public-release-independence.ps1"), "utf8");
const controlFileBuilder = path.join(projectDir, "update-site-control-files.ps1");
const step1 = read(path.join("code", "step1_list.py"));
const defect = read(path.join("code", "step3_defect.py"));
const student = read(path.join("code", "step3_student.py"));
const codeGuide = read(path.join("code", "spravka.md"));
const toolRequirements = read(path.join("code", "requirements-dev.txt"));
const copyNameCs = read(path.join("code", "languages", "CopyName.cs"));

test("public materials use a reproducible HTML handout instead of the ignored PDF", () => {
  assert.ok(fs.existsSync(handoutPath), "accessible HTML handout is missing");

  for (const [name, content] of Object.entries({ index, readFirst, buildScript })) {
    assert.doesNotMatch(
      content,
      /From_Working_Code_to_Shippable_Product\.pdf/i,
      `${name} still depends on the ignored PDF`,
    );
  }

  assert.match(index, /materials\/from-working-code-to-shippable-product\.html/);
  assert.match(readFirst, /from-working-code-to-shippable-product\.html/);
  assert.match(buildScript, /materials\\from-working-code-to-shippable-product\.html/);
});

test("full-site release publishes the reproducible HTML handout and no legacy handout", () => {
  assert.doesNotMatch(
    releaseBuilder,
    /PublishPdfFolders[\s\S]{0,240}27-07-2026/i,
    "27-07 must not bypass the global PDF quarantine",
  );
  assert.doesNotMatch(
    releaseBuilder,
    /\$script:PublishPdfFolders\s*-contains\s*\$folderName/i,
    "release builder still has a generic PDF publication escape hatch",
  );
  assert.match(releaseBuilder, /generatedReadFirstHtml[\s\S]{0,240}return \$true/i);
  assert.match(buildScript, /materials\\from-working-code-to-shippable-product\.html/);
  assert.match(
    releaseIndependence,
    /forbiddenReleasePaths[\s\S]{0,500}From_Working_Code_to_Shippable_Product/i,
    "retired PDF must be explicitly denied if it ever re-enters a release archive",
  );
  assert.doesNotMatch(releaseIndependence, /39241A1DAB8F/i);
});

test("27-07 sitemap exposes only the current accessible handout", () => {
  assert.match(sitemap, /materials\/from-working-code-to-shippable-product\.html/i);
  assert.doesNotMatch(sitemap, /materials\/(?:%D0%A7|Ч)ИТАТЬ-ПЕРВЫМ\.html/i);
});

test("control-file generator skips the legacy generated handout and is idempotent", () => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "pikov-controls-"));
  try {
    const fixtureProject = path.join(fixtureRoot, "_PROJECT");
    const fixtureLecture = path.join(fixtureRoot, "27-07-2026");
    const fixtureMaterials = path.join(fixtureLecture, "materials");
    mkdirSync(fixtureProject, { recursive: true });
    mkdirSync(fixtureMaterials, { recursive: true });
    writeFileSync(
      path.join(fixtureProject, "lectures.json"),
      JSON.stringify({
        updated: "2026-08-15",
        lectures: [{
          position: 1,
          folder: "27-07-2026",
          domain: "27-07-2026",
          url: "https://27-07-2026.pikov.expert/",
          title: "Fixture",
        }],
      }),
      "utf8",
    );
    writeFileSync(path.join(fixtureLecture, "index.html"), "<!doctype html><title>Fixture</title>", "utf8");
    writeFileSync(path.join(fixtureMaterials, "ЧИТАТЬ-ПЕРВЫМ.html"), "legacy", "utf8");
    writeFileSync(path.join(fixtureMaterials, "from-working-code-to-shippable-product.html"), "current", "utf8");

    const run = () => spawnSync(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", controlFileBuilder, "-Root", fixtureRoot],
      { encoding: "utf8" },
    );
    const first = run();
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const firstSitemap = fs.readFileSync(path.join(fixtureLecture, "sitemap.xml"), "utf8");
    assert.match(firstSitemap, /materials\/from-working-code-to-shippable-product\.html/i);
    assert.doesNotMatch(firstSitemap, /materials\/(?:%D0%A7|Ч)ИТАТЬ-ПЕРВЫМ\.html/i);

    const second = run();
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const secondSitemap = fs.readFileSync(path.join(fixtureLecture, "sitemap.xml"), "utf8");
    assert.equal(secondSitemap, firstSitemap, "second control-file generation changed the sitemap");
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("public lecture wording is evergreen while the dated hostname remains provenance", () => {
  const handout = fs.existsSync(handoutPath) ? fs.readFileSync(handoutPath, "utf8") : "";
  const publicLectureFiles = {
    index,
    readFirst,
    konspekt,
    praktikum,
    handout,
    step1,
    defect,
    student,
    codeGuide,
    toolRequirements,
    copyNameCs,
  };
  for (const [name, content] of Object.entries(publicLectureFiles)) {
    assert.doesNotMatch(
      content,
      /(?:26|27)\.07\.2026|27 июля 2026(?: года)?|(?:Вт|Ср|Чт|Пт)\s+(?:28|29|30|31)\.07|в 2026 году|в четверг/i,
      `${name} exposes a session calendar reference`,
    );
    assert.doesNotMatch(content, /(?:s3cr3t-admin|demo)-token-(?:2026|27-07-2026)/i, `${name} has a dated sample token`);
  }
  assert.match(index, /https:\/\/27-07-2026\.pikov\.expert\//, "dated hostname provenance was lost");
  assert.doesNotMatch(index, /около\s+\d+\s*КБ/i, "download size copy will drift after rebuilds");
  assert.match(index, /компактный архив/i);
});

test("HTML handout is semantic, readable and source-bounded", () => {
  assert.ok(fs.existsSync(handoutPath), "accessible HTML handout is missing");
  const handout = fs.readFileSync(handoutPath, "utf8");

  assert.match(handout, /<html\s+lang="ru"/i);
  assert.match(handout, /<link\s+rel="icon"\s+href="data:image\/svg\+xml,/i);
  assert.equal((handout.match(/<h1\b/gi) || []).length, 1, "handout must have exactly one H1");
  assert.equal((handout.match(/<main\b/gi) || []).length, 1, "handout must have exactly one main landmark");
  assert.ok((handout.match(/<section\b/gi) || []).length >= 10, "handout lost the slide sequence");
  assert.match(handout, /<aside\b[^>]*class="[^"]*provenance/i);
  assert.match(handout, /Авторская модель/i);
  assert.match(handout, /историческ[^<]{0,80}~?70\s*%/i);
  assert.match(handout, /NIST SP 800-218/i);
  assert.match(handout, /OWASP ASVS/i);
  assert.match(handout, /https:\/\/cwe\.mitre\.org\/data\/definitions\/(?:89|22|798|532)\.html/i);
  assert.match(handout, /@media\s*\(max-width:\s*700px\)/i);
  assert.match(handout, /@media\s+print/i);
  assert.match(handout, /font-size:\s*clamp\(/i);
});

test("HTML handout preserves every teaching point from the 14-slide deck", () => {
  assert.ok(fs.existsSync(handoutPath), "accessible HTML handout is missing");
  const handout = fs.readFileSync(handoutPath, "utf8");
  const requiredConcepts = [
    /14 элементов свидетельств/i,
    /семь этапов/i,
    /XP[^<]{0,120}TDD[^<]{0,120}CI/is,
    /10 сло[её]в/i,
    /безопасн[^<]{0,80}памят/i,
    /CWE-89/i,
    /CWE-22/i,
    /CWE-798/i,
    /CWE-532/i,
    /правил[^<]{0,80}исполняем[^<]{0,80}тест/i,
    /валидн[^<]{0,100}конструктор/i,
    /Ruff/i,
    /Bandit/i,
    /блокирующ[^<]{0,80}(?:quality gate|контрол)/i,
    /shift left/i,
  ];

  for (const concept of requiredConcepts) {
    assert.match(handout, concept, `missing teaching point: ${concept}`);
  }
});

test("full lecture and notes bound author models, certification scope and tool evidence", () => {
  for (const [name, content] of Object.entries({ index, konspekt })) {
    assert.match(content, /14 (?:проверяемых )?свидетельств/i, `${name} does not reconcile the evidence count`);
    assert.doesNotMatch(content, /примерно одиннадцати/i, `${name} retains the obsolete evidence count`);
    assert.match(content, /семь этапов[^<\n]{0,180}авторск|авторск[^<\n]{0,180}семь этапов/i);
    assert.doesNotMatch(content, /Любая программа проходит одни и те же этапы|Этапы всегда одни и те же/i);
    assert.match(content, /10 сло[её]в[^<\n]{0,180}авторск|авторск[^<\n]{0,180}10 сло[её]в/i);
    assert.match(content, /точн[^<\n]{0,120}(?:объ[её]м|состав)[^<\n]{0,120}(?:схем|требован|оцен)/i);
    assert.doesNotMatch(content, /слои 6[–-]8 (?:являются|—) предметом проверки при сертификации/i);
    assert.match(content, /B608[^<\n]{0,220}(?:эврист|кандидат|вероятн)/i);
    assert.match(content, /ложн[^<\n]{0,160}(?:срабатыван|пропуск)/i);
    assert.match(content, /историческ[^<\n]{0,160}(?:70\s*%|около 70)/i);
    assert.match(content, /(?:unsafe|FFI|нативн)/i);
    assert.doesNotMatch(content, /Небезопасный код в C# невозможно написать случайно|только явным блоком `?unsafe`?/i);
  }

  assert.doesNotMatch(copyNameCs, /небезопасный\s+код в C# невозможно написать случайно|в C# просто не компилируется/i);

  assert.doesNotMatch(index, /переста[юё]т читать примерно через месяц/i);
  assert.match(index, /не является универсальной статистикой срока/i);
});

test("lecture and HTML handout do not create page-level horizontal overflow at QA viewports", async () => {
  assert.ok(fs.existsSync(playwrightRoot), "Playwright is not installed in _PROJECT/.browser-node");
  const { chromium } = require(playwrightRoot);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [name, filePath] of Object.entries({ lecture: indexPath, handout: handoutPath })) {
      for (const viewport of [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 390, height: 844 },
      ]) {
        const page = await browser.newPage({ viewport });
        await page.goto(pathToFileURL(filePath).href, { waitUntil: "load" });
        const metrics = await page.evaluate(() => ({
          viewport: innerWidth,
          rootWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
        }));
        assert.ok(metrics.rootWidth <= metrics.viewport + 1, `${name} root overflow: ${JSON.stringify(metrics)}`);
        assert.ok(metrics.bodyWidth <= metrics.viewport + 1, `${name} body overflow: ${JSON.stringify(metrics)}`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});
