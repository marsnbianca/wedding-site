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
      " background: rgba(0,0,0,0.45); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); padding:18px; box-sizing:border-box; }",

      /* Modal sizing per requested breakpoints (relative units) */
      ".rsvp-modal-card{ position:relative; width:100%; max-width:96vw; background:#fff; border-radius:14px; overflow:visible;",
      " box-shadow:0 18px 50px rgba(0,0,0,0.32); transition:transform .18s ease,opacity .12s ease; padding:0; }",

      /* Tablet */
      "@media (min-width:641px) and (max-width:1007px){ .rsvp-modal-card{ max-width:80vw; } }",
      /* Desktop */
      "@media (min-width:1008px){ .rsvp-modal-card{ max-width: min(900px, 70vw); } }",

      ".rsvp-modal-iframe{ width:100%; border:0; display:block; background:transparent; }",

      ".rsvp-modal-close{ position:absolute; right:10px; top:10px; z-index:10; background:rgba(255,255,255,0.95); border:0; width:36px; height:36px;",
      " border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,0.12); }"
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

  // Breakpoint max heights (relative)
  function breakpointMaxHeight() {
    var w = window.innerWidth || document.documentElement.clientWidth;
    if (w >= 1008) return Math.round(Math.min(window.innerHeight * 0.65, 650)); // desktop cap ~65vh or 650px
    if (w >= 641) return Math.round(Math.min(window.innerHeight * 0.9, window.innerHeight)); // tablet up to 90vh
    // mobile
    return Math.floor(window.innerHeight * 1.0); // allow up to full screen height
  }

  // set iframe height based on child reported height, cap by breakpoint
  function setHeights(childHeight) {
    if (!iframe || !card) return;
    var maxH = breakpointMaxHeight();
    var h = parseInt(childHeight, 10) || 0;
    var finalH = Math.min(Math.max(h, 220), maxH); // sensible min 220
    iframe.style.height = finalH + 'px';
    card.style.height = 'auto';
  }

  function createTopClose() {
    if (topCloseBtn) return;
    topCloseBtn = document.createElement('button');
    topCloseBtn.className = 'rsvp-modal-close';
    topCloseBtn.setAttribute('aria-label', 'Close RSVP');
    topCloseBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    topCloseBtn.addEventListener('click', closeRSVP);
  }

  function openRSVP(e) {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      try { e.stopPropagation(); } catch (_) {}
    }

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

    // initial height: small sensible height until child reports actual height
    iframe.style.height = Math.min(breakpointMaxHeight(), 520) + 'px';

    card.appendChild(iframe);
    host.appendChild(card);

    hostClickHandler = function onHostClick(ev) {
      if (ev.target === host) closeRSVP();
    };
    host.addEventListener('click', hostClickHandler);

    iframe.addEventListener('load', function () {
      try {
        var doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc) {
          var h = Math.max(doc.documentElement.scrollHeight || 0, (doc.body && doc.body.scrollHeight) || 0);
          if (h) setHeights(h);
        }
      } catch (err) { /* cross-origin possible */ }
      try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_HEIGHT' }, '*'); } catch (_) {}
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

  // Delegated click open
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

  // Messages from iframe
  window.addEventListener('message', function (e) {
    if (!e) return;
    try {
      if (typeof e.origin === 'string') {
        var ok = (e.origin === RSVP_ORIGIN) || e.origin.startsWith("https://script.googleusercontent.com") || e.origin.startsWith("https://script.google.com") || e.origin.startsWith(RSVP_URL);
        if (!ok) { console.warn('rsvp-overlay: ignoring message from origin', e.origin); return; }
      }
    } catch (_) {}

    var data = e.data;
    if (data && typeof data === 'object' && data.type) {
      if (data.type === 'RSVP:HEIGHT') { if (data.height) setHeights(data.height); return; }
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

  // create top close and show by default
  createTopClose();
  setTopCloseVisible(true);

  window.__rsvp = {
    open: openRSVP,
    close: closeRSVP,
    info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay"), open: host.style.display === 'flex' }; }
  };

  console.log('rsvp-overlay: responsive modal initialized (auto-size + top X)');
})();
