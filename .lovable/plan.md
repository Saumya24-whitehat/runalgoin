## Temporary payment methods: PayPal + UPI QR (self-declared)

While Razorpay verification is pending, add two alternate checkout options on the Plans page. Both use a **self-declared trust model**: user pays, enters transaction ID, Pro activates instantly. Admin can review/revoke later.

### 1. Plans page UI changes (`src/pages/Plans.tsx`)
- Keep existing Razorpay button (still works when needed).
- Add two new buttons per plan card: **"Pay with PayPal"** and **"Pay with UPI"**.
- Each opens a modal with:
  - Payment instructions (PayPal button/link OR UPI QR + UPI ID `9276251260@cnrb`)
  - Amount to pay (₹150 monthly / ₹1,500 yearly; PayPal shown in USD equivalent ~$2 / $18)
  - Input field: "Transaction ID / UTR / PayPal Order ID"
  - "I've paid — Activate Pro" button

### 2. New component `src/components/AlternatePaymentModal.tsx`
Handles both PayPal and UPI flows in one component (mode prop). For UPI: renders a QR image (generated from `upi://pay?pa=9276251260@cnrb&pn=OptionWorld&am=<amount>&cu=INR` via a QR library like `qrcode.react`). For PayPal: shows a PayPal.me-style link/button plus manual txn ID entry (auto-capture skipped since flow is self-declared).

### 3. New edge function `supabase/functions/self-declared-payment/index.ts`
- Auth: requires JWT (user must be signed in).
- Input: `{ method: "paypal" | "upi", plan: "monthly" | "yearly", transaction_id: string }`.
- Validates with Zod (transaction_id 4–100 chars).
- Inserts row into `payments` table with `status: 'self_declared'`, `razorpay_order_id` = `manual_${method}_${timestamp}` (satisfies unique constraint), `notes: { method, transaction_id, plan, user_id }`.
- Upserts `subscriptions` → `plan_type: 'pro'`, `status: 'active'`, `expires_at` = +1 month / +1 year.
- Writes `subscription_audit_log` row with `reason: 'self_declared_payment'`, `actor: 'user'`.
- Generates invoice row like the Razorpay flow.
- Returns success + expires_at.

### 4. Client hook `src/hooks/useSelfDeclaredPayment.ts`
Mirrors `useRazorpayCheckout` shape: `submit({ method, plan, transactionId })`, invokes the edge function, toasts result, calls `refetch()` on `useSubscription`.

### 5. Admin visibility
Payments already surface in the admin Payment History via existing tables. Self-declared ones will be distinguishable by `status = 'self_declared'` and `razorpay_order_id` prefix `manual_`. No new admin UI in this pass — admin can revoke via existing `UserSubscriptionManager`.

### 6. Dependencies
- `qrcode.react` for the UPI QR rendering (small, no network needed).

### Technical notes
- No new tables — reuses `payments`, `subscriptions`, `invoices`, `subscription_audit_log`.
- No PayPal API credentials needed for this trust-based flow (skip API integration entirely; just show PayPal.me link + capture order ID manually). If you want auto-verified PayPal later, we'd add Client ID/Secret then and swap the modal to PayPal JS SDK.
- Security: self-declared model is intentionally trust-based per your choice; server still validates auth + input shape, and audit log records every activation for later review.
