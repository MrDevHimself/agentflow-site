/**
 * AgentFlow lead log.
 *
 * Paste this into a Google Sheet (Extensions > Apps Script), then
 * Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
 * Copy the web app URL into src/booking.ts (LEAD_LOG_URL).
 *
 * Then add a trigger (clock icon > Add trigger): function checkStalled,
 * time-driven, every 15 minutes. It emails you about forms left half-way.
 *
 * Every visitor to the booking form gets one row, updated as they type.
 */

const SHEET = "Leads";
const STALLED_MINUTES = 30;
const HEADERS = [
  "Session", "Started", "Last update", "Status", "Stopped at",
  "Name", "Phone", "Email", "Profile link", "Agency and areas",
  "Listings (6 months)", "Where listings come from", "OK with N$1,500 ad spend",
  "Notified", "Follow-up notes",
];
const FIELDS = {
  name: "Name", phone: "Phone", email: "Email", profile: "Profile link",
  agency: "Agency and areas", listings: "Listings (6 months)",
  source: "Where listings come from", adspend: "OK with N$1,500 ad spend",
};
const STATUS_RANK = { "Started": 0, "Not yet eligible": 1, "Form done": 2, "Booked": 3 };

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sh;
}

function col_(name) { return HEADERS.indexOf(name) + 1; }

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data.sid || String(data.sid).length > 64) return out_("bad");
    const sh = sheet_();
    const now = new Date();
    const ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().flat();
    let row = ids.indexOf(data.sid) + 2;
    if (row < 2) {
      sh.appendRow([data.sid, now]);
      row = sh.getLastRow();
    }
    const vals = data.values || {};
    Object.keys(FIELDS).forEach(function (k) {
      if (vals[k] !== undefined) sh.getRange(row, col_(FIELDS[k])).setValue(safe_(vals[k]));
    });
    sh.getRange(row, col_("Last update")).setValue(now);
    if (data.at) sh.getRange(row, col_("Stopped at")).setValue(safe_(String(data.at).slice(0, 60)));

    // Status only ever moves forward.
    const cur = sh.getRange(row, col_("Status")).getValue() || "Started";
    const next = data.status || "Started";
    if ((STATUS_RANK[next] || 0) >= (STATUS_RANK[cur] || 0)) {
      sh.getRange(row, col_("Status")).setValue(next);
      if (next !== cur && (next === "Booked" || next === "Form done")) notify_(row, next);
    }
    return out_("ok");
  } finally {
    lock.releaseLock();
  }
}

// Stops typed text like "=IMPORTXML(...)" running as a formula in the sheet.
function safe_(s) {
  s = String(s).slice(0, 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function doGet() { return out_("AgentFlow lead log is running."); }

function out_(s) { return ContentService.createTextOutput(s); }

function rowText_(row) {
  const sh = sheet_();
  const v = sh.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  return HEADERS.slice(3, 13).map(function (h, i) { return h + ": " + (v[i + 3] || "-"); }).join("\n");
}

function notify_(row, what) {
  const sh = sheet_();
  const name = sh.getRange(row, col_("Name")).getValue() || "Someone";
  const subject = what === "Booked"
    ? "AgentFlow: " + name + " booked a call"
    : "AgentFlow: " + name + " finished the form";
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), subject,
    rowText_(row) + "\n\nOpen the sheet: " + SpreadsheetApp.getActiveSpreadsheet().getUrl());
}

/** Run every 15 minutes: emails you about forms left half-way with a phone number. */
function checkStalled() {
  const sh = sheet_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const rows = sh.getRange(2, 1, n, HEADERS.length).getValues();
  const now = Date.now();
  rows.forEach(function (v, i) {
    const status = v[col_("Status") - 1];
    const last = new Date(v[col_("Last update") - 1]).getTime();
    const phone = v[col_("Phone") - 1];
    const notified = v[col_("Notified") - 1];
    if (status === "Started" && phone && !notified && now - last > STALLED_MINUTES * 60000) {
      const name = v[col_("Name") - 1] || "Someone";
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(),
        "AgentFlow: " + name + " started the form but stopped",
        rowText_(i + 2) + "\n\nOpen the sheet: " + SpreadsheetApp.getActiveSpreadsheet().getUrl());
      sh.getRange(i + 2, col_("Notified")).setValue(new Date());
    }
  });
}
