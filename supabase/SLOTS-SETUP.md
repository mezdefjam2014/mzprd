# MZPRD Slots: setup (do these in order)

The site code is already live. Slots stay hidden until the three server pieces below are done.
No passwords or secret keys are needed for any of this.

## 1. Create the tables (one time)
Supabase > SQL Editor > New query > paste all of `supabase/slots.sql` > Run.

## 2. Deploy the game function
Supabase > Edge Functions > Deploy a new function > name it exactly `slots` > paste all of `supabase/slots-function.ts` > Deploy.
It uses the project's built-in keys, no extra secrets.

## 3. Update the checkout function so coupons really take money off
This is the step that makes a coupon work when someone pays. Do not tick the checkbox in step 4 until this is done,
otherwise the cart would show a discount that PayPal does not charge.

Add the helpers below to the checkout function, then use them in three places.

```ts
// ---- coupons ----
const COUPON_RE = /^MZ-[A-Z0-9]{8}$/
async function loadCoupon(sb: any, raw: unknown) {
  const code = String(raw || '').trim().toUpperCase()
  if (!COUPON_RE.test(code)) return null
  const { data: c } = await sb.from('coupons').select('*').eq('code', code).maybeSingle()
  if (!c || c.used_at || new Date(c.expires_at).getTime() < Date.now()) return null
  return c
}
// percent off the single most expensive BEAT in the cart (same rule as the cart on the site)
function couponDiscount(pct: number, items: { t: string; price: number }[], subtotalAfterBundles: number) {
  const top = Math.max(0, ...items.filter((i) => i.t === 'b').map((i) => i.price))
  const d = Math.round(top * pct) / 100
  return Math.max(0, Math.min(d, subtotalAfterBundles))
}
```

1. In `create`: after the promo and bundle math, if `body.coupon` is sent: `const c = await loadCoupon(sb, body.coupon)`;
   if it is null return the error "That coupon is not valid or has expired."; otherwise subtract
   `couponDiscount(c.pct, pricedItems, totalAfterBundles)` from the total BEFORE creating the PayPal order, and store the
   code and discount on the order row (so capture knows). Also set `reserved_order` on the coupon.
2. In `capture`, before capturing the payment: claim the coupon in one step so it can only be used once:
   `update coupons set used_at = now(), order_id = <id> where code = <order coupon> and used_at is null returning code`.
   If nothing comes back, refuse with "That coupon was already used" and do not capture. If the PayPal capture then fails,
   set `used_at` back to null.
3. In the amount check that compares what PayPal captured with the server price, use the discounted total.

Paste your current checkout function to Claude and ask it to merge these in. It cannot see the function from here.

## 4. Turn it on
Back office > PROMO > SLOTS: save the settings, tick "I updated the checkout function", then tick "Game is open to visitors".
To try it first without opening it to visitors: tick "Turn on test slots on this browser". PLAY SLOTS then shows only for you,
with buttons to force a win, the jackpot or a loss.
