# MZPRD Slots: setup status

Everything below was done for you on 2026-10-07 in the Supabase project `mzprd`.

## Done
1. Tables created from `supabase/slots.sql`: `slot_settings`, `slot_spins`, `coupons` (admin-only access).
2. Orders got two columns: `coupon_code` and `coupon_discount`.
3. Edge function `slots` deployed from `supabase/slots-function.ts` (JWT check off, because the site uses a publishable key; the function checks admins itself).
4. Edge function `checkout` updated for coupons:
   - `create`: validates the code, takes the percent off the single most expensive beat (after bundles), lowers the PayPal amount, saves the code and discount on the order, reserves the coupon.
   - `capture`: claims the coupon in one step before taking payment, so a code can only be used once; releases it if the payment fails.
   - The original function is saved in `supabase/checkout-original-backup.ts`. To roll back, paste that file into the checkout function and deploy.
5. `slot_settings.checkout_ready` is set to true.

Tested against the live backend: a normal $10.00 order is unchanged; with a 15% test coupon the order was $8.50 (coupon_discount 1.5, coupon reserved); an invalid code and a packs-only cart are refused with clear messages. The test rows were deleted afterwards.

## Still yours to do (the game is closed to visitors right now)
Back office > PROMO > SLOTS:
- Tick **Turn on test slots on this browser** and try it (force a win, then use the code in your cart with the cheapest beat).
- When happy, tick **Game is open to visitors** and Save. That shows PLAY SLOTS on the banner for everyone.
