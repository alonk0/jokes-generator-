# ARCHITECTURE – מחולל בדיחות מבוסס AI

**בסיס:** `PRD.md` – מחולל בדיחות מבוסס AI  
**עדכון מחקר:** 21 באוקטובר 2026  
**סטטוס:** ארכיטקטורת יעד ליישום; ללא שינוי בדרישות המוצר.

## 1. Technology Stack שנבחר

| רכיב | טכנולוגיה / שירות | תפקיד |
|---|---|---|
| Frontend ויישום Full-stack | **Next.js (App Router) + React + TypeScript** | אתר רספונסיבי, ממשק RTL, ניהול מצבי יצירה ו-API באותו פרויקט |
| עיצוב | **CSS Modules / CSS רגיל** | עיצוב מודרני ואלגנטי, רספונסיביות, ללא ספריית UI כבדה |
| Backend | **Next.js Route Handler ב-Node.js Runtime** המופעל כ-**Vercel Function** | אימות קלט, פנייה מאובטחת ל-AI והזרמת פלט לדפדפן |
| AI | **OpenAI API – Responses API, מודל `gpt-5`** | יצירת בדיחה אחת בעברית, בנושא שסופק או בנושא כללי |
| חיבור ל-AI | **OpenAI JavaScript SDK הרשמי** | בקשות Streaming, טיפול באירועים ובביטול בקשות |
| Streaming | **HTTP streaming באמצעות `ReadableStream` ו-`fetch`**; העברת מקטעי UTF-8 כטקסט | עדכון הדרגתי של הבדיחה, תמיכה בעצירה ובהבחנה בין השלמה לתקלה |
| PWA ו-Offline | **Web App Manifest + Service Worker ייעודי + Cache Storage API** | התקנה דרך הדפדפן ושמירת קובצי ממשק הנדרשים לפתיחה ללא רשת |
| Rate Limiting | **Vercel WAF Rate Limiting** | חסימת יותר מ-5 בקשות יצירה בדקה לכל IP, ללא Database |
| Hosting, SSL, CI/CD | **Vercel** | אירוח Frontend ו-Backend, HTTPS ו-Production Deployment אוטומטי מ-`main` |
| ניהול קוד | **Git + GitHub** | Repository יחיד, ענף `main` בלבד ופריסה אוטומטית |
| גרסאות בסיס | **Node.js בגרסת LTS הפעילה; Next.js בגרסה היציבה העדכנית** בזמן Milestone 1 | הגרסאות המדויקות נקבעות ב-Milestone 1 ומתועדות ב-`package.json` |
| איכות ובדיקות | **ESLint + `next build` + Vitest** | בדיקת קוד, בנייה, ובדיקות אוטומטיות קטנות ללוגיקה העדינה (ראו 2.8) |
| מסד נתונים / Authentication / Storage חיצוני | **לא נדרשים** | לא שומרים משתמשים, בדיחות, קבצים או היסטוריה |

### 1.1 נימוקים והכרעות

- **Next.js מול React + Vite עם API נפרד ומול SvelteKit:** Next.js מאפשר Frontend ו-Backend ב-Repository ובפריסה אחת; יש לו תיעוד רשמי ל-Route Handlers ול-PWA, והוא משתלב ישירות ב-Vercel. אתר React + Vite היה פשוט בצד הלקוח אך מחייב בחירה ותפעול נפרדים של API; ל-SvelteKit יש יכולות דומות אך יתרון קטן כאן בהשוואה לאקוסיסטם React/Next.js. אין צורך בשרת Express עצמאי.
- **Node.js Route Handler מול שרת עצמאי או Edge Runtime:** Node.js Runtime תואם את ה-SDK הרשמי ומאפשר HTTP streaming עם פחות מגבלות ספרייה ופריסה. פונקציה Serverless מתאימה לעומס משתנה ומונעת ניהול שרת 24/7.
- **OpenAI SDK הישיר מול Vercel AI SDK ומול בקשות HTTP ידניות:** SDK רשמי מצמצם שכבות ותלויות כאשר הספק והמודל קבועים ב-PRD. אפשר להשתמש באירועי ה-Responses API ולתרגם אותם לזרם טקסט פשוט ללקוח. אין צורך בשכבת ניתוב בין מודלים או בשירות AI Gateway.
- **Vercel WAF מול Redis/Upstash ובקרת זיכרון בשרת:** כלל WAF יחיד לפי IP ובנתיב ה-API נאכף לפני ההפעלה ומותאם להגבלה הקבועה שהוגדרה; אינו תלוי בזיכרון לא משותף בין Functions ואינו דורש אחסון נוסף. האכיפה היא לפי חלון זמן קבוע ולא לפי תור בקשות.
- **Service Worker קטן מול חבילת PWA גדולה:** מסך יחיד ללא נתונים עסקיים מצדיק Cache של מעט נכסי אפליקציה. Service Worker ייעודי מונע תלות בכלי Build נוסף; אין צורך ב-Background Sync, Push או Cache ל-AI.
- **Vercel מול Netlify ו-Render:** ל-Vercel התאמה ישירה ל-Next.js, ל-Streaming, ל-WAF ול-GitHub. Netlify אפשרית, ו-Render מתאים לשירות Node.js מתמשך, אך אינו נחוץ כאן.

### 1.2 מגבלות, עלויות וסיכונים

1. **AI הוא מקור העלות המרכזי המשתנה:** חיוב לפי Token; גם בקשה שנעצרה עשויה לצרוך Tokens. יש להגדיר התראות תקציב/שימוש בחשבון OpenAI ולוודא שהחשבון מאפשר גישה למודל `gpt-5`. לא להחליף את המודל על דעת המפתח.
2. **Vercel Hobby מוגבלת לשימוש אישי לא-מסחרי** לפי תנאיה; הפעלה מסחרית תחייב תוכנית מתאימה. חלות מכסות Functions, תעבורה, WAF ושעות הרצה. מחיר ותקרות עשויים להשתנות; יש לבדוק בלוח הבקרה לפני השקה.
3. **WAF Rate Limiting זמין גם ב-Hobby**, אך כולל מכסות וחיוב אפשרי בהתאם לתוכנית, למיקום ולשימוש; בחלון Fixed Window משתמש יחיד יכול לשלוח בקשות סמוך לגבול בין חלונות. כתובת IP יכולה להיות משותפת למשתמשים אחדים, או להשתנות במהלך שימוש.
4. **WAF אינו מחליף בקרת הוצאות כוללת:** תוקף המשתמש במספר כתובות IP יכול להגדיל עלויות. יש להפעיל התראות/הגבלות הוצאה הזמינות בספקים ולבחון נתוני שימוש; אין להציג את 5 הבקשות לדקה כהגנה מוחלטת על התקציב.
5. **Streaming תלוי ברשת ובזמן הריצה של Vercel Function:** יש להגדיר זמן מרבי סביר לבקשה, להפיץ ביטול upstream, ולזכור שניתוק לקוח אינו מבטיח הפסקת חיוב מיידית אצל OpenAI.
6. **PWA שונה בין דפדפנים ומערכות הפעלה:** אפשרויות ההתקנה והיקף תמיכת Offline אינם אחידים. אין להציג כפתור התקנה באתר.
7. **GPT-5 הוא דרישת מוצר מחייבת גם אם קיימים מודלים חדשים יותר**; שימוש ב-`gpt-5` ולא ב-`gpt-5-chat-latest`, ב-Mini או במודל אחר. יש לוודא זמינות מודל ב-API לפני הפריסה.
8. **ייתכן ש-OpenAI דורשת אימות ארגון (Organization Verification) כדי להזרים (Stream) תשובות של `gpt-5`.** יש לוודא זאת בחשבון OpenAI **לפני Milestone 2**, יחד עם קרדיט פעיל ומגבלת הוצאה חודשית. בלי זה יכולת הליבה לא תעבוד.
9. **זמן עד הטקסט הראשון:** GPT-5 מבצע שלב חשיבה פנימי לפני הכתיבה. כדי לקצר את ההמתנה ואת העלות, הבקשה נשלחת עם רמת החשיבה הנמוכה ביותר (`reasoning: { effort: "minimal" }`), והממשק מציג מחוון המתנה עד הופעת הטקסט הראשון.

## 2. ארכיטקטורת המערכת

### 2.1 מבט כללי

```text
דפדפן / PWA (ממשק בעברית ו-RTL)
  ├─ React UI + Local component state
  ├─ Service Worker + Cache Storage (App Shell בלבד)
  └─ POST /api/joke  -- HTTPS, streamed response --> Vercel
                                                     │
                                    Vercel WAF: 5 בקשות/דקה/IP
                                                     │
                                    Next.js Route Handler (Node.js)
                                      ├─ בדיקות קלט ו-Abort
                                      ├─ Prompt מנוהל בשרת
                                      └─ OpenAI SDK / Responses API / gpt-5
                                                     │
                                          OpenAI Streaming Events
                                                     │
                                      זרם טקסט -> דפדפן
```

זהו **יישום אחד**, לא מערכת Microservices. ה-Frontend רשאי לקרוא רק ל-API של המוצר; רק ה-Backend מתקשר עם OpenAI. אין API Key או Prompt שרת שנשלחים במכוון ללקוח.

### 2.2 Modules ואחריות

**Frontend – מסך יחיד:**
- תיבת נושא אופציונלית, עד 100 תווים; הערך החדש אינו משנה בדיחה שכבר מוצגת. כפתור ✕ לניקוי התיבה כשאינה ריקה.
- ספירת התווים נעשית בפונקציה משותפת אחת (`countChars`, לפי Unicode Code Points: `Array.from(text).length`) שמשמשת את המונה, את אכיפת הקלט ואת השרת. אין להסתמך על `maxLength` של HTML, שסופר אחרת. הדבקה ארוכה נחתכת ל-100 תווים באותה פונקציה.
- כפתור ראשי למצב יצירה, שהופך ל-**"עצור"** בזמן Streaming.
- מצב `streaming` שעדיין לא התקבל בו טקסט מציג מחוון המתנה ("יוצר בדיחה..."), שמתחלף בטקסט עם הגעת ה-`delta` הראשון.
- אזור טקסט לבדיחה אחת בלבד, כיווניות RTL, עם `white-space: pre-wrap` לשמירת ירידות שורה. כדי לא להציף קוראי מסך בעדכונים תכופים, ההכרזה הנגישה (`aria-live="polite"`) מתבצעת רק בסיום, בעצירה או בשגיאה, ולא על כל מקטע.
- כפתור **"העתק בדיחה"**: זמין רק בהשלמה מוצלחת; העתקה דרך Clipboard API עם טיפול בכשל הרשאה/תמיכה.
- הצגת הודעות עבריות למצבי Offline, כשל שרת, הפסקת Streaming והגבלת קצב.
- שימוש ב-`AbortController` לביטול הבקשה הפעילה וב-`requestId` מקומי כדי למנוע ממקטעים של בקשה ישנה לשנות תצוגה חדשה.

**Backend – `POST /api/joke`:**
- קריאת גוף JSON קטן, וידוא ש-`topic` הוא מחרוזת אופציונלית, ושהאורך אינו עולה על 100 תווי Unicode לפי כלל ספירה עקבי בלקוח ובשרת; קלט שגוי מוחזר כ-`400`.
- בניית הוראות שרת (`instructions`) ליצירת **בדיחה אחת בעברית בלבד**, בנושא שהתקבל; ערך ריק או רווחים בלבד נחשב לבקשה כללית. סגנון ואורך חופשיים בהתאם לנושא. ההוראות כוללות:
  - פלט כטקסט עברי נקי: בלי הקדמה, בלי Markdown (כוכביות, כותרות, רשימות) ובלי אנגלית.
  - מדיניות התוכן שב-PRD (FR-02א): מתאים לכל המשפחה, בלי לעג לקבוצות ובלי השמצת אנשים אמיתיים; בנושא רגיש — בדיחה עדינה או סירוב קצר ומנומס בעברית.
- הפרדה בין הוראות השרת לבין תוכן הנושא שהגיע מהמשתמש; התייחסות לנושא כנתון לא מהימן, לא כפקודת מערכת.
- קריאה ל-OpenAI Responses API עם `model: "gpt-5"`, `reasoning: { effort: "minimal" }`, `max_output_tokens: 1000` (תקרה טכנית נדיבה; בדיחה רגילה קצרה בהרבה) ו-Streaming; העברה ללקוח של מקטעי טקסט בלבד, לא של מבני אירועים פנימיים או סודות.
- תשובה שהסתיימה בסטטוס `incomplete` (למשל בהגעה לתקרה) מטופלת כשגיאה ולא כהשלמה.
- העברת סימון מפורש של **השלמה מוצלחת** והבחנה בינו לבין סוף חיבור לא צפוי, כדי שלא תתאפשר העתקת בדיחה חלקית.
- כאשר הלקוח מבטל/מתנתק, ניסיון להפסיק את יצירת התשובה אצל OpenAI ולשחרר משאבים; לא להמשיך להזרים ללקוח מנותק.

**PWA / Offline:**
- Web App Manifest, סמלים בגודלי 192 ו-512 פיקסלים, שם יישום בעברית, `lang="he"`, `dir="rtl"`, `display: standalone`, `start_url: /`.
- Service Worker בגרסה ממוספרת, הרשום מהאתר ומשרת את נתיב המסך ונכסי CSS/JS/Icons הנדרשים כ-App Shell. יש לוודא שקוד המסך והנכסים העדכניים נשמרו ב-Cache לאחר ביקור מחובר, ושהיישום יכול להיפתח מחדש ללא רשת לאחר התקנה/טעינה מוצלחת.
- בקשות `POST /api/joke` ושאר תשובות API יהיו **Network Only**; לעולם לא להציג בדיחה חדשה מתוך Cache. לכל תשובת API: `Cache-Control: no-store`.
- ניקוי Cache ישן בהחלפת גרסה; טיפול בכך ש-Cache יכול להימחק על ידי הדפדפן. תמיכה ב-Offline מתייחסת לממשק שנשמר מראש, לא להתקנה או ביקור ראשון ללא אינטרנט.
- **אסטרטגיית Cache:** ניווט לעמוד (HTML) — **Network First**: קודם מהרשת, ורק אם אין רשת מה-Cache. קובצי `/_next/static/*` (שמם כולל Hash), אייקונים וגופנים — **Cache First**.
- **גופנים:** Rubik, Heebo ו-Assistant נטענים דרך `next/font/google`, שמארח אותם כקבצים מקומיים של האתר. כך הם נשמרים ב-Cache יחד עם שאר הקבצים ומוצגים נכון גם ב-Offline.
- **Service Worker פעיל רק בגרסת Production** (`next build` + `next start` או באתר החי). בהרצת פיתוח (`next dev`) הוא אינו נרשם, כדי שלא יוצגו גרסאות ישנות בזמן הפיתוח. בדיקות Offline נעשות על גרסת Production מקומית.
- **אייקונים:** נוצרים מקובץ SVG אחד שבפרויקט (ראו `DESIGN.md`, "אייקון האפליקציה"): `icon-192.png`, `icon-512.png`, גרסת `maskable` ו-`apple-touch-icon` (180×180) ל-iOS. ב-Manifest: `background_color: #FFFDF9`, `theme_color: #FF2D2D`.

### 2.3 Data Model ואחסון

**אין Database, טבלאות, ORM, Authentication, קבצי משתמשים או אחסון היסטוריה.** הנתונים זמניים:

| נתון | מיקום | משך חיים |
|---|---|---|
| `topicDraft` | State בדפדפן | כל עוד המסך פעיל |
| `displayedJoke` | State בדפדפן | עד לבדיחה חדשה / רענון |
| `generationStatus` (`idle`, `streaming`, `completed`, `stopped`, `error`); `streaming` ללא טקסט עדיין = מחוון המתנה | State בדפדפן | כל עוד המסך פעיל |
| `errorMessage`, `requestId`, `AbortController` | State/זיכרון הלקוח | לפי הבקשה הפעילה |
| `topic` והזרם | זיכרון Vercel Function | למשך בקשה אחת בלבד |
| מוני Rate Limiting | שירות Vercel WAF המנוהל | חלון של 60 שניות לפי מדיניות הספק |
| נכסי UI ל-Offline | Cache Storage בדפדפן | עד החלפת Cache או מחיקתו |
| `OPENAI_API_KEY` | משתנה סביבה בשרת בלבד | ניהול סודי ב-Hosting / פיתוח מקומי |

אין שימוש ב-LocalStorage לשמירת בדיחות. Cache Storage מיועד רק לנכסי UI, לא לנתונים אישיים או לתוכן הבדיחות.

### 2.4 חוזה API ופורמט Streaming

**Endpoint:** `POST /api/joke` באותו Origin.  
**Request:** `Content-Type: application/json`.

```json
{ "topic": "חתולים" }
```

גם `{ "topic": "" }` יוצר בדיחה כללית. אין עוד פרמטרים מצד הלקוח לשליטה במודל, ב-Prompt, בשפה או במגבלות.

**Success:** `200 OK`, `Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-store, no-transform`.

זרם SSE חד-כיווני מעל `fetch` של POST (קריאה ופרסור באמצעות `response.body.getReader()`, לא `EventSource` שמוגבל בעיקר ל-GET). אירועים מוסכמים:

```text
event: delta
data: {"text":"חתול"}

event: complete
data: {}
```

- `delta`: טקסט נוסף להצגה, עם קידוד JSON תקין ופרסור SSE הדרגתי על פני Chunks (אין להניח ש-Chunk הוא אירוע שלם).
- `complete`: מתקבל **רק אם** שירות ה-AI סיים בהצלחה (אירוע `response.completed`; לא `response.incomplete` או `response.failed`). רק אחריו `generationStatus=completed` וכפתור העתקה הופך לזמין.
- `error`: אירוע סופי עם קוד שגיאה כללי (ללא מידע פנימי או מפתח), אם כשל קרה **לאחר** שנפתח זרם `200`. הלקוח משאיר טקסט חלקי ומציג הודעה בעברית. סוף חיבור ללא `complete` נחשב גם הוא לשגיאה, אלא אם המשתמש עצר במפורש.
- בעת לחיצה על "עצור", הלקוח מבטל את `fetch`, שומר טקסט חלקי, קובע `stopped` ומנטרל העתקה.

**שגיאות לפני תחילת הזרם:** גוף JSON קטן עם `code` יציב, למשל `INVALID_TOPIC` (`400`), `UPSTREAM_UNAVAILABLE` (`502` או `503`), `INTERNAL_ERROR` (`500`). חריגה מ-WAF תחזיר HTTP `429`, וייתכן שגוף התשובה יגיע בפורמט של Vercel ולא JSON; הלקוח חייב לטפל בסטטוס **לפני** ניסיון לפרסר SSE או JSON ולהציג הודעה בעברית. אין להציג Stack Trace, פרטי ספק או טקסט שגיאה גולמי של OpenAI.

**שיקולי HTTP:** להימנע מ-Buffering בדרך; לא להפעיל Cache, Proxy טרנספורמציות או Compression שמשהים מקטעים; להשתמש ב-HTTPS. API פנימי באותו Origin מייתר CORS פתוח.

### 2.5 Data Flows

**יצירת בדיחה רגילה:**
1. המשתמש מזין נושא או משאיר ריק ולוחץ על כפתור היצירה.
2. הלקוח עובר ל-`streaming`, מנקה את **הבדיחה הקודמת רק עם התחלת יצירה חדשה**, ומציג כפתור "עצור".
3. הבקשה עוברת ב-Vercel WAF: אם בוצעו יותר מ-5 בקשות בדקה מאותו IP, השרת אינו נקרא ומתקבל `429`.
4. Route Handler מאמת את הקלט ושולח בקשה ל-OpenAI עם הוראות שרת קבועות בעברית.
5. השרת מתרגם אירועי Text Delta ל-`delta` של SSE; הלקוח מצרף אותם למסך.
6. לאחר אירוע השלמה של OpenAI, השרת שולח `complete`; הלקוח מציג כפתור העתקה פעיל ואת כפתור היצירה הרגיל.

**עצירה:** לחיצה על "עצור" מפעילה `AbortController`, מעבירה מצב ל-`stopped`, משאירה טקסט חלקי ומנסה לבטל את פעילות ה-Backend/OpenAI. אין אירוע `complete` ואין אפשרות העתקה דרך הכפתור.

**כשל / ניתוק:** הלקוח מציג הודעה בעברית ומשאיר טקסט שכבר התקבל; הסטטוס הופך ל-`error`. לחיצה חדשה מתחילה בקשה חדשה (בכפוף להגבלת קצב). אם אין רשת מלכתחילה, ה-App Shell נשאר גלוי ויצירת בדיחה נכשלת עם הודעה בעברית.

**שינוי נושא:** עריכת הטקסט אינה משנה את הבדיחה המוצגת עד לבקשת יצירה חדשה; בזמן Streaming אפשר לשנות טקסט אך הדבר אינו משנה את הבקשה שכבר נשלחה.

### 2.6 אבטחה ופרטיות

- ה-API Key נשמר כ-`OPENAI_API_KEY` ללא הקידומת `NEXT_PUBLIC_`, ב-Vercel Environment Variables וב-`.env` המקומי שלא נכלל ב-Git. המפתח נגיש ב-Node.js Route Handler בלבד. לא ליצור בקשות OpenAI מהדפדפן.
- להפעיל הגבלת קצב **ב-WAF**: תנאי `POST` לנתיב המדויק `/api/joke`; Counting Key לפי **Client IP**; `Fixed Window=60s`, `Limit=5`, פעולת `429` לאחר חריגה. הכלל מוגדר ברמת פרויקט ה-Vercel ולכן חל על כל הפריסות שלו; אין להניח שהכלל הועתק אוטומטית לפרויקט אחר.
- השרת מאמת מחרוזת עד 100 תווים, מגביל גודל גוף הבקשה לגודל קטן וסביר (לדוגמה 1KB JSON), ואינו מקבל ערך חופשי עבור model או API key. סופרים Unicode Code Points בעקביות ב-Frontend וב-Backend (גם תווי Emoji) באמצעות אותה פונקציית `countChars`; זו בחירה טכנית לאכיפת מגבלת 100 התווים של ה-PRD. השרת בודק את האורך על הטקסט כפי שהתקבל, ורק אחר כך מסיר רווחים מההתחלה ומהסוף לצורך ההוראות למודל.
- שומרים על הפרדה בין הוראות מערכת לבין נושא המשתמש, מונעים Prompt Injection ככל האפשר, ומציגים את פלט המודל כטקסט בלבד – לא כ-HTML או Markdown מורץ.
- לא שומרים נושאים ובדיחות במאגר אפליקטיבי; להימנע מרישום גופי בקשה/תגובה ללוגים. עדיין ייתכנו לוגים ומטא-דאטה אצל Vercel ו-OpenAI לפי מדיניותם, והנושא נשלח לשירות ה-AI לצורך יצירת תוכן; לא להבטיח חוסר שמירה מוחלט אצל ספקים.
- `POST` דורש `Content-Type: application/json`; להשתמש ב-Same-Origin ולדחות Origin זר כאשר הוא נשלח, כדי לצמצם ניצול לרעה מדפי צד שלישי. אין מנגנון Login או Cookies לאימות.
- API OpenAI וקריאות Vercel נעשים ב-HTTPS. להחיל headers סבירים כגון `X-Content-Type-Options: nosniff` ו-Referrer Policy, בלי לפגוע ב-Service Worker או ב-Streaming.
- אין צורך בחשבון משתמש, OAuth, Session, JWT, תפקידי Authorization או מערכת קבצים בענן.

### 2.7 Hosting, Configuration ו-Deployment

**Repository:** GitHub Repository יחיד ליישום Next.js ולמסמכי המפרט (בתיקיית `spec/`), עם `main` כענף Production. **עובדים על `main` בלבד**, ללא ענפי עבודה ו-Pull Requests: כל Milestone נבדק מקומית, ורק אחרי אישור המשתמש נדחף ל-`main` (לפי `CLAUDE.md`).

**Vercel:** חיבור GitHub Repository ישירות לפרויקט Vercel (מ-Milestone 5). כל Push ל-`main` יוצר Production Deployment אוטומטי. **אין שימוש בסביבת Preview**: אין ענפים נוספים, ומפתח OpenAI אינו מוגדר לסביבת Preview, כך שגם פריסת Preview מקרית לא תוכל לצרוך קרדיט. Vercel מריץ Install ו-Build של Next.js ומפרסם נכסי Frontend ו-Route Handler. כללי WAF הם הגדרת תשתית ב-Vercel ולא נובעים אוטומטית מה-Repository; לתעד אותם ולוודא שהם פעילים אחרי שינוי סביבה.

**סביבות:**

| סביבה | יעד | Secret / הגדרות |
|---|---|---|
| Local Development | `localhost` עם Node.js ו-Next.js | `OPENAI_API_KEY` ב-`.env`, מחוץ ל-Git; אין Rate Limiting מקומי (ה-WAF קיים רק בענן) |
| Production | Vercel URL ציבורי עם HTTPS / דומיין מותאם אם קיים | מפתח Production ב-Vercel Environment Variables, לסביבת Production בלבד; WAF Rule פעיל |

למעט API Key, אין צורך בפרטי חיבור ל-Database. עדיף מפתחות OpenAI נפרדים ל-Development ול-Production אם זמינים, כדי להפריד הרשאות ושימוש, אך זו בחירת תפעול ולא דרישת מוצר חדשה. להוסיף `.env.example` עם שמות משתנים בלבד, ללא ערכי Secret, ולהעתיק אותו פעם אחת ל-`.env` (לפי `CLAUDE.md`).

**הגדרות Function:** Node.js Runtime ב-Route Handler, `maxDuration` מוגדר במפורש (למשל 60 שניות) ומשטר timeout פנימי קצר יותר, כדי למנוע ריצות חריגות ועדיין לאפשר Streaming רגיל. יש לוודא שתוכנית Vercel תומכת בהגדרה; Fluid Compute מופעל לפי ברירת המחדל העדכנית. מיקום הריצה ייבחר לפי זמינות השירות/זמן תגובה, ללא דרישת Residency שהוגדרה במוצר.

**עדכוני PWA:** לכל גרסה חדשה יש להחליף מזהה Cache ולפנות נכסי UI ישנים בזהירות, כך ש-HTML ו-JS ממספרי Build שונים לא יוגשו יחד. Test ידני של טעינה מחוברת ואז פתיחה מחדש ב-Offline נדרש לפני שחרור גרסה.

### 2.8 כללי אמינות ובדיקה טכנית

**בדיקות אוטומטיות (מוגדרות כבר ב-Milestone 1):**
- `ESLint` ו-`next build` חייבים לעבור בסוף כל Milestone.
- `Vitest` לבדיקות קטנות של הלוגיקה העדינה בלבד: `countChars` וחיתוך ל-100 תווים, אימות הקלט בשרת, פרסור זרם ה-SSE על פני Chunks חתוכים, ומיפוי תשובות שגיאה (כולל `429` עם גוף שאינו JSON) להודעה העברית הנכונה. כך אפשר לבדוק את הטיפול ב-`429` כבר ב-Milestone 3, לפני שקיים WAF.
- בדיקות ממשק אוטומטיות בדפדפן (E2E) אינן נדרשות; זרימות הממשק נבדקות ידנית לפי ה-Definition of Done.

- דפדפנים: Chrome, Safari, Firefox ו-Edge במובייל/טאבלט/Desktop; התקנת PWA במכשירים שבהם הדפדפן מאפשר זאת.
- אימות תרחישים חיוניים: נושא ריק, נושא מעל 100 תווים, עברית בנושא לועזי, שינוי נושא בלי יצירה, מספר בדיחות ברצף, Streaming איטי, עצירה, ניתוק לפני `complete`, ניתוק אחרי Delta, כשל OpenAI, 429 ו-Offline.
- לבדוק במפורש שלא מופיע כפתור העתקה פעיל ב-`stopped` או `error`, ושאין מחיקה של טקסט חלקי במצבים אלה.
- לוודא ש-WAF מגביל בקשות בפועל **לפני** יצירת קריאת OpenAI, גם כאשר נשלחות בקשות ישירות ל-API ללא ה-UI.
- ניטור תפעולי בסיסי באמצעות לוגים/מדדי Vercel ומעקב שימוש/חיוב ב-OpenAI, ללא תוכן בדיחות בלוגים. אין צורך בפתרון Observability נוסף בשלב זה.

## 3. מה לא נכלל בארכיטקטורה

אין Supabase, PostgreSQL, Redis, Prisma, Firebase, שירות Authentication, אחסון תמונות/קבצים, תורים, WebSockets, Server Actions ליצירת בדיחות, תשלומים, Analytics ייעודי, שיתוף בדיחות, היסטוריה או יכולת לייצר בדיחה ללא אינטרנט. אם הדרישות ישתנו בעתיד, אפשר יהיה לבחון הרחבות בנפרד; הן אינן חלק מהמערכת הנוכחית.

## 4. מקורות מרכזיים למחקר ולאימות

התיעוד להלן שימש לאימות יכולות והתאמה. מחירים, מכסות ותנאי שימוש הם נתונים משתנים ויש לוודא אותם מחדש סמוך להפעלה.

1. Next.js – Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
2. Next.js – PWA Guide: https://nextjs.org/docs/app/guides/progressive-web-apps
3. Vercel – Streaming Functions: https://vercel.com/docs/functions/streaming-functions
4. Vercel – Function Duration: https://vercel.com/docs/functions/configuring-functions/duration
5. Vercel – WAF Rate Limiting, מגבלות ותמחור: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
6. Vercel – Git Deployments: https://vercel.com/docs/git
7. Vercel – Plans / Hobby restrictions: https://vercel.com/docs/plans/hobby
8. OpenAI – Responses API Streaming: https://developers.openai.com/api/docs/guides/streaming-responses
9. OpenAI – GPT-5 Model: https://developers.openai.com/api/docs/models/gpt-5
10. OpenAI – API Pricing: https://developers.openai.com/api/docs/pricing

## החלטות מרכזיות (ADRs)

### ADR-1: אין הגדרת `runtime` מפורשת ב-Route Handler
**הקשר:** הארכיטקטורה מגדירה ש-`POST /api/joke` ירוץ ב-Node.js Runtime. בפרויקט מופעל `cacheComponents` (Next.js 16.4), ולפי התיעוד של הגרסה המותקנת אסור לייצא `runtime` (גם לא `"nodejs"`) כשהאפשרות הזו פעילה.
**החלטה:** לא לייצא `runtime` מ-`app/api/joke/route.ts` ולהסתמך על Node.js, שהוא ברירת המחדל. מייצאים רק `maxDuration = 60`.
**השלכות:** ה-Route רץ ב-Node.js כנדרש, בלי שינוי בהתנהגות. אם `cacheComponents` יבוטל בעתיד, אפשר להוסיף שוב `runtime = "nodejs"` מפורש.

### ADR-2: הפרדת הנושא מההוראות באמצעות תגיות ו-`store: false`
**הקשר:** הנושא מגיע מהמשתמש ועלול לכלול הוראות למודל (Prompt Injection). בנוסף, אין צורך לשמור תשובות אצל OpenAI.
**החלטה:** ההוראות נשלחות בשדה `instructions` בלבד, והנושא נשלח בשדה `input` בתוך תגיות `<topic>...</topic>`, אחרי הסרת תגיות כאלה מתוך הנושא עצמו. ההוראות מורות להתייחס לתוכן התגיות כנושא ולא כפקודה. הבקשה נשלחת עם `store: false`.
**השלכות:** בבדיקה, ניסיונות לבקש שיר באנגלית או תשובה באנגלית הניבו בדיחה בעברית. זו הגנה מיטבית ולא מוחלטת. תשובות לא נשמרות ב-OpenAI לשימוש חוזר דרך ה-API.

### ADR-3: Service Worker סטטי, גרסה בכתובת הרישום והשלמת Cache לפי הקבצים שנטענו
**הקשר:** שמות קובצי ה-Build של Next.js כוללים Hash שאינו ידוע מראש, ואין כלי Build ל-Service Worker. בנוסף, הקבצים שנטענו בביקור הראשון נטענים לפני שה-Service Worker שולט בעמוד, ולכן אינם נשמרים מעצמם.
**החלטה:** Service Worker כקובץ JavaScript רגיל ב-`public/sw.js`, הנרשם (ב-Production בלבד) בכתובת `/sw.js?v=<גרסת Build>`; הגרסה נקבעת ב-`next.config.ts` (`VERCEL_GIT_COMMIT_SHA` או חותמת זמן של ה-Build) ומשמשת כשם ה-Cache. אחרי הרישום, הדף שולח ל-Service Worker את רשימת הקבצים שכבר טען (לפי `performance`), והוא שומר אותם. ב-`next dev` כל Service Worker קיים מבוטל.
**השלכות:** אין תלות בספרייה חיצונית (כמו Serwist); כל Build מקבל Cache חדש והישן נמחק; הממשק המלא (כולל גופנים) זמין Offline כבר אחרי ביקור מחובר אחד. אייקוני PNG נוצרים מ-SVG בסקריפט ידני (`npm run icons`, עם `sharp` כתלות פיתוח) ונשמרים ב-Git.
