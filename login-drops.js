(function(){
  function build(){
    const box=document.getElementById('lgDrops'); if(!box) return;
    const W=innerWidth,H=innerHeight; box.innerHTML='';
    const cw=Math.min(W*.88,360), cx=(W-cw)/2, cy=Math.max(H*.07,34), ch=Math.min(H*.78,600);
    const frag=document.createDocumentFragment();
    const mk=(x,y,d,run)=>{
      const e=document.createElement('i'); e.className='lg-d'+(run?' run':'');
      e.style.cssText=`width:${d}px;height:${d*(run?1.18:1)}px;left:${x}px;top:${y}px;animation-delay:${(Math.random()*1.4).toFixed(2)}s`
        +(run?`;--run:${(70+Math.random()*120)|0}px;--dur:${(7+Math.random()*7).toFixed(1)}s;--dl:${(1.5+Math.random()*5).toFixed(1)}s;--tr:${(30+Math.random()*50)|0}px`:'');
      frag.appendChild(e);
    };
    const size=()=>{const r=Math.random(); return r<.62?2.5+Math.random()*4.5 : r<.92?7+Math.random()*7 : 15+Math.random()*8;};
    for(let i=0;i<46;i++) mk(cx-10+Math.random()*(cw+20), cy+Math.random()*ch, size());
    for(let i=0;i<30;i++) mk(Math.random()*W, Math.random()*H, 2.5+Math.random()*7);
    for(let i=0;i<7;i++){ const d=9+Math.random()*7; mk(cx+Math.random()*cw, cy+Math.random()*ch*.6, d, true); }
    box.appendChild(frag);
  }
  build(); let t; addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(build,250);});
})();
