# תוכנית – Milestone 4: PWA ו-Offline

**מקורות:** `PRD.md` (FR-08, אילוצים: Offline לממשק בלבד, אין כפתור התקנה), `DESIGN.md` (טבלת הטקסטים – שם האפליקציה; 2.5 אייקון האפליקציה), `ARCHITECTURE.md` (2.2 PWA / Offline, 2.4 נתונים, 2.6 Headers, 2.7 עדכוני PWA), התיעוד של Next.js המותקן: `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`, `.../01-metadata/manifest.md`.

**נקודת מוצא (הקוד הקיים אחרי Milestone 3):**
- `app/layout.tsx` כבר מגדיר `lang="he"`, `dir="rtl"`, `themeColor: #FF2D2D` וגופנים דרך `next/font/google` (מתארחים מקומית תחת `/_next/static/media/`).
- `lib/jokeClient.ts` כבר מחזיר `offline` כש-`navigator.onLine === false` או כש-`fetch` נכשל ברמת הרשת, ו-`lib/strings.ts` כבר מכיל את ההודעה. **אין צורך בטקסטים חדשים בממשק.**
- כל תשובות `app/api/joke/route.ts` כבר נושאות `Cache-Control: no-store` (JSON) או `no-store, no-transform` (SSE).
- אין Manifest, אין אייקונים (חוץ מ-`app/favicon.ico` של התבנית) ואין Service Worker.
- אין שינוי ב-PRD/DESIGN/ARCHITECTURE ואין משתני סביבה חדשים. תלות חדשה אחת לפיתוח בלבד: `sharp` (ראו סעיף 2).

## 1. מבנה קבצים

```text
assets/
  app-icon.svg            ← חדש: מקור האייקון (ריבוע אדום מעוגל + סמיילי לבן)
  app-icon-maskable.svg   ← חדש: אותו עיצוב, רקע מלא בלי פינות, פרצוף קטן וממורכז (Safe Zone)
scripts/
  generate-icons.mjs      ← חדש: SVG → PNG בכל הגדלים (הרצה ידנית, התוצרים נשמרים ב-Git)
public/
  icons/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png  ← נוצרים מהסקריפט
  sw.js                   ← חדש: Service Worker ייעודי (JavaScript רגיל, ללא Build)
app/
  manifest.ts             ← חדש: Web App Manifest
  layout.tsx              ← שינוי: apple-touch-icon במטא-דאטה + רכיב רישום ה-SW
components/
  ServiceWorkerRegister.tsx ← חדש: רישום ב-Production בלבד, ביטול רישום ב-dev
lib/
  manifest.test.ts        ← חדש: בדיקת שדות ה-Manifest
next.config.ts            ← שינוי: מזהה גרסה לבנייה + Headers ל-`/sw.js` וכלליים
package.json              ← שינוי: `sharp` ב-devDependencies + סקריפט `icons`
```

## 2. אייקון האפליקציה

- `assets/app-icon.svg` (viewBox 512×512): ריבוע `#FF2D2D` עם פינות מעוגלות (rx≈112), במרכזו עיגול לבן בקוטר ~300, שתי עיניים וחיוך פתוח באדום — צורות SVG בלבד, בלי אמוג'י ובלי טקסט (לפי `DESIGN.md` 2.5).
- `assets/app-icon-maskable.svg`: רקע `#FF2D2D` מלא עד הקצוות (בלי פינות), הפרצוף בקוטר ~220 בתוך ה-Safe Zone המרכזי (80%), כדי שלא ייחתך כשהמערכת מעגלת את האייקון.
- `scripts/generate-icons.mjs` משתמש ב-`sharp` ויוצר:
  | קובץ | מקור | גודל |
  |---|---|---|
  | `public/icons/icon-192.png` | app-icon.svg | 192×192 |
  | `public/icons/icon-512.png` | app-icon.svg | 512×512 |
  | `public/icons/icon-maskable-512.png` | app-icon-maskable.svg | 512×512 |
  | `public/icons/apple-touch-icon.png` | app-icon-maskable.svg (iOS מעגל בעצמו; רקע מלא מונע שוליים שקופים) | 180×180 |
- `sharp` כבר מותקן בעקיפין דרך Next.js; מוסיפים אותו במפורש ל-`devDependencies` (באותה גרסה, `0.35.5`) כדי שהסקריפט לא יהיה תלוי בתלות עקיפה. סקריפט `"icons": "node scripts/generate-icons.mjs"`. קובצי ה-PNG נשמרים ב-Git, כך שה-Build ב-Vercel לא מריץ את הסקריפט.
- `app/favicon.ico` הקיים נשאר ללא שינוי (מחוץ להיקף).

## 3. Web App Manifest – `app/manifest.ts`

לפי ה-File Convention של Next.js (מוגש כ-`/manifest.webmanifest`, ו-Next מוסיף את ה-`<link rel="manifest">` אוטומטית):

```ts
{
  name: STRINGS.appName,           // "מחולל בדיחות"
  short_name: STRINGS.appName,
  description: STRINGS.subtitle,
  lang: "he",
  dir: "rtl",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#FFFDF9",
  theme_color: "#FF2D2D",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}
```

- `app/layout.tsx`: הוספת `icons: { apple: "/icons/apple-touch-icon.png" }` ל-`metadata`, וכן `appleWebApp: { capable: true, title: STRINGS.appName, statusBarStyle: "default" }` כדי שבהתקנה ב-iOS יוצג השם הנכון.
- **אין** כפתור התקנה ואין טיפול ב-`beforeinstallprompt`.

## 4. Service Worker – `public/sw.js`

קובץ JavaScript רגיל ב-`public/` (לא עובר Build), שמוגש ב-`/sw.js` עם Scope `/`.

**גרסה ושם Cache:**
- ב-`next.config.ts` מוגדר `env.NEXT_PUBLIC_APP_VERSION` = `VERCEL_GIT_COMMIT_SHA` אם קיים, אחרת חותמת זמן של רגע ה-Build. כל Build מקבל מזהה חדש.
- הרישום נעשה עם `/sw.js?v=<גרסה>`. שינוי הכתובת גורם לדפדפן להתקין SW חדש בכל גרסה. בתוך ה-SW: `const VERSION = new URL(self.location).searchParams.get("v")`, ושם ה-Cache הוא `jokes-shell-<VERSION>`.
- כך HTML ו-JS מ-Builds שונים לא נשמרים יחד (דרישת `ARCHITECTURE.md` 2.7).

**`install`:** פותח את ה-Cache של הגרסה ושומר מראש את: `/`, `/manifest.webmanifest`, ארבעת האייקונים ושני האיורים. לאחר מכן `skipWaiting()`.

**`activate`:** מוחק כל Cache שמתחיל ב-`jokes-shell-` ואינו של הגרסה הנוכחית, ואז `clients.claim()`.

**השלמת App Shell אחרי ביקור ראשון:** קובצי ה-JS/CSS והגופנים של העמוד נטענים *לפני* שה-SW שולט בעמוד, ושמותיהם כוללים Hash שלא ידוע מראש. לכן, אחרי שה-SW מוכן, רכיב הרישום שולח לו הודעה עם רשימת הקבצים שהעמוד כבר טען (`performance.getEntriesByType("resource")` — רק מאותו Origin ורק תחת `/_next/static/` או `/_next/image`), וה-SW שומר אותם ב-Cache. כך הגופנים, ה-CSS וה-JS זמינים ב-Offline כבר אחרי הביקור המחובר הראשון.

**`fetch` – ניתוב:**
| בקשה | אסטרטגיה |
|---|---|
| כל בקשה שאינה `GET`, או מ-Origin אחר | לא מטופלת (עוברת לרשת כרגיל) — **כולל `POST /api/joke`** |
| כל נתיב תחת `/api/` | לא מטופל (Network Only) |
| ניווט לעמוד (`request.mode === "navigate"`) | **Network First**: מהרשת ושמירת עותק מעודכן של `/` ב-Cache; אם אין רשת — `/` מה-Cache |
| `/_next/static/*`, `/_next/image*`, `/icons/*`, `/illustrations/*`, `/manifest.webmanifest` | **Cache First**: מה-Cache, ואם חסר — מהרשת ושמירה ב-Cache (רק תשובות `200` תקינות) |
| כל השאר (למשל בקשות RSC עם `?_rsc=`) | לא מטופל |

- ה-SW לעולם לא שומר תשובת API ולעולם לא מחזיר בדיחה מה-Cache.
- אם הדפדפן מחק את ה-Cache — Network First ו-Cache First פשוט חוזרים לרשת (אין קריסה); ה-Cache מתמלא מחדש בביקור הבא.
- אין Background Sync, Push או Cache לתוכן AI.

## 5. רישום – `components/ServiceWorkerRegister.tsx`

- רכיב Client קטן (`"use client"`, מחזיר `null`) שנכלל ב-`app/layout.tsx`.
- ב-`useEffect`:
  - אם `!("serviceWorker" in navigator)` — לא עושה דבר.
  - **ב-Production** (`process.env.NODE_ENV === "production"`): `navigator.serviceWorker.register("/sw.js?v=" + NEXT_PUBLIC_APP_VERSION, { scope: "/", updateViaCache: "none" })`, ואז `navigator.serviceWorker.ready` ← שליחת רשימת הקבצים שנטענו (סעיף 4). כשל ברישום נבלע בשקט (האתר ממשיך לעבוד בלי Offline).
  - **ב-dev:** מבטל רישום של כל SW קיים (`getRegistrations()` ← `unregister()`), כדי ש-SW שנשאר מבדיקת Production מקומית על אותו `localhost:3000` לא יגיש גרסאות ישנות בזמן פיתוח.

## 6. Headers – `next.config.ts`

שמירה על `cacheComponents` ו-`partialPrefetching` הקיימים, והוספה של:
- `env: { NEXT_PUBLIC_APP_VERSION }` (סעיף 4).
- `headers()`:
  - `/sw.js`: `Content-Type: application/javascript; charset=utf-8`, `Cache-Control: no-cache, no-store, must-revalidate` (כך שגרסה חדשה של ה-SW תמיד נבדקת מול השרת).
  - כל הנתיבים: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (לפי `ARCHITECTURE.md` 2.6). לא מוסיפים CSP בשלב זה כדי לא לסכן את ה-Streaming ואת סקריפטי Next.
  - `/api/:path*`: `Cache-Control: no-store` כגיבוי לכותרות שה-Route Handler כבר מחזיר.

## 7. בדיקות

**Vitest (`lib/manifest.test.ts`):** קריאה ל-`manifest()` ובדיקה של `name`/`short_name` = "מחולל בדיחות", `lang: "he"`, `dir: "rtl"`, `display: "standalone"`, `start_url: "/"`, הצבעים, ושיש אייקון 192, אייקון 512 ואייקון `maskable`. הבדיקות הקיימות ממשיכות לעבור.

**בדיקה עצמית בבנייה (בדפדפן המובנה):**
1. `npm run lint`, `npm test`, `npm run build`.
2. `npm run build` + `npm run start` (Production מקומי):
   - `/manifest.webmanifest` מוגש עם השדות הנכונים, וכל האייקונים נטענים (200, PNG בגודל הנכון).
   - `navigator.serviceWorker.controller` פעיל אחרי טעינה; `caches.keys()` מכיל רק `jokes-shell-<גרסה>`, וה-Cache כולל את `/`, קובצי `/_next/static/` (JS, CSS, גופני `woff2`), אייקונים ואיורים — ואין בו שום `/api/`.
   - תשובת `POST /api/joke` נושאת `Cache-Control: no-store`; `/sw.js` נושא `no-cache, no-store`.
   - **סימולציית Offline:** עצירת שרת ה-Production (כך שהרשת ל-localhost נכשלת) ← רענון העמוד ← העמוד נטען מה-Cache עם הגופנים והעיצוב (בדיקת `document.fonts` וצילום מסך) ← לחיצה על "צור בדיחה" מציגה את הודעת "אין חיבור לאינטרנט" בעברית.
   - צילום מסך של העמוד ב-Offline.
3. `npm run dev`: `navigator.serviceWorker.getRegistrations()` מחזיר רשימה ריקה (גם אחרי שה-SW היה רשום מבדיקת Production).
4. סגירת כל ההרצות בסיום.

**מה יבדוק המשתמש (אחרי "הרץ כדי שאבדוק", שתרוץ כ-Production מקומי):** הופעת אפשרות "התקן" בתפריט/בשורת הכתובת של Chrome או Edge, השם והאייקון בחלון ההתקנה ובאפליקציה המותקנת, ופתיחה מחדש אחרי ניתוק Wi-Fi. בדיקה ב-iPhone/Android אמיתי אפשרית רק באתר החי ב-HTTPS (Milestone 5), כי טלפון לא יכול להתקין PWA מ-`localhost` של המחשב.

## 8. ADR לתיעוד (ב-`ARCHITECTURE.md`, בסוף הבנייה)

- **ADR-3: Service Worker סטטי עם גרסה בכתובת הרישום והשלמת Cache לפי הקבצים שנטענו** — הקשר: שמות קובצי ה-Build כוללים Hash ואין כלי Build ל-SW; החלטה: `public/sw.js` + `?v=<build>` + רשימת משאבים מ-`performance`; השלכות: אין תלות בספרייה (Serwist וכד'), כל Build מנקה Cache ישן, ה-Offline מלא כבר אחרי ביקור אחד.

## 9. Definition of Done ← איך כל סעיף מתקיים

| סעיף | מימוש |
|---|---|
| ניתן להתקנה, שם ואייקון נכונים, אין כפתור התקנה | סעיפים 2, 3; אין קוד `beforeinstallprompt` |
| נפתח Offline עם גופנים ועיצוב; "צור בדיחה" ללא רשת → הודעה בעברית, לא מה-Cache | סעיפים 4, 5; הודעת `offline` הקיימת ב-`jokeClient` |
| `POST /api/joke` מוחרג מ-Cache; כותרות API מונעות שמירה | סעיף 4 (רק `GET`, דילוג על `/api/`), סעיף 6 |
| ב-`next dev` ה-SW אינו פעיל | סעיף 5 (רישום ב-Production בלבד + ביטול רישום ב-dev) |
| ESLint, build ו-Vitest עוברים | סעיף 7 |
