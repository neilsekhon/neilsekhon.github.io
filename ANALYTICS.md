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
| `game_play` | Opened a game | `project`, `source` (`button`, `snapchat` or `phone`) |
| `download` | Clicked a download link | `project`, `file` (`v1` or `v2`) |
| `image_open` | Opened an item's image full size | `project` |
| `opossum` | Tapped an older project's phone | `project` |
| `soft_tap` | Tapped dimmed work at the top, which scrolls to it | `project` |

`project` is one of `rhythmoji`, `blockle`, `dayhub`, `codehop`, `totem`, `freshman15`, `output-styles`. **Project** and **Source** are registered event-scoped custom dimensions, filled from the day they were registered. **File** still needs registering in GA (Admin → Custom definitions) before `download` splits by file. `source` is `phone` for the phone mockup, `snapchat` for blockle's Play on Snapchat button, and `button` for any other play button. blockle moved from blockle.dev to neilsekhon.com/blockle/ in November 2026; since it is now on the same domain, its plays no longer show up as outbound `click` events, so count them with `game_play`. blockle's own gameplay traffic still goes to its separate property, `G-ZWZ2YEXHEV`. Events from the retired portfolio deck (`slide_view`, `portfolio_*`, `resume_*`) stay in history and no longer fire.

## Alerts

The custom insight **Daily - new visitors to neilsekhon.com** (GA Home → Insights → Manage) emails getsekhoned@gmail.com on any day with at least one new user.

## Implementation

`analytics.js` runs only on `neilsekhon.com` and `www.neilsekhon.com`; local previews and other hosts send nothing. It strips query strings and fragments, keeps only the referring origin, and sends only allowlisted events with allowlisted values. Google Signals and ad personalization are off.

## Verify

Run `node tests/analytics.mjs`. After deploying, open the site and check GA Realtime for page views, project views and game plays. Ad blockers can prevent collection.
