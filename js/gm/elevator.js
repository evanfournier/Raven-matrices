/* Elevator (grandmaster, sequence): a 6-floor shaft, people waiting (dots), a car moving one floor per panel. Two hidden rules:
 * (1) policy LOOK: keep the direction while somebody waits ahead, else reverse (not to the end of the shaft);
 * (2) every pick-up makes a new person start waiting on the MIRROR floor (7 - floor), so the number of dots never changes.
 * Hypotheses simulated from panel 1: 14 policies (LOOK / SCAN / nearest / farthest, both initial directions, tie rules) x 6 spawn
 * rules (mirror, same floor, top, bottom, floor above, floor below). Every hypothesis matching panels 1-8 must predict panel 9;
 * SCAN must be refuted by the visible panels (nearest-first only needs to predict the same panel 9). Options: balanced cube of three independent mistakes
 * (wrong car floor, a waiting person displaced, new person on the wrong floor); all keep the number of dots. */
(function () {
  'use strict';
  const RM = window.RM;
  const F = 6;
  const bit = (f) => 1 << f;
  const SPAWN = ['mirror', 'same', 'top', 'bottom', 'up', 'down'];
  const spawnFloor = (sp, c) => (sp === 'mirror' ? F - 1 - c : sp === 'same' ? c : sp === 'top' ? F - 1 : sp === 'bottom' ? 0 : sp === 'up' ? (c + 1) % F : (c + F - 1) % F);
  const ahead = (c, d, m) => { for (let f = 0; f < F; f++) if ((m & bit(f)) && (f - c) * d > 0) return true; return false; };
  function choose(h, c, d, m) {
    if (h.k === 'look') return ahead(c, d, m) ? d : -d;
    if (h.k === 'scan') return c + d < 0 || c + d >= F ? -d : d;
    let best = null;
    let dirs = [];
    for (let f = 0; f < F; f++) {
      if (!(m & bit(f))) continue;
      const dist = Math.abs(f - c);
      if (best === null || (h.k === 'near' ? dist < best : dist > best)) { best = dist; dirs = [Math.sign(f - c)]; } else if (dist === best && !dirs.includes(Math.sign(f - c))) dirs.push(Math.sign(f - c));
    }
    if (dirs.length === 1) return dirs[0];
    return h.tie === 'keep' ? d : h.tie === 'up' ? 1 : -1;
  }
  function sim(h, sp, car, dir, mask, strict) {
    const st = [{ car, mask }];
    let c = car, d = dir, m = mask;
    for (let i = 0; i < 8; i++) {
      if (!m) return null;
      d = choose(h, c, d, m);
      c += d;
      if (c < 0 || c >= F) return null;
      const picked = !!(m & bit(c));
      m &= ~bit(c);
      let z = -1;
      if (picked) {
        z = spawnFloor(sp, c);
        if (m & bit(z)) { if (strict) return null; } else m |= bit(z);
      }
      st.push({ car: c, mask: m, d, picked, z });
    }
    return st;
  }
  const HYPS = [];
  [1, -1].forEach((d0) => HYPS.push({ k: 'look', d0, fam: 'look' }, { k: 'scan', d0, fam: 'scan' }, { k: 'near', d0, tie: 'keep', fam: 'near' }, { k: 'far', d0, tie: 'keep', fam: 'far' }));
  HYPS.push({ k: 'near', d0: 1, tie: 'up', fam: 'near' }, { k: 'near', d0: 1, tie: 'down', fam: 'near' }, { k: 'far', d0: 1, tie: 'up', fam: 'far' }, { k: 'far', d0: 1, tie: 'down', fam: 'far' });

  RM.register({
    id: 'elevator',
    name: 'Elevator',
    difficulty: 7,
    generate(rng, variant) {
      const eq = (a, b) => a.car === b.car && a.mask === b.mask;
      let found = null;
      for (let t = 0; t < 3000 && !found; t++) {
        const car = rng.int(0, F - 1);
        const m = rng.int(3, 4);
        let mask = 0;
        rng.sample(RM.range(F).filter((f) => f !== car), m).forEach((f) => { mask |= bit(f); });
        const d0 = rng.pick([1, -1]);
        const st = sim({ k: 'look' }, 'mirror', car, d0, mask, true);
        if (!st || !st[8].picked) continue;
        if (!st.slice(2, 9).some((s, i) => s.d !== st[i + 1].d)) continue;
        if (st.slice(1, 8).filter((s) => s.picked).length < 3) continue;
        const res = [];
        HYPS.forEach((h) => SPAWN.forEach((sp) => res.push({ h, sp, st: sim(h, sp, car, h.d0, mask, false) })));
        const bad = (r) => !r.st || !r.st.slice(0, 8).every((s, i) => eq(s, st[i]));
        if (!res.filter((r) => r.h.fam === 'scan').every(bad)) continue;
        if (!res.filter((r) => r.sp !== 'mirror' && r.h.fam === 'look' && r.h.d0 === st[1].d).every(bad)) continue;
        if (!res.filter((r) => !bad(r)).every((r) => r.st[8] && eq(r.st[8], st[8]))) continue;
        found = { st, res, bad };
      }
      RM.need(found);
      const { st, res, bad } = found;
      const vis = st.slice(0, 8);
      const A = st[8].car;
      const Z = st[8].z;
      const ans = { car: A, mask: st[8].mask };
      const firstBad = (r) => { if (!r.st) return 1; const i = r.st.findIndex((s, j) => j < 8 && (s.car !== st[j].car || s.mask !== st[j].mask)); return i < 0 ? 9 : i + 1; };
      const famK = (fam) => { const rs = res.filter((r) => r.h.fam === fam); return rs.every(bad) ? Math.max(...rs.map(firstBad)) : 0; };
      const spK = Math.max(...res.filter((r) => r.sp !== 'mirror' && r.h.fam === 'look' && r.h.d0 === found.st[1].d).map(firstBad));

      /* cube of three mistakes (each keeps the number of dots) */
      const c8 = st[7].car;
      const W = 2 * c8 - A;
      RM.need(W >= 0 && W < F && A !== Z);
      const free = RM.range(F).filter((f) => !(ans.mask & bit(f)) && f !== A && f !== Z);
      const waiting = RM.range(F).filter((f) => (ans.mask & bit(f)) && f !== Z);
      RM.need(free.length && waiting.length);
      const X = rng.pick(waiting);
      const Xp = rng.pick(free);
      const perturb = [
        { apply: (s) => ((s.car = W), s), why: `the car is on floor ${W + 1}; from floor ${c8 + 1} the LOOK policy takes it to floor ${A + 1}` },
        { apply: (s) => ((s.mask = (s.mask & ~bit(X)) | bit(Xp)), s), why: `the person waiting on floor ${X + 1} must still be there: nobody walks to floor ${Xp + 1}` },
        { apply: (s) => ((s.mask = (s.mask & ~bit(Z)) | bit(A)), s), why: `the new person must appear on the mirror floor ${Z + 1} (${F + 1} minus the pick-up floor ${A + 1}), not on floor ${A + 1}` },
      ];

      const h = 14;
      const top = 7;
      const base = top + h * F;
      const render = (s) => {
        const pic = new RM.Pic();
        pic.add(`<rect x="14" y="${top}" width="30" height="${h * F}" fill="none" stroke="${RM.INK}" stroke-width="1.6"/>`);
        for (let f = 0; f < F; f++) {
          const yb = base - f * h;
          RM.line(pic, 10, yb, 90, yb, { sw: f === 0 ? 2 : 1, color: f === 0 ? RM.INK : RM.LIGHT, cap: 'butt' });
          pic.add(`<text x="6.5" y="${RM.fmt(yb - h / 2 + 2.5)}" font-size="7" text-anchor="middle" font-family="sans-serif" fill="${RM.INK}">${f + 1}</text>`);
          if (s.mask & bit(f)) {
            RM.circle(pic, 66, yb - 8, 3.6, { fill: 'black', sw: 0.6 });
            RM.line(pic, 66, yb - 8, 66, yb - 1.5, { sw: 2.6, cap: 'butt' });
          }
        }
        const yc = base - (s.car + 1) * h;
        pic.add(`<rect x="17" y="${RM.fmt(yc + 1.5)}" width="24" height="${h - 3}" fill="${pic.paint('gray')}" stroke="${RM.INK}" stroke-width="2"/>`);
        return pic.svg();
      };

      const fl = (m) => RM.range(F).filter((f) => m & bit(f)).map((f) => f + 1);
      const cars = vis.map((s) => s.car + 1).join(', ');
      const kS = famK('scan'), kN = famK('near'), kF = famK('far');
      const dirW = (d) => (d > 0 ? 'up' : 'down');
      const rules = [
        { k: 'Moves', t: `the car moves exactly <b>one floor per panel</b>; floors are numbered 1 (bottom) to ${F}. When it arrives at a floor where somebody waits, that person gets in (the dot disappears). Car floors in panels 1–8: ${cars}.` },
        { k: 'Mirror', t: `every time somebody is picked up on floor f, a <b>new person starts waiting on the mirror floor ${F + 1} − f</b>, so the number of dots never changes (here always ${fl(vis[0].mask).length}). This is visible in every pick-up of panels 1–8${spK ? ` (other places for the new person are refuted by panel ${spK})` : ''}.` },
        { k: 'Policy', t: `<b>LOOK</b>: the car keeps its direction as long as somebody is waiting <b>further ahead</b> in that direction; as soon as nobody waits ahead it <b>reverses</b> (it does not run on to the end of the shaft). Its first direction is shown by its first move (${dirW(st[1].d)}).` },
        { k: 'Other readings', t: `running to the end floor before turning round is refuted by panel ${kS}${kN ? `; "go to the nearest waiting person" by panel ${kN}` : ''}${kF ? `; "go to the farthest one" by panel ${kF}` : ''}.` },
        { k: 'Answer', t: `in panel 8 the car is on floor ${c8 + 1} going ${dirW(st[7].d)} and people wait on floor${fl(st[7].mask).length === 1 ? '' : 's'} ${fl(st[7].mask).join(', ')}: ${ahead(c8, st[7].d, st[7].mask) ? `somebody is still ahead, so it continues ${dirW(st[8].d)}` : `nobody is ahead, so it reverses and goes ${dirW(st[8].d)}`} to floor <b>${A + 1}</b>, picks the person up, and a new person appears on floor <b>${Z + 1}</b>. Dots: <b>floors ${fl(ans.mask).join(', ')}</b>.` },
      ];
      return {
        difficulty: 7,
        hint: 'count the dots in every panel, and ask when the car decides to turn round.',
        reading: 'sequence',
        panels: vis.map((s) => ({ car: s.car, mask: s.mask })),
        answer: ans,
        perturb,
        render,
        key: (s) => s.car + '.' + s.mask,
        rules,
      };
    },
  });
})();
