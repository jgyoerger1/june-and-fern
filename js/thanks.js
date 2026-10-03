/* Post-checkout page: confirms the order by session id, clears the bag, shows the timeline. */
import { initSite } from './site.js';
import { api, qs, esc } from './api.js';
import { bag } from './store.js';
import { orderHTML, animateTimeline } from './orders.js';
import { scene } from './botanicals.js';

(async function boot() {
  initSite({ page: 'thanks' });
  const print = document.querySelector('[data-print]');
  const seed = Math.floor(Math.random() * 1000) + 1;
  print.innerHTML = scene({ seed, width: 800, height: 1000, plants: [
    { type: 'fern', x: 380, y: 920, scale: 2.1, rot: -6 },
    { type: 'sprig', x: 600, y: 940, scale: 1.2, rot: 10 },
    { type: 'moon', x: 640, y: 160, scale: 1, opts: { R: 40 } }
  ], label: 'A fresh cyanotype' });
  print.querySelector('svg').classList.add('is-live');
  const box = document.querySelector('[data-order]');
  const sid = qs('session_id');
  if (!sid) { box.innerHTML = `<div class="callout">Looking for an order? <a href="/june-and-fern/orders/" style="text-decoration:underline">Track it here</a>.</div>`; return; }
  let tries = 0;
  async function load() {
    try {
      const { order } = await api.get(`/june-and-fern/api/orders/session/${encodeURIComponent(sid)}`);
      if (order.status === 'pending' && tries++ < 6) { setTimeout(load, 1500); return; }
      bag.clear();
      box.innerHTML = orderHTML(order, { title: 'Order' }) + `<p class="muted" style="font-size:.8125rem;margin-top:1rem">Save your order number <strong>${esc(order.number)}</strong>. You can check on it any time at <a href="/june-and-fern/orders/?number=${encodeURIComponent(order.number)}" style="text-decoration:underline">/orders</a>.</p>`;
      animateTimeline(box);
      const lede = document.querySelector('[data-thanks-lede]');
      if (lede && order.items && order.items.length === 1) lede.textContent = `${order.items[0].title} is being wrapped for you. You will get an email with tracking the moment it ships, usually within 3 business days.`;
    } catch (ex) {
      box.innerHTML = `<div class="callout err">We could not load this order${ex.status === 404 ? ', the link may be incomplete' : ''}. Your confirmation email has everything, and you can <a href="/june-and-fern/orders/" style="text-decoration:underline">track it here</a>.</div>`;
    }
  }
  load();
})();
