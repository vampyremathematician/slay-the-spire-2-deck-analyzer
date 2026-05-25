# STS2 Deck Advisor

A mid-run decision tool for **Slay the Spire 2** that tells you whether to pick a card — and what type to pick.

## How It Works

Select your character to auto-load your starting deck, then adjust counts as you add, remove, or transform cards throughout the run.

### Card Categories

| Category | What counts |
|---|---|
| **Single Target** | Focused damage, scaling attacks |
| **AoE** | Multi-target sweeps, board damage |
| **Block** | Direct HP prevention |
| **Mitigation** | Weak, Disarm, Exhaust — damage reduction |
| **Velocity** | Draw, energy generation, powers, resource gen (Stars, etc.) |

The tool computes your deck composition against act-specific ratio targets and tells you:

- **What to pick** — the category with the biggest gap, with sub-type advice (e.g. "Lean AoE" or "Need block")
- **When to skip** — when ratios are met or the deck is oversized
- **Sub-type warnings** — missing AoE, no block, mitigation-heavy, etc.
- **Dead card impact** — probability of drawing a curse or quest per hand
- **Basics remaining** — how many starter Strikes and Defends are still in your deck

## Character Starting Decks

| Character | Strikes | Defends | Unique Starters |
|---|---|---|---|
| **Ironclad** | 5 | 4 | Bash |
| **Silent** | 5 | 5 | Neutralize, Survivor |
| **Defect** | 4 | 4 | Zap, Dualcast |
| **Regent** | 4 | 4 | Falling Star, Venerate |
| **Necrobinder** | 4 | 4 | Unleash, +1 |

Strikes are auto-loaded as Single Target. Defends are auto-loaded as Block. Unique starters are left for you to categorize — not all builds use all cards the same way.

## Card Classification Rule

> Count a card by what it does **on the turn you play it**.

- Hegemony (15 dmg, energy next turn) → **Single Target** (energy is a bonus)
- Venerate (gain Stars) → **Velocity** (pure resource gen, no block or damage)
- Guiding Star (12 dmg, draw 2) → **Single Target** (draw is a bonus)
- Cloak of Stars (7 block) → **Block**

## Act Targets

| | Deck Size | Offense | Defense | Velocity |
|---|---|---|---|---|
| **Act I** | 12–18 | 45% | 35% | 20% |
| **Act II** | 18–25 | 38% | 38% | 24% |
| **Act III** | 20–27 | 35% | 38% | 27% |

## Usage

Open `index.html` in a browser. No build step, no dependencies.

To host on GitHub Pages: push to a repo and enable Pages from Settings → Pages → Deploy from branch.

## Files

```
index.html   — structure
style.css    — all styling
app.js       — all logic
README.md    — this file
```

## Accessibility

- No root font-size override — respects user browser settings
- Smallest text: 0.75rem (12px at default). Body text: 0.875rem+ (14px+)
- All spacing in rem/em, scales with zoom and user preferences
- Borders and hairlines in px (visual, not spatial)

## License

MIT
