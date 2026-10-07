// Builds the public site into /dist: the app plus real, crawlable pages for Google.
// Reads published beats and packs from Supabase (public data only) and writes:
//   /, /beats/, /sample-packs/, /about/, /beat/<slug>/, /pack/<slug>/,
//   topic pages (rap, hip hop, R&B beats, vinyl samples, producer loops) only when real items match,
//   sitemap.xml, robots.txt, 404.html
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const ORIGIN = (process.env.SITE_URL || 'https://mzprd.com').replace(/\/$/, '')
const BASE = (process.env.BASE_PATH || '/').replace(/\/?$/, '/')
const SITE = ORIGIN + (BASE === '/' ? '' : BASE.slice(0, -1))
const SB = 'https://qapmtiuptmgcajoaontj.supabase.co'
const KEY = 'sb_publishable_jyfu7YHp2wK_WEv3nWeEzg_ogP00kD3'
const PUB = SB + '/storage/v1/object/public/public-media/'

const api = async (p) => {
  const r = await fetch(SB + '/rest/v1/' + p, { headers: { apikey: KEY } })
  if (!r.ok) throw new Error('Supabase ' + p + ' -> ' + r.status)
  return r.json()
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const slugify = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const money = (n) => '$' + Number(n).toFixed(2)
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c')
const trunc = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…')

const [beats, packs, sets] = await Promise.all([
  api('beats?select=id,title,description,price,tags,slug,cover_path,preview_path,created_at&published=eq.true&order=sort_order.asc,created_at.desc'),
  api('packs?select=id,title,description,price,slug,cover_path,preview_path,created_at&published=eq.true&order=sort_order.asc,created_at.desc'),
  api('site_settings?select=*&id=eq.1'),
])
const promo = sets[0] || {}
const eff = (b) => (promo.promo_enabled ? Number(promo.promo_price) : Number(b.price))
const slug = (x) => x.slug || slugify(x.title) || x.id
const tagsOf = (b) => String(b.tags || '').split(/[\/,]/).map((t) => t.trim()).filter(Boolean)
const hay = (x) => (String(x.tags || '') + ' ' + x.title + ' ' + String(x.description || '')).toLowerCase()
const cover = (x) => (x.cover_path ? PUB + x.cover_path : SITE + '/hero.jpg')
const genreOf = (b) => tagsOf(b)[0] || 'Rap and Hip Hop'
const today = new Date().toISOString().slice(0, 10)

/* ---------- topic pages: only created when real items match ---------- */
const BEAT_CATS = [
  { path: 'rap-beats', test: /\b(rap|trap|drill)\b|boom[\s-]?bap/, name: 'Rap Beats', title: 'Rap Beats and Instrumentals for Sale | MZPRD (Meztheprod)',
    h1: 'Rap Beats and Instrumentals for Sale',
    intro: ['Looking for rap beats and instrumentals for sale? MZPRD (Meztheprod) makes original rap instrumentals with hard drums, deep bass and room for your vocals. Every beat has a full preview so you can hear exactly what you are getting.',
            'Pick a rap beat below, add it to your cart and pay securely with PayPal. You download the full file straight after payment.'] },
  { path: 'hip-hop-beats', test: /hip[\s-]?hop|boom[\s-]?bap/, name: 'Hip Hop Beats', title: 'Hip Hop Beats and Instrumentals for Sale | MZPRD',
    h1: 'Hip Hop Beats and Instrumentals for Sale',
    intro: ['These hip hop beats and instrumentals are made by MZPRD (Meztheprod) for rappers, singers and artists who want something with real weight: sampled textures, punchy drums and moody melodies.',
            'Preview any hip hop beat in your browser, then buy it instantly with PayPal.'] },
  { path: 'rnb-beats', test: /r&b|rnb|r and b|\bsoul/, name: 'R&B Beats', title: 'R&B Beats and Instrumentals for Sale | MZPRD',
    h1: 'R&B Beats and Instrumentals for Sale',
    intro: ['Smooth R&B beats and instrumentals from MZPRD (Meztheprod): warm chords, soft drums and space for melodies and harmonies.',
            'Listen to the R&B beat preview, add it to your cart and download the full file the moment you pay.'] },
]
const PACK_CATS = [
  { path: 'vinyl-samples', test: /vinyl/, name: 'Vinyl Samples', title: 'Vinyl Samples and Sample Packs for Producers | MZPRD',
    h1: 'Vinyl Samples and Sample Packs',
    intro: ['Vinyl samples give a beat its dusty, warm character. These sample packs from MZPRD (Meztheprod) are built for beat makers who want crate-dug texture, loops and one-shots ready to chop and flip.',
            'Play the preview on any pack, then buy and download it instantly.'] },
  { path: 'producer-loops', test: /loop/, name: 'Producer Loops', title: 'Producer Loops and Loop Packs | MZPRD (Meztheprod)',
    h1: 'Producer Loops and Loop Packs',
    intro: ['Producer loops save time and spark ideas. These loop packs from MZPRD (Meztheprod) give you ready-made melodies and textures to build a track around.',
            'Preview a loop pack, add it to your cart and download the files right after you pay.'] },
]
const beatCats = BEAT_CATS.map((c) => ({ ...c, items: beats.filter((b) => c.test.test(hay(b))) })).filter((c) => c.items.length)
const packCats = PACK_CATS.map((c) => ({ ...c, items: packs.filter((p) => c.test.test(hay(p))) })).filter((c) => c.items.length)

/* ---------- html builders ---------- */
const BRAND_JSON = {
  '@context': 'https://schema.org', '@type': 'Organization', '@id': SITE + '/#org', name: 'MZPRD',
  alternateName: ['Meztheprod', 'Mez The Prod'], url: SITE + '/', logo: SITE + '/hero.jpg',
  description: 'MZPRD (Meztheprod) makes beats and instrumentals for rap, hip hop and R&B, plus sample packs, vinyl samples and producer loops.',
}
const SITE_JSON = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'MZPRD', alternateName: 'Meztheprod', url: SITE + '/' }
const crumbsLd = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: SITE + '/' + c[1] })),
})
const listLd = (name, url, items) => ({
  '@context': 'https://schema.org', '@type': 'CollectionPage', name, url,
  mainEntity: { '@type': 'ItemList', itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + '/' + x.u, name: x.n })) },
})
const mime = (p) => (/\.wav$/i.test(p) ? 'audio/wav' : /\.m4a$/i.test(p) ? 'audio/mp4' : 'audio/mpeg')

function headHtml(s) {
  const url = SITE + '/' + s.path
  const lds = [BRAND_JSON, SITE_JSON, ...(s.ld || [])]
  return [
    `<base href="${BASE}">`,
    s.page && s.page.kind !== 'home' || s.noindex ? '<style>#enter{display:none!important}</style>' : '',
    `<title>${esc(s.title)}</title>`,
    `<meta name="description" content="${esc(s.desc)}">`,
    `<meta name="robots" content="${s.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">`,
    s.noindex ? '' : `<link rel="canonical" href="${url}">`,
    '<meta name="theme-color" content="#060507">',
    `<meta property="og:type" content="${s.ogType || 'website'}">`,
    '<meta property="og:site_name" content="MZPRD">',
    `<meta property="og:title" content="${esc(s.title)}">`,
    `<meta property="og:description" content="${esc(s.desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${esc(s.image || SITE + '/hero.jpg')}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(s.title)}">`,
    `<meta name="twitter:description" content="${esc(s.desc)}">`,
    `<meta name="twitter:image" content="${esc(s.image || SITE + '/hero.jpg')}">`,
    ...lds.map((o) => `<script type="application/ld+json">${json(o)}</script>`),
  ].filter(Boolean).join('\n')
}

let T = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
const aboutBox = () => `<h2>About MZPRD (Meztheprod)</h2>
<p>MZPRD, short for Meztheprod, is a music producer making original beats and instrumentals for rap, hip hop and R&amp;B, plus sample packs, vinyl samples and producer loops for other producers.</p>
<p>Every beat and sample pack has a preview you can play on the site, and you can record your own voice over a beat preview to see how it feels. When you find the one, pay securely with PayPal and download the full file straight away.</p>
<h3>What you can get</h3>
<ul><li><a href="beats/">Beats and instrumentals</a> for rap, hip hop and R&amp;B</li><li><a href="sample-packs/">Sample packs</a>, including vinyl samples and producer loops</li></ul>
${catLinks()}
<h3>How buying works</h3>
<ol><li>Play the preview of any beat or sample pack.</li><li>Add the ones you want to your cart.</li><li>Pay securely with PayPal, using your PayPal account or a card.</li><li>Download your full files right away. They stay available for 15 minutes in the same browser, so save them to your device.</li></ol>
<h3>Questions</h3>
${FAQ.map((f) => `<details><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join('')}`

function render(s) {
  let h = T
  h = h.replace(/<!--ABOUT:BOX-->[\s\S]*?<!--\/ABOUT:BOX-->/, () => aboutBox())
  h = h.replace(/<!--SEO:HEAD-->[\s\S]*?<!--\/SEO:HEAD-->/, () => headHtml(s))
  h = h.replace('<!--PAGEDATA-->', () => `<script>window.__PAGE=${json(s.page)}</script>`)
  h = h.replace('<!--SEO:CONTENT-->', () => (s.content ? `<section class="seo" id="seo"><div class="in">${s.content}</div></section>` : ''))
  h = h.replace('<h1 class="sr-only">MZPRD: beats and sample packs</h1>', () => (s.detail ? `<p class="sr-only">MZPRD (Meztheprod)</p>` : `<h1 class="sr-only">${esc(s.h1)}</h1>`))
  if (s.detail) {
    h = h.replace('<div class="view on" id="v-beats">', '<div class="view" id="v-beats">')
    h = h.replace('<div class="view" id="v-beat"><div id="bpage"></div></div>', () => `<div class="view on" id="v-beat"><div id="bpage">${s.detail}</div></div>`)
  } else if (s.page.kind === 'view' && s.page.v === 'kits') {
    h = h.replace('<div class="view on" id="v-beats">', '<div class="view" id="v-beats">').replace('<div class="view" id="v-kits">', '<div class="view on" id="v-kits">')
  }
  return h
}
function write(rel, html) {
  const f = path.join(DIST, rel, 'index.html')
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, html)
}

const li = (items, kind) => items.length
  ? `<ul>${items.map((x) => `<li><a href="${kind}/${esc(slug(x))}/">${esc(x.title)}</a>${kind === 'beat' && tagsOf(x).length ? ' (' + esc(tagsOf(x).join(', ')) + ')' : ''} - ${money(kind === 'beat' ? eff(x) : x.price)}</li>`).join('')}</ul>`
  : '<p>New releases are on the way. Check back soon.</p>'
const catLinks = () => {
  const l = [...beatCats.map((c) => `<a href="${c.path}/">${esc(c.name)}</a>`), ...packCats.map((c) => `<a href="${c.path}/">${esc(c.name)}</a>`)]
  return l.length ? `<p>Browse by topic: ${l.join(', ')}.</p>` : ''
}
const crumbsHtml = (items) => `<div class="crumbs">${items.map((c, i) => (i < items.length - 1 ? `<a href="${c[1]}">${esc(c[0])}</a>` : esc(c[0]))).join(' &rsaquo; ')}</div>`

const FAQ = [
  ['What does MZPRD mean?', 'MZPRD is short for Meztheprod, the producer name behind these beats, instrumentals and sample packs.'],
  ['Can I hear a beat before I buy it?', 'Yes. Every beat and sample pack has a preview you can play on the site, and you can even record your own voice over a beat preview to try it.'],
  ['How do I pay?', 'Checkout is secure with PayPal. You can pay with your PayPal account or a debit or credit card through PayPal.'],
  ['How do I get my files?', 'Right after you pay, the site shows download buttons for your full files. They stay available for 15 minutes in the same browser, so save them to your device straight away.'],
  ['What kind of beats and samples do you make?', 'Rap, hip hop and R&B beats and instrumentals, plus sample packs, vinyl samples and producer loops for other producers.'],
]
const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f[0], acceptedAnswer: { '@type': 'Answer', text: f[1] } })) }

fs.mkdirSync(DIST, { recursive: true })
for (const e of fs.readdirSync(DIST)) fs.rmSync(path.join(DIST, e), { recursive: true, force: true })
for (const f of ['hero.jpg', 'girl.png', 'chain.png', 'studio.js', 'slots.js', 'show-stage.webp', 'show-atlas.webp', 'show-lights.webp', 'show-atlas.json', 'packbuilder.js', 'show.js', 'showpage.js', 'showmaker.js', 'email.js', 'mix.js', 'thumbs.js', 'mp4-muxer.js', 'CNAME']) {
  if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(DIST, f))
}
if (fs.existsSync(path.join(ROOT, 'sfx'))) fs.cpSync(path.join(ROOT, 'sfx'), path.join(DIST, 'sfx'), { recursive: true })
const urls = []
const addUrl = (rel, lastmod) => urls.push({ loc: SITE + '/' + rel, lastmod: lastmod || today })

/* ----- home ----- */
{
  const content = ''
  write('', render({
    path: '', title: 'MZPRD (Meztheprod) | Rap, Hip Hop & R&B Beats + Sample Packs',
    desc: 'MZPRD (Meztheprod) makes rap, hip hop and R&B beats and instrumentals, plus sample packs, vinyl samples and producer loops. Preview, pay with PayPal, download instantly.',
    h1: 'MZPRD (Meztheprod): rap, hip hop and R&B beats, instrumentals and sample packs', page: { kind: 'home' }, content, ld: [faqLd],
  }))
  addUrl('')
}

/* ----- all beats / all packs ----- */
function indexPage(rel, o) {
  const content = `${crumbsHtml([['Home', ''], [o.crumb, rel]])}<h2>${esc(o.h1)}</h2>${o.intro.map((p) => `<p>${p}</p>`).join('')}${li(o.items, o.kind)}${catLinks()}`
  write(rel, render({
    path: rel + '/', title: o.title, desc: o.desc, h1: o.h1, content,
    page: { kind: 'view', v: o.view, title: o.title },
    ld: [crumbsLd([['Home', ''], [o.crumb, rel + '/']]), listLd(o.h1, SITE + '/' + rel + '/', o.items.map((x) => ({ u: o.kind + '/' + slug(x) + '/', n: x.title })))],
  }))
  addUrl(rel + '/')
}
indexPage('beats', {
  kind: 'beat', view: 'beats', items: beats, crumb: 'Beats', title: 'Rap, Hip Hop & R&B Beats and Instrumentals for Sale | MZPRD',
  desc: 'Buy rap, hip hop and R&B beats and instrumentals from MZPRD (Meztheprod). Preview every beat, pay with PayPal and download instantly.',
  h1: 'Beats and Instrumentals for Sale by MZPRD (Meztheprod)',
  intro: ['Original beats and instrumentals for rap, hip hop and R&amp;B artists. Play any preview, add your favorites to the cart and download the full files straight after you pay.'],
})
indexPage('sample-packs', {
  kind: 'pack', view: 'kits', items: packs, crumb: 'Sample Packs', title: 'Sample Packs, Vinyl Samples & Producer Loops | MZPRD',
  desc: 'Sample packs, vinyl samples and producer loops from MZPRD (Meztheprod). Preview every pack, pay with PayPal and download instantly.',
  h1: 'Sample Packs, Vinyl Samples and Producer Loops',
  intro: ['Sample packs for producers: vinyl samples, producer loops and sounds ready for your next beat. Play the preview on any pack, then buy and download it right away.'],
})

/* ----- topic pages ----- */
for (const c of [...beatCats, ...packCats]) {
  const kind = beatCats.includes(c) ? 'beat' : 'pack'
  const content = `${crumbsHtml([['Home', ''], [c.name, c.path]])}<h2>${esc(c.h1)}</h2>${c.intro.map((p) => `<p>${esc(p)}</p>`).join('')}${li(c.items, kind)}<p><a href="${kind === 'beat' ? 'beats' : 'sample-packs'}/">See everything</a>.</p>`
  write(c.path, render({
    path: c.path + '/', title: c.title, h1: c.h1,
    desc: trunc(`${c.h1} by MZPRD (Meztheprod). Preview every ${kind === 'beat' ? 'beat' : 'pack'}, pay with PayPal and download instantly.`, 158),
    page: { kind: 'view', v: kind === 'beat' ? 'beats' : 'kits', title: c.title }, content,
    ld: [crumbsLd([['Home', ''], [c.name, c.path + '/']]), listLd(c.h1, SITE + '/' + c.path + '/', c.items.map((x) => ({ u: kind + '/' + slug(x) + '/', n: x.title })))],
  }))
  addUrl(c.path + '/')
}

/* ----- about ----- */
{
  const content = ''
  write('about', render({
    path: 'about/', title: 'About MZPRD (Meztheprod) | Beat Producer',
    desc: 'Meet MZPRD, short for Meztheprod: a producer making rap, hip hop and R&B beats and instrumentals, plus sample packs, vinyl samples and producer loops.',
    h1: 'About MZPRD (Meztheprod)', page: { kind: 'view', v: 'about', title: 'About MZPRD (Meztheprod) | Beat Producer' }, content,
    ld: [crumbsLd([['Home', ''], ['About', 'about/']])],
  }))
  addUrl('about/')
}

/* ----- back office pages (not indexed) ----- */
for (const t of ['', 'beats', 'packs', 'bundles', 'promo', 'sales', 'video', 'email', 'show']) {
  const rel = t ? 'admin/' + t : 'admin'
  write(rel, render({
    path: rel + '/', title: 'Back office | MZPRD', desc: 'Back office.', h1: 'Back office', noindex: true,
    page: { kind: 'admin', tab: t || 'beats' }, content: '',
  }))
}

/* ----- weekly show ----- */
{
  const content = '<p>A new 5 minute pixel show every week: the MZPRD producer performs the newest beats live on a pixel stage while the crowd sends hearts. Watch live, or replay past shows.</p>'
  write('show', render({
    path: 'show/', title: 'Weekly Pixel Show | MZPRD (Meztheprod)',
    desc: 'A new 5 minute pixel-art beat show every week from MZPRD (Meztheprod). Watch live, send hearts, or replay past shows.',
    h1: 'MZPRD Weekly Pixel Show', page: { kind: 'view', v: 'show', title: 'Weekly Pixel Show | MZPRD (Meztheprod)' }, content,
    ld: [crumbsLd([['Home', ''], ['Show', 'show/']])],
  }))
  addUrl('show/')
}

/* ----- one page per beat ----- */
for (const b of beats) {
  const rel = 'beat/' + slug(b), g = genreOf(b), price = eff(b)
  const title = trunc(`${b.title} | ${g} Beat Instrumental | MZPRD`, 62)
  const base = String(b.description || '').trim()
  const desc = trunc(`${b.title}: ${g} beat and instrumental by MZPRD (Meztheprod). ${base ? base + ' ' : ''}Preview it free, ${money(price)} to buy, instant download.`, 158)
  const tg = tagsOf(b)
  const detail = `<div class="bp"><div class="cov"><img src="${esc(cover(b))}" alt="${esc(b.title)} cover art" width="360" height="360"></div><div><h1>${esc(b.title)}</h1><div class="tgs">${tg.map((t) => `<span>${esc(t)}</span>`).join('')}</div><div class="prc">${money(price)}</div>${base ? `<div class="d">${esc(base)}</div>` : ''}</div></div>`
  const related = beats.filter((x) => x !== b).slice(0, 6)
  const content = `${crumbsHtml([['Home', ''], ['Beats', 'beats/'], [b.title, rel + '/']])}
<h2>About this ${esc(g)} beat</h2>
<p>${esc(b.title)} is a ${esc(g.toLowerCase())} instrumental by MZPRD (Meztheprod). ${esc(base)}</p>
<p>Play the preview above, then pay securely with PayPal for ${money(price)} and download the full file right away. It is available to download for 15 minutes after payment in the same browser.</p>
${related.length ? `<h3>More beats</h3>${li(related, 'beat')}` : ''}${catLinks()}<p><a href="beats/">All beats and instrumentals</a></p>`
  const ld = [
    crumbsLd([['Home', ''], ['Beats', 'beats/'], [b.title, rel + '/']]),
    {
      '@context': 'https://schema.org', '@type': 'Product', name: `${b.title} (beat / instrumental)`, description: desc, image: [cover(b)], sku: b.id,
      brand: { '@type': 'Brand', name: 'MZPRD' }, category: 'Instrumentals',
      offers: { '@type': 'Offer', url: SITE + '/' + rel + '/', price: price.toFixed(2), priceCurrency: 'USD', availability: 'https://schema.org/InStock', seller: { '@id': SITE + '/#org' } },
    },
  ]
  if (b.preview_path) ld.push({ '@context': 'https://schema.org', '@type': 'AudioObject', name: `${b.title} preview`, contentUrl: PUB + b.preview_path, encodingFormat: mime(b.preview_path), description: `Preview of ${b.title} by MZPRD (Meztheprod).` })
  write(rel, render({ path: rel + '/', title, desc, h1: b.title, image: cover(b), ogType: 'product', page: { kind: 'beat', slug: slug(b) }, detail, content, ld }))
  addUrl(rel + '/', String(b.created_at || '').slice(0, 10))
}

/* ----- one page per sample pack ----- */
for (const p of packs) {
  const rel = 'pack/' + slug(p)
  const title = trunc(`${p.title} | Sample Pack | MZPRD`, 62)
  const base = String(p.description || '').trim()
  const kindWords = /vinyl/.test(hay(p)) ? 'vinyl samples' : /loop/.test(hay(p)) ? 'producer loops' : 'sounds for producers'
  const desc = trunc(`${p.title}: sample pack by MZPRD (Meztheprod) with ${kindWords}. ${base ? base + ' ' : ''}Preview it free, ${money(p.price)} to buy, instant download.`, 158)
  const detail = `<div class="bp"><div class="cov"><img src="${esc(cover(p))}" alt="${esc(p.title)} sample pack cover art" width="360" height="360"></div><div><h1>${esc(p.title)}</h1><div class="tgs"><span>SAMPLE PACK</span></div><div class="prc">${money(p.price)}</div>${base ? `<div class="d">${esc(base)}</div>` : ''}</div></div>`
  const related = packs.filter((x) => x !== p).slice(0, 6)
  const content = `${crumbsHtml([['Home', ''], ['Sample Packs', 'sample-packs/'], [p.title, rel + '/']])}
<h2>About this sample pack</h2>
<p>${esc(p.title)} is a sample pack by MZPRD (Meztheprod) with ${esc(kindWords)} for beat makers. ${esc(base)}</p>
<p>Play the preview above, then pay securely with PayPal for ${money(p.price)} and download the full pack right away. It is available to download for 15 minutes after payment in the same browser.</p>
${related.length ? `<h3>More sample packs</h3>${li(related, 'pack')}` : ''}${catLinks()}<p><a href="sample-packs/">All sample packs</a></p>`
  const ld = [
    crumbsLd([['Home', ''], ['Sample Packs', 'sample-packs/'], [p.title, rel + '/']]),
    {
      '@context': 'https://schema.org', '@type': 'Product', name: `${p.title} (sample pack)`, description: desc, image: [cover(p)], sku: p.id,
      brand: { '@type': 'Brand', name: 'MZPRD' }, category: 'Sample Packs',
      offers: { '@type': 'Offer', url: SITE + '/' + rel + '/', price: Number(p.price).toFixed(2), priceCurrency: 'USD', availability: 'https://schema.org/InStock', seller: { '@id': SITE + '/#org' } },
    },
  ]
  if (p.preview_path) ld.push({ '@context': 'https://schema.org', '@type': 'AudioObject', name: `${p.title} preview`, contentUrl: PUB + p.preview_path, encodingFormat: mime(p.preview_path), description: `Preview of ${p.title} by MZPRD (Meztheprod).` })
  write(rel, render({ path: rel + '/', title, desc, h1: p.title, image: cover(p), ogType: 'product', page: { kind: 'pack', slug: slug(p) }, detail, content, ld }))
  addUrl(rel + '/', String(p.created_at || '').slice(0, 10))
}

/* ----- 404, sitemap, robots ----- */
{
  const content = '<h2>That page is not here</h2><p>The beat or page you were looking for does not exist anymore. <a href="">Go to the MZPRD home page</a> or <a href="beats/">browse all beats</a>.</p>'
  fs.writeFileSync(path.join(DIST, '404.html'), render({ path: '404.html', title: 'Page not found | MZPRD', desc: 'Page not found.', h1: 'Page not found', noindex: true, page: { kind: 'home' }, content }))
}
fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n') + '\n</urlset>\n')
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${SITE}/sitemap.xml\n`)

console.log(`Built ${urls.length} pages: ${beats.length} beats, ${packs.length} packs, ${beatCats.length + packCats.length} topic pages -> ${DIST}`)
