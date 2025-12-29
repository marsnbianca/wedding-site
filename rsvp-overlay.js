// rsvp-overlay.js — popup-based RSVP launcher (replace existing file in wedding-site repo)
(function () {
  // Use your Apps Script exec URL here (the Web App "exec" URL)
  var RSVP_URL = "https://script.google.com/macros/s/AKfycbzdV48pD-cQn5O_lNhnqh1ijjaTbyMG0IIAu2HAWLe2BXxBAWfpTl2Evc1w2S6uX3VP/exec";
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  if (!RSVP_URL || RSVP_URL.indexOf("script.google.com") === -1) {
    console.error("rsvp-overlay.js: RSVP_URL not set or invalid. Please set RSVP_URL to your Apps Script web app exec URL.");
  }

  function openPopup(url) {
    var popupWidth = Math.min(window.innerWidth - 40, 900);
    var popupHeight = Math.min(window.innerHeight - 60, 700);
    var left = Math.max(0, Math.round((window.screen.width - popupWidth) / 2));
    var top = Math.max(0, Math.round((window.screen.height - popupHeight) / 2));
    var features = "toolbar=0,location=0,status=0,menubar=0,scrollbars=1,resizable=1";
    features += ",width=" + popupWidth + ",height=" + popupHeight + ",left=" + left + ",top=" + top;
    var w = window.open(url, "rsvp_popup", features);
    if (!w) {
      alert("Popup blocked. Please allow popups for this site or open the RSVP link in a new tab.");
      return null;
    }
    try { w.focus(); } catch (_) {}
    return w;
  }

  function openRSVP(e) {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      try { e.stopPropagation(); } catch (_) {}
    }
    var url = RSVP_URL + (RSVP_URL.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now());
    openPopup(url);
    console.log("rsvp-overlay: opened popup ->", url);
  }

  // click delegation and direct handlers
  function onDocumentClick(e) {
    var t = e.target;
    try {
      var img = (t.closest && (t.closest('img[alt="openRSVP"], img[aria-label="openRSVP"], img[title="openRSVP"], button[aria-label="openRSVP"], [data-rsvp="open"]')));
      if (img) { openRSVP(e); return; }
      var el = (t.closest && t.closest("a, button, div, span"));
      if (el) {
        var txt = (el.innerText || el.textContent || "").trim().toLowerCase();
        if (txt === "rsvp") { openRSVP(e); return; }
      }
    } catch (err) {
      console.error("rsvp-overlay: click handler error", err);
    }
  }
  document.addEventListener("click", onDocumentClick, true);

  function attachDirectHandlers() {
    var selectors = [
      ".rsvp-btn",
      '[data-rsvp=\"open\"]',
      'img[alt=\"openRSVP\"]',
      'img[aria-label=\"openRSVP\"]',
      'img[title=\"openRSVP\"]',
      'button[aria-label=\"openRSVP\"]'
    ];
    var nodes = document.querySelectorAll(selectors.join(","));
    for (var i = 0; i < nodes.length; i++) {
      (function (node) {
        if (node.__rsvpAttached) return;
        node.addEventListener("click", function (ev) { openRSVP(ev); });
        node.__rsvpAttached = true;
      })(nodes[i]);
    }
  }
  try { attachDirectHandlers(); } catch (_) {}
  document.addEventListener("DOMContentLoaded", attachDirectHandlers);

  // expose debug helper
  window.__rsvp = {
    open: openRSVP,
    info: function() { return { RSVP_URL: RSVP_URL }; }
  };

  console.log("rsvp-overlay (popup) initialized. Use window.__rsvp.open() to open.");
})();
