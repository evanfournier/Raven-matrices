/* State machine (grandmaster): each row shows a small automaton (states joined by solid and dashed arrows,
 * start state double-ringed), an input tape of ● / ○ symbols, and the same automaton after running the tape:
 * the state where it stops is black and dots count how many times each state was entered (variant 1: the
 * travelled arrows are black instead of dots; variant 2: the tape is read right to left; variant 3: four
 * states). Which symbol follows the solid arrow and the reading direction must be inferred from rows 1–2. */
(function () {
  'use strict';
  const RM = window.RM;
  const SYM = ['○', '●']; // 0 = hollow, 1 = filled
  const LAYOUT = {
    3: { pos: [[50, 29], [25, 71], [75, 71]], loop: [-90, 135, 45], names: ['top', 'bottom-left', 'bottom-right'] },
    4: {
      pos: [[27, 27], [73, 27], [73, 73], [27, 73]],
      loop: [-135, -45, 45, 135],
      names: ['top-left', 'top-right', 'bottom-right', 'bottom-left'],
    },
  };
  const R = 10; // state radius
  const RING = 12.8; // start ring radius
  const DEG = Math.PI / 180;
  const MODES = ['entries', 'visits', 'arrivals', 'exits'];
  const FINS = ['final', 'start', 'most'];

  /* ---------------------------------------------------------------- logic */
  function run(m, tape, sym, dir) {
    const t = dir ? tape.slice().reverse() : tape;
    let s = m.st;
    const seq = [s];
    const used = [];
    for (const x of t) {
      const solid = x === sym;
      used.push(2 * s + (solid ? 0 : 1));
      s = solid ? m.S[s] : m.D[s];
      seq.push(s);
    }
    return { seq, used, fin: s };
  }
  function counts(k, seq, mode) {
    const c = new Array(k).fill(0);
    const n = seq.length;
    if (mode === 'exits') {
      for (let i = 0; i < n - 1; i++) c[seq[i]]++;
      return c;
    }
    for (let i = 1; i < n; i++) if (mode !== 'arrivals' || seq[i - 1] !== seq[i]) c[seq[i]]++;
    if (mode === 'visits') c[seq[0]]++;
    return c;
  }
  function usedBits(k, used) {
    const b = new Array(2 * k).fill(0);
    used.forEach((a) => (b[a] = 1));
    return b;
  }
  function finOf(rule, m, ru, cnt) {
    if (rule === 'final') return ru.fin;
    if (rule === 'start') return m.st;
    const mx = Math.max(...cnt);
    const arg = cnt.filter((v) => v === mx).length === 1 ? cnt.indexOf(mx) : -1;
    return arg;
  }
  const outKey = (o) => o.fin + '|' + (o.cnt ? o.cnt.join(',') : o.used.join(''));

  function makeRow(rng, k, sym, dir, arrows, minDistinct) {
    for (let tries = 0; tries < 60; tries++) {
      const S = [];
      const D = [];
      let loops = 0;
      for (let i = 0; i < k; i++) {
        const [a, b] = rng.sample(RM.range(k), 2);
        S.push(a);
        D.push(b);
        if (a === i || b === i) loops++;
      }
      if (loops > (k === 3 ? 2 : 3)) continue;
      const m = { k, S, D, st: rng.int(0, k - 1) };
      const n = rng.int(4, 6);
      const tape = RM.range(n).map(() => rng.int(0, 1));
      const ones = tape.reduce((a, b) => a + b, 0);
      if (ones === 0 || ones === n) continue;
      const ru = run(m, tape, sym, dir);
      const cnt = counts(k, ru.seq, 'entries');
      if (Math.max(...cnt) > 4) continue;
      if (new Set(ru.seq).size < minDistinct) continue;
      const used = usedBits(k, ru.used);
      if (arrows && used.reduce((a, b) => a + b, 0) < 3) continue;
      return { m, tape, ru, out: arrows ? { fin: ru.fin, used } : { fin: ru.fin, cnt } };
    }
    throw RM.RETRY;
  }

  /* ---------------------------------------------------------------- drawing */
  function rad(m, i) {
    return i === m.st ? RING : R;
  }
  function headAndLine(pic, pts, o) {
    // pts: sampled curve, already trimmed; the last point is the arrow tip
    const tip = pts[pts.length - 1];
    let j = pts.length - 1;
    while (j > 0 && Math.hypot(pts[j][0] - tip[0], pts[j][1] - tip[1]) < 6.2) j--;
    const base = pts[j];
    const line = pts.slice(0, j + 1);
    RM.polyline(pic, line, { sw: o.sw, dash: o.dash ? 'dashed' : null, color: o.color });
    const dx = tip[0] - base[0];
    const dy = tip[1] - base[1];
    const L = Math.hypot(dx, dy) || 1;
    const px = (-dy / L) * 3;
    const py = (dx / L) * 3;
    RM.polygon(
      pic,
      [tip, [base[0] + px, base[1] + py], [base[0] - px, base[1] - py]],
      { fill: o.color === RM.INK ? 'black' : o.color, sw: 0.6, stroke: o.color }
    );
  }
  function edgePts(m, lay, i, j) {
    const [x1, y1] = lay.pos[i];
    const [x2, y2] = lay.pos[j];
    const pts = [];
    if (i === j) {
      const r0 = rad(m, i);
      const ph = lay.loop[i] * DEG;
      const a = 28 * DEG;
      const a2 = 40 * DEG;
      const Lc = r0 + 18;
      const P = (rr, ang) => [x1 + rr * Math.cos(ang), y1 + rr * Math.sin(ang)];
      const p0 = P(r0, ph - a);
      const c1 = P(Lc, ph - a2);
      const c2 = P(Lc, ph + a2);
      const p3 = P(r0, ph + a);
      for (let s = 0; s <= 60; s++) {
        const t = s / 60;
        const u = 1 - t;
        const A = u * u * u;
        const B = 3 * u * u * t;
        const C = 3 * u * t * t;
        const E = t * t * t;
        pts.push([A * p0[0] + B * c1[0] + C * c2[0] + E * p3[0], A * p0[1] + B * c1[1] + C * c2[1] + E * p3[1]]);
      }
      return pts.filter((p) => Math.hypot(p[0] - x1, p[1] - y1) > r0 + 0.9);
    }
    const dx = x2 - x1;
    const dy = y2 - y1;
    const L = Math.hypot(dx, dy);
    const bulge = 7;
    const cx = (x1 + x2) / 2 + (-dy / L) * 2 * bulge;
    const cy = (y1 + y2) / 2 + (dx / L) * 2 * bulge;
    for (let s = 0; s <= 80; s++) {
      const t = s / 80;
      const A = (1 - t) * (1 - t);
      const B = 2 * t * (1 - t);
      const C = t * t;
      pts.push([A * x1 + B * cx + C * x2, A * y1 + B * cy + C * y2]);
    }
    const r1 = rad(m, i) + 0.9;
    const r2 = rad(m, j) + 0.9;
    return pts.filter((p) => Math.hypot(p[0] - x1, p[1] - y1) > r1 && Math.hypot(p[0] - x2, p[1] - y2) > r2);
  }
  function pipLayout(n) {
    const s = 5.6;
    const h = s / 2;
    const L = {
      1: [[0, 0]],
      2: [[-h, 0], [h, 0]],
      3: [[-s, 0], [0, 0], [s, 0]],
      4: [[-h, -h], [h, -h], [-h, h], [h, h]],
      5: [[-s, -2.9], [0, -2.9], [s, -2.9], [-h, 2.9], [h, 2.9]],
      6: [[-s, -2.9], [0, -2.9], [s, -2.9], [-s, 2.9], [0, 2.9], [s, 2.9]],
    };
    return L[n] || [];
  }
  function drawMachine(pic, spec) {
    const m = spec.m;
    const lay = LAYOUT[m.k];
    for (let i = 0; i < m.k; i++) {
      [0, 1].forEach((d) => {
        const j = d ? m.D[i] : m.S[i];
        let color = RM.INK;
        let sw = 1.8;
        if (spec.used) {
          const on = spec.used[2 * i + d];
          color = on ? RM.INK : RM.GRAY;
          sw = on ? 2.3 : 1.4;
        }
        headAndLine(pic, edgePts(m, lay, i, j), { dash: !!d, color, sw });
      });
    }
    for (let i = 0; i < m.k; i++) {
      const [x, y] = lay.pos[i];
      const black = spec.fin === i;
      if (i === m.st) RM.circle(pic, x, y, RING, { fill: 'none', sw: 1.6 });
      RM.circle(pic, x, y, R, { fill: black ? 'black' : 'white', sw: 2 });
      if (spec.cnt)
        pipLayout(spec.cnt[i]).forEach(([px, py]) =>
          RM.circle(pic, x + px, y + py, 2.5, { fill: black ? 'white' : 'black', sw: 0 })
        );
    }
  }
  function drawTape(pic, tape) {
    const n = tape.length;
    const s = n <= 5 ? 16 : 14.5;
    const x0 = 50 - (n * s) / 2;
    const y0 = 50 - s / 2;
    pic.add(
      `<rect x="${RM.fmt(x0)}" y="${RM.fmt(y0)}" width="${RM.fmt(n * s)}" height="${RM.fmt(s)}" fill="white" stroke="${RM.INK}" stroke-width="2"/>`
    );
    tape.forEach((v, i) => {
      const cx = x0 + (i + 0.5) * s;
      if (i) RM.line(pic, x0 + i * s, y0, x0 + i * s, y0 + s, { sw: 1.4, cap: 'butt' });
      RM.circle(pic, cx, 50, s * 0.28, { fill: v ? 'black' : 'white', sw: 1.9 });
    });
  }
  function render(spec) {
    const pic = new RM.Pic();
    if (spec.kind === 'tape') drawTape(pic, spec.tape);
    else drawMachine(pic, spec);
    return pic.svg();
  }

  /* ---------------------------------------------------------------- text */
  function arrowDesc(m, names, a) {
    const i = a >> 1;
    const d = a & 1;
    const t = d ? m.D[i] : m.S[i];
    const st = d ? 'dashed' : 'solid';
    return t === i ? `the ${st} loop on the ${names[i]} state` : `the ${st} arrow from the ${names[i]} state to the ${names[t]} state`;
  }
  const dots = (n) => n + (n === 1 ? ' dot' : ' dots');
  function diffText(c, a, m, names) {
    const out = [];
    if (c.fin !== a.fin) out.push(`it stops in the ${names[c.fin]} state, but the run ends in the ${names[a.fin]} state`);
    if (c.cnt) {
      const d = [];
      for (let s = 0; s < m.k; s++)
        if (c.cnt[s] !== a.cnt[s]) d.push(`${names[s]} ${c.cnt[s]} instead of ${a.cnt[s]}`);
      if (d.length) out.push('wrong dot counts: ' + d.join(', '));
    } else {
      for (let x = 0; x < 2 * m.k; x++) {
        if (c.used[x] && !a.used[x]) out.push(`${arrowDesc(m, names, x)} is black although the run never takes it`);
        if (!c.used[x] && a.used[x]) out.push(`${arrowDesc(m, names, x)} is pale although the run takes it`);
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- family */
  RM.register({
    id: 'state-machine',
    name: 'State machine',
    difficulty: 7,
    generate(rng, variant) {
      const k = variant === 3 ? 4 : 3;
      const arrows = variant === 1;
      const dir = variant === 2 ? 1 : variant === 3 ? rng.int(0, 1) : 0;
      const sym = rng.int(0, 1); // the symbol that follows the solid arrow
      const lay = LAYOUT[k];
      const names = lay.names;
      const rows = [0, 1, 2].map((r) => makeRow(rng, k, sym, dir, arrows, r === 2 ? 3 : 2));
      const shown = rows.map((r) => outKey(r.out));

      // ---- hypotheses a solver could hold
      const hyps = [];
      // reading direction: always the same, or alternating from row to row
      const DIRS = [[0, 0, 0], [1, 1, 1], [0, 1, 0], [1, 0, 1]];
      [1, 0].forEach((hs) =>
        DIRS.forEach((hd) =>
          (arrows ? ['entries'] : MODES).forEach((cm) =>
            (arrows ? ['final', 'start'] : FINS).forEach((fr) => hyps.push({ sym: hs, dirs: hd, cm, fr }))
          )
        )
      );
      const predict = (h, r) => {
        const row = rows[r];
        const ru = run(row.m, row.tape, h.sym, h.dirs[r]);
        if (arrows) return outKey({ fin: finOf(h.fr, row.m, ru, null), used: usedBits(k, ru.used) });
        const cnt = counts(k, ru.seq, h.cm);
        return outKey({ fin: finOf(h.fr, row.m, ru, cnt), cnt });
      };
      const consistent = hyps.filter((h) => predict(h, 0) === shown[0] && predict(h, 1) === shown[1]);
      RM.need(consistent.length > 0);
      RM.need(consistent.every((h) => predict(h, 2) === shown[2]));
      RM.need(consistent.every((h) => h.sym === sym && h.dirs[0] === dir && h.dirs[1] === dir));

      // ---- no positional shortcut on the black state
      // (a column-constant reading of column 3 would predict the black state of rows 1–2)
      RM.need(!(rows[0].out.fin === rows[1].out.fin && rows[2].out.fin !== rows[0].out.fin));

      // ---- distractors (mistake generators on row 3)
      const R3 = rows[2];
      const m = R3.m;
      const ans = R3.out;
      const T = R3.tape;
      const readT = dir ? T.slice().reverse() : T;
      const sSym = SYM[sym];
      const oSym = SYM[1 - sym];
      const dirWord = dir ? 'left to right' : 'right to left';
      const mk = (ru, cm, fin) =>
        arrows ? { fin: fin === undefined ? ru.fin : fin, used: usedBits(k, ru.used) } : { fin: fin === undefined ? ru.fin : fin, cnt: counts(k, ru.seq, cm) };
      const short = (tp) => run(m, dir ? tp.slice().reverse() : tp, sym, dir);
      const A = [];
      const B = [];
      const ruSwap = run(m, T, 1 - sym, dir);
      const ruRev = run(m, T, sym, 1 - dir);
      const ruBoth = run(m, T, 1 - sym, 1 - dir);
      const ruDropLast = short(readT.slice(0, -1));
      const ruDropFirst = short(readT.slice(1));
      const prev = R3.ru.seq[R3.ru.seq.length - 2];
      A.push([mk(ruSwap, 'entries'), `the arrows are swapped: here ${oSym} follows the solid arrow and ${sSym} the dashed one`]);
      A.push([mk(ruRev, 'entries'), `the tape has been read from ${dirWord}`]);
      A.push([mk(ruDropLast, 'entries'), 'the last symbol of the tape has not been applied']);
      A.push([mk(R3.ru, 'entries', prev), 'the black state is where the machine was before its last move, not where it stops']);
      B.push([mk(ruBoth, 'entries'), `the arrows are swapped (${oSym} on the solid arrow) and the tape is read from ${dirWord}`]);
      B.push([mk(ruDropFirst, 'entries'), 'the first symbol of the tape has been skipped']);
      B.push([mk(R3.ru, 'entries', m.st), 'the start state has been blackened instead of the state where the run stops']);
      if (!arrows) {
        A.push([mk(R3.ru, 'visits'), 'the start position has been counted as an entry']);
        A.push([mk(R3.ru, 'arrivals'), 'returning through a loop also counts as entering the state']);
        A.push([mk(R3.ru, 'exits'), 'the dots count departures from each state instead of arrivals']);
        B.push([mk(ruSwap, 'visits'), `the arrows are swapped (${oSym} on the solid arrow) and the start position is counted`]);
        B.push([mk(ruRev, 'visits'), `the tape is read from ${dirWord} and the start position is counted`]);
        const moves = [];
        for (let s = 0; s < k; s++)
          for (let t = 0; t < k; t++)
            if (s !== t && ans.cnt[s] > 0) {
              const cnt = ans.cnt.slice();
              cnt[s]--;
              cnt[t]++;
              moves.push([{ fin: ans.fin, cnt }, `one entry of the ${names[s]} state has been put in the ${names[t]} state`]);
            }
        const mv = rng.shuffle(moves);
        if (mv.length) A.push(mv[0]);
        mv.slice(1, 4).forEach((x) => B.push(x));
        const plus = ans.cnt.slice();
        plus[ans.fin]++;
        B.push([{ fin: ans.fin, cnt: plus }, 'the final state has one dot too many']);
        const minus = ans.cnt.slice();
        minus[ans.fin]--;
        B.push([{ fin: ans.fin, cnt: minus }, 'the last arrival has not been counted']);
      } else {
        const unused = [];
        const usedL = [];
        for (let x = 0; x < 2 * k; x++) (ans.used[x] ? usedL : unused).push(x);
        rng.shuffle(unused).slice(0, 3).forEach((x, i) => {
          const u = ans.used.slice();
          u[x] = 1;
          (i ? B : A).push([{ fin: ans.fin, used: u }, 'an arrow that the run never travels is shown as used']);
        });
        rng.shuffle(usedL).slice(0, 3).forEach((x, i) => {
          const u = ans.used.slice();
          u[x] = 0;
          (i ? B : A).push([{ fin: ans.fin, used: u }, 'an arrow travelled by the run is shown pale']);
        });
        B.push([{ fin: ruSwap.fin, used: ans.used }, `the black state comes from a run with the arrows swapped (${oSym} on the solid arrow)`]);
      }
      const ansKey = outKey(ans);
      const valid = (o) => (o.cnt ? Math.max(...o.cnt) <= 6 && Math.min(...o.cnt) >= 0 : true) && o.fin >= 0;
      let picked = null;
      for (let tries = 0; tries < 12 && !picked; tries++) {
        const seen = new Set([ansKey]);
        const list = [];
        rng
          .shuffle(A)
          .concat(rng.shuffle(B))
          .forEach(([o, why]) => {
            const key = outKey(o);
            if (list.length >= 7 || seen.has(key) || !valid(o)) return;
            seen.add(key);
            list.push([o, why]);
          });
        if (list.length < 7) break;
        const outs = list.map((x) => x[0]);
        const share = (f) => outs.filter((o) => f(o)).length;
        let ok = share((o) => o.fin === ans.fin) >= 2;
        if (arrows) for (let x = 0; x < 2 * k; x++) ok = ok && share((o) => o.used[x] === ans.used[x]) >= 1;
        else {
          for (let s = 0; s < k; s++) ok = ok && share((o) => o.cnt[s] === ans.cnt[s]) >= 1;
          const tot = (o) => o.cnt.reduce((p, q) => p + q, 0);
          ok = ok && share((o) => tot(o) === tot(ans)) >= 2;
        }
        if (ok) picked = list;
      }
      RM.need(picked);

      const spec = (o) => Object.assign({ kind: 'out', m }, o);
      const options = [{ spec: spec(ans), flaws: [] }].concat(
        picked.map(([o, why]) => ({ spec: spec(o), flaws: [why].concat(diffText(o, ans, m, names)) }))
      );

      // ---- correction text
      const mismatch = (h) => {
        for (let r = 0; r < 2; r++) {
          const ru = run(rows[r].m, rows[r].tape, h.sym, h.dir);
          const o = arrows ? { fin: ru.fin, used: usedBits(k, ru.used) } : { fin: ru.fin, cnt: counts(k, ru.seq, 'entries') };
          if (outKey(o) === shown[r]) continue;
          if (o.fin !== rows[r].out.fin) return `row ${r + 1} would stop in the ${names[o.fin]} state instead of the ${names[rows[r].out.fin]} one`;
          return `row ${r + 1} would ${arrows ? 'travel other arrows' : 'show other dot counts'}`;
        }
        return null;
      };
      const ms = mismatch({ sym: 1 - sym, dir });
      const md = mismatch({ sym, dir: 1 - dir });
      const checks = [];
      if (ms) checks.push(`with ${sSym} on the dashed arrows, ${ms}`);
      if (md) checks.push(`reading from ${dirWord}, ${md}`);
      let s = m.st;
      const steps = readT.map((x) => {
        const solid = x === sym;
        const nx = solid ? m.S[s] : m.D[s];
        const txt = `${SYM[x]} → ${solid ? 'solid' : 'dashed'} ${nx === s ? 'loop, stays in the ' + names[nx] : 'arrow to the ' + names[nx]}`;
        s = nx;
        return txt;
      });
      const record = arrows
        ? 'The 3rd panel is the same machine after the run: every arrow travelled at least once is drawn <b>black</b>, the arrows never used are <b>pale grey</b>, and the state where the machine <b>stops is filled black</b>.'
        : 'The 3rd panel is the same machine after the run: the state where the machine <b>stops is black</b>, and the dots in each state count <b>how many times it was entered</b> (the start position does not count; coming back through a loop does). So the total number of dots always equals the length of the tape.';
      const result = arrows
        ? `Arrows used: ${R3.ru.used
            .filter((x, i, a) => a.indexOf(x) === i)
            .map((x) => arrowDesc(m, names, x).replace(/^the /, ''))
            .join('; ')}. <b>Answer: those ${R3.ru.used.filter((x, i, a) => a.indexOf(x) === i).length} arrows black, all others pale, and the ${names[ans.fin]} state filled black.</b>`
        : `Entries: ${names.map((nm, i) => nm + ' ' + ans.cnt[i]).join(', ')} (total ${T.length} = tape length). <b>Answer: the ${names[ans.fin]} state is black; dots — ${names.map((nm, i) => nm + ' ' + ans.cnt[i]).join(', ')}.</b>`;
      const rules = [
        {
          k: 'The map',
          t: `The 1st panel of each row is a machine with ${k} states (circles). From every state leave exactly two arrows: one <b>solid</b> and one <b>dashed</b> (a small loop leads back to the same state). The <b>double ring</b> marks the start state. Each row has its own machine.`,
        },
        {
          k: 'The route',
          t: `The 2nd panel is a tape read <b>from ${dir ? 'right to left' : 'left to right'}</b>, one move per symbol, starting from the double-ringed state: <b>${sSym} follows the solid arrow</b> out of the current state, <b>${oSym} the dashed arrow</b>.${checks.length ? ' Rows 1 and 2 fit only this reading: ' + checks.join('; ') + '.' : ''}`,
        },
        { k: 'The record', t: record },
        {
          k: 'Row 3',
          t: `Start in the ${names[m.st]} state and read ${readT.map((x) => SYM[x]).join(' ')}: ${steps.join('; ')}. ${result}`,
        },
      ];

      const panels = [];
      rows.forEach((r, i) => {
        panels.push({ kind: 'map', m: r.m });
        panels.push({ kind: 'tape', tape: r.tape });
        if (i < 2) panels.push(Object.assign({ kind: 'out', m: r.m }, r.out));
      });
      return {
        panels,
        answer: spec(ans),
        options,
        render,
        key: (sp) => JSON.stringify(sp),
        rules,
        hint: 'The first panel is a map, the second one is a route.',
        difficulty: variant === 1 ? 6 : variant === 3 ? 8 : 7,
      };
    },
  });
})();
