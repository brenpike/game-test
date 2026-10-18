(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Watercolor art-style prototype: axolotl in a Xochimilco canal.
  // Logical space 480x360. Static layers cached per resize; reeds,
  // axolotl and bubbles drawn per frame. Paper grain is a separate
  // pre-rendered overlay so animated shapes get the same paper texture.
  // ---------------------------------------------------------------------

  var W = 480, H = 360, SURF = 80;
  var TAU = Math.PI * 2;
  var STATIC_T = 5;       // frame shown for reduced motion
  var MAX_DT = 0.05;
  var MAX_DPR = 2;

  var canvas = document.getElementById('scene');
  var g = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  if (!g) { return; }

  var cache = document.createElement('canvas');
  var cg = cache.getContext('2d');
  var grain = document.createElement('canvas');
  var gg = grain.getContext('2d');
  var grainTile = null;
  var kx = 1, ky = 1;

  // ------------------------------ utils --------------------------------

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rgba(c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
  }

  function rgbaD(c, a) {
    return 'rgba(' + ((c[0] * 0.74) | 0) + ',' + ((c[1] * 0.74) | 0) + ',' +
      ((c[2] * 0.74) | 0) + ',' + a.toFixed(3) + ')';
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // Smooth closed path through polygon p (flat x,y array) with offsets j.
  function trace(c, p, j) {
    var n = p.length >> 1, i, k, x, y, nx, ny;
    var lx = p[2 * n - 2] + j[2 * n - 2], ly = p[2 * n - 1] + j[2 * n - 1];
    var fx = p[0] + j[0], fy = p[1] + j[1];
    c.beginPath();
    c.moveTo((lx + fx) / 2, (ly + fy) / 2);
    for (i = 0; i < n; i++) {
      x = p[2 * i] + j[2 * i];
      y = p[2 * i + 1] + j[2 * i + 1];
      k = i + 1 === n ? 0 : i + 1;
      nx = p[2 * k] + j[2 * k];
      ny = p[2 * k + 1] + j[2 * k + 1];
      c.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
    }
    c.closePath();
  }

  // Per-layer vertex jitter. Last layer is the widest (pigment bleed).
  function makeJit(n, layers, amt, rng) {
    var out = [], l, i, f, dx, dy, arr;
    for (l = 0; l < layers; l++) {
      arr = new Float32Array(2 * n);
      f = amt * (0.45 + 0.55 * (layers > 1 ? l / (layers - 1) : 1));
      dx = (rng() - 0.5) * f * 0.6;
      dy = (rng() - 0.5) * f * 0.6;
      for (i = 0; i < n; i++) {
        arr[2 * i] = dx + (rng() - 0.5) * 2 * f;
        arr[2 * i + 1] = dy + (rng() - 0.5) * 2 * f;
      }
      out.push(arr);
    }
    return out;
  }

  // Many low-alpha jittered layers + slight edge darkening.
  function wash(c, p, jit, col, a0, a1, edge) {
    var L = jit.length, l;
    for (l = 0; l < L; l++) {
      c.fillStyle = rgba(col, a0 + (a1 - a0) * ((l * 0.618 + 0.17) % 1));
      trace(c, p, jit[l]);
      c.fill();
    }
    if (edge > 0) {
      c.strokeStyle = rgbaD(col, edge);
      c.lineWidth = 0.9;
      trace(c, p, jit[0]);
      c.stroke();
      if (L > 1) {
        c.lineWidth = 0.6;
        trace(c, p, jit[L - 1]);
        c.stroke();
      }
    }
  }

  function washS(c, p, col, rng, layers, amt, a0, a1, edge) {
    wash(c, p, makeJit(p.length >> 1, layers, amt, rng), col, a0, a1, edge);
  }

  function subdiv(p, sub) {
    var n = p.length >> 1, out = [], i, j, s, f;
    for (i = 0; i < n; i++) {
      j = (i + 1) % n;
      for (s = 0; s < sub; s++) {
        f = s / sub;
        out.push(p[2 * i] + (p[2 * j] - p[2 * i]) * f,
                 p[2 * i + 1] + (p[2 * j + 1] - p[2 * i + 1]) * f);
      }
    }
    return out;
  }

  function rectPts(x0, y0, x1, y1, sub) {
    return subdiv([x0, y0, x1, y0, x1, y1, x0, y1], sub);
  }

  function ellipse(cx, cy, rx, ry, n, rng, irr) {
    var out = [], i, a, r;
    for (i = 0; i < n; i++) {
      a = TAU * i / n;
      r = 1 + (rng() - 0.5) * 2 * irr;
      out.push(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r);
    }
    return out;
  }

  // ----------------------------- static scene --------------------------

  var PAPER = '#f4ede0';

  function drawSky(c, rng) {
    var gr = c.createLinearGradient(0, 0, 0, 84);
    gr.addColorStop(0, '#c3d9e2');
    gr.addColorStop(0.7, '#dde6e0');
    gr.addColorStop(1, '#ece5d3');
    c.fillStyle = gr;
    c.fillRect(-2, -2, W + 4, 86);
    washS(c, rectPts(-30, -30, 510, 58, 12), [186, 212, 226], rng, 7, 5, 0.04, 0.09, 0);
    washS(c, rectPts(-30, 40, 510, 92, 12), [238, 216, 186], rng, 6, 4, 0.04, 0.10, 0);
    var clouds = [[80, 24, 58, 10], [205, 42, 44, 8], [30, 52, 36, 6], [150, 12, 40, 6]];
    for (var i = 0; i < clouds.length; i++) {
      var q = clouds[i];
      washS(c, ellipse(q[0], q[1], q[2], q[3], 14, rng, 0.12), [252, 250, 246],
        rng, 5, 3, 0.07, 0.15, 0.05);
    }
  }

  var BANK_TOP = [[300, 60], [310, 52], [322, 45], [336, 41], [360, 39],
                  [395, 40], [430, 38], [470, 39], [520, 37]];

  function bankTop(x) {
    var i, a, b;
    if (x <= BANK_TOP[0][0]) { return BANK_TOP[0][1]; }
    for (i = 1; i < BANK_TOP.length; i++) {
      if (x <= BANK_TOP[i][0]) {
        a = BANK_TOP[i - 1]; b = BANK_TOP[i];
        return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      }
    }
    return BANK_TOP[BANK_TOP.length - 1][1];
  }

  function drawBank(c, rng) {
    var i, soil = [296, 88, 298, 74], x, y;
    for (i = 0; i < BANK_TOP.length; i++) { soil.push(BANK_TOP[i][0], BANK_TOP[i][1]); }
    soil.push(520, 88, 410, 88);
    washS(c, subdiv(soil, 2), [186, 162, 134], rng, 7, 2, 0.06, 0.13, 0.20);
    washS(c, subdiv([300, 68, 360, 64, 430, 66, 520, 64, 520, 90, 296, 90], 4),
      [150, 124, 98], rng, 4, 2.5, 0.05, 0.10, 0);

    // soil strata (broken sepia strokes)
    c.strokeStyle = 'rgba(120,92,70,0.28)';
    c.lineWidth = 0.7;
    c.beginPath();
    for (i = 0; i < 9; i++) {
      x = 312 + rng() * 170;
      y = 64 + rng() * 14;
      c.moveTo(x, y);
      c.lineTo(x + 8 + rng() * 14, y + (rng() - 0.5) * 2);
    }
    c.stroke();

    // grass strip
    var tops = [], bots = [];
    for (i = 0; i < BANK_TOP.length; i++) {
      tops.push(BANK_TOP[i][0], BANK_TOP[i][1] - 0.5);
      bots.push(BANK_TOP[i][0], BANK_TOP[i][1] + 8 + rng() * 3);
    }
    var gp = tops.slice();
    for (i = BANK_TOP.length - 1; i >= 0; i--) { gp.push(bots[2 * i], bots[2 * i + 1]); }
    washS(c, subdiv(gp, 2), [164, 188, 134], rng, 7, 1.4, 0.08, 0.15, 0.18);
    var gp2 = [];
    for (i = 0; i < BANK_TOP.length; i++) { gp2.push(BANK_TOP[i][0], BANK_TOP[i][1] + 1.5); }
    for (i = BANK_TOP.length - 1; i >= 0; i--) { gp2.push(BANK_TOP[i][0], BANK_TOP[i][1] + 5 + rng() * 2); }
    washS(c, subdiv(gp2, 2), [130, 162, 112], rng, 4, 1.2, 0.06, 0.10, 0);

    // grass tufts
    c.strokeStyle = 'rgba(112,148,96,0.5)';
    c.lineWidth = 0.9;
    c.beginPath();
    for (i = 0; i < 46; i++) {
      x = 306 + rng() * 190;
      y = bankTop(x) + 1;
      for (var b = 0; b < 3; b++) {
        c.moveTo(x + b * 1.5, y);
        c.lineTo(x + b * 1.5 + (rng() - 0.5) * 3, y - (3 + rng() * 5));
      }
    }
    c.stroke();

    // broken sepia line along bank edge
    c.save();
    c.setLineDash([7, 4, 3, 5]);
    c.strokeStyle = 'rgba(120,92,70,0.30)';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(296, 86);
    c.lineTo(298, 74);
    for (i = 0; i < BANK_TOP.length; i++) { c.lineTo(BANK_TOP[i][0], BANK_TOP[i][1] + 9); }
    c.stroke();
    c.restore();
  }

  function drawTree(c, rng, x, baseY, topY, lean) {
    var S = 7, i, s, cx, cy, w, left = [], right = [];
    function tx(t) { return x + lean * t * t; }
    function ty(t) { return baseY + (topY - baseY) * t; }
    for (i = 0; i <= S; i++) {
      s = i / S;
      cx = tx(s) + Math.sin(s * 3) * 1.1;
      cy = ty(s);
      w = 2.2 * (1 - s) + 0.7;
      left.push(cx - w, cy);
      right.unshift(cx + w, cy);
    }
    washS(c, left.concat(right), [128, 112, 92], rng, 4, 0.5, 0.10, 0.20, 0.25);

    var greens = [[158, 186, 140], [176, 198, 150], [138, 170, 128]];
    for (i = 0; i < 8; i++) {
      s = i < 7 ? 0.36 + i * 0.09 : 1.0;
      washS(c, ellipse(tx(s) + (rng() - 0.5) * 5, ty(s) + (rng() - 0.5) * 3,
        7 + rng() * 4, 9 + rng() * 5, 10, rng, 0.15),
        greens[i % 3], rng, 4, 1.8, 0.06, 0.12, 0.08);
    }
    c.strokeStyle = 'rgba(124,158,110,0.40)';
    c.lineWidth = 0.9;
    c.beginPath();
    for (i = 0; i < 16; i++) {
      s = 0.4 + rng() * 0.6;
      var sx = tx(s) + (rng() - 0.5) * 14, sy = ty(s) + rng() * 4, len = 8 + rng() * 12;
      c.moveTo(sx, sy);
      c.quadraticCurveTo(sx + (rng() - 0.5) * 6, sy + len * 0.5, sx + (rng() - 0.5) * 5, sy + len);
    }
    c.stroke();
  }

  function drawWater(c, rng) {
    var gr = c.createLinearGradient(0, SURF, 0, H + 4);
    gr.addColorStop(0, 'rgba(186,222,222,0.92)');
    gr.addColorStop(0.35, 'rgba(122,174,188,0.92)');
    gr.addColorStop(0.75, 'rgba(98,148,170,0.95)');
    gr.addColorStop(1, 'rgba(80,122,146,0.97)');
    c.fillStyle = gr;
    c.fillRect(-2, SURF, W + 4, H - SURF + 4);

    washS(c, rectPts(-30, SURF, 510, 380, 12), [140, 192, 202], rng, 7, 6, 0.04, 0.09, 0);
    washS(c, rectPts(-30, 170, 510, 390, 12), [118, 166, 186], rng, 6, 8, 0.04, 0.09, 0);
    washS(c, rectPts(-30, SURF, 510, 150, 12), [168, 208, 206], rng, 6, 5, 0.05, 0.10, 0);
    washS(c, ellipse(120, 240, 90, 40, 16, rng, 0.2), [140, 186, 170], rng, 5, 4, 0.04, 0.08, 0.04);
    washS(c, ellipse(380, 200, 80, 50, 16, rng, 0.2), [126, 170, 190], rng, 5, 4, 0.04, 0.08, 0.04);

    // light shafts
    var shafts = [[60, 20, 110], [200, 24, 160], [330, 18, 120]];
    for (var i = 0; i < shafts.length; i++) {
      var sh = shafts[i], x = sh[0], hw = sh[1], dx = sh[2] * 0.4;
      washS(c, subdiv([x - hw / 2, SURF, x + hw / 2, SURF, x + dx + hw, 240, x + dx - hw, 240], 3),
        [255, 250, 225], rng, 4, 3, 0.03, 0.07, 0);
    }

    // surface line: pale band + broken sepia-blue line
    washS(c, rectPts(-20, 78, 500, 83, 20), [236, 246, 240], rng, 4, 0.8, 0.10, 0.20, 0);
    c.save();
    c.setLineDash([9, 5, 4, 6]);
    c.strokeStyle = 'rgba(100,140,150,0.35)';
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(0, SURF + 0.5);
    c.lineTo(W, SURF + 0.5);
    c.stroke();
    c.restore();

    c.strokeStyle = 'rgba(255,255,255,0.18)';
    c.lineWidth = 0.8;
    c.beginPath();
    for (i = 0; i < 26; i++) {
      var hx = rng() * W, hy = 86 + rng() * 120;
      c.moveTo(hx, hy);
      c.lineTo(hx + 6 + rng() * 14, hy + (rng() - 0.5));
    }
    c.stroke();
  }

  function drawBed(c, rng) {
    var i, x, top = [], greys = [[155, 142, 128], [176, 163, 146], [138, 143, 140]];
    for (x = -30; x <= 510; x += 30) { top.push(x, 322 + rng() * 9); }
    top.push(510, 380, -30, 380);
    washS(c, subdiv(top, 1), [128, 108, 92], rng, 7, 2.5, 0.08, 0.15, 0.20);
    var low = [];
    for (x = -30; x <= 510; x += 40) { low.push(x, 338 + rng() * 8); }
    low.push(510, 380, -30, 380);
    washS(c, low, [104, 88, 78], rng, 5, 2.5, 0.06, 0.12, 0);
    for (i = 0; i < 24; i++) {
      washS(c, ellipse(rng() * W, 332 + rng() * 22, 3 + rng() * 4, 2 + rng() * 2, 8, rng, 0.12),
        greys[i % 3], rng, 3, 0.5, 0.12, 0.22, 0.30);
    }
  }

  function drawPads(c, rng) {
    var pads = [[90, 38], [160, 44], [250, 36]], i, cx, w, k;
    c.strokeStyle = 'rgba(110,140,110,0.20)';
    c.lineWidth = 0.8;
    c.beginPath();
    for (i = 0; i < pads.length; i++) {
      cx = pads[i][0];
      c.moveTo(cx, 82);
      c.quadraticCurveTo(cx + (rng() - 0.5) * 16, 200, cx + (rng() - 0.5) * 10, 330);
    }
    c.stroke();
    for (i = 0; i < pads.length; i++) {
      cx = pads[i][0]; w = pads[i][1];
      washS(c, ellipse(cx, 81.6, w * 0.47, 1.7, 10, rng, 0.08), [96, 130, 100], rng, 3, 0.4, 0.10, 0.18, 0);
      washS(c, ellipse(cx, 79, w / 2, 3.2, 14, rng, 0.07), [140, 172, 124], rng, 5, 0.8, 0.10, 0.20, 0.30);
    }
    // flower on pad at x=160
    var fx = 164, fy = 76.5;
    for (k = 0; k < 7; k++) {
      var a = -Math.PI + 0.35 + k * (Math.PI - 0.7) / 6;
      var len = 9 + rng() * 3, hw = 1.8;
      var ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
      var pet = [
        fx + nx * hw, fy + ny * hw,
        fx + ux * len * 0.5 + nx * hw * 1.6, fy + uy * len * 0.5 + ny * hw * 1.6,
        fx + ux * len, fy + uy * len,
        fx + ux * len * 0.5 - nx * hw * 1.6, fy + uy * len * 0.5 - ny * hw * 1.6,
        fx - nx * hw, fy - ny * hw
      ];
      washS(c, pet, k % 2 ? [236, 176, 190] : [246, 205, 212], rng, 3, 0.6, 0.12, 0.20, 0.22);
    }
    washS(c, ellipse(fx, fy - 1.5, 2.4, 2, 8, rng, 0.1), [236, 214, 140], rng, 3, 0.3, 0.2, 0.35, 0);
  }

  function renderStatic(c) {
    var rng = mulberry32(20241);
    c.setTransform(kx, 0, 0, ky, 0, 0);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = PAPER;
    c.fillRect(0, 0, W, H);
    drawSky(c, rng);
    drawBank(c, rng);
    drawTree(c, rng, 346, 46, 4, 4);
    drawTree(c, rng, 432, 44, 8, -5);
    drawWater(c, rng);
    drawBed(c, rng);
    drawPads(c, rng);
  }

  // ----------------------------- paper grain ---------------------------

  function makeGrainTile() {
    var N = 256, tile = document.createElement('canvas'), tg, img, d, r, i, v, o, x, y;
    tile.width = N; tile.height = N;
    tg = tile.getContext('2d');
    img = tg.createImageData(N, N);
    d = img.data;
    r = mulberry32(4242);
    for (i = 0; i < N * N; i++) {
      v = r();
      o = i * 4;
      if (v > 0.52) {
        d[o] = 108; d[o + 1] = 92; d[o + 2] = 78;
        d[o + 3] = ((v - 0.52) * 45) | 0;
      } else if (v < 0.07) {
        d[o] = 255; d[o + 1] = 252; d[o + 2] = 244;
        d[o + 3] = (30 + r() * 40) | 0;
      }
    }
    tg.putImageData(img, 0, 0);
    tg.strokeStyle = 'rgba(120,100,84,0.06)';
    tg.lineWidth = 0.6;
    for (i = 0; i < 40; i++) {
      x = r() * N; y = r() * N;
      tg.beginPath();
      tg.moveTo(x, y);
      tg.lineTo(x + (r() - 0.5) * 18, y + (r() - 0.5) * 18);
      tg.stroke();
    }
    return tile;
  }

  function renderGrain(c, pw, ph) {
    var vg;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, pw, ph);
    if (!grainTile) { grainTile = makeGrainTile(); }
    c.fillStyle = c.createPattern(grainTile, 'repeat');
    c.fillRect(0, 0, pw, ph);
    vg = c.createRadialGradient(pw / 2, ph / 2, Math.min(pw, ph) * 0.45,
      pw / 2, ph / 2, Math.max(pw, ph) * 0.75);
    vg.addColorStop(0, 'rgba(120,96,70,0)');
    vg.addColorStop(1, 'rgba(120,96,70,0.12)');
    c.fillStyle = vg;
    c.fillRect(0, 0, pw, ph);
  }

  // ----------------------------- pose / path ---------------------------

  var POSE = { x: 0, y: 0, dir: 1 };
  var TMP = { x: 0, y: 0, dir: 1 };

  function poseAt(t, o) {
    var ph = TAU * t / 16;
    o.x = 240 + 110 * Math.sin(ph);
    o.y = 210 + 15 * Math.sin(TAU * t / 3);
    o.dir = Math.cos(ph) >= 0 ? 1 : -1;
  }

  // ------------------------------- reeds -------------------------------

  var REED_S = 6;
  var REED_AIR = [[156, 182, 124], [138, 168, 116], [172, 190, 134]];
  var REED_WATER = [[122, 160, 140], [108, 148, 138], [134, 168, 142]];
  var reeds = [];

  function initReeds(r) {
    var clusters = [[20, 80, 8], [400, 460, 8]], ci, i, cl, cph, bx;
    for (ci = 0; ci < clusters.length; ci++) {
      cl = clusters[ci];
      cph = r() * TAU;
      for (i = 0; i < cl[2]; i++) {
        bx = cl[0] + (cl[1] - cl[0]) * (i / (cl[2] - 1)) + (r() - 0.5) * 6;
        reeds.push({
          bx: bx, by: 336 + r() * 6,
          tx: bx + (r() - 0.5) * 16, ty: SURF - (28 + r() * 26),
          w: 2.4 + r() * 1.4, amp: 3.5 + r() * 3,
          ph: cph + (r() - 0.5) * 1.2,
          c: (r() * 3) | 0,
          pts: new Float64Array(4 * (REED_S + 1)),
          jit: makeJit(2 * (REED_S + 1), 3, 0.6, r)
        });
      }
    }
  }

  function updateReed(rd, t) {
    var sway = rd.amp * Math.sin(TAU * t / 4 + rd.ph);
    var tipx = rd.tx + sway;
    var cx = rd.bx + (rd.tx - rd.bx) * 0.5 + sway * 0.25;
    var cy = (rd.by + rd.ty) / 2;
    var S = REED_S, i, s, u, x, y, dx, dy, l, w, p = rd.pts, n = 2 * (S + 1);
    for (i = 0; i <= S; i++) {
      s = i / S; u = 1 - s;
      x = u * u * rd.bx + 2 * u * s * cx + s * s * tipx;
      y = u * u * rd.by + 2 * u * s * cy + s * s * rd.ty;
      dx = 2 * u * (cx - rd.bx) + 2 * s * (tipx - cx);
      dy = 2 * u * (cy - rd.by) + 2 * s * (rd.ty - cy);
      l = Math.sqrt(dx * dx + dy * dy) || 1;
      w = rd.w * Math.pow(u, 0.85) + 0.3;
      p[2 * i] = x - dy / l * w;
      p[2 * i + 1] = y + dx / l * w;
      p[2 * (n - 1 - i)] = x + dy / l * w;
      p[2 * (n - 1 - i) + 1] = y - dx / l * w;
    }
  }

  function drawReeds(t) {
    var i, rd, pass, set;
    for (i = 0; i < reeds.length; i++) { updateReed(reeds[i], t); }
    for (pass = 0; pass < 2; pass++) {
      set = pass === 0 ? REED_AIR : REED_WATER;
      g.save();
      g.beginPath();
      if (pass === 0) { g.rect(0, 0, W, SURF); } else { g.rect(0, SURF, W, H - SURF); }
      g.clip();
      for (i = 0; i < reeds.length; i++) {
        rd = reeds[i];
        wash(g, rd.pts, rd.jit, set[rd.c], pass === 0 ? 0.10 : 0.08, pass === 0 ? 0.20 : 0.16,
          pass === 0 ? 0.22 : 0);
      }
      g.restore();
    }
  }

  function drawRipple(t) {
    var x, y, k;
    for (k = 0; k < 2; k++) {
      g.beginPath();
      for (x = 0; x <= W; x += 8) {
        y = SURF + 0.8 + k * 1.6 + 0.8 * Math.sin(x * 0.07 + t * 1.1 + k * 1.7);
        if (x === 0) { g.moveTo(x, y); } else { g.lineTo(x, y); }
      }
      g.strokeStyle = k === 0 ? 'rgba(255,255,255,0.32)' : 'rgba(90,134,150,0.22)';
      g.lineWidth = k === 0 ? 1.2 : 0.7;
      g.stroke();
    }
  }

  // ------------------------------- axolotl -----------------------------

  var HT = [[-82, 1.5], [-70, 5], [-58, 9], [-44, 12.5], [-30, 11], [-16, 13.5],
            [0, 16], [18, 17], [32, 16], [42, 13], [49, 8], [53, 2]];

  function hAt(x) {
    var i, a, b;
    if (x <= HT[0][0]) { return HT[0][1]; }
    for (i = 1; i < HT.length; i++) {
      if (x <= HT[i][0]) {
        a = HT[i - 1]; b = HT[i];
        return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      }
    }
    return HT[HT.length - 1][1];
  }

  var NB = 19;
  var XS = [], HS = [], UW = [], FT = [], FB = [], UD = [];
  var finM = 0, backM = 0, bellyA = 0, bellyB = 0;
  var bodyP, finP, backP, bellyP;
  var bodyJ, finJ, backJ, bellyJ;
  var legs = [];            // {x, base, swing, ph, far, p, j}
  var gills = [];           // {side, ang, len, lj, aj}
  var GILL_ANG = [[-2.40, -1.95, -1.45], [-2.55, -2.05, -1.55]];
  var GILL_LEN = [22, 27, 22];

  function initAxolotl(r) {
    var i, x, w, side, k, j;
    for (i = 0; i < NB; i++) {
      x = -82 + i * (135 / (NB - 1));
      XS.push(x);
      HS.push(hAt(x));
      w = clamp((-x - 8) / 74, 0, 1);
      UW.push(9 * Math.pow(w, 1.4));
      FT.push(x < -24 ? 0.45 * hAt(x) : Math.max(0, 5 * (1 - (x + 24) / 44)));
      FB.push(x < -30 ? 0.40 * hAt(x) : Math.max(0, 4 * (1 - (x + 30) / 20)));
      UD.push(0);
      if (x <= 20) { finM = i; }
      if (x <= 40) { backM = i; }
      if (x <= -30) { bellyA = i + 1; }
      if (x <= 42) { bellyB = i; }
    }
    bodyP = new Float64Array(4 * NB);
    finP = new Float64Array(2 * 2 * (finM + 1));
    backP = new Float64Array(2 * 2 * (backM + 1));
    bellyP = new Float64Array(2 * 2 * (bellyB - bellyA + 1));
    bodyJ = makeJit(2 * NB, 5, 1.4, r);
    finJ = makeJit(2 * (finM + 1), 3, 1.6, r);
    backJ = makeJit(2 * (backM + 1), 3, 1.2, r);
    bellyJ = makeJit(2 * (bellyB - bellyA + 1), 3, 1.0, r);

    // legs: front pair x~26, rear pair x~-14; far ones drawn behind body
    var defs = [[32, 1.95, 0, true], [-8, 1.95, 1.6, true], [26, 1.75, 0, false], [-14, 1.95, 1.6, false]];
    for (i = 0; i < defs.length; i++) {
      legs.push({
        x: defs[i][0], base: defs[i][1], ph: defs[i][2] + (defs[i][3] ? Math.PI : 0),
        far: defs[i][3], p: new Float64Array(14), j: makeJit(7, 3, 0.5, r)
      });
    }

    for (side = 0; side < 2; side++) {
      for (k = 0; k < 3; k++) {
        var lj = [], aj = [];
        for (j = 0; j < 5; j++) { lj.push((r() - 0.5) * 3); aj.push((r() - 0.5) * 0.3); }
        gills.push({ side: side, k: k, ang: GILL_ANG[side][k],
          len: GILL_LEN[k] * (side ? 1 : 0.92), lj: lj, aj: aj });
      }
    }
  }

  function legPts(out, bx, by, ang, L, w) {
    var ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    var w0 = w * 0.5, w1 = w * 0.5 * 0.7, cx1 = bx + ux * L * 0.5, cy1 = by + uy * L * 0.5;
    var ex = bx + ux * L, ey = by + uy * L;
    out[0] = bx + nx * w0;   out[1] = by + ny * w0;
    out[2] = cx1 + nx * w0 * 0.9; out[3] = cy1 + ny * w0 * 0.9;
    out[4] = ex + nx * w1;   out[5] = ey + ny * w1;
    out[6] = ex + ux * w1 * 1.1; out[7] = ey + uy * w1 * 1.1;
    out[8] = ex - nx * w1;   out[9] = ey - ny * w1;
    out[10] = cx1 - nx * w0 * 0.9; out[11] = cy1 - ny * w0 * 0.9;
    out[12] = bx - nx * w0;  out[13] = by - ny * w0;
  }

  function drawLegs(t, far) {
    var ph = TAU * t / 1.2, i, lg, ang, by;
    for (i = 0; i < legs.length; i++) {
      lg = legs[i];
      if (lg.far !== far) { continue; }
      ang = lg.base + 0.28 * Math.sin(ph + lg.ph);
      by = hAt(lg.x) * 0.7 + UWAt(lg.x, ph);
      legPts(lg.p, lg.x, by, ang, 15, 5.5);
      if (far) {
        wash(g, lg.p, lg.j, [214, 158, 170], 0.07, 0.14, 0.12);
      } else {
        wash(g, lg.p, lg.j, [240, 190, 196], 0.10, 0.20, 0.22);
      }
    }
  }

  function UWAt(x, ph) {
    var w = clamp((-x - 8) / 74, 0, 1);
    return 9 * Math.pow(w, 1.4) * Math.sin(ph + 0.05 * x);
  }

  function drawGills(t, side) {
    var wg = TAU / 0.8, ax = side ? 31 : 26, ay = -hAt(ax) * 0.95 + 4;
    var i, G, a, L, dx, dy, bnd, cx, cy, ex, ey, j, s, u, px, py, tx, ty, ta, fl, fa, m;
    var S = [0.3, 0.5, 0.7, 0.88], pass;
    for (pass = 0; pass < 2; pass++) {
      g.beginPath();
      for (i = 0; i < gills.length; i++) {
        G = gills[i];
        if (G.side !== side) { continue; }
        a = G.ang + 0.17 * Math.sin(wg * t + G.k * 1.1 + side * 0.8);
        L = G.len;
        dx = Math.cos(a); dy = Math.sin(a);
        bnd = 5 * Math.sin(wg * t + G.k * 1.1 + side * 0.8 - 0.9);
        cx = ax + dx * L * 0.55 - dy * bnd;
        cy = ay + dy * L * 0.55 + dx * bnd;
        ex = ax + dx * L; ey = ay + dy * L;
        g.moveTo(ax, ay);
        g.quadraticCurveTo(cx, cy, ex, ey);
        for (j = 0; j < 5; j++) {
          s = j < 4 ? S[j] : 1;
          u = 1 - s;
          px = u * u * ax + 2 * u * s * cx + s * s * ex;
          py = u * u * ay + 2 * u * s * cy + s * s * ey;
          tx = 2 * u * (cx - ax) + 2 * s * (ex - cx);
          ty = 2 * u * (cy - ay) + 2 * s * (ey - cy);
          ta = Math.atan2(ty, tx);
          fl = (j < 4 ? 10 * (1 - s * 0.55) + 2 : 6) + G.lj[j];
          for (m = -1; m <= 1; m += 2) {
            fa = ta + m * (0.85 - 0.25 * s + G.aj[j]);
            g.moveTo(px, py);
            g.lineTo(px + Math.cos(fa) * fl, py + Math.sin(fa) * fl);
          }
        }
      }
      if (pass === 0) {
        g.strokeStyle = rgba([236, 138, 156], side ? 0.22 : 0.14);
        g.lineWidth = 3.4;
      } else {
        g.strokeStyle = rgba([214, 98, 120], side ? 0.62 : 0.40);
        g.lineWidth = 1.3;
      }
      g.stroke();
    }
  }

  function drawFace() {
    var ex = 39, ey = -5;
    // blush
    g.fillStyle = 'rgba(240,140,150,0.10)';
    g.beginPath(); g.arc(33, 4, 5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(240,140,150,0.12)';
    g.beginPath(); g.arc(33, 4, 3.2, 0, TAU); g.fill();
    // eye: small, dark, soft
    g.fillStyle = 'rgba(62,46,52,0.30)';
    g.beginPath(); g.arc(ex, ey, 3.1, 0, TAU); g.fill();
    g.fillStyle = 'rgba(62,46,52,0.85)';
    g.beginPath(); g.arc(ex, ey, 2.2, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath(); g.arc(ex + 0.8, ey - 0.8, 0.7, 0, TAU); g.fill();
    // wide smile
    g.strokeStyle = 'rgba(170,90,106,0.75)';
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(52, 3);
    g.quadraticCurveTo(42, 12, 31, 2);
    g.lineTo(30, 0.4);
    g.stroke();
  }

  function drawAxolotl(t) {
    poseAt(t, POSE);
    var ph = TAU * t / 1.2, i, k, a;

    for (i = 0; i < NB; i++) { UD[i] = UW[i] * Math.sin(ph + 0.05 * XS[i]); }
    for (i = 0; i < NB; i++) {
      bodyP[2 * i] = XS[i];
      bodyP[2 * i + 1] = UD[i] - HS[i] * 0.95;
      k = 2 * NB - 1 - i;
      bodyP[2 * k] = XS[i];
      bodyP[2 * k + 1] = UD[i] + HS[i] * 1.05;
    }
    // fin: tail paddle + dorsal crest
    var nf = finM + 1;
    for (i = 0; i <= finM; i++) {
      finP[2 * i] = XS[i];
      finP[2 * i + 1] = UD[i] - HS[i] * 0.95 - FT[i];
      k = 2 * nf - 1 - i;
      finP[2 * k] = XS[i];
      finP[2 * k + 1] = UD[i] + HS[i] * 1.05 + FB[i];
    }
    // back shade
    var nb = backM + 1;
    for (i = 0; i <= backM; i++) {
      backP[2 * i] = XS[i];
      backP[2 * i + 1] = UD[i] - HS[i] * 0.95;
      k = 2 * nb - 1 - i;
      backP[2 * k] = XS[i];
      backP[2 * k + 1] = UD[i] - HS[i] * 0.05;
    }
    // belly highlight
    var nl = bellyB - bellyA + 1;
    for (i = bellyA; i <= bellyB; i++) {
      a = i - bellyA;
      bellyP[2 * a] = XS[i];
      bellyP[2 * a + 1] = UD[i] + HS[i] * 0.25;
      k = 2 * nl - 1 - a;
      bellyP[2 * k] = XS[i];
      bellyP[2 * k + 1] = UD[i] + HS[i] * 1.0;
    }

    g.save();
    g.translate(POSE.x, POSE.y);
    g.scale(POSE.dir, 1);
    g.rotate(0.1 * Math.cos(TAU * t / 3));

    drawGills(t, 0);
    drawLegs(t, true);
    wash(g, finP, finJ, [236, 170, 184], 0.06, 0.11, 0);
    wash(g, bodyP, bodyJ, [244, 200, 204], 0.10, 0.20, 0.22);
    wash(g, backP, backJ, [226, 160, 176], 0.05, 0.10, 0);
    wash(g, bellyP, bellyJ, [252, 230, 226], 0.08, 0.14, 0);

    // broken sepia line
    g.save();
    g.setLineDash([14, 5, 6, 5]);
    g.strokeStyle = 'rgba(138,100,100,0.35)';
    g.lineWidth = 0.8;
    trace(g, bodyP, bodyJ[0]);
    g.stroke();
    g.restore();

    drawLegs(t, false);
    drawGills(t, 1);
    drawFace();
    g.restore();
  }

  // ------------------------------- bubbles -----------------------------

  var BUBBLE_DT = 0.7, BUBBLE_RISE = 40, BUBBLE_MAX = 10;

  function drawBubbles(t) {
    var kNow = Math.floor(t / BUBBLE_DT), n, k, ts, age, x0, y0, x, y, r, fade, rr;
    for (n = 0; n < BUBBLE_MAX; n++) {
      k = kNow - n;
      if (k < 0) { break; }
      ts = k * BUBBLE_DT;
      age = t - ts;
      poseAt(ts, TMP);
      x0 = TMP.x + TMP.dir * 52;
      y0 = TMP.y + 2;
      y = y0 - BUBBLE_RISE * age;
      if (y <= SURF) { continue; }
      rr = mulberry32(k * 977 + 13);
      r = (2.2 + rr() * 2.2) * (1 + 0.12 * age);
      x = x0 + 3.5 * Math.min(1, age / 0.5) * Math.sin(TAU * age / 1.1 + k * 1.7);
      fade = clamp((y - SURF) / 8, 0, 1);

      g.fillStyle = 'rgba(220,240,246,' + (0.16 * fade).toFixed(3) + ')';
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(110,152,170,' + (0.45 * fade).toFixed(3) + ')';
      g.lineWidth = 0.8;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(110,152,170,' + (0.20 * fade).toFixed(3) + ')';
      g.beginPath(); g.arc(x + 0.4, y + 0.3, r * 0.92, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,' + (0.65 * fade).toFixed(3) + ')';
      g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, Math.max(0.5, r * 0.22), 0, TAU); g.fill();
    }
  }

  // ------------------------------- frame -------------------------------

  var staticRng = mulberry32(777);
  initReeds(staticRng);
  initAxolotl(staticRng);

  var tSim = STATIC_T;
  var rafId = 0;
  var lastNow = 0;
  var reduced = false;
  var haveSize = false;

  function applyState(c) {
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  function draw(t) {
    if (!haveSize) { return; }
    g.setTransform(1, 0, 0, 1, 0, 0);
    applyState(g);
    g.drawImage(cache, 0, 0);
    g.setTransform(kx, 0, 0, ky, 0, 0);
    drawRipple(t);
    drawReeds(t);
    drawAxolotl(t);
    drawBubbles(t);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(grain, 0, 0);
  }

  function frame() {
    rafId = requestAnimationFrame(frame);
    var now = performance.now();
    var dt = (now - lastNow) / 1000;
    lastNow = now;
    if (dt > MAX_DT) { dt = MAX_DT; }
    if (dt < 0) { dt = 0; }
    tSim += dt;
    draw(tSim);
  }

  function start() {
    if (rafId || reduced) { return; }
    lastNow = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  function applyMotion() {
    if (reduced) { stop(); draw(STATIC_T); } else { start(); }
  }

  // ------------------------------- resize ------------------------------

  var resizeQueued = false;

  function resize() {
    resizeQueued = false;
    var de = document.documentElement;
    var vw = window.innerWidth || de.clientWidth || W;
    var vh = window.innerHeight || de.clientHeight || H;
    var cw = Math.max(1, Math.floor(Math.min(vw, vh * 4 / 3)));
    var ch = Math.max(1, Math.floor(cw * 3 / 4));
    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    var pw = Math.max(1, Math.round(cw * dpr));
    var ph = Math.max(1, Math.round(pw * 3 / 4));

    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.width = pw; canvas.height = ph;
    cache.width = pw; cache.height = ph;
    grain.width = pw; grain.height = ph;
    kx = pw / W; ky = ph / H;

    applyState(g);
    renderStatic(cg);
    renderGrain(gg, pw, ph);
    haveSize = true;
    draw(reduced ? STATIC_T : tSim);
  }

  function queueResize() {
    if (resizeQueued) { return; }
    resizeQueued = true;
    requestAnimationFrame(resize);
  }

  window.addEventListener('resize', queueResize);
  window.addEventListener('orientationchange', queueResize);

  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  reduced = !!(mq && mq.matches);
  if (mq) {
    var onMq = function (e) { reduced = !!e.matches; applyMotion(); };
    if (mq.addEventListener) { mq.addEventListener('change', onMq); }
    else if (mq.addListener) { mq.addListener(onMq); }
  }

  resize();
  applyMotion();
})();
