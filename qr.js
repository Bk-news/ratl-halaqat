// مولّد QR مختصر (وضع البايت، تصحيح أخطاء M، الإصدارات 1–10)
window.RHQR = (function () {
  var EC_M = [[10, 1], [16, 1], [26, 1], [18, 2], [24, 2], [16, 4], [18, 4], [22, 2, 2], [22, 3, 2], [26, 4, 1]];
  // لكل إصدار: [كلمات تصحيح لكل كتلة، عدد كتل المجموعة 1، عدد كتل المجموعة 2]
  var TOTAL = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346];
  var ALIGN = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  var EXP = new Array(512), LOG = new Array(256);
  (function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  function mul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }
  function gen(n) { var g = [1]; for (var i = 0; i < n; i++) { var ng = new Array(g.length + 1).fill(0); for (var j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= mul(g[j], EXP[i]); } g = ng; } return g; }
  function rs(data, n) { var g = gen(n), r = data.concat(new Array(n).fill(0)); for (var i = 0; i < data.length; i++) { var c = r[i]; if (c) for (var j = 0; j < g.length; j++) r[i + j] ^= mul(g[j], c); } return r.slice(data.length); }
  function utf8(s) { var b = unescape(encodeURIComponent(s)), o = []; for (var i = 0; i < b.length; i++) o.push(b.charCodeAt(i)); return o; }
  function blocksOf(v) {
    var e = EC_M[v - 1], ecw = e[0], nb = e[1] + (e[2] || 0), dataTotal = TOTAL[v - 1] - ecw * nb;
    var short = Math.floor(dataTotal / nb), nLong = dataTotal % nb;
    return { ecw: ecw, nb: nb, dataTotal: dataTotal, short: short, nLong: nLong };
  }
  function encode(text) {
    var bytes = utf8(text), v, B;
    for (v = 1; v <= 10; v++) { B = blocksOf(v); var cap = B.dataTotal * 8 - 4 - (v < 10 ? 8 : 16); if (bytes.length * 8 <= cap) break; }
    if (v > 10) return null;
    var bits = [], put = function (val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(function (b) { put(b, 8); });
    var cap2 = B.dataTotal * 8; put(0, Math.min(4, cap2 - bits.length)); while (bits.length % 8) bits.push(0);
    var data = []; for (var i = 0; i < bits.length; i += 8) { var x = 0; for (var k = 0; k < 8; k++) x = (x << 1) | bits[i + k]; data.push(x); }
    for (var p = 0; data.length < B.dataTotal; p++) data.push(p % 2 ? 0x11 : 0xEC);
    var blocks = [], ecs = [], off = 0;
    for (i = 0; i < B.nb; i++) { var len = B.short + (i >= B.nb - B.nLong ? 1 : 0); var d = data.slice(off, off + len); off += len; blocks.push(d); ecs.push(rs(d, B.ecw)); }
    var out = [], maxLen = B.short + (B.nLong ? 1 : 0);
    for (i = 0; i < maxLen; i++) blocks.forEach(function (b) { if (i < b.length) out.push(b[i]); });
    for (i = 0; i < B.ecw; i++) ecs.forEach(function (e) { out.push(e[i]); });
    return { v: v, cw: out };
  }
  function build(text) {
    var enc = encode(text); if (!enc) return null;
    var v = enc.v, n = 17 + 4 * v, M = [], F = [];
    for (var y = 0; y < n; y++) { M.push(new Array(n).fill(0)); F.push(new Array(n).fill(false)); }
    function set(x, y, d) { M[y][x] = d ? 1 : 0; F[y][x] = true; }
    function finder(cx, cy) { for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue; var d = Math.max(Math.abs(dx), Math.abs(dy)); set(x, y, d !== 2 && d !== 4); } }
    finder(3, 3); finder(n - 4, 3); finder(3, n - 4);
    for (var i = 8; i < n - 8; i++) { set(i, 6, i % 2 === 0); set(6, i, i % 2 === 0); }
    var al = ALIGN[v - 1];
    al.forEach(function (ay, ii) { al.forEach(function (ax, jj) { var L = al.length - 1; if ((ii === 0 && jj === 0) || (ii === 0 && jj === L) || (ii === L && jj === 0)) return; for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }); });
    for (i = 0; i < 9; i++) { if (!F[8][i]) F[8][i] = true; if (!F[i][8]) F[i][8] = true; }
    for (i = 0; i < 8; i++) { F[8][n - 1 - i] = true; F[n - 1 - i][8] = true; }
    set(8, n - 8, true);
    if (v >= 7) { var vb = v << 12, r = v; for (i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25); vb |= r; for (i = 0; i < 18; i++) { var bit = (vb >>> i) & 1, a = n - 11 + (i % 3), b = Math.floor(i / 3); set(a, b, bit); set(b, a, bit); } }
    var bits = []; enc.cw.forEach(function (c) { for (var k = 7; k >= 0; k--) bits.push((c >>> k) & 1); });
    var idx = 0, up = true;
    for (var x = n - 1; x >= 1; x -= 2) { if (x === 6) x = 5; for (var t = 0; t < n; t++) { var yy = up ? n - 1 - t : t; for (var j = 0; j < 2; j++) { var xx = x - j; if (F[yy][xx]) continue; M[yy][xx] = idx < bits.length ? bits[idx] : 0; idx++; } } up = !up; }
    var masks = [function (x, y) { return (x + y) % 2 === 0; }, function (x, y) { return y % 2 === 0; }, function (x, y) { return x % 3 === 0; }, function (x, y) { return (x + y) % 3 === 0; },
      function (x, y) { return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0; }, function (x, y) { return (x * y) % 2 + (x * y) % 3 === 0; },
      function (x, y) { return ((x * y) % 2 + (x * y) % 3) % 2 === 0; }, function (x, y) { return ((x + y) % 2 + (x * y) % 3) % 2 === 0; }];
    function fmt(mask) { var d = (0 << 3) | mask, r = d; for (var i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); return ((d << 10) | r) ^ 0x5412; }
    function apply(mask) {
      var R = M.map(function (row) { return row.slice(); });
      for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (!F[y][x] && masks[mask](x, y)) R[y][x] ^= 1;
      var f = fmt(mask), g = function (i) { return (f >>> i) & 1; }, i;
      for (i = 0; i <= 5; i++) R[i][8] = g(i);
      R[7][8] = g(6); R[8][8] = g(7); R[8][7] = g(8);
      for (i = 9; i < 15; i++) R[8][14 - i] = g(i);
      for (i = 0; i < 8; i++) R[8][n - 1 - i] = g(i);
      for (i = 8; i < 15; i++) R[n - 15 + i][8] = g(i);
      R[n - 8][8] = 1;
      return R;
    }
    function penalty(R) {
      var p = 0, y, x;
      for (y = 0; y < n; y++) { var run = 1; for (x = 1; x < n; x++) { if (R[y][x] === R[y][x - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
      for (x = 0; x < n; x++) { run = 1; for (y = 1; y < n; y++) { if (R[y][x] === R[y - 1][x]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
      for (y = 0; y < n - 1; y++) for (x = 0; x < n - 1; x++) { var c = R[y][x]; if (c === R[y][x + 1] && c === R[y + 1][x] && c === R[y + 1][x + 1]) p += 3; }
      var dark = 0; for (y = 0; y < n; y++) for (x = 0; x < n; x++) dark += R[y][x];
      p += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
      return p;
    }
    var best = null, bp = Infinity;
    for (var m = 0; m < 8; m++) { var R = apply(m), pp = penalty(R); if (pp < bp) { bp = pp; best = R; } }
    return best;
  }
  return { matrix: build };
})();
