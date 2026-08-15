import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(projectDir);
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function plain(html) {
  return html
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&ge;", "≥")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function check(name, fn) {
  try {
    fn();
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    process.stdout.write(`FAIL ${name}\n`);
  }
}

function includesAll(text, values) {
  for (const value of values) assert.ok(text.includes(value), `missing: ${value}`);
}

function excludesAll(text, values) {
  for (const value of values) assert.ok(!text.includes(value), `obsolete claim remains: ${value}`);
}

const windowsHtml = read("windows/index.html");
const windows = plain(windowsHtml);
const licensing = plain(read("lic-tzi/index.html"));
const department = plain(read("tzi-dept/index.html"));
const elbrus = plain(read("pc-elbrus/index.html"));
const astraIntro = plain(read("astralinux01/index.html"));
const astraTermsHtml = read("astralinux02/index.html");
const astraTerms = plain(astraTermsHtml);
const certification = plain(read("cert/index.html"));
const composition = plain(read("kapo/index.html"));

check("Windows password guidance separates the international baseline from local compliance", () => {
  includesAll(windows, [
    "NIST SP 800-63B-4",
    "без произвольной периодической смены",
    "локальный профиль",
    "не являются прямыми требованиями приказа ФСТЭК № 21",
  ]);
  excludesAll(windows, [
    "Эти настройки соответствуют требованиям Приказа ФСТЭК № 21",
    "Парольная политика: длина ≥ 12, сложность, срок 90 дней",
    "Сложность, длина ≥ 12, срок 90 дней",
  ]);
});

check("Windows application control and information protection names are current", () => {
  includesAll(windows, [
    "App Control for Business (ранее WDAC)",
    "KB5024351",
    "всех редакциях Windows 10 версии 2004 и новее и Windows 11",
    "Windows Information Protection удалён начиная с Windows 11 24H2",
    "Microsoft Purview Information Protection",
    "Endpoint DLP",
  ]);
  excludesAll(windows, [
    "AppLocker и Windows Defender Application Control",
    "Enterprise/Education Windows 10/11 Pro и выше",
    "Windows Information Protection (WIP) — защита корпоративных данных",
  ]);
});

check("Windows device encryption and lifecycle statements are scoped", () => {
  includesAll(windows, [
    "Device Encryption доступно во всех редакциях Windows",
    "Windows 11 24H2",
    "HSTI/Modern Standby",
    "XTS-AES 128 не является само по себе признаком недостаточной защиты",
    "Поддержка Windows 10 22H2 завершена 14.10.2025",
    "поддерживаемый выпуск Windows 11",
    "LTSC/ESU",
    "изолированный legacy-стенд",
    "не обеспечивает целостность или аутентификацию данных",
  ]);
  excludesAll(windows, [
    "Windows 10/11 Pro или Enterprise Наличие TPM 2.0 и поддержка Modern Standby",
    "не обеспечивает достаточный уровень защиты для конфиденциальных данных",
    "обеспечивает защиту от атак на модификацию данных",
  ]);
});

check("Windows local controls are selected by scope and preserve defense in depth", () => {
  includesAll(windows, [
    "видом системы, её классом или категорией, моделью угроз",
    "не отключать только из-за наличия другого СЗИ",
    "эшелонированную защиту",
    "проверять в реестре ФСТЭК для конкретной версии и конфигурации",
  ]);
  excludesAll(windows, [
    "до 70% инцидентов ИБ",
    "штатный антивирус может быть отключён",
    "Для систем 1–2 класса ГИС ключи шифрования должны храниться на сертифицированных ФСТЭК носителях",
    "Для систем обработки ПДн, ГИС и ЗО КИИ необходимо использовать сертифицированные ФСТЭК средства антивирусной защиты",
  ]);
});

check("GIS requirements use order 117 and retain order 17 only as history", () => {
  includesAll(department, [
    "Приказ ФСТЭК № 117",
    "Приказ № 17 утратил силу с 01.03.2026",
    "Приказ ФСТЭК России № 31 от 14.03.2014 (ред. приказа от 15.03.2021 № 46)",
  ]);
  excludesAll(department, [
    "Назначение ответственных за защиту информации (Приказ ФСТЭК № 17)",
    "Защита ГИС (Приказ ФСТЭК № 17)",
    "Приказ ФСТЭК России № 31 от 28.02.2017",
  ]);

  includesAll(licensing, [
    "Приказ ФСТЭК № 117",
    "№ 17 — исторический документ, утративший силу с 01.03.2026",
  ]);
  excludesAll(licensing, [
    "ГИС — госинформсистемы (ФЗ-149, Приказ ФСТЭК № 17)",
    "ПП № 79, Приказы № 17, 21, 239",
  ]);
});

check("TZI licensing workflow uses current channels, assessment and registry result", () => {
  includesAll(licensing, [
    "на бумажном носителе или заказным почтовым отправлением с уведомлением о вручении",
    "до 45 рабочих дней",
    "документарной оценки",
    "оценочному листу",
    "запись в реестре лицензий",
    "выписка из реестра",
    "внесение изменений в реестр лицензий",
    "статьёй 18 закона № 99-ФЗ",
    "статьёй 20 закона № 99-ФЗ",
    "категории риска",
    "не является универсальным требованием для каждой ИСПДн или КИИ",
  ]);
  excludesAll(licensing, [
    "через ЕПГУ",
    "Анализ соответствия требованиям (до 30 раб. дней)",
    "Выездная проверка МТБ и квалификации (при необходимости)",
    "электронная лицензия, подписанная ЭП ФСТЭК",
    "Наличие сведений в реестре недобросовестных поставщиков",
    "Срок переоформления: до 10 рабочих дней",
    "Плановые проверки (не чаще 1 раза в 3 года)",
    "На срок до 90 дней для устранения нарушений",
    "Без аттестата эксплуатация ГИС, ИСПДн и КИИ запрещена",
    "Актуально на 2025 г.",
  ]);
});

check("Astra terminology uses GOST R 50922-2006 and labels archived material", () => {
  includesAll(astraTerms, [
    "ГОСТ Р 50922-2006",
    "01.02.2008",
    "заменил ГОСТ Р 50922-96",
    "Применимость стандарта определяется нормативным и договорным контекстом",
  ]);
  assert.ok(!astraTermsHtml.includes("Терминология ГОСТ&nbsp;Р&nbsp;50922-96"), "obsolete divider title remains");
  assert.ok(!astraTermsHtml.includes("<h2 class=\"h2\">ГОСТ&nbsp;Р&nbsp;50922-96</h2>"), "obsolete heading remains");
  includesAll(astraIntro, [
    "Архивные учебные файлы сохранены как исторический источник",
    "актуальная терминология — ГОСТ Р 50922-2006",
  ]);
});

check("Elbrus lesson separates FSTEC system scopes and the FSB cryptographic contour", () => {
  includesAll(elbrus, [
    "№ 117 — ГИС и иные информационные системы государственного сектора",
    "№ 21 — ИСПДн",
    "№ 239 — значимые объекты КИИ",
    "№ 31 — АСУ ТП",
    "СКЗИ относятся к отдельному криптографическому контуру ФСБ",
    "иностранное происхождение криптобиблиотеки само по себе не образует универсального запрета",
    "NIST SP 800-193",
    "Protect — Detect — Recover",
  ]);
  excludesAll(elbrus, [
    "Использование сертифицированных СЗИ (СДЗ, СКЗИ)",
    "Запрет на использование иностранных криптобиблиотек в ГИС",
    "Соответствие Приказам № 378, № 117",
    "Контроль ВТСС в периметре (Приказ ФСТЭК № 79)",
  ]);
});

check("RBPO terminology and PPK-to-SBOM relationship are precise", () => {
  assert.ok(!certification.includes("БРПО"), "obsolete БРПО abbreviation remains");
  assert.ok(certification.includes("РБПО"), "РБПО abbreviation is missing");
  includesAll(composition, [
    "российский машиночитаемый перечень состава программного обеспечения",
    "сопоставимый по назначению с SBOM",
    "не является универсальным синонимом любого SBOM",
  ]);
  assert.ok(!composition.includes("Отечественный аналог SBOM"), "oversimplified PPK/SBOM equivalence remains");
});

check("edited sources retain basic HTML integrity", () => {
  for (const relativePath of [
    "windows/index.html",
    "lic-tzi/index.html",
    "tzi-dept/index.html",
    "pc-elbrus/index.html",
    "astralinux01/index.html",
    "astralinux02/index.html",
    "cert/index.html",
    "kapo/index.html",
  ]) {
    const html = read(relativePath);
    assert.match(html, /<!doctype html>/i, `${relativePath}: doctype is missing`);
    assert.match(html, /<\/html>\s*$/i, `${relativePath}: closing html tag is missing`);
  }
});

if (failures.length > 0) {
  process.stderr.write(`\nPlatform content checks failed (${failures.length}):\n- ${failures.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write("PLATFORM CONTENT CURRENTNESS OK\n");
