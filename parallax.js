// parallax.js
// Parallax with horizontal "cloud clearing" across panel-clouds -> panel-sky
// Clouds support a data-vertical-offset attribute (percent of that panel's height) to scatter starting positions.

(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    document.documentElement.classList.remove('no-js');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const smallScreen = window.matchMedia('(max-width: 600px)').matches;
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
        // New: vertical offset, percent of section height (-100 .. 100)
        const vOffsetPercent = parseFloat(el.dataset.verticalOffset || el.dataset.verticalOffset === '0' ? el.dataset.verticalOffset : (el.getAttribute('data-vertical-offset') || 0));
        return { el, speed: isFinite(speed) ? speed : 0.2, bg, isCloud, sideSpeed: isFinite(sideSpeed) ? sideSpeed : 0, dir: isFinite(dir) ? dir : 1, vOffsetPercent: isFinite(vOffsetPercent) ? vOffsetPercent : 0 };
      });
      return { section, layers };
    });

    // apply provided data-bg images (if any)
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

      // cloud clearing progress based on scroll through panel-clouds -> panel-sky span
      let cloudProgress = 0;
      if (cloudPanel && skyPanel) {
        const cloudTop = cloudPanel.getBoundingClientRect().top + scrollY;
        const skyBottom = skyPanel.getBoundingClientRect().bottom + scrollY;
        const totalSpan = Math.max(1, skyBottom - cloudTop);
        cloudProgress = clamp((scrollY - cloudTop) / totalSpan, 0, 1);
      }

      panels.forEach(({ section, layers }) => {
        const rect = section.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const viewportCenter = vh / 2;
        const distance = sectionCenter - viewportCenter;
        const norm = clamp(distance / (vh / 1.2), -1, 1);

        layers.forEach(({ el, speed, isCloud, sideSpeed, dir, vOffsetPercent }) => {
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
          // base vertical translate from parallax
          const translateYParallax = -norm * speed * pxFactor;

          // vertical initial offset from data-vertical-offset (percent of this section height)
          const initialOffsetPx = (vOffsetPercent / 100) * rect.height;

          const totalTranslateY = translateYParallax + initialOffsetPx;

          if (isCloud && sideSpeed > 0) {
            // horizontal clearing:
            const sideMax = Math.max(window.innerWidth * 0.7, 400);
            const sideOffset = cloudProgress * sideSpeed * sideMax;
            const x = dir * sideOffset;
            el.style.transform = `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(${totalTranslateY.toFixed(1)}px)`;
          } else {
            el.style.transform = `translateX(-50%) translateY(${totalTranslateY.toFixed(2)}px)`;
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

    // pointer parallax for desktop clouds (very subtle)
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

    window.ParallaxPanels = {
      refresh: update,
      disable: function () {
        window.removeEventListener('scroll', onScroll);
        if (pointerEnabled) hero.removeEventListener('pointermove', onPointer);
      }
    };
  }
})();
