// Mobile nav toggle
  var burger = document.getElementById('burgerBtn');
  var navLinks = document.getElementById('navLinks');
  burger.addEventListener('click', function(){
    var isOpen = navLinks.classList.toggle('open');
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
  navLinks.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){
      navLinks.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // ---- Nav colour transition after hero ----

var nav = document.querySelector('.nav');
var hero = document.querySelector('.hero');

function updateNav() {
  var heroBottom = hero.getBoundingClientRect().bottom;

  if (heroBottom <= nav.offsetHeight) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', updateNav);
updateNav();

  // ---- RSVP submission to Google Sheet via Apps Script Web App ----

  var SHEET_ENDPOINT = "REPLACE_WITH_YOUR_APPS_SCRIPT_WEB_APP_URL";

  var form = document.getElementById('rsvpForm');
  var msg = document.getElementById('formMsg');

  form.addEventListener('submit', function(e){
    e.preventDefault();
    msg.className = 'form-msg';
    msg.textContent = '';

    if (SHEET_ENDPOINT.indexOf('REPLACE_WITH') === 0) {
      msg.textContent = 'Form is not yet connected — see setup instructions.';
      msg.className = 'form-msg err';
      return;
    }

    var data = new FormData(form);
    var submitBtn = form.querySelector('.rsvp-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    fetch(SHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      body: data
    }).then(function(){
      msg.textContent = 'Thank you — your RSVP has been received!';
      msg.className = 'form-msg ok';
      form.reset();
    }).catch(function(){
      msg.textContent = 'Something went wrong. Please try again or email us directly.';
      msg.className = 'form-msg err';
    }).finally(function(){
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send RSVP';
    });
  });

// ---- RSVP form conditional logic ----
var attendanceOptions = document.querySelectorAll('input[name="attending"]');
var attendingFields = document.getElementById('attendingFields');
var accommodation = document.getElementById('faccommodation');
var dietary = document.getElementById('fdiet');

function updateAttendance(value) {
  var isAttending = value === 'Yes!';

  attendingFields.style.display = isAttending ? '' : 'none';
  accommodation.required = isAttending;
  dietary.required = isAttending;
}

attendanceOptions.forEach(function(option) {
  option.addEventListener('change', function() {
    localStorage.setItem('weddingAttendance', this.value);
    updateAttendance(this.value);
  });
});

// Restore selection after refresh
var savedAttendance = localStorage.getItem('weddingAttendance');

if (savedAttendance) {
  attendanceOptions.forEach(function(option) {
    option.checked = option.value === savedAttendance;
  });

  updateAttendance(savedAttendance);
}