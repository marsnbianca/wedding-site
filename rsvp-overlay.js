// rsvp-overlay.js — responsive modal overlay for wedding-site (parent)
// Path: wedding-site/rsvp-overlay.js
// Include it from your wedding-site index.html: <script src="rsvp-overlay.js"></script>

(function () {
  // CONFIG: set to your GitHub Pages front-end URL (the RSVP page you published)
  var RSVP_URL = "https://marsnbianca.github.io/rsvp-tool/"; // <-- REPLACE with your frontend Pages URL
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  // Create host/backdrop once
  var host = document.getElementById("rsvpHostOverlay");
  if (!host) {
    host = document.createElement("div");
    host.id = "rsvpHostOverlay";
    document.body.appendChild(host);

    var style = document.createElement('style');
    style.textContent = [
      "#rsvpHostOverlay{ position:fixed; inset:0; z-index:999999; display:none; align-items:center; justify-content:center;",
      " background: rgba(0,0,0,0.45); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); padding:18px; box-sizing:border-box; }",
      ".rsvp-modal-card{ position:relative; width:100%; max-width:820px; background:#fff; border-radius:14px; overflow:visible;",
      " box-shadow:0 18px 50px rgba(0,0,0,0.32); max-height:90vh; transition:transform .18s ease,opacity .12s ease; padding:0; }",
      ".rsvp-modal-iframe{ width:100%; border:0; display:block; background:transparent; overflow:auto; }",
      ".rsvp-modal-close{ position:absolute; right:10px; top:10px; z-index:10; background:rgba(255,255,255,0.95); border:0; width:36px; height:36px;",
      " border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,0.12); }",
      "@media (max-width:900px){ #rsvpHostOverlay{ padding:12px; } .rsvp-modal-card{ max-width:92%; border-radius:12px; } }"
    ].join('');
    document.head.appendChild(style);
  }

  var iframe = null, card = null, lastFocus = null, hostClickHandler = null;

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

  // Set iframe height to child content height, but cap at 90vh
  function setHeights(childHeight) {
    if (!iframe || !card) return;
    var viewportMax = Math.floor(window.innerHeight * 0.9);
    var h = parseInt(childHeight, 10) || 0;
    if (isNaN(h) || h <= 0) {
      iframe.style.height = Math.min(viewportMax, 560) + 'px';
      return;
    }
    var finalH = Math.min(h, viewportMax);
    iframe.style.height = finalH + 'px';
    // ensure card doesn't produce an extra scrollbar: card overflow visible so iframe handles scroll
    card.style.height = 'auto';
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

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'rsvp-modal-close';
    closeBtn.setAttribute('aria-label', 'Close RSVP');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    closeBtn.addEventListener('click', closeRSVP);
    card.appendChild(closeBtn);

    iframe = document.createElement('iframe');
    iframe.className = 'rsvp-modal-iframe';
    iframe.setAttribute('title', 'RSVP');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('scrolling', 'auto');
    iframe.src = RSVP_URL + (RSVP_URL.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now());

    // initial height while content loads
    iframe.style.height = Math.min(Math.floor(window.innerHeight * 0.8), 700) + 'px';

    card.appendChild(iframe);
    host.appendChild(card);

    // backdrop click closes modal (not clicks inside card)
    hostClickHandler = function onHostClick(ev) {
      if (ev.target === host) closeRSVP();
    };
    host.addEventListener('click', hostClickHandler);

    // try same-origin read on load, and request child height
    iframe.addEventListener('load', function () {
      try {
        var doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc) {
          var h = Math.max(doc.documentElement.scrollHeight || 0, (doc.body && doc.body.scrollHeight) || 0);
          if (h) setHeights(h);
        }
      } catch (err) { /* cross-origin - ignore */ }
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

  // Messages from iframe child
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
      if (data.type === 'RSVP:HEIGHT') {
        if (data.height) setHeights(data.height);
        return;
      }
      if (data.type === 'RSVP:LOCKED') {
        var btns = document.querySelectorAll('.rsvp-modal-close');
        btns.forEach(function (b) { b.style.display = 'none'; });
        return;
      }
      if (data.type === 'RSVP:UNLOCKED') {
        var btns = document.querySelectorAll('.rsvp-modal-close');
        btns.forEach(function (b) { b.style.display = ''; });
        return;
      }
      if (data.type === 'RSVP:CLOSE') {
        closeRSVP();
        return;
      }
    }

    if (e.data === 'RSVP:CLOSE') { closeRSVP(); return; }
  });

  // ESC closes overlay
  window.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape' && host.style.display === 'flex') closeRSVP();
  });

  // Helpers exposed
  window.__rsvp = { open: openRSVP, close: closeRSVP, info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay"), open: host.style.display === 'flex' }; } };

  console.log('rsvp-overlay: responsive modal initialized (auto-size)');
})();
