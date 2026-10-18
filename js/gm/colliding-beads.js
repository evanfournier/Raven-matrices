/* Colliding beads (grandmaster): beads slide along a wire, one notch per tick, all at the same speed, in the
 * direction of their arrows. Two beads that meet bounce (both turn around), so beads never overtake each other;
 * a bead that slides past an end of the wire falls off (variants 2–3: the ends are walls that send it back).
 * Each column shows the wire k ticks after the column to its left (k = 3, 2, 4, 3 for variants 0–3).
 * Shortcut: the arrows move exactly as if the beads passed through each other, while the fills keep their
 * left-to-right order. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 8;
  const X0 = 11.5;
  const DX = 11;
  const WY = 56;
  const AY = 38.5;
  const BRX = 4.1;
  const BRY = 8;
  const xOf = (p) => X0 + DX * p;
  const FILLS = ['black', 'white', 'gray', 'stripe', 'eye'];
  const FN = { black: 'black', white: 'white', gray: 'grey', stripe: 'striped', eye: 'bull’s-eye' };
  const PAINT = { black: 'black', white: 'white', gray: 'gray', stripe: 'lines:0:2.8:1.2', eye: 'white' };
  const COLL = ['bounce', 'pass', 'block', 'stick'];
  const ENDS = ['fall', 'early', 'reflect', 'mirror', 'stop', 'wrap'];
  const dch = (d) => (d > 0 ? 'r' : d < 0 ? 'l' : 's');
  const skey = (st, nofill) => st.map((b) => b.p + dch(b.d) + (nofill ? '' : b.f)).join(',');
  const sortSt = (a) => a.sort((u, v) => u.p - v.p || u.d - v.d);
  const valid = (st) => st.every((b, i) => i === 0 || b.p > st[i - 1].p);
  const outward = (p, d) => (p === 0 && d < 0) || (p === N - 1 && d > 0);

  /* "Ghost" models: every arrow moves on its own. bounce = fills keep their left-to-right order (true physics
   * of equal-speed elastic beads); pass = fills travel with their arrows (beads pass through each other). */
  function ghostTick(st, coll, end, ev) {
    let L = 0;
    let R = 0;
    const gs = [];
    for (const b of st) {
      let p = b.p + b.d;
      let d = b.d;
      if (end === 'wrap') p = RM.mod(p, N);
      else if (p < 0 || p >= N) {
        if (end === 'fall' || end === 'early') {
          if (p < 0) L++;
          else R++;
          if (ev) ev.fall++;
          continue;
        }
        if (ev) ev.wall++;
        if (end === 'reflect') {
          p = b.p;
          d = -d;
        } else if (end === 'mirror') {
          p = p < 0 ? 1 : N - 2;
          d = -d;
        } else {
          p = b.p;
          d = 0;
        }
      }
      if (end === 'early' && outward(p, d)) {
        if (p === 0) L++;
        else R++;
        continue;
      }
      gs.push({ p, d, f: b.f, o: b.p });
    }
    if (ev) {
      for (let i = 0; i < gs.length; i++)
        for (let j = i + 1; j < gs.length; j++) if (gs[i].o < gs[j].o && gs[i].p >= gs[j].p) ev.coll++;
    }
    sortSt(gs);
    if (coll === 'bounce' && end !== 'wrap') {
      const fills = st.map((b) => b.f).slice(L, st.length - R);
      gs.forEach((g, i) => (g.f = fills[i]));
    }
    return gs.map((g) => ({ p: g.p, d: g.d, f: g.f }));
  }

  /* Discrete "blocked" models: a bead whose next notch is contested (or taken by a bead that stays) does not
   * move; block = it turns around in place, stick = it stops for good. */
  function blockTick(st, coll, end) {
    const n = st.length;
    const t = [];
    const nd = [];
    const gone = [];
    const hold = [];
    st.forEach((b, i) => {
      nd[i] = b.d;
      gone[i] = false;
      hold[i] = b.d === 0;
      t[i] = b.p;
      if (hold[i]) return;
      let p = b.p + b.d;
      if (end === 'wrap') p = RM.mod(p, N);
      else if (p < 0 || p >= N) {
        if (end === 'fall' || end === 'early') {
          gone[i] = true;
          return;
        }
        if (end === 'mirror') {
          p = p < 0 ? 1 : N - 2;
          nd[i] = -b.d;
        } else {
          hold[i] = true;
          nd[i] = end === 'reflect' ? -b.d : 0;
          return;
        }
      }
      t[i] = p;
    });
    const blk = st.map(() => false);
    const still = (j) => hold[j] || blk[j];
    let ch = true;
    while (ch) {
      ch = false;
      for (let i = 0; i < n; i++) {
        if (gone[i] || still(i)) continue;
        for (let j = 0; j < n; j++) {
          if (j === i || gone[j]) continue;
          const tj = still(j) ? st[j].p : t[j];
          if (tj === t[i] || (!still(j) && t[i] === st[j].p && t[j] === st[i].p)) {
            blk[i] = true;
            ch = true;
            break;
          }
        }
      }
    }
    const out = [];
    st.forEach((b, i) => {
      if (gone[i]) return;
      let p = t[i];
      let d = nd[i];
      if (blk[i]) {
        p = b.p;
        d = coll === 'block' ? -b.d : 0;
      }
      if (end === 'early' && outward(p, d)) return;
      out.push({ p, d, f: b.f });
    });
    return sortSt(out);
  }

  const tick = (st, coll, end, ev) => (coll === 'bounce' || coll === 'pass' ? ghostTick(st, coll, end, ev) : blockTick(st, coll, end));
  function run(st, k, coll, end, ev) {
    let s = st;
    for (let i = 0; i < k; i++) s = tick(s, coll, end, ev);
    return s;
  }

  RM.register({
    id: 'colliding-beads',
    name: 'Colliding beads',
    difficulty: 7,
    generate(rng, variant) {
      const v = variant % 4;
      const K = [3, 2, 4, 3][v];
      const walls = v >= 2;
      const END = walls ? 'reflect' : 'fall';
      const MB = [[4, 5], [4, 5], [3, 4], [3, 4]][v];
      const start = (m) => {
        const ps = rng.sample(RM.range(N), m).sort((a, b) => a - b);
        const fs = rng.sample(FILLS, m);
        return ps.map((p, i) => ({ p, d: rng.chance(0.5) ? 1 : -1, f: fs[i] }));
      };
      const ends = (e) => (walls ? e.wall : e.fall);
      const mkRow = (r, needEnd) => {
        for (let tries = 0; tries < 400; tries++) {
          const a = start(rng.int(MB[0], MB[1]));
          const e1 = { coll: 0, fall: 0, wall: 0 };
          const e2 = { coll: 0, fall: 0, wall: 0 };
          const b = run(a, K, 'bounce', END, e1);
          const c = run(b, K, 'bounce', END, e2);
          if (!valid(b) || !valid(c) || b.length < 2 || !c.length) continue;
          if (r < 2) {
            if (e1.coll + e2.coll < 1 || (needEnd && ends(e1) + ends(e2) < 1)) continue;
          } else if (e2.coll < 1 || c.length < 2) continue;
          return { a, b, c, end: ends(e1) + ends(e2) };
        }
        throw RM.RETRY;
      };
      const r0 = mkRow(0, false);
      const rows = [r0, mkRow(1, r0.end === 0), mkRow(2, false)];
      const P = rows.map((r) => [r.a, r.b, r.c]);
      const B = P[2][1];
      const ans = P[2][2];
      const ansKey = skey(ans);

      /* Uniqueness: every (k1, k2, collision model, end model) consistent with the visible panels must predict
       * the answer. "wrap" is compared without fills (conservative): any consistent wrap reading rejects. */
      const KMAX = 7;
      const okK = (from, to, coll, end, nf) => {
        const ks = [];
        const tk = skey(to, nf);
        let s = from;
        for (let k = 1; k <= KMAX; k++) {
          s = tick(s, coll, end);
          if (skey(s, nf) === tk) ks.push(k);
        }
        return ks;
      };
      const preds = new Set();
      for (const coll of COLL)
        for (const end of ENDS) {
          const nf = end === 'wrap';
          let K1 = okK(P[0][0], P[0][1], coll, end, nf);
          for (let r = 1; r < 3 && K1.length; r++) {
            const o = okK(P[r][0], P[r][1], coll, end, nf);
            K1 = K1.filter((k) => o.indexOf(k) >= 0);
          }
          if (!K1.length) continue;
          const o0 = okK(P[0][1], P[0][2], coll, end, nf);
          const K2 = o0.length ? o0.filter((k) => okK(P[1][1], P[1][2], coll, end, nf).indexOf(k) >= 0) : [];
          if (!K2.length) continue;
          if (nf) preds.add('wrap');
          else K2.forEach((k) => preds.add(skey(run(B, k, coll, end))));
        }
      RM.need(preds.size === 1 && preds.has(ansKey));
      // no simple count rule on the number of beads / right-pointing arrows may point elsewhere
      const g3 = (fn) => RM.grid3((r, c) => fn(P[r][c] || ans));
      RM.needNoConflict(g3((s) => s.length), ans.length, 'numeric');
      RM.needNoConflict(g3((s) => s.filter((b) => b.d > 0).length), ans.filter((b) => b.d > 0).length, 'numeric');

      /* ---------- distractors */
      const cands = [];
      const add = (st, why, tier) => {
        if (st && st.length) cands.push({ st: sortSt(st.map((b) => ({ p: b.p, d: b.d, f: b.f }))), why, tier });
      };
      const fset = (st) => st.map((b) => b.f);
      const extra = (st) => fset(st).filter((f) => fset(ans).indexOf(f) < 0);
      const lost = (st) => fset(ans).filter((f) => fset(st).indexOf(f) < 0);
      const names = (fs) => RM.list(fs.map((f) => 'the ' + FN[f]));
      const passed = run(B, K, 'pass', END);
      (() => {
        const order = fset(B);
        let txt = 'the beads were moved as if they passed through each other; beads bounce and never overtake each other';
        const fs = fset(passed);
        for (let i = 0; i < fs.length; i++)
          for (let j = i + 1; j < fs.length; j++)
            if (order.indexOf(fs[i]) > order.indexOf(fs[j]) && txt.indexOf('overtaken') < 0)
              txt = 'the ' + FN[fs[i]] + ' bead has overtaken the ' + FN[fs[j]] + ' bead — beads bounce off each other and never change order';
        if (txt.indexOf('overtaken') < 0 && extra(passed).length)
          txt = 'the beads were moved as if they passed through each other, so the wrong bead fell off: ' + names(lost(passed)) + ' bead should still be there';
        add(passed, txt, 1);
      })();
      const swaps = [];
      for (let i = 0; i + 1 < ans.length; i++) {
        const s = ans.map((b) => Object.assign({}, b));
        s[i].f = ans[i + 1].f;
        s[i + 1].f = ans[i].f;
        swaps.push({ s, why: 'the ' + FN[ans[i].f] + ' and ' + FN[ans[i + 1].f] + ' beads have swapped places — beads never overtake each other' });
      }
      rng.shuffle(swaps).forEach((w, i) => add(w.s, w.why, i ? 2 : 1));
      add(run(B, K - 1, 'bounce', END), 'this is the wire only ' + RM.plural(K - 1, 'tick') + ' later — each picture is ' + K + ' ticks after the previous one', 1);
      add(run(B, K + 1, 'bounce', END), 'this is the wire ' + (K + 1) + ' ticks later — each picture is ' + K + ' ticks after the previous one', 1);
      add(run(B, 2 * K, 'bounce', END), 'this is ' + 2 * K + ' ticks after the middle picture, not ' + K, 2);
      add(
        ans.map((b) => ({ p: b.p, d: B.find((x) => x.f === b.f).d, f: b.f })),
        'the beads are in the right places, but they kept their old arrows — a bead turns around each time it bounces' + (walls ? ' (off a bead or a wall)' : ''),
        1
      );
      add(run(B, K, 'block', END), 'the bounce is mistimed: beads with a free notch between them first meet in that notch, and only then turn back — here they turned back a tick too early', 1);
      if (!walls) {
        const bk = run(B, K, 'bounce', 'reflect');
        add(bk, (extra(bk).length ? names(extra(bk)) + ' bead bounced back from the end of the wire' : 'a bead bounced back from the end of the wire') + ' — a bead that slides past an end falls off', 1);
        const sp = run(B, K, 'bounce', 'stop');
        add(sp, (extra(sp).length ? names(extra(sp)) + ' bead stopped' : 'a bead stopped') + ' at the end of the wire — it should have fallen off', 2);
        const ea = run(B, K, 'bounce', 'early');
        add(ea, (lost(ea).length ? names(lost(ea)) + ' bead was' : 'a bead was') + ' removed as soon as it reached the last notch — beads only fall off when they slide past the end', 2);
      } else {
        const fl = run(B, K, 'bounce', 'fall');
        add(fl, (lost(fl).length ? names(lost(fl)) + ' bead' : 'a bead') + ' fell off — the ends are walls that send beads back', 1);
        add(run(B, K, 'bounce', 'mirror'), 'a bead turned back on the last notch, a tick too early — it first hits the wall half a notch further', 2);
      }
      add(ans.map((b) => ({ p: b.p, d: -b.d, f: b.f })), 'every arrow points the wrong way', 2);
      ans.forEach((b, i) => {
        add(ans.filter((x, j) => j !== i), 'the ' + FN[b.f] + ' bead is missing — it is still on the wire', 2);
        [-1, 1].forEach((s) => {
          if (b.p + s >= 0 && b.p + s < N)
            add(ans.map((x, j) => (j === i ? { p: x.p + s, d: x.d, f: x.f } : x)), 'the ' + FN[b.f] + ' bead is one notch too far to the ' + (s > 0 ? 'right' : 'left'), 2);
        });
      });
      const pool = rng.shuffle(cands.filter((c) => c.tier === 1)).concat(rng.shuffle(cands.filter((c) => c.tier === 2)));
      const seen = new Set([ansKey]);
      const wrong = [];
      for (const c of pool) {
        const k = skey(c.st);
        if (wrong.length >= 7 || seen.has(k) || !valid(c.st)) continue;
        seen.add(k);
        wrong.push({ spec: { b: c.st }, flaws: [RM.cap(c.why)] });
      }
      RM.need(wrong.length === 7);
      // no feature of the answer may be unique to it
      const feats = (st) => [st.length, fset(st).join(), st.map((b) => b.p).join(), st.map((b) => dch(b.d)).join()];
      const fa = feats(ans);
      fa.forEach((f, i) => RM.need(wrong.some((w) => feats(w.spec.b)[i] === f)));

      /* ---------- correction */
      const ar = (d) => (d > 0 ? '→' : '←');
      const nb = (b) => b.p + 1 + ar(b.d);
      let L = 0;
      let R = 0;
      const walk = B.map((b) => {
        const e = { coll: 0, fall: 0, wall: 0 };
        const g = run([{ p: b.p, d: b.d, f: b.f }], K, 'pass', END, e);
        if (!g.length) {
          if (b.d < 0) L++;
          else R++;
          return nb(b) + ' ⇒ off the ' + (b.d < 0 ? 'left' : 'right') + ' end';
        }
        return nb(b) + ' ⇒ ' + nb(g[0]) + (e.wall ? ' (back from the wall)' : '');
      });
      const gone = [];
      if (L) gone.push(RM.plural(L, 'bead') + ' fell off the left end, so the ' + (L > 1 ? L + ' leftmost beads (' : 'leftmost bead (') + names(fset(B).slice(0, L)) + ') ' + (L > 1 ? 'are' : 'is') + ' gone');
      if (R) gone.push(RM.plural(R, 'bead') + ' fell off the right end, so the ' + (R > 1 ? R + ' rightmost beads (' : 'rightmost bead (') + names(fset(B).slice(B.length - R)) + ') ' + (R > 1 ? 'are' : 'is') + ' gone');
      const rules = [
        {
          k: 'Motion',
          t: 'Every bead slides along the wire one notch per tick, in the direction of its arrow, all at the same speed. Each picture shows the wire <b>' + K + ' ticks</b> after the picture to its left.',
        },
        {
          k: 'Bounces',
          t: 'When two beads meet (face to face on neighbouring notches, or arriving at the same notch from both sides) they bounce: both turn around. So beads <b>never overtake each other</b> — the left-to-right order of the fills never changes.',
        },
        walls
          ? { k: 'Walls', t: 'The ends are walls half a notch beyond the last notches: a bead that reaches a wall bounces back (it spends one tick going to the wall and back to the last notch, now pointing inwards).' }
          : { k: 'Ends', t: 'A bead that slides past either end of the wire falls off and is gone.' },
        {
          k: 'Shortcut',
          t: 'Since all beads have the same speed, a bounce looks exactly like two beads passing through each other and swapping fills. So move every <i>arrow</i> ' + K + ' notches on its own, ignoring the other beads' + (walls ? ' (turning back at the walls)' : ' (arrows that leave the wire are gone)') + ', then hand the fills back in their unchanged left-to-right order.',
        },
        {
          k: 'Row 3',
          t: 'Notches are counted 1–8 from the left. Middle picture: ' + B.map((b) => FN[b.f] + ' ' + nb(b)).join(', ') + '. Arrows after ' + K + ' ticks: ' + walk.join('; ') + '. Arrows now at ' + ans.map(nb).join(', ') + '. ' + (gone.length ? RM.cap(gone.join('; ')) + '; the' : 'No bead fell off; the') + ' remaining beads keep their order ' + fset(ans).map((f) => FN[f]).join(', ') + ': <b>' + ans.map((b) => FN[b.f] + ' at notch ' + (b.p + 1) + ' pointing ' + (b.d > 0 ? 'right' : 'left')).join(', ') + '</b>.',
        },
      ];
      return {
        difficulty: v === 1 ? 6 : 7,
        hint: 'the beads never overtake each other.',
        panels: RM.flat(P.map((r) => r.map((s) => ({ b: s })))),
        answer: { b: ans },
        options: [{ spec: { b: ans }, flaws: [] }].concat(wrong),
        key: (s) => skey(s.b),
        rules,
        render(sp) {
          const pic = new RM.Pic();
          const xa = X0 - DX / 2;
          const xb = X0 + DX * (N - 1) + DX / 2;
          for (let p = 0; p < N; p++) RM.line(pic, xOf(p), WY + 11, xOf(p), WY + 14.5, { sw: 1.4, color: RM.GRAY });
          RM.line(pic, xa, WY, xb, WY, { sw: 1.6, color: RM.DARK });
          if (walls) {
            pic.add(`<rect x="${RM.fmt(xa - 2)}" y="${WY - 14}" width="2" height="28" fill="${RM.INK}"/>`);
            pic.add(`<rect x="${RM.fmt(xb)}" y="${WY - 14}" width="2" height="28" fill="${RM.INK}"/>`);
          } else {
            RM.circle(pic, xa, WY, 1.4, { fill: 'black', sw: 0 });
            RM.circle(pic, xb, WY, 1.4, { fill: 'black', sw: 0 });
          }
          for (const b of sp.b) {
            const x = xOf(b.p);
            pic.add(`<ellipse cx="${RM.fmt(x)}" cy="${WY}" rx="${BRX}" ry="${BRY}" fill="${pic.paint(PAINT[b.f])}" stroke="${RM.INK}" stroke-width="1.5"/>`);
            if (b.f === 'eye') RM.circle(pic, x, WY, 2, { fill: 'black', sw: 0 });
            const d = b.d;
            if (d) {
              RM.line(pic, x - 3.4 * d, AY, x + 0.5 * d, AY, { sw: 1.9 });
              RM.polygon(pic, [[x + 3.9 * d, AY], [x - 0.2 * d, AY - 3.1], [x - 0.2 * d, AY + 3.1]], { fill: 'black', sw: 0.8 });
            }
          }
          return pic.svg();
        },
      };
    },
  });
})();
