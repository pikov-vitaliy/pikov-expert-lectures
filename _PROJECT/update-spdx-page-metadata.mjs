import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(projectDir, "..", "spdx");
const siteOrigin = "https://spdx.pikov.expert";

function usage() {
  return "Usage: node _PROJECT/update-spdx-page-metadata.mjs [--root <spdx-dir>] (--check|--write)";
}

function parseArguments(args) {
  let root = defaultRoot;
  let mode;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--root") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--root requires a directory path");
      root = resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--check" || argument === "--write") {
      if (mode) throw new Error("choose exactly one of --check or --write");
      mode = argument;
      continue;
    }
    throw new Error(`unknown argument: ${argument}`);
  }

  if (!mode) throw new Error("choose exactly one of --check or --write");
  return { root, mode };
}

function detectNewline(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function setQuotedAttribute(tag, name, value, pattern) {
  if (pattern.test(tag)) {
    return tag.replace(pattern, (_match, whitespace) => `${whitespace}${name}="${value}"`);
  }
  return tag.replace(/^<html\b/iu, match => `${match} ${name}="${value}"`);
}

function setHtmlLanguage(html, language, includeXmlLanguage) {
  const htmlTagMatch = html.match(/<html\b[^>]*>/iu);
  if (!htmlTagMatch) throw new Error("missing <html> element");

  let htmlTag = htmlTagMatch[0];
  if (includeXmlLanguage) {
    htmlTag = setQuotedAttribute(
      htmlTag,
      "xml:lang",
      language,
      /(^|\s)xml:lang\s*=\s*(["'])[^"']*\2/iu,
    );
  }
  htmlTag = setQuotedAttribute(
    htmlTag,
    "lang",
    language,
    /(^|\s)lang\s*=\s*(["'])[^"']*\2/iu,
  );

  return html.slice(0, htmlTagMatch.index)
    + htmlTag
    + html.slice(htmlTagMatch.index + htmlTagMatch[0].length);
}

function canonicalTag(url) {
  return `<link rel="canonical" href="${url}" />`;
}

function setCanonical(html, url) {
  if (!/<\/head>/iu.test(html)) throw new Error("missing </head> element");
  const pattern = /<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/giu;
  const matches = [...html.matchAll(pattern)];

  if (matches.length === 1) {
    const href = matches[0][0].match(/\bhref\s*=\s*["']([^"']*)["']/iu)?.[1];
    if (href === url) return html;
  }

  if (matches.length > 0) {
    let retained = false;
    return html.replace(pattern, () => {
      if (retained) return "";
      retained = true;
      return canonicalTag(url);
    });
  }

  const newline = detectNewline(html);
  const closingHeadLine = /^([ \t]*)<\/head>/imu;
  if (closingHeadLine.test(html)) {
    return html.replace(
      closingHeadLine,
      (_match, indentation) => `${indentation}  ${canonicalTag(url)}${newline}${indentation}</head>`,
    );
  }
  return html.replace(/<\/head>/iu, `${newline}${canonicalTag(url)}${newline}</head>`);
}

function normalizePage(html, { language, includeXmlLanguage, canonicalUrl }) {
  return setCanonical(
    setHtmlLanguage(html, language, includeXmlLanguage),
    canonicalUrl,
  );
}

function canonicalFileName(fileName) {
  return encodeURIComponent(fileName).replace(/%2B/giu, "+");
}

function collectTargets(root) {
  const targets = [];
  const topLevelHtml = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".html"))
    .map(entry => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));

  for (const fileName of topLevelHtml) {
    const isRootIndex = fileName.toLowerCase() === "index.html";
    const canonicalUrl = isRootIndex
      ? `${siteOrigin}/`
      : `${siteOrigin}/${canonicalFileName(fileName)}`;
    targets.push({
      path: join(root, fileName),
      language: isRootIndex ? "ru" : "en",
      includeXmlLanguage: true,
      canonicalUrl,
    });

    if (!isRootIndex) {
      const companionPath = join(root, fileName.slice(0, -".html".length));
      if (existsSync(companionPath) && statSync(companionPath).isFile()) {
        targets.push({
          path: companionPath,
          language: "en",
          includeXmlLanguage: true,
          canonicalUrl,
        });
      }
    }
  }

  const licensesIndex = join(root, "licenses", "index.html");
  if (existsSync(licensesIndex) && statSync(licensesIndex).isFile()) {
    targets.push({
      path: licensesIndex,
      language: "ru",
      includeXmlLanguage: false,
      canonicalUrl: `${siteOrigin}/`,
    });
  }

  return targets;
}

function displayPath(root, path) {
  return relative(root, path).replaceAll("\\", "/");
}

function main() {
  const { root, mode } = parseArguments(process.argv.slice(2));
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(`SPDX root is not a directory: ${root}`);
  }

  const targets = collectTargets(root);
  if (targets.length === 0) throw new Error(`no public SPDX pages found in: ${root}`);

  const changed = [];
  for (const target of targets) {
    const before = readFileSync(target.path, "utf8");
    let after;
    try {
      after = normalizePage(before, target);
    } catch (error) {
      throw new Error(`${displayPath(root, target.path)}: ${error.message}`);
    }
    if (after === before) continue;
    changed.push(target.path);
    if (mode === "--write") writeFileSync(target.path, after, "utf8");
  }

  if (mode === "--check") {
    if (changed.length > 0) {
      const preview = changed.slice(0, 20).map(path => `  - ${displayPath(root, path)}`).join("\n");
      const remainder = changed.length > 20 ? `\n  ... and ${changed.length - 20} more` : "";
      process.stderr.write(`SPDX metadata stale: ${changed.length} of ${targets.length} files require --write\n${preview}${remainder}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`SPDX METADATA CHECK OK files=${targets.length}\n`);
    return;
  }

  process.stdout.write(`SPDX METADATA WRITE OK files=${targets.length} changed=${changed.length}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR ${error.message}\n${usage()}\n`);
  process.exitCode = 1;
}
