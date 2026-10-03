/* Shop grid with category chips, sort, and a divider before the sold pieces. */
import { initSite } from './site.js';
import { api, qs, CATEGORY, isBuyable } from './api.js';
import { cardHTML, skeletonHTML, bindQuickAdd } from './cards.js';
import { fern, rng } from './botanicals.js';

const grid = document.querySelector('[data-grid]');
const title = document.querySelector('[data-shop-title]');
const count = document.querySelector('[data-shop-count]');
const blurb = document.querySelector('[data-shop-blurb]');
let all = [], cat = qs('c', '') || '', sort = 'new';

function setCat(c, push = true) {
  cat = CATEGORY[c] ? c : '';
  document.querySelectorAll('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
  title.textContent = cat ? CATEGORY[cat].label : 'Everything';
  blurb.textContent = cat ? CATEGORY[cat].blurb : 'One of a kind pieces, listed a few at a time. Sold pieces stay on the wall because the whole body of work matters.';
  document.title = `${cat ? CATEGORY[cat].label : 'Shop'} — June & Fern`;
  if (push) history.replaceState(null, '', cat ? `/june-and-fern/shop/?c=${cat}` : '/june-and-fern/shop/');
  render();
}

function render() {
  let list = all.filter((p) => !cat || p.category === cat);
  if (sort === 'available') list = list.filter(isBuyable);
  const live = list.filter((p) => p.status !== 'sold' && p.quantity > 0), sold = list.filter((p) => p.status === 'sold' || p.quantity <= 0);
  const by = { new: (a, b) => b.created_at - a.created_at, low: (a, b) => a.price_cents - b.price_cents, high: (a, b) => b.price_cents - a.price_cents, available: (a, b) => b.created_at - a.created_at }[sort];
  live.sort((a, b) => (b.featured - a.featured) || by(a, b));
  sold.sort((a, b) => (b.sold_at || 0) - (a.sold_at || 0));
  count.textContent = `${list.length} ${list.length === 1 ? 'piece' : 'pieces'} · ${live.length} available`;
  if (!list.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <svg class="empty-art" viewBox="-70 -150 140 160" aria-hidden="true"><path fill="currentColor" d="${fern(rng(4), { length: 140, pinnae: 14, width: 0.5 })}"/></svg>
      <h3>Nothing in this corner right now</h3>
      <p>Pieces go up a few at a time, usually on a Saturday morning. Join the letter at the bottom of the page and you will hear first.</p>
      <a class="btn btn-indigo btn-sm" href="/june-and-fern/shop/">See everything</a></div>`;
    return;
  }
  const html = live.map(cardHTML).join('') + (sold.length ? `<div class="grid-break">Already home</div>` : '') + sold.map((p, i) => cardHTML(p, i + live.length)).join('');
  grid.innerHTML = html;
  if (window.jfObserve) window.jfObserve(grid);
}

(async function boot() {
  grid.innerHTML = skeletonHTML(6);
  document.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => setCat(b.dataset.cat)));
  document.querySelector('[data-sort]').addEventListener('change', (e) => { sort = e.target.value; render(); });
  if (qs('cancelled')) document.querySelector('[data-cancelled]').hidden = false;
  initSite({ page: 'shop' });
  try {
    ({ products: all } = await api.get('/june-and-fern/api/products'));
  } catch {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>The shop is resting</h3><p>We could not load the listings. Please try again in a moment.</p></div>`;
    count.textContent = '';
    return;
  }
  bindQuickAdd(grid, all);
  setCat(cat, false);
  window.addEventListener('popstate', () => setCat(qs('c', ''), false));
})();
