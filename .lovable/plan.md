# Match the iChart page layout to the original PHP

Going by the original `OptionChain.php` and `OptionOIStats.php`, the layout (not just the colours and fonts) will now be copied exactly.

## Common (both pages)
- Top: ichart's blue **SmartMenus** dropdown menu (Home / Futures / Options / Strategies / Tools / Live Tools / Help), built from `MenuList.json`. Pages that are already built will open. The rest will show "Coming soon".
- Below it, a `pageHeading` title, same as ichart.
- **Filter row, in ichart's order and style** (Material-style floating-label selects):
  `( ) Latest  ( ) Historical [date + time]` → `Select Symbol` (Indices / Stocks optgroups) → `Expiry Date` → `( ) Near ATM Strikes [7, step 2]` → `( ) Near ATM Strikes fixed [3]` + `Center Strike` dropdown → `( ) All Strikes`.
- Right side info line: `Futures | Spot | IV | Max Pain | PCR`, same as `FuturesData / SpotPriceData / IVIVRIVPMPPCRData`.

## Option Chain page
- Toolbar above the table: **Lots / Qty / Value** buttons, ichart's blue **Call/Put column toggle buttons**, **L / Cr** checkbox, and a ⚙ column-visibility menu (same column list as ichart).
- Table: Calls (green) and Puts (red) headers, the full column order from the original. Calls side runs `Build Up, Trend, Time, Vega, Theta, Gamma, Delta, IV Chg%, IV Chg, IV, OI Chg%, OI Chg, OI, Vol Chg%, Vol Chg, Volume, Int Val, Ext Val, OH/OL, Open, High, Low, LTP Chg%, LTP Chg, LTP, VWAP, Bid, Ask`. Then the khaki columns `Strike Price, PE-CE OI, PE-CE OI Chg`, then the Puts side mirrored.
- ichart highlight rules:
  - Call side: max OI Chg is light red `#FFBFC0`, most negative OI Chg is green `#90EE90`.
  - Put side: max OI Chg and max OI are green, most negative OI Chg is light red.
  - Max volume on both sides is light blue `#ADD8E6`.
  - ITM cells are grey, and ATM is marked.
- Below the table, a **Totals** table, same as ichart: `Stat | Calls | Puts | Net` → Total OI, Total OI Chg, Total Volume, Total LB/SB/SC/LU OI.
- **Build Up / Trend, LTP Chg, IV Chg, Vol Chg, Time** will be filled by comparing with the previous 3-minute data (and the previous day's 15:30 close).
  - Build Up uses ichart's LB/SB/SC/LU codes.
  - Trend is Bullish/Bearish.
- **Open/High/Low, OH/OL, VWAP, Bid/Ask** aren't in our data. Those columns will be off by default and will show "-".

## Option OI Stats page
- Same filter row, plus ichart's `Select interval`, Lots checkbox, `Show legend` and `Show tooltip` checkboxes, and `Auto update range`.
- The three charts in the original order, rebuilt as close as possible to Highcharts:
  1. **OI chart** (`oichart_hc`): Call/Put OI bars per strike, with Spot/ATM/Max Pain plot lines, and title and subtitle like ichart.
  2. **OI Change chart** (`oichangechart_hc`): Call/Put OI Chg bars.
  3. **Total OI chart** (`totaloi_hc`): total Call vs Put OI and OI Chg.

## Technical details
- Rewrite `IchartShell` (SmartMenus-style dropdown nav), `IchartControls` (radio and floating-label layout), and both pages. Extend `ichart.css` with the original `mdl-*`, `pageHeading`, `cv-row`, `btncls` and `summary` styles taken from the PHP `<style>` blocks.
- Extend `useIchartChain` to also fetch the previous 3-minute snapshot and the previous day's 15:30 close, for the change columns and Build Up.
- After the build, take a Playwright screenshot of each page and compare it side by side with the original layout.
