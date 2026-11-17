// توافق مع المتصفحات القديمة (iOS القديم)
(function () {
  var C = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C && !C.roundRect) C.roundRect = function (x, y, w, h, r) {
    r = Math.max(0, Math.min(typeof r === 'number' ? r : 0, w / 2, h / 2));
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); return this;
  };
  [Element.prototype, DocumentFragment.prototype].forEach(function (P) {
    if (!P.replaceChildren) P.replaceChildren = function () { while (this.firstChild) this.removeChild(this.firstChild); for (var i = 0; i < arguments.length; i++) this.appendChild(typeof arguments[i] === 'string' ? document.createTextNode(arguments[i]) : arguments[i]); };
  });
  if (!Array.prototype.find) Array.prototype.find = function (f) { for (var i = 0; i < this.length; i++) if (f(this[i], i)) return this[i]; };
})();

// تشغيل مستقل للوحة: يقرأ data.json وbrand.json ويرسم كل [data-draw]
window.dash = (function () {
  var calcs = [], draws = {}, made = {}, store = {}, ready = false;
  function data(id) { return store[id] || { status: 'loading', data: null }; }
  function els(name) { return document.querySelectorAll('[data-draw="' + name + '"]'); }
  function run(name) {
    var d = draws[name]; if (!d) return;
    els(name).forEach(function (el, i) {
      try {
        if (typeof d === 'function') d(el);
        else {
          var key = name + '#' + i;
          if (!made[key] || made[key].el !== el) made[key] = { el: el, v: d.mount ? d.mount(el) : null };
          if (d.update) d.update(el, made[key].v);
        }
      } catch (e) { console.error('draw ' + name, e); }
    });
  }
  var api = {
    meta: {},
    loader: function () {},
    calc: function (id, def) { calcs.push([id, def]); },
    data: data,
    draw: function (name, def) {
      if (def !== undefined) { draws[name] = def; if (ready) run(name); return; }
      if (ready) run(name);
    },
    setLink: function (frag) {
      var h = frag && frag !== 'list' ? '#' + frag : ' ';
      try { history.replaceState(null, '', h === ' ' ? location.pathname + location.search : h); } catch (e) {}
    }
  };
  function getJSON(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }); }
  var LIVE = 'https://script.google.com/macros/s/AKfycbyXs0jKcR9Xlt-Wd1OXl8RYFrlqQWsw3w4CeLTSZ6QTRpqnaQs7iCsRObuXrLBfdjtT/exec';
  // الأرقام مباشرة من الجدول، وإذا تعذّر خلال 8 ثوانٍ نرجع للنسخة المحفوظة data.json
  function getLive() {
    return fetch(LIVE + '?t=' + Date.now(), { cache: 'no-store', redirect: 'follow' }).then(function (r) { if (!r.ok) throw new Error('live ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j || !Array.isArray(j.rows) || j.rows.length < 70 || !j.rows.every(function (h) { return h.name && (h.section === 'رجال' || h.section === 'نساء'); })) throw new Error('live data invalid');
        return j;
      });
  }
  function compute(rows) {
    store.halaqat = { status: 'ok', data: rows };
    calcs.forEach(function (c) {
      var args = (c[1].inputs || []).map(function (i) { return data(i).data; });
      try { store[c[0]] = { status: 'ok', data: c[1].fn.apply(null, args) }; }
      catch (e) { store[c[0]] = { status: 'error', data: null }; console.error(c[0], e); }
    });
  }
  function start() {
    var fontsReady = (document.fonts && document.fonts.load)
      ? Promise.race([Promise.all(['400 16px TS', '500 16px TS', '700 16px TS', '400 16px TD', '700 16px TD'].map(function (f) { return document.fonts.load(f, 'ثمانية'); })), new Promise(function (r) { setTimeout(r, 3000); })]).catch(function () {})
      : Promise.resolve();
    Promise.all([getJSON('data.json'), getJSON('brand.json'), fontsReady]).then(function (res) {
      api.meta.updated = res[0].updated; api.meta.live = false;
      store.brand = { status: 'ok', data: res[1] };
      compute(res[0].rows);
      ready = true;
      Object.keys(draws).forEach(run);
      var lastSig = null, busy = false;
      function refresh() {
        if (busy) return; busy = true;
        getLive().then(function (j) {
          busy = false;
          api.meta.live = true; api.meta.liveError = null;
          var sig = JSON.stringify(j.rows);
          api.meta.updated = j.updated;
          if (sig !== lastSig) { lastSig = sig; compute(j.rows); Object.keys(draws).forEach(run); }
          else run('updated');
        }).catch(function (e) { busy = false; if (!api.meta.live) { api.meta.liveError = e.message; run('updated'); } console.warn('live failed:', e.message); });
      }
      refresh();
      // تحديث تلقائي كل دقيقة والصفحة مفتوحة، وفور الرجوع للصفحة
      setInterval(function () { if (document.visibilityState !== 'hidden') refresh(); }, 60000);
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') refresh(); });
    }).catch(function (e) {
      console.error(e);
      ['halaqat', 'halaqa', 'totals', 'bysection', 'byplace', 'zero'].forEach(function (k) { store[k] = { status: 'error', data: null }; });
      ready = true; Object.keys(draws).forEach(run);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
  return api;
})();
