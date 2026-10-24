(() => {
  // Injected scripts run again after Swup navigation; keep one global canvas.
  if (window.nagiPointerTrail) {
    window.nagiPointerTrail.refresh();
    return;
  }

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const points = [];
  const particles = [];
  let canvas;
  let context;
  let background;
  let boundSwup;
  let frame = 0;
  let width = 0;
  let height = 0;
  let distance = 0;
  let target;
  let previous;

  const clear = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    points.length = 0;
    particles.length = 0;
    target = undefined;
    previous = undefined;
    distance = 0;
    context?.clearRect(0, 0, width, height);
    if (canvas) canvas.hidden = true;
  };

  const strength = () => {
    if (!background?.isConnected) background = document.querySelector('.home-banner-background.fixed');
    const blur = parseFloat(background?.style.getPropertyValue('--home-banner-blur')) || 0;
    return (1 - Math.min(1, blur / 15)) ** 1.5;
  };

  const resize = () => {
    if (!canvas) return;
    clear();
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const createCanvas = () => {
    if (canvas) return true;
    const element = document.createElement('canvas');
    const drawing = element.getContext('2d');
    if (!drawing) return false;
    canvas = element;
    context = drawing;
    canvas.className = 'pointer-trail';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.hidden = true;
    document.body.append(canvas);
    resize();
    return true;
  };

  const addPoint = (time) => {
    if (!target || target === previous) return;
    const dx = previous ? target.x - previous.x : 0;
    const dy = previous ? target.y - previous.y : 0;
    const travel = Math.hypot(dx, dy);
    // Do not draw a diagonal across the page after a pointer jump.
    if (travel > 240) { points.length = 0; particles.length = 0; }
    distance += travel;
    points.push({ ...target, time, distance });
    if (previous && travel > 2 && travel <= 240) {
      const count = Math.min(3, Math.ceil(travel / 14));
      for (let i = 0; i < count; i++) {
        const offset = (i + 0.5) / count;
        particles.push({
          x: previous.x + dx * offset,
          y: previous.y + dy * offset,
          nx: -dy / travel,
          ny: dx / travel,
          drift: (Math.random() - 0.5) * 24,
          lift: 7 + Math.random() * 12,
          radius: 0.85 + Math.random() * 1.05,
          life: 600 + Math.random() * 300,
          color: Math.random() < 0.65 ? 0 : 1,
          time,
        });
      }
    }
    previous = target;
    if (points.length > 36) points.splice(0, points.length - 36);
    if (particles.length > 48) particles.splice(0, particles.length - 48);
  };

  const draw = (time) => {
    frame = 0;
    const visibility = strength();
    if (document.hidden || !finePointer.matches || reducedMotion.matches || visibility <= 0) { clear(); return; }
    addPoint(time);
    while (points.length && (time - points[0].time > 460 || distance - points[0].distance > 230)) points.shift();
    for (let i = particles.length - 1; i >= 0; i--) {
      if (time - particles[i].time >= particles[i].life) particles.splice(i, 1);
    }
    context.clearRect(0, 0, width, height);
    if (!points.length && !particles.length) { clear(); return; }
    canvas.hidden = false;
    const dark = document.documentElement.classList.contains('dark');
    const palette = dark ? ['202, 160, 175', '234, 214, 188'] : ['145, 94, 113', '167, 132, 92'];
    context.lineCap = 'round';
    context.lineJoin = 'round';

    const ribbon = points.map((point, index) => {
      const before = points[Math.max(0, index - 1)];
      const after = points[Math.min(points.length - 1, index + 1)];
      const dx = after.x - before.x, dy = after.y - before.y;
      const length = Math.hypot(dx, dy) || 1;
      const age = Math.min(1, (time - point.time) / 460);
      const flutter = Math.sin(age * 7) * age * 9;
      return { x: point.x - dy / length * flutter, y: point.y + dx / length * flutter, age };
    });
    context.shadowBlur = 11;
    context.shadowColor = `rgba(${palette[0]}, 0.3)`;
    for (let i = 1; i < ribbon.length; i++) {
      const before = ribbon[i - 1], point = ribbon[i], after = ribbon[Math.min(i + 1, ribbon.length - 1)];
      const fade = (1 - point.age) ** 1.6;
      context.strokeStyle = `rgba(${palette[0]}, ${visibility * fade * 0.68})`;
      context.lineWidth = 5.1 * (0.2 + 0.8 * fade);
      context.beginPath();
      context.moveTo((before.x + point.x) / 2, (before.y + point.y) / 2);
      context.quadraticCurveTo(point.x, point.y, (point.x + after.x) / 2, (point.y + after.y) / 2);
      context.stroke();
    }

    context.shadowBlur = 8;
    for (const particle of particles) {
      const age = (time - particle.time) / particle.life;
      const drift = Math.sin(age * Math.PI) * particle.drift;
      const x = particle.x + particle.nx * drift;
      const y = particle.y + particle.ny * drift - age * particle.lift;
      const color = palette[particle.color];
      context.shadowColor = `rgba(${color}, 0.3)`;
      context.fillStyle = `rgba(${color}, ${visibility * (1 - age) ** 2 * 0.55})`;
      context.beginPath();
      context.arc(x, y, particle.radius * (1 - age * 0.45), 0, Math.PI * 2);
      context.fill();
    }
    context.shadowBlur = 0;
    frame = requestAnimationFrame(draw);
  };

  const move = (event) => {
    if (event.pointerType !== 'mouse' || !finePointer.matches || reducedMotion.matches || document.hidden) return;
    if (event.buttons || event.target.closest('input, textarea, [contenteditable="true"], .search-pop-overlay.active') || strength() <= 0) { clear(); return; }
    if (!createCanvas()) return;
    target = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(draw);
  };

  const refresh = () => {
    clear();
    background = document.querySelector('.home-banner-background.fixed');
  };
  const bindNavigation = (event) => {
    const swup = window.swup || event?.detail?.swup;
    if (!swup?.hooks || swup === boundSwup) return;
    boundSwup = swup;
    swup.hooks.before('content:replace', clear);
    swup.hooks.on('page:view', refresh);
  };

  window.nagiPointerTrail = { refresh };
  document.addEventListener('pointermove', move, { passive: true });
  document.documentElement.addEventListener('pointerleave', clear);
  document.addEventListener('visibilitychange', clear);
  window.addEventListener('blur', clear);
  window.addEventListener('pagehide', clear);
  window.addEventListener('resize', resize, { passive: true });
  for (const media of [finePointer, reducedMotion]) media.addEventListener('change', clear);
  window.addEventListener('redefine:swup:ready', bindNavigation);
  bindNavigation();
  refresh();
})();
