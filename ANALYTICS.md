# Site analytics

[Google Analytics dashboard](https://analytics.google.com/analytics/web/#/a85630993p556498911/reports/intelligenthome)

- Property: `neilsekhon.com` (`556498911`)
- Web stream: `15863409564`
- Measurement ID: `G-Z3XWJJCM1W`
- Reporting time zone: Los Angeles

## Events

| Event | Meaning | Parameters |
| --- | --- | --- |
| `page_view` | Page loaded | — |
| `click` | Outbound link, such as a game or LinkedIn (GA enhanced measurement) | `link_url` |
| `scroll` | Reached 90% of the page (GA enhanced measurement) | — |
| `project_view` | Half of a project scrolled into view, once per visit | `project` |
| `game_play` | Opened a game | `project`, `source` (`button` or `phone`) |
| `opossum` | Tapped an older project's phone | `project` |
| `soft_tap` | Tapped dimmed work at the top, which scrolls to it | `project` |

`project` is one of `rhythmoji`, `blockle`, `dayhub`, `codehop`, `totem`, `freshman15`. **Project** and **Source** are registered event-scoped custom dimensions, filled from the day they were registered. Events from the retired portfolio deck (`slide_view`, `portfolio_*`, `resume_*`) stay in history and no longer fire.

## Implementation

`analytics.js` runs only on `neilsekhon.com` and `www.neilsekhon.com`; local previews and other hosts send nothing. It strips query strings and fragments, keeps only the referring origin, and sends only allowlisted events with allowlisted values. Google Signals and ad personalization are off.

## Verify

Run `node tests/analytics.mjs`. After deploying, open the site and check GA Realtime for page views, project views and game plays. Ad blockers can prevent collection.
