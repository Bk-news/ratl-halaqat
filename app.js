window.RH = {
  STORE: 'https://store.qurannajran.org.sa/',
  TABARRU: 'https://es.ncnp.gov.sa/clds/19106',
  SHARE: 50,
  q: '', sec: '', place: '', sort: 'near', open: null, shotDark: false, shotName: '',
  enc: function (v) { return String(v).replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D'); },
  fmt: function (n) { return (Math.round(Number(n) || 0)).toLocaleString('en-US'); }
};

dash.loader('halaqat', {
  description: 'يقرأ ورقة «الحلقات» من الجدول: صف لكل حلقة مع رقمها واسمها وقسمها ومجمعها وعدد طلابها وتكلفتها والواصل لها ورابطها في المتجر.',
  fn: function ({ answer }) {
    var text = answer && typeof answer.fileContent === 'string' ? answer.fileContent : null;
    if (!text) throw new Error((answer && (answer.message || answer.detail)) || 'الجدول ما رجّع محتوى');
    var parts = text.split('### Sheet Name:');
    var part = parts.find(function (p) { return p.trim().indexOf('الحلقات') === 0; }) || parts[1] || '';
    var lines = part.split('\n').filter(function (l) { return /^\|/.test(l.trim()); });
    var tbl = [];
    lines.forEach(function (l) {
      var cells = l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
      if (cells.every(function (c) { return c === '' || /^:?-+:?$/.test(c); })) return;
      tbl.push(cells);
    });
    var num = function (v) { var n = Number(String(v || '').replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0; };
    var rows = [];
    tbl.slice(1).forEach(function (r) {
      if (!r[1]) return;
      rows.push({ id: String(Math.round(num(r[0]))), name: r[1], section: r[2] || '', place: r[3] || '', students: num(r[4]), cost: num(r[5]), received: num(r[6]), store: (r[9] || '').trim() });
    });
    var m = /### Table Range: [A-Z]+\d+:[A-Z]+(\d+)/.exec(part);
    var declared = m ? Number(m[1]) - 1 : rows.length;
    return { columns: ['id', 'name', 'section', 'place', 'students', 'cost', 'received', 'store'], rows: rows, truncated: rows.length < declared };
  }
});

dash.calc('halaqa', {
  title: 'كل حلقة مع المتبقي ونسبة الإكمال',
  description: 'الواصل من عمود «الواصل» في الجدول، والمتبقي = التكلفة − الواصل (بحد أدنى صفر)، والنسبة = الواصل ÷ التكلفة (بحد أعلى 100٪)، والأسهم المتبقية = المتبقي ÷ 50.',
  inputs: ['halaqat'],
  fn: function (halaqat) {
    return halaqat.map(function (h) {
      var remaining = Math.max(h.cost - h.received, 0);
      var pct = h.cost > 0 ? Math.min(Math.round(h.received / h.cost * 1000) / 10, 100) : 0;
      return { id: h.id, name: h.name, section: h.section, place: h.place, students: h.students, cost: h.cost, received: h.received, remaining: remaining, pct: pct, shares_left: Math.ceil(remaining / 50), store: h.store };
    });
  }
});

dash.calc('totals', {
  title: 'الإجماليات',
  description: 'مجموع التكلفة والواصل (بحد أعلى تكلفة كل حلقة) والمتبقي، وعدد الحلقات اللي وصل مبلغها كامل.',
  inputs: ['halaqa'],
  fn: function (halaqa) {
    var total = 0, received = 0, remaining = 0, done = 0;
    (halaqa || []).forEach(function (h) {
      total += h.cost; received += Math.min(h.received, h.cost); remaining += h.remaining;
      if (h.cost > 0 && h.received >= h.cost) done += 1;
    });
    return [{ count: (halaqa || []).length, total: total, received: received, remaining: remaining, pct: total > 0 ? Math.round(received / total * 1000) / 10 : 0, done: done }];
  }
});

dash.calc('bysection', {
  title: 'التقدم حسب القسم',
  description: 'التكلفة والواصل ونسبة الإكمال وعدد المكتملة لحلقات الرجال ولحلقات النساء.',
  inputs: ['halaqa'],
  fn: function (halaqa) {
    var m = {};
    (halaqa || []).forEach(function (h) {
      var s = m[h.section] || (m[h.section] = { section: h.section, count: 0, total: 0, received: 0, done: 0 });
      s.count += 1; s.total += h.cost; s.received += Math.min(h.received, h.cost);
      if (h.cost > 0 && h.received >= h.cost) s.done += 1;
    });
    return Object.keys(m).map(function (k) { var s = m[k]; s.pct = s.total > 0 ? Math.round(s.received / s.total * 1000) / 10 : 0; return s; });
  }
});

dash.calc('byplace', {
  title: 'التقدم حسب المجمع أو الدار',
  description: 'لكل مجمع أو دار: عدد الحلقات والتكلفة والواصل ونسبة الإكمال.',
  inputs: ['halaqa'],
  fn: function (halaqa) {
    var m = {};
    (halaqa || []).forEach(function (h) {
      var s = m[h.place] || (m[h.place] = { place: h.place, section: h.section, count: 0, total: 0, received: 0 });
      s.count += 1; s.total += h.cost; s.received += Math.min(h.received, h.cost);
    });
    return Object.keys(m).map(function (k) { var s = m[k]; s.pct = s.total > 0 ? Math.round(s.received / s.total * 1000) / 10 : 0; return s; })
      .sort(function (a, b) { return a.pct - b.pct || b.count - a.count || a.place.localeCompare(b.place, 'ar'); });
  }
});

dash.calc('zero', {
  title: 'حلقات ما وصلها شي',
  description: 'عدد الحلقات اللي الواصل لها صفر.',
  inputs: ['halaqa'],
  fn: function (halaqa) { return [{ count: (halaqa || []).filter(function (h) { return h.received <= 0; }).length }]; }
});

(function () {
  var RH = window.RH;
  function tot() { var t = dash.data('totals'); return t.status === 'ok' && t.data && t.data[0] ? t.data[0] : null; }
  function one(id) { var t = dash.data(id); return t.status === 'ok' && t.data && t.data[0] ? t.data[0] : null; }
  function mark(el, src, field, where) { el.setAttribute('data-source', src); el.setAttribute('data-field', field); el.setAttribute('data-where', where); return el; }
  function span(txt) { var s = document.createElement('span'); s.textContent = txt; return s; }
  function link(txt, href, cls) { var a = document.createElement('a'); a.className = 'rh-btn' + (cls ? ' ' + cls : ''); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = txt; return a; }
  function barEl(pct, cls) { var b = document.createElement('div'); b.className = 'rh-bar' + (cls ? ' ' + cls : ''); var i = document.createElement('i'); i.style.width = Math.max(0, Math.min(100, pct)) + '%'; b.appendChild(i); return b; }
  function linkOf(h) { return h && /^https?:\/\//.test(h.store || '') ? h.store : ''; }
  function storeOf(h) { return linkOf(h) || RH.STORE; }
  function brand(key) { var b = dash.data('brand'); var v = b.status === 'ok' && b.data ? b.data[key] : null; return typeof v === 'string' && v.indexOf('data:image/') === 0 ? v : null; }

  dash.draw('pattern', function (el) {
    var u = brand('pattern');
    el.style.backgroundImage = u ? 'url("' + u + '")' : 'none';
  });

  dash.draw('logo', function (el) {
    el.replaceChildren();
    var u = brand('logo'); if (!u) return;
    var img = document.createElement('img'); img.src = u; img.alt = 'شعار جمعية رتّل'; el.appendChild(img);
  });

  function simple(name, src, field, money) {
    dash.draw(name, function (el) {
      var r = src === 'totals' ? tot() : one(src);
      el.classList.toggle('dash-skeleton', dash.data(src).status === 'loading');
      el.textContent = r ? (money ? RH.fmt(r[field]) : String(r[field])) : '—';
    });
  }
  simple('t_received', 'totals', 'received', true); simple('t_total', 'totals', 'total', true); simple('t_pct', 'totals', 'pct'); simple('t_done', 'totals', 'done'); simple('t_count', 'totals', 'count');
  simple('k_total', 'totals', 'total', true); simple('k_received', 'totals', 'received', true); simple('k_remaining', 'totals', 'remaining', true); simple('k_pct', 'totals', 'pct'); simple('k_done', 'totals', 'done'); simple('k_count', 'totals', 'count');
  simple('zero_count', 'zero', 'count');

  dash.draw('bar_all', function (el) {
    var r = tot(); el.replaceChildren();
    if (!r) { el.textContent = '—'; return; }
    var i = document.createElement('i'); i.style.width = Math.min(100, r.pct) + '%'; el.appendChild(i);
    el.setAttribute('aria-label', 'نسبة الإكمال العامة ' + r.pct + '٪');
  });

  dash.draw('bar_sections', function (el) {
    var d = dash.data('bysection'); el.replaceChildren();
    if (d.status !== 'ok' || !d.data) { el.textContent = d.status === 'error' ? 'تعذّر التحميل' : '—'; return; }
    d.data.forEach(function (s) {
      var row = document.createElement('div'); row.className = 'rh-sec-row';
      var a = document.createElement('b'); a.textContent = s.section;
      var c = document.createElement('span');
      c.appendChild(mark(span(String(s.pct)), 'bysection', 'pct', 'section=' + RH.enc(s.section)));
      c.appendChild(document.createTextNode('٪ · ' + RH.fmt(s.received) + ' من ' + RH.fmt(s.total) + ' · اكتملت ' + s.done + ' من ' + s.count));
      row.appendChild(a); row.appendChild(barEl(s.pct, s.section === 'نساء' ? 'w' : 'm')); row.appendChild(c); el.appendChild(row);
    });
  });


  // ===== التقدم عبر الأيام (من ورقة السجل) =====
  function dayKey(d) { return new Date(d.getTime() + 3 * 3600e3).toISOString().slice(0, 10); } // توقيت الرياض
  function trendDays() {
    var h = (dash.meta && dash.meta.history) || [], m = {};
    h.forEach(function (r) { var d = new Date(r.t); if (isNaN(d)) return; m[dayKey(d)] = { t: d, v: Number(r.received) || 0 }; });
    var r = tot(); if (r && h.length) m[dayKey(new Date())] = { t: new Date(), v: r.received };
    return Object.keys(m).sort().map(function (k) { return { k: k, t: m[k].t, v: m[k].v }; });
  }
  var AR_MON = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  function dLabel(k) { var p = k.split('-'); return Number(p[2]) + ' ' + AR_MON[Number(p[1]) - 1]; }
  function stat(lbl, val) { var d = document.createElement('div'); var s = document.createElement('small'); s.textContent = lbl; var b = document.createElement('b'); b.textContent = val; d.appendChild(s); d.appendChild(b); return d; }

  dash.draw('trend_stats', function (el) {
    var sec = document.getElementById('trend'); var days = trendDays(); var r = tot(); el.replaceChildren();
    if (sec) sec.hidden = !days.length || !r;
    if (!days.length || !r) return;
    var last = days[days.length - 1], now = last.t.getTime();
    var wk = days.filter(function (d) { return now - d.t.getTime() <= 7 * 864e5; })[0] || days[0];
    var gain7 = Math.max(0, last.v - wk.v);
    el.appendChild(stat('وصل آخر 7 أيام', days.length > 1 ? RH.fmt(gain7) + ' ريال' : '—'));
    var first = days.filter(function (d) { return now - d.t.getTime() <= 14 * 864e5; })[0] || days[0];
    var span = (now - first.t.getTime()) / 864e5, rate = span >= 1 ? (last.v - first.v) / span : 0;
    el.appendChild(stat('معدل يومي', rate > 0 ? RH.fmt(Math.round(rate)) + ' ريال' : '—'));
    var proj = '—';
    if (r.remaining <= 0) proj = 'اكتملت ❤️';
    else if (rate > 0) { var dd = Math.ceil(r.remaining / rate); proj = dd > 730 ? 'أكثر من سنتين بهالمعدل' : dLabel(dayKey(new Date(now + dd * 864e5))) + ' ' + new Date(now + dd * 864e5).getFullYear() + ' (بعد ' + dd + ' يوم)'; }
    el.appendChild(stat('موعد الإكمال المتوقع', proj));
  });

  dash.draw('trend', function (el) {
    var days = trendDays(); el.replaceChildren();
    dash.draw('trend_stats');
    if (days.length < 2) {
      var p = document.createElement('p'); p.className = 'rh-tr-note';
      p.textContent = days.length ? 'بدأ تسجيل التقدم يوم ' + dLabel(days[0].k) + '، والرسم يظهر من بكرة بعد ما يتجمع يومين.' : '';
      el.appendChild(p); return;
    }
    var W = 640, H = 200, L = 60, R = 12, T = 14, B = 26, NS = 'http://www.w3.org/2000/svg';
    var max = Math.max.apply(null, days.map(function (d) { return d.v; })), min = Math.min.apply(null, days.map(function (d) { return d.v; }));
    var lo = Math.max(0, min - (max - min) * 0.15), hi = max + (max - min) * 0.1 || max + 1000; if (hi === lo) hi = lo + 1000;
    var t0 = days[0].t.getTime(), t1 = days[days.length - 1].t.getTime(), ts = t1 - t0 || 1;
    function X(d) { return L + (d.t.getTime() - t0) / ts * (W - L - R); }
    function Y(v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); }
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'الواصل عبر الأيام من ' + RH.fmt(days[0].v) + ' إلى ' + RH.fmt(days[days.length - 1].v) + ' ريال');
    function n(tag, a) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; }
    [lo, (lo + hi) / 2, hi].forEach(function (v) { n('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: 'ax' }); var t = n('text', { x: L - 8, y: Y(v) + 4, 'text-anchor': 'end' }); t.textContent = RH.fmt(Math.round(v / 100) * 100); });
    var pts = days.map(function (d) { return X(d).toFixed(1) + ',' + Y(d.v).toFixed(1); });
    n('path', { d: 'M' + pts.join('L') + 'L' + X(days[days.length - 1]) + ',' + (H - B) + 'L' + X(days[0]) + ',' + (H - B) + 'Z', class: 'ar' });
    n('path', { d: 'M' + pts.join('L'), class: 'ln' });
    var step = Math.max(1, Math.ceil(days.length / 6));
    days.forEach(function (d, i) {
      var c = n('circle', { cx: X(d), cy: Y(d.v), r: days.length > 30 ? 2 : 3.5, class: 'dt' });
      var tt = document.createElementNS(NS, 'title'); tt.textContent = dLabel(d.k) + ': ' + RH.fmt(d.v) + ' ريال'; c.appendChild(tt);
      if (i % step === 0 || i === days.length - 1) { var t = n('text', { x: X(d), y: H - 6, 'text-anchor': i === 0 ? 'start' : (i === days.length - 1 ? 'end' : 'middle') }); t.textContent = dLabel(d.k); }
    });
    el.appendChild(svg);
  });

  dash.draw('zero_list', function (el) {
    var d = dash.data('halaqa'); el.replaceChildren();
    if (d.status !== 'ok' || !d.data) { el.textContent = '—'; return; }
    var z = d.data.filter(function (h) { return h.received <= 0; });
    if (!z.length) { var e = document.createElement('div'); e.className = 'rh-empty'; e.textContent = 'كل الحلقات وصلها شي، ما شاء الله.'; el.appendChild(e); return; }
    z.forEach(function (h) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'rh-chip' + (h.section === 'نساء' ? ' w' : ''); b.textContent = h.name;
      b.addEventListener('click', function () { window.rhOpen(h.id); });
      el.appendChild(b);
    });
  });

  function copyText(txt) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt);
    return new Promise(function (ok, no) {
      var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.fontSize = '16px'; document.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, txt.length);
      var done = false; try { done = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); done ? ok() : no();
    });
  }
  function placeUrl(place) { var base = location.href.split('#')[0].split('?')[0].replace(/[^\/]*$/, ''); return base + 'kafala.html?place=' + encodeURIComponent(place); }
  RH.placeUrl = placeUrl;
  function placeMsg(place) {
    var d = dash.data('halaqa'); var list = (d.data || []).filter(function (h) { return h.place === place; });
    list.sort(function (a, b) { return (a.pct >= 100) - (b.pct >= 100) || b.pct - a.pct || a.name.localeCompare(b.name, 'ar'); });
    var women = list.length && list[0].section === 'نساء';
    var open = list.filter(function (h) { return h.pct < 100; }), done = list.filter(function (h) { return h.pct >= 100; });
    var out = ['روابط كفالة حلقات ' + place + ' — جمعية رتّل لتحفيظ القرآن الكريم بنجران', ''];
    open.forEach(function (h, i) {
      out.push((i + 1) + '. حلقة ' + h.name + ' (' + h.students + (women ? ' طالبة' : ' طالب') + ')');
      out.push('وصلت ' + h.pct + '٪ · المتبقي ' + RH.fmt(h.remaining) + ' ريال');
      out.push(storeOf(h)); out.push('');
    });
    if (done.length) { out.push('اكتملت كفالتها ✓: ' + done.map(function (h) { return h.name; }).join('، ')); out.push(''); }
    out.push('صفحة حلقات ' + place + ' كاملة: ' + placeUrl(place));
    out.push('قيمة السهم 50 ريال أو بأي مبلغ.');
    return out.join('\n').trim();
  }

  dash.draw('places', function (el) {
    var d = dash.data('byplace'); el.replaceChildren();
    if (d.status !== 'ok' || !d.data) { el.textContent = d.status === 'error' ? 'تعذّر التحميل' : '—'; return; }
    d.data.forEach(function (s) {
      var box = document.createElement('div'); box.className = 'rh-pbox' + (s.section === 'نساء' ? ' w' : '') + (s.pct >= 100 ? ' done' : '');
      var row = document.createElement('div'); row.className = 'rh-place';
      var n = document.createElement('b'); n.textContent = s.place + ' (' + s.count + ')';
      var p = document.createElement('span'); p.appendChild(span(String(s.pct))); p.appendChild(span('٪'));
      if (s.pct >= 100) n.textContent += ' · اكتملت ✓';
      row.appendChild(n); row.appendChild(barEl(s.pct, s.section === 'نساء' ? 'w' : 'm')); row.appendChild(p);
      var acts = document.createElement('div'); acts.className = 'rh-pacts';
      var cp = document.createElement('button'); cp.type = 'button'; cp.className = 'rh-btn rh-mini'; cp.textContent = 'نسخ روابط الحلقات';
      cp.addEventListener('click', function () {
        copyText(placeMsg(s.place)).then(function () { cp.textContent = 'تم النسخ ✓'; }, function () { cp.textContent = 'ما انسخ، جرّب واتساب'; });
        setTimeout(function () { cp.textContent = 'نسخ روابط الحلقات'; }, 2500);
      });
      var wa = document.createElement('a'); wa.className = 'rh-btn rh-mini p'; wa.target = '_blank'; wa.rel = 'noopener'; wa.textContent = 'واتساب';
      wa.href = 'https://wa.me/?text=' + encodeURIComponent(placeMsg(s.place));
      var pl = document.createElement('button'); pl.type = 'button'; pl.className = 'rh-btn rh-mini'; pl.textContent = 'رابط صفحة المجمع';
      pl.addEventListener('click', function () {
        copyText(placeUrl(s.place)).then(function () { pl.textContent = 'تم نسخ الرابط ✓'; }, function () { window.open(placeUrl(s.place), '_blank'); });
        setTimeout(function () { pl.textContent = 'رابط صفحة المجمع'; }, 2500);
      });
      acts.appendChild(cp); acts.appendChild(pl); acts.appendChild(wa);
      box.appendChild(row); box.appendChild(acts); el.appendChild(box);
    });
  });

  dash.draw('shot', {
    mount: function (el) {
      el.replaceChildren();
      var img = document.createElement('img'); img.alt = 'صورة تقدم كفالة الحلقات';
      var a = document.createElement('a'); a.className = 'rh-btn p'; a.textContent = 'تنزيل الصورة'; a.download = 'taqaddum-kafalat-alhalaqat.png';
      var box = document.createElement('div'); box.className = 'rh-acts'; box.appendChild(a);
      el.appendChild(img); el.appendChild(box);
      return { img: img, a: a, logo: new Image(), tile: new Image() };
    },
    update: function (el, made) {
      var r = tot(); var s = dash.data('bysection');
      var lu = brand('logo'); if (lu && made.logo.src !== lu) made.logo.src = lu;
      var tu = brand('pattern'); if (tu && made.tile.src !== tu) made.tile.src = tu;
      if (!r) { made.img.removeAttribute('src'); return; }
      var dark = RH.shotDark, name = (RH.shotName || '').trim().slice(0, 40);
      var C = dark ? { bg: '#1C140B', head: '#FBF8F2', fg: '#F3EADB', muted: '#B9AC98', track: '#3B2814', men: '#DDB76C', women: '#D98C82', big: '#DDB76C', pat: 0.07 }
                   : { bg: '#F3EADB', head: '#3B2814', fg: '#2B2925', muted: '#8C8173', track: '#E7D6BC', men: '#6E4A1F', women: '#7A2E2A', big: '#6E4A1F', pat: 0.10 };
      var draw = function () {
        var W = 1080, H = 1920;
        var c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d');
        var F = function (fam, w, px) { return w + ' ' + px + 'px ' + fam + ', system-ui, sans-serif'; };
        var SANS = '"thmanyah sans", "Thmanyah Sans", TS', SERIF = '"thmanyah serif display", "Thmanyah Serif Display", TD';
        g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
        if (made.tile.complete && made.tile.naturalWidth) { g.save(); g.globalAlpha = C.pat; g.fillStyle = g.createPattern(made.tile, 'repeat'); g.fillRect(0, 0, W, H); g.restore(); }
        var gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#8A5E2C'); gr.addColorStop(0.55, '#C49958'); gr.addColorStop(1, '#F0D08A');
        g.fillStyle = gr; g.fillRect(0, 0, W, 22); g.fillRect(0, H - 22, W, 22);
        if (made.logo.complete && made.logo.naturalWidth) { g.save(); if (dark) g.filter = 'brightness(0) invert(1)'; g.drawImage(made.logo, W / 2 - 160, 150, 320, 265); g.restore(); }
        g.direction = 'rtl'; g.textAlign = 'center';
        g.fillStyle = C.head; g.font = F(SERIF, '700', 92); g.fillText('كفالة حلقات رتّل', W / 2, 560);
        g.fillStyle = C.muted; g.font = F(SANS, '400', 40); g.fillText('الفصل الدراسي الأول ١٤٤٨هـ', W / 2, 630);
        g.fillStyle = C.big; g.font = F(SERIF, '700', 280); g.fillText(r.pct + '٪', W / 2, 960);
        var bw = 860, bx = (W - bw) / 2, fill = Math.max(40, bw * Math.min(1, r.pct / 100));
        g.fillStyle = C.track; g.beginPath(); g.roundRect(bx, 1020, bw, 40, 20); g.fill();
        g.fillStyle = gr; g.beginPath(); g.roundRect(bx + bw - fill, 1020, fill, 40, 20); g.fill();
        g.fillStyle = C.fg; g.font = F(SANS, '500', 46); g.fillText('وصل ' + RH.fmt(r.received) + ' من ' + RH.fmt(r.total) + ' ريال', W / 2, 1160);
        g.fillText('اكتملت كفالة ' + r.done + ' حلقة من ' + r.count, W / 2, 1235);
        (s.status === 'ok' && s.data ? s.data : []).forEach(function (sec, i) {
          var y = 1380 + i * 140; var col = sec.section === 'نساء' ? C.women : C.men;
          g.textAlign = 'right'; g.fillStyle = C.head; g.font = F(SANS, '700', 44); g.fillText('حلقات ' + (sec.section === 'نساء' ? 'النساء' : 'الرجال'), bx + bw, y);
          g.textAlign = 'left'; g.fillStyle = col; g.fillText(sec.pct + '٪', bx, y);
          g.fillStyle = C.track; g.beginPath(); g.roundRect(bx, y + 28, bw, 26, 13); g.fill();
          var w = Math.max(26, bw * Math.min(1, sec.pct / 100)); g.fillStyle = col; g.beginPath(); g.roundRect(bx + bw - w, y + 28, w, 26, 13); g.fill();
        });
        g.textAlign = 'center';
        if (name) { g.fillStyle = C.fg; g.font = F(SANS, '500', 44); g.fillText('دعوة من: ' + name, W / 2, 1720); }
        g.fillStyle = C.big; g.font = F(SANS, '700', 44); g.fillText('ساهم معنا: store.qurannajran.org.sa', W / 2, 1810);
        var url = c.toDataURL('image/png'); made.img.src = url; made.a.href = url;
      };
      var pending = [made.logo, made.tile].filter(function (im) { return im.src && !im.complete; });
      pending.forEach(function (im) { im.onload = draw; });
      var fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 40px TD'), document.fonts.load('500 40px TS')]) : Promise.resolve();
      fontsReady.then(draw, draw);
    }
  });

  dash.draw('place_opts', function (sel) {
    var d = dash.data('byplace');
    var list = d.status === 'ok' && d.data ? d.data.map(function (s) { return s.place; }).sort(function (a, b) { return a.localeCompare(b, 'ar'); }) : [];
    sel.replaceChildren(new Option('كل المجمعات والدور', ''));
    list.forEach(function (p) { sel.appendChild(new Option(p, p)); });
    sel.value = RH.place || '';
  });

  // شرائح النسبة: 0 = ما وصلها شي، 25 = 1–49، 50 = 50–74، 75 = 75–99، 100 = مكتملة
  function bandOf(p) { return p <= 0 ? 0 : p < 50 ? 25 : p < 75 ? 50 : p < 100 ? 75 : 100; }
  RH.bandOf = bandOf;
  dash.draw('bands', function (el) {
    var d = dash.data('halaqa'); var all = d.status === 'ok' && d.data ? d.data : [];
    var cnt = { 0: 0, 25: 0, 50: 0, 75: 0, 100: 0 };
    all.forEach(function (h) { cnt[bandOf(h.pct)]++; });
    el.querySelectorAll('button[data-band]').forEach(function (b) {
      var k = Number(b.getAttribute('data-band')); var n = b.querySelector('i'); if (n) n.textContent = String(cnt[k]);
      b.setAttribute('aria-pressed', (RH.bands || []).indexOf(k) !== -1 ? 'true' : 'false');
    });
  });
  function filtered() {
    var d = dash.data('halaqa');
    if (d.status !== 'ok' || !d.data) return null;
    var q = RH.q.trim();
    var rows = d.data.filter(function (h) {
      if (RH.sec && h.section !== RH.sec) return false;
      if (RH.place && h.place !== RH.place) return false;
      if (RH.bands && RH.bands.length && RH.bands.indexOf(bandOf(h.pct)) === -1) return false;
      if (q && (h.name + ' ' + h.place).indexOf(q) === -1) return false;
      return true;
    });
    var s = RH.sort;
    rows.sort(function (a, b) {
      if (s === 'name') return a.name.localeCompare(b.name, 'ar');
      if (s === 'students') return b.students - a.students;
      var ad = a.pct >= 100 ? 1 : 0, bd = b.pct >= 100 ? 1 : 0;
      if (s === 'near') return ad - bd || b.pct - a.pct || a.remaining - b.remaining || a.name.localeCompare(b.name, 'ar');
      return a.pct - b.pct || a.name.localeCompare(b.name, 'ar');
    });
    return rows;
  }

  function stampEl() {
    var NS = 'http://www.w3.org/2000/svg';
    var mk = function (tag, attrs) { var e = document.createElementNS(NS, tag); Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); }); return e; };
    var svg = mk('svg', { viewBox: '0 0 200 200', 'class': 'rh-stamp', role: 'img', 'aria-label': 'اكتملت فرصة التبرع' });
    svg.appendChild(mk('circle', { cx: 100, cy: 100, r: 96, fill: '#1B7F5B' }));
    svg.appendChild(mk('circle', { cx: 100, cy: 100, r: 91, fill: 'none', stroke: '#DDB76C', 'stroke-width': '1.4' }));
    svg.appendChild(mk('circle', { cx: 100, cy: 100, r: 70, fill: 'none', stroke: '#FFFFFF', 'stroke-width': '1.6', 'stroke-dasharray': '3 4', 'stroke-opacity': '.85' }));
    svg.appendChild(mk('circle', { cx: 100, cy: 100, r: 63, fill: 'none', stroke: '#FFFFFF', 'stroke-width': '1', 'stroke-opacity': '.4' }));
    var lu = brand('symbol');
    if (lu) {
      var lg = mk('g', {});
      for (var i = 0; i < 8; i++) {
        var ang = (i * 45 - 90) * Math.PI / 180, cx = 100 + 81.5 * Math.cos(ang), cy = 100 + 81.5 * Math.sin(ang);
        var im = mk('image', { x: (cx - 8).toFixed(1), y: (cy - 8).toFixed(1), width: 16, height: 16, preserveAspectRatio: 'xMidYMid meet' });
        im.setAttribute('href', lu); lg.appendChild(im);
      }
      svg.appendChild(lg);
    }
    svg.appendChild(mk('circle', { cx: 100, cy: 54, r: 11, fill: '#DDB76C' }));
    svg.appendChild(mk('path', { d: 'M94.5 54.5 l4 4 l7.5 -8', fill: 'none', stroke: '#1B7F5B', 'stroke-width': '2.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    var FAM = '"thmanyah serif display", "Thmanyah Serif Display", TD, sans-serif';
    var t1 = mk('text', { x: 100, y: 108, 'text-anchor': 'middle', fill: '#FFFFFF', 'font-size': '32', 'font-weight': '700', 'font-family': FAM }); t1.textContent = 'اكتملت';
    var t2 = mk('text', { x: 100, y: 140, 'text-anchor': 'middle', fill: '#FFFFFF', 'font-size': '23', 'font-weight': '700', 'font-family': FAM }); t2.textContent = 'فرصة التبرع';
    svg.appendChild(t1); svg.appendChild(t2);
    return svg;
  }

  dash.draw('count', function (el) { var rows = filtered(); el.textContent = rows ? ('يظهر ' + rows.length + ' حلقة') : '—'; });

  dash.draw('cards', function (el) {
    var d = dash.data('halaqa'); el.replaceChildren();
    if (d.status !== 'ok' || !d.data) { var m0 = document.createElement('div'); m0.className = 'rh-empty'; m0.textContent = d.status === 'error' ? 'تعذّر تحميل الحلقات' : 'جاري التحميل…'; el.appendChild(m0); return; }
    var rows = filtered();
    if (!rows.length) { var e = document.createElement('div'); e.className = 'rh-empty'; e.textContent = 'ما فيه حلقات تطابق البحث'; el.appendChild(e); return; }
    rows.forEach(function (h) {
      var c = document.createElement('article'); c.className = 'rh-h' + (h.section === 'نساء' ? ' w' : '') + (h.pct >= 100 ? ' done' : ''); c.id = 'h-' + h.id;
      var top = document.createElement('div'); top.className = 'rh-h-top';
      var t = document.createElement('div');
      var nm = document.createElement('div'); nm.className = 'rh-h-name'; nm.textContent = h.name;
      var pl = document.createElement('div'); pl.className = 'rh-h-place';
      pl.textContent = h.place + ' · ' + h.students + (h.section === 'نساء' ? ' طالبة' : ' طالب');
      t.appendChild(nm); t.appendChild(pl);
      var badge = document.createElement('span');
      badge.className = 'rh-badge' + (h.pct >= 100 ? ' done' : h.pct >= 75 ? ' near' : '');
      badge.textContent = h.pct >= 100 ? 'اكتملت ✓' : h.pct >= 75 ? 'قربت تكتمل' : h.section;
      top.appendChild(t); top.appendChild(badge);
      var pr = document.createElement('div'); pr.className = 'rh-h-nums';
      var pv = document.createElement('div'); pv.className = 'rh-h-pct'; pv.textContent = h.pct + '٪';
      var sl = document.createElement('div'); sl.textContent = h.remaining > 0 ? ('باقي ' + h.shares_left + ' سهم') : 'مكتملة';
      pr.appendChild(pv); pr.appendChild(sl);
      var nums = document.createElement('div'); nums.className = 'rh-h-nums';
      var r1 = document.createElement('span'); r1.appendChild(span('الواصل ')); var rb = document.createElement('b'); rb.textContent = RH.fmt(h.received); r1.appendChild(rb);
      var r2 = document.createElement('span'); r2.appendChild(span('المتبقي ')); var mb = document.createElement('b'); mb.textContent = RH.fmt(h.remaining); r2.appendChild(mb);
      nums.appendChild(r1); nums.appendChild(r2);
      var acts = document.createElement('div'); acts.className = 'rh-acts';
      if (h.remaining > 0) acts.appendChild(link('اكفل الآن', storeOf(h), 'p'));
      var det = document.createElement('button'); det.type = 'button'; det.className = 'rh-btn'; det.textContent = 'صفحة الحلقة';
      det.addEventListener('click', function () { window.rhOpen(h.id); });
      acts.appendChild(det);
      c.appendChild(top); c.appendChild(pr); c.appendChild(barEl(h.pct, h.section === 'نساء' ? 'w' : 'm')); c.appendChild(nums); c.appendChild(acts);
      if (h.pct >= 100) c.appendChild(stampEl());
      el.appendChild(c);
    });
  });

  function current() {
    var d = dash.data('halaqa');
    if (d.status !== 'ok' || !d.data || RH.open == null) return null;
    return d.data.find(function (h) { return h.id === RH.open; }) || null;
  }
  function shareMsg(h) {
    return 'ساهم معنا في كفالة حلقة «' + h.name + '» ب' + h.place + ' — جمعية رتّل لتحفيظ القرآن الكريم بنجران.\n'
      + 'في الحلقة ' + h.students + (h.section === 'نساء' ? ' طالبة' : ' طالب') + '، وتكلفة كفالتها للفصل الدراسي الأول ' + RH.fmt(h.cost) + ' ريال.\n'
      + (h.remaining > 0 ? 'باقي ' + RH.fmt(h.remaining) + ' ريال لاكتمالها، وقيمة السهم 50 ريال أو بأي مبلغ.\n' : 'اكتملت كفالتها، جزى الله المتبرعين خيرًا.\n')
      + 'للتبرع: ' + storeOf(h) + '\nتبرع بأمان: ' + RH.TABARRU;
  }

  dash.draw('detail', function (el) {
    var h = current(); el.replaceChildren();
    if (!h) { el.textContent = '—'; return; }
    var w = 'id=' + RH.enc(h.id);
    var nm = document.createElement('h2'); nm.className = 'rh-h2 rh-big'; nm.textContent = 'حلقة ' + h.name;
    var pl = document.createElement('div'); pl.className = 'rh-h-place'; pl.textContent = h.place + ' · ' + (h.section === 'نساء' ? 'حلقات النساء' : 'حلقات الرجال');
    var g = document.createElement('div'); g.className = 'rh-d-grid';
    [['نسبة الإكمال', 'pct', String(h.pct), '٪'], ['الواصل', 'received', RH.fmt(h.received), 'ريال'], ['المتبقي', 'remaining', RH.fmt(h.remaining), 'ريال'], ['الأسهم المتبقية', 'shares_left', String(h.shares_left), 'سهم × 50 ريال'], [h.section === 'نساء' ? 'عدد الطالبات' : 'عدد الطلاب', 'students', String(h.students), '']].forEach(function (k) {
      var c = document.createElement('div'); c.className = 'rh-card';
      var l = document.createElement('div'); l.className = 'rh-k-l'; l.textContent = k[0];
      var v = document.createElement('div'); v.className = 'rh-k-v'; v.textContent = k[2]; mark(v, 'halaqa', k[1], w);
      var s = document.createElement('div'); s.className = 'rh-k-s'; s.textContent = k[3];
      c.appendChild(l); c.appendChild(v); c.appendChild(s); g.appendChild(c);
    });
    var acts = document.createElement('div'); acts.className = 'rh-acts'; acts.style.marginTop = '12px';
    if (h.remaining > 0) acts.appendChild(link((h.pct > 0 ? 'أكمل الحلقة' : 'اكفل الحلقة') + ' — باقي ' + RH.fmt(h.remaining) + ' ريال', storeOf(h), 'p'));
    acts.appendChild(link('تبرع بأمان', RH.TABARRU));
    el.appendChild(nm); el.appendChild(pl); el.appendChild(g); el.appendChild(barEl(h.pct, h.section === 'نساء' ? 'w' : 'm')); el.appendChild(acts);
  });

  var lastData = null, lastAt = null;
  dash.draw('updated', function (el) {
    var u = dash.meta && dash.meta.updated ? new Date(dash.meta.updated) : null;
    var t = u ? u.toLocaleString('ar-SA-u-nu-latn-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' }) : '—';
    var m = dash.meta || {};
    el.textContent = t + (m.live ? ' · مباشر من الجدول' : m.liveError ? ' · نسخة محفوظة (تعذّر الاتصال بالجدول)' : ' · جاري جلب آخر الأرقام…');
  });

  function qrCanvas(text, px, fg, bg) {
    var m = window.RHQR ? window.RHQR.matrix(text) : null; if (!m) return null;
    var n = m.length, q = 4, s = Math.floor(px / (n + q * 2)), size = s * (n + q * 2);
    var c = document.createElement('canvas'); c.width = size; c.height = size; var g = c.getContext('2d');
    g.fillStyle = bg || '#FFFFFF'; g.fillRect(0, 0, size, size); g.fillStyle = fg || '#3B2814';
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (m[y][x]) g.fillRect((x + q) * s, (y + q) * s, s, s);
    return c;
  }

  dash.draw('h_qr', function (el) {
    var h = current(); el.replaceChildren();
    if (!h) { el.textContent = '—'; return; }
    var url = storeOf(h), c = qrCanvas(url, 600, '#3B2814', '#FFFFFF');
    if (!c) { el.textContent = 'الرابط طويل مرة على رمز QR'; return; }
    var img = document.createElement('img'); img.src = c.toDataURL('image/png'); img.alt = 'رمز QR لصفحة الحلقة في المتجر'; img.className = 'rh-qr';
    var note = document.createElement('p'); note.className = 'rh-note'; note.style.margin = '8px 0';
    note.textContent = linkOf(h) ? 'يودّي لصفحة الحلقة في المتجر' : 'يودّي لمتجر الجمعية العام (ما أُضيف رابط الحلقة في الجدول بعد)';
    var a = document.createElement('a'); a.className = 'rh-btn p'; a.textContent = 'تنزيل رمز QR'; a.href = img.src; a.download = 'qr-' + h.name + '.png';
    el.appendChild(img); el.appendChild(note); el.appendChild(a);
  });

  dash.draw('h_shot', {
    mount: function (el) {
      el.replaceChildren();
      var img = document.createElement('img'); img.alt = 'صورة ستوري للحلقة'; img.className = 'rh-hshot';
      var a = document.createElement('a'); a.className = 'rh-btn p'; a.textContent = 'تنزيل صورة الحلقة';
      var box = document.createElement('div'); box.className = 'rh-acts'; box.style.marginTop = '8px'; box.appendChild(a);
      el.appendChild(img); el.appendChild(box);
      return { img: img, a: a, logo: new Image(), tile: new Image() };
    },
    update: function (el, made) {
      var h = current();
      var lu = brand('logo'); if (lu && made.logo.src !== lu) made.logo.src = lu;
      var tu = brand('pattern'); if (tu && made.tile.src !== tu) made.tile.src = tu;
      if (!h) { made.img.removeAttribute('src'); return; }
      var dark = RH.hDark, women = h.section === 'نساء', done = h.pct >= 100;
      var C = dark ? { bg: '#1C140B', head: '#FBF8F2', fg: '#F3EADB', muted: '#B9AC98', track: '#3B2814', acc: women ? '#D98C82' : '#DDB76C', pat: 0.07 }
                   : { bg: '#F3EADB', head: '#3B2814', fg: '#2B2925', muted: '#8C8173', track: '#E7D6BC', acc: women ? '#7A2E2A' : '#6E4A1F', pat: 0.10 };
      var draw = function () {
        var W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d');
        var SANS = '"thmanyah sans", "Thmanyah Sans", TS, system-ui, sans-serif', SERIF = '"thmanyah serif display", "Thmanyah Serif Display", TD, system-ui, sans-serif';
        var F = function (fam, w, px) { return w + ' ' + px + 'px ' + fam; };
        g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
        if (made.tile.complete && made.tile.naturalWidth) { g.save(); g.globalAlpha = C.pat; g.fillStyle = g.createPattern(made.tile, 'repeat'); g.fillRect(0, 0, W, H); g.restore(); }
        var gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#8A5E2C'); gr.addColorStop(0.55, '#C49958'); gr.addColorStop(1, '#F0D08A');
        g.fillStyle = gr; g.fillRect(0, 0, W, 22); g.fillRect(0, H - 22, W, 22);
        if (made.logo.complete && made.logo.naturalWidth) { g.save(); if (dark) g.filter = 'brightness(0) invert(1)'; g.drawImage(made.logo, W / 2 - 120, 110, 240, 199); g.restore(); }
        g.direction = 'rtl'; g.textAlign = 'center';
        g.fillStyle = C.muted; g.font = F(SANS, '500', 48); g.fillText('ساهم معنا في كفالة حلقة', W / 2, 410);
        var size = 128; g.font = F(SERIF, '700', size); while (g.measureText(h.name).width > 940 && size > 70) { size -= 6; g.font = F(SERIF, '700', size); }
        g.fillStyle = C.acc; g.fillText(h.name, W / 2, 560);
        g.fillStyle = C.fg; g.font = F(SANS, '500', 44); g.fillText(h.place + ' · ' + h.students + (women ? ' طالبة' : ' طالب'), W / 2, 640);
        g.fillStyle = C.head; g.font = F(SERIF, '700', 220); g.fillText(h.pct + '٪', W / 2, 890);
        var bw = 820, bx = (W - bw) / 2, fill = Math.max(36, bw * Math.min(1, h.pct / 100));
        g.fillStyle = C.track; g.beginPath(); g.roundRect(bx, 940, bw, 36, 18); g.fill();
        g.fillStyle = done ? '#1B7F5B' : gr; g.beginPath(); g.roundRect(bx + bw - fill, 940, fill, 36, 18); g.fill();
        g.fillStyle = C.fg; g.font = F(SANS, '500', 46);
        if (done) {
          g.fillText('وصل ' + RH.fmt(h.received) + ' ريال، جزاكم الله خيرًا', W / 2, 1070);
          g.save(); g.translate(W / 2, 1360); g.rotate(-0.2);
          g.fillStyle = '#1B7F5B'; g.beginPath(); g.arc(0, 0, 200, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#DDB76C'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 188, 0, Math.PI * 2); g.stroke();
          g.setLineDash([10, 12]); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 150, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
          g.fillStyle = '#FFFFFF'; g.font = F(SERIF, '700', 70); g.fillText('اكتملت', 0, -5); g.font = F(SERIF, '700', 50); g.fillText('فرصة التبرع', 0, 70);
          g.restore();
        } else {
          g.fillText('المتبقي ' + RH.fmt(h.remaining) + ' ريال · باقي ' + h.shares_left + ' سهم', W / 2, 1070);
          g.fillStyle = C.muted; g.font = F(SANS, '400', 38); g.fillText('قيمة السهم 50 ريال أو بأي مبلغ', W / 2, 1130);
          var qc = qrCanvas(storeOf(h), 420, '#3B2814', '#FFFFFF');
          if (qc) { g.fillStyle = '#FFFFFF'; g.beginPath(); g.roundRect(W / 2 - 230, 1200, 460, 460, 36); g.fill(); g.drawImage(qc, W / 2 - 210, 1220, 420, 420); }
          g.fillStyle = C.head; g.font = F(SANS, '700', 44); g.fillText('امسح الرمز وتبرّع', W / 2, 1730);
        }
        g.fillStyle = C.acc; g.font = F(SANS, '700', 40); g.fillText('جمعية رتّل لتحفيظ القرآن الكريم بنجران', W / 2, 1830);
        var url = c.toDataURL('image/png'); made.img.src = url; made.a.href = url; made.a.download = 'halaqa-' + h.name + '.png';
      };
      [made.logo, made.tile].forEach(function (im) { if (im.src && !im.complete) im.onload = draw; });
      var fr = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 40px TD'), document.fonts.load('500 40px TS')]) : Promise.resolve();
      fr.then(draw, draw);
    }
  });

  dash.draw('calc_out', function (el) {
    var inp = document.getElementById('rh-shares');
    var n = Math.max(1, Math.floor(Number(inp && inp.value) || 1));
    el.textContent = RH.fmt(n * RH.SHARE) + ' ريال';
  });

  dash.draw('share_text', function (el) { var h = current(); el.textContent = h ? shareMsg(h) : '—'; });

  dash.draw('share_btns', function (el) {
    var h = current(); el.replaceChildren();
    if (!h) return;
    el.appendChild(link('إرسال عبر واتساب', 'https://wa.me/?text=' + encodeURIComponent(shareMsg(h)), 'p'));
    var cp = document.createElement('button'); cp.type = 'button'; cp.className = 'rh-btn'; cp.textContent = 'نسخ النص';
    cp.addEventListener('click', function () {
      try { navigator.clipboard.writeText(shareMsg(h)).then(function () { cp.textContent = 'تم النسخ ✓'; }, function () { cp.textContent = 'انسخ النص يدويًا'; }); }
      catch (e) { cp.textContent = 'انسخ النص يدويًا'; }
    });
    el.appendChild(cp);
  });
})();

(function () {
  var RH = window.RH;
  function redrawList() { dash.draw('cards'); dash.draw('count'); }
  window.rhOpen = function (id) {
    RH.open = String(id);
    var det = document.getElementById('detail'); var list = document.getElementById('list');
    if (det) det.hidden = false; if (list) list.hidden = true;
    dash.setLink('h-' + RH.open);
    ['detail', 'share_text', 'share_btns', 'calc_out', 'h_qr', 'h_shot'].forEach(function (n) { dash.draw(n); });
    if (det && det.scrollIntoView) det.scrollIntoView({ block: 'start' });
  };
  window.rhClose = function () {
    var det = document.getElementById('detail'); var list = document.getElementById('list');
    if (det) det.hidden = true; if (list) list.hidden = false;
    RH.open = null; dash.setLink('list');
    redrawList();
  };
  // الوضع الداكن هو الأساسي، والموقع يتذكر اختيار المستخدم
  var dark = true;
  try { var sv = localStorage.getItem('rh-dark'); if (sv) dark = sv === '1'; } catch (e) {}
  function applyTheme() {
    document.querySelectorAll('#rh-root').forEach(function (r) { r.classList.toggle('dark', dark); });
    document.querySelectorAll('#rh-sun').forEach(function (s) { s.hidden = dark; });
    document.querySelectorAll('#rh-moon').forEach(function (s) { s.hidden = !dark; });
    document.querySelectorAll('#rh-mode').forEach(function (b) { b.setAttribute('aria-label', dark ? 'المظهر الداكن مفعّل، اضغط للفاتح' : 'المظهر الفاتح مفعّل، اضغط للداكن'); });
    document.body.classList.toggle('dark', dark);
    document.documentElement.style.background = dark ? '#1C140B' : '#F3EADB';
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#1C140B' : '#F3EADB';
  }
  applyTheme();
  document.querySelectorAll('#rh-mode').forEach(function (b) {
    b.addEventListener('click', function () { dark = !dark; try { localStorage.setItem('rh-dark', dark ? '1' : '0'); } catch (e) {} applyTheme(); });
  });
  document.querySelectorAll('input[name="rh-shot-theme"]').forEach(function (i) { i.addEventListener('change', function () { RH.shotDark = i.value === 'dark' && i.checked; dash.draw('shot'); }); });
  document.querySelectorAll('#rh-shot-name').forEach(function (i) { i.addEventListener('input', function () { RH.shotName = i.value; dash.draw('shot'); }); });
  document.querySelectorAll('#rh-back').forEach(function (b) { b.addEventListener('click', window.rhClose); });
  RH.bands = [];
  document.querySelectorAll('#rh-bands button[data-band]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = Number(b.getAttribute('data-band')); var i = RH.bands.indexOf(k);
      if (i === -1) RH.bands.push(k); else RH.bands.splice(i, 1);
      dash.draw('bands'); redrawList();
    });
  });
  document.querySelectorAll('input[name="rh-hshot-theme"]').forEach(function (i) { i.addEventListener('change', function () { RH.hDark = i.value === 'dark' && i.checked; dash.draw('h_shot'); }); });
  document.querySelectorAll('#rh-q').forEach(function (i) { i.addEventListener('input', function () { RH.q = i.value; redrawList(); }); });
  document.querySelectorAll('#rh-sec').forEach(function (s) { s.addEventListener('change', function () { RH.sec = s.value; redrawList(); }); });
  document.querySelectorAll('#rh-place').forEach(function (s) { s.addEventListener('change', function () { RH.place = s.value; redrawList(); }); });
  document.querySelectorAll('#rh-sort').forEach(function (s) { s.addEventListener('change', function () { RH.sort = s.value; redrawList(); }); });
  document.querySelectorAll('#rh-shares').forEach(function (i) { i.addEventListener('input', function () { dash.draw('calc_out'); }); });
  var saved = null;
  function openShot() {
    var root = document.getElementById('rh-root'); var shot = document.getElementById('shot');
    if (!root || !shot || saved) return;
    saved = [];
    Array.prototype.forEach.call(root.children, function (el) {
      if (el === shot || el.tagName === 'HEADER' || el.classList.contains('rh-pat') || el.tagName === 'SCRIPT') return;
      saved.push([el, el.hidden]); el.hidden = true;
    });
    shot.hidden = false;
    dash.setLink('shot');
    dash.draw('shot');
    if (root.scrollIntoView) root.scrollIntoView({ block: 'start' });
  }
  function closeShot() {
    var shot = document.getElementById('shot');
    if (shot) shot.hidden = true;
    (saved || []).forEach(function (p) { p[0].hidden = p[1]; });
    saved = null;
    dash.setLink(RH.open != null ? 'h-' + RH.open : 'list');
  }
  document.querySelectorAll('#rh-shotbtn').forEach(function (b) { b.addEventListener('click', openShot); });
  document.querySelectorAll('#rh-shotback').forEach(function (b) { b.addEventListener('click', closeShot); });
  var m = /^#h-(\d+)$/.exec(location.hash || '');
  if (m) window.rhOpen(m[1]);
  if (location.hash === '#shot') openShot();
})();
