// rsvp-overlay.js — responsive modal overlay (auto-size to content)
(function () {
  var RSVP_URL = "https://marsnbianca.github.io/rsvp-tool/"; // <-- replace with your frontend Pages URL
  var RSVP_ORIGIN = "https://marsnbianca.github.io";

  var host = document.getElementById("rsvpHostOverlay");
  if (!host) {
    host = document.createElement("div");
    host.id = "rsvpHostOverlay";
    document.body.appendChild(host);
    var s = document.createElement('style');
    s.textContent = `
#rsvpHostOverlay{ position:fixed; inset:0; z-index:999999; display:none; align-items:center; justify-content:center; background: rgba(0,0,0,0.45); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); padding:24px; box-sizing:border-box; }
.rsvp-modal-card{ position:relative; width:auto; max-width:760px; background:#fff; border-radius:14px; overflow:auto; box-shadow:0 18px 50px rgba(0,0,0,0.32); max-height:90vh; transition:transform .18s ease,opacity .12s ease; padding:0; }
.rsvp-modal-iframe{ width:100%; height:100%; border:0; display:block; background:transparent; }
.rsvp-modal-close{ position:absolute; right:10px; top:10px; z-index:10; background:rgba(255,255,255,0.95); border:0; width:36px; height:36px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,0.12); }
@media (max-width:640px){
  #rsvpHostOverlay{ padding:12px; }
  .rsvp-modal-card{ max-width:100%; border-radius:10px; }
}
`;
    document.head.appendChild(s);
  }

  var iframe = null, card = null, lastFocus = null;

  function lockScroll(lock){
    if(lock){ document.documentElement.style.overflow='hidden'; document.body.style.overflow='hidden'; document.body.style.touchAction='none'; }
    else { document.documentElement.style.overflow=''; document.body.style.overflow=''; document.body.style.touchAction=''; }
  }

  function openRSVP(e){
    if(e && e.preventDefault){ e.preventDefault(); try{ e.stopPropagation(); }catch(_){} }
    lastFocus = document.activeElement;
    host.innerHTML = '';
    host.style.display = 'flex';
    host.style.pointerEvents = 'auto';

    card = document.createElement('div');
    card.className = 'rsvp-modal-card';

    // close control
    var closeBtn = document.createElement('button');
    closeBtn.className = 'rsvp-modal-close';
    closeBtn.setAttribute('aria-label','Close RSVP');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    closeBtn.addEventListener('click', closeRSVP);
    card.appendChild(closeBtn);

    iframe = document.createElement('iframe');
    iframe.className = 'rsvp-modal-iframe';
    iframe.src = RSVP_URL + (RSVP_URL.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now());
    iframe.setAttribute('title','RSVP');
    iframe.setAttribute('allowtransparency','true');

    card.appendChild(iframe);
    host.appendChild(card);

    // click backdrop to close (but not clicks inside card)
    host.addEventListener('click', function onHostClick(ev){
      if(ev.target === host) closeRSVP();
    });

    lockScroll(true);
    console.log('rsvp-overlay: opened modal ->', iframe.src);
  }

  function closeRSVP(){
    host.innerHTML = '';
    host.style.display = 'none';
    lockScroll(false);
    try { if(lastFocus && lastFocus.focus) lastFocus.focus(); } catch(_) {}
    lastFocus = null;
    iframe = null; card = null;
    console.log('rsvp-overlay: closed');
  }

  document.addEventListener('click', function(e){
    var t=e.target;
    var img = t.closest && t.closest('img[alt="openRSVP"], img[aria-label="openRSVP"], img[title="openRSVP"], button[aria-label="openRSVP"], [data-rsvp="open"]');
    if(img){ openRSVP(e); return; }
    var el = t.closest && t.closest("a, button, div, span");
    if(el){ var txt=(el.innerText||el.textContent||'').trim().toLowerCase(); if(txt==='rsvp'){ openRSVP(e); return; } }
  }, true);

  window.addEventListener('message', function(e){
    if(!e) return;
    try{
      if(e.origin !== RSVP_ORIGIN && !e.origin.startsWith("https://script.googleusercontent.com") && !e.origin.startsWith("https://script.google.com") && !e.origin.startsWith(RSVP_URL)){
        console.warn('rsvp-overlay: ignoring message from', e.origin); return;
      }
    } catch(_) {}
    if(e.data === 'RSVP:CLOSE') closeRSVP();
  });

  window.addEventListener('keydown', function(e){ if(e && e.key === 'Escape' && host.style.display === 'flex') closeRSVP(); });

  window.__rsvp = { open: openRSVP, close: closeRSVP, info: function(){ return { RSVP_URL: RSVP_URL }; } };

  console.log('rsvp-overlay: responsive modal initialized (auto-size)');
})();
