import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
// The script runs in its own vm realm, so compare its values as JSON.
const same = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));
const source = readFileSync(new URL('../home-analytics.js', import.meta.url), 'utf8');

function setup(hostname, { soft = false } = {}) {
  const handlers = {};
  const scripts = [];
  const observed = [];
  const classes = new Set(soft ? ['soft'] : []);
  class IntersectionObserver {
    constructor(fn) { this.fn = fn; }
    observe(el) { observed.push([this, el]); }
    unobserve() {}
  }
  const context = {
    location: { hostname, origin: `https://${hostname}`, pathname: '/', search: '?q=secret', hash: '#x' },
    document: {
      readyState: 'complete',
      referrer: 'https://example.com/private?secret=value',
      documentElement: { classList: { contains: c => classes.has(c) } },
      createElement: () => ({}), head: { appendChild: s => scripts.push(s) },
      addEventListener: (name, fn) => { handlers[name] = fn; },
      querySelectorAll: () => [{ dataset: { project: 'blockle' } }, { dataset: { project: 'secret' } }],
    },
    URL, IntersectionObserver,
  };
  context.window = context;
  vm.createContext(context); vm.runInContext(source, context);
  const events = () => (context.dataLayer || []).map(item => Array.from(item));
  return { context, handlers, scripts, observed, classes, events };
}

// A click target inside a project row; `match` lists the selectors it sits inside.
const target = (project, ...match) => ({
  closest: sel => sel === '[data-project]' ? { dataset: { project } } : match.includes(sel) ? {} : null,
});

for (const hostname of ['localhost', '127.0.0.1', '192.168.1.17', 'neilsekhon.github.io', 'evilneilsekhon.com', '']) {
  const run = setup(hostname);
  assert.equal(run.scripts.length, 0); assert.equal(run.events().length, 0);
}

const run = setup('neilsekhon.com');
assert.equal(run.scripts.length, 1);
const config = run.events().find(e => e[0] === 'config')[2];
assert.equal(config.page_location, 'https://neilsekhon.com/');
assert.equal(config.page_referrer, 'https://example.com');
assert.equal(config.allow_google_signals, false);

run.handlers.click({ target: target('rhythmoji', 'a.play') });
same(run.events().at(-1), ['event', 'game_play', { project: 'rhythmoji', source: 'button' }]);
run.handlers.click({ target: target('blockle', 'a.phone') });
same(run.events().at(-1), ['event', 'game_play', { project: 'blockle', source: 'phone' }]);
run.handlers.click({ target: target('totem', 'li.old figure') });
same(run.events().at(-1), ['event', 'opossum', { project: 'totem' }]);

const soft = setup('neilsekhon.com', { soft: true });
soft.handlers.click({ target: target('rhythmoji', 'a.play') });
same(soft.events().at(-1), ['event', 'soft_tap', { project: 'rhythmoji' }]);

// Project views fire once each, and unknown slugs are dropped.
for (const [observer, el] of run.observed) observer.fn([{ isIntersecting: true, target: el }]);
const views = run.events().filter(e => e[1] === 'project_view').map(e => e[2]);
same(views, [{ project: 'blockle' }, {}]);

const count = run.events().length;
run.context.siteAnalytics('password', { project: 'blockle' }); assert.equal(run.events().length, count);
run.context.siteAnalytics('game_play', { project: 'blockle', source: 'secret', email: 'x' });
same(run.events().at(-1)[2], { project: 'blockle' });
vm.runInContext(source, run.context); assert.equal(run.scripts.length, 1);
assert.equal(JSON.stringify(run.events()).includes('secret'), false);
assert.equal(setup('www.neilsekhon.com').scripts.length, 1);
console.log('PASS: production host gate, URL sanitization, event and value allowlists, click and soft-tap classification, project views, repeated initialization.');
