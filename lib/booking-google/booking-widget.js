/*********************************************************************
 * GOOGLE MEET BOOKING SYSTEM — FRONTEND WIDGET
 * ---------------------------------------------------------------
 * SETUP:
 * 1. Paste your Apps Script Web App URL into WEB_APP_URL below.
 * 2. Host this file somewhere reachable (GitHub + jsDelivr/raw is fine).
 * 3. In your Blogger page/post HTML, add:
 *      <div id="gmeet-booking-widget"></div>
 *      <script src="https://salehawal.github.io/lib/booking-google/booking-widget.js"></script>
 *    (if you skip the div, the widget appends itself to <body>)
 *
 * Everything else — meeting types, hours, notice period, max advance
 * days — is controlled entirely from Code.gs. This file never needs
 * to change again once WEB_APP_URL is set.
 *********************************************************************/
(function () {
  var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz5IXBgn1uyeBXlgsqaeYc7goK1EOSE43jl4npQfm3s27xL02vDoTweig-u8xiAKAu3fg/exec';

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
    selectedType: null,
    viewYear: null,
    viewMonth: null, // 1-12
    availableDays: [],
    selectedDate: null,
    slots: [],
    selectedSlot: null
  };

  var today = new Date();
  state.viewYear = today.getFullYear();
  state.viewMonth = today.getMonth() + 1;

  container.innerHTML = '<div class="gmb-step gmb-loading">Loading...</div>';
  fetchJSON(WEB_APP_URL + '?action=getConfig').then(function (res) {
    if (!res.ok) { showError('Could not load meeting types.'); return; }
    state.meetingTypes = res.meetingTypes;
    renderTypeStep();
  }).catch(function () { showError('Could not connect to booking service.'); });

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
    container.innerHTML = '<div class="gmb-error">' + msg + '</div>';
  }

  function renderTypeStep() {
    var html = '<div class="gmb-step">';
    html += '<h2 class="gmb-title">Choose a meeting type</h2>';
    html += '<div class="gmb-types">';
    state.meetingTypes.forEach(function (t) {
      html += '<button class="gmb-type-card" data-id="' + t.id + '">' +
        '<div class="gmb-type-title">' + t.title + '</div>' +
        '<div class="gmb-type-desc">' + t.description + '</div>' +
        '<div class="gmb-type-duration">' + t.durationMinutes + ' min</div>' +
        '</button>';
    });
    html += '</div></div>';
    container.innerHTML = html;

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

  function renderCalendarStep() {
    container.innerHTML = '<div class="gmb-step gmb-loading">Loading availability...</div>';
    fetchJSON(WEB_APP_URL + '?action=getMonth&type=' + encodeURIComponent(state.selectedType.id) +
      '&year=' + state.viewYear + '&month=' + state.viewMonth).then(function (res) {
      state.availableDays = res.ok ? res.days : [];
      drawCalendar();
    });
  }

  function drawCalendar() {
    var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var firstDay = new Date(state.viewYear, state.viewMonth - 1, 1);
    var daysInMonth = new Date(state.viewYear, state.viewMonth, 0).getDate();
    var startWeekday = firstDay.getDay();

    var html = '<div class="gmb-step">';
    html += '<button class="gmb-back" id="gmb-back-to-types">&larr; Change meeting type</button>';
    html += '<h2 class="gmb-title">' + state.selectedType.title + '</h2>';
    html += '<div class="gmb-cal-nav">';
    html += '<button class="gmb-nav-btn" id="gmb-prev-month">&larr;</button>';
    html += '<span class="gmb-cal-label">' + monthNames[state.viewMonth - 1] + ' ' + state.viewYear + '</span>';
    html += '<button class="gmb-nav-btn" id="gmb-next-month">&rarr;</button>';
    html += '</div>';

    if (state.availableDays.length === 0) {
      html += '<div class="gmb-empty-msg">No availability this month.</div>';
    }

    html += '<div class="gmb-cal-grid">';
    ['S','M','T','W','T','F','S'].forEach(function (d) { html += '<div class="gmb-cal-dow">' + d + '</div>'; });
    for (var i = 0; i < startWeekday; i++) html += '<div class="gmb-cal-cell gmb-empty"></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = state.viewYear + '-' + pad(state.viewMonth) + '-' + pad(d);
      var isAvailable = state.availableDays.indexOf(dateStr) !== -1;
      html += '<div class="gmb-cal-cell ' + (isAvailable ? 'gmb-available' : 'gmb-unavailable') + '" data-date="' + dateStr + '">' + d + '</div>';
    }
    html += '</div></div>';
    container.innerHTML = html;

    document.getElementById('gmb-back-to-types').addEventListener('click', renderTypeStep);

    var now = new Date();
    var isCurrentMonth = (state.viewYear === now.getFullYear() && state.viewMonth === now.getMonth() + 1);
    var prevBtn = document.getElementById('gmb-prev-month');
    if (isCurrentMonth) { prevBtn.disabled = true; prevBtn.classList.add('gmb-disabled'); }
    prevBtn.addEventListener('click', function () { if (!isCurrentMonth) shiftMonth(-1); });

    var nextBtn = document.getElementById('gmb-next-month');
    // Once a month comes back with zero available days, don't let them wander further into the future
    if (state.availableDays.length === 0) { nextBtn.disabled = true; nextBtn.classList.add('gmb-disabled'); }
    nextBtn.addEventListener('click', function () { shiftMonth(1); });

    container.querySelectorAll('.gmb-available').forEach(function (cell) {
      cell.addEventListener('click', function () {
        state.selectedDate = cell.dataset.date;
        renderSlotsStep();
      });
    });
  }

  function shiftMonth(delta) {
    var m = state.viewMonth + delta;
    var y = state.viewYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    state.viewMonth = m;
    state.viewYear = y;
    renderCalendarStep();
  }

  function renderSlotsStep() {
    container.innerHTML = '<div class="gmb-step gmb-loading">Loading times...</div>';
    fetchJSON(WEB_APP_URL + '?action=getDay&type=' + encodeURIComponent(state.selectedType.id) +
      '&date=' + state.selectedDate).then(function (res) {
      state.slots = res.ok ? res.slots : [];
      drawSlots();
    });
  }

  function drawSlots() {
    var html = '<div class="gmb-step">';
    html += '<button class="gmb-back" id="gmb-back-to-cal">&larr; Back to calendar</button>';
    html += '<h2 class="gmb-title">' + formatNiceDate(state.selectedDate) + '</h2>';
    html += '<div class="gmb-slots">';
    if (state.slots.length === 0) {
      html += '<div class="gmb-empty-msg">No available times this day.</div>';
    } else {
      state.slots.forEach(function (s) {
        html += '<button class="gmb-slot-btn" data-iso="' + s.startISO + '">' + s.label + '</button>';
      });
    }
    html += '</div></div>';
    container.innerHTML = html;

    document.getElementById('gmb-back-to-cal').addEventListener('click', renderCalendarStep);
    container.querySelectorAll('.gmb-slot-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.selectedSlot = state.slots.filter(function (s) { return s.startISO === btn.dataset.iso; })[0];
        renderFormStep();
      });
    });
  }

  function renderFormStep() {
    var html = '<div class="gmb-step">';
    html += '<button class="gmb-back" id="gmb-back-to-slots">&larr; Back to times</button>';
    html += '<h2 class="gmb-title">' + state.selectedType.title + '</h2>';
    html += '<div class="gmb-summary">' + formatNiceDate(state.selectedDate) + ' at ' + state.selectedSlot.label + '</div>';
    html += '<form id="gmb-form" class="gmb-form">';
    html += '<input required name="name" placeholder="Full name" class="gmb-input">';
    html += '<input required type="email" name="email" placeholder="Email address" class="gmb-input">';
    html += '<input required type="tel" name="phone" placeholder="Mobile number" class="gmb-input">';
    html += '<button type="submit" class="gmb-submit-btn">Confirm booking</button>';
    html += '<div class="gmb-form-msg" id="gmb-form-msg"></div>';
    html += '</form></div>';
    container.innerHTML = html;

    document.getElementById('gmb-back-to-slots').addEventListener('click', renderSlotsStep);
    document.getElementById('gmb-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var msg = document.getElementById('gmb-form-msg');
      msg.textContent = 'Booking...';
      var submitBtn = e.target.querySelector('.gmb-submit-btn');
      submitBtn.disabled = true;

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
        }
      }).catch(function () {
        msg.textContent = 'Network error. Please try again.';
        submitBtn.disabled = false;
      });
    });
  }

  function renderConfirmation() {
    container.innerHTML =
      '<div class="gmb-step gmb-confirm">' +
      '<div class="gmb-confirm-icon">✅</div>' +
      '<h2 class="gmb-title">You\'re booked!</h2>' +
      '<div class="gmb-summary">' + state.selectedType.title + '<br>' +
      formatNiceDate(state.selectedDate) + ' at ' + state.selectedSlot.label + '</div>' +
      '<div class="gmb-confirm-note">A confirmation email is on its way.</div>' +
      '</div>';
  }

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
      '.gmb-step{max-width:640px;margin:0 auto;font-family:system-ui,-apple-system,Arial,sans-serif;}',
      '.gmb-title{font-size:20px;margin:8px 0 16px;}',
      '.gmb-types{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;}',
      '.gmb-type-card{text-align:left;padding:16px;border:1px solid #ddd;border-radius:10px;background:#fff;cursor:pointer;transition:.15s;}',
      '.gmb-type-card:hover{border-color:#4285f4;box-shadow:0 2px 8px rgba(0,0,0,.08);}',
      '.gmb-type-title{font-weight:600;font-size:16px;margin-bottom:4px;}',
      '.gmb-type-desc{font-size:13px;color:#555;margin-bottom:8px;}',
      '.gmb-type-duration{font-size:12px;color:#888;}',
      '.gmb-back{background:none;border:none;color:#4285f4;cursor:pointer;padding:0;margin-bottom:12px;font-size:14px;}',
      '.gmb-cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}',
      '.gmb-nav-btn{border:1px solid #ddd;background:#fff;border-radius:6px;padding:6px 12px;cursor:pointer;}',
      '.gmb-nav-btn.gmb-disabled{opacity:.3;cursor:not-allowed;}',
      '.gmb-cal-label{font-weight:600;}',
      '.gmb-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}',
      '.gmb-cal-dow{text-align:center;font-size:12px;color:#888;padding:4px 0;}',
      '.gmb-cal-cell{text-align:center;padding:10px 0;border-radius:8px;font-size:14px;}',
      '.gmb-available{background:#e8f0fe;color:#1a56db;cursor:pointer;font-weight:600;}',
      '.gmb-available:hover{background:#4285f4;color:#fff;}',
      '.gmb-unavailable{color:#ccc;}',
      '.gmb-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;}',
      '.gmb-slot-btn{padding:10px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;}',
      '.gmb-slot-btn:hover{border-color:#4285f4;background:#e8f0fe;}',
      '.gmb-form{display:flex;flex-direction:column;gap:10px;max-width:360px;}',
      '.gmb-input{padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;}',
      '.gmb-submit-btn{padding:12px;border:none;border-radius:8px;background:#4285f4;color:#fff;font-weight:600;cursor:pointer;}',
      '.gmb-summary{font-size:15px;color:#333;margin-bottom:12px;}',
      '.gmb-confirm{text-align:center;padding:30px 0;}',
      '.gmb-confirm-icon{font-size:40px;}',
      '.gmb-error{color:#c00;text-align:center;padding:20px;}',
      '.gmb-loading{text-align:center;color:#888;padding:30px 0;}',
      '.gmb-empty-msg{color:#888;margin:8px 0;}'
    ].join('');
    document.head.appendChild(style);
  }
})();