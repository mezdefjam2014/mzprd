import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'

// MZPRD customer accounts: attach a paid order to a signed-in buyer, list their purchases, re-download.
const WINDOW_MS = 15 * 60 * 1000
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const R2_ACCOUNT = '3bca007e698e2e39bbf51acd2b603ca0'
const R2_BUCKET = 'mzprd-files'
const r2 = () => new AwsClient({ accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!, secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!, service: 's3', region: 'auto' })
const r2Url = (key: string) => 'https://' + R2_ACCOUNT + '.r2.cloudflarestorage.com/' + R2_BUCKET + '/' + key.split('/').map(encodeURIComponent).join('/')
async function r2Presign(key: string, expires: number, extra: Record<string, string>) {
  const u = new URL(r2Url(key))
  u.searchParams.set('X-Amz-Expires', String(expires))
  for (const k in extra) u.searchParams.set(k, extra[k])
  return (await r2().sign(u.toString(), { method: 'GET', aws: { signQuery: true } })).url
}
async function sha(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
}
async function user(req: Request) {
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer /i, '')
  if (!jwt) throw new Error('Please sign in.')
  const { data } = await sb.auth.getUser(jwt)
  if (!data || !data.user) throw new Error('Please sign in.')
  const bu = (data.user as any).banned_until
  if (bu && new Date(bu).getTime() > Date.now()) throw new Error('This account has been suspended.')
  return data.user
}
async function itemPath(l: any) {
  const table = l.t === 'b' ? 'beats' : 'packs'
  const col = l.t === 'b' ? 'audio_path' : 'file_path'
  const { data } = await sb.from(table).select(col).eq('id', l.id).maybeSingle()
  return data ? ((data as any)[col] as string | null) : null
}
async function enabled() {
  const { data } = await sb.from('site_settings').select('accounts_redownload').eq('id', 1).maybeSingle()
  return !data || data.accounts_redownload !== false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json()
    if (body.action === 'settings') return json({ redownload: await enabled() })
    const u = await user(req)

    if (String(body.action).indexOf('admin-') === 0) {
      const { data: a } = await sb.from('admins').select('user_id').eq('user_id', u.id).maybeSingle()
      if (!a) throw new Error('Not allowed.')
      if (body.action === 'admin-list') {
        const { data: lu, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
        if (error) throw new Error(error.message)
        const { data: os } = await sb.from('orders').select('user_id,items,total,paid_at').not('user_id', 'is', null).eq('status', 'paid').order('paid_at', { ascending: false })
        const { data: ad } = await sb.from('admins').select('user_id')
        const adm = new Set((ad || []).map((x: any) => x.user_id))
        const users = (lu.users || []).filter((x: any) => !adm.has(x.id)).map((x: any) => {
          const mine = (os || []).filter((o: any) => o.user_id === x.id)
          return {
            id: x.id, email: x.email, created_at: x.created_at, last_sign_in_at: x.last_sign_in_at,
            verified: !!x.email_confirmed_at,
            banned: !!(x.banned_until && new Date(x.banned_until).getTime() > Date.now()),
            spent: Math.round(mine.reduce((t: number, o: any) => t + Number(o.total), 0) * 100) / 100,
            bought: mine.flatMap((o: any) => (o.items || []).map((i: any) => ({ title: i.title, at: o.paid_at }))),
          }
        })
        return json({ users })
      }
      if (body.action === 'admin-ban') {
        const { error } = await sb.auth.admin.updateUserById(String(body.id), { ban_duration: body.ban ? '876000h' : 'none' } as any)
        if (error) throw new Error(error.message)
        return json({ ok: true })
      }
      if (body.action === 'admin-verify') {
        const { error } = await sb.auth.admin.updateUserById(String(body.id), { email_confirm: true } as any)
        if (error) throw new Error(error.message)
        return json({ ok: true })
      }
      if (body.action === 'admin-delete') {
        const { error } = await sb.auth.admin.deleteUser(String(body.id))
        if (error) throw new Error(error.message)
        return json({ ok: true })
      }
      if (body.action === 'admin-send') {
        const subject = String(body.subject || '').trim().slice(0, 140), text = String(body.body || '').trim().slice(0, 4000)
        if (!subject || !text) throw new Error('Add a subject and a message.')
        const kind = body.kind === 'promo' ? 'promo' : 'message'
        const { error } = await sb.from('messages').insert({ user_id: body.id ? String(body.id) : null, kind, subject, body: text })
        if (error) throw new Error(error.message)
        return json({ ok: true })
      }
      if (body.action === 'admin-messages') {
        const { data } = await sb.from('messages').select('id,user_id,kind,subject,created_at').order('created_at', { ascending: false }).limit(50)
        return json({ messages: data || [] })
      }
      if (body.action === 'admin-unsend') {
        await sb.from('messages').delete().eq('id', String(body.mid))
        return json({ ok: true })
      }
      throw new Error('Unknown action.')
    }

    if (body.action === 'claim') {
      const { data: o } = await sb.from('orders').select('*').eq('token', String(body.token || '')).eq('status', 'paid').maybeSingle()
      if (!o || !o.secret_hash || !o.paid_at) throw new Error('Order not found.')
      if ((await sha(String(body.secret || ''))) !== o.secret_hash) throw new Error('Order not found.')
      if (new Date(o.paid_at).getTime() + WINDOW_MS < Date.now()) throw new Error('Too late to attach this order.')
      if (o.user_id && o.user_id !== u.id) throw new Error('Order already belongs to another account.')
      await sb.from('orders').update({ user_id: u.id }).eq('id', o.id)
      return json({ ok: true })
    }

    if (body.action === 'orders') {
      const on = await enabled()
      const { data } = await sb.from('orders').select('token,items,total,paid_at').eq('user_id', u.id).eq('status', 'paid').order('paid_at', { ascending: false }).limit(100)
      const orders = []
      for (const o of data || []) {
        const items = []
        for (let i = 0; i < o.items.length; i++) items.push({ i, title: o.items[i].title, available: on && !!(await itemPath(o.items[i])) })
        orders.push({ token: o.token, total: o.total, paid_at: o.paid_at, items })
      }
      return json({ redownload: on, orders })
    }

    if (body.action === 'download') {
      if (!(await enabled())) throw new Error('Re-downloads are switched off right now.')
      const { data: o } = await sb.from('orders').select('items').eq('token', String(body.token || '')).eq('user_id', u.id).eq('status', 'paid').maybeSingle()
      const l = o && o.items[Number(body.i)]
      if (!l) throw new Error('File not found.')
      const path = await itemPath(l)
      if (!path) throw new Error('This file has not been uploaded yet.')
      const ext = (String(path).match(/[.][A-Za-z0-9]+$/) || [''])[0]
      const name = String(l.title).replace(/[^a-zA-Z0-9 ._-]+/g, '') + ' - MZPRD' + ext
      if (String(path).indexOf('r2:') === 0)
        return json({ url: await r2Presign(String(path).slice(3), 45, { 'response-content-disposition': 'attachment; filename="' + name + '"' }) })
      const { data: s } = await sb.storage.from('private-files').createSignedUrl(path, 45, { download: name })
      if (!s) throw new Error('Could not prepare the download.')
      return json({ url: s.signedUrl })
    }
    return json({ error: 'Unknown action.' }, 400)
  } catch (e) {
    return json({ error: (e as Error).message || 'Something went wrong.' }, 400)
  }
})
