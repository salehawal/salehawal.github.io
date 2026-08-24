/*********************************************************************
 * GOOGLE MEET BOOKING SYSTEM — BACKEND (Google Apps Script)
 * ---------------------------------------------------------------
 * SETUP:
 * 1. Go to https://script.google.com -> New Project
 * 2. Delete the default code, paste this whole file in
 * 3. IMPORTANT — enable the Advanced Calendar Service (needed to attach
 *    a real Google Meet link to every booking):
 *      In the editor sidebar, click "Services" (the + icon) ->
 *      find "Google Calendar API" -> click Add.
 *    Without this step, Calendar.Events.insert below will fail.
 * 4. Edit the CONFIG block below to match your availability & meeting types
 * 5. Click Deploy > New deployment > Type: "Web app"
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 6. Copy the /exec Web App URL and paste it into WEB_APP_URL in booking-widget.js
 *
 * TO CHANGE ANYTHING LATER (hours, meeting types, notice period, etc.):
 * Just edit CONFIG below, save, then Deploy > Manage deployments > pencil
 * icon > Version: "New version" > Deploy. The live widget updates instantly,
 * no changes needed in Blogger.
 *
 * PERFORMANCE NOTE:
 * The frontend loads ALL availability (every meeting type, every bookable
 * day) in a single request when the page opens. Every step after that is
 * instant and uses zero network calls. The only other network call is the
 * final "Confirm booking" submit, which creates the calendar event (with a
 * Google Meet link) and sends the emails.
 *********************************************************************/

const CONFIG = {
  CALENDAR_ID: 'saleh.awal@gmail.com', // 'primary' = your main calendar, or paste another calendar's ID
  TIMEZONE: 'Africa/Cairo',            // your timezone, e.g. 'Africa/Cairo'

  MIN_NOTICE_HOURS: 2,                 // can't book less than X hours before the slot
  MAX_ADVANCE_DAYS: 15,                // can't book more than X days into the future
  MAX_DAILY_BOOKED_HOURS: 8,           // stop offering slots once this many hours are already booked that day

  BUFFER_MINUTES: 10,                  // required gap after one meeting ends before the next can start

  ADMIN_EMAIL: 'saleh.awal@gmail.com', // gets a rich confirmation email too, same as the booker

  LAL_LOGO_URL: 'https://salehawal.github.io/img/lal.svg',
  GOOGLE_MEET_LOGO_URL: 'https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-96dp/logo_meet_2020q4_color_2x_web_96dp.png',
  BRAND_NAME: 'Lal',

  // Availability per weekday. 0 = Sunday ... 6 = Saturday. Empty array = closed that day.
  // You can add more than one window per day, e.g.
  // 1: [{start:'09:00', end:'12:00'}, {start:'14:00', end:'18:00'}]
  WORKING_HOURS: {
    0: [{ start: '09:00', end: '11:00' }, { start: '13:00', end: '15:00' }],
    1: [{ start: '08:00', end: '10:00' }, { start: '14:00', end: '16:00' }],
    2: [{ start: '10:00', end: '12:00' }, { start: '15:00', end: '18:00' }],
    3: [{ start: '08:00', end: '11:00' }, { start: '13:00', end: '15:00' }],
    4: [{ start: '10:00', end: '12:00' }, { start: '14:00', end: '17:00' }],
    5: [{ start: '08:00', end: '10:00' }],
    6: [{ start: '09:00', end: '11:00' }, { start: '13:00', end: '15:00' }]
  },

  // Meeting types shown to the user. Emojis are welcome in title/description.
  // durationMinutes controls both the slot length AND the calendar event length.
  // Start times are NOT offered on a fixed grid (like every 15 or 30 minutes) --
  // instead the earliest genuinely open point is always offered first: the top
  // of a working-hours window if it's free, or BUFFER_MINUTES after whatever
  // existing booking/event is in the way. E.g. with a 20-minute meeting and a
  // 10-minute buffer: someone books 3:00–3:20, so the next open start offered
  // is 3:30 (not 3:15 or 3:45 from some fixed step), ending 3:50, and so on.
  // A slot never offered will end after your working-hours window closes —
  // e.g. if you're available until 15:00, the last offered start time for a
  // 20-minute session is 14:40, never later.
  MEETING_TYPES: [
    { id: 'discovery', title: '🔍 Discovery Open Session',   description: 'A quick intro chat to explore your needs.',        durationMinutes: 20 },
    { id: 'consult',   title: '💡 Needs Assessment Session', description: 'A focused session to dig into your project.',      durationMinutes: 60 },
    { id: 'followup',  title: '🔁 Follow-up Session',        description: 'A check-in on progress and next steps session.',   durationMinutes: 20 }
  ]
};

/*********************  DO NOT EDIT BELOW THIS LINE  *********************/

function doGet(e) {
  try {
    const action = e.parameter.action;

    // Primary endpoint: everything the widget needs, in one call.
    if (action === 'getAll') return jsonOut(getAllData());

    // Kept for debugging / backwards compatibility, not used by the widget itself.
    if (action === 'getConfig') return jsonOut({ ok: true, meetingTypes: CONFIG.MEETING_TYPES });
    if (action === 'getDay') return jsonOut({ ok: true, slots: getDaySlots(e.parameter.type, e.parameter.date) });

    return jsonOut({ ok: false, error: 'unknown action' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'book') return jsonOut(createBooking(body));
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

// One-shot payload: meeting types + full availability for every type, for the whole bookable window.
// This is the only call the widget makes before the user actually submits a booking.
function getAllData() {
  const now = new Date();
  const minBookable = new Date(now.getTime() + CONFIG.MIN_NOTICE_HOURS * 3600000);
  const maxBookable = new Date(now.getTime() + CONFIG.MAX_ADVANCE_DAYS * 86400000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const cal = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  const events = cal.getEvents(todayStart, maxBookable);

  const busyByDay = {};
  events.forEach(function (ev) {
    const key = Utilities.formatDate(ev.getStartTime(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    if (!busyByDay[key]) busyByDay[key] = [];
    busyByDay[key].push({ start: ev.getStartTime(), end: ev.getEndTime() });
  });

  const availability = {};
  CONFIG.MEETING_TYPES.forEach(function (type) {
    const days = {};
    let cursorDate = new Date(todayStart);
    while (cursorDate <= maxBookable) {
      const dow = cursorDate.getDay();
      const windows = CONFIG.WORKING_HOURS[dow];
      if (windows && windows.length > 0) {
        const dateStr = Utilities.formatDate(cursorDate, CONFIG.TIMEZONE, 'yyyy-MM-dd');
        const busy = busyByDay[dateStr] || [];
        const slots = computeSlotsForDay(cursorDate, windows, type.durationMinutes, busy, minBookable, CONFIG.BUFFER_MINUTES);
        if (slots.length > 0) {
          days[dateStr] = slots.map(function (s) {
            return { startISO: s.toISOString(), label: Utilities.formatDate(s, CONFIG.TIMEZONE, 'h:mm a') };
          });
        }
      }
      cursorDate = new Date(cursorDate.getTime() + 86400000);
    }
    availability[type.id] = days;
  });

  return {
    ok: true,
    meetingTypes: CONFIG.MEETING_TYPES,
    rangeStart: Utilities.formatDate(todayStart, CONFIG.TIMEZONE, 'yyyy-MM-dd'),
    rangeEnd: Utilities.formatDate(maxBookable, CONFIG.TIMEZONE, 'yyyy-MM-dd'),
    availability: availability
  };
}

// Used internally to re-validate a slot right before booking it (and available via ?action=getDay for debugging)
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

  const slots = computeSlotsForDay(date, windows, type.durationMinutes, busy, minBookable, CONFIG.BUFFER_MINUTES);
  return slots.map(function (s) {
    return { startISO: s.toISOString(), label: Utilities.formatDate(s, CONFIG.TIMEZONE, 'h:mm a') };
  });
}

// Computes the earliest-available start times for a day: the top of each
// working-hours window if it's free, otherwise BUFFER_MINUTES after
// whatever existing event is in the way -- never a fixed 15/30-min grid.
// This means two people booking "the same time" back-to-back naturally get
// pushed apart by exactly duration + buffer, with no gap larger than that.
function computeSlotsForDay(date, windows, durationMinutes, busyEvents, minBookable, bufferMinutes) {
  const slots = [];
  let bookedMinutesToday = 0;
  busyEvents.forEach(function (b) { bookedMinutesToday += (b.end - b.start) / 60000; });
  if (bookedMinutesToday >= CONFIG.MAX_DAILY_BOOKED_HOURS * 60) return [];

  const busy = busyEvents.slice().sort(function (a, b) { return a.start - b.start; });

  windows.forEach(function (w) {
    const winStart = toDateTime(date, w.start);
    const winEnd = toDateTime(date, w.end);
    let cursor = new Date(winStart);

    // The <= here is what guarantees a slot never runs past the end of your
    // working-hours window — e.g. available until 15:00 with a 20-min session
    // means the last offered start is 14:40 (ends exactly at 15:00), never later.
    while (cursor.getTime() + durationMinutes * 60000 <= winEnd.getTime()) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + durationMinutes * 60000);

      // If this candidate overlaps one or more existing events, skip straight
      // to BUFFER_MINUTES after the latest of those events ends, and try
      // again from there -- rather than advancing by a fixed step and
      // possibly re-checking (and re-rejecting) times still inside the
      // conflict.
      const conflicts = busy.filter(function (b) { return slotStart < b.end && slotEnd > b.start; });
      if (conflicts.length) {
        const latestEnd = conflicts.reduce(function (max, b) { return b.end > max ? b.end : max; }, conflicts[0].end);
        cursor = new Date(latestEnd.getTime() + bufferMinutes * 60000);
        continue;
      }

      const tooSoon = slotStart < minBookable;
      const overDailyCap = (bookedMinutesToday + durationMinutes) > CONFIG.MAX_DAILY_BOOKED_HOURS * 60;

      if (!tooSoon && !overDailyCap) slots.push(slotStart);

      // Next candidate always starts BUFFER_MINUTES after this one ends —
      // that's what keeps every offered slot at least a full gap apart.
      cursor = new Date(slotEnd.getTime() + bufferMinutes * 60000);
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

    // Create the event via the Advanced Calendar Service so we get a real
    // Google Meet link back (CalendarApp's basic service doesn't guarantee one).
    // Requires: Services (+) > Google Calendar API, added in the Apps Script editor.
    const eventResource = {
      summary: type.title + ' with ' + body.name,
      description: 'Meeting type: ' + type.title + '\nName: ' + body.name + '\nEmail: ' + body.email + '\nPhone: ' + body.phone,
      start: { dateTime: start.toISOString(), timeZone: CONFIG.TIMEZONE },
      end: { dateTime: end.toISOString(), timeZone: CONFIG.TIMEZONE },
      attendees: [{ email: body.email }],
      conferenceData: {
        createRequest: {
          requestId: Utilities.getUuid(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const event = Calendar.Events.insert(eventResource, CONFIG.CALENDAR_ID, {
      conferenceDataVersion: 1,
      sendUpdates: 'all'
    });

    const meetLink = event.hangoutLink ||
      (event.conferenceData && event.conferenceData.entryPoints &&
        (event.conferenceData.entryPoints.filter(function (p) { return p.entryPointType === 'video'; })[0] || {}).uri) || '';

    // Rich branded confirmation emails — failure here should never fail the booking itself
    try {
      sendBookingEmails(type, start, end, body, meetLink);
    } catch (emailErr) {
      // swallow — the calendar invite already went out, booking still succeeded
    }

    return { ok: true, eventId: event.id, meetLink: meetLink };
  } finally {
    lock.releaseLock();
  }
}

function sendBookingEmails(type, start, end, body, meetLink) {
  const dateLabel = Utilities.formatDate(start, CONFIG.TIMEZONE, 'EEEE, MMMM d, yyyy');
  const timeLabel = Utilities.formatDate(start, CONFIG.TIMEZONE, 'h:mm a') + ' – ' + Utilities.formatDate(end, CONFIG.TIMEZONE, 'h:mm a');

  // To the person who booked
  MailApp.sendEmail({
    to: body.email,
    subject: '✅ Confirmed: ' + type.title + ' — ' + dateLabel,
    htmlBody: buildBookingEmailHtml({
      heading: '✅ Booking Confirmed',
      intro: 'Your session is booked. Here are the details:',
      type: type, dateLabel: dateLabel, timeLabel: timeLabel, name: body.name, email: body.email, phone: body.phone,
      meetLink: meetLink,
      guide: 'Save this email or the calendar invite you just received — both include the Google Meet link. Join a couple of minutes early, in a quiet spot with a stable connection. If you need to reschedule or cancel, just reply to this email.'
    }),
    body: type.title + ' confirmed for ' + dateLabel + ', ' + timeLabel + (meetLink ? '\nJoin: ' + meetLink : '')
  });

  // To you (admin)
  if (CONFIG.ADMIN_EMAIL) {
    MailApp.sendEmail({
      to: CONFIG.ADMIN_EMAIL,
      subject: '📥 New booking: ' + type.title + ' — ' + dateLabel,
      htmlBody: buildBookingEmailHtml({
        intro: 'Someone just booked a session with you:',
        type: type, dateLabel: dateLabel, timeLabel: timeLabel, name: body.name, email: body.email, phone: body.phone,
        meetLink: meetLink,
        guide: 'This event is already on your calendar with the Google Meet link attached. The attendee has been sent their own confirmation and calendar invite.'
      }),
      body: 'New booking — ' + type.title + ' with ' + body.name + ' (' + body.email + ', ' + body.phone + ') on ' + dateLabel + ', ' + timeLabel + (meetLink ? '\nJoin: ' + meetLink : '')
    });
  }
}

function buildBookingEmailHtml(opts) {
  const meetButton = opts.meetLink
    ? '<a href="' + opts.meetLink + '" style="display:inline-block;background:#1a73e8;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:999px;margin-top:6px;">🎥 Join Google Meet</a>'
    : '<div style="font-size:13px;color:#999;">Meet link will be on the calendar invite.</div>';

  return (
    '<div style="background:#f4f6fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">' +
      '<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(20,20,50,0.08);">' +

        '<div style="padding:28px 24px 12px;text-align:center;background:#ffffff;">' +
          '<img src="' + CONFIG.LAL_LOGO_URL + '" alt="' + escapeHtml(CONFIG.BRAND_NAME) + '" style="height:38px;">' +
        '</div>' +

        '<div style="padding:0 24px 28px;text-align:center;">' +
          (opts.heading ? '<div style="display:inline-block;background:#e8f0fe;color:#1a56db;font-size:13px;font-weight:600;padding:6px 14px;border-radius:999px;margin-bottom:16px;">' + opts.heading + '</div>' : '') +
          '<div style="font-size:14px;color:#555;margin-bottom:20px;line-height:1.5;">' + escapeHtml(opts.intro) + '</div>' +

          '<div style="margin-bottom:20px;">' +
            '<img src="' + CONFIG.GOOGLE_MEET_LOGO_URL + '" alt="Google Meet" style="height:42px;">' +
          '</div>' +

          '<div style="font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:6px;">' + escapeHtml(opts.type.title) + '</div>' +
          '<div style="font-size:13px;color:#777;margin-bottom:24px;line-height:1.5;">' + escapeHtml(opts.type.description) + '</div>' +

          '<table style="width:100%;border-collapse:collapse;text-align:left;font-size:14px;color:#333;border-top:1px solid #eee;">' +
            '<tr><td style="padding:12px 4px;color:#888;border-bottom:1px solid #f0f0f0;">📅&nbsp; Date</td><td style="padding:12px 4px;text-align:right;font-weight:600;border-bottom:1px solid #f0f0f0;">' + opts.dateLabel + '</td></tr>' +
            '<tr><td style="padding:12px 4px;color:#888;border-bottom:1px solid #f0f0f0;">⏰&nbsp; Time</td><td style="padding:12px 4px;text-align:right;font-weight:600;border-bottom:1px solid #f0f0f0;">' + opts.timeLabel + '</td></tr>' +
            '<tr><td style="padding:12px 4px;color:#888;border-bottom:1px solid #f0f0f0;">👤&nbsp; Name</td><td style="padding:12px 4px;text-align:right;font-weight:600;border-bottom:1px solid #f0f0f0;">' + escapeHtml(opts.name) + '</td></tr>' +
            '<tr><td style="padding:12px 4px;color:#888;border-bottom:1px solid #f0f0f0;">✉️&nbsp; Email</td><td style="padding:12px 4px;text-align:right;font-weight:600;border-bottom:1px solid #f0f0f0;">' + escapeHtml(opts.email) + '</td></tr>' +
            '<tr><td style="padding:12px 4px;color:#888;">📱&nbsp; Phone</td><td style="padding:12px 4px;text-align:right;font-weight:600;">' + escapeHtml(opts.phone) + '</td></tr>' +
          '</table>' +

          '<div style="margin-top:24px;">' + meetButton + '</div>' +

          '<div style="margin-top:22px;padding:14px 16px;background:#f4f6fb;border-radius:10px;font-size:13px;color:#666;line-height:1.6;text-align:left;">' +
            escapeHtml(opts.guide) +
          '</div>' +
        '</div>' +

        '<div style="background:#fafafa;padding:16px;text-align:center;font-size:12px;color:#aaa;">' +
          'Sent by ' + escapeHtml(CONFIG.BRAND_NAME) +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
