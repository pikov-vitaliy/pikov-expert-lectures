import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectDir = dirname(fileURLToPath(import.meta.url));
const root = readFileSync(resolve(projectDir, "..", "index.html"), "utf8");
const about = root.match(/<section class="about" id="about">([\s\S]*?)<\/section>/i)?.[1] ?? "";
const aboutText = about
  .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/\s+/g, " ")
  .trim();

function educationGroup(labelId) {
  return about.match(new RegExp(`<div class="education-group"[^>]*aria-labelledby="${labelId}"[\\s\\S]*?<\\/div>`, "i"))?.[0] ?? "";
}

test("public biography uses the approved neutral state-sector wording", () => {
  assert.match(aboutText, /Последнее место службы.{0,160}научно-исследовательск.{0,80}государственного сектора/i);
  assert.doesNotMatch(root, /Министерств[ао]\s+обороны|Минобороны|ЦНИИ\s+ВВС/i);
  assert.doesNotMatch(root, /МАСКОМ/i);
});

test("professional profile explains current security engineering practice", () => {
  for (const required of [
    /security-by-design/i,
    /моделировани[ея] угроз/i,
    /C\/C\+\+/i,
    /SAST/i,
    /DAST/i,
    /фаззинг/i,
    /SCA/i,
    /SBOM/i,
    /CycloneDX/i,
    /SPDX/i,
    /VEX\/OpenVEX/i,
    /security gates[^<]{0,80}CI\/CD/i,
  ]) {
    assert.match(aboutText, required, `missing professional-profile concept: ${required}`);
  }
});

test("standards profile balances Russian and international practice", () => {
  for (const required of [
    /ГОСТ Р 56939-2024/i,
    /ГОСТ Р 71207-2024/i,
    /NIST SSDF/i,
    /OWASP (?:SAMM|ASVS)/i,
    /CWE/i,
    /ISO\/IEC 27001/i,
    /ISO\/IEC 27034/i,
    /CERT C\/C\+\+/i,
    /MISRA C\/C\+\+/i,
  ]) {
    assert.match(aboutText, required, `missing standards-profile concept: ${required}`);
  }
});

test("education is presented as a substantial continuing professional path", () => {
  for (const required of [
    /Высшее инженерное образование/i,
    /Автоматизированные системы обработки информации и управления/i,
    /Профессиональная переподготовка/i,
    /Информационная безопасность.{0,80}2017|2017.{0,80}Информационная безопасность/i,
    /Противодействие иностранным техническим разведкам.{0,80}2019|2019.{0,80}Противодействие иностранным техническим разведкам/i,
    /Педагогика профессионального образования.{0,80}2020|2020.{0,80}Педагогика профессионального образования/i,
    /Техническая защита информации.{0,80}2021|2021.{0,80}Техническая защита информации/i,
    /Практическая психология.{0,80}2022|2022.{0,80}Практическая психология/i,
    /Искусственный интеллект в образовании.{0,80}2024|2024.{0,80}Искусственный интеллект в образовании/i,
    /Повышение квалификации и дополнительная подготовка/i,
    /анализ архитектуры и экспертиза исходного кода/i,
    /Python/i,
    /нейронн/i,
    /KasperskyOS/i,
    /АСУ ТП/i,
    /Astra Linux/i,
    /Windows Server/i,
    /Active Directory/i,
  ]) {
    assert.match(aboutText, required, `missing education or continuing-training item: ${required}`);
  }
  assert.doesNotMatch(aboutText, /удостоверени[ея]\s*№|диплом\s*№|рег\.\s*№/i);

  const retraining = educationGroup("retraining-title");
  const continuing = educationGroup("continuing-education-title");
  const secureDevelopmentQualification = /Специалист по процессам разработки безопасного программного обеспечения/i;
  assert.doesNotMatch(retraining, secureDevelopmentQualification);
  assert.match(continuing, secureDevelopmentQualification);
  assert.match(continuing, /200\s*час/i);
  assert.equal(aboutText.match(new RegExp(secureDevelopmentQualification.source, "gi"))?.length, 1);
  assert.doesNotMatch(about, /<time(?![^>]*\bdatetime=)[^>]*>/i);
});

test("teaching and research results are specific without overstating scope", () => {
  assert.match(aboutText, /более 25 лет/i);
  assert.match(aboutText, /более 10 лет.{0,80}препода/i);
  assert.match(aboutText, /более 130.{0,80}(?:ВКР|бакалавр|специалист|магистр)/i);
  assert.match(aboutText, /10 авторских курс/i);
  assert.match(aboutText, /более 100 специалист/i);
  assert.match(aboutText, /более 40.{0,40}вебинар/i);
  assert.match(aboutText, /более 40.{0,40}научн.{0,20}публикац/i);
  assert.doesNotMatch(aboutText, /все (?:курсы|материалы|лекции).{0,100}согласован.{0,40}ФСТЭК/i);
});

test("credentials are accurate and the personal site is explicitly independent", () => {
  assert.match(aboutText, /Заслуженный доцент.{0,100}РосНОУ/i);
  assert.match(aboutText, /Astra Linux Special Edition 1\.7\/1\.8/i);
  assert.match(aboutText, /Microsoft Certified Trainer.{0,60}2014.{0,20}2016/i);
  assert.match(aboutText, /независимый авторский образовательный проект/i);
  assert.match(aboutText, /независимо от прежних работодателей и учебных центров/i);
  assert.doesNotMatch(aboutText, /18\s*млн|130\s*тыс.{0,20}строк|142\s+тестов|33\s+ADR/i);
});

test("hero and Person schema use the same professional positioning", () => {
  const role = "Эксперт по безопасной разработке ПО, DevSecOps и AppSec; преподаватель";
  assert.match(root, new RegExp(`<p class="role">${role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/p>`));
  assert.match(root, new RegExp(`"jobTitle"\\s*:\\s*"${role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
});
