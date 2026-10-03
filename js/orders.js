/* Order tracking: number + email -> status timeline. Shared renderer used by the thanks page too. */
import { initSite } from './site.js';
import { api, money, esc, fmtDate, qs } from './api.js';
import { icon } from './icons.js';

const STEPS = [['paid', 'Order placed', 'Paid and in the queue'], ['packed', 'Packed', 'Wrapped in tissue, label printed'], ['shipped', 'Shipped', 'On its way with USPS'], ['delivered', 'Delivered', 'Home']];
const RANK = { pending: -1, paid: 0, packed: 1, shipped: 2, delivered: 3, cancelled: -2, refunded: -2 };

export function orderHTML(o, opts = {}) {
  const rank = RANK[o.status] ?? 0;
  const when = { paid: o.paid_at || o.created_at, packed: (o.events || []).find((e) => e.status === 'packed')?.created_at, shipped: o.shipped_at, delivered: o.delivered_at };
  const cancelled = rank === -2;
  const timeline = cancelled ? `<div class="callout err">This order was ${esc(o.status)}. If that is a surprise, write to us and we will sort it out.</div>` :
    `<div class="timeline" aria-label="Order progress">
      <div class="tl-fill" data-fill style="width:${rank <= 0 ? 0 : (rank / 3) * 100}%"></div>
      ${STEPS.map(([k, label, sub], i) => `<div class="tl-step ${i < rank ? 'is-done' : i === rank ? 'is-now' : 'is-todo'}"><span class="tl-dot">${icon('check')}</span><span class="tl-label">${label}</span><span class="tl-date">${when[k] ? fmtDate(when[k]) : sub}</span></div>`).join('')}
    </div>`;
  const track = o.tracking_number ? `<div class="track-box"><span>${esc(o.carrier || 'Carrier')} · ${esc(o.tracking_number)}</span>${o.tracking_url ? `<a href="${esc(o.tracking_url)}" target="_blank" rel="noopener">Track the parcel ${icon('external')}</a>` : ''}</div>` : '';
  const items = (o.items || []).map((it) => `<div class="oi"><img src="${esc(it.image_url || '')}" alt=""><div><div class="oi-title">${esc(it.title)}${it.size ? ` <span class="muted">| ${esc(it.size)}</span>` : ''}</div><div class="oi-meta">${it.quantity > 1 ? `${it.quantity} × ` : ''}${money(it.unit_cents, o.currency)}</div></div><div>${money(it.unit_cents * it.quantity, o.currency)}</div></div>`).join('');
  const ship = o.ship_to ? `<div><p class="eyebrow" style="margin-bottom:.5rem">Shipping to</p><div class="addr">${esc(o.ship_to.name || '')}<br>${esc([o.ship_to.city, o.ship_to.state].filter(Boolean).join(', '))} ${esc(o.ship_to.postal_code || '')}</div></div>` : '';
  return `<div class="order-card" ${opts.reveal ? 'data-reveal' : ''}>
    <div class="order-top"><h2>${opts.title || 'Order'} <span class="num">${esc(o.number)}</span></h2><span class="muted" style="font-size:.8125rem">Placed ${fmtDate(o.created_at)}</span></div>
    ${timeline}
    ${track}
    <div class="order-items">${items}</div>
    <div class="totals">
      <div><span>Subtotal</span><span>${money(o.subtotal_cents, o.currency)}</span></div>
      <div><span>Shipping</span><span>${o.shipping_cents ? money(o.shipping_cents, o.currency) : 'Free'}</span></div>
      ${o.tax_cents ? `<div><span>Tax</span><span>${money(o.tax_cents, o.currency)}</span></div>` : ''}
      <div class="grand"><span>Total</span><span>${money(o.total_cents, o.currency)}</span></div>
    </div>
    ${ship}
    ${o.note ? `<div class="callout">Your note: ${esc(o.note)}</div>` : ''}
  </div>`;
}

export function animateTimeline(root) {
  const fill = root.querySelector('[data-fill]');
  if (!fill) return;
  const w = fill.style.width; fill.style.width = '0';
  requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = w; }));
}

(async function boot() {
  const form = document.querySelector('[data-lookup]');
  if (!form) return;
  const { settings } = await initSite({ page: 'orders' });
  const contact = document.querySelector('[data-contact]');
  if (contact && settings.contact_email) { contact.textContent = settings.contact_email; contact.href = `mailto:${settings.contact_email}`; }
  const result = document.querySelector('[data-result]');
  const numberEl = form.querySelector('#number'), emailEl = form.querySelector('#email');
  if (qs('number')) numberEl.value = qs('number');
  if (qs('email')) emailEl.value = qs('email');
  async function lookup() {
    const number = numberEl.value.trim().toUpperCase(), email = emailEl.value.trim();
    const fNum = numberEl.closest('.field'), fEm = emailEl.closest('.field');
    fNum.classList.toggle('is-invalid', !/^JF-[A-Z0-9]{4,8}$/.test(number));
    fEm.classList.toggle('is-invalid', !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
    if (fNum.classList.contains('is-invalid') || fEm.classList.contains('is-invalid')) return;
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    result.innerHTML = `<div class="order-card"><div class="skel skel-text" style="width:50%;height:1.8rem"></div><div class="skel" style="height:60px"></div><div class="skel" style="height:120px"></div></div>`;
    try {
      const { order } = await api.get(`/june-and-fern/api/orders/lookup?number=${encodeURIComponent(number)}&email=${encodeURIComponent(email)}`);
      result.innerHTML = orderHTML(order);
      animateTimeline(result);
      history.replaceState(null, '', `/june-and-fern/orders/?number=${encodeURIComponent(number)}`);
    } catch (ex) {
      result.innerHTML = `<div class="callout err">${ex.status === 404 ? 'We could not find an order with that number and email. Check both for typos, or write to us and we will look it up.' : 'Something went wrong looking that up. Please try again.'}</div>`;
    } finally { btn.disabled = false; }
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); lookup(); });
  if (numberEl.value && emailEl.value) lookup();
})();
