// parallax.js (full replacement)
// - sky-bg scales and then fades out by halfway through panel 2
// - std-sky (panel 1) moves up + scales down on scroll, while breathing via CSS
// - clouds (panel 1 + 2 top clouds) move on scroll with different speeds/directions
// - collision avoidance keeps clouds out of std-sky area (big safe zone)
// - crater scales down on scroll while staying top-aligned with lake

(function () {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const skyBg = document.getElementById("sky-bg");

    const panel1 = document.getElementById("panel-1");
    const panel2 = document.getElementById("panel-2");
    const panel3 = document.getElementById("panel-3");
    const panel4 = document.getElementById("panel-4");

    const stdWrap = document.getElementById("std-sky-wrap");

    const crater = document.getElementById("crater");

    // Clouds in panel 1 + top clouds in panel 2
    const cloudEls = Array.from(document.querySelectorAll(".cloud-layer"));

    const state = {
      vw: window.innerWidth,
      vh: window.innerHeight,
      p1Top: 0,
      p2Top: 0,
      p2HalfTop: 0,
      p3Top: 0,
      p4Top: 0,
      sizeMult: 1.0,
      layers: []
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

    function computeSizeMult() {
      const vw = window.innerWidth;
      if (vw <= 480) return 1.18;
      if (vw <= 900) return 1.08;
      if (vw >= 1400) return 1.05;
      return 1.0;
    }

    function setup() {
      state.vw = window.innerWidth;
      state.vh = window.innerHeight;
      state.sizeMult = computeSizeMult();

      if (panel1) state.p1Top = absTop(panel1);
      if (panel2) {
        state.p2Top = absTop(panel2);
        const h2 = panel2.getBoundingClientRect().height || state.vh;
        state.p2HalfTop = state.p2Top + h2 * 0.5;
      }
      if (panel3) state.p3Top = absTop(panel3);
      if (panel4) state.p4Top = absTop(panel4);

      state.layers = cloudEls.map((el, idx) => {
        const bg = el.dataset.bg || "";
        if (bg) el.style.backgroundImage = `url("${bg}")`;

        const startX = num(el, "startX", 50);
        const startY = num(el, "startY", 30);
        const dir = num(el, "dir", 1);
        const sideSpeed = num(el, "sideSpeed", 1.0);

        const endX = Number.isFinite(parseFloat(el.dataset.endX))
          ? num(el, "endX", startX + (dir > 0 ? 28 : -28))
          : startX + (dir > 0 ? 28 : -28);

        let endY = Number.isFinite(parseFloat(el.dataset.endY))
          ? num(el, "endY", startY)
          : startY;

        // Clouds that start lower should not travel upward (std-sky moves upward)
        if (startY >= 55) endY = Math.max(endY, startY + 12);
        else endY = Math.min(endY, startY - 8);

        const z = parseInt(el.dataset.z || "1", 10) || 1;
        const baseSize = num(el, "size", 0.16);

        const w = clamp(state.vw * baseSize * state.sizeMult, 78, 540);
        const h = w * 0.60;
        el.style.width = `${Math.round(w)}px`;
        el.style.height = `${Math.round(h)}px`;

        // keep clouds under std-sky
        el.style.zIndex = String(Math.min(z, 6));

        // vary motion per element
        const floatAmp = clamp(8 + (idx % 6) * 2 + z, 8, 22);

        // fade window
        const fadeStart = 0.05 + clamp(z * 0.02, 0, 0.14);
        const fadeEnd = 0.86 + clamp(sideSpeed * 0.04, 0, 0.12);

        return {
          el,
          startX, startY,
          endX, endY,
          dir, sideSpeed, z,
          floatAmp,
          fadeStart, fadeEnd
        };
      });

      if (skyBg) {
        skyBg.style.transform = "scale(1)";
        skyBg.style.opacity = "1";
      }
      if (crater) {
        crater.style.transform = "translate3d(-50%, 0, 0) scale(1)";
      }
    }

    // Progress helpers
    function progressBetween(scrollY, aTop, bTop) {
      const span = Math.max(1, bTop - aTop);
      return clamp((scrollY - aTop) / span, 0, 1);
    }

    // Tunables
    const SKY_SCALE_MAX = 1.22;

    const STD_EXIT_Y_VH = 0.95;
    const STD_SCALE_MIN = 0.60;

    // BIGGER safe zone so clouds never sit behind std-sky area
    const SAFE_RADIUS_VMIN = 0.36; // increased from previous

    // additional drift
    const CLOUD_EXTRA_DRIFT_VW = 0.34;

    // crater scale range
    const CRATER_SCALE_MIN = 0.62;

    function render() {
      const scrollY = window.scrollY || window.pageYOffset;

      if (prefersReducedMotion) {
        if (skyBg) { skyBg.style.transform = "scale(1)"; skyBg.style.opacity = "1"; }
        if (stdWrap) { stdWrap.style.opacity = "1"; stdWrap.style.transform = "translate3d(-50%, -50%, 0)"; }
        if (crater) { crater.style.transform = "translate3d(-50%, 0, 0) scale(1)"; }
        state.layers.forEach((ln) => { ln.el.style.opacity = "1"; ln.el.style.transform = "translate3d(0,0,0)"; });
        return;
      }

      // sky: panel1 -> half panel2
      const pSky = progressBetween(scrollY, state.p1Top, state.p2HalfTop);
      if (skyBg) {
        const s = 1 + pSky * (SKY_SCALE_MAX - 1);
        skyBg.style.transform = `scale(${s})`;

        const skyFade = 1 - smoothstep(0.90, 1.00, pSky);
        skyBg.style.opacity = String(skyFade);
      }

      // std-sky: panel1 -> panel3
      const pStd = progressBetween(scrollY, state.p1Top, state.p3Top);
      if (stdWrap) {
        const yUp = -pStd * (state.vh * STD_EXIT_Y_VH);
        const sDown = 1 - pStd * (1 - STD_SCALE_MIN);
        const fade = 1 - smoothstep(0.55, 0.98, pStd);

        stdWrap.style.opacity = String(fade);
        stdWrap.style.transform =
          `translate3d(-50%, -50%, 0) translate3d(0, ${yUp.toFixed(1)}px, 0) scale(${sDown.toFixed(3)})`;
      }

      // crater: panel3 -> panel4 (shrinks but stays aligned)
      const pCr = progressBetween(scrollY, state.p3Top, state.p4Top);
      if (crater) {
        const s = 1 - pCr * (1 - CRATER_SCALE_MIN);
        crater.style.transform = `translate3d(-50%, 0, 0) scale(${s.toFixed(3)})`;
      }

      // collision avoidance safe zone (panel 1 only)
      const vmin = Math.min(state.vw, state.vh);
      const safeR = vmin * SAFE_RADIUS_VMIN;

      state.layers.forEach((ln, idx) => {
        const el = ln.el;
        const parent = el.closest(".parallax-section");
        const rect = parent
          ? parent.getBoundingClientRect()
          : { width: state.vw, height: state.vh, left: 0, top: 0 };

        // clouds should clear by panel 3
        const p = progressBetween(scrollY, state.p1Top, state.p3Top);

        const xPct = ln.startX + (ln.endX - ln.startX) * p;
        const yPct = ln.startY + (ln.endY - ln.startY) * p;

        let x = (xPct / 100) * rect.width;
        let y = (yPct / 100) * rect.height;

        const depthBoost = clamp(0.90 + ln.z * 0.04, 0.9, 1.35);
        const extraDrift = ln.dir * ln.sideSpeed * depthBoost * p * (state.vw * CLOUD_EXTRA_DRIFT_VW);

        const floatY = (Math.sin((p * 2.1 + idx) * Math.PI) * 0.6 - p) * ln.floatAmp;

        // Only avoid std-sky in panel 1
        if (parent && parent.id === "panel-1") {
          const sx = rect.width * 0.5;
          const sy = rect.height * 0.5;

          const dx = x - sx;
          const dy = y - sy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < safeR) {
            const push = (safeR - dist) + 12;
            const nx = dist === 0 ? 1 : dx / dist;
            const ny = dist === 0 ? 0 : dy / dist;

            // below clouds get pushed downward harder
            const belowBias = ln.startY >= 55 ? 1.45 : 1.0;

            x += nx * push;
            y += ny * push * belowBias;
          }

          // extra rule: clouds that started low never rise into std-sky area
          if (ln.startY >= 55) {
            y = Math.max(y, (rect.height * 0.5) + safeR * 0.60);
          }
        }

        const fadeT = smoothstep(ln.fadeStart, ln.fadeEnd, p);
        el.style.opacity = String(1 - fadeT);

        el.style.left = `${Math.round(rect.left + window.scrollX)}px`;
        el.style.top = `${Math.round(rect.top + window.scrollY)}px`;

        el.style.transform =
          `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate3d(-50%, -50%, 0) translate3d(${extraDrift.toFixed(1)}px, ${floatY.toFixed(1)}px, 0)`;
      });
    }

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
      refresh: function () { setup(); render(); }
    };
  }
})();
