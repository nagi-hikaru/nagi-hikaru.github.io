(() => {
  // Swup may reload injected scripts; keep a single set of page listeners.
  if (window.nagiHomeBannerBlur) {
    window.nagiHomeBannerBlur.refresh();
    return;
  }

  let disposePage = () => {};
  let boundSwup;

  const cleanup = () => {
    disposePage();
    disposePage = () => {};
  };

  const refresh = () => {
    cleanup();

    const banner = document.querySelector('.home-banner-container');
    const title = banner?.querySelector('.description');
    const background = document.querySelector('.home-banner-background');
    const navbar = document.querySelector('.navbar-container');
    if (!title || !background?.classList.contains('fixed')) return;

    const controller = new AbortController();
    const { signal } = controller;
    const refraction = window.nagiCreateHomeRefraction?.(background, banner, signal);
    let frame = 0;
    let start = 0;
    let end = 1;

    background.setAttribute('data-progressive-blur', '');

    const update = () => {
      frame = 0;
      const progress = Math.max(0, Math.min(1, (window.scrollY - start) / (end - start)));
      // Smoothstep eases both ends without introducing a scroll threshold jump.
      const eased = progress * progress * (3 - 2 * progress);
      background.style.setProperty('--home-banner-blur', `${(15 * eased).toFixed(3)}px`);
      refraction?.setProgress(eased);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const measure = () => {
      const headerHeight = navbar?.getBoundingClientRect().height || 0;
      const titleBounds = title.getBoundingClientRect();
      const approachDistance = Math.max(32, Math.min(72, window.innerHeight * 0.08));
      // Begin just before the title enters the frosted navbar. Reach full blur
      // when the entire title/subtitle block has passed behind its lower edge.
      start = Math.max(0, titleBounds.top + window.scrollY - headerHeight - approachDistance);
      end = Math.max(start + 1, titleBounds.bottom + window.scrollY - headerHeight);
      schedule();
    };

    const observer = new ResizeObserver(measure);
    observer.observe(banner);
    observer.observe(title);
    if (navbar) observer.observe(navbar);
    window.addEventListener('scroll', schedule, { passive: true, signal });
    window.addEventListener('resize', measure, { passive: true, signal });
    window.addEventListener('pageshow', measure, { signal });
    document.fonts?.ready.then(() => {
      if (!signal.aborted) measure();
    });

    disposePage = () => {
      controller.abort();
      observer.disconnect();
      cancelAnimationFrame(frame);
      background.removeAttribute('data-progressive-blur');
      background.style.removeProperty('--home-banner-blur');
    };

    measure();
  };

  const bindNavigation = (event) => {
    const swup = window.swup || event?.detail?.swup;
    if (!swup?.hooks || swup === boundSwup) return;
    boundSwup = swup;
    swup.hooks.before('content:replace', cleanup);
    swup.hooks.on('page:view', refresh);
  };

  window.nagiHomeBannerBlur = { refresh };
  window.addEventListener('redefine:swup:ready', bindNavigation);
  bindNavigation();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh, { once: true });
  } else {
    refresh();
  }
})();
