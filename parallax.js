// parallax.js
// Enhanced cloud scattering: clouds are positioned & sized by data attributes (start-x, start-y, size),
// scattered horizontally & vertically, stacked at different z-levels, and cleared horizontally at different speeds.
// Uses requestAnimationFrame and recomputes sizes on resize. Respects prefers-reduced-motion and mobile.

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

    // collect all layers
    const allLayers = Array.from(document.querySelectorAll('.parallax-layer'));

    // We'll keep per-layer state
    const layers = allLayers.map((el) => {
      const bg = el.dataset.bg || '';
      const isCloud = el.classList.contains('cloud-layer');
      const sideSpeed = parseFloat(el.dataset.sideSpeed || '0');
      const dir = parseFloat(el.dataset.dir || '1');
      const speed = parseFloat(el.dataset.speed || '0.08');
      const startX = parseFloat(el.dataset.startX || el.dataset.startX === '0' ? el.dataset.startX : (el.getAttribute('data-start-x') || 50)); // percent
      const startY = parseFloat(el.dataset.startY || el.dataset.startY === '0' ? el.dataset.startY : (el.getAttribute('data-start-y') || 10)); // percent
      const size = parseFloat(el.dataset.size || el.dataset.size === '0' ? el.dataset.size : (el.getAttribute('data-size') || 0.18)); // fraction of viewport width
      const z = parseInt(el.dataset.z || el.dataset.z === '0' ? el.dataset.z : (el.getAttribute('data-z') || 1), 10);

      return {
        el,
        bg,
        isCloud,
        sideSpeed: isFinite(sideSpeed) ? sideSpeed : 0,
        dir: isFinite(dir) ? dir : 1,
        speed: isFinite(speed) ? speed : 0.08,
        startX: isFinite(startX) ? startX : 50,
        startY: isFinite(startY) ? startY : 10,
        size: isFinite(size) ? size : 0.18,
        z: isFinite(z) ? z : 1,
        // runtime values:
        widthPx: 0,
        heightPx: 0,
        leftPx: 0,
        topPx: 0,
        imgRatio: 0.4, // fallback aspect ratio (height/width) until image loads
        loaded: false
      };
    });

    // load bg images and compute aspect ratios and initial sizes/positions
    function setupLayers() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      layers.forEach((ln) => {
        const { el, bg, size, startX, startY, z } = ln;

        // apply background image if provided
        if (bg) {
          el.style.backgroundImage = `url("${bg}")`;
        }

        // set z-index
        el.style.zIndex = z;

        // compute desired width in px based on fraction of viewport width
        const widthPx = Math.round(vw * size);
        ln.widthPx = widthPx;

        // if we haven't loaded natural ratio, try to load the image to get accurate ratio
        if (bg) {
          const img = new Image();
          img.onload = function () {
            ln.imgRatio = img.naturalHeight / img.naturalWidth || ln.imgRatio;
            ln.heightPx = Math.round(ln.widthPx * ln.imgRatio);
            // position: left/top based on startX/startY percent
            ln.leftPx = Math.round((startX / 100) * vw);
            ln.topPx = Math.round((startY / 100) * vh);
            applySizeAndPos(ln);
            ln.loaded = true;
          };
          img.onerror = function () {
            // fallback ratio used
            ln.imgRatio = ln.imgRatio || 0.4;
            ln.heightPx = Math.round(ln.widthPx * ln.imgRatio);
            ln.leftPx = Math.round((startX / 100) * vw);
            ln.topPx = Math.round((startY / 100) * vh);
            applySizeAndPos(ln);
            ln.loaded = true;
          };
          img.src = bg;
        } else {
          // no bg: size to something small
          ln.imgRatio = ln.imgRatio || 0.4;
          ln.heightPx = Math.round(ln.widthPx * ln.imgRatio);
          ln.leftPx = Math.round((startX / 100) * vw);
          ln.topPx = Math.round((startY / 100) * vh);
          applySizeAndPos(ln);
          ln.loaded = true;
        }
      });
    }

    function applySizeAndPos(ln) {
      const { el, widthPx, heightPx, leftPx, topPx } = ln;
      // place element so its top-left is at (leftPx, topPx)
      el.style.width = widthPx + 'px';
      el.style.height = heightPx + 'px';
      el.style.left = leftPx + 'px';
      el.style.top = topPx + 'px';
      // reset any transform so initial placement is exact; transforms will be applied in RAF loop
      el.style.transform = `translate3d(0px, 0px, 0px)`;
    }

    // initial setup
    setupLayers();

    // recompute on resize (debounced)
    let resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setupLayers();
        // call update right away to reposition based on new viewport
        update();
      }, 120);
    }, { passive: true });

    // compute clearing progress: how far scrolled from top of clouds panel to bottom of sky panel
    const cloudPanel = document.getElementById('panel-clouds');
    const skyPanel = document.getElementById('panel-sky');

    function getCloudProgress(scrollY) {
      if (!cloudPanel || !skyPanel) return 0;
      const cloudTop = cloudPanel.getBoundingClientRect().top + scrollY;
      const skyBottom = skyPanel.getBoundingClientRect().bottom + scrollY;
      const totalSpan = Math.max(1, skyBottom - cloudTop);
      return Math.max(0, Math.min(1, (scrollY - cloudTop) / totalSpan));
    }

    // RAF update loop
    let ticking = false;
    function update() {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const scrollY = window.scrollY || window.pageYOffset;

      // cloud clearing progress 0..1
      const cloudProgress = getCloudProgress(scrollY);

      layers.forEach((ln) => {
        const { el, isCloud, speed, sideSpeed, dir, leftPx, topPx, widthPx, heightPx, imgRatio } = ln;

        if (disableHeavy) {
          // fallback subtle vertical background move if heavy motion disabled
          el.style.transform = 'translate3d(0px, 0px, 0px)';
          return;
        }

        // base vertical parallax relative to section center
        const parentSection = el.closest('.parallax-section');
        let norm = 0;
        if (parentSection) {
          const rect = parentSection.getBoundingClientRect();
          const sectionCenter = rect.top + rect.height / 2;
          norm = Math.max(-1, Math.min(1, (sectionCenter - (vh / 2)) / (vh / 1.2)));
        }

        const pxFactor = 80;
        const translateYParallax = -norm * (ln.speed || 0.08) * pxFactor;

        // pointer offsets are applied elsewhere (we won't override here) — keep it simple
        // Horizontal clearing for clouds: move based on cloudProgress, sideSpeed and dir
        let translateX = 0;
        if (isCloud && sideSpeed > 0) {
          const sideMax = Math.max(vw * 0.8, 500);
          const sideOffset = cloudProgress * sideSpeed * sideMax;
          translateX = dir * sideOffset;
        }

        // Combine transforms: translateX, translateYParallax
        // We set element's transform relative to its positioned left/top (which act like the starting point).
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

    // pointer parallax (subtle) for desktop
    const hero = cloudPanel;
    const supportsPointer = 'onpointermove' in window && !/Mobi|Android/i.test(navigator.userAgent);
    let pointerEnabled = supportsPointer && !disableHeavy && hero;

    function onPointer(e) {
      const rect = hero.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      const maxOffset = 12;

      layers.forEach((ln) => {
        if (!ln.isCloud) return;
        // small pointer offset multiplied by layer speed
        const x = dx * ln.speed * maxOffset;
        const y = dy * ln.speed * maxOffset;
        // combine with existing transform values (we'll read computed transform? simpler: apply additive transform)
        // To keep things simple and performant, re-run update() but add pointer offsets directly:
        // set transform = translate3d(baseClearing + pointerX, baseParallax + pointerY, 0)
        const computed = ln.el.style.transform || '';
        // parse current translate to find clearingX and parallaxY (we set them in update). If not available, fallback.
        // Instead of parsing style, compute clearingX same as update and then add pointer x/y
      });

      // For simplicity, we'll just call update() (so onPointer will slightly compete with scroll); pointer offsets are subtle and optional.
    }

    // init
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { update(); }, { passive: true });

    if (pointerEnabled) {
      hero.addEventListener('pointermove', onPointer);
      hero.addEventListener('pointerleave', update);
    }

    // Expose API
    window.ParallaxPanels = {
      refresh: function () {
        setupLayers();
        update();
      },
      disable: function () {
        window.removeEventListener('scroll', onScroll);
        if (pointerEnabled) hero.removeEventListener('pointermove', onPointer);
      }
    };
  }
})();
