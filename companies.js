// مشترك بين صفحة الشركات وصفحة كل شركة: الهوية، الثيم، البيانات المباشرة، فسيفساء الحلقات
window.CP = (function () {
  var LIVE = 'https://script.google.com/macros/s/AKfycbyXs0jKcR9Xlt-Wd1OXl8RYFrlqQWsw3w4CeLTSZ6QTRpqnaQs7iCsRObuXrLBfdjtT/exec';
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return Math.round(Number(n) || 0).toLocaleString('en-US'); };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function getJSON(u) { return fetch(u + (u.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }

  function theme() {
    var light = false; try { light = localStorage.getItem('k-theme') === 'light'; } catch (e) {}
    function apply() { document.body.classList.toggle('light', light); $('sun').hidden = light; $('moon').hidden = !light; var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = light ? '#F6F1E7' : '#3A2416'; }
    apply();
    $('mode').onclick = function () { light = !light; try { localStorage.setItem('k-theme', light ? 'light' : 'dark'); } catch (e) {} apply(); };
  }
  function brand() {
    getJSON('brand.json').then(function (b) { if (b.logo) [].forEach.call(document.querySelectorAll('[data-logo]'), function (x) { var i = el('img'); i.src = b.logo; i.alt = 'شعار جمعية رتّل'; x.replaceChildren(i); }); }).catch(function () {});
  }
  function shape(r) {
    var cost = Number(r.cost) || 0, rec = Math.min(Number(r.received) || 0, cost);
    return { name: r.name, place: r.place, section: r.section, students: Number(r.students) || 0, cost: cost, rec: rec, rem: cost - rec, pct: cost ? rec / cost * 100 : 0, store: /^https?:\/\//.test(r.store || '') ? r.store : '' };
  }
  // يرسم البيانات من النسخة المحفوظة ثم من الجدول مباشرة، ويعيد كل دقيقة
  function data(cb) {
    var sig = '';
    function use(rows) { var s = JSON.stringify(rows); if (s === sig) return; sig = s; cb(rows.map(shape)); }
    getJSON('data.json').then(function (j) { use(j.rows || []); }).catch(function () {});
    function live() {
      fetch(LIVE + '?t=' + Date.now(), { cache: 'no-store', redirect: 'follow' }).then(function (r) { return r.json(); }).then(function (j) {
        if (j && Array.isArray(j.rows) && j.rows.length >= 70 && j.rows.every(function (h) { return h.name && (h.section === 'رجال' || h.section === 'نساء'); })) use(j.rows);
      }).catch(function () {});
    }
    live(); setInterval(function () { if (document.visibilityState !== 'hidden') live(); }, 60000);
  }
  // فسيفساء: كل حلقة نافذة طينية؛ الذهبي = مكفولة
  function mosaic(box, tip, rows, animate) {
    box.replaceChildren();
    var order = rows.slice().sort(function (a, b) { return a.place.localeCompare(b.place, 'ar') || b.pct - a.pct; });
    function show(h, t) {
      [].forEach.call(box.children, function (c) { c.classList.toggle('on', c === t); });
      tip.replaceChildren(el('b', null, 'حلقة ' + h.name), el('span', null, h.place + ' — ' + (h.pct >= 100 ? 'مكفولة بالكامل' : 'مكفول منها ' + Math.round(h.pct) + '٪، باقي ' + fmt(h.rem) + ' ريال')));
    }
    order.forEach(function (h, i) {
      var t = el('button', 't' + (h.pct >= 100 ? ' done' : h.pct > 0 ? ' part' : ''));
      t.type = 'button'; t.style.setProperty('--i', i); t.style.setProperty('--p', Math.max(h.pct, 12) + '%');
      t.setAttribute('aria-label', 'حلقة ' + h.name + '، ' + h.place);
      t.onmouseenter = t.onfocus = t.onclick = function () { show(h, t); };
      box.appendChild(t);
    });
    if (animate) { box.classList.remove('go'); void box.offsetWidth; box.classList.add('go'); }
  }
  return { $: $, fmt: fmt, el: el, getJSON: getJSON, theme: theme, brand: brand, data: data, mosaic: mosaic };
})();
