# OI + Premium page

## Page
- Add **OI + Premium** under the NitinBhaiya menu.
- Reuse symbol, expiry, historical date, time, refresh, and 1-minute live-refresh behavior.
- Analyze only the five strikes centered on each snapshot’s ATM: ATM −2, −1, ATM, +1, +2.

## Calculation
- Use the 09:15 opening snapshot as the fixed baseline for every 3-minute candle.
- For each of the five strikes and each CE/PE side, calculate:
  - COI = current OI − opening OI
  - Premium change = current premium − opening premium
- Classify each side:
  - COI ↑ + Premium ↑ = Buyer Active / Fresh Buying
  - COI ↑ + Premium ↓ = Writer Active / Fresh Short
  - COI ↓ + Premium ↑ = Short Covering
  - COI ↓ + Premium ↓ = Long Unwinding
- Treat PE Writer activity as bullish support and CE Writer activity as bearish pressure. Call buying alone will not produce a strong bullish conclusion without PE-writer support.

## Display
- Show current ATM ±2 strike table with CE on the left, strike in the center, and PE on the right.
- Show net five-strike CE/PE COI and premium changes, dominant activities, and a clear market reading.
- Add a full 3-minute time-wise table from 09:15 to the selected/live cutoff, showing that candle’s ATM, aggregated CE/PE values, activity, and market reading.
- Display the actual five-strike range used for every candle.

## Validation
- Verify live and historical modes, changing ATM ranges, opening-baseline calculations, route/menu access, and desktop/mobile rendering.
