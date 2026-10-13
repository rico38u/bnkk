/* ============== SOUND ============== */
let actx;
function ac(){ if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)(); if(actx.state==='suspended') actx.resume(); return actx; }
function tone(freq,dur,type,vol,delay){
  const c=ac(); const t0=c.currentTime+(delay||0);
  const osc=c.createOscillator(), gain=c.createGain();
  osc.type=type||'sine'; osc.frequency.setValueAtTime(freq,t0);
  gain.gain.setValueAtTime(0,t0); gain.gain.linearRampToValueAtTime(vol||0.06,t0+0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  osc.connect(gain).connect(c.destination); osc.start(t0); osc.stop(t0+dur+0.02);
}
function sound(kind){
  try{
    if(kind==='nav'){ tone(520,.09,'sine',.05); tone(780,.11,'sine',.035,.02); }
    else if(kind==='soft'){ tone(660,.07,'sine',.045); }
    else if(kind==='pop'){ tone(880,.06,'sine',.05); tone(1180,.08,'sine',.03,.03); }
    else if(kind==='like'){ tone(700,.05,'sine',.05); tone(1050,.09,'sine',.045,.05); tone(1400,.09,'sine',.03,.1); }
    else if(kind==='send'){ tone(950,.05,'triangle',.045); tone(1300,.08,'triangle',.03,.04); }
    else if(kind==='live'){ tone(440,.12,'sine',.05); tone(660,.15,'sine',.04,.08); }
  }catch(e){}
}
document.addEventListener('click',function(e){ const el=e.target.closest('[data-sound]'); if(el) sound(el.getAttribute('data-sound')); },true);

/* ============== TOAST ============== */
let toastTimer;
function toast(msg){
  const t=document.getElementById('toast');
  t.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'+msg;
  t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2200);
}

/* ============== LOCAL ACCOUNTS / LOGIN (device-local — no server exists here) ============== */
const ACCOUNTS_KEY='black1_accounts_v1', SESSION_KEY='black1_session_v1';
let currentUser=null, authMode='login', authPassVisible=false;
function getAccounts(){ try{ return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)||'{}'); }catch(e){ return {}; } }
function saveAccounts(a){ try{ localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a)); }catch(e){} }
async function hashPass(pw){
  try{
    const enc=new TextEncoder().encode('black1::'+pw);
    const buf=await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(e){ return 'plain:'+pw; }
}
function dataStorageKey(){ return 'black1_data__'+(currentUser||'guest'); }
function toggleAuthPass(id,el){
  const inp=document.getElementById(id); if(!inp)return;
  inp.type = inp.type==='password' ? 'text' : 'password';
  el.style.opacity = inp.type==='text' ? '1' : '';
  el.style.color = inp.type==='text' ? 'var(--accent1)' : '';
}
function setAuthMode(mode){
  authMode=mode; const su=mode==='signup';
  document.getElementById('authConfirmField').style.display=su?'flex':'none';
  document.getElementById('authTitle').textContent = su ? 'حساب جديد' : 'تسجيل الدخول';
  document.getElementById('authSub').textContent = su ? 'أنشئ حسابك للمتابعة' : 'أدخل بياناتك للمتابعة';
  document.getElementById('auth_name').placeholder = su ? 'الاسم الظاهر' : 'اسم المستخدم';
  document.getElementById('auth_user').placeholder = su ? 'يوزر (إنجليزي)' : 'يوزر';
  document.getElementById('auth_pass').autocomplete = su ? 'new-password' : 'current-password';
  document.getElementById('authSubmitBtn').textContent = su ? 'إنشاء الحساب' : 'دخول';
  document.getElementById('authSubmitBtn').onclick = su ? submitAuthSignup : submitAuthLogin;
  document.getElementById('authSwitch').textContent = su ? 'لديك حساب؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب';
  document.getElementById('authErr').textContent='';
}
function authError(msg){
  document.getElementById('authErr').innerHTML='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m12 8 0 5"/><path d="M12 16h.01"/><circle cx="12" cy="12" r="9"/></svg>'+escapeHtml(msg);
  const card=document.getElementById('authCard');
  card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
}
async function submitAuthLogin(){
  let u=(document.getElementById('auth_user').value||'').trim();
  const dn=(document.getElementById('auth_name').value||'').trim();
  const p=document.getElementById('auth_pass').value||'';
  if((!u&&!dn)||!p){authError('أدخل اسم المستخدم وكلمة المرور');return;}
  const accounts=getAccounts();
  if(!u&&dn){ const m=Object.values(accounts).find(a=>(a.name||'').trim().toLowerCase()===dn.toLowerCase()||a.username.toLowerCase()===dn.toLowerCase()); u=m?m.username:dn; }
  const acc=accounts[u.toLowerCase()];
  if(!acc){authError('لا يوجد حساب بهذا الاسم على هذا الجهاز');return;}
  const hash=await hashPass(p);
  if(acc.passHash!==hash){authError('كلمة المرور غير صحيحة');return;}
  currentUser=acc.username;
  try{ localStorage.setItem(SESSION_KEY, currentUser); }catch(e){}
  await enterApp();
}
async function submitAuthSignup(){
  const name=(document.getElementById('auth_name').value||'').trim();
  const u=(document.getElementById('auth_user').value||'').trim();
  const p=document.getElementById('auth_pass').value||'';
  const p2=document.getElementById('auth_pass2').value||'';
  if(!name){authError('أدخل الاسم الظاهر');return;}
  if(!/^[a-zA-Z0-9_.]{3,24}$/.test(u)){authError('اسم المستخدم من 3-24 حرفًا إنجليزيًا/أرقام فقط');return;}
  if(p.length<6){authError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');return;}
  if(p!==p2){authError('كلمتا المرور غير متطابقتين');return;}
  const accounts=getAccounts();
  if(accounts[u.toLowerCase()]){authError('اسم المستخدم هذا مستخدم بالفعل');return;}
  const nameTaken=Object.values(accounts).some(a=>(a.name||'').trim().toLowerCase()===name.toLowerCase());
  if(nameTaken){authError('هذا الاسم الظاهر مستخدم بالفعل من شخص آخر على هذا الجهاز');return;}
  const passHash=await hashPass(p);
  accounts[u.toLowerCase()]={username:u,name,passHash,createdAt:Date.now()};
  saveAccounts(accounts);
  currentUser=u;
  try{ localStorage.setItem(SESSION_KEY, currentUser); }catch(e){}
  await enterApp(name,u);
}

function confirmLogout(){
  if(confirm('هل تريد تسجيل الخروج من حسابك؟')) logoutUser();
}
function logoutUser(){
  try{ localStorage.removeItem(SESSION_KEY); }catch(e){}
  location.reload();
}
async function enterApp(freshName, freshHandle){
  document.getElementById('authGate').classList.add('hide');
  document.getElementById('splash').classList.remove('hide');
  await loadData();
  if(freshName){
    DATA.profile.name=freshName; DATA.profile.handle=(freshHandle||'').toLowerCase();
    DATA.profile.verified=true; saveData(); renderProfile();
  }
  setTimeout(()=>{ document.getElementById('splash').classList.add('hide'); },900);
}
function boot(){
  let session=null; try{ session=localStorage.getItem(SESSION_KEY); }catch(e){}
  const accounts=getAccounts();
  if(session && accounts[session.toLowerCase()]){
    currentUser=accounts[session.toLowerCase()].username;
    document.getElementById('authGate').classList.add('hide');
    loadData().then(()=>{ setTimeout(()=>{ document.getElementById('splash').classList.add('hide'); },1300); });
  }else{
    document.getElementById('splash').classList.add('hide');
    document.getElementById('authGate').classList.remove('hide');
    setAuthMode('signup');
    try{ b1IntroPlay(); }catch(e){}
  }
}

/* ============== REAL DATA STORE (persisted) ============== */

const DEFAULT_PROFILE_AVATAR = "";
const DEFAULT_PROFILE_COVER = "";

let DATA = {
  posts:[], games:[], cart:[],
  profile:{
    name:'', handle:'', bio:'', avatar:'',
    verified:false, likes:0, followers:0, following:0, website:'', location:'', pronouns:'', status:'', gallery:[], avatarData:'', coverData:'', avatarScale:1, avatarX:50, avatarY:50,
    settings:{
      privateAccount:false, activityStatus:true,
      notifications:true, sounds:true, darkMode:true, reduceMotion:false,
      autoplay:true, highQuality:false,
      comments:true, mentions:true, personalizedFeed:true,
      twoStep:true, loginAlerts:true, language:'العربية', accent:'default', notifyComments:true, notifyFollows:true, blockedWords:'', displayNameOnProfile:true
    }
  }
};
let storageOK = true;
async function loadData(){
  try{
    let raw = null;
    if(window.storage && typeof window.storage.get==='function'){
      const r = await window.storage.get(dataStorageKey(), false);
      raw = r && r.value ? r.value : null;
    }
    if(!raw) raw = localStorage.getItem(dataStorageKey());
    if(raw){
      const saved=JSON.parse(raw);
      DATA = Object.assign(DATA, saved);
      DATA.profile = Object.assign({
        name:'',handle:'',bio:'',avatar:'',avatarData:'',avatarScale:1,avatarX:50,avatarY:50,verified:false,
        website:'',location:'',pronouns:'',status:'',gallery:[],settings:{}
      }, DATA.profile||{});
      DATA.profile.verified = DATA.profile.verified === true; DATA.profile.gallery = Array.isArray(DATA.profile.gallery)?DATA.profile.gallery:[]; DATA.profile.status = DATA.profile.status||'';
      DATA.profile.avatarData = DATA.profile.avatarData || ''; DATA.profile.coverData = DATA.profile.coverData || ''; DATA.games=DATA.games||[]; DATA.cart=DATA.cart||[];
      DATA.profile.avatarScale = Number(DATA.profile.avatarScale||1);
      DATA.profile.avatarX = Number(DATA.profile.avatarX||50);
      DATA.profile.avatarY = Number(DATA.profile.avatarY||50);
       DATA.profile.likes = Number(DATA.profile.likes||0); DATA.profile.followers = Number(DATA.profile.followers||0); DATA.profile.following = Number(DATA.profile.following||0);
      DATA.profile.settings = Object.assign({
        privateAccount:false,activityStatus:true,notifications:true,
        sounds:true,darkMode:true,reduceMotion:false,autoplay:true,highQuality:false,
        comments:true,mentions:true,personalizedFeed:true,
        twoStep:true,loginAlerts:true,language:'العربية',notifyComments:true,notifyFollows:true,blockedWords:'',displayNameOnProfile:true
      }, DATA.profile.settings||{});
    }
  }catch(e){ storageOK = false; }
  DATA.posts=(DATA.posts||[]).map(normalizePost);
  renderAll();
}
/* ===== غلاف فيديو: تخزين محلي كبير (IndexedDB) ===== */
function coverKey(){ return 'cover::'+(currentUser||'guest'); }
const CVDB={
  open(){ return new Promise((ok,no)=>{ const r=indexedDB.open('black1_media',1); r.onupgradeneeded=()=>r.result.createObjectStore('kv'); r.onsuccess=()=>ok(r.result); r.onerror=()=>no(r.error); }); },
  async get(k){ try{ const db=await this.open(); return await new Promise(ok=>{ const q=db.transaction('kv').objectStore('kv').get(k); q.onsuccess=()=>ok(q.result||''); q.onerror=()=>ok(''); }); }catch(e){ return ''; } },
  async set(k,v){ try{ const db=await this.open(); await new Promise((ok,no)=>{ const t=db.transaction('kv','readwrite'); t.objectStore('kv').put(v,k); t.oncomplete=ok; t.onerror=()=>no(t.error); }); return true; }catch(e){ return false; } },
  async del(k){ try{ const db=await this.open(); await new Promise(ok=>{ const t=db.transaction('kv','readwrite'); t.objectStore('kv').delete(k); t.oncomplete=ok; t.onerror=ok; }); }catch(e){} }
};
function isVideoCover(v){ return v==='idb:cover' || /^data:video\//.test(v||''); }
let __cvSrc='';
async function pfCoverVideo(cv){
  const box=document.getElementById('pfCover'), v=document.getElementById('pfCoverVid'); if(!box||!v) return;
  if(!cv){ box.classList.remove('has-vid'); if(!v.paused) v.pause(); v.removeAttribute('src'); __cvSrc=''; return; }
  let data=cv; if(cv==='idb:cover') data=await CVDB.get(coverKey());
  if(!data){ box.classList.remove('has-vid'); return; }
  const sig=data.length+':'+data.slice(-32);
  if(__cvSrc!==sig){
    __cvSrc=sig; let url=data;
    try{ const b=await (await fetch(data)).blob(); url=URL.createObjectURL(b); }catch(e){}
    v.src=url; v.load();
  }
  v.muted=true; box.classList.add('has-vid');
  const pr=v.play(); if(pr&&pr.catch) pr.catch(()=>{});
}
async function saveData(){
  try{
    const cd=DATA.profile&&DATA.profile.coverData;
    if(cd && /^data:video\//.test(cd)){ if(await CVDB.set(coverKey(),cd)) DATA.profile.coverData='idb:cover'; else DATA.profile.coverData=''; }
  }catch(e){}
  const raw=JSON.stringify(DATA);
  try{
    if(window.storage && typeof window.storage.set==='function') await window.storage.set(dataStorageKey(), raw, false);
  }catch(e){ storageOK=false; }
  try{ localStorage.setItem(dataStorageKey(), raw); }catch(e){ storageOK=false; }
}
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function timeAgo(ts){
  const s = Math.floor((Date.now()-ts)/1000);
  if(s<60) return 'الآن';
  if(s<3600) return 'منذ '+Math.floor(s/60)+' د';
  if(s<86400) return 'منذ '+Math.floor(s/3600)+' س';
  return 'منذ '+Math.floor(s/86400)+' يوم';
}

/* ============== MODAL ============== */
function closeModal(){ document.querySelectorAll('#modalBox video').forEach(v=>{try{v.pause()}catch(e){}}); document.getElementById('modalOverlay').classList.remove('show'); document.getElementById('modalBox').classList.remove('v7-modal'); }

/* ============== NAV / VIEWS ============== */
function go(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='profile') renderProfile(true);
  if(typeof lqView==='function') lqView(name);
}

function compressDataUrl(src,max,q){
  return new Promise((ok,no)=>{
    const im=new Image();
    im.onload=()=>{
      let w=im.naturalWidth,h=im.naturalHeight; const k=Math.min(1,max/Math.max(w,h));
      w=Math.max(1,Math.round(w*k));h=Math.max(1,Math.round(h*k));
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);
      ok(c.toDataURL('image/jpeg',q||.86));
    };
    im.onerror=()=>no(new Error('img'));
    im.src=src;
  });
}
function fmtCount(n){
  n=Number(n||0);
  if(n>=1e6) return (n/1e6).toFixed(1).replace(/\.0$/,'')+'M';
  if(n>=1e3) return (n/1e3).toFixed(1).replace(/\.0$/,'')+'K';
  return String(n);
}
/* ============== POSTS ============== */
function downloadSvg(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';}
function shareSvg(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>';}
function bookmarkSvg(f){return '<svg viewBox="0 0 24 24" fill="'+(f?'currentColor':'none')+'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';}
function emptySvg(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/><circle cx="8" cy="14" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="14" r="1.4" fill="currentColor" stroke="none"/></svg>';}



function currentAuthorSnapshot(){
  return {
    name: DATA.profile.name || '',
    handle: DATA.profile.handle || '',
    avatar: DATA.profile.avatar || '🫵',
    avatarData: DATA.profile.avatarData || '',
    verified: DATA.profile.verified !== false,
    nasta: !!(DATA.profile.settings && DATA.profile.settings.nastaFont)
  };
}
function postAuthor(p){ return p.author || currentAuthorSnapshot(); }
/* returns 'nf' when this author wrote/chose the Nastaliq font; items saved before the option existed follow the owner's current setting */
window.nfc=function(a){
  if(!a) return '';
  if(a.nasta!==undefined) return a.nasta?'nf':'';
  const h=String(a.handle||'').replace(/^@/,'');
  return (h && h===String(DATA.profile.handle||'').replace(/^@/,'') && DATA.profile.settings && DATA.profile.settings.nastaFont)?'nf':'';
};
function authorAvatarMarkup(a){
  if(a && a.avatarData) return `<img src="${a.avatarData}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  return escapeHtml((a&&a.avatar)||'👤');
}
function hashHtml(t){ return escapeHtml(t).replace(/(^|\s)#([\p{L}\p{N}_]+)/gu,(m,a,b)=>a+'<span class="hashtag" data-tag="'+b+'">#'+b+'</span>'); }
const __tap={id:null,t:0,h:0};
function fpBurst(el,x,y){
  const b=document.createElement('div'); b.className='fp-burst'; b.style.left=x+'px'; b.style.top=y+'px';
  b.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2 0 3.5 1 5.3 3 1.8-2 3.3-3 5.3-3 3.7 0 5.8 3.800 4.300 7.200C19.500 16.400 12 21 12 21z"/></svg>';
  el.appendChild(b); setTimeout(()=>b.remove(),850);
}
function fpSync(id){
  const p=findPost(id), el=document.getElementById('post-'+id); if(!p||!el) return;
  const l=el.querySelector('.fp-like'); if(l){ l.classList.toggle('liked',!!p.liked); l.querySelector('b').textContent=fmtCount(p.likes); }
  const s=el.querySelector('.fp-save'); if(s) s.classList.toggle('saved',!!p.saved);
}
function openPostMenu(id){
  const p=normalizePost(findPost(id)); if(!p) return;
  const own=postAuthor(p).handle===(DATA.profile.handle||'');
  const overlay=document.getElementById('modalOverlay'), box=document.getElementById('modalBox');
  const svg=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const items=[
    [bookmarkSvg(p.saved),p.saved?'إزالة من المحفوظات':'حفظ المنشور',`toggleSave('${id}');closeModal()`,''],
    [shareSvg(),'مشاركة',`closeModal();sharePost('${id}')`,''],
    [downloadSvg(),p.mediaData?'تنزيل الملف':'تنزيل النص',`closeModal();downloadPost('${id}')`,'']
  ];
  if(p.text) items.splice(2,0,[svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),'نسخ النص',`copyPostText('${id}')`,'']);
  if(own) items.push([svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m6 6 1 14h10l1-14"/>'),'حذف المنشور',`closeModal();deletePost('${id}')`,'danger']);
  box.innerHTML=`<div class="modal-title">خيارات المنشور</div>`+items.map(i=>`<div class="pm-item ${i[3]}" onclick="${i[2]}">${i[0]}<span>${i[1]}</span></div>`).join('')+`<div class="modal-actions" style="margin-top:12px"><div class="modal-cancel" onclick="closeModal()">إغلاق</div></div>`;
  overlay.classList.add('show');
}
async function copyPostText(id){
  const p=findPost(id); closeModal(); if(!p) return;
  try{ await navigator.clipboard.writeText(((p.title?p.title+'\n':'')+(p.text||'')).trim()); toast('تم نسخ النص 📋'); }catch(e){ toast('تعذّر النسخ'); }
}
/* ============== PUBLISH STUDIO (reference: video upload page) ============== */
const PS_CATS=['سفر ورياضة','ترفيه','تعليم','أخبار','ألعاب','طعام وطبخ','تقنية','أسلوب حياة','أخرى'];
let PS=null;
function psNew(){ return {data:'',type:'',name:'',cover:'',coverCustom:false,loading:false,duration:0,draftId:null,blobUrl:'',vid:null}; }
const PS_CAM='<svg viewBox="0 0 64 64" width="92" height="92" fill="none"><rect x="6" y="20" width="36" height="28" rx="6" fill="#aab0bd"/><circle cx="17" cy="16" r="7" fill="#aab0bd"/><circle cx="31" cy="15" r="6" fill="#aab0bd"/><path d="M42 30l14-8v20l-14-8z" fill="#aab0bd"/><rect x="13" y="30" width="16" height="4" rx="2" fill="#2a2f3a"/><path d="M44 8c5 0 9 3 10 8" stroke="#3b82f6" stroke-width="4" stroke-linecap="round"/><path d="m50 14 5 3 2-6" stroke="#3b82f6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function psHtml(){
  return `<div id="pubStudio" class="ps"><div class="ps-wrap">
    <div class="ps-top">
      <button class="ps-icon" onclick="psClose()" aria-label="إغلاق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <div class="ps-top-t">نشر جديد</div>
      <button class="ps-gray ps-sm" onclick="psOpenDrafts()">المسودات <span id="psDraftN">0</span></button>
    </div>
    <div class="ps-grid">
      <section class="ps-card ps-details">
        <div class="ps-h">تفاصيل المنشور</div>
        <div class="ps-lbl">1. العنوان</div>
        <input id="psTitle" class="ps-in" maxlength="100" placeholder="اكتب عنوانًا للمنشور…">
        <div class="ps-lbl">2. الوصف</div>
        <textarea id="psDesc" class="ps-in ps-ta" placeholder="اكتب وصفًا… يمكنك إضافة وسوم مثل #سفر"></textarea>
        <div class="ps-lbl">3. الغلاف</div>
        <div class="ps-cover">
          <div class="ps-thumb" id="psThumb"></div>
          <div><button class="ps-gray" onclick="psChangeCover()">تغيير الصورة</button>
            <a class="ps-link" id="psFrameLink" onclick="psToggleFrame()" style="display:none">تخصيص غلاف</a></div>
        </div>
        <div id="psFrameBox" class="ps-frame" style="display:none"><span>اختر لقطة الغلاف من الفيديو</span><input type="range" id="psFrame" min="0" max="1" step="0.05" value="0"></div>
        <div class="ps-lbl">4. الإعدادات</div>
        <div class="ps-row">
          <label class="ps-sel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
            <select id="psPrivacy"><option value="public">عام</option><option value="private">خاص (أنا فقط)</option></select></label>
          <label class="ps-sel" id="psAudBox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.600 3.200-5.500 6.500-5.500s5.900 1.900 6.500 5.500"/><path d="M16 4.800a3.500 3.500 0 0 1 0 6.400M18.500 14.800c1.800.8 2.800 2.600 3 5.200"/></svg>
            <select id="psAudience"><option value="everyone">المشاهدون: الجميع</option><option value="followers">المشاهدون: المتابعون فقط</option></select></label>
        </div>
        <div class="ps-lbl ps-lbl2">الفئات</div>
        <label class="ps-sel ps-sel-w"><select id="psCat">${PS_CATS.map(c=>`<option>${c}</option>`).join('')}</select></label>
        <label class="ps-chk"><input type="checkbox" id="psComments" checked><span>السماح بالتعليقات</span></label>
        <div class="ps-actions"><button class="ps-pub" id="psPub" onclick="psPublish()">نشر الآن</button><button class="ps-gray ps-draftbtn" onclick="psSaveDraft()">حفظ كمسودة</button></div>
      </section>
      <section class="ps-card ps-upload">
        <div class="ps-h ps-c">رفع ملف الفيديو أو الصورة</div>
        <div class="ps-drop" id="psDrop">${PS_CAM}<div>اسحب الملف هنا أو انقر للاختيار</div></div>
        <input type="file" id="psFile" accept="image/*,video/*" hidden>
        <input type="file" id="psCoverFile" accept="image/*" hidden>
        <div class="ps-prog" id="psProg" style="display:none"><span class="ps-pct" id="psPct">جارِ الرفع… 0%</span><div class="ps-bar"><i id="psBar"></i></div></div>
        <div class="ps-item" id="psItem" style="display:none"><div class="ps-item-thumb" id="psItemThumb"></div><div class="ps-item-txt"><div class="ps-item-t" id="psItemT"></div><div class="ps-item-d" id="psItemD"></div></div></div>
      </section>
    </div></div></div>`;
}
function psEnsure(){
  if(document.getElementById('pubStudio')) return;
  document.body.insertAdjacentHTML('beforeend',psHtml());
  const $=id=>document.getElementById(id);
  const drop=$('psDrop'), fi=$('psFile');
  drop.onclick=()=>fi.click();
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('over');};
  drop.ondragleave=()=>drop.classList.remove('over');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)psHandleFile(f);};
  fi.onchange=()=>{ if(fi.files&&fi.files[0]) psHandleFile(fi.files[0]); fi.value=''; };
  $('psCoverFile').onchange=async()=>{
    const f=$('psCoverFile').files&&$('psCoverFile').files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=async()=>{ let d=r.result; try{ d=await compressDataUrl(d,900,.85); }catch(e){} PS.cover=d; PS.coverCustom=true; psRefreshThumb(); };
    r.readAsDataURL(f); $('psCoverFile').value='';
  };
  $('psTitle').oninput=psRefreshItem; $('psDesc').oninput=psRefreshItem;
  $('psPrivacy').onchange=()=>{ const priv=$('psPrivacy').value==='private'; $('psAudBox').style.opacity=priv?.45:1; $('psAudience').disabled=priv; };
  $('psFrame').oninput=()=>{ if(PS&&PS.vid){ PS.coverCustom=false; try{PS.vid.currentTime=Number($('psFrame').value);}catch(e){} } };
}
function psResetForm(){
  const $=id=>document.getElementById(id);
  $('psTitle').value=''; $('psDesc').value=''; $('psPrivacy').value='public'; $('psAudience').value='everyone'; $('psAudience').disabled=false; $('psAudBox').style.opacity=1;
  $('psCat').selectedIndex=0; $('psComments').checked=true;
  $('psProg').style.display='none'; $('psItem').style.display='none'; $('psBar').style.width='0';
  $('psFrameBox').style.display='none'; $('psFrameLink').style.display='none';
  $('psPub').disabled=false; psRefreshThumb(); psRefreshItem();
}
function openPostModal(mode){
  psEnsure();
  if(PS&&PS.blobUrl){ try{URL.revokeObjectURL(PS.blobUrl);}catch(e){} }
  PS=psNew(); psResetForm(); psCountDrafts();
  document.getElementById('pubStudio').classList.add('show'); document.body.style.overflow='hidden';
  document.getElementById('pubStudio').scrollTop=0;
  if(mode==='media') document.getElementById('psFile').click();
}
function psHasContent(){
  const $=id=>document.getElementById(id);
  return !!(PS&&(PS.data||$('psTitle').value.trim()||$('psDesc').value.trim()));
}
function psClose(force){
  if(!force&&psHasContent()&&!confirm('تجاهل هذا المنشور؟ يمكنك حفظه كمسودة بدلًا من ذلك.')) return;
  document.getElementById('pubStudio').classList.remove('show'); document.body.style.overflow='';
  if(PS&&PS.blobUrl){ try{URL.revokeObjectURL(PS.blobUrl);}catch(e){} }
  if(PS&&PS.vid){ try{PS.vid.pause();PS.vid.removeAttribute('src');}catch(e){} }
  PS=null;
}
function psSetProg(pct,label){
  document.getElementById('psProg').style.display='flex';
  document.getElementById('psBar').style.width=pct+'%';
  document.getElementById('psPct').textContent=(label||'جارِ الرفع…')+(label?'':' '+pct+'%');
}
function psHandleFile(file){
  if(!file||!PS) return;
  const isV=(file.type||'').startsWith('video'), isI=(file.type||'').startsWith('image');
  if(!isV&&!isI){ toast('اختر صورة أو فيديو'); return; }
  if(file.size>30*1024*1024){ toast('الحد الأقصى للملف 30MB في النسخة المحلية'); return; }
  PS.loading=true; PS.name=file.name; PS.type=file.type; PS.cover=''; PS.coverCustom=false; PS.data='';
  document.getElementById('psPub').disabled=true;
  document.getElementById('psItem').style.display='flex';
  document.getElementById('psFrameBox').style.display='none';
  psSetProg(0); psRefreshThumb(); psRefreshItem();
  const r=new FileReader();
  r.onprogress=e=>{ if(e.lengthComputable) psSetProg(Math.round(e.loaded/e.total*95)); };
  r.onerror=()=>{ PS.loading=false; document.getElementById('psPub').disabled=false; toast('تعذّر قراءة الملف'); };
  r.onload=async()=>{
    if(!PS) return;
    let data=r.result;
    if(isI){
      if(file.type!=='image/gif'&&file.size>500*1024){ try{ data=await compressDataUrl(data,1600,.86); PS.type='image/jpeg'; }catch(e){} }
      PS.cover=data;
    }
    PS.data=data;
    if(isV) await psMakeVideo(file);
    document.getElementById('psFrameLink').style.display=isV?'inline-block':'none';
    PS.loading=false; document.getElementById('psPub').disabled=false;
    psSetProg(100,'اكتمل الرفع ✓'); psRefreshThumb(); psRefreshItem();
  };
  r.readAsDataURL(file);
}
function psGrab(v){
  try{
    const w=Math.min(v.videoWidth||640,720), h=Math.round(w*((v.videoHeight||360)/(v.videoWidth||640)));
    const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(v,0,0,w,h);
    return c.toDataURL('image/jpeg',.8);
  }catch(e){ return ''; }
}
function psMakeVideo(file,srcUrl){
  return new Promise(res=>{
    if(PS.blobUrl){ try{URL.revokeObjectURL(PS.blobUrl);}catch(e){} PS.blobUrl=''; }
    let url=srcUrl; if(!url){ url=URL.createObjectURL(file); PS.blobUrl=url; }
    const v=document.createElement('video'); v.muted=true; v.playsInline=true; v.preload='auto'; v.src=url; PS.vid=v;
    let done=false; const fin=()=>{ if(!done){ done=true; res(); } };
    v.onloadedmetadata=()=>{
      PS.duration=v.duration||0;
      const fr=document.getElementById('psFrame'); fr.max=String(PS.duration||1); fr.value='0';
      try{ v.currentTime=Math.min(1,(PS.duration||0)*.1); }catch(e){ fin(); }
    };
    v.onseeked=()=>{ if(!PS||PS.vid!==v) return; if(!PS.coverCustom||!PS.cover){ PS.cover=psGrab(v); PS.coverCustom=false; } psRefreshThumb(); fin(); };
    v.onerror=fin; setTimeout(fin,4500);
  });
}
function psToggleFrame(){
  const b=document.getElementById('psFrameBox'); b.style.display=b.style.display==='none'?'block':'none';
}
function psChangeCover(){
  if(!PS||!PS.data){ document.getElementById('psFile').click(); return; }
  if((PS.type||'').startsWith('video')) document.getElementById('psCoverFile').click();
  else document.getElementById('psFile').click();
}
function psRefreshThumb(){
  const bg=PS&&PS.cover?`url("${PS.cover}")`:'none';
  const t=document.getElementById('psThumb'), it=document.getElementById('psItemThumb');
  if(t) t.style.backgroundImage=bg; if(it) it.style.backgroundImage=bg;
}
function psRefreshItem(){
  const $=id=>document.getElementById(id); if(!$('psItem')||!PS) return;
  const title=$('psTitle').value.trim(), desc=$('psDesc').value.trim();
  $('psItemT').textContent=title||PS.name||'منشور جديد';
  $('psItemD').innerHTML=hashHtml(desc);
  $('psItem').style.display=(PS.data||PS.loading||title||desc)?'flex':'none';
}
function psCollect(){
  const $=id=>document.getElementById(id);
  const isV=(PS.type||'').startsWith('video');
  return {
    title:$('psTitle').value.trim(), text:$('psDesc').value.trim(),
    mediaData:PS.data, mediaType:PS.type, cover:isV?PS.cover:'',
    category:$('psCat').value, privacy:$('psPrivacy').value,
    audience:$('psPrivacy').value==='private'?'everyone':$('psAudience').value,
    allowComments:$('psComments').checked
  };
}
function psPublish(){
  if(!PS) return;
  if(PS.loading){ toast('انتظر اكتمال الرفع'); return; }
  const c=psCollect();
  if(!c.mediaData&&!c.title&&!c.text){ toast('أضف ملفًا أو عنوانًا أو وصفًا'); return; }
  const a=currentAuthorSnapshot();
  DATA.posts.unshift(Object.assign({id:uid(),time:Date.now(),liked:false,likes:0,saved:false,comments:[],reposts:0,mood:'',author:a},c));
  if(PS.draftId) DATA.drafts=(DATA.drafts||[]).filter(d=>d.id!==PS.draftId);
  saveData(); renderExplore(); renderProfile();
  psClose(true); go('profile'); window.setArcActive&&window.setArcActive('profile');
  sound('send'); toast('تم نشر المحتوى باسم '+a.name+' ✅');
}
function psSaveDraft(){
  if(!PS) return;
  if(PS.loading){ toast('انتظر اكتمال الرفع'); return; }
  const c=psCollect();
  if(!c.mediaData&&!c.title&&!c.text){ toast('لا يوجد شيء لحفظه'); return; }
  DATA.drafts=DATA.drafts||[];
  const id=PS.draftId||uid();
  DATA.drafts=DATA.drafts.filter(d=>d.id!==id);
  DATA.drafts.unshift(Object.assign({id,time:Date.now(),name:PS.name,duration:PS.duration},c,{fullCover:PS.cover}));
  saveData(); psClose(true); toast('تم حفظ المسودة 📝');
}
function psCountDrafts(){ const n=document.getElementById('psDraftN'); if(n) n.textContent=(DATA.drafts||[]).length; }
function psOpenDrafts(){
  const list=DATA.drafts||[]; const overlay=document.getElementById('modalOverlay'), box=document.getElementById('modalBox');
  box.innerHTML=`<div class="modal-title">المسودات · ${list.length}</div>`+(list.length?list.map(d=>`<div class="dr-row"><div class="dr-thumb" style="background-image:${d.fullCover?`url('${d.fullCover}')`:'none'}"></div><div class="dr-txt"><b>${escapeHtml(d.title||d.name||'بدون عنوان')}</b><span>${timeAgo(d.time)}</span></div><div class="dr-btn" onclick="psLoadDraft('${d.id}')">متابعة</div><div class="dr-btn dr-del" onclick="psDelDraft('${d.id}')">حذف</div></div>`).join(''):'<div class="thread-empty" style="padding:14px 0">لا توجد مسودات محفوظة</div>')+`<div class="modal-actions" style="margin-top:12px"><div class="modal-cancel" onclick="closeModal()">إغلاق</div></div>`;
  overlay.classList.add('show');
}
function psDelDraft(id){ DATA.drafts=(DATA.drafts||[]).filter(d=>d.id!==id); saveData(); psCountDrafts(); psOpenDrafts(); }
async function psLoadDraft(id){
  const d=(DATA.drafts||[]).find(x=>x.id===id); if(!d||!PS) return;
  closeModal();
  const $=x=>document.getElementById(x);
  PS=psNew(); PS.draftId=d.id; PS.data=d.mediaData||''; PS.type=d.mediaType||''; PS.name=d.name||''; PS.cover=d.fullCover||d.cover||''; PS.duration=d.duration||0;
  $('psTitle').value=d.title||''; $('psDesc').value=d.text||'';
  $('psPrivacy').value=d.privacy||'public'; $('psPrivacy').onchange();
  $('psAudience').value=d.audience||'everyone'; $('psCat').value=d.category||PS_CATS[0]; $('psComments').checked=d.allowComments!==false;
  if(PS.data){ psSetProg(100,'اكتمل الرفع ✓'); }
  if(PS.data&&PS.type.startsWith('video')){ PS.coverCustom=true; $('psFrameLink').style.display='inline-block'; await psMakeVideo(null,PS.data); }
  psRefreshThumb(); psRefreshItem();
}

function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function findPost(id){ return DATA.posts.find(p=>p.id===id); }
function normalizePost(p){
  p.likes=Number(p.likes||0);p.reposts=Number(p.reposts||0);p.comments=Array.isArray(p.comments)?p.comments:[];
  if(!p.author)p.author=currentAuthorSnapshot();
  return p;
}
function toggleSave(id,btn){
  const p=normalizePost(findPost(id));if(!p)return;
  p.saved=!p.saved;sound('soft');saveData();fpSync(id);
  toast(p.saved?'أُضيف إلى المحفوظات 🔖':'أُزيل من المحفوظات');
}
function repostPost(id){
  const p=normalizePost(findPost(id));if(!p)return;
  const a=currentAuthorSnapshot();
  p.reposts++;
  DATA.posts.unshift({
    id:uid(),text:p.text,time:Date.now(),liked:false,likes:0,saved:false,comments:[],reposts:0,
    title:p.title||'',cover:p.cover||'',category:p.category||'',allowComments:p.allowComments,mediaData:p.mediaData||'',mediaType:p.mediaType||'',mood:p.mood||'',author:a,
    repostOf:{id:p.id,author:postAuthor(p)}
  });
  saveData();renderExplore();renderProfile();sound('pop');toast('تمت إعادة النشر باسم '+a.name+' 🔁');
}
async function downloadPost(id){
  const p=normalizePost(findPost(id));if(!p)return;
  try{
    if(p.mediaData){
      const ext=(p.mediaType||'').startsWith('video')?'.mp4':'.jpg';
      const a=document.createElement('a');a.href=p.mediaData;a.download='nabd-'+p.id+ext;document.body.appendChild(a);a.click();a.remove();
      toast('بدأ تنزيل الملف ⬇️');return;
    }
    const blob=new Blob([p.text||'منشور Black 1'],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='nabd-'+p.id+'.txt';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    toast('تم تنزيل نص المنشور ⬇️');
  }catch(e){toast('تعذر تنزيل المحتوى');}
}
function deletePost(id){
  const p=findPost(id);if(!p)return;
  const a=postAuthor(p);
  if(a.handle!==(DATA.profile.handle||'')){toast('يمكنك حذف منشورات حسابك فقط');return;}
  DATA.posts=DATA.posts.filter(x=>x.id!==id);
  saveData();renderExplore();renderProfile();toast('تم حذف المنشور');
}
async function sharePost(id){
  const p=normalizePost(findPost(id));if(!p)return;
  sound('soft');
  const a=postAuthor(p),text=`${a.name} (@${a.handle})\n${p.text||''}`;
  try{
    if(navigator.share){await navigator.share({title:'Black 1',text});toast('تمت المشاركة ✅');}
    else{await navigator.clipboard.writeText(text);toast('تم نسخ المنشور 📋');}
  }catch(e){}
}
function openComments(id){
  const p=normalizePost(findPost(id));if(!p)return;
  const overlay=document.getElementById('modalOverlay'),box=document.getElementById('modalBox');
  box.innerHTML=`<div class="modal-title">التعليقات · ${p.comments.length}</div>
    <div class="clist" id="clistBox">${p.comments.length?p.comments.map(c=>{
      const a=c.author||currentAuthorSnapshot();
      return `<div class="crow"><b class="${nfc(a)}">${escapeHtml(a.name||'حساب')}</b> <span class="${nfc(a)}" style="color:var(--text-dim2);font-size:9px">@${escapeHtml(a.handle||'user')} · ${timeAgo(c.time)}</span><br><span class="${nfc(a)}">${escapeHtml(c.text)}</span></div>`;
    }).join(''):'<div class="thread-empty" style="padding:10px 0;">لا توجد تعليقات بعد</div>'}</div>
    <div class="modal-field"><input id="mf_comment" placeholder="أضف تعليقًا باسم ${escapeHtml(DATA.profile.name||'')}…"></div>
    <div class="modal-actions">
      <div class="modal-cancel" onclick="closeModal()">إغلاق</div>
      <div class="btn btn-grad" onclick="addComment('${id}')">إرسال</div>
    </div>`;
  overlay.classList.add('show');
}
function addComment(id){
  const input=document.getElementById('mf_comment'),val=input.value.trim();if(!val)return;
  const p=normalizePost(findPost(id));if(!p)return;
  p.comments.push({text:val,time:Date.now(),author:currentAuthorSnapshot()});
  saveData();sound('send');openComments(id);
}
/* ============== EXPLORE / PROFILE GRIDS ============== */
function renderExplore(){
  const el=document.getElementById('exploreGrid');
  if(!el) return;

  const q=(document.getElementById('exploreSearch')?.value||'').trim().toLowerCase();
  const posts=(DATA.posts||[]).filter(p=>{
    const a=postAuthor(p)||{};
    const hay=[
      p.text||'',p.mood||'',a.name||'',a.handle||'',
      p.caption||'',p.title||''
    ].join(' ').toLowerCase();
    return !q || hay.includes(q);
  });

  if(!posts.length){
    el.innerHTML = q
      ? `<div class="explore-no-match">لا توجد نتائج حقيقية تطابق البحث.</div>`
      : `<div class="explore-empty">
          <div class="empty-ic">${emptySvg()}</div>
          <div class="empty-title">لا يوجد محتوى حقيقي بعد</div>
          <div class="empty-sub">هذه الصفحة لا تضيف أي منشورات تجريبية. عند نشر صورة أو فيديو فعليًا سيظهر هنا تلقائيًا.</div>
        </div>`;
    return;
  }

  el.innerHTML=posts.map((p,i)=>{
    const a=postAuthor(p)||{};
    const media=p.mediaData
      ? ((p.mediaType||'').startsWith('video')
          ? `<video src="${p.mediaData}${p.cover?'':'#t=0.1'}" ${p.cover?`poster="${p.cover}"`:''} muted playsinline preload="metadata"></video>`
          : `<img src="${p.mediaData}" alt="" loading="lazy">`)
      : `<div style="width:100%;height:100%;display:grid;place-items:center;font-size:38px;background:
          radial-gradient(circle at 25% 20%,rgba(76,196,255,.25),transparent 35%),
          linear-gradient(135deg,rgba(52,114,196,.55),rgba(120,84,190,.42));">${escapeHtml(p.mood||'📝')}</div>`;
    const icon = p.mediaData
      ? ((p.mediaType||'').startsWith('video')
        ? `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="15" height="14" rx="2"></rect><path d="m18 10 3-2v8l-3-2"></path></svg>`
        : `<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"></rect><circle cx="9" cy="10" r="1.3"></circle><path d="m20 15-4-4-7 7"></path></svg>`)
      : `<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5z"></path><path d="M8 8h8M8 12h6M8 16h5"></path></svg>`;
    return `<article class="explore-card ${i===0?'featured':''}" data-sound="pop" onclick="rlOpenFromProfile('${p.id}')">
      ${media}
      <div class="explore-card-overlay">
        <div class="explore-author">
          <div class="explore-mini-avatar">${a.avatarData?`<img src="${a.avatarData}" alt="">`:escapeHtml(a.avatar||'👤')}</div>
          <div>
            <div class="explore-author-name ${nfc(a)}">${escapeHtml(a.name||'الحساب')}</div>
            <div class="explore-meta">${timeAgo(p.time||Date.now())}</div>
          </div>
        </div>
        <div class="explore-type">${icon}</div>
      </div>
    </article>`;
  }).join('');
}

/* ============== LIVE (real camera) — real liquid water ============== */
let liveStream=null, liveTimerInt=null, liveStart=0, liveRec=null, liveChunks=[];
const LQ={q:1,chat:true,pub:true,save:false,facing:'user',sched:'',title:''};
const LQ_RES=[{w:1280,h:720},{w:1920,h:1080},{w:3840,h:2160}];
const LQ_I={
  user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4"/></svg>',
  user2:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.3"/><circle cx="12" cy="9.8" r="3.1"/><path d="M6.3 18.4c1.2-2.5 3.3-3.7 5.7-3.7s4.5 1.2 5.7 3.7"/></svg>',
  gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
  cal:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/></svg>',
  heart:'<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/></svg>',
  chat:'<svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.6A7.5 7.5 0 1 1 20 11.5Z"/></svg>',
  plane:'<svg viewBox="0 0 24 24"><path d="M21 3 3 10.5l7 3 3 7L21 3Z"/><path d="m10 13.5 5-5"/></svg>',
  gift:'<svg viewBox="0 0 24 24"><rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8c-1.5-4-5.5-4-5.5-1.5S10 8 12 8Zm0 0c1.5-4 5.5-4 5.5-1.5S14 8 12 8Z"/></svg>',
  back:'<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>'
};

/* ---------- water sound (synthesised — no audio files) ---------- */
const LQA={ctx:null,out:null,nb:null,amb:null,tm:0,
  ok(){try{const s=DATA&&DATA.profile&&DATA.profile.settings;return !(s&&s.sounds===false);}catch(e){return true;}},
  init(){
    const c=ac(); if(this.ctx===c&&this.out) return c; this.ctx=c;
    const out=c.createGain(); out.gain.value=.9;
    const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=7500;
    const len=Math.floor(c.sampleRate*.9), ir=c.createBuffer(2,len,c.sampleRate);
    for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2);}
    const cv=c.createConvolver(); cv.buffer=ir; const wet=c.createGain(); wet.gain.value=.28;
    out.connect(lp); lp.connect(c.destination); out.connect(cv); cv.connect(wet); wet.connect(lp);
    this.out=out;
    const nl=c.sampleRate*2, nb=c.createBuffer(1,nl,c.sampleRate), nd=nb.getChannelData(0); let l=0;
    for(let i=0;i<nl;i++){const w=Math.random()*2-1; l=l*.985+w*.12; nd[i]=l*1.8+w*.25;}
    this.nb=nb; return c;
  },
  bloop(f,v,d,delay){
    if(!this.ok()) return;
    try{
      const c=this.init(), t=c.currentTime+(delay||0); d=d||.12; f=f||420; v=v==null?.07:v;
      const o=c.createOscillator(), g=c.createGain(); o.type='sine';
      o.frequency.setValueAtTime(f,t); o.frequency.exponentialRampToValueAtTime(f*2.3,t+d*.7);
      g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(v,t+.007); g.gain.exponentialRampToValueAtTime(.0001,t+d);
      o.connect(g); g.connect(this.out); o.start(t); o.stop(t+d+.03);
      const o2=c.createOscillator(), g2=c.createGain(); o2.type='sine';
      o2.frequency.setValueAtTime(f*2.7,t); o2.frequency.exponentialRampToValueAtTime(f*5.4,t+d*.6);
      g2.gain.setValueAtTime(.0001,t); g2.gain.exponentialRampToValueAtTime(v*.25,t+.006); g2.gain.exponentialRampToValueAtTime(.0001,t+d*.7);
      o2.connect(g2); g2.connect(this.out); o2.start(t); o2.stop(t+d);
    }catch(e){}
  },
  burst(dur,f0,f1,v,q,delay){
    if(!this.ok()) return;
    try{
      const c=this.init(), t=c.currentTime+(delay||0);
      const s=c.createBufferSource(); s.buffer=this.nb; s.loop=true;
      const bp=c.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=q||1.1;
      bp.frequency.setValueAtTime(f0,t); bp.frequency.exponentialRampToValueAtTime(f1,t+dur);
      const g=c.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(v,t+Math.min(.05,dur*.3)); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      s.connect(bp); bp.connect(g); g.connect(this.out); s.start(t,Math.random()*1.4); s.stop(t+dur+.05);
    }catch(e){}
  },
  splash(sz){
    sz=sz==null?.5:sz;
    this.burst(.2+.22*sz,1500,600,.05+.07*sz,1.1);
    const n=2+Math.round(sz*3);
    for(let i=0;i<n;i++) this.bloop(300+Math.random()*520,.035+.04*Math.random(),.09+Math.random()*.08,.02+i*.045+Math.random()*.03);
  },
  pour(){
    this.burst(1.15,300,2600,.13,.9); this.burst(.8,2400,700,.06,1.4,.25);
    for(let i=0;i<7;i++) this.bloop(250+Math.random()*650,.04+Math.random()*.03,.12,.08+i*.085);
  },
  startAmbient(){
    if(!this.ok()||this.amb) return;
    try{
      const c=this.init(); const src=c.createBufferSource(); src.buffer=this.nb; src.loop=true;
      const hp=c.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=260;
      const bp=c.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=.7; bp.frequency.value=900;
      const g=c.createGain(); g.gain.value=.0001;
      const lfo=c.createOscillator(), lg=c.createGain(); lfo.frequency.value=.23; lg.gain.value=420; lfo.connect(lg); lg.connect(bp.frequency);
      const lfo2=c.createOscillator(), lg2=c.createGain(); lfo2.frequency.value=.41; lg2.gain.value=.011; lfo2.connect(lg2); lg2.connect(g.gain);
      src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(this.out);
      src.start(); lfo.start(); lfo2.start();
      g.gain.exponentialRampToValueAtTime(.03,c.currentTime+1.4);
      this.amb={src,lfo,lfo2,g};
      const drip=()=>{
        if(!this.amb) return;
        this.bloop(260+Math.random()*620,.025+Math.random()*.03,.1+Math.random()*.09);
        if(Math.random()<.35) this.bloop(300+Math.random()*500,.02,.08,.12);
        this.tm=setTimeout(drip,700+Math.random()*2300);
      };
      this.tm=setTimeout(drip,600);
    }catch(e){}
  },
  stopAmbient(){
    clearTimeout(this.tm); const a=this.amb; if(!a) return; this.amb=null;
    try{
      const c=this.ctx; a.g.gain.cancelScheduledValues(c.currentTime);
      a.g.gain.setValueAtTime(Math.max(a.g.gain.value,.0002),c.currentTime);
      a.g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.35);
      setTimeout(()=>{try{a.src.stop();a.lfo.stop();a.lfo2.stop();}catch(e){}},500);
    }catch(e){}
  }
};

/* ---------- start screen markup ---------- */
function lqSw(key,label){
  return `<div class="lq-tgi ${LQ[key]?'on':''}" onclick="lqToggle('${key}',this)"><div class="lq-sw"><div class="lq-body"><i class="m"></i></div><div class="lq-frost"></div><div class="lq-swf"></div><div class="lq-swk"></div></div><span>${label}</span></div>`;
}
function goLiveScreen(){
  const p=LQ.q/2, L=`calc(17px + (100% - 34px)*${p})`;
  return `<div class="lq-start" id="lqStart">
    <div class="lq-w lq-top"><div class="lq-body"><i class="m"></i><i class="a"></i><i class="b"></i></div><div class="lq-frost"></div>
      <div class="lq-in">${LQ_I.user2}<span>بدء بث جديد</span></div></div>
    <div class="lq-w lq-chip"><div class="lq-body"><i class="m"></i></div><div class="lq-frost"></div>
      <div class="lq-in"><i class="dot"></i><span>مباشر</span></div></div>
    <div class="lq-w lq-pool">
      <div class="lq-body"><i class="m"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><i class="l5"></i></div>
      <div class="lq-frost"></div>
      <div class="lq-ready">جاهز للبث؟</div>
      <div class="lq-gowrap"><button class="lq-go" onclick="lqGo(event)" aria-label="ابدأ البث"><div class="lq-gob"><i></i></div><div class="lq-got">ابدأ البث</div></button></div>
      <div class="lq-w lq-sd l" onclick="lqFlip()"><div class="lq-body"><i class="m"></i><i class="d"></i></div><div class="lq-frost"></div>
        <div class="lq-in">${LQ_I.gear}<span>الإعدادات</span><small id="lqFacingLbl">${LQ.facing==='user'?'أمامية':'خلفية'}</small></div></div>
      <div class="lq-w lq-sd r" onclick="document.getElementById('lqSchIn').showPicker?document.getElementById('lqSchIn').showPicker():document.getElementById('lqSchIn').click()"><div class="lq-body"><i class="m"></i><i class="d"></i></div><div class="lq-frost"></div>
        <div class="lq-in">${LQ_I.cal}<span>جدولة</span><small id="lqSchLbl">${escapeHtml(LQ.sched)}</small></div></div>
      <input id="lqSchIn" type="datetime-local" style="position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;left:50%;bottom:0" onchange="lqSched(this.value)">
    </div>
    <div class="lq-q">
      <div class="lq-q-label">جودة البث</div>
      <div class="lq-track" id="lqTrack"><div class="lq-body"><i class="m"></i></div><div class="lq-frost"></div>
        <div class="lq-fill snap" id="lqFill" style="width:calc(12px + (100% - 34px)*${p})"></div><div class="lq-knob snap" id="lqKnob" style="left:${L}"></div></div>
      <div class="lq-steps">${['720p','1080p','4K'].map((n,i)=>`<span class="${i===LQ.q?'on':''}" style="left:calc(17px + (100% - 34px)*${i/2})" onclick="lqQ(${i})">${n}</span>`).join('')}</div>
    </div>
    <div class="lq-title"><label for="lqTitle">عنوان البث</label>
      <div class="lq-field" id="lqField"><div class="lq-body"><i class="m"></i></div><div class="lq-frost"></div>
        <input id="lqTitle" maxlength="60" placeholder="جلسة ألعاب رائعة!" value="${escapeHtml(LQ.title||'')}" oninput="LQ.title=this.value" onfocus="this.parentNode.classList.add('f')" onblur="this.parentNode.classList.remove('f')"></div></div>
    <div class="lq-tg">${lqSw('save','حفظ البث')}${lqSw('pub','عام')}${lqSw('chat','الدردشة')}</div>
    <div class="lq-rain" id="lqRain"></div><div class="lq-fx" id="lqFx"></div>
  </div>`;
}

/* ---------- actions ---------- */
function lqQVis(p){
  const k=document.getElementById('lqKnob'), f=document.getElementById('lqFill'); if(!k||!f) return;
  k.style.left=`calc(17px + (100% - 34px)*${p})`; f.style.width=`calc(12px + (100% - 34px)*${p})`;
}
function lqQSet(i){LQ.q=i;document.querySelectorAll('.lq-steps span').forEach((s,k)=>s.classList.toggle('on',k===i));}
function lqQ(i){
  const k=document.getElementById('lqKnob'), f=document.getElementById('lqFill'); if(!k) return;
  k.classList.add('snap'); f.classList.add('snap'); k.style.transform=''; lqQVis(i/2); lqQSet(i);
  const tr=document.getElementById('lqTrack'), st=document.getElementById('lqStart');
  if(tr&&st){const a=k.getBoundingClientRect(), b=st.getBoundingClientRect(); lqFx(a.left+a.width/2-b.left,a.top+a.height/2-b.top,.3);}
  LQA.bloop(380+i*140,.06,.14);
}
function lqToggle(k,el){
  LQ[k]=!LQ[k]; el.classList.toggle('on',LQ[k]);
  const kn=el.querySelector('.lq-swk'); if(kn){kn.classList.remove('st'); void kn.offsetWidth; kn.classList.add('st');}
  const st=document.getElementById('lqStart'); if(st){const a=kn.getBoundingClientRect(), b=st.getBoundingClientRect(); lqFx(a.left+a.width/2-b.left,a.top+a.height/2-b.top,.25);}
  LQA.bloop(LQ[k]?520:380,.06,.12);
}
function lqFlip(){
  LQ.facing=LQ.facing==='user'?'environment':'user';
  const l=document.getElementById('lqFacingLbl'); if(l) l.textContent=LQ.facing==='user'?'أمامية':'خلفية';
  toast(LQ.facing==='user'?'الكاميرا الأمامية':'الكاميرا الخلفية');
}
function lqSched(v){
  if(!v){LQ.sched='';}else{const d=new Date(v);LQ.sched=d.toLocaleString('ar',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});toast('تمت جدولة البث: '+LQ.sched);}
  const l=document.getElementById('lqSchLbl'); if(l) l.textContent=LQ.sched;
}
function lqGo(ev){
  const st=document.getElementById('lqStart');
  if(st){const b=ev.currentTarget.getBoundingClientRect(), r=st.getBoundingClientRect(); lqFx(b.left+b.width/2-r.left,b.top+b.height/2-r.top,1);}
  const w=document.querySelector('.lq-gowrap'); if(w) lqSquish(w,1.4);
  LQA.pour();
  startLive();
}
function openLiveHome(keep){
  document.getElementById('liveArea').innerHTML = goLiveScreen();
  if(!keep) go('live');
  lqEnter();
}

/* ---------- water motion: beads, runners, drips, ripples ---------- */
const LQX={on:false,raf:0,last:0,runners:[],beads:[],timers:[],lastFx:0,lastX:0,lastY:0};
function lqView(name){ if(name!=='live') lqStop(); }
function lqStop(){
  LQX.on=false; cancelAnimationFrame(LQX.raf); LQX.timers.forEach(clearTimeout); LQX.timers=[]; LQX.runners=[]; LQX.beads=[]; LQA.stopAmbient();
}
function lqEnter(){
  lqStop();
  const st=document.getElementById('lqStart'); if(!st) return;
  LQX.on=true; lqScene(); lqRain(st); lqTrackInit(st);
  if(!st.dataset.w){
    st.dataset.w=1;
    st.addEventListener('pointerdown',lqDown);
    st.addEventListener('pointermove',lqMove);
  }
  LQA.startAmbient();
  if(!document.body.classList.contains('reduce-motion')){
    LQX.last=performance.now(); LQX.raf=requestAnimationFrame(lqTick);
    LQX.timers.push(setTimeout(lqSpawnRunner,900));
    LQX.timers.push(setTimeout(lqDripFall,2600));
  }
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden) LQA.stopAmbient();
  else if(LQX.on && document.getElementById('lqStart') && document.getElementById('view-live').classList.contains('active')) LQA.startAmbient();
});
function lqScene(){
  const s=document.getElementById('lqScene'); if(!s||s.dataset.ok) return; s.dataset.ok=1;
  const B=[[6,6,130,'rgba(120,190,255,.95)',.55,10],[58,3,150,'rgba(165,125,235,.9)',.5,12],[76,20,72,'rgba(255,150,205,.85)',.45,8],[-5,30,118,'rgba(110,228,238,.85)',.4,9],
    [16,41,84,'rgba(255,178,172,.9)',.5,8],[80,46,126,'rgba(150,130,238,.75)',.4,12],[40,58,96,'rgba(120,182,255,.75)',.35,10],[2,72,136,'rgba(140,202,255,.75)',.35,12],
    [68,80,104,'rgba(255,162,194,.65)',.3,10],[28,90,116,'rgba(100,212,238,.65)',.3,12],[90,8,60,'rgba(255,200,170,.7)',.35,6],[34,22,50,'rgba(190,150,255,.7)',.4,6]];
  s.insertAdjacentHTML('beforeend',B.map((b,i)=>`<i class="lq-bk" style="left:${b[0]}%;top:${b[1]}%;width:${b[2]}px;height:${b[2]}px;--c:${b[3]};--o:${b[4]};--bl:${b[5]}px;--d:${20+i*2.3}s;--dx:${(i%2?1:-1)*(24+i*3)}px;--dy:${(i%3?-1:1)*(18+i*2)}px;--k:${(.4+i*.1).toFixed(2)}"></i>`).join('')
    +'<i class="lq-prism" style="--t:22%"></i><i class="lq-prism" style="--t:64%;opacity:.35;animation-duration:20s"></i>');
  const set=(x,y)=>{s.style.setProperty('--px',x.toFixed(1));s.style.setProperty('--py',y.toFixed(1));};
  window.addEventListener('pointermove',e=>{ if(!LQX.on) return; set((e.clientX/innerWidth-.5)*46,(e.clientY/innerHeight-.5)*46); },{passive:true});
  window.addEventListener('deviceorientation',e=>{ if(!LQX.on||e.gamma==null) return; set(Math.max(-30,Math.min(30,e.gamma))*1.3,Math.max(-30,Math.min(30,(e.beta||45)-45))); },{passive:true});
}
function lqRain(st){
  const rain=document.getElementById('lqRain'); if(!rain) return;
  const W=st.clientWidth, H=st.clientHeight; LQX.beads=[]; let html='';
  const place=(r,x,y,dl)=>{
    const el=document.createElement('i'); el.className='lq-bead'; const d=r*2;
    el.style.cssText=`width:${d}px;height:${d}px;left:${x-r}px;top:${y-r}px;animation-delay:${dl}s`;
    rain.appendChild(el); LQX.beads.push({el,x,y,r,alive:true});
  };
  rain.innerHTML='';
  let tries=0;
  while(LQX.beads.length<54 && tries<400){
    tries++; const r=1.6+Math.pow(Math.random(),3.3)*10; const x=r+Math.random()*(W-2*r), y=r+Math.random()*(H-2*r);
    if(LQX.beads.some(b=>Math.hypot(b.x-x,b.y-y)<b.r+r+3)) continue;
    place(r,x,y,Math.random()*1.4);
  }
  [[.06,.14,12],[.94,.1,10],[.04,.55,13],[.95,.62,11],[.5,.97,12],[.82,.86,9],[.12,.9,10]].forEach(([fx,fy,r],i)=>place(r,fx*W,fy*H,.3+i*.12));
}
function lqSquish(el,amt){
  if(!el||!el.animate) return; amt=amt||1;
  el.animate([{transform:'scale(1)'},{transform:`scale(${1-.07*amt},${1+.09*amt})`,offset:.28},{transform:`scale(${1+.04*amt},${1-.05*amt})`,offset:.6},{transform:'scale(1)'}],
    {duration:620,easing:'cubic-bezier(.3,1.4,.5,1)',composite:'add'});
}
function lqFx(x,y,amt,mini){
  const fx=document.getElementById('lqFx'); if(!fx) return;
  amt=amt==null?.5:amt; const rings=mini?1:(amt>.8?3:2);
  for(let i=0;i<rings;i++){
    const r=document.createElement('i'); r.className='lq-rip'; r.style.left=x+'px'; r.style.top=y+'px';
    r.style.setProperty('--rs',(mini?2.2:3.2+amt*2.6)+'');
    r.style.animationDelay=(i*.11)+'s'; r.style.animationDuration=(0.9+amt*.5)+'s';
    fx.appendChild(r); setTimeout(()=>r.remove(),2000);
  }
  if(mini) return;
  const n=Math.round(3+amt*8);
  for(let i=0;i<n;i++){
    const d=document.createElement('i'); d.className='lq-bead'; const s=2+Math.random()*(3+amt*3);
    d.style.cssText=`width:${s}px;height:${s}px;left:${x-s/2}px;top:${y-s/2}px;animation:none`;
    fx.appendChild(d);
    const ang=-Math.PI/2+(Math.random()-.5)*2.4, sp=26+Math.random()*(46+amt*54);
    const dx=Math.cos(ang)*sp, up=Math.abs(Math.sin(ang))*sp*1.1, fall=20+Math.random()*50;
    d.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx*.6}px,${-up}px) scale(1)`,opacity:1,offset:.45},{transform:`translate(${dx}px,${fall}px) scale(.5)`,opacity:0}],
      {duration:650+Math.random()*450,easing:'cubic-bezier(.3,.6,.5,1)',fill:'forwards'}).onfinish=()=>d.remove();
  }
}
function lqDown(e){
  const st=document.getElementById('lqStart'); if(!st) return;
  const r=st.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
  LQX.lastFx=performance.now(); LQX.lastX=x; LQX.lastY=y;
  if(e.target.closest('input')){ lqFx(x,y,.2,true); return; }
  if(e.target.closest('.lq-go')){ lqFx(x,y,.35); LQA.bloop(300,.07,.16); return; }
  const w=e.target.closest('.lq-sd,.lq-w');
  if(w){ lqSquish(w,1); lqFx(x,y,.55); LQA.splash(.5); }
  else if(e.target.closest('.lq-tgi,.lq-track,.lq-steps')){ lqFx(x,y,.2,true); }
  else { lqFx(x,y,.3); LQA.splash(.2); }
}
function lqMove(e){
  if(!(e.buttons&1) && e.pointerType==='mouse') return;
  if(e.target.closest('input,.lq-track')) return;
  const st=document.getElementById('lqStart'); if(!st) return;
  const r=st.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top, now=performance.now();
  if(now-LQX.lastFx<90||Math.hypot(x-LQX.lastX,y-LQX.lastY)<20) return;
  LQX.lastFx=now; LQX.lastX=x; LQX.lastY=y; lqFx(x,y,.15,true);
  if(Math.random()<.4) LQA.bloop(340+Math.random()*500,.03,.09);
}
function lqTrackInit(st){
  const tr=document.getElementById('lqTrack'), k=document.getElementById('lqKnob'), f=document.getElementById('lqFill'); if(!tr) return;
  let drag=false, cur=LQ.q/2, last=0, lastNear=LQ.q;
  const pos=e=>{const r=tr.getBoundingClientRect(); return Math.max(0,Math.min(1,(e.clientX-r.left-17)/(r.width-34)));};
  const move=e=>{
    const p=pos(e), v=(p-cur)*tr.clientWidth; cur=p; lqQVis(p);
    k.style.transform=`scaleX(${1+Math.min(.55,Math.abs(v)/38)}) scaleY(${1-Math.min(.18,Math.abs(v)/160)})`;
    const near=Math.round(p*2);
    if(near!==lastNear && Math.abs(p*2-near)<.2){ lastNear=near; lqQSet(near); LQA.bloop(380+near*140,.04,.1); }
    const now=performance.now(); if(now-last>140){ last=now; const a=k.getBoundingClientRect(), b=st.getBoundingClientRect(); lqFx(a.left+a.width/2-b.left,a.top+a.height/2-b.top,.1,true); }
  };
  tr.addEventListener('pointerdown',e=>{drag=true; try{tr.setPointerCapture(e.pointerId);}catch(_){} k.classList.remove('snap'); f.classList.remove('snap'); move(e); e.preventDefault();});
  tr.addEventListener('pointermove',e=>{if(drag) move(e);});
  const end=()=>{ if(!drag) return; drag=false; lqQ(Math.round(cur*2)); };
  tr.addEventListener('pointerup',end); tr.addEventListener('pointercancel',end);
}
function lqSpawnRunner(){
  const st=document.getElementById('lqStart'), rain=document.getElementById('lqRain'); if(!st||!rain||!LQX.on) return;
  if(LQX.runners.filter(r=>!r.fall).length<4 && !document.hidden){
    const W=st.clientWidth, H=st.clientHeight, r=4.5+Math.random()*4.5;
    const x=r+Math.random()*(W-2*r), y=30+Math.random()*H*.32;
    const el=document.createElement('i'); el.className='lq-bead lq-run';
    const tr=document.createElement('i'); tr.className='lq-trail';
    rain.appendChild(tr); rain.appendChild(el);
    const o={el,tr,x,y,y0:y,r,v:0,vmax:150+Math.random()*90,pause:Math.random()*.5,t:0,wob:Math.random()*6.28,tw:Math.max(1.4,r*.34),ymax:H};
    o.sz=()=>{el.style.width=(o.r*2)+'px';el.style.height=(o.r*2.5)+'px';o.tw=Math.max(1.4,o.r*.34);}; o.sz();
    LQX.runners.push(o);
  }
  LQX.timers.push(setTimeout(lqSpawnRunner,1700+Math.random()*3000));
}
function lqDripFall(){
  const st=document.getElementById('lqStart'), rain=document.getElementById('lqRain'); if(!st||!rain||!LQX.on) return;
  const ds=st.querySelectorAll('.lq-sd .d'); 
  if(ds.length && !document.hidden){
    const d=ds[Math.floor(Math.random()*ds.length)], a=d.getBoundingClientRect(), b=st.getBoundingClientRect();
    const x=a.left+a.width/2-b.left+(d.parentNode.parentNode.classList.contains('r')?8:0), y=a.bottom-b.top+8, r=3.6+Math.random()*1.6;
    const el=document.createElement('i'); el.className='lq-bead lq-run'; el.style.cssText=`width:${r*2}px;height:${r*2.6}px`;
    rain.appendChild(el);
    LQX.runners.push({el,x,y,r,v:20,fall:true,t:0,ymax:y+60+Math.random()*80});
    LQA.bloop(700+Math.random()*300,.025,.07);
  }
  LQX.timers.push(setTimeout(lqDripFall,3200+Math.random()*3600));
}
function lqTick(now){
  if(!LQX.on) return;
  const st=document.getElementById('lqStart'); if(!st||!st.isConnected){ lqStop(); return; }
  const dt=Math.min(.05,(now-LQX.last)/1000); LQX.last=now; const H=st.clientHeight;
  for(let i=LQX.runners.length-1;i>=0;i--){
    const r=LQX.runners[i]; r.t+=dt;
    if(r.fall){
      r.v+=900*dt; r.y+=r.v*dt;
      if(r.y>=r.ymax){ lqFx(r.x,r.y,.1,true); LQA.bloop(520+Math.random()*480,.03,.08); r.el.remove(); LQX.runners.splice(i,1); continue; }
    }else{
      if(r.pause>0){ r.pause-=dt; r.v*=Math.pow(.02,dt); }
      else{ r.v=Math.min(r.vmax,r.v+(150+r.r*16)*dt); if(Math.random()<dt*.9) r.pause=.12+Math.random()*.5; }
      r.y+=r.v*dt; r.x+=Math.sin(r.t*2.4+r.wob)*Math.min(r.v,120)*.5*dt;
      for(const b of LQX.beads){
        if(!b.alive) continue;
        if(Math.abs(b.x-r.x)<r.r+b.r*.7 && Math.abs(b.y-r.y)<r.r+b.r){
          b.alive=false; b.el.style.transition='opacity .25s,transform .25s'; b.el.style.opacity='0'; setTimeout(()=>b.el.remove(),300);
          r.r=Math.sqrt(r.r*r.r+b.r*b.r*.8); r.v+=60; r.sz();
          LQA.bloop(Math.max(220,900-r.r*40),.03+Math.min(.04,r.r*.003),.1);
        }
      }
      if(r.y>r.ymax-6||r.t>14){
        r.el.style.transition='opacity .5s'; r.el.style.opacity='0'; r.tr.style.transition='opacity .8s'; r.tr.style.opacity='0';
        const e1=r.el,e2=r.tr; setTimeout(()=>{e1.remove();e2.remove();},900); LQX.runners.splice(i,1); LQA.bloop(300,.03,.12); continue;
      }
    }
    r.el.style.transform=`translate3d(${r.x-r.r}px,${r.y-r.r*1.25}px,0)`;
    if(r.tr){ const h=Math.max(0,r.y-r.y0); r.tr.style.cssText=`left:${r.x-r.tw/2}px;top:${r.y0}px;height:${h}px;width:${r.tw}px;opacity:${Math.max(0,.9-r.t/10)}`; }
  }
  LQX.raf=requestAnimationFrame(lqTick);
}

async function startLive(){
  lqStop();
  const area=document.getElementById('liveArea');
  const r=LQ_RES[LQ.q];
  LQ.title=(document.getElementById('lqTitle')||{}).value||LQ.title||'';
  try{
    try{ liveStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:LQ.facing,width:{ideal:r.w},height:{ideal:r.h}}, audio:true}); }
    catch(e1){ liveStream = await navigator.mediaDevices.getUserMedia({video:true, audio:true}); }
  }catch(e){
    toast('تعذر الوصول إلى الكاميرا — تحقق من الأذونات');
    if(document.getElementById('lqStart')) lqEnter();
    return;
  }
  const pr=(typeof DATA!=='undefined'&&DATA.profile)||{};
  const av=pr.avatarData?`<img src="${pr.avatarData}" alt="">`:escapeHtml(pr.avatar||'👤');
  area.innerHTML = `<div class="lq-live ${LQ.chat?'':'nochat'}">
    <div class="lq-avatar"><div>${av}</div></div>
    <div class="lq-drop lq-views"><b id="lqViews">1</b><small>مشاهد</small></div>
    <div class="lq-stage ${LQ.facing==='environment'?'back':''}" id="lqStage">
      <video id="liveVideo" autoplay playsinline muted></video>
      <div class="lq-sheen"></div>
      <div class="lq-back" onclick="stopLive()">${LQ_I.back}</div>
      <div class="lq-tag"><i></i>مباشر<em id="liveTimer">00:00</em>${LQ.pub?'':'<span>🔒</span>'}</div>
      ${LQ.title?`<div class="lq-ttl">${escapeHtml(LQ.title)}</div>`:''}
      <div class="lq-comments" id="lqComments"></div>
      <div class="lq-bar">
        <div class="lq-acts"><span onclick="lqHeart()">${LQ_I.heart}</span><span onclick="document.getElementById('lqIn')&&document.getElementById('lqIn').focus()">${LQ_I.chat}</span><span onclick="lqSend()">${LQ_I.plane}</span><span onclick="lqHeart('🎁')">${LQ_I.gift}</span></div>
        <div class="lq-composer"><input id="lqIn" maxlength="120" placeholder="اكتب تعليقًا…" onkeydown="if(event.key==='Enter')lqSend()"><button class="lq-send" onclick="lqSend()">إرسال</button></div>
      </div>
    </div>
    <div class="lq-end" data-sound="pop" onclick="stopLive()">إنهاء البث</div>
  </div>`;
  document.getElementById('liveVideo').srcObject = liveStream;
  liveChunks=[]; liveRec=null;
  if(LQ.save && window.MediaRecorder){
    try{ liveRec=new MediaRecorder(liveStream); liveRec.ondataavailable=e=>{if(e.data&&e.data.size)liveChunks.push(e.data);}; liveRec.start(1000); }catch(e){ liveRec=null; }
  }
  liveStart = Date.now();
  liveTimerInt = setInterval(()=>{
    const s=Math.floor((Date.now()-liveStart)/1000);
    const mm=String(Math.floor(s/60)).padStart(2,'0'), ss=String(s%60).padStart(2,'0');
    const t=document.getElementById('liveTimer'); if(t) t.textContent=mm+':'+ss;
  },1000);
  sound('live');
}
function lqSend(){
  const i=document.getElementById('lqIn'); if(!i) return;
  const v=i.value.trim(); if(!v) return; i.value='';
  const box=document.getElementById('lqComments'); if(!box) return;
  const d=document.createElement('div'); d.className='lq-cm'; d.textContent=v; box.appendChild(d);
  while(box.children.length>3) box.removeChild(box.firstChild);
}
function lqHeart(ch){
  const st=document.getElementById('lqStage'); if(!st) return;
  const e=document.createElement('span'); e.className='lq-fl'; e.textContent=ch||'❤️';
  e.style.setProperty('--dx',(Math.random()*70-45)+'px'); st.appendChild(e); setTimeout(()=>e.remove(),1700);
}
function stopLive(){
  const finish=()=>{
    if(liveStream){ liveStream.getTracks().forEach(t=>t.stop()); liveStream=null; }
    clearInterval(liveTimerInt);
    toast('انتهى البث');
    openLiveHome();
  };
  if(liveRec && liveRec.state!=='inactive'){
    liveRec.onstop=()=>{
      try{ const b=new Blob(liveChunks,{type:liveRec.mimeType||'video/webm'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='live-'+Date.now()+'.webm'; document.body.appendChild(a); a.click(); a.remove(); }catch(e){}
      liveRec=null; finish();
    };
    liveRec.stop();
  } else finish();
}

/* ============== BLACK1 — legendary logo intro (login) ============== */
const B1I={raf:0,t0:0,parts:[],burst:false,sound:false,restarted:false,done:true,timers:[],cv:null,ctx:null,W:0,H:0,dpr:1,word:null,wasOn:false};
function b1Sound(){
  if(!LQA.ok()) return;
  try{
    const c=LQA.init(), out=LQA.out, t0=c.currentTime+.05;
    const tone=(type,f0,f1,t,d,v)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+d);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+Math.min(.03,d*.2));g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(out);o.start(t);o.stop(t+d+.05);};
    // riser: filtered noise + sweeping sine
    const ns=c.createBufferSource(); ns.buffer=LQA.nb; ns.loop=true;
    const bp=c.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=1.4; bp.frequency.setValueAtTime(180,t0); bp.frequency.exponentialRampToValueAtTime(5200,t0+1.3);
    const ng=c.createGain(); ng.gain.setValueAtTime(.0001,t0); ng.gain.exponentialRampToValueAtTime(.12,t0+1.26); ng.gain.linearRampToValueAtTime(0,t0+1.32);
    ns.connect(bp); bp.connect(ng); ng.connect(out); ns.start(t0,Math.random()); ns.stop(t0+1.4);
    tone('sine',70,520,t0,1.3,.08); tone('triangle',140,1040,t0+.1,1.2,.03);
    // impact
    const b=t0+1.3; tone('sine',130,36,b,1.2,.55); tone('sine',65,30,b,1.4,.3);
    const nb=c.createBufferSource(); nb.buffer=LQA.nb; nb.loop=true; const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(5000,b); lp.frequency.exponentialRampToValueAtTime(200,b+.8);
    const bg=c.createGain(); bg.gain.setValueAtTime(.22,b); bg.gain.exponentialRampToValueAtTime(.0001,b+.9); nb.connect(lp); lp.connect(bg); bg.connect(out); nb.start(b); nb.stop(b+1);
    // crystal chimes
    [659.25,987.77,1318.5,1975.5,2637].forEach((f,i)=>{tone('sine',f,f,b+.08+i*.075,1.7,.055);tone('sine',f*2.002,f*2.002,b+.08+i*.075,1.1,.018);});
    // sparkles while the wordmark writes itself
    for(let i=0;i<9;i++) tone('sine',2400+Math.random()*3200,2400+Math.random()*3200,t0+2.2+i*.12+Math.random()*.05,.28,.02);
    tone('sine',880,880,t0+3.35,1.5,.03); tone('sine',1318.5,1318.5,t0+3.4,1.5,.025);
  }catch(e){}
}
function b1Size(){
  const cv=B1I.cv, d=Math.min(2,window.devicePixelRatio||1); B1I.dpr=d;
  B1I.W=innerWidth; B1I.H=innerHeight; cv.width=B1I.W*d; cv.height=B1I.H*d; B1I.ctx.setTransform(d,0,0,d,0,0);
}
function b1Start(sound){
  const el=document.getElementById('b1Intro'); if(!el) return;
  el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');
  B1I.cv=document.getElementById('b1Cv'); B1I.ctx=B1I.cv.getContext('2d'); b1Size();
  B1I.t0=performance.now(); B1I.sound=sound; B1I.burst=false; B1I.word=null; B1I.done=false; B1I.parts=[];
  const cx=B1I.W/2, cy=B1I.H*.41, R0=Math.hypot(B1I.W,B1I.H)*.62;
  for(let i=0;i<230;i++){
    B1I.parts.push({k:'in',a:Math.random()*6.283,R:R0*(.45+Math.random()*.6),spin:(Math.random()<.5?-1:1)*(1.8+Math.random()*3.2),dl:Math.random()*.55,dur:.75+Math.random()*.5,
      s:.7+Math.random()*2.1,h:195+Math.random()*40,l:62+Math.random()*30});
  }
  cancelAnimationFrame(B1I.raf); B1I.timers.forEach(clearTimeout); B1I.timers=[];
  if(sound) b1Sound();
  B1I.raf=requestAnimationFrame(b1Frame);
  B1I.timers.push(setTimeout(b1End,4900));
}
function b1Burst(){
  const cx=B1I.W/2, cy=B1I.H*.41, P=B1I.parts;
  for(let i=0;i<300;i++){const a=Math.random()*6.283, sp=140+Math.pow(Math.random(),1.6)*900;
    P.push({k:'p',x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.7+Math.random()*1.3,t:0,s:.8+Math.random()*2.6,h:196+Math.random()*44,l:65+Math.random()*30,drag:.982,g:0});}
  for(let i=0;i<46;i++){const a=Math.random()*6.283, sp=500+Math.random()*900;
    P.push({k:'st',x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.35+Math.random()*.5,t:0,s:1+Math.random()*1.4,h:205+Math.random()*30,l:80,drag:.97});}
  for(let i=0;i<90;i++){const a=Math.random()*6.283, d=20+Math.random()*B1I.W*.5;
    P.push({k:'e',x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d*.8,vx:(Math.random()-.5)*14,vy:-10-Math.random()*26,life:2.6+Math.random()*2.2,t:0,s:.6+Math.random()*1.7,h:200+Math.random()*30,l:75,drag:1,tw:Math.random()*6.28});}
}
function b1Frame(now){
  if(B1I.done) return;
  const ctx=B1I.ctx, W=B1I.W, H=B1I.H, t=(now-B1I.t0)/1000, cx=W/2, cy=H*.41, dt=Math.min(.05,(now-(B1I.lastT||now))/1000||.016); B1I.lastT=now;
  ctx.globalCompositeOperation='destination-out'; ctx.fillStyle='rgba(0,0,0,.2)'; ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='lighter';
  if(!B1I.burst && t>=1.3){ B1I.burst=true; b1Burst(); }
  // pen sparks while the wordmark is drawn
  if(t>2.1 && t<3.35){
    if(!B1I.word){ const w=document.querySelector('.b1-word'); if(w) B1I.word=w.getBoundingClientRect(); }
    if(B1I.word){
      const q=Math.min(1,(t-2.15)/1.15), e=q*q*(3-2*q), x=B1I.word.left+e*B1I.word.width;
      for(let i=0;i<4;i++) B1I.parts.push({k:'p',x:x,y:B1I.word.top+B1I.word.height*(.2+Math.random()*.6),vx:(Math.random()-.5)*90,vy:-30+Math.random()*190,life:.5+Math.random()*.7,t:0,s:.7+Math.random()*1.7,h:200+Math.random()*30,l:78,drag:.985,g:260});
    }
  }
  if(t>3 && Math.random()<.6){
    const a=Math.random()*6.283, d=B1I.W*.2+Math.random()*B1I.W*.22;
    B1I.parts.push({k:'e',x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d*.75,vx:(Math.random()-.5)*10,vy:-8-Math.random()*20,life:2+Math.random()*1.6,t:0,s:.6+Math.random()*1.4,h:205,l:80,drag:1,tw:Math.random()*6.28});
  }
  const P=B1I.parts;
  for(let i=P.length-1;i>=0;i--){
    const p=P[i];
    if(p.k==='in'){
      const u=Math.max(0,Math.min(1,(t-p.dl)/p.dur)); if(t<p.dl) continue;
      if(u>=1){P.splice(i,1);continue;}
      const e=Math.pow(u,1.7), R=p.R*(1-e), a=p.a+p.spin*e;
      const x=cx+Math.cos(a)*R, y=cy+Math.sin(a)*R*.85, al=Math.min(1,u*3)*(.35+.65*e);
      ctx.fillStyle=`hsla(${p.h},100%,${p.l}%,${al*.18})`; ctx.beginPath(); ctx.arc(x,y,p.s*4,0,6.283); ctx.fill();
      ctx.fillStyle=`hsla(${p.h},100%,${p.l}%,${al})`; ctx.beginPath(); ctx.arc(x,y,p.s,0,6.283); ctx.fill();
    }else{
      p.t+=dt; if(p.t>=p.life){P.splice(i,1);continue;}
      const f=Math.pow(p.drag,dt*60); p.vx*=f; p.vy=p.vy*f+(p.g||0)*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
      const u=p.t/p.life; let al=(1-u); if(p.k==='e') al=Math.sin(u*Math.PI)*(.45+.55*Math.sin(p.t*5+p.tw))*.8;
      if(p.k==='st'){ ctx.strokeStyle=`hsla(${p.h},100%,${p.l}%,${al})`; ctx.lineWidth=p.s; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx*.045,p.y-p.vy*.045); ctx.stroke(); }
      else{
        ctx.fillStyle=`hsla(${p.h},100%,${p.l}%,${Math.max(0,al)*.2})`; ctx.beginPath(); ctx.arc(p.x,p.y,p.s*3.4,0,6.283); ctx.fill();
        ctx.fillStyle=`hsla(${p.h},100%,${Math.min(95,p.l+10)}%,${Math.max(0,al)})`; ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,6.283); ctx.fill();
      }
    }
  }
  B1I.raf=requestAnimationFrame(b1Frame);
}
function b1End(){
  if(B1I.done) return; B1I.done=true;
  cancelAnimationFrame(B1I.raf); B1I.timers.forEach(clearTimeout); B1I.timers=[];
  const el=document.getElementById('b1Intro'), gate=document.getElementById('authGate');
  if(el) el.classList.add('out');
  if(gate) gate.classList.remove('b1-wait');
  setTimeout(()=>{ if(el){ el.classList.remove('on','play','out'); } },1000);
}
function b1Hint(mode){
  const h=document.getElementById('b1Skip'); if(!h) return;
  if(mode==='sound'){
    h.classList.add('snd');
    h.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.4" height="7" rx="2"/><rect x="16.6" y="14" width="4.4" height="7" rx="2"/></svg><span>اضغط</span>';
  }else{
    h.classList.remove('snd'); h.textContent='اضغط للتخطي';
  }
}
function b1IntroPlay(){
  const el=document.getElementById('b1Intro'); if(!el) return;
  if((window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)||document.body.classList.contains('reduce-motion')) return;
  const gate=document.getElementById('authGate'); if(gate) gate.classList.add('b1-wait');
  el.classList.remove('out','play'); el.classList.add('on');
  let run=false; try{ run=ac().state==='running'; }catch(e){}
  B1I.restarted=false;
  b1Hint(run?'skip':'sound');
  if(!el.dataset.w){
    el.dataset.w=1;
    el.addEventListener('click',()=>{
      if(B1I.done) return;
      if(!B1I.sound && !B1I.restarted){ B1I.restarted=true; try{ac();}catch(e){} b1Hint('skip'); b1Start(true); }
      else b1End();
    });
    window.addEventListener('resize',()=>{ if(!B1I.done&&B1I.cv) b1Size(); });
  }
  b1Start(run);
}

/* ============== PROFILE ============== */


function closeSub(){document.getElementById('tpSubOverlay')?.classList.remove('show');window.__pf=null;tpRefresh();}
function tpSubOpen(html){const o=document.getElementById('tpSubOverlay');o.innerHTML=`<div class="tp-in">${html}</div>`;o.scrollTop=0;o.classList.add('show');}
function tpTRowD(key,label,desc,c){
  const on=!!tpGet(key);
  return `<div class="tp-trow" onclick="tpToggle('${key}',this)"><span class="tp-tl">${label}${desc?`<small>${desc}</small>`:''}</span><span class="tp-tv">${on?'تشغيل':'إيقاف'}</span><span class="tp-sw ${on?'on':''}" data-c="${c||'green'}"></span></div>`;
}
function openAccountSettings(section){
  const s=DATA.profile.settings;
  const groups=[
    {title:'الواجهة',items:[
      ['المظهر الزجاجي','تخصيص تجربة Black 1 الزجاجية','darkMode'],
      ['أصوات الواجهة','أصوات هادئة عند الضغط','sounds'],
      ['تقليل الحركة','تقليل المؤثرات والحركة','reduceMotion']
    ]},
    {title:'الخصوصية والتواصل',items:[
      ['الحساب الخاص','التحكم في ظهور حسابك ومحتواك','privateAccount'],
      ['حالة النشاط','إظهار أنك متصل الآن','activityStatus'],
      ['المنشن والإشارات','السماح بذكرك في المنشورات','mentions'],
      ['التعليقات','السماح بالتعليق على منشوراتك','comments'],
    ]},
    {title:'الإشعارات',items:[
      ['الإشعارات','تنبيهات الإعجابات والمتابعات','notifications'],
      ['تنبيهات تسجيل الدخول','تنبيه عند تسجيل دخول جديد','loginAlerts']
    ]},
    {title:'الأمان',items:[
      ['التحقق بخطوتين','طبقة حماية إضافية للحساب','twoStep'],
      ['تنبيهات المتابعة','إشعارات المتابعين الجدد','notifyFollows']
    ]},
    {title:'المحتوى والبيانات',items:[
      ['التشغيل التلقائي','تشغيل الوسائط تلقائياً','autoplay'],
      ['اقتراحات مخصصة','تخصيص المحتوى حسب تفاعلك','personalizedFeed'],
      ['جودة عالية','تحميل الوسائط بأعلى جودة','highQuality'],
      ['اللغة','لغة واجهة التطبيق','language','select']
    ]}
  ];
  const titles={appearance:'المظهر والواجهة',privacy:'الخصوصية والأمان',notifications:'الإشعارات',security:'الأمان',content:'المحتوى واللغة',data:'المحتوى والبيانات'};
  let n=0,body='';
  groups.forEach(g=>{
    if(section && !sectionMatches(section,g.title)) return;
    body+=`<div class="tp-label">${g.title}</div><div class="tp-panel">`;
    g.items.forEach(it=>{
      if(it[3]==='select'){
        body+=`<div class="tp-trow" style="cursor:default"><span class="tp-tl">${it[0]}<small>${it[1]}</small></span><select id="set_language" class="tp-sel" onchange="DATA.profile.settings.language=this.value;saveData()"><option ${s.language!=='English'?'selected':''}>العربية</option><option ${s.language==='English'?'selected':''}>English</option></select></div>`;
      } else body+=tpTRowD(it[2],it[0],it[1],(n++)%2?'blue':'green');
    });
    body+=`</div>`;
  });
  if(!body) body='<div class="tp-note" style="text-align:center">لا توجد إعدادات إضافية لهذا القسم.</div>';
  tpSubOpen(tpHeader(titles[section]||'مركز التحكم بالحساب','closeSub()','saveSettingsAndClose()','حفظ')+
    `<section class="tp-card"><div class="tp-h">${titles[section]||'مركز التحكم بالحساب'}</div>${body}
    <div class="tp-note">التوثيق تلقائي — كل مستخدم في Black 1 يظهر بجانب اسمه نفس الشارة الزرقاء المضيئة.</div>
    <button class="tp-btn" type="button" onclick="saveSettingsAndClose()">حفظ الإعدادات</button></section>`);
}

function sectionMatches(section,title){
  const map={
    appearance:'الواجهة',
    privacy:'الخصوصية والتواصل',
    notifications:'الإشعارات',
    security:'الأمان',
    content:'المحتوى والبيانات',
    data:'المحتوى والبيانات'
  };
  return map[section]===title;
}

function saveSettingsAndClose(){
  const lang=document.getElementById('set_language');
  if(lang) DATA.profile.settings.language=lang.value;
  saveData(); closeSub(); renderProfile(); toast('تم حفظ جميع الإعدادات ⚙️');
}

function sanitizeProfileMedia(){
  const p=DATA.profile||{};
  if(typeof DEFAULT_PROFILE_AVATAR!=='undefined' && p.avatarData===DEFAULT_PROFILE_AVATAR) p.avatarData='';
  if(typeof DEFAULT_PROFILE_COVER!=='undefined' && p.coverData===DEFAULT_PROFILE_COVER) p.coverData='';
  return p;
}


/* ============== PROFILE — rebuilt from the supplied reference (real data only) ============== */
let PF_ITEMS=[], pfLoadToken=0;
const PF_ICON={
  person:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M4.8 20c.8-3.7 3.6-5.8 7.2-5.8s6.4 2.1 7.2 5.8"/></svg>',
  play:'<svg viewBox="0 0 24 24"><path d="M7 4.6v14.8a.8.8 0 0 0 1.2.7l12-7.4a.8.8 0 0 0 0-1.4L8.2 3.9A.8.8 0 0 0 7 4.6Z"/></svg>'
};

function renderProfile(fromNav){
  const $=id=>document.getElementById(id);
  if(!$('pfTitleText')) return;
  const p=sanitizeProfileMedia();
  const name=(p.name||'').trim();
  const handle=(p.handle||'').trim().replace(/^@/,'');

  $('pfTitleText').textContent = name&&handle ? `${name} (@${handle})` : (name || (handle?`@${handle}`:''));
  $('pfVerified').classList.toggle('show', p.verified===true);

  /* cover: the user's own cover, otherwise their own photo blurred — never a stock image */
  const cvv=p.coverData||''; const isVid=isVideoCover(cvv);
  const bg=isVid?'':(cvv||p.avatarData||'');
  $('pfCover').classList.toggle('has-img',!!bg);
  $('pfCover').classList.toggle('from-avatar',!isVid && !cvv && !!p.avatarData);
  pfCoverVideo(isVid?cvv:'');
  $('pfCoverImg').style.backgroundImage = bg ? 'url("'+String(bg).replace(/"/g,'%22')+'")' : '';

  $('pfAvatarIn').innerHTML = p.avatarData ? `<img src="${escapeAttr(p.avatarData)}" alt="">` : PF_ICON.person;

  $('statFollowers').textContent=formatCount(p.followers);
  $('statFollowing').textContent=formatCount(p.following);
  $('statLikes').textContent=formatCount(p.likes);

  const bio=(p.bio||'').trim(), loc=(p.location||'').trim();
  $('pfBio').innerHTML = escapeHtml(bio) + (loc ? (bio?'\n':'') + '📍 ' + escapeHtml(loc) : '');

  const raw=(p.website||'').trim(), link=$('pfLink');
  if(raw){
    $('pfLinkText').textContent=raw;
    link.href=/^https?:\/\//i.test(raw)?raw:`https://${raw}`;
    link.classList.add('show');
  }else{
    $('pfLinkText').textContent=''; link.removeAttribute('href'); link.classList.remove('show');
  }
  renderProfileGallery(fromNav===true);
}


/* ===== profile tabs: published / reposts / saved / liked (real data only) ===== */
let PFT='posts';
const PFE={reposts:'لم تعد نشر أي منشور بعد',saved:'لا توجد منشورات محفوظة',liked:'لا توجد منشورات أعجبتك'};
function pfTab(k){ PFT=k; document.querySelectorAll('#pfTabs .pf-tab').forEach(b=>b.classList.toggle('on',b.dataset.t===k)); renderProfileGallery(); }
function pfTabItems(){
  if(PFT==='posts') return profileItems().filter(it=>!pfRepost(it.id));
  const mine=String((DATA.profile||{}).handle||'').replace(/^@/,''),isMine=p=>String((postAuthor(p)||{}).handle||'').replace(/^@/,'')===mine;
  const f={reposts:p=>p.repostOf&&isMine(p),saved:p=>p.saved,liked:p=>p.liked}[PFT];
  return (DATA.posts||[]).filter(p=>p&&p.mediaData&&f(p)).map(p=>({id:p.id,mediaData:p.mediaData,mediaType:p.mediaType||'',text:p.text||'',time:p.time,views:p.views,cover:p.cover||'',mine:isMine(p)}));
}
function pfRepost(id){ const p=id&&findPost(id); return !!(p&&p.repostOf); }
/* everything the account has really published (media or text) */
function profileItems(){
  const p=DATA.profile||{}, mine=String(p.handle||'').replace(/^@/,'');
  const items=[];
  (Array.isArray(p.gallery)?p.gallery:[]).filter(Boolean).forEach(src=>items.push({mediaData:src,mediaType:'image'}));
  (DATA.posts||[]).forEach(post=>{
    const a=postAuthor(post)||{};
    if(String(a.handle||'').replace(/^@/,'')!==mine) return;
    if(!post.mediaData && !(post.text||'').trim()) return;
    items.push({id:post.id,mediaData:post.mediaData||'',mediaType:post.mediaType||'',text:post.text||'',time:post.time,views:post.views,cover:post.cover||''});
  });
  return items;
}

function renderProfileGallery(fromNav){
  const area=document.getElementById('profileGalleryArea'); if(!area) return;
  PF_ITEMS=pfTabItems();
  if(!PF_ITEMS.length&&PFT!=='posts'){ area.innerHTML=`<div class="pf-empty"><b>${PFE[PFT]}</b></div>`; pfTrackLoading(area,0); return; }
  if(!PF_ITEMS.length){
    area.innerHTML=`<div class="pf-empty"><b>لا يوجد محتوى بعد</b><span>الصور والفيديوهات والمنشورات التي تنشرها ستظهر هنا.</span><div class="btn btn-glass" onclick="openPostModal()">نشر الآن</div></div>`;
    pfTrackLoading(area,0);
    return;
  }
  area.innerHTML=PF_ITEMS.map((it,i)=>{
    const isVideo=String(it.mediaType||'').startsWith('video');
    const src=escapeAttr(it.mediaData||'');
    let inner;
    if(it.mediaData) inner=isVideo?`<video src="${src}#t=0.1" ${it.cover?`poster="${escapeAttr(it.cover)}"`:''} muted playsinline preload="metadata"></video>`:`<img src="${src}" alt="" loading="lazy">`;
    else inner=`<div class="pf-cell-text"><p>${escapeHtml(it.text)}</p></div>`;
    const views=Number(it.views||0);
    const meta=isVideo?`<div class="pf-cell-meta"><span class="pf-cell-views">${PF_ICON.play}${views>0?`<em>${formatCount(views)}</em>`:''}</span><span class="pf-cell-vid">${PF_ICON.play}</span></div>`:'';
    return `<button type="button" class="pf-cell" onclick="openProfileItem(${i})" aria-label="${isVideo?'Video':'Post'} ${i+1}">${inner}${meta}</button>`;
  }).join('');
  pfTrackLoading(area,fromNav?550:0);
}

/* spinner is shown only while thumbnails are really loading */
function pfTrackLoading(scope,minMs){
  const sp=document.getElementById('pfSpinner'); if(!sp) return;
  const media=[...scope.querySelectorAll('img,video')];
  const pending=media.filter(m=>m.tagName==='IMG'?!m.complete:m.readyState<1);
  const token=++pfLoadToken;
  if(!media.length || (!pending.length && !minMs)){ sp.classList.remove('on'); return; }
  sp.classList.add('on');
  const waits=pending.map(m=>new Promise(res=>{
    const ev=m.tagName==='IMG'?'load':'loadedmetadata';
    m.addEventListener(ev,res,{once:true}); m.addEventListener('error',res,{once:true}); setTimeout(res,6000);
  }));
  waits.push(new Promise(r=>setTimeout(r,minMs||0)));
  Promise.all(waits).then(()=>{ if(token===pfLoadToken) sp.classList.remove('on'); });
}

function openProfileItem(i){
  const it=PF_ITEMS[i]; if(!it) return;
  if(it.id && it.mediaData && window.rlOpenFromProfile && (String(it.mediaType||'').startsWith('video')||String(it.mediaType||'').startsWith('image'))){ window.rlOpenFromProfile(it.id,PFT==='posts'?null:PF_ITEMS.filter(x=>/^(video|image)/.test(x.mediaType||'')).map(x=>x.id)); return; }
  const isVideo=String(it.mediaType||'').startsWith('video');
  const src=escapeAttr(it.mediaData||'');
  const media=it.mediaData?(isVideo?`<video src="${src}" controls playsinline></video>`:`<img src="${src}" alt="">`):'';
  document.getElementById('modalBox').innerHTML=`<div class="pf-viewer">${media}${it.text?`<div class="pf-viewer-text">${escapeHtml(it.text)}</div>`:''}${it.time?`<div class="pf-viewer-meta">${timeAgo(it.time)}</div>`:''}</div>
    <div class="modal-actions"><div class="modal-cancel" onclick="closeModal()">إغلاق</div>${it.id&&it.mine!==false?`<div class="btn btn-glass" onclick="closeModal();deletePost('${it.id}')">حذف</div>`:''}</div>`;
  document.getElementById('modalOverlay').classList.add('show');
}

/* ============== LIQUID GLASS transparency (iOS 27 slider) ============== */
function applyGlass(){
  const raw=DATA.profile&&DATA.profile.settings?DATA.profile.settings.glass:undefined;
  const t=Math.max(0,Math.min(100,Number(raw==null?45:raw)));
  document.documentElement.style.setProperty('--lg-t',(t/100).toFixed(2));
}
function setGlassTint(v){
  DATA.profile.settings.glass=Number(v); applyGlass();
  document.querySelectorAll('.lgVal').forEach(el=>el.textContent=v+'%');
  clearTimeout(window.__glT); window.__glT=setTimeout(saveData,300);
}

function formatCount(n){
  const v=Number(n)||0;
  if(v>=1000000)return (v/1000000).toFixed(v%1000000?1:0)+'M';
  if(v>=1000)return (v/1000).toFixed(v%1000?1:0)+'K';
  return String(v);
}


async function shareProfile(){
  sound('soft');
  try{
    const p=DATA.profile||{};
    const text=[p.name,p.handle?`@${p.handle.replace(/^@/,'')}`:''].filter(Boolean).join(' ');
    if(navigator.share){ await navigator.share({text}); }
    else if(text && navigator.clipboard){ await navigator.clipboard.writeText(text); toast('تم نسخ بيانات الملف 📋'); }
  }catch(e){}
}



/* ============== FULL SETTINGS VIEW ============== */
/* ============== SETTINGS — Profile & Theme (matches the reference) ============== */
const TP_BLOB="M0.08,0 L0.92,0 C0.97,0 1,0.04 1,0.10 L1,0.14 C1,0.27 0.86,0.24 0.81,0.35 C0.75,0.46 0.87,0.44 0.92,0.58 C0.95,0.68 0.93,0.80 0.87,0.90 C0.83,0.97 0.78,1 0.70,1 L0.30,1 C0.20,1 0.14,0.96 0.12,0.86 C0.10,0.74 0.11,0.62 0.09,0.50 C0.07,0.38 0,0.30 0,0.14 L0,0.10 C0,0.04 0.03,0 0.08,0 Z";
const TP_ACC={
  cyan:{c:['#18d9e6','#4f8dff','#8a7dff'],o:['#6bf3f7','#08a8bd'],n:'سماوي'},
  magenta:{c:['#ff4fd8','#8a6bff','#ff4f7d'],o:['#ff6bd0','#c2107f'],n:'فوشيا'},
  gold:{c:['#ffcf3f','#ff9a3d','#ff5f96'],o:['#ffd95a','#c98f08'],n:'ذهبي'},
  teal:{c:['#2fd6c0','#39a7ff','#9d7cff'],o:['#3fd6cf','#0f7f86'],n:'تركوازي'},
  purple:{c:['#9d6bff','#6b7bff','#ff6ee8'],o:['#b48cff','#6a2fd0'],n:'بنفسجي'}
};
const TP_PAL={teal:['#4fd8d0','#12888e','تركوازي'],rose:['#ff7aa2','#c9285a','وردي'],purple:['#a47cff','#5a2fc0','بنفسجي'],orange:['#ffb04a','#e26a0a','برتقالي'],peach:['#ffc9b5','#e08a7a','خوخي']};
const TP_BGS=[['fluid','تدرّج سائل'],['waves','أمواج سائلة'],['glass','زجاج صلب'],['dark','داكن صلب']];
const TP_FONTS={modern:"-apple-system,BlinkMacSystemFont,'SF Pro Text','SF Pro Display','Inter','Cairo','Tajawal',system-ui,sans-serif",cairo:"'Cairo','Inter',system-ui,sans-serif",tajawal:"'Tajawal','Inter',system-ui,sans-serif"};
const TP_OPTS={
  fontStyle:{title:'نمط الخط',items:[['modern','عصري'],['cairo','كايرو'],['tajawal','تجوال']]},
  iconPack:{title:'حزمة الأيقونات',items:[['outline','خطّية'],['bold','عريضة'],['duotone','مزدوجة']]},
};
const TP_DEF={blurOn:true,vibrancyOn:true,bgStyle:'fluid',palette:'',fontStyle:'modern',iconPack:'outline',nastaFont:false};
function tpGet(k){const v=DATA.profile.settings[k];return v===undefined?TP_DEF[k]:v;}
function tpSet(k,v){DATA.profile.settings[k]=v;saveData();}
function tpOptLabel(k){const o=TP_OPTS[k];const c=tpGet(k);return (o.items.find(x=>x[0]===c)||o.items[0])[1];}
function tpAccKey(){const a=DATA.profile.settings.accent;const m={default:'cyan',pink:'magenta',green:'teal'};return m[a]||a||'cyan';}

function applyTheme(){
  const st=DATA.profile.settings,b=document.body,r=document.documentElement.style;
  b.dataset.bg=tpGet('bgStyle');b.dataset.pal=tpGet('palette')||'';
  b.dataset.icons=tpGet('iconPack');b.classList.toggle('nasta',!!tpGet('nastaFont'));
  const bl=tpGet('blurOn')!==false,vb=tpGet('vibrancyOn')!==false;
  b.classList.toggle('no-blur',!bl);b.classList.toggle('reduce-motion',!!st.reduceMotion);
  r.setProperty('--lg-blur',(bl?'blur(22px) ':'')+'saturate('+(vb?175:100)+'%) brightness(1.05)');
  r.setProperty('--font-ui',TP_FONTS[tpGet('fontStyle')]||TP_FONTS.modern);
}
function tpRefresh(){
  if(document.getElementById('view-settings')?.classList.contains('active'))renderSettingsView(window.__settingsSection||'');
}
function tpTRow(key,label,c){
  const on=!!tpGet(key);
  return `<div class="tp-trow" onclick="tpToggle('${key}',this)"><span class="tp-tl">${label}</span><span class="tp-tv">${on?'تشغيل':'إيقاف'}</span><span class="tp-sw ${on?'on':''}" data-c="${c||'green'}"></span></div>`;
}
function tpToggle(key,el){
  const v=!tpGet(key);tpSet(key,v);
  if(el){el.querySelector('.tp-sw')?.classList.toggle('on',v);const tv=el.querySelector('.tp-tv');if(tv)tv.textContent=v?'تشغيل':'إيقاف';}
  if(key==='blurOn'||key==='vibrancyOn'||key==='reduceMotion'||key==='nastaFont')applyTheme();
  if(key==='activityStatus')tpRefresh();
}
function tpAccent(k){tpSet('accent',k);applyAccent();tpRefresh();}
function tpBg(k){tpSet('bgStyle',k);applyTheme();tpRefresh();}
function tpPalette(k){tpSet('palette',tpGet('palette')===k?'':k);applyTheme();tpRefresh();}
function tpGlass(el){setGlassTint(el.value);el.style.setProperty('--v',el.value+'%');}
function tpPicker(k){
  const o=TP_OPTS[k],cur=tpGet(k);
  document.getElementById('modalBox').innerHTML=`<div class="modal-title">${o.title}</div><div class="tp-list">${o.items.map(([v,l])=>`<div class="tp-row" onclick="tpPick('${k}','${v}')"><b>${l}</b>${v===cur?'<span style="color:#fff;font-size:18px">✓</span>':''}</div>`).join('')}</div><div class="modal-actions"><div class="modal-cancel" onclick="closeModal()">إغلاق</div></div>`;
  document.getElementById('modalOverlay').classList.add('show');
}
function tpPick(k,v){tpSet(k,v);applyTheme();closeModal();tpRefresh();}

function tpAvatar(){
  const p=DATA.profile;
  const inner=p.avatarData?`<img src="${p.avatarData}" alt="">`:escapeHtml(p.avatar||'👤');
  return `<div class="tp-av">${inner}${p.settings.activityStatus!==false?'<i class="tp-on"></i>':''}</div>`;
}
function tpHeader(title,backFn,editFn,label,av){
  const p=DATA.profile,name=escapeHtml(p.name||p.handle||'حسابي'),bio=(p.bio||'').trim();
  return `<div class="tp-top"><div class="tp-blob"></div><svg class="tp-edge" viewBox="0 0 1 1" preserveAspectRatio="none"><path d="${TP_BLOB}"/></svg>
    <div class="tp-nav"><button class="tp-back" type="button" onclick="${backFn}" aria-label="رجوع"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button><div class="tp-title">${title}</div><button class="tp-edit" type="button" onclick="${editFn}">${label||'تعديل'}</button></div>
    <div class="tp-id">${av||tpAvatar()}<div class="tp-name" id="tpHName" dir="auto">${name}</div><div class="tp-bio" id="tpHBio" dir="auto" ${bio?'':'hidden'}>${bio?escapeHtml(bio)+' ✦':''}</div></div></div>`;
}
function tpOrbs(map,cur,fn){
  return '<div class="tp-orbs">'+Object.keys(map).map(k=>{const o=map[k].o||map[k];return `<button type="button" class="tp-orb ${k===cur?'sel':''}" style="--o1:${o[0]};--o2:${o[1]}" onclick="${fn}('${k}')" aria-label="${map[k].n||map[k][2]}"></button>`;}).join('')+'</div>';
}
function tpRow(label,value,click){
  return `<div class="tp-row" onclick="${click}"><b>${label}</b>${value?`<span>${escapeHtml(value)}</span>`:''}<i>›</i></div>`;
}
function renderSettingsView(section){
  window.__settingsSection=section||'';
  const el=document.getElementById('settingsContent');if(!el)return;
  const st=DATA.profile.settings,gv=Number(st.glass==null?45:st.glass);
  const seg=TP_BGS.map(([k,l])=>`<button type="button" class="s-${k} ${tpGet('bgStyle')===k?'sel':''}" onclick="tpBg('${k}')">${l}</button>`).join('');
  const onoff=v=>v?'تشغيل':'إيقاف';
  const adv=
    tpRow('نمط الخط',tpOptLabel('fontStyle'),"tpPicker('fontStyle')")+
    tpRow('حزمة الأيقونات',tpOptLabel('iconPack'),"tpPicker('iconPack')")+
    tpRow('الحساب',st.handle||DATA.profile.handle?'@'+(DATA.profile.handle||''):'',"openProfileStudio()")+
    tpRow('الخصوصية والأمان',st.privateAccount?'حساب خاص':'حساب عام',"openAccountSettings('privacy')")+
    tpRow('الإشعارات',onoff(st.notifications),"openAccountSettings('notifications')")+
    tpRow('البيانات والتخزين','',"openDataCenter()")+
    tpRow('اللغة',st.language||'العربية',"openLangPicker()")+
    tpRow('تقليل الحركة',onoff(!!st.reduceMotion),"tpToggle('reduceMotion');tpRefresh()");
  el.innerHTML=tpHeader('الملف والمظهر',"go('profile')","openProfileStudio()")+`
  <section class="tp-card">
    <div class="tp-h">تخصيص المظهر</div>
    <div class="tp-label">لون التمييز الأساسي</div>${tpOrbs(TP_ACC,tpAccKey(),'tpAccent')}
    <div class="tp-label">نمط الخلفية</div><div class="tp-seg">${seg}</div>
    <div class="tp-label">مفاتيح شفافة</div>
    <div class="tp-panel">${tpTRow('blurOn','تأثير الضبابية','green')}${tpTRow('vibrancyOn','حيوية الألوان','blue')}
      <div class="tp-slider"><span class="tp-tl">شدة الزجاج</span><input type="range" min="0" max="100" value="${gv}" style="--v:${gv}%" oninput="tpGlass(this)"></div></div>
    <div class="tp-label">لوحة الألوان</div>${tpOrbs(TP_PAL,tpGet('palette'),'tpPalette')}
    <div class="tp-label">خط الكتابة</div>
    <div class="tp-panel">${tpTRow('nastaFont','خط النستعليق (زي الفيديو) — يظهر للناس','green')}
      <div class="tp-trow" style="cursor:default;display:block;padding:6px 14px 10px"><span class="tp-tl" style="display:block;margin-bottom:2px;font-size:13px;opacity:.7">جرّب الكتابة هنا — تعليقات، رسائل، أو اسمك</span><input class="nasta-sample" type="text" dir="rtl" maxlength="80" placeholder="اكتب هنا…" value="${escapeAttr(DATA.profile.name||'')}"></div></div>
    <div class="tp-label" id="tpAdv">إعدادات متقدمة</div>
    <div class="tp-list">${adv}</div>
  </section>`;
}
function openSettingsView(section){
  go('settings');renderSettingsView(section||'');
  if(section&&section!=='appearance')setTimeout(()=>document.getElementById('tpAdv')?.scrollIntoView({behavior:'smooth',block:'start'}),150);
}

/* ============== GAME STORE V7 ============== */
let storeCategory='all', storeSort='latest', storeGames=[];
const API_BASE = (window.GAME_API_BASE || '/api');
async function api(path, options={}){
  const res=await fetch(API_BASE+path,{credentials:'include',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  if(!res.ok) throw new Error(await res.text()||('HTTP '+res.status));
  const ct=res.headers.get('content-type')||''; return ct.includes('application/json')?res.json():res.text();
}
function money(v){return Number(v||0).toFixed(2)+'$';}
function escapeAttr(s){return escapeHtml(s).replace(/"/g,'&quot;');}
async function fetchGames(){
  try{ storeGames=await api('/games'); DATA.games=storeGames; await saveData(); }
  catch(e){ storeGames=DATA.games||[]; }
}
function setStoreCategory(cat,el){ storeCategory=cat; document.querySelectorAll('#storeCats .store-cat').forEach(x=>x.classList.remove('active')); if(el)el.classList.add('active'); renderStore(); }
function gamePlatformLabel(g){return (g.platforms||[]).map(x=>({pc:'PC',playstation:'PS',xbox:'Xbox',switch:'Switch'}[x]||x)).join(' · ')||'متعدد المنصات';}
function gameCard(g){
  return `<article class="game-card"><div class="game-cover">${g.coverData?`<img src="${g.coverData}" alt="${escapeAttr(g.title)}">`:`<div class="game-cover-fallback">🎮</div>`}${g.discount?`<div class="game-badge">-${escapeHtml(String(g.discount))}%</div>`:''}</div><div class="game-body"><div class="game-title">${escapeHtml(g.title)}</div><div class="game-meta"><span>${escapeHtml(gamePlatformLabel(g))}</span><span>${escapeHtml(g.category||'لعبة')}</span></div><div class="game-price-row"><div class="game-price">${money(g.price)}</div><button class="game-action" onclick="addToCart('${g.id}')">إضافة للسلة</button></div></div></article>`;
}
function storeHero(g){
  if(!g) return `<div class="store-hero"><div class="store-hero-grid"></div><div class="store-hero-art"></div><div class="store-hero-copy"><span class="store-kicker">GAME</span><h2>أضف أول لعبة إلى متجرك</h2><p>لا توجد ألعاب منشورة بعد. انشر لعبة من حسابك لتظهر هنا تلقائياً، </p><div class="store-hero-actions"><button class="store-cta" onclick="openPublishGame()">نشر أول لعبة</button><button class="store-cta alt" onclick="openStoreAdmin()">لوحة الناشر</button></div></div></div>`;
  return `<div class="store-hero"><div class="store-hero-grid"></div><div class="store-hero-art"></div><div class="store-hero-copy"><span class="store-kicker">${g.category?escapeHtml(g.category):'GAME'}</span><h2>${escapeHtml(g.title)}</h2><p>${escapeHtml(g.description||'لعبة منشورة داخل متجر game.')}</p><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span class="store-price">${money(g.price)}</span>${g.discount?`<span class="store-discount">-${escapeHtml(String(g.discount))}%</span>`:''}</div><div class="store-hero-actions"><button class="store-cta" onclick="addToCart('${g.id}')">شراء / إضافة للسلة</button><button class="store-cta alt" onclick="openGameDetails('${g.id}')">التفاصيل</button></div></div></div>`;
}
async function renderStore(){
  const q=(document.getElementById('storeSearchInput')?.value||'').trim().toLowerCase();
  const src=(storeGames||[]).filter(g=>{const matchesCat=storeCategory==='all'||(g.platforms||[]).includes(storeCategory)||g.categoryKey===storeCategory; const txt=(g.title+' '+(g.description||'')+' '+(g.developer||'')).toLowerCase(); return matchesCat && (!q||txt.includes(q));});
  let sorted=[...src]; if(storeSort==='bestseller') sorted.sort((a,b)=>(b.sales||0)-(a.sales||0)); else sorted.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const hero=sorted[0]||null; document.getElementById('storeHeroMount').innerHTML=storeHero(hero);
  const best=[...src].sort((a,b)=>(b.sales||0)-(a.sales||0)).slice(0,6); document.getElementById('storeBest').innerHTML=best.length?best.map(gameCard).join(''):`<div class="game-empty"><b>لا توجد ألعاب منشورة بعد</b><span>ستظهر الألعاب هنا عند نشرها من حسابك.</span></div>`;
  const latest=[...src].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,6); document.getElementById('storeLatest').innerHTML=latest.length?latest.map(gameCard).join(''):`<div class="game-empty" style="grid-column:1/-1"><b>المتجر ينتظر أول لعبة</b><span>استخدم زر «نشر لعبة» لإضافة لعبة حقيقية.</span></div>`;
  const admin=document.getElementById('storeAdminTable'); if(admin){ admin.innerHTML=(storeGames||[]).length?`<table class="store-table"><thead><tr><th>اللعبة</th><th>المنصة</th><th>السعر</th><th>الحالة</th></tr></thead><tbody>${storeGames.map(g=>`<tr><td>${escapeHtml(g.title)}</td><td>${escapeHtml(gamePlatformLabel(g))}</td><td>${money(g.price)}</td><td><span class="pill-ok">منشورة</span></td></tr>`).join('')}</tbody></table>`:`<div class="game-empty"><b>لا توجد ألعاب في حسابك</b><span>أنشئ أول منتج من لوحة الناشر.</span></div>`; }
}
function openStoreSearch(){document.getElementById('storeSearchInput')?.focus();document.getElementById('storeSearchInput')?.scrollIntoView({behavior:'smooth',block:'center'});}
function openStoreFilters(){
  document.getElementById('modalBox').innerHTML=`<div class="modal-title">🎮 فلاتر المتجر</div><div class="profile-settings-list"><div class="profile-setting profile-setting-wide" onclick="storeSort='latest';closeModal();renderStore()"><div class="ps-ic">↕</div><div style="flex:1"><b>الأحدث</b><span>ترتيب حسب تاريخ النشر</span></div></div><div class="profile-setting profile-setting-wide" onclick="storeSort='bestseller';closeModal();renderStore()"><div class="ps-ic">🔥</div><div style="flex:1"><b>الأكثر مبيعاً</b><span>ترتيب حسب المبيعات</span></div></div></div><div class="modal-actions"><div class="modal-cancel" onclick="closeModal()">إغلاق</div></div>`;document.getElementById('modalOverlay').classList.add('show');
}
function addToCart(id){const g=(storeGames||[]).find(x=>x.id===id);if(!g)return;DATA.cart=DATA.cart||[];if(!DATA.cart.some(x=>x.id===id))DATA.cart.push(g);saveData();toast('تمت إضافة اللعبة إلى السلة 🛒');}
function openStoreCart(){const items=DATA.cart||[];const total=items.reduce((s,g)=>s+Number(g.price||0),0);document.getElementById('modalBox').innerHTML=`<div class="modal-title">🛒 سلة game</div>${items.length?items.map(g=>`<div class="profile-setting profile-setting-wide"><div class="ps-ic">🎮</div><div style="flex:1"><b>${escapeHtml(g.title)}</b><span>${money(g.price)} • ${escapeHtml(gamePlatformLabel(g))}</span></div></div>`).join(''):`<div class="game-empty"><b>السلة فارغة</b><span>أضف لعبة من المتجر لتظهر هنا.</span></div>`}<div class="modal-actions"><div class="modal-cancel" onclick="closeModal()">إغلاق</div><div class="btn btn-grad" onclick="checkoutCart()">إنشاء طلب • ${money(total)}</div></div>`;document.getElementById('modalOverlay').classList.add('show');}
async function checkoutCart(){
  const items=DATA.cart||[]; if(!items.length)return;
  try{await api('/orders',{method:'POST',body:JSON.stringify({items:items.map(g=>({gameId:g.id,price:g.price}))})}); DATA.cart=[]; await saveData(); closeModal(); toast('تم إنشاء الطلب بنجاح ✅');}
  catch(e){toast('الخادم غير متصل أو لم يتم تسجيل الدخول بعد');}
}
function openStoreAdmin(){document.getElementById('storeAdmin')?.classList.toggle('show');document.getElementById('storeAdmin')?.scrollIntoView({behavior:'smooth',block:'center'});}
function openGameDetails(id){const g=(storeGames||[]).find(x=>x.id===id);if(!g)return;document.getElementById('modalBox').innerHTML=`<div class="modal-title">${escapeHtml(g.title)}</div><div class="profile-verification"><div class="pv-icon">🎮</div><div style="flex:1"><b>${escapeHtml(g.developer||'مطوّر مستقل')}</b><span>${escapeHtml(gamePlatformLabel(g))} • ${money(g.price)}</span></div></div><div style="color:#b8c8df;font-size:12px;line-height:1.9">${escapeHtml(g.description||'')}</div><div class="modal-actions"><div class="modal-cancel" onclick="closeModal()">إغلاق</div><div class="btn btn-grad" onclick="addToCart('${g.id}');closeModal()">إضافة للسلة</div></div>`;document.getElementById('modalOverlay').classList.add('show');}
function openPublishGame(){
  document.getElementById('modalBox').innerHTML=`<div class="modal-title">🚀 نشر لعبة حقيقية</div><div class="profile-verification"><div class="pv-icon">🎮</div><div style="flex:1"><b>لا توجد بيانات تجريبية</b><span>كل لعبة تضيفها ستُحفظ في قاعدة بيانات الخادم عند تشغيل المشروع الكامل.</span></div></div><div class="modal-field"><label>اسم اللعبة</label><input id="gp_title" placeholder="اسم لعبتك"></div><div class="modal-field"><label>المطور / الاستوديو</label><input id="gp_dev" value="${escapeAttr(DATA.profile.name||'')}" placeholder="اسم الاستوديو"></div><div class="modal-field"><label>الوصف</label><textarea id="gp_desc" placeholder="وصف اللعبة…"></textarea></div><div class="modal-field"><label>الفئة</label><input id="gp_cat" placeholder="Action / RPG / Strategy"></div><div class="modal-field"><label>السعر بالدولار</label><input id="gp_price" type="number" min="0" step="0.01" placeholder="29.99"></div><div class="modal-field"><label>المنصات (مثال: pc,xbox)</label><input id="gp_platforms" placeholder="pc,playstation"></div><div class="modal-field"><label>غلاف اللعبة</label><input id="gp_cover" type="file" accept="image/*"></div><div class="modal-actions"><div class="modal-cancel" onclick="closeModal()">إلغاء</div><div class="btn btn-grad" onclick="publishGameSubmit()">نشر اللعبة</div></div>`;document.getElementById('modalOverlay').classList.add('show');}
async function publishGameSubmit(){
  const title=document.getElementById('gp_title')?.value.trim(); const price=Number(document.getElementById('gp_price')?.value||0); if(!title){toast('اكتب اسم اللعبة');return;}
  const file=document.getElementById('gp_cover')?.files?.[0]; let coverData=''; if(file){if(file.size>2.5*1024*1024){toast('حجم الغلاف يجب أن يكون أقل من 2.5MB');return;} coverData=await new Promise((ok,fail)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=fail;r.readAsDataURL(file);});}
  const game={id:uid(),title,developer:document.getElementById('gp_dev')?.value.trim(),description:document.getElementById('gp_desc')?.value.trim(),category:document.getElementById('gp_cat')?.value.trim()||'Game',categoryKey:'all',price,platforms:(document.getElementById('gp_platforms')?.value||'pc').split(',').map(x=>x.trim()).filter(Boolean),coverData,createdAt:Date.now(),sales:0};
  try{const saved=await api('/games',{method:'POST',body:JSON.stringify(game)}); game.id=saved.id||game.id;}catch(e){/* offline fallback keeps the product local */}
  DATA.games=DATA.games||[]; DATA.games.unshift(game); storeGames=DATA.games; await saveData(); closeModal(); renderStore(); toast('تم نشر اللعبة ✅');
}

async function openAuthModal(){
  let me=null; try{me=await api('/me')}catch(e){}
  if(me?.user){document.getElementById('modalBox').innerHTML=`<div class="modal-title">👤 حساب game</div><div class="profile-verification"><div class="pv-icon">✓</div><div style="flex:1"><b>${escapeHtml(me.user.name||'حسابك')}</b><span>${escapeHtml(me.user.email||'')}</span></div></div><div class="modal-actions"><div class="modal-cancel" onclick="closeModal()">إغلاق</div><div class="btn btn-grad" onclick="api('/auth/logout',{method:'POST'}).then(()=>{closeModal();toast('تم تسجيل الخروج')}).catch(()=>{})">تسجيل الخروج</div></div>`;document.getElementById('modalOverlay').classList.add('show');return;}
  document.getElementById('modalBox').innerHTML=`<div class="modal-title">🔐 الدخول إلى game</div><div class="modal-field"><label>الاسم (للتسجيل)</label><input id="auth_name" placeholder="اسمك"></div><div class="modal-field"><label>البريد الإلكتروني</label><input id="auth_email" type="email" placeholder="البريد الإلكتروني"></div><div class="modal-field"><label>كلمة المرور</label><input id="auth_password" type="password" placeholder="••••••••"></div><div class="modal-actions"><div class="modal-cancel" onclick="closeModal()">إغلاق</div><button class="store-cta alt" onclick="registerAuth()">إنشاء حساب</button><button class="store-cta" onclick="loginAuth()">تسجيل الدخول</button></div>`;document.getElementById('modalOverlay').classList.add('show');
}
async function loginAuth(){const email=document.getElementById('auth_email')?.value.trim(),password=document.getElementById('auth_password')?.value;if(!email||!password){toast('أدخل البريد وكلمة المرور');return;}try{await api('/auth/login',{method:'POST',body:JSON.stringify({email,password})});closeModal();await initStore();toast('تم تسجيل الدخول ✅')}catch(e){toast('تعذر تسجيل الدخول');}}
async function registerAuth(){const name=document.getElementById('auth_name')?.value.trim(),email=document.getElementById('auth_email')?.value.trim(),password=document.getElementById('auth_password')?.value;if(!name||!email||password.length<8){toast('الاسم والبريد وكلمة المرور (8 أحرف على الأقل) مطلوبة');return;}try{await api('/auth/register',{method:'POST',body:JSON.stringify({name,email,password})});closeModal();await initStore();toast('تم إنشاء الحساب ✅')}catch(e){toast('تعذر إنشاء الحساب — قد يكون البريد مستخدماً');}}
async function initStore(){await fetchGames(); try{const me=await api('/me'); if(me.user){DATA.profile.name=me.user.name||DATA.profile.name;DATA.profile.handle=me.user.handle||DATA.profile.handle;DATA.profile.bio=me.user.bio||DATA.profile.bio;DATA.profile.location=me.user.location||DATA.profile.location;DATA.profile.website=me.user.website||DATA.profile.website;DATA.profile.avatarData=me.user.avatarData||DATA.profile.avatarData;DATA.profile.coverData=me.user.coverData||DATA.profile.coverData;await saveData();renderProfile();}}catch(e){} renderStore();}

/* ============== PROFILE STUDIO V7 ============== */
const TP_CAM='<svg viewBox="0 0 24 24"><path d="M4 8h3l1.6-2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.4"/></svg>';
function pfPick(inp,kind){
  const f=inp.files&&inp.files[0];if(!f)return;
  const isVid=kind==='cover' && f.type.startsWith('video/');
  if(!isVid && !f.type.startsWith('image/')){toast(kind==='cover'?'اختر صورة أو فيديو':'اختر صورة فقط');inp.value='';return;}
  const done=(res)=>{
    window.__pf=window.__pf||{};window.__pf[kind]=res;
    if(kind==='avatar'){const a=document.getElementById('pfAvIn');if(a)a.innerHTML=`<img src="${res}" alt="">`;}
    const s=document.getElementById('pf_'+kind+'_st');if(s)s.textContent=isVid?'فيديو ✓':'تم الاختيار ✓';
  };
  const read=()=>{ const r=new FileReader(); r.onload=()=>done(r.result); r.onerror=()=>toast('تعذّر قراءة الملف'); r.readAsDataURL(f); };
  if(!isVid){ read(); return; }
  const MAXMB=8, MAXSEC=20;
  if(f.size>MAXMB*1024*1024){ toast('حجم الفيديو يجب أن يكون أقل من '+MAXMB+'MB'); inp.value=''; return; }
  const tmp=document.createElement('video'); tmp.preload='metadata'; const u=URL.createObjectURL(f);
  tmp.onloadedmetadata=()=>{ URL.revokeObjectURL(u); if(tmp.duration>MAXSEC+.5){ toast('مدة الفيديو يجب ألا تزيد عن '+MAXSEC+' ثانية'); inp.value=''; } else read(); };
  tmp.onerror=()=>{ URL.revokeObjectURL(u); read(); };
  tmp.src=u;
}
function pfRemoveCover(){
  window.__pf=window.__pf||{};window.__pf.cover='';
  const s=document.getElementById('pf_cover_st');if(s)s.textContent='سيُزال عند الحفظ';
}
function pfRemoveAvatar(){
  window.__pf=window.__pf||{};window.__pf.avatar='';
  const a=document.getElementById('pfAvIn');if(a)a.textContent=DATA.profile.avatar||'👤';
  const s=document.getElementById('pf_avatar_st');if(s)s.textContent='ستُزال عند الحفظ';
}
function pfLive(){
  const n=(document.getElementById('pf_name')?.value||'').trim(),b=(document.getElementById('pf_bio')?.value||'').trim();
  const hn=document.getElementById('tpHName'),hb=document.getElementById('tpHBio');
  if(hn)hn.textContent=n||DATA.profile.handle||'حسابي';
  if(hb){hb.textContent=b?b+' ✦':'';hb.hidden=!b;}
}
function openProfileStudio(){
  const p=DATA.profile;window.__pf={};
  const av=`<div class="tp-av tp-av-edit" onclick="document.getElementById('pf_avatar').click()"><span class="tp-av-in" id="pfAvIn">${p.avatarData?`<img src="${p.avatarData}" alt="">`:escapeHtml(p.avatar||'👤')}</span><i class="tp-cam">${TP_CAM}</i></div>`;
  const fr=(label,id,val,ph,extra)=>`<div class="tp-fr"><label for="${id}">${label}</label><input id="${id}" value="${escapeAttr(val||'')}" placeholder="${ph||''}" dir="auto" ${extra||''}></div>`;
  tpSubOpen(tpHeader('تعديل الملف','closeSub()','saveProfileStudio()','حفظ',av)+`
  <section class="tp-card">
    <div class="tp-h">بيانات الحساب</div>
    <div class="tp-label">الهوية</div>
    <div class="tp-panel">
      ${fr('الاسم','pf_name',p.name,'اسمك','maxlength="40" oninput="pfLive()"')}
      ${fr('اسم المستخدم','pf_handle',p.handle,'username','maxlength="30" autocapitalize="none" autocomplete="off" spellcheck="false"')}
      <div class="tp-fr col"><label for="pf_bio">النبذة</label><textarea id="pf_bio" maxlength="180" dir="auto" placeholder="اكتب نبذة قصيرة" oninput="pfLive()">${escapeHtml(p.bio||'')}</textarea></div>
      ${fr('الموقع','pf_loc',p.location,'المدينة / الدولة')}
      ${fr('الموقع الإلكتروني','pf_web',p.website,'https://')}
    </div>
    <div class="tp-label">الصور</div>
    <div class="tp-list">
      <div class="tp-row" onclick="document.getElementById('pf_avatar').click()"><b>تغيير الصورة الشخصية</b><span id="pf_avatar_st"></span><i>›</i></div>
      <div class="tp-row" onclick="document.getElementById('pf_cover').click()"><b>تغيير الغلاف (صورة أو فيديو)</b><span id="pf_cover_st"></span><i>›</i></div>
      ${p.avatarData?`<div class="tp-row tp-danger" onclick="pfRemoveAvatar()"><b>إزالة الصورة الشخصية</b><i>›</i></div>`:''}
      ${p.coverData?`<div class="tp-row tp-danger" onclick="pfRemoveCover()"><b>إزالة الغلاف</b><i>›</i></div>`:''}
    </div>
    <input id="pf_avatar" type="file" accept="image/*" hidden onchange="pfPick(this,'avatar')">
    <input id="pf_cover" type="file" accept="image/*,video/*" hidden onchange="pfPick(this,'cover')">
    <button class="tp-btn" type="button" onclick="saveProfileStudio()">حفظ التغييرات</button>
  </section>`);
}
async function saveProfileStudio(){
  const g=id=>(document.getElementById(id)?.value||'').trim();
  const pf=window.__pf||{};
  DATA.profile.name=g('pf_name');
  DATA.profile.handle=g('pf_handle').replace(/^@/,'').replace(/\s+/g,'');
  DATA.profile.bio=g('pf_bio');
  DATA.profile.location=g('pf_loc');
  DATA.profile.website=g('pf_web');
  DATA.profile.verified=!!(DATA.profile.name&&DATA.profile.handle);
  if(typeof pf.avatar==='string')DATA.profile.avatarData=pf.avatar;
  if(typeof pf.cover==='string'){ DATA.profile.coverData=pf.cover; if(!/^data:video\//.test(pf.cover)) await CVDB.del(coverKey()); }
  let cvSend=DATA.profile.coverData||''; if(cvSend==='idb:cover') cvSend=await CVDB.get(coverKey());
  let syncFail=false;
  try{await api('/profile',{method:'PUT',body:JSON.stringify({name:DATA.profile.name,handle:DATA.profile.handle,bio:DATA.profile.bio,location:DATA.profile.location,website:DATA.profile.website,coverData:cvSend||'',coverType:/^data:video\//.test(cvSend||'')?'video':'image',avatarData:DATA.profile.avatarData||''})});}catch(e){ syncFail=true; }
  await saveData();renderProfile();applyAccent();closeSub();
  toast(syncFail&&/^data:video\//.test(cvSend||'')?'تم الحفظ على جهازك — تعذّر رفع الفيديو للخادم':'تم حفظ ملفك بالكامل ✅');
}
function applyAccent(){
  const a=DATA.profile.settings.accent,r=document.documentElement.style,k=({pink:'magenta',green:'teal'})[a]||a;
  if(!a||a==='default'||!TP_ACC[k]){['--accent1','--accent2','--accent3'].forEach(p=>r.removeProperty(p));return;}
  const c=TP_ACC[k].c;r.setProperty('--accent1',c[0]);r.setProperty('--accent2',c[1]);r.setProperty('--accent3',c[2]);
}
function openDataCenter(){
  tpSubOpen(tpHeader('مركز البيانات','closeSub()','closeSub()','إغلاق')+`
  <section class="tp-card">
    <div class="tp-h">البيانات والتخزين</div>
    <div class="tp-label">الحساب</div>
    <div class="tp-list"><div class="tp-row tp-static"><b>مسجّل الدخول باسم</b><span>@${escapeHtml(currentUser||'')}</span></div></div>
    <div class="tp-label">إدارة البيانات</div>
    <div class="tp-list">
      <div class="tp-row" onclick="exportAllData()"><b>تصدير نسخة احتياطية</b><i>›</i></div>
      <div class="tp-row" onclick="clearLocalData()"><b>مسح البيانات المحلية</b><i>›</i></div>
      <div class="tp-row tp-danger" onclick="closeSub();logoutUser()"><b>تسجيل الخروج</b><i>›</i></div>
    </div>
    <div class="tp-note">المسح المحلي يحذف التخزين الخاص بهذا المتصفح فقط.</div>
  </section>`);
}
function exportAllData(){const b=new Blob([JSON.stringify(DATA,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='gameverse-account-backup.json';a.click();URL.revokeObjectURL(a.href);toast('تم تجهيز النسخة الاحتياطية ✅');}
function clearLocalData(){if(!confirm('هل تريد مسح البيانات المحلية؟'))return;localStorage.removeItem(dataStorageKey());location.reload();}

function renderAll(){ applyGlass(); applyTheme(); renderExplore(); renderProfile(); applyAccent(); initStore(); }

/* ============== SPLASH + LOGIN GATE ============== */
/* Started by community.js after auth configuration. */
/* ============================================================
   ARC TAB BAR — ported physics (spring light + drag) 
============================================================ */
(function(){
  const TABS = [
    { key:'explore', label:'استكشاف', acc:'#9db4ff', icon:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>' },
    { key:'messages', label:'الرسائل', acc:'#35e7c6', icon:'<path d="M4 5.5h16v11H9l-5 3z"/><path d="M8 9h8M8 12.5h5"/>' },
    { key:'live', label:'بث مباشر', acc:'#b794f6', icon:'<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M8.3 8.3a5.2 5.2 0 0 0 0 7.4M15.7 8.3a5.2 5.2 0 0 1 0 7.4M5.2 5.2a9.8 9.8 0 0 0 0 13.6M18.8 5.2a9.8 9.8 0 0 1 0 13.6"/>' },
    { key:'reels', label:'ريلز', acc:'#ff6b81', icon:'<rect x="3.5" y="4" width="17" height="16" rx="3.5"/><path d="M10 9.2v5.6l4.6-2.8z"/>' },
    { key:'profile', label:'حسابي', acc:'#f5c26b', icon:'<circle cx="12" cy="8.2" r="3.2"/><path d="M5 20c0-3.7 3.1-6.5 7-6.5s7 2.8 7 6.5"/>' }
  ];

  const bar = document.getElementById('bar');
  const light = document.getElementById('light');

  const tabEls = TABS.map((t,i)=>{
    const b=document.createElement('button');
    b.className='tab'; b.type='button'; b.dataset.index=i; b.dataset.sound='nav';
    b.innerHTML = `<svg viewBox="0 0 24 24">${t.icon}</svg><span class="lbl">${t.label}</span>`;
    bar.appendChild(b);
    return b;
  });

  let current=0, headX=0, headV=0, tailX=0, tailV=0, targetX=0;

  function centerOf(i){
    const el=tabEls[i]; const r=el.getBoundingClientRect(); const br=bar.getBoundingClientRect();
    return (r.left-br.left)+r.width/2;
  }
  function setActive(i, opts){
    opts=opts||{};
    TABS.forEach((_,k)=>tabEls[k].classList.toggle('active',k===i));
    const acc=TABS[i].acc;
    document.documentElement.style.setProperty('--acc',acc);
    document.documentElement.style.setProperty('--acc',acc);
    current=i; targetX=centerOf(i);
    if(opts.instant){ headX=tailX=targetX; headV=tailV=0; }
    if(!opts.silent){ go(TABS[i].key); if(TABS[i].key==='live') openLiveHome(); }
  }

  let last=performance.now();
  function frame(now){
    let dt=(now-last)/1000; last=now; dt=Math.min(dt,0.032);
    const distLeft=Math.abs(targetX-headX);
    const hK=235, hC=22;
    headV += (-hK*(headX-targetX) - hC*headV)*dt; headX += headV*dt;
    const home=Math.max(0,Math.min(1,1-distLeft/60));
    const tK=62+155*home, tC=14+10*home;
    tailV += (-tK*(tailX-targetX) - tC*tailV)*dt; tailX += tailV*dt;
    const lo=Math.min(headX,tailX), hi=Math.max(headX,tailX), gap=hi-lo;
    const baseR=26, w=Math.max(baseR*2, gap+baseR*2), cx=(headX+tailX)/2;
    light.style.width=w+'px'; light.style.left=(cx-w/2)+'px';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function goTo(i){ if(i!==current) setActive(i); }
  tabEls.forEach((el,i)=> el.addEventListener('click', ()=> goTo(i)) );

  let dragging=false;
  function nearestIndex(clientX){
    const br=bar.getBoundingClientRect(); const x=clientX-br.left;
    let best=0,bd=Infinity;
    TABS.forEach((_,i)=>{ const c=centerOf(i); const d=Math.abs(c-x); if(d<bd){bd=d;best=i;} });
    return best;
  }
  function onDown(e){ dragging=true; onMove(e); }
  function onMove(e){
    if(!dragging) return;
    const clientX = e.touches? e.touches[0].clientX : e.clientX;
    const br=bar.getBoundingClientRect();
    targetX=Math.max(26,Math.min(br.width-26, clientX-br.left));
    const idx=nearestIndex(clientX);
    if(idx!==current){
      TABS.forEach((_,k)=>tabEls[k].classList.toggle('active',k===idx));
      const acc=TABS[idx].acc;
      document.documentElement.style.setProperty('--acc',acc);
      current=idx;
    }
  }
  function onUp(){
    if(!dragging) return; dragging=false;
    targetX=centerOf(current);
    go(TABS[current].key); if(TABS[current].key==='live') openLiveHome();
  }
  bar.addEventListener('mousedown',onDown);
  window.addEventListener('mousemove',onMove);
  window.addEventListener('mouseup',onUp);
  bar.addEventListener('touchstart',onDown,{passive:true});
  window.addEventListener('touchmove',onMove,{passive:true});
  window.addEventListener('touchend',onUp);
  window.addEventListener('resize',()=>{ targetX=centerOf(current); });

  setActive(0,{instant:true, silent:true});
  window.setArcActive=(i)=>{
    if(typeof i==='string'){ const k=TABS.findIndex(t=>t.key===i); if(k>=0) setActive(k,{instant:true}); else go(i); return; }
    if(Number.isInteger(i)&&i>=0&&i<TABS.length) setActive(i,{instant:true});
  };
})();
