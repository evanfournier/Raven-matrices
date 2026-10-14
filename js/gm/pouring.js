/* Jugs (grandmaster): the water-jug problem with jugs of different widths. Three (or four) fixed open jugs of
 * different capacities AND widths stand side by side; tick marks divide each jug into equal units of volume (a unit
 * is a tall slice in a narrow jug, a short one in a wide jug: one unit always has the same area). Column 1 shows
 * the starting contents, column 2 the result of one fixed pour X→Y, column 3 the result of a second fixed pour.
 * A pour moves min(contents of X, free room in Y) units: it stops when X is empty or Y is full; nothing spills.
 * Volumes, not heights, are conserved. Variant 1: the second pour is the first one reversed; variant 2: two pours
 * per column (★8); variant 3: four jugs. */
(function () {
  'use strict';
  const RM = window.RM;
  const fmt = RM.fmt;

  const BASE = 90; // outer bottom of every jug
  const TOP = 16; // rim of the tallest jug
  const WALL = 2.4;

  const sum = (s) => s.reduce((a, b) => a + b, 0);
  const eq = (a, b) => !!a && !!b && a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
  const isInt = (s, caps) => s.every((v, i) => Number.isInteger(v) && v >= 0 && v <= caps[i]);
  const units = (k) => k + (k === 1 ? ' unit' : ' units');

  /* elementary moves: transfer t units from a to b */
  function move(s, a, b, t) {
    const o = s.slice();
    o[a] -= t;
    o[b] += t;
    return o;
  }
  function pour(s, a, b, caps) {
    return move(s, a, b, Math.min(s[a], caps[b] - s[b]));
  }

  /* All rules a solver could read into one column-to-column change. */
  function opsFor(J) {
    const { n, caps, ws } = J;
    const O = [];
    const lvl = (s, i) => s[i] / ws[i]; // water height up to the constant K
    for (let a = 0; a < n; a++)
      for (let b = 0; b < n; b++) {
        if (a === b) continue;
        O.push({ pure: true, f: (s) => pour(s, a, b, caps) });
        O.push({ f: (s) => move(s, a, b, Math.min(1, s[a], caps[b] - s[b])) });
        O.push({ f: (s) => move(s, a, b, Math.min(Math.floor(s[a] / 2), caps[b] - s[b])) });
        O.push({
          f: (s) => {
            const o = s.slice();
            o[b] = Math.min(caps[b], s[a] + s[b]);
            o[a] = 0;
            return o;
          },
        });
      }
    for (let a = 0; a < n; a++) {
      O.push({ f: (s) => s.map((v, i) => (i === a ? caps[a] : v)) });
      O.push({ f: (s) => s.map((v, i) => (i === a ? 0 : v)) });
      for (let b = a + 1; b < n; b++) {
        O.push({
          f: (s) => {
            // shared equally (same volume)
            const V = s[a] + s[b];
            const o = s.slice();
            o[a] = o[b] = V / 2;
            return o[a] <= caps[a] && o[b] <= caps[b] ? o : null;
          },
        });
        O.push({
          f: (s) => {
            // communicating vessels: same height
            const V = s[a] + s[b];
            const o = s.slice();
            o[a] = (V * ws[a]) / (ws[a] + ws[b]);
            o[b] = V - o[a];
            return o[a] <= caps[a] + 1e-9 && o[b] <= caps[b] + 1e-9 ? o : null;
          },
        });
        O.push({
          f: (s) => {
            if (s[a] > caps[b] || s[b] > caps[a]) return null;
            const o = s.slice();
            o[a] = s[b];
            o[b] = s[a];
            return o;
          },
        });
      }
    }
    // data-dependent pours: from the jug with the most (units / height / fraction) into the one with the least
    const metrics = [(s, i) => s[i], lvl, (s, i) => s[i] / caps[i]];
    for (const m of metrics)
      for (const dir of [1, -1]) {
        O.push({
          f: (s) => {
            const v = s.map((_, i) => dir * m(s, i));
            const hi = Math.max(...v);
            const lo = Math.min(...v);
            const ia = v.filter((x) => Math.abs(x - hi) < 1e-9);
            const ib = v.filter((x) => Math.abs(x - lo) < 1e-9);
            if (ia.length !== 1 || ib.length !== 1 || hi === lo) return null;
            return pour(s, v.indexOf(hi), v.indexOf(lo), caps);
          },
        });
      }
    return O;
  }
  function seqOf(list) {
    return {
      pure: list.every((o) => o.pure),
      f: (s) => {
        let t = s;
        for (const o of list) {
          t = o.f(t);
          if (!t) return null;
        }
        return t;
      },
    };
  }

  function drawJugs(J, s) {
    const pic = new RM.Pic();
    const { n, caps, ws, xs, uh } = J;
    for (let i = 0; i < n; i++) {
      const x0 = xs[i];
      const w = ws[i];
      const H = caps[i] * uh[i];
      if (s[i] > 0) {
        const h = s[i] * uh[i];
        pic.add(`<rect x="${fmt(x0)}" y="${fmt(BASE - h)}" width="${fmt(w)}" height="${fmt(h)}" fill="${RM.GRAY}"/>`);
      }
      const L = Math.min(4.6, w * 0.36);
      for (let u = 1; u < caps[i]; u++) {
        const y = BASE - u * uh[i];
        pic.add(`<line x1="${fmt(x0)}" y1="${fmt(y)}" x2="${fmt(x0 + L)}" y2="${fmt(y)}" stroke="${RM.INK}" stroke-width="1.5"/>`);
      }
      pic.add(
        `<polyline points="${fmt(x0)},${fmt(BASE - H)} ${fmt(x0)},${fmt(BASE)} ${fmt(x0 + w)},${fmt(BASE)} ${fmt(x0 + w)},${fmt(BASE - H)}" fill="none" stroke="${RM.INK}" stroke-width="${WALL}" stroke-linejoin="miter" stroke-linecap="square"/>`
      );
    }
    return pic.svg();
  }

  /* fixed jugs: capacities, widths (not in capacity order), physically consistent unit heights */
  function makeJugs(rng, n) {
    let cs;
    if (n === 3) {
      const a = rng.int(2, 5);
      const b = rng.int(a + 1, 7);
      const c = rng.int(b + 1, 9);
      RM.need(c - a >= 3);
      cs = [a, b, c];
    } else {
      const a = rng.int(2, 3);
      const b = rng.int(a + 1, 5);
      const c = rng.int(b + 1, 7);
      const d = rng.int(c + 1, 9);
      cs = [a, b, c, d];
    }
    const caps = rng.shuffle(cs);
    const baseW = n === 3 ? [rng.int(12, 15), rng.int(19, 22), rng.int(27, 31)] : [rng.int(10, 11), rng.int(14, 16), rng.int(19, 21), rng.int(24, 26)];
    const minUh = n === 3 ? 5 : 4.6;
    for (let tries = 0; tries < 40; tries++) {
      const ws = rng.shuffle(baseW);
      // width order must differ from capacity order (widths are not proportional to capacities)
      const monotone = caps.every((c, i) => caps.every((d, k) => (c < d) === (ws[i] < ws[k]) || i === k));
      if (monotone) continue;
      const K = (BASE - TOP) / Math.max(...caps.map((c, i) => c / ws[i]));
      const uh = ws.map((w) => K / w);
      if (Math.min(...uh) < minUh) continue;
      if (Math.min(...caps.map((c, i) => c * uh[i])) < (n === 3 ? 20 : 24)) continue; // no squat jug lost at the bottom
      const total = sum(ws);
      const gap = Math.min(10, (88 - total) / (n - 1));
      const x0 = (100 - total - gap * (n - 1)) / 2;
      const xs = [];
      let x = x0;
      for (let i = 0; i < n; i++) {
        xs.push(x);
        x += ws[i] + gap;
      }
      return { n, caps, ws, uh, xs, K, sorted: cs };
    }
    throw RM.RETRY;
  }

  RM.register({
    id: 'pouring',
    name: 'Jugs',
    difficulty: 7,
    generate(rng, variant) {
      const n = variant === 3 ? 4 : 3;
      const two = variant === 2;
      const J = makeJugs(rng, n);
      const { caps, ws } = J;
      const nm = n === 3 ? (i) => ['left', 'middle', 'right'][i] : (i) => ['1st', '2nd', '3rd', '4th'][i];
      const jug = (i) => 'the ' + nm(i) + ' jug';
      const desc = (s) => s.map((v, i) => nm(i) + ' ' + v).join(', ');

      const pairs = [];
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b) pairs.push([a, b]);
      const same = (p, q) => p[0] === q[0] && p[1] === q[1];
      const rev = (p) => [p[1], p[0]];
      let P1;
      let P2;
      if (two) {
        const p = rng.pick(pairs);
        const q = rng.pick(pairs.filter((x) => !same(x, p) && !same(x, rev(p))));
        P1 = [p, q];
        const r = rng.pick(pairs);
        const t = rng.pick(pairs.filter((x) => !same(x, r) && !same(x, rev(r))));
        P2 = [r, t];
        RM.need(!(same(p, r) && same(q, t)));
      } else {
        const p = rng.pick(pairs);
        P1 = [p];
        P2 = variant === 1 ? [rev(p)] : [rng.pick(pairs.filter((x) => !same(x, p) && !same(x, rev(p))))];
      }
      const runSeq = (P, s) => {
        let t = s;
        const ev = [];
        for (const [a, b] of P) {
          const k = Math.min(t[a], caps[b] - t[b]);
          ev.push({ a, b, x: t[a], y: t[b], k, room: caps[b] - t[b] });
          t = move(t, a, b, k);
        }
        return { s: t, ev };
      };

      // rows; rows 1–2 must show, for each step, a pour stopped by a full receiver and one that empties its source
      const modeOf = (e) => (e.k === e.room && e.k < e.x ? 'cap' : e.k === e.x && e.k < e.room ? 'emp' : 'both');
      const flip = { cap: 'emp', emp: 'cap' };
      const m1 = rng.pick(['cap', 'emp']);
      const m2 = rng.pick(['cap', 'emp']);
      const wantMode = [
        [m1, m2],
        [flip[m1], flip[m2]],
        [null, null],
      ];
      const maxTot = J.sorted[n - 1] + J.sorted[0];
      const rows = [];
      const evs = [];
      for (let r = 0; r < 3; r++) {
        let done = false;
        for (let tries = 0; tries < 250 && !done; tries++) {
          const s1 = caps.map((c) => rng.int(0, c));
          const T = sum(s1);
          if (T > maxTot || T < 3) continue;
          if (rows.some((row) => eq(row[0], s1))) continue;
          const A = runSeq(P1, s1);
          const B = runSeq(P2, A.s);
          if (A.ev.some((e) => e.k === 0) || B.ev.some((e) => e.k === 0)) continue;
          if (wantMode[r][0] && !A.ev.some((e) => modeOf(e) === wantMode[r][0])) continue;
          if (wantMode[r][1] && !B.ev.some((e) => modeOf(e) === wantMode[r][1])) continue;
          rows.push([s1, A.s, B.s]);
          evs.push([A.ev, B.ev]);
          done = true;
        }
        RM.need(done);
      }
      const vis = [];
      for (let r = 0; r < 2; r++) evs[r].forEach((E, c) => E.forEach((e) => vis.push({ r, c, ...e })));
      const capped = vis.filter((e) => modeOf(e) === 'cap');
      const emptied = vis.filter((e) => modeOf(e) === 'emp');

      // ---------- uniqueness against alternative readings
      const O = opsFor(J);
      let H = O.map((o) => seqOf([o]));
      if (two) for (const o1 of O) for (const o2 of O) H.push(seqOf([o1, o2]));
      const fits = (h, c, nr) => {
        for (let r = 0; r < nr; r++) if (!eq(h.f(rows[r][c]), rows[r][c + 1])) return false;
        return true;
      };
      const H1 = H.filter((h) => fits(h, 0, 3));
      RM.need(H1.filter((h) => h.pure).length === 1);
      const ans = rows[2][2];
      const H2 = H.filter((h) => fits(h, 1, 2));
      RM.need(H2.length > 0);
      for (const h of H2) {
        const p = h.f(rows[2][1]);
        RM.need(!p || eq(p, ans));
      }
      // a solver who skips column 2 (one move straight from column 1 to column 3)
      for (const o of O) {
        if ([0, 1].every((r) => eq(o.f(rows[r][0]), rows[r][2]))) {
          const p = o.f(rows[2][0]);
          RM.need(!p || eq(p, ans));
        }
      }
      // no simple Raven rule on any single jug's contents ("column total" is ignored when columns 1 and 2 are
      // identical for that jug: the totals are then equal by construction, not by a rule)
      for (let j = 0; j < n; j++) {
        const g = RM.grid3((r, c) => rows[r][c][j]);
        const degenerate = [0, 1, 2].every((r) => g[r][0] === g[r][1]);
        RM.need(RM.preds.numeric(g).every((p) => p[1] === ans[j] || (degenerate && p[0] === 'column total')));
      }

      // ---------- distractors
      const s1 = rows[2][0];
      const s2 = rows[2][1];
      const T = sum(ans);
      const cands = [];
      const add = (v, why, pri) => {
        if (!v || !isInt(v, caps) || eq(v, ans)) return;
        cands.push({ v, why, pri: pri + rng.next() * 0.9 });
      };
      const pName = (p) => nm(p[0]) + ' → ' + nm(p[1]);
      const stepName = (i) => (two ? (i === 0 ? 'in the first pour, ' : 'in the second pour, ') : '');
      // apply P2 with step i replaced by a custom move
      const withStep = (i, fn) => {
        let t = s2;
        for (let k = 0; k < P2.length; k++) {
          if (k === i) t = fn(t);
          else t = pour(t, P2[k][0], P2[k][1], caps);
          if (!t || !isInt(t, caps)) return null;
        }
        return t;
      };
      P2.forEach(([a, b], i) => {
        const S = stepName(i);
        add(withStep(i, (t) => pour(t, b, a, caps)), S + 'the pour goes the wrong way: ' + nm(b) + ' → ' + nm(a) + ' instead of ' + nm(a) + ' → ' + nm(b), 1);
        add(
          withStep(i, (t) => {
            const o = t.slice();
            o[b] = Math.min(caps[b], t[a] + t[b]);
            o[a] = 0;
            return o;
          }),
          S + jug(a) + ' was emptied completely and the excess spilled — a pour stops when ' + jug(b) + ' is full; the rest stays in ' + jug(a),
          1
        );
        add(
          withStep(i, (t) => {
            const k = Math.min(t[a], caps[b] - t[b]);
            const gain = Math.min(caps[b] - t[b], Math.round((k * ws[b]) / ws[a]));
            if (gain === k) return null;
            const o = t.slice();
            o[a] -= k;
            o[b] += gain;
            return o;
          }),
          S + 'the level in ' + jug(b) + ' rose by the same HEIGHT as the level in ' + jug(a) + ' fell — but the jugs have different widths: the volume (number of units) is what is conserved',
          1.5
        );
        add(
          withStep(i, (t) => {
            const k = Math.min(t[a], caps[b] - t[b]);
            return k >= 2 ? move(t, a, b, k - 1) : null;
          }),
          S + 'the pour stopped one unit too early: it goes on until ' + jug(a) + ' is empty or ' + jug(b) + ' is full',
          2
        );
        for (let c = 0; c < n; c++) {
          if (c === a || c === b) continue;
          add(withStep(i, (t) => pour(t, a, c, caps)), S + jug(a) + ' was poured into ' + jug(c) + ' instead of ' + jug(b), 2.5);
          add(withStep(i, (t) => pour(t, c, b, caps)), S + jug(c) + ' was poured into ' + jug(b) + ' instead of ' + jug(a), 2.5);
        }
        add(
          withStep(i, (t) => {
            const k = Math.min(Math.floor(t[a] / 2), caps[b] - t[b]);
            return move(t, a, b, k);
          }),
          S + 'only half of ' + jug(a) + ' was poured — the pour goes on until ' + jug(a) + ' is empty or ' + jug(b) + ' is full',
          3
        );
        add(
          withStep(i, (t) => {
            const V = t[a] + t[b];
            const o = t.slice();
            o[a] = Math.round((V * ws[a]) / (ws[a] + ws[b]));
            o[b] = V - o[a];
            return o;
          }),
          S + 'the water was levelled to the same height in ' + jug(a) + ' and ' + jug(b) + ' — a pour does not stop at equal levels',
          2.5
        );
        if (two) {
          add(withStep(i, (t) => t), 'the ' + (i === 0 ? 'first' : 'second') + ' pour (' + pName(P2[i]) + ') was left out', 2);
        }
      });
      add(s2, 'this is column 2 unchanged: the pour ' + P2.map(pName).join(', then ') + ' was not done', 3);
      if (two) add(runSeq([P2[1], P2[0]], s2).s, 'the two pours were done in the wrong order', 1.5);
      add(runSeq(P1, s2).s, 'this repeats the pour of column 1 → 2 (' + P1.map(pName).join(', then ') + ') instead of ' + P2.map(pName).join(', then '), 2);
      add(runSeq(P2, s1).s, 'the pour ' + P2.map(pName).join(', then ') + ' was applied to column 1 instead of column 2', 2.5);
      add(runSeq(P1, runSeq(P2, s1).s).s, 'the two steps were done in the wrong order (column 2 → 3 pour first, then column 1 → 2 pour)', 3);
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          add(move(ans, i, j, 1), 'one unit too many in ' + jug(j) + ' and one too few in ' + jug(i), 4);
        }
      for (let i = 0; i < n; i++)
        for (const d of [-1, 1]) add(ans.map((v, k) => (k === i ? v + d : v)), 'one unit ' + (d > 0 ? 'too many' : 'too few') + ' in ' + jug(i) + ' — water is neither created nor lost', 4.5);

      // dedupe (keep the most tempting explanation)
      cands.sort((x, y) => x.pri - y.pri);
      const uniq = [];
      for (const c of cands) if (!uniq.some((u) => eq(u.v, c.v))) uniq.push(c);
      RM.need(uniq.length >= 7);
      const nFull = (v) => v.filter((x, i) => x === caps[i]).length;
      const nEmpty = (v) => v.filter((x) => x === 0).length;
      const ok = (sel) =>
        ans.every((v, j) => sel.some((c) => c.v[j] === v)) &&
        sel.some((c) => nFull(c.v) === nFull(ans)) &&
        sel.some((c) => nEmpty(c.v) === nEmpty(ans)) && sel.filter((c) => sum(c.v) === T).length >= 3 && sel.filter((c) => c.pri < 3).length >= 3;
      let pick = uniq.slice(0, 7);
      for (let tries = 0; tries < 40 && !ok(pick); tries++) pick = rng.sample(uniq.slice(0, Math.min(uniq.length, 14)), 7);
      RM.need(ok(pick));

      const diff = (v) => {
        const parts = [];
        for (let j = 0; j < n; j++) if (v[j] !== ans[j]) parts.push(jug(j) + ' should hold ' + units(ans[j]) + ', not ' + v[j]);
        let t = parts.join('; ');
        if (sum(v) !== T) t += ' (this panel holds ' + units(sum(v)) + ' of water, the row holds ' + T + ')';
        return t;
      };
      const options = [{ spec: { v: ans }, flaws: [] }].concat(pick.map((c) => ({ spec: { v: c.v }, flaws: [c.why, diff(c.v)] })));

      // ---------- correction text
      const evText = (e, cap) => {
        const tail =
          e.k === e.x && e.k === e.room
            ? jug(e.a) + ' is now empty and ' + jug(e.b) + ' exactly full'
            : e.k === e.x
            ? jug(e.a) + ' is now empty'
            : jug(e.b) + ' is now full, ' + units(e.x - e.k) + (e.x - e.k === 1 ? ' stays' : ' stay') + ' in ' + jug(e.a);
        return (
          (cap ? jug(e.a).replace(/^t/, 'T') : jug(e.a)) +
          ' holds ' +
          units(e.x) +
          ', ' +
          jug(e.b) +
          ' has room for ' +
          caps[e.b] +
          ' − ' +
          e.y +
          ' = ' +
          units(e.room) +
          ' → <b>' +
          units(e.k) +
          (e.k === 1 ? '</b> flows (' : '</b> flow (') +
          tail +
          ')'
        );
      };
      const pourWords = (P) =>
        P.length === 1
          ? '<b>' + jug(P[0][0]) + ' is poured into ' + jug(P[0][1]) + '</b>'
          : '<b>first ' + jug(P[0][0]) + ' is poured into ' + jug(P[0][1]) + ', then ' + jug(P[1][0]) + ' into ' + jug(P[1][1]) + '</b>';
      const exCap = capped[0];
      const exEmp = emptied[0];
      const exLine = (e) => 'row ' + (e.r + 1) + ', column ' + (e.c + 1) + ' → ' + (e.c + 2) + ': ' + evText(e);
      const rules = [
        {
          k: 'Fixed jugs, units of volume',
          t:
            'The ' +
            n +
            ' jugs' + (n === 4 ? ' (numbered from the left)' : '') + ' never move or change. The tick marks split each jug into equal <b>units of volume</b>: ' +
            caps.map((c, i) => nm(i) + ' ' + c).join(', ') +
            ' units when full. The jugs have different widths, so one unit is a tall slice in a narrow jug and a thin slice in a wide one: count <b>units (ticks), not heights</b>.',
        },
        {
          k: 'Column 1 → column 2',
          t: 'In every row ' + pourWords(P1) + '. A pour moves as much water as possible and stops as soon as the source is empty or the receiving jug is full (nothing is spilled).',
        },
        {
          k: 'Column 2 → column 3',
          t: 'In every row ' + pourWords(P2) + ', with the same pouring rule.',
        },
        {
          k: 'Both stopping cases',
          t:
            'The visible rows show both ways a pour can stop — ' +
            exLine(exCap) +
            '; ' +
            exLine(exEmp) +
            '. The total amount of water stays the same along each row (' +
            rows.map((row, r) => 'row ' + (r + 1) + ': ' + sum(row[0])).join(', ') +
            ' units).',
        },
        {
          k: 'Missing panel',
          t:
            'Row 3, column 2 holds ' +
            desc(s2) +
            '. ' +
            runSeq(P2, s2)
              .ev.map((e, i) => (i ? 'Then ' + evText(e) : evText(e, true)))
              .join('. ') +
            '. Result: <b>' +
            desc(ans) +
            '</b>.',
        },
      ];

      return {
        panels: [rows[0][0], rows[0][1], rows[0][2], rows[1][0], rows[1][1], rows[1][2], rows[2][0], rows[2][1]].map((v) => ({ v })),
        answer: { v: ans },
        options,
        render: (spec) => drawJugs(J, spec.v),
        key: (spec) => spec.v.join(','),
        rules,
        hint: 'Count units (tick marks), not heights.',
        difficulty: variant === 2 ? 8 : variant === 1 ? 6 : 7,
      };
    },
  });
})();
