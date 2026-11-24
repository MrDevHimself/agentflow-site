/**
 * AgentFlow lead log.
 *
 * Paste this into a Google Sheet (Extensions > Apps Script), then
 * Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
 * Copy the web app URL into src/booking.ts (LEAD_LOG_URL).
 *
 * Alerts go to Discord: in Discord, Server settings > Integrations > Webhooks >
 * New webhook, pick the channel, Copy webhook URL. In Apps Script, Project
 * settings > Script properties > Add: DISCORD_WEBHOOK = that URL.
 * Run testDiscord once to check it works (and approve the permissions).
 * Without a webhook, alerts come by email instead.
 *
 * Then add a trigger (clock icon > Add trigger): function checkStalled,
 * time-driven, every 15 minutes. It alerts you about forms left half-way.
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
      if (next !== cur && next !== "Started") alert_(row, next);
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

// Where alerts go. Set DISCORD_WEBHOOK in Project Settings > Script properties,
// never in this file (the website code is public on GitHub).
const SEND_EMAIL_TOO = false;
const COLOURS = { "Booked": 0x16a34a, "Form done": 0x2563eb, "Stopped partway": 0xf59e0b, "Not yet eligible": 0x9ca3af };

function alert_(row, what) {
  const sh = sheet_();
  const v = sh.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  const get = function (h) { return String(v[col_(h) - 1] || "").trim(); };
  const name = get("Name") || "Someone";
  const titles = {
    "Booked": "📅 " + name + " booked a call",
    "Form done": "✅ " + name + " finished the form",
    "Stopped partway": "⏸️ " + name + " stopped at: " + (get("Stopped at") || "?"),
    "Not yet eligible": name + " doesn't qualify yet (under 3 listings)",
  };
  const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();

  const hook = PropertiesService.getScriptProperties().getProperty("DISCORD_WEBHOOK");
  if (hook) {
    const fields = HEADERS.slice(5, 13)
      .map(function (h) { return { name: h, value: (get(h) || "–").slice(0, 1000), inline: h !== "Agency and areas" && h !== "Where listings come from" }; });
    const phone = get("Phone").replace(/[^\d]/g, "");
    let desc = "[Open the sheet](" + sheetUrl + ")";
    if (phone) desc = "[WhatsApp them](https://wa.me/" + phone + ") · " + desc;
    UrlFetchApp.fetch(hook, {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({
        username: "AgentFlow Leads",
        allowed_mentions: { parse: [] },
        embeds: [{ title: titles[what].slice(0, 250), description: desc, color: COLOURS[what], fields: fields, timestamp: new Date().toISOString() }],
      }),
    });
  }
  if (SEND_EMAIL_TOO || !hook) {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), "AgentFlow: " + titles[what],
      rowText_(row) + "\n\nOpen the sheet: " + sheetUrl);
  }
}

/** Run every 15 minutes: alerts you about forms left half-way with a phone number. */
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
      alert_(i + 2, "Stopped partway");
      sh.getRange(i + 2, col_("Notified")).setValue(new Date());
    }
  });
}

/** Run once by hand after setting DISCORD_WEBHOOK, to check the channel gets a message. */
function testDiscord() {
  const sh = sheet_();
  sh.appendRow(["test-" + Date.now(), new Date(), new Date(), "Form done", "Finished", "Test Agent", "+264811234567",
    "test@example.com", "property24.com.na", "Test Realty, Klein Windhoek", "3 to 5", "Referrals", "Yes", "", "Test row, delete me"]);
  alert_(sh.getLastRow(), "Form done");
}
