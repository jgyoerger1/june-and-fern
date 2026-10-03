/* June & Fern Studio: listings, orders, settings, subscribers. Password cookie auth via /api/admin. */
import { api, money, esc, fmtDate, categoryLabel } from './api.js';
import { icon } from './icons.js';
import { brandMark } from './site.js';
import { scene } from './botanicals.js';

const app = document.getElementById('app');
const S = { view: 'listings', products: [], orders: [], stats: null, settings: {}, subs: [], filter: 'all', ofilter: 'open', q: '' };
const CATS = ['cyanotype', 'vintage', 'goods'];
const CARRIERS = ['USPS', 'UPS', 'FedEx', 'Other'];

/* ---------- utilities ---------- */
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
let toastT;
function toast(msg, err = false) {
  let t = document.querySelector('.s-toast');
  if (!t) { t = h('<div class="s-toast" role="status"></div>'); document.body.append(t); }
  t.textContent = msg; t.style.background = err ? 'var(--danger)' : ''; t.classList.add('is-on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 2600);
}
const cents = (v) => Math.round(parseFloat(String(v).replace(/[^0-9.]/g, '')) * 100) || 0;
const dollars = (c) => (c / 100).toFixed(2);

/* ---------- login ---------- */
function renderLogin(msg = '') {
  const art = scene({ seed: 19, width: 800, height: 1000, texture: true, plants: [{ type: 'fern', x: 360, y: 930, scale: 2.2, rot: -6 }, { type: 'umbel', x: 580, y: 950, scale: 1.7, rot: 8 }], border: 0 });
  app.innerHTML = `<div class="s-login">
    <form class="s-login-form" data-login>
      <img class="lockup" src="/june-and-fern/img/brand/lockup-light.png" alt="June &amp; Fern" width="740" height="450">
      <div><h1>Studio</h1><p class="muted" style="margin:.3rem 0 0">Listings, orders and the small print.</p></div>
      <div class="field ${msg ? 'is-invalid' : ''}"><label for="pw">Password</label><input id="pw" class="input" type="password" autocomplete="current-password" autofocus required><div class="err">${esc(msg)}</div></div>
      <button class="s-btn" type="submit" style="justify-self:start">Open the studio ${icon('arrow')}</button>
      <p class="muted" style="font-size:.75rem;margin:0">Forgot it? It is the ADMIN_PASSWORD secret on the Cloudflare project. Change it there and sign in again.</p>
    </form>
    <div class="s-login-art" aria-hidden="true">${art}</div>
  </div>`;
  app.querySelector('[data-login]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = app.querySelector('#pw').value;
    const btn = app.querySelector('button[type=submit]'); btn.disabled = true;
    try { await api.post('/june-and-fern/api/admin/login', { password: pw }); boot(); }
    catch (ex) { renderLogin(ex.status === 401 ? 'That is not the password.' : ex.status === 503 ? 'The studio is not set up yet: set ADMIN_PASSWORD.' : ex.message); }
  });
}

/* ---------- shell ---------- */
function shell(content) {
  const open = S.orders.filter((o) => ['paid', 'packed'].includes(o.status)).length;
  app.innerHTML = `<div class="s-app">
    <aside class="s-rail">
      <div><a class="brand" href="/june-and-fern/" title="View the shop"><img class="brand-img" src="/june-and-fern/img/brand/wordmark.png" alt="June &amp; Fern" width="720" height="112"></a><span class="tag">Studio</span></div>
      <nav class="s-nav">
        <a href="#listings" data-view="listings" ${S.view === 'listings' ? 'aria-current="page"' : ''}>${icon('image')} Listings</a>
        <a href="#orders" data-view="orders" ${S.view === 'orders' ? 'aria-current="page"' : ''}>${icon('box')} Orders ${open ? `<span class="n">${open}</span>` : ''}</a>
        <a href="#settings" data-view="settings" ${S.view === 'settings' ? 'aria-current="page"' : ''}>${icon('sun')} Settings</a>
        <a href="#subscribers" data-view="subscribers" ${S.view === 'subscribers' ? 'aria-current="page"' : ''}>${icon('mail')} Subscribers</a>
      </nav>
      <div class="s-rail-foot"><a href="/june-and-fern/" target="_blank" rel="noopener">View the shop ${icon('external')}</a><button class="linkish" data-logout style="color:var(--muted)">Sign out</button></div>
    </aside>
    <main class="s-main">${content}</main>
  </div>`;
  app.querySelectorAll('[data-view]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); S.view = a.dataset.view; location.hash = S.view; render(); }));
  app.querySelector('[data-logout]').addEventListener('click', async () => { await api.post('/june-and-fern/api/admin/logout'); renderLogin(); });
}

function render() {
  if (S.view === 'orders') return renderOrders();
  if (S.view === 'settings') return renderSettings();
  if (S.view === 'subscribers') return renderSubscribers();
  return renderListings();
}

/* ---------- listings ---------- */
function renderListings() {
  const st = S.stats || {};
  const list = S.products.filter((p) => (S.filter === 'all' ? p.status !== 'archived' : p.status === S.filter)).filter((p) => !S.q || `${p.title} ${p.size || ''} ${p.category}`.toLowerCase().includes(S.q));
  shell(`
    <div class="s-top"><div><h1>Listings</h1><div class="sub">${S.products.length} pieces on file</div></div><button class="s-btn" data-new>${icon('plus')} New listing</button></div>
    <div class="s-stats">
      <div class="s-stat"><div class="v">${st.available ?? '–'}</div><div class="l">Available</div></div>
      <div class="s-stat"><div class="v">${st.sold ?? '–'}</div><div class="l">Sold</div></div>
      <div class="s-stat"><div class="v">${st.drafts ?? '–'}</div><div class="l">Drafts</div></div>
      <div class="s-stat"><div class="v">${st.orders_open ?? '–'}</div><div class="l">Orders to pack</div></div>
      <div class="s-stat"><div class="v">${money(st.revenue_cents_30d || 0)}</div><div class="l">Last 30 days</div></div>
      <div class="s-stat"><div class="v">${money(st.revenue_cents_all || 0)}</div><div class="l">All time</div></div>
    </div>
    <div class="s-tools">
      ${['all', 'available', 'sold', 'draft', 'archived'].map((f) => `<button class="chip" data-filter="${f}" aria-pressed="${S.filter === f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}
      <span class="spacer"></span>
      <input class="input" data-q placeholder="Search listings" value="${esc(S.q)}">
    </div>
    <div class="s-list">
      <div class="s-row products head"><span></span><span>Piece</span><span>Category</span><span>Price</span><span>Status</span><span>Qty</span><span></span></div>
      ${list.length ? list.map(rowHTML).join('') : `<div class="s-empty"><strong>${S.q ? 'Nothing matches that search.' : 'Nothing here yet.'}</strong><span>${S.filter === 'draft' ? 'Drafts are listings only you can see.' : 'Use New listing to add a piece: photos, size, price, a few words.'}</span></div>`}
    </div>`);
  app.querySelector('[data-new]').addEventListener('click', () => openEditor(null));
  app.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { S.filter = b.dataset.filter; renderListings(); }));
  const q = app.querySelector('[data-q]');
  q.addEventListener('input', () => { S.q = q.value.trim().toLowerCase(); renderListings(); app.querySelector('[data-q]').focus(); const el = app.querySelector('[data-q]'); el.setSelectionRange(el.value.length, el.value.length); });
  app.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEditor(S.products.find((p) => p.id === b.dataset.edit))));
  app.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', () => setStatus(b.dataset.id, b.dataset.status)));
}

function rowHTML(p) {
  const img = p.images && p.images[0];
  const quick = p.status === 'available' ? `<button class="s-btn ghost sm" data-status="sold" data-id="${p.id}">Mark sold</button>` : p.status === 'sold' ? `<button class="s-btn ghost sm" data-status="available" data-id="${p.id}">Relist</button>` : p.status === 'draft' ? `<button class="s-btn ghost sm" data-status="available" data-id="${p.id}">Publish</button>` : `<button class="s-btn ghost sm" data-status="draft" data-id="${p.id}">Restore</button>`;
  return `<div class="s-row products ${p.status === 'sold' ? 'is-sold' : ''}">
    ${img ? `<img class="thumb" src="${esc(img.url)}" alt="">` : '<div class="thumb"></div>'}
    <div class="t">${esc(p.title)}${p.size ? ` <span class="muted" style="font-weight:400">| ${esc(p.size)}</span>` : ''}<small>${p.one_of_one ? 'One of one' : `${p.quantity} in stock`}${p.featured ? ' · Featured' : ''} · updated ${fmtDate(p.updated_at || p.created_at)}</small></div>
    <span>${esc(categoryLabel(p.category))}</span>
    <span class="num">${money(p.price_cents)}${p.compare_at_cents ? ` <s class="muted">${money(p.compare_at_cents)}</s>` : ''}</span>
    <span><span class="status ${p.status}">${p.status}</span>${p.reserved ? ' <span class="status pending">held</span>' : ''}</span>
    <span class="num">${p.quantity}</span>
    <div class="acts">${quick}<button class="s-btn ghost sm" data-edit="${p.id}">${icon('edit')} Edit</button></div>
  </div>`;
}

async function setStatus(id, status) {
  try {
    const { product } = await api.post(`/june-and-fern/api/admin/products/${id}/status`, { status });
    S.products = S.products.map((p) => (p.id === id ? product : p));
    toast(status === 'sold' ? 'Marked sold. It stays on the wall.' : status === 'available' ? 'Back in the shop.' : `Status: ${status}`);
    await loadStats(); renderListings();
  } catch (ex) { toast(ex.message, true); }
}

/* ---------- editor ---------- */
let panelEls = null;
function panel(title, body, foot) {
  closePanel();
  const scrim = h('<div class="s-scrim"></div>'), pan = h(`<aside class="s-panel" role="dialog" aria-modal="true"><div class="s-panel-head"><h2>${title}</h2><button class="close" data-close aria-label="Close">${icon('close')}</button></div><div class="s-panel-body">${body}</div><div class="s-panel-foot">${foot}</div></aside>`);
  document.body.append(scrim, pan);
  requestAnimationFrame(() => { scrim.classList.add('is-open'); pan.classList.add('is-open'); });
  scrim.addEventListener('click', closePanel);
  pan.querySelector('[data-close]').addEventListener('click', closePanel);
  panelEls = { scrim, pan };
  return pan;
}
function closePanel() {
  if (!panelEls) return;
  const { scrim, pan } = panelEls; panelEls = null;
  scrim.classList.remove('is-open'); pan.classList.remove('is-open');
  setTimeout(() => { scrim.remove(); pan.remove(); }, 450);
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

function openEditor(p) {
  const d = (p && p.details) || {};
  const draft = { id: p ? p.id : null, images: p ? p.images.map((i) => ({ ...i })) : [], measurements: Object.entries(d.measurements || {}) };
  const isNew = !p;
  const body = `
    <div class="f-section" style="border-top:0;padding-top:0">
      <h3>Photos <small>First photo is the cover. Drag files in or click to choose.</small></h3>
      <div class="photos" data-photos></div>
    </div>
    <div class="f-grid">
      <div class="field span"><label for="e-title">Title</label><input id="e-title" class="input" value="${esc(p ? p.title : '')}" placeholder="Fern Field Tee"><div class="help">Keep the size out of the title, it has its own field.</div><div class="err">A title is required.</div></div>
      <div class="field"><label for="e-size">Size</label><input id="e-size" class="input" value="${esc(p ? p.size || '' : '')}" placeholder='M, or 27" for waists'></div>
      <div class="field"><label for="e-cat">Category</label><select id="e-cat" class="input">${CATS.map((c) => `<option value="${c}" ${p && p.category === c ? 'selected' : ''}>${categoryLabel(c)}</option>`).join('')}</select></div>
      <div class="field"><label for="e-price">Price (USD)</label><input id="e-price" class="input" inputmode="decimal" value="${p ? dollars(p.price_cents) : ''}" placeholder="68.00"><div class="err">Enter a price.</div></div>
      <div class="field"><label for="e-compare">Was (optional)</label><input id="e-compare" class="input" inputmode="decimal" value="${p && p.compare_at_cents ? dollars(p.compare_at_cents) : ''}" placeholder="Original price if on sale"></div>
      <div class="field"><label>Stock</label><div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap"><label class="toggle"><input type="checkbox" id="e-one" ${!p || p.one_of_one ? 'checked' : ''}><span class="sw"></span>One of one</label><input id="e-qty" class="input" type="number" min="0" step="1" value="${p ? p.quantity : 1}" style="width:110px" ${!p || p.one_of_one ? 'disabled' : ''}></div></div>
      <div class="field"><label for="e-status">Status</label><select id="e-status" class="input">${['draft', 'available', 'sold', 'archived'].map((s) => `<option value="${s}" ${(p ? p.status : 'draft') === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select><div class="help">Draft = only you can see it.</div></div>
      <div class="field span"><label class="toggle"><input type="checkbox" id="e-featured" ${p && p.featured ? 'checked' : ''}><span class="sw"></span>Feature on the home page</label></div>
      <div class="field span"><label for="e-desc">Description</label><textarea id="e-desc" class="input" placeholder="Where it came from, what is printed on it, how it feels. Blank line between paragraphs.">${esc(p ? p.description || '' : '')}</textarea></div>
    </div>
    <div class="f-section">
      <h3>Details <small>All optional. Shown as the accordion on the listing.</small></h3>
      <div class="f-grid">
        <div class="field span"><label for="e-bot">Botanicals</label><input id="e-bot" class="input" value="${esc((d.botanicals || []).join(', '))}" placeholder="Lady fern, Queen Anne's lace"><div class="help">Comma separated.</div></div>
        <div class="field"><label for="e-fabric">Fabric</label><input id="e-fabric" class="input" value="${esc(d.fabric || '')}" placeholder="100% cotton, secondhand"></div>
        <div class="field"><label for="e-fit">Fit note</label><input id="e-fit" class="input" value="${esc(d.fit || '')}" placeholder="Relaxed, true to size"></div>
        <div class="field span"><label for="e-care">Care</label><input id="e-care" class="input" value="${esc(d.care || 'Cold wash inside out, line dry in shade. The blue deepens with the first few washes.')}"></div>
        <div class="field"><label for="e-era">Era (vintage)</label><input id="e-era" class="input" value="${esc(d.era || '')}" placeholder="1970s"></div>
        <div class="field"><label for="e-cond">Condition (vintage)</label><input id="e-cond" class="input" value="${esc(d.condition || '')}" placeholder="Soft, light fade at the pockets"></div>
        <div class="field span"><label for="e-origin">Origin line</label><input id="e-origin" class="input" value="${esc(d.origin || 'Printed by hand in Northeast Ohio')}"></div>
      </div>
      <div><h3 style="margin-bottom:.6rem">Measurements <small>Flat, in inches</small></h3><div data-measure style="display:grid;gap:.5rem"></div><button type="button" class="linkish" data-add-measure style="margin-top:.6rem">${icon('plus')} Add a measurement</button></div>
    </div>`;
  const foot = `${isNew ? '' : `<button class="s-btn danger sm" data-delete>${icon('trash')} Delete</button>`}<span class="spacer"></span><span class="msg" data-msg></span><button class="s-btn ghost" data-close2>Cancel</button><button class="s-btn" data-save>${isNew ? 'Create listing' : 'Save changes'}</button>`;
  const pan = panel(isNew ? 'New listing' : 'Edit listing', body, foot);
  const $ = (sel) => pan.querySelector(sel);
  pan.querySelector('[data-close2]').addEventListener('click', closePanel);
  $('#e-one').addEventListener('change', (e) => { $('#e-qty').disabled = e.target.checked; if (e.target.checked) $('#e-qty').value = 1; });

  // photos
  const photosEl = $('[data-photos]');
  const renderPhotos = () => {
    photosEl.innerHTML = draft.images.map((im, i) => `<div class="photo ${im.uploading ? 'is-uploading' : ''}"><img src="${esc(im.preview || im.url)}" alt="">${i === 0 ? '<span class="cover">Cover</span>' : ''}<div class="ph-acts"><button type="button" data-mv="${i}" data-dir="-1" aria-label="Move earlier">${icon('arrow').replace('<svg', '<svg style="transform:rotate(180deg)"')}</button><button type="button" data-rm="${i}" aria-label="Remove">${icon('trash')}</button><button type="button" data-mv="${i}" data-dir="1" aria-label="Move later">${icon('arrow')}</button></div></div>`).join('')
      + `<label class="dropzone" data-drop>${icon('image')}<span>Add photos<br><small>JPG, PNG, WebP up to 10 MB</small></span><input type="file" accept="image/*" multiple></label>`;
    photosEl.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { draft.images.splice(+b.dataset.rm, 1); renderPhotos(); }));
    photosEl.querySelectorAll('[data-mv]').forEach((b) => b.addEventListener('click', () => { const i = +b.dataset.mv, j = i + (+b.dataset.dir); if (j < 0 || j >= draft.images.length) return; [draft.images[i], draft.images[j]] = [draft.images[j], draft.images[i]]; renderPhotos(); }));
    const dz = photosEl.querySelector('[data-drop]'), inp = dz.querySelector('input');
    inp.addEventListener('change', () => upload(Array.from(inp.files)));
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('is-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('is-over'));
    dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('is-over'); upload(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))); });
  };
  const upload = async (files) => {
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) { toast(`${f.name} is over 10 MB`, true); continue; }
      const entry = { url: '', key: '', alt: '', preview: URL.createObjectURL(f), uploading: true };
      draft.images.push(entry); renderPhotos();
      try {
        const dims = await imageDims(f);
        const res = await api.upload(`/june-and-fern/api/admin/upload?product_id=${encodeURIComponent(draft.id || 'new')}&filename=${encodeURIComponent(f.name)}`, f);
        Object.assign(entry, { url: res.url, key: res.key, width: dims.w, height: dims.h, uploading: false });
      } catch (ex) { toast(`Upload failed: ${ex.message}`, true); draft.images = draft.images.filter((x) => x !== entry); }
      renderPhotos();
    }
  };
  renderPhotos();

  // measurements
  const mEl = $('[data-measure]');
  const renderM = () => {
    mEl.innerHTML = draft.measurements.map(([k, v], i) => `<div class="kv"><input class="input" data-mk="${i}" value="${esc(k)}" placeholder="Chest"><input class="input" data-mv2="${i}" value="${esc(v)}" placeholder="40 in"><button type="button" data-mdel="${i}" aria-label="Remove">${icon('trash')}</button></div>`).join('') || '<div class="muted" style="font-size:.8125rem">None yet. Chest / Length / Sleeve for tops, Waist / Rise / Inseam for bottoms.</div>';
    mEl.querySelectorAll('[data-mk]').forEach((i) => i.addEventListener('input', () => { draft.measurements[+i.dataset.mk][0] = i.value; }));
    mEl.querySelectorAll('[data-mv2]').forEach((i) => i.addEventListener('input', () => { draft.measurements[+i.dataset.mv2][1] = i.value; }));
    mEl.querySelectorAll('[data-mdel]').forEach((b) => b.addEventListener('click', () => { draft.measurements.splice(+b.dataset.mdel, 1); renderM(); }));
  };
  $('[data-add-measure]').addEventListener('click', () => { draft.measurements.push(['', '']); renderM(); mEl.querySelector(`[data-mk="${draft.measurements.length - 1}"]`).focus(); });
  renderM();

  // save / delete
  $('[data-save]').addEventListener('click', async () => {
    const msg = $('[data-msg]'); msg.className = 'msg'; msg.textContent = '';
    const title = $('#e-title').value.trim(), price = cents($('#e-price').value);
    $('#e-title').closest('.field').classList.toggle('is-invalid', !title);
    $('#e-price').closest('.field').classList.toggle('is-invalid', !$('#e-price').value.trim());
    if (!title || !$('#e-price').value.trim()) return;
    if (draft.images.some((i) => i.uploading)) { msg.textContent = 'Wait for the photos to finish uploading.'; msg.classList.add('err'); return; }
    const one = $('#e-one').checked;
    const measurements = Object.fromEntries(draft.measurements.filter(([k, v]) => k.trim() && v.trim()).map(([k, v]) => [k.trim(), v.trim()]));
    const payload = {
      title, size: $('#e-size').value.trim() || null, category: $('#e-cat').value, price_cents: price,
      compare_at_cents: $('#e-compare').value.trim() ? cents($('#e-compare').value) : null,
      description: $('#e-desc').value.trim(), one_of_one: one ? 1 : 0, quantity: one ? 1 : Math.max(0, parseInt($('#e-qty').value, 10) || 0),
      status: $('#e-status').value, featured: $('#e-featured').checked ? 1 : 0,
      details: { botanicals: $('#e-bot').value.split(',').map((s) => s.trim()).filter(Boolean), fabric: $('#e-fabric').value.trim(), fit: $('#e-fit').value.trim(), care: $('#e-care').value.trim(), era: $('#e-era').value.trim(), condition: $('#e-cond').value.trim(), origin: $('#e-origin').value.trim(), measurements },
      images: draft.images.map(({ url, key, alt, width, height }) => ({ url, key, alt: alt || title, width, height }))
    };
    if (payload.status === 'sold') payload.quantity = 0;
    const btn = $('[data-save]'); btn.disabled = true;
    try {
      const { product } = isNew ? await api.post('/june-and-fern/api/admin/products', payload) : await api.put(`/june-and-fern/api/admin/products/${draft.id}`, payload);
      S.products = isNew ? [product, ...S.products] : S.products.map((p) => (p.id === product.id ? product : p));
      toast(isNew ? 'Listing created.' : 'Saved.');
      closePanel(); await loadStats(); renderListings();
    } catch (ex) { msg.textContent = ex.message; msg.classList.add('err'); btn.disabled = false; }
  });
  const del = $('[data-delete]');
  if (del) del.addEventListener('click', async () => {
    if (!confirm(`Delete "${p.title}" for good? Mark it sold instead if it found a home.`)) return;
    try { await api.del(`/june-and-fern/api/admin/products/${draft.id}`); S.products = S.products.filter((x) => x.id !== draft.id); toast('Deleted.'); closePanel(); await loadStats(); renderListings(); }
    catch (ex) { toast(ex.message, true); }
  });
}
function imageDims(file) { return new Promise((res) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res({ w: null, h: null }); im.src = URL.createObjectURL(file); }); }

/* ---------- orders ---------- */
function renderOrders() {
  const list = S.orders.filter((o) => S.ofilter === 'all' ? true : S.ofilter === 'open' ? ['paid', 'packed'].includes(o.status) : o.status === S.ofilter);
  shell(`
    <div class="s-top"><div><h1>Orders</h1><div class="sub">${S.orders.filter((o) => ['paid', 'packed'].includes(o.status)).length} waiting to ship</div></div></div>
    <div class="s-tools">${['open', 'all', 'shipped', 'delivered', 'cancelled'].map((f) => `<button class="chip" data-of="${f}" aria-pressed="${S.ofilter === f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}</div>
    <div class="s-list">
      <div class="s-row orders head"><span>Order</span><span>Placed</span><span>Customer</span><span>Pieces</span><span>Total</span><span>Status</span><span></span></div>
      ${list.length ? list.map((o) => `<div class="s-row orders" data-open="${esc(o.id || o.number)}"><span class="t">${esc(o.number || o.id)}</span><span>${fmtDate(o.created_at)}</span><span>${esc(o.customer_name || '')}<br><small class="muted">${esc(o.email || '')}</small></span><span>${(o.items || []).length} ${(o.items || []).length === 1 ? 'piece' : 'pieces'}</span><span class="num">${money(o.total_cents)}</span><span><span class="status ${o.status}">${o.status}</span></span><span class="acts">${icon('arrow')}</span></div>`).join('') : `<div class="s-empty"><strong>No orders here.</strong><span>${S.ofilter === 'open' ? 'Everything is packed and on its way.' : 'Nothing with that status yet.'}</span></div>`}
    </div>`);
  app.querySelectorAll('[data-of]').forEach((b) => b.addEventListener('click', () => { S.ofilter = b.dataset.of; renderOrders(); }));
  app.querySelectorAll('[data-open]').forEach((r) => r.addEventListener('click', () => openOrder(r.dataset.open)));
}

async function openOrder(number) {
  let o;
  try { ({ order: o } = await api.get(`/june-and-fern/api/admin/orders/${encodeURIComponent(number)}`)); } catch (ex) { toast(ex.message, true); return; }
  const ship = o.shipping || o.shipping_json && JSON.parse(o.shipping_json) || o.ship_to || {};
  const items = (o.items || []).map((it) => `<div class="oi"><img src="${esc(it.image_url || '')}" alt=""><div><div class="oi-title">${esc(it.title)}${it.size ? ` | ${esc(it.size)}` : ''}</div><div class="oi-meta">${it.quantity > 1 ? it.quantity + ' × ' : ''}${money(it.unit_cents)}</div></div><div>${money(it.unit_cents * it.quantity)}</div></div>`).join('');
  const addrLines = [ship.name, ship.line1, ship.line2, [ship.city, ship.state, ship.postal_code].filter(Boolean).join(' '), ship.country].filter(Boolean);
  const next = o.status === 'paid' ? 'packed' : o.status === 'packed' ? 'shipped' : o.status === 'shipped' ? 'delivered' : null;
  const body = `
    <div class="o-grid">
      <div class="o-block"><h4>Customer</h4><div class="addr">${esc(o.customer_name || '')}<br><span class="copy" data-copy="${esc(o.email || '')}">${esc(o.email || '')}</span>${ship.phone ? `<br>${esc(ship.phone)}` : ''}</div></div>
      <div class="o-block"><h4>Ship to <button class="linkish" data-copy="${esc(addrLines.join('\n'))}" style="margin-left:.5rem;text-transform:none;letter-spacing:0">copy</button></h4><div class="addr">${addrLines.map(esc).join('<br>') || '<span class="muted">No address on file</span>'}</div></div>
    </div>
    ${o.note ? `<div class="callout">Customer note: ${esc(o.note)}</div>` : ''}
    <div class="order-items">${items}</div>
    <div class="totals"><div><span>Subtotal</span><span>${money(o.subtotal_cents)}</span></div><div><span>Shipping</span><span>${money(o.shipping_cents)}</span></div>${o.tax_cents ? `<div><span>Tax</span><span>${money(o.tax_cents)}</span></div>` : ''}<div class="grand"><span>Total</span><span>${money(o.total_cents)}</span></div></div>
    <div class="o-actions">
      <h3>Status: <span class="status ${o.status}">${o.status}</span></h3>
      ${o.status === 'packed' || o.status === 'paid' ? `<div class="row"><div class="field"><label>Carrier</label><select class="input" id="o-carrier">${CARRIERS.map((c) => `<option ${o.carrier === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="field"><label>Tracking number</label><input class="input" id="o-track" value="${esc(o.tracking_number || '')}" placeholder="9400 1000 ..."></div></div>` : ''}
      ${o.tracking_number && o.status !== 'paid' && o.status !== 'packed' ? `<div class="track-box"><span>${esc(o.carrier || '')} ${esc(o.tracking_number)}</span>${o.tracking_url ? `<a href="${esc(o.tracking_url)}" target="_blank" rel="noopener">Open ${icon('external')}</a>` : ''}</div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:.5rem">
        ${next === 'packed' ? `<button class="s-btn" data-set="packed">${icon('box')} Mark packed</button>` : ''}
        ${next === 'packed' || next === 'shipped' ? `<button class="s-btn indigo" data-set="shipped">${icon('truck')} Mark shipped</button>` : ''}
        ${next === 'delivered' ? `<button class="s-btn" data-set="delivered">${icon('home')} Mark delivered</button>` : ''}
        ${!['cancelled', 'refunded', 'delivered'].includes(o.status) ? `<button class="s-btn danger sm" data-set="cancelled" style="margin-left:auto">Cancel order</button>` : ''}
      </div>
      <div class="field"><label for="o-note">Internal note</label><textarea class="input" id="o-note" style="min-height:4rem" placeholder="Only you see this.">${esc(o.internal_note || '')}</textarea></div>
      <div><button class="s-btn ghost sm" data-save-note>Save note</button></div>
    </div>
    <div><h3 style="margin-bottom:.6rem">History</h3><ul class="events">${(o.events || []).map((e) => `<li><time>${fmtDate(e.created_at, true)}</time><span><strong>${esc(e.status)}</strong>${e.note ? ` · ${esc(e.note)}` : ''}</span></li>`).join('')}</ul></div>`;
  const pan = panel(`Order ${esc(o.number || o.id)}`, body, `<span class="spacer"></span><button class="s-btn ghost" data-close2>Close</button>`);
  pan.querySelector('[data-close2]').addEventListener('click', closePanel);
  pan.querySelectorAll('[data-copy]').forEach((el) => el.addEventListener('click', () => { navigator.clipboard.writeText(el.dataset.copy).then(() => toast('Copied.')); }));
  const post = async (payload) => {
    try {
      const res = await api.post(`/june-and-fern/api/admin/orders/${encodeURIComponent(o.number || o.id)}/status`, payload);
      S.orders = S.orders.map((x) => ((x.number || x.id) === (o.number || o.id) ? res.order : x));
      toast(payload.status ? `Order ${payload.status}.` : 'Saved.');
      await loadStats(); renderOrders(); openOrder(o.number || o.id);
    } catch (ex) { toast(ex.message, true); }
  };
  pan.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', () => {
    const status = b.dataset.set;
    if (status === 'cancelled' && !confirm('Cancel this order? Refund it in Stripe separately if it was paid.')) return;
    const payload = { status, internal_note: pan.querySelector('#o-note').value };
    if (status === 'shipped') { payload.carrier = pan.querySelector('#o-carrier')?.value; payload.tracking_number = pan.querySelector('#o-track')?.value.trim(); if (!payload.tracking_number && !confirm('No tracking number. Mark shipped anyway?')) return; }
    post(payload);
  }));
  pan.querySelector('[data-save-note]').addEventListener('click', () => post({ status: o.status, internal_note: pan.querySelector('#o-note').value }));
}

/* ---------- settings ---------- */
function renderSettings() {
  const s = S.settings;
  const f = (k, label, hint = '', type = 'text') => `<div class="field"><label for="st-${k}">${label}</label><input id="st-${k}" class="input" type="${type}" value="${esc(s[k] ?? '')}">${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
  shell(`
    <div class="s-top"><div><h1>Settings</h1><div class="sub">Words and numbers the shop reads live.</div></div></div>
    <form class="settings-form" data-settings>
      ${f('announcement', 'Announcement bar', 'Shown at the very top of every page. Leave blank to hide it.')}
      ${f('shop_note', 'Shop note', 'Short line under the home page hero, e.g. shipping promise or next update.')}
      <div class="f-grid">
        <div class="field"><label for="st-ship">Flat shipping (USD)</label><input id="st-ship" class="input" inputmode="decimal" value="${dollars(+s.shipping_flat_cents || 0)}"></div>
        <div class="field"><label for="st-free">Free shipping over (USD)</label><input id="st-free" class="input" inputmode="decimal" value="${dollars(+s.free_shipping_over_cents || 0)}"><div class="hint">0 turns free shipping off.</div></div>
        ${f('instagram', 'Instagram handle')}
        ${f('contact_email', 'Contact email', '', 'email')}
        ${f('studio_city', 'Studio location line', 'Footer and about page.')}
      </div>
      <div><button class="s-btn" type="submit">Save settings</button> <span class="msg" data-msg style="margin-left:.8rem;font-size:.8125rem;color:var(--fern)"></span></div>
    </form>`);
  app.querySelector('[data-settings]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const g = (id) => app.querySelector('#st-' + id).value.trim();
    const settings = { announcement: g('announcement'), shop_note: g('shop_note'), shipping_flat_cents: String(cents(g('ship'))), free_shipping_over_cents: String(cents(g('free'))), instagram: g('instagram'), contact_email: g('contact_email'), studio_city: g('studio_city') };
    try { const res = await api.put('/june-and-fern/api/admin/settings', { settings }); S.settings = res.settings || settings; app.querySelector('[data-msg]').textContent = 'Saved.'; toast('Settings saved.'); }
    catch (ex) { toast(ex.message, true); }
  });
}

/* ---------- subscribers ---------- */
function renderSubscribers() {
  shell(`
    <div class="s-top"><div><h1>Subscribers</h1><div class="sub">${S.subs.length} on the letter</div></div><div style="display:flex;gap:.5rem"><button class="s-btn ghost" data-copy-all>Copy all emails</button><button class="s-btn ghost" data-csv>Download CSV</button></div></div>
    <ul class="subs">${S.subs.length ? S.subs.map((x) => `<li><span>${esc(x.email)}</span><span>${fmtDate(x.created_at)}</span></li>`).join('') : '<li class="muted">No one yet. The form lives in the site footer.</li>'}</ul>`);
  app.querySelector('[data-copy-all]').addEventListener('click', () => navigator.clipboard.writeText(S.subs.map((x) => x.email).join(', ')).then(() => toast('Copied.')));
  app.querySelector('[data-csv]').addEventListener('click', () => {
    const csv = 'email,joined\n' + S.subs.map((x) => `${x.email},${new Date(x.created_at).toISOString()}`).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'june-and-fern-subscribers.csv'; a.click();
  });
}

/* ---------- data ---------- */
async function loadStats() { try { S.stats = await api.get('/june-and-fern/api/admin/stats'); } catch { /* ignore */ } }
async function loadAll() {
  const [p, o, s, subs] = await Promise.all([api.get('/june-and-fern/api/admin/products?status=all'), api.get('/june-and-fern/api/admin/orders?status=all'), api.get('/june-and-fern/api/admin/settings'), api.get('/june-and-fern/api/admin/subscribers').catch(() => ({ subscribers: [] }))]);
  S.products = p.products || []; S.orders = o.orders || []; S.settings = s.settings || {}; S.subs = subs.subscribers || [];
  await loadStats();
}
async function boot() {
  try { await api.get('/june-and-fern/api/admin/me'); } catch (ex) { renderLogin(ex.status === 503 ? 'The studio is not set up yet: set ADMIN_PASSWORD.' : ''); return; }
  app.innerHTML = '<div style="padding:3rem;color:var(--muted)">Opening the studio…</div>';
  try { await loadAll(); } catch (ex) { app.innerHTML = `<div style="padding:3rem" class="callout err">${esc(ex.message)}</div>`; return; }
  S.view = ['listings', 'orders', 'settings', 'subscribers'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'listings';
  render();
}
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (['listings', 'orders', 'settings', 'subscribers'].includes(v) && v !== S.view) { S.view = v; render(); } });
boot();
