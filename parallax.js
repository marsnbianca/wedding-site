// parallax.js (full replacement)
// Updates requested:
// - Panel 1 cloud positions and speeds updated in HTML
// - Remove cloud #7 (done in HTML)
// - Stronger keep-out zone around std-sky1.png to keep center clear
// - Panel 2 lake/crater animate immediately as you enter panel 2 (not late)
// - Map poster is non-modal and animates in place (toggle on button)

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

    const lake = document.getElementById("lake");
    const crater = document.getElementById("crater");

    const cloudEls = Array.from(document.querySelectorAll(".cloud-layer"));

    const mapTrigger = document.getElementById("map-trigger");
    const mapPoster = document.getElementById("map-poster");

    const state = {
      vw: window.innerWidth,
      vh: window.innerHeight,
      p1Top: 0,
      p2Top: 0,
      p2Height: 1,
      p2HalfTop: 0,
      p3Top: 0,
      sizeMult: 1.0,
      layers: []
    };

    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

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

    function progressBetween(scrollY, aTop, bTop) {
      const span = Math.max(1, bTop - aTop);
      return clamp((scrollY - aTop) / span, 0, 1);
    }

    function progressWithinPanel(scrollY, top, height) {
      return clamp((scrollY - top) / Math.max(1, height), 0, 1);
    }

    function setup() {
      state.vw = window.innerWidth;
      state.vh = window.innerHeight;
      state.sizeMult = computeSizeMult();

      if (panel1) state.p1Top = absTop(panel1);

      if (panel2) {
        state.p2Top = absTop(panel2);
        const r2 = panel2.getBoundingClientRect();
        state.p2Height = r2.height || state.vh;
        state.p2HalfTop = state.p2Top + state.p2Height * 0.5;
      }

      if (panel3) state.p3Top = absTop(panel3);

      state.layers = cloudEls.map((el, idx) => {
        const bg = el.dataset.bg || "";
        if (bg) el.style.backgroundImage = `url("${bg}")`;

        const startX = num(el, "startX", 50);
        const startY = num(el, "startY", 30);
        const dir = num(el, "dir", 1);
        const sideSpeed = num(el, "sideSpeed", 1.0);

        const endX = Number.isFinite(parseFloat(el.dataset.endX))
          ? num(el, "endX", startX + (dir > 0 ? 30 : -30))
          : startX + (dir > 0 ? 30 : -30);

        let endY = Number.isFinite(parseFloat(el.dataset.endY))
          ? num(el, "endY", startY)
          : startY;

        // lower clouds drift down, never up (std-sky moves upward)
        if (startY >= 55) endY = Math.max(endY, startY + 14);
        else endY = Math.min(endY, startY - 8);

        const z = parseInt(el.dataset.z || "1", 10) || 1;
        const baseSize = num(el, "size", 0.16);

        const w = clamp(state.vw * baseSize * state.sizeMult, 78, 560);
        const h = w * 0.60;
        el.style.width = `${Math.round(w)}px`;
        el.style.height = `${Math.round(h)}px`;
        el.style.zIndex = String(Math.min(z, 6));

        const floatAmp = clamp(10 + (idx % 6) * 2 + z, 10, 26);

        // fade window (kept broad)
        const fadeStart = 0.04 + clamp(z * 0.02, 0, 0.20);
        const fadeEnd = 0.90 + clamp(sideSpeed * 0.05, 0, 0.16);

        return { el, startX, startY, endX, endY, dir, sideSpeed, z, floatAmp, fadeStart, fadeEnd };
      });

      if (skyBg) { skyBg.style.transform = "scale(1)"; skyBg.style.opacity = "1"; }
      if (stdWrap) { stdWrap.style.opacity = "1"; stdWrap.style.transform = "translate3d(-50%, -50%, 0)"; }

      if (lake) lake.style.transform = "scale(1)";
      if (crater) crater.style.transform = "translate3d(-50%, 0, 0) scale(1)";
    }

    // Tunables
    const SKY_SCALE_MAX = 1.14;

    const STD_EXIT_Y_VH = 0.95;
    const STD_SCALE_MIN = 0.64;

    // Make center of panel 1 much clearer
    const SAFE_RADIUS_VMIN = 0.52;  // larger circle
    const SAFE_RECT_W_VW = 0.50;    // larger rectangle keep-out
    const SAFE_RECT_H_VH = 0.44;

    const CLOUD_EXTRA_DRIFT_VW = 0.32;

    // Panel 2 scene targets
    const LAKE_SCALE_MAX = 1.25;
    const CRATER_SCALE_MIN = 0.50;

    function render() {
      const scrollY = window.scrollY || window.pageYOffset;

      if (prefersReducedMotion) return;

      // Sky scales and fades out by halfway through panel 2
      const pSky = progressBetween(scrollY, state.p1Top, state.p2HalfTop);
      if (skyBg) {
        const s = 1 + pSky * (SKY_SCALE_MAX - 1);
        skyBg.style.transform = `scale(${s})`;
        const skyFade = 1 - smoothstep(0.82, 1.00, pSky);
        skyBg.style.opacity = String(skyFade);
      }

      // std-sky scroll movement: panel1 -> panel3
      const pStd = progressBetween(scrollY, state.p1Top, state.p3Top);
      if (stdWrap) {
        const yUp = -pStd * (state.vh * STD_EXIT_Y_VH);
        const sDown = 1 - pStd * (1 - STD_SCALE_MIN);
        const fade = 1 - smoothstep(0.60, 0.98, pStd);
        stdWrap.style.opacity = String(fade);
        stdWrap.style.transform =
          `translate3d(-50%, -50%, 0) translate3d(0, ${yUp.toFixed(1)}px, 0) scale(${sDown.toFixed(3)})`;
      }

      // Panel 2 scene: start immediately as you enter panel 2
      const p2 = progressWithinPanel(scrollY, state.p2Top, state.p2Height);
      if (lake) {
        const lakeScale = 1 + p2 * (LAKE_SCALE_MAX - 1);
        lake.style.transform = `scale(${lakeScale.toFixed(3)})`;
      }
      if (crater) {
        const craterScale = 1 - p2 * (1 - CRATER_SCALE_MIN);
        crater.style.transform = `translate3d(-50%, 0, 0) scale(${craterScale.toFixed(3)})`;
      }

      // Cloud progress clears by start of panel 2 (so they move earlier and avoid std-sky)
      // This makes the movement happen right away, not waiting until panel 3.
      const pCloud = progressBetween(scrollY, state.p1Top, state.p2Top);

      const vmin = Math.min(state.vw, state.vh);
      const safeR = vmin * SAFE_RADIUS_VMIN;

      state.layers.forEach((ln, idx) => {
        const el = ln.el;
        const parent = el.closest(".parallax-section");
        const rect = parent ? parent.getBoundingClientRect() : { width: state.vw, height: state.vh, left: 0, top: 0 };

        const xPct = ln.startX + (ln.endX - ln.startX) * pCloud;
        const yPct = ln.startY + (ln.endY - ln.startY) * pCloud;

        let x = (xPct / 100) * rect.width;
        let y = (yPct / 100) * rect.height;

        const depthBoost = clamp(0.92 + ln.z * 0.04, 0.9, 1.45);
        const extraDrift = ln.dir * ln.sideSpeed * depthBoost * pCloud * (state.vw * CLOUD_EXTRA_DRIFT_VW);

        const floatY = (Math.sin((pCloud * 2.0 + idx) * Math.PI) * 0.6 - pCloud) * ln.floatAmp;

        if (parent && parent.id === "panel-1") {
          const sx = rect.width * 0.5;
          const sy = rect.height * 0.5;

          // Circle keep-out
          const dx = x - sx;
          const dy = y - sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < safeR) {
            const push = (safeR - dist) + 34;
            const nx = dist === 0 ? 1 : dx / dist;
            const ny = dist === 0 ? 0 : dy / dist;
            const belowBias = ln.startY >= 55 ? 1.65 : 1.0;
            x += nx * push;
            y += ny * push * belowBias;
          }

          // Rectangle keep-out (strong)
          const rectW = rect.width * SAFE_RECT_W_VW;
          const rectH = rect.height * SAFE_RECT_H_VH;
          const rx0 = sx - rectW * 0.5;
          const rx1 = sx + rectW * 0.5;
          const ry0 = sy - rectH * 0.5;
          const ry1 = sy + rectH * 0.5;

          if (x > rx0 && x < rx1 && y > ry0 && y < ry1) {
            const toLeft = x - rx0;
            const toRight = rx1 - x;
            const pushX = toLeft < toRight ? -(toLeft + 34) : (toRight + 34);
            const pushY = (y < sy) ? -18 : 22;
            x += pushX;
            y += pushY;
          }

          // Lower clouds never rise into std-sky zone
          if (ln.startY >= 55) {
            y = Math.max(y, sy + safeR * 0.78);
          }
        }

        // fade but keep visible
        const fadeT = smoothstep(ln.fadeStart, ln.fadeEnd, pCloud);
        el.style.opacity = String(1 - fadeT);

        el.style.left = `${Math.round(rect.left + window.scrollX)}px`;
        el.style.top = `${Math.round(rect.top + window.scrollY)}px`;

        el.style.transform =
          `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate3d(-50%, -50%, 0) translate3d(${extraDrift.toFixed(1)}px, ${floatY.toFixed(1)}px, 0)`;
      });
    }

    // Map poster: toggle in-place (not modal)
    function toggleMapPoster() {
      if (!mapPoster) return;
      mapPoster.classList.toggle("is-shown");
    }

    if (mapTrigger) {
      mapTrigger.addEventListener("click", toggleMapPoster);
      mapTrigger.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleMapPoster();
        }
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

    window.ParallaxPanels = { refresh: function () { setup(); render(); } };
  }
})();
