/* Three viewpoints (grandmaster): each row is one arrangement of 4–5 objects standing on a hidden 3×3 floor,
 * photographed orthographically from three sides (front, right side, behind — variants change the 2nd/3rd camera).
 * Objects in the same line of sight overlap (the nearer one is drawn in front). The solver must work out which
 * camera each column uses, rebuild the floor plan of row 3 from its first two photos, and draw the third photo,
 * with left/right AND the overlaps transformed correctly. */
(function () {
  'use strict';
  const RM = window.RM;

  const GY = 88; // ground line
  const LX = [20, 50, 80]; // lane centres in a photo
  const OBJ = {
    col: { name: 'black column', h: 68, w: () => 5 },
    cone: { name: 'gray cone', h: 44, w: (h) => 10.5 * (1 - h / 44) },
    box: { name: 'white box', h: 20, w: () => 14 },
    ball: {
      name: 'striped ball',
      h: 57,
      w: (h) => {
        const d = h - 47;
        return Math.max(h <= 42 ? 2.5 : 0, d * d < 100 ? Math.sqrt(100 - d * d) : 0);
      },
    },
    pyr: { name: 'dotted pyramid', h: 30, w: (h) => (h < 10 ? 13.5 : h < 20 ? 10 : 6.5) },
  };
  // sampled half-width profiles (step 1) for the "completely hidden" test
  Object.keys(OBJ).forEach((id) => {
    const o = OBJ[id];
    o.p = [];
    for (let h = 0; h <= o.h; h++) o.p.push(o.w(Math.min(h, o.h - 0.01)));
  });
  function covered(p, nearer) {
    const P = OBJ[p].p;
    for (let h = 0; h < P.length; h++) {
      let m = -1;
      for (const q of nearer) if (h < OBJ[q].p.length) m = Math.max(m, OBJ[q].p[h]);
      if (P[h] > m + 0.4) return false;
    }
    return true;
  }

  /* camera d: S front, E right side, N behind, W left side; m = photo mirrored left-right.
   * lane 0..2 = left..right of the photo; dep small = near the camera. */
  function view(arr, d, m) {
    const lanes = [[], [], []];
    for (const id in arr) {
      const [x, y] = arr[id];
      let lane, dep;
      if (d === 'S') (lane = x), (dep = y);
      else if (d === 'N') (lane = 2 - x), (dep = 2 - y);
      else if (d === 'E') (lane = y), (dep = 2 - x);
      else (lane = 2 - y), (dep = x);
      if (m) lane = 2 - lane;
      lanes[lane].push([id, dep]);
    }
    return lanes.map((L) => {
      L.sort((a, b) => a[1] - b[1]); // near first
      const vis = [];
      const near = [];
      for (const [id] of L) {
        if (!covered(id, near)) vis.unshift(id); // far first (drawing order)
        near.push(id);
      }
      return vis;
    });
  }
  const vkey = (v) => v.map((L) => L.join(',')).join('|');
  const TR = [];
  ['S', 'E', 'N', 'W'].forEach((d) => [0, 1].forEach((m) => TR.push({ d, m })));

  const DIRNAME = { S: 'the front', E: 'the right-hand side', N: 'behind', W: 'the left-hand side' };
  const POS = ['left', 'middle', 'right'];
  const nm = (id) => OBJ[id].name;

  function laneText(L) {
    if (!L.length) return 'nothing';
    if (L.length === 1) return 'the ' + nm(L[0]);
    if (L.length === 2) return 'the ' + nm(L[1]) + ' in front of the ' + nm(L[0]);
    return L.slice().reverse().map((id) => 'the ' + nm(id)).join(', then ');
  }
  function viewText(v) {
    return v.map((L, i) => POS[i] + ': ' + laneText(L)).join('; ');
  }
  // concrete difference between a wrong option and the answer
  function diff(c, a) {
    const where = (v) => {
      const o = {};
      v.forEach((L, i) => L.forEach((id, j) => (o[id] = { lane: i, L, j })));
      return o;
    };
    const wc = where(c);
    const wa = where(a);
    const out = [];
    for (const id in wa) if (!wc[id]) out.push('the ' + nm(id) + ' is missing — no object here is big enough to hide another one completely');
    const moved = Object.keys(wa).filter((id) => wc[id] && wc[id].lane !== wa[id].lane);
    moved.slice(0, 2).forEach((id) => out.push('the ' + nm(id) + ' should be in the ' + POS[wa[id].lane] + ' position, not the ' + POS[wc[id].lane]));
    if (!out.length) {
      a.forEach((L, i) => {
        if (L.length === 2 && c[i].join() !== L.join())
          out.push('in the ' + POS[i] + ' position the ' + nm(L[1]) + ' should stand in front of the ' + nm(L[0]) + ', not behind it');
      });
    }
    return out;
  }

  function render(v) {
    const pic = new RM.Pic();
    v.forEach((L, i) => {
      const cx = LX[i];
      L.forEach((id) => {
        if (id === 'col') pic.add(`<rect x="${cx - 5}" y="${GY - 68}" width="10" height="68" fill="${pic.paint('black')}" stroke="${RM.INK}" stroke-width="1.6"/>`);
        else if (id === 'cone') RM.polygon(pic, [[cx - 10.5, GY], [cx, GY - 44], [cx + 10.5, GY]], { fill: 'gray', sw: 1.8 });
        else if (id === 'box') pic.add(`<rect x="${cx - 14}" y="${GY - 20}" width="28" height="20" fill="#fff" stroke="${RM.INK}" stroke-width="2"/>`);
        else if (id === 'ball') {
          pic.add(`<rect x="${cx - 2.5}" y="${GY - 42}" width="5" height="42" fill="${pic.paint('dark')}" stroke="${RM.INK}" stroke-width="1.2"/>`);
          RM.circle(pic, cx, GY - 47, 10, { fill: 'hatch', sw: 2 });
        } else if (id === 'pyr') {
          const s = [[13.5, 0], [13.5, 10], [10, 10], [10, 20], [6.5, 20], [6.5, 30]];
          const pts = s.map(([dx, h]) => [cx - dx, GY - h]).concat(s.slice().reverse().map(([dx, h]) => [cx + dx, GY - h]));
          RM.polygon(pic, pts, { fill: 'dots', sw: 1.8 });
        }
      });
    });
    RM.line(pic, 5, GY, 95, GY, { sw: 2 });
    return pic.svg();
  }

  const CELLS = [];
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) CELLS.push([x, y]);

  function randomArr(rng, ids) {
    for (let t = 0; t < 60; t++) {
      const cs = rng.sample(CELLS, ids.length);
      const cx = [0, 0, 0];
      const cy = [0, 0, 0];
      cs.forEach(([x, y]) => (cx[x]++, cy[y]++));
      if (Math.max(...cx) > 2 || Math.max(...cy) > 2) continue;
      const arr = {};
      ids.forEach((id, i) => (arr[id] = cs[i]));
      return arr;
    }
    throw RM.RETRY;
  }

  // every arrangement with the same front photo (x is fixed by it, only y can vary)
  function alternatives(arr, ids) {
    const fk = vkey(view(arr, 'S', 0));
    const out = [];
    const cur = {};
    const used = new Set();
    (function rec(i) {
      if (i === ids.length) {
        if (vkey(view(cur, 'S', 0)) === fk) out.push(TR.map((t) => vkey(view(cur, t.d, t.m))));
        return;
      }
      const id = ids[i];
      const x = arr[id][0];
      for (let y = 0; y < 3; y++) {
        if (used.has(x * 3 + y)) continue;
        used.add(x * 3 + y);
        cur[id] = [x, y];
        rec(i + 1);
        used.delete(x * 3 + y);
      }
      delete cur[id];
    })(0);
    return out;
  }

  const FLOORX = ['left', 'centre', 'right'];
  const FLOORY = ['front', 'middle', 'back'];

  RM.register({
    id: 'viewpoint',
    name: 'Three viewpoints',
    difficulty: 8,
    generate(rng, variant) {
      const V = [
        { c2: 'E', c3: 'N' },
        { c2: 'W', c3: 'N' },
        { c2: 'E', c3: 'N' },
        { c2: 'E', c3: 'W' },
      ][variant];
      const ids = variant === 2 ? ['col', 'cone', 'box', 'ball', 'pyr'] : ['col', 'cone', 'box', 'ball'];
      const arrs = [0, 1, 2].map(() => randomArr(rng, ids));
      const views = arrs.map((a) => [view(a, 'S', 0), view(a, V.c2, 0), view(a, V.c3, 0)]);
      const K = views.map((r) => r.map(vkey));
      const all = [].concat(...K);
      RM.need(new Set(all).size === 9);
      // every photo must show every object (the design guarantees it, double-check)
      views.forEach((r) => r.forEach((v) => RM.need([].concat(...v).length === ids.length)));
      const ans = views[2][2];
      const ansKey = K[2][2];

      /* uniqueness: hypotheses = any camera (4 directions × mirrored or not) for columns 2 and 3, relative to
       * column 1; a hypothesis survives if rows 1–2 fit it with SOME floor plan; every surviving hypothesis,
       * applied to EVERY floor plan that fits row 3's first two photos, must give the same third photo. */
      const alts = arrs.map((a) => alternatives(a, ids));
      const preds = new Set();
      let intended = false;
      for (let t2 = 0; t2 < 8; t2++)
        for (let t3 = 0; t3 < 8; t3++) {
          if (![0, 1].every((r) => alts[r].some((k) => k[t2] === K[r][1] && k[t3] === K[r][2]))) continue;
          alts[2].forEach((k) => {
            if (k[t2] === K[2][1]) preds.add(k[t3]);
          });
          if (TR[t2].d === V.c2 && !TR[t2].m && TR[t3].d === V.c3 && !TR[t3].m) intended = true;
        }
      RM.need(intended && preds.size === 1 && preds.has(ansKey));

      /* no shortcut: an object's position / front-back status must not follow a simple Raven pattern */
      const feat = (v) => {
        const o = {};
        v.forEach((L, i) =>
          L.forEach((id, j) => {
            o[id + '@'] = i;
            o[id + ':'] = L.length === 1 ? 'alone' : j === L.length - 1 ? 'front' : 'back';
          })
        );
        return o;
      };
      const F = views.map((r) => r.map(feat));
      Object.keys(F[2][2]).forEach((f) => RM.needNoConflict(RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : F[r][c][f])), F[2][2][f], 'categorical'));

      /* distractors */
      const cand = [];
      const add = (v, tier, why) => cand.push({ v, tier, why });
      const a3 = arrs[2];
      const camName = (t) => (t.d === 'S' ? 'the front view' : t.d === V.c2 && !t.m ? 'the view from ' + DIRNAME[t.d] + ' (like column 2)' : 'the view from ' + DIRNAME[t.d]);
      TR.forEach((t) => {
        const v = view(a3, t.d, t.m);
        if (!t.m) {
          const tier = t.d === 'S' || t.d === V.c2 ? 2 : 0;
          add(v, tier, 'this is ' + camName(t) + (t.d === 'S' ? ' (column 1 again)' : '') + ', not the photo taken from ' + DIRNAME[V.c3]);
        } else {
          add(v, t.d === V.c3 || t.d === 'S' ? 0 : 1, 'this is ' + camName(t) + ' flipped left-to-right — a mirror image, not a real photo: the overlaps are those seen from ' + DIRNAME[t.d] + ' but the left–right order is not');
        }
      });
      ans.forEach((L, i) => {
        if (L.length === 2) {
          const v = RM.clone(ans);
          v[i] = [L[1], L[0]];
          add(v, 0, null);
          const w = RM.clone(ans);
          w[i] = [L[1]];
          add(w, 1, null);
        }
      });
      const flat = [];
      ans.forEach((L, i) => L.forEach((id, j) => flat.push([id, i, j])));
      flat.forEach(([p, i, j], a) =>
        flat.forEach(([q, k, l], b) => {
          if (b <= a || i === k) return;
          const v = RM.clone(ans);
          v[i][j] = q;
          v[k][l] = p;
          add(v, 1, 'the ' + nm(p) + ' and the ' + nm(q) + ' have swapped places');
        })
      );
      const seen = new Set([ansKey]);
      const pool = [];
      rng.shuffle(cand)
        .sort((x, y) => x.tier - y.tier)
        .forEach((c) => {
          const k = vkey(c.v);
          if (seen.has(k)) return;
          seen.add(k);
          const d = diff(c.v, ans);
          pool.push({ spec: c.v, flaws: (c.why ? [c.why] : []).concat(d) });
        });
      RM.need(pool.length >= 7);
      const chosen = pool.slice(0, 7);
      // no feature (object position or front/back status) may appear only in the answer
      const fo = chosen.map((o) => feat(o.spec));
      const fa = feat(ans);
      RM.need(Object.keys(fa).every((f) => fo.some((o) => o[f] === fa[f])));
      chosen.forEach((o) => RM.need(o.flaws.length > 0));

      /* correction */
      const c2side = V.c2 === 'E' ? 'right' : 'left';
      const plan = ids.map((id) => 'the ' + nm(id) + ' — ' + FLOORY[a3[id][1]] + ' row, ' + FLOORX[a3[id][0]]).join('; ');
      const camText = (d) =>
        d === 'E'
          ? 'from the <b>right-hand side</b>: the front of the floor appears on the left of the photo, and objects further to the right are nearer the camera (drawn in front)'
          : d === 'W'
          ? 'from the <b>left-hand side</b>: the back of the floor appears on the left of the photo, and objects further to the left are nearer the camera (drawn in front)'
          : 'from <b>behind</b>: left and right are swapped (the floor’s right side appears on the left of the photo) and the overlaps are reversed — the objects at the back are now the nearest';
      const rules = [
        {
          k: 'One scene, three cameras',
          t: `Each row shows the same ${ids.length} objects standing on a hidden 3×3 floor (at most one per square), photographed straight from three sides. Objects lined up one behind the other overlap: the nearer one is drawn in front and hides part of the farther one, but never all of it.`,
        },
        {
          k: 'Which camera?',
          t: `Column 1 is the photo from the <b>front</b>. Column 2 is taken ${camText(V.c2)}. Column 3 is taken ${camText(V.c3)}. The positions and overlaps in rows 1 and 2 fit these cameras (try it: rebuild their floors and re-photograph them).`,
        },
        {
          k: 'Floor plan of row 3',
          t: `The front photo gives each object’s left/centre/right column (and who stands in front in the same column); the ${c2side}-side photo gives its front/middle/back row. Row 3: ${plan}.`,
        },
        {
          k: 'The missing photo',
          t: `Photographing this floor ${V.c3 === 'N' ? 'from behind' : 'from the left-hand side'} gives, from left to right of the photo: <b>${viewText(ans)}</b>.`,
        },
      ];

      return {
        panels: [views[0][0], views[0][1], views[0][2], views[1][0], views[1][1], views[1][2], views[2][0], views[2][1]],
        answer: ans,
        options: [{ spec: ans, flaws: [] }].concat(chosen),
        render,
        key: vkey,
        rules,
        hint: 'Three photos of the same table, taken from three different sides.',
      };
    },
  });
})();
