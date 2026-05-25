# STS2 Deck Advisor

A mid-run decision tool for **Slay the Spire 2** that tells you whether to pick a card — and what type to pick.

## How It Works

Input your current card counts across five categories:

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

## Card Classification Rule

> Count a card by what it does **on the turn you play it**.

- Hegemony (15 dmg, stars next turn) → **Single Target** (stars are a bonus)
- Venerate (gain Stars) → **Velocity** (pure resource gen, no immediate block or damage)
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
```

## License

MIT
