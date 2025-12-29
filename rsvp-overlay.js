// name=rsvp-overlay.js
(function () {
  // Replace with your Apps Script web app exec URL (deploy → Web app → copy exec URL)
  var RSVP_URL = "https://script.google.com/macros/s/AKfycbzdV48pD-cQn5O_lNhnqh1ijjaTbyMG0IIAu2HAWLe2BXxBAWfpTl2Evc1w2S6uX3VP/exec";
  var RSVP_ORIGIN = "https://marsnbianca.github.io"; // parent site origin (used for message checks)

  // Basic sanity check
  if (!RSVP_URL || RSVP_URL.indexOf("script.google.com") === -1) {
    console.error("rsvp-overlay.js: RSVP_URL not set or invalid. Please set RSVP_URL to your Apps Script web app exec URL.");
  }

  // Create host overlay container if not present
  var host = document.getElementById("rsvpHostOverlay");
  if (!host) {
    host = document.createElement("div");
    host.id = "rsvpHostOverlay";
    host.style.position = "fixed";
    host.style.inset = "0";
    host.style.zIndex = "999999";
    host.style.background = "transparent";
    host.style.display = "none";
    host.style.pointerEvents = "none";
    document.body.appendChild(host);
    console.log("rsvp-overlay: created host overlay");
  } else {
    console.log("rsvp-overlay: found existing host overlay");
  }

  var iframe = null;
  var lastFocus = null;

  function lockScroll(lock) {
    if (lock) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
  }

  function openRSVP(e) {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      try { e.stopPropagation(); } catch (_) {}
    }

    lastFocus = document.activeElement;

    host.innerHTML = "";
    host.style.display = "block";
    host.style.pointerEvents = "auto";
    host.style.background = "rgba(0,0,0,0.25)";

    iframe = document.createElement("iframe");
    iframe.src = RSVP_URL + "?t=" + Date.now();
    iframe.style.position = "absolute";
    iframe.style.inset = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    iframe.style.background = "transparent";
    iframe.setAttribute("allowtransparency", "true");
    iframe.setAttribute("title", "RSVP");

    host.appendChild(iframe);
    lockScroll(true);
    console.log("rsvp-overlay: opened iframe ->", iframe.src);
  }

  function closeRSVP() {
    host.innerHTML = "";
    host.style.display = "none";
    host.style.pointerEvents = "none";
    host.style.background = "transparent";
    lockScroll(false);

    try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (_) {}
    lastFocus = null;
    iframe = null;
    console.log("rsvp-overlay: closed");
  }

  // Event delegation click handler (fallback)
  function onDocumentClick(e) {
    var t = e.target;
    try {
      // 1) explicit attributes on image/button
      var img = (t.closest && (t.closest('img[alt="openRSVP"], img[aria-label="openRSVP"], img[title="openRSVP"], button[aria-label="openRSVP"], [data-rsvp="open"]')));
      if (img) {
        console.log("rsvp-overlay: trigger from delegated click (attr)");
        openRSVP(e);
        return;
      }

      // 2) direct element matches (text fallback)
      var el = (t.closest && t.closest("a, button, div, span"));
      if (el) {
        var txt = (el.innerText || el.textContent || "").trim().toLowerCase();
        if (txt === "rsvp") {
          console.log("rsvp-overlay: trigger from delegated click (text)");
          openRSVP(e);
          return;
        }
      }
    } catch (err) {
      console.error("rsvp-overlay: error in delegated click", err);
    }
  }

  // Attach delegated listener
  document.addEventListener("click", onDocumentClick, true);

  // Also attach direct listeners to common trigger elements (class .rsvp-btn, [data-rsvp], images with attributes)
  function attachDirectHandlers() {
    var selectors = [
      ".rsvp-btn",
      '[data-rsvp="open"]',
      'img[alt="openRSVP"]',
      'img[aria-label="openRSVP"]',
      'img[title="openRSVP"]',
      'button[aria-label="openRSVP"]'
    ];
    var nodes = document.querySelectorAll(selectors.join(","));
    for (var i = 0; i < nodes.length; i++) {
      (function (node) {
        // avoid adding multiple listeners
        if (node.__rsvpAttached) return;
        node.addEventListener("click", function (ev) {
          console.log("rsvp-overlay: trigger from direct click on", node);
          openRSVP(ev);
        });
        node.__rsvpAttached = true;
      })(nodes[i]);
    }
    console.log("rsvp-overlay: attached direct handlers to", nodes.length, "elements");
  }

  // Run once now and also on DOMContentLoaded to catch late elements
  try { attachDirectHandlers(); } catch (_) {}
  document.addEventListener("DOMContentLoaded", attachDirectHandlers);

  // Listen for close messages from iframe
  window.addEventListener("message", function (e) {
    if (!e) return;
    // accept messages from the parent host origin and from Apps Script
    try {
      if (e.origin !== RSVP_ORIGIN && !e.origin.startsWith("https://script.google.com") && !e.origin.startsWith("https://script.googleusercontent.com")) {
        // ignore unknown origins
        console.warn("rsvp-overlay: ignoring message from origin", e.origin);
        return;
      }
    } catch (_) { /* ignore */ }

    if (e.data === "RSVP:CLOSE") {
      closeRSVP();
    }
  });

  // Escape closes overlay
  window.addEventListener("keydown", function (e) {
    if (e && e.key === "Escape" && host.style.display === "block") closeRSVP();
  });

  // Debug helpers available from the console
  window.__rsvp = {
    open: function () { openRSVP(); },
    close: function () { closeRSVP(); },
    attach: function () { attachDirectHandlers(); },
    info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay") }; }
  };

  console.log("rsvp-overlay: initialized. Debug helpers at window.__rsvp");
})();
