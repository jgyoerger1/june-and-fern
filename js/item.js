/* Product page. Data arrives inline from the /shop/:slug function, or is fetched by slug as a fallback. */
import { initSite, toast } from './site.js';
import { api, money, esc, isBuyable, categoryLabel, CATEGORY } from './api.js';
import { bag } from './store.js';
import { addToBag, openBag } from './cart-ui.js';
import { cardHTML, bindQuickAdd } from './cards.js';
import { icon } from './icons.js';

const G = window.gsap;
const main = document.querySelector('[data-main]'), thumbs = document.querySelector('[data-thumbs]'), info = document.querySelector('[data-info]');

function slugFromPath() {
  const m = location.pathname.match(/\/shop\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : new URLSearchParams(location.search).get('s');
}

async function getData() {
  const inline = document.getElementById('jf-product');
  if (inline) { try { return JSON.parse(inline.textContent); } catch { /* fall through */ } }
  const slug = slugFromPath();
  if (!slug) throw new Error('missing');
  const { product, related } = await api.get(`/june-and-fern/api/products/${encodeURIComponent(slug)}`);
  return { ...product, related };
}

function renderGallery(p) {
  const imgs = p.images && p.images.length ? p.images : [{ url: '', alt: p.title }];
  const sold = p.status === 'sold' || p.quantity <= 0;
  main.innerHTML = imgs.map((im, i) => `<img src="${esc(im.url)}" alt="${esc(im.alt || p.title)}" class="${i === 0 ? 'is-on' : ''}" ${i === 0 ? '' : 'loading="lazy"'}>`).join('') + (sold ? '<span class="stamp">Sold</span>' : '');
  thumbs.innerHTML = imgs.length > 1 ? imgs.map((im, i) => `<button type="button" aria-current="${i === 0}" aria-label="Photo ${i + 1}"><img src="${esc(im.url)}" alt=""></button>`).join('') : '';
  thumbs.style.display = imgs.length > 1 ? '' : 'none';
  if (imgs.length <= 1) main.parentElement.style.gridTemplateColumns = '1fr';
  const mains = main.querySelectorAll('img');
  thumbs.querySelectorAll('button').forEach((b, i) => b.addEventListener('click', () => {
    thumbs.querySelectorAll('button').forEach((x, k) => x.setAttribute('aria-current', String(k === i)));
    mains.forEach((m, k) => m.classList.toggle('is-on', k === i));
  }));
  requestAnimationFrame(() => main.classList.add('is-in'));
}

function detailsHTML(p) {
  const d = p.details || {};
  const sections = [];
  if (d.measurements && Object.keys(d.measurements).length) sections.push(['Measurements', `<dl class="spec">${Object.entries(d.measurements).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${d.fit ? `<p style="margin-top:.8rem">${esc(d.fit)}</p>` : ''}`]);
  const fab = [d.fabric && `<p>${esc(d.fabric)}</p>`, d.care && `<p>${esc(d.care)}</p>`].filter(Boolean).join('');
  if (fab) sections.push(['Fabric and care', fab]);
  if (d.botanicals && d.botanicals.length) sections.push(['The botanicals', `<div class="bot-list">${d.botanicals.map((b) => `<span class="pill pill-fern">${esc(b)}</span>`).join('')}</div>${d.origin ? `<p style="margin-top:.9rem">${esc(d.origin)}</p>` : ''}`]);
  const vint = [d.era && `<p><strong>Era:</strong> ${esc(d.era)}</p>`, d.condition && `<p><strong>Condition:</strong> ${esc(d.condition)}</p>`].filter(Boolean).join('');
  if (vint) sections.push(['Age and condition', vint]);
  sections.push(['Shipping and returns', `<p>Ships from Northeast Ohio within 3 business days, tracked. Because every piece is one of a kind, sales are final, but if something arrives not as described, write within 7 days and we will make it right.</p>`]);
  return `<div class="acc">${sections.map(([t, body], i) => `<div class="acc-item ${i === 0 ? 'is-open' : ''}"><button class="acc-btn" type="button" aria-expanded="${i === 0}">${t}${icon('chevron')}</button><div class="acc-panel"><div><div class="acc-body">${body}</div></div></div></div>`).join('')}</div>`;
}

function renderInfo(p) {
  const sold = p.status === 'sold' || p.quantity <= 0, buyable = isBuyable(p);
  const save = p.compare_at_cents ? Math.round((1 - p.price_cents / p.compare_at_cents) * 100) : 0;
  const flags = [p.one_of_one ? '<span class="pill pill-indigo">One of one</span>' : `<span class="pill">${p.quantity > 0 ? p.quantity + ' available' : 'Sold out'}</span>`, p.category === 'cyanotype' ? '<span class="pill pill-fern">Sun printed by hand</span>' : '', p.category === 'vintage' ? '<span class="pill pill-clay">Vintage</span>' : ''].filter(Boolean).join('');
  const desc = (p.description || '').split(/\n\s*\n/).map((t) => `<p>${esc(t).replace(/\n/g, '<br>')}</p>`).join('');
  let cta;
  if (buyable) cta = `<div class="item-cta"><button class="btn btn-indigo btn-block" data-add data-magnetic>${bag.has(p.id) ? 'In your bag · view' : 'Add to bag'} ${icon('arrow')}</button><p class="muted" style="font-size:.8125rem;margin:0">Free shipping over $150. Taxes, if any, at checkout.</p></div>`;
  else if (sold) cta = `<div class="item-sold"><h3>This piece has found its home.</h3><p>It stays on the wall as part of the body of work. Something similar may come through in a future update.</p><a class="btn-text" href="/june-and-fern/shop/?c=${esc(p.category)}"><span class="line">See what is available</span>${icon('arrow')}</a></div>`;
  else if (p.reserved) cta = `<div class="item-sold"><h3>In another shopper's bag right now.</h3><p>Holds last up to 30 minutes. If their checkout does not complete, this will open back up.</p><button class="btn-text" data-recheck><span class="line">Check again</span>${icon('arrow')}</button></div>`;
  else cta = `<div class="item-sold"><h3>Not available right now.</h3></div>`;
  info.innerHTML = `
    <p class="eyebrow"><a href="/june-and-fern/shop/?c=${esc(p.category)}">${esc(categoryLabel(p.category))}</a></p>
    <h1>${esc(p.title)}${p.size ? ` <span class="size">| ${esc(p.size)}</span>` : ''}</h1>
    <div class="item-price">${money(p.price_cents)}${p.compare_at_cents ? `<s>${money(p.compare_at_cents)}</s><span class="save">Save ${save}%</span>` : ''}</div>
    <div class="item-flags">${flags}</div>
    ${cta}
    <div class="item-desc">${desc}</div>
    ${detailsHTML(p)}`;
  info.querySelectorAll('.acc-btn').forEach((b) => b.addEventListener('click', () => { const it = b.parentElement; const open = it.classList.toggle('is-open'); b.setAttribute('aria-expanded', String(open)); }));
  const add = info.querySelector('[data-add]');
  if (add) add.addEventListener('click', () => {
    if (bag.has(p.id) && p.one_of_one) { openBag(); return; }
    addToBag(p, main.querySelector('img.is-on') || main);
    add.innerHTML = `In your bag · view ${icon('arrow')}`;
    toast('Added to your bag');
  });
  const re = info.querySelector('[data-recheck]');
  if (re) re.addEventListener('click', () => location.reload());
  if (G && !matchMedia('(prefers-reduced-motion: reduce)').matches && !document.documentElement.classList.contains('no-motion')) G.from(info.children, { y: 18, opacity: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out' });
}

function renderRelated(list) {
  const sec = document.querySelector('[data-related]'), rail = document.querySelector('[data-rail]');
  if (!list || !list.length) return;
  sec.hidden = false;
  rail.innerHTML = list.map(cardHTML).join('');
  bindQuickAdd(rail, list);
  if (window.jfObserve) window.jfObserve(rail);
}

(async function boot() {
  initSite({ page: 'item' });
  let p;
  try { p = await getData(); }
  catch {
    document.querySelector('[data-item]').innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>We could not find that piece</h3><p>It may have been relisted under a new name, or the link is missing a character.</p><a class="btn btn-indigo btn-sm" href="/june-and-fern/shop/">Back to the shop</a></div>`;
    return;
  }
  document.title = `${p.title}${p.size ? ' | ' + p.size : ''} — June & Fern`;
  const crumb = document.querySelector('[data-crumb-cat]');
  crumb.textContent = (CATEGORY[p.category] || {}).short || p.category; crumb.href = `/june-and-fern/shop/?c=${p.category}`;
  renderGallery(p);
  renderInfo(p);
  renderRelated(p.related);
})();
