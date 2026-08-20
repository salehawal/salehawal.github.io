/*********************************************************************
 * GOOGLE MEET BOOKING SYSTEM — BACKEND (Google Apps Script)
 * ---------------------------------------------------------------
 * SETUP:
 * 1. Go to https://script.google.com -> New Project
 * 2. Delete the default code, paste this whole file in
 * 3. Edit the CONFIG block below to match your availability & meeting types
 * 4. Click Deploy > New deployment > Type: "Web app"
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. Copy the Web App URL and paste it into WEB_APP_URL in booking-widget.js
 *
 * TO CHANGE ANYTHING LATER (hours, meeting types, notice period, etc.):
 * Just edit CONFIG below, save, then Deploy > Manage deployments > pencil
 * icon > Version: "New version" > Deploy. The live widget updates instantly,
 * no changes needed in Blogger.
 *********************************************************************/

const CONFIG = {
  CALENDAR_ID: 'primary',              // 'primary' = your main calendar, or paste another calendar's ID
  TIMEZONE: 'Africa/Cairo',            // your timezone, e.g. 'Africa/Cairo'

  MIN_NOTICE_HOURS: 4,                 // can't book less than X hours before the slot
  MAX_ADVANCE_DAYS: 30,                // can't book more than X days into the future
  MAX_DAILY_BOOKED_HOURS: 6,           // stop offering slots once this many hours are already booked that day

  SLOT_STEP_MINUTES: 15,               // granularity of slot start times (9:00, 9:15, 9:30 ...)

  ADMIN_EMAIL: 'you@example.com',      // you get an email every time someone books

  // Availability per weekday. 0 = Sunday ... 6 = Saturday. Empty array = closed that day.
  // You can add more than one window per day, e.g.
  // 1: [{start:'09:00', end:'12:00'}, {start:'14:00', end:'18:00'}]
  WORKING_HOURS: {
    0: [],
    1: [{ start: '09:00', end: '17:00' }],
    2: [{ start: '09:00', end: '17:00' }],
    3: [{ start: '09:00', end: '17:00' }],
    4: [{ start: '09:00', end: '17:00' }],
    5: [{ start: '09:00', end: '14:00' }],
    6: []
  },

  // Meeting types shown to the user. Emojis are welcome in title/description.
  // durationMinutes controls both the slot length AND the calendar event length.
  MEETING_TYPES: [
    { id: 'discovery', title: '🔍 Discovery Call',   description: 'A quick 15-minute intro chat to see if we\'re a good fit.', durationMinutes: 15 },
    { id: 'consult',   title: '💡 Consultation',      description: 'A focused 30-minute session to dig into your project.',    durationMinutes: 30 },
    { id: 'strategy',  title: '🎯 Strategy Session',  description: 'A deep 60-minute planning session for your roadmap.',      durationMinutes: 60 },
    { id: 'followup',  title: '🔁 Follow-up',         description: 'A 20-minute check-in on progress and next steps.',         durationMinutes: 20 }
  ]
};

/*********************  DO NOT EDIT BELOW THIS LINE  *********************/

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'getConfig') {
      return jsonOut({ ok: true, meetingTypes: CONFIG.MEETING_TYPES });
    }
    if (action === 'getMonth') {
      return jsonOut({ ok: true, days: getMonthAvailability(e.parameter.type, Number(e.parameter.year), Number(e.parameter.month)) });
    }
    if (action === 'getDay') {
      return jsonOut({ ok: true, slots: getDaySlots(e.parameter.type, e.parameter.date) });
    }
    return jsonOut({ ok: false, error: 'unknown action' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'book') {
      return jsonOut(createBooking(body));
    }
    return jsonOut({ ok: false, error: 'unknown action' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getMeetingType(id) {
  return CONFIG.MEETING_TYPES.filter(function (t) { return t.id === id; })[0];
}

// Returns array of 'yyyy-MM-dd' strings for every day in the month that has at least one free slot
function getMonthAvailability(typeId, year, month) {
  const type = getMeetingType(typeId);
  if (!type) return [];

  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0);
  const monthEnd = new Date(year, month - 1, daysInMonth, 23, 59, 59);

  const cal = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  const events = cal.getEvents(monthStart, monthEnd);

  const busyByDay = {};
  events.forEach(function (ev) {
    const key = Utilities.formatDate(ev.getStartTime(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    if (!busyByDay[key]) busyByDay[key] = [];
    busyByDay[key].push({ start: ev.getStartTime(), end: ev.getEndTime() });
  });

  const now = new Date();
  const minBookable = new Date(now.getTime() + CONFIG.MIN_NOTICE_HOURS * 3600000);
  const maxBookable = new Date(now.getTime() + CONFIG.MAX_ADVANCE_DAYS * 86400000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const result = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if (date < todayStart) continue;
    if (date > maxBookable) continue;

    const dow = date.getDay();
    const windows = CONFIG.WORKING_HOURS[dow];
    if (!windows || windows.length === 0) continue;

    const dateStr = Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    const busy = busyByDay[dateStr] || [];
    const slots = computeSlotsForDay(date, windows, type.durationMinutes, busy, minBookable);
    if (slots.length > 0) result.push(dateStr);
  }
  return result;
}

// Returns [{startISO, label}] for one specific day
function getDaySlots(typeId, dateStr) {
  const type = getMeetingType(typeId);
  if (!type) return [];

  const parts = dateStr.split('-');
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const dow = date.getDay();
  const windows = CONFIG.WORKING_HOURS[dow];
  if (!windows || windows.length === 0) return [];

  const now = new Date();
  const minBookable = new Date(now.getTime() + CONFIG.MIN_NOTICE_HOURS * 3600000);
  const maxBookable = new Date(now.getTime() + CONFIG.MAX_ADVANCE_DAYS * 86400000);
  if (date > maxBookable) return [];

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  const cal = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  const events = cal.getEvents(dayStart, dayEnd);
  const busy = events.map(function (ev) { return { start: ev.getStartTime(), end: ev.getEndTime() }; });

  const slots = computeSlotsForDay(date, windows, type.durationMinutes, busy, minBookable);
  return slots.map(function (s) {
    return { startISO: s.toISOString(), label: Utilities.formatDate(s, CONFIG.TIMEZONE, 'HH:mm') };
  });
}

function computeSlotsForDay(date, windows, durationMinutes, busyEvents, minBookable) {
  const slots = [];
  let bookedMinutesToday = 0;
  busyEvents.forEach(function (b) { bookedMinutesToday += (b.end - b.start) / 60000; });
  if (bookedMinutesToday >= CONFIG.MAX_DAILY_BOOKED_HOURS * 60) return [];

  windows.forEach(function (w) {
    const winStart = toDateTime(date, w.start);
    const winEnd = toDateTime(date, w.end);
    let cursor = new Date(winStart);

    while (cursor.getTime() + durationMinutes * 60000 <= winEnd.getTime()) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + durationMinutes * 60000);

      const overlaps = busyEvents.some(function (b) { return slotStart < b.end && slotEnd > b.start; });
      const tooSoon = slotStart < minBookable;
      const overDailyCap = (bookedMinutesToday + durationMinutes) > CONFIG.MAX_DAILY_BOOKED_HOURS * 60;

      if (!overlaps && !tooSoon && !overDailyCap) slots.push(slotStart);
      cursor = new Date(cursor.getTime() + CONFIG.SLOT_STEP_MINUTES * 60000);
    }
  });
  return slots;
}

function toDateTime(date, hhmm) {
  const parts = hhmm.split(':');
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Number(parts[0]), Number(parts[1]), 0);
}

function createBooking(body) {
  const type = getMeetingType(body.typeId);
  if (!type) return { ok: false, error: 'Invalid meeting type' };
  if (!body.name || !body.email || !body.phone || !body.startISO) {
    return { ok: false, error: 'Missing required fields' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const start = new Date(body.startISO);
    const end = new Date(start.getTime() + type.durationMinutes * 60000);
    const dateStr = Utilities.formatDate(start, CONFIG.TIMEZONE, 'yyyy-MM-dd');

    // revalidate the slot is still free (prevents double-booking / race conditions)
    const availableToday = getDaySlots(body.typeId, dateStr);
    const stillFree = availableToday.some(function (s) { return s.startISO === start.toISOString(); });
    if (!stillFree) return { ok: false, error: 'That slot was just booked by someone else. Please pick another.' };

    const cal = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    const event = cal.createEvent(
      type.title + ' with ' + body.name,
      start,
      end,
      {
        description: 'Meeting type: ' + type.title + '\nName: ' + body.name + '\nEmail: ' + body.email + '\nPhone: ' + body.phone,
        guests: body.email,
        sendInvite: true
      }
    );

    if (CONFIG.ADMIN_EMAIL) {
      MailApp.sendEmail(CONFIG.ADMIN_EMAIL, 'New booking: ' + type.title,
        'Name: ' + body.name + '\nEmail: ' + body.email + '\nPhone: ' + body.phone + '\nWhen: ' + start.toString());
    }

    return { ok: true, eventId: event.getId() };
  } finally {
    lock.releaseLock();
  }
}
