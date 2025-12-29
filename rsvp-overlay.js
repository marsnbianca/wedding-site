// rsvp-overlay.js — responsive modal overlay for wedding-site (parent)
// Path: wedding-site/rsvp-overlay.js
// Include from your wedding-site index.html: <script src="rsvp-overlay.js"></script>

(function () {
  var RSVP_URL = "https://marsnbianca.github.io/rsvp-tool/"; // <-- REPLACE with your frontend Pages URL
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  // Ensure host element exists immediately
  var host = document.getElementById("rsvpHostOverlay");
  if (!host) {
    host = document.createElement("div");
    host.id = "rsvpHostOverlay";
    // hidden by default
    host.style.display = 'none';
    document.body.appendChild(host);

    var style = document.createElement('style');
    style.textContent = [
      "#rsvpHostOverlay{ position:fixed; inset:0; z-index:999999; display:none; align-items:center; justify-content:center;",
      " background: rgba(0,0,0,0.45); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); padding:1rem; box-sizing:border-box; }",

      /* card base: transitions for width/padding/height */
      ".rsvp-modal-card{ position:relative; width:auto; max-width:96vw; box-sizing:border-box; background:#fff; border-radius:0.75rem; overflow:visible;",
      " box-shadow:0 1rem 3rem rgba(0,0,0,0.22); transition:transform .18s ease,opacity .12s ease, width .18s ease, padding .18s ease; padding: clamp(0.5rem, 2vw, 1rem); }",

      /* Mobile */
      "@media (max-width:640px){ .rsvp-modal-card{ max-width: min(94vw, 24rem); } }",
      /* Tablet */
      "@media (min-width:641px) and (max-width:1007px){ .rsvp-modal-card{ max-width:80vw; } }",
      /* Desktop: increased to 60vw cap (user requested larger modal) and cap at 60rem */
      "@media (min-width:1008px){ .rsvp-modal-card{ max-width: min(60vw, 60rem); } }",

      ".rsvp-modal-iframe{ width:100%; border:0; display:block; background:transparent; box-sizing:border-box; }",

      ".rsvp-modal-close{ position:absolute; right:0.6rem; top:0.6rem; z-index:10; background:rgba(255,255,255,0.95); border:0;",
      " width:2.25rem; height:2.25rem; border-radius:0.5rem; cursor:pointer; display:flex; align-items:center; justify-content:center;",
      " box-shadow:0 0.3rem 1rem rgba(0,0,0,0.12); }"
    ].join('');
    document.head.appendChild(style);
  }

  var iframe = null, card = null, lastFocus = null, hostClickHandler = null, topCloseBtn = null;
  var sizeRequestTimer = null;

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

  // Breakpoint-based caps (px)
  function breakpointCaps() {
    var w = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var caps = {};
    if (w >= 1008) {
      caps.maxHeightPx = Math.min(650, Math.round(vh * 0.65)); // keep your recommended desktop cap
      caps.widthCap = Math.min(Math.round(w * 0.6), 60 * parseFloat(getComputedStyle(document.documentElement).fontSize)); // 60vw capped by 60rem
    } else if (w >= 641) {
      caps.maxHeightPx = Math.round(vh * 0.55);
      caps.widthCap = Math.round(w * 0.80);
    } else {
      caps.maxHeightPx = Math.round(vh * 0.75);
      caps.widthCap = Math.round(w * 0.94);
    }
    caps.vh = vh;
    caps.vw = w;
    return caps;
  }

  // Step -> target fraction of viewport height (desktop baseline)
  const desktopStepVH = {
    search: 0.30,
    matches: 0.35,
    attendance_single: 0.30,
    attendance_multi: 0.50,
    transport: 0.30,
    phone: 0.28,
    notes: 0.28,
    review: 0.35,
    thanks: 0.28
  };

  // per-step padding (rem)
  function paddingForStep(stepName) {
    const mapping = {
      search: '0.6rem',
      matches: '0.7rem',
      notInList: '0.6rem',
      attendance: '1rem',
      transport: '0.8rem',
      phone: '0.7rem',
      notes: '0.7rem',
      review: '0.8rem',
      thanks: '0.6rem'
    };
    return mapping[stepName] || '0.8rem';
  }

  function remToPx(remStr) {
    if (!remStr || typeof remStr !== 'string') return 0;
    var m = remStr.match(/^([\d.]+)rem$/);
    if (!m) return 0;
    var rem = parseFloat(m[1]);
    var rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return rem * rootFontSize;
  }

  // Size modal by step only (no child size reading)
  function sizeForStep(stepName, maxSeats) {
    if (!iframe || !card) return;
    var caps = breakpointCaps();
    var vh = caps.vh, vw = caps.vw, maxH = caps.maxHeightPx;

    var fraction;
    if (stepName === 'attendance') {
      fraction = (maxSeats && maxSeats > 1) ? desktopStepVH.attendance_multi : desktopStepVH.attendance_single;
    } else {
      fraction = desktopStepVH[stepName] || desktopStepVH.search;
    }

    // adjust fraction for tablet/mobile
    if (vw >= 1008) {
      // desktop: keep fraction
    } else if (vw >= 641) {
      fraction = Math.min(0.95, fraction * 0.95);
    } else {
      fraction = Math.min(1.0, fraction * 1.0);
    }

    var desiredH = Math.round(vh * fraction);

    // compute a content-based minimum using padding + base content
    var pad = paddingForStep(stepName || '');
    var padPx = remToPx(pad);
    var baseContentRem = 5.5;
    var rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    var baseContentPx = baseContentRem * rootFs;
    var minH = Math.round(baseContentPx + padPx * 2);
    minH = Math.max(minH, Math.round(vh * 0.12), 120);

    // clamp to [minH, maxH]
    var finalH = Math.min(Math.max(desiredH, minH), maxH);
    iframe.style.height = finalH + 'px';
    iframe.style.maxHeight = maxH + 'px';

    // width: use a comfortable vw (increased from 50 to 60 on desktop)
    var finalVw;
    if (vw >= 1008) finalVw = 60;
    else if (vw >= 641) finalVw = 80;
    else finalVw = 94;
    card.style.width = finalVw + 'vw';

    // padding
    card.style.padding = pad;
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
    console.debug('rsvp-overlay: openRSVP called');
    if (e && typeof e.preventDefault === "function") { e.preventDefault(); try { e.stopPropagation(); } catch (_) {} }

    lastFocus = document.activeElement;

    // clear host and show
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

    // initial modest height until child sends step
    iframe.style.height = Math.round(window.innerHeight * 0.36) + 'px';
    iframe.style.maxHeight = Math.round(window.innerHeight * 0.75) + 'px';
    iframe.style.boxSizing = 'border-box';

    card.appendChild(iframe);
    host.appendChild(card);

    hostClickHandler = function onHostClick(ev) {
      if (ev.target === host) closeRSVP();
    };
    host.addEventListener('click', hostClickHandler);

    iframe.addEventListener('load', function () {
      console.debug('rsvp-overlay: iframe load event');
      try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_STEP' }, '*'); } catch (err) { console.debug('rsvp-overlay: REQUEST_STEP post failed', err); }
      setTimeout(function(){ try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_STEP' }, '*'); } catch (err) { console.debug('rsvp-overlay: delayed REQUEST_STEP failed', err); } }, 160);
    });

    lockScroll(true);
    console.info('rsvp-overlay: opened modal ->', iframe.src);
  }

  function closeRSVP() {
    console.debug('rsvp-overlay: closeRSVP called');
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
      // check for any element that should open the RSVP: image/button with alt/title/aria-label "openRSVP", [data-rsvp="open"], or with class "rsvp-btn"
      var opener = t.closest && (t.closest('img[alt="openRSVP"], img[aria-label="openRSVP"], img[title="openRSVP"], button[aria-label="openRSVP"], [data-rsvp="open"], .rsvp-btn') );
      if (opener) { openRSVP(e); return; }
      // also allow clicking text "RSVP"
      var el = t.closest && t.closest("a, button, div, span");
      if (el) {
        var txt = (el.innerText || el.textContent || "").trim().toLowerCase();
        if (txt === "rsvp") { openRSVP(e); return; }
      }
    } catch (_) {}
  }, true);

  // message handler — step-driven sizing
  window.addEventListener('message', function (e) {
    if (!e) return;
    try {
      if (typeof e.origin === 'string') {
        var ok = (e.origin === RSVP_ORIGIN) || e.origin.startsWith("https://script.googleusercontent.com") || e.origin.startsWith("https://script.google.com") || e.origin.startsWith(RSVP_URL);
        if (!ok) { console.warn('rsvp-overlay: ignoring message from origin', e.origin); return; }
      }
    } catch (_) {}

    var data = e.data;
    if (!data) return;

    console.debug('rsvp-overlay: received message', data && data.type ? data.type : data);

    if (typeof data === 'object' && data.type) {
      if (data.type === 'RSVP:STEP') {
        var step = data.step || 'search';
        var maxSeats = parseInt(data.maxSeats || 1, 10) || 1;
        console.debug('rsvp-overlay: sizing for step', step, 'maxSeats', maxSeats);
        sizeForStep(step, maxSeats);
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

  // ESC closes overlay
  window.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape' && host.style.display === 'flex') closeRSVP();
  });

  // expose API for manual testing and control
  window.__rsvp = {
    open: openRSVP,
    close: closeRSVP,
    info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay"), open: host.style.display === 'flex' }; }
  };

  console.log('rsvp-overlay: initialized (step-driven sizing, desktop 60vw cap)');
})();
