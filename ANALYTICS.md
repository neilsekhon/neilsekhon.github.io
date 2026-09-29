# Site analytics

[Google Analytics dashboard](https://analytics.google.com/analytics/web/#/a85630993p556498911/reports/intelligenthome)

- Property: `neilsekhon.com` (`556498911`)
- Web stream: `15863409564`
- Measurement ID: `G-Z3XWJJCM1W`
- Reporting time zone: Los Angeles

## Reports

Use **Reports** for visitors, pages, traffic sources, devices, and engagement. Use **Realtime** to check incoming visits after deployment. Standard reports can take 24–48 hours to populate. Counts begin when tracking is deployed; historical visits are unavailable.

| Event | Meaning |
| --- | --- |
| `page_view` | Homepage or unlocked portfolio page loaded |
| `click` | Outbound link, including Blockle or LinkedIn; inspect `link_url` |
| `portfolio_click` / `resume_click` | Visitor clicked the corresponding button |
| `portfolio_open` / `resume_open` | Password was accepted and content was ready to open |
| `slide_view` | Active portfolio slide changed, with `slide_number` |
| `scroll` / `file_download` | GA enhanced measurement, when applicable |

**Slide number** is an event-scoped custom dimension. In Explore, filter to `slide_view`, use **Slide number** as rows, and **Event count** or **Total users** as values. Slide numbers follow the published deck's order; reordering slides changes their meaning.

Resume opens are measured explicitly because the decrypted PDF uses a blob URL. This records the open action, not proof that the PDF was read.

## Implementation

`analytics.js` runs only on `neilsekhon.com` and `www.neilsekhon.com`. Local previews and other hosts send nothing. It strips page query strings and fragments, keeps only the referring origin, accepts an allowlist of custom events, and sends slide numbers without deck content. Password fields and unlock failures are never collected. Google Signals and advertising personalization are disabled in the tag configuration.

GA enhanced measurement has page loads, outbound clicks, scrolls, and file downloads enabled. Browser-history page views, form interactions, site search, and YouTube tracking are disabled. Slide changes use their own event instead of inflating page views.

`deck/sw.js` attaches the same script to the decrypted HTML response. This covers existing encrypted decks without changing the encrypted files or the source deck. The homepage registers worker version 4. Direct returning visits may use the previous worker until its next update.

## Verify

Run `node tests/analytics.mjs` and preview the homepage locally. Production counts are deliberately disabled during local checks. After deployment, visit the site and verify page views, outbound clicks, button events, successful opens, and slide views in GA Realtime. Ad blockers and network failures can prevent collection.
