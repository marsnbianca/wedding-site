// parallax.js (replacement)
// Clouds:
// - start-x/start-y are 0..100 (%) within their own panel
// - size is base fraction of viewport width, scaled by screen breakpoint multipliers
// - side drift + fade out from panel-1 top to panel-3 top
// Sky:
// - fixed background, scales up from panel-1 top to panel-3 top

(function () {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const smallScreen = window.matchMedia("(max-width: 900px)").matches;
    const disableHeavy = prefersReducedMotion || smallScreen;

    const skyBg = document.getElementById("sky-bg");
    const panel1 = document.getElementById("panel-1");
    const panel3 = document.getElementById("panel-3");

    const cloudEls = Array.from(document.querySelectorAll(".cloud-layer"));

    const state = {
      vw: window.innerWidth,
      vh: window.innerHeight,
      p1Top: 0,
      p3Top: 1,
      layers: [],
      sizeMult: 1.0,
      driftMult: 1.0,
    };

    function clamp(n, min, max) {
      return Math.max(min, Math.min(max, n));
    }

    function smoothstep(edge0, edge1, x) {
      const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
      return t * t * (3 - 2 * t);
    }

    function num(el, key, fallback) {
      const v = parseFloat(el.dataset[key]);
      return Number.isFinite(v) ? v : fallback;
    }

    function absTop(el) {
      const r = el.getBoundingClientRect();
      return window.scrollY + r.top;
    }

    function computeBreakpoints() {
      const vw = window.innerWidth;

      // Cloud sizing per device:
      // - mobile: larger clouds so they still feel present
      // - tablet: medium
      // - desktop: baseline
      if (vw <= 480) {
        state.sizeMult = 1.25;
        state.driftMult = 0.90; // less drift on tiny screens
      } else if (vw <= 900) {
        state.sizeMult = 1.10;
        state.driftMult = 0.95;
      } else if (vw >= 1400) {
        state.sizeMult = 1.08; // big screens get a slight bump
        state.driftMult = 1.05;
      } else {
        state.sizeMult = 1.0;
        state.driftMult = 1.0;
      }
    }

    // Progress from top of panel 1 to top of panel 3
    function getProgress(scrollY) {
      const span = Math.max(1, state.p3Top - state.p1Top);
      return clamp((scrollY - state.p1Top) / span, 0, 1);
    }

    function setupLayers() {
      state.vw = window.innerWidth;
      state.vh = window.innerHeight;

      computeBreakpoints();

      if (panel1) state.p1Top = absTop(panel1);
      if (panel3) state.p3Top = absTop(panel3);

      state.layers = cloudEls.map((el) => {
        const bg = el.dataset.bg || "";

        // NOTE: HTML uses data-start-x / data-start-y, but dataset gives camelCase too.
        // dataset.startX works because data-start-x maps to startX.
        const startX = num(el, "startX", 50);
        const startY = num(el, "startY", 30);

        // base size fraction (your HTML values)
        const baseSize = num(el, "size", 0.16);

        // motion
        const sideSpeed = num(el, "sideSpeed", 1.0);
        const dir = num(el, "dir", 1);
        const z = parseInt(el.dataset.z || "1", 10) || 1;

        // Fade defaults; you can add these attributes later if you want per-cloud timing
        const fadeStart = num(el, "fadeStart", 0.08);
        const fadeEnd = num(el, "fadeEnd", 0.82);

        if (bg) el.style.backgroundImage = `url("${bg}")`;
        el.style.zIndex = String(z);

        // Size by breakpoint
        // Use viewport width so it stays responsive and consistent
        const w = clamp(state.vw * baseSize * state.sizeMult, 80, 560);
        const h = w * 0.60;

        el.style.width = `${Math.round(w)}px`;
        el.style.height = `${Math.round(h)}px`;

        return {
          el,
          startX,
          startY,
          baseSize,
          sideSpeed,
          dir,
          z,
          fadeStart,
          fadeEnd,
        };
      });

      if (skyBg) skyBg.style.transform = "scale(1)";
    }

    // Tune these
    const SKY_SCALE_MAX = 1.30; // how much sky grows by panel 3
    const FLOAT_Y_MAX_VH = 0.10; // how much clouds float upward while clearing

    function render() {
      const scrollY = window.scrollY || window.pageYOffset;
      const progress = getProgress(scrollY);

      // Sky scaling
      if (skyBg && !disableHeavy) {
        const s = 1 + progress * (SKY_SCALE_MAX - 1);
        skyBg.style.transform = `scale(${s})`;
      } else if (skyBg) {
        skyBg.style.transform = "scale(1)";
      }

      // Clouds
      state.layers.forEach((ln) => {
        const el = ln.el;

        if (disableHeavy) {
          el.style.opacity = "1";
          el.style.transform = "translate3d(0,0,0)";
          return;
        }

        const parent = el.closest(".parallax-section");
        const rect = parent
          ? parent.getBoundingClientRect()
          : { width: state.vw, height: state.vh, left: 0, top: 0 };

        // Base position within the section
        const baseX = (ln.startX / 100) * rect.width;
        const baseY = (ln.startY / 100) * rect.height;

        // Depth affects motion slightly (bigger z = feels closer = moves more)
        const depthBoost = clamp(0.75 + ln.z * 0.05, 0.85, 1.45);

        // Side drift to clear away
        const driftMax = state.vw * 0.55 * state.driftMult;
        const driftX = ln.dir * ln.sideSpeed * depthBoost * progress * driftMax;

        // Upward float while clearing
        const floatY = progress * (state.vh * FLOAT_Y_MAX_VH);

        // Fade out
        const fadeT = smoothstep(ln.fadeStart, ln.fadeEnd, progress);
        const opacity = 1 - fadeT;

        el.style.opacity = String(opacity);

        // Attach layer to the section's absolute page position, then translate inside it
        el.style.left = `${Math.round(rect.left + window.scrollX)}px`;
        el.style.top = `${Math.round(rect.top + window.scrollY)}px`;

        el.style.transform =
          `translate3d(${baseX}px, ${baseY}px, 0) translate3d(-50%, -50%, 0) translate3d(${driftX}px, ${-floatY}px, 0)`;
      });
    }

    // RAF scroll loop
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        render();
      });
    }

    // Init
    setupLayers();
    render();

    // Events
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(
      "resize",
      function () {
        setupLayers();
        render();
      },
      { passive: true }
    );

    window.ParallaxPanels = {
      refresh: function () {
        setupLayers();
        render();
      },
    };
  }
})();
