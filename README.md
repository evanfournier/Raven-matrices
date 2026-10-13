# Raven Matrix Trainer

A training site for hard Raven-style progressive matrices, built to prepare for psychometric
reasoning tests such as the Air France cadet programme's PSY1 assessments.

- **216 catalogue puzzles in 8 themed sets.** Every set has its own rule families and its own
  visual language; no family appears in two sets.
  - Sets **A–D** (120 puzzles, ★★★ hard → ★★★★★ extreme).
  - Sets **E–H** (96 puzzles, **elite**: ★★★★★★ and ★★★★★★★ "nightmare"), built on logic that
    appears nowhere in A–D.
- **8 options per puzzle, exactly one correct**, with a full explanation of every rule and the
  reason each wrong option fails.
- **Timed test mode**: 10–40 questions, 45 s – 2 min each, from the whole catalogue, sets A–D, the
  elite sets or freshly generated puzzles; no feedback until the end, then a full review.
- **Endless mode**: new puzzles are generated on the fly, from any family or one you choose.
- Progress (solved / failed) is saved in your browser.

## How to use

Open `index.html` in any modern browser. No install, no server, no internet connection needed.
It also works on GitHub Pages: *Settings → Pages → Deploy from a branch*.

Keyboard: `1`–`8` select · `Enter` check / next · `h` hint · `←` `→` previous / next puzzle.

## The sets

| Set | Theme | Families |
| --- | --- | --- |
| A | Numbers in disguise | Triple rule, Two counters, Cogwheels, Bar charts, Broken rings, Fraction pies, Inventory, Edge budget |
| B | Overlays & inheritance | Pixel logic, Hatching, Inheritance, Stacking order, Line logic, Region logic, Colour algebra |
| C | Transformations | Four axes, Carousel, Mirror & turn, Shuffle code, Torus slide, Rotor, Twin rings, Matryoshka |
| D | Motion & clocks | Orbits, Compass & moon, Decorated needles, Vector sum, Clock arithmetic, Dot-driven arrow, Billiards |
| E (elite) | Hidden quantities | Secret values, Abacus, Crossings, Translations, Seesaws, Containers |
| F (elite) | Panel physics | Tumble, Punch & unfold, Tilt maze, Laser mirrors, Sliding tiles, Line clear |
| G (elite) | Codes & conditions | Two-way turn, Operator key, String algebra, Cipher, Lights out, If-then |
| H (elite) | Networks & paths | Odd nodes, Turtle walk, Waterworks, Contagion, Flood fill, Flip-flop board |

Each family contributes 4 puzzles (4 different variants) to its set. The "How to solve" page of
the site describes every family.

## How each puzzle is made fair

Puzzles are generated from a fixed seed by `js/families-*.js` and checked before being shown:

1. **No second answer.** For every attribute, the generator tries a long list of rules a solver
   might think of: constant, progression, distribution of three, sum, difference, max/min,
   copying, diagonals, column-wise versions, every boolean overlay with every mirror/rotation,
   every rotation or reshuffle, other bases, other physics… The intended rule must be found, and
   every other rule that fits rows 1–2 must predict the same answer. Otherwise the puzzle is
   redrawn.
2. **No answering by elimination.** The 8 options are every combination of three independent
   mistakes, so each attribute value appears in exactly half of the options. Picking the
   "most typical" option does not work.
3. **Visibly distinct options.** `tools/validate.js` renders every option in a headless browser
   and checks that no two options look the same.

## Development

```
NODE_PATH=$(npm root -g) node tools/validate.js --random 40              # everything
NODE_PATH=$(npm root -g) node tools/validate.js --set E --sheets /tmp/s   # one set, with contact sheets
NODE_PATH=$(npm root -g) node tools/validate.js --family abacus --blind --sheets /tmp/s   # sheets without answers
NODE_PATH=$(npm root -g) node tools/ui-smoke.js /tmp/shots                # click through the UI
```

The scripts need Playwright with Chromium. The `Screenshot *.png` files are the reference
examples the first families were designed from.
