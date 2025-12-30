// parallax.js (replacement)
// Mobile animations work.
// Only disables motion if prefers-reduced-motion is enabled.
//
// What it does:
// - sky-bg scales while scrolling from panel-1 top to halfway through panel-2, then fades out
// - std-sky breathes via CSS, and on scroll moves upward and scales down until panel-3
// - clouds exist only in panel-1, move on scroll with different speeds and directions
// - collision avoidance keeps clouds away from std-sky safe zone
// - clouds that start below std-sky never move upward into it (they drift sideways and slightly down)

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

    const stdWrap = document.getElementById("std-sky-wrap");

    const cloudEls = Array.from(document.querySelectorAll("#panel-1 .cloud-layer"));

    const state = {
      vw: window.innerWidth,
      vh: window.innerHeight,
      p1Top: 0,
      p2Top: 0,
      p2HalfTop: 0,
      p3Top: 1,
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
      if (vw <= 480) return 1.18;   // mobile
      if (vw <= 900) return 1.08;   // tablet
      if (vw >= 1400) return 1.05;  // large desktop
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

      state.layers = cloudEls.map((el, idx) => {
        const bg = el.dataset.bg || "";
        if (bg) el.style.backgroundImage = `url("${bg}")`;

        const startX = num(el, "startX", 50);
        const startY = num(el, "startY", 30);

        // If end-x/end-y not provided, create a reasonable default "clearing" target.
        const dir = num(el, "dir", 1);
        const sideSpeed = num(el, "sideSpeed", 1.0);

        const endX = Number.isFinite(parseFloat(el.dataset.endX))
          ? num(el, "endX", startX + (dir > 0 ? 28 : -28))
          : startX + (dir > 0 ? 28 : -28);

        // Clouds below std-sky (center ~50%) should not go upward.
        // If they start below 55, push endY downward a bit.
        let endY = Number.isFinite(parseFloat(el.dataset.endY))
          ? num(el, "endY", startY)
          : startY;

        if (startY >= 55) {
          endY = Math.max(endY, startY + 10);
        } else {
          endY = Math.min(endY, startY - 8);
        }

        const z = parseInt(el.dataset.z || "1", 10) || 1;
        const baseSize = num(el, "size", 0.16);

        // Different size per screen, clamped
        const w = clamp(state.vw * baseSize * state.sizeMult, 78, 520);
        const h = w * 0.60;
        el.style.width = `${Math.round(w)}px`;
        el.style.height = `${Math.round(h)}px`;

        // Keep clouds under std-sky
        el.style.zIndex = String(Math.min(z, 6));

        // Give each cloud a unique float strength
        const floatAmp = clamp(6 + (idx % 5) * 2 + z, 6, 18);

        // Fade window
        const fadeStart = 0.06 + clamp(z * 0.02, 0, 0.12);
        const fadeEnd = 0.82 + clamp(sideSpeed * 0.04, 0, 0.12);

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
    }

    // Progress from panel-1 top to panel-3 top for clouds and std-sky
    function progressToPanel3(scrollY) {
      const span = Math.max(1, state.p3Top - state.p1Top);
      return clamp((scrollY - state.p1Top) / span, 0, 1);
    }

    // Progress from panel-1 top to halfway through panel-2 for sky
    function progressSky(scrollY) {
      const span = Math.max(1, state.p2HalfTop - state.p1Top);
      return clamp((scrollY - state.p1Top) / span, 0, 1);
    }

    // Tunables
    const SKY_SCALE_MAX = 1.22;

    const STD_EXIT_Y_VH = 0.95;  // how far std-sky moves up off screen
    const STD_SCALE_MIN = 0.62;

    const SAFE_RADIUS_VMIN = 0.24; // safe zone around std-sky (fraction of vmin)

    const CLOUD_EXTRA_DRIFT_VW = 0.35; // how far clouds clear sideways in addition to start->end

    function render() {
      const scrollY = window.scrollY || window.pageYOffset;

      if (prefersReducedMotion) {
        if (skyBg) {
          skyBg.style.transform = "scale(1)";
          skyBg.style.opacity = "1";
        }
        if (stdWrap) {
          stdWrap.style.opacity = "1";
          stdWrap.style.transform = "translate3d(-50%, -50%, 0)";
        }
        state.layers.forEach((ln) => {
          ln.el.style.opacity = "1";
          ln.el.style.transform = "translate3d(0,0,0)";
        });
        return;
      }

      const pSky = progressSky(scrollY);
      const p3 = progressToPanel3(scrollY);

      // Sky scales until half of panel 2, then fades out quickly
      if (skyBg) {
        const s = 1 + pSky * (SKY_SCALE_MAX - 1);
        skyBg.style.transform = `scale(${s})`;

        // Fade out after reaching halfway panel 2
        // Using pSky near 1 means we are at the end of sky span
        const skyFade = 1 - smoothstep(0.92, 1.00, pSky);
        skyBg.style.opacity = String(skyFade);
      }

      // std-sky moves up and scales down while scrolling to panel 3
      if (stdWrap) {
        const yUp = -p3 * (state.vh * STD_EXIT_Y_VH);
        const sDown = 1 - p3 * (1 - STD_SCALE_MIN);
        const fade = 1 - smoothstep(0.60, 0.98, p3);

        stdWrap.style.opacity = String(fade);
        stdWrap.style.transform =
          `translate3d(-50%, -50%, 0) translate3d(0, ${yUp.toFixed(1)}px, 0) scale(${sDown.toFixed(3)})`;
      }

      // Compute std-sky safe zone inside panel 1 coordinates
      const vmin = Math.min(state.vw, state.vh);
      const safeR = vmin * SAFE_RADIUS_VMIN;

      // Safe center is panel 1 center (matches std-sky-wrap at 50%,50%)
      // We work in "panel local coordinates" (0..rect.width/height)
      const safeCenterX = 0.5;
      const safeCenterY = 0.5;

      state.layers.forEach((ln, idx) => {
        const el = ln.el;
        const parent = el.closest(".parallax-section");
        const rect = parent
          ? parent.getBoundingClientRect()
          : { width: state.vw, height: state.vh, left: 0, top: 0 };

        // Interpolate start -> end position as % within the section
        const xPct = ln.startX + (ln.endX - ln.startX) * p3;
        const yPct = ln.startY + (ln.endY - ln.startY) * p3;

        let x = (xPct / 100) * rect.width;
        let y = (yPct / 100) * rect.height;

        // Extra sideways drift, varied per cloud
        const depthBoost = clamp(0.90 + ln.z * 0.04, 0.9, 1.3);
        const extraDrift = ln.dir * ln.sideSpeed * depthBoost * p3 * (state.vw * CLOUD_EXTRA_DRIFT_VW);

        // Vertical float (subtle), different per cloud
        const floatY = (Math.sin((p3 * 2.2 + idx) * Math.PI) * 0.5 - p3) * ln.floatAmp;

        // Collision avoidance against std-sky safe zone
        // Convert safe center to px in this panel
        const sx = rect.width * safeCenterX;
        const sy = rect.height * safeCenterY;

        const dx = x - sx;
        const dy = y - sy;

        // If a cloud is inside safe radius, push it outward.
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < safeR) {
          const push = (safeR - dist) + 6;
          const nx = dist === 0 ? 1 : dx / dist;
          const ny = dist === 0 ? 0 : dy / dist;

          // If cloud started below std-sky, bias push downward
          const belowBias = ln.startY >= 55 ? 1.25 : 1.0;

          x += nx * push;
          y += ny * push * belowBias;
        }

        // Clouds that started below std-sky should never move upward into it
        if (ln.startY >= 55) {
          y = Math.max(y, sy + safeR * 0.55);
        }

        // Fade out over scroll
        const fadeT = smoothstep(ln.fadeStart, ln.fadeEnd, p3);
        const opacity = 1 - fadeT;
        el.style.opacity = String(opacity);

        // Anchor absolute to page, then translate inside section
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
