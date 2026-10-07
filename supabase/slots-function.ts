// MZPRD Slots edge function. In Supabase: Edge Functions > Deploy a new function > name it exactly: slots
// Paste this whole file, then Deploy. No extra secrets needed (it uses the built-in project keys).
// All game logic runs here, so visitors cannot cheat from the browser.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const URL_ = Deno.env.get('SUPABASE_URL')!
const sb = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

// secure random float in [0,1)
const rnd = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296
const pickInt = (n: number) => Math.floor(rnd() * n)
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newCode = () => 'MZ-' + Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => ALPHA[b % ALPHA.length]).join('')

async function isAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get('authorization') || ''
  const tok = auth.replace(/^Bearer\s+/i, '')
  if (!tok) return false
  try {
    const u = createClient(URL_, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: 'Bearer ' + tok } } })
    const { data, error } = await u.rpc('is_admin')
    return !error && data === true
  } catch { return false }
}

async function settings() {
  const { data } = await sb.from('slot_settings').select('*').eq('id', 1).maybeSingle()
  return data || { enabled: false, checkout_ready: false, win_chance: 0.125, jackpot_chance: 0.1, win_pct: 15, jackpot_pct: 30, coupon_hours: 48, spins_per_day: 5, daily_coupon_cap: 10, cooldown_days: 14 }
}

async function state(bid: string, st: any, test: boolean) {
  const now = Date.now()
  const day = new Date(now - 86400000).toISOString()
  const spins = await sb.from('slot_spins').select('id', { count: 'exact', head: true }).eq('browser_id', bid).eq('is_test', false).gte('created_at', day)
  const spinsLeft = Math.max(0, st.spins_per_day - (spins.count || 0))
  const cps = await sb.from('coupons').select('*').eq('browser_id', bid).eq('is_test', test).order('created_at', { ascending: false }).limit(5)
  const rows = cps.data || []
  const active = rows.find((c: any) => !c.used_at && new Date(c.expires_at).getTime() > now) || null
  const last = rows[0] || null
  const nextWinAt = last && !test ? new Date(new Date(last.created_at).getTime() + st.cooldown_days * 86400000).toISOString() : null
  const cooling = !!(nextWinAt && new Date(nextWinAt).getTime() > now)
  return { spinsLeft, active, nextWinAt: cooling ? nextWinAt : null, lastUsed: !!(last && last.used_at) }
}

function makeReels(kind: 'win' | 'jackpot' | 'lose'): number[] {
  // symbols 0..6 are instruments, 7 is the crown (jackpot)
  if (kind === 'jackpot') return [7, 7, 7]
  if (kind === 'win') { const s = pickInt(7); return [s, s, s] }
  for (;;) {
    let r = [pickInt(8), pickInt(8), pickInt(8)]
    if (rnd() < 0.35) { // near miss: two match, third differs
      const a = pickInt(8); let b = pickInt(8); while (b === a) b = pickInt(8)
      r = [a, a, a]; r[pickInt(3)] = b
    }
    if (!(r[0] === r[1] && r[1] === r[2])) return r
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  let body: any = {}
  try { body = await req.json() } catch { return json({ error: 'Bad request' }, 400) }
  const action = String(body.action || '')
  const st = await settings()

  if (action === 'check') {
    const code = String(body.code || '').trim().toUpperCase()
    if (!/^MZ-[A-Z0-9]{8}$/.test(code)) return json({ ok: false, reason: 'That code is not valid.' })
    const { data: c } = await sb.from('coupons').select('*').eq('code', code).maybeSingle()
    if (!c) return json({ ok: false, reason: 'That code is not valid.' })
    if (c.used_at) return json({ ok: false, reason: 'That code has already been used.' })
    if (new Date(c.expires_at).getTime() < Date.now()) return json({ ok: false, reason: 'That code has expired.' })
    return json({ ok: true, code, pct: c.pct, kind: c.kind, expires_at: c.expires_at })
  }

  const bid = String(body.browser || '')
  if (!/^[A-Za-z0-9-]{16,64}$/.test(bid)) return json({ error: 'Bad browser id' }, 400)
  const admin = await isAdmin(req)
  const test = !!body.test && admin

  if (action === 'status') {
    const s = await state(bid, st, test)
    return json({ enabled: test || (st.enabled && st.checkout_ready), test, admin, pct: st.win_pct, jackpotPct: st.jackpot_pct, spinsPerDay: st.spins_per_day, cooldownDays: st.cooldown_days, ...s })
  }

  if (action === 'reset') { // admin only: wipe this browser's slot history so you can test again
    if (!admin) return json({ error: 'Admins only' }, 403)
    await sb.from('coupons').delete().eq('browser_id', bid)
    await sb.from('slot_spins').delete().eq('browser_id', bid)
    return json({ ok: true })
  }

  if (action === 'spin') {
    if (!test && !(st.enabled && st.checkout_ready)) return json({ error: 'closed' }, 403)
    const s = await state(bid, st, test)
    if (!test) {
      if (s.active) return json({ error: 'has-coupon', active: s.active }, 409)
      if (s.nextWinAt) return json({ error: 'cooldown', nextWinAt: s.nextWinAt }, 429)
      if (s.spinsLeft <= 0) return json({ error: 'no-spins', spinsLeft: 0 }, 429)
      const recent = await sb.from('slot_spins').select('created_at').eq('browser_id', bid).order('created_at', { ascending: false }).limit(1)
      if (recent.data && recent.data[0] && Date.now() - new Date(recent.data[0].created_at).getTime() < 1500) return json({ error: 'slow-down' }, 429)
    }
    // can this spin win? (daily coupon cap)
    const since = new Date(Date.now() - 86400000).toISOString()
    const made = await sb.from('coupons').select('code', { count: 'exact', head: true }).eq('is_test', false).gte('created_at', since)
    const capOk = test || (made.count || 0) < st.daily_coupon_cap
    const force = test ? String(body.force || '') : ''
    let kind: 'win' | 'jackpot' | 'lose' = 'lose'
    if (force === 'win' || force === 'jackpot' || force === 'lose') kind = force as any
    else if (capOk && rnd() < Number(st.win_chance)) kind = rnd() < Number(st.jackpot_chance) ? 'jackpot' : 'win'
    let reels = makeReels(kind)
    let coupon: any = null
    if (kind !== 'lose') {
      const pct = kind === 'jackpot' ? st.jackpot_pct : st.win_pct
      const expires_at = new Date(Date.now() + st.coupon_hours * 3600000).toISOString()
      for (let i = 0; i < 5 && !coupon; i++) {
        const code = newCode()
        const { error } = await sb.from('coupons').insert({ code, browser_id: bid, pct, kind, expires_at, is_test: test })
        if (!error) coupon = { code, pct, kind, expires_at }
      }
      if (!coupon) return json({ error: 'Could not create the coupon, try again.' }, 500)
      if (!test) { // race guard: never more than one live win per browser inside the cooldown
        const c = await sb.from('coupons').select('code,created_at').eq('browser_id', bid).eq('is_test', false).gte('created_at', new Date(Date.now() - st.cooldown_days * 86400000).toISOString()).order('created_at')
        if ((c.data || []).length > 1 && c.data![0].code !== coupon.code) { await sb.from('coupons').delete().eq('code', coupon.code); coupon = null; kind = 'lose'; reels = makeReels('lose') }
      }
    }
    const final = coupon ? kind : 'lose'
    await sb.from('slot_spins').insert({ browser_id: bid, reels, outcome: final, coupon_code: coupon ? coupon.code : null, is_test: test })
    const after = await state(bid, st, test)
    return json({ reels, outcome: final, coupon, spinsLeft: test ? 99 : after.spinsLeft, nextWinAt: after.nextWinAt })
  }

  return json({ error: 'Unknown action' }, 400)
})
