// parallax.js (replacement)
// - Sky (sky1.png) is fixed and scales up as you scroll from panel-1 top to panel-3 top.
// - Clouds are positioned responsively inside panel-1 and panel-2 using data-start-x/y as 0..100 (%).
// - Clouds drift sideways and fade out ("clear up") over the same scroll span.
// - Respects prefers-reduced-motion and small screens by freezing animations.

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
    };

    // Helpers
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

    // Compute progress from top of panel 1 to top of panel 3
    function getProgress(scrollY) {
      const span = Math.max(1, state.p3Top - state.p1Top);
      return clamp((scrollY - state.p1Top) / span, 0, 1);
    }

    // Build layer objects and preload sizes/positions
    function setupLayers() {
      state.vw = window.innerWidth;
      state.vh = window.innerHeight;

      // Cache panel tops for consistent progress calc
      if (panel1) state.p1Top = absTop(panel1);
      if (panel3) state.p3Top = absTop(panel3);

      state.layers = cloudEls.map((el) => {
        const bg = el.dataset.bg || "";
        const startX = num(el, "startX", num(el, "start-x", 50)); // 0..100
        const startY = num(el, "startY", num(el, "start-y", 30)); // 0..100
        const size = num(el, "size", 0.16); // fraction of viewport width-ish
        const sideSpeed = num(el, "sideSpeed", num(el, "side-speed", 1.0));
        const dir = num(el, "dir", 1);
        const z = parseInt(el.dataset.z || el.getAttribute("data-z") || "1", 10) || 1;

        // Fade timing defaults (you can override per cloud in HTML later if you want)
        const fadeStart = num(el, "fadeStart", 0.10);
        const fadeEnd = num(el, "fadeEnd", 0.80);

        if (bg) el.style.backgroundImage = `url("${bg}")`;
        el.style.zIndex = String(z);

        // Responsive sizing: size is a fraction of viewport width, clamped
        // Keeps clouds from being tiny on phones or huge on desktop
        const w = clamp(state.vw * size, 90, 520);
        const h = w * 0.60; // generic cloud aspect; background-size contain handles exact shape

        el.style.width = `${Math.round(w)}px`;
        el.style.height = `${Math.round(h)}px`;

        return {
          el,
          startX,
          startY,
          sideSpeed,
          dir,
          fadeStart,
          fadeEnd,
          baseW: w,
          baseH: h,
        };
      });

      // Reset sky transform on resize
      if (skyBg) skyBg.style.transform = "scale(1)";
    }

    // Apply animation per frame
    const SKY_SCALE_MAX = 1.35; // increase if you want it to grow more
    function render() {
      const scrollY = window.scrollY || window.pageYOffset;
      const progress = getProgress(scrollY);

      // Sky scaling
      if (skyBg && !disableHeavy) {
        const s = 1 + progress * (SKY_SCALE_MAX - 1);
        skyBg.style.transform = `scale(${s})`;
      } else if (skyBg && disableHeavy) {
        skyBg.style.transform = "scale(1)";
      }

      // Clouds: scattered by startX/startY within their own panel, then drift + fade
      state.layers.forEach((ln) => {
        const el = ln.el;

        if (disableHeavy) {
          el.style.opacity = "1";
          el.style.transform = "translate3d(0,0,0)";
          return;
        }

        const parent = el.closest(".parallax-section");
        const rect = parent ? parent.getBoundingClientRect() : { width: state.vw, height: state.vh, left: 0, top: 0 };

        // Base position inside its own section (percent of that section)
        // IMPORTANT: This expects startX/startY to be 0..100 (percent)
        const baseX = (ln.startX / 100) * rect.width;
        const baseY = (ln.startY / 100) * rect.height;

        // Side drift: "clear away" toward left or right as we scroll
        // Increase multiplier if you want clouds to exit faster
        const driftMax = state.vw * 0.55;
        const driftX = ln.dir * ln.sideSpeed * progress * driftMax;

        // Slight upward float as they clear (optional but nice)
        const floatY = progress * (state.vh * 0.08);

        // Fade out smoothly between fadeStart and fadeEnd
        const fadeT = smoothstep(ln.fadeStart, ln.fadeEnd, progress);
        const opacity = 1 - fadeT;

        el.style.opacity = String(opacity);

        // Position using translate so it stays responsive on resize
        // translate(-50%, -50%) centers the cloud on that point
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

    // Expose minimal API (optional)
    window.ParallaxPanels = {
      refresh: function () {
        setupLayers();
        render();
      },
    };
  }
})();
