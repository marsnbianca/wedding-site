// rsvp-overlay.js — responsive modal overlay for wedding-site (parent)
// Path: wedding-site/rsvp-overlay.js
// Include from your wedding-site index.html: <script src="rsvp-overlay.js"></script>

(function () {
  // CONFIG: set this to your GitHub Pages front-end URL (the RSVP page you published)
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
      "@media (max-width:1100px){ .rsvp-modal-card{ max-width:760px; } }",
      "@media (max-width:820px){ .rsvp-modal-card{ max-width:640px; } }",
      "@media (max-width:640px){ #rsvpHostOverlay{ padding:12px; } .rsvp-modal-card{ max-width:96%; border-radius:12px; } }",
      ".rsvp-modal-iframe{ width:100%; border:0; display:block; background:transparent; }"
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

  // Set iframe height to child content height, capped by 90vh
  function setHeights(childHeight) {
    if (!iframe || !card) return;
    var viewportMax = Math.floor(window.innerHeight * 0.9);
    var h = parseInt(childHeight, 10) || 0;
    var finalH = Math.min(Math.max(h, 300), viewportMax); // clamp min 300px, max 90vh
    iframe.style.height = finalH + 'px';
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

    iframe = document.createElement('iframe');
    iframe.className = 'rsvp-modal-iframe';
    iframe.setAttribute('title', 'RSVP');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('scrolling', 'auto');
    iframe.src = RSVP_URL + (RSVP_URL.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now());

    // reasonable initial height while page loads
    iframe.style.height = Math.min(Math.floor(window.innerHeight * 0.75), 700) + 'px';

    card.appendChild(iframe);
    host.appendChild(card);

    // backdrop click closes modal (not clicks inside card)
    hostClickHandler = function onHostClick(ev) {
      if (ev.target === host) closeRSVP();
    };
    host.addEventListener('click', hostClickHandler);

    // on load try same-origin read and request child height
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

  // Delegated click to open overlay
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
      if (data.type === 'RSVP:CLOSE') {
        closeRSVP();
        return;
      }
      // RSVP:LOCKED / UNLOCKED are ignored since there is no top X anymore
    }

    if (e.data === 'RSVP:CLOSE') { closeRSVP(); return; }
  });

  // ESC closes overlay
  window.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape' && host.style.display === 'flex') closeRSVP();
  });

  // Helper API
  window.__rsvp = {
    open: openRSVP,
    close: closeRSVP,
    info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay"), open: host.style.display === 'flex' }; }
  };

  console.log('rsvp-overlay: responsive modal initialized (auto-size)');
})();
