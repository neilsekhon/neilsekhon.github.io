(() => {
  // Keep local previews and alternate hosts out of production reports.
  if (!['neilsekhon.com', 'www.neilsekhon.com'].includes(location.hostname)) return;
  if (window.siteAnalytics) return;

  const measurementId = 'G-Z3XWJJCM1W';
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  const allowedEvents = new Set([
    'portfolio_click', 'resume_click', 'portfolio_open', 'resume_open', 'slide_view',
  ]);
  window.siteAnalytics = (name, parameters = {}) => {
    if (!allowedEvents.has(name)) return;
    // Only a numeric slide position is accepted; never collect form values or deck copy.
    const safeParameters = name === 'slide_view' && Number.isInteger(parameters.slide_number)
      ? { slide_number: parameters.slide_number } : {};
    gtag('event', name, safeParameters);
  };

  gtag('js', new Date());
  gtag('config', measurementId, {
    page_location: location.origin + location.pathname,
    page_title: location.pathname.startsWith('/deck/') ? 'Portfolio' : 'Neil Sekhon',
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

  document.addEventListener('click', event => {
    if (event.target.closest('button.portfolio')) window.siteAnalytics('portfolio_click');
    if (event.target.closest('button.resume')) window.siteAnalytics('resume_click');
  });

  let previousSlide;
  function trackSlide() {
    const slides = [...document.querySelectorAll('.slide')];
    const number = slides.findIndex(slide => slide.classList.contains('active')) + 1;
    if (number > 0 && number !== previousSlide) {
      previousSlide = number;
      window.siteAnalytics('slide_view', { slide_number: number });
    }
  }
  trackSlide();
  window.addEventListener('hashchange', trackSlide);
})();
