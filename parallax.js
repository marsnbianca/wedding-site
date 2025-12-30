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

    // Animate from panel1 start -> HALF of panel2
    const END_AT_PANEL2_FRACTION = 0.50;

    // Clouds
    const DRIFT_X_MULT = 0.46;
    const DRIFT_Y_MULT = 0.14;

    // Safe zone around std-sky
    const SAFE_RADIUS_VMIN = 0.66;
    const SAFE_RECT_W = 0.68;
    const SAFE_RECT_H = 0.60;

    // Lake/crater transforms
    const LAKE_SCALE_MAX = 1.25;
    const CRATER_SCALE_MIN = 0.50;

    const state = {
      layers: []
    };

    function setupLayers() {
      const vw = window.innerWidth;

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

        // Mobile: make clouds bigger + pull toward center
        const isMobile = vw <= 480;
        const sizeMult = isMobile ? 1.55 : (vw <= 900 ? 1.15 : 1.0);

        const w = clamp(vw * size * sizeMult, 120, 640);
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

      const p1Top = panel1 ? getAbsTop(panel1) : 0;
      const p2Top = panel2 ? getAbsTop(panel2) : window.innerHeight;
      const p2H = panel2 ? panel2.offsetHeight : window.innerHeight;

      const endScroll = p2Top + p2H * END_AT_PANEL2_FRACTION;
      const p = clamp((scrollY - p1Top) / Math.max(1, (endScroll - p1Top)), 0, 1);

      if (prefersReducedMotion) return;

      // SKY scales (no opacity animation)
      if (skyBg) {
        const s = 1 + p * (SKY_SCALE_MAX - 1);
        skyBg.style.transform = `scale(${s})`;
      }

      // Lake scales up to 125% (no opacity animation)
      if (lake) {
        const ls = 1 + p * (LAKE_SCALE_MAX - 1);
        lake.style.transform = `scale(${ls.toFixed(3)})`;
      }

      // Crater scales down to 50% (no opacity animation)
      if (crater) {
        const cs = 1 - p * (1 - CRATER_SCALE_MIN);
        crater.style.transform = `translate3d(-50%, 0, 0) scale(${cs.toFixed(3)})`;
      }

      // Safe zone in panel1 space
      const safeR = Math.min(window.innerWidth, window.innerHeight) * SAFE_RADIUS_VMIN;
      const p1W = panel1 ? panel1.clientWidth : window.innerWidth;
      const p1H = panel1 ? panel1.clientHeight : window.innerHeight;
      const sx = p1W * 0.5;
      const sy = p1H * 0.5;

      const isMobile = window.innerWidth <= 480;
      const centerPull = isMobile ? 0.08 : 0; // pull 8% toward center on mobile

      state.layers.forEach((ln) => {
        const el = ln.el;

        // start->end anchors
        let xPct = ln.startX + (ln.endX - ln.startX) * p;
        let yPct = ln.startY + (ln.endY - ln.startY) * p;

        // pull toward center on mobile (so clouds aren’t off-screen)
        if (centerPull) {
          xPct = xPct + (50 - xPct) * centerPull;
        }

        // pct -> px in panel1
        let xPx = (xPct / 100) * p1W;
        let yPx = (yPct / 100) * p1H;

        // keep-out circle
        const dx = xPx - sx;
        const dy = yPx - sy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < safeR) {
          const push = (safeR - dist) + 72;
          const nx = dist === 0 ? 1 : dx / dist;
          const ny = dist === 0 ? 0 : dy / dist;
          xPx += nx * push;
          yPx += ny * push;
        }

        // keep-out rectangle
        const rw = p1W * SAFE_RECT_W;
        const rh = p1H * SAFE_RECT_H;
        const rx0 = sx - rw * 0.5, rx1 = sx + rw * 0.5;
        const ry0 = sy - rh * 0.5, ry1 = sy + rh * 0.5;

        if (xPx > rx0 && xPx < rx1 && yPx > ry0 && yPx < ry1) {
          const toLeft = xPx - rx0;
          const toRight = rx1 - xPx;
          xPx += (toLeft < toRight) ? -(toLeft + 78) : (toRight + 78);
          yPx += (yPx < sy) ? -18 : 28;
        }

        // back to pct after push
        xPct = (xPx / p1W) * 100;
        yPct = (yPx / p1H) * 100;

        // drift (clearing)
        const driftX = ln.dir * ln.speed * p * (window.innerWidth * DRIFT_X_MULT);
        const driftY = ln.dirY * ln.speed * p * (window.innerHeight * DRIFT_Y_MULT);

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

    // Always-on loop
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
