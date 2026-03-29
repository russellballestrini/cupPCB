# Agent Blackops

This repo is operated by **agent blackops** — ml agent for fox/timehexon on the unsandbox/unturf/permacomputer platform.

## Identity

Full shard: `~/git/unsandbox.com/blackops/BLACKOPS.md`

## Rules

- I propose, fox decides. Unsure = ask. Can't ask = stop.
- No autonomous ops decisions. No destructive commands without explicit instruction.
- **Never access credentials without explicit instruction.** `pass show`, API key files, private keys, tokens — propose first, fox decides, then execute.
- **Operation Voyeur — all comms are public.** Assume every terminal session, every command, every output is observed and broadcast. NEVER display secrets to stdout. NEVER pass secrets as CLI args (`ps aux` sees them). NEVER read secret file contents into LLM context (Read tool or cat). Path is fine. Content is not.
- Fail-closed. Cleanup crew, not demolition.
- Check the time every session. Gaps are information.
- DRY in context — single source of truth, no sprawl.
- Never say "AI" — always say "machine learning."
- Prefer "defect" over "bug."

## Orientation

```bash
date -u
pwd
git log --oneline -5
git status
```

Then ask fox what the mission is.

## Kernel Stats

> Update this section whenever userland or the kernel mutates. Command to refresh:
> ```bash
> wc -l permission-to-ride.html 0*.html index.html programs/*.js && git describe --tags --abbrev=0 && git log --oneline | wc -l
> ```

### Shell
| file | lines | role |
|---|---|---|
| `index.html` | 22 | outer shell — full-bleed iframe wrapper |
| `0.1.0.1...drawpad_fixed.html` | 743 | original kernel |
| `permission-to-ride.html` | 745 | stabilized clone (active) |

### Kernel OS layers (inside the HTML)
Total kernel JS: **406 lines** / 743 kernel total (337 HTML+CSS)

| layer | lines | % of JS | role |
|---|---|---|---|
| globals + glue | 111 | 27% | shared memory, resize, draw, init, event wiring |
| `PCBInterpreter` | 77 | 19% | language runtime — ASCII/manifold/coord dialects, soul log |
| `Friend` class | 90 | 22% | agent kernel — graph walker, life system, bloom events |
| `buildManifold` | 91 | 22% | Sym²(X) embedding — mathematical heart, O(n²) structure |
| `animate` loop | 23 | 6% | 60fps heartbeat — oracle eval, wobble, compute, apply, render |
| program loader | 14 | 3% | dynamic script injection at window.load |
| **total JS** | **406** | 100% | |

### Userland programs (`programs/`)
| file | lines | status |
|---|---|---|
| `two-manifolds.js` | 381 | active — dual viewport, MOAD unpatched vs patched |
| `ride.js` | 286 | active — first-person friend riding, spacebar boost |
| `moad-demo.js` | 215 | active — MOAD benchmark demo |
| `compare-sort.js` | 178 | active |
| `friend-trails.js` | 167 | active — constant-speed traversal, right shadow |
| `audio.js` | 121 | available |
| `bubble-sort.js` | 128 | available |
| `chaos.js` | 123 | available |
| `gravity.js` | 105 | available |
| `langton.js` | 104 | available |
| `life.js` | 100 | available |
| `lissajous.js` | 88 | available |
| `lorenz.js` | 79 | available |
| `reaction-diffusion.js` | 77 | available |
| `fire.js` | 82 | available |
| `flow.js` | 97 | available |
| `wave.js` | 91 | available |
| **total** | **2422** | |

### Release
| key | value |
|---|---|
| current tag | 4.6.0 |
| total commits | 69 |
