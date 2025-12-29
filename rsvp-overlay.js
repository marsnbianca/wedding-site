// rsvp-overlay.js — responsive modal overlay for wedding-site (parent)
// Path: wedding-site/rsvp-overlay.js
// Include from your wedding-site index.html: <script src="rsvp-overlay.js"></script>
//
// Behavior implemented:
// - Parent sizes modal by step-based padding and by using the child-reported content height (RSVP:HEIGHT).
// - NO internal iframe scrollbars: iframe overflow is hidden; when content is taller than recommended max the overlay
//   itself becomes scrollable (top-aligned modal) so user scrolls the overlay, not the iframe.
// - Min height is driven by content (child-reported) + small base; padding is applied in rem (relative).
// - Smooth transitions and a DEBUG flag for message flow testing.

(function () {
  var DEBUG = false; // toggle with window.__rsvp.setDebug(true)
  function log() { if (DEBUG) console.log.apply(console, arguments); }

  var RSVP_URL = "https://marsnbianca.github.io/rsvp-tool/"; // <-- REPLACE with your frontend Pages URL
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  // Ensure host exists
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

      /* Modal card: transitions for padding/transform/width */
      ".rsvp-modal-card{ position:relative; width:auto; max-width:96vw; box-sizing:border-box; background:#fff; border-radius:0.75rem; overflow:visible;",
      " box-shadow:0 1rem 3rem rgba(0,0,0,0.22); transition: transform .22s cubic-bezier(.2,.9,.2,1), padding .18s ease, width .18s ease, opacity .12s ease; padding: clamp(0.4rem, 1.6vw, 1rem); }",

      /* Iframe: will be sized by parent to child content height. Hide overflow to avoid internal scrollbars */
      ".rsvp-modal-iframe{ width:100%; border:0; display:block; background:transparent; box-sizing:border-box;",
      " transition: height .16s ease, max-height .16s ease; overflow:hidden; }",

      /* Height recommendations from your guide (mobile-first) */
      ".rsvp-modal-card .rsvp-modal-iframe{ min-height:20svh; max-height:85svh; }",
      "@media (min-width:641px) and (max-width:1007px){ .rsvp-modal-card .rsvp-modal-iframe{ min-height:300px; max-height:80svh; } }",
      "@media (min-width:1008px){ .rsvp-modal-card .rsvp-modal-iframe{ min-height:400px; max-height:70vh; } }",

      /* Width caps restored to approved setting (desktop 60vw capped at 50rem) */
      "@media (max-width:640px){ .rsvp-modal-card{ max-width: min(90vw, 26rem); } }",
      "@media (min-width:641px) and (max-width:1007px){ .rsvp-modal-card{ max-width:76vw; } }",
      "@media (min-width:1008px){ .rsvp-modal-card{ max-width: min(60vw, 50rem); } }",

      ".rsvp-modal-close{ position:absolute; right:0.6rem; top:0.6rem; z-index:10; background:rgba(255,255,255,0.95); border:0;",
      " width:2.25rem; height:2.25rem; border-radius:0.5rem; cursor:pointer; display:flex; align-items:center; justify-content:center;",
      " box-shadow:0 0.3rem 1rem rgba(0,0,0,0.12); }"
    ].join('');
    document.head.appendChild(style);
  }

  var iframe = null, card = null, lastFocus = null, hostClickHandler = null, topCloseBtn = null;

  function lockScroll(lock) {
    if (lock) {
      // Prevent page behind modal from scrolling; overlay may scroll when needed
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }

  // Breakpoint-based recommended max heights (returns px)
  function recommendedMaxPx() {
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (vw >= 1008) {
      return Math.round(vh * 0.70); // 70vh desktop
    }
    if (vw >= 641) {
      // use svh values where available; fallback to vh
      return Math.round(vh * 0.80); // ~80svh/tablet
    }
    return Math.round(vh * 0.85); // 85svh mobile
  }

  // Step -> padding mapping (rem)
  function paddingForStep(stepName) {
    var map = {
      search: 0.6,
      matches: 0.7,
      notInList: 0.6,
      attendance: 1.0,
      transport: 0.8,
      phone: 0.7,
      notes: 0.7,
      review: 0.8,
      thanks: 0.6
    };
    return (map[stepName] || 0.8);
  }

  // Convert rem to px
  function remToPx(rem) {
    var rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return rem * rootFs;
  }

  // Apply padding top/bottom on card using rem (relative units)
  function applyPadding(stepName) {
    if (!card) return;
    var pr = paddingForStep(stepName);
    var horiz = Math.max(0.45, pr * 0.6);
    card.style.paddingTop = pr + 'rem';
    card.style.paddingBottom = pr + 'rem';
    card.style.paddingLeft = horiz + 'rem';
    card.style.paddingRight = horiz + 'rem';
  }

  // When child reports height, set iframe height to reported height (remove internal scroll)
  // If content > recommended max, keep iframe at full content height and let overlay scroll (top align).
  // If content <= recommended max, center modal and hide overlay scroll.
  function setIframeToContentHeight(childHeight, stepName) {
    if (!iframe || !card || !host) return;
    var h = parseInt(childHeight, 10) || 0;
    if (!h) return;

    applyPadding(stepName);

    var max = recommendedMaxPx();

    // Always set iframe to full content height so iframe will not show its own scrollbars
    iframe.style.height = h + 'px';
    iframe.style.overflow = 'hidden';

    if (h <= max) {
      // content fits: center modal, hide overlay scrollbar
      host.style.alignItems = 'center';
      host.style.overflow = 'hidden';
      card.style.marginTop = '';
      card.style.marginBottom = '';
    } else {
      // content taller than recommended max: top-align modal, allow overlay scroll
      host.style.alignItems = 'flex-start';
      host.style.overflow = 'auto';
      card.style.marginTop = '1.5rem';
      card.style.marginBottom = '1.5rem';
    }

    // enforce an accessible visual max-height (so CSS-aware things still see a cap)
    // but we keep iframe height = content height; overlay scroll handles excess content.
    iframe.style.maxHeight = Math.max(h, max) + 'px';
    card.style.width = ''; // keep CSS width rules (not overriding)
    log('setIframeToContentHeight', h, 'max', max, 'step', stepName);
  }

  // When child doesn't report height, just apply padding and let CSS min/max apply.
  // In that case iframe keeps internal scrolling (we cannot avoid it cross-origin).
  function applyStepFallback(stepName) {
    if (!iframe || !card) return;
    applyPadding(stepName);
    iframe.style.height = 'auto';
    iframe.style.overflow = 'auto';
    iframe.style.maxHeight = ''; // CSS media rules control max-height
    host.style.alignItems = 'center';
    host.style.overflow = 'hidden';
    card.style.marginTop = '';
    card.style.marginBottom = '';
    log('applyStepFallback', stepName);
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
    // remove internal scrollbars where possible; parent will size iframe to content when child supplies height
    iframe.setAttribute('scrolling', 'no');
    iframe.src = RSVP_URL + (RSVP_URL.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now());

    // leave height auto until child reports
    iframe.style.height = 'auto';
    iframe.style.boxSizing = 'border-box';

    card.appendChild(iframe);
    host.appendChild(card);

    hostClickHandler = function onHostClick(ev) {
      if (ev.target === host) closeRSVP();
    };
    host.addEventListener('click', hostClickHandler);

    // Ask child for both step and height after load
    iframe.addEventListener('load', function () {
      try { iframe.contentWindow.postMessage({ type: 'RSVP:REQUEST_STEP' }, '*'); } catch (_) {}
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

  // messages from child
  window.addEventListener('message', function (e) {
    if (!e) return;
    try {
      if (typeof e.origin === 'string') {
        var ok = (e.origin === RSVP_ORIGIN) || e.origin.startsWith(RSVP_URL) || e.origin.startsWith("https://script.googleusercontent.com") || e.origin.startsWith("https://script.google.com");
        if (!ok) { log('ignoring origin', e.origin); return; }
      }
    } catch (_) { log('origin check error'); }

    var data = e.data;
    if (!data) return;
    log('parent received', data && data.type ? data.type : data);

    if (typeof data === 'object' && data.type) {
      if (data.type === 'RSVP:HEIGHT') {
        if (data.height) {
          // child reported its content height (px)
          setIframeToContentHeight(data.height, data.step || '');
        }
        return;
      }
      if (data.type === 'RSVP:STEP') {
        // child only told current step (no height). Apply padding and let CSS min/max control heights.
        applyStepFallback(data.step || '');
        return;
      }
      if (data.type === 'RSVP:HAS_BOTTOM_CLOSE') {
        if (!topCloseBtn) createTopClose();
        topCloseBtn.style.display = data.hasBottomClose ? 'none' : '';
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

  // Expose API including debug toggle
  window.__rsvp = {
    open: openRSVP,
    close: closeRSVP,
    setDebug: function (v) { DEBUG = !!v; log('DEBUG ->', DEBUG); },
    info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay"), open: host.style.display === 'flex' }; }
  };

  console.log('rsvp-overlay: initialized (no internal scroll; height follows child content when reported; padding is rem-based)');
})();
