(function () {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const skyBg = document.getElementById("sky-bg");
    const lakeBg = document.getElementById("lake-bg");
    const craterBg = document.getElementById("crater-bg");

    const panel1 = document.getElementById("panel-1");
    const panel2 = document.getElementById("panel-2");

    const stdWrap = document.getElementById("std-sky-wrap");

    const clouds = Array.from(document.querySelectorAll(".cloud-layer"));

    const state = {
      vw: window.innerWidth,
      vh: window.innerHeight,
      p1Top: 0,
      p2Top: 0,
      p2Height: 1,
      p2HalfTop: 0,
      layers: []
    };

    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
    function smoothstep(edge0, edge1, x) {
      const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
      return t * t * (3 - 2 * t);
    }
    function absTop(el) {
      const r = el.getBoundingClientRect();
      return window.scrollY + r.top;
    }
    function progressBetween(scrollY, aTop, bTop) {
      const span = Math.max(1, bTop - aTop);
      return clamp((scrollY - aTop) / span, 0, 1);
    }

    // Tunables
    const SKY_SCALE_MAX = 1.14;

    // Clouds clear during panel 1 -> half panel 2
    const CLOUD_CLEAR_END = 0.50; // 50% into panel2

    // Keep-out zone around std-sky in panel 1 (very strong)
    const SAFE_RADIUS_VMIN = 0.58;
    const SAFE_RECT_W = 0.60;  // fraction of panel width
    const SAFE_RECT_H = 0.52;  // fraction of panel height

    // Lake replaces sky at half panel2, scales to 1.25
    const LAKE_SCALE_MAX = 1.25;
    const CRATER_SCALE_MIN = 0.50;

    // Std-sky scroll exit during same clear span
    const STD_EXIT_Y_VH = 0.65;
    const STD_SCALE_MIN = 0.82;

    function setup() {
      state.vw = window.innerWidth;
      state.vh = window.innerHeight;

      if (panel1) state.p1Top = absTop(panel1);
      if (panel2) {
        state.p2Top = absTop(panel2);
        const r2 = panel2.getBoundingClientRect();
        state.p2Height = r2.height || state.vh;
        state.p2HalfTop = state.p2Top + state.p2Height * 0.5;
      }

      // Setup clouds (size + background + initial anchor)
      state.layers = clouds.map((el, idx) => {
        const bg = el.dataset.bg || "";
        if (bg) el.style.backgroundImage = `url("${bg}")`;

        const startX = parseFloat(el.dataset.startX || "50");
        const startY = parseFloat(el.dataset.startY || "50");
        const endX = parseFloat(el.dataset.endX || startX);
        const endY = parseFloat(el.dataset.endY || startY);

        const size = parseFloat(el.dataset.size || "0.16");
        const speed = parseFloat(el.dataset.speed || "1.0");
        const fadeAt = parseFloat(el.dataset.fade || "0.92");
        const z = parseInt(el.dataset.z || "1", 10) || 1;

        // responsive sizing
        const sizeMult = (state.vw <= 480) ? 1.18 : (state.vw <= 900 ? 1.08 : 1.0);
        const w = clamp(state.vw * size * sizeMult, 76, 560);
        const h = w * 0.60;

        el.style.width = `${Math.round(w)}px`;
        el.style.height = `${Math.round(h)}px`;
        el.style.zIndex = String(Math.min(6, z));
        el.style.left = `${startX}%`;
        el.style.top = `${startY}%`;

        // deterministic different drift directions
        const dirX = (idx % 2 === 0) ? -1 : 1;
        const dirY = (idx % 3 === 0) ? -1 : 1;

        return { el, startX, startY, endX, endY, size, speed, fadeAt, z, dirX, dirY, idx };
      });

      // Reset backgrounds
      if (skyBg) { skyBg.style.transform = "scale(1)"; skyBg.style.opacity = "1"; }
      if (lakeBg) { lakeBg.style.transform = "translate3d(0,-50%,0) scale(1)"; lakeBg.style.opacity = "0"; }
      if (craterBg) { craterBg.style.transform = "scale(1)"; }
      if (stdWrap) { stdWrap.style.opacity = "1"; stdWrap.style.transform = "translate3d(-50%, -50%, 0)"; }

      // Position lake at halfway point of panel 2 (in viewport coordinates)
      positionLakeAtPanel2Half();
    }

    function positionLakeAtPanel2Half() {
      if (!lakeBg || !panel2) return;

      // Put the lake centered on the panel-2 midpoint in viewport space.
      // Compute the panel2 midpoint's Y in document coords, then convert to viewport Y.
      const midDocY = state.p2Top + state.p2Height * 0.5;
      const viewportY = midDocY - (window.scrollY || window.pageYOffset);

      // We set lakeBg's top in viewport coordinates since it's fixed.
      // Clamp so it's not weird on small screens.
      const topPx = clamp(viewportY, state.vh * 0.25, state.vh * 0.75);
      lakeBg.style.top = `${topPx}px`;
    }

    function render() {
      if (prefersReducedMotion) return;

      const scrollY = window.scrollY || window.pageYOffset;

      // Progress span: panel1 top -> half panel2
      const end = state.p2Top + state.p2Height * CLOUD_CLEAR_END;
      const p = progressBetween(scrollY, state.p1Top, end);

      // SKY: scale up until half of panel2
      if (skyBg) {
        const s = 1 + p * (SKY_SCALE_MAX - 1);
        skyBg.style.transform = `scale(${s})`;
        // fade sky out as we approach half of panel2 (so lake takes over)
        skyBg.style.opacity = String(1 - smoothstep(0.65, 1.0, p));
      }

      // LAKE: crossfade in around mid panel2 and scale to 1.25
      if (lakeBg) {
        const lakeIn = smoothstep(0.55, 0.90, p); // starts coming in earlier
        lakeBg.style.opacity = String(lakeIn);
        const lakeScale = 1 + p * (LAKE_SCALE_MAX - 1);
        lakeBg.style.transform = `translate3d(0,-50%,0) scale(${lakeScale.toFixed(3)})`;
      }

      // CRATER: scale down to 0.5 during same span, top-aligned with lake
      if (craterBg) {
        const craterScale = 1 - p * (1 - CRATER_SCALE_MIN);
        craterBg.style.transform = `scale(${craterScale.toFixed(3)})`;
      }

      // Keep lake pinned to the halfway point of panel2 (updates as you scroll)
      positionLakeAtPanel2Half();

      // std-sky: move slightly up and fade so clearing looks natural (still stays readable)
      if (stdWrap) {
        const yUp = -p * (state.vh * STD_EXIT_Y_VH);
        const sDown = 1 - p * (1 - STD_SCALE_MIN);
        const fade = 1 - smoothstep(0.70, 1.0, p);
        stdWrap.style.opacity = String(fade);
        stdWrap.style.transform = `translate3d(-50%, -50%, 0) translate3d(0, ${yUp.toFixed(1)}px, 0) scale(${sDown.toFixed(3)})`;
      }

      // CLOUDS: each moves with unique direction/speed and fades
      const safeR = Math.min(state.vw, state.vh) * SAFE_RADIUS_VMIN;

      state.layers.forEach((ln) => {
        const parent = ln.el.closest(".parallax-section");
        if (!parent) return;

        // Base XY from start -> end (percent)
        const xPct = ln.startX + (ln.endX - ln.startX) * p;
        const yPct = ln.startY + (ln.endY - ln.startY) * p;

        // Drift (extra clearing motion)
        const driftX = ln.dirX * ln.speed * p * (state.vw * 0.42);
        const driftY = ln.dirY * ln.speed * p * (state.vh * 0.12);

        // Subtle float
        const float = Math.sin((p * 2.0 + ln.idx) * Math.PI) * (8 + (ln.z * 2));

        // Convert pct to px inside the panel
        const rect = parent.getBoundingClientRect();
        let x = (xPct / 100) * rect.width;
        let y = (yPct / 100) * rect.height;

        // Keep-out zone only on panel 1
        if (parent.id === "panel-1") {
          const sx = rect.width * 0.5;
          const sy = rect.height * 0.5;

          // circle keep-out
          const dx = x - sx;
          const dy = y - sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < safeR) {
            const push = (safeR - dist) + 42;
            const nx = dist === 0 ? 1 : dx / dist;
            const ny = dist === 0 ? 0 : dy / dist;
            x += nx * push;
            y += ny * push;
          }

          // rectangle keep-out
          const rectW = rect.width * SAFE_RECT_W;
          const rectH = rect.height * SAFE_RECT_H;
          const rx0 = sx - rectW * 0.5;
          const rx1 = sx + rectW * 0.5;
          const ry0 = sy - rectH * 0.5;
          const ry1 = sy + rectH * 0.5;

          if (x > rx0 && x < rx1 && y > ry0 && y < ry1) {
            // push to nearest horizontal edge
            const toLeft = x - rx0;
            const toRight = rx1 - x;
            x += (toLeft < toRight) ? -(toLeft + 44) : (toRight + 44);
            y += (y < sy) ? -18 : 24;
          }
        }

        // Apply transform relative to its own left/top % anchor
        // We anchor with left/top %, then translate by pixel drift inside panel + float.
        ln.el.style.left = `${xPct}%`;
        ln.el.style.top = `${yPct}%`;
        ln.el.style.transform =
          `translate3d(-50%, -50%, 0) translate3d(${driftX.toFixed(1)}px, ${(driftY + float).toFixed(1)}px, 0)`;

        // Fade out as it clears
        const fade = 1 - smoothstep(0.10, ln.fadeAt, p);
        ln.el.style.opacity = String(clamp(fade, 0, 1));
      });
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        render();
      });
    }

    setup();
    render();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => { setup(); render(); }, { passive: true });
  }
})();
