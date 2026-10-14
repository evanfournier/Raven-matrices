/* Rolling die (grandmaster): every picture shows the same die (six symbols, one per face, opposite faces never
 * shown) in isometric view — top, front-left and front-right faces. In each row the die makes the same two moves:
 * column 1 → 2 is one move, column 2 → 3 another (variant 0: two perpendicular rolls over a bottom edge; variant 1:
 * the same roll twice; variant 2: two quarter-turns on the spot; variant 3: a roll and a quarter-turn). The missing
 * die always shows a face that is hidden in both visible pictures of row 3: which symbol is on it has to be deduced
 * from the other rows (opposite faces are the pairs that are never seen together). */
(function () {
  'use strict';
  const RM = window.RM;

  /* ------------------------------------------------------------ die model
   * A state lists the symbol on each world face: 0 top, 1 underneath, 2 front-left, 3 back-right (opposite 2),
   * 4 front-right, 5 back-left (opposite 4). A move is a permutation m: new[p] = old[m[p]]. */
  const U = 0;
  const A = 2;
  const B = 4;
  const OPP = [1, 0, 3, 2, 5, 4];
  const VIS = [U, A, B];
  const POS = ['top', 'underneath', 'front-left', 'back-right', 'front-right', 'back-left'];
  const MOVES = {
    FL: {
      p: [3, 2, 0, 1, 4, 5],
      name: 'rolls over towards the <b>front-left</b>',
      how: 'it tips over its lower front-left edge: the top face goes to the front-left, the front-left face goes underneath, and the face that was at the back-right comes up on top; the front-right face stays where it is',
    },
    BR: {
      p: [2, 3, 1, 0, 4, 5],
      name: 'rolls over towards the <b>back-right</b>',
      how: 'it tips away over its lower back-right edge: the front-left face comes up on top, the top face goes to the back-right, and the face that was underneath comes round to the front-left; the front-right face stays where it is',
    },
    FR: {
      p: [5, 4, 2, 3, 0, 1],
      name: 'rolls over towards the <b>front-right</b>',
      how: 'it tips over its lower front-right edge: the top face goes to the front-right, the front-right face goes underneath, and the face that was at the back-left comes up on top; the front-left face stays where it is',
    },
    BL: {
      p: [4, 5, 2, 3, 1, 0],
      name: 'rolls over towards the <b>back-left</b>',
      how: 'it tips away over its lower back-left edge: the front-right face comes up on top, the top face goes to the back-left, and the face that was underneath comes round to the front-right; the front-left face stays where it is',
    },
    CW: {
      p: [0, 1, 4, 5, 3, 2],
      name: 'turns a quarter-turn <b>clockwise on the spot</b> (seen from above)',
      how: 'the top stays on top; the front-right face comes round to the front-left, and the face that was at the back-right comes round to the front-right',
    },
    CCW: {
      p: [0, 1, 5, 4, 2, 3],
      name: 'turns a quarter-turn <b>anticlockwise on the spot</b> (seen from above)',
      how: 'the top stays on top; the front-left face comes round to the front-right, and the face that was at the back-left comes round to the front-left',
    },
  };
  const ROLLS = ['FL', 'FR', 'BL', 'BR'];
  const SPINS = ['CW', 'CCW'];
  const app = (m, s) => m.map((p) => s[p]);
  const perm = (s, t) => t.map((x) => s.indexOf(x)); // the move m with app(m, s) = t
  const vis = (s) => VIS.map((p) => s[p]);
  const vkey = (v) => v.join('');
  const same = (a, b) => a.join() === b.join();

  /* the 24 rotations, as moves */
  const GROUP = (() => {
    const out = [[0, 1, 2, 3, 4, 5]];
    for (let i = 0; i < out.length; i++)
      ['FL', 'CW'].forEach((g) => {
        const q = app(MOVES[g].p, out[i]);
        if (!out.some((o) => same(o, q))) out.push(q);
      });
    return out;
  })();
  const moveName = (m) => Object.keys(MOVES).find((k) => same(MOVES[k].p, m));

  /* ------------------------------------------------------------ symbols (all with 4-fold symmetry) */
  const SYM = [
    { id: 'disc', name: 'black disc' },
    { id: 'ring', name: 'ring' },
    { id: 'plus', name: 'plus' },
    { id: 'dots', name: 'four-dot pattern' },
    { id: 'square', name: 'black square' },
    { id: 'bars', name: 'grid (#)' },
  ];
  const nm = (i) => SYM[i].name;
  const the = (i) => 'the <i>' + SYM[i].name + '</i>';

  /* ------------------------------------------------------------ drawing */
  const C30 = Math.cos(Math.PI / 6);
  const S = 41;
  const Y0 = 9;
  const CX = 50;
  const P_T = [CX, Y0];
  const P_R = [CX + S * C30, Y0 + S / 2];
  const P_F = [CX, Y0 + S];
  const P_L = [CX - S * C30, Y0 + S / 2];
  const dn = (p) => [p[0], p[1] + S];
  const FACES = [
    { c: [CX, Y0 + S / 2], e1: [S * C30, S / 2], e2: [-S * C30, S / 2], poly: [P_T, P_R, P_F, P_L], fill: '#ffffff' },
    { c: [CX - (S * C30) / 2, Y0 + 1.25 * S], e1: [S * C30, S / 2], e2: [0, S], poly: [P_L, P_F, dn(P_F), dn(P_L)], fill: '#eceef1' },
    { c: [CX + (S * C30) / 2, Y0 + 1.25 * S], e1: [S * C30, -S / 2], e2: [0, S], poly: [P_F, P_R, dn(P_R), dn(P_F)], fill: '#d4d8de' },
  ];
  const map = (f, u, v) => [f.c[0] + (u * f.e1[0] + v * f.e2[0]) / 2, f.c[1] + (u * f.e1[1] + v * f.e2[1]) / 2];
  const ell = (f, cu, cv, r, n) => RM.range(n || 40).map((i) => map(f, cu + r * Math.cos((2 * Math.PI * i) / (n || 40)), cv + r * Math.sin((2 * Math.PI * i) / (n || 40))));
  const quad = (f, cu, cv, h) => [map(f, cu - h, cv - h), map(f, cu + h, cv - h), map(f, cu + h, cv + h), map(f, cu - h, cv + h)];
  const filled = (pic, pts) => RM.polygon(pic, pts, { fill: 'black', sw: 0.6 });
  function symbol(pic, f, id) {
    if (id === 'disc') filled(pic, ell(f, 0, 0, 0.44));
    else if (id === 'ring') RM.polygon(pic, ell(f, 0, 0, 0.5, 48), { fill: 'none', sw: 3 });
    else if (id === 'plus') {
      const w = 0.13;
      const l = 0.66;
      filled(pic, [[-w, -l], [w, -l], [w, -w], [l, -w], [l, w], [w, w], [w, l], [-w, l], [-w, w], [-l, w], [-l, -w], [-w, -w]].map((q) => map(f, q[0], q[1])));
    } else if (id === 'dots') [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach((q) => filled(pic, ell(f, 0.44 * q[0], 0.44 * q[1], 0.17, 24)));
    else if (id === 'square') filled(pic, quad(f, 0, 0, 0.4));
    else if (id === 'bars') {
      [-0.24, 0.24].forEach((t) => {
        RM.line(pic, ...map(f, t, -0.62), ...map(f, t, 0.62), { sw: 2.4, cap: 'butt' });
        RM.line(pic, ...map(f, -0.62, t), ...map(f, 0.62, t), { sw: 2.4, cap: 'butt' });
      });
    }
  }
  function render(sp) {
    const pic = new RM.Pic();
    FACES.forEach((f, i) => {
      RM.polygon(pic, f.poly, { fill: f.fill, sw: 2.2 });
      symbol(pic, f, SYM[sp.v[i]].id);
    });
    RM.polygon(pic, [P_T, P_R, dn(P_R), dn(P_F), dn(P_L), P_L], { fill: 'none', sw: 2.6 });
    return pic.svg();
  }

  /* variant 0: two perpendicular rolls; variant 3: a roll and a spin (either order). Keep only the pairs whose
   * missing die shows a symbol that is hidden in both visible dice of row 3. */
  const probe = [0, 1, 2, 3, 4, 5];
  const reveals = (m1, m2) => {
    const s2 = app(MOVES[m1].p, probe);
    const s3 = app(MOVES[m2].p, s2);
    const seen = vis(probe).concat(vis(s2));
    return vis(s3).some((x) => !seen.includes(x));
  };
  const PAIRS0 = [];
  const PAIRS3 = [];
  ROLLS.forEach((a) =>
    ROLLS.forEach((b) => {
      if (a !== b && !same(app(MOVES[a].p, MOVES[b].p), probe) && reveals(a, b)) PAIRS0.push([a, b]);
    })
  );
  ROLLS.forEach((a) =>
    SPINS.forEach((b) => {
      if (reveals(a, b)) PAIRS3.push([a, b]);
      if (reveals(b, a)) PAIRS3.push([b, a]);
    })
  );

  RM.register({
    id: 'cube-roll',
    name: 'Rolling die',
    difficulty: 8,
    generate(rng, variant) {
      const v = variant % 4;
      let mv;
      if (v === 0) mv = rng.pick(PAIRS0);
      else if (v === 1) {
        const d = rng.pick(ROLLS);
        mv = [d, d];
      } else if (v === 2) {
        const d = rng.pick(SPINS);
        mv = [d, d];
      } else mv = rng.pick(PAIRS3);
      const M1 = MOVES[mv[0]].p;
      const M2 = MOVES[mv[1]].p;
      const base = rng.shuffle([0, 1, 2, 3, 4, 5]);
      let F;
      let V;
      for (let tries = 0; ; tries++) {
        RM.need(tries < 40);
        F = rng.sample(GROUP, 3).map((g) => {
          const s0 = app(g, base);
          const s1 = app(M1, s0);
          return [s0, s1, app(M2, s1)];
        });
        V = F.map((row) => row.map(vis));
        if (new Set(RM.flat(V).concat([V[2][2]]).map(vkey)).size === 9) break;
      }
      const ans = F[2][2];
      const s32 = F[2][1];
      const ansV = V[2][2];
      const row3seen = V[2][0].concat(V[2][1]);
      const fresh = ansV.filter((x) => !row3seen.includes(x));
      RM.need(fresh.length >= 1);

      /* opposite pairs must be readable from the pictures: x and y are opposite when x has been seen next to
       * the four other symbols, never next to y */
      const nb = RM.range(6).map(() => new Set());
      RM.flat(V)
        .slice(0, 8)
        .forEach((t) => t.forEach((x) => t.forEach((y) => x !== y && nb[x].add(y))));
      const oppOf = (x) => base[OPP[base.indexOf(x)]];
      const evidence = (x) => {
        const y = oppOf(x);
        if (nb[x].size === 4) return [x, y];
        if (nb[y].size === 4) return [y, x];
        return null;
      };
      fresh.forEach((x) => RM.need(evidence(x)));

      /* uniqueness: every die consistent with the 8 pictures (the 6 ways to put the 3 unseen symbols of panel
       * 1 opposite its 3 visible ones) × every reading: one rotation per column step (24 × 24, world frame),
       * one rotation per step in the die's own frame, and the same two readings down the columns. */
      const preds = new Set();
      let intended = false;
      const hid = [1, 3, 5];
      const rest = [0, 1, 2, 3, 4, 5].filter((x) => !V[0][0].includes(x));
      [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].forEach((pp) => {
        const c = F[0][0].slice();
        hid.forEach((p, i) => (c[p] = rest[pp[i]]));
        const orient = {};
        GROUP.forEach((g) => {
          const s = app(g, c);
          orient[vkey(vis(s))] = s;
        });
        const G = V.map((row) => row.map((t) => orient[vkey(t)]));
        if (G.some((row, r) => row.some((s, k) => !s && !(r === 2 && k === 2)))) return;
        const isTrue = same(c, F[0][0]);
        // world frame, along rows
        const T1 = perm(G[0][0], G[0][1]);
        const T2 = perm(G[0][1], G[0][2]);
        if ([1, 2].every((r) => same(app(T1, G[r][0]), G[r][1])) && same(app(T2, G[1][1]), G[1][2])) {
          const p = vkey(vis(app(T2, G[2][1])));
          preds.add(p);
          if (isTrue) intended = true;
        }
        // die's own frame, along rows: symbol x always becomes symbol pi(x)
        const pi = (s, t) => {
          const o = [];
          s.forEach((x, i) => (o[x] = t[i]));
          return o;
        };
        const P1 = pi(G[0][0], G[0][1]);
        const P2 = pi(G[0][1], G[0][2]);
        if ([1, 2].every((r) => same(G[r][0].map((x) => P1[x]), G[r][1])) && same(G[1][1].map((x) => P2[x]), G[1][2])) preds.add(vkey(vis(G[2][1].map((x) => P2[x]))));
        // the same two readings down the columns
        const K1 = perm(G[0][0], G[1][0]);
        const K2 = perm(G[1][0], G[2][0]);
        if ([1, 2].every((k) => same(app(K1, G[0][k]), G[1][k])) && same(app(K2, G[1][1]), G[2][1])) preds.add(vkey(vis(app(K2, G[1][2]))));
        const Q1 = pi(G[0][0], G[1][0]);
        const Q2 = pi(G[1][0], G[2][0]);
        if ([1, 2].every((k) => same(G[0][k].map((x) => Q1[x]), G[1][k])) && same(G[1][1].map((x) => Q2[x]), G[2][1])) preds.add(vkey(vis(G[1][2].map((x) => Q2[x]))));
      });
      RM.need(intended && preds.size === 1 && preds.has(vkey(ansV)));

      /* no simple Raven rule on a single face (or on the picture as a whole) may point elsewhere */
      [0, 1, 2].forEach((i) => RM.needNoConflict(RM.grid3((r, k) => (r === 2 && k === 2 ? undefined : V[r][k][i])), ansV[i], 'categorical'));
      RM.needNoConflict(RM.grid3((r, k) => (r === 2 && k === 2 ? undefined : vkey(V[r][k].slice().sort()))), vkey(ansV.slice().sort()), 'categorical');
      RM.needNoConflict(RM.grid3((r, k) => (r === 2 && k === 2 ? undefined : vkey(V[r][k]))), vkey(ansV), 'categorical');

      /* ------------------------------------------------ distractors
       * Two clusters, so the answer is not the "average" option: the answer with 2 impossible neighbours (a hidden
       * face guessed wrong, a mirror image), a tempting wrong move W with 2 impossible neighbours of its own, and
       * 2 more real positions of the die reached by other wrong moves. */
      const ansK = vkey(ansV);
      const at = (p) => (POS[p] === 'top' ? 'on top' : 'at the ' + POS[p]);
      const orients = GROUP.map((g) => vkey(vis(app(g, ans))));
      const flawOf = (t) => {
        const out = [];
        [[0, 1], [0, 2], [1, 2]].forEach(([i, j]) => {
          if (oppOf(t[i]) === t[j]) out.push(`${the(t[i])} and ${the(t[j])} are opposite faces (they are never seen together), so they cannot both be visible`);
        });
        if (out.length) return out;
        if (!orients.includes(vkey(t))) return [`a mirror image of the real die: with ${the(t[0])} on top and ${the(t[1])} at the front-left, the real die shows ${the(oppOf(t[2]))} at the front-right`];
        return null;
      };
      const place = (t) => `${the(t[0])} on top, ${the(t[1])} front-left and ${the(t[2])} front-right`;
      const valid = [];
      const addV = (tier, t, why) => {
        const k = vkey(t);
        if (k === ansK || valid.some((c) => c.k === k)) return;
        valid.push({ k, t, tier, why: [why] });
      };
      Object.keys(MOVES).forEach((k) => {
        if (k === mv[1]) return;
        const why = k === mv[0] ? `the die repeated the first move; from column 2 to column 3 it ${MOVES[mv[1]].name}` : `this is the die after it ${MOVES[k].name}; from column 2 to column 3 it ${MOVES[mv[1]].name}`;
        addV(k === mv[0] || SPINS.includes(k) !== SPINS.includes(mv[1]) ? 1 : 2, vis(app(MOVES[k].p, s32)), why);
      });
      SPINS.forEach((k) => addV(1, vis(app(MOVES[k].p, ans)), `the die is turned a quarter-turn on the spot: after the move it shows ${place(ansV)}`));
      addV(1, vis(app(M2, F[2][0])), 'the second move was applied to the 1st die of row 3 instead of the 2nd');
      if (mv[0] !== mv[1]) addV(1, vis(app(M1, app(M2, F[2][0]))), 'the two moves were made in the wrong order');
      addV(2, vis(app(M2, ans)), 'the die made one move too many');
      addV(3, V[2][1], 'this is the 2nd die of row 3 unchanged — the die has not moved');
      addV(3, V[0][2], 'this is the last die of row 1; it does not follow from the 2nd die of row 3');
      addV(3, V[1][2], 'this is the last die of row 2; it does not follow from the 2nd die of row 3');
      // impossible dice next to a real position t: one face replaced by a hidden symbol, or two faces swapped
      const around = (t, isAns) => {
        const out = [];
        t.forEach((x, i) =>
          [0, 1, 2, 3, 4, 5]
            .filter((y) => !t.includes(y))
            .forEach((y) => {
              const u = t.slice();
              u[i] = y;
              let why = flawOf(u);
              if (isAns && oppOf(y) === x) why = [`${the(y)} is on the face opposite ${the(x)} — it is hidden ${POS[OPP[VIS[i]]] === 'underneath' ? 'underneath' : 'at the ' + POS[OPP[VIS[i]]]}, and ${the(x)} must be ${at(VIS[i])}`];
              out.push({ k: vkey(u), t: u, tier: isAns && fresh.includes(x) ? 0 : 1, why });
            })
        );
        [[0, 1], [1, 2], [0, 2]].forEach(([i, j]) => {
          const u = t.slice();
          [u[i], u[j]] = [u[j], u[i]];
          out.push({ k: vkey(u), t: u, tier: 1, why: [`${the(t[i])} and ${the(t[j])} have swapped places — a mirror image, no real turn of the die gives this`] });
        });
        return out;
      };
      const nearAns = around(ansV, true);
      const byTier = (arr) => [0, 1, 2, 3].reduce((acc, tier) => acc.concat(rng.shuffle(arr.filter((c) => c.tier === tier))), []);
      const score = (o, all) => [0, 1, 2].reduce((acc, i) => acc + all.filter((q) => q.t[i] === o.t[i]).length, 0);
      let pick = null;
      for (let tries = 0; tries < 40 && !pick; tries++) {
        const vs = byTier(valid);
        const W = vs[rng.int(0, Math.min(2, vs.length - 1))];
        if (!W) break;
        const sel = [];
        const take = (c) => {
          if (c && c.k !== ansK && !sel.some((q) => q.k === c.k)) sel.push(c);
        };
        const na = byTier(nearAns);
        take(na[0]);
        take(rng.pick(na.slice(1)));
        take(W);
        rng.shuffle(around(W.t, false)).forEach((c) => sel.length < 5 && take(c));
        vs.forEach((c) => sel.length < 7 && take(c));
        if (sel.length < 7) continue;
        const all = [{ t: ansV }].concat(sel);
        if (![0, 1, 2].every((i) => sel.some((c) => c.t[i] === ansV[i]))) continue;
        const s0 = score(all[0], all);
        if (!sel.some((c) => score(c, all) >= s0)) continue;
        pick = sel;
      }
      RM.need(pick);
      pick.forEach((c) => RM.need(c.why && c.why.length));
      const opts = [{ v: ansV }].concat(pick.map((c) => ({ v: c.t })));

      /* ------------------------------------------------ correction */
      const ex = (s, t, m) => {
        // describe, for row 1, what one move did
        const parts = [];
        VIS.forEach((p, i) => {
          const src = MOVES[m].p[p];
          if (src === p) parts.push(`${the(t[i])} stays ${POS[p] === 'top' ? 'on top' : 'at the ' + POS[p]}`);
          else if (VIS.includes(src)) parts.push(`${the(t[i])} goes from the ${POS[src]} to the ${POS[p]}`);
          else parts.push(`${the(t[i])} appears ${POS[p] === 'top' ? 'on top' : 'at the ' + POS[p]}`);
        });
        return parts.join(', ');
      };
      const rules = [
        {
          k: 'One die',
          t: 'all the pictures show the <b>same die</b>, seen from the same corner (top, front-left and front-right faces); each symbol is drawn flat on its face, in perspective (on the top face the plus looks like an ×, the square like a diamond). Each symbol stays on its own face, so two symbols seen together are never opposite: <b>a symbol is opposite the one symbol it never appears with</b>.',
        },
      ];
      if (mv[0] === mv[1])
        rules.push({ k: 'Move', t: `at each step the die ${MOVES[mv[0]].name}: ${MOVES[mv[0]].how}. Row 1, column 1 → 2: ${ex(V[0][0], V[0][1], mv[0])}.` });
      else {
        rules.push({ k: 'Column 1 → 2', t: `the die ${MOVES[mv[0]].name}: ${MOVES[mv[0]].how}. Row 1: ${ex(V[0][0], V[0][1], mv[0])}.` });
        rules.push({ k: 'Column 2 → 3', t: `then it ${MOVES[mv[1]].name}: ${MOVES[mv[1]].how}. Row 1: ${ex(V[0][1], V[0][2], mv[1])}.` });
      }
      const oppTxt = fresh.map((x) => {
        const [p, q] = evidence(x);
        const others = [...nb[p]].sort((a, b) => a - b).map(the);
        const tail = RM.flat(V).some((t) => t.includes(q)) ? `but never next to ${the(q)}` : `so the face opposite it is the one symbol that appears in no picture at all, ${the(q)}`;
        return `${the(p)} is seen next to ${others.slice(0, 3).join(', ')} and ${others[3]}, ${tail}: <b>${nm(p)} and ${nm(q)} are opposite faces</b>.`;
      });
      rules.push({ k: 'Hidden face', t: oppTxt.join(' ') });
      const steps = [];
      VIS.forEach((p, i) => {
        const src = M2[p];
        const x = ansV[i];
        const where = POS[p] === 'top' ? 'on top' : 'at the ' + POS[p];
        if (src === p) steps.push(`${the(x)} stays ${where}`);
        else if (VIS.includes(src)) steps.push(`${the(x)} moves from the ${POS[src]} to the ${POS[p]}`);
        else {
          const o = OPP[src];
          steps.push(`${where} comes the face that was hidden ${POS[src] === 'underneath' ? 'underneath' : 'at the ' + POS[src]}, opposite ${the(s32[o])} (${POS[o] === 'top' ? 'on top' : POS[o]}): ${the(x)}`);
        }
      });
      rules.push({
        k: 'Answer',
        t: `the 2nd die of row 3 shows ${place(V[2][1])}. After the move ${steps.join('; ')}. Answer: <b>${nm(ansV[0])} on top, ${nm(ansV[1])} front-left, ${nm(ansV[2])} front-right</b>.`,
      });

      return {
        difficulty: v === 2 ? 7 : 8,
        hint: v === 2 ? 'the die turns without tipping — remember what is behind it.' : 'a die tumbles — remember what is underneath.',
        panels: RM.flat(V)
          .slice(0, 8)
          .map((t) => ({ v: t })),
        answer: { v: ansV },
        options: opts.map((o, i) => ({ spec: o, flaws: i ? pick[i - 1].why : [] })),
        key: (sp) => vkey(sp.v),
        render,
        rules,
      };
    },
  });
})();
