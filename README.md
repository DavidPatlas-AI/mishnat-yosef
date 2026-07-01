# משנת יוסף — פורטל לקוחות

פורטל ניהול סלים ורשימות קנייה ללקוחות משנת יוסף.

**Live:** https://mishnat-yosef-dashboard.netlify.app

## Tech

- HTML + Firebase Auth/Firestore + Netlify Functions
- `firestore.rules` — הרשאות לפי `role: admin` למנהלים

## Structure

- `index.html` — האפליקציה (שורש)
- `netlify/functions/` — סנכרון מוצרים וייבוא לקוחות
- `firebase.json` — לפרסום Rules

## Setup

ראה `mishnat-yosef/FIREBASE_SETUP_HE.md` להגדרת Firebase.