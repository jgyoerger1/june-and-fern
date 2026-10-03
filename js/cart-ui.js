/* The bag drawer: renders from the store, validates against the API when opened, starts checkout. */
import { api, money, esc, getSettings } from './api.js';
import { bag } from './store.js';
import { icon } from './icons.js';

let drawer, scrim, itemsEl, footEl, problems = new Map(), opened = false;
const G = () => window.gsap;

export function initBag() {
  if (drawer) return;
  scrim = el(`<div class="bag-scrim" data-bag-close></div>`);
  drawer = el(`
    <aside class="bag" role="dialog" aria-modal="true" aria-label="Your bag">
      <div class="bag-head">
        <h2>Your bag <small data-bag-n></small></h2>
        <button class="bag-close" data-bag-close aria-label="Close bag">${icon('close')}</button>
      </div>
      <div class="bag-items" data-bag-items></div>
      <div class="bag-foot" data-bag-foot></div>
    </aside>`);
  document.body.append(scrim, drawer);
  itemsEl = drawer.querySelector('[data-bag-items]');
  footEl = drawer.querySelector('[data-bag-foot]');
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-bag-open]')) { e.preventDefault(); openBag(); }
    if (e.target.closest('[data-bag-close]')) closeBag();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBag(); });
  bag.subscribe(render);
}

export function openBag() {
  initBag();
  drawer.classList.add('is-open'); scrim.classList.add('is-open');
  document.documentElement.classList.add('lenis-stopped');
  opened = true;
  validate();
}
export function closeBag() {
  if (!drawer) return;
  drawer.classList.remove('is-open'); scrim.classList.remove('is-open');
  document.documentElement.classList.remove('lenis-stopped');
  opened = false;
}

/* Add + a little image flight toward the bag icon. */
export function addToBag(product, fromEl) {
  bag.add(product, 1);
  const bagBtn = document.querySelector('.bag-btn');
  const img = fromEl && (fromEl.tagName === 'IMG' ? fromEl : fromEl.querySelector('img, svg'));
  if (img && bagBtn && G() && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const a = img.getBoundingClientRect(), b = bagBtn.getBoundingClientRect();
    const ghost = img.cloneNode(true);
    ghost.className = 'fly';
    ghost.style.left = a.left + a.width / 2 - 30 + 'px';
    ghost.style.top = a.top + a.height / 2 - 38 + 'px';
    document.body.append(ghost);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    G().timeline({ onComplete: () => { ghost.remove(); bumpCount(); setTimeout(openBag, 120); } })
      .to(ghost, { x: dx * 0.55, y: dy * 0.55 - 120, scale: 0.8, rotation: -8, duration: 0.45, ease: 'power2.out' })
      .to(ghost, { x: dx, y: dy, scale: 0.15, rotation: 6, opacity: 0.2, duration: 0.5, ease: 'power3.in' });
  } else {
    bumpCount();
    openBag();
  }
}

function bumpCount() {
  document.querySelectorAll('[data-bag-count]').forEach((c) => { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); });
}

export function renderCount() {
  const n = bag.count();
  document.querySelectorAll('[data-bag-count]').forEach((c) => { c.textContent = n; c.classList.toggle('is-on', n > 0); });
}

async function validate() {
  if (!bag.items.length) return;
  try {
    const { items } = await api.post('/june-and-fern/api/cart/validate', { items: bag.items.map((i) => ({ id: i.id, qty: i.qty })) });
    problems = new Map();
    for (const r of items) {
      if (!r.ok) problems.set(r.id, r.reason);
      if (r.product) bag.patch(r.id, { price_cents: r.product.price_cents, max: r.product.one_of_one ? 1 : Math.max(1, r.product.quantity || 1) });
    }
    render();
  } catch { /* offline: keep the local bag */ }
}

const REASON = { sold: 'This piece just sold.', reserved: 'In another shopper\'s bag right now. Check back in a few minutes.', quantity: 'Fewer left than you have in your bag.', missing: 'No longer listed.' };

async function render() {
  if (!drawer) return;
  renderCount();
  drawer.querySelector('[data-bag-n]').textContent = bag.count() ? `${bag.count()} ${bag.count() === 1 ? 'piece' : 'pieces'}` : '';
  if (!bag.items.length) {
    itemsEl.innerHTML = `<div class="bag-empty">${icon('leaf')}<h3>Nothing in your bag yet</h3><p>Every piece is one of a kind, so when something speaks to you, it is worth moving quickly.</p><a class="btn btn-indigo btn-sm" href="/june-and-fern/shop/" data-bag-close>Browse the shop</a></div>`;
    footEl.innerHTML = '';
    return;
  }
  itemsEl.innerHTML = bag.items.map((i) => {
    const p = problems.get(i.id);
    return `<div class="bag-item ${p ? 'is-problem' : ''}" data-id="${esc(i.id)}">
      <a href="/june-and-fern/shop/${esc(i.slug)}"><img src="${esc(i.image)}" alt=""></a>
      <div>
        <div class="bi-title"><a href="/june-and-fern/shop/${esc(i.slug)}">${esc(i.title)}</a></div>
        <div class="bi-meta">${i.size ? 'Size ' + esc(i.size) + ' · ' : ''}${i.one_of_one ? 'One of one' : esc(i.category || '')}</div>
        ${p ? `<div class="bi-warn">${REASON[p] || p}</div>` : ''}
        <div class="bi-actions">
          ${i.max > 1 ? `<span class="qty"><button data-qty="-1" aria-label="Fewer">${icon('minus')}</button><span>${i.qty}</span><button data-qty="1" aria-label="More">${icon('plus')}</button></span>` : ''}
          <button class="bi-remove" data-remove>Remove</button>
        </div>
      </div>
      <div class="bi-price">${money(i.price_cents * i.qty)}</div>
    </div>`;
  }).join('');
  const s = await getSettings();
  const free = s.free_shipping_over_cents || 0, flat = s.shipping_flat_cents || 0, sub = bag.subtotal();
  const shipNote = free && sub >= free ? 'Shipping is on us for this order.' : free ? `${money(flat)} flat shipping, free over ${money(free)}.` : `${money(flat)} flat shipping.`;
  footEl.innerHTML = `
    <div class="field bag-note"><label for="bag-note">Note for Beth (optional)</label><textarea id="bag-note" class="input" placeholder="A gift? Need it by a date?">${esc(bag.note)}</textarea></div>
    <div class="bag-row"><span>Subtotal</span><strong>${money(sub)}</strong></div>
    <div class="bag-ship">${shipNote} Taxes, if any, are calculated at checkout.</div>
    <div class="bag-err" data-bag-err></div>
    <button class="btn btn-indigo btn-block" data-checkout ${problems.size ? 'disabled' : ''}>Check out ${icon('arrow')}</button>
    <div class="muted" style="font-size:.75rem;text-align:center">${s.payments === 'stripe' ? 'Secure checkout by Stripe. Apple Pay and Google Pay accepted.' : s.payments === 'preview' ? 'Design preview. Checkout opens when the shop launches.' : 'Test checkout mode. No card will be charged.'}</div>`;
  footEl.querySelector('#bag-note').addEventListener('input', (e) => bag.setNote(e.target.value));
  footEl.querySelector('[data-checkout]').addEventListener('click', checkout);
  itemsEl.querySelectorAll('[data-qty]').forEach((b) => b.addEventListener('click', () => { const id = b.closest('.bag-item').dataset.id; const it = bag.find(id); bag.setQty(id, it.qty + Number(b.dataset.qty)); }));
  itemsEl.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => { const row = b.closest('.bag-item'); const id = row.dataset.id; problems.delete(id); if (G()) G().to(row, { x: 40, opacity: 0, duration: 0.3, onComplete: () => bag.remove(id) }); else bag.remove(id); }));
}

async function checkout(e) {
  const btn = e.currentTarget, err = footEl.querySelector('[data-bag-err]');
  btn.disabled = true; btn.innerHTML = 'One moment';
  err.textContent = '';
  try {
    const res = await api.post('/june-and-fern/api/checkout', { items: bag.items.map((i) => ({ id: i.id, qty: i.qty })), note: bag.note });
    sessionStorage.setItem('jf.pendingOrder', res.order || '');
    location.href = res.url;
  } catch (ex) {
    btn.disabled = false; btn.innerHTML = `Check out ${icon('arrow')}`;
    if (ex.code === 'unavailable' && ex.data && ex.data.items) {
      problems = new Map(ex.data.items.map((i) => [i.id, i.reason]));
      err.textContent = 'Something in your bag is no longer available. Remove it to continue.';
      render();
    } else {
      err.textContent = ex.message || 'Checkout could not start. Please try again.';
    }
  }
}

function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
