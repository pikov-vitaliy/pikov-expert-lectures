import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

const projectDir = dirname(fileURLToPath(import.meta.url));
const repoDir = resolve(projectDir, '..');

function read(relativePath) {
  return readFileSync(resolve(repoDir, relativePath), 'utf8');
}

const content = {
  pentest: read('pentest/index.html'),
  pentestHandout: read('pentest/handout.html'),
  threats: read('threats-kii/index.html'),
  threatsMaterials: read('threats-kii/materials.md'),
  risk: read('risk/index.html'),
  riskMaterials: read('risk/materials.md'),
  sast: read('sast/index.html'),
};

test('pentest pins the current ATT&CK v19.2 Enterprise matrix to the official version permalink', () => {
  for (const page of [content.pentest, content.pentestHandout]) {
    assert.match(page, /ATT(?:&amp;|&)CK v19\.2/);
    assert.match(page, /https:\/\/attack\.mitre\.org\/versions\/v19\/matrices\/enterprise\//);
    assert.match(page, /15 (?:Enterprise-)?тактик/i);
  }
  assert.doesNotMatch(content.pentestHandout, /на дату занятия/i);
  assert.doesNotMatch(content.pentest, /в текущей версии\s*<b>ATT(?:&amp;|&)CK/i);
});

test('threat-model materials use the 15-tactic v19 Enterprise matrix', () => {
  for (const page of [content.threats, content.threatsMaterials]) {
    assert.match(page, /15 тактик/i);
    assert.match(page, /Stealth/);
    assert.match(page, /Defense Impairment/);
    assert.match(page, /https:\/\/attack\.mitre\.org\/versions\/v19\/matrices\/enterprise\//);
    assert.doesNotMatch(page, /Defense Evasion/);
  }
});

test('CWE-119 is described as a broad class and concrete buffer weaknesses are named', () => {
  for (const page of [content.threats, content.threatsMaterials, content.sast]) {
    assert.match(page, /CWE-119/);
    assert.match(page, /Improper Restriction of Operations within the Bounds of a Memory Buffer/);
    assert.match(page, /CWE-787/);
    assert.match(page, /CWE-125/);
    assert.match(page, /https:\/\/cwe\.mitre\.org\/data\/definitions\/119\.html/);
  }
  assert.doesNotMatch(content.threats, /каталог уязвимостей по типам/i);
  assert.doesNotMatch(content.threatsMaterials, /каталог уязвимостей по типам/i);
});

test('CVE records and NVD enrichment have distinct roles and current primary links', () => {
  for (const page of [content.pentest, content.threats, content.threatsMaterials, content.sast]) {
    assert.match(page, /CVE Program/);
    assert.match(page, /NVD/);
    assert.match(page, /обогащ/i);
    assert.match(page, /https:\/\/(?:www\.)?cve\.org\//i);
    assert.match(page, /https:\/\/nvd\.nist\.gov\/general\/cve-process/i);
    assert.doesNotMatch(page, /cve\.mitre\.org/i);
  }
  assert.doesNotMatch(content.pentest, />CVE\s*\/\s*NVD</);
});

test('risk assessment follows NIST SP 800-30 Rev. 1 Prepare-Conduct-Maintain', () => {
  for (const page of [content.risk, content.riskMaterials]) {
    assert.match(page, /NIST SP 800-30 Rev\. 1/);
    assert.match(page, /Prepare/);
    assert.match(page, /Conduct/);
    assert.match(page, /Maintain/);
    assert.match(page, /https:\/\/csrc\.nist\.gov\/pubs\/sp\/800\/30\/r1\/final/);
    assert.doesNotMatch(page, /9 стадий оценки рисков по NIST SP 800-30/i);
  }
  assert.match(content.threatsMaterials, /NIST SP 800-30 Rev\. 1/);
  assert.match(content.threatsMaterials, /https:\/\/csrc\.nist\.gov\/pubs\/sp\/800\/30\/r1\/final/);
});

test('incident-response seven-step cycle is an author composite, not a NIST lifecycle', () => {
  for (const page of [content.risk, content.riskMaterials]) {
    assert.match(page, /авторск/i);
    assert.match(page, /NIST SP 800-61r3/);
    assert.match(page, /CSF 2\.0/);
    assert.match(page, /https:\/\/csrc\.nist\.gov\/pubs\/sp\/800\/61\/r3\/final/);
  }
  assert.doesNotMatch(content.riskMaterials, /SP 800-61(?!r3| Rev\. 3)/);
});

test('moving-target claims remain qualitative without an unsupported universal percentage', () => {
  for (const page of [content.risk, content.riskMaterials]) {
    assert.doesNotMatch(page, /(?:>|&gt;)90%/);
    assert.match(page, /эффект зависит/i);
  }
});

test('SAST cost chart reproduces the NIST example-only 1-5-10-15-30 defect scale', () => {
  assert.match(content.sast, /Example Only/);
  assert.match(content.sast, /1×[\s\S]{0,1000}5×[\s\S]{0,1000}10×[\s\S]{0,1000}15×[\s\S]{0,1000}30×/);
  assert.match(content.sast, /общ(?:их|ие) дефект/i);
  assert.match(content.sast, /https:\/\/www\.nist\.gov\/system\/files\/documents\/director\/planning\/report02-3\.pdf/);
  assert.match(content.sast, /Table 5-1/);
  assert.doesNotMatch(content.sast, /Exhibit 3-1/);
  assert.doesNotMatch(content.sast, />50×</);
  assert.doesNotMatch(content.sast, />200×</);
  assert.doesNotMatch(content.sast, /приято/);
});

test('SAST labels the defect-density ranges as a historical illustration, not a universal law', () => {
  assert.match(content.sast, /историческ/i);
  assert.match(content.sast, /не (?:являются|является) (?:современным )?(?:универсальным )?бенчмарк/i);
  assert.match(content.sast, /SAST finding[^<]*(?:не равен|≠)[^<]*(?:defect|дефект)/i);
});
