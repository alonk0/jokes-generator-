# תוכנית – Milestone 1: בסיס הפרויקט וממשק שימושי

**מקורות:** `MILESTONES.md` (Milestone 1), `PRD.md`, `ARCHITECTURE.md` (סעיפים 1, 2.2, 2.8), `DESIGN.md` (כולל `wireframes.png`, `mockups.png`, `style-guide.png`, `clown.webp`, `funny jokes.png`).

**מה לא נכלל ב-Milestone הזה:** אין `POST /api/joke`, אין OpenAI, אין `.env` (עדיין אין משתנים), אין Streaming אמיתי, אין העתקה פעילה ל-Clipboard (Milestone 3), אין Manifest / Service Worker / אייקונים (Milestone 4), אין מסך אודות, אין Dark Mode.

---

## 1. הקמת הפרויקט

- **סביבה:** Node.js המותקן במחשב (v26, ה-LTS הנוכחי), npm.
- **יצירה:** `create-next-app` (הגרסה היציבה העדכנית) בתיקייה זמנית ב-scratchpad, עם האפשרויות: TypeScript, ESLint, App Router, **בלי** Tailwind, **בלי** `src/`, alias `@/*`, npm. אחר כך מעבר הקבצים לשורש הפרויקט, **בלי לדרוס** את `.gitignore`, `CLAUDE.md` ו-`spec/` (ה-create-next-app לא תמיד מסכים לרוץ בתיקייה שאינה ריקה).
- מחיקת קבצי הדוגמה של התבנית (תמונות ב-`public/`, עיצוב ברירת המחדל).
- **`package.json`:** שם `jokes`, שדה `engines.node` לגרסת ה-LTS, וסקריפטים:
  - `dev` → `next dev`
  - `build` → `next build`
  - `start` → `next start`
  - `lint` → `eslint .`
  - `test` → `vitest run`
- **Vitest:** התקנת `vitest` כ-devDependency, קובץ `vitest.config.ts` מינימלי (סביבת `node`, alias `@` לשורש). אין צורך ב-React Testing Library — הבדיקות הן ללוגיקה בלבד (ARCHITECTURE 2.8).
- **`.gitignore`:** להוסיף רק את מה שחסר עבור Next.js (למשל `next-env.d.ts`); לא להסיר שום שורה.
- **`CLAUDE.md`:** מילוי "פקודות הרצה": `npm run dev`; בדיקות: `npm test` (וגם `npm run lint`, `npm run build`).

## 2. מבנה קבצים

```text
app/
  layout.tsx          # <html lang="he" dir="rtl">, fonts, metadata (title "מחולל בדיחות")
  globals.css         # design tokens (CSS variables), reset, body background
  page.tsx            # server component: header, <JokeGenerator/>, friends illustration, footer
  page.module.css
components/
  JokeGenerator.tsx   # "use client" – holds state: topic, status, joke, error; demo controls
  JokeGenerator.module.css
  TopicInput.tsx      # input + ✕ clear button + counter
  TopicInput.module.css
  JokeCard.tsx        # empty / loading / joke states + copy button (visual only in M1)
  JokeCard.module.css
  ErrorMessage.tsx    # pink box with round "!" icon
  ErrorMessage.module.css
  DemoPanel.tsx       # clearly-labelled demo controls (removed in Milestone 2)
  DemoPanel.module.css
lib/
  text.ts             # MAX_TOPIC_CHARS = 100, countChars(), truncateChars()
  text.test.ts        # Vitest
  strings.ts          # all UI texts from the DESIGN.md text table
public/
  illustrations/
    clown.webp        # resized copy of spec/clown.webp
    friends.webp      # spec/funny jokes.png, cropped (no English text), converted to WebP
```

## 3. לוגיקת ספירת תווים (`lib/text.ts`)

- `MAX_TOPIC_CHARS = 100`.
- `countChars(text)` → `Array.from(text).length` (ספירה לפי Unicode Code Points, כך שאמוג'י נספר כתו אחד).
- `truncateChars(text, max = MAX_TOPIC_CHARS)` → `Array.from(text).slice(0, max).join("")`.
- אותה פונקציה תשמש בהמשך גם את השרת (Milestone 2), ולכן הקובץ לא תלוי ב-React או בדפדפן.
- **בדיקות Vitest (`lib/text.test.ts`):** מחרוזת ריקה = 0; עברית רגילה; רווחים נספרים; אמוג'י (כולל אמוג'י שמורכב מ-surrogate pair) נספר כ-1; טקסט של בדיוק 100 נשאר כמו שהוא; 101 ומעלה נחתך ל-100; חיתוך לא שובר אמוג'י באמצע.

## 4. שדה הנושא (`TopicInput`)

- `<input type="text">` מבוקר (controlled), `dir="rtl"`, Placeholder "הכניסו נושא לבדיחה...", עם `aria-label` מתאים.
- **לא** משתמשים ב-`maxLength` של HTML (סופר אחרת). ב-`onChange` הערך עובר דרך `truncateChars` — זה מכסה גם הקלדה מעבר ל-100 וגם הדבקה ארוכה (נחתכת ל-100 הראשונים).
- **מונה:** `<countChars>/100` בגוון Muted Gray מתחת לשדה, ב-`dir="ltr"` כדי שהמספרים יוצגו בסדר הנכון.
- **כפתור ✕:** מוצג רק כשהשדה אינו ריק, בצד השמאלי של השדה, `aria-label="נקה נושא"`. לחיצה מאפסת את הנושא ומחזירה את הפוקוס לשדה. **לא** נוגע בבדיחה/מצב המוצגים.
- שינוי הנושא משנה רק את `topic` ב-state; הבדיחה המוצגת מתעדכנת רק בלחיצה על הכפתור הראשי.

## 5. מצבי הממשק והדגמה ללא AI

**State ב-`JokeGenerator`:** `topic`, `status` (`idle` | `streaming` | `completed` | `error` — אותם שמות כמו ב-ARCHITECTURE, כדי שהמעבר ל-Milestone 2 יהיה פשוט), `joke` (טקסט), `errorMessage`.

**הצגה לפי מצב:**

| מצב | כפתור ראשי | Card | הודעת שגיאה |
|---|---|---|---|
| `idle` | "צור בדיחה" ✨ | מצב ריק: מסגרת מקווקוות, ליצן, "הבדיחה תופיע כאן אחרי הלחיצה על הכפתור" | — |
| `streaming` (ללא טקסט) | "עצור" (ורוד, ריבוע עצירה אדום) | שלוש נקודות כחולות מהבהבות + "יוצר בדיחה..." | — |
| `completed` | "צור בדיחה" | טקסט הבדיחה (`white-space: pre-wrap`) + כפתור "העתק בדיחה" | — |
| `error` | "צור בדיחה" | טקסט חלקי אם יש, אחרת מצב ריק; **בלי** כפתור העתקה | קופסה ורודה מתחת לכפתור הראשי |

**הדגמה (ברורה כהדגמה):**
- מעל ה-Card (או בתחתית העמוד מעל שורת התחתית) מוצגת רצועה קטנה ומסומנת בבירור: **"מצב הדגמה – עדיין אין חיבור לבינה מלאכותית"**, עם ארבעה כפתורים קטנים: "ריק", "המתנה", "בדיחה", "שגיאה". כל כפתור מעביר את הממשק למצב המתאים עם תוכן בדיקה קבוע.
- לחיצה על "צור בדיחה" בממשק עצמו מריצה הדגמה: מצב המתנה לכשנייה וחצי ואז בדיחת דוגמה קבועה (הבדיחה מה-Wireframe על החתול והמחשב), כשמעל טקסט הבדיחה מופיעה תווית קטנה "בדיחת הדגמה". אין קריאה לרשת.
- לחיצה על "עצור" בזמן ההדגמה מבטלת את הטיימר וחוזרת למצב הקודם (פשוט, רק כדי שהכפתור לא ייראה שבור; העצירה האמיתית נבנית ב-Milestone 3).
- בהודעת השגיאה בהדגמה מוצג הטקסט "מצטערים, משהו השתבש. נסו שוב בעוד רגע." (מטבלת הטקסטים).
- כפתור "העתק בדיחה" מוצג בעיצובו הסופי, אך ההעתקה עצמה תחובר ב-Milestone 3.
- כל קוד ההדגמה מרוכז ב-`DemoPanel.tsx` ובפונקציה אחת ב-`JokeGenerator`, כדי שיהיה קל להסיר אותו ב-Milestone 2.

**נגישות:** אזור הבדיחה עם `aria-live="polite"`; האיורים עם `alt=""`.

## 6. עיצוב (לפי DESIGN.md)

- **גופנים:** `next/font/google` — Rubik (700), Heebo (500, 700), Assistant (400, 600), עם subsets `hebrew` ו-`latin`, כמשתני CSS (`--font-rubik` וכו'). Body ב-Assistant.
- **Tokens ב-`globals.css`:** כל צבעי DESIGN 2.1 (Primary Red `#FF2D2D`, Sunny Yellow, Bright Blue, Orange, Success Green, Off White `#FFFDF9`, Light Gray, Charcoal) + הגוונים הנגזרים (Soft Pink `#FFE5E5`, Text Red `#C41E1E`, Muted Gray `#6B7280`); רדיוסים 8–16px; צל רך אחד לשימוש חוזר.
- **פריסה:** עמודה אחת ממורכזת, `max-width: 560px`, שוליים צדדיים 16px לפחות, רקע Off White בכל הרוחב. סדר: כותרת ← כותרת משנה ← שדה + מונה ← כפתור ראשי ← (שגיאה) ← Card ← רצועת ההדגמה ← איור הדמויות ← שורת תחתית.
- **כותרת:** "מחולל בדיחות" ב-Rubik Bold, אדום, גודל `clamp(32px, …, 40px)`, עם 😂 קטן כקישוט. כותרת משנה ב-Heebo Medium 18–20px, Charcoal. בלי קשת/סיבוב של הכותרת (העדפת קריאות, DESIGN 2.2).
- **כפתור ראשי:** רוחב מלא, אדום, טקסט לבן מודגש **19px לפחות**, פינות מעוגלות, צל עדין, אייקון ניצוץ (SVG קטן inline). מצב "עצור": רקע Soft Pink, טקסט Text Red, ריבוע עצירה אדום.
- **Card:** לבן, פינות מעוגלות, צל רך, ריווח פנימי נדיב. במצב ריק: מסגרת מקווקוות Light Gray, ליצן ~180px במרכז, טקסט Muted Gray. גובה מינימלי קבוע כדי שהמעבר בין מצבים לא יקפיץ את העמוד.
- **כפתור העתקה:** רוחב מלא, Soft Pink, טקסט ואייקון העתקה (SVG) ב-Text Red, עם קו הפרדה עדין מעל.
- **שגיאה:** קופסה Soft Pink, אייקון "!" עגול אדום, טקסט Text Red.
- **מחוון המתנה:** שלוש נקודות Bright Blue עם אנימציית הבהוב עדינה ב-CSS.
- **תחתית:** איור הדמויות ממורכז ברוחב מרבי ~280px, מתחתיו "הבדיחות נוצרות באמצעות בינה מלאכותית" בגוון Muted Gray, טקסט קטן.
- אייקונים (ניצוץ, ✕, העתקה, עצירה, "!") — SVG פשוטים בתוך הקוד, בלי ספריית אייקונים.

## 7. איורים

- `clown.webp` (1200×1200) → הקטנה ל-400×400 (מספיק ל-~180px במסכי Retina), נשמר כ-`public/illustrations/clown.webp`.
- `funny jokes.png` (866×614) → חיתוך החלק העליון בלבד (בערך 866×420, כך שהכיתוב "Funny Jokes" לא נכלל), המרה ל-WebP עם שקיפות, נשמר כ-`public/illustrations/friends.webp`.
- ההמרה נעשית פעם אחת בעזרת `sharp` (שמגיע עם Next.js) בפקודה חד-פעמית; הקבצים המקוריים ב-`spec/` לא משתנים.
- הצגה דרך `next/image` עם `width`/`height` מפורשים ו-`alt=""`.

## 8. בדיקה עצמית בסוף הבנייה

1. `npm run lint`, `npm test`, `npm run build` — כולם עוברים.
2. הרצת `npm run dev` ובדיקה בדפדפן המובנה ברוחבים: מובייל (375), טאבלט (768), Desktop (1280):
   - עמוד אחד בלבד; אין קישורי אודות/מדיניות/תפריט.
   - RTL, עמודה ממורכזת עד 560px, אין גלילה אופקית.
   - הקלדה מעל 100 תווים נעצרת; הדבקה של 150 תווים נחתכת ל-100; המונה נכון גם עם אמוג'י.
   - ✕ מופיע רק כשיש טקסט ומנקה; שינוי/ניקוי הנושא לא משנה בדיחה מוצגת.
   - ארבעת מצבי ההדגמה מוצגים נכון, בלי שגיאות ב-Console, ובלי שום בקשת רשת ל-API.
   - הגופנים והצבעים תואמים ל-DESIGN.
3. סגירת שרת הבדיקה, סימון 🟡 ליד כותרת Milestone 1 ב-`MILESTONES.md`. בלי commit.

## 9. Definition of Done (מתוך MILESTONES.md)

- [ ] הפרויקט רץ מקומית; `ESLint`, `next build` ובדיקות `Vitest` עוברים.
- [ ] קיים עמוד מוצר אחד בלבד, ללא מסך אודות, תפריטי ניווט או תכונות שלא אושרו.
- [ ] שדה הנושא מקבל קלט ריק, מציג מונה, מונע קלט מעל 100 תווים וחותך הדבקה ארוכה; כפתור ✕ מופיע רק כשיש טקסט ומנקה אותו; שינוי הנושא בלבד אינו משנה תוצאה מוצגת.
- [ ] הממשק בעברית וב-RTL, בעמודה ממורכזת ברוחב מרבי של 560px, ושמיש במובייל, בטאבלט וב-Desktop בדפדפנים מודרניים.
- [ ] ניתן להציג את מצבי ההמתנה, הבדיחה והשגיאה עם תוכן בדיקה ללא שגיאות, ואין מצג של חיבור AI אמיתי.
