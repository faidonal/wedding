(function () {
  "use strict";

  // ---- Storage that never throws (private mode, blocked site data) ----
  var store = {
    get: function (k) {
      try { return window.localStorage.getItem(k); } catch (e) { return null; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem(k, v); } catch (e) {}
    },
    remove: function (k) {
      try { window.localStorage.removeItem(k); } catch (e) {}
    },
  };

  // ---- Mobile nav ----
  var nav = document.querySelector(".nav");
  var burger = document.getElementById("burgerBtn");
  var navLinks = document.getElementById("navLinks");

  function isOpen() {
    return navLinks.classList.contains("open");
  }

  function setMenu(open, returnFocus) {
    navLinks.classList.toggle("open", open);
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      var first = navLinks.querySelector("a");
      if (first) first.focus();
    } else if (returnFocus) {
      burger.focus();
    }
  }

  burger.addEventListener("click", function () {
    setMenu(!isOpen(), true);
  });
  navLinks.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      setMenu(false, false);
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen()) setMenu(false, true);
  });
  // Tabbing out of the open menu closes it, so focus never lands on hidden content
  document.addEventListener("focusin", function (e) {
    if (isOpen() && !nav.contains(e.target)) setMenu(false, false);
  });
  // Growing past the mobile breakpoint while the menu is open resets it
  var mobileQuery = window.matchMedia("(max-width: 720px)");
  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener("change", function (e) {
      if (!e.matches && isOpen()) setMenu(false, false);
    });
  }

  // ---- Nav colour change once the hero has scrolled away ----
  var hero = document.querySelector(".hero");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        nav.classList.toggle("scrolled", !entries[0].isIntersecting);
      },
      { rootMargin: "-" + nav.offsetHeight + "px 0px 0px 0px" }
    ).observe(hero);
  } else {
    var updateNav = function () {
      nav.classList.toggle(
        "scrolled",
        hero.getBoundingClientRect().bottom <= nav.offsetHeight
      );
    };
    window.addEventListener("scroll", updateNav, { passive: true });
    updateNav();
  }

  // ---- RSVP form: show attendance-only fields when attending ----
  var ATTEND_KEY = "weddingAttendance";
  var DECLINE = "Sorry can't come";
  var form = document.getElementById("rsvpForm");
  var attendanceOptions = form.querySelectorAll('input[name="attending"]');
  var attendingFields = document.getElementById("attendingFields");
  var accommodation = document.getElementById("faccommodation");
  var dietary = document.getElementById("fdiet");

  function updateAttendance(value) {
    var attending = value !== DECLINE;
    attendingFields.hidden = !attending;
    accommodation.required = attending;
    dietary.required = attending;
  }

  attendanceOptions.forEach(function (option) {
    option.addEventListener("change", function () {
      store.set(ATTEND_KEY, this.value);
      updateAttendance(this.value);
    });
  });

  // Restore the choice after a refresh (the browser's own restore wins)
  var checked = form.querySelector('input[name="attending"]:checked');
  var saved = checked ? checked.value : store.get(ATTEND_KEY);
  if (saved) {
    attendanceOptions.forEach(function (option) {
      option.checked = option.value === saved;
    });
    updateAttendance(saved);
  }

  // ---- RSVP submission to Google Sheet via Apps Script Web App ----
  var SHEET_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbz-1PETiXLazWDVoCk9_7qCIVPx4s1FHTfTeMV8IPHUV6Bh_EKEufWI9JLeOopqPYkkLQ/exec";
  var TIMEOUT_MS = 15000;

  var msg = document.getElementById("formMsg");
  var submitBtn = form.querySelector(".rsvp-submit");
  var honeypot = document.getElementById("fcompany");

  function setMsg(text, kind) {
    msg.textContent = text;
    msg.className = "form-msg" + (kind ? " " + kind : "");
  }

  function finishSent() {
    store.remove(ATTEND_KEY);
    form.reset();
    updateAttendance(null);
    setMsg("Thank you, your RSVP has been sent.", "ok");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    setMsg("", "");

    // Bots fill the hidden field; pretend it worked and send nothing
    if (honeypot && honeypot.value) {
      finishSent();
      return;
    }

    var data = new FormData(form);
    data.delete("company");

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    form.setAttribute("aria-busy", "true");

    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS)
      : null;

    // no-cors: the request reaches Google, but the reply can't be read here.
    // A failed network or a timeout is still caught below.
    fetch(SHEET_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      body: data,
      signal: controller ? controller.signal : undefined,
    })
      .then(finishSent)
      .catch(function (err) {
        setMsg(
          err && err.name === "AbortError"
            ? "This is taking too long. Check your connection, then send again."
            : "Your RSVP didn't send. Check your connection, then send again.",
          "err"
        );
      })
      .finally(function () {
        if (timer) clearTimeout(timer);
        submitBtn.disabled = false;
        submitBtn.textContent = "Send RSVP";
        form.removeAttribute("aria-busy");
      });
  });
})();
