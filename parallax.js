// parallax.js
// Parallax with horizontal "cloud clearing" across panel-clouds -> panel-sky
// Clouds move horizontally off-screen at different speeds as user scrolls through the first two panels.

(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    document.documentElement.classList.remove('no-js');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const smallScreen = window.matchMedia('(max-width: 600px)').matches; // more conservative for mobile
    const disableHeavy = prefersReducedMotion || smallScreen;

    const cloudPanel = document.getElementById('panel-clouds');
    const skyPanel = document.getElementById('panel-sky');

    const panels = Array.from(document.querySelectorAll('.parallax-section')).map(section => {
      const layers = Array.from(section.querySelectorAll('.parallax-layer')).map(el => {
        const speed = parseFloat(el.dataset.speed || '0.2');
        const bg = el.dataset.bg || '';
        const isCloud = el.classList.contains('cloud-layer');
        const sideSpeed = parseFloat(el.dataset.sideSpeed || '0');
        const dir = parseFloat(el.dataset.dir || '1');
        return { el, speed: isFinite(speed) ? speed : 0.2, bg, isCloud, sideSpeed: isFinite(sideSpeed) ? sideSpeed : 0, dir: isFinite(dir) ? dir : 1 };
      });
      return { section, layers };
    });

    // apply data-bg images if present
    panels.forEach(({ layers }) => {
      layers.forEach(({ el, bg }) => {
        if (bg) el.style.backgroundImage = 'url("' + bg + '")';
      });
    });

    let ticking = false;

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function update() {
      const vh = window.innerHeight;
      const scrollY = window.scrollY || window.pageYOffset;

      // compute cloud clearing progress across the vertical span from top of cloudPanel to bottom of skyPanel
      let cloudProgress = 0;
      if (cloudPanel && skyPanel) {
        const cloudTop = cloudPanel.getBoundingClientRect().top + scrollY;
        const skyBottom = skyPanel.getBoundingClientRect().bottom + scrollY;
        const totalSpan = Math.max(1, skyBottom - cloudTop); // avoid divide by 0
        cloudProgress = clamp((scrollY - cloudTop) / totalSpan, 0, 1);
      }

      panels.forEach(({ section, layers }) => {
        const rect = section.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const viewportCenter = vh / 2;
        const distance = sectionCenter - viewportCenter;
        const norm = clamp(distance / (vh / 1.2), -1, 1);

        layers.forEach(({ el, speed, isCloud, sideSpeed, dir }) => {
          if (disableHeavy) {
            // fallback: subtle background-position shift
            el.style.transform = 'translateX(-50%) translateY(0px)';
            if (el.style.backgroundImage) {
              const posY = 50 + norm * speed * 8;
              el.style.backgroundPosition = `center ${posY}%`;
            }
            return;
          }

          const pxFactor = 80;
          const translateY = -norm * speed * pxFactor;

          if (isCloud && sideSpeed > 0) {
            // calculate horizontal offset based on cloudProgress (0..1)
            // sideMax ensures clouds move enough to exit screen
            const sideMax = Math.max(window.innerWidth * 0.7, 400); // px
            const sideOffset = cloudProgress * sideSpeed * sideMax;
            const x = dir * sideOffset;
            el.style.transform = `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(${translateY.toFixed(1)}px)`;
          } else {
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

    // Optional pointer parallax for desktop hero (subtle)
    const hero = document.getElementById('panel-clouds');
    const supportsPointer = 'onpointermove' in window && !/Mobi|Android/i.test(navigator.userAgent);
    let pointerEnabled = supportsPointer && !disableHeavy && hero;

    function onPointer(e) {
      const rect = hero.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      const maxOffset = 12;
      const heroLayers = Array.from(hero.querySelectorAll('.parallax-layer'));
      heroLayers.forEach((el) => {
        const speed = parseFloat(el.dataset.speed || '0.2');
        const x = dx * speed * maxOffset;
        const y = dy * speed * maxOffset;
        el.style.transform = `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(${y.toFixed(1)}px)`;
      });
    }

    // initialize
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    if (pointerEnabled) {
      hero.addEventListener('pointermove', onPointer);
      hero.addEventListener('pointerleave', update);
    }

    // public API for debugging or dynamic backgrounds
    window.ParallaxPanels = {
      refresh: update,
      disable: function () {
        window.removeEventListener('scroll', onScroll);
        if (pointerEnabled) hero.removeEventListener('pointermove', onPointer);
      }
    };
  }
})();
