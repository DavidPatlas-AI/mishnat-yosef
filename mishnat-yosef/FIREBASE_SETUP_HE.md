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
6. להחליף ב-`index.html` את `manager@example.com` באימייל האמיתי של המנהל.
7. להחליף ב-`firestore.rules` את `manager@example.com` באותו אימייל מנהל.
8. לפרסם את Firestore Rules מתוך Firebase Console.
9. לפרוס מחדש ל-Netlify.

## מה לשלוח לי כדי שאחבר ואפרוס

שלח רק את:

- `firebaseConfig` של Web App.
- אימייל המנהל.

לא לשלוח סיסמאות, לא לשלוח טוקן פרטי, ולא לשלוח קובץ Service Account.
