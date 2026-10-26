const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const loader = fs.readFileSync(path.join(root, 'source/js/utterances-loader.js'), 'utf8');
const article = new JSDOM(fs.readFileSync(path.join(root, 'public/2026/10/23/hello-world/index.html'), 'utf8'));
const markup = article.window.document.getElementById('utterances-container').outerHTML;
article.window.close();

function setup() {
  const dom = new JSDOM(`<body class="dark-mode">${markup}</body>`, {
    url: 'https://nagi-hikaru.github.io/2026/10/23/hello-world/', runScripts: 'outside-only',
  });
  const { window } = dom;
  const timers = new Map();
  let sequence = 0;
  window.setTimeout = (callback) => { timers.set(++sequence, callback); return sequence; };
  window.clearTimeout = (id) => timers.delete(id);
  const hooks = {};
  window.swup = { hooks: {
    before: (event, callback) => { hooks[event] = callback; },
    on: (event, callback) => { hooks[event] = callback; },
  } };
  window.eval(loader);
  const query = (selector) => window.document.querySelector(selector);
  const resize = (origin = 'https://utteranc.es', validSource = true) => {
    const frame = window.document.createElement('iframe');
    frame.className = 'utterances-frame';
    query('.utterances-mount').replaceChildren(frame);
    window.dispatchEvent(new window.MessageEvent('message', {
      origin, source: validSource ? frame.contentWindow : window,
      data: { type: 'resize', height: 350 },
    }));
  };
  return { window, query, timers, hooks, resize, close: () => window.close() };
}

test('renders loading feedback and the matching GitHub issue search before the service loads', () => {
  const app = setup();
  try {
    assert.equal(app.query('.utterances-status').hidden, false);
    assert.equal(app.query('.utterances-status').dataset.state, 'loading');
    assert.equal(app.query('.utterances-retry').hidden, true);
    const script = app.query('.utterances-mount script');
    assert.equal(script.getAttribute('repo'), 'nagi-hikaru/nagi-hikaru.github.io');
    assert.equal(script.getAttribute('issue-term'), 'pathname');
    assert.equal(script.getAttribute('theme'), 'github-dark');
    const link = new URL(app.query('.utterances-github').href);
    assert.equal(link.origin, 'https://github.com');
    assert.ok(link.searchParams.get('q').includes('2026/10/23/hello-world/'));
  } finally { app.close(); }
});

test('a blocked script shows an error and retry makes a fresh request using the current theme', () => {
  const app = setup();
  try {
    const first = app.query('.utterances-mount script');
    first.dispatchEvent(new app.window.Event('error'));
    assert.equal(app.query('.utterances-status').dataset.state, 'error');
    assert.match(app.query('.utterances-message').textContent, /连接不上/);
    assert.equal(app.query('.utterances-retry').hidden, false);
    app.window.document.body.className = 'light-mode';
    app.query('.utterances-retry').click();
    assert.notEqual(app.query('.utterances-mount script'), first);
    assert.equal(app.query('.utterances-mount').children.length, 1);
    assert.equal(app.query('.utterances-mount script').getAttribute('theme'), 'github-light');
    assert.equal(app.query('.utterances-status').dataset.state, 'loading');
    assert.equal(app.timers.size, 1);
  } finally { app.close(); }
});

test('a stalled request times out visibly and can still recover if the frame eventually renders', () => {
  const app = setup();
  try {
    [...app.timers.values()][0]();
    assert.equal(app.query('.utterances-status').dataset.state, 'error');
    assert.equal(app.query('.utterances-retry').hidden, false);
    app.resize();
    assert.equal(app.query('.utterances-status').hidden, true);
    assert.equal(app.timers.size, 0);
  } finally { app.close(); }
});

test('untrusted messages cannot hide a failed comment load', () => {
  const app = setup();
  try {
    app.resize('https://example.com');
    assert.equal(app.query('.utterances-status').hidden, false);
    app.resize('https://utteranc.es', false);
    assert.equal(app.query('.utterances-status').hidden, false);
    app.resize();
    assert.equal(app.query('.utterances-status').hidden, true);
  } finally { app.close(); }
});

test('page replacement cancels old requests and remounting does not duplicate scripts or timers', () => {
  const app = setup();
  try {
    const old = app.query('#utterances-container');
    const timeout = [...app.timers.values()][0];
    app.hooks['content:replace']();
    assert.equal(app.timers.size, 0);
    timeout();
    assert.equal(old.querySelector('.utterances-status').dataset.state, 'loading');
    old.remove();
    app.hooks['page:view']();
    app.window.document.body.insertAdjacentHTML('beforeend', markup);
    app.hooks['page:view']();
    app.window.eval(loader);
    assert.equal(app.query('.utterances-mount').children.length, 1);
    assert.equal(app.timers.size, 1);
    const detachedScript = old.querySelector('script');
    detachedScript.dispatchEvent(new app.window.Event('error'));
    assert.equal(app.query('.utterances-status').dataset.state, 'loading');
  } finally { app.close(); }
});
