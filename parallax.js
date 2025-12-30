(function () {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    const skyBg = document.getElementById("sky-bg");
    const panel1 = document.getElementById("panel-1");
    const panel2 = document.getElementById("panel-2");
    const panel3 = document.getElementById("panel-3");

    const lakeScene = document.getElementById("lake-scene");
    const lake = document.getElementById("lake");
    const crater = document.getElementById("crater");

    const mapTrigger = document.getElementById("map-trigger");
    const mapPoster = document.getElementById("map-poster");

    const cloudEls = Array.from(document.querySelectorAll(".cloud-layer"));
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

    function getScrollTop() {
      const se = document.scrollingElement;
      return (se && se.scrollTop) || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    }

    function getAbsTop(el) {
      const y = getScrollTop();
      const r = el.getBoundingClientRect();
      return y + r.top;
    }

    // Tunables
    const SKY_SCALE_MAX = 1.14;

    // Sky + clouds span: panel1 -> half panel2
    const END_AT_PANEL2_FRACTION = 0.50;

    // Clouds movement
    const DRIFT_X_MULT = 0.46;
    const DRIFT_Y_MULT = 0.14;

    // Safe zone around std-sky (panel1 only)
    const SAFE_RADIUS_VMIN = 0.66;
    const SAFE_RECT_W = 0.68;
    const SAFE_RECT_H = 0.60;

    // Lake/crater transforms (panel2 -> end panel3)
    const LAKE_SCALE_MAX = 1.25;
    const CRATER_SCALE_MIN = 0.50;

    const state = { layers: [] };

    function setupLayers() {
      const vw = window.innerWidth;
      const isMobile = vw <= 480;

      state.layers = cloudEls.map((el, i) => {
        const bg = el.dataset.bg;
        if (bg) el.style.backgroundImage = `url("${bg}")`;

        const startX = parseFloat(el.dataset.startX || "50");
        const startY = parseFloat(el.dataset.startY || "50");
        const endX = parseFloat(el.dataset.endX || startX);
        const endY = parseFloat(el.dataset.endY || startY);

        const size = parseFloat(el.dataset.size || "0.16");
        const speed = parseFloat(el.dataset.speed || "1.0");
        const dir = parseFloat(el.dataset.dir || "1");
        const z = parseInt(el.dataset.z || "1", 10) || 1;

        // Mobile: bigger clouds, more visible
        const sizeMult = isMobile ? 1.75 : (vw <= 900 ? 1.20 : 1.0);
        const w = clamp(vw * size * sizeMult, 150, 680);
        const h = w * 0.60;

        el.style.width = `${Math.round(w)}px`;
        el.style.height = `${Math.round(h)}px`;
        el.style.zIndex = String(Math.min(6, z));

        // Alternate vertical drift direction
        const dirY = (i % 3 === 0) ? -1 : 1;

        return { el, startX, startY, endX, endY, speed, dir, dirY, z, i };
      });
    }

    function render() {
      const scrollY = getScrollTop();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw <= 480;

      const p1Top = panel1 ? getAbsTop(panel1) : 0;
      const p2Top = panel2 ? getAbsTop(panel2) : vh;
      const p2H = panel2 ? panel2.offsetHeight : vh;
      const p3Top = panel3 ? getAbsTop(panel3) : (p2Top + p2H);
      const p3H = panel3 ? panel3.offsetHeight : vh;

      // Progress for sky+clouds
      const skyEnd = p2Top + p2H * END_AT_PANEL2_FRACTION;
      const pSky = clamp((scrollY - p1Top) / Math.max(1, (skyEnd - p1Top)), 0, 1);

      // Progress for lake/crater (panel2 -> end panel3)
      const lakeStart = p2Top;
      const lakeEnd = p3Top + p3H;
      const pLake = clamp((scrollY - lakeStart) / Math.max(1, (lakeEnd - lakeStart)), 0, 1);

      if (prefersReducedMotion) return;

      // SKY scale
      if (skyBg) {
        const s = 1 + pSky * (SKY_SCALE_MAX - 1);
        skyBg.style.transform = `scale(${s})`;
      }

      // Lake scene visible only from panel2 to end panel3 (instant toggle, no opacity animation)
      if (lakeScene) {
        const active = (scrollY >= lakeStart - 1) && (scrollY <= lakeEnd + 1);
        lakeScene.style.visibility = active ? "visible" : "hidden";
      }

      // Lake scales up (to 125%) across panel2->panel3
      if (lake) {
        const ls = 1 + pLake * (LAKE_SCALE_MAX - 1);
        lake.style.transform = `scale(${ls.toFixed(3)})`;
      }

      // Crater scales down faster than lake (reaches target earlier)
      if (crater) {
        const pCrater = clamp(pLake * 1.6, 0, 1);
        const cs = 1 - pCrater * (1 - CRATER_SCALE_MIN);
        crater.style.transform = `translate3d(-50%, 0, 0) scale(${cs.toFixed(3)})`;
      }

      // Safe zone values for panel1 (to protect std-sky)
      const p1W = panel1 ? panel1.clientWidth : vw;
      const p1Hpx = panel1 ? panel1.clientHeight : vh;
      const sx = p1W * 0.5;
      const sy = p1Hpx * 0.5;
      const safeR = Math.min(vw, vh) * SAFE_RADIUS_VMIN;

      // Mobile visibility tweaks
      const centerPull = isMobile ? 0.22 : 0.10; // pull clouds toward center more
      const xClampMin = isMobile ? 12 : 6;
      const xClampMax = isMobile ? 88 : 94;

      state.layers.forEach((ln) => {
        const el = ln.el;
        const parent = el.closest(".parallax-section");
        const inPanel2 = parent && parent.id === "panel-2";

        // Choose progress span per panel
        const p = inPanel2 ? pLake : pSky;

        // start->end anchors
        let xPct = ln.startX + (ln.endX - ln.startX) * p;
        let yPct = ln.startY + (ln.endY - ln.startY) * p;

        // center pull + clamp keeps clouds visible on mobile
        xPct = xPct + (50 - xPct) * centerPull;
        xPct = clamp(xPct, xClampMin, xClampMax);

        // Safe-zone only for panel1 clouds
        if (parent && parent.id === "panel-1") {
          let xPx = (xPct / 100) * p1W;
          let yPx = (yPct / 100) * p1Hpx;

          // circle keep-out
          const dx = xPx - sx;
          const dy = yPx - sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < safeR) {
            const push = (safeR - dist) + 82;
            const nx = dist === 0 ? 1 : dx / dist;
            const ny = dist === 0 ? 0 : dy / dist;
            xPx += nx * push;
            yPx += ny * push;
          }

          // rect keep-out
          const rw = p1W * SAFE_RECT_W;
          const rh = p1Hpx * SAFE_RECT_H;
          const rx0 = sx - rw * 0.5, rx1 = sx + rw * 0.5;
          const ry0 = sy - rh * 0.5, ry1 = sy + rh * 0.5;

          if (xPx > rx0 && xPx < rx1 && yPx > ry0 && yPx < ry1) {
            const toLeft = xPx - rx0;
            const toRight = rx1 - xPx;
            xPx += (toLeft < toRight) ? -(toLeft + 92) : (toRight + 92);
            yPx += (yPx < sy) ? -18 : 28;
          }

          xPct = (xPx / p1W) * 100;
          yPct = (yPx / p1Hpx) * 100;

          // re-clamp after push (mobile safety)
          xPct = clamp(xPct, xClampMin, xClampMax);
        }

        // Drift movement (no flipping, only translate)
        const driftX = ln.dir * ln.speed * p * (vw * DRIFT_X_MULT);
        const driftY = ln.dirY * ln.speed * p * (vh * DRIFT_Y_MULT);

        // float
        const float = Math.sin((p * 2.0 + ln.i) * Math.PI) * (10 + ln.z * 2);

        el.style.left = `${xPct}%`;
        el.style.top = `${yPct}%`;
        el.style.transform =
          `translate3d(-50%, -50%, 0) translate3d(${driftX.toFixed(1)}px, ${(driftY + float).toFixed(1)}px, 0)`;
      });
    }

    // Map poster toggle
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

    // Always-on loop (robust on mobile)
    function loop() {
      render();
      requestAnimationFrame(loop);
    }

    setupLayers();
    render();
    requestAnimationFrame(loop);

    window.addEventListener("resize", () => {
      setupLayers();
    }, { passive: true });
  }
})();
