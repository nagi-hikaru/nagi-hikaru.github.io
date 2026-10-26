(() => {
  if (window.nagiTagBalls) {
    window.nagiTagBalls.refresh();
    return;
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let active;
  let boundSwup;

  const cleanup = () => {
    active?.destroy();
    active = undefined;
  };

  const refresh = () => {
    const card = document.querySelector('.page-template-container > .tagcloud-content');
    if (active?.card === card) return;
    cleanup();
    const list = card?.querySelector('.tag-list');
    const links = [...(list?.querySelectorAll(':scope > li > a[data-weight]') || [])];
    if (!links.length) return;

    const controller = new AbortController();
    const { signal } = controller;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let parentWidth = 0;
    let minimumHeight = 0;
    let frame = 0;
    let lastTime = 0;
    let motionTime = 0;
    let inView = true;
    let drag;
    let suppressClick;
    const wall = 12;
    const gap = 10;

    // Sorting by URL gives each label a repeatable, distinct muted hue.
    const colorOrder = [...links].sort((a, b) => a.pathname.localeCompare(b.pathname));
    const balls = links.map((link, index) => {
      let label = link.querySelector('.tag-ball-label');
      if (!label) {
        label = document.createElement('span');
        label.className = 'tag-ball-label';
        label.append(...link.childNodes);
        const count = document.createElement('span');
        count.className = 'tag-ball-count';
        count.textContent = link.dataset.weight;
        link.append(label, count);
      }
      const count = Math.max(1, Number(link.dataset.weight) || 1);
      link.title = `${label.textContent.trim()} · ${count} 篇文章`;
      link.style.setProperty('--tag-hue', String((345 + colorOrder.indexOf(link) * 137.508) % 360));
      return { link, label, element: link.parentElement, count, x: 0, y: 0, r: 0, vx: 0, vy: 0,
        phase: (index + 1) * 2.399963, rate: 0.42 + (index * 0.173) % 0.37 };
    });
    const minCount = Math.min(...balls.map((ball) => ball.count));
    const maxCount = Math.max(...balls.map((ball) => ball.count));

    const contain = (ball) => {
      const x = clamp(ball.x, ball.r + wall, width - ball.r - wall);
      const y = clamp(ball.y, ball.r + wall, height - ball.r - wall);
      if (x !== ball.x) ball.vx = 0;
      if (y !== ball.y) ball.vy = 0;
      ball.x = x;
      ball.y = y;
    };

    const resolveCollisions = () => {
      let overlap = 0;
      for (let pass = 0; pass < 12; pass++) {
        for (let i = 0; i < balls.length; i++) {
          const a = balls[i];
          for (let j = i + 1; j < balls.length; j++) {
            const b = balls[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let distance = Math.hypot(dx, dy);
            const required = a.r + b.r + gap;
            if (distance >= required) continue;
            if (distance < 0.001) { dx = 0.01; dy = 0.007; distance = Math.hypot(dx, dy); }
            const amount = required - distance;
            overlap = Math.max(overlap, amount);
            const nx = dx / distance;
            const ny = dy / distance;
            // The grabbed ball is heavier so it can push its neighbors aside.
            const wa = (drag?.ball === a ? 0.08 : 1) / (a.r * a.r);
            const wb = (drag?.ball === b ? 0.08 : 1) / (b.r * b.r);
            const da = amount * wa / (wa + wb);
            const db = amount * wb / (wa + wb);
            a.x -= nx * da;
            a.y -= ny * da;
            b.x += nx * db;
            b.y += ny * db;
            if (!reducedMotion.matches) {
              if (drag?.ball !== a) { a.vx -= nx * da * 0.12; a.vy -= ny * da * 0.12; }
              if (drag?.ball !== b) { b.vx += nx * db * 0.12; b.vy += ny * db * 0.12; }
            }
          }
        }
        balls.forEach(contain);
      }
      return overlap;
    };

    const paint = () => balls.forEach((ball) => {
      ball.element.style.transform = `translate3d(${(ball.x - ball.r).toFixed(2)}px, ${(ball.y - ball.r).toFixed(2)}px, 0)`;
    });

    const applyBuoyancy = (dt) => {
      if (reducedMotion.matches) return;
      motionTime += dt / 60;
      const balance = Math.max(1, Math.sqrt(balls.length) / 2);
      for (const ball of balls) {
        if (drag?.ball === ball) continue;
        const t = motionTime * ball.rate;
        const mass = Math.sqrt(60 / ball.r);
        // Overlapping slow air currents give each balloon its own irregular drift.
        ball.vx += ((Math.sin(t + ball.phase) * 0.006 + Math.sin(t * 1.71 + ball.phase * 0.7) * 0.004)
          * mass + (width / 2 - ball.x) * 0.000045) * dt;
        ball.vy += ((Math.cos(t * 0.83 + ball.phase) * 0.008 + Math.sin(t * 1.37 + ball.phase * 1.3) * 0.004)
          * mass + (height / 2 - ball.y) * 0.000045) * dt;
      }
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.hypot(dx, dy) || 1;
          // Weak attraction at a distance, stronger cushioning nearby: a loose cluster.
          const spacing = 22 + 4 * Math.sin(a.phase + b.phase);
          const delta = distance - a.r - b.r - spacing;
          const force = clamp(delta * (delta > 0 ? 0.00016 : 0.003), -0.07, 0.035) * dt / balance;
          const fx = dx / distance * force;
          const fy = dy / distance * force;
          if (drag?.ball !== a) { a.vx += fx; a.vy += fy; }
          if (drag?.ball !== b) { b.vx -= fx; b.vy -= fy; }
        }
      }
    };

    const tick = (time) => {
      frame = 0;
      if (signal.aborted) return;
      const dt = lastTime ? clamp((time - lastTime) / 16.667, 0.5, 2) : 1;
      lastTime = time;
      applyBuoyancy(dt);
      const movingDrag = drag?.moved ? drag : undefined;
      const distance = movingDrag ? Math.hypot(drag.tx - drag.ball.x, drag.ty - drag.ball.y) : 0;
      // Sweep fast pointer movements in small steps to avoid crossing other balls.
      const steps = Math.max(1, Math.ceil(distance / (Math.min(...balls.map((ball) => ball.r)) * 0.35)));
      let overlap = 0;
      for (let step = 0; step < steps; step++) {
        for (const ball of balls) {
          if (drag?.ball === ball) {
            if (movingDrag) {
              ball.x += (drag.tx - ball.x) / (steps - step);
              ball.y += (drag.ty - ball.y) / (steps - step);
            }
          } else {
            ball.x += ball.vx * dt / steps;
            ball.y += ball.vy * dt / steps;
          }
          contain(ball);
        }
        overlap = resolveCollisions();
      }
      let speed = 0;
      for (const ball of balls) {
        const friction = reducedMotion.matches ? 0 : Math.pow(movingDrag ? 0.82 : 0.94, dt);
        ball.vx = clamp(ball.vx * friction, -8, 8);
        ball.vy = clamp(ball.vy * friction, -8, 8);
        speed = Math.max(speed, Math.abs(ball.vx), Math.abs(ball.vy));
      }
      paint();
      if (!document.hidden && inView && (!reducedMotion.matches || movingDrag || speed > 0.025 || overlap > 0.05)) {
        frame = requestAnimationFrame(tick);
      }
      else { lastTime = 0; balls.forEach((ball) => { ball.vx = 0; ball.vy = 0; }); }
    };

    const wake = () => {
      if (signal.aborted || document.hidden || !inView) return;
      if (!frame) { lastTime = 0; frame = requestAnimationFrame(tick); }
    };

    const layout = () => {
      const available = card.parentElement.clientWidth;
      const style = getComputedStyle(card);
      const minimum = parseFloat(style.minHeight) || innerHeight * 2 / 3;
      if (!available || (Math.abs(available - parentWidth) < 0.5 && Math.abs(minimum - minimumHeight) < 0.5)) return;
      if (drag) release();
      parentWidth = available;
      minimumHeight = minimum;
      const padding = parseFloat(style.paddingLeft) * 2;
      const limit = Math.max(1, available - padding);
      const small = Math.min(clamp(available * 0.14, 82, 110), limit - wall * 2);
      const large = Math.min(clamp(available * 0.23, 130, 190), limit - wall * 2);
      for (const ball of balls) {
        const fraction = maxCount === minCount ? 0 :
          (Math.sqrt(ball.count) - Math.sqrt(minCount)) / (Math.sqrt(maxCount) - Math.sqrt(minCount));
        const size = small + (large - small) * fraction;
        ball.r = size / 2;
        ball.vx = 0;
        ball.vy = 0;
        ball.element.style.setProperty('--ball-size', `${size}px`);
        ball.link.style.setProperty('--ball-font-size', `${clamp(size * 0.13, 12, 22)}px`);
      }
      // Keep the original content-column width regardless of how many tags exist.
      card.style.width = '100%';
      // Use the rendered width so fractional pixels and responsive padding agree.
      width = list.clientWidth;
      const placed = [];
      for (const ball of [...balls].sort((a, b) => b.r - a.r)) {
        let best;
        // Grow an uneven cluster around existing balloons, instead of making rows.
        for (const neighbor of placed) {
          const spacing = 22 + 4 * Math.sin(ball.phase + neighbor.phase);
          const separation = ball.r + neighbor.r + spacing;
          for (let sample = 0; sample < 52; sample++) {
            const angle = sample < 4 ? sample * Math.PI / 2 :
              (sample - 4) * Math.PI / 24 + ball.phase * 0.08;
            const x = neighbor.x + Math.cos(angle) * separation;
            const y = neighbor.y + Math.sin(angle) * separation;
            if (x - ball.r < wall || x + ball.r > width - wall) continue;
            if (placed.some((other) => Math.hypot(x - other.x, y - other.y) < ball.r + other.r + gap + 5)) continue;
            const score = (x - width / 2) ** 2 + y * y * 1.15;
            if (!best || score < best.score) best = { x, y, score };
          }
        }
        ball.x = best?.x ?? width / 2;
        ball.y = best?.y ?? (placed.length ? Math.max(...placed.map((other) => other.y + other.r)) + ball.r + 22 : 0);
        placed.push(ball);
      }
      const top = Math.min(...balls.map((ball) => ball.y - ball.r));
      const bottom = Math.max(...balls.map((ball) => ball.y + ball.r));
      // Start at two-thirds of the viewport, growing only if the cluster needs it.
      height = Math.max(minimumHeight - padding, bottom - top + wall * 2 + 64);
      list.style.height = `${height}px`;
      balls.forEach((ball) => { ball.y += (height - (bottom - top)) / 2 - top; });
      for (const ball of balls) {
        let font = parseFloat(ball.link.style.getPropertyValue('--ball-font-size'));
        // Keep short names and their hashtag on one line when possible.
        ball.label.style.whiteSpace = 'nowrap';
        while (font > 12 && ball.label.scrollWidth > ball.r * 1.44) {
          font -= 0.5;
          ball.link.style.setProperty('--ball-font-size', `${font}px`);
        }
        ball.label.style.whiteSpace = '';
        while (font > 10 && ball.label.scrollHeight + ball.link.lastElementChild.offsetHeight + 7 > ball.r * 1.45) {
          font -= 0.5;
          ball.link.style.setProperty('--ball-font-size', `${font}px`);
        }
      }
      resolveCollisions();
      paint();
      wake();
    };

    const pointerPosition = (event) => {
      const rect = list.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * width / rect.width,
        y: (event.clientY - rect.top) * height / rect.height };
    };

    const release = () => {
      if (!drag) return;
      const { ball, pointerId, moved } = drag;
      if (moved) {
        // Pointerup can arrive before the next animation frame on quick drags.
        cancelAnimationFrame(frame);
        frame = 0;
        tick(performance.now());
        suppressClick = { link: ball.link, until: performance.now() + 500 };
      }
      drag = undefined;
      ball.link.classList.remove('is-dragging');
      ball.vx = 0;
      ball.vy = 0;
      if (ball.link.hasPointerCapture(pointerId)) ball.link.releasePointerCapture(pointerId);
      wake();
    };

    card.dataset.tagBalls = '';
    list.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !event.isPrimary || drag) return;
      const ball = balls.find((entry) => entry.link === event.target.closest('a'));
      if (!ball) return;
      const point = pointerPosition(event);
      suppressClick = undefined;
      drag = { ball, pointerId: event.pointerId, startX: point.x, startY: point.y,
        offsetX: point.x - ball.x, offsetY: point.y - ball.y, tx: ball.x, ty: ball.y, moved: false };
      ball.link.setPointerCapture(event.pointerId);
    }, { signal });
    list.addEventListener('pointermove', (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const point = pointerPosition(event);
      if (!drag.moved && Math.hypot(point.x - drag.startX, point.y - drag.startY) < 5) return;
      drag.moved = true;
      drag.ball.link.classList.add('is-dragging');
      drag.tx = clamp(point.x - drag.offsetX, drag.ball.r + wall, width - drag.ball.r - wall);
      drag.ty = clamp(point.y - drag.offsetY, drag.ball.r + wall, height - drag.ball.r - wall);
      event.preventDefault();
      wake();
    }, { signal });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      list.addEventListener(type, (event) => {
        if (drag?.pointerId === event.pointerId) release();
      }, { signal });
    }
    list.addEventListener('dragstart', (event) => event.preventDefault(), { signal });
    list.addEventListener('click', (event) => {
      if (event.detail && suppressClick?.link === event.target.closest('a') && performance.now() < suppressClick.until) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, { capture: true, signal });
    window.addEventListener('blur', release, { signal });
    const pause = () => {
      release();
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    };
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else wake(); }, { signal });
    reducedMotion.addEventListener('change', () => {
      balls.forEach((ball) => { ball.vx = 0; ball.vy = 0; });
      wake();
    }, { signal });
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) wake(); else pause();
    });
    visibilityObserver.observe(card);
    const resizeObserver = new ResizeObserver(layout);
    resizeObserver.observe(card.parentElement);
    window.addEventListener('resize', layout, { passive: true, signal });
    layout();
    active = { card, destroy: () => {
      release();
      controller.abort();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      cancelAnimationFrame(frame);
    } };
  };

  const bindNavigation = (event) => {
    const swup = window.swup || event?.detail?.swup;
    if (!swup?.hooks || swup === boundSwup) return;
    boundSwup = swup;
    swup.hooks.before('content:replace', cleanup);
    swup.hooks.on('page:view', refresh);
  };

  window.nagiTagBalls = { refresh };
  window.addEventListener('redefine:swup:ready', bindNavigation);
  bindNavigation();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, { once: true });
  else refresh();
})();
