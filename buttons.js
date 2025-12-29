// buttons.js
// Generalized image-button handling for site image buttons (RSVP, MAP, etc.)
// Swaps primary/hover images, supports keyboard focus and pointer events.
// Keeps element ids and any title/aria-label so other scripts (e.g., rsvp-overlay.js) can find them.

(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Map of id => [defaultSrc, hoverSrc, altText]
    const btnMap = {
      'rsvp-trigger': ['assets/buttons/RSVP1.PNG', 'assets/buttons/RSVP2.PNG', 'RSVP'],
      'map-trigger' : ['assets/buttons/MAP1.PNG',  'assets/buttons/MAP2.PNG',  'Map']
    };

    Object.keys(btnMap).forEach((id) => {
      const [defaultSrc, hoverSrc, altText] = btnMap[id];
      const el = document.getElementById(id);
      if (!el) return;

      // Set visible alt but preserve title/aria-label if overlay script relies on them
      el.src = defaultSrc;
      el.alt = altText;
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', altText);

      // keyboard accessibility
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');

      // hover/pointer behaviors
      el.addEventListener('pointerenter', () => { el.src = hoverSrc; });
      el.addEventListener('pointerleave', () => { el.src = defaultSrc; });
      el.addEventListener('mouseover', () => { el.src = hoverSrc; });
      el.addEventListener('mouseout', () => { el.src = defaultSrc; });

      el.addEventListener('focus', () => { el.src = hoverSrc; }, true);
      el.addEventListener('blur', () => { el.src = defaultSrc; }, true);

      // keyboard activation: Enter/Space triggers click
      el.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          el.click();
        }
      });

      // Debug helper (remove in production)
      el.addEventListener('click', (e) => {
        console.debug('[buttons.js] click fired on', id, 'event:', e);
      });
    });
  }
})();
