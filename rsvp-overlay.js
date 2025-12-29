// rsvp-overlay.js — modal iframe version
(function () {
  // IMPORTANT: Replace this with the full script.googleusercontent.com URL
  // that you copy from the Network list when you open your Apps Script exec URL in a tab.
  // Example: "https://script.googleusercontent.com/.....long...string..."
  var RSVP_URL = "https://n-qwmf6vougjxh4aq5pssvewccq5224sxmappxwxi-0lu-script.googleusercontent.com/userCodeAppPanel";
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  if (!RSVP_URL || RSVP_URL.indexOf("script.googleusercontent.com") === -1) {
    console.error("rsvp-overlay.js: RSVP_URL is not set to a script.googleusercontent.com URL. Please paste the inner URL copied from DevTools.");
  }

  var host = document.createElement("div");
  host.id = "rsvpHostOverlay";
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "999999";
  host.style.background = "transparent";
  host.style.display = "none";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);

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
    host.style.background = "rgba(0,0,0,0.35)";

    iframe = document.createElement("iframe");
    // add cache buster param
    iframe.src = RSVP_URL + (RSVP_URL.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now());
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

  document.addEventListener("click", function (e) {
    var t = e.target;
    var img = t.closest && t.closest('img[alt="openRSVP"], img[aria-label="openRSVP"], img[title="openRSVP"], button[aria-label="openRSVP"], [data-rsvp="open"]');
    if (img) { openRSVP(e); return; }

    var el = t.closest && t.closest("a, button, div, span");
    if (el) {
      var txt = (el.innerText || el.textContent || "").trim().toLowerCase();
      if (txt === "rsvp") { openRSVP(e); return; }
    }
  }, true);

  // close when iframe posts "RSVP:CLOSE"
  window.addEventListener("message", function (e) {
    if (!e) return;
    // accept messages from script.googleusercontent.com (inner UI) too
    if (e.origin !== RSVP_ORIGIN && !e.origin.startsWith("https://script.googleusercontent.com") && !e.origin.startsWith("https://script.google.com")) {
      console.warn("rsvp-overlay: ignoring message from origin", e.origin);
      return;
    }
    if (e.data === "RSVP:CLOSE") closeRSVP();
  });

  window.addEventListener("keydown", function (e) {
    if (e && e.key === "Escape" && host.style.display === "block") closeRSVP();
  });

  // debug helpers
  window.__rsvp = {
    open: function () { openRSVP(); },
    close: function () { closeRSVP(); },
    info: function () { return { RSVP_URL: RSVP_URL, hostExists: !!document.getElementById("rsvpHostOverlay") }; }
  };

  console.log("rsvp-overlay: initialized. Use window.__rsvp.open() to open.");
})();
