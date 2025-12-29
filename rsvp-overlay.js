// rsvp-overlay.js — place this file in the same folder as index.html in the wedding-site repo
(function () {
  // Replace with your Apps Script web app exec URL if you ever redeploy; this should be the exec URL.
  var RSVP_URL = "https://script.google.com/macros/s/AKfycbzdV48pD-cQn5O_lNhnqh1ijjaTbyMG0IIAu2HAWLe2BXxBAWfpTl2Evc1w2S6uX3VP/exec";
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  if (!RSVP_URL || RSVP_URL.indexOf("script.google.com") === -1) {
    console.error("rsvp-overlay.js: RSVP_URL not set or invalid. Please set RSVP_URL to your Apps Script web app exec URL.");
  }

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

  function onDocumentClick(e) {
    var t = e.target;
    try {
      var img = (t.closest && (t.closest('img[alt="openRSVP"], img[aria-label="openRSVP"], img[title="openRSVP"], button[aria-label="openRSVP"], [data-rsvp="open"]')));
      if (img) {
        console.log("rsvp-overlay: trigger from delegated click (attr)");
        openRSVP(e);
        return;
      }

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

  document.addEventListener("click", onDocumentClick, true);

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

  try { attachDirectHandlers(); } catch (_) {}
  document.addEventListener("DOMContentLoaded", attachDirectHandlers);

  window.addEventListener("message", function (e) {
    if (!e) return;
    try {
      if (e.origin !== RSVP_ORIGIN && !e.origin.startsWith("https://script.google.com") && !e.origin.startsWith("https://script.googleusercontent.com")) {
        console.warn("rsvp-overlay: ignoring message from origin", e.origin);
        return;
      }
    } catch (_) {}

    if (e.data === "RSVP:CLOSE") {
      closeRSVP();
    }
  });

  window.addEventListener("keydown", function (e) {
    if (e && e.key === "Escape" && host.style.display === "block") closeRSVP();
  });

  window.__rsvp = {
    open: function () { openRSVP(); },
    close: function () { closeRSVP(); },
    attach: function () { attachDirectHandlers(); },
    info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay") }; }
  };

  console.log("rsvp-overlay: initialized. Debug helpers at window.__rsvp");
})();
