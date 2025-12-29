// rsvp-overlay.js — responsive modal overlay for wedding-site (parent)
// Path: wedding-site/rsvp-overlay.js
// Include from your wedding-site index.html: <script src="rsvp-overlay.js"></script>
//
// Removes internal iframe scrolling by sizing the iframe to the child-reported height (RSVP:HEIGHT).
// When content is taller than recommended max, the overlay host becomes scrollable and top-aligns the modal
// so users can scroll the overlay (not the iframe). Uses dynamic viewport (--dvh) for max-height caps.

(function () {
  var RSVP_URL = "https://marsnbianca.github.io/rsvp-tool/"; // <-- REPLACE with your frontend Pages URL
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  // Create host container if not present
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
  var dvhTimer = null;

  function lockScroll(lock) {
    if (lock) {
      // We will still prevent the document body from scrolling, but allow the host overlay to scroll
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }

  // dynamic viewport variable update (1% dynamic vh)
  function updateDvh() {
    if (dvhTimer) clearTimeout(dvhTimer);
    dvhTimer = setTimeout(function () {
      var dv = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--dvh', dv + 'px');
    }, 80);
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

  // breakpoint-config returning percent (vh) caps and absolute px caps
  function breakpointConfig() {
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (vw >= 1008) {
      return { maxPct: 65, pxCap: 650, padMinRem: 0.8, padMaxRem: 1.6, widthVw: 70 };
    } else if (vw >= 641) {
      return { maxPct: 60, pxCap: Math.round(vh * 0.9), padMinRem: 0.7, padMaxRem: 1.2, widthVw: 82 };
    } else {
      return { maxPct: 95, pxCap: Math.round(vh * 0.95), padMinRem: 0.5, padMaxRem: 1.0, widthVw: 96 };
    }
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function remToPx(rem) { var r = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16; return rem * r; }

  function preferredPaddingRem(stepName) {
    const map = { search:0.6, matches:0.7, notInList:0.6, attendance:1.0, transport:0.8, phone:0.7, notes:0.7, review:0.8, thanks:0.6 };
    return map[stepName] || 0.8;
  }

  // Set iframe height exactly to child content height.
  // If height <= recommendedMax => center the modal and hide overlay scroll.
  // If height > recommendedMax => top-align modal and allow overlay scrolling (host overflow:auto).
  function setIframeHeightFromChild(childHeightPx, stepName) {
    if (!iframe || !card || !host) return;
    var cfg = breakpointConfig();
    var vh = window.innerHeight || document.documentElement.clientHeight;

    var maxFromVhPx = Math.round((cfg.maxPct / 100) * vh);
    var recommendedMax = Math.min(maxFromVhPx, cfg.pxCap);

    var h = parseInt(childHeightPx, 10) || 0;
    if (h <= 0) return;

    // Apply padding according to step (top/bottom effect)
    var pref = preferredPaddingRem(stepName || '');
    var padRem = clamp(pref, cfg.padMinRem, cfg.padMaxRem);
    var padHRem = Math.max(0.6, padRem * 0.6);
    card.style.paddingTop = padRem + 'rem';
    card.style.paddingBottom = padRem + 'rem';
    card.style.paddingLeft = padHRem + 'rem';
    card.style.paddingRight = padHRem + 'rem';

    // Always set iframe height to content height (removes internal scroll)
    iframe.style.height = h + 'px';
    // For safety also set box-sizing
    iframe.style.boxSizing = 'border-box';

    // If content fits within recommended max, center and don't let host scroll
    if (h <= recommendedMax) {
      host.style.alignItems = 'center';
      host.style.overflow = 'hidden';
      // set iframe max-height for dynamic viewport safety too
      iframe.style.maxHeight = 'min(' + cfg.pxCap + 'px, calc(var(--dvh) * ' + cfg.maxPct + '))';
    } else {
      // content is taller than recommended max:
      // make the overlay scrollable and top-align the modal so user scrolls overlay (not iframe)
      host.style.alignItems = 'flex-start';
      host.style.overflow = 'auto';
      // small top/bottom spacing so top alignment looks correct
      card.style.marginTop = 'min(2rem, 6vh)';
      card.style.marginBottom = 'min(2rem, 6vh)';
      // still cap max-height visually for CSS-aware tools (but iframe height remains the full content so internal scroll suppressed)
      iframe.style.maxHeight = 'none';
    }

    // Set card width target (CSS max-width still applies)
    card.style.width = cfg.widthVw + 'vw';
  }

  // Fallback: when we only get a step (no height), we still apply padding & a recommended max (parent won't force exact height)
  function applyPaddingAndRecommendedMax(stepName) {
    if (!iframe || !card || !host) return;
    var cfg = breakpointConfig();
    var pref = preferredPaddingRem(stepName || '');
    var padRem = clamp(pref, cfg.padMinRem, cfg.padMaxRem);
    var padHRem = Math.max(0.6, padRem * 0.6);
    card.style.paddingTop = padRem + 'rem';
    card.style.paddingBottom = padRem + 'rem';
    card.style.paddingLeft = padHRem + 'rem';
    card.style.paddingRight = padHRem + 'rem';
    card.style.width = cfg.widthVw + 'vw';
    // set iframe max-height via dynamic unit & px cap
    iframe.style.maxHeight = 'min(' + cfg.pxCap + 'px, calc(var(--dvh) * ' + cfg.maxPct + '))';
    iframe.style.height = 'auto';
    host.style.alignItems = 'center';
    host.style.overflow = 'hidden';
    card.style.marginTop = '';
    card.style.marginBottom = '';
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

    // clear host and show; default center alignment and hidden overlay scroll
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
    iframe.setAttribute('scrolling', 'no'); // try to avoid internal scrollbars; we will size the iframe
    iframe.src = RSVP_URL + (RSVP_URL.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now());

    iframe.style.height = 'auto';
    iframe.style.boxSizing = 'border-box';
    iframe.style.maxHeight = ''; // will be set upon messages

    card.appendChild(iframe);
    host.appendChild(card);

    hostClickHandler = function onHostClick(ev) {
      if (ev.target === host) closeRSVP();
    };
    host.addEventListener('click', hostClickHandler);

    iframe.addEventListener('load', function () {
      // ask child to send its step and height
      try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_STEP' }, '*'); } catch (err) {}
      try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_HEIGHT' }, '*'); } catch (err) {}
      // re-request shortly after to catch any late layout
      setTimeout(function(){
        try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_STEP' }, '*'); } catch (err) {}
        try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_HEIGHT' }, '*'); } catch (err) {}
      }, 180);
    });

    lockScroll(true); // prevent body scroll; overlay will scroll if needed
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

  // Delegated click to open overlay (also matches your <img ... alt="openRSVP" class="rsvp-btn">)
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

  // Messages from child: expect RSVP:HEIGHT, RSVP:STEP (and the legacy messages)
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
      if (data.type === 'RSVP:HEIGHT') {
        // child measured height in px
        if (data.height) setIframeHeightFromChild(data.height, data.step || '');
        return;
      }
      if (data.type === 'RSVP:STEP') {
        // fallback: child sent step only — apply padding & recommended max until height arrives
        applyPaddingAndRecommendedMax(data.step || '');
        return;
      }
      if (data.type === 'RSVP:CLOSE') { closeRSVP(); return; }
      if (data.type === 'RSVP:HAS_BOTTOM_CLOSE') {
        setTopCloseVisible(!data.hasBottomClose);
        return;
      }
    }

    if (e.data === 'RSVP:CLOSE') { closeRSVP(); return; }
  });

  // ESC closes overlay
  window.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape' && host.style.display === 'flex') closeRSVP();
  });

  // Expose for manual testing
  window.__rsvp = { open: openRSVP, close: closeRSVP, info: function(){ return { hostVisible: host.style.display === 'flex' }; } };

  console.log('rsvp-overlay: initialized (iframe sized to child height; overlay scrolls when content > recommended max)');
})();
