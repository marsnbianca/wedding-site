// parallax.js
// Lightweight scroll + pointer parallax for section panels
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
        return { el, speed: isFinite(speed) ? speed : 0.2, bg };
      });
      return { section, layers };
    });

    function setBackgrounds(map) {
      Object.keys(map).forEach((id) => {
        const urls = map[id];
        const sec = document.getElementById(id);
        if (!sec) return;
        const layerEls = Array.from(sec.querySelectorAll('.parallax-layer'));
        layerEls.forEach((el, i) => {
          const url = urls[i];
          if (url) el.style.backgroundImage = 'url("' + url + '")';
        });
      });
    }

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
        const sectionCenter = rect.top + rect.height / 2;
        const viewportCenter = vh / 2;
        const distance = sectionCenter - viewportCenter;
        const norm = Math.max(-1, Math.min(1, distance / (vh / 1.2)));

        layers.forEach(({ el, speed }) => {
          if (disableHeavy) {
            el.style.transform = 'translateX(-50%) translateY(0px)';
            if (el.style.backgroundImage) {
              const posY = 50 + norm * speed * 8;
              el.style.backgroundPosition = `center ${posY}%`;
            }
            return;
          }

          const pxFactor = 80;
          const translateY = -norm * speed * pxFactor;
          el.style.transform = `translateX(-50%) translateY(${translateY.toFixed(2)}px)`;
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
        el.style.transform = `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(${y.toFixed(1)}px)`;
      });
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    if (pointerEnabled) {
      hero.addEventListener('pointermove', onPointer);
      hero.addEventListener('pointerleave', update);
    }

    window.ParallaxPanels = {
      setBackgrounds,
      refresh: update,
      disable: function () {
        window.removeEventListener('scroll', onScroll);
        if (pointerEnabled) hero.removeEventListener('pointermove', onPointer);
      }
    };
  }
})();
