<script>
(function () {
  // Parent origin used for postMessage origin checks
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  // IMPORTANT: set this to your Apps Script web app "exec" URL (the deployed Web App URL)
  // Replace the URL below with the exec URL you get when you Deploy -> New deployment -> Web app
  var RSVP_URL = "https://script.google.com/macros/s/AKfycbzdV48pD-cQn5O_lNhnqh1ijjaTbyMG0IIAu2HAWLe2BXxBAWfpTl2Evc1w2S6uX3VP/exec";

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
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    lastFocus = document.activeElement;

    host.innerHTML = "";
    host.style.display = "block";
    host.style.pointerEvents = "auto";
    host.style.background = "rgba(0,0,0,0.25)"; // subtle backdrop

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
  }

  document.addEventListener("click", function (e) {
    var t = e.target;

    var img = t.closest && t.closest('img[alt="openRSVP"], img[aria-label="openRSVP"], img[title="openRSVP"], button[aria-label="openRSVP"]');
    if (img) {
      openRSVP(e);
      return;
    }

    var el = t.closest && t.closest("a, button, div, span");
    if (el) {
      var txt = (el.innerText || el.textContent || "").trim().toLowerCase();
      if (txt === "rsvp") {
        openRSVP(e);
        return;
      }
    }
  }, true);

  window.addEventListener("message", function (e) {
    if (!e) return;
    // accept messages from your github pages OR from Apps Script origin
    if (e.origin !== RSVP_ORIGIN && !e.origin.startsWith("https://script.google.com") && !e.origin.startsWith("https://script.googleusercontent.com")) return;
    if (e.data === "RSVP:CLOSE") closeRSVP();
  });

  window.addEventListener("keydown", function (e) {
    if (e && e.key === "Escape" && host.style.display === "block") closeRSVP();
  });
})();
</script>
