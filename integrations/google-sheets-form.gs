/**
 * Portfolio contact form → Google Sheet (+ optional email notification).
 *
 * Setup (one time, about 3 minutes):
 *  1. Create a new Google Sheet (e.g. "Portfolio messages").
 *  2. In the sheet: Extensions → Apps Script. Delete the sample code and paste this whole file. Save.
 *  3. Deploy → New deployment → gear icon → "Web app".
 *       Execute as: Me        Who has access: Anyone
 *     Click Deploy and allow the permissions it asks for (it needs your sheet, and Gmail for the notification).
 *  4. Copy the "Web app URL" (ends in /exec) and paste it into contactForm.endpoint in src/data/content.ts.
 *
 * If you edit this script later: Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy.
 * The URL stays the same.
 *
 * The endpoint is public by nature, so it defends itself: a honeypot and a time trap stop simple bots,
 * every field is validated and length-capped, and rate limits stop floods from filling the sheet or
 * using up the daily Gmail quota (~100 emails/day on a free account).
 */

const SHEET_NAME = "Messages";
// Every enquiry is emailed here. Works from any Google account: the email is sent by whoever deployed
// the script, to this address. Set to "" to turn notifications off.
const NOTIFY_EMAIL = "asvakamalak@gmail.com";

// Keep in sync with LIMITS in src/components/Contact.tsx
const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;
const MAX_PAGE = 300;

const MIN_SECONDS_ON_PAGE = 3; // humans take longer than this to fill the form
const MAX_PER_EMAIL_PER_HOUR = 3;
const MAX_PER_HOUR = 30; // across everyone
const MAX_EMAILS_PER_DAY = 40; // notifications; rows are still saved beyond this

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function doPost(e) {
  const p = (e && e.parameter) || {};

  // Bots: filled the hidden field, or submitted faster than a person could. Pretend it worked.
  if (p._gotcha) return json({ ok: true });
  if (p._t !== undefined && Number(p._t) < MIN_SECONDS_ON_PAGE) return json({ ok: true });

  const name = singleLine(p.name).slice(0, MAX_NAME);
  const email = singleLine(p.email).slice(0, MAX_EMAIL);
  const message = String(p.message || "").replace(/\r\n?/g, "\n").trim().slice(0, MAX_MESSAGE);
  const page = singleLine(p.page).slice(0, MAX_PAGE);
  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 10) return json({ ok: false, error: "invalid" });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json({ ok: false, error: "busy" });
  try {
    const cache = CacheService.getScriptCache();
    if (!underLimit(cache, "all", MAX_PER_HOUR, 3600) || !underLimit(cache, "e:" + email.toLowerCase(), MAX_PER_EMAIL_PER_HOUR, 3600)) {
      return json({ ok: false, error: "rate_limited" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Received", "Name", "Email", "Message", "Page", "Status"]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#1a120d").setFontColor("#f8f3ea");
      sheet.setColumnWidth(4, 420);
    }
    sheet.appendRow([new Date(), cell(name), cell(email), cell(message), cell(page), "New"]);

    if (NOTIFY_EMAIL && underLimit(cache, "mail:" + today(), MAX_EMAILS_PER_DAY, 86400)) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        replyTo: email,
        name: "Portfolio",
        subject: "New portfolio enquiry from " + name,
        body: message + "\n\n" + name + " <" + email + ">",
        htmlBody: notificationHtml(name, email, message, page),
      });
    }
    return json({ ok: true });
  } catch (err) {
    console.error(err); // visible in Apps Script → Executions; never sent back to the visitor
    return json({ ok: false, error: "server" });
  } finally {
    lock.releaseLock();
  }
}

/** Visiting the URL in a browser shows this, handy to check the deployment works. */
function doGet() {
  return json({ ok: true, info: "Portfolio contact endpoint is live." });
}

/** Counts a hit against a rolling window; false once `max` is reached. */
function underLimit(cache, key, max, seconds) {
  const n = Number(cache.get(key) || 0);
  if (n >= max) return false;
  cache.put(key, String(n + 1), seconds);
  return true;
}

function today() {
  return Utilities.formatDate(new Date(), "UTC", "yyyy-MM-dd");
}

/** One line of plain text: no control characters or line breaks (keeps the email subject/header clean). */
function singleLine(v) {
  return String(v || "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
}

/** Stops spreadsheet formula injection: values starting with = + - @ tab or CR are stored as text. */
function cell(s) {
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function notificationHtml(name, email, message, page) {
  return (
    '<div style="font-family:Arial,sans-serif;max-width:560px">' +
    '<h2 style="margin:0 0 12px">New message from your portfolio</h2>' +
    "<p><b>Name:</b> " + escapeHtml(name) + "<br><b>Email:</b> " + escapeHtml(email) + "</p>" +
    '<p style="white-space:pre-wrap;background:#f8f3ea;padding:14px;border-radius:8px">' + escapeHtml(message) + "</p>" +
    '<p style="color:#888;font-size:12px">Sent from ' + escapeHtml(page) + ". Reply to this email to answer them directly.</p>" +
    "</div>"
  );
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
