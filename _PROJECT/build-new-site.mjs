import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readCatalogue } from './new-site-catalogue.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const mode = process.argv[2] || '--write';
if (!['--write', '--check'].includes(mode)) throw new Error('Usage: node _PROJECT/build-new-site.mjs --write|--check');
const { categories, lectures } = readCatalogue(root);
const original = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const home = lang => lang === 'en' ? '/new/' : '/new/ru/';
const about = lang => `${home(lang)}about/`;
const current = lang => lang === 'en' ? '/' : '/ru/';
const asset = name => {
  const bytes = fs.readFileSync(path.join(root, 'new', 'assets', name));
  return `/new/assets/${name}?v=${crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 10)}`;
};
const arrow = '<span aria-hidden="true">↗</span>';
const copy = {
  en: {
    name:'Vitaliy Pikov', title:'Secure development.\nEngineering practice.', role:'Expert & lecturer',
    lead:'I help teams build secure software and teach the people behind it. Explore my lectures, practical workshops and resources for everyday engineering.',
    materials:'Materials', paths:'Where to start', about:'About me', contact:'Contact', browse:'Explore the materials', discuss:'Discuss training',
    classic:'Current website', version:'New website version', skip:'Skip to materials', switchLanguage:'Переключить на русский',
    theme:'Switch colour theme', light:'Use light theme', dark:'Use dark theme',
    portrait:'Vitaliy Pikov, secure software development expert and lecturer',
    facts:['26 years in IT','10+ years of teaching','40+ research publications'],
    topics:'Explore by subject', topicsIntro:'Different disciplines. One engineering perspective.', topicAction:'View materials',
    selected:'A few places to begin', selectedIntro:'An introduction to how I approach security, teaching and practical work.',
    catalogue:'The material library', catalogueIntro:'Lectures, courses, practical assignments and references, all in one place.',
    languageNote:'The website is available in English and Russian. Lecture pages and teaching materials open in Russian.',
    query:'Search materials', placeholder:'Try SBOM, Astra Linux or threat modelling', topic:'Subject', allTopics:'All subjects',
    format:'Format', allFormats:'All formats', reset:'Clear filters', empty:'No materials match these filters.', emptyHelp:'Try a broader search or clear the filters.',
    kinds:{lecture:'Lecture',course:'Course',practice:'Practical workshop',reference:'Reference'},
    opens:{lecture:'Read the lecture',course:'Explore the course',practice:'Open the workshop',reference:'Open the reference'},
    description:'Full description', russian:'In Russian', resources:'materials', results:'{shown} of {total} materials',
    pathTitle:'Choose your starting point', pathIntro:'A suggested order for building knowledge and putting it to work.',
    routeMore:'View the full teaching map', routeNotice:'The teaching map and linked materials are in Russian.',
    routes:[['Getting started','Learn the language of security','Understand assets, threats and risk. Start by mapping the boundaries of a simple information system.','Start with information systems','https://is.pikov.expert/'],['Administrators & security engineers','Build a system you can verify','Work through configuration, hardening and monitoring. Check what changed and how to roll it back.','Start with Astra Linux','https://astra-intro.pikov.expert/'],['Developers & DevSecOps','Bring security into development','Connect architecture, threat modelling, code analysis and software composition with evidence of the result.','Start with secure development','https://main-rbpo.pikov.expert/']],
    shortAbout:'Engineering, research and teaching.', shortAboutText:'My work brings together secure software development, information security and education. I translate requirements into architecture, working processes and checks that teams can use.',
    background:'More about my background', expertise:['Secure C/C++','SCA & SBOM','AppSec & DevSecOps','Threat modelling'],
    contactTitle:'Let’s work on the next step.', contactText:'For lectures, team training and consulting on secure software development and information security.',
    email:'Email me', independent:'An independent educational project by Vitaliy Pikov.',
    back:'Back to the materials', aboutTitle:'About Vitaliy Pikov',
    meta:'Original lectures, workshops and references by Vitaliy Pikov. Secure development, AppSec, DevSecOps, operating systems and information security.',
    aboutMeta:'Vitaliy Pikov: engineering practice, secure software development, teaching, research and professional background.',
  },
  ru: {
    name:'Виталий Пиков', title:'Безопасная разработка.\nИнженерная практика.', role:'Эксперт и преподаватель',
    lead:'Помогаю командам выстраивать безопасную разработку ПО и обучаю специалистов. Здесь — мои лекции, практикумы и материалы для повседневной инженерной работы.',
    materials:'Материалы', paths:'С чего начать', about:'Обо мне', contact:'Контакты', browse:'Изучить материалы', discuss:'Обсудить обучение',
    classic:'Текущая версия сайта', version:'Новая версия сайта', skip:'Перейти к материалам', switchLanguage:'Switch to English',
    theme:'Переключить цветовую тему', light:'Включить светлую тему', dark:'Включить тёмную тему',
    portrait:'Виталий Пиков, эксперт по безопасной разработке ПО и преподаватель',
    facts:['26 лет в ИТ','10+ лет преподавания','40+ научных публикаций'],
    topics:'Выберите направление', topicsIntro:'Разные дисциплины. Общий инженерный подход.', topicAction:'Смотреть материалы',
    selected:'С чего можно начать', selectedIntro:'Несколько материалов для знакомства с моим подходом к безопасности и преподаванию.',
    catalogue:'Библиотека материалов', catalogueIntro:'Лекции, курсы, практические задания и справочники в одном месте.',
    languageNote:'Сайт доступен на английском и русском. Лекции и учебные материалы опубликованы на русском языке.',
    query:'Поиск по материалам', placeholder:'Например, SBOM, Astra Linux или модель угроз', topic:'Направление', allTopics:'Все направления',
    format:'Формат', allFormats:'Все форматы', reset:'Сбросить фильтры', empty:'Материалов по этим условиям не найдено.', emptyHelp:'Попробуйте более общий запрос или сбросьте фильтры.',
    kinds:{lecture:'Лекция',course:'Курс',practice:'Практикум',reference:'Справочник'},
    opens:{lecture:'Открыть лекцию',course:'Перейти к курсу',practice:'Открыть практикум',reference:'Открыть справочник'},
    description:'Полное описание', russian:'На русском', resources:'материалов', results:'Показано {shown} из {total}',
    pathTitle:'Выберите точку входа', pathIntro:'Рекомендуемая последовательность, чтобы разобраться в теме и применить знания.',
    routeMore:'Полная преподавательская карта', routeNotice:'Карта и материалы маршрутов доступны на русском языке.',
    routes:[['Начинающим','Разобраться в основах ИБ','Активы, угрозы и риски. Начните с определения границ простой информационной системы.','Начать с информационных систем','https://is.pikov.expert/'],['Администраторам и специалистам по ИБ','Проверить и защитить систему','Конфигурация, безопасная настройка и мониторинг. Проверяйте результат изменений и возможность отката.','Начать с Astra Linux','https://astra-intro.pikov.expert/'],['Разработчикам и DevSecOps','Встроить безопасность в разработку','Свяжите архитектуру, модель угроз, анализ кода и компонентов с проверяемым результатом.','Начать с безопасной разработки','https://main-rbpo.pikov.expert/']],
    shortAbout:'Инженерная практика, наука и преподавание.', shortAboutText:'Моя работа объединяет безопасную разработку ПО, информационную безопасность и образование. Перевожу требования в архитектурные решения, рабочие процессы и проверки, которыми может пользоваться команда.',
    background:'Подробнее о профессиональном пути', expertise:['Безопасность C/C++','SCA и SBOM','AppSec и DevSecOps','Моделирование угроз'],
    contactTitle:'Обсудим следующую задачу.', contactText:'Лекции, обучение команд и консультации по безопасной разработке ПО и информационной безопасности.',
    email:'Написать на почту', independent:'Независимый образовательный проект Виталия Пикова.',
    back:'Вернуться к материалам', aboutTitle:'О Виталии Пикове',
    meta:'Авторские лекции, практикумы и справочники Виталия Пикова. Безопасная разработка, AppSec, DevSecOps, операционные системы и информационная безопасность.',
    aboutMeta:'Виталий Пиков: инженерная практика, безопасная разработка ПО, преподавание, научная работа и профессиональный путь.',
  },
};

const label = (item, field, lang) => item[`${field}${lang === 'en' ? 'En' : ''}`];
const materialTitle = (item, lang) => label(item, 'title', lang);
const shortDescription = (item, lang) => {
  const full = label(item, 'description', lang);
  if (full.length < 225) return full;
  const first = full.match(/^.{40,220}?[.!?](?:\s|$)/u)?.[0]?.trim();
  if (first) return first;
  return full.slice(0, 210).replace(/\s+\S*$/, '') + '…';
};
const countText = (n, lang) => {
  if (lang === 'en') return `${n} ${n === 1 ? 'material' : 'materials'}`;
  const mod = n % 100;
  const word = mod >= 11 && mod <= 14 ? 'материалов' : n % 10 === 1 ? 'материал' : n % 10 >= 2 && n % 10 <= 4 ? 'материала' : 'материалов';
  return `${n} ${word}`;
};

function header(lang, isAbout) {
  const t = copy[lang];
  const other = lang === 'en' ? 'ru' : 'en';
  return `<a class="skip-link" href="${isAbout ? '#about' : '#materials'}">${esc(t.skip)}</a>
<div class="edition-bar"><div class="wrap"><span>${esc(t.version)}</span><a class="brand-back" href="${current(lang)}">${esc(t.classic)} <span aria-hidden="true">↗</span></a></div></div>
<header class="site-header"><div class="wrap header-inner">
<a class="brand" href="${home(lang)}" aria-label="${esc(t.name)} — pikov.expert">pikov<span class="brand-dot">.</span>expert</a>
<nav class="site-nav" aria-label="${lang === 'en' ? 'Main navigation' : 'Основная навигация'}">
<a href="${home(lang)}#materials">${t.materials}</a><a href="${home(lang)}#paths">${t.paths}</a><a href="${about(lang)}"${isAbout ? ' aria-current="page"' : ''}>${t.about}</a><a href="#contact">${t.contact}</a>
</nav><div class="header-tools"><a class="locale-link" data-locale-switch href="${isAbout ? about(other) : home(other)}" lang="${other}" hreflang="${other}" aria-label="${esc(t.switchLanguage)}">${other === 'en' ? 'EN' : 'RU'} <span aria-hidden="true">↗</span></a><button class="theme-switch" type="button" data-theme-toggle hidden aria-label="${esc(t.theme)}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg></button></div>
</div></header>`;
}
function footer(lang) {
  const t = copy[lang];
  return `<section class="contact-section" id="contact"><div class="wrap contact-inner"><div><h2>${t.contactTitle}</h2><p>${t.contactText}</p></div><div class="contact-links"><a href="mailto:vitaly@pikov.expert">vitaly@pikov.expert ${arrow}</a><a href="https://t.me/UnderLineSecurity" rel="noopener">Telegram · @UnderLineSecurity ${arrow}</a></div></div></section>
<footer class="site-footer wrap"><span>© 2026 ${esc(t.name)} · ${t.independent}</span><a href="${current(lang)}">${t.classic} ${arrow}</a></footer>`;
}
function card(item, lang, featured = false) {
  const t = copy[lang];
  const short = shortDescription(item, lang);
  const full = label(item, 'description', lang);
  const search = [item.title,item.titleEn,item.description,item.descriptionEn,item.url,item.format,item.formatEn].join(' ');
  return `<article class="material-card topic-${esc(item.category)}${featured ? ' featured-card' : ''}"${featured ? '' : ` data-material data-category="${esc(item.category)}" data-kind="${item.kind}" data-search="${esc(search)}"`}>
<div class="material-meta"><span>${esc(t.kinds[item.kind])}</span><span>${esc(t.russian)}</span></div>
<h3><a href="${esc(item.url)}">${esc(materialTitle(item, lang))}</a></h3><p>${esc(short)}</p>
${!featured && full !== short ? `<details><summary>${t.description}</summary><p>${esc(full)}</p></details>` : ''}
<a class="material-action" href="${esc(item.url)}">${esc(t.opens[item.kind])} ${arrow}</a></article>`;
}
function homepage(lang) {
  const t = copy[lang];
  const selectedUrls = ['https://main-rbpo.pikov.expert/','https://appsec-lections.pikov.expert/practice.html','https://astra-hardening.pikov.expert/'];
  const selected = selectedUrls.map(url => lectures.find(item => item.url === url));
  if (selected.some(item => !item)) throw new Error('Featured material missing from root catalogue');
  return `<main>
<section class="hero wrap"><div class="hero-copy"><p class="hero-person">${esc(t.name)} <span>· ${esc(t.role)}</span></p><h1>${t.title.split('\n').map(esc).join('<br>')}</h1><p class="hero-lead">${t.lead}</p><div class="hero-actions"><a class="button-primary" href="#materials">${t.browse} <span aria-hidden="true">→</span></a><a class="button-text" href="#contact">${t.discuss} ${arrow}</a></div><ul class="hero-facts">${t.facts.map(f => `<li>${f}</li>`).join('')}</ul></div>
<figure class="portrait"><img src="/photo.jpg" width="640" height="640" fetchpriority="high" alt="${esc(t.portrait)}"><figcaption>${t.name}<span>Secure development · AppSec · DevSecOps</span></figcaption></figure></section>
<section class="subjects-section wrap" aria-labelledby="subjects-title"><div class="section-heading"><div><h2 id="subjects-title">${t.topics}</h2><p>${t.topicsIntro}</p></div><a class="text-link" href="#materials">${t.materials} <span aria-hidden="true">↓</span></a></div>
<div class="subjects">${categories.map(category => `<a class="subject topic-${category.id}" data-topic-link="${category.id}" href="#topic-${category.id}"><img src="${asset(`illustrations/${category.id}.webp`)}" width="960" height="640" alt="" loading="lazy"><span class="subject-copy"><strong>${esc(label(category,'label',lang))}</strong><span>${countText(lectures.filter(l => l.category === category.id).length,lang)} <span aria-hidden="true">↗</span></span></span></a>`).join('')}</div></section>
<section class="featured-section wrap" aria-labelledby="featured-title"><div class="section-heading"><div><h2 id="featured-title">${t.selected}</h2><p>${t.selectedIntro}</p></div></div><div class="material-grid">${selected.map(item => card(item,lang,true)).join('')}</div></section>
<section class="library-section" id="materials"><div class="wrap"><div class="section-heading"><div><h2>${t.catalogue}</h2><p>${t.catalogueIntro}</p></div><span class="library-total">${countText(lectures.length,lang)}</span></div><p class="language-note">${t.languageNote}</p>
<form class="filter-bar" role="search" data-filters hidden><label class="search-field">${t.query}<span class="search-control"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input name="q" type="search" placeholder="${esc(t.placeholder)}" autocomplete="off"></span></label><label>${t.topic}<select name="topic"><option value="">${t.allTopics}</option>${categories.map(c => `<option value="${c.id}">${esc(label(c,'label',lang))}</option>`).join('')}</select></label><label>${t.format}<select name="kind"><option value="">${t.allFormats}</option>${Object.entries(t.kinds).map(([id,name]) => `<option value="${id}">${esc(name)}</option>`).join('')}</select></label></form>
<div class="filter-status" data-filter-status hidden><p role="status" aria-live="polite" data-results data-template="${esc(t.results)}"></p><button class="clear-filters" type="button" data-clear hidden>${t.reset} <span aria-hidden="true">×</span></button></div><div class="empty-state" data-empty hidden><h3>${t.empty}</h3><p>${t.emptyHelp}</p><button class="button-primary" type="button" data-clear>${t.reset}</button></div>
${categories.map(c => `<section class="catalogue-group topic-${c.id}" id="topic-${c.id}" data-group="${c.id}" aria-labelledby="heading-${c.id}"><div class="group-heading"><img src="${asset(`illustrations/${c.id}.webp`)}" width="960" height="640" alt="" loading="lazy"><div><h2 id="heading-${c.id}">${esc(label(c,'label',lang))}</h2><p>${esc(label(c,'description',lang))}</p></div><span data-group-count>${countText(lectures.filter(l => l.category === c.id).length,lang)}</span></div><div class="material-grid">${lectures.filter(l => l.category === c.id).map(l => card(l,lang)).join('')}</div></section>`).join('')}
</div></section>
<section class="paths-section wrap" id="paths"><div class="section-heading"><div><h2>${t.pathTitle}</h2><p>${t.pathIntro}</p></div></div><div class="paths-grid">${t.routes.map(route => `<article class="learning-path"><p class="path-audience">${route[0]}</p><h3>${route[1]}</h3><p>${route[2]}</p><a class="text-link" href="${route[4]}">${route[3]} ${arrow}</a></article>`).join('')}</div><div class="map-link"><a href="/course-map.html">${t.routeMore} ${arrow}</a><span>${t.routeNotice}</span></div></section>
<section class="about-summary wrap"><div><span class="section-label">${t.about}</span><h2>${t.shortAbout}</h2></div><div><p>${t.shortAboutText}</p><ul class="expertise-list">${t.expertise.map(e=>`<li>${e}</li>`).join('')}</ul><a class="text-link" href="${about(lang)}">${t.background} ${arrow}</a></div></section>
</main>`;
}
function biography(lang) {
  const source = original.match(/<section class="about" id="about">([\s\S]*?)<\/section>/)?.[1];
  if (!source) throw new Error('Original professional profile section is missing');
  const aria = lang === 'en' ? {profileAreasLabel:'Core professional areas',standardsLabel:'Standards and methodologies',independentLabel:'Educational project status'} : {profileAreasLabel:'Основные профессиональные направления',standardsLabel:'Стандарты и методологии',independentLabel:'Статус образовательного проекта'};
  let html = source.replace(/<span data-l="(ru|en)">([\s\S]*?)<\/span>/g, (_,locale,text) => locale === lang ? text : '');
  html = html.replace(/data-i18n-aria="([^"]+)" aria-label="[^"]*"/g, (_,key) => `aria-label="${esc(aria[key])}"`);
  html = html.replace(/<div class="about-head">[\s\S]*?<\/div>/, block => `<div class="profile-introduction">${block.match(/<p>[\s\S]*?<\/p>/)?.[0] || ''}</div>`);
  if (/data-l=/.test(html)) throw new Error('Unresolved bilingual profile fragment');
  const t = copy[lang];
  return `<main><section class="about-hero wrap"><div><a class="text-link" href="${home(lang)}">← ${t.back}</a><h1>${t.aboutTitle}</h1><p>${t.shortAbout}</p></div><img src="/photo.jpg" alt="${esc(t.portrait)}" width="640" height="640"></section><section class="full-profile" id="about">${html}</section></main>`;
}
function page(lang,isAbout) {
  const t = copy[lang];
  const route = isAbout ? about(lang) : home(lang);
  const url = `https://pikov.expert${route}`;
  const title = isAbout ? `${t.aboutTitle} — pikov.expert` : `${t.name} — ${lang === 'en' ? 'secure development & teaching' : 'безопасная разработка и преподавание'}`;
  const description = isAbout ? t.aboutMeta : t.meta;
  const schema = { '@context':'https://schema.org','@type':isAbout?'ProfilePage':'CollectionPage',url,name:title,description,inLanguage:lang,mainEntity:isAbout?{'@type':'Person',name:t.name,url:`https://pikov.expert${about(lang)}`,image:'https://pikov.expert/photo.jpg',jobTitle:lang==='en'?'Secure software development expert and lecturer':'Эксперт по безопасной разработке ПО и преподаватель'}:{'@type':'ItemList',numberOfItems:lectures.length,itemListElement:lectures.map((item,i)=>({'@type':'ListItem',position:i+1,item:{'@type':item.kind==='reference'?'CreativeWork':item.kind==='course'?'Course':'LearningResource',name:materialTitle(item,lang),url:item.url,inLanguage:'ru'}}))}};
  return `<!doctype html>
<!-- Generated by _PROJECT/build-new-site.mjs. Edit the generator or shared source catalogue. -->
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="noindex,follow"><link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="https://pikov.expert${isAbout?about('en'):home('en')}"><link rel="alternate" hreflang="ru" href="https://pikov.expert${isAbout?about('ru'):home('ru')}"><link rel="alternate" hreflang="x-default" href="https://pikov.expert${isAbout?about('en'):home('en')}">
<meta property="og:type" content="${isAbout?'profile':'website'}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="https://pikov.expert/photo.jpg"><meta property="og:locale" content="${lang==='en'?'en_US':'ru_RU'}"><meta name="theme-color" content="#f6f5ef"><meta name="color-scheme" content="light dark">
<script>try{var theme=localStorage.getItem('theme');if(theme==='dark'||theme==='light')document.documentElement.dataset.theme=theme}catch(e){}</script><link rel="stylesheet" href="${asset('styles.css')}"><script src="${asset('site.js')}" defer></script>
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>
<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(109116119,'init',{ssr:true,webvisor:false,clickmap:false,accurateTrackBounce:true,trackLinks:true});</script>
</head><body data-theme-light="${esc(t.light)}" data-theme-dark="${esc(t.dark)}">${header(lang,isAbout)}${isAbout?biography(lang):homepage(lang)}${footer(lang)}</body></html>\n`;
}

for (const lang of ['en','ru']) {
  for (const isAbout of [false,true]) {
    const directory = (isAbout?about(lang):home(lang)).slice(1);
    const output = path.join(root,directory,'index.html');
    const html = page(lang,isAbout);
    if (mode === '--check') {
      if (!fs.existsSync(output) || fs.readFileSync(output,'utf8') !== html) throw new Error(`New site output is stale: ${directory}index.html. Run --write.`);
    } else {
      fs.mkdirSync(path.dirname(output),{recursive:true});
      fs.writeFileSync(output,html);
    }
  }
}
console.log(`NEW SITE ${mode === '--check'?'CHECK':'BUILD'} OK: 4 pages, ${lectures.length} materials, ${categories.length} subjects, English default`);
