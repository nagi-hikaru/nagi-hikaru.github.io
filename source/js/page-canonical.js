(() => {
  if (window.nagiCanonicalSync) return;
  window.nagiCanonicalSync = true;

  let boundSwup;

  const syncCanonical = (_visit, { page }) => {
    const incoming = new DOMParser().parseFromString(page.html, 'text/html');

    for (const selector of ['link[rel="canonical"]', 'meta[property="og:url"]']) {
      const next = incoming.head.querySelector(selector);
      const current = document.head.querySelector(selector);
      if (next) {
        const replacement = document.importNode(next, true);
        if (current) current.replaceWith(replacement);
        else document.head.appendChild(replacement);
      } else {
        current?.remove();
      }
    }
  };

  const bindNavigation = (event) => {
    const swup = window.swup || event?.detail?.swup;
    if (!swup?.hooks || swup === boundSwup) return;
    boundSwup = swup;
    // Utterances reads the canonical URL when SwupScriptsPlugin runs.
    swup.hooks.before('content:replace', syncCanonical);
  };

  window.addEventListener('redefine:swup:ready', bindNavigation);
  bindNavigation();
})();
