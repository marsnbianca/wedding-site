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
    const panel4 = document.getElementById("panel-4");

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
      return (se && se.scrollTop)
        || window.pageYOffset
        || document.documentElement.scrollTop
        || document.body.scrollTop
        || 0;
    }

    function getAbsTop(el) {
      const y = getScrollTop();
      const r = el.getBoundingClientRect();
      return y + r.top;
    }

    /* ==============================
       SPEED MULTIPLIERS (NEW)
       ============================== */
    const LAKE_SPEED_MULT   = 2.0;   // lake scales 2× faster
    const CRATER_SPEED_MULT = 2.4;   // crater slightly faster than lake
    const SETTLE_SPEED_MULT = 2.0;   // bottom → midpoint move is 2×

    /* ==============================
       OTHER TUNING (UNCHANGED)
       ============================== */
    const SKY_SCALE_MAX = 1.14;

    const DRIFT_X_MULT = 0.48;
    const DRIFT_Y_MULT = 0.14;

    const SAFE_RADIUS_VMIN = 0.66;
    const SAFE_RECT_W = 0.68;
    const SAFE_RECT_H = 0.60;

    const LAKE_SCALE_MAX = 1.25;
    const CRATER_SCALE_MIN = 0.30;

    const SETTLE_SPAN = 0.22; // fraction of panel2 height

    const state = { layers: [] };

    function setupLayers() {
      const vw = window.innerWidth;
      const isMobile = vw <= 480;

      state.layers = cloudEls.map((el, i) => {
        const bg = el.dataset.bg;
        if (bg) el.style.backgroundImage = `url("${bg}")`;

        const startX = parseFloat(el.dataset.startX || "50");
        const startY = parseFloat(el.dataset.startY || "50");
        const endX   = parseFloat(el.dataset.endX   || startX);
        const endY   = parseFloat(el.dataset.endY   || startY);

        const size  = parseFloat(el.dataset.size  || "0.16");
        const speed = parseFloat(el.dataset.speed || "1.0");
        const dir   = parseFloat(el.dataset.dir   || "1");
        const z     = parseInt(el.dataset.z || "1", 10) || 1;

        const sizeMult = isMobile ? 1.75 : (vw <= 900 ? 1.20 : 1.0);
        const w = clamp(vw * size * sizeMult, 150, 700);
        const h = w * 0.60;

        el.style.width = `${Math.round(w)}px`;
        el.style.height = `${Math.round(h)}px`;
        el.style.zIndex = String(Math.min(6, z));

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
      const p2H   = panel2 ? panel2.offsetHeight : vh;
      const p3Top = panel3 ? getAbsTop(panel3) : (p2Top + p2H);
      const p3H   = panel3 ? panel3.offsetHeight : vh;
      const p4Top = panel4 ? getAbsTop(panel4) : (p3Top + p3H);

      /* ---------- SKY PROGRESS ---------- */
      const skyEnd = p2Top + p2H * 0.50;
      const pSky = clamp((scrollY - p1Top) / Math.max(1, (skyEnd - p1Top)), 0, 1);

      /* ---------- PANEL 2 CLOUD CLEAR ---------- */
      const pClear2 = clamp((scrollY - p2Top) / Math.max(1, (p3Top - p2Top)), 0, 1);

      /* ---------- LAKE / CRATER PROGRESS (FASTER) ---------- */
      const lakeStart = p2Top;
      const lakeEnd   = p4Top;

      let pLake = clamp((scrollY - lakeStart) / Math.max(1, (lakeEnd - lakeStart)), 0, 1);
      pLake = clamp(pLake * LAKE_SPEED_MULT, 0, 1); // 🔥 SPEED UP

      if (prefersReducedMotion) return;

      /* ---------- SKY ---------- */
      if (skyBg) {
        const s = 1 + pSky * (SKY_SCALE_MAX - 1);
        skyBg.style.transform = `scale(${s})`;
      }

      /* ---------- LAKE SCENE VISIBILITY ---------- */
      if (lakeScene) {
        const active = (scrollY >= lakeStart - 1) && (scrollY < lakeEnd - 1);
        lakeScene.style.visibility = active ? "visible" : "hidden";
      }

      /* ---------- LAKE POSITION (BOTTOM → MIDPOINT, FASTER) ---------- */
      const settleSpanPx = p2H * SETTLE_SPAN;
      let settleT = clamp((scrollY - p2Top) / Math.max(1, settleSpanPx), 0, 1);
      settleT = clamp(settleT * SETTLE_SPEED_MULT, 0, 1); // 🔥 SPEED UP

      const startOffsetPx = isMobile ? (vh * 0.38) : (vh * 0.42);
      const yOffset = (1 - settleT) * startOffsetPx;

      if (lakeScene) {
        lakeScene.style.transform =
          `translate3d(-50%, calc(-50% + ${yOffset.toFixed(1)}px), 0)`;
      }

      /* ---------- LAKE SCALE (FASTER) ---------- */
      if (lake) {
        const ls = 1 + pLake * (LAKE_SCALE_MAX - 1);
        lake.style.transform = `scale(${ls.toFixed(3)})`;
      }

      /* ---------- CRATER SCALE (EVEN FASTER) ---------- */
      if (crater) {
        let pCrater = clamp(pLake * CRATER_SPEED_MULT, 0, 1);
        const cs = 1 - pCrater * (1 - CRATER_SCALE_MIN);
        crater.style.transform =
          `translate3d(-50%, 0, 0) scale(${cs.toFixed(3)})`;
      }

      /* ---------- CLOUDS ---------- */
      const p1W = panel1 ? panel1.clientWidth : vw;
      const p1Hpx = panel1 ? panel1.clientHeight : vh;
      const sx = p1W * 0.5;
      const sy = p1Hpx * 0.5;
      const safeR = Math.min(vw, vh) * SAFE_RADIUS_VMIN;

      const centerPull = isMobile ? 0.26 : 0.12;
      const xClampMin = isMobile ? 12 : 6;
      const xClampMax = isMobile ? 88 : 94;

      state.layers.forEach((ln) => {
        const el = ln.el;
        const parent = el.closest(".parallax-section");
        const pid = parent ? parent.id : "";

        const p = (pid === "panel-2") ? pClear2 : pSky;

        let xPct = ln.startX + (ln.endX - ln.startX) * p;
        let yPct = ln.startY + (ln.endY - ln.startY) * p;

        xPct = xPct + (50 - xPct) * centerPull;
        xPct = clamp(xPct, xClampMin, xClampMax);

        if (pid === "panel-1") {
          let xPx = (xPct / 100) * p1W;
          let yPx = (yPct / 100) * p1Hpx;

          const dx = xPx - sx;
          const dy = yPx - sy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < safeR) {
            const push = (safeR - dist) + 92;
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);
            xPx += nx * push;
            yPx += ny * push;
          }

          xPct = clamp((xPx / p1W) * 100, xClampMin, xClampMax);
          yPct = (yPx / p1Hpx) * 100;
        }

        const driftX = ln.dir  * ln.speed * p * (vw * DRIFT_X_MULT);
        const driftY = ln.dirY * ln.speed * p * (vh * DRIFT_Y_MULT);
        const float  = Math.sin((p * 2 + ln.i) * Math.PI) * (10 + ln.z * 2);

        el.style.left = `${xPct}%`;
        el.style.top  = `${yPct}%`;
        el.style.transform =
          `translate3d(-50%, -50%, 0) translate3d(${driftX.toFixed(1)}px, ${(driftY + float).toFixed(1)}px, 0)`;
      });
    }

    function toggleMapPoster() {
      if (mapPoster) mapPoster.classList.toggle("is-shown");
    }
    if (mapTrigger) {
      mapTrigger.addEventListener("click", toggleMapPoster);
      mapTrigger.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleMapPoster();
        }
      });
    }

    function loop() {
      render();
      requestAnimationFrame(loop);
    }

    setupLayers();
    render();
    requestAnimationFrame(loop);

    window.addEventListener("resize", setupLayers, { passive: true });
  }
})();
