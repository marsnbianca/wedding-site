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

    const stdWrap = document.getElementById("std-sky-wrap");

    const lake = document.getElementById("lake");
    const crater = document.getElementById("crater");

    const mapTrigger = document.getElementById("map-trigger");
    const mapPoster = document.getElementById("map-poster");

    const cloudEls = Array.from(document.querySelectorAll(".cloud-layer"));

    const state = {
      vw: window.innerWidth,
      vh: window.innerHeight,
      p1Top: 0,
      p2Top: 0,
      p2H: 1,
      endScroll: 1,
      layers: []
    };

    function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
    function smoothstep(a, b, x) {
      const t = clamp((x - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    }

    // Tunables (works on mobile too)
    const SKY_SCALE_MAX = 1.14;

    // We animate everything from start of panel1 until HALF of panel2
    const END_AT_PANEL2_FRACTION = 0.50;

    // Cloud drift multiplier (px)
    const DRIFT_X_MULT = 0.42; // width proportion
    const DRIFT_Y_MULT = 0.14; // height proportion

    // Strong safe zone around std-sky
    const SAFE_RADIUS_VMIN = 0.60;
    const SAFE_RECT_W = 0.62;
    const SAFE_RECT_H = 0.54;

    // Lake/crater transforms
    const LAKE_SCALE_MAX = 1.25;
    const CRATER_SCALE_MIN = 0.50;

    // std-sky scroll motion
    const STD_EXIT_Y_VH = 0.55;
    const STD_SCALE_MIN = 0.88;

    function setup() {
      state.vw = window.innerWidth;
      state.vh = window.innerHeight;

      state.p1Top = panel1 ? panel1.offsetTop : 0;
      state.p2Top = panel2 ? panel2.offsetTop : state.vh;
      state.p2H = panel2 ? panel2.offsetHeight : state.vh;

      state.endScroll = state.p2Top + state.p2H * END_AT_PANEL2_FRACTION;

      state.layers = cloudEls.map((el, i) => {
        const bg = el.dataset.bg;
        if (bg) el.style.backgroundImage = `url("${bg}")`;

        const startX = parseFloat(el.dataset.startX || "50");
        const startY = parseFloat(el.dataset.startY || "50");
        const endX = parseFloat(el.dataset.endX || startX);
        const endY = parseFloat(el.dataset.endY || startY);

        const size = parseFloat(el.dataset.size || "0.16");
        const speed = parseFloat(el.dataset.speed || "1.0");
        const drift = parseFloat(el.dataset.drift || "0.55");
        const z = parseInt(el.dataset.z || "1", 10) || 1;

        const sizeMult = (state.vw <= 480) ? 1.25 : (state.vw <= 900 ? 1.10 : 1.0);
        const w = clamp(state.vw * size * sizeMult, 72, 560);
        const h = w * 0.60;

        el.style.width = `${Math.round(w)}px`;
        el.style.height = `${Math.round(h)}px`;
        el.style.zIndex = String(Math.min(6, z));
        el.style.left = `${startX}%`;
        el.style.top = `${startY}%`;

        // Alternate directions
        const dirX = (i % 2 === 0) ? -1 : 1;
        const dirY = (i % 3 === 0) ? -1 : 1;

        return { el, startX, startY, endX, endY, speed, drift, dirX, dirY, z, i };
      });

      // Reset scene visibility
      if (lake) lake.style.opacity = "0";
      if (crater) crater.style.opacity = "0";

      // Reset poster hidden state (but keep class if user toggled)
      if (mapPoster && !mapPoster.classList.contains("is-shown")) {
        // nothing
      }

      render();
    }

    function render() {
      if (prefersReducedMotion) return;

      const scrollY = window.scrollY || window.pageYOffset;

      // Progress from panel1 start to half panel2
      const p = clamp((scrollY - state.p1Top) / Math.max(1, (state.endScroll - state.p1Top)), 0, 1);

      // SKY scale + fade (until lake takes over)
      if (skyBg) {
        const s = 1 + p * (SKY_SCALE_MAX - 1);
        skyBg.style.transform = `scale(${s})`;
        // fade out later so it is visible into panel2
        skyBg.style.opacity = String(1 - smoothstep(0.62, 1.0, p));
      }

      // LAKE/CRATER: visible and scaling during same progress window
      const lakeIn = smoothstep(0.55, 0.92, p);
      if (lake) {
        lake.style.opacity = String(lakeIn);
        const ls = 1 + p * (LAKE_SCALE_MAX - 1);
        lake.style.transform = `scale(${ls.toFixed(3)})`;
      }
      if (crater) {
        crater.style.opacity = String(lakeIn);
        const cs = 1 - p * (1 - CRATER_SCALE_MIN);
        crater.style.transform = `translate3d(-50%, 0, 0) scale(${cs.toFixed(3)})`;
      }

      // std-sky moves slightly up and scales down a bit to help clearing feel
      if (stdWrap) {
        const yUp = -p * (state.vh * STD_EXIT_Y_VH);
        const sDown = 1 - p * (1 - STD_SCALE_MIN);
        stdWrap.style.transform = `translate3d(-50%, -50%, 0) translate3d(0, ${yUp.toFixed(1)}px, 0) scale(${sDown.toFixed(3)})`;
        stdWrap.style.opacity = String(1 - smoothstep(0.78, 1.0, p));
      }

      // Safe zone dimensions (in panel1 coordinate space)
      const safeR = Math.min(state.vw, state.vh) * SAFE_RADIUS_VMIN;

      // Animate clouds
      state.layers.forEach((ln) => {
        const el = ln.el;

        // start->end anchors
        let xPct = ln.startX + (ln.endX - ln.startX) * p;
        let yPct = ln.startY + (ln.endY - ln.startY) * p;

        // Compute safe zone only in panel 1
        if (panel1) {
          const rectW = panel1.clientWidth;
          const rectH = panel1.clientHeight;
          const sx = rectW * 0.5;
          const sy = rectH * 0.5;

          // Convert pct to px inside panel1
          let xPx = (xPct / 100) * rectW;
          let yPx = (yPct / 100) * rectH;

          // Circle keep-out
          const dx = xPx - sx;
          const dy = yPx - sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < safeR) {
            const push = (safeR - dist) + 52;
            const nx = dist === 0 ? 1 : dx / dist;
            const ny = dist === 0 ? 0 : dy / dist;
            xPx += nx * push;
            yPx += ny * push;
          }

          // Rectangle keep-out
          const rw = rectW * SAFE_RECT_W;
          const rh = rectH * SAFE_RECT_H;
          const rx0 = sx - rw * 0.5, rx1 = sx + rw * 0.5;
          const ry0 = sy - rh * 0.5, ry1 = sy + rh * 0.5;

          if (xPx > rx0 && xPx < rx1 && yPx > ry0 && yPx < ry1) {
            const toLeft = xPx - rx0;
            const toRight = rx1 - xPx;
            xPx += (toLeft < toRight) ? -(toLeft + 56) : (toRight + 56);
            yPx += (yPx < sy) ? -18 : 26;
          }

          // Convert back to pct
          xPct = (xPx / rectW) * 100;
          yPct = (yPx / rectH) * 100;
        }

        // Drift (clearing)
        const driftX = ln.dirX * ln.speed * ln.drift * p * (state.vw * DRIFT_X_MULT);
        const driftY = ln.dirY * ln.speed * ln.drift * p * (state.vh * DRIFT_Y_MULT);

        // Subtle float
        const float = Math.sin((p * 2.0 + ln.i) * Math.PI) * (8 + ln.z * 2);

        el.style.left = `${xPct}%`;
        el.style.top = `${yPct}%`;

        el.style.transform =
          `translate3d(-50%, -50%, 0) translate3d(${driftX.toFixed(1)}px, ${(driftY + float).toFixed(1)}px, 0)`;

        // Fade as it clears
        el.style.opacity = String(1 - smoothstep(0.12, 0.98, p));
      });
    }

    // Map poster toggle (this was missing for you before)
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
      requestAnimationFrame(() => {
        ticking = false;
        render();
      });
    }

    setup();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => { setup(); }, { passive: true });
  }
})();
