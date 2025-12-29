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

      /* card base: padding responsive via JS, transitions for width/padding */
      ".rsvp-modal-card{ position:relative; width:auto; max-width:96vw; box-sizing:border-box; background:#fff; border-radius:0.75rem; overflow:visible;",
      " box-shadow:0 1rem 3rem rgba(0,0,0,0.22); transition:transform .18s ease,opacity .12s ease, width .18s ease, padding .18s ease; padding: clamp(0.5rem, 2vw, 1rem); }",

      /* Mobile */
      "@media (max-width:640px){ .rsvp-modal-card{ max-width: min(90vw, 22.5rem); } }",
      /* Tablet */
      "@media (min-width:641px) and (max-width:1007px){ .rsvp-modal-card{ max-width:76vw; } }",
      /* Desktop: explicit 50vw max as requested (but also cap at a rem-based maximum) */
      "@media (min-width:1008px){ .rsvp-modal-card{ max-width: min(50vw, 50rem); } }",

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

  // Breakpoint-based max heights (relative units)
  function breakpointMaxHeight() {
    var w = window.innerWidth || document.documentElement.clientWidth;
    if (w >= 1008) return Math.round(window.innerHeight * 0.60); // desktop: 60vh
    if (w >= 641) return Math.round(window.innerHeight * 0.55);  // tablet: 55vh
    return Math.round(window.innerHeight * 0.75);                // mobile: 75vh
  }

  // Padding mapping by step (rem)
  function paddingForStep(stepName) {
    var mapping = {
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

  // Apply sizes from child-sent data object {width, height, step}
  function applySizeFromChild(data) {
    if (!iframe || !card) return;
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var maxH = breakpointMaxHeight();
    var minH = Math.max(120, Math.round(vh * 0.12)); // min 12vh or 120px

    // HEIGHT
    var childH = parseInt(data.height, 10) || 0;
    var finalH = Math.min(Math.max(childH, minH), maxH);
    iframe.style.height = finalH + 'px';
    iframe.style.maxHeight = maxH + 'px';

    // WIDTH: use child's width to compute a vw percentage, but clamp by breakpoint ranges
    var childW = parseInt(data.width, 10) || 0;
    var contentVw = childW && vw ? (childW / vw) * 100 : null;
    var finalVw;
    if (contentVw === null) {
      // fallback: use CSS max-width; set width:auto so CSS controls it
      card.style.width = 'auto';
    } else {
      if (vw >= 1008) {
        finalVw = Math.min(Math.max(contentVw, 30), 50); // desktop: 30-50vw
      } else if (vw >= 641) {
        finalVw = Math.min(Math.max(contentVw, 50), 76); // tablet: 50-76vw
      } else {
        finalVw = Math.min(Math.max(contentVw, 75), 90); // mobile: 75-90vw
      }
      card.style.width = finalVw + 'vw';
    }

    // Padding based on step
    var pad = paddingForStep(data.step || '');
    card.style.padding = pad;

    // Keep card height auto
    card.style.height = 'auto';
  }

  function setHeightsFromReported(childHeight) {
    if (!iframe || !card) return;
    var maxH = breakpointMaxHeight();
    var minH = Math.max(120, Math.round(window.innerHeight * 0.12));
    var h = parseInt(childHeight, 10) || 0;
    var finalH = Math.min(Math.max(h, minH), maxH);
    iframe.style.height = finalH + 'px';
    iframe.style.maxHeight = maxH + 'px';
    card.style.height = 'auto';
  }

  function requestChildSize() {
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_SIZE' }, '*');
    } catch (_) {}
  }

  // debounce size requests to child on resize
  function onResize() {
    if (sizeRequestTimer) clearTimeout(sizeRequestTimer);
    sizeRequestTimer = setTimeout(function() { requestChildSize(); }, 120);
  }
  window.addEventListener('resize', onResize);

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

    // modest initial height
    iframe.style.height = Math.round(window.innerHeight * 0.32) + 'px';
    iframe.style.maxHeight = Math.round(window.innerHeight * 0.60) + 'px';
    iframe.style.boxSizing = 'border-box';

    card.appendChild(iframe);
    host.appendChild(card);

    hostClickHandler = function onHostClick(ev) {
      if (ev.target === host) closeRSVP();
    };
    host.addEventListener('click', hostClickHandler);

    // On iframe load, request size and also attempt same-origin measure
    iframe.addEventListener('load', function () {
      try {
        var doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc) {
          var h = Math.max(doc.documentElement.scrollHeight || 0, (doc.body && doc.body.scrollHeight) || 0);
          var w = Math.max(doc.documentElement.scrollWidth || 0, (doc.body && doc.body.scrollWidth) || 0);
          if (h || w) applySizeFromChild({ width: w, height: h, step: '' });
        }
      } catch (err) { /* cross-origin possible */ }
      // ask child for its measured size (child will respond with RSVP:SIZE)
      requestChildSize();
      // also request again shortly to handle transitions
      setTimeout(requestChildSize, 160);
      setTimeout(requestChildSize, 400);
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

  function setTopCloseVisible(visible) {
    if (!topCloseBtn) return;
    topCloseBtn.style.display = visible ? '' : 'none';
  }

  // Delegated open
  document.addEventListener('click', function (e) {
    var t = e.target;
    try {
      var img = t.closest && t.closest('img[alt="openRSVP"], img[aria-label="openRSVP"], img[title="openRSVP"], button[aria-label="openRSVP"], [data-rsvp="open"]');
      if (img) { openRSVP(e); return; }
    } catch (_) {}
    try {
      var el = t.closest && t.closest("a, button, div, span");
      if (el) {
        var txt = (el.innerText || el.textContent || "").trim().toLowerCase();
        if (txt === "rsvp") { openRSVP(e); return; }
      }
    } catch (_) {}
  }, true);

  // Messages from iframe (child)
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
      if (data.type === 'RSVP:SIZE') {
        // { type:'RSVP:SIZE', width, height, step }
        applySizeFromChild({ width: data.width || 0, height: data.height || 0, step: data.step || '' });
        return;
      }
      if (data.type === 'RSVP:HEIGHT') {
        if (data.height) setHeightsFromReported(data.height);
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

  // respond to Escape
  window.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape' && host.style.display === 'flex') closeRSVP();
  });

  createTopClose();
  setTopCloseVisible(true);

  window.__rsvp = { open: openRSVP, close: closeRSVP, info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay"), open: host.style.display === 'flex' }; } };

  console.log('rsvp-overlay: responsive modal initialized (content-dependent width/height)');
})();
