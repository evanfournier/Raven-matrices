# Raven Matrix Trainer

A training site for hard Raven-style progressive matrices, built to prepare for psychometric
reasoning tests such as the Air France cadet programme's PSY1 assessments.

- **266 catalogue puzzles in 13 themed sets.** Every set has its own rule families and its own
  visual language; no family appears in two sets.
  - Sets **A–D** (120 puzzles, ★★★ hard → ★★★★★ extreme).
  - Sets **E–H** (96 puzzles, **elite**: ★★★★★★ and ★★★★★★★ "nightmare"), built on logic that
    appears nowhere in A–D.
  - Sets **I–M** (50 puzzles, **grandmaster**: ★★★★★★ to ★★★★★★★★): fifty one-of-a-kind
    puzzles — one per family, each with its own logic and its own design (algorithms, 3-D
    reasoning, physics, topology, logic). A few are 2 × 2 analogies.
- **8 options per puzzle, exactly one correct**, with a full explanation of every rule and the
  reason each wrong option fails.
- **Timed test mode**: 10–40 questions, 45 s – 3 min each, from the whole catalogue, sets A–D, the
  elite sets, the grandmaster sets or freshly generated puzzles; no feedback until the end, then a full review.
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
| I (grandmaster) | Algorithms & machines | Tower of Hanoi, Langton's ant, Counting-out circle, Stack machine, State machine, Sorting passes, Cache memory, Look and say, Cellular automaton, Shutters |
| J (grandmaster) | Spatial reasoning | Rolling die, 3D rotation, Rolling polygon, Three viewpoints, Rotating board, Linear map, Robot arm, Turning cylinder, Flight instruments, Double analogy |
| K (grandmaster) | Physics & mechanics | Jugs, Belts & gears, Colliding beads, Gridlock, Circuits, Superposition, Moon phases, Semaphores, Sandpile, Camera obscura |
| L (grandmaster) | Geometry & topology | Rubber band, Inside or outside, Territories, Gallery guards, Holes, Lattice areas, Star polygons, Rosettes, Leaper distance, Hole and piece |
| M (grandmaster) | Logic & structure | Row & column counts, Composed functions, Star map, Magic dominoes, Reading order, Carroll diagram, Ladder lottery, Code breaker, Fractal substitution, Melodies |

In sets A–H each family contributes 4 puzzles (4 different variants) to its set; in the
grandmaster sets I–M each family contributes exactly one puzzle. The "How to solve" page of the
site describes every family.

## How each puzzle is made fair

Puzzles are generated from a fixed seed by `js/families-*.js` and `js/gm/*.js` (one file per
grandmaster family) and checked before being shown:

1. **No second answer.** For every attribute, the generator tries a long list of rules a solver
   might think of: constant, progression, distribution of three, sum, difference, max/min,
   copying, diagonals, column-wise versions, every boolean overlay with every mirror/rotation,
   every rotation or reshuffle, other bases, other physics… The intended rule must be found, and
   every other rule that fits rows 1–2 must predict the same answer. Otherwise the puzzle is
   redrawn.
2. **No answering by elimination.** The 8 options are every combination of three independent
   mistakes, so each attribute value appears in exactly half of the options. Picking the
   "most typical" option does not work. Where mistakes cannot be combined (simulations,
   algorithms, 3-D views…), the 7 distractors are the results of 7 specific misreadings of the
   rule, each checked to be wrong.
3. **Grandmaster families** also enumerate the alternative procedures a solver might suspect
   (other algorithms, other viewing directions, other physics, other reading orders…) and
   reconstruct hidden information (die faces, 3-D arrangements, cylinder bands) from every
   visible panel; a puzzle is only kept if all readings that fit lead to the same answer.
4. **Visibly distinct options.** `tools/validate.js` renders every option in a headless browser
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
