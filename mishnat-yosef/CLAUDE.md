# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## הפרויקט

מערכת ניהול קנייה קבוצתית עבור **משנת יוסף** — רשת שיתוף מוצרים קהילתית. לקוחות מסמנים מה הגיע/חסר/פגום בסל שלהם, המנהל רואה את כל הסלים.

## הפעלת פיתוח

**אין build system.** הכל HTML סטטי. לפתיחה מקומית:

```bash
cd "C:/Users/DAVID/Documents/Codex/2026-06-21/new-chat/outputs/mishnat-yosef"
python -m http.server 8765
# ← http://localhost:8765/index.html
```

> אל תפתח ישירות עם `file://` — CORS יחסום בקשות ו-`<datalist>` לא יעבוד.

**פריסה לנטליפיי:**
```bash
netlify deploy --prod
# Site ID: 73c074b1-f8d2-4d58-a1c8-5016a0f4f071
```

## קבצים

| קובץ | תפקיד |
|------|--------|
| `index.html` | האפליקציה הראשית — סל קנייה, admin dashboard, כל הלוגיקה |
| `weekly-report.html` | כלי מנהל: ייבוא טקסט מ-Google Doc → דוח מסודר |
| `דוח-זיכויים.html` | דוח מוכן-לשליחה עם נתוני השבוע הנוכחי embedded |
| `google-apps-script.js` | מדביקים ב-Google Apps Script — שולח מייל אוטומטי כל ראשון |
| `manifest.json` | PWA manifest — מאפשר "הוסף למסך הבית" בטלפון |

## ארכיטקטורה של `index.html`

**Screen-based navigation** — שלושה מסכים שמוצגים/מוסתרים עם `.screen.active`:
- `#screen-start` — הזנת שם + כניסת מנהל
- `#screen-admin-login` — קוד מנהל
- `#screen-app` — האפליקציה המלאה

**State גלובלי (JS):**
```js
let session        // { name, customerId, isAdmin }
let currentBasketId
let basketItems    // array of { id, name, qty, price, status, note, image }
let adminBaskets   // כל הסלים — גלוי למנהל בלבד
const openNotes    // Set<number> — אינדקסים של note rows פתוחים
```

**LocalStorage keys** (מוגדרים ב-`LS`):
```js
const LS = { SESSION: 'mj-session', BASKETS: 'mj-baskets', PRODUCTS: 'mj-products' }
```

**renderBasket override pattern** — הפונקציה המקורית `renderBasket` נכתבה כ-list rows. היא נשמרת ב-`_origRenderBasket` והוחלפה בגרסה שמרנדרת card grid. כל שינוי ב-renderBasket חייב להיות ב-override (מחפשים את `renderBasket = function()`).

**Category system** — `productCategory(name)` מחזיר מחרוזת (`dairy`, `bread`, `veggie`...) שמוסיפה `data-cat` לכרטיסייה ומשנה את פס הצבע בראשה (CSS `::before` + custom property `--cat-color`). `productEmoji(name)` עובד על אותה לוגיקה ומחזיר emoji.

**Status system** — שלושה ערכים: `'ok'` / `'missing'` / `'damaged'` / `''` (ממתין). סימון toggles: לחיצה שנייה על אותו כפתור מנקה לריק. `openNotes` חייב להתעדכן ידנית בכל פעולה שמשנה אינדקסים (`deleteItem` מזיז, `drag&drop` מנקה).

**אדמין** — קוד: `const ADMIN_CODE = 'mishnat2026'` (שורה ~882). המנהל רואה dashboard עם כל הסלים מ-`adminBaskets` (נטען מ-LocalStorage). אין Firebase — הכל LocalStorage.

## Google Doc → דוח

פורמט רשומות במסמך Google:
```
פרשה- שם לקוח - מוצר1, מוצר2, מוצר3
```

הפרסר ב-`weekly-report.html` ו-`google-apps-script.js` מזהה `-` ראשון כהפרדת פרשה, שני כהפרדת שם.

**להתקין Google Apps Script:**
1. פתח Google Doc: `18o3UWxv-Wlqt2Vwv8yopNSxsse4YpcrDU8c9yhVYTEo`
2. Extensions → Apps Script → הדבק את `google-apps-script.js`
3. הרץ `setupTrigger()` פעם אחת

אימייל יעד: `susp4514@gmail.com` (ב-`CONFIG.reportEmail`)

## RTL / עברית

- כל ה-HTML: `<html lang="he" dir="rtl">`
- כל input טקסטואלי: `direction: rtl`
- בדוחות WhatsApp: `*bold*` עם `\n` — מאופן לפי wa.me URL encoding

## נקודות חשובות

- **אין Firebase** — הסיסמה הישנה ב-memory בנתה Firebase, אבל כל ה-persistence הוא LocalStorage. אין Firestore, אין Auth.
- **תמונות** — נשמרות כ-base64 ב-LocalStorage. לא לשים בהן תמונות גדולות מדי.
- **`basket-summary`** — ה-`display` נשלט ב-JS (`updateProgress`). ה-HTML מגדיר `display:none` בלבד. אל תוסיף `display:flex` ב-HTML inline style.
- **`openNotes` Set** — נמחק בכניסה לסל (`openNotes.clear()`), ב-drag&drop, וב-`doLogout`. בית מחיקת פריט — מזיז אינדקסים גבוהים ב-1 כלפי מטה.
