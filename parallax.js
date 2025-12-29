// parallax.js
// Improved cloud scattering + sizing and extended clearing span so clouds remain visible into panel 3.
// - Clouds are positioned relative to their panel (startX/startY percent => center point).
// - Cloud size is fraction of viewport width, scaled up on large screens, reduced on tablet/mobile.
// - Clearing progress uses panel-clouds top -> panel-content bottom (so clouds clear gradually through both panels).

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

    const cloudPanel = document.getElementById('panel-clouds');
    const contentPanel = document.getElementById('panel-content');

    // collect layers
    const allEls = Array.from(document.querySelectorAll('.parallax-layer'));
    const layers = allEls.map((el) => {
      const bg = el.dataset.bg || '';
      const isCloud = el.classList.contains('cloud-layer');
      const sideSpeed = parseFloat(el.dataset.sideSpeed || '0');
      const dir = parseFloat(el.dataset.dir || '1');
      const speed = parseFloat(el.dataset.speed || '0.08');
      const startX = parseFloat(el.dataset.startX || el.dataset.startX === '0' ? el.dataset.startX : (el.getAttribute('data-start-x') || 50)); // center pct
      const startY = parseFloat(el.dataset.startY || el.dataset.startY === '0' ? el.dataset.startY : (el.getAttribute('data-start-y') || 10)); // center pct
      const size = parseFloat(el.dataset.size || el.dataset.size === '0' ? el.dataset.size : (el.getAttribute('data-size') || 0.16)); // fraction of viewport width
      const z = parseInt(el.dataset.z || el.getAttribute('data-z') || 1, 10);

      return {
        el,
        bg,
        isCloud,
        sideSpeed: isFinite(sideSpeed) ? sideSpeed : 0,
        dir: isFinite(dir) ? dir : 1,
        speed: isFinite(speed) ? speed : 0.08,
        startX: isFinite(startX) ? startX : 50,
        startY: isFinite(startY) ? startY : 10,
        size: isFinite(size) ? size : 0.16,
        z: isFinite(z) ? z : 1,
        widthPx: 0,
        heightPx: 0,
        leftPx: 0,
        topPx: 0,
        imgRatio: 0.4,
        loaded: false
      };
    });

    // setup layers sizes/positions
    function setupLayers() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // scale factor by breakpoint
      let scaleFactor = 1.0;
      if (vw >= 1200) scaleFactor = 1.6;      // desktop larger clouds
      else if (vw >= 900) scaleFactor = 1.25; // small desktop / large tablet
      else scaleFactor = 0.85;                // tablet/mobile slightly smaller

      layers.forEach((ln) => {
        const { el, bg, size, startX, startY, z } = ln;

        if (bg) el.style.backgroundImage = `url("${bg}")`;
        el.style.zIndex = z;

        // compute width based on viewport * size * scale
        const widthPx = Math.round(vw * size * scaleFactor);
        ln.widthPx = Math.max(24, widthPx); // minimum
        // attempt to get accurate ratio by loading image if not yet loaded
        if (bg) {
          const img = new Image();
          img.onload = function () {
            ln.imgRatio = (img.naturalHeight / img.naturalWidth) || ln.imgRatio;
            ln.heightPx = Math.round(ln.widthPx * ln.imgRatio);
            // compute left/top so cloud center is at startX/startY percent of its panel
            const parent = ln.el.closest('.parallax-section');
            const rect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0, width: vw, height: vh };
            const sectionLeft = rect.left + window.scrollX;
            const sectionTop = rect.top + window.scrollY;
            ln.leftPx = Math.round(sectionLeft + (startX / 100) * rect.width - (ln.widthPx / 2));
            ln.topPx = Math.round(sectionTop + (startY / 100) * rect.height - (ln.heightPx / 2));
            applySizeAndPos(ln);
            ln.loaded = true;
          };
          img.onerror = function () {
            // fallback
            ln.imgRatio = ln.imgRatio || 0.4;
            ln.heightPx = Math.round(ln.widthPx * ln.imgRatio);
            const parent = ln.el.closest('.parallax-section');
            const rect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0, width: vw, height: vh };
            const sectionLeft = rect.left + window.scrollX;
            const sectionTop = rect.top + window.scrollY;
            ln.leftPx = Math.round(sectionLeft + (startX / 100) * rect.width - (ln.widthPx / 2));
            ln.topPx = Math.round(sectionTop + (startY / 100) * rect.height - (ln.heightPx / 2));
            applySizeAndPos(ln);
            ln.loaded = true;
          };
          img.src = bg;
        } else {
          // no background image
          ln.imgRatio = ln.imgRatio || 0.4;
          ln.heightPx = Math.round(ln.widthPx * ln.imgRatio);
          const parent = ln.el.closest('.parallax-section');
          const rect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0, width: vw, height: vh };
          const sectionLeft = rect.left + window.scrollX;
          const sectionTop = rect.top + window.scrollY;
          ln.leftPx = Math.round(sectionLeft + (startX / 100) * rect.width - (ln.widthPx / 2));
          ln.topPx = Math.round(sectionTop + (startY / 100) * rect.height - (ln.heightPx / 2));
          applySizeAndPos(ln);
          ln.loaded = true;
        }
      });
    }

    function applySizeAndPos(ln) {
      const { el, widthPx, heightPx, leftPx, topPx } = ln;
      el.style.width = widthPx + 'px';
      el.style.height = heightPx + 'px';
      el.style.left = leftPx + 'px';
      el.style.top = topPx + 'px';
      // reset transform so update applies the correct offsets
      el.style.transform = `translate3d(0,0,0)`;
    }

    setupLayers();

    // recompute on resize (debounced)
    let resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setupLayers();
        update(); // reposition immediately
      }, 120);
    }, { passive: true });

    // compute clearing progress across cloudPanel top -> contentPanel bottom
    function getCloudProgress(scrollY) {
      if (!cloudPanel || !contentPanel) return 0;
      const cloudTop = cloudPanel.getBoundingClientRect().top + scrollY;
      const contentBottom = contentPanel.getBoundingClientRect().bottom + scrollY;
      const totalSpan = Math.max(1, contentBottom - cloudTop);
      return Math.max(0, Math.min(1, (scrollY - cloudTop) / totalSpan));
    }

    // RAF update loop
    let ticking = false;
    function update() {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const scrollY = window.scrollY || window.pageYOffset;
      const cloudProgress = getCloudProgress(scrollY);

      layers.forEach((ln) => {
        const { el, isCloud, sideSpeed, dir, leftPx, topPx, speed } = ln;

        if (disableHeavy) {
          // fallback: set at initial pos with no heavy transforms
          el.style.transform = `translate3d(0px, 0px, 0px)`;
          return;
        }

        // vertical parallax based on its parent section's center
        const parent = el.closest('.parallax-section');
        let norm = 0;
        if (parent) {
          const rect = parent.getBoundingClientRect();
          const sectionCenter = rect.top + rect.height / 2;
          norm = Math.max(-1, Math.min(1, (sectionCenter - (vh / 2)) / (vh / 1.2)));
        }
        const pxFactor = 80;
        const translateYParallax = -norm * speed * pxFactor;

        // horizontal clearing for clouds
        let translateX = 0;
        if (isCloud && sideSpeed > 0) {
          const sideMax = Math.max(vw * 0.85, 500);
          const sideOffset = cloudProgress * sideSpeed * sideMax;
          translateX = dir * sideOffset;
        }

        // apply transforms relative to the absolute left/top we set earlier
        el.style.transform = `translate3d(${translateX.toFixed(1)}px, ${translateYParallax.toFixed(1)}px, 0)`;
      });

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    // pointer parallax (subtle)
    const hero = cloudPanel;
    const supportsPointer = 'onpointermove' in window && !/Mobi|Android/i.test(navigator.userAgent);
    let pointerEnabled = supportsPointer && !disableHeavy && hero;

    function onPointer(e) {
      // keep subtle; we won't try to merge transforms, just nudge on top of current update results
      const rect = hero.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      const maxOffset = 12;

      layers.forEach((ln) => {
        if (!ln.isCloud) return;
        const pointerX = dx * ln.speed * maxOffset;
        const pointerY = dy * ln.speed * maxOffset;
        // read computed transform from previous update (we set translate3d(X, Y, 0))
        // easier approach: recompute base values and add pointer offsets, then set transform
        const scrollY = window.scrollY || window.pageYOffset;
        const cloudProgress = getCloudProgress(scrollY);
        const vw = window.innerWidth;
        let baseX = 0;
        if (ln.sideSpeed > 0) {
          const sideMax = Math.max(vw * 0.85, 500);
          baseX = cloudProgress * ln.sideSpeed * sideMax * ln.dir;
        }
        // parallax Y same as update
        const parent = ln.el.closest('.parallax-section');
        let norm = 0;
        if (parent) {
          const r = parent.getBoundingClientRect();
          const sectionCenter = r.top + r.height / 2;
          norm = Math.max(-1, Math.min(1, (sectionCenter - (window.innerHeight / 2)) / (window.innerHeight / 1.2)));
        }
        const translateYParallax = -norm * ln.speed * 80;
        const x = baseX + pointerX;
        const y = translateYParallax + pointerY;
        ln.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      });
    }

    // init loop
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { setupLayers(); update(); }, { passive: true });

    if (pointerEnabled) {
      hero.addEventListener('pointermove', onPointer);
      hero.addEventListener('pointerleave', update);
    }

    // Expose API
    window.ParallaxPanels = {
      refresh: function () { setupLayers(); update(); },
      disable: function () {
        window.removeEventListener('scroll', onScroll);
        if (pointerEnabled) hero.removeEventListener('pointermove', onPointer);
      }
    };
  }
})();
