// Single source for iChart "API Document" and "Didn't Get API" pages.
// Add one entry per rebuilt iChart page.
export type IchartDataSource = {
  page: string;
  route: string;
  ichartEndpoint: string;
  sources: { fn: string; url: string; fields: string; calc: string }[];
  missing: { data: string; ichartUses: string; fallback: string }[];
};

const RA = "https://runalgo.xyz/data";

export const ICHART_DATA_SOURCES: IchartDataSource[] = [
  {
    page: "Home",
    route: "/admin/ichart",
    ichartEndpoint: "getDataForPublicDashboard_v17.php",
    sources: [
      { fn: "pcr-data", url: `${RA} (PCR data, 3-min)`, fields: "time, Future, CE_OI, PE_OI, PCR_OI", calc: "Index chart: price = Future, OI = CE_OI + PE_OI. Price change from first candle of day. PCR gauge = last PCR_OI." },
      { fn: "option-chain", url: `${RA}/getOptionChain.php`, fields: "strike, CE/PE IV, spot", calc: "IV gauge = average of ATM CE IV and PE IV." },
      { fn: "option-chain", url: `${RA}/getExpiryDates2.php`, fields: "expiry dates", calc: "Nearest monthly expiry used for buildup." },
      { fn: "future-buildup", url: `${RA}/future_buildup.php`, fields: "symbol, price %, OI %", calc: "Long Buildup P↑OI↑, Short Covering P↑OI↓, Short Buildup P↓OI↑, Long Unwinding P↓OI↓. Gainers/Losers = sorted by price % / OI %." },
    ],
    missing: [
      { data: "Futures OI per minute", ichartUses: "Index futures OI, 1-min", fallback: "Total option OI (CE+PE), 3-min" },
      { data: "Previous close price", ichartUses: "Change vs yesterday close", fallback: "Change vs today's first candle" },
      { data: "Volume change", ichartUses: "3rd bar in buildup boxes", fallback: "Bar hidden" },
      { data: "IVR / IVP", ichartUses: "IV Rank / Percentile boxes", fallback: "\"Data not available\"" },
      { data: "Stock logos", ichartUses: "SVG logo per stock", fallback: "2-letter blue circle" },
    ],
  },
  {
    page: "Option Chain",
    route: "/admin/ichart/option-chain",
    ichartEndpoint: "getOptionChain (OptionChain.php)",
    sources: [
      { fn: "option-chain", url: `${RA}/getSymbols.php`, fields: "symbols", calc: "Symbol dropdown." },
      { fn: "option-chain", url: `${RA}/getExpiryDates2.php`, fields: "expiry dates", calc: "Expiry dropdown." },
      { fn: "option-chain", url: `${RA}/getOptionChain.php`, fields: "strike, LTP, OI, prev OI, IV, volume, spot", calc: "COI = OI − prev OI. ATM = strike nearest spot. ITM shaded." },
    ],
    missing: [
      { data: "Build Up column", ichartUses: "Per-strike buildup label", fallback: "Not shown" },
      { data: "IV Chg, Volume Chg, LTP Chg", ichartUses: "Change columns", fallback: "Not shown" },
      { data: "OH/OL, VWAP", ichartUses: "Extra columns", fallback: "Not shown" },
      { data: "Bid / Ask", ichartUses: "Bid/Ask price & qty", fallback: "Not shown" },
    ],
  },
  {
    page: "Option OI Stats",
    route: "/admin/ichart/oi-stats",
    ichartEndpoint: "OptionOIStats.php",
    sources: [
      { fn: "option-chain", url: `${RA}/getOptionChain.php`, fields: "strike, CE/PE OI, prev OI", calc: "Total OI, total COI, PCR computed from chain." },
      { fn: "local", url: "computed in browser", fields: "strike, OI", calc: "Max Pain = strike with minimum total writer loss." },
    ],
    missing: [],
  },
];
