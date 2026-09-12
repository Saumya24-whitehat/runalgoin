# ATM-based strike selection for Greeks

## Changes
- Replace highest-OI target selection on the Greeks probability page with an ATM rule.
- Determine ATM from the nearest available strike for each option-chain snapshot.
- When ATM ends in `00`, use Put target = ATM − 100 and Call target = ATM + 100.
- When ATM ends in `50`, use Put target = ATM − 150 and Call target = ATM + 150.
- Apply this separately to every 3-minute historical row, so changing ATM during the session changes that row’s targets.
- Show the exact Put and Call strikes actually used in every table row.
- Keep manual target inputs available for the top calculator only; the time-wise table will follow the per-candle ATM rule.

## Validation
- Check both `00` and `50` ATM cases.
- Verify the page builds and the table renders with actual row-specific strikes.
