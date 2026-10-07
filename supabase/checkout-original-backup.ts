import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'

// MZPRD checkout: creates the PayPal order, verifies payment and delivers files.
// Downloads are only available for 15 minutes after payment and only to the browser that holds the secret.
const CLIENT_ID = 'BAAk_pgKpR08tx_Fv0QmKgsVga24tfZI0Rqfxq2v4J27q6GWAcTfVadt2vtvjAanJGlYQ8o_9SjbI_vhkc'
const WINDOW_MS = 15 * 60 * 1000
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const BASE = Deno.env.get('PAYPAL_ENV') === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'

const R2_ACCOUNT = '3bca007e698e2e39bbf51acd2b603ca0'
const R2_BUCKET = 'mzprd-files'
const r2 = () => new AwsClient({ accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!, secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!, service: 's3', region: 'auto' })
const r2Url = (key: string) => 'https://' + R2_ACCOUNT + '.r2.cloudflarestorage.com/' + R2_BUCKET + '/' + key.split('/').map(encodeURIComponent).join('/')
async function r2Presign(method: string, key: string, expires: number, extra?: Record<string, string>) {
  const u = new URL(r2Url(key))
  u.searchParams.set('X-Amz-Expires', String(expires))
  if (extra) for (const k in extra) u.searchParams.set(k, extra[k])
  const signed = await r2().sign(u.toString(), { method, aws: { signQuery: true } })
  return signed.url
}
async function authAdmin(req: Request) {
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer /i, '')
  if (!jwt) throw new Error('Not signed in.')
  const { data } = await sb.auth.getUser(jwt)
  if (!data || !data.user) throw new Error('Not signed in.')
  const { data: a } = await sb.from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle()
  if (!a) throw new Error('Not allowed.')
}

async function sha(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

let _tok: any = null
async function ppToken() {
  if (_tok && _tok.exp > Date.now()) return _tok.t as string
  const secret = Deno.env.get('PAYPAL_SECRET') || Deno.env.get('PAYPAL_SECRE')
  if (!secret) throw new Error('Payments are not switched on yet (PAYPAL_SECRET missing).')
  const r = await fetch(BASE + '/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(CLIENT_ID + ':' + secret), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  const j = await r.json()
  if (!r.ok) throw new Error('PayPal sign-in failed. Check the PayPal secret.')
  _tok = { t: j.access_token, exp: Date.now() + Math.max(60, (j.expires_in || 600) - 300) * 1000 }
  return j.access_token as string
}

async function priceLines(items: any[]) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 25) throw new Error('Your cart is empty.')
  const bIds = [...new Set(items.filter((i) => i.t === 'b').map((i) => String(i.id)))]
  const pIds = [...new Set(items.filter((i) => i.t === 'p').map((i) => String(i.id)))]
  const [st, bs, ps]: any[] = await Promise.all([
    sb.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    bIds.length ? sb.from('beats').select('id,title,price').in('id', bIds).eq('published', true) : Promise.resolve({ data: [] }),
    pIds.length ? sb.from('packs').select('id,title,price').in('id', pIds).eq('published', true) : Promise.resolve({ data: [] }),
  ])
  const promoOn = !!(st.data && st.data.promo_enabled)
  const lines: any[] = []
  for (const id of bIds) {
    const b = (bs.data || []).find((x: any) => x.id === id)
    if (!b) throw new Error('A beat in your cart is no longer available.')
    lines.push({ t: 'b', id, title: b.title, price: promoOn ? Number(st.data.promo_price) : Number(b.price) })
  }
  for (const id of pIds) {
    const p = (ps.data || []).find((x: any) => x.id === id)
    if (!p) throw new Error('A sample pack in your cart is no longer available.')
    lines.push({ t: 'p', id, title: p.title, price: Number(p.price) })
  }
  return lines
}

async function bundleSavings(lines: any[]) {
  const { data } = await sb.from('bundles').select('*').eq('active', true)
  const bundles: any[] = data || []
  let rest = lines.map((l) => ({ ...l }))
  let savings = 0
  const names: string[] = []
  const key = (l: any) => l.t + ':' + l.id
  for (const b of bundles.filter((x) => x.kind === 'fixed')) {
    const keys: string[] = b.item_keys || []
    if (!keys.length) continue
    const hit = keys.map((k) => rest.find((l) => key(l) === k))
    if (hit.every(Boolean)) {
      const sum = hit.reduce((s: number, l: any) => s + l.price, 0)
      if (Number(b.price) < sum) {
        savings += sum - Number(b.price)
        names.push(b.name)
        rest = rest.filter((l) => !hit.includes(l))
      }
    }
  }
  for (const b of bundles.filter((x) => x.kind !== 'fixed').sort((a, c) => c.qty - a.qty)) {
    const t = b.kind === 'any_packs' ? 'p' : 'b'
    const n = Number(b.qty) || 0
    if (n < 2) continue
    let pool = rest.filter((l) => l.t === t).sort((a, c) => c.price - a.price)
    while (pool.length >= n) {
      const grp = pool.slice(0, n)
      const sum = grp.reduce((s: number, l: any) => s + l.price, 0)
      if (Number(b.price) >= sum) break
      savings += sum - Number(b.price)
      names.push(b.name)
      rest = rest.filter((l) => !grp.includes(l))
      pool = pool.slice(n)
    }
  }
  return { savings: Math.round(savings * 100) / 100, names }
}

async function itemPath(l: any) {
  const table = l.t === 'b' ? 'beats' : 'packs'
  const col = l.t === 'b' ? 'audio_path' : 'file_path'
  const { data } = await sb.from(table).select(col).eq('id', l.id).maybeSingle()
  return data ? ((data as any)[col] as string | null) : null
}

async function listFor(o: any, secondsLeft: number) {
  const downloads: any[] = []
  for (let i = 0; i < o.items.length; i++) {
    downloads.push({ i, title: o.items[i].title, available: !!(await itemPath(o.items[i])) })
  }
  return { token: o.token, seconds_left: secondsLeft, downloads }
}

async function authOrder(token: string, secret: string) {
  const { data: o } = await sb.from('orders').select('*').eq('token', token).eq('status', 'paid').maybeSingle()
  if (!o || !o.secret_hash || !o.paid_at) throw new Error('Order not found.')
  if ((await sha(secret)) !== o.secret_hash) throw new Error('Downloads are only available in the browser that made the purchase.')
  const left = new Date(o.paid_at).getTime() + WINDOW_MS - Date.now()
  if (left <= 0) throw new Error('Your 15 minute download window has ended.')
  return { o, left }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json()

    if (body.action === 'ping') return json({ ok: true })

    if (body.action === 'r2-upload-url') {
      await authAdmin(req)
      const folder = String(body.folder || 'files').replace(/[^a-z0-9_-]/gi, '')
      const ext = (String(body.ext || '').match(/^[.][A-Za-z0-9]{1,8}$/) || [''])[0]
      const key = folder + '/' + crypto.randomUUID() + ext
      return json({ key, url: await r2Presign('PUT', key, 3600) })
    }

    if (body.action === 'r2-delete') {
      await authAdmin(req)
      const key = String(body.key || '')
      if (!/^[a-z0-9_-]+[/][A-Za-z0-9-]+([.][A-Za-z0-9]+)?$/i.test(key)) throw new Error('Bad key.')
      const r = await r2().fetch(r2Url(key), { method: 'DELETE' })
      return json({ ok: r.ok })
    }

    if (body.action === 'create') {
      const lines = await priceLines(body.items)
      const gross = Math.round(lines.reduce((s, l) => s + l.price, 0) * 100) / 100
      const bd = await bundleSavings(lines)
      const total = Math.round((gross - bd.savings) * 100) / 100
      if (!(total >= 0.01)) throw new Error('Nothing to pay for.')
      const tok = await ppToken()
      const r = await fetch(BASE + '/v2/checkout/orders', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', 'PayPal-Request-Id': crypto.randomUUID() },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: 'MZPRD',
            description: 'MZPRD digital download',
            soft_descriptor: 'MZPRD',
            amount: {
              currency_code: 'USD',
              value: total.toFixed(2),
              breakdown: bd.savings > 0
                ? { item_total: { currency_code: 'USD', value: gross.toFixed(2) }, discount: { currency_code: 'USD', value: bd.savings.toFixed(2) } }
                : { item_total: { currency_code: 'USD', value: gross.toFixed(2) } },
            },
            items: lines.map((l) => ({
              name: String(l.title).slice(0, 120),
              unit_amount: { currency_code: 'USD', value: l.price.toFixed(2) },
              quantity: '1',
              category: 'DIGITAL_GOODS',
            })),
          }],
          application_context: { brand_name: 'MZPRD', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW', landing_page: 'LOGIN' },
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error('PayPal could not start the order.')
      const { error } = await sb.from('orders').insert({ paypal_order_id: j.id, total, items: lines, status: 'created', discount: bd.savings, bundle_note: bd.names.length ? bd.names.join(', ') : null })
      if (error) throw new Error('Could not save the order.')
      return json({ id: j.id })
    }

    if (body.action === 'capture') {
      const orderId = String(body.orderId || '')
      const { data: o } = await sb.from('orders').select('*').eq('paypal_order_id', orderId).maybeSingle()
      if (!o) return json({ error: 'Order not found.' }, 404)
      let paidAt = o.paid_at ? new Date(o.paid_at).getTime() : 0
      if (o.status !== 'paid') {
        const tok = await ppToken()
        let r = await fetch(BASE + '/v2/checkout/orders/' + orderId + '/capture', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', 'PayPal-Request-Id': 'cap-' + orderId },
        })
        let j = await r.json()
        if (!r.ok) {
          const again = j && j.details && j.details[0] && j.details[0].issue === 'ORDER_ALREADY_CAPTURED'
          if (!again) throw new Error('The payment was not completed.')
          r = await fetch(BASE + '/v2/checkout/orders/' + orderId, { headers: { Authorization: 'Bearer ' + tok } })
          j = await r.json()
        }
        const cap = j.purchase_units && j.purchase_units[0] && j.purchase_units[0].payments && j.purchase_units[0].payments.captures && j.purchase_units[0].payments.captures[0]
        if (j.status !== 'COMPLETED' || !cap || cap.status !== 'COMPLETED') throw new Error('The payment is still pending. You will be able to download when it clears.')
        if (cap.amount.currency_code !== 'USD' || Math.abs(Number(cap.amount.value) - Number(o.total)) > 0.001) {
          await sb.from('orders').update({ status: 'review' }).eq('id', o.id)
          throw new Error('Payment amount did not match. Please contact the seller.')
        }
        const payer = j.payer || {}
        const nm = payer.name ? [payer.name.given_name, payer.name.surname].filter(Boolean).join(' ') : null
        paidAt = Date.now()
        await sb.from('orders').update({ status: 'paid', paid_at: new Date(paidAt).toISOString(), payer_email: payer.email_address || null, payer_name: nm }).eq('id', o.id)
        o.status = 'paid'
      }
      const left = paidAt + WINDOW_MS - Date.now()
      if (left <= 0) throw new Error('Your 15 minute download window has ended.')
      const secret = crypto.randomUUID() + crypto.randomUUID()
      await sb.from('orders').update({ secret_hash: await sha(secret) }).eq('id', o.id)
      const out: any = await listFor(o, Math.floor(left / 1000))
      out.secret = secret
      return json(out)
    }

    if (body.action === 'list') {
      const { o, left } = await authOrder(String(body.token || ''), String(body.secret || ''))
      return json(await listFor(o, Math.floor(left / 1000)))
    }

    if (body.action === 'download') {
      const { o } = await authOrder(String(body.token || ''), String(body.secret || ''))
      const l = o.items[Number(body.i)]
      if (!l) throw new Error('File not found.')
      const path = await itemPath(l)
      if (!path) throw new Error('This file has not been uploaded yet.')
      const ext = (String(path).match(/[.][A-Za-z0-9]+$/) || [''])[0]
      const name = String(l.title).replace(/[^a-zA-Z0-9 ._-]+/g, '') + ' - MZPRD' + ext
      if (String(path).indexOf('r2:') === 0) {
        const url = await r2Presign('GET', String(path).slice(3), 45, { 'response-content-disposition': 'attachment; filename="' + name + '"' })
        return json({ url })
      }
      const { data: s } = await sb.storage.from('private-files').createSignedUrl(path, 45, { download: name })
      if (!s) throw new Error('Could not prepare the download.')
      return json({ url: s.signedUrl })
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch (e) {
    return json({ error: (e as Error).message || 'Something went wrong.' }, 400)
  }
})
