# iChart Page 1: Home (`/opt/index.php`), exact copy

Only this one page is being built right now. Option Chain and OI Stats will be redone one at a time later, only when you say so.

## Original layout (from `index.php` + `public_symbol_Dashboard.css` + `publicDashboard_v22.js`)
```text
[ Blue SmartMenus top menu: Home | Futures | Options | Strategies | Tools | Live Tools | Help | Profile ]  (dropdowns from MenuList.json)

Row 1 (xl: 11 columns)
[ NIFTY-<expiry>  Price (spline) + OI (area)  4 cols ] [ BANKNIFTY-<expiry>  same  4 cols ] [ Gauges  3 cols ]
  data line below each chart (LTP, change, OI, OI change)    NIFTY: PCR gauge | IV gauge
                                                           BANKNIFTY: PCR gauge | IV gauge
Row 2 (4 columns)  each box = "<< Title >>" with left/right shift arrows + horizontal bar chart (Top 5)
[ Long Buildup ] [ Short Covering ] [ Short Buildup ] [ Long Unwinding ]
Row 3
[ Price Gainers ] [ Price Losers ] [ OI Gainers ] [ OI Losers ]
Row 4
[ IVR ] [ IVP ]

Footer: blue bottom-nav  "© year, ..."  Contact Us | About Us | Privacy Policy
```
- White boxes with rounded corners and the `box-shadow-all` shadow, a monospace bold title, and the light grey page background. Everything is copied from `public_symbol_Dashboard.css`.
- The original Tailwind grid sizes (`xl:col-span-4/4/3`, `lg:grid-cols-4`) stay the same.
- The `<<` / `>>` arrows on each bar box page through the list 5 at a time, like ichart.
- The footer name changes to OptionWorld. The Contact, About and Privacy links will go to our own pages.

## Data mapping (ichart API → OptionWorld)
| Box | ichart source | OptionWorld data |
|---|---|---|
| NIFTY / BANKNIFTY Price + OI chart | `getDataForPublicDashboard_v17.php` (futures price + OI per minute) | `pcr-data` timeline: Future price + total OI per 3 minutes |
| PCR gauges | same | `pcr-data` latest PCR (OI) |
| IV gauges | same | ATM CE/PE average IV from `option-chain` |
| Long/Short Buildup, Short Covering, Long Unwinding | same | `future-buildup` |
| Price Gainers/Losers, OI Gainers/Losers | same | sorted from the same `future-buildup` list (price change %, OI change %) |
| IVR / IVP | same | not in our data, so the box stays the same but shows "Data not available" |

- In the price chart, OI will be the total option OI (call + put), because we don't have futures OI per minute.
- Auto refresh every 1 minute, matching our other pages.

## Technical details
- Rewrite `IchartShell`: ichart's SmartMenus blue dropdown nav and the bottom-nav footer, with the `sm-blue` CSS copied from `sm-core-css.css` + `blue.css`.
- New `src/pages/admin/ichart/IchartHome.tsx`, plus small components `IchartPriceOiChart`, `IchartGauge` (radial, like the ApexCharts radialBar) and `IchartTopBars` (horizontal bars with paging). Built with Recharts, styled like Highcharts and ApexCharts.
- Copy the needed rules from `public_symbol_Dashboard.css` into `ichart.css`, kept inside the `.ichart` section only.
- The Option Chain and OI Stats routes stay as they are and are not touched in this step.
- After the build, check it with a Playwright screenshot.
