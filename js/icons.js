/* Inline icon set (Phosphor-style, 1.5px strokes). Each returns an SVG string. */
const wrap = (inner, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ${extra}>${inner}</svg>`;

export const icons = {
  bag: () => wrap('<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  arrow: () => wrap('<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>'),
  arrowUpRight: () => wrap('<path d="M7 17L17 7"/><path d="M9 7h8v8"/>'),
  close: () => wrap('<path d="M6 6l12 12"/><path d="M18 6L6 18"/>'),
  menu: () => wrap('<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>'),
  plus: () => wrap('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  minus: () => wrap('<path d="M5 12h14"/>'),
  check: () => wrap('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  chevron: () => wrap('<path d="M6 9l6 6 6-6"/>'),
  instagram: () => wrap('<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.5"/><circle cx="17" cy="7" r="0.6" fill="currentColor"/>'),
  mail: () => wrap('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
  sun: () => wrap('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  drop: () => wrap('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
  leaf: () => wrap('<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z"/><path d="M5 19l8-8"/>'),
  moon: () => wrap('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  ruler: () => wrap('<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3"/>'),
  truck: () => wrap('<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.5"/><circle cx="17" cy="17.5" r="1.5"/>'),
  box: () => wrap('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5"/><path d="M12 12v9"/>'),
  home: () => wrap('<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>'),
  lock: () => wrap('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  search: () => wrap('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'),
  image: () => wrap('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/>'),
  trash: () => wrap('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>'),
  edit: () => wrap('<path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M13 7l4 4"/>'),
  spark: () => wrap('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/>'),
  external: () => wrap('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>')
};

export const icon = (name) => (icons[name] || icons.spark)();
