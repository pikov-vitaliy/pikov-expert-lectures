import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectDir = dirname(fileURLToPath(import.meta.url));
const rawRoot = readFileSync(resolve(projectDir, "..", "index.html"), "utf8");

// Страница двуязычная: парные <span data-l="ru"> / <span data-l="en">.
// Проверки биографии касаются русского варианта, поэтому английская ветка
// удаляется, а русская разворачивается обратно в голый текст — так все
// утверждения ниже работают ровно на той разметке, на которую писались,
// включая точный подсчёт вхождений.
const stripEnglish = html => html
  .replace(/<span data-l="en">[\s\S]*?<\/span>/g, "")
  .replace(/<(p|li|div)\b[^>]*\bdata-l="en"[^>]*>[\s\S]*?<\/\1>/g, "");
const unwrapRussian = html => html.replace(/<span data-l="ru">([\s\S]*?)<\/span>/g, "$1");
const root = unwrapRussian(stripEnglish(rawRoot));

test("bilingual markup keeps both language branches present", () => {
  assert.match(rawRoot, /data-l="ru"/);
  assert.match(rawRoot, /data-l="en"/);
  // Вложенный <span> внутри пары сломал бы нежадные регулярки выше.
  assert.doesNotMatch(rawRoot, /<span data-l="(?:ru|en)">(?:(?!<\/span>)[\s\S])*<span\b/);
});

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
  // Решение владельца 21.11.2026: биография совпадает с LinkedIn – государственная
  // компания, без «места службы» и испытательной лаборатории.
  assert.match(aboutText, /С 2001 по 2022 год работал в государственной компании/i);
  assert.match(rawRoot, /From 2001 to 2022 I worked at a state-owned company/);
  assert.doesNotMatch(rawRoot, /мест[оа] службы|После службы|public service|testing laboratory|испытательной лаборатории/i);
  // Запрет на Минобороны — только в биографии. Раньше он стоял на весь файл,
  // и из-за этого из описания лекции по сертификации вырезали регулятора,
  // хотя вся лекция построена вокруг систем ФСТЭК, ФСБ и Минобороны.
  assert.doesNotMatch(aboutText, /Министерств[ао]\s+обороны|Минобороны|ЦНИИ\s+ВВС|Ministry of Defen/i);
  assert.doesNotMatch(rawRoot, /Тамбовск|ЦНИИ\s+ВВС/i);
  // Минобороны как ЛИЧНАЯ регалия запрещено где угодно на странице.
  assert.doesNotMatch(rawRoot, /(?:награды|звания)[^<]{0,40}Минобороны/i);
  // Бывший работодатель — нигде и ни в одной языковой ветке.
  assert.doesNotMatch(rawRoot, /\u041c\u0410\u0421\u041a\u041e\u041c|MASCOM/i);
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
  // Числа – слово владельца 27.11.2026: более 200 защит ВКР, несколько сотен студентов в год.
  assert.match(aboutText, /выпускных квалификационных работ.{0,20}более 200 студентов/i);
  assert.match(aboutText, /несколько сотен студентов/i);
  assert.match(aboutText, /10 авторских курс/i);
  assert.doesNotMatch(aboutText, /более 100 специалист/i);
  assert.match(aboutText, /более 40.{0,40}вебинар/i);
  assert.match(aboutText, /более 40.{0,40}научн.{0,20}публикац/i);
  assert.doesNotMatch(aboutText, /все (?:курсы|материалы|лекции).{0,100}согласован.{0,40}ФСТЭК/i);
});

test("credentials are accurate and the personal site is explicitly independent", () => {
  assert.match(aboutText, /Заслуженный доцент.{0,100}РосНОУ/i);
  assert.match(aboutText, /Astra Linux Special Edition 1\.8(?!\/)/i);
  assert.doesNotMatch(aboutText, /Astra Linux Special Edition 1\.7\/1\.8/i);
  // Перечень подтверждён Виталием по его собственному слайду (2026-08-16):
  // MCT, MCITP, MCPS, MCSA, MCTS — без дат. Датировка «MCT в 2014–2016 годах»
  // была добавлена сторонним агентом и подтверждения не получила.
  assert.match(aboutText, /Microsoft Certified:.{0,80}MCT.{0,40}MCITP.{0,40}MCPS.{0,40}MCSA.{0,40}MCTS/i);
  assert.doesNotMatch(aboutText, /Microsoft Certified Trainer.{0,60}201\d/i);
  assert.match(aboutText, /независимый авторский образовательный проект/i);
  assert.match(aboutText, /независимо от прежних работодателей и учебных центров/i);
  // Слово владельца 27.11.2026: про сервис SCA/SBOM – «как в резюме, с цифрами», но как достижение,
  // без названия работодателя; сумма – только как оценка поставщика сопоставимого решения.
  assert.match(aboutText, /Единолично создал.{0,80}сервис SCA\/SBOM/i);
  assert.match(aboutText, /около 130 тыс\. строк кода/);
  assert.match(aboutText, /\(оценка поставщика сопоставимого on-prem-решения: порядка 18 млн ₽ в год\)/);
  // Английская ветка вырезается из aboutText, поэтому проверяем исходную разметку раздела целиком.
  const aboutRaw = rawRoot.match(/<section class="about" id="about">([\s\S]*?)<\/section>/i)?.[1] ?? "";
  assert.ok(aboutRaw.length > 1000, "the about section must be found in index.html");
  assert.match(aboutRaw, /I independently built and deployed an SCA\/SBOM service/);
  assert.match(aboutRaw, /about 130,000 lines of code/);
  assert.match(aboutRaw, /\(about RUB 18 million a year, vendor's estimate\)/);
  assert.doesNotMatch(aboutRaw, /МНТЦ|МИЭТ|MNTC|MIET|istc/i, "no employer name in either language");
});

test("every public page lists the same Microsoft certifications", () => {
  // Расхождение уже случалось: главную правил один агент, лекционные страницы
  // остались с прежним списком, и сайт сам себе противоречил.
  const expected = ["MCT", "MCITP", "MCPS", "MCSA", "MCTS"];
  const sources = [
    ["index.html", rawRoot],
    ...["astralinux01", "astralinux02"].map(folder => [
      `${folder}/index.html`,
      readFileSync(resolve(projectDir, "..", folder, "index.html"), "utf8"),
    ]),
  ];
  for (const [label, html] of sources) {
    const line = html.match(/Microsoft Certifi[^<]*<b>([^<]+)<\/b>/)?.[1];
    assert.ok(line, `${label}: no Microsoft certification list found`);
    const listed = line.split(/[,\s]+/).filter(Boolean);
    assert.deepEqual(listed, expected, `${label} lists ${listed.join(", ")}`);
  }
});

test("hero and Person schema use language-consistent professional positioning", () => {
  // Регалии – дословно по общему образцу (kamaz-ai, rubin), слово владельца 27.11.2026.
  const roleRu = "Архитектор информационной безопасности<br>• РБПО • DevSecOps • AppSec<br>Лектор и автор образовательных программ по ИБ и РБПО";
  const roleEn = "Information security architect<br>• SSDLC • DevSecOps • AppSec<br>Lecturer and author of educational programmes in information security and SSDLC";
  const jobEn = "Information security architect";
  assert.match(rawRoot, new RegExp(`<span data-l="ru">${roleRu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/span>`));
  assert.match(rawRoot, new RegExp(`<span data-l="en">${roleEn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/span>`));
  const profileSource = rawRoot.match(/<script[^>]*id="ld-profile"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(profileSource, "static profile JSON-LD is missing");
  const profile = JSON.parse(profileSource);
  const person = profile["@graph"].find(node => node["@type"] === "Person");
  assert.equal(person.jobTitle, jobEn, "the English default document must ship English static JSON-LD");
  const universities = {
    en: ["Moscow Aviation Institute (MAI)", "Moscow Polytechnic University", "Russian New University (RosNOU)"],
    ru: ["Московский авиационный институт (МАИ)", "Московский политехнический университет", "Российский новый университет (РосНОУ)"],
  };
  const affiliationOf = html => {
    const source = html.match(/<script[^>]*id="ld-profile"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    const node = JSON.parse(source)["@graph"].find(item => item["@type"] === "Person");
    return node.affiliation;
  };
  for (const [lang, html] of [["en", rawRoot], ["ru", readFileSync(resolve(projectDir, "..", "ru", "index.html"), "utf8")]]) {
    const list = affiliationOf(html);
    assert.ok(Array.isArray(list), `${lang}: affiliation must be a list`);
    assert.ok(list.every(item => item["@type"] === "CollegeOrUniversity"), `${lang}: every affiliation is a university`);
    assert.deepEqual(list.map(item => item.name), universities[lang], `${lang}: MAI, Moscow Polytech and RosNOU`);
  }
});

test("the former employer is not named on any page of the SCA/SBOM case", () => {
  // Слово владельца 27.11.2026: кейс – «АО «Альфа»», прямой отсылки к названию организации нигде нет.
  const pages = [
    "index.html", "ru/index.html",
    "new/index.html", "new/ru/index.html", "new/about/index.html", "new/ru/about/index.html",
    "rbpo-audit/index.html", "rbpo-audit-start-result/index.html", "sbom-license-audit/index.html",
  ];
  for (const page of pages) {
    const html = readFileSync(resolve(projectDir, "..", page), "utf8");
    assert.ok(html.length > 1000, `${page} must exist and be non-empty`);
    assert.doesNotMatch(html, /МНТЦ|МИЭТ|MNTC|MIET|istc-miet|mntc-logo/i, `${page} names the former employer`);
  }
  for (const deck of ["rbpo-audit", "rbpo-audit-start-result", "sbom-license-audit"]) {
    const html = readFileSync(resolve(projectDir, "..", deck, "index.html"), "utf8");
    assert.match(html, /АО «Альфа»/, `${deck} uses the agreed pseudonym`);
  }
});
