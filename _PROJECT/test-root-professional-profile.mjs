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

// ── Проверка «нет прежнего работодателя» (слово владельца 27.11.2026) ─────────────
// Это быстрый слой без браузера для обычных ошибок. Полную проверку, устойчивую к
// маскировке (как страницу прочтёт браузер), выполняет _PROJECT/qa-former-employer.mjs в CI.
// Страница проверяется слоями: исходный HTML (адреса, имена файлов), видимый текст
// (как его прочтёт человек, включая noscript), значения всех атрибутов, CSS content,
// а также содержимое script и template (текст, который скрипт может показать).
const INLINE_TAGS = "a|abbr|b|bdi|bdo|cite|code|data|del|dfn|em|font|i|ins|kbd|label|mark|q|s|samp|small|span|strong|sub|sup|time|u|var|wbr";
const NAMED_ENTITIES = { nbsp: " ", laquo: "«", raquo: "»", bdquo: "„", ldquo: "“", rdquo: "”", quot: '"', apos: "'", amp: "&", lt: "<", gt: ">", ndash: "–", mdash: "—", shy: "", zwj: "", zwnj: "", lrm: "", rlm: "" };

// Сущности раскрываются за один проход: «&#x26;#69;» даёт буквальное «&#69;», а не «E».
// Числовые – и без точки с запятой, как это делает браузер.
function decodeEntities(text) {
  return text.replace(/&(?:#x([0-9a-f]+);?|#(\d+);?|([a-z]+);)/gi, (all, hex, dec, name) => {
    if (hex) return String.fromCodePoint(Math.min(parseInt(hex, 16), 0x10ffff));
    if (dec) return String.fromCodePoint(Math.min(Number(dec), 0x10ffff));
    const key = name.toLowerCase();
    return key in NAMED_ENTITIES ? NAMED_ENTITIES[key] : all;
  });
}

// Для сравнения: NFKC, без невидимых символов (U+00AD, U+200B…, \p{Cf}), похожие буквы
// кириллицы сведены к латинице – «MИЭT», «MНТЦ» и полноширинные формы ловятся.
const CYR_TO_LAT = { А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X", У: "Y", а: "a", е: "e", о: "o", р: "p", с: "c", у: "y", х: "x", і: "i", І: "I", ј: "j", ѕ: "s" };
function normaliseForMatch(text, upper = true) {
  const t = upper ? text.toUpperCase().normalize("NFKC").toUpperCase() : text.normalize("NFKC");
  return t.replace(/[\p{Cf}­͏ᅟᅠ឴឵᠎ㅤﾠ]/gu, "")
    .replace(/[А-Яа-яЁёІіЈјЅѕ]/g, ch => CYR_TO_LAT[ch] ?? ch);
}
// Те же слова после свёртки: МНТЦ → MHTЦ, МИЭТ → MИЭT.
// Кириллические аббревиатуры – с падежными окончаниями («МИЭТа»), латинские – целым словом.
const EMPLOYER_WORD = /(?<![\p{L}\p{N}])(?:M\.?H\.?T\.?Ц|M\.?И\.?Э\.?T|(?:M\.?N\.?T\.?C|M\.?I\.?E\.?T|I\.?S\.?T\.?C)(?![\p{L}\p{N}]))/iu;
const EMPLOYER_SOURCE = /istc-miet|mntc-logo/i;
const hasEmployerWord = text => EMPLOYER_WORD.test(normaliseForMatch(text));

function removeComments(html) { return html.replace(/<!--[\s\S]*?-->/g, " "); }
// data: вырезается только как значение атрибута, остальной текст не трогается.
function removeDataUris(html) {
  return html.replace(/(\s[\w:-]+\s*=\s*)(["']?)data:[^"'\s>]*\2/gi, "$1$2$2");
}
function blocks(html, tag) {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, "gi"))].map(m => m[1]);
}
// Строки CSS content: "…" с раскрытием CSS-экранирования (\4D, \0041 и т. п.).
function cssContentStrings(css) {
  return [...css.matchAll(/content\s*:\s*(["'])((?:\\.|(?!\1).)*)\1/gi)]
    .map(m => m[2].replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h) => String.fromCodePoint(Math.min(parseInt(h, 16), 0x10ffff))).replace(/\\(.)/g, "$1"));
}

function textLayers(html) {
  const noComments = removeDataUris(removeComments(html));
  const scripts = blocks(noComments, "script").join("\n");
  const styles = blocks(noComments, "style").join("\n");
  const templates = blocks(noComments, "template").join("\n");
  const shown = noComments.replace(/<(script|style|template)\b[\s\S]*?<\/\1\s*>/gi, " ");
  const attrSource = [...shown.matchAll(/<[a-z][\w:-]*\b([^>]*)>/gi)].map(m => m[1]).join(" ");
  const attributes = [...attrSource.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)]
    .map(m => decodeEntities(m[2] ?? m[3] ?? m[4] ?? ""));
  const styleAttrs = [...attrSource.matchAll(/style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map(m => decodeEntities(m[1] ?? m[2] ?? ""));
  const visible = decodeEntities(shown
    .replace(new RegExp(`</?(?:${INLINE_TAGS})\\b[^>]*>`, "gi"), "")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ");
  return {
    visible,
    attributes: attributes.join(" \n "),
    css: cssContentStrings(styles + "\n" + styleAttrs.join("\n")).join(" \n "),
    scripts: decodeEntities(scripts),
    templates: decodeEntities(templates.replace(new RegExp(`</?(?:${INLINE_TAGS})\\b[^>]*>`, "gi"), "").replace(/<[^>]+>/g, " ")),
  };
}

// В адресах и именах файлов имя ищется подстрокой («/assets/logoMIET.svg»), как в
// исходной проверке; data: не проверяется – в base64 возможны случайные совпадения.
const URL_VALUE = /\s(?:href|src|srcset|action|poster|data|cite|background|formaction|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const EMPLOYER_IN_URL = /MIET|MNTC|ISTC|MHTЦ|MИЭT/u;
function urlMentions(html) {
  for (const m of removeComments(html).matchAll(URL_VALUE)) {
    const value = decodeEntities(m[1] ?? m[2] ?? m[3]);
    if (/^\s*data:/i.test(value)) continue;
    let decoded = value;
    try { decoded = decodeURIComponent(value); } catch { /* «100%» – проверяется как есть */ }
    if (EMPLOYER_IN_URL.test(normaliseForMatch(value)) || EMPLOYER_IN_URL.test(normaliseForMatch(decoded))) return true;
  }
  return false;
}

function employerMentions(html) {
  const layers = textLayers(html);
  const found = [];
  if (urlMentions(html)) found.push("url");
  if (EMPLOYER_SOURCE.test(removeDataUris(removeComments(html)))) found.push("source");
  for (const [name, text] of Object.entries(layers)) {
    if (hasEmployerWord(text) || EMPLOYER_SOURCE.test(text)) found.push(name);
  }
  return found;
}

// Все обозначения «АО «…»» в видимом тексте и в строках скриптов (подвал презентаций
// вставляется скриптом); кавычки и пробелы приведены к одному виду.
function joinStockCompanies(html) {
  const layers = textLayers(html);
  const text = normaliseForMatch(layers.visible + " \n " + layers.scripts, false).replace(/[   ]/g, " ");
  return [...text.matchAll(/(?<![\p{L}])AO\s*[«„"“]\s*([^«»„“”"]{1,40}?)\s*[»“”"]/gu)]
    .map(m => m[1].replace(/[A-Za-z]/g, ch => ({ A: "А", B: "В", E: "Е", K: "К", M: "М", H: "Н", O: "О", P: "Р", C: "С", T: "Т", X: "Х", Y: "У", a: "а", e: "е", o: "о", p: "р", c: "с", y: "у", x: "х" })[ch] ?? ch));
}

const HIDDEN_ATTR = /\shidden(?=[\s=>/]|$)|\sinert(?=[\s=>/]|$)|aria-hidden\s*=\s*["']?true|display\s*:\s*none|visibility\s*:\s*hidden|content-visibility\s*:\s*hidden/i;

// Абзац о сервисе SCA/SBOM в «Обо мне»: виден, на обоих языках и с согласованными цифрами.
function serviceParagraph(html) {
  const section = removeComments(html).replace(/<(script|style|template)\b[\s\S]*?<\/\1\s*>/gi, " ").match(/<section\b[^>]*\bid="about"[^>]*>([\s\S]*?)<\/section>/i);
  if (!section) return { error: "about section not found" };
  if (HIDDEN_ATTR.test(section[0].match(/^<section\b[^>]*>/i)[0])) return { error: "about section is hidden" };
  const articles = [...section[1].matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/gi)];
  const article = articles.find(a => /SCA\/SBOM/.test(a[2]) && /Единолично создал/.test(a[2]));
  if (!article) return { error: "service article not found" };
  if (HIDDEN_ATTR.test(article[1])) return { error: "service article is hidden" };
  const paragraph = [...article[2].matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)].find(p => /Единолично создал/.test(p[2]));
  if (!paragraph) return { error: "service paragraph not found" };
  if (HIDDEN_ATTR.test(paragraph[1])) return { error: "service paragraph is hidden" };
  const branch = lang => [...paragraph[2].matchAll(new RegExp(`<span\\b([^>]*)data-l="${lang}"([^>]*)>([\\s\\S]*?)</span>`, "g"))]
    .filter(m => !HIDDEN_ATTR.test(m[1] + m[2])).map(m => textLayers(m[3]).visible).join(" ");
  return { ru: branch("ru"), en: branch("en") };
}

function serviceClaimProblems(html) {
  const p = serviceParagraph(html);
  if (p.error) return [p.error];
  const problems = [];
  const expect = (cond, msg) => { if (!cond) problems.push(msg); };
  expect(/Единолично создал и ввёл в эксплуатацию сервис SCA\/SBOM/.test(p.ru), "ru: achievement sentence");
  expect(/I independently built and deployed an SCA\/SBOM service/.test(p.en), "en: achievement sentence");
  const ruMoney = p.ru.match(/\d[\d\s,.]*\s*млн[^.,;)]*/g) ?? [];
  const enMoney = p.en.match(/RUB\s*\d[\d\s,.]*\s*million[^.,;)]*/gi) ?? [];
  const ruCode = p.ru.match(/\d[\d\s,.]*\s*тыс\.\s*строк[^.;)]*/g) ?? [];
  const enCode = p.en.match(/\d[\d\s,.]*\s*lines of code/gi) ?? [];
  expect(ruMoney.length === 1 && /^18 млн ₽ в год$/.test(ruMoney[0].trim()), `ru: one amount «18 млн ₽ в год» (got ${JSON.stringify(ruMoney)})`);
  expect(enMoney.length === 1 && /^RUB 18 million a year$/.test(enMoney[0].trim()), `en: one amount «RUB 18 million a year» (got ${JSON.stringify(enMoney)})`);
  expect(ruCode.length === 1 && /^130 тыс\. строк кода$/.test(ruCode[0].trim()), `ru: one code size «130 тыс. строк кода» (got ${JSON.stringify(ruCode)})`);
  expect(enCode.length === 1 && /^130,000 lines of code$/.test(enCode[0].trim()), `en: one code size «130,000 lines of code» (got ${JSON.stringify(enCode)})`);
  expect(/оценка поставщика сопоставимого on-prem-решения: порядка 18 млн ₽ в год/.test(p.ru), "ru: amount is the vendor's estimate");
  expect(/about RUB 18 million a year, vendor's estimate/.test(p.en), "en: amount is the vendor's estimate");
  return problems;
}

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
  assert.deepEqual(serviceClaimProblems(rawRoot), [], "service paragraph in index.html");
  assert.deepEqual(serviceClaimProblems(readFileSync(resolve(projectDir, "..", "ru", "index.html"), "utf8")), [], "service paragraph in ru/index.html");
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

test("former-employer guard catches disguised names and ignores look-alikes", () => {
  // Уловки, найденные Codex 27.11 (круги 3–4 и ревью плана): каждая должна срабатывать.
  const caught = {
    plain: "<p>Проект MIET</p>",
    cyrillic: "<p>АО МНТЦ МИЭТ</p>",
    entity: "<p>MI&#69;T</p>",
    hexEntity: "<p>MI&#x45;T</p>",
    splitByTag: "<p>MI<strong>ET</strong></p>",
    splitByIns: "<p>МИ<ins>ЭТ</ins></p>",
    titleEntity: '<p title="MI&#69;T">x</p>',
    hrefEntity: '<a href="https://istc-mi&#101;t.ru/">x</a>',
    altText: '<img alt="Логотип МНТЦ" src="x.png">',
    domainInSource: '<link href="https://istc-miet.ru/">',
    logoFile: '<img src="assets/mntc-logo.png" alt="">',
    logoFileCamel: '<img src="/assets/logoMIET.svg" alt="Логотип заказчика">',
    numericNoSemicolon: "<p>MI&#69T</p>",
    unquotedAttr: "<a title=MIET href=#>x</a>",
    otherAttr: '<div data-x="МНТЦ">x</div>',
    zeroWidth: "<p>MI\u200BET</p>",
    softHyphen: "<p>МИ&shy;ЭТ</p>",
    mixedScript: "<p>MИЭТ</p>",
    fullWidth: "<p>ＭＩＥＴ</p>",
    noscript: "<noscript><p>MIET</p></noscript>",
    template: "<template><p>MIET</p></template><p>текст</p>",
    cssContent: "<style>.x::after{content:'MI\\45 T'}</style><p>x</p>",
    styleAttr: '<p style="--a:1" data-c="x">x</p><style>.y::before{content:"МНТЦ"}</style>',
    scriptText: "<script>footer.textContent = 'АО МНТЦ МИЭТ';</script>",
  };
  for (const [name, html] of Object.entries(caught)) {
    assert.ok(employerMentions(html).length > 0, `${name} must be caught: ${html}`);
  }
  // Допустимое: слова и идентификаторы с теми же буквами, данные data:, литерал сущности, текст в скриптах.
  const allowed = {
    germanWord: "<p>Vermietung</p>",
    identifier: "<p>listCache</p>",
    dataUri: '<img src="data:image/png;base64,QUJDTUlFVERFRg==" alt="">',
    literalEntity: "<p>MI&#x26;#69;T</p>",
    commented: "<!-- MIET --><p>текст</p>",
    scriptIdentifier: "<script>const mietCount = 1;</script><p>текст</p>",
    styleSelector: "<style>.mntcLike{}</style><p>текст</p>",
  };
  for (const [name, html] of Object.entries(allowed)) {
    assert.deepEqual(employerMentions(html), [], `${name} must not be flagged: ${html}`);
  }
});

test("service paragraph guard rejects hidden, commented and contradictory variants", () => {
  const good = rawRoot;
  assert.deepEqual(serviceClaimProblems(good), [], "the published index.html passes");
  const paragraphStart = good.indexOf("<p><span data-l=\"ru\">Выстраиваю РБПО");
  assert.ok(paragraphStart > 0, "service paragraph anchor");
  const variants = {
    commentedEnglish: good.replace(/(<span data-l="en">I build a secure development lifecycle[\s\S]*?<\/span>)/, "<!-- $1 -->"),
    hiddenParagraph: good.replace("<p><span data-l=\"ru\">Выстраиваю РБПО", "<p hidden><span data-l=\"ru\">Выстраиваю РБПО"),
    hiddenEnglish: good.replace("<span data-l=\"en\">I build a secure development lifecycle", "<span aria-hidden=\"true\" data-l=\"en\">I build a secure development lifecycle"),
    wrongAmountTooRu: good.replace("порядка 18 млн ₽ в год)", "порядка 18 млн ₽ в год; позже 118 млн ₽ в месяц)"),
    wrongAmountEn: good.replace("about RUB 18 million a year", "about RUB 118 million a month"),
    extraCodeSize: good.replace("около 130 тыс. строк кода", "около 130 тыс. строк кода, позже 230 тыс. строк кода"),
    wrongCodeEn: good.replace("about 130,000 lines of code", "about 13,000 lines of code"),
  };
  for (const [name, html] of Object.entries(variants)) {
    assert.notEqual(html, good, `${name}: mutation applied`);
    assert.ok(serviceClaimProblems(html).length > 0, `${name} must be rejected`);
  }
});

test("case decks use one pseudonym; quote styles are normalised", () => {
  assert.deepEqual(joinStockCompanies("<p>АО «Альфа» и АО „Альфа“</p>"), ["Альфа", "Альфа"]);
  assert.deepEqual(joinStockCompanies("<p>АО «Альфа», затем АО „Бета“</p>"), ["Альфа", "Бета"]);
  assert.deepEqual(joinStockCompanies("<!-- АО «Альфа» --><p>АО «Бета»</p>"), ["Бета"]);
  assert.deepEqual(joinStockCompanies("<p>АО\u00A0«Бета»</p>"), ["Бета"]);
  assert.deepEqual(joinStockCompanies("<p>АО «Альфа»</p><script>f.innerHTML = 'АО «Бета» · кейс';</script>"), ["Альфа", "Бета"]);
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
    assert.deepEqual(employerMentions(html), [], `${page} names the former employer`);
  }
  // Три презентации – исторические (слово владельца 27.11): проверяем, но не правим.
  for (const deck of ["rbpo-audit", "rbpo-audit-start-result", "sbom-license-audit"]) {
    const html = readFileSync(resolve(projectDir, "..", deck, "index.html"), "utf8");
    const names = joinStockCompanies(html);
    assert.ok(names.length > 0, `${deck} shows the pseudonym`);
    assert.deepEqual([...new Set(names)], ["Альфа"], `${deck} uses only «АО «Альфа»» (got ${[...new Set(names)].join(", ")})`);
  }
});
