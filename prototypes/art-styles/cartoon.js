(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Cute cartoon style: axolotl in a Xochimilco canal (throwaway prototype)
  // Logical space 480x360. Presentational rendering only.
  // ---------------------------------------------------------------------

  var W = 480;
  var H = 360;
  var SURF = 80;
  var TAU = Math.PI * 2;
  var OUT = '#2b2350';   // single dark outline colour
  var LW = 3.5;          // main outline width (logical px)
  var T_STATIC = 1.0;    // time used for the reduced-motion still frame

  var canvas = document.getElementById('scene');
  if (!canvas || !canvas.getContext) { return; }
  var ctx = canvas.getContext('2d');
  if (!ctx) { return; }

  // --------------------------- seeded PRNG ------------------------------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ------------------------- static geometry ----------------------------
  var rng = mulberry32(0xA70107);

  var clouds = [
    { x: 118 + (rng() - 0.5) * 8, y: 24, s: 1.0, ph: rng() * TAU },
    { x: 212 + (rng() - 0.5) * 8, y: 52, s: 0.8, ph: rng() * TAU },
    { x: 262 + (rng() - 0.5) * 8, y: 18, s: 0.7, ph: rng() * TAU }
  ];

  var trees = [
    { x: 352, top: 3, lean: 2, ph: 0.4, xo: [], strands: [] },
    { x: 440, top: 8, lean: -2, ph: 2.1, xo: [], strands: [] }
  ];
  trees.forEach(function (tr) {
    var i;
    for (i = 0; i < 7; i++) { tr.xo.push((i % 2 ? 1 : -1) * (2.5 + rng() * 3)); }
    for (i = 0; i < 6; i++) { tr.strands.push({ i: i, len: 8 + rng() * 6, side: i % 2 ? 1 : -1 }); }
  });

  var soilDots = [];
  (function () {
    var i;
    for (i = 0; i < 9; i++) {
      soilDots.push({ x: 318 + rng() * 156, y: 54 + rng() * 22, r: 2 + rng() * 1.8 });
    }
  })();

  var reeds = [];
  [[20, 80], [400, 460]].forEach(function (c) {
    var i;
    for (i = 0; i < 6; i++) {
      reeds.push({
        bx: c[0] + rng() * (c[1] - c[0]),
        by: 326 + rng() * 8,
        ty: 34 + rng() * 38,
        lean: (rng() - 0.5) * 16,
        bend: (rng() - 0.5) * 10,
        ph: rng() * TAU,
        amp: 4 + rng() * 3.5,
        cat: rng() < 0.5,
        leafU: 0.25 + rng() * 0.4,
        leafDir: rng() < 0.5 ? -1 : 1,
        light: rng() < 0.5
      });
    }
  });

  var pebbles = [];
  (function () {
    var cols = ['#d4cfe6', '#a9bfd6', '#efdcba', '#97a6c4', '#e0b095'];
    var i;
    for (i = 0; i < 16; i++) {
      pebbles.push({
        x: 8 + rng() * 464, y: 332 + rng() * 20,
        rx: 4.5 + rng() * 5, ry: 3 + rng() * 2.6,
        c: cols[Math.floor(rng() * cols.length)]
      });
    }
  })();

  var mudDots = [];
  (function () {
    var i;
    for (i = 0; i < 12; i++) {
      mudDots.push({ x: rng() * W, y: 328 + rng() * 30, rx: 3 + rng() * 4, ry: 1.5 + rng() * 1.5 });
    }
  })();

  // canal bed edge (static Path2D objects, logical coords)
  var bedFill = new Path2D();
  var bedEdge = new Path2D();
  (function () {
    var pts = [];
    var x;
    for (x = -20; x <= 500; x += 40) { pts.push([x, 318 + rng() * 8]); }
    var i, mx, my;
    bedEdge.moveTo(pts[0][0], pts[0][1]);
    bedFill.moveTo(pts[0][0], pts[0][1]);
    for (i = 1; i < pts.length - 1; i++) {
      mx = (pts[i][0] + pts[i + 1][0]) / 2;
      my = (pts[i][1] + pts[i + 1][1]) / 2;
      bedEdge.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      bedFill.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    bedFill.lineTo(500, 380);
    bedFill.lineTo(-20, 380);
    bedFill.closePath();
  })();

  var padSpecs = [
    { x: 90, rx: 24, flower: false },
    { x: 160, rx: 26, flower: true },
    { x: 250, rx: 21, flower: false }
  ];

  // ------------------------------ helpers -------------------------------
  function waveY(x, t) {
    return SURF + 1.6 * Math.sin(x * 0.045 + t * 1.6) + 0.8 * Math.sin(x * 0.11 - t * 1.1);
  }

  function ell(p, cx, cy, rx, ry, rot) {
    rot = rot || 0;
    p.moveTo(cx + rx * Math.cos(rot), cy + rx * Math.sin(rot));
    p.ellipse(cx, cy, rx, ry, rot, 0, TAU);
  }

  // outlined fill: outline drawn at 2x width first (outside half stays), fill covers inner half
  function blob(p, fill, lw) {
    ctx.lineWidth = 2 * (lw || LW);
    ctx.strokeStyle = OUT;
    ctx.stroke(p);
    ctx.fillStyle = fill;
    ctx.fill(p);
  }

  // simple fill then centred stroke
  function shape(p, fill, lw) {
    ctx.fillStyle = fill;
    ctx.fill(p);
    ctx.lineWidth = lw || LW;
    ctx.strokeStyle = OUT;
    ctx.stroke(p);
  }

  // list of {p, w, c, ol}: all outlines first (merge nicely), then colours
  function inkMany(segs) {
    var i, s;
    ctx.strokeStyle = OUT;
    for (i = 0; i < segs.length; i++) {
      s = segs[i];
      ctx.lineWidth = s.w + 2 * s.ol;
      ctx.stroke(s.p);
    }
    for (i = 0; i < segs.length; i++) {
      s = segs[i];
      ctx.lineWidth = s.w;
      ctx.strokeStyle = s.c;
      ctx.stroke(s.p);
    }
  }

  function seg(p, w, c, ol) { return { p: p, w: w, c: c, ol: ol == null ? 2.6 : ol }; }

  function line(x1, y1, x2, y2) {
    var p = new Path2D();
    p.moveTo(x1, y1);
    p.lineTo(x2, y2);
    return p;
  }

  // ------------------------------ scenery -------------------------------
  function drawSky(t) {
    var g = ctx.createLinearGradient(0, 0, 0, SURF + 4);
    g.addColorStop(0, '#4fc3ff');
    g.addColorStop(1, '#c4f1ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, SURF + 6);

    // sun with rounded rays
    var sx = 38, sy = 32, sr = 13, i, a, segs = [];
    for (i = 0; i < 8; i++) {
      a = i * TAU / 8 + t * 0.25;
      segs.push(seg(line(sx + Math.cos(a) * (sr + 6), sy + Math.sin(a) * (sr + 6),
                         sx + Math.cos(a) * (sr + 11), sy + Math.sin(a) * (sr + 11)),
                    3.2, '#ffb52e', 2.3));
    }
    inkMany(segs);
    var sun = new Path2D();
    ell(sun, sx, sy, sr, sr);
    shape(sun, '#ffe14a', LW);
    var sh = new Path2D();
    sh.arc(sx - 4, sy - 4, 5, Math.PI * 1.05, Math.PI * 1.6);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke(sh);

    // clouds
    clouds.forEach(function (c) {
      var cx = c.x + 6 * Math.sin(TAU * t / 24 + c.ph);
      var p = new Path2D();
      ell(p, 0, 2, 8, 8);
      ell(p, 11, -4, 11, 11);
      ell(p, 24, -1, 9, 9);
      ell(p, 33, 3, 7, 7);
      ell(p, 16, 6, 24, 6);
      ctx.save();
      ctx.translate(cx, c.y);
      ctx.scale(c.s, c.s);
      blob(p, '#ffffff', LW / c.s);
      var hl = new Path2D();
      hl.arc(11, -4, 7, Math.PI * 1.1, Math.PI * 1.55);
      ctx.lineWidth = 2.2 / c.s;
      ctx.strokeStyle = '#cfeeff';
      ctx.stroke(hl);
      ctx.restore();
    });
  }

  function drawTree(tr, t) {
    var i, sw;
    var n = 7;
    var step = (26 - tr.top) / (n - 1);
    var sway = 2.2 * Math.sin(TAU * t / 4 + tr.ph);
    var trunk = new Path2D();
    trunk.moveTo(tr.x, 44);
    trunk.quadraticCurveTo(tr.x + tr.lean * 0.5, 32, tr.x + tr.lean + sway * 0.3, 18);

    // drooping willow strands (behind foliage)
    var segs = [seg(trunk, 4.6, '#a56a3b', 3)];
    tr.strands.forEach(function (s) {
      var yy = 26 - s.i * step;
      var f = 1 - yy / 40;
      var bx = tr.x + tr.xo[s.i] + sway * f + s.side * (9 - s.i * 0.35);
      var p = new Path2D();
      p.moveTo(bx, yy + 1);
      p.quadraticCurveTo(bx + s.side * 4, yy + s.len * 0.5, bx + s.side * 1.5 + sway * 0.4, yy + s.len);
      segs.push(seg(p, 2.8, '#35b342', 2.2));
    });
    inkMany(segs);

    // foliage column
    var fol = new Path2D();
    for (i = 0; i < n; i++) {
      var yy2 = 26 - i * step;
      sw = sway * (1 - yy2 / 40);
      ell(fol, tr.x + tr.xo[i] + sw, yy2, 10 - i * 0.35, 6.2);
    }
    blob(fol, '#43c74d', LW * 0.85);
    var hl = new Path2D();
    ell(hl, tr.x - 6 + sway * 0.4, 14, 2.4, (26 - tr.top) * 0.28, 0.08);
    ctx.fillStyle = '#9af27a';
    ctx.fill(hl);
  }

  function drawBank(t) {
    var i;
    drawTree(trees[0], t);
    drawTree(trees[1], t);

    var soil = new Path2D();
    soil.moveTo(486, 84);
    soil.lineTo(486, 40);
    soil.lineTo(336, 40);
    soil.bezierCurveTo(314, 40, 306, 56, 303, 68);
    soil.bezierCurveTo(301, 76, 298, 80, 296, 84);
    soil.closePath();
    shape(soil, '#a2623a', LW);

    // soil details (clipped by painting inside the bank only)
    ctx.save();
    ctx.clip(soil);
    ctx.fillStyle = '#7f4a2a';
    for (i = 0; i < soilDots.length; i++) {
      var d = soilDots[i];
      var dp = new Path2D();
      ell(dp, d.x, d.y, d.r, d.r * 0.75);
      ctx.fill(dp);
    }
    var strata = new Path2D();
    strata.moveTo(300, 64);
    strata.quadraticCurveTo(360, 60, 400, 65);
    strata.quadraticCurveTo(440, 70, 490, 62);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#7f4a2a';
    ctx.stroke(strata);
    ctx.restore();

    // grass cap with scalloped edge
    var gr = new Path2D();
    gr.moveTo(326, 41);
    gr.quadraticCurveTo(326, 33, 335, 33);
    gr.lineTo(486, 33);
    gr.lineTo(486, 46);
    var x;
    for (x = 486; x > 330; x -= 12) {
      gr.quadraticCurveTo(x - 6, 54, x - 12, 46);
    }
    gr.quadraticCurveTo(325, 46, 326, 41);
    gr.closePath();
    shape(gr, '#63d94f', LW);
    var gh = line(344, 38, 410, 38);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#a6f58a';
    ctx.stroke(gh);
  }

  function waterPath(t) {
    var p = new Path2D();
    var x;
    p.moveTo(-5, 380);
    p.lineTo(-5, waveY(-5, t));
    for (x = 0; x <= 485; x += 8) { p.lineTo(x, waveY(x, t)); }
    p.lineTo(485, 380);
    p.closePath();
    return p;
  }

  function drawWater(t) {
    var g = ctx.createLinearGradient(0, SURF, 0, 330);
    g.addColorStop(0, '#55e4d8');
    g.addColorStop(0.45, '#1cb6cc');
    g.addColorStop(1, '#0a5c98');
    ctx.fillStyle = g;
    ctx.fill(waterPath(t));
  }

  function drawRays(t) {
    var specs = [[120, 30, 0.4], [250, 38, 2.0], [372, 26, 4.1]];
    specs.forEach(function (s) {
      var dx = 6 * Math.sin(TAU * t / 8 + s[2]);
      var a = 0.12 + 0.05 * Math.sin(TAU * t / 6 + s[2]);
      var g = ctx.createLinearGradient(0, SURF, 0, 300);
      g.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      var p = new Path2D();
      p.moveTo(s[0] + dx, SURF + 3);
      p.lineTo(s[0] + s[1] + dx, SURF + 3);
      p.lineTo(s[0] + s[1] + dx - 70, 300);
      p.lineTo(s[0] + dx - 70, 300);
      p.closePath();
      ctx.fillStyle = g;
      ctx.fill(p);
    });
  }

  function drawBed() {
    var g = ctx.createLinearGradient(0, 316, 0, 360);
    g.addColorStop(0, '#b78552');
    g.addColorStop(1, '#8c5e3a');
    ctx.fillStyle = g;
    ctx.fill(bedFill);
    ctx.lineWidth = LW;
    ctx.strokeStyle = OUT;
    ctx.stroke(bedEdge);

    ctx.save();
    ctx.translate(0, 4.5);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#e0b07a';
    ctx.stroke(bedEdge);
    ctx.restore();

    var i, d, p;
    ctx.fillStyle = 'rgba(110,70,40,0.55)';
    for (i = 0; i < mudDots.length; i++) {
      d = mudDots[i];
      p = new Path2D();
      ell(p, d.x, d.y, d.rx, d.ry);
      ctx.fill(p);
    }
    for (i = 0; i < pebbles.length; i++) {
      d = pebbles[i];
      p = new Path2D();
      ell(p, d.x, d.y, d.rx, d.ry);
      shape(p, d.c, 2.6);
      var hp = new Path2D();
      ell(hp, d.x - d.rx * 0.3, d.y - d.ry * 0.4, d.rx * 0.32, d.ry * 0.25);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fill(hp);
    }
  }

  function drawReeds(t) {
    reeds.forEach(function (r) {
      var sway = r.amp * Math.sin(TAU * t / 4 + r.ph);
      var tx = r.bx + r.lean + sway;
      var ty = r.ty;
      var cx = r.bx + r.lean * 0.4 + r.bend + sway * 0.45;
      var cy = (r.by + ty) / 2;
      var len = Math.sqrt((tx - r.bx) * (tx - r.bx) + (ty - r.by) * (ty - r.by));

      function q(u) {
        var a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
        return [a * r.bx + b * cx + c * tx, a * r.by + b * cy + c * ty];
      }

      var stalk = new Path2D();
      stalk.moveTo(r.bx, r.by);
      stalk.quadraticCurveTo(cx, cy, tx, ty);

      var lb = q(r.leafU);
      var leaf = new Path2D();
      leaf.moveTo(lb[0], lb[1]);
      leaf.quadraticCurveTo(lb[0] + r.leafDir * 2, lb[1] - 18,
                            lb[0] + r.leafDir * 22 + sway * 0.4, lb[1] - 26);

      var segs = [
        seg(stalk, 3.6, r.light ? '#63d247' : '#45b83e', 2.5),
        seg(leaf, 3.2, '#86e660', 2.4)
      ];
      if (r.cat) {
        var u0 = 1 - 16 / len;
        var a0 = q(u0), a1 = q(1);
        segs.push(seg(line(a0[0], a0[1], a1[0], a1[1]), 6.4, '#9a5426', 2.6));
      }
      inkMany(segs);
    });
  }

  function drawHaze(t) {
    ctx.fillStyle = 'rgba(40,200,215,0.12)';
    ctx.fill(waterPath(t));
  }

  function drawSurface(t) {
    var p = new Path2D();
    var x;
    p.moveTo(-5, waveY(-5, t));
    for (x = 0; x <= 485; x += 8) { p.lineTo(x, waveY(x, t)); }
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = 'rgba(236,255,252,0.95)';
    ctx.stroke(p);
  }

  function drawPads(t) {
    padSpecs.forEach(function (s) {
      var y = waveY(s.x, t) - 1;
      var slope = (waveY(s.x + 3, t) - waveY(s.x - 3, t)) / 6;
      ctx.save();
      ctx.translate(s.x, y);
      ctx.rotate(Math.atan(slope));

      if (s.flower) {
        var order = [-155, -25, -125, -55, -90];
        var i, p;
        for (i = 0; i < order.length; i++) {
          p = new Path2D();
          p.moveTo(0, 0);
          p.quadraticCurveTo(-6.5, -8, 0, -17);
          p.quadraticCurveTo(6.5, -8, 0, 0);
          p.closePath();
          ctx.save();
          ctx.translate(2, -3);
          ctx.rotate((order[i] + 90) * Math.PI / 180);
          shape(p, i === 4 ? '#ffb4dc' : '#ff82bf', 2.8);
          if (i === 4) {
            ctx.lineWidth = 1.8;
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.stroke(line(-1.8, -6, -1.4, -12));
          }
          ctx.restore();
        }
        var c = new Path2D();
        ell(c, 2, -4, 3.2, 3.2);
        shape(c, '#ffe14a', 2.4);
      }

      var pad = new Path2D();
      ell(pad, 0, 0, s.rx, 5.2);
      shape(pad, '#47ce5a', LW * 0.9);
      var hl = new Path2D();
      ell(hl, -s.rx * 0.3, -1.8, s.rx * 0.36, 1.2);
      ctx.fillStyle = '#a2f58c';
      ctx.fill(hl);
      ctx.restore();
    });
  }

  // ------------------------------ axolotl -------------------------------
  var PINK = '#ffb7cf';
  var PINK_FAR = '#f58fb0';
  var FIN = '#ffd9e6';
  var BELLY = '#ffe3ed';

  function axoPos(t) {
    var cyc = TAU * t / 16;
    return {
      x: 240 + 110 * Math.sin(cyc),
      y: 210 + 15 * Math.sin(TAU * t / 3),
      face: Math.cos(cyc) >= 0 ? 1 : -1
    };
  }

  function gill(bx, by, ang, len, bend, tfl, phase, cStem, cFil) {
    var a = ang + 0.13 * Math.sin(tfl + phase);
    var tx = bx + Math.cos(a) * len;
    var ty = by + Math.sin(a) * len;
    var nx = -Math.sin(a), ny = Math.cos(a);
    var b = bend + 3 * Math.sin(tfl + phase + 1.2);
    var cx = (bx + tx) / 2 + nx * b;
    var cy = (by + ty) / 2 + ny * b;

    var stem = new Path2D();
    stem.moveTo(bx, by);
    stem.quadraticCurveTo(cx, cy, tx, ty);
    var segs = [seg(stem, 6, cStem, 3)];

    function pt(u) {
      var m = 1 - u;
      return [m * m * bx + 2 * u * m * cx + u * u * tx, m * m * by + 2 * u * m * cy + u * u * ty];
    }
    function tan(u) {
      return Math.atan2(2 * (1 - u) * (cy - by) + 2 * u * (ty - cy),
                        2 * (1 - u) * (cx - bx) + 2 * u * (tx - cx));
    }

    var us = [0.35, 0.6, 0.82];
    var k, sd, u, p0, fa, fl, fp;
    for (k = 0; k < us.length; k++) {
      u = us[k];
      p0 = pt(u);
      for (sd = -1; sd <= 1; sd += 2) {
        fa = tan(u) + sd * (0.95 - 0.25 * u) + 0.22 * Math.sin(tfl + phase + u * 4 + sd);
        fl = 13 * (1.05 - u * 0.55);
        fp = line(p0[0], p0[1], p0[0] + Math.cos(fa) * fl, p0[1] + Math.sin(fa) * fl);
        segs.push(seg(fp, 3.2, cFil, 2.4));
      }
    }
    for (sd = -1; sd <= 1; sd += 2) {
      fa = tan(1) + sd * 0.38 + 0.18 * Math.sin(tfl + phase + 5 + sd);
      fp = line(tx, ty, tx + Math.cos(fa) * 8, ty + Math.sin(fa) * 8);
      segs.push(seg(fp, 3.2, cFil, 2.4));
    }
    inkMany(segs);
  }

  function leg(bx, by, ang, len, color) {
    var ex = bx + Math.cos(ang) * len;
    var ey = by + Math.sin(ang) * len;
    var segs = [seg(line(bx, by, ex, ey), 8, color, 3.1)];
    var d;
    for (d = -1; d <= 1; d++) {
      var ta = ang + d * 0.6;
      segs.push(seg(line(ex, ey, ex + Math.cos(ta) * 8.5, ey + Math.sin(ta) * 8.5), 4.2, color, 2.6));
    }
    inkMany(segs);
  }

  function eye(cx, cy, r, blink) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, blink);
    var p = new Path2D();
    ell(p, 0, 0, r, r);
    ctx.fillStyle = '#1b1535';
    ctx.fill(p);
    var g1 = new Path2D();
    ell(g1, r * 0.3, -r * 0.35, r * 0.38, r * 0.38);
    ctx.fillStyle = '#ffffff';
    ctx.fill(g1);
    var g2 = new Path2D();
    ell(g2, -r * 0.35, r * 0.35, r * 0.17, r * 0.17);
    ctx.fill(g2);
    ctx.restore();
  }

  function drawAxolotl(t) {
    var pos = axoPos(t);
    var tilt = 0.12 * Math.cos(TAU * t / 3);
    var swim = TAU * t / 1.2;     // tail / leg cycle
    var tfl = TAU * t / 0.8;      // gill flutter
    var i, p;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(pos.face * 0.95, 0.95);
    ctx.rotate(tilt);

    // far gills (behind everything)
    gill(6, -16, Math.PI + 1.4, 28, 4, tfl, 0.3, '#e8507f', '#f26b92');
    gill(4, -8, Math.PI + 0.95, 32, 4, tfl, 1.6, '#e8507f', '#f26b92');
    gill(6, 0, Math.PI + 0.5, 26, 4, tfl, 2.9, '#e8507f', '#f26b92');

    // legs (behind body): far pair darker
    leg(8, 15, Math.PI / 2 - 0.2 + 0.35 * Math.sin(swim + Math.PI), 14, PINK_FAR);
    leg(-14, 17, Math.PI / 2 + 0.5 + 0.35 * Math.sin(swim), 14, PINK_FAR);
    leg(18, 15, Math.PI / 2 - 0.2 + 0.35 * Math.sin(swim), 15, PINK);
    leg(-24, 17, Math.PI / 2 + 0.5 + 0.35 * Math.sin(swim + Math.PI), 15, PINK);

    // tail geometry (wave travels body -> tip)
    var N = 14;
    var topC = [], topF = [], botC = [], botF = [];
    var s, cx, cy, hc, ft, fb;
    for (i = 0; i <= N; i++) {
      s = i / N;
      cx = -30 - 44 * s;
      cy = 4 + 11 * s * Math.sin(swim - 4.5 * s);
      hc = 2 + 11 * Math.pow(1 - s, 1.1);
      ft = 2 + 9 * Math.sin(Math.PI * Math.pow(s, 0.8));
      fb = 2 + 7 * Math.sin(Math.PI * Math.pow(s, 0.8));
      topC.push([cx, cy - hc]);
      topF.push([cx, cy - hc - ft]);
      botC.push([cx, cy + hc]);
      botF.push([cx, cy + hc + fb]);
    }

    // union silhouette: tail + body + head (all clockwise so winding unions)
    var sil = new Path2D();
    sil.moveTo(topF[N][0], topF[N][1]);
    for (i = N; i >= 0; i--) { sil.lineTo(topF[i][0], topF[i][1]); }
    for (i = 0; i <= N; i++) { sil.lineTo(botF[i][0], botF[i][1]); }
    sil.closePath();
    ell(sil, -8, 4, 37, 19);
    ell(sil, 26, -1, 27, 22);
    blob(sil, PINK, LW);

    // fin bands (lighter) + fin rays + core edge
    var i0 = 3;
    var bandT = new Path2D(), bandB = new Path2D();
    bandT.moveTo(topC[i0][0], topC[i0][1]);
    bandB.moveTo(botC[i0][0], botC[i0][1]);
    for (i = i0 + 1; i <= N; i++) { bandT.lineTo(topC[i][0], topC[i][1]); bandB.lineTo(botC[i][0], botC[i][1]); }
    for (i = N; i >= i0; i--) { bandT.lineTo(topF[i][0], topF[i][1]); bandB.lineTo(botF[i][0], botF[i][1]); }
    bandT.closePath();
    bandB.closePath();
    ctx.fillStyle = FIN;
    ctx.fill(bandT);
    ctx.fill(bandB);

    var rays = new Path2D();
    var ri = [5, 8, 11];
    for (i = 0; i < ri.length; i++) {
      rays.moveTo(topC[ri[i]][0], topC[ri[i]][1]);
      rays.lineTo(topF[ri[i]][0], topF[ri[i]][1]);
      rays.moveTo(botC[ri[i]][0], botC[ri[i]][1]);
      rays.lineTo(botF[ri[i]][0], botF[ri[i]][1]);
    }
    for (i = i0; i <= N; i++) {
      if (i === i0) { rays.moveTo(topC[i][0], topC[i][1]); } else { rays.lineTo(topC[i][0], topC[i][1]); }
    }
    for (i = i0; i <= N; i++) {
      if (i === i0) { rays.moveTo(botC[i][0], botC[i][1]); } else { rays.lineTo(botC[i][0], botC[i][1]); }
    }
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(236,120,160,0.65)';
    ctx.stroke(rays);

    // belly, highlights, freckles
    p = new Path2D();
    ell(p, -6, 14, 26, 6.2, 0.03);
    ctx.fillStyle = BELLY;
    ctx.fill(p);

    p = new Path2D();
    ell(p, -16, -9, 12, 3, -0.08);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fill(p);

    p = new Path2D();
    ell(p, 17, -16, 7, 2.8, -0.35);
    ctx.fill(p);

    ctx.fillStyle = 'rgba(236,120,160,0.55)';
    var fr = [[-20, 1, 1.7], [-29, -4, 1.5], [-12, 5, 1.4]];
    for (i = 0; i < fr.length; i++) {
      p = new Path2D();
      ell(p, fr[i][0], fr[i][1], fr[i][2], fr[i][2]);
      ctx.fill(p);
    }

    // near gills (in front of body, sprouting from the cheek)
    gill(3, -12, Math.PI + 1.15, 34, 5, tfl, 0.0, '#ff5f8d', '#ff7fa6');
    gill(1, -3, Math.PI + 0.65, 37, 5, tfl, 1.2, '#ff5f8d', '#ff7fa6');
    gill(3, 7, Math.PI + 0.15, 31, 5, tfl, 2.4, '#ff5f8d', '#ff7fa6');

    // face
    p = new Path2D();
    ell(p, 27, 9, 5, 3.3);
    ell(p, 44, 8, 4, 2.7);
    ctx.fillStyle = 'rgba(255,100,148,0.5)';
    ctx.fill(p);

    var mouth = new Path2D();
    mouth.moveTo(28, 10);
    mouth.quadraticCurveTo(38, 13, 49, 7);
    mouth.quadraticCurveTo(38, 22, 28, 10);
    mouth.closePath();
    ctx.fillStyle = '#e8567e';
    ctx.fill(mouth);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = OUT;
    ctx.stroke(mouth);
    var ticks = new Path2D();
    ticks.moveTo(28, 10); ticks.lineTo(26.4, 7.6);
    ticks.moveTo(49, 7); ticks.lineTo(50.4, 4.6);
    ctx.lineWidth = 2;
    ctx.stroke(ticks);

    var blink = (t % 4.6) < 0.14 ? 0.12 : 1;
    eye(28, -6, 6.4, blink);
    eye(42, -7, 5.3, blink);

    ctx.restore();
  }

  // ------------------------------ bubbles --------------------------------
  function drawBubbles(t) {
    var kmax = Math.floor(t / 0.7);
    var k, count = 0;
    for (k = kmax; k > kmax - 14 && count < 10; k--) {
      var tk = k * 0.7;
      var age = t - tk;
      var h = mulberry32(k * 7919 + 17);
      var r0 = 2.6 + h() * 3;
      var ph = h() * TAU;
      var sp = axoPos(tk);
      var ox = sp.x + sp.face * 49;
      var oy = sp.y + 4;
      var by = oy - 40 * age;
      if (by <= SURF) { break; }
      var bx = ox + 6 * Math.sin(TAU * age / 1.3 + ph) * Math.min(1, 0.2 + age * 0.8);
      var r = r0 * (0.7 + 0.3 * Math.min(1, age * 2));
      var p = new Path2D();
      ell(p, bx, by, r, r);
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.fill(p);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(43,35,80,0.85)';
      ctx.stroke(p);
      var g = new Path2D();
      ell(g, bx - r * 0.36, by - r * 0.36, r * 0.26, r * 0.26);
      ctx.fillStyle = '#ffffff';
      ctx.fill(g);
      count++;
    }
  }

  // ------------------------------- frame ---------------------------------
  function draw(t) {
    // re-apply context state every frame (canvas resize resets it)
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);

    drawSky(t);
    drawBank(t);
    drawWater(t);
    drawRays(t);
    drawBed();
    drawReeds(t);
    drawHaze(t);
    drawAxolotl(t);
    drawBubbles(t);
    drawSurface(t);
    drawPads(t);
  }

  // ----------------------------- sizing/loop -----------------------------
  var curT = 0;
  var last = null;
  var raf = 0;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var bw = Math.max(1, Math.round(canvas.clientWidth * dpr));
    var bh = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    draw(curT);
  }

  function frame() {
    raf = window.requestAnimationFrame(frame);
    var now = performance.now();
    if (last === null) { last = now; }
    var dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
    last = now;
    curT += dt;
    draw(curT);
  }

  function apply() {
    if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
    last = null;
    if (mq && mq.matches) {
      curT = T_STATIC;
      draw(curT);
    } else {
      raf = window.requestAnimationFrame(frame);
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  if (mq) {
    if (mq.addEventListener) { mq.addEventListener('change', apply); }
    else if (mq.addListener) { mq.addListener(apply); }
  }

  resize();
  apply();
})();
