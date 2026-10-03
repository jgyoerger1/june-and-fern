/* Product card markup + quick add. Shared by home, shop and item pages. */
import { money, esc, isBuyable, categoryLabel } from './api.js';
import { bag } from './store.js';
import { addToBag } from './cart-ui.js';

export function cardHTML(p, i = 0) {
  const img0 = p.images && p.images[0], img1 = p.images && p.images[1];
  const sold = p.status === 'sold' || p.quantity <= 0;
  const inBag = bag.has(p.id);
  return `<article class="card ${sold ? 'is-sold' : ''}" data-id="${esc(p.id)}" data-reveal style="--d:${(i % 6) * 70}ms">
    <div class="card-visual"><a class="card-media develop" href="/june-and-fern/shop/${esc(p.slug)}" aria-label="${esc(p.title)}">
      ${img0 ? `<img src="${esc(img0.url)}" alt="${esc(img0.alt || p.title)}" ${i < 4 ? (i === 0 ? 'fetchpriority="high"' : '') : 'loading="lazy"'} decoding="async">` : ''}
      ${img1 ? `<img class="alt" src="${esc(img1.url)}" alt="" loading="lazy" decoding="async">` : ''}
      ${sold ? '<span class="stamp">Sold</span>' : ''}
      ${!sold && p.reserved ? '<span class="card-badge reserved">In someone\'s bag</span>' : (p.one_of_one && !sold ? '<span class="card-badge">1 of 1</span>' : '')}
    </a>
    ${isBuyable(p) ? `<button class="card-add ${inBag ? 'is-in' : ''}" data-add="${esc(p.id)}">${inBag ? 'In your bag' : 'Add to bag'}</button>` : ''}</div>
    <div class="card-body">
      <div class="card-row">
        <h3 class="card-title"><a href="/june-and-fern/shop/${esc(p.slug)}">${esc(p.title)}${p.size ? ` <span class="size">| ${esc(p.size)}</span>` : ''}</a></h3>
        <span class="card-price">${money(p.price_cents)}${p.compare_at_cents ? `<s>${money(p.compare_at_cents)}</s>` : ''}</span>
      </div>
      <div class="card-meta">${esc(categoryLabel(p.category))}${!p.one_of_one && !sold && p.quantity > 0 ? ` · ${p.quantity} left` : ''}</div>
    </div>
  </article>`;
}

export function skeletonHTML(n = 6) {
  return Array.from({ length: n }, (_, i) => `<div class="card card-skel"><div class="skel skel-media"></div><div class="skel skel-text"></div><div class="skel skel-text"></div></div>`).join('');
}

/* Wire quick-add buttons inside a container. products = array used to resolve ids. */
export function bindQuickAdd(container, products) {
  container.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    e.preventDefault();
    const p = products.find((x) => x.id === b.dataset.add);
    if (!p || !isBuyable(p)) return;
    addToBag(p, b.closest('.card').querySelector('.card-media'));
    b.classList.add('is-in'); b.textContent = 'In your bag';
  });
  bag.subscribe(() => {
    container.querySelectorAll('[data-add]').forEach((b) => { const inBag = bag.has(b.dataset.add); b.classList.toggle('is-in', inBag); b.textContent = inBag ? 'In your bag' : 'Add to bag'; });
  });
}
