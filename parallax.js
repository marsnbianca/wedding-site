// parallax.js
// Lightweight scroll + pointer parallax for section panels
// Includes horizontal "cloud clearing" behavior for .cloud-layer elements in the hero panel.

(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    document.documentElement.classList.remove('no-js');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const smallScreen = window.matchMedia('(max-width: 900px)').matches;
    const disableHeavy = prefersReducedMotion || smallScreen;

    const sections = Array.from(document.querySelectorAll('.parallax-section'));
    const panels = sections.map((section) => {
      const layers = Array.from(section.querySelectorAll('.parallax-layer')).map((el) => {
        const speed = parseFloat(el.dataset.speed || '0.2');
        const bg = el.dataset.bg || '';
        // optional cloud-specific props
        const isCloud = el.classList.contains('cloud-layer');
        const sideSpeed = parseFloat(el.dataset.sideSpeed || '0'); // horizontal clearing speed
        const dir = parseFloat(el.dataset.dir || '1'); // left (-1) or right (1)
        return { el, speed: isFinite(speed) ? speed : 0.2, bg, isCloud, sideSpeed: isFinite(sideSpeed) ? sideSpeed : 0, dir: isFinite(dir) ? dir : 1 };
      });
      return { section, layers };
    });

    // Load data-bg attributes into style.backgroundImage
    panels.forEach(({ layers }) => {
      layers.forEach(({ el, bg }) => {
        if (bg) el.style.backgroundImage = 'url("' + bg + '")';
      });
    });

    let ticking = false;

    function update() {
      const vh = window.innerHeight;

      panels.forEach(({ section, layers }) => {
        const rect = section.getBoundingClientRect();

        // Normalized distance from viewport center (-1..1)
        const sectionCenter = rect.top + rect.height / 2;
        const viewportCenter = vh / 2;
        const distance = sectionCenter - viewportCenter;
        const norm = Math.max(-1, Math.min(1, distance / (vh / 1.2)));

        // Progress through the section (0 when top visible, 1 when section scrolled past top)
        // This is useful to move clouds horizontally as user scrolls down through the hero.
        const progress = Math.max(0, Math.min(1, (-rect.top) / rect.height));

        layers.forEach(({ el, speed, isCloud, sideSpeed, dir }) => {
          if (disableHeavy) {
            // Subtle fallback: move background-position vertically
            el.style.transform = 'translateX(-50%) translateY(0px)';
            if (el.style.backgroundImage) {
              const posY = 50 + norm * speed * 8; // percent
              el.style.backgroundPosition = `center ${posY}%`;
            }
            return;
          }

          // Vertical parallax (same as before)
          const pxFactor = 80;
          const translateY = -norm * speed * pxFactor;

          // Cloud-specific horizontal clearing animation:
          if (isCloud && sideSpeed > 0) {
            // sideMax controls how far clouds move horizontally (in px). Tweak to taste.
            const sideMax = Math.max(window.innerWidth * 0.6, 300); // ensure large enough to push off-screen
            const sideOffset = progress * sideSpeed * sideMax; // 0..sideMax * sideSpeed
            const x = dir * sideOffset;
            // We combine horizontal offset with the base centering (-50%).
            el.style.transform = `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(${translateY.toFixed(1)}px)`;
          } else {
            // Regular layer: keep centered horizontally, apply vertical movement
            el.style.transform = `translateX(-50%) translateY(${translateY.toFixed(2)}px)`;
          }
        });
      });

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    // pointer parallax for hero (keeps subtle pointer moves)
    const hero = document.getElementById('panel-hero');
    const supportsPointer = 'onpointermove' in window && !/Mobi|Android/i.test(navigator.userAgent);
    let pointerEnabled = supportsPointer && !disableHeavy && hero;

    function onPointer(e) {
      const rect = hero.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      const maxOffset = 18;
      const heroLayers = Array.from(hero.querySelectorAll('.parallax-layer'));
      heroLayers.forEach((el) => {
        const speed = parseFloat(el.dataset.speed || '0.2');
        const x = dx * speed * maxOffset;
        const y = dy * speed * maxOffset;
        // For cloud layers we only apply a small pointer X offset (so pointer doesn't fight the clearing animation)
        if (el.classList.contains('cloud-layer')) {
          el.style.transform = `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(${y.toFixed(1)}px)`;
        } else {
          el.style.transform = `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(${y.toFixed(1)}px)`;
        }
      });
    }

    // init
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    if (pointerEnabled) {
      hero.addEventListener('pointermove', onPointer);
      hero.addEventListener('pointerleave', update);
    }

    // API to set backgrounds later if needed
    window.ParallaxPanels = {
      refresh: update,
      disable: function () {
        window.removeEventListener('scroll', onScroll);
        if (pointerEnabled) hero.removeEventListener('pointermove', onPointer);
      }
    };
  }
})();
