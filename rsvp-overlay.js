// rsvp-overlay.js — responsive modal overlay for wedding-site (parent)
// Path: wedding-site/rsvp-overlay.js
// Include from your wedding-site index.html: <script src="rsvp-overlay.js"></script>
//
// This version uses a JS-updated CSS variable (--dvh) that represents 1% of the dynamic viewport height.
// We set iframe max-height using a min(px, calc(var(--dvh) * N)) expression so browsers use the dynamic-vh
// value (reduces issues when address bars show/hide on mobile) while still capping to an absolute px value.
// Note: using dynamic viewport height can cause reflows ("jank") as the browser UI appears/disappears.
// We debounce updates and listen to visualViewport where available to reduce noise.

(function () {
  var RSVP_URL = "https://marsnbianca.github.io/rsvp-tool/"; // <-- REPLACE with your frontend Pages URL
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  // Create host container
  var host = document.getElementById("rsvpHostOverlay");
  if (!host) {
    host = document.createElement("div");
    host.id = "rsvpHostOverlay";
    host.style.display = 'none';
    document.body.appendChild(host);

    var style = document.createElement('style');
    style.textContent = [
      "#rsvpHostOverlay{ position:fixed; inset:0; z-index:999999; display:none; align-items:center; justify-content:center;",
      " background: rgba(0,0,0,0.45); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); padding:1rem; box-sizing:border-box; }",

      ".rsvp-modal-card{ position:relative; width:auto; max-width:96vw; box-sizing:border-box; background:#fff; border-radius:0.75rem; overflow:visible;",
      " box-shadow:0 1rem 3rem rgba(0,0,0,0.22); transition:transform .18s ease,opacity .12s ease, width .18s ease, padding .18s ease, max-height .18s ease; padding: clamp(0.5rem, 2vw, 1rem); }",

      "@media (max-width:640px){ .rsvp-modal-card{ max-width: min(96vw, 26rem); } }",
      "@media (min-width:641px) and (max-width:1007px){ .rsvp-modal-card{ max-width:82vw; } }",
      "@media (min-width:1008px){ .rsvp-modal-card{ max-width: min(70vw, 70rem); min-width: 36rem; } }",

      ".rsvp-modal-iframe{ width:100%; border:0; display:block; background:transparent; box-sizing:border-box; }",

      ".rsvp-modal-close{ position:absolute; right:0.6rem; top:0.6rem; z-index:10; background:rgba(255,255,255,0.95); border:0;",
      " width:2.25rem; height:2.25rem; border-radius:0.5rem; cursor:pointer; display:flex; align-items:center; justify-content:center;",
      " box-shadow:0 0.3rem 1rem rgba(0,0,0,0.12); }"
    ].join('');
    document.head.appendChild(style);
  }

  var iframe = null, card = null, lastFocus = null, hostClickHandler = null, topCloseBtn = null;

  function lockScroll(lock) {
    if (lock) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }

  // update dynamic viewport unit: --dvh (1% of viewport height at runtime)
  var dvhTimer = null;
  function updateDvh() {
    if (dvhTimer) clearTimeout(dvhTimer);
    dvhTimer = setTimeout(function () {
      var dv = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--dvh', dv + 'px');
    }, 80); // debounce a little to avoid too many updates
  }

  // initial set
  updateDvh();

  // listen to resize/orientationchange/visualViewport to update --dvh
  window.addEventListener('resize', updateDvh);
  window.addEventListener('orientationchange', updateDvh);
  if (window.visualViewport) {
    try {
      window.visualViewport.addEventListener('resize', updateDvh);
      window.visualViewport.addEventListener('scroll', updateDvh);
    } catch (_) {}
  }

  // breakpoint-config for recommended caps (we use dynamic units when available)
  function breakpointConfig() {
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (vw >= 1008) {
      return {
        // use fraction of dynamic viewport (via calc(var(--dvh)*N)) and also absolute px cap
        maxHeightVhPct: 65, // percent (65vh)
        maxHeightPxCap: 650,
        padMinRem: 0.8,
        padMaxRem: 1.6,
        widthVw: 70
      };
    } else if (vw >= 641) {
      return {
        maxHeightVhPct: 60,
        maxHeightPxCap: Math.round(vh * 0.9),
        padMinRem: 0.7,
        padMaxRem: 1.2,
        widthVw: 82
      };
    } else {
      return {
        maxHeightVhPct: 95,
        maxHeightPxCap: Math.round(vh * 0.95),
        padMinRem: 0.5,
        padMaxRem: 1.0,
        widthVw: 96
      };
    }
  }

  // per-step preferred padding (rem)
  function preferredPaddingRem(stepName) {
    const mapping = {
      search: 0.6,
      matches: 0.7,
      notInList: 0.6,
      attendance: 1.0,
      transport: 0.8,
      phone: 0.7,
      notes: 0.7,
      review: 0.8,
      thanks: 0.6
    };
    return mapping[stepName] || 0.8;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Apply padding top/bottom (rem) and set iframe max-height using dynamic viewport (--dvh) + px cap fallback
  function applyPaddingAndMaxHeight(stepName, maxSeats) {
    if (!iframe || !card) return;
    var cfg = breakpointConfig();

    // determine padding rem and clamp to breakpoint min/max
    var pref = preferredPaddingRem(stepName || '');
    var padRem = clamp(pref, cfg.padMinRem, cfg.padMaxRem);
    var padHRem = Math.max(0.6, padRem * 0.6);

    // apply padding (vertical strong, horizontal smaller)
    card.style.paddingTop = padRem + 'rem';
    card.style.paddingBottom = padRem + 'rem';
    card.style.paddingLeft = padHRem + 'rem';
    card.style.paddingRight = padHRem + 'rem';

    // width target (in vw) — CSS max-width still enforces caps
    card.style.width = cfg.widthVw + 'vw';

    // compute CSS expression for dynamic-vh-based cap (uses --dvh set by updateDvh)
    var vhPct = cfg.maxHeightVhPct || cfg.maxHeightVhPct === 0 ? cfg.maxHeightVhPct : cfg.maxHeightVhPct;
    // Note: cfg.maxHeightVhPct is percent number (e.g., 65 for 65vh)
    // Use min(pxCap, calc(var(--dvh) * N))
    var calcStr = 'calc(var(--dvh) * ' + (cfg.maxHeightVhPct || cfg.maxHeightVhPct === 0 ? cfg.maxHeightVhPct : 65) + ')';
    var pxCap = cfg.maxHeightPxCap;

    // apply max-height using min() so browsers use dynamic calc when available, but never exceed pxCap
    iframe.style.maxHeight = 'min(' + pxCap + 'px, ' + calcStr + ')';
    // also set inline CSS property for fallback if needed
    iframe.style.boxSizing = 'border-box';

    // DO NOT set iframe.style.height or minimum heights; content decides height up to the max
    card.style.height = 'auto';
  }

  function createTopClose() {
    if (topCloseBtn) return;
    topCloseBtn = document.createElement('button');
    topCloseBtn.className = 'rsvp-modal-close';
    topCloseBtn.setAttribute('aria-label', 'Close RSVP');
    topCloseBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="18" height="18"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    topCloseBtn.addEventListener('click', closeRSVP);
  }

  function setTopCloseVisible(visible) {
    if (!topCloseBtn) return;
    topCloseBtn.style.display = visible ? '' : 'none';
  }

  function openRSVP(e) {
    if (e && typeof e.preventDefault === "function") { e.preventDefault(); try { e.stopPropagation(); } catch (_) {} }

    lastFocus = document.activeElement;

    host.innerHTML = '';
    host.style.display = 'flex';
    host.style.pointerEvents = 'auto';

    card = document.createElement('div');
    card.className = 'rsvp-modal-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');

    createTopClose();
    if (topCloseBtn) card.appendChild(topCloseBtn);

    iframe = document.createElement('iframe');
    iframe.className = 'rsvp-modal-iframe';
    iframe.setAttribute('title', 'RSVP');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('scrolling', 'auto');
    iframe.src = RSVP_URL + (RSVP_URL.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now());

    // Do not force height; let content size up to max-height
    iframe.style.height = 'auto';
    iframe.style.boxSizing = 'border-box';

    card.appendChild(iframe);
    host.appendChild(card);

    hostClickHandler = function onHostClick(ev) {
      if (ev.target === host) closeRSVP();
    };
    host.addEventListener('click', hostClickHandler);

    // request step after load so parent can set padding & dynamic max-height
    iframe.addEventListener('load', function () {
      try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_STEP' }, '*'); } catch (err) {}
      setTimeout(function(){ try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_STEP' }, '*'); } catch (err) {} }, 160);
    });

    lockScroll(true);
    console.info('rsvp-overlay: opened modal ->', iframe.src);
  }

  function closeRSVP() {
    if (hostClickHandler) {
      try { host.removeEventListener('click', hostClickHandler); } catch (_) {}
      hostClickHandler = null;
    }
    host.innerHTML = '';
    host.style.display = 'none';
    host.style.pointerEvents = 'none';
    lockScroll(false);
    try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (_) {}
    lastFocus = null;
    iframe = null;
    card = null;
    console.info('rsvp-overlay: closed');
  }

  // Delegated click to open the overlay
  document.addEventListener('click', function (e) {
    var t = e.target;
    try {
      var opener = t.closest && (t.closest('img[alt="openRSVP"], img[aria-label="openRSVP"], img[title="openRSVP"], button[aria-label="openRSVP"], [data-rsvp="open"], .rsvp-btn') );
      if (opener) { openRSVP(e); return; }
      var el = t.closest && t.closest("a, button, div, span");
      if (el) {
        var txt = (el.innerText || el.textContent || "").trim().toLowerCase();
        if (txt === "rsvp") { openRSVP(e); return; }
      }
    } catch (_) {}
  }, true);

  // Receive step messages from child and apply padding + max-height
  window.addEventListener('message', function (e) {
    if (!e) return;
    try {
      if (typeof e.origin === 'string') {
        var ok = (e.origin === RSVP_ORIGIN) || e.origin.startsWith("https://script.googleusercontent.com") || e.origin.startsWith("https://script.google.com") || e.origin.startsWith(RSVP_URL);
        if (!ok) { return; }
      }
    } catch (_) {}

    var data = e.data;
    if (!data) return;

    if (typeof data === 'object' && data.type) {
      if (data.type === 'RSVP:STEP') {
        var step = data.step || 'search';
        var maxSeats = parseInt(data.maxSeats || 1, 10) || 1;
        applyPaddingAndMaxHeight(step, maxSeats);
        if (typeof data.hasBottomClose !== 'undefined') setTopCloseVisible(!data.hasBottomClose);
        return;
      }
      if (data.type === 'RSVP:HAS_BOTTOM_CLOSE') {
        setTopCloseVisible(!data.hasBottomClose);
        return;
      }
      if (data.type === 'RSVP:CLOSE') { closeRSVP(); return; }
    }

    if (e.data === 'RSVP:CLOSE') { closeRSVP(); return; }
  });

  // update dynamic viewport measure whenever page-level resizes occur
  updateDvh(); // ensure it's set if file was reloaded
  window.addEventListener('resize', updateDvh);
  window.addEventListener('orientationchange', updateDvh);
  if (window.visualViewport) {
    try {
      window.visualViewport.addEventListener('resize', updateDvh);
      window.visualViewport.addEventListener('scroll', updateDvh);
    } catch (_) {}
  }

  // ESC closes overlay
  window.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape' && host.style.display === 'flex') closeRSVP();
  });

  // expose API
  window.__rsvp = {
    open: openRSVP,
    close: closeRSVP,
    info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay"), open: host.style.display === 'flex' }; }
  };

  console.log('rsvp-overlay: initialized (uses dynamic viewport --dvh for max-height)');
})();
