// rsvp-overlay.js — responsive modal overlay for wedding-site (parent)
// Path: wedding-site/rsvp-overlay.js
// Include from your wedding-site index.html: <script src="rsvp-overlay.js"></script>
//
// Parent sizing is step-driven (padding + min-height + max-height caps).
// This build DOES NOT depend on child HEIGHT messages. It includes smooth transitions
// and a DEBUG flag you can toggle with window.__rsvp.setDebug(true).
// Width restored to the previous approved settings: desktop 60vw cap.

(function () {
  // CONFIG
  var DEBUG = false; // toggle with window.__rsvp.setDebug(true)
  var RSVP_URL = "https://marsnbianca.github.io/rsvp-tool/"; // <-- update if needed
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  function log() { if (DEBUG) console.log.apply(console, arguments); }

  // Create host if not present
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

      /* card base: animated padding + entrance */
      ".rsvp-modal-card{ position:relative; width:auto; max-width:96vw; box-sizing:border-box; background:#fff; border-radius:0.75rem; overflow:visible;",
      " box-shadow:0 1rem 3rem rgba(0,0,0,0.22); transition: transform .28s cubic-bezier(.2,.9,.2,1), padding .22s ease, width .18s ease, opacity .18s ease; padding: clamp(0.5rem, 2vw, 1rem); }",

      /* Restore width caps requested earlier: desktop 60vw capped to 50rem */
      "@media (max-width:640px){ .rsvp-modal-card{ max-width: min(90vw, 26rem); } }",
      "@media (min-width:641px) and (max-width:1007px){ .rsvp-modal-card{ max-width:76vw; } }",
      "@media (min-width:1008px){ .rsvp-modal-card{ max-width: min(60vw, 50rem); min-width: 36rem; } }",

      ".rsvp-modal-iframe{ width:100%; border:0; display:block; background:transparent; box-sizing:border-box; transition: max-height .22s ease, height .18s ease; }",

      ".rsvp-modal-close{ position:absolute; right:0.6rem; top:0.6rem; z-index:10; background:rgba(255,255,255,0.95); border:0;",
      " width:2.25rem; height:2.25rem; border-radius:0.5rem; cursor:pointer; display:flex; align-items:center; justify-content:center;",
      " box-shadow:0 0.3rem 1rem rgba(0,0,0,0.12); }",

      /* entrance helper classes */
      ".rsvp-modal-card.rsvp-enter{ transform: translateY(-6px); opacity: 0; }",
      ".rsvp-modal-card.rsvp-enter.rsvp-enter-to{ transform: translateY(0); opacity: 1; }"
    ].join('');
    document.head.appendChild(style);
  }

  var iframe = null, card = null, lastFocus = null, hostClickHandler = null, topCloseBtn = null;
  var dvhTimer = null;

  function lockScroll(lock) {
    if (lock) {
      // keep document from scrolling; overlay may scroll if needed (we keep overlay centered)
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }

  // dynamic viewport variable (--dvh)
  function updateDvh() {
    if (dvhTimer) clearTimeout(dvhTimer);
    dvhTimer = setTimeout(function () {
      var dv = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--dvh', dv + 'px');
      log('updateDvh ->', dv + 'px');
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

  // breakpoint config: restore earlier approved maxs
  function breakpointConfig() {
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (vw >= 1008) {
      return { maxPct: 65, pxCap: 650, padMinRem: 0.8, padMaxRem: 1.6, widthVw: 60, minHeightRem: 10 };
    } else if (vw >= 641) {
      return { maxPct: 55, pxCap: Math.round(vh * 0.9), padMinRem: 0.7, padMaxRem: 1.2, widthVw: 76, minHeightRem: 9 };
    } else {
      return { maxPct: 95, pxCap: Math.round(vh * 0.95), padMinRem: 0.5, padMaxRem: 1.0, widthVw: 90, minHeightRem: 6 };
    }
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function remToPx(rem) { var r = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16; return rem * r; }
  function preferredPaddingRem(stepName) {
    const map = { search:0.6, matches:0.7, notInList:0.6, attendance:1.0, transport:0.8, phone:0.7, notes:0.7, review:0.8, thanks:0.6 };
    return map[stepName] || 0.8;
  }

  // Apply sizing based on step only (no child height)
  function applySizingFromStep(stepName, maxSeats) {
    if (!iframe || !card || !host) return;
    var cfg = breakpointConfig();
    log('applySizingFromStep', stepName, maxSeats, cfg);

    // padding
    var pref = preferredPaddingRem(stepName || '');
    var padRem = clamp(pref, cfg.padMinRem, cfg.padMaxRem);
    var padHRem = Math.max(0.6, padRem * 0.6);

    card.style.paddingTop = padRem + 'rem';
    card.style.paddingBottom = padRem + 'rem';
    card.style.paddingLeft = padHRem + 'rem';
    card.style.paddingRight = padHRem + 'rem';

    // min-height based on base content rem + padding (converted to px)
    var baseContentRem = cfg.minHeightRem || 9;
    var minHpx = Math.round(remToPx(baseContentRem) + remToPx(padRem) * 2);
    iframe.style.minHeight = minHpx + 'px';

    // max-height using dynamic viewport (--dvh) and px cap
    var pct = cfg.maxPct || 65;
    var pxCap = cfg.pxCap || 650;
    iframe.style.maxHeight = 'min(' + pxCap + 'px, calc(var(--dvh) * ' + pct + '))';
    // allow internal scroll if content exceeds max
    iframe.style.overflowY = 'auto';

    // width target restored to earlier approved values
    card.style.width = cfg.widthVw + 'vw';

    // subtle entrance animation
    if (!card.classList.contains('rsvp-enter')) {
      card.classList.add('rsvp-enter');
      requestAnimationFrame(function () { card.classList.add('rsvp-enter-to'); });
      setTimeout(function () { card.classList.remove('rsvp-enter', 'rsvp-enter-to'); }, 350);
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

  function setTopCloseVisible(visible) {
    if (!topCloseBtn) return;
    topCloseBtn.style.display = visible ? '' : 'none';
  }

  function openRSVP(e) {
    log('openRSVP called');
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

    iframe.style.height = 'auto';
    iframe.style.boxSizing = 'border-box';

    card.appendChild(iframe);
    host.appendChild(card);

    hostClickHandler = function onHostClick(ev) {
      if (ev.target === host) closeRSVP();
    };
    host.addEventListener('click', hostClickHandler);

    iframe.addEventListener('load', function () {
      try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_STEP' }, '*'); } catch (err) { log('REQUEST_STEP failed', err); }
      setTimeout(function(){
        try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_STEP' }, '*'); } catch (err) { log('REQUEST_STEP failed', err); }
      }, 160);
    });

    lockScroll(true);
    console.info('rsvp-overlay: opened modal ->', iframe.src);
  }

  function closeRSVP() {
    log('closeRSVP');
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

  // Delegated click to open
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

  // Listen for child RSVP:STEP (no dependence on height)
  window.addEventListener('message', function (e) {
    if (!e) return;
    try {
      if (typeof e.origin === 'string') {
        var ok = (e.origin === RSVP_ORIGIN) || e.origin.startsWith(RSVP_URL) || e.origin.startsWith("https://script.googleusercontent.com") || e.origin.startsWith("https://script.google.com");
        if (!ok) { log('ignoring message from', e.origin); return; }
      }
    } catch (_) { log('message origin check failed'); }

    var data = e.data;
    if (!data) return;
    log('parent received message', data && data.type ? data.type : data);

    if (typeof data === 'object' && data.type) {
      if (data.type === 'RSVP:STEP') {
        applySizingFromStep(data.step || 'search', parseInt(data.maxSeats || 1, 10) || 1);
        if (typeof data.hasBottomClose !== 'undefined') setTopCloseVisible(!data.hasBottomClose);
        return;
      }
      if (data.type === 'RSVP:CLOSE') { closeRSVP(); return; }
      if (data.type === 'RSVP:HAS_BOTTOM_CLOSE') { setTopCloseVisible(!data.hasBottomClose); return; }
    }

    if (e.data === 'RSVP:CLOSE') { closeRSVP(); return; }
  });

  // ESC closes overlay
  window.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape' && host.style.display === 'flex') closeRSVP();
  });

  // Expose API and debug toggle
  window.__rsvp = {
    open: openRSVP,
    close: closeRSVP,
    setDebug: function (v) { DEBUG = !!v; log('DEBUG set to', DEBUG); },
    info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay"), open: host.style.display === 'flex' }; }
  };

  console.log('rsvp-overlay: initialized (step-driven padding/min/max; width restored to 60vw desktop)');
})();
