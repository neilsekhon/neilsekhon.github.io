# neilsekhon.com website

This repository contains the static files for Neil Sekhon’s personal website at
https://neilsekhon.com: the homepage, portfolio deck, and password-protected résumé.

## Analytics

[Google Analytics dashboard](https://analytics.google.com/analytics/web/#/a85630993p556498911/reports/intelligenthome) — visitors, page views, clicks, and portfolio engagement.

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

- `index.html`: homepage, project links, and portfolio/résumé controls.
- `styles.css`: homepage styling.
- `menu.js`: password dialog and portfolio/résumé opening logic.
- `resume.enc.json`: encrypted résumé content.
- `key.json`: data used by the site's unlock flow.
- `deck/`: portfolio loader, service worker, encrypted deck, media, and fonts.
- `assets/`: homepage font and its license.
- `CNAME`: custom domain configuration.

The site uses plain HTML, CSS, and JavaScript; this checkout has no package manifest
or build command. To preview locally, run a static HTTP server from this directory
(for example, `python3 -m http.server 8000` if Python is installed), then open
http://localhost:8000. Preview through HTTP so browser fetches and service workers
can work.

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
