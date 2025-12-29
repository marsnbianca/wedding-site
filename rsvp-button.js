// rsvp-button.js
// Handles RSVP button hover/focus visual swap (keeps id same so overlay script can target it).
(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const img = document.getElementById('rsvp-trigger');
    if (!img) return;

    // Paths relative to index.html
    const defaultSrc = 'assets/buttons/RSVP1.PNG';
    const hoverSrc = 'assets/buttons/RSVP2.PNG';

    // Set initial attributes
    img.src = defaultSrc;
    img.alt = 'RSVP';
    img.setAttribute('aria-label', 'RSVP');

    // Pointer and mouse events
    img.addEventListener('pointerenter', () => { img.src = hoverSrc; });
    img.addEventListener('pointerleave', () => { img.src = defaultSrc; });
    img.addEventListener('mouseover', () => { img.src = hoverSrc; });
    img.addEventListener('mouseout', () => { img.src = defaultSrc; });

    // Keyboard accessibility
    img.addEventListener('focus', () => { img.src = hoverSrc; }, true);
    img.addEventListener('blur', () => { img.src = defaultSrc; }, true);

    // Touch: leave commented - touch users expect tapping to activate overlay.
    // Uncomment if you want quick feedback on touchstart.
    // img.addEventListener('touchstart', () => { img.src = hoverSrc; });
    // img.addEventListener('touchend', () => { setTimeout(() => img.src = defaultSrc, 200); });
  }
})();
