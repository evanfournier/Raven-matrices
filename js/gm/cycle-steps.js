/* Hidden cycle (grandmaster): five shapes belong to a hidden cyclic order that is never shown. In every row the shape
 * advances a fixed number of places in that cycle from one column to the next, and the number of places differs from
 * row to row (variant 0: the steps 1, 2 and 3 in some order). The fill follows a separate 3-cycle (white > grey > black)
 * from column to column, each row starting at its own point. Hypotheses checked: all 24 directed cyclic orders of the
 * five shapes x any step per row (residues 0..4, i.e. -4..4); every combination that fits the five visible shape
 * transitions must predict the same shape for the missing panel; simple Raven rules on shapes and fills must not
 * disagree either. */
(function () {
  'use strict';
  const RM = window.RM;

  const SHAPES = ['circle', 'square', 'triangle', 'pentagon', 'star5', 'cross', 'heart', 'crescent', 'drop'];
  const SNAME = { circle: 'circle', square: 'square', triangle: 'triangle', pentagon: 'pentagon', star5: 'star', cross: 'cross', heart: 'heart', crescent: 'crescent', drop: 'drop' };
  const FILLS = ['white', 'gray', 'black'];
  const FN = ['white', 'grey', 'black'];

  function render(sp) {
    const pic = new RM.Pic();
    RM.shape(pic, sp.sh, 50, sp.sh === 'crescent' || sp.sh === 'drop' ? 50 : 50, 30, { fill: FILLS[sp.f], sw: 2.6 });
    return pic.svg();
  }
  const key = (sp) => sp.sh + ':' + sp.f;

  const ORDERS = [];
  (function perms(pre, rest) {
    if (!rest.length) return ORDERS.push([0].concat(pre));
    rest.forEach((x, i) => perms(pre.concat([x]), rest.filter((_, j) => j !== i)));
  })([], [1, 2, 3, 4]);

  RM.register({
    id: 'cycle-steps',
    name: 'Hidden cycle',
    difficulty: 7,
    generate(rng, variant) {
      const shapes = rng.sample(SHAPES, 5);
      const C = shapes.slice(); // hidden cyclic order: C[i] is followed by C[i+1]
      const steps = variant === 0 ? rng.shuffle([1, 2, 3]) : rng.shuffle(rng.sample([1, 2, 3, 4], 3));
      const phi = rng.pick([1, 2]); // fill direction
      const start = [0, 1, 2].map(() => rng.int(0, 4));
      const off = rng.shuffle([0, 1, 2]);
      RM.need(new Set(start).size >= 2);
      const pos = (r, c) => RM.mod(start[r] + steps[r] * c, 5);
      const P = [];
      for (let r = 0; r < 3; r++) {
        P.push([0, 1, 2].map((c) => ({ sh: C[pos(r, c)], f: RM.mod(off[r] + phi * c, 3) })));
      }
      const ans = P[2][2];
      const vis = [].concat(...P).slice(0, 8);
      RM.need(!vis.some((p) => key(p) === key(ans)));
      /* no row shows a constant shape, and no two rows start with the same shape */
      RM.need(new Set(P.map((row) => row[0].sh)).size === 3);

      /* identifiability of the shape rule */
      const idx = (sh) => shapes.indexOf(sh);
      const preds = [];
      for (const ord of ORDERS) {
        // hypothesised cycle: shapes[ord[0]], shapes[ord[1]], ... ; position of shape k
        const posOf = [];
        ord.forEach((s, i) => (posOf[s] = i));
        const okSteps = [];
        let dead = false;
        for (let r = 0; r < 3 && !dead; r++) {
          const p0 = posOf[idx(P[r][0].sh)];
          const list = [];
          for (let s = 0; s < 5; s++) {
            const a = ord[(p0 + s) % 5];
            const b = ord[(p0 + 2 * s) % 5];
            if (a !== idx(P[r][1].sh)) continue;
            if (r < 2 && b !== idx(P[r][2].sh)) continue;
            list.push(s);
          }
          if (!list.length) dead = true;
          okSteps.push(list);
        }
        if (dead) continue;
        const p0 = posOf[idx(P[2][0].sh)];
        okSteps[2].forEach((s) => preds.push(shapes[ord[(p0 + 2 * s) % 5]]));
      }
      RM.need(preds.length > 0 && preds.every((s) => s === ans.sh));
      const gid = (fn) => RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : fn(P[r][c])));
      RM.needNoConflict(gid((p) => idx(p.sh)), idx(ans.sh), 'categorical');
      RM.needNoConflict(gid((p) => p.f), ans.f, 'categorical');

      /* distractors */
      const nm = (s) => SNAME[s];
      const s3 = steps[2];
      const p8 = pos(2, 1);
      const f8 = P[2][1].f;
      const cyc = C.map(nm).join(' → ') + ' → (back to ' + nm(C[0]) + ')';
      const pool = new Map();
      const placeTxt = (k) => (k === 1 ? '1 place' : k + ' places');
      const put = (sh, f, bonus) => {
        if (sh === ans.sh && f === ans.f) return;
        const flaws = [];
        if (sh !== ans.sh) {
          const k = RM.mod(C.indexOf(sh) - p8, 5);
          let t = `the ${nm(sh)} is ${k === 0 ? 'the same shape as panel 8 (no step at all)' : placeTxt(k) + ' after the ' + nm(P[2][1].sh) + ' in the hidden cycle'}, but in row 3 the shape moves ${placeTxt(s3)} per column`;
          if (k === RM.mod(-s3, 5)) t += ' (this goes backwards and returns to the shape of panel 7)';
          else if (k !== 0 && k === steps[0]) t += " (that is row 1's step)";
          else if (k !== 0 && k === steps[1]) t += " (that is row 2's step)";
          flaws.push(t);
        }
        if (f !== ans.f) flaws.push(`the fill follows its own 3-cycle: after ${FN[f8]} comes ${FN[ans.f]}, not ${FN[f]}`);
        const k = sh + ':' + f;
        const kk = sh === ans.sh ? 0 : RM.mod(C.indexOf(sh) - p8, 5) === RM.mod(-s3, 5) ? 0.6 : steps.slice(0, 2).includes(RM.mod(C.indexOf(sh) - p8, 5)) ? 0.2 : 0.8;
        const score = kk + bonus + rng.next() * 0.8;
        if (!pool.has(k) || pool.get(k).score > score) pool.set(k, { spec: { sh, f }, flaws, score });
      };
      for (const sh of shapes)
        for (let f = 0; f < 3; f++) put(sh, f, f === ans.f ? 0 : f === f8 ? 0.9 : 1.2);
      let chosen = null;
      for (let t = 0; t < 40 && !chosen; t++) {
        const list = [...pool.values()].map((o) => ({ o, r: o.score + rng.next() * 1.5 })).sort((a, b) => a.r - b.r).slice(0, 7).map((x) => x.o);
        if (list.filter((o) => o.spec.sh === ans.sh).length >= 2 && list.filter((o) => o.spec.f === ans.f).length >= 3) chosen = list;
      }
      RM.need(chosen);

      /* correction */
      const stepWord = (s) => (s === 4 ? '4 places forward (= 1 place back)' : placeTxt(s) + ' forward');
      const shapeAt = (r, c) => `<b>${nm(P[r][c].sh)}</b>`;
      const rowTxt = (r) => `row ${r + 1}: ${shapeAt(r, 0)} → ${shapeAt(r, 1)}${r < 2 ? ' → ' + shapeAt(r, 2) : ''} = ${stepWord(steps[r])} per column`;
      const rules = [
        { k: 'Hidden cycle', t: `the five shapes follow a cyclic order that is never shown directly: <b>${cyc}</b>. It can be deduced from the rows: in every row the shape moves a constant number of places along this cycle from one column to the next.` },
        { k: 'Steps', t: `the number of places is different in each row: ${rowTxt(0)}; ${rowTxt(1)}; row 3 starts ${shapeAt(2, 0)} → ${shapeAt(2, 1)}, which is ${stepWord(s3)} per column. Only this cycle makes all five visible steps consistent.` },
        { k: 'Fill', t: `the fill is a separate cycle (white → ${phi === 1 ? 'grey → black' : 'black → grey'} → white) that advances one place per column; each row starts at its own fill. Row 3 shows ${FN[P[2][0].f]} then ${FN[f8]}, so the next fill is <b>${FN[ans.f]}</b>.` },
        { k: 'Panel 9', t: `${shapeAt(2, 1)} moved ${stepWord(s3)} along the cycle gives ${shapeAt(2, 2)}. The answer is a <b>${FN[ans.f]} ${nm(ans.sh)}</b>.` },
      ];
      return {
        difficulty: 7,
        hint: 'the order of the shapes is hidden: use the rows to reconstruct it, and note that each row moves at its own speed.',
        panels: vis,
        answer: ans,
        options: [{ spec: ans, flaws: [] }].concat(chosen.map((o) => ({ spec: o.spec, flaws: o.flaws }))),
        render,
        key,
        rules,
      };
    },
  });
})();
