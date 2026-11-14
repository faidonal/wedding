# Wedding website

## Structure
- `index.html` — page content and semantic structure
- `css/tokens.css` — colours, fonts, type scale, spacing and other design tokens
- `css/typography.css` — reusable typography styles
- `css/styles.css` — layout and component styling
- `js/main.js` — mobile navigation, language switch and RSVP behaviour
- `js/translations.js` — Swedish and Greek text, keyed to `data-i18n` attributes in `index.html`
- `js/translations.source.json` — the English each translation was written from
- `scripts/i18n.mjs` — reports English wording the translations haven't caught up with
- `scripts/layout-check.js` — browser check that every language fits at a given width
- `images/` — local site imagery

The site remains plain HTML/CSS/JavaScript, so it works directly with GitHub Pages and requires no build step.

## Translations

English lives in `index.html`. After changing English wording, run `/translate` in Claude Code to update the Swedish and Greek, or check by hand with:

```
node scripts/i18n.mjs check
```

A pre-commit hook warns (without blocking) when a commit changes the English but not the translations. Turn it on once per clone:

```
git config core.hooksPath .githooks
```

When CSS or JS files change, bump their `?v=` number in `index.html` so returning visitors don't get a cached copy.
