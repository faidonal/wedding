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

  // ---- RSVP submission to Google Sheet via Apps Script Web App ----
  // 1. Follow the setup instructions provided alongside this file to create
  //    your Apps Script Web App and paste its URL below.
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
const attendanceOptions = document.querySelectorAll('input[name="attending"]');
const attendingFields = document.getElementById('attendingFields');
const accommodation = document.getElementById('faccommodation');
const dietary = document.getElementById('fdiet');

attendanceOptions.forEach(option => {
  option.addEventListener('change', () => {

    if (option.value === "Sorry can't come") {
      attendingFields.style.display = 'none';

      accommodation.required = false;
      dietary.required = false;

      accommodation.value = '';
      dietary.value = '';
    } else {
      attendingFields.style.display = 'block';

      accommodation.required = true;
      dietary.required = true;
    }

  });
});