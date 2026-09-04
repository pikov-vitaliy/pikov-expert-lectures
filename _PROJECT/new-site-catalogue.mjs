import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Script, createContext } from 'node:vm';

// Presentation metadata only. The original homepage remains the content source.
export const CATEGORY_ORDER = Object.freeze(['rbpo', 'os', 'reg', 'offense', 'edu']);
export const MATERIAL_KINDS = Object.freeze(['lecture', 'course', 'practice', 'reference']);

const CATEGORY_PRESENTATION = {
  rbpo: {
    label: 'Безопасная разработка', labelEn: 'Secure development',
    description: 'От требований и архитектуры до анализа кода и цепочки поставок ПО.',
    descriptionEn: 'From requirements and architecture to code analysis and the software supply chain.',
  },
  os: {
    label: 'ОС и платформы', labelEn: 'Systems & platforms',
    description: 'Astra Linux, Windows, аппаратная безопасность и инструменты защиты.',
    descriptionEn: 'Astra Linux, Windows, hardware security and security tools.',
  },
  reg: {
    label: 'Регулирование и право', labelEn: 'Regulation & law',
    description: 'Сертификация, лицензирование, управление рисками и защита КИИ.',
    descriptionEn: 'Certification, licensing, risk management and critical infrastructure protection.',
  },
  offense: {
    label: 'Тестирование безопасности', labelEn: 'Security testing',
    description: 'Пентест, фаззинг и статический анализ: методология и практика.',
    descriptionEn: 'Pentesting, fuzzing and static analysis: methods and practice.',
  },
  edu: {
    label: 'Учёба и справочники', labelEn: 'Study & references',
    description: 'Проектирование информационных систем, выпускные работы и лицензии SPDX.',
    descriptionEn: 'Information systems design, graduation projects and SPDX licences.',
  },
};

// These source labels name institutions or subjects, rather than material types.
// Classify those entries explicitly; an unfamiliar label must be reviewed.
const KIND_BY_URL = new Map([
  ['https://kapo.pikov.expert/', 'lecture'],
  ['https://sast.pikov.expert/', 'lecture'],
  ['https://p19.pikov.expert/', 'lecture'],
  ['https://ppk.pikov.expert/', 'course'],
  ['https://27001.pikov.expert/', 'lecture'],
  ['https://appsec-lections.pikov.expert/', 'course'],
  ['https://is.pikov.expert/', 'course'],
  ['https://vkr.pikov.expert/', 'lecture'],
]);

function classifyMaterial(item) {
  if (KIND_BY_URL.has(item.url)) return KIND_BY_URL.get(item.url);
  const format = item.formatEn.toLowerCase();
  if (/\breference\b/.test(format)) return 'reference';
  if (/\bworkshop\b/.test(format)) return 'practice';
  if (/\bcourse\b/.test(format)) return 'course';
  if (/\blecture\b|\bteaching day\b/.test(format)) return 'lecture';
  throw new Error(`Unclassified material format ${JSON.stringify(item.formatEn)}: ${item.url}`);
}

function requireText(record, field, context) {
  if (typeof record[field] !== 'string' || !record[field].trim()) {
    throw new Error(`${context}: missing or empty ${field}`);
  }
}

/** Validate source data before it reaches generated HTML or a locale fallback. */
export function validateCatalogue({ categories, lectures }) {
  if (!Array.isArray(categories) || !categories.length) throw new Error('CATEGORIES must be a non-empty array');
  if (!Array.isArray(lectures) || !lectures.length) throw new Error('LECTURES must be a non-empty array');
  const categoryIds = new Set();
  for (const category of categories) {
    for (const field of ['id', 'name', 'nameEn']) requireText(category, field, 'Category');
    if (!CATEGORY_ORDER.includes(category.id)) throw new Error(`Unsupported category: ${category.id}`);
    if (categoryIds.has(category.id)) throw new Error(`Duplicate category: ${category.id}`);
    categoryIds.add(category.id);
  }
  const urls = new Set();
  for (const [index, item] of lectures.entries()) {
    const context = `Material ${index + 1}`;
    for (const field of ['category', 'url', 'title', 'titleEn', 'description', 'descriptionEn', 'format', 'formatEn']) {
      requireText(item, field, context);
    }
    if (!categoryIds.has(item.category)) throw new Error(`${context}: unsupported category ${item.category}`);
    let url;
    try { url = new URL(item.url); } catch { throw new Error(`${context}: invalid URL ${item.url}`); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`${context}: expected a public HTTPS URL`);
    // Keep path and fragment: the course programme has several valid cards on one host.
    if (urls.has(url.href)) throw new Error(`Duplicate material URL: ${item.url}`);
    urls.add(url.href);
    if (item.kind !== undefined && !MATERIAL_KINDS.includes(item.kind)) throw new Error(`${context}: unsupported kind ${item.kind}`);
  }
  return { categories, lectures };
}

function extractArrayLiteral(source, identifier) {
  // Match only the two known declarations, not scripts or DOM content generally.
  const declaration = new RegExp(`^const ${identifier} = (\\[[\\s\\S]*?^\\]);`, 'gm');
  const matches = [...source.matchAll(declaration)];
  if (matches.length !== 1) throw new Error(`Expected one ${identifier} array declaration; found ${matches.length}`);
  return matches[0][1];
}

/**
 * Parse only the trusted repository's catalogue literals, never its page scripts.
 * VM has no Node or browser globals, runtime code generation is disabled and
 * execution is bounded. This is not a parser for untrusted third-party HTML.
 */
export function parseCatalogue(sourceHtml) {
  const categoryLiteral = extractArrayLiteral(sourceHtml, 'CATEGORIES');
  const lectureLiteral = extractArrayLiteral(sourceHtml, 'LECTURES');
  const context = createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false },
  });
  const serialized = new Script(
    `JSON.stringify({categories: (${categoryLiteral}), lectures: (${lectureLiteral})})`,
    { filename: 'homepage-catalogue-literals.js' },
  ).runInContext(context, { timeout: 1000 });
  const raw = validateCatalogue(JSON.parse(serialized));
  const categories = [...raw.categories]
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.id) - CATEGORY_ORDER.indexOf(b.id))
    .map(category => ({ ...category, ...CATEGORY_PRESENTATION[category.id] }));
  const lectures = raw.lectures.map(item => ({ ...item, kind: classifyMaterial(item) }));
  return validateCatalogue({ categories, lectures });
}

/** Read the canonical homepage at build time; does not read generated locale files. */
export function readCatalogue(rootPath) {
  return parseCatalogue(readFileSync(join(rootPath, 'index.html'), 'utf8'));
}
