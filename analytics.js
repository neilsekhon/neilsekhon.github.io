(() => {
  // Keep local previews and alternate hosts out of production reports.
  if (!['neilsekhon.com', 'www.neilsekhon.com'].includes(location.hostname)) return;
  if (window.siteAnalytics) return;

  const measurementId = 'G-Z3XWJJCM1W';
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  // Only these events, and only these parameter values, ever leave the page.
  const projects = new Set(['rhythmoji', 'blockle', 'dayhub', 'codehop', 'totem', 'freshman15', 'output-styles']);
  const sources = new Set(['button', 'snapchat', 'phone']);
  const files = new Set(['v1', 'v2']);
  const allowedEvents = new Set(['project_view', 'game_play', 'opossum', 'soft_tap', 'download', 'image_open']);
  window.siteAnalytics = (name, parameters = {}) => {
    if (!allowedEvents.has(name)) return;
    const safe = {};
    if (projects.has(parameters.project)) safe.project = parameters.project;
    if (name === 'game_play' && sources.has(parameters.source)) safe.source = parameters.source;
    if (name === 'download' && files.has(parameters.file)) safe.file = parameters.file;
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
    } else if (target.closest('[data-zoom]')) {
      window.siteAnalytics('image_open', { project });
    } else if (target.closest('a[download]')) {
      // A download link names its file, such as data-file="v1".
      window.siteAnalytics('download', { project, file: target.closest('a[download]').dataset?.file });
    } else if (target.closest('a.play')) {
      // A second button names its own source, such as data-source="snapchat".
      window.siteAnalytics('game_play', { project, source: target.closest('a.play').dataset?.source || 'button' });
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
  const watch = () => document.querySelectorAll('li[data-project]').forEach(el => seen.observe(el));
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', watch) : watch();
})();
