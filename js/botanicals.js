/* June & Fern - procedural botanical silhouettes + cyanotype scene composer.
   Pure functions returning SVG markup strings. Runs in Node (tools/make-cyanotypes.mjs)
   and in the browser (live hero print, placeholders). Every plant is drawn with its
   base at (0,0) growing toward negative y, so a wrapper can rotate it around the base. */

export function rng(seed) {
  let t = (seed >>> 0) || 1;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${f1(p[0])},${f1(p[1])}`;
const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const qpoint = (a, b, c, t) => { const u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]; };
const qtan = (a, b, c, t) => [2 * (1 - t) * (b[0] - a[0]) + 2 * t * (c[0] - b[0]), 2 * (1 - t) * (b[1] - a[1]) + 2 * t * (c[1] - b[1])];
const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];

export function circle(cx, cy, r) {
  return `M${f1(cx - r)},${f1(cy)}a${f1(r)},${f1(r)} 0 1,0 ${f1(2 * r)},0a${f1(r)},${f1(r)} 0 1,0 ${f1(-2 * r)},0Z`;
}

/* Closed polygon that follows a quadratic curve with a width profile. widthAt(t) -> full width. */
function ribbon(a, b, c, widthAt, steps = 12) {
  const L = [], R = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = qpoint(a, b, c, t), tg = norm(qtan(a, b, c, t)), n = [-tg[1], tg[0]];
    const w = widthAt(t) / 2;
    L.push([p[0] + n[0] * w, p[1] + n[1] * w]);
    R.push([p[0] - n[0] * w, p[1] - n[1] * w]);
  }
  return 'M' + L.map(pt).join('L') + 'L' + R.reverse().map(pt).join('L') + 'Z';
}
const stem = (a, b, c, w0, w1, steps = 12) => ribbon(a, b, c, (t) => w0 + (w1 - w0) * t, steps);

/* One leaflet (pinna) with lobed edges, drawn from base along dir. */
function pinna(base, dir, len, wmax, lobes, r) {
  const n = [-dir[1], dir[0]];
  const steps = Math.max(6, lobes * 2);
  const up = [], dn = [];
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const p = [base[0] + dir[0] * len * s, base[1] + dir[1] * len * s];
    const env = Math.pow(1 - s, 0.8) * Math.min(1, 0.25 + s * 5);
    const lobe = 0.38 + 0.62 * Math.pow(Math.abs(Math.sin(Math.PI * s * lobes)), 0.5);
    const w = wmax * env * lobe * (0.95 + r() * 0.1);
    up.push([p[0] + n[0] * w, p[1] + n[1] * w]);
    dn.push([p[0] - n[0] * w, p[1] - n[1] * w]);
  }
  const tip = [base[0] + dir[0] * len * 1.04, base[1] + dir[1] * len * 1.04];
  return 'M' + pt(base) + 'L' + up.map(pt).join('L') + 'L' + pt(tip) + 'L' + dn.reverse().map(pt).join('L') + 'Z';
}

/* Fern frond. length in px, pinnae = pairs of leaflets. */
export function fern(r, o = {}) {
  const L = o.length ?? 300, pairs = o.pinnae ?? 20, curl = o.curl ?? 0.2, wid = o.width ?? 0.42;
  const a = [0, 0], c = [curl * L, -L], b = [(r() - 0.5) * 0.3 * L, -L * 0.55];
  let d = stem(a, b, c, Math.max(2, L * 0.016), 0.9, 16);
  const spacing = (L * 0.9) / pairs;              // distance between neighbouring pinnae on one side
  for (let i = 0; i < pairs; i++) {
    for (const side of [-1, 1]) {
      const t = 0.07 + ((i + (side > 0 ? 0.5 : 0)) / pairs) * 0.9;
      if (t > 0.985) continue;
      const base = qpoint(a, b, c, t), tg = norm(qtan(a, b, c, t));
      const env = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.95);
      const len = L * wid * env * (0.9 + r() * 0.2);
      if (len < 4) continue;
      const dir = rot(tg, side * (56 + r() * 12) * Math.PI / 180);
      const lobes = Math.max(4, Math.round(len / 6.5));
      const wmax = Math.min(len * 0.17, spacing * 0.8);  // keep daylight between leaflets
      d += pinna(base, dir, len, wmax, lobes, r);
    }
  }
  return d;
}

/* Queen Anne's lace / wild carrot: stem + fan of rays ending in floret clusters. */
export function umbel(r, o = {}) {
  const L = o.length ?? 260, rays = o.rays ?? 15, spread = o.spread ?? 1;
  const a = [0, 0], c = [(r() - 0.5) * 0.16 * L, -L], b = [(r() - 0.5) * 0.3 * L, -L * 0.5];
  let d = stem(a, b, c, L * 0.013, L * 0.006, 10);
  const top = c, R = L * 0.4 * spread;
  for (let i = 0; i < rays; i++) {
    const k = i / (rays - 1) - 0.5;
    const ang = -Math.PI / 2 + k * Math.PI * 0.92 * spread;
    const rl = R * (0.82 + r() * 0.3);
    const end = [top[0] + Math.cos(ang) * rl, top[1] + Math.sin(ang) * rl];
    const mid = [(top[0] + end[0]) / 2 + (r() - 0.5) * 6, (top[1] + end[1]) / 2 - rl * 0.16];
    d += stem(top, mid, end, L * 0.006, L * 0.004, 6);
    const n = 6 + Math.floor(r() * 5), cr = L * 0.011;
    for (let q = 0; q < n; q++) {
      const aa = r() * Math.PI * 2, rr = Math.sqrt(r()) * L * 0.03;
      d += circle(end[0] + Math.cos(aa) * rr, end[1] + Math.sin(aa) * rr, cr * (0.6 + r() * 0.7));
    }
  }
  // a few bracts under the head
  for (let i = 0; i < 5; i++) {
    const ang = Math.PI / 2 + (i / 4 - 0.5) * 1.6;
    const e = [top[0] + Math.cos(ang) * L * 0.1, top[1] + Math.sin(ang) * L * 0.1 + L * 0.02];
    d += stem(top, [(top[0] + e[0]) / 2, (top[1] + e[1]) / 2], e, L * 0.008, 0.4, 4);
  }
  return d;
}

/* Grasses: blades with the odd foxtail seed head. */
export function grass(r, o = {}) {
  const L = o.length ?? 300, blades = o.blades ?? 6;
  let d = '';
  for (let i = 0; i < blades; i++) {
    const bl = L * (0.5 + r() * 0.5), lean = (r() - 0.5) * 1.1;
    const a = [(r() - 0.5) * L * 0.1, 0], c = [lean * bl * 0.6, -bl], b = [lean * bl * 0.1, -bl * 0.55];
    d += stem(a, b, c, L * 0.02, 0.6, 14);
    if (r() < 0.55) {
      const tg = norm(qtan(a, b, c, 1)), hl = bl * 0.2, wmax = L * 0.045;
      const e = [c[0] + tg[0] * hl, c[1] + tg[1] * hl], m = [c[0] + tg[0] * hl * 0.5, c[1] + tg[1] * hl * 0.5];
      let k = 0;
      d += ribbon(c, m, e, (t) => wmax * Math.pow(Math.sin(Math.PI * t), 0.6) * (0.55 + 0.45 * ((k++) % 2)), 22);
    }
  }
  return d;
}

/* Cosmos: stem, thread-like leaves, eight notched petals. */
export function cosmos(r, o = {}) {
  const L = o.length ?? 280, petals = o.petals ?? 8;
  const a = [0, 0], c = [(r() - 0.5) * 0.25 * L, -L], b = [(r() - 0.5) * 0.4 * L, -L * 0.5];
  let d = stem(a, b, c, L * 0.012, L * 0.006, 10);
  for (let i = 0; i < 3; i++) {
    const t = 0.2 + i * 0.22, base = qpoint(a, b, c, t), tg = norm(qtan(a, b, c, t));
    const dir = rot(tg, (i % 2 ? 1 : -1) * 1.1), len = L * 0.22;
    for (let k = 0; k < 4; k++) {
      const dk = rot(dir, (k - 1.5) * 0.35), e = [base[0] + dk[0] * len * (0.6 + r() * 0.5), base[1] + dk[1] * len * (0.6 + r() * 0.5)];
      d += stem(base, [(base[0] + e[0]) / 2, (base[1] + e[1]) / 2], e, L * 0.006, 0.3, 5);
    }
  }
  const R = L * 0.2, h = c;
  for (let i = 0; i < petals; i++) {
    const ang = (i / petals) * Math.PI * 2 + r() * 0.12, pl = R * (0.9 + r() * 0.2), pw = R * 0.56;
    const dir = [Math.cos(ang), Math.sin(ang)], n = [-dir[1], dir[0]];
    const tip = [h[0] + dir[0] * pl, h[1] + dir[1] * pl], mid = [h[0] + dir[0] * pl * 0.55, h[1] + dir[1] * pl * 0.55];
    const l1 = [mid[0] + n[0] * pw * 0.55, mid[1] + n[1] * pw * 0.55], r1 = [mid[0] - n[0] * pw * 0.55, mid[1] - n[1] * pw * 0.55];
    const tl = [tip[0] + n[0] * pw * 0.26, tip[1] + n[1] * pw * 0.26], tr = [tip[0] - n[0] * pw * 0.26, tip[1] - n[1] * pw * 0.26];
    const notch = [tip[0] - dir[0] * pw * 0.14, tip[1] - dir[1] * pw * 0.14];
    d += `M${pt(h)}Q${pt(l1)} ${pt(tl)}L${pt(notch)}L${pt(tr)}Q${pt(r1)} ${pt(h)}Z`;
  }
  d += circle(h[0], h[1], R * 0.24);
  return d;
}

/* Maple leaf on a petiole. size = tip radius. */
export function maple(r, o = {}) {
  const S = o.size ?? 150;
  const lobes = [[-170, 0.62], [-130, 0.86], [-90, 1], [-50, 0.86], [-10, 0.62]];
  const sinus = 0.42, half = 16, pts = [];
  const P = (deg, rad) => [Math.cos(deg * Math.PI / 180) * S * rad, Math.sin(deg * Math.PI / 180) * S * rad - S * 1.05];
  pts.push(P(-190, 0.18));
  lobes.forEach(([ang, len], i) => {
    if (i > 0) pts.push(P(ang - 20, sinus * (0.9 + r() * 0.2)));
    pts.push(P(ang - half, len * 0.66), P(ang - half * 0.5, len * 0.8), P(ang, len * (0.97 + r() * 0.06)), P(ang + half * 0.5, len * 0.8), P(ang + half, len * 0.66));
  });
  pts.push(P(10, 0.18));
  let d = 'M' + pts.map(pt).join('L') + 'Z';
  d += stem([0, 0], [S * 0.03, -S * 0.5], [0, -S * 1.05 + S * 0.1], S * 0.04, S * 0.02, 6);
  return d;
}

/* Yarrow: flat-topped cluster of tiny flowers above feathery leaves. */
export function yarrow(r, o = {}) {
  const L = o.length ?? 280;
  const a = [0, 0], c = [(r() - 0.5) * 0.1 * L, -L], b = [(r() - 0.5) * 0.2 * L, -L * 0.5];
  let d = stem(a, b, c, L * 0.014, L * 0.007, 10);
  for (let i = 0; i < 2; i++) {
    const t = 0.18 + i * 0.2, base = qpoint(a, b, c, t);
    const sub = rng(Math.floor(r() * 1e9));
    const g = fern(sub, { length: L * 0.3, pinnae: 10, width: 0.3, curl: (i % 2 ? -1 : 1) * 0.9 });
    d += translatePath(g, base, (i % 2 ? -1 : 1) * 70);
  }
  const W = L * 0.36, top = c;
  for (let i = 0; i < 9; i++) {
    const k = i / 8 - 0.5, e = [top[0] + k * W * 2, top[1] - L * 0.06 + Math.abs(k) * L * 0.05];
    d += stem(top, [(top[0] + e[0]) / 2, e[1] + L * 0.04], e, L * 0.006, L * 0.004, 5);
    for (let q = 0; q < 7; q++) {
      const aa = r() * Math.PI * 2, rr = Math.sqrt(r()) * L * 0.035;
      d += circle(e[0] + Math.cos(aa) * rr, e[1] + Math.sin(aa) * rr, L * 0.012 * (0.7 + r() * 0.6));
    }
  }
  return d;
}

/* Small five-petal flower sprig (the logo's wildflowers). */
export function sprig(r, o = {}) {
  const L = o.length ?? 160, heads = o.heads ?? 3;
  const a = [0, 0], c = [(r() - 0.5) * 0.3 * L, -L], b = [(r() - 0.5) * 0.4 * L, -L * 0.5];
  let d = stem(a, b, c, L * 0.02, L * 0.008, 10);
  const flower = (cx, cy, R) => {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2, dir = [Math.cos(ang), Math.sin(ang)], n = [-dir[1], dir[0]];
      const tip = [cx + dir[0] * R, cy + dir[1] * R], m = [cx + dir[0] * R * 0.55, cy + dir[1] * R * 0.55];
      s += `M${pt([cx, cy])}Q${pt([m[0] + n[0] * R * 0.5, m[1] + n[1] * R * 0.5])} ${pt(tip)}Q${pt([m[0] - n[0] * R * 0.5, m[1] - n[1] * R * 0.5])} ${pt([cx, cy])}Z`;
    }
    return s + circle(cx, cy, R * 0.22);
  };
  for (let i = 0; i < heads; i++) {
    const t = 0.45 + (i / Math.max(1, heads - 1)) * 0.5, base = qpoint(a, b, c, t), tg = norm(qtan(a, b, c, t));
    const dir = rot(tg, (i % 2 ? 1 : -1) * 0.9), len = L * (i === heads - 1 ? 0.08 : 0.26);
    const e = [base[0] + dir[0] * len, base[1] + dir[1] * len];
    d += stem(base, [(base[0] + e[0]) / 2, (base[1] + e[1]) / 2], e, L * 0.012, L * 0.006, 4);
    d += flower(e[0], e[1], L * (0.09 + r() * 0.04));
  }
  for (let i = 0; i < 3; i++) {
    const t = 0.2 + i * 0.12, base = qpoint(a, b, c, t), tg = norm(qtan(a, b, c, t));
    const dir = rot(tg, (i % 2 ? 1 : -1) * 1.2), e = [base[0] + dir[0] * L * 0.14, base[1] + dir[1] * L * 0.14];
    d += ribbon(base, [(base[0] + e[0]) / 2, (base[1] + e[1]) / 2], e, (s) => L * 0.07 * Math.sin(Math.PI * s), 8);
  }
  return d;
}

/* Crescent moon, centred at (0,0). */
export function moon(R = 40, k = 1.3) {
  // Outer half circle on the right, inner shallower arc also bulging right: a crescent lit on the right.
  return `M0,${f1(-R)}A${f1(R)},${f1(R)} 0 0,1 0,${f1(R)}A${f1(R * k)},${f1(R * k)} 0 0,0 0,${f1(-R)}Z`;
}

/* Translate (and optionally rotate, degrees) every coordinate pair of a path string. Used to compose plants. */
export function translatePath(d, [tx, ty], deg = 0) {
  const a = deg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
  return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, x, y) => {
    x = +x; y = +y;
    const rx = x * cs - y * sn, ry = x * sn + y * cs;
    return `${f1(rx + tx)},${f1(ry + ty)}`;
  });
}

export const PLANTS = { fern, umbel, grass, cosmos, maple, yarrow, sprig };

export const TONES = {
  blue: { paper: '#F1ECE0', ink: '#1E4068', deep: '#14304F', glow: '#2C5A8C', silhouette: '#F3EEE2' },
  brown: { paper: '#F0E7D7', ink: '#5B4130', deep: '#3C2A1D', glow: '#7A5A41', silhouette: '#F2E9D9' },
  fern: { paper: '#F1ECE0', ink: '#2E4A3A', deep: '#1F3328', glow: '#43665A', silhouette: '#F3EEE2' }
};

/* Compose a finished print.
   plants: [{ type, x, y, scale, rot, seed, opts }] positioned on a width x height sheet.
   Returns SVG markup. Groups carry class="plant" / class="sway" for live animation. */
export function scene(o = {}) {
  const { seed = 1, width = 900, height = 1125, tone = 'blue', plants = [], texture = true, border = 0.045, id = 'c' + seed, label = '', live = false } = o;
  const T = TONES[tone] || TONES.blue;
  const r = rng(seed);
  const bx = width * border, by = height * border;
  const defs = `
  <defs>
    <filter id="${id}-wash" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="${(0.004 * 900 / width).toFixed(4)} ${(0.004 * 1125 / height).toFixed(4)}" numOctaves="3" seed="${seed}" result="low"/>
      <feDisplacementMap in="SourceGraphic" in2="low" scale="${Math.round(width * 0.03)}" xChannelSelector="R" yChannelSelector="G" result="rough"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="4" seed="${seed + 7}" result="mottle"/>
      <feColorMatrix in="mottle" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" result="mottleA"/>
      <feComposite in="mottleA" in2="rough" operator="in" result="mottleClip"/>
      <feBlend in="rough" in2="mottleClip" mode="multiply"/>
    </filter>
    <filter id="${id}-grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed + 3}"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <filter id="${id}-soft" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="${(width / 1400).toFixed(2)}"/>
    </filter>
    <filter id="${id}-halo" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${(width / 90).toFixed(1)}"/>
    </filter>
    <radialGradient id="${id}-vig" cx="50%" cy="45%" r="75%">
      <stop offset="0" stop-color="${T.glow}" stop-opacity="0.35"/>
      <stop offset="0.55" stop-color="${T.ink}" stop-opacity="0"/>
      <stop offset="1" stop-color="${T.deep}" stop-opacity="0.75"/>
    </radialGradient>
  </defs>`;
  const plantMarkup = plants.map((p, i) => {
    const fn = PLANTS[p.type] || fern;
    const pr = rng((p.seed ?? (seed * 31 + i * 17)) >>> 0);
    const d = fn(pr, p.opts || {});
    const tr = `translate(${f1(p.x)} ${f1(p.y)}) rotate(${f1(p.rot || 0)}) scale(${f1(p.scale || 1)})`;
    const amp = (0.5 + r() * 1.3).toFixed(2), dur = (3.6 + r() * 2.4).toFixed(2), delay = (-r() * 6).toFixed(2);
    const depth = (p.scale || 1);
    return `<g class="plant" data-i="${i}" data-depth="${f1(depth)}" transform="${tr}"><g class="gust"><g class="sway" style="--amp:${amp}deg;--dur:${dur}s;--delay:${delay}s"><path d="${d}"/></g></g></g>`;
  }).join('\n');
  const washAttrs = texture ? `filter="url(#${id}-wash)"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${label || 'Cyanotype print'}" class="cyano cyano-${tone}">
  ${defs}
  <rect class="paper" width="${width}" height="${height}" fill="${T.paper}"/>
  <rect class="wash" x="${f1(bx)}" y="${f1(by)}" width="${f1(width - bx * 2)}" height="${f1(height - by * 2)}" fill="${T.ink}" ${washAttrs}/>
  <rect class="vignette" x="${f1(bx)}" y="${f1(by)}" width="${f1(width - bx * 2)}" height="${f1(height - by * 2)}" fill="url(#${id}-vig)"/>
  <g class="halo" fill="${T.silhouette}" opacity="0.28" filter="url(#${id}-halo)">${plantMarkup}</g>
  <g class="plants" fill="${T.silhouette}" opacity="0.96" filter="url(#${id}-soft)">${plantMarkup}</g>
  ${texture ? `<rect class="grain" width="${width}" height="${height}" filter="url(#${id}-grain)" opacity="0.13" style="mix-blend-mode:multiply"/>` : ''}
</svg>`;
}
