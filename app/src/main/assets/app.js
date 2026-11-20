/* TV Libre — lecteur IPTV (playlists M3U publiques) */
(function () {
  'use strict';

  var BASE = 'https://iptv-org.github.io/iptv/';
  var FR_URL = BASE + 'languages/fra.m3u';

  var COUNTRIES = [
    { id: 'sn', name: 'Sénégal', em: '🇸🇳', url: BASE + 'countries/sn.m3u', c: ['#00853f', '#e31b23'] },
    { id: 'ci', name: "Côte d'Ivoire", em: '🇨🇮', url: BASE + 'countries/ci.m3u', c: ['#f77f00', '#009e60'] },
    { id: 'afr', name: 'Afrique', em: '🌍', url: BASE + 'regions/afr.m3u', c: ['#8e44ad', '#d35400'] },
    { id: 'fra', name: 'Tout en français', em: '🇫🇷', url: FR_URL, c: ['#0055a4', '#ef4135'], fr: true },
    { id: 'ma', name: 'Maroc', em: '🇲🇦', url: BASE + 'countries/ma.m3u', c: ['#c1272d', '#006233'] },
    { id: 'cm', name: 'Cameroun', em: '🇨🇲', url: BASE + 'countries/cm.m3u', c: ['#007a5e', '#ce1126'] },
    { id: 'fr', name: 'France', em: '🗼', url: BASE + 'countries/fr.m3u', c: ['#1e3a8a', '#b91c1c'] },
    { id: 'world', name: 'Monde entier', em: '🛰️', url: BASE + 'index.m3u', c: ['#111827', '#374151'] }
  ];

  var THEMES = [
    { id: 'comedy', name: 'Comédie', em: '😂', c: ['#f59e0b', '#ef4444'] },
    { id: 'movies', name: 'Films', em: '🎬', c: ['#7c3aed', '#db2777'] },
    { id: 'series', name: 'Séries', em: '📺', c: ['#2563eb', '#7c3aed'] },
    { id: 'science', name: 'Science', em: '🔬', c: ['#0891b2', '#16a34a'] },
    { id: 'documentary', name: 'Documentaires', em: '🦁', c: ['#65a30d', '#ca8a04'] },
    { id: 'sports', name: 'Sport (gratuit)', em: '⚽', c: ['#16a34a', '#0f766e'] },
    { id: 'entertainment', name: 'Divertissement', em: '🎉', c: ['#e11d48', '#f97316'] },
    { id: 'music', name: 'Musique', em: '🎵', c: ['#9333ea', '#2563eb'] },
    { id: 'kids', name: 'Enfants', em: '🧸', c: ['#f472b6', '#facc15'] },
    { id: 'animation', name: 'Animation', em: '🦄', c: ['#06b6d4', '#a855f7'] },
    { id: 'news', name: 'Info', em: '📰', c: ['#475569', '#1e293b'] },
    { id: 'education', name: 'Éducation', em: '🎓', c: ['#0ea5e9', '#6366f1'] },
    { id: 'travel', name: 'Voyage', em: '✈️', c: ['#14b8a6', '#3b82f6'] },
    { id: 'cooking', name: 'Cuisine', em: '🍲', c: ['#ea580c', '#b45309'] },
    { id: 'outdoor', name: 'Nature & aventure', em: '🏔️', c: ['#15803d', '#0369a1'] },
    { id: 'classic', name: 'Classiques', em: '🎞️', c: ['#78716c', '#44403c'] }
  ];
  THEMES.forEach(function (t) { t.url = BASE + 'categories/' + t.id + '.m3u'; });

  /* ---------- utilitaires ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function store(k, v) { try { if (v === undefined) { var r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  var toastT;
  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('show'); }, 2600); }
  function hashColor(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return 'hsl(' + (Math.abs(h) % 360) + ',55%,38%)'; }

  /* ---------- réseau ---------- */
  var nativeCbs = {}, nativeSeq = 0;
  window.__native = function (id, text, status) { var cb = nativeCbs[id]; delete nativeCbs[id]; if (cb) cb(status, text); };
  function nativeGet(url, cb) {
    if (!window.Android || !window.Android.fetchText) return cb(0, '');
    var id = 'n' + (++nativeSeq); nativeCbs[id] = cb; window.Android.fetchText(id, url);
  }
  function xhrGet(url, timeout, cb) {
    var x = new XMLHttpRequest(), done = false;
    function fin(s, t) { if (done) return; done = true; cb(s, t); }
    try { x.open('GET', url, true); } catch (e) { return fin(0, ''); }
    x.timeout = timeout;
    x.onload = function () { fin(x.status, x.responseText); };
    x.onerror = x.ontimeout = x.onabort = function () { fin(0, ''); };
    x.send();
  }
  function getText(url, cb) {
    xhrGet(url, 30000, function (s, t) {
      if (s >= 200 && s < 300 && t) return cb(true, t);
      nativeGet(url, function (s2, t2) { cb(s2 >= 200 && s2 < 300 && !!t2, t2); });
    });
  }
  function loadPlaylist(url, cb) {
    var key = 'pl:' + url, cached = store(key);
    if (cached && Date.now() - cached.t < 12 * 3600e3) return cb(parseM3U(cached.x));
    getText(url, function (ok, text) {
      if (ok && text.indexOf('#EXT') !== -1) { store(key, { t: Date.now(), x: text }); return cb(parseM3U(text)); }
      if (cached) return cb(parseM3U(cached.x));
      cb(null);
    });
  }

  /* ---------- parsing M3U ---------- */
  function parseM3U(text) {
    var lines = text.split(/\r?\n/), out = [], seen = {}, cur = null;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (!l) continue;
      if (l.indexOf('#EXTINF') === 0) {
        cur = { attrs: {}, name: '', ref: '', ua: '' };
        var re = /([\w-]+)="([^"]*)"/g, m, attrEnd = 0;
        while ((m = re.exec(l))) { cur.attrs[m[1].toLowerCase()] = m[2]; attrEnd = re.lastIndex; }
        var cut = l.indexOf(',', attrEnd);
        cur.name = cut >= 0 ? l.slice(cut + 1).trim() : '';
      } else if (l.indexOf('#EXTVLCOPT:') === 0 && cur) {
        var o = l.slice(11);
        if (o.indexOf('http-referrer=') === 0) cur.ref = o.slice(14);
        if (o.indexOf('http-user-agent=') === 0) cur.ua = o.slice(16);
      } else if (l[0] !== '#') {
        if (seen[l]) { cur = null; continue; }
        seen[l] = 1;
        var c = cur || { attrs: {}, name: l };
        out.push(makeChannel(c, l));
        cur = null;
      }
    }
    return out;
  }
  function makeChannel(c, url) {
    var raw = c.name || c.attrs['tvg-name'] || url, badges = [];
    var q = raw.match(/\((\d{3,4}p)\)/); if (q) badges.push(q[1]);
    if (/\[Not 24\/7\]/i.test(raw)) badges.push('pas 24/7');
    if (/\[Geo-blocked\]/i.test(raw)) badges.push('géo-bloquée');
    var name = raw.replace(/\s*\(\d{3,4}p\)/g, '').replace(/\s*\[[^\]]*\]/g, '').trim() || raw;
    return { name: name, url: url, logo: c.attrs['tvg-logo'] || '', group: c.attrs['group-title'] || '', id: c.attrs['tvg-id'] || '', badges: badges, ref: c.ref, ua: c.ua };
  }

  /* ---------- favoris / récents / playlists perso ---------- */
  var favs = store('favs') || [];
  var recents = store('recents') || [];
  var mine = store('mine') || [];
  function slim(ch) { return { name: ch.name, url: ch.url, logo: ch.logo, group: ch.group, id: ch.id, badges: ch.badges || [] }; }
  function isFav(url) { return favs.some(function (f) { return f.url === url; }); }
  function toggleFav(ch) {
    if (isFav(ch.url)) { favs = favs.filter(function (f) { return f.url !== ch.url; }); toast('Retiré des favoris'); }
    else { favs.unshift(slim(ch)); toast('⭐ Ajouté aux favoris'); }
    store('favs', favs); renderHomeRows();
  }
  function addRecent(ch) {
    recents = [slim(ch)].concat(recents.filter(function (r) { return r.url !== ch.url; })).slice(0, 20);
    store('recents', recents); renderHomeRows();
  }

  /* ---------- état de santé des flux ---------- */
  var health = store('health') || {};
  (function () { var now = Date.now(); Object.keys(health).forEach(function (k) { if (now - health[k].t > 6 * 3600e3) delete health[k]; }); })();
  var saveHealthT;
  function setHealth(url, ok) { health[url] = { ok: ok, t: Date.now() }; clearTimeout(saveHealthT); saveHealthT = setTimeout(function () { store('health', health); }, 1500); }
  function healthOf(url) { return health[url] ? (health[url].ok ? 'ok' : 'ko') : ''; }

  function probe(url, cb) {
    var x = new XMLHttpRequest(), done = false, isM3u8 = /m3u8?(\?|$)/i.test(url);
    function fin(ok) { if (done) return; done = true; try { x.abort(); } catch (e) {} cb(ok); }
    try { x.open('GET', url, true); } catch (e) { return fin(false); }
    x.timeout = 8000;
    x.onreadystatechange = function () {
      if (x.readyState === 2) {
        if (x.status >= 400 || x.status === 0) return fin(false);
        var ct = (x.getResponseHeader('content-type') || '').toLowerCase();
        if (!isM3u8 && ct.indexOf('mpegurl') === -1) return fin(x.status >= 200 && x.status < 400);
      }
    };
    x.onload = function () { fin(x.status < 400 && (x.responseText || '').indexOf('#EXT') !== -1); };
    x.onerror = x.ontimeout = function () { fin(false); };
    x.send();
  }

  var checkRun = 0;
  function runChecks(list) {
    var run = ++checkRun, todo = list.filter(function (c) { return !health[c.url]; }).slice(0, 400), total = todo.length, done = 0, idx = 0;
    if (!total) { $('checkBar').classList.add('hidden'); return; }
    $('checkBar').classList.remove('hidden');
    function upd() { $('checkFill').style.width = (done / total * 100) + '%'; $('checkTxt').textContent = 'Test des chaînes ' + done + '/' + total; if (done >= total) setTimeout(function () { if (run === checkRun) $('checkBar').classList.add('hidden'); }, 800); }
    function next() {
      if (run !== checkRun || idx >= todo.length) return;
      var ch = todo[idx++];
      probe(ch.url, function (ok) {
        if (run !== checkRun) return;
        setHealth(ch.url, ok); done++; upd(); markCard(ch.url);
        if (onlineOnly && done >= total) applyFilter();
        next();
      });
    }
    upd();
    for (var k = 0; k < 6; k++) next();
  }

  /* ---------- ACCUEIL ---------- */
  function tileHtml(t, extra) {
    return '<button class="tile" data-id="' + esc(t.id) + '" style="background:linear-gradient(135deg,' + t.c[0] + ',' + t.c[1] + ')">' +
      (extra || '') + '<span class="em">' + t.em + '</span><span class="nm">' + esc(t.name) + '</span>' + (t.ds ? '<span class="ds">' + esc(t.ds) + '</span>' : '') + '</button>';
  }
  function bindTiles(container, arr) {
    container.querySelectorAll('.tile').forEach(function (b) {
      b.onclick = function (e) {
        var t = arr.filter(function (x) { return x.id === b.dataset.id; })[0];
        if (e.target.classList.contains('del')) { removeMine(t); return; }
        if (t) openList(t);
      };
    });
  }
  function renderHome() {
    $('countryTiles').innerHTML = COUNTRIES.map(function (t) { return tileHtml(t); }).join('');
    bindTiles($('countryTiles'), COUNTRIES);
    $('themeTiles').innerHTML = THEMES.map(function (t) { return tileHtml(t); }).join('');
    bindTiles($('themeTiles'), THEMES);
    renderHomeRows();
  }
  function renderHomeRows() {
    $('rowFav').classList.toggle('hidden', !favs.length);
    $('favList').innerHTML = favs.map(cardHtml).join('');
    bindCards($('favList'), favs);
    $('rowRecent').classList.toggle('hidden', !recents.length);
    $('recentList').innerHTML = recents.map(cardHtml).join('');
    bindCards($('recentList'), recents);
    $('rowMine').classList.toggle('hidden', !mine.length);
    $('mineTiles').innerHTML = mine.map(function (t) { return tileHtml(t, '<span class="del">✕</span>'); }).join('');
    bindTiles($('mineTiles'), mine);
  }
  function removeMine(t) {
    mine = mine.filter(function (m) { return m.id !== t.id; }); store('mine', mine); renderHomeRows(); toast('Playlist supprimée');
  }

  /* ---------- LISTE ---------- */
  var current = null, all = [], shown = [], rendered = 0, onlineOnly = false, frOnly = false, frSet = null;
  var PAGE = 90;

  function cardHtml(ch) {
    var h = healthOf(ch.url);
    var logo = ch.logo ? '<img loading="lazy" src="' + esc(ch.logo) + '" data-n="' + esc(ch.name) + '" onerror="tvImgErr(this)">' : iniHtml(ch.name);
    return '<button class="card' + (h === 'ko' ? ' dead' : '') + '" data-url="' + esc(ch.url) + '">' +
      '<span class="st ' + h + '"></span>' + (isFav(ch.url) ? '<span class="fv">★</span>' : '') +
      '<div class="lg">' + logo + '</div><div class="nm">' + esc(ch.name) + '</div>' +
      '<div class="bd">' + (ch.badges || []).map(function (b) { return '<span>' + esc(b) + '</span>'; }).join('') + '</div></button>';
  }
  function iniHtml(n) { return '<div class="ini" style="background:' + hashColor(n) + '">' + esc(n.slice(0, 2).toUpperCase()) + '</div>'; }
  window.tvImgErr = function (img) { var p = img.parentNode; if (p) p.innerHTML = iniHtml(img.getAttribute('data-n') || '?'); };
  function bindCards(container, list) {
    container.onclick = function (e) {
      var b = e.target.closest('.card'); if (!b) return;
      var url = b.dataset.url, i = -1;
      for (var k = 0; k < list.length; k++) if (list[k].url === url) { i = k; break; }
      if (i >= 0) openPlayer(list, i);
    };
  }
  function markCard(url) {
    var els = document.querySelectorAll('.card[data-url="' + (window.CSS && CSS.escape ? CSS.escape(url) : url) + '"]');
    var h = healthOf(url);
    els.forEach(function (el) { var s = el.querySelector('.st'); if (s) s.className = 'st ' + h; el.classList.toggle('dead', h === 'ko'); });
  }

  function showView(id) {
    document.querySelectorAll('.view').forEach(function (v) { v.classList.toggle('active', v.id === id); });
    window.scrollTo(0, 0);
  }

  function openList(t) {
    current = t; all = []; shown = [];
    $('listTitle').textContent = t.em + ' ' + t.name;
    $('listCount').textContent = 'Chargement…';
    $('grid').innerHTML = ''; $('search').value = '';
    frOnly = false; $('chipFr').classList.remove('on');
    $('chipFr').classList.toggle('hidden', !!t.fr || t.id === 'sn' || t.id === 'ci' || t.id === 'fr');
    $('listMsg').innerHTML = '<div class="spinner"></div>Chargement des chaînes…';
    $('listMsg').classList.remove('hidden');
    showView('list');
    history.pushState({ v: 'list' }, '');
    loadPlaylist(t.url, function (list) {
      if (current !== t) return;
      if (!list) { $('listMsg').innerHTML = '😕 Impossible de charger cette liste.<br>Vérifie ta connexion Internet puis réessaie.'; $('listCount').textContent = ''; return; }
      all = list;
      $('listMsg').classList.add('hidden');
      applyFilter();
      runChecks(all);
    });
  }

  function applyFilter() {
    var q = $('search').value.trim().toLowerCase();
    shown = all.filter(function (c) {
      if (q && c.name.toLowerCase().indexOf(q) === -1 && c.group.toLowerCase().indexOf(q) === -1) return false;
      if (onlineOnly && healthOf(c.url) !== 'ok') return false;
      if (frOnly && frSet && !frSet[c.url] && !(c.id && frSet['id:' + c.id])) return false;
      return true;
    });
    // chaînes en ligne d'abord, puis non testées, puis hors ligne
    var rank = { ok: 0, '': 1, ko: 2 };
    shown = shown.map(function (c, i) { return { c: c, i: i }; }).sort(function (a, b) { return (rank[healthOf(a.c.url)] - rank[healthOf(b.c.url)]) || (a.i - b.i); }).map(function (x) { return x.c; });
    rendered = 0; $('grid').innerHTML = '';
    var okN = all.filter(function (c) { return healthOf(c.url) === 'ok'; }).length;
    $('listCount').textContent = shown.length + ' chaîne' + (shown.length > 1 ? 's' : '') + (okN ? ' · ' + okN + ' en ligne' : '');
    if (!shown.length && all.length) { $('listMsg').innerHTML = onlineOnly ? 'Aucune chaîne confirmée en ligne pour l\'instant…<br>Le test est peut-être encore en cours.' : 'Aucun résultat.'; $('listMsg').classList.remove('hidden'); }
    else $('listMsg').classList.add('hidden');
    renderMore();
    bindCards($('grid'), shown);
  }
  function renderMore() {
    if (rendered >= shown.length) return;
    var html = shown.slice(rendered, rendered + PAGE).map(cardHtml).join('');
    $('grid').insertAdjacentHTML('beforeend', html);
    rendered = Math.min(shown.length, rendered + PAGE);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) renderMore(); }, { rootMargin: '600px' }).observe($('sentinel'));
  } else { window.addEventListener('scroll', function () { if (innerHeight + scrollY > document.body.offsetHeight - 800) renderMore(); }); }

  var searchT;
  $('search').addEventListener('input', function () { clearTimeout(searchT); searchT = setTimeout(applyFilter, 200); });
  $('chipOnline').onclick = function () { onlineOnly = !onlineOnly; this.classList.toggle('on', onlineOnly); applyFilter(); };
  $('chipFr').onclick = function () {
    var btn = this;
    if (frOnly) { frOnly = false; btn.classList.remove('on'); return applyFilter(); }
    if (frSet) { frOnly = true; btn.classList.add('on'); return applyFilter(); }
    toast('Chargement de la liste française…');
    loadPlaylist(FR_URL, function (list) {
      if (!list) return toast('Liste française indisponible');
      frSet = {}; list.forEach(function (c) { frSet[c.url] = 1; if (c.id) frSet['id:' + c.id] = 1; });
      frOnly = true; btn.classList.add('on'); applyFilter();
    });
  };
  $('btnBack').onclick = function () { history.back(); };

  /* ---------- LECTEUR ---------- */
  var hls = null, pList = [], pIdx = 0, stallT = null, recovered = false;
  var video = $('video');

  function openPlayer(list, i) {
    pList = list; pIdx = i;
    if ($('player').classList.contains('hidden')) { $('player').classList.remove('hidden'); history.pushState({ v: 'player' }, ''); }
    play();
  }
  function stopVideo() {
    clearTimeout(stallT);
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
    try { video.pause(); video.removeAttribute('src'); video.load(); } catch (e) {}
  }
  function closePlayer() {
    stopVideo();
    if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} }
    $('player').classList.add('hidden');
  }
  function showErr(t) { clearTimeout(stallT); $('pLoading').classList.add('hidden'); $('pErrTxt').textContent = t; $('pError').classList.remove('hidden'); }
  function play() {
    var ch = pList[pIdx]; if (!ch) return;
    stopVideo(); recovered = false;
    $('pName').textContent = ch.name;
    $('pSub').textContent = (pIdx + 1) + ' / ' + pList.length + (ch.group ? ' · ' + ch.group.split(';')[0] : '');
    $('pFav').textContent = isFav(ch.url) ? '★' : '☆';
    $('pError').classList.add('hidden'); $('pLoading').classList.remove('hidden');
    addRecent(ch);
    stallT = setTimeout(function () { setHealth(ch.url, false); markCard(ch.url); showErr('La chaîne ne répond pas (hors ligne ou bloquée dans ton pays).'); stopVideo(); }, 20000);

    var direct = /\.(mp4|webm|mkv|mov)(\?|$)/i.test(ch.url);
    if (!direct && window.Hls && Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 30, enableWorker: true, manifestLoadingMaxRetry: 2, levelLoadingMaxRetry: 2, fragLoadingMaxRetry: 3 });
      hls.on(Hls.Events.MANIFEST_PARSED, function () { video.play().catch(function () {}); });
      hls.on(Hls.Events.ERROR, function (ev, d) {
        if (!d.fatal) return;
        if (d.type === Hls.ErrorTypes.MEDIA_ERROR && !recovered) { recovered = true; hls.recoverMediaError(); return; }
        setHealth(ch.url, false); markCard(ch.url);
        showErr(d.type === Hls.ErrorTypes.NETWORK_ERROR ? 'Chaîne hors ligne ou bloquée dans ton pays.' : 'Format vidéo non pris en charge pour cette chaîne.');
        stopVideo();
      });
      hls.loadSource(ch.url);
      hls.attachMedia(video);
    } else {
      video.src = ch.url;
      video.play().catch(function () {});
    }
  }
  video.addEventListener('playing', function () {
    clearTimeout(stallT); $('pLoading').classList.add('hidden'); $('pError').classList.add('hidden');
    var ch = pList[pIdx]; if (ch) { setHealth(ch.url, true); markCard(ch.url); }
  });
  video.addEventListener('waiting', function () { if ($('pError').classList.contains('hidden')) $('pLoading').classList.remove('hidden'); });
  video.addEventListener('error', function () { if (!hls && video.getAttribute('src')) showErr('Chaîne indisponible.'); });

  function step(d) { if (!pList.length) return; pIdx = (pIdx + d + pList.length) % pList.length; play(); }
  $('pNext').onclick = function () { step(1); };
  $('pPrev').onclick = function () { step(-1); };
  $('pSkip').onclick = function () { step(1); };
  $('pClose').onclick = function () { history.back(); };
  $('pFav').onclick = function () { var ch = pList[pIdx]; if (!ch) return; toggleFav(ch); this.textContent = isFav(ch.url) ? '★' : '☆'; if (current) markCard(ch.url); };
  $('pFull').onclick = function () {
    var el = $('pStage');
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.requestFullscreen) el.requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    } catch (e) {}
  };

  /* ---------- navigation retour (bouton Android) ---------- */
  window.addEventListener('popstate', function () {
    if (!$('player').classList.contains('hidden')) { closePlayer(); return; }
    if (!$('dlg').classList.contains('hidden')) { $('dlg').classList.add('hidden'); return; }
    if ($('list').classList.contains('active')) { checkRun++; current = null; $('checkBar').classList.add('hidden'); showView('home'); }
  });
  // appelé par l'appli Android : renvoie true si on a géré le retour
  window.tvBack = function () {
    if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} return true; }
    if (!$('player').classList.contains('hidden') || $('list').classList.contains('active') || !$('dlg').classList.contains('hidden')) { history.back(); return true; }
    return false;
  };

  /* ---------- raccourcis clavier (version bureau) ---------- */
  document.addEventListener('keydown', function (e) {
    var inField = /INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '');
    var playerOpen = !$('player').classList.contains('hidden');
    if (e.key === 'Escape') {
      if (document.fullscreenElement) return; // le navigateur gère la sortie du plein écran
      if (playerOpen || $('list').classList.contains('active') || !$('dlg').classList.contains('hidden')) { e.preventDefault(); history.back(); }
      return;
    }
    if (!playerOpen || inField) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); $('pFull').click(); }
    else if (e.key === ' ') { e.preventDefault(); if (video.paused) video.play().catch(function () {}); else video.pause(); }
  });

  /* ---------- ajout playlist ---------- */
  $('btnAdd').onclick = function () { $('dlgName').value = ''; $('dlgUrl').value = ''; $('dlg').classList.remove('hidden'); history.pushState({ v: 'dlg' }, ''); };
  $('dlgCancel').onclick = function () { history.back(); };
  $('dlgOk').onclick = function () {
    var url = $('dlgUrl').value.trim(), name = $('dlgName').value.trim() || 'Ma playlist';
    if (!/^https?:\/\//i.test(url)) return toast('Adresse invalide (doit commencer par http)');
    mine.push({ id: 'm' + Date.now(), name: name, em: '📂', url: url, c: ['#334155', '#0f172a'] });
    store('mine', mine); history.back(); renderHomeRows(); toast('Playlist ajoutée');
  };

  renderHome();
  window.__tv = { parseM3U: parseM3U };
})();
