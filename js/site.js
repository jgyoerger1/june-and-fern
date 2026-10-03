/* Shared shell: header, menu, footer, motion system, page transitions. */
import { api, getSettings, esc } from './api.js';
import { icon } from './icons.js';
import { initBag, renderCount } from './cart-ui.js';
import { fern, moon, rng } from './botanicals.js';

const noMotion = new URLSearchParams(location.search).get('motion') === '0';
if (noMotion) document.documentElement.classList.add('no-motion');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || noMotion;
const G = window.gsap;
let lenis = null;

export function brandMark(size = 34) {
  const d = fern(rng(5), { length: 26, pinnae: 9, width: 0.55, curl: 0.12 });
  return `<svg viewBox="-16 -34 34 36" width="${size}" height="${size}" aria-hidden="true"><path fill="currentColor" d="${d}" transform="rotate(-8)"/><path fill="var(--clay-deep)" d="${moon(4.2, 1.35)}" transform="translate(13 -27) rotate(20)"/></svg>`;
}

const NAV = [
  ['/june-and-fern/shop/', 'Shop'], ['/june-and-fern/shop/?c=cyanotype', 'Cyanotype'], ['/june-and-fern/shop/?c=vintage', 'Vintage'], ['/june-and-fern/shop/?c=goods', 'Goods'],
  ['/june-and-fern/about/', 'About'], ['/june-and-fern/orders/', 'Track order']
];

function headerHTML() {
  return `<div class="header-inner">
    <button class="nav-toggle" data-nav-open aria-label="Open menu">${icon('menu')}</button>
    <nav class="nav nav-left" aria-label="Primary">${NAV.slice(0, 4).map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>
    <a class="brand" href="/june-and-fern/" aria-label="June and Fern, home"><img class="brand-img" src="/june-and-fern/img/brand/wordmark.png" alt="June &amp; Fern" width="720" height="112"></a>
    <nav class="nav nav-right" aria-label="Secondary">${NAV.slice(4).map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}
      <button class="bag-btn" data-bag-open aria-label="Open your bag">${icon('bag')}<span class="bag-count" data-bag-count>0</span></button>
    </nav>
  </div>`;
}

function menuHTML() {
  const bigFern = fern(rng(9), { length: 300, pinnae: 20, width: 0.45, curl: 0.2 });
  return `<div class="menu" data-menu aria-hidden="true">
    <div class="menu-top"><img class="brand-img" src="/june-and-fern/img/brand/wordmark.png" alt="June &amp; Fern" width="720" height="112"><button class="menu-close" data-nav-close aria-label="Close menu">${icon('close')}</button></div>
    <nav class="menu-links" aria-label="Menu">${NAV.map(([h, l], i) => `<a href="${h}" style="--i:${i}">${l}</a>`).join('')}</nav>
    <div class="menu-foot"><span>Northeast Ohio</span><span data-menu-ig>@juneandfern</span></div>
    <svg class="menu-fern" viewBox="-160 -320 320 330" aria-hidden="true"><path fill="currentColor" d="${bigFern}"/></svg>
  </div>`;
}

function footerHTML(s) {
  const year = new Date().getFullYear();
  const ig = (s.instagram || '@juneandfern').replace(/^@/, '');
  return `<div class="wrap footer-grid">
    <div class="f-brand">
      <img class="f-badge" src="/june-and-fern/img/brand/badge.png" alt="June &amp; Fern, handmade goods" width="270" height="245" loading="lazy">
      <p class="hand">One of a kind goods for a wilder, warmer life.</p>
    </div>
    <div class="f-col"><h4>Shop</h4><a href="/june-and-fern/shop/">Everything</a><a href="/june-and-fern/shop/?c=cyanotype">Cyanotype apparel</a><a href="/june-and-fern/shop/?c=vintage">Vintage</a><a href="/june-and-fern/shop/?c=goods">Small goods</a></div>
    <div class="f-col"><h4>Help</h4><a href="/june-and-fern/orders/">Track an order</a><a href="/june-and-fern/about/#shipping">Shipping &amp; returns</a><a href="/june-and-fern/about/#care">Caring for a print</a><a href="mailto:${esc(s.contact_email || 'hello@juneandfern.com')}">Contact</a></div>
    <div class="f-news"><h4>Letters from the studio</h4><p>Shop updates, new prints, the occasional workshop. A few times a season, never more.</p>
      <form data-subscribe novalidate><label class="sr-only" for="f-email">Email</label><input id="f-email" class="input" type="email" name="email" placeholder="you@somewhere.com" required autocomplete="email"><button class="btn btn-indigo btn-sm" type="submit">Join</button><div class="form-msg" aria-live="polite"></div></form>
    </div>
  </div>
  <div class="wrap footer-bottom"><span>&copy; ${year} June &amp; Fern · ${esc(s.studio_city || 'Northeast Ohio')}</span><a href="https://instagram.com/${esc(ig)}" target="_blank" rel="noopener">${icon('instagram')} @${esc(ig)}</a><span>Made with sun and water</span></div>`;
}

export async function initSite(opts = {}) {
  const header = document.getElementById('site-header');
  if (header) header.innerHTML = headerHTML();
  document.body.insertAdjacentHTML('beforeend', menuHTML());
  initBag(); renderCount();
  markCurrent();
  bindMenu();
  initTransitions();
  initMotion();
  const s = await getSettings();
  const ann = document.querySelector('[data-announce]');
  if (ann && s.announcement) ann.innerHTML = `${icon('moon')}<span>${esc(s.announcement)}</span>`;
  const footer = document.getElementById('site-footer');
  if (footer) { footer.innerHTML = footerHTML(s); bindSubscribe(footer); }
  const ig = document.querySelector('[data-menu-ig]'); if (ig && s.instagram) ig.textContent = s.instagram;
  return { lenis, settings: s };
}

function markCurrent() {
  const here = location.pathname + location.search;
  document.querySelectorAll('.nav a, .menu-links a').forEach((a) => {
    const href = a.getAttribute('href');
    const match = href === here || (href === '/june-and-fern/shop/' && location.pathname.startsWith('/june-and-fern/shop') && !location.search) || (href !== '/' && href.indexOf('?') < 0 && href !== '/june-and-fern/shop/' && location.pathname.startsWith(href));
    if (match) a.setAttribute('aria-current', 'page');
  });
}

function bindMenu() {
  const menu = document.querySelector('[data-menu]');
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-nav-open]')) { menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false'); document.documentElement.classList.add('lenis-stopped'); }
    if (e.target.closest('[data-nav-close]') || (e.target.closest('.menu-links a'))) { menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true'); document.documentElement.classList.remove('lenis-stopped'); }
  });
}

function bindSubscribe(root) {
  const form = root.querySelector('[data-subscribe]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input'), msg = form.querySelector('.form-msg');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value)) { msg.textContent = 'That email does not look right.'; msg.style.color = 'var(--danger)'; return; }
    msg.style.color = ''; msg.textContent = 'Adding you...';
    try { await api.post('/june-and-fern/api/subscribe', { email: input.value.trim() }); msg.textContent = 'You are on the list. Thank you.'; input.value = ''; }
    catch { msg.textContent = 'Could not save that right now. Try again in a moment.'; msg.style.color = 'var(--danger)'; }
  });
}

/* Soft page transitions for internal links. */
function initTransitions() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname && url.hash) return;
    if (a.getAttribute('href').startsWith('#') || url.protocol === 'mailto:') return;
    if (reduced) return;
    e.preventDefault();
    document.body.classList.add('is-leaving');
    setTimeout(() => { location.href = url.href; }, 300);
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted) document.body.classList.remove('is-leaving'); });
}

/* Motion system: Lenis + GSAP when present, CSS-only otherwise. */
function initMotion() {
  const header = document.getElementById('site-header');
  const onScroll = (y) => { if (header) header.classList.toggle('is-scrolled', y > 24); };
  if (!reduced && window.Lenis && G) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', (e) => { onScroll(e.scroll); if (window.ScrollTrigger) window.ScrollTrigger.update(); marqueeVelocity(e.velocity); });
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
    document.documentElement.classList.add('lenis');
  } else {
    addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  }
  if (G && window.ScrollTrigger) G.registerPlugin(window.ScrollTrigger);

  // reveals + develops
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  const observeAll = (root = document) => {
    root.querySelectorAll('[data-reveal-group]').forEach((g) => Array.from(g.children).forEach((c, i) => { if (!c.hasAttribute('data-reveal')) c.setAttribute('data-reveal', ''); c.style.setProperty('--d', `${i * 90}ms`); }));
    root.querySelectorAll('[data-reveal]:not(.is-in), .develop:not(.is-in)').forEach((n) => io.observe(n));
  };
  observeAll();
  window.jfObserve = observeAll;

  // magnetic buttons
  if (G && !reduced && matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest('[data-magnetic]');
      document.querySelectorAll('[data-magnetic].is-mag').forEach((m) => { if (m !== el) { m.classList.remove('is-mag'); G.to(m, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' }); } });
      if (!el) return;
      el.classList.add('is-mag');
      const r = el.getBoundingClientRect();
      G.to(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.28, y: (e.clientY - (r.top + r.height / 2)) * 0.28, duration: 0.5, ease: 'power3.out' });
    });
  }

  // marquees
  document.querySelectorAll('.marquee').forEach(initMarquee);

  // parallax
  if (G && window.ScrollTrigger && !reduced) {
    document.querySelectorAll('[data-parallax]').forEach((el) => {
      const k = parseFloat(el.dataset.parallax) || 0.15;
      G.fromTo(el, { yPercent: k * 60 }, { yPercent: -k * 60, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }
}

const marquees = [];
function initMarquee(m) {
  const track = m.querySelector('.marquee-track');
  if (!track) return;
  track.innerHTML += track.innerHTML; // seamless loop
  if (!G || reduced) { track.style.animation = 'marquee 40s linear infinite'; return; }
  const tween = G.to(track, { xPercent: -50, ease: 'none', duration: 38, repeat: -1 });
  marquees.push({ tween, target: 1 });
  G.ticker.add(() => marquees.forEach((q) => { q.tween.timeScale(G.utils.interpolate(q.tween.timeScale(), q.target, 0.06)); q.target += (1 - q.target) * 0.04; }));
}
function marqueeVelocity(v) {
  const dir = v < 0 ? -1 : 1;
  marquees.forEach((q) => { q.target = dir * Math.min(5, 1 + Math.abs(v) * 0.09); });
}

let toastTimer;
export function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.classList.add('is-on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
}

export function getLenis() { return lenis; }
