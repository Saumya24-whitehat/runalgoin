# NitinBhaiya Option-Chain Intelligence — Core Plan

## Goal
Add a new **NitinBhaiya** dropdown to the top navigation and place the PRD’s core methodology in a dedicated group of pages. Build the core analysis first; education, journal, alerts, and advanced calculators remain a later phase.

## Navigation
The **NitinBhaiya** menu will contain:
- **Live Terminal** — `/nitinbhaiya`
- **9-Step Analysis** — `/nitinbhaiya/analyze`
- **Greeks & Risk** — `/nitinbhaiya/greeks`

The same grouped options will be available in the mobile menu, with the active page clearly highlighted.

## 1. Shared analysis engine
- Reuse the app’s current option-chain, Greeks, premium-decay, PCR, FII, Max Pain, historical-time, and one-minute refresh data flows.
- Normalize CE/PE values for strike, OI, COI, LTP, IV, volume, Greeks, spot, expiry, and timestamp.
- Use the stable morning reference snapshot (target 09:45 IST, with the nearest valid candle as fallback).
- Calculate these seven independent signals:
  1. COI + premium four-way activity classification.
  2. Writer activity from OI, premium, and IV.
  3. Relative CE/PE premium decay across ATM ±2 strikes.
  4. IV rate-of-change and absorption.
  5. Exchange of Hands from high volume with low net COI.
  6. Participant/FII positioning when available.
  7. ITM discount cross-check.
- Keep **Writer Signal** and **Relative Decay Signal** separate everywhere.
- Produce the PRD’s weighted `-50 to +50` confluence score, minimum two-engine agreement, conflict handling, EoH override, and eight sentiment states.
- Never describe OI/IV signals as confirmed participant identity or claim an accuracy percentage.

## 2. Live Terminal
Create a dense terminal-style page with:
- Symbol, expiry, live/historical time, spot, refresh status, and ATM controls.
- India VIX/expected range when available, PCR, confluence score, and final sentiment.
- Support, ATM, resistance, and support/resistance shift summary.
- Center-strike option-chain table with CE and PE OI, COI, LTP, IV, ATM highlighting, and row-level activity signal.
- Sortable columns and a strike-detail view for Greeks and signal inputs.
- Seven-engine contribution panel.
- ATM ±2 five-strike premium-decay panel with Writer and Decay results side by side.
- Existing one-minute silent refresh and Indian-time display behavior.

## 3. Nine-Step Analysis
Build a guided, one-step-at-a-time workflow with progress and back/next controls:
1. Market context and VIX regime.
2. OI structure and support/resistance shifts.
3. CE/PE buyer-writer classification.
4. IV and volume check.
5. Premium decay, with Writer and Decay signals adjacent.
6. Exchange of Hands check.
7. Participant and futures context.
8. User-entered technical confirmations.
9. Greeks, breakeven, theta/delta viability, risk inputs, and final confluence result.

Changing the symbol, expiry, or time will recompute all steps from the same shared snapshot.

## 4. Greeks & Risk
- Symbol, expiry, strike, CE/PE, premium, IV, and days-to-expiry inputs with live values and manual overrides where appropriate.
- Delta, Gamma, Theta, Vega, and Rho display.
- Theta/Delta required-move check, BEP, hedge-lot estimate, and IV strike-probability estimate.
- Guard invalid calculations, including Delta outside its valid range and missing/zero source values.

## 5. Visual and responsive treatment
- Extend the existing OptionWorld theme rather than replacing the whole website theme.
- Use a sharp, data-dense dark terminal treatment for these pages, with semantic green/red/amber/cyan states and compact Indian-number formatting.
- Preserve the project’s mobile touch sizing; wide option-chain content will use a dedicated compact mobile presentation or controlled horizontal scrolling.
- Include loading, no-data, partial-data, closed-market, and fetch-error states.

## 6. Validation
- Unit-test signal classification, decay direction, EoH, score thresholds, conflict rules, and baseline fallbacks.
- Verify live and historical selections, 09:45 baseline behavior, one-minute refresh, and Asia/Kolkata timestamps.
- Test desktop and mobile navigation, tables, step flow, and strike detail interactions.
- Confirm existing pages and navigation continue to work unchanged.

## Later phase (not included now)
Education Hub, trade journal, alerts, backtesting log, stock-wide rollout, weekly strategy builder, and the remaining advanced PRD modules will not be built in this core phase.
