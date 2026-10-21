// Demo-only content for Milestone 1 (no AI yet). Removed in Milestone 2.
export const DEMO = {
  notice: "מצב הדגמה – עדיין אין חיבור לבינה מלאכותית",
  badge: "בדיחת הדגמה",
  joke: "למה החתול הביא מחשב הביתה?\nכי הוא רצה לגלוש ברשת...\nולרדוף אחרי עכברים אונליין!",
  partialJoke: "למה החתול הביא מחשב הביתה?\nכי הוא רצה",
  waitMs: 1500,
  buttons: {
    empty: "ריק",
    waiting: "המתנה",
    joke: "בדיחה",
    error: "שגיאה",
  },
} as const;

export type DemoState = keyof typeof DEMO.buttons;
