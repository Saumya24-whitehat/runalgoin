# ATM Normalized Z-Score Page

## What will be built
- Add a new **ATM Analysis** page under the NitinBhaiya menu.
- Analyze only the ATM strike found independently at each 3-minute snapshot.
- Support symbol, expiry, historical date, time cutoff, live refresh, and full-day historical viewing.
- Show a compact latest-reading summary and a complete 09:15–15:30 time-wise table.

## Analysis logic
- Compare every ATM snapshot with the previous 3-minute ATM snapshot.
- Calculate CE and PE changes for premium, COI, volume, and IV.
- Apply expanding session Z-score normalization separately to each CE/PE metric, so changing ATM contracts remain comparable.
- Classify buyer, writer, short-covering, and long-unwinding activity from COI and premium; use volume and IV as confirmation.
- Produce one consolidated normalized directional score and sentiment only when the rules agree; avoid participant-identity claims.

## Table output
- Time, spot, ATM strike.
- CE/PE premium change and Z-score.
- CE/PE COI and Z-score.
- CE/PE volume RoC and Z-score.
- CE/PE IV change and Z-score.
- CE activity, PE activity, normalized score, and final sentiment.

## Technical details
- Add a pure ATM Z-score calculation utility and reusable timeline table.
- Reuse the existing option-chain historical API and NitinBhaiya controls.
- Add the page route and NitinBhaiya navigation entry.
- Verify type checking, build health, and desktop/mobile rendering.