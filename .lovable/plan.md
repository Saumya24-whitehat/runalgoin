# iChart section in the Admin panel (Round 1)

## Goal
Add a new **iChart** section inside the Admin panel. Only admins can see it. We will rebuild the ichart pages there one by one, with the same layout, filters, tables and charts as ichart. Instead of ichart's data, they will use OptionWorld's own data. Once every page is ready, we can move them out to the public site.

## Round 1 pages
1. **iChart Home**: a copy of the ichart `index.php` dashboard, with the menu as tiles. Pages that are already built will open. Pages not built yet will show "Coming soon".
2. **Option Chain**: same layout as ichart. Symbol, expiry, historical date and time filters. CE/PE OI, change in OI, LTP, IV and volume columns. ATM highlighted. Option to show or hide columns.
3. **Option OI Stats**: total CE/PE OI and change in OI, PCR, Max Pain, strike-wise OI and change-in-OI bar charts, and filters for strike range and date/time.

## How it works
- In the Admin panel: a new "iChart" tab or link opens `/admin/ichart`, with sub-pages `/admin/ichart/option-chain` and `/admin/ichart/oi-stats`. These pages are blocked for non-admins.
- iChart look: the colours, table style and fonts are copied from ichart's CSS, but reworked to fit our design. jQuery, DataTables and Highcharts are rebuilt in React + Recharts.
- Data mapping: for every ichart PHP call, I'll write down which OptionWorld data replaces it:
  - `getOptionChainState / OptionChain_SB_Api` → existing `option-chain` function (symbols, expiries, chain by date and time).
  - `getDataForOptionOIStatsBeta*` → OI Stats is calculated from the same option chain data, and Max Pain from the existing `maxpain-data`.
  - Expiry/date helpers (`getExpiryDatesforDate`, etc.) → existing `getExpiryDates` with date.
- Not copied: ichart login/session checks, user data, broker logins, links to the ichart.in or fundata.in servers.
- If data is missing for any field, the page will show it as "N/A" and I'll give you a list.

## Later rounds (after your approval)
Straddle charts, Multi Strike OI, Cumulative OI, Premium Decay, Futures pages, IV/IVR, Heatmap, Participant OI, Strategy Builder. One group per round.

## Technical details
- New files under `src/pages/admin/ichart/` and `src/components/ichart/`, plus `src/services/ichartApi.ts`. The mapping will be listed in `ichartApi.ts`.
- Routes are wrapped in the existing admin role check. A link is added in `Admin.tsx`.
- No new database tables. Existing functions are reused.
