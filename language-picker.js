(function(){
const $=id=>document.getElementById(id),esc=s=>escapeHtml(String(s==null?'':s));
const own=()=>String(typeof currentUser!=='undefined'&&currentUser||'').toLowerCase();
const rd=(k)=>{try{return JSON.parse(localStorage.getItem(k)||'{}')}catch(e){return{}}};
const curLang=()=>localStorage.getItem('bk_lang')||'ar';
const LS="af:Afrikaans|sq:Shqip|am:አማርኛ|ar:العربية|hy:Հայերեն|az:Azərbaycanca|eu:Euskara|be:Беларуская|bn:বাংলা|bs:Bosanski|bg:Български|ca:Català|ceb:Cebuano|zh-CN:简体中文|zh-TW:繁體中文|co:Corsu|hr:Hrvatski|cs:Čeština|da:Dansk|nl:Nederlands|en:English|eo:Esperanto|et:Eesti|fi:Suomi|fr:Français|fy:Frysk|gl:Galego|ka:ქართული|de:Deutsch|el:Ελληνικά|gu:ગુજરાતી|ht:Kreyòl ayisyen|ha:Hausa|haw:ʻŌlelo Hawaiʻi|iw:עברית|hi:हिन्दी|hmn:Hmoob|hu:Magyar|is:Íslenska|ig:Igbo|id:Bahasa Indonesia|ga:Gaeilge|it:Italiano|ja:日本語|jw:Basa Jawa|kn:ಕನ್ನಡ|kk:Қазақша|km:ខ្មែរ|rw:Kinyarwanda|ko:한국어|ku:Kurdî|ky:Кыргызча|lo:ລາວ|la:Latina|lv:Latviešu|lt:Lietuvių|lb:Lëtzebuergesch|mk:Македонски|mg:Malagasy|ms:Bahasa Melayu|ml:മലയാളം|mt:Malti|mi:Māori|mr:मराठी|mn:Монгол|my:မြန်မာ|ne:नेपाली|no:Norsk|ny:Chichewa|or:ଓଡ଼ିଆ|ps:پښتو|fa:فارسی|pl:Polski|pt:Português|pa:ਪੰਜਾਬੀ|ro:Română|ru:Русский|sm:Gagana Samoa|gd:Gàidhlig|sr:Српски|st:Sesotho|sn:chiShona|sd:سنڌي|si:සිංහල|sk:Slovenčina|sl:Slovenščina|so:Soomaaliga|es:Español|su:Basa Sunda|sw:Kiswahili|sv:Svenska|tl:Filipino|tg:Тоҷикӣ|ta:தமிழ்|tt:Татарча|te:తెలుగు|th:ไทย|tr:Türkçe|tk:Türkmençe|uk:Українська|ur:اردو|ug:ئۇيغۇرچە|uz:Oʻzbekcha|vi:Tiếng Việt|cy:Cymraeg|xh:isiXhosa|yi:ייִדיש|yo:Yorùbá|zu:isiZulu|ckb:کوردی|dv:ދިވެހި|ak:Twi|as:অসমীয়া|ay:Aymara|bm:Bambara|bho:भोजपुरी|doi:डोगरी|ee:Eʋegbe|gn:Avañe'ẽ|ilo:Ilokano|kri:Krio|lg:Luganda|ln:Lingála|mai:मैथिली|lus:Mizo|nso:Sepedi|om:Oromoo|qu:Quechua|sa:संस्कृतम्|ti:ትግርኛ|ts:Xitsonga".split('|').map(x=>{const i=x.indexOf(':');return[x.slice(0,i),x.slice(i+1)]});
const LN=Object.fromEntries(LS),RTL=['ar','iw','fa','ur','ps','sd','ug','yi','ckb','dv'];
function applyDir(c){const h=document.documentElement;h.lang=c;h.dir=RTL.includes(c)?'rtl':'ltr';}
function loadGT(cb){
 if(document.querySelector('.goog-te-combo')){cb&&cb();return;}
 if(!$('gtjs')){window.googleTranslateElementInit=function(){new google.translate.TranslateElement({pageLanguage:'ar',autoDisplay:false},'gt_el');};
  const s=document.createElement('script');s.id='gtjs';s.src='https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  s.onerror=()=>toast('تعذّر تحميل خدمة الترجمة، تحقق من الإنترنت');document.head.appendChild(s);}
 let n=0;const iv=setInterval(()=>{if(document.querySelector('.goog-te-combo')){clearInterval(iv);cb&&cb();}else if(++n>80)clearInterval(iv);},250);
}
function pushLang(c){const s=document.querySelector('.goog-te-combo');if(!s)return;s.value=c;s.dispatchEvent(new Event('change'));}
window.setSiteLang=function(c){
 closeLangPicker();localStorage.setItem('bk_lang',c);applyDir(c);
 if(c==='ar'){document.cookie='googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  if(document.documentElement.className.indexOf('translated')>-1)setTimeout(()=>location.reload(),300);return;}
 loadGT(()=>pushLang(c));
};
window.openLangPicker=function(){
 let o=$('lgPick');
 if(!o){o=document.createElement('div');o.id='lgPick';
  o.innerHTML='<div class="lg-box"><div class="lg-top"><b>اللغة</b><button onclick="closeLangPicker()">✕</button></div><input id="lgQ" placeholder="ابحث عن لغة…" oninput="lgRender()" autocomplete="off"><div id="lgList"></div></div>';
  document.body.appendChild(o);}
 o.classList.add('show');$('lgQ').value='';lgRender();
};
window.closeLangPicker=function(){$('lgPick')&&$('lgPick').classList.remove('show');};
window.lgRender=function(){
 const q=$('lgQ').value.trim().toLowerCase(),cur=curLang();
 $('lgList').innerHTML=LS.filter(([c,n])=>!q||c.toLowerCase().includes(q)||n.toLowerCase().includes(q))
  .map(([c,n])=>`<div class="lg-it${c===cur?' on':''}" onclick="setSiteLang('${c}')" translate="no"><span>${n}</span><em>${c}</em></div>`).join('');
};
/* ---- unique usernames ---- */
const HK='bk_handles',owner=h=>{h=h.toLowerCase();const a=getAccounts()[h];return a?a.username.toLowerCase():(rd(HK)[h]||null);};
const _sp=window.saveProfileStudio;
window.saveProfileStudio=async function(){
 const h=(($('pf_handle')||{}).value||'').trim().replace(/^@/,'').replace(/\s+/g,'').toLowerCase(),me=own();
 if(h){const o=owner(h);if(o&&o!==me){toast('اسم المستخدم هذا مستخدم بالفعل، اختر اسمًا آخر');return;}
  const r=rd(HK);Object.keys(r).forEach(k=>{if(r[k]===me)delete r[k];});r[h]=me;try{localStorage.setItem(HK,JSON.stringify(r));}catch(e){}}
 return _sp.apply(this,arguments);
};
const _su=window.submitAuthSignup;
window.submitAuthSignup=function(){
 const u=(($('auth_user')||{}).value||'').trim().toLowerCase();
 if(u&&rd(HK)[u]){authError('اسم المستخدم هذا مستخدم بالفعل');return;}
 return _su.apply(this,arguments);
};
/* ---- init ---- */
try{
 document.body.insertAdjacentHTML('beforeend','<div id="gt_el"></div>');
 const L0=curLang();applyDir(L0);if(L0!=='ar')loadGT(()=>pushLang(L0));
}catch(e){console.error('addon init',e);}
})();
