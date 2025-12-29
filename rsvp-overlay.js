// rsvp-overlay.js — responsive modal overlay for wedding-site
(function () {
  // set to your Pages frontend URL (the RSVP page you published)
  var RSVP_URL = "https://marsnbianca.github.io/rsvp-tool/"; // <-- REPLACE with your frontend Pages URL
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  // create host/backdrop with css rules for responsiveness and animations
  var host = document.getElementById("rsvpHostOverlay");
  if (!host) {
    host = document.createElement("div");
    host.id = "rsvpHostOverlay";
    document.body.appendChild(host);
    // inject styles
    var s = document.createElement('style');
    s.textContent = `
#rsvpHostOverlay{ position:fixed; inset:0; z-index:999999; display:none; align-items:center; justify-content:center; background: rgba(0,0,0,0.45); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
.rsvp-modal-card{ position:relative; width:100%; max-width:920px; height: min(90vh,780px); border-radius:14px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.3); background:transparent; transform: translateY(10px) scale(.98); opacity:0; transition: transform .22s cubic-bezier(.2,.9,.3,1), opacity .18s ease; }
.rsvp-host-open .rsvp-modal-card{ transform: translateY(0) scale(1); opacity:1; }
.rsvp-modal-iframe{ width:100%; height:100%; border:0; display:block; background:transparent; }
.rsvp-modal-close{ position:absolute; right:10px; top:10px; z-index:10; background:rgba(255,255,255,0.92); border:0; width:36px; height:36px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 18px rgba(0,0,0,0.12); }
.rsvp-modal-close svg{ width:16px; height:16px; color:#111; }
/* mobile: near full screen */
@media (max-width:640px){
  .rsvp-modal-card{ width: calc(100% - 20px); height: calc(100% - 24px); max-width:none; border-radius:10px; }
  .rsvp-modal-close{ right:8px; top:8px; background:rgba(255,255,255,0.95); }
}
/* tablet */
@media (min-width:641px) and (max-width:1024px){
  .rsvp-modal-card{ width: min(780px, 92%); height: min(86vh,760px); border-radius:12px; }
}
    `;
    document.head.appendChild(s);
  }

  var container = null;
  var iframe = null;
  var closeBtn = null;
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
    if (e && typeof e.preventDefault === "function") { e.preventDefault(); try{ e.stopPropagation(); }catch(_){} }
    lastFocus = document.activeElement;

    host.innerHTML = ""; // clear any existing
    host.style.display = "flex";
    host.classList.add('rsvp-host-open');

    // create card
    var card = document.createElement('div');
    card.className = 'rsvp-modal-card';
    card.setAttribute('role','dialog');
    card.setAttribute('aria-modal','true');

    // close button
    closeBtn = document.createElement('button');
    closeBtn.className = 'rsvp-modal-close';
    closeBtn.setAttribute('aria-label','Close RSVP');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    closeBtn.addEventListener('click', closeRSVP);
    card.appendChild(closeBtn);

    // iframe
    iframe = document.createElement('iframe');
    iframe.className = 'rsvp-modal-iframe';
    iframe.src = RSVP_URL + (RSVP_URL.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now());
    iframe.setAttribute('title','RSVP');
    iframe.setAttribute('allowtransparency','true');
    card.appendChild(iframe);

    host.appendChild(card);

    // clicking backdrop closes modal (but not clicks inside the card)
    host.addEventListener('click', function onHostClick(ev){
      if (ev.target === host) closeRSVP();
    });

    lockScroll(true);
    console.log('rsvp-overlay: opened modal ->', iframe.src);
  }

  function closeRSVP() {
    host.innerHTML = "";
    host.style.display = "none";
    host.classList.remove('rsvp-host-open');
    lockScroll(false);
    try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch(_) {}
    lastFocus = null;
    iframe = null;
    console.log('rsvp-overlay: closed');
  }

  // delegated click to open overlay
  document.addEventListener('click', function(e){
    var t = e.target;
    var img = t.closest && t.closest('img[alt="openRSVP"], img[aria-label="openRSVP"], img[title="openRSVP"], button[aria-label="openRSVP"], [data-rsvp="open"]');
    if (img){ openRSVP(e); return; }
    var el = t.closest && t.closest("a, button, div, span");
    if (el) {
      var txt = (el.innerText || el.textContent || '').trim().toLowerCase();
      if (txt === 'rsvp'){ openRSVP(e); return; }
    }
  }, true);

  // listen for close message from iframe
  window.addEventListener('message', function(e){
    if(!e) return;
    try {
      if (e.origin !== RSVP_ORIGIN && !e.origin.startsWith("https://script.googleusercontent.com") && !e.origin.startsWith("https://script.google.com") && !e.origin.startsWith(RSVP_URL)) {
        console.warn("rsvp-overlay: ignoring message from origin", e.origin);
        return;
      }
    } catch(_) {}
    if (e.data === 'RSVP:CLOSE') closeRSVP();
  });

  // ESC to close
  window.addEventListener('keydown', function(e){
    if (e && e.key === 'Escape' && host.style.display === 'flex') closeRSVP();
  });

  // expose debug
  window.__rsvp = { open: openRSVP, close: closeRSVP, info: function(){ return { RSVP_URL: RSVP_URL }; } };

  console.log('rsvp-overlay: responsive modal initialized');
})();
