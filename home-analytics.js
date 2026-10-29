(() => {
  // Keep local previews and alternate hosts out of production reports.
  if (!['neilsekhon.com', 'www.neilsekhon.com'].includes(location.hostname)) return;
  if (window.siteAnalytics) return;

  const measurementId = 'G-Z3XWJJCM1W';
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  // Only these events, and only these parameter values, ever leave the page.
  const projects = new Set(['rhythmoji', 'blockle', 'dayhub', 'codehop', 'totem', 'freshman15']);
  const sources = new Set(['button', 'phone']);
  const allowedEvents = new Set(['project_view', 'game_play', 'opossum', 'soft_tap']);
  window.siteAnalytics = (name, parameters = {}) => {
    if (!allowedEvents.has(name)) return;
    const safe = {};
    if (projects.has(parameters.project)) safe.project = parameters.project;
    if (name === 'game_play' && sources.has(parameters.source)) safe.source = parameters.source;
    gtag('event', name, safe);
  };

  gtag('js', new Date());
  gtag('config', measurementId, {
    page_location: location.origin + location.pathname,
    page_title: 'Neil Sekhon',
    page_referrer: (() => {
      try { return new URL(document.referrer).origin; } catch { return ''; }
    })(),
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.appendChild(script);

  const projectOf = el => el.closest('[data-project]')?.dataset.project;

  // Capture phase, so taps the page intercepts (soft content, the opossum) still count.
  document.addEventListener('click', event => {
    const target = event.target;
    const project = projectOf(target);
    if (!project) return;
    if (document.documentElement.classList.contains('soft')) {
      window.siteAnalytics('soft_tap', { project });
    } else if (target.closest('a.play')) {
      window.siteAnalytics('game_play', { project, source: 'button' });
    } else if (target.closest('a.phone')) {
      window.siteAnalytics('game_play', { project, source: 'phone' });
    } else if (target.closest('li.old figure')) {
      window.siteAnalytics('opossum', { project });
    }
  }, true);

  // How far down people get: each project counts once, when half of it is on screen.
  const seen = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    seen.unobserve(entry.target);
    window.siteAnalytics('project_view', { project: entry.target.dataset.project });
  }), { threshold: 0.5 });
  const watch = () => document.querySelectorAll('[data-project]').forEach(el => seen.observe(el));
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', watch) : watch();
})();
