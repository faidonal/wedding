---
name: translate
description: Bring the wedding site's Swedish and Greek translations up to date after English wording changes in index.html or the "en" block of js/translations.js. Use when the user edits English copy, adds or removes text, asks to sync or update the translations, or runs /translate.
---

# Update the Swedish and Greek translations

English is the source. It lives in `index.html` (every `[data-i18n]` element's
text and every `[data-i18n-attr]` attribute) and in the `en` block of
`js/translations.js` (strings that only exist in code). Swedish (`sv`) and
Greek (`el`) live in `js/translations.js`. `js/translations.source.json`
records the English each translation was written from.

## 1. Find what changed

```bash
node scripts/i18n.mjs check --json
```

- `changed`: the English was reworded. `was` is the old English, `english`
  the new one, `current` the existing translations. Retranslate from the new
  English, keeping the current translation's wording where the meaning did
  not change.
- `added`: a new key. Translate it.
- `removed`: a key no longer on the page. Delete it from that language.
- `missing`: a key the page uses that a language lacks. Translate it.
- `problems`: fix these in `index.html` first (usually a `data-i18n` element
  that wraps other tags: put the text in its own `<span data-i18n="…">`).

If everything is empty, tell the user the translations are already up to
date and stop.

New English text needs a key before it can be translated. If the user added
text without a `data-i18n` attribute, add one, named like its neighbours
(`faq.9.q`, `details.music.p`), and put it on the element that holds only
the text.

## 2. Write the translations

Edit `js/translations.js`, keeping each key in the same position in `sv` and
`el` as on the page. Translate the meaning and the warmth, not word by word.
These are wedding guests, so keep it friendly and clear.

**Swedish (`sv`)**
- Address guests as "ni" (plural), never "du".
- RSVP is "OSA"; "the RSVP form" is "OSA-formuläret".
- Times: 24-hour with a full stop, e.g. "15.30", "kl. 12.00".
- Dates: "29 maj 2027"; months and weekdays lower case mid-sentence.
- Dashes: a spaced en dash " – ". Quotes: ”…”.

**Greek (`el`)**
- Address guests in the polite plural (σας, εσείς).
- The question mark is ";" (Greek erotimatiko), not "?".
- Times: 24-hour with a colon, e.g. "15:30".
- Dates: month in the genitive, e.g. "29 Μαΐου 2027", "1 Φεβρουαρίου";
  "1η Απριλίου" for the 1st.
- Quotes: «…». Keep accents; never write accented Greek in capitals.
- "RSVP" stays "RSVP" on the nav button (short); in sentences use "φόρμα
  απάντησης" for the RSVP form.

**Both languages**
- Keep names and places as written: Kirsten, Faidon, Hatfield Regis Grange,
  The Wheatsheaf Inn, Moreton-in-Marsh, London Paddington, postcodes.
- Never translate an `<option value>` or `<input value>`: those values go to
  the Google Sheet and must stay English. Only the visible text is keyed.
- Keep the numbers, dates and times the English gives, converted to the local
  format above. If the English itself looks wrong (a date that disagrees with
  another part of the page), translate it as written and point it out.

## 3. Record and re-check

```bash
node scripts/i18n.mjs snapshot
node scripts/i18n.mjs check
```

The check must print "Translations are up to date with the English."

Then bump the cache-busting version on `js/translations.js` in `index.html`
(`translations.js?v=N` → `N+1`), and on any other file you changed, so
returning guests do not get the old text.

## 4. Check the layout in every language

Longer Swedish or Greek text can break the layout (the nav, buttons, the
form). Serve the site and run `scripts/layout-check.js` in the page at
widths 1440, 1024, 768, 390 and 320:

1. Start the preview with the `wedding-site` config in `.claude/launch.json`.
   If the server cannot read the project folder (macOS blocks the preview's
   Python from Documents), copy the site into your scratchpad directory
   (`rsync -a --delete --exclude .git --exclude .claude ./ <scratchpad>/site/`),
   point the config's command at that copy, and start it again. Re-copy after
   every edit.
2. At each width: resize the preview, reload the page with a fresh query
   string (`?c=<n>`) so it does not use cached files, then run the check in
   the page (the server serves the script too):
   `await eval(await fetch('/scripts/layout-check.js?c=<n>').then(r => r.text()))`
3. Each language should come back as an empty list. Fix anything listed: a
   shorter translation first if the meaning allows, otherwise CSS (let the
   element wrap or shrink; the nav switches to the menu button at 1024px and
   below, set in `css/styles.css` and `MENU_QUERY` in `js/main.js`).
4. Run the check again until every width is clean.

## 5. Report

List each updated key as English → Swedish → Greek, say which widths were
checked and what (if anything) you changed to fix the layout, and suggest a
native speaker glance over the new lines. Do not commit unless the user asks.
