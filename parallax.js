// parallax.js (replacement)
// - sky-bg scales up from panel-1 top to panel-3 top
// - clouds animate start -> end positions + drift + fade over same progress
// - std-sky (in panel-1) breathes via CSS, and on scroll moves upward + scales down
// - cloud sizes differ across breakpoints

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

    const stdWrap = document.getElementById("std-sky-wrap");

    const cloudEls = Array.from(document.querySelectorAll(".cloud-layer"));

    const state = {
      vw: window.innerWidth,
      vh: window.innerHeight,
      p1Top: 0,
      p3Top: 1,
      sizeMult: 1.0,
      layers: [],
    };

    function clamp(n, min, max) {
      return Math.max(min, Math.min(max, n));
    }

    function smoothstep(edge0, edge1, x) {
      const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
      return t * t * (3 - 2 * t);
    }

    function numFromDataset(el, key, fallback) {
      const v = parseFloat(el.dataset[key]);
      return Number.isFinite(v) ? v : fallback;
    }

    function absTop(el) {
      const r = el.getBoundingClientRect();
      return window.scrollY + r.top;
    }

    function computeSizeMult() {
      const vw = window.innerWidth;
      if (vw <= 480) return 1.28;     // mobile bigger
      if (vw <= 900) return 1.12;     // tablet
      if (vw >= 1400) return 1.06;    // very large screens slight bump
      return 1.0;                      // desktop baseline
    }

    function getProgress(scrollY) {
      const span = Math.max(1, state.p3Top - state.p1Top);
      return clamp((scrollY - state.p1Top) / span, 0, 1);
    }

    function setup() {
      state.vw = window.innerWidth;
      state.vh = window.innerHeight;
      state.sizeMult = computeSizeMult();

      if (panel1) state.p1Top = absTop(panel1);
      if (panel3) state.p3Top = absTop(panel3);

      state.layers = cloudEls.map((el) => {
        const bg = el.dataset.bg || "";
        if (bg) el.style.backgroundImage = `url("${bg}")`;

        const startX = numFromDataset(el, "startX", 50);
        const startY = numFromDataset(el, "startY", 30);
        const endX = numFromDataset(el, "endX", startX + (numFromDataset(el, "dir", 1) > 0 ? 25 : -25));
        const endY = numFromDataset(el, "endY", startY - 8);

        const baseSize = numFromDataset(el, "size", 0.16);
        const sideSpeed = numFromDataset(el, "sideSpeed", 1.0);
        const dir = numFromDataset(el, "dir", 1);
        const z = parseInt(el.dataset.z || "1", 10) || 1;

        // Auto vary fade slightly per element using z + speed
        const fadeStart = 0.05 + clamp((z * 0.02), 0, 0.12);
        const fadeEnd = 0.78 + clamp((sideSpeed * 0.05), 0, 0.18);

        // Size by breakpoint (clamped)
        const w = clamp(state.vw * baseSize * state.sizeMult, 76, 580);
        const h = w * 0.60;
        el.style.width = `${Math.round(w)}px`;
        el.style.height = `${Math.round(h)}px`;

        // Ensure clouds stay below std-sky always
        el.style.zIndex = String(Math.min(z, 5));

        // Give each cloud a slightly different "float frequency" feel
        // (we won't do a true time-based loop to keep it stable; we derive from scroll + z)
        const floatAmp = clamp(6 + z * 2, 6, 16);

        return {
          el,
          startX, startY,
          endX, endY,
          baseSize,
          sideSpeed,
          dir,
          z,
          fadeStart,
          fadeEnd,
          floatAmp,
        };
      });

      if (skyBg) skyBg.style.transform = "scale(1)";
    }

    // Tuning
    const SKY_SCALE_MAX = 1.30;
    const CLOUD_DRIFT_MAX = 0.18; // extra sideways drift as fraction of vw (on top of start->end)
    const STD_EXIT_Y_VH = 0.95;   // how far up std-sky moves off screen
    const STD_SCALE_MIN = 0.62;   // how small it gets by progress=1

    function render() {
      const scrollY = window.scrollY || window.pageYOffset;
      const p = getProgress(scrollY);

      // Sky scaling
      if (skyBg && !disableHeavy) {
        const s = 1 + p * (SKY_SCALE_MAX - 1);
        skyBg.style.transform = `scale(${s})`;
      } else if (skyBg) {
        skyBg.style.transform = "scale(1)";
      }

      // std-sky scroll behavior (wrapper only; inner keeps breathing animation)
      if (stdWrap) {
        if (disableHeavy) {
          stdWrap.style.opacity = "1";
          stdWrap.style.transform = "translate3d(-50%, -50%, 0)";
        } else {
          // move up and scale down while scrolling to panel 3
          const yUp = -p * (state.vh * STD_EXIT_Y_VH);
          const sDown = 1 - p * (1 - STD_SCALE_MIN);
          const fade = 1 - smoothstep(0.55, 0.95, p);

          stdWrap.style.opacity = String(fade);
          stdWrap.style.transform = `translate3d(-50%, -50%, 0) translate3d(0, ${yUp.toFixed(1)}px, 0) scale(${sDown.toFixed(3)})`;
        }
      }

      // Clouds
      state.layers.forEach((ln, idx) => {
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

        // interpolate start -> end inside the section
        const xPct = ln.startX + (ln.endX - ln.startX) * p;
        const yPct = ln.startY + (ln.endY - ln.startY) * p;

        const baseX = (xPct / 100) * rect.width;
        const baseY = (yPct / 100) * rect.height;

        // additional drift (varies per cloud)
        const depthBoost = clamp(0.88 + ln.z * 0.035, 0.9, 1.25);
        const extraDrift = ln.dir * ln.sideSpeed * depthBoost * p * (state.vw * CLOUD_DRIFT_MAX);

        // a bit of vertical float (varies per cloud)
        const floatY = -p * (ln.floatAmp + (idx % 3) * 2);

        // fade out smoothly over span
        const fadeT = smoothstep(ln.fadeStart, ln.fadeEnd, p);
        const opacity = 1 - fadeT;
        el.style.opacity = String(opacity);

        // anchor element at the section's absolute page position
        el.style.left = `${Math.round(rect.left + window.scrollX)}px`;
        el.style.top = `${Math.round(rect.top + window.scrollY)}px`;

        // apply transforms (centered on base point)
        el.style.transform =
          `translate3d(${baseX.toFixed(1)}px, ${baseY.toFixed(1)}px, 0) translate3d(-50%, -50%, 0) translate3d(${extraDrift.toFixed(1)}px, ${floatY.toFixed(1)}px, 0)`;
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

    setup();
    render();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => { setup(); render(); }, { passive: true });

    window.ParallaxPanels = {
      refresh: function () { setup(); render(); },
    };
  }
})();
