// MZPRD public site function ("site"): show hearts, email sign-ups and server time.
// Deployed in Supabase > Edge Functions with JWT verification OFF (the site uses a publishable key).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[A-Za-z]{2,24}$/

// best-effort per-instance limiter for sign-ups (by IP)
const hits = new Map<string, number[]>()
function limited(ip: string, max: number, ms: number) {
  const now = Date.now()
  const a = (hits.get(ip) || []).filter((t) => now - t < ms)
  a.push(now)
  hits.set(ip, a)
  return a.length > max
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  let body: any = {}
  try { body = await req.json() } catch { return json({ error: 'Bad request' }, 400) }
  const action = String(body.action || '')

  if (action === 'now') return json({ now: Date.now() })

  if (action === 'hearts') {
    const id = String(body.show || '')
    if (!UUID.test(id)) return json({ error: 'Bad show' }, 400)
    const { data } = await sb.from('shows').select('hearts,status').eq('id', id).maybeSingle()
    if (!data || data.status === 'draft') return json({ error: 'Not found' }, 404)
    return json({ hearts: Number(data.hearts), now: Date.now() })
  }

  if (action === 'heart') {
    const id = String(body.show || '')
    const bid = String(body.browser || '')
    let n = Math.floor(Number(body.n) || 0)
    if (!UUID.test(id) || !/^[A-Za-z0-9-]{16,64}$/.test(bid) || n < 1) return json({ error: 'Bad request' }, 400)
    n = Math.min(n, 30)
    // at most 240 taps per browser per minute
    const { data: lg } = await sb.from('show_heart_log').select('*').eq('browser_id', bid).maybeSingle()
    const now = Date.now()
    let start = lg ? new Date(lg.window_start).getTime() : now
    let taps = lg ? lg.taps : 0
    if (now - start > 60000) { start = now; taps = 0 }
    const allowed = Math.max(0, 240 - taps)
    n = Math.min(n, allowed)
    if (n > 0) {
      await sb.from('show_heart_log').upsert({ browser_id: bid, window_start: new Date(start).toISOString(), taps: taps + n })
      const { data: hearts } = await sb.rpc('add_hearts', { sid: id, n })
      return json({ hearts: Number(hearts || 0), added: n })
    }
    const { data } = await sb.from('shows').select('hearts').eq('id', id).maybeSingle()
    return json({ hearts: Number(data ? data.hearts : 0), added: 0 })
  }

  if (action === 'subscribe') {
    if (body.website) return json({ ok: true }) // honeypot
    const email = String(body.email || '').trim().toLowerCase()
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x'
    if (limited(ip, 8, 3600000)) return json({ error: 'Too many tries. Please try again later.' }, 429)
    if (!EMAIL.test(email)) return json({ error: 'That email does not look right.' }, 400)
    const source = ['site', 'checkout', 'show'].includes(String(body.source)) ? String(body.source) : 'site'
    const { data: ex } = await sb.from('email_list').select('id').ilike('email', email).maybeSingle()
    if (ex) await sb.from('email_list').update({ unsub_at: null }).eq('id', ex.id)
    else await sb.from('email_list').insert({ email, source })
    return json({ ok: true })
  }

  return json({ error: 'Unknown action' }, 400)
})
