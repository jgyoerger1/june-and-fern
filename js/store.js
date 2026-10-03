/* Shopping bag state (localStorage). One-of-one pieces cap at quantity 1. */
const KEY = 'jf.bag.v1';
const listeners = new Set();

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); return s && Array.isArray(s.items) ? s : { items: [], note: '' }; }
  catch { return { items: [], note: '' }; }
}
let state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  listeners.forEach((fn) => fn(state));
}

export const bag = {
  get items() { return state.items; },
  get note() { return state.note || ''; },
  setNote(v) { state.note = v; save(); },
  count() { return state.items.reduce((n, i) => n + i.qty, 0); },
  subtotal() { return state.items.reduce((n, i) => n + i.qty * i.price_cents, 0); },
  has(id) { return state.items.some((i) => i.id === id); },
  find(id) { return state.items.find((i) => i.id === id); },
  add(p, qty = 1) {
    const max = p.one_of_one ? 1 : Math.max(1, p.quantity || 1);
    const existing = state.items.find((i) => i.id === p.id);
    if (existing) existing.qty = Math.min(max, existing.qty + qty);
    else state.items.push({
      id: p.id, slug: p.slug, title: p.title, size: p.size || '', price_cents: p.price_cents,
      image: (p.images && p.images[0] && p.images[0].url) || p.image || '',
      one_of_one: !!p.one_of_one, max, qty: Math.min(max, qty), category: p.category
    });
    save();
  },
  setQty(id, qty) {
    const it = state.items.find((i) => i.id === id);
    if (!it) return;
    it.qty = Math.max(0, Math.min(it.max, qty));
    if (!it.qty) state.items = state.items.filter((i) => i.id !== id);
    save();
  },
  remove(id) { state.items = state.items.filter((i) => i.id !== id); save(); },
  clear() { state.items = []; state.note = ''; save(); },
  patch(id, fields) { const it = state.items.find((i) => i.id === id); if (it) { Object.assign(it, fields); save(); } },
  subscribe(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); }
};

window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); listeners.forEach((fn) => fn(state)); } });
