## ADDED Requirements

### Requirement: Background palette tokens are darkened in theme.css
The following CSS custom property values in `src/styles/theme.css` SHALL be updated to deeper values. All Dracula Pro signal colors (green, orange, cyan, red, purple, pink, yellow) and foreground colors (`--fg`, `--fg-muted`) SHALL remain unchanged.

| Token | Old value | New value |
|---|---|---|
| `--bg` | `#22212C` | `#16151E` |
| `--bg-card` | `#3A3949` | `#1F1E2B` |
| `--bg-elevated` | `#44435A` | `#2A2939` |
| `--selection` | `#454158` | `#302F42` |

#### Scenario: Background token values in computed styles
- **WHEN** the app renders in a browser
- **THEN** `document.documentElement` CSS variable `--bg` resolves to `#16151E`
- **THEN** `document.documentElement` CSS variable `--bg-card` resolves to `#1F1E2B`

#### Scenario: Signal colors are unchanged
- **WHEN** the theme tokens are updated
- **THEN** `--green` remains `#8AFF80`, `--cyan` remains `#80FFEA`, `--orange` remains `#FFCA80`, `--red` remains `#FF9580`, `--purple` remains `#9580FF`

### Requirement: Muted text contrast remains acceptable after darkening
After darkening `--bg-card`, the contrast ratio of `--fg-muted` (`#7970A9`) against `--bg-card` (`#1F1E2B`) SHALL be verified. If contrast falls below WCAG AA (4.5:1 for normal text), `--fg-muted` SHALL be lightened to restore compliance.

#### Scenario: Muted text is readable on dark cards
- **WHEN** a StatCard renders with a muted label on the new `--bg-card` background
- **THEN** the label text is visually distinguishable (contrast ≥ 4.5:1 per WCAG AA)
