// rsvp-overlay.js — responsive modal overlay for wedding-site (parent)
// Path: wedding-site/rsvp-overlay.js
// Include from your wedding-site index.html: <script src="rsvp-overlay.js"></script>

(function () {
  var RSVP_URL = "https://marsnbianca.github.io/rsvp-tool/"; // <-- REPLACE with your frontend Pages URL
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  var host = document.getElementById("rsvpHostOverlay");
  if (!host) {
    host = document.createElement("div");
    host.id = "rsvpHostOverlay";
    document.body.appendChild(host);

    var style = document.createElement('style');
    style.textContent = [
      "#rsvpHostOverlay{ position:fixed; inset:0; z-index:999999; display:none; align-items:center; justify-content:center;",
      " background: rgba(0,0,0,0.45); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); padding:1rem; box-sizing:border-box; }",

      /* card base: transitions for width/padding/height */
      ".rsvp-modal-card{ position:relative; width:auto; max-width:96vw; box-sizing:border-box; background:#fff; border-radius:0.75rem; overflow:visible;",
      " box-shadow:0 1rem 3rem rgba(0,0,0,0.22); transition:transform .18s ease,opacity .12s ease, width .18s ease, padding .18s ease; padding: clamp(0.5rem, 2vw, 1rem); }",

      /* Mobile */
      "@media (max-width:640px){ .rsvp-modal-card{ max-width: min(90vw, 22.5rem); } }",
      /* Tablet */
      "@media (min-width:641px) and (max-width:1007px){ .rsvp-modal-card{ max-width:76vw; } }",
      /* Desktop: explicit 50vw max and cap at 50rem */
      "@media (min-width:1008px){ .rsvp-modal-card{ max-width: min(50vw, 50rem); } }",

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

  // Breakpoint-based caps (px)
  function breakpointCaps() {
    var w = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var caps = {};
    // heights caps: recommended by you
    if (w >= 1008) {
      caps.maxHeightPx = Math.min(650, Math.round(vh * 0.65)); // desktop cap ~650px or 65vh
      caps.widthCap = Math.min(Math.round(w * 0.5), 50 * parseFloat(getComputedStyle(document.documentElement).fontSize)); // 50vw capped by 50rem
    } else if (w >= 641) {
      caps.maxHeightPx = Math.round(vh * 0.55); // tablet ~55vh
      caps.widthCap = Math.round(w * 0.76); // 76vw
    } else {
      caps.maxHeightPx = Math.round(vh * 0.75); // mobile ~75vh
      caps.widthCap = Math.round(w * 0.90); // 90vw
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

  // Padding mapping per step (rem strings)
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

  // Convert rem to px
  function remToPx(remStr) {
    if (!remStr || typeof remStr !== 'string') return 0;
    var m = remStr.match(/^([\d.]+)rem$/);
    if (!m) return 0;
    var rem = parseFloat(m[1]);
    var rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return rem * rootFontSize;
  }

  // Apply sizing using only the step name (and optional maxSeats)
  function sizeForStep(stepName, maxSeats) {
    if (!iframe || !card) return;
    var caps = breakpointCaps();
    var vh = caps.vh, vw = caps.vw, maxH = caps.maxHeightPx;

    // determine desktop baseline fraction
    var fraction;
    if (stepName === 'attendance') {
      fraction = (maxSeats && maxSeats > 1) ? desktopStepVH.attendance_multi : desktopStepVH.attendance_single;
    } else {
      fraction = desktopStepVH[stepName] || desktopStepVH.search;
    }

    // scale by breakpoint
    if (vw >= 1008) {
      // desktop: use fraction as-is
    } else if (vw >= 641) {
      // tablet: slightly smaller fraction (90% of desktop)
      fraction = Math.min(0.9, fraction * 0.9);
    } else {
      // mobile: allow content to be a bit taller but cap by mobile rule below
      fraction = Math.min(0.9, fraction * 1.0);
    }

    // compute desired height in px
    var desiredH = Math.round(vh * fraction);

    // compute min height based on padding and a small base content (rem-based)
    var pad = paddingForStep(stepName || '');
    var padPx = remToPx(pad);
    var baseContentRem = 5.5; // base content area in rem (approx)
    var rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    var baseContentPx = baseContentRem * rootFs;
    var minH = Math.round(baseContentPx + padPx * 2);
    minH = Math.max(minH, Math.round(vh * 0.12), 120);

    // Apply final height = clamp(desiredH, minH, maxH)
    var finalH = Math.min(Math.max(desiredH, minH), maxH);
    iframe.style.height = finalH + 'px';
    iframe.style.maxHeight = maxH + 'px';

    // Width: pick relative vw constrained to CSS max-width
    var finalVw;
    if (vw >= 1008) finalVw = 50;         // desktop target 50vw
    else if (vw >= 641) finalVw = 76;     // tablet
    else finalVw = 90;                    // mobile
    card.style.width = finalVw + 'vw';

    // Padding
    card.style.padding = pad;

    // ensure height/width change applied
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

    // initial modest height until child sends step
    iframe.style.height = Math.round(window.innerHeight * 0.32) + 'px';
    iframe.style.maxHeight = Math.round(window.innerHeight * 0.65) + 'px';
    iframe.style.boxSizing = 'border-box';

    card.appendChild(iframe);
    host.appendChild(card);

    hostClickHandler = function onHostClick(ev) {
      if (ev.target === host) closeRSVP();
    };
    host.addEventListener('click', hostClickHandler);

    // request the child step shortly after load
    iframe.addEventListener('load', function () {
      try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_STEP' }, '*'); } catch (_) {}
      setTimeout(function(){ try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_STEP' }, '*'); } catch (_) {} }, 160);
    });

    lockScroll(true);
    console.log('rsvp-overlay: opened modal ->', iframe.src);
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
    console.log('rsvp-overlay: closed');
  }

  // handle messages from child — only listen for step notifications
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
    if (typeof data === 'object' && data.type) {
      if (data.type === 'RSVP:STEP') {
        // child says which step is active; parent sizes accordingly
        var step = data.step || 'search';
        var maxSeats = parseInt(data.maxSeats || 1, 10) || 1;
        sizeForStep(step, maxSeats);
        // hide top X if child indicates bottom-close (legacy)
        if (typeof data.hasBottomClose !== 'undefined') setTopCloseVisible(!data.hasBottomClose);
        return;
      }
      if (data.type === 'RSVP:HAS_BOTTOM_CLOSE') {
        setTopCloseVisible(!data.hasBottomClose);
        return;
      }
      if (data.type === 'RSVP:CLOSE') {
        closeRSVP();
        return;
      }
    }
    if (e.data === 'RSVP:CLOSE') { closeRSVP(); return; }
  });

  // escape closes
  window.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape' && host.style.display === 'flex') closeRSVP();
  });

  // create top close upfront
  createTopClose();
  setTopCloseVisible(true);

  // expose helper
  window.__rsvp = { open: openRSVP, close: closeRSVP, info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay"), open: host.style.display === 'flex' }; } };

  console.log('rsvp-overlay: initialized (step-driven sizing, desktop 50vw cap)');
})();
