/* Raven Matrix Trainer — core engine.
 *
 * Puzzle families register themselves with RM.register(). RM.build(familyId,
 * seed, variant) turns a family into a concrete puzzle: 8 matrix panels, 8
 * answer options (exactly one correct), an explanation and the reason each
 * wrong option fails.
 *
 * Options are normally built as a balanced "cube": the generator supplies the
 * correct answer plus three independent mistakes; the 8 options are every
 * combination of those mistakes. Every attribute value therefore appears in
 * exactly half of the options, so the answer cannot be found by picking the
 * "most typical" option — you have to solve the rules.
 */
(function () {
  'use strict';
  const RM = (window.RM = window.RM || {});
  RM.families = {};
  RM.familyOrder = [];

  /* ------------------------------------------------------------ random */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  RM.hash = function () {
    const s = Array.prototype.join.call(arguments, '|');
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  };
  RM.rng = function (seed) {
    const next = mulberry32(seed >>> 0);
    const r = {
      next,
      int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      chance: (p) => next() < p,
      shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          const t = a[i];
          a[i] = a[j];
          a[j] = t;
        }
        return a;
      },
      sample: (arr, k) => r.shuffle(arr).slice(0, k),
      seed: () => Math.floor(next() * 2147483647),
    };
    return r;
  };

  /* A generator throws RETRY (via RM.need) when a random draw turns out to be
   * ambiguous or ugly; RM.build then simply tries again with a new draw. */
  const RETRY = { retry: true };
  RM.RETRY = RETRY;
  RM.need = function (cond) {
    if (!cond) throw RETRY;
  };

  /* ------------------------------------------------------------ helpers */
  RM.clone = (o) => JSON.parse(JSON.stringify(o));
  RM.mod = (a, n) => ((a % n) + n) % n;
  RM.range = (n) => Array.from({ length: n }, (_, i) => i);
  RM.grid3 = (fn) => [0, 1, 2].map((r) => [0, 1, 2].map((c) => fn(r, c)));
  RM.flat = (g) => [g[0][0], g[0][1], g[0][2], g[1][0], g[1][1], g[1][2], g[2][0], g[2][1]];
  RM.sameArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  RM.cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  RM.plural = (n, w, ws) => n + ' ' + (n === 1 ? w : ws || w + 's');
  const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  RM.word = (n) => (n >= 0 && n < NUM.length ? NUM[n] : String(n));
  const fmt = (v) => Math.round(v * 100) / 100;
  RM.fmt = fmt;

  /* ------------------------------------------------------------ colours */
  const INK = '#1f2937';
  const GRAY = '#9ca3af';
  const DARK = '#4b5563';
  const LIGHT = '#d8dce2';
  const FAINT = '#e3e6ea';
  const WHITE = '#ffffff';
  Object.assign(RM, { INK, GRAY, DARK, LIGHT, FAINT, WHITE });
  const COLORS = { white: WHITE, black: INK, gray: GRAY, dark: DARK, light: LIGHT, faint: FAINT };

  const PATTERNS = {
    hatch: { kind: 'lines', angle: 45, gap: 4.2, w: 1.1 },
    hatch2: { kind: 'lines', angle: 135, gap: 4.2, w: 1.1 },
    hlines: { kind: 'lines', angle: 0, gap: 4.2, w: 1.1 },
    vlines: { kind: 'lines', angle: 90, gap: 4.2, w: 1.1 },
    grid: { kind: 'grid', angle: 0, gap: 5, w: 0.9 },
    xgrid: { kind: 'grid', angle: 45, gap: 5, w: 0.9 },
    dots: { kind: 'dots', gap: 4.4, r: 1.15 },
    checker: { kind: 'checker', gap: 8 },
    lhatch: { kind: 'lines', angle: 45, gap: 4.2, w: 1.1, ink: GRAY },
    ldots: { kind: 'dots', gap: 4.4, r: 1.15, ink: GRAY },
  };

  function patternDef(id, p) {
    const g = p.gap;
    const ink = p.ink || INK;
    const head = `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${g}" height="${g}"`;
    const bg = `<rect width="${g}" height="${g}" fill="#fff"/>`;
    if (p.kind === 'lines') {
      return `${head} patternTransform="rotate(${-p.angle})">${bg}<line x1="-1" y1="${g / 2}" x2="${g + 1}" y2="${g / 2}" stroke="${ink}" stroke-width="${p.w}"/></pattern>`;
    }
    if (p.kind === 'grid') {
      return `${head} patternTransform="rotate(${-p.angle})">${bg}<line x1="-1" y1="${g / 2}" x2="${g + 1}" y2="${g / 2}" stroke="${ink}" stroke-width="${p.w}"/><line x1="${g / 2}" y1="-1" x2="${g / 2}" y2="${g + 1}" stroke="${ink}" stroke-width="${p.w}"/></pattern>`;
    }
    if (p.kind === 'dots') {
      return `${head}>${bg}<circle cx="${g / 2}" cy="${g / 2}" r="${p.r}" fill="${ink}"/></pattern>`;
    }
    if (p.kind === 'checker') {
      const h = g / 2;
      return `${head}>${bg}<rect width="${h}" height="${h}" fill="${ink}"/><rect x="${h}" y="${h}" width="${h}" height="${h}" fill="${ink}"/></pattern>`;
    }
    throw new Error('bad pattern');
  }

  /* ------------------------------------------------------------ SVG builder */
  let uid = 0;
  class Pic {
    constructor() {
      this.id = 'q' + (uid++).toString(36);
      this.defs = new Map();
      this.parts = [];
    }
    add(s) {
      this.parts.push(s);
      return this;
    }
    def(key, make) {
      const id = this.id + '-' + key;
      if (!this.defs.has(id)) this.defs.set(id, make(id));
      return id;
    }
    /* Fill names: white, black, gray, dark, light, faint, #hex, a pattern name,
     * or "lines:<angle>:<gap>[:<width>]" for arbitrary hatching. */
    paint(f) {
      if (!f || f === 'none') return 'none';
      if (COLORS[f]) return COLORS[f];
      if (f[0] === '#') return f;
      let p = PATTERNS[f];
      if (!p && f.indexOf('lines:') === 0) {
        const a = f.split(':');
        p = { kind: 'lines', angle: +a[1], gap: +a[2], w: +(a[3] || 1.1) };
      }
      if (!p) throw new Error('unknown fill ' + f);
      const id = this.def(f.replace(/[^a-z0-9]/gi, '_'), (i) => patternDef(i, p));
      return `url(#${id})`;
    }
    svg() {
      const defs = this.defs.size ? '<defs>' + Array.from(this.defs.values()).join('') + '</defs>' : '';
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${defs}${this.parts.join('')}</svg>`;
    }
  }
  RM.Pic = Pic;

  RM.dash = function (style, sw) {
    if (style === 'dashed') return `${fmt(2.8 * sw)} ${fmt(1.9 * sw)}`;
    if (style === 'dotted') return `0.01 ${fmt(2.1 * sw)}`;
    if (style === 'longdash') return `${fmt(5 * sw)} ${fmt(2 * sw)}`;
    return '';
  };
  function strokeAttrs(o) {
    const sw = o.sw === undefined ? 2.2 : o.sw;
    let s = ` stroke="${o.stroke === undefined ? INK : o.stroke}" stroke-width="${sw}" stroke-linejoin="round"`;
    if (o.dash && o.dash !== 'solid') {
      s += ` stroke-dasharray="${RM.dash(o.dash, sw)}"`;
      s += o.dash === 'dotted' ? ' stroke-linecap="round"' : ' stroke-linecap="butt"';
    } else if (o.cap) s += ` stroke-linecap="${o.cap}"`;
    return s;
  }

  RM.line = function (pic, x1, y1, x2, y2, o) {
    o = o || {};
    const sw = o.sw === undefined ? 2.4 : o.sw;
    pic.add(
      `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}"${strokeAttrs({
        sw,
        stroke: o.color || INK,
        dash: o.dash,
        cap: o.cap || 'round',
      })}/>`
    );
  };
  RM.circle = function (pic, cx, cy, r, o) {
    o = o || {};
    pic.add(`<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="${pic.paint(o.fill || 'none')}"${strokeAttrs(o)}/>`);
  };
  RM.polyline = function (pic, pts, o) {
    o = o || {};
    pic.add(
      `<polyline points="${pts.map((p) => fmt(p[0]) + ',' + fmt(p[1])).join(' ')}" fill="none"${strokeAttrs({
        sw: o.sw === undefined ? 2.4 : o.sw,
        stroke: o.color || INK,
        dash: o.dash,
        cap: 'round',
      })}/>`
    );
  };
  RM.polygon = function (pic, pts, o) {
    o = o || {};
    pic.add(`<polygon points="${pts.map((p) => fmt(p[0]) + ',' + fmt(p[1])).join(' ')}" fill="${pic.paint(o.fill || 'white')}"${strokeAttrs(o)}/>`);
  };
  RM.frame = function (pic) {
    pic.add(`<rect x="1" y="1" width="98" height="98" fill="none" stroke="${LIGHT}" stroke-width="1"/>`);
  };

  /* ------------------------------------------------------------ shapes */
  const deg = Math.PI / 180;
  function regular(n, r, rot, dy) {
    return RM.range(n).map((i) => {
      const a = (rot + (360 * i) / n) * deg;
      return [r * Math.cos(a), r * Math.sin(a) + (dy || 0)];
    });
  }
  function star(n, r1, r2, dy) {
    return RM.range(2 * n).map((i) => {
      const a = (-90 + (180 * i) / n) * deg;
      const rr = i % 2 ? r2 : r1;
      return [rr * Math.cos(a), rr * Math.sin(a) + (dy || 0)];
    });
  }
  /* Unit shapes (radius ~1, centred). `sym` = smallest rotation (deg) that maps
   * the shape onto itself (360 = no rotational symmetry). */
  const SHAPES = {
    circle: { circle: true, sym: 1 },
    square: { pts: [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]], sym: 90 },
    triangle: { pts: [[0, -0.9], [0.97, 0.78], [-0.97, 0.78]], sym: 120 },
    diamond: { pts: [[0, -1], [0.78, 0], [0, 1], [-0.78, 0]], sym: 180 },
    pentagon: { pts: regular(5, 1, -90, 0.08), sym: 72 },
    hexagon: { pts: regular(6, 1, -90, 0), sym: 60 },
    octagon: { pts: regular(8, 1, -67.5, 0), sym: 45 },
    star5: { pts: star(5, 1, 0.42, 0.08), sym: 72 },
    star4: { pts: star(4, 1, 0.38, 0), sym: 90 },
    star6: { pts: star(6, 1, 0.56, 0), sym: 60 },
    cross: {
      pts: [[-0.3, -0.92], [0.3, -0.92], [0.3, -0.3], [0.92, -0.3], [0.92, 0.3], [0.3, 0.3], [0.3, 0.92], [-0.3, 0.92], [-0.3, 0.3], [-0.92, 0.3], [-0.92, -0.3], [-0.3, -0.3]],
      sym: 90,
    },
    arrow: { pts: [[0, -1], [0.72, -0.2], [0.27, -0.2], [0.27, 1], [-0.27, 1], [-0.27, -0.2], [-0.72, -0.2]], sym: 360 },
    flag: { pts: [[-0.62, 1], [-0.62, -1], [0.82, -0.52], [-0.4, -0.06], [-0.4, 1]], sym: 360 },
    house: { pts: [[0, -1], [0.86, -0.2], [0.86, 0.9], [-0.86, 0.9], [-0.86, -0.2]], sym: 360 },
    kite: { pts: [[0, -1], [0.68, -0.32], [0, 1], [-0.68, -0.32]], sym: 360 },
    trapezoid: { pts: [[-0.48, -0.64], [0.48, -0.64], [1, 0.64], [-1, 0.64]], sym: 360 },
    parallelogram: { pts: [[-0.38, -0.62], [1, -0.62], [0.38, 0.62], [-1, 0.62]], sym: 180 },
    bolt: { pts: [[0.28, -1], [-0.58, 0.14], [-0.06, 0.14], [-0.34, 1], [0.62, -0.2], [0.08, -0.2], [0.52, -1]], sym: 360 },
    chevron: { pts: [[-0.92, 0.2], [0, -0.68], [0.92, 0.2], [0.92, 0.72], [0, -0.14], [-0.92, 0.72]], sym: 360 },
    lshape: { pts: [[-0.72, -0.96], [-0.18, -0.96], [-0.18, 0.42], [0.76, 0.42], [0.76, 0.96], [-0.72, 0.96]], sym: 360 },
    tshape: {
      pts: [[-0.92, -0.86], [0.92, -0.86], [0.92, -0.36], [0.26, -0.36], [0.26, 0.92], [-0.26, 0.92], [-0.26, -0.36], [-0.92, -0.36]],
      sym: 360,
    },
    hourglass: { pts: [[-0.76, -0.92], [0.76, -0.92], [0.1, 0], [0.76, 0.92], [-0.76, 0.92], [-0.1, 0]], sym: 180 },
    heart: {
      path: [['M', 0, 0.92], ['C', -1.38, 0, -0.78, -1.18, 0, -0.46], ['C', 0.78, -1.18, 1.38, 0, 0, 0.92], ['Z']],
      sym: 360,
    },
    crescent: {
      path: [['M', 0.55, -0.97], ['A', 1, 1, 0, 1, 0, 0.55, 0.97], ['A', 1.25, 1.25, 0, 0, 1, 0.55, -0.97], ['Z']],
      sym: 360,
    },
    semicircle: { path: [['M', -1, 0.45], ['A', 1, 1, 0, 0, 1, 1, 0.45], ['Z']], sym: 360 },
    drop: {
      path: [['M', 0, -1], ['C', 0.45, -0.45, 0.76, -0.05, 0.76, 0.3], ['A', 0.76, 0.76, 0, 0, 1, -0.76, 0.3], ['C', -0.76, -0.05, -0.45, -0.45, 0, -1], ['Z']],
      sym: 360,
    },
    ring: {
      path: [['M', -1, 0], ['A', 1, 1, 0, 1, 0, 1, 0], ['A', 1, 1, 0, 1, 0, -1, 0], ['Z'], ['M', -0.5, 0], ['A', 0.5, 0.5, 0, 1, 0, 0.5, 0], ['A', 0.5, 0.5, 0, 1, 0, -0.5, 0], ['Z']],
      evenodd: true,
      sym: 1,
    },
  };
  RM.SHAPES = SHAPES;
  RM.ASYM_SHAPES = ['arrow', 'flag', 'house', 'kite', 'trapezoid', 'bolt', 'chevron', 'lshape', 'tshape', 'heart', 'crescent', 'semicircle', 'drop'];

  function tf(x, y, o) {
    x *= o.fx || 1;
    y *= o.fy || 1;
    const a = (o.rot || 0) * deg;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [o.cx + o.r * (x * c - y * s), o.cy + o.r * (x * s + y * c)];
  }
  function pathD(cmds, o) {
    const flip = (o.fx || 1) * (o.fy || 1) < 0;
    return cmds
      .map((c) => {
        if (c[0] === 'Z') return 'Z';
        if (c[0] === 'A') {
          const p = tf(c[5], c[6], o);
          const sweep = flip ? 1 - c[4] : c[4];
          return `A${fmt(c[1] * o.r)} ${fmt(c[2] * o.r)} 0 ${c[3]} ${sweep} ${fmt(p[0])} ${fmt(p[1])}`;
        }
        const out = [];
        for (let i = 1; i < c.length; i += 2) out.push(tf(c[i], c[i + 1], o).map(fmt).join(' '));
        return c[0] + out.join(' ');
      })
      .join('');
  }

  /* Draw a named shape. opt: fill, stroke, sw, rot (deg clockwise), dash, fx/fy (mirror). */
  RM.shape = function (pic, name, cx, cy, r, opt) {
    opt = opt || {};
    const sh = SHAPES[name];
    if (!sh) throw new Error('unknown shape ' + name);
    const o = { cx, cy, r, rot: opt.rot || 0, fx: opt.fx || 1, fy: opt.fy || 1 };
    const fill = pic.paint(opt.fill || 'white');
    const st = strokeAttrs(opt);
    if (sh.circle) pic.add(`<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="${fill}"${st}/>`);
    else if (sh.pts) pic.add(`<polygon points="${sh.pts.map((p) => tf(p[0], p[1], o).map(fmt).join(',')).join(' ')}" fill="${fill}"${st}/>`);
    else pic.add(`<path d="${pathD(sh.path, o)}" fill="${fill}"${sh.evenodd ? ' fill-rule="evenodd"' : ''}${st}/>`);
  };
  /* Polygon points of a named polygonal shape (used by a few families). */
  RM.shapePoints = function (name, cx, cy, r, rot) {
    return SHAPES[name].pts.map((p) => tf(p[0], p[1], { cx, cy, r, rot: rot || 0 }));
  };

  /* ------------------------------------------------------------ vocabulary */
  RM.NAMES = {
    circle: 'circle', square: 'square', triangle: 'triangle', diamond: 'diamond', pentagon: 'pentagon',
    hexagon: 'hexagon', octagon: 'octagon', star5: 'five-pointed star', star4: 'four-pointed star',
    star6: 'six-pointed star', cross: 'cross', arrow: 'arrow', flag: 'flag', house: 'house shape', kite: 'kite',
    trapezoid: 'trapezoid', parallelogram: 'parallelogram', bolt: 'lightning bolt', chevron: 'chevron',
    lshape: 'L-shape', tshape: 'T-shape', hourglass: 'hourglass', heart: 'heart', crescent: 'crescent',
    semicircle: 'half-disc', drop: 'drop', ring: 'ring',
  };
  RM.FILLS = {
    white: 'white', black: 'black', gray: 'grey', dark: 'dark grey', light: 'light grey', hatch: 'diagonal hatching',
    hatch2: 'reverse hatching', hlines: 'horizontal stripes', vlines: 'vertical stripes', grid: 'grid pattern',
    xgrid: 'cross-hatching', dots: 'dotted pattern', checker: 'checkerboard', lhatch: 'light hatching', ldots: 'light dots',
  };
  RM.nm = (k) => RM.NAMES[k] || k;
  RM.fn = (k) => RM.FILLS[k] || k;
  RM.list = (arr) => (arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1]);
  const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  RM.compass = (k8) => COMPASS[RM.mod(k8, 8)];
  RM.turn = function (steps, unit) {
    unit = unit || 45;
    const d = steps * unit;
    if (RM.mod(d, 360) === 0) return 'no rotation';
    if (RM.mod(d, 360) === 180) return 'a half turn (180°)';
    return Math.abs(d) + '° ' + (d > 0 ? 'clockwise' : 'anticlockwise');
  };

  /* Standard positions for n identical items in a panel. */
  RM.countLayout = function (n) {
    const L = {
      1: [[[50, 50]], 24],
      2: [[[29, 50], [71, 50]], 16],
      3: [[[50, 29], [29, 69], [71, 69]], 15],
      4: [[[29, 29], [71, 29], [29, 71], [71, 71]], 14],
      5: [[[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]], 12],
      6: [[[22, 33], [50, 33], [78, 33], [22, 67], [50, 67], [78, 67]], 11],
      7: [[[50, 50], [50, 20], [76, 35], [76, 65], [50, 80], [24, 65], [24, 35]], 10],
      8: [[[20, 20], [50, 20], [80, 20], [20, 50], [80, 50], [20, 80], [50, 80], [80, 80]], 10],
      9: [[[20, 20], [50, 20], [80, 20], [20, 50], [50, 50], [80, 50], [20, 80], [50, 80], [80, 80]], 10],
    };
    const e = L[n];
    if (!e) throw new Error('countLayout ' + n);
    return { pts: e[0], r: e[1] };
  };

  /* ------------------------------------------------------------ rule checks
   * A 3x3 grid g[r][c] of attribute values with g[2][2] unknown. We list many
   * plausible rules a solver might try; every rule that fits rows 1–2 (or
   * columns 1–2) gives a prediction. A puzzle is accepted only if every
   * fitting rule predicts the intended value, so there is never a second
   * defensible answer. */
  function key(v) {
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  function distinct3(a) {
    return key(a[0]) !== key(a[1]) && key(a[0]) !== key(a[2]) && key(a[1]) !== key(a[2]);
  }
  function sameSet(a, b) {
    return a.map(key).sort().join('#') === b.map(key).sort().join('#');
  }
  function col(g, c) {
    return [g[0][c], g[1][c], g[2][c]];
  }
  function categoricalPreds(g) {
    const P = [];
    const k = key;
    // constant rows / columns
    if (k(g[0][0]) === k(g[0][1]) && k(g[0][1]) === k(g[0][2]) && k(g[1][0]) === k(g[1][1]) && k(g[1][1]) === k(g[1][2]) && k(g[2][0]) === k(g[2][1]))
      P.push(['row-constant', g[2][0]]);
    if ([0, 1].every((c) => k(g[0][c]) === k(g[1][c]) && k(g[1][c]) === k(g[2][c])) && k(g[0][2]) === k(g[1][2])) P.push(['column-constant', g[0][2]]);
    // distribution of three along rows / columns
    if (distinct3(g[0]) && distinct3(g[1]) && sameSet(g[0], g[1])) {
      const rest = g[0].filter((v) => k(v) !== k(g[2][0]) && k(v) !== k(g[2][1]));
      if (rest.length === 1 && k(g[2][0]) !== k(g[2][1])) P.push(['row-latin', rest[0]]);
    }
    const c0 = col(g, 0);
    const c1 = col(g, 1);
    if (distinct3(c0) && distinct3(c1) && sameSet(c0, c1)) {
      const rest = c0.filter((v) => k(v) !== k(g[0][2]) && k(v) !== k(g[1][2]));
      if (rest.length === 1 && k(g[0][2]) !== k(g[1][2])) P.push(['column-latin', rest[0]]);
    }
    // third panel copies the first / second
    if ([0, 1].every((r) => k(g[r][2]) === k(g[r][0]))) P.push(['copy-first', g[2][0]]);
    if ([0, 1].every((r) => k(g[r][2]) === k(g[r][1]))) P.push(['copy-second', g[2][1]]);
    if ([0, 1].every((c) => k(g[2][c]) === k(g[0][c]))) P.push(['column-copy-first', g[0][2]]);
    if ([0, 1].every((c) => k(g[2][c]) === k(g[1][c]))) P.push(['column-copy-second', g[1][2]]);
    // diagonals
    const diag = (f) => {
      const cls = {};
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) {
          if (r === 2 && c === 2) continue;
          const d = f(r, c);
          if (cls[d] === undefined) cls[d] = k(g[r][c]);
          else if (cls[d] !== k(g[r][c])) return false;
        }
      return true;
    };
    if (diag((r, c) => RM.mod(c - r, 3))) P.push(['diagonal', g[0][0]]);
    if (diag((r, c) => (r + c) % 3)) P.push(['anti-diagonal', g[0][1]]);
    return P;
  }
  function numericPreds(g, m) {
    const N = (v) => (m ? RM.mod(v, m) : v);
    const P = [];
    const fns = [
      ['sum', (a, b) => a + b],
      ['difference', (a, b) => a - b],
      ['reverse difference', (a, b) => b - a],
      ['progression', (a, b) => 2 * b - a],
    ];
    if (!m) {
      fns.push(['absolute difference', (a, b) => Math.abs(a - b)]);
      fns.push(['max', Math.max]);
      fns.push(['min', Math.min]);
      fns.push(['product', (a, b) => a * b]);
    }
    for (const [name, f] of fns) {
      if ([0, 1].every((r) => N(f(g[r][0], g[r][1])) === N(g[r][2]))) P.push(['row ' + name, N(f(g[2][0], g[2][1]))]);
      if ([0, 1].every((c) => N(f(g[0][c], g[1][c])) === N(g[2][c]))) P.push(['column ' + name, N(f(g[0][2], g[1][2]))]);
    }
    if (!m) {
      const s0 = g[0][0] + g[0][1] + g[0][2];
      const s1 = g[1][0] + g[1][1] + g[1][2];
      if (s0 === s1) P.push(['row total', s0 - g[2][0] - g[2][1]]);
      const t0 = g[0][0] + g[1][0] + g[2][0];
      const t1 = g[0][1] + g[1][1] + g[2][1];
      if (t0 === t1) P.push(['column total', t0 - g[0][2] - g[1][2]]);
    }
    const gn = g.map((row) => row.map((v) => (v === undefined ? v : N(v))));
    categoricalPreds(gn).forEach((p) => P.push(p));
    return P;
  }
  RM.preds = { categorical: categoricalPreds, numeric: numericPreds };
  /* true if at least one listed rule fits the grid and every fitting rule
   * predicts `want`. With allowNone, a grid that follows a rule outside the
   * list (no fitting rule at all) is also accepted. */
  RM.unique = function (g, want, kind, m, allowNone) {
    const P = kind === 'numeric' ? numericPreds(g, m) : categoricalPreds(g);
    const w = kind === 'numeric' && m ? key(RM.mod(want, m)) : key(want);
    return (allowNone || P.length > 0) && P.every((p) => key(p[1]) === w);
  };
  RM.needUnique = function (g, want, kind, m) {
    RM.need(RM.unique(g, want, kind, m));
  };
  /* For attributes driven by a rule the checker does not know (e.g. bounces):
   * no simple rule may fit rows 1–2 and predict something else. */
  RM.needNoConflict = function (g, want, kind, m) {
    RM.need(RM.unique(g, want, kind, m, true));
  };

  /* Latin-square helper: value index for cell (r,c) with a row shift `a`
   * (1 or 2) and an offset. Different `a` gives differently oriented squares. */
  RM.latin = (r, c, a, off) => (c + a * r + (off || 0)) % 3;
  /* A random Latin square over three values (orientation and offset drawn once). */
  RM.latinGrid = function (rng, vals) {
    const a = rng.pick([1, 2]);
    const off = rng.int(0, 2);
    return RM.grid3((r, c) => vals[RM.latin(r, c, a, off)]);
  };

  /* ------------------------------------------------------------ boolean logic */
  RM.BOOL = {
    xor: { f: (a, b) => a !== b, text: 'an element appears in the 3rd panel only if it is in <b>exactly one</b> of the first two (elements present in both cancel out)' },
    or: { f: (a, b) => a || b, text: 'the 3rd panel is the <b>superposition</b> of the first two (everything present in either panel)' },
    and: { f: (a, b) => a && b, text: 'the 3rd panel keeps <b>only what is common</b> to the first two panels' },
    andnot: { f: (a, b) => a && !b, text: 'the 3rd panel is the 1st panel <b>minus</b> everything that appears in the 2nd' },
    notand: { f: (a, b) => !a && b, text: 'the 3rd panel is the 2nd panel <b>minus</b> everything that appears in the 1st' },
    xnor: { f: (a, b) => a === b, text: 'an element is present in the 3rd panel when the first two <b>agree</b> (both present or both absent)' },
  };
  /* all 16 two-input boolean functions, as truth tables [f00,f01,f10,f11] */
  RM.ALL_BOOL = RM.range(16).map((m) => (a, b) => !!(m & (1 << ((a ? 2 : 0) + (b ? 1 : 0)))));

  /* ------------------------------------------------------------ registry & builder */
  RM.register = function (fam) {
    RM.families[fam.id] = fam;
    RM.familyOrder.push(fam.id);
  };

  RM.build = function (famId, seed, variant) {
    const fam = RM.families[famId];
    if (!fam) throw new Error('unknown family ' + famId);
    for (let attempt = 0; attempt < 600; attempt++) {
      const rng = RM.rng(RM.hash(famId, seed, attempt));
      let g;
      try {
        g = fam.generate(rng, variant === undefined ? rng.int(0, 3) : variant);
      } catch (e) {
        if (e === RETRY) continue;
        throw e;
      }
      let opts;
      if (g.options) {
        opts = g.options.map((o) => ({ spec: o.spec, flaws: o.flaws || [] }));
      } else {
        opts = [];
        for (let mask = 0; mask < 8; mask++) {
          let spec = RM.clone(g.answer);
          const flaws = [];
          let ok = true;
          g.perturb.forEach((p, i) => {
            if (!ok || !(mask & (1 << i))) return;
            const s2 = p.apply(RM.clone(spec), rng);
            if (!s2) ok = false;
            else {
              spec = s2;
              flaws.push(p.why);
            }
          });
          if (!ok) break;
          opts.push({ spec, flaws });
        }
        if (opts.length !== 8) continue;
      }
      const keyOf = g.key || ((s) => JSON.stringify(s));
      const keys = opts.map((o) => keyOf(o.spec));
      if (new Set(keys).size !== opts.length) continue;
      const answerKey = keyOf(g.answer);
      const options = rng.shuffle(opts);
      const answerIndex = options.findIndex((o) => keyOf(o.spec) === answerKey);
      if (answerIndex < 0) continue;
      let panels;
      try {
        panels = g.panels.map((s) => g.render(s));
      } catch (e) {
        if (e === RETRY) continue;
        throw e;
      }
      return {
        famId,
        seed,
        variant,
        name: g.name || fam.name,
        difficulty: g.difficulty || fam.difficulty,
        reading: g.reading || 'rows',
        panels,
        options: options.map((o) => g.render(o.spec)),
        answerIndex,
        flaws: options.map((o) => o.flaws),
        rules: g.rules,
        hint: g.hint || null,
        attempts: attempt + 1,
      };
    }
    throw new Error('could not generate ' + famId + ' seed ' + seed);
  };
})();
