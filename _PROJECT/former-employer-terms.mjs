// Аббревиатуры прежнего работодателя для проверок «нет прежнего работодателя».
//
// Слово владельца 28.11.2026: в публичном репозитории названия не должно быть открытым
// текстом, история git остаётся как есть. Поэтому здесь они записаны в base64, а SHA-256
// подтверждает, что раскодировано ровно то, что было согласовано. Это не шифрование:
// задача – чтобы название не читалось в файлах и не находилось поиском по репозиторию.
// Шаблоны проверок и примеры самопроверки собираются из TERMS при запуске.
import {createHash} from 'node:crypto';

const ENCODED = {
  cyrA: '0JzQndCi0KY=', // кириллическая аббревиатура, 1
  cyrB: '0JzQmNCt0KI=', // кириллическая аббревиатура, 2
  latA: 'TU5UQw==', // латинская аббревиатура, 1
  latB: 'TUlFVA==', // латинская аббревиатура, 2
  latC: 'SVNUQw==', // латинская аббревиатура из адреса сайта
};
const SHA256 = {
  cyrA: 'b544c5d44eee944ffc77babd6fbdc5aa2cf8befb328a36e6adea897a5e5d5fa7',
  cyrB: '05c0f43a7d93a5312b69bc3927a1fb4f03bdebb385f612d44a4742b32fc5914e',
  latA: '26739ab97fff071ff60b94de00a7edd035763daeaa608a47ae7f7b1133470fee',
  latB: '5fd87d12cf90a77720b3f491fc8bccfa1426329723e2cf521185f18732901ca1',
  latC: '6171904e6dbbdbfd185bcfcc139565969b1a346cfdee6df0d8103a75154ea36f',
};

export const TERMS = Object.freeze(Object.fromEntries(Object.entries(ENCODED).map(([key, value]) => {
  const term = Buffer.from(value, 'base64').toString('utf8');
  const hash = createHash('sha256').update(term, 'utf8').digest('hex');
  if (hash !== SHA256[key]) throw new Error(`former-employer term ${key} does not match its SHA-256`);
  return [key, term];
})));

const lower = s => s.toLowerCase();
// Адрес сайта и имя файла логотипа, которые ловила исходная проверка main.
export const DOMAIN_TOKEN = `${lower(TERMS.latC)}-${lower(TERMS.latB)}`;
export const LOGO_TOKEN = `${lower(TERMS.latA)}-logo`;
export const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Проверки main подстрокой – те же выражения, что были в main открытым текстом.
export const MAIN_PARITY_SOURCE = new RegExp([TERMS.cyrA, TERMS.cyrB, TERMS.latA, TERMS.latB, DOMAIN_TOKEN, LOGO_TOKEN].map(escapeRe).join('|'), 'i');
export const MAIN_PARITY_VISIBLE = new RegExp([TERMS.cyrA, TERMS.cyrB, TERMS.latA, TERMS.latB, lower(TERMS.latC)].map(escapeRe).join('|'), 'i');

// Помощники для примеров самопроверки: имя собирается из частей, в файлах тестов его нет.
export const fixtureHelpers = (() => {
  const code = (s, i) => s.codePointAt(i);
  const swap = (s, table) => [...s].map(c => table[c] ?? c).join('');
  return {
    lower,
    cap: s => s[0] + lower(s.slice(1)),
    rev: s => [...s].reverse().join(''),
    halves: s => [s.slice(0, 2), s.slice(2)],
    code,
    // Одна буква десятичной или шестнадцатеричной ссылкой; semi – точка с запятой или пусто.
    ent: (s, i, semi = '') => `${s.slice(0, i)}&#${code(s, i)}${semi}${s.slice(i + 1)}`,
    hexEnt: (s, i, semi = '') => `${s.slice(0, i)}&#x${code(s, i).toString(16)}${semi}${s.slice(i + 1)}`,
    allEnt: s => [...s].map(c => `&#${c.codePointAt(0)}`).join(''),
    pct: s => [...s].map(c => '%' + c.charCodeAt(0).toString(16).toUpperCase()).join(''),
    // Одна буква CSS-экранированием: «\45 ».
    cssEsc: (s, i) => `${s.slice(0, i)}\\${code(s, i).toString(16)} ${s.slice(i + 1)}`,
    swap,
    greek: s => swap(s, {C: 'Ϲ', E: 'Ε', I: 'Ι', M: 'Μ', N: 'Ν', T: 'Τ'}),
    cyrLook: s => swap(s, {C: 'С', E: 'Е', I: 'І', M: 'М', N: 'Н', T: 'Т'}),
    cyrNamed: s => [...s].map(c => `&${({И: 'Icy', М: 'Mcy', Н: 'Ncy', Т: 'Tcy', Ц: 'TScy', Э: 'Ecy'})[c]};`).join(''),
    wide: s => [...s].map(c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0)).join(''),
  };
})();
