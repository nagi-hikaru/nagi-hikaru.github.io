(() => {
  window.nagiCreateHomeRain = (background, signal) => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    if (signal.aborted || reducedMotion.matches) return null;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;
    canvas.className = 'home-banner-rain';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.hidden = true;
    // A sibling stays sharp when the portrait's own filter becomes blurred.
    background.after(canvas);

    let width = 1;
    let height = 1;
    let drops = [];
    let frame = 0;
    let lastTick = 0;

    // Soft cross-sections and tapered exposure streaks avoid sharp scratch marks.
    const makeStreak = (soft) => {
      const sprite = document.createElement('canvas');
      sprite.width = 32;
      sprite.height = 160;
      const brush = sprite.getContext('2d');
      const across = brush.createLinearGradient(0, 0, 32, 0);
      across.addColorStop(0, 'rgba(218, 226, 235, 0)');
      across.addColorStop(0.28, 'rgba(218, 226, 235, 0)');
      across.addColorStop(0.43, 'rgba(218, 226, 235, 0.5)');
      across.addColorStop(0.5, 'rgba(237, 240, 246, 0.95)');
      across.addColorStop(0.57, 'rgba(218, 226, 235, 0.5)');
      across.addColorStop(0.72, 'rgba(218, 226, 235, 0)');
      across.addColorStop(1, 'rgba(218, 226, 235, 0)');
      brush.fillStyle = across;
      brush.fillRect(0, 0, 32, 160);
      brush.globalCompositeOperation = 'destination-in';
      const along = brush.createLinearGradient(0, 0, 0, 160);
      along.addColorStop(0, 'rgba(255, 255, 255, 0)');
      along.addColorStop(0.2, 'rgba(255, 255, 255, 0.5)');
      along.addColorStop(0.75, 'white');
      along.addColorStop(0.94, 'rgba(255, 255, 255, 0.7)');
      along.addColorStop(1, 'rgba(255, 255, 255, 0)');
      brush.fillStyle = along;
      brush.fillRect(0, 0, 32, 160);
      if (!soft) return sprite;
      const blurred = document.createElement('canvas');
      blurred.width = 32;
      blurred.height = 160;
      const blur = blurred.getContext('2d');
      blur.filter = 'blur(3px)';
      blur.drawImage(sprite, 0, 0);
      return blurred;
    };
    const streak = makeStreak(false);
    const foregroundStreak = makeStreak(true);
    let ratio = 1;

    const allowed = () => !signal.aborted && !document.hidden && !reducedMotion.matches;
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTick = 0;
      canvas.hidden = true;
      context.clearRect(0, 0, width, height);
    };
    const draw = (time) => {
      frame = 0;
      if (!allowed()) { stop(); return; }
      // Rain does not need the display's full refresh rate.
      if (lastTick && time - lastTick < 1000 / 30 - 1) { frame = requestAnimationFrame(draw); return; }
      const step = lastTick ? Math.min(0.06, (time - lastTick) / 1000) : 1 / 30;
      lastTick = time;
      context.clearRect(0, 0, width, height);
      // One shared, slowly changing wind keeps the depth layers coherent.
      const wind = -0.19 + Math.sin(time * 0.00028) * 0.045 + Math.sin(time * 0.00069) * 0.018;
      context.save();
      for (const drop of drops) {
        const slant = wind * drop.wind;
        drop.x += drop.speed * slant * step;
        drop.y += drop.speed * step;
        if (drop.y > height + drop.length) { drop.y = -drop.length; drop.x = Math.random() * width; }
        if (drop.x < -50) drop.x = width + 30;
        context.setTransform(ratio, 0, 0, ratio, drop.x * ratio, drop.y * ratio);
        context.rotate(-Math.atan(slant));
        context.globalAlpha = drop.opacity * (0.75 + 0.25 * Math.sin(Math.min(1, drop.y / height) * Math.PI));
        context.drawImage(drop.near ? foregroundStreak : streak, -drop.width / 2, -drop.length, drop.width, drop.length);
      }
      context.restore();
      canvas.hidden = false;
      frame = requestAnimationFrame(draw);
    };
    const resume = () => {
      if (allowed() && !frame) frame = requestAnimationFrame(draw);
      else if (!allowed()) stop();
    };
    const resize = () => {
      if (signal.aborted) return;
      width = Math.max(1, document.documentElement.clientWidth);
      height = Math.max(1, window.innerHeight);
      ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.max(80, Math.min(360, Math.round(width * height / 4200)));
      drops = Array.from({ length: count }, () => {
        const layer = Math.random();
        const near = layer > 0.91;
        const middle = layer > 0.58 && !near;
        const speed = near ? 1050 + Math.random() * 500 : middle ? 580 + Math.random() * 360 : 260 + Math.random() * 220;
        return {
          x: Math.random() * (width + 50),
          y: Math.random() * height,
          speed,
          // Faster, closer drops leave longer exposure streaks and softer edges.
          length: speed * (0.036 + Math.random() * 0.025),
          width: near ? 15 + Math.random() * 10 : middle ? 5 + Math.random() * 3 : 2.5 + Math.random() * 2,
          opacity: near ? 0.28 + Math.random() * 0.2 : middle ? 0.42 + Math.random() * 0.25 : 0.2 + Math.random() * 0.2,
          wind: 0.9 + Math.random() * 0.2,
          near,
        };
      });
      resume();
    };

    window.addEventListener('resize', resize, { passive: true, signal });
    document.addEventListener('visibilitychange', resume, { signal });
    reducedMotion.addEventListener('change', resume, { signal });
    signal.addEventListener('abort', () => {
      stop();
      canvas.remove();
    }, { once: true });
    resize();

  };
})();
