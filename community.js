/* Black 1: hosted auth, public user search and realtime direct messaging. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const cfg = window.BLACK1_CONFIG || {};
  const configured = !!(cfg.supabaseUrl && cfg.supabaseAnonKey &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.supabaseUrl) &&
    !cfg.supabaseUrl.includes('YOUR-PROJECT') && !cfg.supabaseAnonKey.includes('YOUR_'));
  const originalSetAuthMode = window.setAuthMode;
  const originalLogin = window.submitAuthLogin;
  const originalSignup = window.submitAuthSignup;
  const originalLogout = window.logoutUser;
  let sb = null;
  let remoteUser = null;
  let activeConversationId = null;
  let activePartner = null;
  let messageChannel = null;
  let searchTimer = null;
  let busy = false;
  const seenMessages = new Set();
  let communityToastTimer = null;

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials = (name) => (String(name || '?').trim().split(/\s+/).slice(0,2).map(x => x[0] || '').join('') || '?').slice(0,2);
  const niceTime = (stamp) => {
    if (!stamp) return '';
    const d = new Date(stamp);
    if (Number.isNaN(d.getTime())) return '';
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
    return d.toLocaleDateString('ar-EG',{day:'numeric',month:'short'});
  };
  const avatar = (profile, cls='dm-avatar') => {
    const letter = esc(initials(profile?.display_name || profile?.username));
    const img = profile?.avatar_url ? `<img src="${esc(profile.avatar_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : letter;
    return `<div class="${cls}">${img}</div>`;
  };
  const currentId = () => remoteUser?.id || null;
  const showError = (msg) => {
    const node = $('authErr');
    if (node) {
      node.textContent = String(msg || 'حدث خطأ غير متوقع');
      const card = $('authCard');
      if (card) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
    } else console.error(msg);
  };
  const showToast = (msg) => {
    const node = $('toast');
    if (!node) { console.info(msg); return; }
    // Use textContent: error strings may come from the remote database.
    node.textContent = String(msg || '');
    node.classList.add('show');
    clearTimeout(communityToastTimer);
    communityToastTimer = setTimeout(() => node.classList.remove('show'), 2400);
  };
  const setBusy = (on) => {
    busy = on;
    const b = $('authSubmitBtn');
    if (b) { b.style.opacity = on ? '.65' : ''; b.style.pointerEvents = on ? 'none' : ''; }
  };
  function setRemoteAuthMode(mode) {
    if (!configured) return originalSetAuthMode?.(mode);
    window.authMode = mode;
    try { authMode = mode; } catch (_) {}
    const signup = mode === 'signup';
    const emailField = $('authEmailField');
    if (emailField) emailField.style.display = 'flex';
    if ($('authNameField')) $('authNameField').style.display = signup ? 'flex' : 'none';
    const userField = $('auth_user')?.closest('.lg-field');
    if (userField) userField.style.display = signup ? 'flex' : 'none';
    if ($('authConfirmField')) $('authConfirmField').style.display = signup ? 'flex' : 'none';
    if ($('authTitle')) $('authTitle').textContent = signup ? 'إنشاء حساب جديد' : 'تسجيل الدخول';
    if ($('authSub')) $('authSub').textContent = signup ? 'انضم إلى مجتمع Black 1' : 'أدخل بريدك الإلكتروني وكلمة المرور';
    if ($('auth_name')) $('auth_name').placeholder = 'الاسم الظاهر';
    if ($('auth_user')) $('auth_user').placeholder = 'اسم مستخدم فريد';
    if ($('auth_email')) $('auth_email').placeholder = 'البريد الإلكتروني';
    if ($('auth_pass')) $('auth_pass').autocomplete = signup ? 'new-password' : 'current-password';
    if ($('authSubmitBtn')) { $('authSubmitBtn').textContent = signup ? 'إنشاء الحساب' : 'دخول'; $('authSubmitBtn').onclick = signup ? remoteSignup : remoteLogin; }
    if ($('authSwitch')) $('authSwitch').textContent = signup ? 'لديك حساب؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب';
    if ($('authErr')) $('authErr').textContent = '';
  }
  window.setAuthMode = setRemoteAuthMode;

  function ensureEmailField() {
    if ($('authEmailField')) return;
    const nameField = $('authNameField');
    if (!nameField) return;
    const field = document.createElement('div');
    field.className = 'lg-field'; field.id = 'authEmailField';
    field.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/></svg><input id="auth_email" type="email" placeholder="البريد الإلكتروني" maxlength="254" autocomplete="email" inputmode="email" spellcheck="false">';
    nameField.insertAdjacentElement('afterend', field);
    $('auth_email').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); (window.authMode === 'signup' ? remoteSignup() : remoteLogin()); } });
  }

  async function getMyProfile(user) {
    const { data, error } = await sb.from('profiles').select('id, username, display_name, avatar_url, bio').eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (data) return data;
    // If SQL trigger setup is incomplete, do not silently expose auth emails as profiles.
    throw new Error('لم يتم إنشاء ملف الحساب. تأكد من تنفيذ supabase/schema.sql.');
  }
  async function enterRemoteApp(user) {
    const profile = await getMyProfile(user);
    remoteUser = {...profile, email: user.email};
    currentUser = profile.username;
    try { localStorage.setItem('black1_session_v1', currentUser); } catch (_) {}
    if (typeof window.enterApp === 'function') await window.enterApp(profile.display_name, profile.username);
    else { $('authGate')?.classList.add('hide'); $('splash')?.classList.add('hide'); }
    updateSetupNotice();
  }
  async function remoteLogin() {
    if (!configured || busy) return originalLogin?.();
    const email = ($('auth_email')?.value || '').trim().toLowerCase();
    const password = $('auth_pass')?.value || '';
    if (!email || !password) return showError('أدخل البريد الإلكتروني وكلمة المرور');
    setBusy(true);
    try {
      const { data, error } = await sb.auth.signInWithPassword({email, password});
      if (error) throw error;
      await enterRemoteApp(data.user);
    } catch (e) { showError(e.message || 'تعذّر تسجيل الدخول'); }
    finally { setBusy(false); }
  }
  async function remoteSignup() {
    if (!configured || busy) return originalSignup?.();
    const name = ($('auth_name')?.value || '').trim();
    const username = ($('auth_user')?.value || '').trim().replace(/^@/,'').toLowerCase();
    const email = ($('auth_email')?.value || '').trim().toLowerCase();
    const password = $('auth_pass')?.value || '';
    const confirm = $('auth_pass2')?.value || '';
    if (!name) return showError('أدخل الاسم الظاهر');
    if (!/^[a-zA-Z0-9_.]{3,24}$/.test(username)) return showError('اسم المستخدم يجب أن يكون 3-24 حرفًا إنجليزيًا أو رقمًا أو . أو _');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('أدخل بريدًا إلكترونيًا صحيحًا');
    if (password.length < 8) return showError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    if (password !== confirm) return showError('كلمتا المرور غير متطابقتين');
    setBusy(true);
    try {
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { username, display_name: name } }
      });
      if (error) throw error;
      if (data.session && data.user) {
        await enterRemoteApp(data.user);
        showToast('تم إنشاء حسابك بنجاح');
      } else {
        if ($('authErr')) $('authErr').textContent = 'تم إنشاء الحساب. افتح بريدك الإلكتروني واضغط رابط التأكيد، ثم سجّل الدخول.';
      }
    } catch (e) {
      const message = e?.code === '23505' ? 'اسم المستخدم مستخدم بالفعل' : (e.message || 'تعذّر إنشاء الحساب');
      showError(message);
    } finally { setBusy(false); }
  }
  window.submitAuthLogin = remoteLogin;
  window.submitAuthSignup = remoteSignup;
  window.logoutUser = async function() {
    if (configured && sb) {
      try { await sb.auth.signOut(); } catch (e) { console.warn('Sign out:', e); }
    } else if (originalLogout) return originalLogout();
    try { localStorage.removeItem('black1_session_v1'); } catch (_) {}
    location.reload();
  };

  function updateSetupNotice() {
    const notice = $('dmSetupNotice');
    if (notice) notice.hidden = configured;
  }
  function setEmpty(container, title, text) {
    if (!container) return;
    container.innerHTML = `<div class="dm-empty-state"><div class="dm-empty-icon">⌕</div><b>${esc(title)}</b><p>${esc(text)}</p></div>`;
  }
  async function searchProfiles(query) {
    const box = $('dmSearchResults');
    if (!configured || !currentId()) {
      setEmpty(box, configured ? 'سجّل الدخول أولًا' : 'البحث العام غير مفعّل بعد', configured ? 'أنشئ حسابًا أو سجّل الدخول للبحث عن المستخدمين.' : 'أكمل إعداد Supabase في ملفات المشروع حتى يستطيع الجميع العثور على بعضهم.');
      return;
    }
    const q = query.trim().replace(/^@/,'').replace(/[,%()_*]/g,' ').replace(/\s+/g,' ').slice(0,60);
    if (!q) { setEmpty(box, 'ابحث عن أصدقائك', 'اكتب اسمًا أو اسم مستخدم للعثور على الحسابات.'); return; }
    box.innerHTML = '<div class="dm-muted-empty">جارٍ البحث عن الحسابات…</div>';
    try {
      const safe = q.replace(/[^\p{L}\p{N}.\- ]/gu, '').trim();
      if (!safe) return setEmpty(box, 'اكتب اسمًا صالحًا للبحث', 'يمكنك استخدام الحروف والأرقام واسم المستخدم.');
      const { data, error } = await sb.from('profiles').select('id,username,display_name,avatar_url,bio').or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`).neq('id',currentId()).limit(25);
      if (error) throw error;
      if (!data?.length) return setEmpty(box, 'لم نعثر على حساب مطابق', 'جرّب اسمًا آخر أو تحقق من كتابة اليوزر بصورة صحيحة.');
      box.innerHTML = data.map(p => `<button class="dm-user-row" type="button" data-dm-user="${esc(p.id)}">${avatar(p)}<span class="dm-user-info"><span class="dm-user-name">${esc(p.display_name || p.username)}</span><span class="dm-user-handle">@${esc(p.username)}</span>${p.bio ? `<span class="dm-user-bio">${esc(p.bio)}</span>` : ''}</span><span class="dm-follow-mark">مراسلة</span></button>`).join('');
    } catch (e) {
      console.error(e); setEmpty(box, 'تعذّر إكمال البحث', e.message || 'تحقق من إعداد قاعدة البيانات وسياسات الوصول.');
    }
  }

  async function getOrCreateConversation(partnerId) {
    if (!currentId() || partnerId === currentId()) throw new Error('لا يمكنك بدء محادثة مع حسابك.');
    const { data: existing, error: listError } = await sb.from('conversation_members').select('conversation_id').eq('user_id',currentId());
    if (listError) throw listError;
    for (const row of (existing || [])) {
      const { data: other, error } = await sb.from('conversation_members').select('user_id').eq('conversation_id',row.conversation_id).eq('user_id',partnerId).maybeSingle();
      if (error) throw error;
      if (other) return row.conversation_id;
    }
    const { data, error } = await sb.rpc('start_conversation', { target_user: partnerId });
    if (error) throw error;
    return data;
  }
  async function openConversation(partner) {
    if (!configured || !currentId()) { showToast('سجّل الدخول بعد إعداد Supabase لاستخدام الرسائل'); return; }
    try {
      $('dmSearchResults')?.querySelectorAll('button').forEach(b => b.disabled = true);
      activePartner = partner;
      activeConversationId = await getOrCreateConversation(partner.id);
      $('dmListScreen').hidden = true;
      $('dmChatScreen').hidden = false;
      $('dmChatName').textContent = partner.display_name || partner.username;
      $('dmChatHandle').textContent = '@' + partner.username;
      $('dmChatAvatar').innerHTML = partner.avatar_url ? `<img src="${esc(partner.avatar_url)}" alt="">` : esc(initials(partner.display_name || partner.username));
      seenMessages.clear();
      await loadMessages(true);
      subscribeToConversation(activeConversationId);
      $('dmMessageInput').focus({preventScroll:true});
    } catch (e) {
      console.error(e); showToast(e.message || 'تعذّر فتح المحادثة');
    } finally { $('dmSearchResults')?.querySelectorAll('button').forEach(b => b.disabled = false); }
  }
  async function loadMessages(scroll = false) {
    if (!activeConversationId || !configured) return;
    const box = $('dmMessages');
    const convId = activeConversationId;
    const { data, error } = await sb.from('messages').select('id,conversation_id,sender_id,body,created_at').eq('conversation_id',convId).order('created_at',{ascending:true}).limit(250);
    if (error) { console.error(error); setEmpty(box, 'تعذّر تحميل الرسائل', error.message); return; }
    (data || []).forEach(m => seenMessages.add(String(m.id)));
    box.innerHTML = (data || []).length ? data.map(messageHtml).join('') : '<div class="dm-muted-empty">لا توجد رسائل بعد. ابدأ المحادثة الآن.</div>';
    if (scroll) box.scrollTop = box.scrollHeight;
  }
  function messageHtml(m) {
    return `<div class="dm-bubble${m.sender_id === currentId() ? ' mine' : ''}" data-message-id="${esc(m.id)}"><span>${esc(m.body)}</span><time>${esc(niceTime(m.created_at))}</time></div>`;
  }
  function subscribeToConversation(id) {
    if (messageChannel) { sb.removeChannel(messageChannel); messageChannel = null; }
    const myId = id;
    messageChannel = sb.channel('black1-chat-' + id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${id}`}, payload => {
        if (activeConversationId !== myId) return;
        const m = payload.new;
        if (seenMessages.has(String(m.id))) return;
        seenMessages.add(String(m.id));
        const box = $('dmMessages');
        if (box.querySelector('.dm-muted-empty')) box.innerHTML = '';
        box.insertAdjacentHTML('beforeend',messageHtml(m));
        box.scrollTop = box.scrollHeight;
        refreshConversations().catch(console.error);
      }).subscribe();
  }
  async function sendMessage(event) {
    event?.preventDefault();
    const field = $('dmMessageInput');
    const body = (field?.value || '').trim();
    if (!body || !activeConversationId || !currentId() || busy) return;
    const conv = activeConversationId;
    field.value = ''; field.style.height = 'auto';
    $('dmSend').disabled = true; busy = true;
    const { error } = await sb.from('messages').insert({conversation_id:conv,sender_id:currentId(),body});
    busy = false; $('dmSend').disabled = false;
    if (error) { field.value = body; showToast(error.message || 'تعذّر إرسال الرسالة'); return; }
    showToast('تم إرسال الرسالة');
    await loadMessages(true);
    await refreshConversations();
  }
  async function refreshConversations() {
    const box = $('dmConversationList');
    if (!configured || !currentId()) { if (box) box.innerHTML = '<div class="dm-muted-empty">بعد تسجيل الدخول ستظهر محادثاتك هنا.</div>'; return; }
    const { data: memberships, error } = await sb.from('conversation_members').select('conversation_id,joined_at').eq('user_id',currentId()).order('joined_at',{ascending:false}).limit(60);
    if (error) throw error;
    if (!memberships?.length) { box.innerHTML = '<div class="dm-muted-empty">لا توجد محادثات بعد. ابحث عن مستخدم في الأعلى وابدأ الحديث معه.</div>'; return; }
    const rows = await Promise.all(memberships.map(async row => {
      const { data: otherMember, error: memberError } = await sb.from('conversation_members').select('user_id').eq('conversation_id',row.conversation_id).neq('user_id',currentId()).maybeSingle();
      if (memberError) throw memberError;
      if (!otherMember) return null;
      const { data: profile, error: profileError } = await sb.from('profiles').select('id,username,display_name,avatar_url,bio').eq('id',otherMember.user_id).maybeSingle();
      if (profileError) throw profileError;
      if (!profile) return null;
      const { data: last, error: msgError } = await sb.from('messages').select('body,created_at,sender_id').eq('conversation_id',row.conversation_id).order('created_at',{ascending:false}).limit(1).maybeSingle();
      if (msgError) throw msgError;
      return {id:row.conversation_id,profile,last};
    }));
    const valid = rows.filter(Boolean).sort((a,b) => new Date(b.last?.created_at || 0) - new Date(a.last?.created_at || 0));
    if (!valid.length) { box.innerHTML = '<div class="dm-muted-empty">لا توجد محادثات بعد. ابحث عن مستخدم وابدأ الحديث معه.</div>'; return; }
    box.innerHTML = valid.map(r => `<button class="dm-conversation-row" type="button" data-dm-conversation="${esc(r.profile.id)}" data-dm-conv-id="${esc(r.id)}">${avatar(r.profile)}<span class="dm-conversation-info"><span class="dm-conv-meta"><span class="dm-user-name">${esc(r.profile.display_name || r.profile.username)}</span><time>${esc(niceTime(r.last?.created_at))}</time></span><span class="dm-conv-preview">${r.last ? (r.last.sender_id===currentId()?'أنت: ':'')+esc(r.last.body) : 'ابدأ المحادثة الآن'}</span></span></button>`).join('');
  }
  async function openExistingConversation(partnerId, conversationId) {
    const { data, error } = await sb.from('profiles').select('id,username,display_name,avatar_url,bio').eq('id',partnerId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('هذا الحساب لم يعد متاحًا.');
    activePartner = data; activeConversationId = conversationId;
    $('dmListScreen').hidden = true; $('dmChatScreen').hidden = false;
    $('dmChatName').textContent = data.display_name || data.username;
    $('dmChatHandle').textContent = '@' + data.username;
    $('dmChatAvatar').innerHTML = data.avatar_url ? `<img src="${esc(data.avatar_url)}" alt="">` : esc(initials(data.display_name || data.username));
    seenMessages.clear(); await loadMessages(true); subscribeToConversation(conversationId);
  }
  function backToList() {
    $('dmChatScreen').hidden = true; $('dmListScreen').hidden = false;
    activeConversationId = null; activePartner = null; seenMessages.clear();
    if (messageChannel && sb) sb.removeChannel(messageChannel);
    messageChannel = null;
    refreshConversations().catch(e => console.error(e));
  }
  async function refreshAll() {
    await searchProfiles($('dmUserSearch')?.value || '');
    await refreshConversations();
  }
  function bindMessagesUI() {
    updateSetupNotice();
    $('dmRefresh')?.addEventListener('click', () => refreshAll().catch(e => showToast(e.message || 'تعذّر التحديث')));
    $('dmUserSearch')?.addEventListener('input', e => {
      $('dmSearchClear').hidden = !e.target.value;
      $('dmSectionTitle').textContent = e.target.value.trim() ? 'نتائج البحث' : 'الأشخاص';
      clearTimeout(searchTimer); searchTimer = setTimeout(() => searchProfiles(e.target.value).catch(console.error),250);
    });
    $('dmSearchClear')?.addEventListener('click', () => { $('dmUserSearch').value=''; $('dmSearchClear').hidden=true; $('dmSectionTitle').textContent='الأشخاص'; searchProfiles(''); });
    $('dmSearchResults')?.addEventListener('click', async e => {
      const row = e.target.closest('[data-dm-user]'); if (!row) return;
      try {
        const {data,error} = await sb.from('profiles').select('id,username,display_name,avatar_url,bio').eq('id',row.dataset.dmUser).single();
        if (error) throw error; await openConversation(data);
      } catch (err) { console.error(err); showToast(err.message || 'تعذّر فتح الحساب'); }
    });
    $('dmConversationList')?.addEventListener('click', async e => {
      const row = e.target.closest('[data-dm-conversation]'); if (!row) return;
      try { await openExistingConversation(row.dataset.dmConversation,row.dataset.dmConvId); }
      catch (err) { console.error(err); showToast(err.message || 'تعذّر فتح المحادثة'); }
    });
    $('dmBack')?.addEventListener('click', backToList);
    $('dmComposer')?.addEventListener('submit', sendMessage);
    $('dmMessageInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    $('dmMessageInput')?.addEventListener('input', e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,105)+'px'; });
    // Refresh the direct-message list whenever the nav tab is opened.
    document.querySelectorAll('#bar .tab').forEach(tab => tab.addEventListener('click', () => {
      if (tab.querySelector('.lbl')?.textContent?.trim() === 'الرسائل') setTimeout(() => refreshAll().catch(console.error),0);
    }));
  }

  async function init() {
    ensureEmailField();
    bindMessagesUI();
    if (!configured) {
      // Keep the original site usable locally, but clearly explain that cross-device chat needs Supabase.
      if ($('authEmailField')) $('authEmailField').style.display = 'none';
      window.BLACK1_REMOTE = {enabled:false, reason:'Supabase is not configured'};
      updateSetupNotice();
      originalSetAuthMode?.('signup');
      window.setAuthMode = (mode) => originalSetAuthMode?.(mode);
      if (typeof window.boot === 'function') window.boot();
      return;
    }
    if (!window.supabase?.createClient) {
      window.BLACK1_REMOTE = {enabled:false, reason:'Supabase SDK failed to load'};
      showError('تعذّر تحميل خدمة الحسابات. تحقق من الاتصال بالإنترنت أو إعداد Supabase.');
      if (typeof window.boot === 'function') window.boot();
      return;
    }
    sb = window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    window.BLACK1_REMOTE = {enabled:true,client:sb};
    $('splash')?.classList.add('hide'); $('authGate')?.classList.remove('hide');
    setRemoteAuthMode('signup');
    const {data,error} = await sb.auth.getSession();
    if (error) console.warn('Session restore:',error.message);
    if (data?.session?.user) {
      try { await enterRemoteApp(data.session.user); }
      catch (e) { console.error(e); showError(e.message || 'تعذّر تحميل ملف حسابك'); }
    }
    sb.auth.onAuthStateChange((event,session) => {
      if (event === 'SIGNED_OUT') { remoteUser=null; activeConversationId=null; }
      if (event === 'TOKEN_REFRESHED' && session?.user) remoteUser = remoteUser || {id:session.user.id};
    });
  }

  // Start only after the original app scripts and UI are in place.
  init().catch(e => {
    console.error('Black 1 community init:',e);
    updateSetupNotice();
    if (typeof window.boot === 'function') window.boot();
  });
})();
