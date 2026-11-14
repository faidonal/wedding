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

  // ---- Language: English is in the page, Swedish, Greek and Spanish in translations.js ----
  var LANGS = ["en", "sv", "el", "es"];
  // The html lang tag for each language (Spanish is the Mexican variant)
  var LANG_TAGS = { en: "en", sv: "sv", el: "el", es: "es-MX" };
  var LANG_KEY = "weddingLang";
  var dict = window.I18N || {};
  var listeners = [];
  var lang = "en";

  // Remember each element's English so switching back needs no second copy
  var originalText = new Map();
  var originalAttr = new Map();
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    originalText.set(el, el.textContent);
  });
  document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
    var attrs = {};
    el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
      var name = pair.split(":")[0].trim();
      attrs[name] = el.getAttribute(name);
    });
    originalAttr.set(el, attrs);
  });

  function t(key) {
    var table = dict[lang] || {};
    if (key in table) return table[key];
    return (dict.en && dict.en[key]) || key;
  }

  function applyLang(next) {
    lang = LANGS.indexOf(next) > -1 ? next : "en";
    document.documentElement.lang = LANG_TAGS[lang];
    document.title = t("meta.title");

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var table = dict[lang] || {};
      if (lang !== "en" && key in table) {
        el.textContent = table[key];
      } else if (originalText.has(el)) {
        el.textContent = originalText.get(el);
      } else {
        el.textContent = t(key); // set from code, e.g. the form message
      }
    });

    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var parts = pair.split(":");
        var name = parts[0].trim();
        var key = parts[1].trim();
        var table = dict[lang] || {};
        var value =
          lang !== "en" && key in table
            ? table[key]
            : (originalAttr.get(el) || {})[name];
        if (value != null) el.setAttribute(name, value);
      });
    });

    document.querySelectorAll(".lang-switch [data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.lang === lang ? "true" : "false");
    });
    listeners.forEach(function (fn) { fn(lang); });
  }

  function initialLang() {
    var fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (fromUrl && LANGS.indexOf(fromUrl) > -1) return fromUrl;
    var saved = store.get(LANG_KEY);
    if (saved && LANGS.indexOf(saved) > -1) return saved;
    var prefs = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < prefs.length; i++) {
      var code = String(prefs[i]).toLowerCase().slice(0, 2);
      if (code === "sv" || code === "el" || code === "es") return code;
      if (code === "en") return "en";
    }
    return "en";
  }

  document.querySelectorAll(".lang-switch [data-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
      store.set(LANG_KEY, b.dataset.lang);
      applyLang(b.dataset.lang);
    });
  });

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
    burger.setAttribute("aria-label", t(open ? "nav.close" : "nav.open"));
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
  listeners.push(function () {
    burger.setAttribute("aria-label", t(isOpen() ? "nav.close" : "nav.open"));
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
  // Growing past the menu-button breakpoint while the menu is open resets it.
  // Keep in sync with the MENU BUTTON media query in css/styles.css.
  var MENU_QUERY = "(max-width: 1024px)";
  var mobileQuery = window.matchMedia(MENU_QUERY);
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

  // ---- Programme rows arrive in order, once, when the list scrolls in ----
  var programme = document.querySelector(".programme-list");
  if (programme && "IntersectionObserver" in window) {
    programme.querySelectorAll(".programme-item").forEach(function (item, i) {
      item.style.setProperty("--i", i);
    });
    document.documentElement.classList.add("js-reveal");
    var revealer = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          programme.classList.add("in-view");
          revealer.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" }
    );
    revealer.observe(programme);
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

  // Messages carry their key, so they re-translate if the language changes
  function setMsg(key, kind) {
    if (key) {
      msg.setAttribute("data-i18n", key);
      msg.textContent = t(key);
    } else {
      msg.removeAttribute("data-i18n");
      msg.textContent = "";
    }
    msg.className = "form-msg" + (kind ? " " + kind : "");
  }

  function finishSent() {
    store.remove(ATTEND_KEY);
    form.reset();
    updateAttendance(null);
    setMsg("form.sent", "ok");
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
    submitBtn.textContent = t("form.sending");
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
          err && err.name === "AbortError" ? "form.timeout" : "form.failed",
          "err"
        );
      })
      .finally(function () {
        if (timer) clearTimeout(timer);
        submitBtn.disabled = false;
        submitBtn.textContent = t("form.submit");
        form.removeAttribute("aria-busy");
      });
  });

  // ---- Gallery: a pile of prints, dealt one by one as you scroll ----
  // While the section is pinned, scrolling moves through "stages": at stage k,
  // photo k is on top. Between stages the top photo is lifted off to the left
  // in one arc and slid in at the back of the pile, while the photos beneath
  // follow it up one after another. Each photo rests before the next deal.
  // The drawn position eases toward the scroll position every frame, so a
  // mouse wheel's notches glide instead of jumping.
  var gallery = document.getElementById("gallery");
  var stack = gallery && gallery.querySelector(".stack");
  if (stack) {
    var cards = [].slice.call(stack.querySelectorAll(".stack-card"));
    var images = cards.map(function (card) { return card.querySelector("img"); });
    var count = cards.length;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    var SHRINK = 0.03; // each photo underneath is 3% smaller
    var SHADE = 0.14; // and this much darker
    var REST = 0.18; // share of each deal's scroll spent resting on a photo
    var TILT = -5; // degrees the dealt photo turns at the height of its arc
    var LIFT = 0.06; // how far it rises, as a share of its height
    var FOLLOW = 0.22; // how late each photo beneath starts moving up
    var DRIFT = 0.06; // the picture inside drifts against the photo's motion
    var SMOOTHING = 110; // ms for the drawn position to close most of the gap

    var clamp = function (v) { return Math.min(Math.max(v, 0), 1); };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var easeInOut = function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

    // Scroll progress 0–1 → stage 0…count-1, holding still at each photo
    var stageAt = function (progress) {
      var deals = count - 1;
      var stage = 0;
      for (var k = 0; k < deals; k++) {
        var local = clamp((progress - k / deals) * deals);
        stage += easeInOut(clamp((local - REST) / (1 - 2 * REST)));
      }
      return stage;
    };

    // Resting tilt for each photo while it lies in the pile, like loose prints
    var REST_TILT = [-1.4, 1.1, -0.7, 1.5, -1.0];
    var restTilt = function (i) { return REST_TILT[i % REST_TILT.length]; };

    // Layout measured once (and on resize), not every frame
    var layout = { widths: [], frameH: 0, peek: 0 };
    var readLayout = function () {
      var peekShare = parseFloat(getComputedStyle(gallery).getPropertyValue("--peek")) || 0.045;
      layout.frameH = stack.offsetHeight;
      layout.peek = peekShare * layout.frameH;
      layout.widths = cards.map(function (card) { return card.offsetWidth; });
    };

    // Where the scroll position says we should be: the stage, and how far the
    // pile has fanned out (0 while the section is still below the screen)
    var target = { stage: 0, fan: 0 };
    var drawn = { stage: 0, fan: 0 };
    var measure = function () {
      var rect = gallery.getBoundingClientRect();
      var distance = gallery.offsetHeight - window.innerHeight;
      target.stage = stageAt(distance > 0 ? clamp(-rect.top / distance) : 0);
      target.fan = easeOut(clamp(1 - rect.top / window.innerHeight));
      return rect;
    };

    // Resting place of photo i, `depth` places down a pile topped by photo
    // `top`, measured from the centre. It sits centred under the top photo,
    // shifted right by `depth` peeks, so a wider print sticks out evenly on
    // both sides. A narrower one would hide completely, so it lines up with
    // the top photo's right edge instead and its peek still shows.
    var place = function (i, depth, top) {
      var scale = 1 - depth * SHRINK;
      var centred = depth * layout.peek;
      var rightAligned = layout.widths[top] / 2 + depth * layout.peek - (layout.widths[i] * scale) / 2;
      var x = Math.max(centred, rightAligned);
      return {
        x: x * drawn.fan,
        scale: lerp(1, scale, drawn.fan),
        tilt: depth > 0 ? restTilt(i) * drawn.fan : 0,
      };
    };
    var leftEdge = function (i, at) { return at.x - (layout.widths[i] * at.scale) / 2; };

    var draw = function () {
      var stage = drawn.stage;
      var k = Math.min(Math.floor(stage), count - 2);
      var t = stage - k;
      var next = (k + 1) % count;
      var dealt = k % count;

      // Where every other photo starts and ends this deal, and the leftmost
      // edge any of them reaches, so the dealt photo can clear them all
      var moves = [];
      var leftmost = Infinity;
      cards.forEach(function (card, i) {
        if (i === dealt) return;
        var depth = (i - k + count) % count;
        var a = place(i, depth, dealt);
        var b = place(i, depth - 1, next);
        moves[i] = { depth: depth, a: a, b: b };
        leftmost = Math.min(leftmost, leftEdge(i, a), leftEdge(i, b));
      });

      cards.forEach(function (card, i) {
        var x, y = 0, scale, tilt, z, shade, drift = 0;

        if (i === dealt) {
          // One continuous arc: out to the left, up a little, then under
          var p = easeInOut(t);
          var arc = Math.sin(Math.PI * t);
          var from = place(i, 0, dealt);
          var to = place(i, count - 1, next);
          var mid = lerp(from.x, to.x, 0.5);
          var away = Math.max(0, mid + layout.widths[i] * 0.51 - leftmost + 16);
          x = lerp(from.x, to.x, p) - away * arc;
          y = -LIFT * layout.frameH * arc;
          scale = lerp(from.scale, to.scale, p) + 0.02 * arc;
          tilt = TILT * arc + lerp(from.tilt, to.tilt, p);
          z = t < 0.5 ? 30 : 0;
          shade = SHADE * (count - 1) * clamp((t - 0.5) * 2) * drawn.fan;
          drift = DRIFT * layout.widths[i] * Math.cos(Math.PI * t) * arc; // trails the motion
        } else {
          // Move up one place, each photo starting a little after the one above
          var m = moves[i];
          var delay = FOLLOW * m.depth / (count - 1);
          var u = easeInOut(clamp((t - delay) / (1 - delay)));
          x = lerp(m.a.x, m.b.x, u);
          scale = lerp(m.a.scale, m.b.scale, u);
          tilt = lerp(m.a.tilt, m.b.tilt, u);
          z = 20 - m.depth;
          shade = SHADE * lerp(m.depth, m.depth - 1, u) * drawn.fan;
        }

        card.style.transform =
          "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) rotate(" +
          tilt.toFixed(2) + "deg) scale(" + scale.toFixed(4) + ")";
        card.style.zIndex = z;
        card.style.setProperty("--shade", shade.toFixed(3));
        images[i].style.transform =
          "translate3d(" + drift.toFixed(1) + "px,0,0) scale(1.08)";
      });
    };

    var running = false;
    var last = 0;
    var tick = function (now) {
      var dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      var rect = measure();
      var ease = 1 - Math.exp(-dt / SMOOTHING);
      drawn.stage += (target.stage - drawn.stage) * ease;
      drawn.fan += (target.fan - drawn.fan) * ease;
      draw();
      var settled =
        Math.abs(target.stage - drawn.stage) < 0.0005 &&
        Math.abs(target.fan - drawn.fan) < 0.0005;
      var offscreen = rect.bottom < 0 || rect.top > window.innerHeight;
      if (settled || offscreen) {
        drawn.stage = target.stage;
        drawn.fan = target.fan;
        draw();
        running = false;
        last = 0;
      } else {
        requestAnimationFrame(tick);
      }
    };
    var wake = function () {
      if (running || !gallery.classList.contains("is-pinned")) return;
      running = true;
      requestAnimationFrame(tick);
    };

    // Phones and reduced motion get the photos as a still, stacked column:
    // no pinning, no movement
    var phone = window.matchMedia("(max-width: 720px)");
    var setGalleryMode = function () {
      var pinned = !reduceMotion.matches && !phone.matches;
      gallery.classList.toggle("is-pinned", pinned);
      cards.forEach(function (card, i) {
        card.style.transform = "";
        card.style.zIndex = "";
        card.style.removeProperty("--shade");
        images[i].style.transform = "";
      });
      if (pinned) {
        gallery.style.setProperty("--deals", count - 1);
        readLayout();
        measure();
        drawn.stage = target.stage; // start where the page already is
        drawn.fan = target.fan;
        draw();
      }
    };

    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", function () {
      if (gallery.classList.contains("is-pinned")) { readLayout(); measure(); draw(); }
      wake();
    });
    if (reduceMotion.addEventListener) {
      reduceMotion.addEventListener("change", setGalleryMode);
      phone.addEventListener("change", setGalleryMode);
    }
    setGalleryMode();
  }

  // Apply the language last, once every listener above is registered
  applyLang(initialLang());
})();
