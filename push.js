// إشعارات رتّل عبر OneSignal — AUDIENCE يحدده كل موقع: team أو donor
(function () {
  var APP_ID = '24c2936b-274b-44ad-93b6-5cd068a847fe';
  var AUD = window.RATL_AUDIENCE || 'donor';
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  var ready = new Promise(function (res) {
    setTimeout(function () { res(null); }, 12000);
    OneSignalDeferred.push(async function (OneSignal) {
      try {
        await OneSignal.init({ appId: APP_ID, safari_web_id: 'web.onesignal.auto.1f868039-39c5-4cdf-b63f-2c8777cb9e04',
          serviceWorkerPath: 'ratl-halaqat/sw.js', serviceWorkerParam: { scope: '/ratl-halaqat/' },
          notifyButton: { enable: false }, allowLocalhostAsSecureOrigin: true });
        res(OneSignal);
      } catch (e) { console.warn('OneSignal init', e); res(null); }
    });
  });
  var s = document.createElement('script'); s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'; s.defer = true; document.head.appendChild(s);
  function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function label(btn, txt, on) { btn.querySelector('span').textContent = txt; btn.classList.toggle('on', !!on); }
  async function refresh(btn) {
    var OS = await ready;
    if (!OS || !OS.Notifications.isPushSupported()) {
      label(btn, isIOS() && !standalone() ? 'الإشعارات بعد التثبيت' : 'الإشعارات غير مدعومة', false); btn.dataset.state = isIOS() && !standalone() ? 'install' : 'unsupported'; return;
    }
    var on = OS.Notifications.permission && OS.User.PushSubscription.optedIn;
    label(btn, on ? 'الإشعارات مفعّلة' : 'فعّل الإشعارات', on); btn.dataset.state = on ? 'on' : 'off';
  }
  function toast(t) {
    var d = document.getElementById('ratl-toast');
    if (!d) { d = document.createElement('div'); d.id = 'ratl-toast'; d.setAttribute('role', 'status');
      d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:18px;z-index:99;background:#3B2814;color:#FBF8F2;padding:14px 16px;border-radius:14px;font:15px/1.7 TS,system-ui,sans-serif;direction:rtl;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:520px;margin:0 auto';
      document.body.appendChild(d); }
    d.textContent = t; d.hidden = false; clearTimeout(d._t); d._t = setTimeout(function () { d.hidden = true; }, 7000);
  }
  window.RatlPush = {
    bind: function (btn) {
      if (!btn) return;
      refresh(btn);
      btn.addEventListener('click', async function () {
        if (btn.dataset.state === 'install') { toast('لتفعيل الإشعارات على الآيفون: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»، وافتح التطبيق من الأيقونة.'); return; }
        if (btn.dataset.state === 'unsupported') return;
        var OS = await ready; if (!OS) return;
        if (btn.dataset.state === 'on') { await OS.User.PushSubscription.optOut(); refresh(btn); return; }
        await OS.Notifications.requestPermission();
        try { await OS.User.PushSubscription.optIn(); } catch (e) {}
        try { OS.User.addTag('audience', AUD); } catch (e) {}
        refresh(btn);
      });
      ready.then(function (OS) { if (OS) OS.User.PushSubscription.addEventListener('change', function () { try { OS.User.addTag('audience', AUD); } catch (e) {} refresh(btn); }); });
    }
  };
})();
