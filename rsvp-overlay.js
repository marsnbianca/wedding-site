// rsvp-overlay.js — responsive modal overlay for wedding-site (parent)
// Path: wedding-site/rsvp-overlay.js
// Include from your wedding-site index.html: <script src="rsvp-overlay.js"></script>
//
// Behavior implemented here (per your request):
// - Apply ONLY height recommendations (min/max) per device breakpoint.
// - Modal/iframe will grow/shrink with content when possible; if the child reports its content height (RSVP:HEIGHT)
//   the parent will use that but clamp it to the device max. If the child doesn't report height the iframe is left
//   'auto' and CSS min/max take effect (internal iframe scroll will occur if content exceeds max).
// - Uses svh / vh units for mobile/desktop caps as in your guide.
// - Adds a small smooth transition and a DEBUG flag you can toggle: window.__rsvp.setDebug(true).

(function () {
  var DEBUG = false;
  function log() { if (DEBUG) console.log.apply(console, arguments); }

  var RSVP_URL = "https://marsnbianca.github.io/rsvp-tool/"; // <-- replace if needed
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  // ensure host exists
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

      /* Card and iframe base styles */
      ".rsvp-modal-card{ position:relative; width:auto; max-width:96vw; box-sizing:border-box; background:#fff; border-radius:0.75rem; overflow:visible;",
      " box-shadow:0 1rem 3rem rgba(0,0,0,0.22); transition: transform .22s ease, padding .18s ease, width .18s ease, opacity .12s ease; padding: clamp(0.5rem, 2vw, 1rem); }",

      /* Iframe: allow it to size with content; enforce min/max heights per breakpoints (your guide rules) */
      ".rsvp-modal-iframe{ width:100%; border:0; display:block; background:transparent; box-sizing:border-box;",
      " height:auto; transition: max-height .18s ease, height .18s ease; }",

      /* MOBILE (default) — small devices */
      ".rsvp-modal-card .rsvp-modal-iframe{ min-height:20svh; max-height:85svh; }",

      /* Tablet */
      "@media (min-width:641px) and (max-width:1007px){ .rsvp-modal-card .rsvp-modal-iframe{ min-height:300px; max-height:80svh; } }",

      /* Desktop */
      "@media (min-width:1008px){ .rsvp-modal-card .rsvp-modal-iframe{ min-height:400px; max-height:70vh; } }",

      /* Card size caps (keeping width as you asked earlier) */
      "@media (max-width:640px){ .rsvp-modal-card{ max-width: min(90vw, 26rem); } }",
      "@media (min-width:641px) and (max-width:1007px){ .rsvp-modal-card{ max-width:76vw; } }",
      "@media (min-width:1008px){ .rsvp-modal-card{ max-width: min(60vw, 50rem); min-width:36rem; } }",

      /* Close button */
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

  // breakpoint caps used when we clamp a child-reported height (in px)
  function getRecommendedMaxPx() {
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (vw >= 1008) {
      // desktop uses vh static
      return Math.min(Math.round(vh * 0.70), 9999); // max 70vh (no lower px cap here; keep large)
    }
    if (vw >= 641) {
      // tablet: 80svh — interpret using vh as fallback
      return Math.round(vh * 0.80);
    }
    // mobile: 85svh (use vh fallback)
    return Math.round(vh * 0.85);
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

    // clear host
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
    // keep iframe scrolling allowed — internal scrolling will happen only if content > max-height
    iframe.setAttribute('scrolling', 'auto');
    iframe.src = RSVP_URL + (RSVP_URL.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now());

    // leave height:auto so iframe grows with content where possible (cross-origin limit)
    iframe.style.height = 'auto';
    iframe.style.boxSizing = 'border-box';

    card.appendChild(iframe);
    host.appendChild(card);

    hostClickHandler = function onHostClick(ev) {
      if (ev.target === host) closeRSVP();
    };
    host.addEventListener('click', hostClickHandler);

    // On load, request the active step (so parent can apply any step-driven padding if you still need it)
    iframe.addEventListener('load', function () {
      try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_STEP' }, '*'); } catch (_) {}
      // request child height if it can provide it
      try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_HEIGHT' }, '*'); } catch (_) {}
      setTimeout(function () {
        try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_HEIGHT' }, '*'); } catch (_) {}
      }, 160);
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

  // If child posts height we will use it, but clamp to recommended max.
  function onChildHeightReported(h, stepName) {
    if (!iframe || !card || !host) return;
    var reported = parseInt(h, 10) || 0;
    if (!reported) return;
    var recommendedMax = getRecommendedMaxPx();

    // clamp reported height
    var finalH = Math.min(reported, recommendedMax);

    // Apply to iframe: set explicit height so internal scroll is removed when possible
    iframe.style.height = finalH + 'px';
    iframe.style.maxHeight = Math.max(finalH, recommendedMax) + 'px'; // keep max-height sensible

    // center if it fits, otherwise allow overlay scroll (top-align)
    if (reported <= recommendedMax) {
      host.style.alignItems = 'center';
      host.style.overflow = 'hidden';
      card.style.marginTop = '';
      card.style.marginBottom = '';
    } else {
      host.style.alignItems = 'flex-start';
      host.style.overflow = 'auto';
      card.style.marginTop = '1.5rem';
      card.style.marginBottom = '1.5rem';
    }
    log('onChildHeightReported', reported, 'clamped->', finalH, 'recommendedMax', recommendedMax, 'step', stepName);
  }

  // fallback: apply only height recommendations via CSS (no child height)
  function applyCssHeightRecommendations(stepName) {
    if (!iframe || !card) return;
    // CSS already defines min/max via media queries. We can optionally nudge padding per step here.
    log('applyCssHeightRecommendations for step', stepName);
    // keep iframe height auto and CSS min/max will apply
    iframe.style.height = 'auto';
    iframe.style.overflowY = 'auto';
    host.style.alignItems = 'center';
    host.style.overflow = 'hidden';
    card.style.marginTop = '';
    card.style.marginBottom = '';
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

  // Message listener: handle child messages (RSVP:HEIGHT and RSVP:STEP)
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
        // child reports content height in px
        if (data.height) {
          onChildHeightReported(data.height, data.step || '');
          return;
        }
      }
      if (data.type === 'RSVP:STEP') {
        // only step name -> apply CSS height recommendations (no height)
        applyCssHeightRecommendations(data.step || '');
        return;
      }
      if (data.type === 'RSVP:CLOSE') { closeRSVP(); return; }
      if (data.type === 'RSVP:HAS_BOTTOM_CLOSE') {
        // show/hide top close depending on child
        if (!topCloseBtn) createTopClose();
        topCloseBtn.style.display = data.hasBottomClose ? 'none' : '';
        return;
      }
    }

    if (e.data === 'RSVP:CLOSE') { closeRSVP(); return; }
  });

  // Escape closes
  window.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape' && host.style.display === 'flex') closeRSVP();
  });

  // expose debug toggle and API
  window.__rsvp = {
    open: openRSVP,
    close: closeRSVP,
    setDebug: function (v) { DEBUG = !!v; log('DEBUG ->', DEBUG); },
    info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay"), open: host.style.display === 'flex' }; }
  };

  console.log('rsvp-overlay: initialized (height recommendations applied: min/max per device; responsive to child height when provided)');
})();
