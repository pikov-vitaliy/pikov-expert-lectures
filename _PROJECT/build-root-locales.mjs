import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(projectDir);
const sourcePath = path.join(rootDir, "index.html");
const targetPath = path.join(rootDir, "ru", "index.html");
const courseMapSourcePath = path.join(rootDir, "course-map.html");
const courseMapTargetPath = path.join(rootDir, "ru", "course-map.html");
const mode = process.argv[2];

if (!new Set(["--write", "--check"]).has(mode)) {
  process.stderr.write("Usage: node _PROJECT/build-root-locales.mjs --write|--check\n");
  process.exit(2);
}

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Russian locale build: missing ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Russian locale build: ${label} is not unique`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function buildRussian(english) {
  const russianProfile = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": "https://pikov.expert/#person",
        "name": "Пиков Виталий Александрович",
        "alternateName": ["Виталий Пиков", "Vitaliy Pikov", "Vitaly Pikov"],
        "url": "https://pikov.expert/",
        "image": "https://pikov.expert/photo.jpg",
        "email": "mailto:vitaly@pikov.expert",
        "jobTitle": "Эксперт по безопасной разработке ПО, DevSecOps и AppSec; преподаватель",
        "affiliation": {
          "@type": "CollegeOrUniversity",
          "name": "Российский новый университет (РосНОУ)"
        },
        "knowsAbout": ["Безопасная разработка ПО", "DevSecOps", "AppSec", "Security by Design", "Моделирование угроз", "SCA и SBOM", "Безопасность цепочки поставок ПО", "Безопасная разработка C/C++", "NIST SSDF", "OWASP", "CWE", "ISO/IEC 27001", "Техническая защита информации", "Astra Linux", "Тестирование на проникновение"],
        "sameAs": ["https://t.me/UnderLineSecurity"]
      },
      {
        "@type": "WebSite",
        "@id": "https://pikov.expert/#website",
        "url": "https://pikov.expert/",
        "name": "pikov.expert",
        "inLanguage": ["en", "ru"],
        "description": "Личный каталог авторских лекций и курсов Виталия Пикова по информационной безопасности. Интерфейс каталога доступен на русском и английском языках; сами учебные материалы — на русском.",
        "author": { "@id": "https://pikov.expert/#person" }
      }
    ]
  };

  const replacements = [
    ["<html lang=\"en\" data-lang=\"en\">", "<html lang=\"ru\" data-lang=\"ru\">", "document language"],
    ["<a class=\"lang-btn\" id=\"langToggle\" href=\"/ru/\"", "<a class=\"lang-btn\" id=\"langToggle\" href=\"/\"", "language fallback link"],
    ["<title>Vitaliy Pikov — secure software development, DevSecOps and AppSec expert</title>", "<title>Виталий Пиков — эксперт по безопасной разработке ПО, DevSecOps и AppSec</title>", "title"],
    ["<meta name=\"author\" content=\"Vitaliy Pikov\">", "<meta name=\"author\" content=\"Пиков Виталий Александрович\">", "author"],
    ["<meta name=\"description\" content=\"Original lectures and courses on information security by Vitaliy Pikov: secure software development (SSDLC), DevSecOps, AppSec, SAST, fuzzing, penetration testing, Astra Linux and Windows hardening, SIEM, certification and licensing. Course materials are in Russian.\">", "<meta name=\"description\" content=\"Авторские лекции и курсы по информационной безопасности, защите информации, ОС Astra Linux и Windows, Сканер-ВС 7, архитектуре ЭВМ, сертификации и лицензированию ТЗИ, безопасной разработке ПО и SIEM.\">", "description"],
    ["<link rel=\"canonical\" href=\"https://pikov.expert/\">", "<link rel=\"canonical\" href=\"https://pikov.expert/ru/\">", "canonical"],
    ["<meta property=\"og:locale\" content=\"en_US\">", "<meta property=\"og:locale\" content=\"ru_RU\">", "OpenGraph locale"],
    ["<meta property=\"og:locale:alternate\" content=\"ru_RU\">", "<meta property=\"og:locale:alternate\" content=\"en_US\">", "OpenGraph alternate locale"],
    ["<meta property=\"og:url\" content=\"https://pikov.expert/\">", "<meta property=\"og:url\" content=\"https://pikov.expert/ru/\">", "OpenGraph URL"],
    ["<meta property=\"og:title\" content=\"Vitaliy Pikov — secure software development, DevSecOps and AppSec expert\">", "<meta property=\"og:title\" content=\"Виталий Пиков — эксперт по безопасной разработке ПО, DevSecOps и AppSec\">", "OpenGraph title"],
    ["<meta property=\"og:description\" content=\"Original lectures and courses on secure software development, DevSecOps, AppSec, penetration testing, platform hardening and SIEM. Course materials are in Russian.\">", "<meta property=\"og:description\" content=\"Авторские лекции и курсы по безопасной разработке ПО, DevSecOps, AppSec, тестированию на проникновение, защите платформ и SIEM.\">", "OpenGraph description"],
    ["<meta property=\"og:image:alt\" content=\"Vitaliy Pikov — portrait\">", "<meta property=\"og:image:alt\" content=\"Пиков Виталий Александрович — фото\">", "OpenGraph image alt"],
    ["<meta property=\"profile:first_name\" content=\"Vitaliy\">", "<meta property=\"profile:first_name\" content=\"Виталий\">", "profile first name"],
    ["<meta property=\"profile:last_name\" content=\"Pikov\">", "<meta property=\"profile:last_name\" content=\"Пиков\">", "profile last name"],
    ["<meta name=\"twitter:title\" content=\"Vitaliy Pikov — secure software development, DevSecOps and AppSec expert\">", "<meta name=\"twitter:title\" content=\"Виталий Пиков — эксперт по безопасной разработке ПО, DevSecOps и AppSec\">", "Twitter title"],
    ["<meta name=\"twitter:description\" content=\"Original lectures and courses on secure software development, DevSecOps, AppSec, penetration testing, platform hardening and SIEM. Course materials are in Russian.\">", "<meta name=\"twitter:description\" content=\"Авторские лекции и курсы по безопасной разработке ПО, DevSecOps, AppSec, тестированию на проникновение, защите платформ и SIEM.\">", "Twitter description"],
    ["<meta name=\"twitter:image:alt\" content=\"Vitaliy Pikov — portrait\">", "<meta name=\"twitter:image:alt\" content=\"Пиков Виталий Александрович — фото\">", "Twitter image alt"],
    // Значение обязано совпадать байт в байт с portraitAlt в UI.ru (index.html),
    // иначе статическая разметка и runtime-правка alt разойдутся.
    ["alt=\"Vitaliy Pikov — portrait\"", "alt=\"Пиков Виталий Александрович — фото\"", "portrait alt"],
    ["aria-label=\"Main navigation\"", "aria-label=\"Основная навигация\"", "main navigation label"],
    ["aria-label=\"Switch the site to Russian\" title=\"Switch the site to Russian\"", "aria-label=\"Переключить сайт на английский язык\" title=\"Переключить сайт на английский язык\"", "language button label"],
    ["aria-label=\"Catalogue view: cards or list\" title=\"Cards / list\"", "aria-label=\"Вид каталога: карточки или строки\" title=\"Карточки / строки\"", "view button label"],
    ["aria-label=\"Switch the light/dark theme\"", "aria-label=\"Переключить светлую/тёмную тему\"", "theme button label"],
    ["aria-label=\"Course sections\"", "aria-label=\"Разделы лекций\"", "sections label"],
    ["aria-label=\"Materials for the beginner pathway\"", "aria-label=\"Материалы маршрута для начинающего\"", "beginner pathway label"],
    ["aria-label=\"Materials for the administrator pathway\"", "aria-label=\"Материалы маршрута администратора\"", "administrator pathway label"],
    ["aria-label=\"Materials for the developer pathway\"", "aria-label=\"Материалы маршрута разработчика\"", "developer pathway label"],
    ["placeholder=\"Search the catalogue\" aria-label=\"Search the catalogue\"", "placeholder=\"Поиск по лекциям\" aria-label=\"Поиск по лекциям\"", "search label"],
    ["aria-label=\"Filter by label\"", "aria-label=\"Фильтр по метке\"", "format label"],
    ["aria-label=\"Core professional areas\"", "aria-label=\"Основные профессиональные направления\"", "profile areas label"],
    ["aria-label=\"Standards and methodologies\"", "aria-label=\"Стандарты и методологии\"", "standards label"],
    ["aria-label=\"Educational project status\"", "aria-label=\"Статус образовательного проекта\"", "project status label"]
  ];

  let russian = english;
  for (const [before, after, label] of replacements) {
    russian = replaceOnce(russian, before, after, label);
  }
  russian = russian.replace(
    /<script id="ld-profile" type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script id="ld-profile" type="application/ld+json">\n${JSON.stringify(russianProfile, null, 2)}\n</script>`,
  );
  return russian;
}

// Карта курсов устроена так же, как главная: оба языка едут в разметке парами
// <span data-l>, английский маршрут лежит в корне, русский — под /ru/. Здесь
// переводится только то, что различается между документами: голова,канонический
// адрес, язык корневого элемента и ссылка переключателя.
function buildRussianCourseMap(english) {
  const replacements = [
    ["<html lang=\"en\" data-lang=\"en\">", "<html lang=\"ru\" data-lang=\"ru\">", "document language"],
    ["<title>Teaching map of the courses — Vitaliy Pikov</title>", "<title>Преподавательская карта курсов — Виталий Пиков</title>", "title"],
    ["<meta name=\"author\" content=\"Vitaliy Pikov\">", "<meta name=\"author\" content=\"Пиков Виталий Александрович\">", "author"],
    ["<meta name=\"description\" content=\"The teaching map behind every course: audience, prerequisites, measurable outcomes, artefacts, assessment criteria and a suggested route through the material.\">", "<meta name=\"description\" content=\"Преподавательская карта авторских курсов: аудитория, предпосылки, измеримые результаты, артефакты, критерии и рекомендуемые маршруты.\">", "description"],
    ["<link rel=\"canonical\" href=\"https://pikov.expert/course-map.html\">", "<link rel=\"canonical\" href=\"https://pikov.expert/ru/course-map.html\">", "canonical"],
    ["<meta property=\"og:locale\" content=\"en_US\">", "<meta property=\"og:locale\" content=\"ru_RU\">", "OpenGraph locale"],
    ["<meta property=\"og:locale:alternate\" content=\"ru_RU\">", "<meta property=\"og:locale:alternate\" content=\"en_US\">", "OpenGraph alternate locale"],
    ["<meta property=\"og:title\" content=\"Teaching map of the original courses\">", "<meta property=\"og:title\" content=\"Преподавательская карта авторских курсов\">", "OpenGraph title"],
    ["<meta property=\"og:description\" content=\"Five specialisations and verifiable learning outcomes across the whole network of Vitaliy Pikov's materials.\">", "<meta property=\"og:description\" content=\"Пять направлений и проверяемые учебные результаты для всей сети материалов Виталия Пикова.\">", "OpenGraph description"],
    ["<meta property=\"og:url\" content=\"https://pikov.expert/course-map.html\">", "<meta property=\"og:url\" content=\"https://pikov.expert/ru/course-map.html\">", "OpenGraph URL"],
    ["<meta name=\"twitter:title\" content=\"Teaching map of the original courses\">", "<meta name=\"twitter:title\" content=\"Преподавательская карта авторских курсов\">", "Twitter title"],
    ["<meta name=\"twitter:description\" content=\"Five specialisations and verifiable learning outcomes across the whole network of Vitaliy Pikov's materials.\">", "<meta name=\"twitter:description\" content=\"Пять направлений и проверяемые учебные результаты для всей сети материалов Виталия Пикова.\">", "Twitter description"],
    ["\"name\": \"Teaching map of the original courses\",\n    \"url\": \"https://pikov.expert/course-map.html\",\n    \"inLanguage\": \"en\",", "\"name\": \"Преподавательская карта авторских курсов\",\n    \"url\": \"https://pikov.expert/ru/course-map.html\",\n    \"inLanguage\": \"ru\",", "structured data"],
    ["href=\"/ru/course-map.html\" aria-label=\"Switch the page to Russian\" title=\"Switch the page to Russian\"", "href=\"/course-map.html\" aria-label=\"Переключить страницу на английский язык\" title=\"Переключить страницу на английский язык\"", "language button"],
  ];

  let russian = english;
  for (const [before, after, label] of replacements) {
    russian = replaceOnce(russian, before, after, label);
  }
  return russian;
}

const documents = [
  { source: sourcePath, target: targetPath, build: buildRussian },
  { source: courseMapSourcePath, target: courseMapTargetPath, build: buildRussianCourseMap },
];

let failed = false;
for (const document of documents) {
  const expected = document.build(fs.readFileSync(document.source, "utf8"));
  const relative = path.relative(rootDir, document.target).split(path.sep).join("/");
  if (mode === "--write") {
    fs.mkdirSync(path.dirname(document.target), { recursive: true });
    fs.writeFileSync(document.target, expected, "utf8");
    process.stdout.write(`ROOT LOCALES WRITE OK ${relative}\n`);
    continue;
  }
  if (!fs.existsSync(document.target)) {
    process.stderr.write(`ROOT LOCALES CHECK FAIL missing ${relative}\n`);
    failed = true;
    continue;
  }
  if (fs.readFileSync(document.target, "utf8") !== expected) {
    process.stderr.write(`ROOT LOCALES CHECK FAIL stale ${relative}\n`);
    failed = true;
    continue;
  }
  process.stdout.write(`ROOT LOCALES CHECK OK ${relative}\n`);
}
if (failed) process.exit(1);
