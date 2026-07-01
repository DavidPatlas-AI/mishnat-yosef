/**
 * משנת יוסף — Google Apps Script
 * ===================================
 * מדביקים את הקוד הזה ב-Google Apps Script שמחובר למסמך הזיכויים.
 *
 * הוראות התקנה:
 * 1. פתח את Google Doc של הזיכויים
 * 2. Extensions → Apps Script
 * 3. מחק את הקוד הקיים והדבק את הקוד הזה
 * 4. שמור (Ctrl+S)
 * 5. הרץ את setupTrigger() פעם אחת (Run → setupTrigger)
 * 6. תן הרשאות כשמבקש
 *
 * מה הקוד עושה:
 * - כל יום ראשון בבוקר קורא את המסמך
 * - מפרק את הנתונים לרשימה מסודרת
 * - שולח מייל עם הדוח
 * - מנקה את המסמך לשבוע הבא
 */

// ══════════════════════════════════════════
//  הגדרות — שנה כאן לפני הפעלה ראשונה
// ══════════════════════════════════════════
const CONFIG = {
  // האימייל שיקבל את הדוח השבועי:
  reportEmail: 'susp4514@gmail.com',

  // מספר WhatsApp לשליחת הדוח (לא חובה — עם קוד מדינה):
  // אם ריק — לא ישלח WhatsApp
  whatsappPhone: '',

  // כותרת המייל:
  emailSubject: 'דוח זיכויים שבועי — משנת יוסף',

  // מחק את המסמך אחרי שליחה? (true/false)
  clearDocAfterSend: false,

  // שמור עותק של כל דוח בגיליון אלקטרוני? (true/false)
  saveToSheet: false
};

// ══════════════════════════════════════════
//  הגדרת טריגר שבועי
// ══════════════════════════════════════════
function setupTrigger() {
  // מחק טריגרים קיימים
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // טריגר חדש: כל יום ראשון בשעה 8 בבוקר
  ScriptApp.newTrigger('generateWeeklyReport')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(8)
    .create();

  Logger.log('✅ טריגר שבועי הוגדר — כל יום ראשון ב-8:00');
}

// ══════════════════════════════════════════
//  קריאת המסמך ופענוח
// ══════════════════════════════════════════
function readDocEntries() {
  const doc  = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  const text = body.getText();

  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const entries = [];
  let currentEntry = null;

  for (const line of lines) {
    // זהה שורה שמתחילה עם פרשה-שם-מוצרים
    const hasDash = line.indexOf('-') !== -1;
    const firstDash = line.indexOf('-');
    const afterFirst = line.slice(firstDash + 1).trim();
    const hasSecondDash = afterFirst.indexOf('-') !== -1;

    if (hasDash && hasSecondDash) {
      if (currentEntry) entries.push(currentEntry);

      const parasha  = line.slice(0, firstDash).trim();
      const rest     = afterFirst;
      const secondDash = rest.indexOf('-');
      const customer = rest.slice(0, secondDash).trim();
      const items    = rest.slice(secondDash + 1).trim();

      currentEntry = { parasha, customer, items };
    } else if (currentEntry) {
      // שורת המשך — מוסיפה למוצרים
      currentEntry.items += ' ' + line;
    }
  }

  if (currentEntry) entries.push(currentEntry);

  return entries.filter(e => e.customer && e.items);
}

// ══════════════════════════════════════════
//  בניית הדוח
// ══════════════════════════════════════════
function buildReport(entries) {
  const today    = new Date();
  const dateStr  = Utilities.formatDate(today, 'Asia/Jerusalem', 'dd/MM/yyyy');
  const parashiot = [...new Set(entries.map(e => e.parasha))].join(', ');

  // גוף ה-HTML למייל
  let html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(90deg,#c25e00,#e87722);padding:20px 24px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">📋 דוח זיכויים שבועי</h1>
        <p style="color:rgba(255,255,255,.85);margin:4px 0 0;font-size:13px">
          משנת יוסף · ${dateStr} · פרשת ${parashiot}
        </p>
      </div>

      <div style="background:#fff8f2;padding:12px 24px;border:1px solid #f0d8c0;border-top:none">
        <strong style="color:#c25e00">סה"כ ${entries.length} לקוחות</strong>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        <tr style="background:#fdf6f0">
          <th style="padding:10px 16px;text-align:right;font-size:12px;color:#7a6a5a;border-bottom:2px solid #f0d8c0">#</th>
          <th style="padding:10px 16px;text-align:right;font-size:12px;color:#7a6a5a;border-bottom:2px solid #f0d8c0">פרשה</th>
          <th style="padding:10px 16px;text-align:right;font-size:12px;color:#7a6a5a;border-bottom:2px solid #f0d8c0">לקוח</th>
          <th style="padding:10px 16px;text-align:right;font-size:12px;color:#7a6a5a;border-bottom:2px solid #f0d8c0">פריטים</th>
        </tr>`;

  entries.forEach((e, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#fff9f5';
    html += `
        <tr style="background:${bg}">
          <td style="padding:10px 16px;font-size:12px;color:#7a6a5a;border-bottom:1px solid #f0d8c0">${i + 1}</td>
          <td style="padding:10px 16px;font-size:13px;border-bottom:1px solid #f0d8c0">
            <span style="background:#fdeede;color:#c25e00;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">${e.parasha}</span>
          </td>
          <td style="padding:10px 16px;font-size:14px;font-weight:700;color:#c25e00;border-bottom:1px solid #f0d8c0">${e.customer}</td>
          <td style="padding:10px 16px;font-size:13px;border-bottom:1px solid #f0d8c0">${e.items}</td>
        </tr>`;
  });

  html += `
      </table>

      <div style="background:#f5f5f5;padding:14px 24px;border-radius:0 0 12px 12px;font-size:12px;color:#888;text-align:center">
        הדוח נוצר אוטומטית על ידי מערכת משנת יוסף · ${dateStr}
      </div>
    </div>`;

  // גוף הטקסט לוואטסאפ
  let waText = `📋 *דוח זיכויים – משנת יוסף*\n📅 ${dateStr} | פרשת ${parashiot}\n👥 ${entries.length} לקוחות\n\n`;
  entries.forEach((e, i) => {
    waText += `${i + 1}. *${e.customer}* (${e.parasha})\n   ${e.items}\n\n`;
  });
  waText += `─────────────────\n*משנת יוסף שירות לקוחות*`;

  return { html, waText, dateStr, parashiot };
}

// ══════════════════════════════════════════
//  שמירה לגיליון (אופציונלי)
// ══════════════════════════════════════════
function saveToSheet(entries, dateStr) {
  if (!CONFIG.saveToSheet) return;

  const ss = SpreadsheetApp.create(`דוח זיכויים ${dateStr}`);
  const sheet = ss.getActiveSheet();
  sheet.setName('זיכויים');
  sheet.setRightToLeft(true);

  sheet.appendRow(['#', 'פרשה', 'לקוח', 'פריטים', 'תאריך']);
  entries.forEach((e, i) => {
    sheet.appendRow([i + 1, e.parasha, e.customer, e.items, dateStr]);
  });

  Logger.log('גיליון נוצר: ' + ss.getUrl());
}

// ══════════════════════════════════════════
//  ניקוי המסמך
// ══════════════════════════════════════════
function clearDocument() {
  if (!CONFIG.clearDocAfterSend) return;

  const doc  = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  body.clear();
  body.appendParagraph(`דוח שבועי נשלח ✅\nנוקה לשבוע הבא.\n`);

  Logger.log('המסמך נוקה');
}

// ══════════════════════════════════════════
//  הפעלה ראשית — כל שבוע
// ══════════════════════════════════════════
function generateWeeklyReport() {
  const entries = readDocEntries();

  if (!entries.length) {
    Logger.log('לא נמצאו ערכים במסמך — הדוח לא נשלח');
    return;
  }

  const { html, waText, dateStr, parashiot } = buildReport(entries);

  // שלח מייל
  if (CONFIG.reportEmail) {
    MailApp.sendEmail({
      to: CONFIG.reportEmail,
      subject: `${CONFIG.emailSubject} — ${parashiot} ${dateStr}`,
      htmlBody: html,
      name: 'משנת יוסף – מערכת'
    });
    Logger.log('✅ מייל נשלח ל-' + CONFIG.reportEmail);
  }

  // שמור לגיליון
  saveToSheet(entries, dateStr);

  // נקה מסמך
  clearDocument();

  Logger.log(`✅ דוח נשלח: ${entries.length} לקוחות`);

  return { entries, waText };
}

// ══════════════════════════════════════════
//  הרצה ידנית — לבדיקה
// ══════════════════════════════════════════
function runNow() {
  const result = generateWeeklyReport();
  if (result) {
    Logger.log('הודעת WhatsApp מוכנה:\n' + result.waText);
  }
}
