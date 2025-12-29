// rsvp-overlay.js — responsive modal overlay for wedding-site (parent)
// Place this file in the wedding-site repo root and include it from your wedding-site index.html:
// <script src="rsvp-overlay.js"></script>

(function () {
  // Configure: set to your GitHub Pages front-end URL (the RSVP page you published)
  var RSVP_URL = "https://marsnbianca.github.io/rsvp-tool/"; // <-- REPLACE with your frontend Pages URL
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  // Host/backdrop element (created once)
  var host = document.getElementById("rsvpHostOverlay");
  if (!host) {
    host = document.createElement("div");
    host.id = "rsvpHostOverlay";
    document.body.appendChild(host);

    // Inject CSS for overlay and modal card (responsive, auto-height)
    var s = document.createElement('style');
    s.textContent = [
      "#rsvpHostOverlay{ position:fixed; inset:0; z-index:999999; display:none; align-items:center; justify-content:center;",
      " background: rgba(0,0,0,0.45); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); padding:18px; box-sizing:border-box; }",
      ".rsvp-modal-card{ position:relative; width:100%; max-width:min(920px,96%); background:#fff; border-radius:14px; overflow:auto;",
      " box-shadow:0 18px 50px rgba(0,0,0,0.32); max-height:90vh; transition:transform .18s ease,opacity .12s ease; padding:0; }",
      ".rsvp-modal-iframe{ width:100%; border:0; display:block; background:transparent; }",
      ".rsvp-modal-close{ position:absolute; right:10px; top:10px; z-index:10; background:rgba(255,255,255,0.95); border:0; width:36px; height:36px;",
      " border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,0.12); }",
      "@media (max-width:640px){ #rsvpHostOverlay{ padding:12px; } .rsvp-modal-card{ max-width:100%; border-radius:10px; } }"
    ].join('');
    document.head.appendChild(s);
  }

  var iframe = null, card = null, lastFocus = null;
  var hostClickHandler = null;

  function lockScroll(lock){
    if(lock){
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }

  // Resize helper: set iframe height to reported child content height
  function setHeights(h) {
    try {
      if (!iframe || !card) return;
      iframe.style.height = (h ? (parseInt(h,10) + 2) + 'px' : 'auto');
      card.style.height = 'auto';
    } catch (e) { console.warn('rsvp-overlay: setHeights error', e); }
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

    // close (X) button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'rsvp-modal-close';
    closeBtn.setAttribute('aria-label', 'Close RSVP');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    closeBtn.addEventListener('click', closeRSVP);
    card.appendChild(closeBtn);

    iframe = document.createElement('iframe');
    iframe.className = 'rsvp-modal-iframe';
    iframe.src = RSVP_URL + (RSVP_URL.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now());
    iframe.setAttribute('title', 'RSVP');
    iframe.setAttribute('allowtransparency', 'true');

    // initial reasonable height while page loads
    iframe.style.height = '540px';
    card.appendChild(iframe);
    host.appendChild(card);

    hostClickHandler = function onHostClick(ev) {
      if (ev.target === host) closeRSVP();
    };
    host.addEventListener('click', hostClickHandler);

    // When iframe loads, try same-origin read and request height from child
    iframe.addEventListener('load', function () {
      try {
        var doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc) {
          var h = Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0);
          if (h && !isNaN(h)) { setHeights(h); }
        }
      } catch (e) {
        // cross-origin - ignore
      }
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

  // Click delegation to open overlay
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

  // Listen for messages from iframe (child)
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
      if (data.type === 'RSVP:LOCKED') { var btns = document.querySelectorAll('.rsvp-modal-close'); btns.forEach(function (b) { b.style.display = 'none'; }); return; }
      if (data.type === 'RSVP:UNLOCKED') { var btns2 = document.querySelectorAll('.rsvp-modal-close'); btns2.forEach(function (b) { b.style.display = ''; }); return; }
      if (data.type === 'RSVP:CLOSE') { closeRSVP(); return; }
    }

    if (e.data === 'RSVP:CLOSE') { closeRSVP(); return; }
  });

  // ESC closes overlay
  window.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape' && host.style.display === 'flex') closeRSVP();
  });

  // Debug helpers
  window.__rsvp = {
    open: openRSVP,
    close: closeRSVP,
    info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay"), open: host.style.display === 'flex' }; }
  };

  console.log('rsvp-overlay: responsive modal initialized (auto-size)');
})();
