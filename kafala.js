// الصفحة العامة للمتبرعين (ديزاين «قصة الحلقة»): كل الحلقات، أو حلقات مجمع واحد عبر ?place=
window.RH = window.RH || {};
(function () {
  var RH = window.RH;
  RH.STORE = 'https://store.qurannajran.org.sa/';
  var params = new URLSearchParams(location.search);
  var PLACE = (params.get('place') || '').trim();
  var Q = '', SEC = '', SHOW_ALL = false, PL_ALL = false, DONE_ALL = false, LIMIT = 12;
  var fmt = function (n) { return Math.round(Number(n) || 0).toLocaleString('en-US'); };
  var pcs = function (p) { return (Math.round(p * 10) / 10) + '%'; };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function brand(key) { var b = dash.data('brand'); var v = b.status === 'ok' && b.data ? b.data[key] : null; return typeof v === 'string' && v.indexOf('data:image/') === 0 ? v : null; }
  function linkOf(h) { return /^https?:\/\//.test(h.store || '') ? h.store : RH.STORE; }
  function shape(h) {
    var remaining = Math.max(h.cost - h.received, 0);
    var pct = h.cost > 0 ? Math.min(Math.round(h.received / h.cost * 1000) / 10, 100) : 0;
    return { id: h.id, name: h.name, section: h.section, place: h.place, students: h.students, cost: h.cost, received: h.received, remaining: remaining, pct: pct, store: h.store };
  }
  dash.calc('allh', { inputs: ['halaqat'], fn: function (rows) { return (rows || []).map(shape); } });
  dash.calc('halaqa', { inputs: ['halaqat'], fn: function (rows) { return (rows || []).filter(function (h) { return !PLACE || h.place === PLACE; }).map(shape); } });
  function get(k) { var d = dash.data(k); return d.status === 'ok' && d.data ? d.data : null; }
  function list() { return get('halaqa'); }
  function totals(rows) {
    var t = { total: 0, received: 0, count: rows.length, done: 0 };
    rows.forEach(function (h) { t.total += h.cost; t.received += Math.min(h.received, h.cost); if (h.pct >= 100) t.done++; });
    t.pct = t.total ? Math.round(t.received / t.total * 1000) / 10 : 0; t.remaining = t.total - t.received; return t;
  }
  function nearest(rows) {
    var open = rows.filter(function (h) { return h.pct < 100 && h.pct > 0; });
    open.sort(function (a, b) { return b.pct - a.pct || a.remaining - b.remaining || b.students - a.students; });
    return open[0] || null;
  }
  var nH = function (n) { return n === 1 ? 'حلقة واحدة' : n === 2 ? 'حلقتان' : (n >= 3 && n <= 10 ? n + ' حلقات' : n + ' حلقة'); };
  var unit = function (h) { return h.section === 'نساء' ? ' طالبة' : ' طالب'; };

  dash.draw('k_pattern', function (e) { var u = brand('pattern'); e.style.backgroundImage = u ? 'url("' + u + '")' : 'none'; });
  dash.draw('k_logo', function (e) { e.replaceChildren(); var u = brand('logo'); if (!u) return; var i = el('img'); i.src = u; i.alt = 'شعار جمعية رتّل'; e.appendChild(i); });
  dash.draw('k_logo2', function (e) { e.replaceChildren(); var u = brand('logo'); if (!u) return; var i = el('img'); i.src = u; i.alt = ''; e.appendChild(i); });
  dash.draw('k_title', function (e) {
    if (PLACE) { e.textContent = 'حلقات ' + PLACE; } else { e.replaceChildren(document.createTextNode('كل حلقة قرآنية..'), el('br'), document.createTextNode('تنتظر من يكفلها')); }
    document.title = (PLACE ? 'حلقات ' + PLACE : 'اكفل حلقة قرآنية') + ' — جمعية رتّل';
  });
  dash.draw('k_lead', function (e) {
    var r = list(); if (!r) { e.textContent = 'جاري تحميل الأرقام…'; return; }
    var t = totals(r), men = r.some(function (h) { return h.section === 'رجال'; }), wom = r.some(function (h) { return h.section === 'نساء'; });
    e.textContent = (PLACE ? nH(t.count) + ' في ' + PLACE : nH(t.count) + ' لتحفيظ القرآن الكريم في نجران' + (men && wom ? '، رجال ونساء' : '')) + '. اختر حلقة واكفلها كاملة، أو ساهم بسهم من 50 ريال.';
  });
  dash.draw('k_cta2', function (e) { e.hidden = !!PLACE; });
  dash.draw('k_navplaces', function (e) { e.hidden = !!PLACE; });
  dash.draw('k_all', function (e) { e.hidden = !PLACE; });
  dash.draw('k_ring', function (e) {
    var r = list(), c = e.querySelector('.pr'); if (!r || !c) return;
    var p = totals(r).pct, L = 2 * Math.PI * 112;
    requestAnimationFrame(function () { c.setAttribute('stroke-dasharray', (L * Math.min(100, p) / 100).toFixed(1) + ' ' + L.toFixed(1)); });
    e.setAttribute('aria-label', 'نسبة الكفالة ' + p + ' بالمئة');
  });
  dash.draw('k_pct', function (e) { var r = list(); e.textContent = r ? pcs(totals(r).pct) : '—'; });
  dash.draw('k_take', function (e) {
    var r = list(); e.replaceChildren(); if (!r) { e.textContent = '—'; return; }
    if (!r.length) { e.textContent = 'ما لقينا حلقات بهالاسم.'; return; }
    var t = totals(r);
    e.appendChild(document.createTextNode('وصل ')); e.appendChild(el('b', null, fmt(t.received)));
    e.appendChild(document.createTextNode(' ريال من أصل ')); e.appendChild(el('strong', null, fmt(t.total)));
  });
  dash.draw('k_tiles', function (e) {
    var r = list(); e.replaceChildren(); if (!r) return; var t = totals(r);
    [[t.count, 'حلقة', ''], [t.done, 'اكتملت', ' g'], [t.count - t.done, 'تنتظر كفالة', '']].forEach(function (x) {
      var d = el('div', 'k-tile' + x[2]); d.appendChild(el('b', null, String(x[0]))); d.appendChild(el('small', null, x[1])); e.appendChild(d);
    });
  });
  dash.draw('k_near', function (e) {
    var r = list(); e.replaceChildren(); var h = r && nearest(r); e.hidden = !h; if (!h) return;
    var pat = el('div', 'k-pat2'); var u = brand('pattern'); if (u) pat.style.backgroundImage = 'url("' + u + '")'; e.appendChild(pat);
    var a = el('div', 'k-near-a'), b = el('div', 'k-near-b');
    var dot = el('div', 'k-dot'); dot.appendChild(el('i')); dot.appendChild(el('span', null, 'الأقرب للاكتمال')); a.appendChild(dot);
    a.appendChild(el('h2', null, 'حلقة ' + h.name)); a.appendChild(el('div', 'pl', h.place + ' · ' + h.students + unit(h)));
    var bar = el('div', 'bar'), i = el('i'); i.style.width = Math.min(100, h.pct) + '%'; bar.appendChild(i); a.appendChild(bar);
    b.appendChild(el('span', 'pc', pcs(h.pct)));
    var lf = el('span', 'lf'); lf.appendChild(document.createTextNode('باقي ')); lf.appendChild(el('b', null, fmt(h.remaining))); lf.appendChild(document.createTextNode(' ريال وتكتمل كفالتها')); b.appendChild(lf);
    var go = el('a', 'go', 'أكمل كفالتها'); go.href = linkOf(h); go.target = '_blank'; go.rel = 'noopener'; go.dataset.h = h.name + ' · ' + h.place; go.dataset.near = '1'; b.appendChild(go);
    e.appendChild(a); e.appendChild(b);
  });
  function filtered() {
    var r = list(); if (!r) return null;
    var q = Q.trim();
    var out = r.filter(function (h) { return h.pct < 100 && (!SEC || h.section === SEC) && (!q || (h.name + ' ' + h.place).indexOf(q) !== -1); });
    out.sort(function (a, b) { return b.pct - a.pct || a.remaining - b.remaining || a.name.localeCompare(b.name, 'ar'); });
    return out;
  }
  var searching = function () { return !!(Q.trim() || SEC); };
  dash.draw('k_count', function (e) { var r = filtered(); e.textContent = r ? (nH(r.length) + ' تنتظر الكفالة' + (searching() ? ' حسب البحث' : '')) : '—'; });
  dash.draw('k_cards', function (e) {
    var r = filtered(); e.replaceChildren();
    var full = SHOW_ALL || searching(); e.classList.toggle('rail', !full);
    if (!r) { e.appendChild(el('div', 'k-empty', dash.data('halaqa').status === 'error' ? 'تعذّر التحميل، حدّث الصفحة.' : 'جاري التحميل…')); return; }
    if (!r.length) { e.appendChild(el('div', 'k-empty', searching() ? 'ما فيه حلقات تطابق البحث' : 'اكتملت كفالة كل الحلقات هنا، جزاكم الله خيرًا')); return; }
    (full ? r : r.slice(0, LIMIT)).forEach(function (h) {
      var women = h.section === 'نساء', c = el('article', 'k-card' + (women ? ' w' : ''));
      var t = el('div', 't'); t.appendChild(el('span', 'k-tag', h.section));
      if (h.pct >= 75) t.appendChild(el('span', 'near', 'قربت تكتمل')); else t.appendChild(el('span', 'st', h.students + unit(h)));
      c.appendChild(t);
      c.appendChild(el('h3', null, h.name)); c.appendChild(el('div', 'pl', h.place));
      var row = el('div', 'row'); row.appendChild(el('span', 'pc', pcs(h.pct)));
      var lf = el('span', 'lf'); lf.appendChild(document.createTextNode('باقي ')); lf.appendChild(el('b', null, fmt(h.remaining))); lf.appendChild(document.createTextNode(' ريال')); row.appendChild(lf); c.appendChild(row);
      var bar = el('div', 'bar'), i = el('i'); i.style.width = Math.max(h.pct > 0 ? 2 : 0, Math.min(100, h.pct)) + '%'; bar.appendChild(i); c.appendChild(bar);
      var a = el('a', 'go', h.pct > 0 ? 'أكمل الحلقة' : 'اكفل الحلقة'); a.href = linkOf(h); a.dataset.h = h.name + ' · ' + h.place; a.target = '_blank'; a.rel = 'noopener'; c.appendChild(a);
      e.appendChild(c);
    });
  });
  dash.draw('k_more', function (e) {
    var r = filtered(); e.replaceChildren(); if (!r || searching() || r.length <= LIMIT) return;
    var b = el('button', null, SHOW_ALL ? 'عرض أقل' : 'عرض كل الحلقات (' + r.length + ')'); b.type = 'button';
    b.onclick = function () { SHOW_ALL = !SHOW_ALL; redraw(); if (!SHOW_ALL) document.getElementById('k-halaqat').scrollIntoView({ behavior: 'smooth' }); };
    e.appendChild(b);
  });
  dash.draw('k_places', function (e) {
    e.replaceChildren(); e.hidden = !!PLACE; if (PLACE) return;
    var all = get('allh'); if (!all) return;
    var m = {};
    all.forEach(function (h) { var p = m[h.place] || (m[h.place] = { name: h.place, n: 0, cost: 0, rec: 0, done: 0, w: 0 }); p.n++; p.cost += h.cost; p.rec += Math.min(h.received, h.cost); if (h.pct >= 100) p.done++; if (h.section === 'نساء') p.w++; });
    var ps = Object.keys(m).map(function (k) { var p = m[k]; p.pct = p.cost ? p.rec / p.cost * 100 : 0; return p; }).filter(function (p) { return p.done < p.n; });
    ps.sort(function (a, b) { return b.pct - a.pct || b.n - a.n; });
    e.appendChild(el('h2', null, 'اكفل حلقات مجمعك'));
    var box = el('div', 'k-pl-list'), C = 2 * Math.PI * 18;
    (PL_ALL ? ps : ps.slice(0, 6)).forEach(function (p) {
      var a = el('a', 'k-pl'); a.href = 'kafala.html?place=' + encodeURIComponent(p.name);
      var col = p.w * 2 > p.n ? 'var(--wbar)' : 'var(--accent)';
      a.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="tr" cx="22" cy="22" r="18" fill="none" stroke-width="5"/><circle cx="22" cy="22" r="18" fill="none" stroke-width="5" stroke-linecap="round" style="stroke:' + col + '" stroke-dasharray="' + (C * Math.min(100, p.pct) / 100).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg>';
      var nm = el('span', 'nm'); nm.appendChild(el('b', null, p.name)); nm.appendChild(el('small', null, nH(p.n) + (p.done ? ' · اكتملت ' + p.done : '')));
      a.appendChild(nm); a.appendChild(el('span', 'pc', Math.round(p.pct) + '%')); box.appendChild(a);
    });
    e.appendChild(box);
    if (ps.length > 6) { var b = el('button', 'k-linkbtn', PL_ALL ? 'عرض أقل' : 'كل المجمعات والدور (' + ps.length + ') ←'); b.type = 'button'; b.onclick = function () { PL_ALL = !PL_ALL; dash.draw('k_places'); }; e.appendChild(b); }
  });
  dash.draw('k_done', function (e) {
    e.replaceChildren(); var r = list(); if (!r) { e.hidden = true; return; }
    var d = r.filter(function (h) { return h.pct >= 100; }); e.hidden = !d.length; if (!d.length) return;
    var h = el('div', 'h'); h.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>';
    h.appendChild(el('h2', null, 'اكتملت بفضل الله ثم بدعمكم')); e.appendChild(h);
    e.appendChild(el('p', null, nH(d.length) + ' كُفلت بالكامل هذا الفصل'));
    var ch = el('div', 'k-chips'), N = 10;
    (DONE_ALL ? d : d.slice(0, N)).forEach(function (x) { ch.appendChild(el('span', null, x.name)); });
    if (d.length > N) { var b = el('button', null, DONE_ALL ? 'عرض أقل' : '+' + (d.length - N) + ' حلقة'); b.type = 'button'; b.onclick = function () { DONE_ALL = !DONE_ALL; dash.draw('k_done'); }; ch.appendChild(b); }
    e.appendChild(ch);
  });

  // الثيم: الافتراضي رملي فاتح، وزر يحوّل للداكن ويتذكر الاختيار
  function setDark(on, save) {
    var root = document.getElementById('k-root'); if (!root) return;
    root.classList.toggle('dark', on);
    document.documentElement.style.background = document.body.style.background = on ? '#1C140B' : '#F3EADB';
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = on ? '#1C140B' : '#F3EADB';
    document.getElementById('k-sun').hidden = !on; document.getElementById('k-moon').hidden = on;
    document.getElementById('k-mode').setAttribute('aria-label', on ? 'حوّل للثيم الفاتح' : 'حوّل للثيم الداكن');
    if (save) try { localStorage.setItem('k-theme', on ? 'dark' : 'light'); } catch (e) {}
  }
  var startDark = false;
  try { startDark = localStorage.getItem('k-theme') === 'dark'; } catch (e) {}
  setDark(startDark, false);
  document.getElementById('k-mode').addEventListener('click', function () { setDark(!document.getElementById('k-root').classList.contains('dark'), true); });

  function redraw() { dash.draw('k_cards'); dash.draw('k_count'); dash.draw('k_more'); }
  document.getElementById('k-q').addEventListener('input', function (ev) { Q = ev.target.value; redraw(); });
  var seg = document.getElementById('k-sec');
  seg.querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () {
      SEC = b.getAttribute('data-v');
      seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      redraw();
    });
  });
  // الإحصائيات
  var tr = document.createElement('script'); tr.src = 'track.js?t=' + Date.now(); document.body.appendChild(tr);
})();
