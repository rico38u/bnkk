/* ============================================================
   REELS — real posts only (videos / images you or others published)
   ============================================================ */
(function(){
const $=id=>document.getElementById(id);
const RL={tab:'fy',q:'',cur:null,reply:null,img:'',io:null,open:{},ready:false};

const ICON_FIRE='<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="url(#rlRg)"/><circle cx="32" cy="32" r="29" fill="none" stroke="#5d96ff" stroke-opacity=".5" stroke-width="1.6"/><circle cx="32" cy="32" r="25.5" fill="none" stroke="#5d96ff" stroke-opacity=".22" stroke-width="1"/><path d="M33.5 9c1 7.5 4.5 10.5 8.5 15.5 4 5 5.5 9 5.5 13.5a15.5 15.5 0 0 1-31 0c0-5 2-9 5-12.5 1 3.2 2.4 5 4.6 6.2-1.2-8.6 1.2-17 7.4-22.7z" fill="url(#rlFl)"/><path d="M32 29.5c1.4 4.2 5.8 6.4 5.8 11.6a5.8 5.8 0 0 1-11.6 0c0-3.2 1.8-4.8 3.2-6.8.8 1.8 1.6 2.4 2.6 2.6-.3-2.6-.3-4.8 0-7.4z" fill="url(#rlFl2)"/></svg>';
const ICON_CHAT='<svg viewBox="0 0 64 64"><path d="M13 9h38a7 7 0 0 1 7 7v21a7 7 0 0 1-7 7H35.5L23 55V44H13a7 7 0 0 1-7-7V16a7 7 0 0 1 7-7z" fill="rgba(70,160,255,.2)" stroke="url(#rlBl)" stroke-width="3.6" stroke-linejoin="round"/><circle cx="21.5" cy="26.5" r="3.1" fill="#9bdcff"/><circle cx="32" cy="26.5" r="3.1" fill="#9bdcff"/><circle cx="42.5" cy="26.5" r="3.1" fill="#9bdcff"/></svg>';
const ICON_REP='<svg viewBox="0 0 64 64"><path d="M13 30c0-9 8-15.5 18.5-15.5H47" fill="none" stroke="url(#rlOr)" stroke-width="6.4" stroke-linecap="round"/><path d="M39.5 5.5 49.5 14.5 39.5 23.5" fill="none" stroke="url(#rlOr)" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M51 34c0 9-8 15.5-18.5 15.5H17" fill="none" stroke="url(#rlOr)" stroke-width="6.4" stroke-linecap="round"/><path d="M24.5 58.5 14.5 49.5 24.5 40.5" fill="none" stroke="url(#rlOr)" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_STAR='<svg viewBox="0 0 64 64"><path d="M32 10.5l6.9 14 15.4 2.2-11.2 10.9 2.7 15.3L32 45.5l-13.8 7.4 2.7-15.3L9.7 26.7l15.4-2.2z" fill="url(#rlGd)" stroke="#ffd45a" stroke-width="3.6" stroke-linejoin="round"/><path d="M12 8v7M8.5 11.5h7M53 6v6M50 9h6M55 40v6M52 43h6" stroke="#ffe08a" stroke-width="2.2" stroke-linecap="round"/></svg>';
const ICON_VB='<svg class="rl-vb" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#1d9bf0"/><path d="m7.2 12.4 3.2 3.2 6.4-6.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_NOTE='<svg viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="7" fill="#fff"/><path d="M15.8 5.2 10.4 6.4v8.1a2.4 2.4 0 1 0 1.8 2.3V9.6l3.6-.8z" fill="#17182a"/></svg>';
const ICON_PLANE='<svg viewBox="0 0 24 24"><path d="M21.5 3.2 2.8 10.3c-.8.3-.8 1.4 0 1.7l4.6 1.8 1.8 4.6c.3.8 1.4.8 1.7 0l1.3-3.4 3.9 2.9c.6.5 1.5.1 1.6-.7L22.6 4.2c.1-.8-.5-1.3-1.1-1zM9.6 13.2l8.4-6.1-6.7 7.3z" opacity=".9"/></svg>';
const ICON_DOTS='<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>';

function esc(s){ return escapeHtml(s); }
function ago(ts){
  const s=Math.max(1,Math.floor((Date.now()-(ts||Date.now()))/1000));
  if(s<60) return s+'s'; const m=Math.floor(s/60); if(m<60) return m+'m';
  const h=Math.floor(m/60); if(h<24) return h+'h'; const d=Math.floor(h/24); if(d<7) return d+'d';
  const w=Math.floor(d/7); if(w<52) return w+'w'; return Math.floor(d/365)+'y';
}
function agoAr(ts){
  const s=Math.max(1,Math.floor((Date.now()-(ts||Date.now()))/1000));
  if(s<60) return s+' ث'; const m=Math.floor(s/60); if(m<60) return m+' د';
  const h=Math.floor(m/60); if(h<24) return h+' س'; const d=Math.floor(h/24); if(d<7) return d+' ي';
  const w=Math.floor(d/7); if(w<52) return w+' أ'; return Math.floor(d/365)+' سنة';
}
function allReels(){
  const mine=DATA.profile.handle||'';
  return (DATA.posts||[]).filter(p=>p&&p.mediaData&&((p.mediaType||'').startsWith('video')||(p.mediaType||'').startsWith('image')));
}
function followedHandles(){ return Array.isArray(DATA.profile.followingList)?DATA.profile.followingList:[]; }
function tagsOf(p){ const m=((p.title||'')+' '+(p.text||'')).match(/#[\p{L}\p{N}_]+/gu); return m?Array.from(new Set(m)):[]; }
function capOf(p){ const t=[(p.title||''),(p.text||'')].filter(Boolean).join('\n'); return t.replace(/#[\p{L}\p{N}_]+/gu,'').replace(/[ \t]+\n/g,'\n').replace(/\n{2,}/g,'\n').trim(); }
function list(){
  let l=allReels();
  if(RL.mode==='profile'&&RL.ids){ l=l.filter(p=>RL.ids.includes(p.id)); }
  else if(RL.mode==='profile'){ const mine=String(DATA.profile.handle||'').replace(/^@/,''); l=l.filter(p=>String(postAuthor(p).handle||'').replace(/^@/,'')===mine); }
  else if(RL.tab==='fo'){ const f=followedHandles(); l=l.filter(p=>f.includes((postAuthor(p).handle)||'')); }
  const q=RL.q.trim().toLowerCase();
  if(q){ l=l.filter(p=>{ const a=postAuthor(p); return `${p.title||''} ${p.text||''} ${p.category||''} ${a.name||''} ${a.handle||''}`.toLowerCase().includes(q); }); }
  return l;
}
function savesOf(p){ return Math.max(Number(p.saves||0),p.saved?1:0); }
function commentTotal(p){ const c=Array.isArray(p.comments)?p.comments:[]; return c.reduce((n,x)=>n+1+((x.replies||[]).length),0); }

function emptyHtml(){
  const ic='<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="3.5"/><path d="M10 9.2v5.6l4.6-2.8z"/></svg>';
  if(RL.q) return ic+'<h3>لا توجد نتائج</h3><p>جرّب اسم حساب أو وسمًا أو كلمة أخرى.</p>';
  if(RL.tab==='fo') return ic+'<h3>لا توجد حسابات تتابعها بعد</h3><p>ستظهر هنا ريلز الحسابات التي تتابعها.</p>';
  return ic+'<h3>لا توجد ريلز بعد</h3><p>انشر أول فيديو أو صورة من زر + وستظهر هنا.</p><button type="button" onclick="openPostModal()">إنشاء منشور</button>';
}

function itemHtml(p){
  const a=postAuthor(p), cap=capOf(p), tags=tagsOf(p);
  const comments=commentTotal(p);
  return `<div class="rl-item" data-id="${p.id}">
    <div class="rl-media" data-m="${p.id}"></div>
    <div class="rl-shade"></div>
    <div class="rl-hit" data-hit="${p.id}"></div>
    <div class="rl-pause"><svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></div>
    <div class="rl-side">
      <button class="rl-ab fire ${p.liked?'on':''}" data-act="like" data-id="${p.id}" type="button" aria-label="إعجاب">${ICON_FIRE}<b>${fmtCount(p.likes)}</b></button>
      <button class="rl-ab chat" data-act="cm" data-id="${p.id}" type="button" aria-label="التعليقات">${ICON_CHAT}<b>${fmtCount(comments)}</b></button>
      <button class="rl-ab rep" data-act="rep" data-id="${p.id}" type="button" aria-label="إعادة نشر">${ICON_REP}<b>${fmtCount(p.reposts)}</b></button>
      <button class="rl-ab star ${p.saved?'on':''}" data-act="save" data-id="${p.id}" type="button" aria-label="حفظ">${ICON_STAR}<b>${fmtCount(savesOf(p))}</b></button>
      <button class="rl-ab more" data-act="more" data-id="${p.id}" type="button" aria-label="المزيد"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button>
    </div>
    <div class="rl-pg"><i></i></div>
    <div class="rl-info">
      <div class="rl-user">
        <div class="rl-av">${authorAvatarMarkup(a)}</div>
        <div style="min-width:0">
          <div class="rl-un"><span class="n ${nfc(a)}" dir="auto">${esc(a.name||'حساب')}</span>${a.verified!==false?ICON_VB:''}</div>
          <div class="rl-hd ${nfc(a)}">@${esc(a.handle||'user')} · ${ago(p.time)}</div>
        </div>
      </div>
      ${cap?`<div class="rl-cap ${nfc(a)}" data-cap="${p.id}">${esc(cap)}</div>`:''}
      ${tags.length?`<div class="rl-tags">${tags.map(t=>`<span data-tag="${esc(t)}">${esc(t)}</span>`).join('')}</div>`:''}
      <div class="rl-music">
        <div class="rl-pill"><i>${ICON_NOTE}</i><span class="${nfc(a)}">${esc('الصوت الأصلي - '+(a.name||'حساب'))}</span></div>
        <button class="rl-mb" data-act="share" data-id="${p.id}" type="button" aria-label="مشاركة">${ICON_PLANE}</button>
      </div>
    </div>
    <button class="rl-mb rl-dots" data-act="more" data-id="${p.id}" type="button" aria-label="المزيد">${ICON_DOTS}</button>
  </div>`;
}

function mountMedia(l){
  l.forEach(p=>{
    const box=document.querySelector(`.rl-media[data-m="${p.id}"]`); if(!box) return;
    if((p.mediaType||'').startsWith('video')){
      const v=document.createElement('video');
      v.loop=true; v.playsInline=true; v.setAttribute('playsinline',''); v.preload='metadata';
      v.muted=false; v.src=p.mediaData;
      if(p.cover) v.poster=p.cover;
      box.appendChild(v);
    }else{
      const im=document.createElement('img'); im.src=p.mediaData; im.alt=''; box.appendChild(im);
    }
  });
}

function render(keep){
  const sc=$('rlScroll'), em=$('rlEmpty'); if(!sc) return;
  const top=keep?sc.scrollTop:0;
  const l=list();
  stopAll();
  sc.innerHTML=l.map(itemHtml).join('');
  mountMedia(l);
  em.innerHTML=emptyHtml(); em.classList.toggle('show',!l.length);
  sc.style.display=l.length?'block':'none';
  if(keep) sc.scrollTop=top;
  if(RL.startId){
    const st=sc.querySelector('.rl-item[data-id="'+RL.startId+'"]');
    if(st){ sc.style.scrollBehavior='auto'; sc.scrollTop=st.offsetTop; }
    RL.startId=null;
  }
  observe();
}
function stopAll(){
  if(RL.io){ RL.io.disconnect(); RL.io=null; }
  document.querySelectorAll('#rlScroll video').forEach(v=>{ try{v.pause();}catch(e){} });
}
function observe(){
  const sc=$('rlScroll'); if(!sc) return;
  RL.io=new IntersectionObserver(es=>{
    es.forEach(e=>{
      const it=e.target, v=it.querySelector('video');
      if(e.isIntersecting&&e.intersectionRatio>=.6){
        RL.cur=it.dataset.id;
        it.classList.remove('paused');
        if(v){ const pr=v.play(); if(pr&&pr.catch) pr.catch(()=>{ v.muted=true; const p2=v.play(); if(p2&&p2.catch) p2.catch(()=>{}); }); }
      }else if(v){ try{v.pause();}catch(x){} }
    });
  },{root:sc,threshold:[0,.6,1]});
  sc.querySelectorAll('.rl-item').forEach(i=>RL.io.observe(i));
}
function refreshCounts(id){
  const p=findPost(id); if(!p) return;
  const it=document.querySelector(`.rl-item[data-id="${id}"]`); if(!it) return;
  it.querySelector('[data-act="like"]').classList.toggle('on',!!p.liked);
  it.querySelector('[data-act="like"] b').textContent=fmtCount(p.likes);
  it.querySelector('[data-act="cm"] b').textContent=fmtCount(commentTotal(p));
  it.querySelector('[data-act="rep"] b').textContent=fmtCount(p.reposts);
  it.querySelector('[data-act="save"]').classList.toggle('on',!!p.saved);
  it.querySelector('[data-act="save"] b').textContent=fmtCount(savesOf(p));
}

/* ---------- actions ---------- */
function doLike(id){
  const p=normalizePost(findPost(id)); if(!p) return;
  p.liked=!p.liked; p.likes=Math.max(0,p.likes+(p.liked?1:-1));
  sound(p.liked?'like':'soft'); saveData(); refreshCounts(id); try{fpSync(id);}catch(e){}
}
function doSave(id){
  const p=normalizePost(findPost(id)); if(!p) return;
  const was=!!p.saved; p.saved=!was;
  p.saves=Math.max(0,Math.max(Number(p.saves||0),was?1:0)+(p.saved?1:-1));
  sound('soft'); saveData(); refreshCounts(id); try{fpSync(id);}catch(e){}
  toast(p.saved?'أُضيف إلى المحفوظات':'أُزيل من المحفوظات');
}
function doRepost(id){
  repostPost(id); render(true);
}
function togglePlay(id){
  const it=document.querySelector(`.rl-item[data-id="${id}"]`); if(!it) return;
  const v=it.querySelector('video'); if(!v) return;
  if(v.paused){ v.muted=false; const pr=v.play(); if(pr&&pr.catch) pr.catch(()=>{}); it.classList.remove('paused'); }
  else{ v.pause(); it.classList.add('paused'); }
}

/* ---------- comments sheet ---------- */
const ICO={
  dl:'<svg viewBox="0 0 24 24"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>',
  lk:'<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  chev:'<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>'
};
function ensureSheet(){
  if($('rlCm')) return;
  document.body.insertAdjacentHTML('beforeend',`
  <div class="rl-cm-bd" id="rlCmBd"></div>
  <div class="rl-cm" id="rlCm" role="dialog" aria-label="التعليقات">
    <div class="rl-cm-head">
      <div class="rl-cm-count"><svg viewBox="0 0 24 24"><path d="M4 7h16M7 12h10M10 17h4"/></svg><span id="rlCmN">0 تعليقًا</span></div>
      <button class="rl-cm-x" id="rlCmX" type="button" aria-label="إغلاق"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </div>
    <div class="rl-cm-list" id="rlCmList"></div>
    <div class="rl-cm-emo" id="rlCmEmo"></div>
    <div class="rl-cm-prev" id="rlCmPrev"><img id="rlCmPrevImg" alt=""><span>صورة مرفقة</span><button id="rlCmPrevX" type="button" aria-label="إزالة">✕</button></div>
    <div class="rl-cm-bar">
      <div class="rl-cm-me" id="rlCmMe"></div>
      <div class="rl-cm-pill">
        <input id="rlCmIn" type="text" placeholder="إضافة تعليق..." autocomplete="off" enterkeyhint="send">
        <button class="ic" id="rlCmImg" type="button" aria-label="صورة"><svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><circle cx="9" cy="9" r="1.7"/><path d="m4 18 5.2-5.2 3.3 3.3 2.5-2.5L20 18"/></svg></button>
        <button class="ic" id="rlCmEmoBtn" type="button" aria-label="إيموجي"><svg viewBox="0 0 24 24"><path d="M20.4 12A8.4 8.4 0 1 0 12 20.4"/><path d="M8.5 14.3a4.2 4.2 0 0 0 6.2.4"/><circle cx="9" cy="10" r=".6" fill="currentColor"/><circle cx="15" cy="10" r=".6" fill="currentColor"/><path d="M17.5 21.5v-5m-2.5 2.5h5"/></svg></button>
        <button class="ic" id="rlCmAt" type="button" aria-label="إشارة"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.6"/><path d="M15.6 8.4v5a2.6 2.6 0 0 0 5.2 0V12a8.8 8.8 0 1 0-3.4 6.9"/></svg></button>
      </div>
      <button class="rl-cm-send" id="rlCmSend" type="button" aria-label="إرسال"><svg viewBox="0 0 24 24"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg></button>
      <input type="file" id="rlCmFile" accept="image/*" style="display:none">
    </div>
  </div>`);
  const EM=['😂','❤️','😍','🔥','👏','😭','🙏','😎','🥹','💯','😅','🤣','👍','🎉','😮','💔','🤝','✨','😢','😡'];
  $('rlCmEmo').innerHTML=EM.map(e=>`<button type="button">${e}</button>`).join('');
  $('rlCmEmo').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; const i=$('rlCmIn'); i.value+=b.textContent; i.focus(); syncSend(); };
  $('rlCmBd').onclick=closeCm; $('rlCmX').onclick=closeCm;
  $('rlCmEmoBtn').onclick=()=>$('rlCmEmo').classList.toggle('show');
  $('rlCmAt').onclick=()=>{ const i=$('rlCmIn'); i.value+=(i.value&&!/\s$/.test(i.value)?' ':'')+'@'; i.focus(); syncSend(); };
  $('rlCmImg').onclick=()=>$('rlCmFile').click();
  $('rlCmFile').onchange=async e=>{
    const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return;
    try{
      const rd=await new Promise((ok,no)=>{ const r=new FileReader(); r.onload=()=>ok(r.result); r.onerror=no; r.readAsDataURL(f); });
      RL.img=await compressDataUrl(rd,900,.8);
      $('rlCmPrevImg').src=RL.img; $('rlCmPrev').classList.add('show'); syncSend();
    }catch(x){ toast('تعذر تحميل الصورة'); }
  };
  $('rlCmPrevX').onclick=()=>{ RL.img=''; $('rlCmPrev').classList.remove('show'); syncSend(); };
  $('rlCmIn').oninput=syncSend;
  $('rlCmIn').onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); sendCm(); } };
  $('rlCmSend').onclick=sendCm;
  $('rlCmList').onclick=cmClick;
}
function syncSend(){ $('rlCmSend').classList.toggle('show',!!($('rlCmIn').value.trim()||RL.img)); }
function avHtml(a){ return authorAvatarMarkup(a); }
function normC(p){
  p.comments=Array.isArray(p.comments)?p.comments:[];
  p.comments.forEach(c=>{ if(!c.id) c.id=uid(); c.likes=Number(c.likes||0); c.replies=Array.isArray(c.replies)?c.replies:[]; c.replies.forEach(r=>{ if(!r.id) r.id=uid(); r.likes=Number(r.likes||0); }); });
}
function rowHtml(c,pid,isRep,parent){
  const a=c.author||currentAuthorSnapshot();
  return `<div class="rl-c ${isRep?'rep':''}" data-cid="${c.id}">
    <div class="rl-c-av">${avHtml(a)}</div>
    <div class="rl-c-b">
      <div class="rl-c-n" dir="auto"><span class="${nfc(a)}">${esc(a.name||'حساب')}</span>${(a.handle||'').replace(/^@/,'')===RL.own?'<em class="by">الكاتب</em>':''}</div>
      ${c.text?`<div class="rl-c-t ${nfc(a)}" dir="auto">${esc(c.text)}</div>`:''}
      ${c.img?`<img class="rl-c-i" src="${c.img}" alt="">`:''}
      <div class="rl-c-a">
        ${c.pinned?'<span class="pin">📌 مثبّت</span>':''}<span class="tm">${agoAr(c.time)}</span>
        <button type="button" data-ca="reply" data-c="${c.id}" ${isRep?`data-par="${parent}"`:''}>رد</button><button type="button" data-ca="copy" data-c="${c.id}">نسخ</button>${(!isRep&&RL.own===curH())?`<button type="button" data-ca="pin" data-c="${c.id}">${c.pinned?'إلغاء التثبيت':'تثبيت'}</button>`:''}${(mineC(c)||RL.own===curH())?`<button type="button" data-ca="del" data-c="${c.id}">حذف</button>`:''}
        <span class="sp"></span>
        <span class="lkw">
          <button type="button" class="dl ${c.disliked?'on':''}" data-ca="dis" data-c="${c.id}">${ICO.dl}</button>
          <button type="button" class="lk ${c.liked?'on':''}" data-ca="like" data-c="${c.id}">${c.likes>0?`<span>${c.likes}</span>`:''}${ICO.lk}</button>
        </span>
      </div>
      ${!isRep&&c.replies.length?`<button type="button" class="rl-c-vr ${RL.open[c.id]?'open':''}" data-ca="rep" data-c="${c.id}"><span>${RL.open[c.id]?'إخفاء الردود':'عرض '+c.replies.length+' ردود'}</span>${ICO.chev}</button>`:''}
      ${!isRep&&RL.open[c.id]?c.replies.map(r=>rowHtml(r,pid,true,c.id)).join(''):''}
    </div>
  </div>`;
}
function renderCm(scrollEnd){
  const p=findPost(RL.cmId); if(!p) return; normC(p); RL.own=ownerH(p); decorateCm();
  document.querySelectorAll('#rlCmSort button').forEach(b=>b.classList.toggle('on',b.dataset.s===RL.cmSort));
  const tot=commentTotal(p);
  $('rlCmN').textContent=tot+' تعليقًا';
  const off=p.allowComments===false;
  $('rlCmList').innerHTML = off ? '<div class="rl-cm-none">التعليقات مغلقة على هذا المنشور</div>'
    : (p.comments.length ? sortedC(p).map(c=>rowHtml(c,p.id,false)).join('') : '<div class="rl-cm-none">لا توجد تعليقات بعد</div>');
  { const rb=$('rlCmRep'); if(rb){ rb.classList.toggle('show',!!RL.reply); rb.firstChild.textContent=RL.reply?('رد على '+RL.reply.name):''; } }
  $('rlCmIn').disabled=off; $('rlCmIn').placeholder=RL.reply?('رد على '+RL.reply.name+'...'):'إضافة تعليق...';
  const me=currentAuthorSnapshot(); $('rlCmMe').innerHTML=avHtml(me);
  if(scrollEnd) $('rlCmList').scrollTop=$('rlCmList').scrollHeight;
}
function findC(p,cid){
  for(const c of p.comments){ if(c.id===cid) return {c,parent:null}; for(const r of c.replies){ if(r.id===cid) return {c:r,parent:c}; } }
  return null;
}
function cmClick(e){
  const b=e.target.closest('[data-ca]'); if(!b) return;
  const p=findPost(RL.cmId); if(!p) return;
  const f=findC(p,b.dataset.c); if(!f) return;
  const act=b.dataset.ca;
  if(cmExtra(act,f,p,b)) return;
  if(act==='like'){ f.c.liked=!f.c.liked; f.c.likes=Math.max(0,f.c.likes+(f.c.liked?1:-1)); if(f.c.liked) f.c.disliked=false; sound(f.c.liked?'like':'soft'); saveData(); renderCm(); }
  else if(act==='dis'){ f.c.disliked=!f.c.disliked; if(f.c.disliked&&f.c.liked){ f.c.liked=false; f.c.likes=Math.max(0,f.c.likes-1); } sound('soft'); saveData(); renderCm(); }
  else if(act==='rep'){ RL.open[b.dataset.c]=!RL.open[b.dataset.c]; renderCm(); }
  else if(act==='reply'){
    const top=f.parent||f.c; RL.reply={id:top.id,name:(f.c.author&&f.c.author.name)||'حساب'};
    if(!RL.open[top.id]&&top.replies.length) RL.open[top.id]=true;
    renderCm(); const i=$('rlCmIn'); i.focus();
  }
}
function sendCm(){
  const p=findPost(RL.cmId); if(!p||p.allowComments===false) return;
  const i=$('rlCmIn'), t=i.value.trim(); if(!t&&!RL.img) return;
  normC(p);
  const obj={id:uid(),text:t,time:Date.now(),author:currentAuthorSnapshot(),likes:0,replies:[]};
  if(RL.img) obj.img=RL.img;
  if(RL.reply){ const par=p.comments.find(c=>c.id===RL.reply.id); if(par){ par.replies.push(obj); RL.open[par.id]=true; } else p.comments.push(obj); }
  else p.comments.push(obj);
  const wasReply=!!RL.reply;
  RL.reply=null; RL.img=''; i.value=''; $('rlCmPrev').classList.remove('show'); syncSend();
  saveData(); sound('send'); renderCm(!wasReply); refreshCounts(p.id);
}
function openCm(id){
  const p=findPost(id); if(!p) return;
  ensureSheet(); RL.cmId=id; RL.reply=null; RL.img=''; $('rlCmPrev').classList.remove('show'); $('rlCmEmo').classList.remove('show'); $('rlCmIn').value=''; syncSend();
  renderCm();
  const v=$('view-reels'); v.classList.add('cm');
  document.querySelectorAll('.rl-item').forEach(i=>i.classList.toggle('cmx',i.dataset.id===id));
  $('rlCmBd').classList.add('show'); requestAnimationFrame(()=>$('rlCm').classList.add('show'));
}
function closeCm(){
  const s=$('rlCm'); if(!s) return;
  s.classList.remove('show'); $('rlCmBd').classList.remove('show');
  const v=$('view-reels'); v.classList.remove('cm');
  document.querySelectorAll('.rl-item.cmx').forEach(i=>i.classList.remove('cmx'));
  const ae=document.activeElement; if(ae&&ae.blur) ae.blur();
}

/* ===== reels: comment tools ===== */
RL.cmSort=RL.cmSort||'top';
function curH(){ return (currentAuthorSnapshot().handle||'').replace(/^@/,''); }
function ownerH(p){ return ((postAuthor(p)||{}).handle||'').replace(/^@/,''); }
function sortedC(p){
  const a=p.comments.slice();
  a.sort((x,y)=>(y.pinned?1:0)-(x.pinned?1:0) || (RL.cmSort==='top' ? ((y.likes+y.replies.length)-(x.likes+x.replies.length)||y.time-x.time) : y.time-x.time));
  return a;
}
function decorateCm(){
  const s=$('rlCm'); if(!s||$('rlCmSort')) return;
  s.insertAdjacentHTML('afterbegin','<div class="gr"></div>');
  $('rlCmN').closest('.rl-cm-count').insertAdjacentHTML('afterend','<div class="rl-cm-sort" id="rlCmSort"><button type="button" data-s="top">الأعلى</button><button type="button" data-s="new">الأحدث</button></div>');
  $('rlCmSort').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; RL.cmSort=b.dataset.s; renderCm(); };
  const bar=s.querySelector('.rl-cm-bar');
  bar.insertAdjacentHTML('beforebegin','<div class="rl-cm-rep" id="rlCmRep"><span></span><button type="button" aria-label="إلغاء">✕</button></div><div class="rl-cm-quick" id="rlCmQ">'+['😂','❤️','🔥','👏','😍','😮','🙏'].map(e=>'<button type="button">'+e+'</button>').join('')+'</div>');
  $('rlCmQ').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; const i=$('rlCmIn'); i.value+=b.textContent; i.focus(); syncSend(); };
  $('rlCmRep').querySelector('button').onclick=()=>{ RL.reply=null; renderCm(); };
}
function mineC(c){ const h=((c.author||{}).handle||'').replace(/^@/,''); return !!h && h===curH(); }
function cmExtra(act,f,p,b){
  if(act==='copy'){ try{ navigator.clipboard.writeText(f.c.text||''); }catch(e){} toast('تم نسخ التعليق'); return true; }
  if(act==='del'){ if(!confirm('حذف هذا التعليق؟')) return true; const arr=f.parent?f.parent.replies:p.comments; arr.splice(arr.indexOf(f.c),1); saveData(); renderCm(); refreshCounts(p.id); return true; }
  if(act==='pin'){ const was=!!f.c.pinned; p.comments.forEach(c=>c.pinned=false); f.c.pinned=!was; saveData(); renderCm(); toast(was?'أُلغي التثبيت':'تم تثبيت التعليق'); return true; }
  return false;
}
/* progress bar */
document.addEventListener('timeupdate',e=>{ const v=e.target; if(!v.closest) return; const it=v.closest('.rl-item'); if(!it||!v.duration) return; const i=it.querySelector('.rl-pg i'); if(i) i.style.width=(v.currentTime/v.duration*100)+'%'; },true);
(function(){ function seek(e){ const g=e.target.closest('.rl-pg'); if(!g) return; const v=g.closest('.rl-item').querySelector('video'); if(!v||!v.duration) return; const r=g.getBoundingClientRect(), x=(e.touches?e.touches[0].clientX:e.clientX); v.currentTime=Math.max(0,Math.min(1,(x-r.left)/r.width))*v.duration; e.stopPropagation(); }
 document.addEventListener('click',seek,true); document.addEventListener('touchmove',seek,{capture:true,passive:true}); })();

/* ===== reels: double-tap to like ===== */
let _lt=0,_lh=null;
document.addEventListener('click',e=>{ const h=e.target.closest('[data-hit]'); if(!h) return; const n=Date.now();
  if(_lh===h&&n-_lt<320){ e.stopPropagation(); e.preventDefault(); const id=h.dataset.hit, p=findPost(id); if(p&&!p.liked) doLike(id); togglePlay(id);
    const d=document.createElement('div'); d.className='rl-heart'; d.textContent='🔥'; d.style.left=e.clientX+'px'; d.style.top=e.clientY+'px'; document.body.appendChild(d); setTimeout(()=>d.remove(),850); _lt=0; return; }
  _lh=h; _lt=n; },true);

/* ---------- init ---------- */
function init(){
  if(RL.ready) return; RL.ready=true;
  const v=$('view-reels');
  $('rlTabFy').onclick=()=>setTab('fy'); $('rlTabFo').onclick=()=>setTab('fo');
  $('rlBack').onclick=()=>{
    RL.mode=null; v.classList.remove('prof'); sound('soft');
    const i=barIndex('حسابي'); if(i>=0&&window.setArcActive) window.setArcActive(i); else go('profile');
  };
  $('rlSearchBtn').onclick=()=>{ v.classList.add('srch'); setTimeout(()=>$('rlSearchInput').focus(),60); };
  $('rlSearchClose').onclick=()=>{ v.classList.remove('srch'); $('rlSearchInput').value=''; if(RL.q){ RL.q=''; render(); } };
  $('rlSearchInput').oninput=e=>{ RL.q=e.target.value; render(); };
  $('rlScroll').addEventListener('click',e=>{
    const b=e.target.closest('[data-act]');
    if(b){
      const id=b.dataset.id, a=b.dataset.act;
      if(a==='like') doLike(id); else if(a==='cm') openCm(id); else if(a==='rep') doRepost(id);
      else if(a==='save') doSave(id); else if(a==='share') sharePost(id); else if(a==='more') openPostMenu(id);
      return;
    }
    const tg=e.target.closest('[data-tag]');
    if(tg){ v.classList.add('srch'); $('rlSearchInput').value=tg.dataset.tag; RL.q=tg.dataset.tag; render(); return; }
    const cap=e.target.closest('[data-cap]');
    if(cap){ cap.classList.toggle('open'); return; }
    const h=e.target.closest('[data-hit]');
    if(h) togglePlay(h.dataset.hit);
  });
}
function barIndex(label){ return Array.from(document.querySelectorAll('#bar .tab')).findIndex(b=>b.textContent.trim()===label); }
function setTab(t){
  if(RL.mode){ RL.mode=null; $('view-reels').classList.remove('prof'); }
  RL.tab=t; $('rlTabFy').classList.toggle('on',t==='fy'); $('rlTabFo').classList.toggle('on',t==='fo'); sound('soft'); render();
}

window.rlOpenFromProfile=function(id,ids){
  RL.pending={mode:'profile',id:id,ids:ids||null}; RL.q=''; const si=$('rlSearchInput'); if(si) si.value=''; const v=$('view-reels'); if(v) v.classList.remove('srch');
  const i=barIndex('ريلز');
  if(i>=0&&window.setArcActive) window.setArcActive(i); else go('reels');
};
const baseDel=window.deletePost;
window.deletePost=function(id){
  baseDel.apply(this,arguments);
  if(document.body.classList.contains('rl-on')) render(true);
};
const baseGo=window.go;
window.go=function(name){
  baseGo.apply(this,arguments);
  const on=name==='reels';
  document.body.classList.toggle('rl-on',on);
  if(on){
    if(RL.pending){ RL.mode=RL.pending.mode; RL.startId=RL.pending.id; RL.ids=RL.pending.ids; RL.pending=null; }
    else{ RL.mode=null; RL.startId=null; }
    $('view-reels').classList.toggle('prof',RL.mode==='profile');
    init(); render();
  }
  else{ stopAll(); closeCm(); }
};
})();

/* ============================================================
   EXPLORE → in-app browser
   - address bar accepts a link or search words
   - links open inside the app (sites that forbid embedding get an "open in new tab" button)
   - searches show real Wikipedia results + one-tap Google / Bing / DuckDuckGo / YouTube
   ============================================================ */
(function(){
const $=id=>document.getElementById(id);
const BR={stack:[],idx:-1,tok:0,noteTimer:null,mode:localStorage.getItem('b1-explore-mode')==='onion'?'onion':'web'};
const I={
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  ext:'<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  globe:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>'
};
const TILES=[
  {n:'Google',u:'https://www.google.com/',c:'#4285f4',ext:1},
  {n:'YouTube',u:'https://www.youtube.com/',c:'#ff2a2a',ext:1},
  {n:'ويكيبيديا',u:'https://ar.wikipedia.org/',c:'#6b7280',l:'W'},
  {n:'Gmail',u:'https://mail.google.com/',c:'#ea4335',ext:1},
  {n:'Maps',u:'https://maps.google.com/',c:'#34a853',ext:1},
  {n:'X',u:'https://x.com/',c:'#111',ext:1},
  {n:'Instagram',u:'https://www.instagram.com/',c:'#c13584',ext:1},
  {n:'TikTok',u:'https://www.tiktok.com/',c:'#0f0f13',ext:1}
];
const ENG=[
  {n:'Google',f:q=>'https://www.google.com/search?q='+encodeURIComponent(q)},
  {n:'Bing',f:q=>'https://www.bing.com/search?q='+encodeURIComponent(q)},
  {n:'DuckDuckGo',f:q=>'https://duckduckgo.com/?q='+encodeURIComponent(q)},
  {n:'Brave',f:q=>'https://search.brave.com/search?q='+encodeURIComponent(q)},
  {n:'Startpage',f:q=>'https://www.startpage.com/sp/search?query='+encodeURIComponent(q)},
  {n:'Ecosia',f:q=>'https://www.ecosia.org/search?q='+encodeURIComponent(q)},
  {n:'YouTube',f:q=>'https://www.youtube.com/results?search_query='+encodeURIComponent(q)},
  {n:'صور Google',f:q=>'https://www.google.com/search?tbm=isch&q='+encodeURIComponent(q)}
];
function bdata(){ DATA.browser=DATA.browser||{}; DATA.browser.recent=Array.isArray(DATA.browser.recent)?DATA.browser.recent:[]; return DATA.browser; }
function onionHost(raw){
  try{
    const u=new URL(/^https?:\/\//i.test(raw)?raw:'http://'+raw);
    return u.hostname.toLowerCase().endsWith('.onion') || u.hostname.toLowerCase()==='.onion';
  }catch(e){ return false; }
}
function onionMeta(raw){
  const cleaned=String(raw||'').trim().replace(/^https?:\/\//i,'').replace(/\/+$/,'');
  const host=cleaned.split(/[\/?#]/)[0].toLowerCase();
  const label=host.endsWith('.onion')?host.slice(0,-6):host;
  const version=label.length===56?'v3':(label.length===16?'v2/legacy':'unknown');
  const charsOk=/^[a-z2-7]+$/i.test(label);
  return {cleaned,host,label,version,charsOk,validOnion:label.length===56&&charsOk};
}
function parse(raw){
  const t=String(raw||'').trim(); if(!t) return null;
  if(/^https?:\/\/\S+$/i.test(t)) return {type:onionHost(t)?'onion':'url',val:t};
  if(!/\s/.test(t) && (/^(www\.)?[\p{L}\p{N}-]+(\.[\p{L}\p{N}-]+)+(:\d+)?([\/?#]\S*)?$/u.test(t) || /^localhost(:\d+)?([\/?#]\S*)?$/i.test(t))){
    const normalized='https://'+t.replace(/^\/+/,'');
    return {type:onionHost(normalized)?'onion':'url',val:normalized};
  }
  return {type:(BR.mode==='onion' || /\.onion(?:[\/:?#]|$)/i.test(t))?'onionSearch':'search',val:t};
}
function hide(){ ['brHome','brRes'].forEach(i=>$(i).classList.remove('show')); $('brFrame').classList.remove('show'); }
function setProg(p){ const b=$('brProg').firstElementChild; b.style.transition=p===0?'none':'width .3s'; b.style.width=p+'%'; }
function showNote(on){ $('brNote').classList.toggle('show',!!on); }
function syncBar(e){
  const inp=$('brIn'); 
  inp.value=e?(e.type==='home'?'':e.val):'';
  $('brPill').classList.toggle('has',!!inp.value);
  const ic=$('brPillIc'); ic.outerHTML=(e&&e.type==='url'&&/^https:/i.test(e.val)?I.lock:(e&&e.type==='url'?I.globe:I.search)).replace('<svg','<svg id="brPillIc"');
  $('brBack').disabled=BR.idx<=0; $('brFwd').disabled=BR.idx>=BR.stack.length-1;
}
function go(e,push){
  if(push!==false){ BR.stack=BR.stack.slice(0,BR.idx+1); BR.stack.push(e); BR.idx=BR.stack.length-1; }
  show(e);
}
function show(e){
  const tok=++BR.tok; hide(); showNote(false); clearTimeout(BR.noteTimer); syncBar(e); setProg(0);
  if(e.type==='home'){ $('brFrame').removeAttribute('src'); renderHome(); $('brHome').classList.add('show'); $('brHome').scrollTop=0; return; }
  if(e.type==='search'){ $('brFrame').removeAttribute('src'); renderResults(e.val,tok,false); $('brRes').classList.add('show'); $('brRes').scrollTop=0; return; }
  if(e.type==='onionSearch'){ $('brFrame').removeAttribute('src'); renderResults(e.val,tok,true); $('brRes').classList.add('show'); $('brRes').scrollTop=0; return; }
  if(e.type==='onion'){ $('brFrame').removeAttribute('src'); renderOnion(e.val); $('brRes').classList.add('show'); $('brRes').scrollTop=0; return; }
  // url
  const f=$('brFrame'); f.classList.add('show'); setProg(12);
  let w=12; clearInterval(BR.pt); BR.pt=setInterval(()=>{ w=Math.min(88,w+(90-w)*.12); setProg(w); },250);
  f.onload=()=>{ if(tok!==BR.tok) return; clearInterval(BR.pt); setProg(100); setTimeout(()=>setProg(0),350); BR.noteTimer=setTimeout(()=>{ if(tok===BR.tok) showNote(true); },700); };
  f.src=e.val;
}
function renderHome(){
  const rec=bdata().recent;
  $('brHome').innerHTML=`
    <div class="br-hero"><h1>استكشف</h1><p>بحث ويب عام + فحص عناوين Onion</p></div>
    <div class="br-mode" role="tablist" aria-label="نوع البحث">
      <button type="button" class="${BR.mode==='web'?'sel':''}" data-mode="web">ويب كامل</button>
      <button type="button" class="${BR.mode==='onion'?'sel':''}" data-mode="onion">Onion / Dark Web</button>
    </div>
    <div class="br-bigsearch" id="brBig">${I.search}<span>${BR.mode==='onion'?'ابحث عن اسم أو رابط Onion…':'ابحث عن أي شيء أو اكتب رابطًا'}</span></div>
    <div class="br-sec"><span>مواقع سريعة</span></div>
    <div class="br-tiles">${TILES.map((t,i)=>`<button class="br-tile" data-t="${i}" type="button"><i style="background:${t.c}">${escapeHtml(t.l||t.n[0])}</i>${t.ext?`<em>${I.ext}</em>`:''}<span>${escapeHtml(t.n)}</span></button>`).join('')}</div>
    <div class="br-sec"><span>عمليات البحث الأخيرة</span>${rec.length?'<button type="button" id="brClr">مسح</button>':''}</div>
    <div class="br-rec">${rec.length?rec.map((r,i)=>`<button class="br-ri" data-r="${i}" type="button">${I.clock}<span>${escapeHtml(r)}</span></button>`).join(''):'<div class="br-empty">لا توجد عمليات بحث بعد</div>'}</div>`;
}
function onionSearchLinks(q){
  const qq='site:.onion '+q;
  return [
    {n:'Google',u:'https://www.google.com/search?q='+encodeURIComponent(qq)},
    {n:'Bing',u:'https://www.bing.com/search?q='+encodeURIComponent(qq)},
    {n:'DuckDuckGo',u:'https://duckduckgo.com/?q='+encodeURIComponent(qq)},
    {n:'Brave',u:'https://search.brave.com/search?q='+encodeURIComponent(qq)}
  ];
}
function renderOnion(raw){
  const m=onionMeta(raw);
  const safe=escapeHtml(m.host||raw);
  const links=onionSearchLinks(m.host||raw);
  $('brRes').innerHTML=`
    <div class="br-onion-head">
      <span class="br-onion-badge">ONION</span>
      <div><b>وضع Onion / Dark Web</b><small>بحث وفحص عنوان فقط — لا يتم فتح شبكة Tor داخل الصفحة.</small></div>
    </div>
    <div class="br-onion-card">
      <div class="br-onion-url">${safe}</div>
      <div class="br-onion-grid">
        <div><span>الإصدار</span><b>${m.version==='v3'?'v3 Onion':m.version==='v2/legacy'?'v2 / Legacy':'غير معروف'}</b></div>
        <div><span>الصيغة</span><b>${m.validOnion?'صالحة مبدئيًا':'غير مكتملة'}</b></div>
      </div>
      <div class="br-onion-actions">
        <button type="button" id="brCopyOnion">نسخ العنوان</button>
        <button type="button" id="brSearchOnion">البحث عن العنوان</button>
      </div>
      <div class="br-msg">لا أفتح عناوين Onion مباشرة من داخل Black 1. يمكنك استخدام البحث العام للعثور على الصفحات التي تذكر العنوان.</div>
    </div>
    <div class="br-sec"><span>محركات بحث للعنوان</span></div>
    <div class="br-eng br-eng-onion">${links.map(x=>`<a href="${x.u}" target="_blank" rel="noopener noreferrer">${escapeHtml(x.n)}${I.ext}</a>`).join('')}</div>`;
  const c=$('brCopyOnion');
  if(c)c.onclick=async()=>{try{await navigator.clipboard.writeText(m.cleaned);toast('تم نسخ عنوان Onion 📋')}catch(e){toast('تعذر النسخ')}};
  const q=$('brSearchOnion');
  if(q)q.onclick=()=>submit(m.host||raw.replace(/^https?:\/\//i,''));
}
function hl(t){ return String(t||'').replace(/<span class="searchmatch">/g,'\u0001').replace(/<\/span>/g,'\u0002').replace(/<[^>]+>/g,''); }
function snip(t){ return escapeHtml(hl(t)).replace(/\u0001/g,'<b>').replace(/\u0002/g,'</b>'); }
async function renderResults(q,tok,isOnion=false){
  const res=$('brRes');
  const baseQ=isOnion ? 'site:.onion '+q : q;
  const engines=(isOnion?ENG.filter(e=>['Google','Bing','DuckDuckGo','Brave'].includes(e.n)):ENG);
  const eng=`<div class="br-eng">${engines.map(e=>`<a href="${e.f(baseQ)}" target="_blank" rel="noopener noreferrer">${escapeHtml(e.n)}${I.ext}</a>`).join('')}</div>`;
  res.innerHTML=(isOnion?`<div class="br-onion-head"><span class="br-onion-badge">ONION SEARCH</span><div><b>بحث عن «${escapeHtml(q)}»</b><small>النتائج من محركات ويب عادية تبحث عن صفحات مفهرسة تشير إلى نطاقات Onion.</small></div></div>`:'')+eng+'<div class="br-spin"></div>';
  const lang=/[\u0600-\u06FF]/.test(q)?'ar':'en';
  try{
    const ctl=new AbortController(); const to=setTimeout(()=>ctl.abort(),12000);
    const r=await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=12&format=json&origin=*`,{signal:ctl.signal});
    clearTimeout(to);
    const j=await r.json(); if(tok!==BR.tok) return;
    const items=(j&&j.query&&j.query.search)||[];
    if(!items.length){ res.innerHTML=(isOnion?`<div class="br-onion-head"><span class="br-onion-badge">ONION SEARCH</span><div><b>لا توجد نتائج مفهرسة في ويكيبيديا</b><small>استخدم أحد المحركات بالأعلى لبحث نطاقات Onion.</small></div></div>`:'')+eng+`<div class="br-msg">لا توجد نتائج في ويكيبيديا لـ «${escapeHtml(q)}».<br>استخدم أحد محركات البحث بالأعلى لعرض نتائج الويب أو صفحات Onion المفهرسة.</div>`; return; }
    res.innerHTML=(isOnion?`<div class="br-onion-head"><span class="br-onion-badge">ONION SEARCH</span><div><b>نتائج عامة</b><small>قد تظهر فقط الصفحات التي فهرستها محركات البحث العادية.</small></div></div>`:'')+eng+`<div class="br-src">نتائج من ${lang==='ar'?'ويكيبيديا العربية':'Wikipedia'} — وللويب الكامل اختر محرك بحث من الأعلى</div>`+items.map(it=>{
      const url=`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(it.title.replace(/ /g,'_'))}`;
      return `<button class="br-r" type="button" data-u="${escapeHtml(url)}"><div class="u">${escapeHtml((()=>{try{return decodeURI(url)}catch(x){return url}})().replace(/^https:\/\//,''))}</div><div class="t">${escapeHtml(it.title)}</div><div class="d">${snip(it.snippet)}…</div></button>`;
    }).join('');
  }catch(err){
    if(tok!==BR.tok) return;
    res.innerHTML=(isOnion?`<div class="br-onion-head"><span class="br-onion-badge">ONION SEARCH</span><div><b>تعذر تحميل النتائج الداخلية</b><small>استخدم محرك بحث خارجي لصفحات Onion المفهرسة.</small></div></div>`:'')+eng+'<div class="br-msg">تعذّر تحميل النتائج الآن. تأكد من الاتصال بالإنترنت أو افتح أحد محركات البحث بالأعلى.</div>';
  }
}
function submit(raw){
  const e=parse(raw); if(!e) return;
  if(e.type==='search' || e.type==='onionSearch'){
    const d=bdata(); d.recent=[e.val].concat(d.recent.filter(x=>x!==e.val)).slice(0,12); saveData();
  }
  sound('soft'); go(e,true); const i=$('brIn'); if(i) i.blur();
}
function curUrl(){ const e=BR.stack[BR.idx]; if(!e) return ''; if(e.type==='url') return e.val; if(e.type==='search') return ENG[0].f(e.val); if(e.type==='onionSearch') return ENG[0].f('site:.onion '+e.val); return ''; }
function build(){
  const v=$('view-explore'); if(!v||v.dataset.br) return; v.dataset.br='1';
  const old=document.createElement('div'); old.id='exOld'; old.style.display='none';
  while(v.firstChild) old.appendChild(v.firstChild);
  v.classList.add('br');
  v.innerHTML=`<div class="br-wrap">
    <div class="br-bar">
      <button class="br-nb" id="brBack" type="button" aria-label="رجوع" disabled><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button>
      <button class="br-nb" id="brFwd" type="button" aria-label="للأمام" disabled><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button>
      <div class="br-pill" id="brPill">${I.search.replace('<svg','<svg id="brPillIc"')}<input id="brIn" type="text" inputmode="url" enterkeyhint="go" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="ابحث أو اكتب رابطًا"><button class="x" id="brX" type="button" aria-label="مسح"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <button class="br-nb" id="brReload" type="button" aria-label="تحديث"><svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0 2 5"/><path d="M20 4v7h-7"/></svg></button>
      <button class="br-nb" id="brHomeBtn" type="button" aria-label="الرئيسية"><svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a1 1 0 0 0 1-1v-9"/></svg></button>
    </div>
    <div class="br-prog" id="brProg"><i></i></div>
    <div class="br-note" id="brNote"><span>لا يظهر الموقع؟ بعض المواقع تمنع عرضها داخل التطبيق.</span><button id="brOpenExt" type="button">فتح في نافذة جديدة</button><button class="nx" id="brNoteX" type="button" aria-label="إغلاق">✕</button></div>
    <div class="br-body">
      <div class="br-page" id="brHome"></div>
      <div class="br-page" id="brRes"></div>
      <iframe class="br-frame" id="brFrame" title="المتصفح" referrerpolicy="no-referrer" allow="fullscreen; clipboard-write" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads"></iframe>
    </div>
  </div>`;
  v.appendChild(old);
  const inp=$('brIn');
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); submit(inp.value); } });
  inp.addEventListener('input',()=>{
    $('brPill').classList.toggle('has',!!inp.value);
    const modeOnion=/\.onion(?:[\/:?#]|$)/i.test(inp.value) || BR.mode==='onion';
    $('brPill').title=modeOnion?'وضع Onion / Dark Web':'بحث ويب';
  });
  inp.addEventListener('focus',()=>setTimeout(()=>{ try{inp.select();}catch(x){} },30));
  $('brX').onclick=()=>{ inp.value=''; $('brPill').classList.remove('has'); inp.focus(); };
  $('brBack').onclick=()=>{ if(BR.idx>0){ BR.idx--; show(BR.stack[BR.idx]); } };
  $('brFwd').onclick=()=>{ if(BR.idx<BR.stack.length-1){ BR.idx++; show(BR.stack[BR.idx]); } };
  $('brReload').onclick=()=>{ if(BR.idx>=0){ sound('soft'); show(BR.stack[BR.idx]); } };
  $('brHomeBtn').onclick=()=>{ sound('soft'); go({type:'home'},true); };
  $('brNoteX').onclick=()=>showNote(false);
  $('brOpenExt').onclick=()=>{ const u=curUrl(); if(u) window.open(u,'_blank','noopener'); };
  $('brHome').addEventListener('click',e=>{
    const mode=e.target.closest('[data-mode]');
    if(mode){
      BR.mode=mode.dataset.mode==='onion'?'onion':'web';
      localStorage.setItem('b1-explore-mode',BR.mode);
      renderHome(); sound('soft'); return;
    }
    if(e.target.closest('#brBig')){ inp.focus(); return; }
    if(e.target.closest('#brClr')){ bdata().recent=[]; saveData(); renderHome(); return; }
    const t=e.target.closest('[data-t]');
    if(t){ const x=TILES[+t.dataset.t]; if(x.ext){ window.open(x.u,'_blank','noopener'); } else { go({type:'url',val:x.u},true); } return; }
    const r=e.target.closest('[data-r]');
    if(r){ submit(bdata().recent[+r.dataset.r]); }
  });
  $('brRes').addEventListener('click',e=>{
    const r=e.target.closest('[data-u]'); if(r){ go({type:'url',val:r.dataset.u},true); }
  });
  go({type:'home'},true);
}
build();
})();
