# תוכנית – Milestone 3: עצירה, העתקה וטיפול במקרי קצה

**מקורות:** `PRD.md` (זרימות 3–4, FR-03, FR-04, FR-05, טבלת מקרי הקצה), `DESIGN.md` (1.2, 1.4 טבלת הטקסטים, 2.3 Copy Button / Error Message), `ARCHITECTURE.md` (2.2, 2.3, 2.4, 2.5, 2.8).

**נקודת מוצא (הקוד הקיים אחרי Milestone 2):**
- `lib/jokeClient.ts` מחזיר רק `"completed" | "failed" | "aborted"` — אין הבחנה בין סוגי כשל (429, 400, אין אינטרנט וכו').
- `components/JokeGenerator.tsx` כבר מחליף את הכפתור ל"עצור" ומבטל `fetch`, אבל: אין `requestId`, העדכון ל-`stopped` מגיע רק אחרי שה-Promise חוזר, וכל כשל מוצג כ"משהו השתבש" או "נקטעה".
- `components/JokeCard.tsx` מציג את כפתור "העתק בדיחה" רק ב-`completed`, אבל הכפתור עדיין לא עושה דבר.
- `lib/strings.ts` כבר מכיל את כל הטקסטים הדרושים (`copied`, `copyFailed`, `offline`, `rateLimited`, `invalidTopic`, `genericError`, `interrupted`). **אין צורך בטקסטים חדשים.**
- אין שינוי ב-PRD/DESIGN/ARCHITECTURE, אין תלויות חדשות ואין משתני סביבה חדשים.

## 1. מבנה קבצים

```text
lib/
  errors.ts            ← חדש: סוגי כשל + מיפוי סטטוס HTTP / כשל → הודעה בעברית
  errors.test.ts       ← חדש
  jokeClient.ts        ← שינוי: תוצאה מפורטת עם סוג הכשל; הגנה אחרי ביטול
  jokeClient.test.ts   ← חדש: בדיקות עם fetch מדומה (כולל 429 עם גוף HTML)
components/
  JokeGenerator.tsx    ← שינוי: requestId, עצירה מיידית, העתקה, הודעות שגיאה
  JokeCard.tsx         ← שינוי: כפתור העתקה פעיל + "הועתק!"
app/api/joke/route.ts  ← שינוי קטן: ביטול נקי כשהלקוח מתנתק, בלי לוגי שגיאה מיותרים
```

## 2. מיפוי כשלים להודעות (`lib/errors.ts`)

```ts
export type JokeFailure = "offline" | "rateLimited" | "invalidTopic" | "server" | "interrupted";
export function failureFromStatus(status: number): JokeFailure;   // לתשובה לא-200
export function messageForFailure(failure: JokeFailure): string;   // → STRINGS
```

| מצב | `JokeFailure` | הודעה (מ-`STRINGS`) |
|---|---|---|
| `navigator.onLine === false` לפני שליחה, או `fetch` נכשל ברמת הרשת (TypeError, לא ביטול) | `offline` | אין חיבור לאינטרנט... |
| סטטוס `429` — **לפי הסטטוס בלבד, בלי לקרוא את הגוף** (גוף של Vercel יכול להיות HTML/טקסט) | `rateLimited` | יצרת יותר מדי בדיחות... |
| סטטוס `400` | `invalidTopic` | הנושא ארוך מדי או לא תקין... |
| כל סטטוס לא-200 אחר (403, 500, 502, 503...), `200` שאינו `text/event-stream`, או גוף חסר | `server` | מצטערים, משהו השתבש... |
| אחרי `200`: אירוע `error` (כולל `INCOMPLETE`), אירוע לא תקין, ניתוק, או סוף זרם בלי `complete` — **לפני** שהתקבל טקסט | `server` | מצטערים, משהו השתבש... |
| אותו דבר — **אחרי** שכבר התקבל טקסט | `interrupted` | הבדיחה נקטעה באמצע... |

- הלקוח לעולם לא מציג גוף תשובה גולמי, קוד שגיאה או הודעה טכנית — רק טקסט מ-`STRINGS`.
- בדיקת `navigator.onLine` נעשית רק כש-`=== false` (בסביבות שבהן הערך לא קיים, ממשיכים כרגיל).

## 3. צד הלקוח – `lib/jokeClient.ts`

- סוג תוצאה חדש:
  ```ts
  export type JokeResult =
    | { status: "completed" }
    | { status: "aborted" }
    | { status: "failed"; failure: JokeFailure };
  ```
- סדר הטיפול: בדיקת `onLine` ← `fetch` ← **בדיקת הסטטוס לפני כל ניסיון לפרסר** (`!response.ok` → `failureFromStatus`) ← בדיקת `Content-Type` ← קריאת הזרם.
- במקרה של סטטוס לא-200 — ביטול גוף התשובה (`response.body?.cancel()`) בלי לקרוא אותו.
- הגנה אחרי ביטול: לפני כל קריאה ל-`onDelta` בודקים `signal.aborted`; אם בוטל — לא מעבירים עוד טקסט. ב-`abort` נקרא `reader.cancel()` כך שהלולאה נעצרת מיד.
- "הושלם" רק אחרי אירוע `complete` (כמו היום). אירוע `error` או סוף זרם בלי `complete` → `failed` עם `server`/`interrupted` לפי האם התקבל טקסט.
- חריגה שנזרקה: אם `signal.aborted` או `AbortError` → `aborted`; אם נזרקה מ-`fetch` עצמו (לפני תשובה) → `offline`; אם נזרקה בזמן קריאת הזרם → `server`/`interrupted`.

## 4. צד הלקוח – `components/JokeGenerator.tsx`

**הגנה מפני בקשות ישנות (`requestId`):**
- `requestIdRef` (מונה שעולה בכל יצירה). כל עדכון State שמגיע מבקשה (`onDelta` ותוצאת הסיום) מתבצע רק אם `requestIdRef.current === id`.

**עצירה מיידית:**
- לחיצה על "עצור": מעלים את `requestIdRef` (כך שכל אירוע מאוחר של הבקשה ייזנח), קוראים ל-`abort()`, וקובעים מיד `status: "stopped"` — בלי לחכות שה-Promise יחזור. הטקסט החלקי נשאר, ואין הודעת שגיאה (לפי DESIGN 1.4).
- כפתור הפעולה חוזר מיד ל"צור בדיחה", וניתן להתחיל יצירה חדשה.

**שגיאות:**
- `failed` → `status: "error"`, `errorMessage: messageForFailure(failure)`; הטקסט החלקי נשאר ב-Card.
- ההודעה מוצגת ב-`ErrorMessage` הקיים (מתחת לכפתור, מעל ה-Card) ונעלמת בתחילת יצירה חדשה.

**העתקה:**
- `handleCopy`: עובד רק כש-`status === "completed"`; קורא `navigator.clipboard.writeText(view.joke)`.
  - הצלחה → `copied = true`, וטיימר של 2 שניות מחזיר את התווית ל"העתק בדיחה". הטיימר מתאפס בהעתקה חוזרת, ביצירה חדשה וב-unmount.
  - כשל (אין הרשאה / אין `navigator.clipboard`) → `copyError = true`; ההודעה "לא הצלחנו להעתיק..." מוצגת באותה קופסת שגיאה (`ErrorMessage`) — זה המיקום של הודעות שגיאה לפי DESIGN 2.3. היא נעלמת בניסיון העתקה נוסף או ביצירה חדשה. הבדיחה וכפתור ההעתקה נשארים.
- אין העתקה דרך הכפתור במצבים `streaming`, `stopped`, `error` — הכפתור פשוט לא מוצג בהם (כמו היום). אין חלופה ישנה (`execCommand`), כדי לשמור על פשטות.

## 5. `components/JokeCard.tsx`

- Props חדשים: `onCopy: () => void`, `copied: boolean`.
- הכפתור מציג "העתק בדיחה" או "הועתק!" (בלי שינוי עיצוב או צבע, אותו כפתור לפי DESIGN 2.3). מוצג רק ב-`completed`.
- ה-`aria-live` נשאר כפי שהוא (הכרזה רק בסיום, בעצירה או בשגיאה).

## 6. Backend – `app/api/joke/route.ts` (שינוי קטן)

- דגל `cancelled` שנקבע ב-`cancel()` של ה-`ReadableStream`; כשהוא פעיל, `send`/`finish` לא נוגעים ב-controller (מונע שגיאות "Invalid state" אחרי ניתוק), והלולאה יוצאת.
- כשהלקוח ביטל (`request.signal.aborted` או `cancelled`) — לא רושמים `console.error` (ביטול הוא התנהגות רגילה, לא תקלה). זה תקף גם לביטול בזמן ההמתנה ל-`responses.create`.
- הביטול מול OpenAI נשאר כמו היום (`upstream.controller.abort()` + `request.signal` שמועבר ל-SDK). זו הפסקה "ככל שניתן" — עדיין ייתכן חיוב על Tokens שכבר נוצרו (ARCHITECTURE 1.2).

## 7. בדיקות Vitest

**`lib/errors.test.ts`:**
- `429` → `rateLimited` → "יצרת יותר מדי בדיחות בזמן קצר. אפשר לנסות שוב בעוד רגע."
- `400` → `invalidTopic`; `500`, `502`, `503`, `403` → `server`.
- כל `JokeFailure` ממופה לטקסט מ-`STRINGS` (לא ריק).

**`lib/jokeClient.test.ts`** (מחליף את `globalThis.fetch` במימוש מדומה שמחזיר `Response` אמיתי של Node):
- `429` עם `Content-Type: text/html` וגוף `"<html>Too Many Requests</html>"` → `failed/rateLimited`; הגוף לא נקרא ולא מופיע בהודעה.
- `429` עם גוף JSON ו-`429` עם גוף ריק → אותה תוצאה.
- `400` JSON → `invalidTopic`; `502` JSON → `server`.
- `200` שאינו `text/event-stream` → `server`.
- `delta` + `complete` → `completed`, וה-`onDelta` קיבל את הטקסט.
- `delta` ואז סוף זרם בלי `complete` → `interrupted`.
- `delta` + `error {"code":"INCOMPLETE"}` → `interrupted`; `error` לפני כל `delta` → `server`.
- `fetch` שנזרק כ-`TypeError` → `offline`.
- `navigator.onLine === false` → `offline` בלי לקרוא ל-`fetch`.
- ביטול באמצע זרם → `aborted`, ואין קריאות `onDelta` אחרי הביטול.

הבדיקות הקיימות (`text`, `jokeRequest`, `sse`) ממשיכות לעבור.

## 8. בדיקות בסוף הבנייה (Claude מריץ בעצמו)

1. `npm run lint`, `npm test`, `npm run build` — עוברים.
2. `npm run dev` ובדיקה בדפדפן המובנה (קריאות אמיתיות ל-OpenAI, מעטות ככל האפשר):
   - **עצירה:** לחיצה על "עצור" באמצע → הטקסט החלקי נשאר, הכפתור חוזר ל"צור בדיחה", אין כפתור העתקה ואין הודעה. בלוג השרת אין שגיאות.
   - **בקשה חדשה מיד אחרי עצירה:** הבדיחה החדשה לא מתערבבת עם מקטעים של הקודמת.
   - **העתקה:** בדיחה שהושלמה → "הועתק!" לכשתי שניות, ובדיקה שהטקסט ב-Clipboard זהה לבדיחה (`navigator.clipboard.readText` בכלי הבדיקה).
   - **כשל העתקה:** החלפה זמנית של `navigator.clipboard.writeText` (בכלי הבדיקה בלבד, לא בקוד) בפונקציה שנכשלת → מוצגת ההודעה בעברית.
3. **מקרי כשל** — מדמים בכלי הבדיקה של הדפדפן (החלפה זמנית של `window.fetch` / `navigator.onLine`, **לא** בקוד האפליקציה):
   - אין אינטרנט → "אין חיבור לאינטרנט...".
   - `429` עם גוף HTML → הודעת הגבלת הקצב, בלי טקסט גולמי.
   - `502` → "מצטערים, משהו השתבש...".
   - זרם שנקטע אחרי `delta` (בלי `complete`) → הטקסט החלקי נשאר + "הבדיחה נקטעה באמצע...", בלי כפתור העתקה.
   - בכל המקרים — לחיצה נוספת על "צור בדיחה" מתחילה ניסיון חדש וההודעה נעלמת.
4. **ניתוק אמיתי:** עצירת שרת הפיתוח באמצע Streaming → הטקסט החלקי נשאר והודעת שגיאה בעברית; הפעלה מחדש וניסיון נוסף עובד.
5. סגירת שרת הפיתוח בסיום.

## 9. מיפוי ל-Definition of Done

| תנאי | איך מכוסה |
|---|---|
| "עצור" בזמן Streaming, עוצר ושומר טקסט חלקי | סעיפים 4 (עצירה מיידית) ו-3 (אין `onDelta` אחרי ביטול); בדיקה 8.2 |
| טקסט חלקי לא ניתן להעתקה; בדיחה מלאה מועתקת + "הועתק!" | סעיפים 4–5; בדיקה 8.2 |
| ניתוק לפני/אחרי טקסט, תקלת AI, אין אינטרנט → הודעה בעברית וניסיון חדש | סעיפים 2–3; בדיקות 7, 8.3, 8.4 |
| סיום בלי `complete` אינו הצלחה | סעיף 3; בדיקות 7 |
| בקשות ישנות / אירועים מאוחרים לא משנים בקשה חדשה | סעיף 4 (`requestId`) + סעיף 3; בדיקה 8.2 |
| `429` מוצג כהודעה בעברית בלי לחשוף תגובה גולמית (Vitest) | סעיף 2; בדיקות 7 |
