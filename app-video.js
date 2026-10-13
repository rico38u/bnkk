(function(){
  let url=null;
  function getURL(){
    if(url) return url;
    url=new URL('assets/media/login-background.mp4', document.baseURI).href;
    return url;
  }
  let lgWantSound=true;
  function setIcons(v){
    const on=document.getElementById('lgSoundOn'), off=document.getElementById('lgSoundOff');
    if(on&&off){ const audible=!v.muted; on.style.display=audible?'':'none'; off.style.display=audible?'none':''; }
  }
  window.lgToggleSound=function(){
    const v=document.getElementById('lgVideo'); if(!v) return;
    lgWantSound=v.muted; v.muted=!lgWantSound; v.volume=1;
    if(v.paused){ const p=v.play(); if(p&&p.catch) p.catch(()=>{}); }
    setIcons(v);
  };
  function playLogin(v){
    v.volume=1; v.muted=!lgWantSound;
    const p=v.play();
    if(p&&p.catch) p.catch(()=>{ v.muted=true; setIcons(v); const q=v.play(); if(q&&q.catch) q.catch(()=>{}); });
    setIcons(v);
  }
  function sync(){
    const gate=document.getElementById('authGate'), live=document.getElementById('view-live');
    const lg=document.getElementById('lgVideo'), lq=document.getElementById('lqVideo');
    const gateOn=!!(gate&&!gate.classList.contains('hide'));
    if(lg){ if(gateOn){ if(lg.paused) playLogin(lg); } else if(!lg.paused){ lg.pause(); } }
    if(lq){ if(live&&live.classList.contains('active')){ lq.muted=true; const p=lq.play(); if(p&&p.catch) p.catch(()=>{}); } else if(!lq.paused){ lq.pause(); } }
  }
  // أول لمسة من المستخدم تفعّل الصوت إذا منعه المتصفح تلقائيًا
  function unlockSound(){
    const gate=document.getElementById('authGate'), v=document.getElementById('lgVideo');
    if(!v||!gate||gate.classList.contains('hide')) return;
    if(lgWantSound && v.muted){ v.muted=false; v.volume=1; const p=v.play(); if(p&&p.catch) p.catch(()=>{ v.muted=true; }); setIcons(v); }
  }
  function init(){
    const u=getURL();
    ['lgVideo','lqVideo'].forEach(id=>{ const v=document.getElementById(id); if(v&&!v.getAttribute('src')){ v.src=u; v.muted=true; v.load(); } });
    const mo=new MutationObserver(sync);
    const g=document.getElementById('authGate'), l=document.getElementById('view-live');
    if(g) mo.observe(g,{attributes:true,attributeFilter:['class']});
    if(l) mo.observe(l,{attributes:true,attributeFilter:['class']});
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden) sync(); });
    ['touchstart','pointerdown','click','keydown'].forEach(ev=>document.addEventListener(ev,e=>{ if(e.target&&e.target.closest&&e.target.closest('#lgSound')) return; unlockSound(); sync(); },{passive:true}));
    ['auth_name','auth_user','auth_pass','auth_pass2'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const b=document.getElementById('authSubmitBtn'); b&&b.onclick&&b.onclick(); } });
    });
    sync();
  }
  init();
})();
