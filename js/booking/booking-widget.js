/*********************************************************************
 * GOOGLE MEET BOOKING SYSTEM — FRONTEND WIDGET
 * ---------------------------------------------------------------
 * SETUP:
 * 1. Paste your Apps Script Web App /exec URL into WEB_APP_URL below.
 * 2. Host this file somewhere reachable (GitHub + jsDelivr/raw is fine).
 * 3. In your Blogger page/post HTML, add:
 *      <div id="gmeet-booking-widget"></div>
 *      <script src="https://YOUR-HOSTED-URL/booking-widget.js"></script>
 *    (if you skip the div, the widget appends itself to <body>)
 *
 * PERFORMANCE: this file makes exactly ONE network call on load
 * (?action=getAll), which returns every meeting type plus full
 * availability for the whole bookable window. Every step after that —
 * picking a type, flipping months, picking a day, picking a time — is
 * instant and reads from that cached data. The ONLY other network
 * call is the final booking submit, which actually writes to the
 * calendar.
 *
 * Everything else — meeting types, hours, notice period, max advance
 * days — is controlled entirely from Code.gs. This file never needs
 * to change again once WEB_APP_URL is set.
 *********************************************************************/
(function () {
  var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz5IXBgn1uyeBXlgsqaeYc7goK1EOSE43jl4npQfm3s27xL02vDoTweig-u8xiAKAu3fg/exec';

  var STEP_LABELS = ['Type', 'Date', 'Time', 'Details'];

  var CONTAINER_ID = 'gmeet-booking-widget';
  var container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    document.body.appendChild(container);
  }

  injectStyles();

  var state = {
    meetingTypes: [],
    availability: {},   // { typeId: { 'yyyy-mm-dd': [{startISO,label}] } }
    rangeStart: null,   // 'yyyy-mm-dd'
    rangeEnd: null,      // 'yyyy-mm-dd'
    selectedType: null,
    viewYear: null,
    viewMonth: null,     // 1-12
    selectedDate: null,
    selectedSlot: null
  };

  var today = new Date();
  state.viewYear = today.getFullYear();
  state.viewMonth = today.getMonth() + 1;

  renderShell('<div class="gmb-loading"><div class="gmb-spinner"></div><div>Loading available times…</div></div>');

  fetchJSON(WEB_APP_URL + '?action=getAll').then(function (res) {
    if (!res.ok) { showError('Could not load booking data.'); return; }
    state.meetingTypes = res.meetingTypes;
    state.availability = res.availability;
    state.rangeStart = res.rangeStart;
    state.rangeEnd = res.rangeEnd;
    renderTypeStep();
  }).catch(function () { showError('Could not connect to the booking service.'); });

  function fetchJSON(url) {
    return fetch(url).then(function (r) { return r.json(); });
  }

  function postJSON(url, data) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight on Apps Script
      body: JSON.stringify(data)
    }).then(function (r) { return r.json(); });
  }

  function showError(msg) {
    renderShell('<div class="gmb-error">⚠️ ' + msg + '</div>');
  }

  // ---------- shell / chrome ----------

  function renderShell(innerHtml, stepIndex) {
    var progressHtml = typeof stepIndex === 'number' ? renderProgress(stepIndex) : '';
    container.innerHTML =
      '<div class="gmb-widget">' +
        progressHtml +
        '<div class="gmb-body">' + innerHtml + '</div>' +
      '</div>';
  }

  function renderProgress(stepIndex) {
    var html = '<div class="gmb-progress">';
    STEP_LABELS.forEach(function (label, i) {
      var state_ = i < stepIndex ? 'done' : (i === stepIndex ? 'active' : '');
      html += '<div class="gmb-progress-step ' + state_ + '">' +
        '<div class="gmb-progress-dot">' + (i < stepIndex ? '✓' : (i + 1)) + '</div>' +
        '<div class="gmb-progress-label">' + label + '</div>' +
        '</div>';
      if (i < STEP_LABELS.length - 1) html += '<div class="gmb-progress-line ' + (i < stepIndex ? 'done' : '') + '"></div>';
    });
    html += '</div>';
    return html;
  }

  // ---------- step 1: meeting type ----------

  function renderTypeStep() {
    var html = '<h2 class="gmb-title">Choose a meeting type</h2>';
    html += '<div class="gmb-types">';
    state.meetingTypes.forEach(function (t) {
      html += '<button class="gmb-type-card" data-id="' + t.id + '">' +
        '<div class="gmb-type-title">' + t.title + '</div>' +
        '<div class="gmb-type-desc">' + t.description + '</div>' +
        '<div class="gmb-type-duration">⏱ ' + t.durationMinutes + ' min</div>' +
        '</button>';
    });
    html += '</div>';
    renderShell(html, 0);

    container.querySelectorAll('.gmb-type-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.selectedType = state.meetingTypes.filter(function (t) { return t.id === btn.dataset.id; })[0];
        var now = new Date();
        state.viewYear = now.getFullYear();
        state.viewMonth = now.getMonth() + 1;
        renderCalendarStep();
      });
    });
  }

  // ---------- step 2: calendar ----------

  function monthKey(y, m) { return y + '-' + pad(m); }

  function monthsWithAvailabilitySet() {
    var days = state.availability[state.selectedType.id] || {};
    var set = {};
    Object.keys(days).forEach(function (d) { set[d.slice(0, 7)] = true; });
    return set;
  }

  function renderCalendarStep() {
    drawCalendar();
  }

  function drawCalendar() {
    var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var firstDay = new Date(state.viewYear, state.viewMonth - 1, 1);
    var daysInMonth = new Date(state.viewYear, state.viewMonth, 0).getDate();
    var startWeekday = firstDay.getDay();
    var daysData = state.availability[state.selectedType.id] || {};
    var availSet = monthsWithAvailabilitySet();
    var curKey = monthKey(state.viewYear, state.viewMonth);
    var hasAnyThisMonth = !!availSet[curKey];

    var html = '<button class="gmb-back" id="gmb-back-to-types">&larr; Change meeting type</button>';
    html += '<h2 class="gmb-title">' + state.selectedType.title + '</h2>';
    html += '<div class="gmb-cal-nav">';
    html += '<button class="gmb-nav-btn" id="gmb-prev-month">&larr;</button>';
    html += '<span class="gmb-cal-label">' + monthNames[state.viewMonth - 1] + ' ' + state.viewYear + '</span>';
    html += '<button class="gmb-nav-btn" id="gmb-next-month">&rarr;</button>';
    html += '</div>';

    if (!hasAnyThisMonth) {
      html += '<div class="gmb-empty-msg">No availability this month.</div>';
    }

    html += '<div class="gmb-cal-grid">';
    ['S','M','T','W','T','F','S'].forEach(function (d) { html += '<div class="gmb-cal-dow">' + d + '</div>'; });
    for (var i = 0; i < startWeekday; i++) html += '<div class="gmb-cal-cell gmb-empty"></div>';
    var now = new Date();
    var isToday;
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = state.viewYear + '-' + pad(state.viewMonth) + '-' + pad(d);
      var isAvailable = !!daysData[dateStr];
      isToday = (state.viewYear === now.getFullYear() && state.viewMonth === now.getMonth() + 1 && d === now.getDate());
      html += '<div class="gmb-cal-cell ' + (isAvailable ? 'gmb-available' : 'gmb-unavailable') + (isToday ? ' gmb-today' : '') + '" data-date="' + dateStr + '">' + d + '</div>';
    }
    html += '</div>';

    renderShell(html, 1);

    document.getElementById('gmb-back-to-types').addEventListener('click', renderTypeStep);

    var isCurrentMonth = (state.viewYear === now.getFullYear() && state.viewMonth === now.getMonth() + 1);
    var prevBtn = document.getElementById('gmb-prev-month');
    if (isCurrentMonth) { prevBtn.disabled = true; prevBtn.classList.add('gmb-disabled'); }
    prevBtn.addEventListener('click', function () { if (!isCurrentMonth) { state.viewMonth--; if (state.viewMonth < 1) { state.viewMonth = 12; state.viewYear--; } drawCalendar(); } });

    var nextM = state.viewMonth + 1, nextY = state.viewYear;
    if (nextM > 12) { nextM = 1; nextY++; }
    var nextKey = monthKey(nextY, nextM);
    var nextBtn = document.getElementById('gmb-next-month');
    if (!availSet[nextKey]) { nextBtn.disabled = true; nextBtn.classList.add('gmb-disabled'); }
    nextBtn.addEventListener('click', function () { state.viewMonth = nextM; state.viewYear = nextY; drawCalendar(); });

    container.querySelectorAll('.gmb-available').forEach(function (cell) {
      cell.addEventListener('click', function () {
        state.selectedDate = cell.dataset.date;
        renderHoursStep();
      });
    });
  }

  // ---------- step 3a: hour picker, step 3b: minute picker ----------
  // Slot labels arrive from the backend already formatted per meeting type
  // (e.g. "10:15 AM"), computed using that type's own duration/step. We
  // group those into hour buckets client-side -- no backend change needed,
  // since the exact-minute options for a given hour are already correct
  // for whichever meeting type is selected; we're just presenting them in
  // two steps (pick an hour, then pick the minute) instead of one long list.

  function parseLabelParts(label) {
    var m = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(String(label).trim());
    if (!m) return null;
    return { hour12: Number(m[1]), minute: Number(m[2]), ampm: m[3].toUpperCase() };
  }

  // Unique per hour-of-day, e.g. "10AM", "1PM" -- used only as a grouping key.
  function hourBucketKey(label) {
    var p = parseLabelParts(label);
    return p ? (p.hour12 + p.ampm) : label;
  }

  // Zero-padded display form, e.g. "10 AM", "11 AM", "01 PM".
  function hourBucketDisplay(label) {
    var p = parseLabelParts(label);
    return p ? (pad(p.hour12) + ' ' + p.ampm) : label;
  }

  function renderHoursStep() {
    var daysData = state.availability[state.selectedType.id] || {};
    var slots = daysData[state.selectedDate] || [];

    // Slots arrive in chronological order from the backend, so the first
    // slot seen for each hour bucket is enough to fix that bucket's
    // position in the list -- no separate sort needed. We keep the first
    // slot's own startISO here too: clicking the hour books that exact
    // slot directly (the earliest genuinely open start in that hour for
    // this meeting type's duration), no separate minute step needed.
    var seen = {};
    var hours = [];
    slots.forEach(function (s) {
      var key = hourBucketKey(s.label);
      if (!seen[key]) {
        seen[key] = true;
        hours.push({ key: key, display: hourBucketDisplay(s.label), slot: s });
      }
    });

    var html = '<button class="gmb-back" id="gmb-back-to-cal">&larr; Back to calendar</button>';
    html += '<h2 class="gmb-title">' + formatNiceDate(state.selectedDate) + '</h2>';
    html += '<div class="gmb-slots">';
    if (hours.length === 0) {
      html += '<div class="gmb-empty-msg">No available times this day.</div>';
    } else {
      hours.forEach(function (h) {
        html += '<button class="gmb-slot-btn gmb-hour-btn" data-iso="' + h.slot.startISO + '">' + h.display + '</button>';
      });
    }
    html += '</div>';
    renderShell(html, 2);

    document.getElementById('gmb-back-to-cal').addEventListener('click', renderCalendarStep);
    container.querySelectorAll('.gmb-hour-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.selectedSlot = slots.filter(function (s) { return s.startISO === btn.dataset.iso; })[0];
        renderFormStep();
      });
    });
  }

  // ---------- step 4: details form ----------

  function renderFormStep() {
    var html = '<button class="gmb-back" id="gmb-back-to-slots">&larr; Back to times</button>';
    html += '<h2 class="gmb-title">' + state.selectedType.title + '</h2>';
    html += '<div class="gmb-summary-card">📅 ' + formatNiceDate(state.selectedDate) + '<br>⏰ ' + state.selectedSlot.label + '</div>';
    html += '<form id="gmb-form" class="gmb-form">';
    html += '<input required name="name" placeholder="Full name" class="gmb-input">';
    html += '<input required type="email" name="email" placeholder="Email address" class="gmb-input">';
    html += '<input required type="tel" name="phone" placeholder="Mobile number" class="gmb-input">';
    html += '<button type="submit" class="gmb-submit-btn">Confirm booking</button>';
    html += '<div class="gmb-form-msg" id="gmb-form-msg"></div>';
    html += '</form>';
    renderShell(html, 3);

    document.getElementById('gmb-back-to-slots').addEventListener('click', renderHoursStep);
    document.getElementById('gmb-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var msg = document.getElementById('gmb-form-msg');
      var submitBtn = e.target.querySelector('.gmb-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Booking…';
      msg.textContent = '';

      postJSON(WEB_APP_URL, {
        action: 'book',
        typeId: state.selectedType.id,
        startISO: state.selectedSlot.startISO,
        name: fd.get('name'),
        email: fd.get('email'),
        phone: fd.get('phone')
      }).then(function (res) {
        if (res.ok) {
          renderConfirmation();
        } else {
          msg.textContent = res.error || 'Something went wrong. Please try another time.';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirm booking';
        }
      }).catch(function () {
        msg.textContent = 'Network error. Please try again.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm booking';
      });
    });
  }

  function renderConfirmation() {
    var html =
      '<div class="gmb-confirm">' +
        '<div class="gmb-confirm-icon">✓</div>' +
        '<h2 class="gmb-title">You\'re booked!</h2>' +
        '<div class="gmb-summary-card">' + state.selectedType.title + '<br>📅 ' + formatNiceDate(state.selectedDate) + '<br>⏰ ' + state.selectedSlot.label + '</div>' +
        '<div class="gmb-confirm-note">A confirmation email with your Google Meet link is on its way.</div>' +
      '</div>';
    renderShell(html, 4);
  }

  // ---------- helpers ----------

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function formatNiceDate(dateStr) {
    var parts = dateStr.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();
  }

  function injectStyles() {
    if (document.getElementById('gmb-styles')) return;
    var style = document.createElement('style');
    style.id = 'gmb-styles';
    style.textContent = [
      '@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap");',
      '.gmb-widget{--gmb-primary:#4F46E5;--gmb-primary-dark:#4338CA;--gmb-bg:#F7F8FC;--gmb-text:#1F2430;--gmb-muted:#6B7280;--gmb-border:#E7E9F3;',
      '  width:100%;max-width:640px;margin:0 auto;font-family:"Poppins",system-ui,-apple-system,Arial,sans-serif;color:var(--gmb-text);box-sizing:border-box;',
      '  direction:ltr;text-align:left;unicode-bidi:isolate;',
      '  background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(31,36,48,0.08);overflow:hidden;border:1px solid var(--gmb-border);}',
      '.gmb-widget *{box-sizing:border-box;direction:ltr;}',
      /* The widget sits inside pages the site owner doesn't always control the
         CSS of (this one happens to be RTL/Arabic) -- headings, buttons, and
         divs can otherwise inherit the page's own typography/underline/RTL
         styling. This resets the raw elements we use before any of our own
         rules below apply their specific look, so nothing from the host page
         leaks in (a stray heading underline, a right-to-left flip that clips
         text, a themed button background, etc). */
      ':where(.gmb-widget) :where(h1,h2,h3,h4,p,div,button,input){',
      '  margin:0;padding:0;border:0;background:none;box-shadow:none;text-decoration:none;list-style:none;',
      '  font:inherit;color:inherit;text-align:inherit;line-height:normal;outline:none;-webkit-tap-highlight-color:transparent;}',
      ':where(.gmb-widget) button{appearance:none;-webkit-appearance:none;}',

      '.gmb-progress{display:flex;align-items:center;padding:24px 28px 4px;}',
      '.gmb-progress-step{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:56px;}',
      '.gmb-progress-dot{width:26px;height:26px;border-radius:50%;background:#E9EAF5;color:#9AA0B4;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;transition:.2s;}',
      '.gmb-progress-step.active .gmb-progress-dot{background:var(--gmb-primary);color:#fff;box-shadow:0 0 0 4px rgba(79,70,229,0.15);}',
      '.gmb-progress-step.done .gmb-progress-dot{background:#DCFCE7;color:#16A34A;}',
      '.gmb-progress-label{font-size:11px;color:#9AA0B4;font-weight:500;}',
      '.gmb-progress-step.active .gmb-progress-label{color:var(--gmb-primary);font-weight:600;}',
      '.gmb-progress-line{flex:1;height:2px;background:#E9EAF5;margin:0 2px 18px;border-radius:2px;}',
      '.gmb-progress-line.done{background:#BBF7D0;}',

      '.gmb-body{padding:24px 28px 32px;}',
      '.gmb-title{font-size:19px;font-weight:600;margin:4px 0 18px;}',

      '.gmb-loading{text-align:center;color:var(--gmb-muted);padding:60px 20px;font-size:14px;}',
      '.gmb-spinner{width:34px;height:34px;border-radius:50%;border:3px solid #E9EAF5;border-top-color:var(--gmb-primary);margin:0 auto 16px;animation:gmb-spin .8s linear infinite;}',
      '@keyframes gmb-spin{to{transform:rotate(360deg);}}',

      '.gmb-types{display:flex;flex-direction:column;gap:12px;}',
      '.gmb-type-card{text-align:left;padding:18px;border:1.5px solid var(--gmb-border);border-radius:14px;background:#fff;cursor:pointer;transition:.18s ease;}',
      '.gmb-type-card:hover{border-color:var(--gmb-primary);transform:translateY(-2px);box-shadow:0 8px 20px rgba(79,70,229,0.12);}',
      '.gmb-type-title{font-weight:600;font-size:16px;margin-bottom:6px;}',
      '.gmb-type-desc{font-size:13px;color:var(--gmb-muted);margin-bottom:12px;line-height:1.5;}',
      '.gmb-type-duration{font-size:12px;color:var(--gmb-primary);font-weight:600;background:#EEF0FF;display:inline-block;padding:3px 10px;border-radius:999px;}',

      '.gmb-back{background:none;border:none;color:var(--gmb-primary);cursor:pointer;padding:0;margin-bottom:16px;font-size:13px;font-weight:500;font-family:inherit;}',
      '.gmb-back:hover{text-decoration:underline;}',

      '.gmb-cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}',
      '.gmb-nav-btn{border:1.5px solid var(--gmb-border);background:#fff;border-radius:10px;width:34px;height:34px;cursor:pointer;font-size:14px;transition:.15s;}',
      '.gmb-nav-btn:hover:not(.gmb-disabled){border-color:var(--gmb-primary);color:var(--gmb-primary);}',
      '.gmb-nav-btn.gmb-disabled{opacity:.3;cursor:not-allowed;}',
      '.gmb-cal-label{font-weight:600;font-size:15px;}',
      '.gmb-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;}',
      '.gmb-cal-dow{text-align:center;font-size:11px;color:#9AA0B4;font-weight:600;padding:4px 0 8px;}',
      '.gmb-cal-cell{text-align:center;padding:11px 0;border-radius:10px;font-size:14px;position:relative;}',
      '.gmb-available{background:#EEF0FF;color:var(--gmb-primary);cursor:pointer;font-weight:600;transition:.15s;}',
      '.gmb-available:hover{background:var(--gmb-primary);color:#fff;transform:scale(1.06);}',
      '.gmb-unavailable{color:#D5D8E3;}',
      '.gmb-today.gmb-available::after,.gmb-today.gmb-unavailable::after{content:"";position:absolute;bottom:4px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--gmb-primary);}',

      '.gmb-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px;}',
      '.gmb-slot-btn{padding:11px 8px;border:1.5px solid var(--gmb-border);border-radius:12px;background:#fff;cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;transition:.15s;}',
      '.gmb-slot-btn:hover{border-color:var(--gmb-primary);background:#EEF0FF;color:var(--gmb-primary);transform:translateY(-1px);}',
      '.gmb-hour-btn{font-size:14px;font-weight:600;padding:14px 8px;}',

      '.gmb-summary-card{background:#EEF0FF;border-radius:14px;padding:16px 18px;font-size:14px;font-weight:500;line-height:1.7;margin-bottom:20px;color:var(--gmb-text);}',
      '.gmb-form{display:flex;flex-direction:column;gap:12px;max-width:380px;}',
      '.gmb-input{padding:13px 14px;border:1.5px solid var(--gmb-border);border-radius:12px;font-size:14px;font-family:inherit;transition:.15s;}',
      '.gmb-input:focus{outline:none;border-color:var(--gmb-primary);box-shadow:0 0 0 3px rgba(79,70,229,0.12);}',
      '.gmb-submit-btn{padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,var(--gmb-primary),var(--gmb-primary-dark));color:#fff;font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;transition:.15s;box-shadow:0 6px 16px rgba(79,70,229,0.28);}',
      '.gmb-submit-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 20px rgba(79,70,229,0.35);}',
      '.gmb-submit-btn:disabled{opacity:.7;cursor:not-allowed;}',
      '.gmb-form-msg{font-size:13px;color:#DC2626;font-weight:500;min-height:18px;}',

      '.gmb-confirm{text-align:center;padding:12px 0 6px;}',
      '.gmb-confirm-icon{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#22C55E,#16A34A);color:#fff;font-size:28px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;box-shadow:0 8px 20px rgba(34,197,94,0.3);animation:gmb-pop .4s ease;}',
      '@keyframes gmb-pop{0%{transform:scale(0);}70%{transform:scale(1.15);}100%{transform:scale(1);}}',
      '.gmb-confirm-note{font-size:13px;color:var(--gmb-muted);margin-top:4px;}',

      '.gmb-error{color:#DC2626;text-align:center;padding:40px 20px;font-size:14px;font-weight:500;}',
      '.gmb-empty-msg{color:var(--gmb-muted);margin:0 0 12px;font-size:13px;}',

      /* ---- mobile ----
         Below 640px (basically every phone) the widget breaks out to 98% of
         the actual device width, not just 98% of whatever column/padding
         the surrounding page puts it in -- the calc() trick below computes
         exactly the negative margin needed to do that regardless of how the
         widget is nested on the page. The progress bar at the top switches
         from stretching edge-to-edge (which crowds the step numbers and can
         wrap the labels on narrow screens) to a centered, tighter group. */
      '@media (max-width:640px){',
      '  .gmb-widget{width:98vw;max-width:98vw;margin-left:calc(50% - 49vw);margin-right:calc(50% - 49vw);border-radius:14px;}',
      '  .gmb-body{padding:18px 16px 24px;}',
      '  .gmb-progress{justify-content:center;padding:18px 10px 4px;}',
      '  .gmb-progress-step{min-width:44px;gap:4px;}',
      '  .gmb-progress-dot{width:24px;height:24px;font-size:11px;}',
      '  .gmb-progress-label{font-size:10px;}',
      '  .gmb-progress-line{max-width:28px;margin:0 2px 16px;}',
      '  .gmb-title{font-size:17px;}',
      '  .gmb-slots{grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;}',
      '  .gmb-form{max-width:none;}',
      '  .gmb-cal-cell{padding:9px 0;font-size:13px;}',
      '}',
      '@media (max-width:360px){',
      '  .gmb-progress-label{display:none;}',
      '  .gmb-progress-step{min-width:0;}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }
})();
