#!/usr/bin/env node
/*
  Translation drift checker for the wedding site. No dependencies; Node 18+.

  English is the source: it lives in index.html ([data-i18n] text and
  [data-i18n-attr] attributes) and in the "en" block of js/translations.js
  (strings that only exist in code). Swedish, Greek and Mexican
  Spanish live in js/translations.js. js/translations.source.json records the English each
  translation was written from, so a reworded English sentence shows up here.

    node scripts/i18n.mjs check          list what needs translating (exit 1 if anything does)
    node scripts/i18n.mjs check --json   the same, as JSON (used by /translate)
    node scripts/i18n.mjs snapshot       record the current English as translated
*/
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = join(ROOT, "index.html");
const TRANSLATIONS = join(ROOT, "js", "translations.js");
const SNAPSHOT = join(ROOT, "js", "translations.source.json");
const LANGS = ["sv", "el", "es"];

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
const tidy = (s) => decode(s).replace(/\s+/g, " ").trim();

function readAttrs(tag) {
  const attrs = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
}

/** English for every key the page uses: { key: text } */
function englishFromPage(html) {
  const out = {};
  const problems = [];
  const put = (key, text, where) => {
    if (key in out && out[key] !== text) problems.push(`key "${key}" has two different English texts (${where})`);
    out[key] = text;
  };
  // Text keys: an element carrying data-i18n whose content is plain text
  const seen = new Set();
  for (const m of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*\bdata-i18n="[^"]*"[^>]*)>([^<]*)<\/\1\s*>/gi)) {
    const key = readAttrs(m[2])["data-i18n"];
    seen.add(key);
    put(key, tidy(m[3]), "text");
  }
  // Any data-i18n element not matched above wraps other tags, which the
  // page script would flatten when it swaps the text
  for (const m of html.matchAll(/\bdata-i18n="([^"]*)"/g)) {
    if (!seen.has(m[1])) {
      problems.push(`data-i18n="${m[1]}" wraps other tags; give the text its own <span data-i18n>`);
    }
  }
  // Attribute keys: data-i18n-attr="placeholder:form.namesPh;alt:..."
  for (const m of html.matchAll(/<[a-z][a-z0-9]*\b([^>]*\bdata-i18n-attr="[^"]*"[^>]*)>/gi)) {
    const attrs = readAttrs(m[1]);
    for (const pair of attrs["data-i18n-attr"].split(";")) {
      const [name, key] = pair.split(":").map((s) => s.trim());
      if (!name || !key) continue;
      if (!(name in attrs)) problems.push(`data-i18n-attr names "${name}" but the element has no ${name} attribute`);
      else put(key, tidy(attrs[name]), name);
    }
  }
  return { english: out, problems };
}

function loadTranslations() {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(TRANSLATIONS, "utf8"), sandbox, { filename: "translations.js" });
  return sandbox.window.I18N || {};
}

function currentEnglish() {
  const { english, problems } = englishFromPage(readFileSync(HTML, "utf8"));
  const dict = loadTranslations();
  for (const [key, text] of Object.entries(dict.en || {})) {
    if (key in english) problems.push(`key "${key}" is in both index.html and the "en" block`);
    english[key] = tidy(text);
  }
  return { english, dict, problems };
}

function check() {
  const { english, dict, problems } = currentEnglish();
  const snapshot = existsSync(SNAPSHOT) ? JSON.parse(readFileSync(SNAPSHOT, "utf8")) : null;
  const report = { changed: [], added: [], removed: [], missing: {}, problems, snapshot: !!snapshot };

  for (const [key, text] of Object.entries(english)) {
    const was = snapshot ? snapshot[key] : undefined;
    const current = Object.fromEntries(LANGS.map((l) => [l, (dict[l] || {})[key] ?? null]));
    if (was === undefined) {
      if (snapshot || LANGS.some((l) => current[l] === null)) report.added.push({ key, english: text, current });
    } else if (was !== text) {
      report.changed.push({ key, was, english: text, current });
    }
  }
  const pageKeys = new Set(Object.keys(english));
  for (const l of LANGS) {
    const table = dict[l] || {};
    const missing = [...pageKeys].filter((k) => !(k in table));
    if (missing.length) report.missing[l] = missing;
    for (const k of Object.keys(table)) {
      if (pageKeys.has(k)) continue;
      const entry = report.removed.find((r) => r.key === k);
      if (entry) entry.langs.push(l);
      else report.removed.push({ key: k, langs: [l] });
    }
  }
  return report;
}

function pending(r) {
  return r.changed.length + r.added.length + r.removed.length + Object.keys(r.missing).length + r.problems.length;
}

const [cmd = "check", ...flags] = process.argv.slice(2);

if (cmd === "snapshot") {
  const { english, problems } = currentEnglish();
  if (problems.length) {
    console.error("Fix these first:\n- " + problems.join("\n- "));
    process.exit(1);
  }
  const sorted = Object.fromEntries(Object.keys(english).sort().map((k) => [k, english[k]]));
  writeFileSync(SNAPSHOT, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`Recorded ${Object.keys(sorted).length} English strings in js/translations.source.json`);
} else if (cmd === "check") {
  const r = check();
  if (flags.includes("--json")) {
    console.log(JSON.stringify(r, null, 2));
  } else if (!pending(r)) {
    console.log("Translations are up to date with the English.");
  } else {
    if (!r.snapshot) console.log("No js/translations.source.json yet: run `node scripts/i18n.mjs snapshot` once the translations match.\n");
    for (const c of r.changed) console.log(`CHANGED  ${c.key}\n  was: ${c.was}\n  now: ${c.english}\n`);
    for (const a of r.added) console.log(`NEW      ${a.key}\n  ${a.english}\n`);
    for (const x of r.removed) console.log(`UNUSED   ${x.key} (${x.langs.join(", ")}) is no longer on the page`);
    for (const [l, keys] of Object.entries(r.missing)) console.log(`MISSING  ${l}: ${keys.join(", ")}`);
    for (const p of r.problems) console.log(`PROBLEM  ${p}`);
    console.log("\nRun /translate in Claude Code to update Swedish, Greek and Spanish.");
  }
  process.exit(pending(r) ? 1 : 0);
} else {
  console.error("Usage: node scripts/i18n.mjs check [--json] | snapshot");
  process.exit(2);
}
