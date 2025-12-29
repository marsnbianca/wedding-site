// rsvp-overlay.js — responsive modal overlay for wedding-site (parent)
// Path: wedding-site/rsvp-overlay.js
// Include from your wedding-site index.html: <script src="rsvp-overlay.js"></script>
//
// Parent no longer forces inline pixel heights from the child.
// Instead: iframe uses height:auto and parent sets a relative max-height using dynamic viewport (--dvh)
// with a px cap fallback: iframe.style.maxHeight = 'min(pxCap, calc(var(--dvh) * N))'.
// This removes inline px height values. The child still posts RSVP:HEIGHT (used only for debugging / analytics here).

(function () {
  var DEBUG = false;
  function log() { if (DEBUG) console.log.apply(console, arguments); }

  var RSVP_URL = "https://marsnbianca.github.io/rsvp-tool/"; // <-- replace if needed
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  // Ensure host element exists
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
      " box-shadow:0 1rem 3rem rgba(0,0,0,0.22); transition: transform .22s ease, padding .18s ease, width .18s ease, opacity .12s ease; padding: clamp(0.5rem, 2vw, 1rem); }",

      /* Iframe uses height:auto and a relative max-height (set by JS below) */
      ".rsvp-modal-iframe{ width:100%; border:0; display:block; background:transparent; box-sizing:border-box;",
      " height:auto; transition: max-height .18s ease, height .18s ease; }",

      /* Height recommendations (mobile-first) */
      ".rsvp-modal-card .rsvp-modal-iframe{ min-height:20svh; max-height:85svh; }",
      "@media (min-width:641px) and (max-width:1007px){ .rsvp-modal-card .rsvp-modal-iframe{ min-height:300px; max-height:80svh; } }",
      "@media (min-width:1008px){ .rsvp-modal-card .rsvp-modal-iframe{ min-height:400px; max-height:70vh; } }",

      /* Width caps preserved */
      "@media (max-width:640px){ .rsvp-modal-card{ max-width: min(90vw, 26rem); } }",
      "@media (min-width:641px) and (max-width:1007px){ .rsvp-modal-card{ max-width:76vw; } }",
      "@media (min-width:1008px){ .rsvp-modal-card{ max-width: min(60vw, 50rem); min-width:36rem; } }",

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

  // dynamic viewport support: set --dvh
  var dvhTimer = null;
  function updateDvh() {
    if (dvhTimer) clearTimeout(dvhTimer);
    dvhTimer = setTimeout(function () {
      var dv = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--dvh', dv + 'px');
    }, 60);
  }
  updateDvh();
  window.addEventListener('resize', updateDvh);
  window.addEventListener('orientationchange', updateDvh);
  if (window.visualViewport) {
    try {
      window.visualViewport.addEventListener('resize', updateDvh);
      window.visualViewport.addEventListener('scroll', updateDvh);
    } catch (_) {}
  }

  // breakpoint-based recommended percent and px cap
  function breakpointConfig() {
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (vw >= 1008) {
      return { pct: 70, pxCap: Math.round(vh * 0.9) }; // desktop: 70vh recommended, px cap fallback
    }
    if (vw >= 641) {
      return { pct: 80, pxCap: Math.round(vh * 0.9) }; // tablet
    }
    return { pct: 85, pxCap: Math.round(vh * 0.95) }; // mobile
  }

  // Apply relative max-height to iframe: min(pxCap, calc(var(--dvh) * pct))
  function applyRelativeMaxHeight() {
    if (!iframe) return;
    var cfg = breakpointConfig();
    var pct = cfg.pct || 70;
    var pxCap = cfg.pxCap || Math.round(window.innerHeight * (pct / 100));
    // Use CSS min() expression — browsers that support calc/var will use the dynamic unit
    iframe.style.maxHeight = 'min(' + pxCap + 'px, calc(var(--dvh) * ' + pct + '))';
    // Ensure iframe can show its internal scroll if needed (we're using relative sizing now)
    iframe.style.overflowY = 'auto';
    iframe.style.height = 'auto'; // don't set inline px height
  }

  function createTopClose() {
    if (topCloseBtn) return;
    topCloseBtn = document.createElement('button');
    topCloseBtn.className = 'rsvp-modal-close';
    topCloseBtn.setAttribute('aria-label', 'Close RSVP');
    topCloseBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="18" height="18"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    topCloseBtn.addEventListener('click', closeRSVP);
  }

  function openRSVP(e) {
    if (e && typeof e.preventDefault === "function") { e.preventDefault(); try { e.stopPropagation(); } catch (_) {} }
    lastFocus = document.activeElement;

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
    iframe.setAttribute('scrolling', 'auto');
    iframe.src = RSVP_URL + (RSVP_URL.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now());

    // use relative sizing by default
    iframe.style.height = 'auto';
    iframe.style.boxSizing = 'border-box';
    applyRelativeMaxHeight();

    card.appendChild(iframe);
    host.appendChild(card);

    hostClickHandler = function onHostClick(ev) {
      if (ev.target === host) closeRSVP();
    };
    host.addEventListener('click', hostClickHandler);

    // Request step & height from child — we accept height for debugging but we DO NOT set inline px height anymore
    iframe.addEventListener('load', function () {
      try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_STEP' }, '*'); } catch (_) {}
      try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_HEIGHT' }, '*'); } catch (_) {}
      setTimeout(function () {
        try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_HEIGHT' }, '*'); } catch (_) {}
        // Reapply relative max-height after a small delay (visualViewport may have changed)
        applyRelativeMaxHeight();
      }, 160);
  });
    lockScroll(true);
    animateEntrance();
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

  // Child posted height — we keep it for debug/logging but do NOT set inline px height
  function onChildHeightReported(h, stepName) {
    var reported = parseInt(h, 10) || 0;
    if (!reported) return;
    log('Child reported height (kept for info):', reported, 'step:', stepName);
    // we still ensure the relative max-height is applied (so no px height remains)
    applyRelativeMaxHeight();
  }

  // Fallback: step-only (no height) — apply relative max and padding if needed
  function applyCssHeightRecommendations(stepName) {
    log('applyCssHeightRecommendations for step', stepName);
    applyRelativeMaxHeight();
    // padding per-step could be applied here if you want; currently CSS + child layout center screens
  }

  // delegated opener (image/button with openRSVP)
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

  // listen for child messages
  window.addEventListener('message', function (e) {
    if (!e) return;
    try {
      if (typeof e.origin === 'string') {
        var ok = (e.origin === RSVP_ORIGIN) || e.origin.startsWith("https://script.googleusercontent.com") || e.origin.startsWith("https://script.google.com") || e.origin.startsWith(RSVP_URL);
        if (!ok) { log('ignoring message from', e.origin); return; }
      }
    } catch (_) { log('message origin check failed'); }

    var data = e.data;
    if (!data) return;
    log('parent received message', data && data.type ? data.type : data);

    if (typeof data === 'object' && data.type) {
      if (data.type === 'RSVP:HEIGHT') {
        if (data.height) { onChildHeightReported(data.height, data.step || ''); return; }
      }
      if (data.type === 'RSVP:STEP') { applyCssHeightRecommendations(data.step || ''); return; }
      if (data.type === 'RSVP:CLOSE') { closeRSVP(); return; }
      if (data.type === 'RSVP:HAS_BOTTOM_CLOSE') {
        if (!topCloseBtn) createTopClose();
        topCloseBtn.style.display = data.hasBottomClose ? 'none' : '';
        return;
      }
    }

    if (e.data === 'RSVP:CLOSE') { closeRSVP(); return; }
  });

  // ESC closes
  window.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape' && host.style.display === 'flex') closeRSVP();
  });

  // API for debug
  window.__rsvp = {
    open: openRSVP,
    close: closeRSVP,
    setDebug: function (v) { DEBUG = !!v; log('DEBUG ->', DEBUG); },
    info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay"), open: host.style.display === 'flex' }; }
  };

  console.log('rsvp-overlay: initialized (relative max-height, no inline px height; child can still report height for info)');
})();
