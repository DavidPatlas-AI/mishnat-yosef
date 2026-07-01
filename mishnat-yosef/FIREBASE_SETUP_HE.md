# חיבור אמיתי ל-Firebase

האתר כבר מוכן למצב אמיתי, אבל כדי שהכניסה והניהול יעבדו בענן צריך למלא פרטי Firebase אמיתיים.

## איפה נשמרים הדברים

- סיסמאות: Firebase Authentication. הן לא נשמרות בקובץ האתר, לא ב-Netlify ולא ב-localStorage.
- משתמשים: Firestore, בקולקציה `users`.
- סלים והיסטוריית סלים: Firestore, בתוך `users/{userId}/baskets`.
- מנהלים: לפי אימייל מורשה שמופיע גם בקובץ האתר וגם בקובץ `firestore.rules`.

## מה צריך לעשות

1. להיכנס ל-Firebase Console וליצור פרויקט.
2. להפעיל Authentication עם Email/Password.
3. ליצור Firestore Database במצב Production.
4. לפתוח Project settings -> General -> Your apps -> Web app.
5. להעתיק את `firebaseConfig` לתוך `index.html`.
6. להחליף ב-`index.html` את `MANAGER_EMAILS` באימייל האמיתי של המנהל.
7. לפרסם את `firestore.rules` (שורש ה-repo) — אחת מהאפשרויות:
   - Firebase Console → Firestore → Rules → הדבק את התוכן מ-`firestore.rules`
   - או מהטרמינל (אחרי `firebase login`):
     ```bash
     cd mishnat-yosef
     firebase deploy --only firestore:rules --project mishnat-yosef
     ```
8. לפרוס ל-Netlify: `netlify deploy --prod --site 73c074b1-f8d2-4d58-a1c8-5016a0f4f071`

**חי:** https://mishnat-yosef-dashboard.netlify.app

## מה לשלוח לי כדי שאחבר ואפרוס

שלח רק את:

- `firebaseConfig` של Web App.
- אימייל המנהל.

לא לשלוח סיסמאות, לא לשלוח טוקן פרטי, ולא לשלוח קובץ Service Account.
