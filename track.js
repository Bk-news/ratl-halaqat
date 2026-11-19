// إحصائيات صفحة المتبرعين: تُسجَّل في ورقة «الزيارات» بالجدول، بدون أي بيانات شخصية
(function () {
  var U = 'https://script.google.com/macros/s/AKfycbyXs0jKcR9Xlt-Wd1OXl8RYFrlqQWsw3w4CeLTSZ6QTRpqnaQs7iCsRObuXrLBfdjtT/exec';
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  // زيارات الفريق (اللي فتحوا الموقع الداخلي) ما تنحسب
  if (ls('rh-team') === '1') return;
  var vid = ls('rh-vid'); if (!vid) { vid = Math.random().toString(36).slice(2, 10); ls('rh-vid', vid); }
  var params = new URLSearchParams(location.search);
  var PLACE = (params.get('place') || '').trim();
  var dev = /iPhone|iPad|Android|Mobi/i.test(navigator.userAgent) ? 'جوال' : 'كمبيوتر';
  function source() {
    var s = (params.get('s') || params.get('utm_source') || '').toLowerCase();
    var map = { wa: 'واتساب', whatsapp: 'واتساب', x: 'إكس', twitter: 'إكس', ig: 'إنستقرام', instagram: 'إنستقرام', snap: 'سناب', snapchat: 'سناب', tiktok: 'تيك توك', qr: 'باركود', link: 'رابط مختصر', sms: 'رسائل' };
    if (s) return map[s] || s;
    var r = ''; try { r = new URL(document.referrer).hostname; } catch (e) {}
    if (!r || r === location.hostname) return 'مباشر';
    if (/whatsapp|wa\.me/.test(r)) return 'واتساب';
    if (/(^|\.)(t\.co|x\.com|twitter\.com)$/.test(r)) return 'إكس';
    if (/instagram/.test(r)) return 'إنستقرام';
    if (/snapchat/.test(r)) return 'سناب';
    if (/tiktok/.test(r)) return 'تيك توك';
    if (/google\./.test(r)) return 'قوقل';
    if (/facebook|fb\./.test(r)) return 'فيسبوك';
    if (/qurannajran/.test(r)) return 'موقع الجمعية';
    return r.replace(/^www\./, '');
  }
  var SRC = source();
  function send(ev, h) {
    var q = new URLSearchParams({ ev: ev, pg: PLACE ? 'مجمع' : 'المتبرعين', h: h || '', pl: PLACE, src: SRC, v: vid, d: dev });
    try { fetch(U + '?' + q.toString(), { mode: 'no-cors', keepalive: true }); } catch (e) {}
  }
  send('view');
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a, #k-push'); if (!a) return;
    if (a.id === 'k-push') return send('push');
    var href = a.getAttribute('href') || '';
    if (a.dataset.near) return send('near', a.dataset.h);
    if (a.dataset.h) return send('kafala', a.dataset.h);
    if (/qurannajran\.org\.sa/.test(href)) return send('store');
    if (/^tel:/.test(href)) return send('call');
    if (/wa\.me/.test(href)) return send('whatsapp');
    if (/ncnp\.gov\.sa/.test(href)) return send('license');
    if (/x\.com|instagram|snapchat|tiktok/.test(href)) return send('social');
  }, true);
  var searched = false, q = document.getElementById('k-q');
  if (q) q.addEventListener('change', function () { if (!searched && q.value.trim()) { searched = true; send('search'); } });
})();
