// buttons.js
// Generalized image-button handling for site image buttons (RSVP, MAP, etc.)
// Swaps primary/hover images, supports keyboard focus and pointer events.
// Keeps element ids so other scripts (e.g., rsvp-overlay.js) can find them.

(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Config: map of id => [defaultSrc, hoverSrc, altText]
    const btnMap = {
      'rsvp-trigger': ['assets/buttons/RSVP1.PNG', 'assets/buttons/RSVP2.PNG', 'RSVP'],
      'map-trigger' : ['assets/buttons/MAP1.PNG',  'assets/buttons/MAP2.PNG',  'Map']
    };

    Object.keys(btnMap).forEach((id) => {
      const [defaultSrc, hoverSrc, altText] = btnMap[id];
      const el = document.getElementById(id);
      if (!el) return;

      // ensure element is an <img> that acts as a button; preserve id so other scripts can hook.
      el.src = defaultSrc;
      el.alt = altText;
      el.setAttribute('aria-label', altText);
      // ensure keyboard focusability if not a native button
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');

      // pointerenter/leave
      el.addEventListener('pointerenter', () => { el.src = hoverSrc; });
      el.addEventListener('pointerleave', () => { el.src = defaultSrc; });

      // fallback mouse events
      el.addEventListener('mouseover', () => { el.src = hoverSrc; });
      el.addEventListener('mouseout', () => { el.src = defaultSrc; });

      // keyboard focus/blur
      el.addEventListener('focus', () => { el.src = hoverSrc; }, true);
      el.addEventListener('blur', () => { el.src = defaultSrc; }, true);

      // keyboard activation: Enter/Space should trigger click so overlay scripts depending on click still work
      el.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          el.click();
        }
      });

      // touch: do not change on tap by default (users expect tap). If you want visual feedback on touch, uncomment:
      // el.addEventListener('touchstart', () => { el.src = hoverSrc; });
      // el.addEventListener('touchend', () => { setTimeout(() => el.src = defaultSrc, 200); });
    });
  }
})();
