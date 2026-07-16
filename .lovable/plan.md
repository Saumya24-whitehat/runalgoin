
# OptionWorld Club — Plan

Adds a new **Club** membership tier and a StockEdge-style club feed / chat feature under `/optionworld-club`.

## 1. Membership tier: `club`

**Price:** ₹3,500/year (no monthly).
**Includes:** everything in Pro + Club chat group access + Analyst support + Expert recommendations (stock ideas, discussions).

### DB changes (migration)
- Extend allowed `plan_type` values on `subscriptions` to include `'club'` (currently `free | pro | enterprise`). Update the CHECK constraint.
- No new subscription table needed — reuse `subscriptions` + `payments` + `invoices`.
- Add helper SQL function `public.is_club_member(_user_id uuid) returns boolean` (SECURITY DEFINER).

### Frontend
- `useSubscription` hook: add `isClub` (true when `plan_type in ('club','enterprise')`) and treat club as a superset of Pro (so `isPro` also becomes true for club users — keeps all existing Pro gates working).
- `src/pages/Plans.tsx`: add a third pricing card **Club — ₹3,500/year**, highlighted, listing Pro features + club-only perks (Analyst support, Expert recommendations, Club chat).
- Extend `useRazorpayCheckout` + `create-razorpay-order` + `verify-razorpay-payment` edge functions to accept `plan: 'club'` (₹3,500, 1 year expiry).
- Extend `useSelfDeclaredPayment` + `self-declared-payment` edge function similarly (PayPal/UPI already supported for pro; add club amount branch).
- Extend `AlternatePaymentModal` to accept `plan: 'monthly' | 'yearly' | 'club'`.

## 2. OptionWorld Club feature

Route: `/optionworld-club` (nav link visible to all; page gates content behind club membership).

### DB (new tables, all in `public`, with GRANTs + RLS)

```
club_categories(id, name, slug, description, created_at)
   -- e.g. Momentum Investing, Short Term Trading, Long Term Investing, Technical Club, General Chat

club_posts(id, user_id, category_id, title?, body, image_url?, 
           idea_type?, action?, exchange?, symbol?, cmp?, entry_zone?, stop_loss?, target1?, timeframe?, rationale?,
           created_at, updated_at, deleted_at?)

club_post_likes(id, post_id, user_id, created_at)  -- unique(post_id,user_id)

club_post_comments(id, post_id, user_id, body, created_at)

club_chat_messages(id, category_id, user_id, body, image_url?, reply_to_id?, created_at, deleted_at?)
```

Storage bucket: `club-media` (public) for post images and chat attachments.

### RLS policies (summary)

- **Read** all `club_*` tables: only authenticated users where `is_club_member(auth.uid())` is true, OR user has role `admin`.
- **Insert** posts/comments/likes/messages: only club members / admins, `user_id = auth.uid()`.
- **Update/Delete** own row only; admins can moderate any row (soft-delete via `deleted_at`).
- Categories: read for club members; write admin-only.

### Realtime
Enable Supabase Realtime on `club_chat_messages` and `club_posts` (via `alter publication supabase_realtime add table ...`) so chat + feed update live like WhatsApp.

### Frontend structure

```
src/pages/OptionWorldClub.tsx            -- shell w/ tabs: Feed | Chat | Categories
src/components/club/
  ClubGate.tsx                           -- shows upgrade CTA if !isClub
  ClubFeed.tsx                           -- StockEdge-style post list (avatar, name, category, date, body, image, View Post)
  ClubPostCard.tsx
  ClubPostComposer.tsx                   -- create post (structured "Stock Idea" fields optional)
  ClubChat.tsx                           -- WhatsApp-like chat surface
  ClubChatMessage.tsx                    -- bubble (own = right/primary, others = left/muted)
  ClubChatComposer.tsx                   -- text + image + send
  ClubCategorySidebar.tsx                -- select category / chat room
  ClubRightPanel.tsx                     -- StockEdge-style "Top Posts" side rail (reused on dashboard)
src/hooks/
  useClubMembership.ts                   -- wraps useSubscription -> isClub, expiresAt
  useClubPosts.ts                        -- react-query, realtime subscribe
  useClubChat.ts                         -- react-query + realtime channel
```

- Nav: add "Club" link in `Navbar` (badge "New"). Route added in `App.tsx` as lazy import.
- Dashboard: add a small **Top Club Posts** rail (visible to all; blurred/upgrade CTA for non-members) — mirrors the StockEdge right panel you shared.
- Auto-refresh: chat via Supabase realtime; feed via react-query 30s + realtime insert.

### Chat UX (WhatsApp-like)
- Sticky bottom composer, auto-scroll to newest, message bubbles with name + timestamp, image preview, reply-to snippet, unread divider, typing indicator (optional, skipped in v1).
- Rooms = categories (General, Momentum Investing, Short Term Trading, Long Term Investing, Technical Club).

## 3. Files to edit / add

**New**
- `supabase/migrations/<ts>_club_membership_and_club_feature.sql`
- `supabase/functions/_shared/*` — no new function; extend existing.
- `src/pages/OptionWorldClub.tsx`
- `src/components/club/*` (list above)
- `src/hooks/useClubMembership.ts`, `useClubPosts.ts`, `useClubChat.ts`

**Edited**
- `src/hooks/useSubscription.ts` — add `isClub`, make `isPro` inclusive of club.
- `src/pages/Plans.tsx` — add Club card.
- `src/components/AlternatePaymentModal.tsx` — accept `club` plan.
- `src/hooks/useRazorpayCheckout.ts` + `create-razorpay-order` + `verify-razorpay-payment` edge functions — accept `club`.
- `src/hooks/useSelfDeclaredPayment.ts` + `self-declared-payment` edge function — accept `club`.
- `src/App.tsx` — route `/optionworld-club`.
- `src/components/Navbar.tsx` + `MobileBottomNav.tsx` — Club link.

## 4. Out of scope (v1)
- Push notifications, voice/video, message reactions, per-user DMs. Group rooms only.
- Rich stock-symbol autocomplete inside post composer (plain text + optional structured fields for now).

## Confirm before I build
- Price ₹3,500/yr, club is Pro-superset (all Pro features included) ✅
- Route name `/optionworld-club` ok?
- Initial chat rooms: **General, Momentum Investing, Short Term Trading, Long Term Investing, Technical Club** — ok, or different list?
- Only admins can post "Expert recommendations" (stock ideas), regular members can chat + comment? Or all club members can post ideas?
