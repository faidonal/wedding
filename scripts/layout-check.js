/*
  Layout check for all three languages. Paste into the browser console (or a
  preview tool's JavaScript runner) on the running site, at each width you want
  to test. It switches EN → SV → ΕΛ with the page's own language buttons and
  returns, per language, a list of problems; an empty list means that
  language fits at this width.

  Checks: sideways scroll, anything past the screen edge, text spilling out
  of its card or panel, clipped labels or headings, buttons that wrapped onto
  two lines, the desktop nav running into the monogram or RSVP button, and
  any [data-i18n] text still in English.
*/
(async () => {
  const W = Math.min(innerWidth, screen.width || innerWidth);
  const out = { width: W };
  const btn = (l) => document.querySelector('.lang-switch [data-lang="' + l + '"]');
  const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const label = (e) => e.getAttribute("data-i18n") || e.id || (typeof e.className === "string" && e.className) || e.tagName;

  btn("en").click();
  const english = [...document.querySelectorAll("[data-i18n]")].map((e) => e.textContent.trim());

  for (const l of ["en", "sv", "el", "es"]) {
    btn(l).click();
    await document.fonts.ready;
    await settle();
    const r = [];

    if (document.documentElement.scrollWidth > W + 1) r.push("page scrolls sideways (" + document.documentElement.scrollWidth + "px wide)");

    document.querySelectorAll("main *, nav *, header *, footer *").forEach((e) => {
      const b = e.getBoundingClientRect();
      if (b.width && (b.right > W + 1 || b.left < -1) && !e.closest(".nav-links:not(.open)") && getComputedStyle(e).position !== "fixed")
        r.push("past the screen edge: " + label(e));
    });

    document.querySelectorAll(".rsvp-shell, .basic-item, .programme-item, .detail-card, .faq-item, .travel-col").forEach((box) => {
      const bb = box.getBoundingClientRect();
      box.querySelectorAll("*").forEach((e) => {
        const b = e.getBoundingClientRect();
        if (b.width && b.right > bb.right + 1) r.push("spills out of " + box.className + ": " + label(e));
      });
    });

    document.querySelectorAll(".btn, .lang-switch button, label, legend, .nav-links a, h1, h2, h3, .value").forEach((e) => {
      if (e.offsetParent && !e.closest(".sr-only") && e.scrollWidth > e.clientWidth + 1) r.push("clipped: " + label(e));
    });

    document.querySelectorAll(".btn, .lang-switch button").forEach((e) => {
      const h = e.getBoundingClientRect().height;
      if (e.offsetParent && h > 60) r.push("button wraps onto two lines: " + label(e));
    });

    const links = document.getElementById("navLinks");
    const cta = document.querySelector(".nav-inner > .nav-cta");
    const mark = document.querySelector(".nav-mark");
    if (getComputedStyle(links).position !== "fixed") {
      const lb = links.getBoundingClientRect(), cb = cta.getBoundingClientRect(), mb = mark.getBoundingClientRect();
      if (lb.right > cb.left - 8) r.push("nav links run into the RSVP button");
      if (lb.left < mb.right + 8) r.push("nav links run into the monogram");
      if (lb.height > 50) r.push("nav links wrap onto two lines");
    } else {
      const bar = [mark, cta, document.getElementById("burgerBtn")].map((e) => e.getBoundingClientRect());
      for (let i = 0; i < bar.length - 1; i++) if (bar[i].right > bar[i + 1].left) r.push("items in the top bar overlap");
    }

    if (l !== "en") {
      const same = [];
      document.querySelectorAll("[data-i18n]").forEach((e, i) => {
        const t = e.textContent.trim();
        if (t && t === english[i] && t !== "RSVP") same.push(e.getAttribute("data-i18n"));
      });
      if (same.length) r.push("still in English: " + same.join(", "));
    }

    out[l] = [...new Set(r)];
  }
  btn("en").click();
  return out;
})();
