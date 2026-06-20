# Развёртывание vkr.pikov.expert

## Структура файлов

```
/                              ← корень сайта на хостинге
├── index.html                 ← слайдер
├── og-cover.jpg               ← превью для соцсетей (1200×630)
├── VKR_Methodology_Pikov.pptx ← скачиваемый файл, на него ссылается кнопка
├── VKR_Methodology_Pikov.pdf  ← опционально, для печати
├── slides/                    ← 61 JPG-слайд (FHD)
│   ├── slide-01.jpg
│   └── ... slide-61.jpg
└── thumbs/                    ← 61 миниатюра для режима «обзор»
    ├── thumb-01.jpg
    └── ... thumb-61.jpg
```

**Проверьте, что `VKR_Methodology_Pikov.pptx` действительно лежит в корне** — иначе кнопка «Скачать PPTX» отдаст 404 (на это рецензент уже жаловался).

После загрузки откройте `https://vkr.pikov.expert/VKR_Methodology_Pikov.pptx` в браузере: должна начаться загрузка файла.

---

## Конфигурация безопасности

Большинство замечаний рецензента про безопасность (HSTS, X-Content-Type-Options, Referrer-Policy, CSP) решается одним блоком конфигурации на стороне веб-сервера. Выберите, что соответствует вашему хостингу:

### Если хостинг на Apache (`.htaccess`)

Создайте файл `.htaccess` в корне сайта со следующим содержимым:

```apache
# === Заголовки безопасности ===
<IfModule mod_headers.c>
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"

    # Мягкая CSP: разрешаем только Google Fonts (для шрифтов слайдера)
    Header always set Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'self'"
</IfModule>

# === Кэширование ===
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpeg "access plus 30 days"
    ExpiresByType image/png  "access plus 30 days"
    ExpiresByType image/webp "access plus 30 days"
    ExpiresByType text/css   "access plus 7 days"
    ExpiresByType application/javascript "access plus 7 days"
    ExpiresByType text/html  "access plus 1 hour"
</IfModule>

# === Сжатие ===
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml
</IfModule>

# === Корректные MIME-типы для скачивания ===
AddType application/vnd.openxmlformats-officedocument.presentationml.presentation .pptx
AddType application/pdf .pdf
```

### Если хостинг на Nginx

Добавьте в `server { ... }` блок вашего сайта (обычно `/etc/nginx/sites-available/vkr.pikov.expert`):

```nginx
# === Заголовки безопасности ===
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'self'" always;

# === Кэширование ===
location ~* \.(jpg|jpeg|png|webp|svg)$ {
    expires 30d;
    add_header Cache-Control "public, no-transform";
}

location ~* \.(css|js)$ {
    expires 7d;
    add_header Cache-Control "public, no-transform";
}

# === Сжатие ===
gzip on;
gzip_vary on;
gzip_types text/html text/css application/javascript image/svg+xml application/json;

# === MIME для PPTX ===
types {
    application/vnd.openxmlformats-officedocument.presentationml.presentation pptx;
}
```

После правки перезапустите nginx: `sudo nginx -t && sudo systemctl reload nginx`

### Если хостинг на Cloudflare Pages / Netlify / Vercel

Эти заголовки настраиваются через файл `_headers` в корне:

```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'self'
```

---

## Проверка

После применения конфига откройте сайт и проверьте через DevTools (F12) → Network → выберите `index.html` → Headers. В разделе Response Headers должны появиться:

- `strict-transport-security: max-age=31536000; includeSubDomains`
- `x-content-type-options: nosniff`
- `referrer-policy: strict-origin-when-cross-origin`
- `content-security-policy: ...`

Также можно прогнать сайт через [securityheaders.com](https://securityheaders.com/?q=vkr.pikov.expert) — должна быть оценка не ниже **B**.

---

## Проверка социального превью

После деплоя проверьте превью при шеринге:

- Telegram: вставьте ссылку `https://vkr.pikov.expert/` в поле сообщения — должна появиться карточка с обложкой, заголовком и описанием
- VK: используйте [vk.com/dev/pages.clearCache](https://vk.com/dev/pages.clearCache) для сброса кэша превью
- Facebook: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- Twitter/X: [Twitter Card Validator](https://cards-dev.twitter.com/validator)
