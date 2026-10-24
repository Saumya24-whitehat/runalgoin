# iChart Home — buildup data check

User is verifying whether the buildup cards on the iChart Home page show correct data. No code changes until the user confirms.

## Current data source
- Long Buildup / Short Covering / Short Buildup / Long Unwinding cards: OptionWorld "Future Buildup" data (stock futures price change + OI change, Nifty 50 F&O list, current monthly expiry).
- Price Gainers/Losers, OI Gainers/Losers: same list sorted by price % and OI %.
- Not available: volume change bar.

## Next step
- Once the user confirms the data is right (or points out a mismatch), either fix the mapping or move to the next iChart page the user picks.
