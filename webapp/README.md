# Family Recipes — iPhone/iPad web app

A mobile-first, installable web app for browsing the recipes in this repo:
search, category filters, favorites, recently-viewed, offline support, and a
password lock screen. No build tooling beyond a small Node script that
indexes the recipe `.md` files — everything else is plain HTML/CSS/JS.

## Local testing

```sh
node scripts/build-index.mjs   # generates data/recipes-index.json + content/
python3 -m http.server 8080    # or any static file server, from webapp/
```

Then open `http://localhost:8080` in Safari (or Chrome dev tools' device
emulation). Re-run the build script whenever recipe files change.

`data/recipes-index.json` and `content/` are generated — they're gitignored
and rebuilt on every deploy by `.github/workflows/deploy-pages.yml`.

## Changing the password

The lock screen is a **deterrent, not real security** — GitHub Pages is
public static hosting, so the recipe content is fetchable by anyone who
inspects the page source or network requests, regardless of the password.
It just keeps the URL from being casually browsable.

```sh
node scripts/generate-password-hash.mjs "your new password"
```

Paste the printed hash into `js/config.js` as `PASSWORD_HASH`.

## One-time setup to publish

1. Push this branch's changes to `main` (or merge the PR).
2. In the repo's GitHub Settings → Pages, set **Source** to **GitHub
   Actions**. (Only needs doing once — the workflow handles every deploy
   after that.)
3. The `Deploy Recipes web app to GitHub Pages` workflow runs on every push
   to `main` that touches `webapp/`, `recipes/`, or `anjas-cooking/`, and
   publishes the site to `https://<user>.github.io/<repo>/`.

## Adding it to an iPhone/iPad home screen

Open the published URL in Safari → Share → **Add to Home Screen**. It opens
full-screen, uses the app icon, and keeps working (previously viewed
recipes) with no signal.

## What's NOT covered

- No editing UI — recipes are still authored as `.md` files per
  `docs/RECIPE_FORMAT.md`; the app is read-only.
- Family ratings (`docs/RATINGS.md`) aren't surfaced per-recipe yet — only
  whatever a recipe file embeds inline.
