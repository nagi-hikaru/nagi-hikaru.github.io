(() => {
  if (window.nagiUtterances) {
    window.nagiUtterances.refresh();
    return;
  }

  let active;
  let boundSwup;
  const cleanup = () => {
    active?.destroy();
    active = undefined;
  };

  const refresh = () => {
    const container = document.getElementById('utterances-container');
    if (active?.container === container) return;
    cleanup();
    if (!container?.dataset.repo) return;
    const mount = container.querySelector('.utterances-mount');
    const status = container.querySelector('.utterances-status');
    const message = container.querySelector('.utterances-message');
    const retry = container.querySelector('.utterances-retry');
    const github = container.querySelector('.utterances-github');
    if (!mount || !status || !message || !retry || !github) return;

    const { repo, issueNumber, issueTerm, label } = container.dataset;
    if (issueNumber) {
      github.href = `https://github.com/${repo}/issues/${encodeURIComponent(issueNumber)}`;
    } else {
      const canonical = document.querySelector('link[rel="canonical"]')?.href || location.origin + location.pathname;
      const terms = {
        pathname: location.pathname.length < 2 ? 'index' : location.pathname.slice(1).replace(/\.\w+$/, ''),
        url: canonical,
        title: document.title,
        'og:title': document.querySelector('meta[property="og:title"]')?.content || '',
      };
      const term = terms[issueTerm] ?? issueTerm;
      github.href = `https://github.com/${repo}/issues?q=${encodeURIComponent(`is:issue in:title "${term}"`)}`;
    }

    const controller = new AbortController();
    let attempt;
    let timer;
    let ready = false;
    const stopAttempt = () => {
      clearTimeout(timer);
      attempt?.abort();
    };
    const failed = (text) => {
      if (ready || controller.signal.aborted) return;
      status.hidden = false;
      status.dataset.state = 'error';
      message.textContent = text;
      retry.hidden = false;
      clearTimeout(timer);
    };

    const load = () => {
      stopAttempt();
      attempt = new AbortController();
      ready = false;
      mount.replaceChildren();
      status.hidden = false;
      status.dataset.state = 'loading';
      message.textContent = '评论正在加载…';
      retry.hidden = true;
      const script = document.createElement('script');
      script.src = 'https://utteranc.es/client.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('repo', repo);
      script.setAttribute(issueNumber ? 'issue-number' : 'issue-term', issueNumber || issueTerm || 'pathname');
      if (label) script.setAttribute('label', label);
      const dark = document.body.classList.contains('dark-mode');
      script.setAttribute('theme', dark ? container.dataset.utterancesThemeDark : container.dataset.utterancesThemeLight);
      script.addEventListener('error', () => failed('评论服务暂时连接不上，请重试或前往 GitHub。'), { signal: attempt.signal });
      timer = setTimeout(() => failed('评论加载时间较长，可以重试或前往 GitHub。'), 10000);
      mount.appendChild(script);
    };

    window.addEventListener('message', (event) => {
      const frame = mount.querySelector('iframe.utterances-frame');
      if (event.origin !== 'https://utteranc.es' || !frame || event.source !== frame.contentWindow) return;
      if (event.data?.type !== 'resize' || !(Number(event.data.height) > 0)) return;
      ready = true;
      clearTimeout(timer);
      status.hidden = true;
    }, { signal: controller.signal });
    retry.addEventListener('click', load, { signal: controller.signal });
    active = { container, destroy: () => { stopAttempt(); controller.abort(); } };
    load();
  };

  const bindNavigation = (event) => {
    const swup = window.swup || event?.detail?.swup;
    if (!swup?.hooks || swup === boundSwup) return;
    boundSwup = swup;
    swup.hooks.before('content:replace', cleanup);
    swup.hooks.on('page:view', refresh);
  };

  window.nagiUtterances = { refresh };
  window.addEventListener('redefine:swup:ready', bindNavigation);
  bindNavigation();
  refresh();
})();
