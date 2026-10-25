const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const theme = path.join(root, 'node_modules/hexo-theme-redefine');
const read = (file) => fs.readFileSync(file, 'utf8');
const fix = read(path.join(root, 'source/js/page-canonical.js'));
const articlePath = '/2026/10/23/hello-world/';
const article = read(path.join(root, 'public', articlePath, 'index.html'));
const articleDocument = new JSDOM(article).window.document;
const commentInit = [...articleDocument.scripts].find((script) =>
  script.textContent.includes('const repo = "nagi-hikaru/nagi-hikaru.github.io"')
).textContent;
const origin = 'https://nagi-hikaru.github.io';

function page(url, comments = false) {
  return { url, html: `<!doctype html><html><head>
    <link rel="canonical" href="${origin}${url}">
    <meta property="og:url" content="${origin}${url}index.html">
    </head><body><main id="swup">${comments ? `
    <div id="utterances-container"></div>
    <script data-swup-reload-script>${commentInit}</script>` : ''}
    </main></body></html>` };
}

async function setup({ fixed, delayedSwup = false }) {
  const dom = new JSDOM(page('/tags/').html, {
    url: `${origin}/tags/`, runScripts: 'dangerously', pretendToBeVisual: true,
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false });
  const returnUrls = [];
  const appendChild = window.Node.prototype.appendChild;
  window.Node.prototype.appendChild = function (child) {
    if (child.tagName === 'SCRIPT' && child.src === 'https://utteranc.es/client.js') {
      // Utterances' client reads canonical here; its login uses that URL.
      returnUrls.push(window.document.querySelector('link[rel="canonical"]')?.href);
    }
    return appendChild.call(this, child);
  };
  if (fixed && delayedSwup) window.eval(fix);
  window.eval(read(path.join(theme, 'source/js/libs/Swup.min.js')));
  window.eval(read(path.join(theme, 'source/js/libs/SwupScriptsPlugin.min.js')));
  window.swup = new window.Swup({
    plugins: [new window.SwupScriptsPlugin({ optin: true })],
    containers: ['#swup'],
  });
  if (fixed && !delayedSwup) window.eval(fix);
  window.dispatchEvent(new window.CustomEvent('redefine:swup:ready'));
  await new Promise((resolve) => window.requestAnimationFrame(() =>
    window.requestAnimationFrame(resolve)));

  async function navigate(url, comments = false) {
    const next = page(url, comments);
    window.history.replaceState(null, '', url);
    await window.swup.hooks.call('content:replace', { page: next }, () => {
      window.swup.replaceContent(next);
    });
  }
  return { window, returnUrls, navigate, close: () => window.close() };
}

test('reproduces the stale tags URL read by Utterances without synchronization', async () => {
  const app = await setup({ fixed: false });
  try {
    await app.navigate(articlePath, true);
    assert.deepEqual(app.returnUrls, [`${origin}/tags/`]);
  } finally { app.close(); }
});

for (const delayedSwup of [false, true]) {
  test(`updates the login return URL before comment initialization (delayed Swup: ${delayedSwup})`, async () => {
    const app = await setup({ fixed: true, delayedSwup });
    try {
      await app.navigate(articlePath, true);
      app.window.eval(fix); // The theme reruns injected head scripts on navigation.
      await app.navigate('/tags/');
      await app.navigate(articlePath, true);
      assert.deepEqual(app.returnUrls, [`${origin}${articlePath}`, `${origin}${articlePath}`]);
      assert.equal(app.window.document.querySelectorAll('link[rel="canonical"]').length, 1);
      assert.equal(app.window.document.querySelector('meta[property="og:url"]').content,
        `${origin}${articlePath}index.html`);
    } finally { app.close(); }
  });
}
