/* Stand-in for Stripe Checkout while PAYMENTS=mock. */
import { api, qs, money, esc } from './api.js';

const sid = qs('sid');
const summary = document.querySelector('[data-summary]'), form = document.querySelector('[data-pay]'), err = document.querySelector('[data-err]');

(async function boot() {
  if (!sid) { summary.innerHTML = '<div class="callout err">Missing session.</div>'; return; }
  try {
    const { order } = await api.get(`/june-and-fern/api/mock/session/${encodeURIComponent(sid)}`);
    summary.innerHTML = `<div class="order-items">${order.items.map((it) => `<div class="oi"><img src="${esc(it.image_url || '')}" alt=""><div><div class="oi-title">${esc(it.title)}${it.size ? ` | ${esc(it.size)}` : ''}</div><div class="oi-meta">${it.quantity > 1 ? it.quantity + ' × ' : ''}${money(it.unit_cents)}</div></div><div>${money(it.unit_cents * it.quantity)}</div></div>`).join('')}</div>
      <div class="totals"><div><span>Subtotal</span><span>${money(order.subtotal_cents)}</span></div><div><span>Shipping</span><span>${order.shipping_cents ? money(order.shipping_cents) : 'Free'}</span></div><div class="grand"><span>Total</span><span>${money(order.total_cents)}</span></div></div>
      <p class="muted" style="font-size:.8125rem;margin-top:1rem">Order ${esc(order.number || order.id || '')}</p>`;
    document.querySelector('[data-paybtn]').textContent = `Pay ${money(order.total_cents)} (test)`;
  } catch (ex) {
    summary.innerHTML = `<div class="callout err">${ex.status === 404 ? 'This test session has expired or was already paid.' : 'Could not load the session.'}</div>`;
    form.querySelector('[data-paybtn]').disabled = true;
  }
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = (id) => form.querySelector('#' + id).value.trim();
  let bad = false;
  ['email', 'name', 'line1'].forEach((id) => { const f = form.querySelector('#' + id).closest('.field'); const ok = !!v(id); f.classList.toggle('is-invalid', !ok); bad = bad || !ok; });
  if (bad) return;
  const btn = form.querySelector('[data-paybtn]'); btn.disabled = true; err.textContent = '';
  try {
    const res = await api.post('/june-and-fern/api/mock/pay', { sid, email: v('email'), name: v('name'), address: { line1: v('line1'), line2: '', city: v('city'), state: v('state'), postal_code: v('zip'), country: 'US' } });
    location.href = res.redirect || `/june-and-fern/thanks/?session_id=${encodeURIComponent(sid)}`;
  } catch (ex) { err.textContent = ex.message || 'Payment failed.'; btn.disabled = false; }
});
form.querySelector('[data-cancel]').addEventListener('click', async () => {
  try { await api.post('/june-and-fern/api/mock/cancel', { sid }); } catch { /* ignore */ }
  location.href = '/june-and-fern/shop/?cancelled=1';
});
