# Upstox as the main data source + Broker Login (admin)

## What we learned
- Upstox login is OAuth 2.0: user is sent to Upstox login page, logs in (OTP/TOTP), Upstox returns a one-time code, our server swaps it for an access token.
- The token expires daily (around 3:30 AM IST), so admin must log in once every trading day.
- Today the site already uses Upstox only for the live WebSocket, with a token read from runalgo.xyz/DoNotTouch/upstox.txt.
- Upstox gives: full option chain (all stocks + indices, with greeks, IV, bid/ask, volume, OI, prev OI), market quotes (OHLC, LTP, volume, OI), historical + intraday candles (1-min, with OI for F&O), expiry list, instrument master (all symbols), live WebSocket.
- This fills most of our "Didn't Get API" list: stock symbols, futures OI per minute, previous close, volume change, Bid/Ask, futures OHLC candles, lot size.
- Not from Upstox: IVR/IVP (we compute from stored IV history later), MWPL, rollover (we compute from futures OI).

## Step 1 (this round): Broker Login
- Admin enters Upstox API Key + API Secret (stored as secure backend secrets, never in code).
- In Upstox Developer Apps, redirect URI set to `https://optionworld.tech/admin/upstox/callback`.
- New Admin page "Broker Login": shows status (Connected / Expired, login time, expiry), a "Login with Upstox" button, and "Disconnect".
- Callback page receives the code, backend function exchanges it for the token and saves it in a protected admin-only table.
- Existing live WebSocket switches to this token (runalgo token kept as fallback).

## Step 2 (next rounds, page by page)
- New backend function `upstox-data` with actions: instruments, expiries, optionChain, quote, intradayCandles, historicalCandles.
- Switch iChart pages one by one to Upstox data (symbol dropdown gets all F&O stocks), update API Document and Didn't Get API pages.

## Technical details
- Table `broker_tokens` (provider, access_token, user_name, issued_at, expires_at); RLS admin-only via `has_role`; edge functions read with service role.
- Edge functions: `upstox-auth` (getLoginUrl, exchangeCode, status, disconnect) and later `upstox-data`; JWT + admin check in code.
- Secrets: `UPSTOX_API_KEY`, `UPSTOX_API_SECRET`, `UPSTOX_REDIRECT_URI`.
