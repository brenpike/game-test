(function () {
  'use strict';

  // ---------------------------------------------------------------
  // Pixel art axolotl canal. Whole scene is drawn into a 160x120
  // offscreen buffer (spec coords / 3), then upscaled with smoothing off.
  // ---------------------------------------------------------------

  var BW = 160, BH = 120;          // buffer size (spec 480x360 / 3)
  var SURF = 27;                   // water surface row (spec y80 / 3)
  var BED = 108;                   // canal bed base row (spec y~320 / 3)
  var STEP_FPS = 10;               // animation quantized to ~10fps
  var T_STATIC = 14;               // frame time for reduced motion

  // 16-colour palette
  var PAL = [
    '#7cc4e6', // 0 sky top
    '#c4eaf0', // 1 sky low / pale highlight
    '#58bcc4', // 2 water 1 (light)
    '#3c9bb0', // 3 water 2
    '#2a7a98', // 4 water 3
    '#1d5478', // 5 water 4 (deep)
    '#4d3b33', // 6 mud
    '#806a58', // 7 mud light / pebble
    '#6e4a34', // 8 soil
    '#62ac4c', // 9 grass
    '#2f7a3d', // 10 grass dark
    '#f8b8cc', // 11 pink body
    '#e68aa9', // 12 pink shade
    '#c94a76', // 13 gill / outline
    '#3b1f35', // 14 dark (eyes, mouth)
    '#fffaf2'  // 15 white
  ];
  var SKY0 = 0, SKY1 = 1, W1 = 2, W2 = 3, W4 = 5, MUD = 6, MUDLT = 7, SOIL = 8,
      GRASS = 9, GRASSDK = 10, PINK = 11, SHADE = 12, GILL = 13, DARK = 14, WHITE = 15;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bayer(x, y) { return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16; }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  var cv = document.getElementById('scene');
  if (!cv || !cv.getContext) { return; }
  var ctx = cv.getContext('2d');
  if (!ctx) { return; }

  var bg = document.createElement('canvas');
  bg.width = BW; bg.height = BH;
  var bgc = bg.getContext('2d');
  var buf = document.createElement('canvas');
  buf.width = BW; buf.height = BH;
  var bc = buf.getContext('2d');

  // current draw target + colour cache
  var g = bgc, cur = -1;
  function use(c) { g = c; cur = -1; }
  function px(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= BW || y >= BH) { return; }
    if (c !== cur) { g.fillStyle = PAL[c]; cur = c; }
    g.fillRect(x, y, 1, 1);
  }

  // ---------------------------------------------------------------
  // Static scene (baked once, seeded)
  // ---------------------------------------------------------------
  var rng = mulberry32(0xA7010C);
  var bedTop = [];
  var bankX0 = 98;
  var reeds = [];

  function bakeSky() {
    var x, y, f;
    for (y = 0; y < SURF; y++) {
      f = clamp01(((y / (SURF - 1)) - 0.25) / 0.5);
      for (x = 0; x < BW; x++) { px(x, y, f > bayer(x, y) ? SKY1 : SKY0); }
    }
  }

  function bakeWater() {
    var x, y, v, s, i, fr, f, lvl;
    for (y = SURF; y < BH; y++) {
      v = clamp01((y - SURF) / (BED + 2 - SURF));
      s = v * 3;
      i = Math.min(2, Math.floor(s));
      fr = s - i;
      f = clamp01((fr - 0.3) / 0.4);
      for (x = 0; x < BW; x++) {
        lvl = i + (f > bayer(x, y) ? 1 : 0);
        px(x, y, W1 + lvl);
      }
    }
  }

  function bakeBank() {
    var x, y, x0, r;
    for (y = 13; y < SURF; y++) {
      x0 = 104 - Math.round((y - 13) * 0.42) + (rng() < 0.3 ? 1 : 0);
      for (x = x0; x < BW; x++) {
        if (y === 13) { px(x, y, GRASS); }
        else if (y === 14) { px(x, y, GRASSDK); }
        else {
          r = rng();
          px(x, y, r < 0.08 ? MUD : (r < 0.15 ? MUDLT : SOIL));
        }
      }
      px(x0, y, MUD);
      if (y === SURF - 1) { bankX0 = x0; }
    }
    for (x = bankX0 + 1; x < BW; x++) {
      if (rng() < 0.2) { px(x, 12, GRASS); }
    }
    // soil lip just below the waterline, crumbling edge
    for (x = bankX0; x < BW; x++) {
      px(x, SURF, x === bankX0 ? MUD : SOIL);
      px(x, SURF + 1, rng() < 0.12 ? MUD : SOIL);
      if (x > bankX0 + 2 && rng() < 0.6) { px(x, SURF + 2, MUD); }
      if (x > bankX0 + 4 && rng() < 0.2) { px(x, SURF + 3, MUD); }
    }
  }

  function bakeTree(x) {
    var y, hw, xx, s, len, j;
    for (y = 4; y <= 12; y++) { px(x, y, SOIL); }
    for (y = 0; y <= 10; y++) {
      hw = (y < 2 || y > 9) ? 1 : 2;
      for (xx = x - hw; xx <= x + hw; xx++) {
        if (rng() < 0.88) { px(xx, y, rng() < 0.5 ? GRASSDK : GRASS); }
      }
    }
    for (s = -1; s <= 1; s += 2) {
      len = 3 + Math.floor(rng() * 3);
      for (j = 0; j < len; j++) { px(x + s * 3, 5 + j, j % 2 ? GRASS : GRASSDK); }
    }
  }

  function bakeBed() {
    var x, y, t, i, bx, by;
    for (x = 0; x < BW; x++) {
      t = BED + Math.round(rng() * 1.4) + Math.round(1.2 * Math.sin(x * 0.19));
      bedTop[x] = t;
      for (y = t; y < BH; y++) { px(x, y, MUD); }
      if (rng() < 0.3) { px(x, t, MUDLT); }
    }
    for (i = 0; i < 16; i++) {
      bx = Math.floor(rng() * (BW - 2));
      by = bedTop[bx] + 1 + Math.floor(rng() * (BH - bedTop[bx] - 3));
      px(bx, by, MUDLT); px(bx + 1, by, MUDLT);
      px(bx + 1, by + 1, DARK);
    }
  }

  function makeReeds() {
    var clusters = [[8, 26], [134, 152]], c, i, n = 6, bx, base;
    for (c = 0; c < clusters.length; c++) {
      for (i = 0; i < n; i++) {
        bx = Math.round(clusters[c][0] + (clusters[c][1] - clusters[c][0]) * i / (n - 1) + (rng() - 0.5) * 2);
        bx = Math.max(0, Math.min(BW - 1, bx));
        base = bedTop[bx];
        reeds.push({
          x: bx, base: base,
          top: 17 + Math.floor(rng() * 8),
          ph: rng() * 0.7,
          head: rng() < 0.5,
          col: rng() < 0.5 ? GRASSDK : GRASS,
          leafAt: 0.25 + rng() * 0.25,
          leafDir: rng() < 0.5 ? -1 : 1
        });
      }
    }
  }

  function bake() {
    use(bgc);
    bakeSky();
    bakeWater();
    bakeBank();
    bakeTree(115);
    bakeTree(143);
    bakeBed();
    makeReeds();
  }

  // ---------------------------------------------------------------
  // Dynamic pieces
  // ---------------------------------------------------------------
  function ripple(tq) {
    var st = Math.floor(tq * 3), x, v;
    for (x = 0; x < bankX0; x++) {
      v = (x + st) & 15;
      if (v < 3) { px(x, SURF, WHITE); }
      v = (x - st + 8) & 15;
      if (v < 2) { px(x, SURF + 1, SKY1); }
    }
  }

  function pad(cx, w, flower) {
    var hw = Math.floor(w / 2), x;
    for (x = cx - hw + 2; x <= cx + hw - 2; x++) {
      px(x, SURF - 1, GRASS);
      px(x, SURF + 1, GRASSDK);
    }
    for (x = cx - hw; x <= cx + hw; x++) {
      px(x, SURF, (x === cx - hw || x === cx + hw) ? GRASSDK : GRASS);
    }
    px(cx - 2, SURF - 1, GRASSDK); // vein
    px(cx + 2, SURF, W1); px(cx + 3, SURF, W1);          // notch
    if (flower) {
      px(cx - 1, 23, SHADE); px(cx + 1, 23, SHADE);
      px(cx - 2, 24, SHADE); px(cx - 1, 24, PINK); px(cx, 24, WHITE);
      px(cx + 1, 24, PINK); px(cx + 2, 24, SHADE);
      px(cx - 1, 25, GILL); px(cx, 25, PINK); px(cx + 1, 25, GILL);
    }
  }

  function pads() {
    pad(30, 11, false);
    pad(53, 13, true);
    pad(83, 11, false);
  }

  function drawReeds(tq) {
    var sw = 2 * Math.PI * tq / 4, i, r, y, h, off, len, yl, x;
    for (i = 0; i < reeds.length; i++) {
      r = reeds[i];
      len = r.base - r.top;
      for (y = r.top; y <= r.base; y++) {
        h = (r.base - y) / len;
        off = Math.round(2.6 * h * h * Math.sin(sw + r.ph));
        px(r.x + off, y, r.col);
        if (r.head && y < r.top + 3) { px(r.x + off, y, SOIL); }
      }
      yl = Math.round(r.base - r.leafAt * len);
      h = r.leafAt;
      off = Math.round(2.6 * h * h * Math.sin(sw + r.ph));
      x = r.x + off;
      px(x + r.leafDir, yl, GRASS);
      px(x + 2 * r.leafDir, yl - 1, GRASS);
      px(x + 3 * r.leafDir, yl - 2, GRASS);
    }
  }

  // ---------------------------------------------------------------
  // Axolotl (facing right in local space; mirrored by face)
  // ---------------------------------------------------------------
  function pose(t) {
    var a = 2 * Math.PI * t / 16;
    return {
      x: (240 + 110 * Math.sin(a)) / 3,
      y: (210 + 15 * Math.sin(2 * Math.PI * t / 3)) / 3,
      face: Math.cos(a) >= 0 ? 1 : -1
    };
  }

  // head + torso, 24 x 10. local x = col - 4, local y = row - 6
  var BODY = [
    '...........PPPPPPPP.....',
    '.......PPPPPPPPPPPPPPP..',
    '....PPPPPPPPPPPPPPPPPPP.',
    '..PPPPPPPPPPPPPPDWPPPPPP',
    'PPPPPPPPPPPPPPPPDDPPPPPP',
    'PPPPPPPPPPPPPPPPPPPPPPPP',
    'PPPPPPPPPPPPBBDPPPPPPPDP',
    'PPPPPPPPPPPPPPPDDDDDDDPP',
    'SSSSSSSSSSSSPPPPPPPPPP..',
    '.SSSSSSSSSSSSSSSSSSS....'
  ];
  var CH = { P: PINK, S: SHADE, D: DARK, W: WHITE, B: GILL };

  var GILLS_NEAR = [
    { bx: 8, by: -5, dx: -0.15, dy: -1, L: 9, ph: 0 },
    { bx: 7, by: -4, dx: -0.8, dy: -0.8, L: 10, ph: 1.2 },
    { bx: 6, by: -3, dx: -1, dy: -0.25, L: 9, ph: 2.4 }
  ];
  var GILLS_FAR = [
    { bx: 11, by: -5, dx: 0.1, dy: -1, L: 7, ph: 3.1 },
    { bx: 10, by: -5, dx: -0.5, dy: -1, L: 8, ph: 4.3 },
    { bx: 8, by: -4, dx: -1, dy: -0.6, L: 8, ph: 5.5 }
  ];

  var GW = 56, GH = 32, GX = 28, GY = 16;
  var grid = new Uint8Array(GW * GH);
  function gs(x, y, c) {
    var ix = x + GX, iy = y + GY;
    if (ix < 0 || iy < 0 || ix >= GW || iy >= GH) { return; }
    grid[iy * GW + ix] = c + 1;
  }
  function ga(ix, iy) {
    if (ix < 0 || iy < 0 || ix >= GW || iy >= GH) { return 0; }
    return grid[iy * GW + ix];
  }

  function gill(gl, col, tip, gillPh, cx, cy, f) {
    var wave = Math.sin(gillPh + gl.ph), j, k, fl, sw, x, y, horiz = Math.abs(gl.dx) > Math.abs(gl.dy);
    for (j = 0; j <= gl.L; j++) {
      sw = 1.4 * (j / gl.L) * wave;
      x = Math.round(gl.bx + gl.dx * j - gl.dy * sw);
      y = Math.round(gl.by + gl.dy * j + gl.dx * sw);
      px(cx + f * x, cy + y, j === gl.L ? tip : col);
      if (j >= 2 && j < gl.L && j % 2 === 0) {
        fl = j >= 5 ? 2 : 1;
        for (k = 1; k <= fl; k++) {
          if (horiz) {
            px(cx + f * x, cy + y - k, col); px(cx + f * x, cy + y + k, col);
          } else {
            px(cx + f * (x - k), cy + y, col); px(cx + f * (x + k), cy + y, col);
          }
        }
      }
    }
  }

  function leg(x0, sw, top, toe) {
    gs(x0, 4, top); gs(x0 + 1, 4, top);
    gs(x0 + sw, 5, toe); gs(x0 + 1 + sw, 5, toe);
  }

  function drawAxolotl(tq) {
    var p = pose(tq), cx = Math.round(p.x), cy = Math.round(p.y), f = p.face;
    var tailPh = 2 * Math.PI * tq / 1.2, gillPh = 2 * Math.PI * tq / 0.8;
    var i, r, c, u, w, top, bot, x, y, v, ch, ix, iy;

    // far-side gills (behind body)
    for (i = 0; i < GILLS_FAR.length; i++) { gill(GILLS_FAR[i], SHADE, SHADE, gillPh + Math.PI, cx, cy, f); }

    grid.fill(0);

    // far legs
    leg(12, Math.round(Math.sin(tailPh + Math.PI)), SHADE, SHADE);
    leg(3, Math.round(Math.sin(tailPh)), SHADE, SHADE);

    // tail with fin
    for (i = 1; i <= 16; i++) {
      u = i / 16;
      w = Math.round(3.2 * u * Math.sin(tailPh - 2.4 * u));
      x = -4 - i;
      top = -2 + Math.round(2.2 * u) + w;
      bot = 3 - Math.round(2.2 * u) + w;
      for (y = top; y <= bot; y++) { gs(x, y, y >= bot - (i <= 3 ? 1 : 0) ? SHADE : PINK); }
      if (i >= 3 && i <= 15) { gs(x, top - 1, SHADE); }
      if (i >= 2 && i <= 15) { gs(x, bot + 1, SHADE); }
    }

    // head + torso
    for (r = 0; r < BODY.length; r++) {
      for (c = 0; c < 24; c++) {
        ch = BODY[r].charAt(c);
        if (ch !== '.') { gs(c - 4, r - 6, CH[ch]); }
      }
    }

    // near legs
    leg(8, Math.round(Math.sin(tailPh)), PINK, SHADE);
    leg(-2, Math.round(Math.sin(tailPh + Math.PI)), PINK, SHADE);

    // flush with 1px outline
    for (iy = 0; iy < GH; iy++) {
      for (ix = 0; ix < GW; ix++) {
        v = ga(ix, iy);
        if (v) {
          px(cx + f * (ix - GX), cy + (iy - GY), v - 1);
        } else if (ga(ix - 1, iy) || ga(ix + 1, iy) || ga(ix, iy - 1) || ga(ix, iy + 1)) {
          px(cx + f * (ix - GX), cy + (iy - GY), GILL);
        }
      }
    }

    // near-side gills
    for (i = 0; i < GILLS_NEAR.length; i++) { gill(GILLS_NEAR[i], GILL, SHADE, gillPh, cx, cy, f); }
  }

  // ---------------------------------------------------------------
  // Bubbles: bubble k spawns at t = k * 0.7 from the head
  // ---------------------------------------------------------------
  function drawBubbles(tq) {
    var kMax = Math.floor(tq / 0.7), kMin = Math.max(0, kMax - 9), k, ts, age, p, x0, y0, x, y, r, drawn = 0;
    for (k = kMax; k >= kMin && drawn < 10; k--) {
      ts = k * 0.7;
      age = tq - ts;
      p = pose(ts);
      r = mulberry32(1000 + k);
      x0 = p.x + p.face * 21;
      y0 = p.y + 1;
      y = y0 - (40 / 3) * age;
      if (y <= SURF + 1) { continue; }
      x = x0 + 1.6 * Math.sin(2 * Math.PI * age * 0.7 + r() * 6.283);
      drawn++;
      if (r() < 0.5) {
        px(x, y, WHITE);
      } else {
        px(x, y - 1, WHITE); px(x - 1, y, WHITE); px(x + 1, y, WHITE); px(x, y + 1, WHITE);
      }
    }
  }

  // ---------------------------------------------------------------
  // Frame + blit
  // ---------------------------------------------------------------
  function blit() {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(buf, 0, 0, BW, BH, 0, 0, cv.width, cv.height);
  }

  var lastT = T_STATIC;
  function render(t) {
    var tq = Math.floor(t * STEP_FPS + 1e-6) / STEP_FPS;
    lastT = t;
    bc.drawImage(bg, 0, 0);
    use(bc);
    ripple(tq);
    pads();
    drawReeds(tq);
    drawAxolotl(tq);
    drawBubbles(tq);
    blit();
  }

  function resize() {
    var vw = window.innerWidth || document.documentElement.clientWidth || BW;
    var vh = window.innerHeight || document.documentElement.clientHeight || BH;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var fit = Math.max(1, Math.min(vw / 4, vh / 3));
    var cw = fit * 4, ch = fit * 3, devW = cw * dpr;
    var s = Math.floor(devW / BW), bw, bh, cssW, cssH;
    if (s >= 1 && s * BW >= 0.9 * devW) {
      // integer scale, crisp
      bw = s * BW; bh = s * BH; cssW = bw / dpr; cssH = bh / dpr;
    } else {
      bw = Math.max(1, Math.round(devW)); bh = Math.max(1, Math.round(bw * 3 / 4));
      cssW = cw; cssH = ch;
    }
    cv.width = bw; cv.height = bh;
    cv.style.width = cssW + 'px';
    cv.style.height = cssH + 'px';
    ctx.imageSmoothingEnabled = false; // resize resets context state
    render(lastT);
  }

  // ---------------------------------------------------------------
  // Loop
  // ---------------------------------------------------------------
  var mql = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduced = !!(mql && mql.matches);
  var tAbs = 0, lastNow = 0, lastStep = -1, raf = 0;

  function frame(now) {
    var dt = (now - lastNow) / 1000, step;
    lastNow = now;
    if (!(dt > 0)) { dt = 0; }
    if (dt > 0.05) { dt = 0.05; }
    tAbs += dt;
    step = Math.floor(tAbs * STEP_FPS);
    if (step !== lastStep) { lastStep = step; render(step / STEP_FPS); }
    raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (raf) { return; }
    lastNow = performance.now();
    raf = window.requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
  }
  function applyMotionPref() {
    reduced = !!(mql && mql.matches);
    if (reduced) { stop(); render(T_STATIC); } else { start(); }
  }

  bake();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  if (mql) {
    if (mql.addEventListener) { mql.addEventListener('change', applyMotionPref); }
    else if (mql.addListener) { mql.addListener(applyMotionPref); }
  }
  if (reduced) { render(T_STATIC); } else { start(); }
})();
