document.getElementById('rh-mode').addEventListener('click', function () {
  var d = document.getElementById('rh-root').classList.contains('dark');
  document.body.classList.toggle('dark', d);
  var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = d ? '#1C140B' : '#F3EADB';
});
