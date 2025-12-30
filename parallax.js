// parallax.js
// Sky scales (single instance) as the user scrolls toward part 3.
// Clouds are positioned & sized by data attributes in index.html.
// Cloud clearing progress uses the top of panel-1 -> top of panel-3 span (so clouds clear as sky scales).

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

    const skyBg = document.getElementById('sky-bg');
    const panel1 = document.getElementById('panel-1');
    const panel3 = document.getElementById('panel-3');

    const allEls = Array.from(document.querySelectorAll('.parallax-layer'));
    const layers = allEls.map((el) => {
      const bg = el.dataset.bg || '';
      const isCloud = el.classList.contains('cloud-layer');
      const sideSpeed = parseFloat(el.dataset.sideSpeed || '0');
      const dir = parseFloat(el.dataset.dir || '1');
      const speed = parseFloat(el.dataset.speed || '0.08');
      const startX = parseFloat(el.dataset.startX || el.getAttribute('data-start-x') || 50);
      const startY = parseFloat(el.dataset.startY || el.getAttribute('data-start-y') || 10);
      const size = parseFloat(el.dataset.size || el.getAttribute('data-size') || 0.16);
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
        imgRatio: 0.45,
        loaded: false
      };
    });

    function setupLayers() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let scaleFactor = 1;
      if (vw >= 1400) scaleFactor = 1.8;
      else if (vw >= 1200) scaleFactor = 1.5;
      else if (vw >= 900) scaleFactor = 1.2;
      else scaleFactor = 0.85;

      layers.forEach((ln) => {
        const { el, bg, size, startX, startY, z } = ln;
        if (bg) el.style.backgroundImage = `url("${bg}")`;
        el.style.zIndex = z;

        const widthPx = Math.round(vw * size * scaleFactor);
        ln.widthPx = Math.max(36, widthPx);

        if (bg) {
          const img = new Image();
          img.onload = function () {
            ln.imgRatio = (img.naturalHeight / img.naturalWidth) || ln.imgRatio;
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
          img.onerror = function () {
            ln.imgRatio = ln.imgRatio || 0.45;
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
          ln.imgRatio = ln.imgRatio || 0.45;
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

      // Reset sky scale to 1 on layout (so transform calculations start from base)
      if (skyBg) skyBg.style.transform = 'scale(1)';
    }

    function applySizeAndPos(ln) {
      const { el, widthPx, heightPx, leftPx, topPx } = ln;
      el.style.width = widthPx + 'px';
      el.style.height = heightPx + 'px';
      el.style.left = leftPx + 'px';
      el.style.top = topPx + 'px';
      el.style.transform = `translate3d(0,0,0)`;
    }

    setupLayers();

    let resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setupLayers();
        update();
      }, 120);
    }, { passive: true });

    // compute sky scaling progress from top of panel-1 to top of panel-3
    function getSkyScaleProgress(scrollY) {
      if (!panel1 || !panel3 || !skyBg) return 0;
      const start = panel1.getBoundingClientRect().top + scrollY;
      const end = panel3.getBoundingClientRect().top + scrollY; // scale until start of part 3
      const span = Math.max(1, end - start);
      return Math.max(0, Math.min(1, (scrollY - start) / span));
    }

    // compute cloud clearing progress based on same span (clouds clear while sky scales)
    function getCloudProgress(scrollY) {
      return getSkyScaleProgress(scrollY);
    }

    // config: maximum scale factor for sky (1 => no scale; 1.12 => zoom to +12%)
    const SKY_SCALE_MAX = 1.12;

    let ticking = false;
    function update() {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const scrollY = window.scrollY || window.pageYOffset;

      // sky scale progress 0..1
      const skyProgress = getSkyScaleProgress(scrollY);
      if (skyBg && !disableHeavy) {
        const s = 1 + skyProgress * (SKY_SCALE_MAX - 1);
        skyBg.style.transform = `scale(${s})`;
      }

      const cloudProgress = getCloudProgress(scrollY);

      layers.forEach((ln) => {
        const { el, isCloud, sideSpeed, dir, speed } = ln;

        if (disableHeavy) {
          el.style.transform = `translate3d(0px, 0px, 0px)`;
          return;
        }

        // vertical parallax relative to own section
        const parent = el.closest('.parallax-section');
        let norm = 0;
        if (parent) {
          const rect = parent.getBoundingClientRect();
          const sectionCenter = rect.top + rect.height / 2;
          norm = Math.max(-1, Math.min(1, (sectionCenter - (vh / 2)) / (vh / 1.2)));
        }
        const translateYParallax = -norm * speed * 80;

        // horizontal clearing across skyProgress
        let translateX = 0;
        if (isCloud && sideSpeed > 0) {
          const sideMax = Math.max(vw * 0.85, 500);
          const sideOffset = cloudProgress * sideSpeed * sideMax;
          translateX = dir * sideOffset;
        }

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
    const hero = panel1;
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
        const pointerX = dx * ln.speed * maxOffset;
        const pointerY = dy * ln.speed * maxOffset;

        // recompute base values and add pointer offsets
        const scrollY = window.scrollY || window.pageYOffset;
        const cloudProgress = getCloudProgress(scrollY);
        const vw = window.innerWidth;
        let baseX = 0;
        if (ln.sideSpeed > 0) {
          const sideMax = Math.max(vw * 0.85, 500);
          baseX = cloudProgress * ln.sideSpeed * sideMax * ln.dir;
        }
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

    // start
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { setupLayers(); update(); }, { passive: true });

    if (pointerEnabled) {
      hero.addEventListener('pointermove', onPointer);
      hero.addEventListener('pointerleave', update);
    }

    window.ParallaxPanels = {
      refresh: function () { setupLayers(); update(); },
      disable: function () {
        window.removeEventListener('scroll', onScroll);
        if (pointerEnabled) hero.removeEventListener('pointermove', onPointer);
      }
    };
  }
})();
