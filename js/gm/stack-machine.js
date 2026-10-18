/* Stack machine (grandmaster): column 1 is a stack of tokens in an open tube, column 2 a little program (a tape
 * read left to right: a cell with a heavy black bar pushes its token on top, each abstract glyph is an unknown
 * stack instruction), column 3 the stack after running the program. The three glyphs have hidden meanings drawn
 * from POP, DUP, SWAP, OVER, ROT, REVERSE and DROP-BOTTOM that must be decoded from rows 1–2 and then executed on
 * row 3. Uniqueness is checked against 17 candidate meanings per glyph × both reading directions × push on top /
 * at the bottom. */
(function () {
  'use strict';
  const RM = window.RM;

  /* ---------------------------------------------------------------- tokens */
  const SHP = ['circle', 'square', 'triangle', 'diamond', 'cross', 'star5'];
  const SHP_NAME = ['circle', 'square', 'triangle', 'diamond', 'cross', 'star'];
  const FIL = ['black', 'white', 'gray'];
  const FIL_NAME = ['black', 'white', 'grey'];
  const RSC = { circle: 0.86, square: 1, triangle: 1.02, diamond: 1, cross: 0.98, star5: 1.18 };
  const tokShape = (t) => SHP[Math.floor(t / 3)];
  const tokFill = (t) => FIL[t % 3];
  const tokName = (t) => FIL_NAME[t % 3] + ' ' + SHP_NAME[Math.floor(t / 3)];
  function drawTok(pic, t, x, y, R, sw) {
    const s = tokShape(t);
    RM.shape(pic, s, x, y, R * RSC[s], { fill: tokFill(t), sw: sw || 1.8 });
  }

  /* ---------------------------------------------------------------- instructions */
  // Every meaning a solver could reasonably attribute to a glyph (hypothesis space). The first 7 are the real ones.
  const OPS = {
    POP: (s) => (s.length >= 1 ? s.slice(0, -1) : null),
    DUP: (s) => (s.length >= 1 ? s.concat([s[s.length - 1]]) : null),
    SWAP: (s) => (s.length >= 2 ? s.slice(0, -2).concat([s[s.length - 1], s[s.length - 2]]) : null),
    OVER: (s) => (s.length >= 2 ? s.concat([s[s.length - 2]]) : null),
    ROT: (s) => {
      const n = s.length;
      return n >= 3 ? s.slice(0, -3).concat([s[n - 2], s[n - 1], s[n - 3]]) : null;
    },
    REV: (s) => (s.length >= 1 ? s.slice().reverse() : null),
    DROPB: (s) => (s.length >= 1 ? s.slice(1) : null),
    NIP: (s) => (s.length >= 2 ? s.slice(0, -2).concat([s[s.length - 1]]) : null),
    TUCK: (s) => {
      const n = s.length;
      return n >= 2 ? s.slice(0, -2).concat([s[n - 1], s[n - 2], s[n - 1]]) : null;
    },
    NROT: (s) => {
      const n = s.length;
      return n >= 3 ? s.slice(0, -3).concat([s[n - 1], s[n - 3], s[n - 2]]) : null;
    },
    B2T: (s) => (s.length >= 2 ? s.slice(1).concat([s[0]]) : null),
    T2B: (s) => (s.length >= 2 ? [s[s.length - 1]].concat(s.slice(0, -1)) : null),
    DUPB: (s) => (s.length >= 1 ? s.concat([s[0]]) : null),
    NOP: (s) => s,
    DUP2: (s) => (s.length >= 2 ? s.concat(s.slice(-2)) : null),
    SWAPB: (s) => (s.length >= 2 ? [s[1], s[0]].concat(s.slice(2)) : null),
    XEND: (s) => (s.length >= 2 ? [s[s.length - 1]].concat(s.slice(1, -1), [s[0]]) : null),
  };
  const ALL = Object.keys(OPS);
  const REAL = ['POP', 'DUP', 'SWAP', 'OVER', 'ROT', 'REV', 'DROPB'];
  const HARD = ['OVER', 'ROT', 'REV', 'DROPB'];
  const ALT = ['POP', 'DUP', 'SWAP', 'OVER', 'ROT', 'REV', 'DROPB', 'NIP', 'B2T', 'T2B'];
  const DESC = {
    POP: 'remove the top token',
    DUP: 'copy the top token onto the top',
    SWAP: 'swap the two top tokens',
    OVER: 'copy the second token onto the top',
    ROT: 'pull the third token out and put it on top',
    REV: 'turn the whole stack upside down',
    DROPB: 'remove the bottom token',
    NIP: 'remove the second token',
    B2T: 'move the bottom token to the top',
    T2B: 'move the top token to the bottom',
  };
  const SHORT = { POP: 'POP', DUP: 'DUP', SWAP: 'SWAP', OVER: 'OVER', ROT: 'ROT', REV: 'REVERSE', DROPB: 'DROP-BOTTOM' };

  /* ---------------------------------------------------------------- glyphs */
  const GLYPHS = ['eye', 'arch', 'zig', 'comb', 'knot'];
  const GNAME = { eye: 'ringed dot', arch: 'double arch', zig: 'zig-zag', comb: 'comb', knot: 'bow' };
  function drawGlyph(pic, kind, x, y, h, sw) {
    // h = half-size of the glyph box
    const o = { sw, cap: 'round' };
    if (kind === 'eye') {
      RM.circle(pic, x, y, h * 0.85, { sw });
      RM.circle(pic, x, y, h * 0.28, { fill: 'black', sw: 0 });
    } else if (kind === 'arch') {
      const f = RM.fmt;
      const a = (r) => `M${f(x - r)} ${f(y + h * 0.55)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y + h * 0.55)}`;
      pic.add(`<path d="${a(h * 0.95)}${a(h * 0.45)}" fill="none" stroke="${RM.INK}" stroke-width="${sw}" stroke-linecap="round"/>`);
    } else if (kind === 'zig') {
      const pts = [0, 1, 2, 3, 4].map((i) => [x - h + (i * 2 * h) / 4, y + (i % 2 ? -h * 0.6 : h * 0.6)]);
      RM.polyline(pic, pts, o);
    } else if (kind === 'comb') {
      RM.line(pic, x - h, y - h * 0.5, x + h, y - h * 0.5, o);
      [-1, 0, 1].forEach((k) => RM.line(pic, x + k * h * 0.85, y - h * 0.5, x + k * h * 0.85, y + h * 0.75, o));
    } else if (kind === 'knot') {
      const f = RM.fmt;
      const d = `M${f(x - h)} ${f(y - h * 0.7)}L${f(x + h)} ${f(y + h * 0.7)}L${f(x + h)} ${f(y - h * 0.7)}L${f(x - h)} ${f(y + h * 0.7)}Z`;
      pic.add(`<path d="${d}" fill="none" stroke="${RM.INK}" stroke-width="${sw}" stroke-linejoin="round"/>`);
    }
  }

  /* ---------------------------------------------------------------- inline icons for the correction */
  const ICON = (inner, w) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w || 20} 20" width="${(w || 20) * 0.8}" height="16" style="vertical-align:-3px;background:#fff;border-radius:3px">${inner}</svg>`;
  function tokIcon(t) {
    const p = new RM.Pic();
    drawTok(p, t, 10, 10, 7.4, 1.4);
    return ICON(p.parts.join(''));
  }
  function stackIcon(s) {
    const p = new RM.Pic();
    s.forEach((t, i) => drawTok(p, t, 9 + i * 16, 10, 6.6, 1.3));
    const w = Math.max(16 * s.length + 2, 18);
    RM.polyline(p, [[1, 2], [1, 19], [w - 1, 19]], { sw: 1.1, color: RM.GRAY });
    return ICON(p.parts.join(''), w);
  }

  /* ---------------------------------------------------------------- execution */
  // cells: {p: token} (push) or {g: glyph index}; mean: glyph index -> op name
  function run(stack, cells, mean, o) {
    o = o || {};
    let s = stack;
    const seq = o.rtl ? cells.slice().reverse() : cells;
    for (let i = 0; i < seq.length; i++) {
      if (i === o.skip) continue;
      const c = seq[i];
      if (c.p !== undefined) s = o.pushBottom ? [c.p].concat(s) : s.concat([c.p]);
      else {
        s = OPS[mean[c.g]](s);
        if (!s) return null;
      }
      if (o.trace) o.trace.push(s);
    }
    return s;
  }
  const skey = (s) => (s ? s.join('.') : 'x');

  RM.register({
    id: 'stack-machine',
    name: 'Stack machine',
    difficulty: 7,
    generate(rng, variant) {
      const V = [
        { len: [4, 4], init: [3, 4], hard: 2, all3: true, push12: 'any', push3: 'any', diff: 7 },
        { len: [3, 4], init: [2, 4], hard: 1, all3: false, push12: 'any', push3: 'any', diff: 6 },
        { len: [4, 4], init: [2, 4], hard: 1, all3: true, push12: 'one', push3: 'any', diff: 7 },
        { len: [4, 4], init: [3, 4], hard: 1, all3: true, push12: 'any', push3: 'none', diff: 7 },
      ][variant || 0];

      const kinds = rng.sample(GLYPHS, 3);
      const mean = rng.sample(REAL, 3);
      RM.need(mean.filter((m) => HARD.includes(m)).length >= V.hard);

      // one row: initial stack + tape, valid and with every instruction visibly changing the stack
      function makeRow(isRow3, mustGlyphs) {
        for (let tries = 0; tries < 60; tries++) {
          const len = rng.int(V.len[0], V.len[1]);
          const n0 = rng.int(V.init[0], V.init[1]);
          let np;
          if (isRow3) np = V.push3 === 'none' ? 0 : rng.int(0, Math.min(1, len - 3));
          else np = V.push12 === 'one' ? 1 : rng.int(0, 1);
          const shapes = rng.sample([0, 1, 2, 3, 4, 5], n0 + np);
          const toks = shapes.map((sh) => sh * 3 + rng.int(0, 2));
          const stack = toks.slice(0, n0);
          const cells = RM.range(len).map(() => ({ g: rng.int(0, 2) }));
          const pushAt = rng.sample(RM.range(len), np);
          pushAt.forEach((pos, k) => (cells[pos] = { p: toks[n0 + k] }));
          if (mustGlyphs && !mustGlyphs.every((gi) => cells.some((c) => c.g === gi))) continue;
          // simulate with checks
          let s = stack;
          let ok = true;
          for (const c of cells) {
            const nx = c.p !== undefined ? s.concat([c.p]) : OPS[mean[c.g]](s);
            if (!nx || nx.length < 1 || nx.length > 5 || skey(nx) === skey(s)) {
              ok = false;
              break;
            }
            s = nx;
          }
          if (!ok || skey(s) === skey(stack)) continue;
          return { stack, cells, out: s };
        }
        RM.need(false);
      }

      let r1, r2;
      for (let t = 0; ; t++) {
        RM.need(t < 40);
        r1 = makeRow(false);
        r2 = makeRow(false);
        const used = new Set();
        [r1, r2].forEach((r) => r.cells.forEach((c) => c.g !== undefined && used.add(c.g)));
        if (used.size === 3) break;
      }
      const uses = [0, 1, 2].map((gi) => [r1, r2].reduce((a, r) => a + r.cells.filter((c) => c.g === gi).length, 0));
      const once = [0, 1, 2].filter((gi) => uses[gi] === 1);
      RM.need(once.length >= 1);

      // all hypotheses (meaning of each glyph × reading direction × push side) consistent with rows 1–2
      const cons = [];
      for (const rtl of [false, true]) {
        for (const pushBottom of [false, true]) {
          const o = { rtl, pushBottom };
          const seqs = [r1, r2].map((r) => (rtl ? r.cells.slice().reverse() : r.cells));
          const h = [null, null, null];
          // depth-first: meanings are chosen when a glyph is first met, prefixes are shared
          const dfs = (ri, ci, s) => {
            const R = ri ? r2 : r1;
            const seq = seqs[ri];
            const rem = seq.length - ci;
            if (s.length - rem > R.out.length || s.length + 2 * rem < R.out.length) return;
            if (!rem) {
              if (!RM.sameArr(s, R.out)) return;
              if (ri) cons.push({ h: h.slice(), o });
              else dfs(1, 0, r2.stack);
              return;
            }
            const c = seq[ci];
            if (c.p !== undefined) return dfs(ri, ci + 1, pushBottom ? [c.p].concat(s) : s.concat([c.p]));
            if (h[c.g]) {
              const nx = OPS[h[c.g]](s);
              if (nx) dfs(ri, ci + 1, nx);
              return;
            }
            for (const m of ALL) {
              const nx = OPS[m](s);
              if (!nx) continue;
              h[c.g] = m;
              dfs(ri, ci + 1, nx);
            }
            h[c.g] = null;
          };
          dfs(0, 0, r1.stack);
        }
      }
      RM.need(cons.length >= 1);

      // row 3: ≥3 instructions, including a glyph seen only once; every consistent hypothesis must agree
      let r3 = null;
      for (let t = 0; t < 40 && !r3; t++) {
        const cand = makeRow(true, V.all3 ? [0, 1, 2] : [rng.pick(once)]);
        if (cand.cells.filter((c) => c.g !== undefined).length < 3) continue;
        if (!cand.cells.some((c) => once.includes(c.g))) continue;
        const k = skey(cand.out);
        if (cons.every((H) => skey(run(cand.stack, cand.cells, H.h, H.o)) === k)) r3 = cand;
      }
      RM.need(r3);
      const rows = [r1, r2, r3];
      const answer = { t: 'stack', s: r3.out };

      // no accidental Raven shortcut on heights
      const nPush = (r) => r.cells.filter((c) => c.p !== undefined).length;
      const nOps = (r) => r.cells.length - nPush(r);
      RM.needNoConflict(rows.map((r) => [r.stack.length, nPush(r), r.out.length]), r3.out.length, 'numeric');
      RM.needNoConflict(rows.map((r) => [r.stack.length, nOps(r), r.out.length]), r3.out.length, 'numeric');
      RM.needNoConflict(rows.map((r) => [r.stack.length, r.cells.length, r.out.length]), r3.out.length, 'numeric');

      /* ------------------------------------------------ distractors */
      const G = (gi) => GICON[gi] + ' ' + GNAME[kinds[gi]];
      const GICON = [0, 1, 2].map((gi) => {
        const p = new RM.Pic();
        drawGlyph(p, kinds[gi], 10, 10, 7, 1.8);
        return ICON(p.parts.join(''));
      });
      const ansKey = skey(r3.out);
      const cands = [];
      const add = (s, type, why) => {
        if (!s || s.length < 1 || s.length > 5 || skey(s) === ansKey) return;
        cands.push({ s, type, why });
      };
      const C3 = r3.cells;
      add(run(r3.stack, C3, mean, { rtl: true }), 'rtl', 'the program was run from right to left — it runs from left to right');
      add(r3.out.slice().reverse(), 'flip', 'these are the right tokens, but the stack is upside down (bottom and top exchanged)');
      add(run(r3.stack, C3, mean, { pushBottom: true }), 'pushb', 'the pushed token was slid in at the bottom — a push puts it on top');
      const in3 = [0, 1, 2].filter((gi) => C3.some((c) => c.g === gi));
      in3.forEach((gi) => {
        ALT.forEach((m) => {
          if (m === mean[gi]) return;
          const mm = mean.slice();
          mm[gi] = m;
          add(run(r3.stack, C3, mm), REAL.includes(m) ? 'mean' : 'mean2', `the ${G(gi)} was read as “${DESC[m]}” — it means “${DESC[mean[gi]]}”`);
        });
      });
      for (let i = 0; i < in3.length; i++) {
        for (let j = i + 1; j < in3.length; j++) {
          const mm = mean.slice();
          mm[in3[i]] = mean[in3[j]];
          mm[in3[j]] = mean[in3[i]];
          add(run(r3.stack, C3, mm), 'mix', `the meanings of the ${G(in3[i])} and the ${G(in3[j])} were mixed up`);
        }
      }
      C3.forEach((c, i) => {
        if (c.p !== undefined) add(run(r3.stack, C3, mean, { skip: i }), 'skip', `the ${tokName(c.p)} was never pushed`);
        else add(run(r3.stack, C3, mean, { skip: i }), 'skip', `step ${i + 1} (the ${G(c.g)}) was left out`);
        if (i + 1 < C3.length && skey([C3[i].p, C3[i].g]) !== skey([C3[i + 1].p, C3[i + 1].g])) {
          const sw = C3.slice();
          sw[i] = C3[i + 1];
          sw[i + 1] = C3[i];
          add(run(r3.stack, sw, mean), 'order', `steps ${i + 1} and ${i + 2} were run in the wrong order`);
        }
      });
      // dedupe (keep every reason)
      const byKey = new Map();
      cands.forEach((c) => {
        const k = skey(c.s);
        if (!byKey.has(k)) byKey.set(k, { s: c.s, type: c.type, types: [c.type], why: [c.why] });
        else if (byKey.get(k).why.length < 2 && !byKey.get(k).types.includes(c.type)) {
          byKey.get(k).why.push(c.why);
          byKey.get(k).types.push(c.type);
        }
      });
      const pool = Array.from(byKey.values());
      RM.need(pool.length >= 7);

      // pick 7: one per mistake type first, then fill; the answer must not be the "average" option
      const sim = (a, b) => a.reduce((n, t, i) => n + (b[i] === t ? 1 : 0), 0) + (a.length === b.length ? 1 : 0);
      let chosen = null;
      for (let t = 0; t < 30 && !chosen; t++) {
        const sh = rng.shuffle(pool);
        const pri = { rtl: 0, flip: 0, mix: 0, mean: 0, skip: 1, order: 1, pushb: 1, mean2: 2 };
        sh.sort((a, b) => pri[a.type] - pri[b.type]);
        const pick = [];
        const types = new Set();
        sh.forEach((c) => {
          if (pick.length < 7 && !types.has(c.type)) {
            pick.push(c);
            types.add(c.type);
          }
        });
        sh.forEach((c) => {
          if (pick.length < 7 && !pick.includes(c)) pick.push(c);
        });
        const all = [r3.out].concat(pick.map((c) => c.s));
        const tot = all.map((a, i) => all.reduce((n, b, j) => n + (i === j ? 0 : sim(a, b)), 0));
        if (tot.slice(1).some((v) => v >= tot[0]) &&
            r3.out.every((tk) => pick.some((c) => c.s.includes(tk))) &&
            pick.filter((c) => c.s.length === r3.out.length).length >= 2 &&
            pick.some((c) => c.s[c.s.length - 1] === r3.out[r3.out.length - 1])) chosen = pick;
      }
      RM.need(chosen);

      /* ------------------------------------------------ correction */
      const traceHtml = (r) => {
        const tr = [];
        run(r.stack, r.cells, mean, { trace: tr });
        let h = stackIcon(r.stack);
        r.cells.forEach((c, i) => {
          const lab = c.p !== undefined ? 'push ' + tokIcon(c.p) : GICON[c.g] + ' ' + SHORT[mean[c.g]];
          h += ` → <i>${lab}</i> →` + (i === r.cells.length - 1 ? '' : ' ' + stackIcon(tr[i]));
        });
        return h;
      };
      const firstSeen = (gi) => {
        for (let r = 0; r < 2; r++) {
          const i = rows[r].cells.findIndex((c) => c.g === gi);
          if (i >= 0) return `row ${r + 1}, step ${i + 1}`;
        }
        return '';
      };
      const rtlAlive = cons.some((H) => H.o.rtl);
      const meanTxt = [0, 1, 2]
        .map((gi) => `${G(gi)} = <b>${SHORT[mean[gi]]}</b>: ${DESC[mean[gi]]} (first used in ${firstSeen(gi)}${uses[gi] === 1 ? ', its only appearance before row 3' : ''})`)
        .join('; ');

      const rules = [
        {
          k: 'Reading a row',
          t: 'The 1st panel is a stack of tokens resting in an open tube (the <b>top</b> token is the highest one). The 2nd panel is a little program, run cell by cell <b>from left to right</b>: a cell with a heavy black bar <b>pushes</b> its token on top of the stack; every other glyph is an unknown stack instruction. The 3rd panel is the stack after the program has run.' +
            (rtlAlive ? '' : ' (Read right to left, rows 1 and 2 cannot both be explained.)'),
        },
        { k: 'Decoding', t: 'Compare the stacks before and after in rows 1 and 2: ' + meanTxt + '.' },
        { k: 'Check', t: 'Row 1 (stacks written bottom → top, left → right): ' + traceHtml(r1) + ' ' + stackIcon(r1.out) + ' ✓. Row 2: ' + traceHtml(r2) + ' ' + stackIcon(r2.out) + ' ✓.' },
        { k: 'Row 3', t: traceHtml(r3) + ' <b>' + stackIcon(r3.out) + '</b>, i.e. from bottom to top: <b>' + r3.out.map(tokName).join(', ') + '</b>.' },
      ];

      /* ------------------------------------------------ rendering */
      const render = (spec) => {
        const pic = new RM.Pic();
        if (spec.t === 'stack') {
          RM.polyline(pic, [[37.5, 7], [37.5, 92], [62.5, 92], [62.5, 7]], { sw: 2.2 });
          spec.s.forEach((t, i) => drawTok(pic, t, 50, 83.5 - 16 * i, 7.4));
        } else {
          const n = spec.cells.length;
          const cw = n === 4 ? 22 : 25;
          const x0 = 50 - (n * cw) / 2;
          const y0 = 37;
          const ch = 27;
          pic.add(`<rect x="${x0}" y="${y0}" width="${n * cw}" height="${ch}" fill="#fff" stroke="${RM.INK}" stroke-width="1.8"/>`);
          spec.cells.forEach((c, i) => {
            const cx = x0 + cw * (i + 0.5);
            if (i) RM.line(pic, x0 + cw * i, y0, x0 + cw * i, y0 + ch, { sw: 1.8, cap: 'butt' });
            if (c.p !== undefined) {
              pic.add(`<rect x="${RM.fmt(x0 + cw * i)}" y="${y0}" width="${cw}" height="5" fill="${RM.INK}"/>`);
              drawTok(pic, c.p, cx, y0 + 16.2, 6.6, 1.7);
            } else drawGlyph(pic, kinds[c.g], cx, y0 + ch / 2, 7, 2);
          });
        }
        return pic.svg();
      };
      const key = (spec) => (spec.t === 'stack' ? 'S' + skey(spec.s) : 'T' + spec.cells.map((c) => (c.p !== undefined ? 'p' + c.p : 'g' + c.g)).join(','));

      const panels = [];
      rows.forEach((r, i) => {
        panels.push({ t: 'stack', s: r.stack }, { t: 'tape', cells: r.cells });
        if (i < 2) panels.push({ t: 'stack', s: r.out });
      });

      return {
        panels,
        answer,
        options: [{ spec: answer, flaws: [] }].concat(chosen.map((c) => ({ spec: { t: 'stack', s: c.s }, flaws: c.why }))),
        render,
        key,
        rules,
        hint: 'the middle panel is a little program.',
        difficulty: V.diff,
      };
    },
  });
})();
