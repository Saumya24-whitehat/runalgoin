# iChart: build all remaining pages + API Document + Didn't Get API

## Goal
Rebuild every ichart page (about 90 menu items) the same way as the Home page: the same look as the original ichart PHP, with OptionWorld data. Add two new pages under the iChart **Profile** menu:
- **API Document**: for each page, where its data comes from and how.
- **Didn't Get API**: everything a page needs that OptionWorld data doesn't have yet.

## Order (batches, menu order)
1. Fix the 2 pages already built (Option Chain, OI Stats) to the original PHP layout.
2. **Options:** Straddle/Strangle, Multi Strike OI, Cumulative OI, OI Change, Premium Decay, IV charts, Max Pain, PCR.
3. **Futures:** Futures buildup, Futures OI/price charts, Rollover.
4. **Strategies and Tools:** Strategy Builder, payoff, calculators, heatmap.
5. **Live Tools:** live option chain/OI views.
6. **Help and Profile:** static help pages (copied as text); Manage Symbol Lists / My Account linked to OptionWorld's own profile. Login, Logout, Subscription Details and New Year Offer stay hidden.

Each page follows the same steps: read its PHP/JS, copy its layout and CSS, map each ichart data call to an OptionWorld function, and show "Data not available" where we have no data.

## API Document page (Profile → API Document)
A table with one row per page: Page | ichart endpoint | OptionWorld function | Source URL (runalgo.xyz/data/...) | Fields used | How it's calculated (e.g. "OI = CE OI + PE OI", "IV = ATM CE/PE average"). Every page added later gets a row.

## Didn't Get API page (Profile → Didn't Get API)
A table: Page | Missing data | What ichart uses | Current fallback. Already known: futures OI per minute, volume change, IV Chg, IVR/IVP, LTP Chg, OH/OL, VWAP, Bid/Ask, stock logos, previous-close price change.

## Technical details
- One shared list in `src/components/ichart/ichartDataSources.ts` (page, endpoint, function, url, fields, calc, missing[]). Both new pages render from it, so the docs stay in sync with the pages.
- New routes `/admin/ichart/api-docs` and `/admin/ichart/missing-api`, linked from the Profile menu in `ichartMenu.ts`. Admin-only, like the other iChart pages.
- Reuse `ichartApi.ts`, `useIchartChain.ts` and existing functions (option-chain, pcr-data, future-buildup, maxpain-data). A new backend function is added only when a page needs a runalgo.xyz endpoint we don't call yet.
- After each batch, run typecheck/build and do a browser check as admin.
