// Booking page settings. Change these two lines, push, and the site updates.

// The web app URL from the Google Sheet's Apps Script (Deploy > Web app).
// Leave empty and the form still works, it just doesn't log anything.
export const LEAD_LOG_URL = "https://script.google.com/macros/s/AKfycbw_4dNKvxqJW3VWu5RwQo_drdsBbHm2PTz7V2Rf0MZ8VkZWdLMgcrzoR0PqHdITwH64wQ/exec";

// Your Calendly link, e.g. "https://calendly.com/agentflow/strategy-call".
// Leave empty to keep using the Google Calendar booking page below.
export const CALENDLY_URL = "https://calendly.com/theagentflowmedia/30min";

export const GOOGLE_BOOKING_URL =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ1s9b6bxcsyzgHRuHrWrqKSvOYiVSpukN-JA4utaTzc0Hk54I0vTMgMA9V9sITcvtOoIuLgaRh4?gv=true";

// Agents below this many listings in the last 6 months aren't offered a call.
export const LISTINGS_OPTIONS = ["0 to 2", "3 to 5", "6 to 10", "More than 10"];
export const NOT_YET = "0 to 2";
