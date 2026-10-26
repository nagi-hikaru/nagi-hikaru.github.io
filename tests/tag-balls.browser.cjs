// Run after npm run build: node tests/tag-balls.browser.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '../public');
const fixture = [
  ['Hexo', 1], ['日常记录', 3], ['JavaScript', 7], ['前端开发', 14],
  ['生活随笔', 25], ['阅读', 2], ['设计', 5], ['摄影', 9],
];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  assert.ok(fs.existsSync(path.join(root, 'tags/index.html')), 'Run npm run build first');
  const chromePath = process.env.CHROME_PATH || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].find((file) => fs.existsSync(file));
  assert.ok(chromePath, 'Set CHROME_PATH to a Chromium browser');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'nagi-tag-balls-'));
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
  const server = http.createServer((request, response) => {
    let file = path.join(root, decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (error, data) => {
      if (error) { response.writeHead(404).end(); return; }
      response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      response.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run',
    '--remote-debugging-port=0', `--user-data-dir=${temporary}`, 'about:blank'],
  { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    let port;
    for (let i = 0; i < 100; i++) {
      try { port = fs.readFileSync(path.join(temporary, 'DevToolsActivePort'), 'utf8').split('\n')[0]; break; }
      catch { await sleep(100); }
    }
    assert.ok(port, 'Browser started');
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
    let sequence = 0;
    const pending = new Map();
    const errors = [];
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
      if (!message.id) return;
      const task = pending.get(message.id);
      pending.delete(message.id);
      message.error ? task.reject(message.error) : task.resolve(message.result);
    });
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const waitFor = async (expression) => {
      for (let i = 0; i < 100; i++) {
        if (await evaluate(expression)) return;
        await sleep(30);
      }
      assert.fail(`Timed out: ${expression}`);
    };
    const geometry = () => evaluate(`(() => {
      const card = document.querySelector('.tagcloud-content[data-tag-balls]');
      const list = card.querySelector('.tag-list');
      const rect = list.getBoundingClientRect();
      return { cardWidth: card.getBoundingClientRect().width, cardHeight: card.getBoundingClientRect().height,
        parentWidth: card.parentElement.clientWidth, width: rect.width, height: rect.height,
        minimumHeight: parseFloat(getComputedStyle(card).minHeight), viewportHeight: innerHeight,
        balls: [...list.querySelectorAll('a')].map(a => {const b=a.getBoundingClientRect();return {
          name:a.querySelector('.tag-ball-label').textContent.trim(), count:Number(a.dataset.weight),
          badge:a.querySelector('.tag-ball-count').textContent, hue:a.style.getPropertyValue('--tag-hue'),
          radius:b.width/2, height:b.height, x:b.left-rect.left+b.width/2, y:b.top-rect.top+b.height/2,
          clientX:b.left+b.width/2, clientY:b.top+b.height/2, text:a.innerText,
          font:parseFloat(getComputedStyle(a).fontSize), labelHeight:a.querySelector('.tag-ball-label').scrollHeight
        };}) };
    })()`);
    const assertContained = (state) => {
      assert.ok(state.cardWidth <= state.parentWidth + 1, 'Card fits the content column');
      for (const ball of state.balls) {
        assert.ok(Math.abs(ball.radius * 2 - ball.height) < 0.1, 'Tags are circular');
        assert.ok(ball.x - ball.radius >= -0.1 && ball.x + ball.radius <= state.width + 0.1, `${ball.name} fits horizontally`);
        assert.ok(ball.y - ball.radius >= -0.1 && ball.y + ball.radius <= state.height + 0.1, `${ball.name} fits vertically`);
      }
      for (let i = 0; i < state.balls.length; i++) for (let j = i + 1; j < state.balls.length; j++) {
        const a = state.balls[i], b = state.balls[j];
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.radius + b.radius - 0.8,
          `${a.name} and ${b.name} do not overlap`);
      }
    };
    const screenshot = async (name) => {
      const image = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      fs.writeFileSync(path.join(temporary, name + '.png'), Buffer.from(image.data, 'base64'));
    };
    const inject = async (tags) => {
      await evaluate(`(() => {
        const old = document.querySelector('.tagcloud-content');
        const card = old.cloneNode(false); card.removeAttribute('style'); card.removeAttribute('data-tag-balls');
        const list = document.createElement('ul');list.className='tag-list';list.dataset.showValue='true';
        for (const [name,count] of ${JSON.stringify(tags)}) {
          const li=document.createElement('li'),a=document.createElement('a');a.dataset.weight=count;
          a.href='/tags/Hexo/';const icon=document.createElement('i');icon.className='fa-solid fa-hashtag';
          a.append(icon,document.createTextNode(name));li.append(a);list.append(li);
        }
        card.append(list);old.replaceWith(card);window.nagiTagBalls.refresh();
      })()`);
      await sleep(80);
    };
    const dragMouse = async (from, to, steps = 24, observe) => {
      await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.clientX, y: from.clientY });
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.clientX, y: from.clientY, button: 'left', clickCount: 1 });
      for (let step = 1; step <= steps; step++) {
        await call('Input.dispatchMouseEvent', { type: 'mouseMoved', buttons: 1,
          x: from.clientX + (to.x - from.clientX) * step / steps,
          y: from.clientY + (to.y - from.clientY) * step / steps });
        await sleep(17);
      }
      if (observe) await observe();
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1 });
      await sleep(800);
    };

    await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
    await call('Network.setBlockedURLs', { urls: ['https://*'] });
    await call('Emulation.setDeviceMetricsOverride', { width: 1200, height: 950, deviceScaleFactor: 1, mobile: false });
    await call('Page.navigate', { url: base + '/tags/' });
    await waitFor(`!!document.querySelector('.tagcloud-content[data-tag-balls] a .tag-ball-count')`);
    const original = await geometry();
    assertContained(original);
    assert.ok(Math.abs(original.cardWidth - original.parentWidth) < 1, 'Frame keeps the full content-column width');
    assert.ok(Math.abs(original.cardHeight - original.viewportHeight * 2 / 3) < 1,
      'A small tag cluster starts at two-thirds of the viewport height');
    assert.equal(original.balls[0].badge, String(original.balls[0].count));
    await screenshot('single-tag');
    await call('Emulation.setDeviceMetricsOverride', { width: 1200, height: 1100, deviceScaleFactor: 1, mobile: false });
    await sleep(150);
    const taller = await geometry();
    assert.ok(Math.abs(taller.cardHeight - 1100 * 2 / 3) < 1, 'Height-only viewport changes update the initial frame size');
    assert.equal(taller.cardWidth, original.cardWidth, 'Height changes do not change the width');
    await call('Emulation.setDeviceMetricsOverride', { width: 1200, height: 950, deviceScaleFactor: 1, mobile: false });
    await sleep(150);
    await dragMouse(original.balls[0], { x: 5, y: 5 });
    assertContained(await geometry());
    let current = await geometry();
    await dragMouse(current.balls[0], { x: 1190, y: 940 });
    current = await geometry(); assertContained(current);
    assert.equal(current.cardWidth, original.cardWidth, 'Dragging keeps the border fixed');
    assert.equal(current.cardHeight, original.cardHeight, 'Dragging keeps its height fixed');
    assert.equal(await evaluate('location.pathname'), '/tags/', 'Dragging does not follow links');
    // A move and release in the same task must still move the ball.
    const fastStart = current.balls[0];
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: fastStart.clientX, y: fastStart.clientY, button: 'left', clickCount: 1 });
    await call('Input.dispatchMouseEvent', { type: 'mouseMoved', buttons: 1, x: fastStart.clientX - 40, y: fastStart.clientY - 40 });
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: fastStart.clientX - 40, y: fastStart.clientY - 40, button: 'left', clickCount: 1 });
    await sleep(60);
    const fastEnd = (await geometry()).balls[0];
    assert.ok(Math.hypot(fastEnd.x - fastStart.x, fastEnd.y - fastStart.y) > 20, 'Quick drags retain their final position');
    console.log('PASS: real tag, circular shape, fixed boundary, edge clamping and drag click suppression');

    await inject(fixture);
    const multiple = await geometry(); assertContained(multiple);
    assert.equal(multiple.cardWidth, original.cardWidth, 'More tags do not change the fixed width');
    assert.ok(multiple.cardHeight >= original.cardHeight, 'The frame never shrinks below its initial height');
    assert.equal(new Set(multiple.balls.map((ball) => ball.hue)).size, fixture.length, 'Tags have distinct colors');
    for (const a of multiple.balls) for (const b of multiple.balls) {
      if (a.count > b.count) assert.ok(a.radius > b.radius, 'More articles give a larger ball');
    }
    await sleep(1700);
    const floating = await geometry(); assertContained(floating);
    const drift = floating.balls.map((ball, i) => Math.hypot(ball.x - multiple.balls[i].x, ball.y - multiple.balls[i].y));
    assert.ok(drift.every((distance) => distance > 0.15), 'Every balloon drifts without mouse input');
    assert.ok(Math.max(...drift) - Math.min(...drift) > 0.5, 'Balloons have independent motion');
    assert.equal(floating.cardHeight, multiple.cardHeight, 'Idle floating keeps the frame fixed');
    console.log('PASS: independent idle floating with no overlaps or frame changes');
    await screenshot('many-tags-dark');
    const from = floating.balls[0], target = floating.balls[3];
    await dragMouse(from, { x: target.clientX + 20, y: target.clientY }, 30, async () => {
      const pushed = await geometry();
      assert.ok(pushed.balls.some((ball, i) => i && Math.hypot(ball.x - multiple.balls[i].x, ball.y - multiple.balls[i].y) > 5),
        'Dragging pushes other balls');
      assertContained(pushed);
    });
    assertContained(await geometry());
    await screenshot('many-tags-after-drag');
    current = await geometry();
    await dragMouse(current.balls[0], { x: 5, y: 5 });
    assertContained(await geometry());
    current = await geometry();
    await dragMouse(current.balls[0], { x: 1190, y: 940 });
    assertContained(await geometry());
    console.log('PASS: proportional sizes, distinct colors, fixed frame width and collision pushing');

    await inject([['气球一', 3], ['气球二', 3]]);
    current = await geometry();
    let first = current.balls[0];
    await dragMouse(first, { x: first.clientX - first.x + first.radius + 13,
      y: first.clientY - first.y + first.radius + 13 });
    current = await geometry();
    let second = current.balls[1];
    await dragMouse(second, { x: second.clientX - second.x + current.width - second.radius - 13,
      y: second.clientY - second.y + current.height - second.radius - 13 });
    current = await geometry();
    const separation = (state) => Math.hypot(state.balls[0].x - state.balls[1].x, state.balls[0].y - state.balls[1].y);
    const apart = separation(current);
    await sleep(2400);
    const attracted = await geometry(); assertContained(attracted);
    assert.ok(separation(attracted) < apart - 8, 'Separated balloons gently attract each other');
    assert.ok(separation(attracted) > attracted.balls[0].radius + attracted.balls[1].radius + 5,
      'Attraction keeps a cushion between balloons');
    console.log('PASS: gentle attraction without sticking together');
    await inject(fixture);

    await evaluate(`document.documentElement.classList.replace('dark','light');document.body.classList.replace('dark-mode','light-mode')`);
    await sleep(400); // Allow the theme's color transitions to finish.
    await screenshot('many-tags-light');
    await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(200); assertContained(await geometry());
    await screenshot('many-tags-mobile');
    await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    const touch = (await geometry()).balls[0];
    await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touch.clientX, y: touch.clientY }] });
    for (let step = 1; step <= 15; step++) {
      await call('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touch.clientX + 55 * step / 15, y: touch.clientY + 65 * step / 15 }] });
      await sleep(17);
    }
    await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(800); assertContained(await geometry());
    console.log('PASS: mobile resize and touch dragging');

    await inject(Array.from({ length: 32 }, (_, i) => [i ? `标签 ${i}` : '很长的中文标签名称也要完整显示', i + 1]));
    const dense = await geometry(); assertContained(dense);
    assert.ok(dense.cardHeight > dense.minimumHeight + 20, 'Overflowing tags grow the height beyond the initial size');
    assert.ok(Math.abs(dense.cardWidth - dense.parentWidth) < 1, 'Dense tags keep the same column width');
    await call('Emulation.setDeviceMetricsOverride', { width: 320, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(150); assertContained(await geometry());
    console.log('PASS: dense layout, long labels and narrow viewport');
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await sleep(150);
    const still = await geometry();
    await sleep(450);
    const reduced = await geometry();
    assert.ok(reduced.balls.every((ball, i) => Math.hypot(ball.x - still.balls[i].x, ball.y - still.balls[i].y) < 0.05),
      'Reduced motion stops idle floating');
    await call('Emulation.setEmulatedMedia', { features: [] });
    console.log('PASS: reduced-motion preference');

    await call('Emulation.setTouchEmulationEnabled', { enabled: false });
    await call('Emulation.setDeviceMetricsOverride', { width: 1200, height: 950, deviceScaleFactor: 1, mobile: false });
    await evaluate(`window.swup.navigate('/categories/')`);
    await waitFor(`location.pathname === '/categories/' && !!document.querySelector('.category-list-content')`);
    await evaluate(`window.swup.navigate('/tags/')`);
    await waitFor(`location.pathname === '/tags/' && !!document.querySelector('.tagcloud-content[data-tag-balls]')`);
    const restored = await geometry(); assertContained(restored);
    assert.equal(restored.balls.length, original.balls.length, 'Navigation restores real data');
    const anchor = restored.balls[0];
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: anchor.clientX, y: anchor.clientY, button: 'left', clickCount: 1 });
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: anchor.clientX, y: anchor.clientY, button: 'left', clickCount: 1 });
    await waitFor(`location.pathname === '/tags/Hexo/'`);
    assert.deepEqual(errors, [], 'No browser exceptions');
    console.log('PASS: Swup navigation, cleanup and normal tag link clicks');
    console.log('Screenshots:', temporary);
  } finally { socket?.close(); chrome.kill(); server.closeAllConnections(); server.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
