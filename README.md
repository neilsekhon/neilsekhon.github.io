# neilsekhon.com website

This repository contains the static files for Neil Sekhon’s personal website at
https://neilsekhon.com: a single-page timeline of projects.

## Analytics

[Google Analytics dashboard](https://analytics.google.com/analytics/web/#/a85630993p556498911/reports/intelligenthome) — visitors, page views, project views, and game plays. Events are documented in `ANALYTICS.md`.

## Why this folder exists

`~/Dev/neilsekhon.github.io` is the main local Git checkout used to edit and maintain
the website. Its GitHub remote is
https://github.com/neilsekhon/neilsekhon.github.io.
The repository name follows GitHub Pages’ personal-site naming convention, and
`CNAME` specifies the custom domain `neilsekhon.com`.

Keep this folder as the working copy for future website changes. The local folder
is not itself a running web server: deleting it does not delete the GitHub
repository or the published site. A fresh copy can be cloned from GitHub, provided
any local changes have first been committed and pushed.

## What is here

- `index.html`: the whole page, with its styles and scripts inline.
- `analytics.js`: Google Analytics, production hosts only.
- `media/`: project videos, posters, and the easter-egg sticker.
- `fonts/`: Geist.
- `favicon.png`, `apple-touch-icon.png`: tab and home-screen icons.
- `deck/sw.js`: retires the old portfolio deck's service worker in returning browsers.
- `tests/`: `node tests/analytics.mjs`.
- `CNAME`: custom domain configuration.

The site uses plain HTML, CSS, and JavaScript; this checkout has no package manifest
or build command. To preview locally, run a static HTTP server from this directory
(for example, `python3 -m http.server 8000` if Python is installed), then open
http://localhost:8000. Preview through HTTP so video and font requests
work.

## Editing and publishing

Edit the relevant source files, preview the changes, and review `git diff` before
committing. Push intended changes to the GitHub repository. Check the repository’s
GitHub Pages settings for the current publishing configuration; that configuration
is managed on GitHub rather than established by this README.

## Former old-site folder

`~/Dev/old-site` was a separate Git worktree of this repository at commit `cfa44d9`
("Republish deck with updated copy"). It was removed on September 28, 2026 because
it had no unique source changes. That version remains available in Git history;
a separate old checkout is not needed to preserve it.
