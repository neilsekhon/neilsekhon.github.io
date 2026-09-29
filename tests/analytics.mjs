import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url).pathname;
const source = readFileSync(root + '/analytics.js', 'utf8');
function setup(hostname) {
  const handlers = {};
  const scripts = [];
  const slides = [true, false];
  const context = {
    location: { hostname, origin: `https://${hostname}`, pathname: '/deck/', hash: '#1', search: '?password=secret' },
    document: {
      referrer: 'https://example.com/private?secret=value',
      createElement: () => ({}), head: { appendChild: script => scripts.push(script) },
      addEventListener: (name, fn) => { handlers[name] = fn; },
      querySelectorAll: () => slides.map(active => ({ classList: { contains: () => active } })),
    }, URL,
    addEventListener: (name, fn) => { handlers[name] = fn; },
  };
  context.window = context;
  vm.createContext(context); vm.runInContext(source, context);
  return { context, handlers, scripts, slides, events: () => (context.dataLayer || []).map(item => Array.from(item)) };
}
for (const hostname of ['localhost', '127.0.0.1', 'neilsekhon.github.io', 'evilneilsekhon.com', '']) {
  const run = setup(hostname); assert.equal(run.scripts.length, 0); assert.equal(run.events().length, 0);
}
const run = setup('neilsekhon.com');
assert.equal(run.scripts.length, 1);
assert.equal(run.events().filter(e => e[0] === 'config').length, 1);
assert.equal(run.events()[1][2].page_location, 'https://neilsekhon.com/deck/');
assert.equal(run.events()[1][2].page_referrer, 'https://example.com');
assert.equal(run.events()[2][1], 'slide_view');
run.handlers.hashchange(); assert.equal(run.events().length, 3);
run.slides[0] = false; run.slides[1] = true; run.handlers.hashchange();
assert.equal(run.events().at(-1)[2].slide_number, 2);
run.handlers.click({ target: { closest: selector => selector === 'button.portfolio' } });
assert.equal(run.events().at(-1)[1], 'portfolio_click');
run.context.siteAnalytics('resume_open', {password:'secret'});
assert.equal(Object.keys(run.events().at(-1)[2]).length, 0);
const count = run.events().length;
run.context.siteAnalytics('password', {password:'secret'}); assert.equal(run.events().length, count);
vm.runInContext(source, run.context); assert.equal(run.scripts.length, 1);
assert.equal(JSON.stringify(run.events()).includes('secret'), false);
assert.equal(setup('www.neilsekhon.com').scripts.length, 1);
const worker = { self:{location:new URL('https://neilsekhon.com/deck/sw.js'),addEventListener(){}},URL,Response,Headers,TextEncoder,TextDecoder,console };
vm.createContext(worker);
vm.runInContext(readFileSync(root+'/deck/sw.js','utf8'),worker);
vm.runInContext("load = async () => new TextEncoder().encode('<html><head></head><body>Deck</body></html>')",worker);
const response = await vm.runInContext("serve({headers: new Headers()}, 'index.html')", worker);
const html = await response.text();
assert.match(html, /<script src="\.\.\/analytics.js\?v=1" defer><\/script><\/head>/);
assert.equal(Number(response.headers.get('content-length')),new TextEncoder().encode(html).byteLength);
console.log('PASS: production host gate, page URL sanitization, event allowlist, slide deduplication, click tracking, repeated initialization, and decrypted deck script injection.');
