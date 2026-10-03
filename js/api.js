/* Fetch helpers + formatting shared by every page. */
async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || res.statusText || 'Request failed');
    err.code = data.error || 'error';
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
const opts = (method, body, headers = {}) => ({
  method,
  credentials: 'same-origin',
  headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
  body: body !== undefined ? JSON.stringify(body) : undefined
});

/* Static preview mode (GitHub Pages build): window.JF_STATIC holds the base path and the API is served
   from pre-rendered JSON under <base>/data/. Writes are refused with a friendly message. */
const STATIC = typeof window !== 'undefined' && typeof window.JF_STATIC === 'string' ? window.JF_STATIC : null;
const notFound = () => Object.assign(new Error('Not found'), { status: 404, code: 'not_found' });
async function staticGet(url) {
  const u = new URL(url, location.origin), p = u.pathname;
  const load = (f) => fetch(`${STATIC}/data/${f}`).then((r) => { if (!r.ok) throw notFound(); return r.json(); });
  if (p === '/june-and-fern/api/settings') return load('settings.json');
  if (p === '/june-and-fern/api/products') return load('products.json');
  const prod = '/june-and-fern/api/products/';
  if (p.startsWith(prod)) return load(`products/${p.slice(prod.length)}.json`);
  if (p === '/june-and-fern/api/orders/lookup') {
    const data = await load(`orders/${(u.searchParams.get('number') || '').trim().toUpperCase()}.json`);
    if ((data.email || '').toLowerCase() !== (u.searchParams.get('email') || '').trim().toLowerCase()) throw notFound();
    return { order: data.order };
  }
  throw notFound();
}
async function staticPost(url, body) {
  const p = new URL(url, location.origin).pathname;
  if (p === '/june-and-fern/api/cart/validate') {
    const { products } = await staticGet('/june-and-fern/api/products');
    return { items: (body.items || []).map((i) => { const pr = products.find((x) => x.id === i.id); const reason = !pr ? 'missing' : pr.status !== 'available' ? 'sold' : pr.quantity < i.qty ? 'quantity' : null; return { id: i.id, ok: !reason, reason, product: pr || null }; }) };
  }
  const msg = p === '/june-and-fern/api/checkout' ? 'This is a design preview. Checkout opens when the shop launches.' : p === '/june-and-fern/api/subscribe' ? 'Preview site: the letter opens at launch.' : 'Not available in the preview.';
  throw Object.assign(new Error(msg), { status: 503, code: 'preview' });
}

export const api = {
  get: (url) => STATIC ? staticGet(url) : fetch(url, opts('GET')).then(parse),
  post: (url, body = {}) => STATIC ? staticPost(url, body) : fetch(url, opts('POST', body)).then(parse),
  put: (url, body = {}) => fetch(url, opts('PUT', body)).then(parse),
  del: (url) => fetch(url, opts('DELETE')).then(parse),
  upload: (url, file) => fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file }).then(parse)
};

export const money = (cents, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format((cents || 0) / 100);

export const fmtDate = (ms, withTime = false) =>
  ms ? new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) }) : '';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const CATEGORY = {
  cyanotype: { label: 'Cyanotype apparel', short: 'Cyanotype', blurb: 'Secondhand garments printed by hand with sunlight and botanicals.' },
  vintage: { label: 'Vintage', short: 'Vintage', blurb: 'Well-made older pieces, washed, mended where needed, ready to wear.' },
  goods: { label: 'Small goods', short: 'Goods', blurb: 'Bandanas, totes, tea towels and paper things printed in small batches.' }
};
export const categoryLabel = (c) => (CATEGORY[c] || {}).label || c;

let settingsPromise;
export const getSettings = () => settingsPromise || (settingsPromise = api.get('/june-and-fern/api/settings').catch(() => ({})));

export const productTitle = (p) => p.size ? `${p.title} | ${p.size}` : p.title;
export const isBuyable = (p) => p && p.status === 'available' && p.quantity > 0 && !p.reserved;
export const qs = (k, d = null) => new URLSearchParams(location.search).get(k) ?? d;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
