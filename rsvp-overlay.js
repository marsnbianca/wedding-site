// rsvp-overlay.js — responsive modal overlay for wedding-site (parent)
// Path: wedding-site/rsvp-overlay.js
// Include from your wedding-site index.html: <script src="rsvp-overlay.js"></script>
//
// Features in this version:
// - Parent sizes iframe to child-reported height (RSVP:HEIGHT) so iframe shows no internal scrollbar when possible.
// - When content > recommended max, overlay becomes scrollable and modal top-aligns.
// - Smooth animated transition between centered <-> top-aligned states to reduce perceived jank.
// - Safe mobile address-bar reflow handling via dynamic viewport unit (--dvh) and an adaptive margin.
// - Visual debug overlay showing reported child height, recommended max, and current step (toggleable).
// - DEBUG flag and window.__rsvp.setDebug(true|false) to enable logs + visual debug overlay.

(function () {
  // ---- Config / state ----
  var DEBUG = false; // toggle with window.__rsvp.setDebug(true)
  var SHOW_DEBUG_OVERLAY = false;
  var RSVP_URL = "https://marsnbianca.github.io/rsvp-tool/"; // update if needed
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  function log() { if (DEBUG) console.log.apply(console, arguments); }

  // ---- Host / styles ----
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

      /* Card base with transitions */
      ".rsvp-modal-card{ position:relative; width:auto; max-width:96vw; box-sizing:border-box; background:#fff; border-radius:0.75rem;",
      " overflow:visible; box-shadow:0 1rem 3rem rgba(0,0,0,0.22);",
      " transition: transform .26s cubic-bezier(.2,.9,.2,1), padding .22s ease, margin .22s ease, width .18s ease, opacity .18s ease; padding: clamp(0.4rem, 1.8vw, 1rem); }",

      /* Iframe sized by parent; hide overflow to avoid internal scroll when parent sizes it */
      ".rsvp-modal-iframe{ width:100%; border:0; display:block; background:transparent; box-sizing:border-box;",
      " transition: height .18s ease, max-height .18s ease; overflow:hidden; }",

      /* Top-aligned modifier: when modal is taller than recommended, parent adds this class to animate */
      ".rsvp-modal-card.rsvp-top{ /* smaller transform when top aligned */ transform: translateY(0); }",

      /* Small visual smoothing for entering */
      ".rsvp-modal-card.rsvp-enter{ transform: translateY(-6px); opacity:0; }",
      ".rsvp-modal-card.rsvp-enter.rsvp-enter-to{ transform: translateY(0); opacity:1; }",

      /* height recommendations (mobile-first) */
      ".rsvp-modal-card .rsvp-modal-iframe{ min-height:20svh; max-height:85svh; }",
      "@media (min-width:641px) and (max-width:1007px){ .rsvp-modal-card .rsvp-modal-iframe{ min-height:300px; max-height:80svh; } }",
      "@media (min-width:1008px){ .rsvp-modal-card .rsvp-modal-iframe{ min-height:400px; max-height:70vh; } }",

      /* Width caps - restored to earlier approved settings (desktop 60vw capped to 50rem) */
      "@media (max-width:640px){ .rsvp-modal-card{ max-width: min(90vw, 26rem); } }",
      "@media (min-width:641px) and (max-width:1007px){ .rsvp-modal-card{ max-width:76vw; } }",
      "@media (min-width:1008px){ .rsvp-modal-card{ max-width: min(60vw, 50rem); } }",

      /* Close button */
      ".rsvp-modal-close{ position:absolute; right:0.6rem; top:0.6rem; z-index:10; background:rgba(255,255,255,0.95); border:0;",
      " width:2.25rem; height:2.25rem; border-radius:0.5rem; cursor:pointer; display:flex; align-items:center; justify-content:center;",
      " box-shadow:0 0.3rem 1rem rgba(0,0,0,0.12); }",

      /* debug overlay */
      "#rsvpDebugOverlay{ position:fixed; left:8px; top:8px; z-index:1000000; background:rgba(0,0,0,0.72); color:#fff; padding:0.35rem 0.6rem; border-radius:0.45rem; font-size:12px; font-family:monospace; display:none; }",
      "#rsvpDebugOverlay b{ display:inline-block; min-width:68px; }"
    ].join('');
    document.head.appendChild(style);
  }

  // Create debug overlay element
  var debugEl = document.getElementById('rsvpDebugOverlay');
  if (!debugEl) {
    debugEl = document.createElement('div');
    debugEl.id = 'rsvpDebugOverlay';
    debugEl.innerHTML = '<div><b>step:</b> <span id="rsvpDebugStep">-</span></div>' +
                        '<div><b>height:</b> <span id="rsvpDebugHeight">-</span></div>' +
                        '<div><b>max:</b> <span id="rsvpDebugMax">-</span></div>';
    document.body.appendChild(debugEl);
  }

  function showDebugOverlay(show) {
    SHOW_DEBUG_OVERLAY = !!show;
    debugEl.style.display = SHOW_DEBUG_OVERLAY ? '' : 'none';
  }
  function updateDebugOverlay(step, height, max) {
    if (!SHOW_DEBUG_OVERLAY) return;
    try {
      document.getElementById('rsvpDebugStep').textContent = String(step || '-');
      document.getElementById('rsvpDebugHeight').textContent = (height ? height + 'px' : '-');
      document.getElementById('rsvpDebugMax').textContent = (max ? max + 'px' : '-');
    } catch (_) {}
  }

  // ---- dynamic viewport helper (dvh) ----
  var dvhTimer = null;
  function updateDvhVar() {
    if (dvhTimer) clearTimeout(dvhTimer);
    dvhTimer = setTimeout(function () {
      var dv = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--dvh', dv + 'px');
      log('updateDvhVar ->', dv + 'px');
    }, 80);
  }
  updateDvhVar();
  window.addEventListener('resize', updateDvhVar);
  window.addEventListener('orientationchange', updateDvhVar);
  if (window.visualViewport) {
    try {
      window.visualViewport.addEventListener('resize', updateDvhVar);
      window.visualViewport.addEventListener('scroll', updateDvhVar);
    } catch (_) {}
  }

  // ---- utilities ----
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function remToPx(rem) { var r = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16; return rem * r; }

  // ---- sizing policy ----
  function breakpointConfig() {
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (vw >= 1008) {
      return { maxPct: 70, pxCap: Math.round(vh * 0.9), topMarginPct: 6, padMinRem: 0.8, padMaxRem: 1.6, widthVw: 60 };
    }
    if (vw >= 641) {
      return { maxPct: 80, pxCap: Math.round(vh * 0.9), topMarginPct: 6, padMinRem: 0.7, padMaxRem: 1.2, widthVw: 76 };
    }
    return { maxPct: 85, pxCap: Math.round(vh * 0.95), topMarginPct: 6, padMinRem: 0.5, padMaxRem: 1.0, widthVw: 90 };
  }

  function paddingForStep(step) {
    var map = { search:0.6, matches:0.7, notInList:0.6, attendance:1.0, transport:0.8, phone:0.7, notes:0.7, review:0.8, thanks:0.6 };
    return map[step] || 0.8;
  }

  // ---- element refs ----
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

  function createTopClose() {
    if (topCloseBtn) return;
    topCloseBtn = document.createElement('button');
    topCloseBtn.className = 'rsvp-modal-close';
    topCloseBtn.setAttribute('aria-label', 'Close RSVP');
    topCloseBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="18" height="18"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    topCloseBtn.addEventListener('click', closeRSVP);
  }

  // animate entrance
  function animateEntrance() {
    if (!card) return;
    card.classList.add('rsvp-enter');
    requestAnimationFrame(function () { card.classList.add('rsvp-enter-to'); });
    setTimeout(function () { if (card) card.classList.remove('rsvp-enter', 'rsvp-enter-to'); }, 360);
  }

  // Apply padding top/bottom (rem) and horizontal padding smaller
  function applyPadding(stepName) {
    if (!card) return;
    var cfg = breakpointConfig();
    var pref = paddingForStep(stepName || '');
    var pad = clamp(pref, cfg.padMinRem, cfg.padMaxRem);
    var padH = Math.max(0.5, pad * 0.6);
    card.style.paddingTop = pad + 'rem';
    card.style.paddingBottom = pad + 'rem';
    card.style.paddingLeft = padH + 'rem';
    card.style.paddingRight = padH + 'rem';
  }

  // compute recommended max px using dynamic viewport variable if available
  function recommendedMaxPx() {
    var cfg = breakpointConfig();
    // prefer --dvh if available
    var dvh = getComputedStyle(document.documentElement).getPropertyValue('--dvh');
    var fromDvh = 0;
    if (dvh) {
      try {
        fromDvh = parseFloat(dvh) * cfg.maxPct;
      } catch (_) { fromDvh = 0; }
    }
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var fallback = Math.round(vh * (cfg.maxPct / 100));
    var value = Math.min(Math.round(fromDvh || fallback), cfg.pxCap || fallback);
    return value;
  }

  // Small adaptive top margin to guard against address bar reflow:
  // we'll use min(1.5rem, calc(var(--dvh) * X)) where X from cfg.topMarginPct
  function computeAdaptiveTopMargin() {
    var cfg = breakpointConfig();
    return 'min(1.5rem, calc(var(--dvh) * ' + (cfg.topMarginPct || 6) + '))';
  }

  // Set iframe height to child content height (remove internal scrollbar)
  // If content <= recommended max -> center and hide overlay scroll.
  // If content > recommended max -> top-align and let overlay host scroll (overlay scrolls, iframe shows full content, no internal scroll).
  function setIframeToContentHeight(childHeightPx, stepName) {
    if (!iframe || !card || !host) return;
    var reported = parseInt(childHeightPx, 10) || 0;
    if (!reported) return;

    applyPadding(stepName);

    var maxPx = recommendedMaxPx();
    updateDebugOverlay(stepName, reported, maxPx);
    log('setIframeToContentHeight reported', reported, 'maxPx', maxPx, 'step', stepName);

    // Always set the iframe height to the content height to avoid internal scrollbars
    iframe.style.height = reported + 'px';
    iframe.style.overflow = 'hidden';

    if (reported <= maxPx) {
      // fits: center modal
      host.style.alignItems = 'center';
      host.style.overflow = 'hidden';
      card.classList.remove('rsvp-top');
      card.style.marginTop = '';
      card.style.marginBottom = '';
    } else {
      // taller: top align and allow overlay scroll
      host.style.alignItems = 'flex-start';
      host.style.overflow = 'auto';
      card.classList.add('rsvp-top');
      // adaptive margin to compensate for mobile address bar reflows
      var adaptive = computeAdaptiveTopMargin();
      card.style.marginTop = adaptive;
      card.style.marginBottom = adaptive;
      // ensure card remains visible when overlay scrolls
      // no internal scrollbar: iframe height stays reported px
    }
  }

  // Fallback when child doesn't report height: apply padding and let CSS min/max control internal scroll.
  function applyStepWithoutHeight(stepName) {
    if (!iframe || !card || !host) return;
    applyPadding(stepName);
    iframe.style.height = 'auto';
    // allow internal scroll in this fallback mode (we can't size cross-origin reliably)
    iframe.style.overflow = 'auto';
    iframe.style.maxHeight = ''; // media queries control max-height
    host.style.alignItems = 'center';
    host.style.overflow = 'hidden';
    card.classList.remove('rsvp-top');
    card.style.marginTop = '';
    card.style.marginBottom = '';
    updateDebugOverlay(stepName, null, recommendedMaxPx());
    log('applyStepWithoutHeight', stepName);
  }

  // ---- open / close ----
  function openRSVP(e) {
    if (e && typeof e.preventDefault === 'function') { e.preventDefault(); try { e.stopPropagation(); } catch (_) {} }
    lastFocus = document.activeElement;

    // create card + iframe
    host.innerHTML = '';
    host.style.display = 'flex';
    host.style.pointerEvents = 'auto';
    host.style.alignItems = 'center';
    host.style.overflow = 'hidden';

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
    // remove internal scrollbars where possible; parent will size it
    iframe.setAttribute('scrolling', 'no');
    iframe.src = RSVP_URL + (RSVP_URL.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now());

    iframe.style.height = 'auto';
    iframe.style.boxSizing = 'border-box';

    card.appendChild(iframe);
    host.appendChild(card);

    hostClickHandler = function onHostClick(ev) {
      if (ev.target === host) closeRSVP();
    };
    host.addEventListener('click', hostClickHandler);

    // Ask child for step + height after load (and re-request shortly after)
    iframe.addEventListener('load', function () {
      try { iframe.contentWindow.postMessage({ type:'RSVP:REQUEST_STEP' }, '*'); } catch (_) {}
      try { iframe.contentWindow.postMessage({ type:'RSVP:REQUEST_HEIGHT' }, '*'); } catch (_) {}
      setTimeout(function () {
        try { iframe.contentWindow.postMessage({ type:'RSVP:REQUEST_HEIGHT' }, '*'); } catch (_) {}
      }, 180);
      animateEntrance();
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

  // delegated opener (supports <img alt="openRSVP"> and .rsvp-btn)
  document.addEventListener('click', function (e) {
    var t = e.target;
    try {
      var opener = t.closest && (t.closest('img[alt="openRSVP"], img[aria-label="openRSVP"], img[title="openRSVP"], button[aria-label="openRSVP"], [data-rsvp="open"], .rsvp-btn'));
      if (opener) { openRSVP(e); return; }
      var el = t.closest && t.closest("a, button, div, span");
      if (el) {
        var txt = (el.innerText || el.textContent || "").trim().toLowerCase();
        if (txt === "rsvp") { openRSVP(e); return; }
      }
    } catch (_) {}
  }, true);

  // messages from child (expect RSVP:HEIGHT and RSVP:STEP)
  window.addEventListener('message', function (e) {
    if (!e) return;
    try {
      if (typeof e.origin === 'string') {
        var ok = (e.origin === RSVP_ORIGIN) || e.origin.startsWith("https://script.googleusercontent.com") || e.origin.startsWith("https://script.google.com") || e.origin.startsWith(RSVP_URL);
        if (!ok) { log('ignoring message from', e.origin); return; }
      }
    } catch (_) { log('origin check failed'); }

    var data = e.data;
    if (!data) return;
    log('parent received message', data && data.type ? data.type : data);

    if (typeof data === 'object' && data.type) {
      if (data.type === 'RSVP:HEIGHT') {
        if (data.height) setIframeToContentHeight(data.height, data.step || '');
        return;
      }
      if (data.type === 'RSVP:STEP') {
        applyStepWithoutHeight(data.step || '');
        return;
      }
      if (data.type === 'RSVP:HAS_BOTTOM_CLOSE') {
        if (!topCloseBtn) createTopClose();
        topCloseBtn.style.display = data.hasBottomClose ? 'none' : '';
        return;
      }
      if (data.type === 'RSVP:CLOSE') {
        closeRSVP();
        return;
      }
    }

    if (e.data === 'RSVP:CLOSE') { closeRSVP(); return; }
  });

  // ESC to close
  window.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape' && host.style.display === 'flex') closeRSVP();
  });

  // ---- public API ----
  window.__rsvp = {
    open: openRSVP,
    close: closeRSVP,
    setDebug: function (v) { DEBUG = !!v; log('DEBUG ->', DEBUG); },
    showDebugOverlay: function (s) { showDebugOverlay(!!s); },
    info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById('rsvpHostOverlay'), open: host.style.display === 'flex' }; }
  };

  // helper to expose debug UI updates
  function updateDebugOverlay(step, height, max) {
    updateDebugOverlay; // (no-op to avoid lint warnings)
    if (!SHOW_DEBUG_OVERLAY) return;
    try {
      document.getElementById('rsvpDebugStep').textContent = step || '-';
      document.getElementById('rsvpDebugHeight').textContent = height ? (height + 'px') : '-';
      document.getElementById('rsvpDebugMax').textContent = max ? (max + 'px') : '-';
    } catch (_) {}
  }

  // wire debug overlay toggling via the existing function
  function showDebugOverlay(v) {
    SHOW_DEBUG_OVERLAY = !!v;
    debugEl.style.display = SHOW_DEBUG_OVERLAY ? '' : 'none';
  }

  // ensure debug overlay exists in DOM (only if needed)
  var debugEl = document.getElementById('rsvpDebugOverlay');
  if (!debugEl) {
    debugEl = document.createElement('div');
    debugEl.id = 'rsvpDebugOverlay';
    debugEl.innerHTML = '<div><b>step:</b> <span id="rsvpDebugStep">-</span></div>' +
                        '<div><b>height:</b> <span id="rsvpDebugHeight">-</span></div>' +
                        '<div><b>max:</b> <span id="rsvpDebugMax">-</span></div>';
    debugEl.style.display = 'none';
    debugEl.style.position = 'fixed';
    debugEl.style.left = '8px';
    debugEl.style.top = '8px';
    debugEl.style.zIndex = '1000000';
    debugEl.style.background = 'rgba(0,0,0,0.72)';
    debugEl.style.color = '#fff';
    debugEl.style.padding = '.35rem .6rem';
    debugEl.style.borderRadius = '.45rem';
    debugEl.style.fontSize = '12px';
    debugEl.style.fontFamily = 'monospace';
    document.body.appendChild(debugEl);
  }

  // small wrapper to update debug overlay whenever used
  function updateDebugOverlay(step, height, max) {
    if (!debugEl) return;
    if (!SHOW_DEBUG_OVERLAY) return;
    try {
      debugEl.querySelector('#rsvpDebugStep').textContent = step || '-';
      debugEl.querySelector('#rsvpDebugHeight').textContent = height ? (height + 'px') : '-';
      debugEl.querySelector('#rsvpDebugMax').textContent = max ? (max + 'px') : '-';
    } catch (_) {}
  }

  console.log('rsvp-overlay: initialized (animated center<->top, adaptive margin, debug overlay available)');
})();
