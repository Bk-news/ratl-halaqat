// الصفحة العامة للمتبرعين: كل الحلقات، أو حلقات مجمع واحد عبر ?place=
window.RH = window.RH || {};
(function () {
  var RH = window.RH;
  RH.STORE = 'https://store.qurannajran.org.sa/';
  var params = new URLSearchParams(location.search);
  var PLACE = (params.get('place') || '').trim();
  var Q = '', SEC = '';
  var fmt = function (n) { return Math.round(Number(n) || 0).toLocaleString('en-US'); };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function brand(key) { var b = dash.data('brand'); var v = b.status === 'ok' && b.data ? b.data[key] : null; return typeof v === 'string' && v.indexOf('data:image/') === 0 ? v : null; }
  function linkOf(h) { return /^https?:\/\//.test(h.store || '') ? h.store : RH.STORE; }

  dash.calc('halaqa', {
    inputs: ['halaqat'],
    fn: function (rows) {
      return (rows || []).filter(function (h) { return !PLACE || h.place === PLACE; }).map(function (h) {
        var remaining = Math.max(h.cost - h.received, 0);
        var pct = h.cost > 0 ? Math.min(Math.round(h.received / h.cost * 1000) / 10, 100) : 0;
        return { id: h.id, name: h.name, section: h.section, place: h.place, students: h.students, cost: h.cost, received: h.received, remaining: remaining, pct: pct, store: h.store };
      });
    }
  });
  function list() { var d = dash.data('halaqa'); return d.status === 'ok' && d.data ? d.data : null; }
  function totals(rows) {
    var t = { total: 0, received: 0, count: rows.length, done: 0 };
    rows.forEach(function (h) { t.total += h.cost; t.received += Math.min(h.received, h.cost); if (h.pct >= 100) t.done++; });
    t.pct = t.total ? Math.round(t.received / t.total * 1000) / 10 : 0; t.remaining = t.total - t.received; return t;
  }
  function nearest(rows) {
    var open = rows.filter(function (h) { return h.pct < 100; });
    open.sort(function (a, b) { return b.pct - a.pct || a.remaining - b.remaining || b.students - a.students; });
    return open[0] || null;
  }

  dash.draw('k_pattern', function (e) { var u = brand('pattern'); e.style.backgroundImage = u ? 'url("' + u + '")' : 'none'; });
  dash.draw('k_logo', function (e) { e.replaceChildren(); var u = brand('logo'); if (!u) return; var i = el('img'); i.src = u; i.alt = 'شعار جمعية رتّل'; e.appendChild(i); });
  dash.draw('k_logo2', function (e) { e.replaceChildren(); var u = brand('logo'); if (!u) return; var i = el('img'); i.src = u; i.alt = ''; e.appendChild(i); });
  dash.draw('k_title', function (e) {
    e.textContent = PLACE ? ('حلقات ' + PLACE) : 'اكفل حلقة قرآنية';
    document.title = (PLACE ? 'حلقات ' + PLACE : 'اكفل حلقة قرآنية') + ' — جمعية رتّل';
  });
  dash.draw('k_all', function (e) { e.hidden = !PLACE; });
  dash.draw('k_pct', function (e) { var r = list(); e.textContent = r ? String(totals(r).pct) : '—'; });
  dash.draw('k_bar', function (e) { var r = list(); e.replaceChildren(); if (!r) return; var i = el('i'); i.style.width = Math.min(100, totals(r).pct) + '%'; e.appendChild(i); });
  dash.draw('k_take', function (e) {
    var r = list(); e.replaceChildren(); if (!r) { e.textContent = 'جاري التحميل…'; return; }
    if (!r.length) { e.textContent = 'ما لقينا حلقات بهالاسم.'; return; }
    var t = totals(r);
    var add = function (s, b) { e.appendChild(b ? el('b', null, s) : document.createTextNode(s)); };
    add('وصل '); add(fmt(t.received), 1); add(' ريال من أصل '); add(fmt(t.total), 1); add(' ريال لكفالة '); add(String(t.count), 1);
    add(t.count === 1 ? ' حلقة' : ' حلقة'); add('، واكتملت كفالة '); add(String(t.done), 1); add(' منها. باقي '); add(fmt(t.remaining), 1); add(' ريال.');
  });
  dash.draw('k_near', function (e) {
    var r = list(); e.replaceChildren(); var h = r && nearest(r); e.hidden = !h; if (!h) return;
    e.href = linkOf(h); e.dataset.h = h.name + ' · ' + h.place; e.dataset.near = '1';
    e.appendChild(el('small', null, 'تبرع للأقرب على الاكتمال'));
    e.appendChild(el('strong', null, 'حلقة ' + h.name + ' · ' + h.pct + '٪'));
    e.appendChild(el('small', null, 'باقي ' + fmt(h.remaining) + ' ريال وتكتمل كفالتها، ب' + h.place));
    e.appendChild(el('span', 'cta', 'تبرع الآن'));
  });
  function filtered() {
    var r = list(); if (!r) return null;
    var q = Q.trim();
    var out = r.filter(function (h) { return (!SEC || h.section === SEC) && (!q || (h.name + ' ' + h.place).indexOf(q) !== -1); });
    out.sort(function (a, b) { return (a.pct >= 100) - (b.pct >= 100) || b.pct - a.pct || a.remaining - b.remaining || a.name.localeCompare(b.name, 'ar'); });
    return out;
  }
  dash.draw('k_count', function (e) { var r = filtered(); e.textContent = r ? ('يظهر ' + r.length + ' حلقة') : '—'; });
  dash.draw('k_cards', function (e) {
    var r = filtered(); e.replaceChildren();
    if (!r) { e.appendChild(el('div', 'k-empty', dash.data('halaqa').status === 'error' ? 'تعذّر التحميل، حدّث الصفحة.' : 'جاري التحميل…')); return; }
    if (!r.length) { e.appendChild(el('div', 'k-empty', 'ما فيه حلقات تطابق البحث')); return; }
    r.forEach(function (h) {
      var women = h.section === 'نساء', done = h.pct >= 100;
      var c = el('article', 'k-h' + (women ? ' w' : '') + (done ? ' done' : ''));
      if (!done && h.pct >= 75) c.appendChild(el('span', 'k-tag', 'قربت تكتمل'));
      c.appendChild(el('div', 'k-h-name', 'حلقة ' + h.name));
      c.appendChild(el('div', 'k-h-place', h.place + ' · ' + h.students + (women ? ' طالبة' : ' طالب')));
      var row = el('div', 'k-h-row'); row.appendChild(el('div', 'k-h-pct', h.pct + '٪')); row.appendChild(el('div', null, 'وصل ' + fmt(h.received) + ' من ' + fmt(h.cost)));
      c.appendChild(row);
      var bar = el('div', 'k-bar ' + (women ? 'w' : 'm')); var i = el('i'); i.style.width = Math.min(100, h.pct) + '%'; bar.appendChild(i); c.appendChild(bar);
      if (done) {
        c.appendChild(el('div', 'k-done', '✓ اكتملت كفالتها، جزاكم الله خيرًا'));
      } else {
        var left = el('div', 'k-left'); left.appendChild(document.createTextNode('باقي ')); left.appendChild(el('b', null, fmt(h.remaining) + ' ريال'));
        left.appendChild(document.createTextNode(' وتكتمل كفالة الحلقة'));
        c.appendChild(left);
        var a = el('a', 'k-btn', h.pct > 0 ? 'أكمل الحلقة' : 'اكفل الحلقة'); a.href = linkOf(h); a.dataset.h = h.name + ' · ' + h.place; a.target = '_blank'; a.rel = 'noopener';
        c.appendChild(a);
      }
      e.appendChild(c);
    });
  });

  function setDark(on) {
    var root = document.getElementById('k-root'); if (!root) return;
    root.classList.toggle('dark', on);
    document.documentElement.style.background = document.body.style.background = on ? '#1C140B' : '#F3EADB';
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = on ? '#1C140B' : '#F3EADB';
    document.getElementById('k-sun').hidden = on; document.getElementById('k-moon').hidden = !on;
    document.getElementById('k-mode').setAttribute('aria-label', on ? 'المظهر الداكن مفعّل، اضغط للفاتح' : 'المظهر الفاتح مفعّل، اضغط للداكن');
    try { localStorage.setItem('k-dark', on ? '1' : '0'); } catch (e) {}
  }
  var startDark = true;
  try { var sv = localStorage.getItem('k-dark'); if (sv) startDark = sv === '1'; } catch (e) {}
  setDark(startDark);
  document.getElementById('k-mode').addEventListener('click', function () { setDark(!document.getElementById('k-root').classList.contains('dark')); });

  function redraw() { dash.draw('k_cards'); dash.draw('k_count'); }
  document.getElementById('k-q').addEventListener('input', function (ev) { Q = ev.target.value; redraw(); });
  var seg = document.getElementById('k-sec');
  if (PLACE) seg.hidden = true;
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
