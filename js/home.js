/* Home: cyanotype intro -> live hero print, featured pieces, process scrolltelling. */
import { initSite } from './site.js';
import { api, money, esc, isBuyable, getSettings } from './api.js';
import { cardHTML, skeletonHTML, bindQuickAdd } from './cards.js';
import { PLANTS, moon, rng, TONES } from './botanicals.js';

const G = window.gsap;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).get('motion') === '0';
const T = TONES.blue;

/* ---------------- Hero print composition ---------------- */
function plantMarkup(plants, seed = 3) {
  const r = rng(seed);
  return plants.map((p, i) => {
    const fn = PLANTS[p.type] || PLANTS.fern;
    const d = p.type === 'moon' ? moon(p.opts.R, p.opts.k) : fn(rng((seed * 31 + i * 17) >>> 0), p.opts || {});
    const tr = `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(p.rot || 0).toFixed(1)}) scale(${(p.scale || 1).toFixed(3)})`;
    const amp = (0.5 + r() * 1.3).toFixed(2), dur = (3.6 + r() * 2.4).toFixed(2), delay = (-r() * 6).toFixed(2);
    return `<g class="plant ${p.type === 'moon' ? 'is-moon' : ''}" data-depth="${(p.depth || 1).toFixed(2)}" transform="${tr}"><g class="gust"><g class="sway" style="--amp:${p.type === 'moon' ? 0 : amp}deg;--dur:${dur}s;--delay:${delay}s"><path d="${d}"/></g></g></g>`;
  }).join('');
}

/* Plants placed relative to the panel rect R (screen px) plus extras that only show during the intro. */
function heroPlants(R, W, H) {
  const u = R.h / 1125; // scale so the composition matches the 4:5 demo prints
  const inside = [
    { type: 'grass', x: R.x + R.w * 0.22, y: R.y + R.h * 0.995, scale: 2.0 * u, rot: -5, opts: { blades: 5 }, depth: 0.6 },
    { type: 'umbel', x: R.x + R.w * 0.27, y: R.y + R.h * 0.99, scale: 2.35 * u, rot: -6, opts: { rays: 15 }, depth: 0.8 },
    { type: 'fern', x: R.x + R.w * 0.5, y: R.y + R.h * 0.985, scale: 2.5 * u, rot: -6, opts: { length: 300, pinnae: 22, curl: 0.16 }, depth: 1.0 },
    { type: 'fern', x: R.x + R.w * 0.8, y: R.y + R.h * 1.0, scale: 1.65 * u, rot: 13, opts: { length: 300, pinnae: 17, curl: -0.28 }, depth: 1.25 },
    { type: 'sprig', x: R.x + R.w * 0.9, y: R.y + R.h * 0.99, scale: 1.3 * u, rot: 16, opts: { heads: 3 }, depth: 1.4 },
    { type: 'moon', x: R.x + R.w * 0.82, y: R.y + R.h * 0.15, scale: 1, rot: 18, opts: { R: 46 * u, k: 1.35 }, depth: 0.3 }
  ];
  const v = H / 1125;
  const extras = [
    { type: 'fern', x: W * 0.12, y: H * 1.02, scale: 2.6 * v, rot: -14, opts: { length: 300, pinnae: 22, curl: 0.3 } },
    { type: 'umbel', x: W * 0.3, y: H * 1.03, scale: 2.4 * v, rot: 4, opts: { rays: 16 } },
    { type: 'grass', x: W * 0.4, y: H * 1.02, scale: 2.2 * v, rot: 6, opts: { blades: 6 } },
    { type: 'cosmos', x: W * 0.22, y: H * 1.0, scale: 1.6 * v, rot: 8 },
    { type: 'fern', x: W * 0.02, y: H * 0.55, scale: 1.7 * v, rot: 70, opts: { length: 300, pinnae: 18, curl: 0.2 } }
  ];
  return { inside, extras };
}

function motesMarkup(R, n = 16, seed = 8) {
  const r = rng(seed);
  let s = '<g class="motes" fill="#F3EEE2">';
  for (let i = 0; i < n; i++) {
    const x = R.x + r() * R.w, y = R.y + R.h * (0.3 + r() * 0.7), rad = (0.8 + r() * 1.6) * (R.h / 900);
    s += `<circle class="mote" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" style="--dur:${(7 + r() * 9).toFixed(1)}s;--delay:${(-r() * 12).toFixed(1)}s;--dx:${((r() - 0.5) * 60).toFixed(0)}px;--dy:${(-(80 + r() * 160)).toFixed(0)}px;--o:${(0.25 + r() * 0.45).toFixed(2)}"/>`;
  }
  return s + '</g>';
}

function printSVG({ viewBox, plants, motes, id, soft, live }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="${live ? 'xMidYMid slice' : 'none'}" class="cyano cyano-blue ${live ? 'is-live' : ''}" aria-hidden="true">
    <defs>
      <filter id="${id}-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${soft}"/></filter>
      <filter id="${id}-halo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${soft * 14}"/></filter>
    </defs>
    <g class="halo" fill="${T.silhouette}" opacity="0.26" filter="url(#${id}-halo)">${plants}</g>
    <g class="plants" fill="${T.silhouette}" opacity="0.96" filter="url(#${id}-soft)">${plants}</g>
    ${motes || ''}
  </svg>`;
}

/* ---------------- WebGL blue wash ---------------- */
const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uTime;uniform float uProgress;uniform vec2 uOffset;uniform vec2 uScale;uniform float uAspect;uniform float uVignette;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(17.,9.);a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec2 p=uv*uScale+uOffset; p.x*=uAspect;
  float t=uTime*0.018;
  float wash=fbm(p*2.4+vec2(t,-t*0.6));
  float fine=fbm(p*9.0+vec2(3.1,1.7)+t*0.3);
  float field=wash*0.72+fine*0.28;
  float edge=smoothstep(uProgress*1.3-0.3,uProgress*1.3+0.04,field);
  float amt=clamp((1.0-edge)*0.85+uProgress*0.3,0.,1.)*smoothstep(0.,0.12,uProgress);
  vec3 paper=vec3(0.98,0.973,0.949);
  vec3 blueA=vec3(0.118,0.251,0.408);
  vec3 blueB=vec3(0.075,0.18,0.3);
  vec3 glow=vec3(0.19,0.37,0.56);
  vec3 blue=mix(blueB,blueA,wash);
  blue=mix(blue,glow,pow(fine,3.0)*0.45);
  vec3 col=mix(paper,blue,amt);
  vec2 q=uv-0.5; float vig=smoothstep(0.9,0.25,length(q*vec2(1.0,0.85)));
  col=mix(col,col*0.72,(1.0-vig)*uVignette*amt);
  col+=(hash(gl_FragCoord.xy+uTime)-0.5)*0.025*amt;
  gl_FragColor=vec4(col,1.0);
}`;

function makeWash(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uRes', 'uTime', 'uProgress', 'uOffset', 'uScale', 'uAspect', 'uVignette'].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
  const state = { progress: 0, offset: [0, 0], scale: [1, 1], aspect: 1, vignette: 0, dpr: Math.min(1.5, devicePixelRatio || 1), fps: 60, last: 0, raf: 0, running: true };
  const start = performance.now();
  function resize() {
    const w = Math.max(1, Math.round(canvas.clientWidth * state.dpr)), h = Math.max(1, Math.round(canvas.clientHeight * state.dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  function frame(now) {
    if (!state.running) return;
    state.raf = requestAnimationFrame(frame);
    if (now - state.last < 1000 / state.fps) return;
    state.last = now;
    resize();
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, (now - start) / 1000);
    gl.uniform1f(U.uProgress, state.progress);
    gl.uniform2f(U.uOffset, state.offset[0], state.offset[1]);
    gl.uniform2f(U.uScale, state.scale[0], state.scale[1]);
    gl.uniform1f(U.uAspect, state.aspect);
    gl.uniform1f(U.uVignette, state.vignette);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  state.raf = requestAnimationFrame(frame);
  return { state, stop() { state.running = false; cancelAnimationFrame(state.raf); } };
}

/* ---------------- Intro + hero ---------------- */
function setupHero() {
  const panel = document.querySelector('[data-hero-print]');
  if (!panel) return;
  const seen = sessionStorage.getItem('jf.intro') === '1' && !location.search.includes('intro=1');
  const W = Math.max(innerWidth || 0, document.documentElement.clientWidth || 0) || 1280;
  const H = Math.max(innerHeight || 0, document.documentElement.clientHeight || 0) || 800;
  const Rr = panel.getBoundingClientRect();
  const R = { x: Rr.left, y: Rr.top, w: Rr.width, h: Rr.height };
  const { inside, extras } = heroPlants(R, W, H);
  const soft = Math.max(0.4, R.h / 1400);
  const insideMarkup = plantMarkup(inside, 3);
  const motes = motesMarkup(R);

  // the panel's own print (viewBox = the panel rect, so it matches the intro pixel for pixel)
  const svgWrap = document.createElement('div');
  svgWrap.className = 'print-svg';
  svgWrap.innerHTML = printSVG({ viewBox: `${R.x} ${R.y} ${R.w} ${R.h}`, plants: insideMarkup, motes, id: 'hp', soft, live: true });
  const canvas = document.createElement('canvas');
  canvas.className = 'print-canvas';

  const wantIntro = !seen && !reduced && G && R.w > 120 && R.h > 120;
  let wash = null;

  const finishPanel = () => {
    panel.prepend(svgWrap);
    panel.prepend(canvas);
    if (wash) {
      wash.state.offset = [R.x / W, 1 - (R.y + R.h) / H];
      wash.state.scale = [R.w / W, R.h / H];
      wash.state.aspect = W / H;
      wash.state.vignette = 1;
      wash.state.fps = 30;
    } else {
      panel.style.background = `radial-gradient(120% 80% at 30% 20%, ${T.glow} 0%, ${T.ink} 45%, ${T.deep} 100%)`;
    }
    livePrint(svgWrap.querySelector('svg'), panel);
  };

  if (!wantIntro) {
    document.body.classList.add('intro-done');
    wash = makeWash(canvas);
    if (wash) { wash.state.progress = 0; }
    finishPanel();
    if (wash && G && !reduced) G.to(wash.state, { progress: 1, duration: 1.8, ease: 'power2.inOut', delay: 0.2 });
    else if (wash) wash.state.progress = 1;
    return;
  }

  // Full-screen intro: soft white sheet -> blue develops -> sheet settles into the hero frame.
  document.body.classList.add('has-intro');
  const intro = document.createElement('div');
  intro.className = 'intro';
  intro.innerHTML = `<div class="intro-svg">${printSVG({ viewBox: `0 0 ${W} ${H}`, plants: insideMarkup + plantMarkup(extras, 21), id: 'ip', soft, live: false })}</div><img class="intro-logo" src="/june-and-fern/img/brand/lockup-light.png" alt=""><button class="intro-skip" type="button">Skip</button>`;
  intro.prepend(canvas);
  document.body.append(intro);
  wash = makeWash(canvas);
  if (wash) { wash.state.aspect = W / H; }

  const tl = G.timeline({ defaults: { ease: 'power2.inOut' } });
  let done = false;
  const complete = () => {
    if (done) return; done = true;
    sessionStorage.setItem('jf.intro', '1');
    document.body.classList.remove('has-intro');
    document.body.classList.add('intro-done');
    finishPanel();
    intro.remove();
    if (window.jfObserve) window.jfObserve();
  };
  tl.add(() => intro.classList.add('is-developing'), 0.15);
  tl.fromTo(intro.querySelector('.intro-logo'), { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out' }, 0);
  tl.to(intro.querySelector('.intro-logo'), { opacity: 0, scale: 1.03, duration: 1.1, ease: 'power2.inOut' }, 1.1);
  if (wash) tl.to(wash.state, { progress: 1, duration: 2.2, ease: 'power2.inOut' }, 0.5);
  else tl.to(intro, { backgroundColor: '#1E4068', duration: 1.4 }, 0.2);
  tl.to({}, { duration: 0.55 });
  tl.add(() => { document.body.classList.add('intro-done'); }, '>-0.1');
  tl.to(intro, {
    clipPath: `inset(${R.y}px ${W - R.x - R.w}px ${H - R.y - R.h}px ${R.x}px)`,
    duration: 1.25, ease: 'expo.inOut'
  }, '<');
  tl.add(complete, '>-0.02');
  const skip = () => { tl.progress(1); complete(); };
  intro.querySelector('.intro-skip').addEventListener('click', skip);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') skip(); }, { once: true });
  setTimeout(() => { if (!done) complete(); }, 7000); // belt and braces
}

/* Breathing print: sway via CSS, gusts + pointer parallax via GSAP. */
function livePrint(svg, panel) {
  if (!svg || reduced) return;
  const plants = Array.from(svg.querySelectorAll('.plants .plant, .halo .plant'));
  if (G) {
    const gust = () => {
      const strength = (Math.random() * 2.4 + 1.2) * (Math.random() < 0.5 ? -1 : 1);
      svg.style.setProperty('--gust', strength.toFixed(2) + 'deg');
      setTimeout(() => svg.style.setProperty('--gust', '0deg'), 1900);
      setTimeout(gust, 6000 + Math.random() * 7000);
    };
    setTimeout(gust, 2500);
    if (matchMedia('(hover: hover)').matches) {
      const movers = plants.map((el) => ({ x: G.quickTo(el, 'x', { duration: 1.2, ease: 'power3.out' }), y: G.quickTo(el, 'y', { duration: 1.2, ease: 'power3.out' }), d: parseFloat(el.dataset.depth) || 1 }));
      panel.addEventListener('pointermove', (e) => {
        const r = panel.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        movers.forEach((m) => { m.x(nx * 14 * m.d); m.y(ny * 10 * m.d); });
      });
      panel.addEventListener('pointerleave', () => movers.forEach((m) => { m.x(0); m.y(0); }));
    }
  }
}

/* ---------------- Products ---------------- */
async function loadProducts() {
  const grid = document.querySelector('[data-featured]');
  grid.innerHTML = skeletonHTML(4);
  let products = [];
  try { ({ products } = await api.get('/june-and-fern/api/products')); }
  catch { grid.innerHTML = `<div class="empty"><h3>The shop is resting</h3><p>We could not load the listings just now. Try again in a moment.</p></div>`; return; }
  const avail = products.filter(isBuyable);
  const featured = [...avail.filter((p) => p.featured), ...avail.filter((p) => !p.featured)].slice(0, 4);
  const pick = featured.length ? featured : products.slice(0, 4);
  grid.innerHTML = pick.length ? pick.map(cardHTML).join('') : `<div class="empty"><h3>Nothing listed right now</h3><p>The next shop update is coming. Join the letter below to hear first.</p></div>`;
  bindQuickAdd(grid, products);
  if (window.jfObserve) window.jfObserve(grid);
  // category counts
  for (const c of ['cyanotype', 'vintage', 'goods']) {
    const n = products.filter((p) => p.category === c && p.status === 'available').length;
    const el = document.querySelector(`[data-count="${c}"]`);
    if (el) { el.firstChild.textContent = String(n); el.querySelector('small').textContent = n === 1 ? 'piece' : 'pieces'; }
  }
  // hero tag
  const tag = document.querySelector('[data-hero-tag]');
  const star = pick.find(isBuyable);
  if (tag && star) {
    tag.href = `/june-and-fern/shop/${star.slug}`;
    tag.querySelector('[data-tag-img]').src = star.images && star.images[0] ? star.images[0].url : '';
    tag.querySelector('[data-tag-title]').textContent = star.size ? `${star.title} | ${star.size}` : star.title;
    tag.querySelector('[data-tag-price]').textContent = money(star.price_cents) + (star.one_of_one ? ' · One of one' : '');
    tag.hidden = false;
    if (G && !reduced) G.from(tag, { y: 24, opacity: 0, duration: 1.1, ease: 'power3.out', delay: 0.4 });
  }
}

/* ---------------- Process scrolltelling ---------------- */
function setupProcess() {
  const stage = document.querySelector('[data-stage]');
  if (!stage) return;
  const S = 1000, r = rng(77);
  const strokes = Array.from({ length: 7 }, (_, i) => { const y = 150 + i * 100; return `M${120 + (r() - 0.5) * 30},${y + (r() - 0.5) * 16} C 360,${y - 18 + r() * 30} 640,${y + 18 - r() * 30} ${880 + (r() - 0.5) * 30},${y + (r() - 0.5) * 16}`; });
  const plantDefs = [
    { type: 'fern', x: 420, y: 790, scale: 1.75, rot: -8, opts: { length: 300, pinnae: 20 } },
    { type: 'umbel', x: 640, y: 800, scale: 1.65, rot: 7, opts: { rays: 14 } },
    { type: 'grass', x: 300, y: 810, scale: 1.4, rot: -4, opts: { blades: 4 } }
  ];
  const plantPaths = plantDefs.map((p, i) => `<path d="${(PLANTS[p.type])(rng(100 + i), p.opts)}" transform="translate(${p.x} ${p.y}) rotate(${p.rot}) scale(${p.scale})"/>`).join('');
  stage.insertAdjacentHTML('afterbegin', `
  <svg viewBox="0 0 ${S} ${S}" class="process-svg" aria-hidden="true">
    <defs>
      <filter id="pr-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="14"/></filter>
      <filter id="pr-soft"><feGaussianBlur stdDeviation="0.7"/></filter>
      <filter id="pr-shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="6" dy="10" stdDeviation="6" flood-color="#1F2622" flood-opacity="0.35"/></filter>
      <clipPath id="pr-sheet"><rect x="90" y="90" width="820" height="820"/></clipPath>
      <radialGradient id="pr-sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFF4D6"/><stop offset="0.5" stop-color="#F2D08A"/><stop offset="1" stop-color="#F2D08A" stop-opacity="0"/></radialGradient>
      <linearGradient id="pr-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9DB6CF" stop-opacity="0.55"/><stop offset="1" stop-color="#6E93B8" stop-opacity="0.35"/></linearGradient>
    </defs>
    <rect width="${S}" height="${S}" fill="#EDE6D6"/>
    <rect x="90" y="90" width="820" height="820" fill="#F6F2E8"/>
    <g class="pr-glow" opacity="0"><circle cx="500" cy="500" r="520" fill="url(#pr-sun)" opacity="0.5"/></g>
    <g class="pr-strokes" fill="none" stroke="#1E4068" stroke-width="118" stroke-linecap="round" filter="url(#pr-rough)" clip-path="url(#pr-sheet)">
      ${strokes.map((d) => `<path d="${d}" pathLength="1" class="pr-stroke"/>`).join('')}
    </g>
    <g class="pr-white" fill="#F3EEE2" opacity="1" filter="url(#pr-soft)" clip-path="url(#pr-sheet)">${plantPaths}</g>
    <g class="pr-green" fill="#4A6A47" opacity="0" filter="url(#pr-shadow)" clip-path="url(#pr-sheet)">${plantPaths}</g>
    <g class="pr-sunball" opacity="0"><circle class="pr-sun" cx="80" cy="520" r="26" fill="#F2D08A"/><g class="pr-rays" stroke="#E6C27A" stroke-width="3" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="-38" x2="0" y2="-50" transform="rotate(${i * 30})"/>`).join('')}</g></g>
    <g class="pr-waterg" opacity="0"><path class="pr-water" fill="url(#pr-water)" d="M0,1000 C 120,980 220,1020 340,1000 S 560,980 680,1000 S 900,1020 1000,1000 L1000,1200 L0,1200 Z"/></g>
    <g class="pr-bubbles" fill="#F6F2E8" opacity="0">${Array.from({ length: 9 }, (_, i) => `<circle cx="${160 + i * 85}" cy="${860 - (i % 3) * 40}" r="${3 + (i % 4) * 2}"/>`).join('')}</g>
  </svg>`);
  const caption = stage.querySelector('[data-stage-caption]');
  const steps = Array.from(document.querySelectorAll('[data-step]'));
  const labels = ['Coating', 'Arranging', 'Exposing', 'Rinsing'];
  if (!G || !window.ScrollTrigger || reduced) { steps.forEach((s) => s.classList.add('is-active')); caption.textContent = 'The finished print'; return; }
  // Final state is in the markup; the timeline plays the history backwards from there.
  const strokesEl = stage.querySelectorAll('.pr-stroke'), strokesG = stage.querySelector('.pr-strokes');
  const tl = G.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: document.querySelector('.process-grid'), start: 'top 35%', end: 'bottom 85%', scrub: 0.6,
    onUpdate: (st) => { const i = Math.min(3, Math.floor(st.progress * 4)); steps.forEach((s, k) => s.classList.toggle('is-active', k === i)); caption.textContent = labels[i]; } } });
  G.set(strokesG, { attr: { stroke: '#E4E7B4' } });
  G.set(stage.querySelector('.pr-white'), { opacity: 0 });
  G.set(strokesEl, { attr: { 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 } });
  tl.to(strokesEl, { attr: { 'stroke-dashoffset': 0 }, duration: 1, stagger: 0.08, ease: 'power1.inOut' }, 0);                               // coat
  tl.fromTo(stage.querySelector('.pr-green'), { opacity: 0, y: -60 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 1.3);           // arrange
  tl.to(stage.querySelector('.pr-sunball'), { opacity: 1, duration: 0.2 }, 2.0);                                                                    // expose
  tl.to(stage.querySelector('.pr-sunball'), { x: 840, duration: 1.0 }, 2.0);
  tl.to(stage.querySelector('.pr-sun'), { attr: { cy: 140 }, duration: 0.5, ease: 'sine.out' }, 2.0).to(stage.querySelector('.pr-sun'), { attr: { cy: 520 }, duration: 0.5, ease: 'sine.in' }, 2.5);
  tl.to(stage.querySelector('.pr-rays'), { rotation: 90, transformOrigin: '0 0', duration: 1.0 }, 2.0);
  tl.to(stage.querySelector('.pr-glow'), { opacity: 1, duration: 0.6 }, 2.1).to(stage.querySelector('.pr-glow'), { opacity: 0, duration: 0.4 }, 2.8);
  tl.to(strokesG, { attr: { stroke: '#7E8A86' }, duration: 0.9 }, 2.1);
  tl.to(stage.querySelector('.pr-sunball'), { opacity: 0, duration: 0.2 }, 3.0);
  tl.to(stage.querySelector('.pr-green'), { opacity: 0, y: -80, duration: 0.5, ease: 'power2.in' }, 3.05);                                           // rinse
  tl.to(stage.querySelector('.pr-waterg'), { opacity: 1, duration: 0.15 }, 3.1).to(stage.querySelector('.pr-water'), { y: -1000, duration: 0.9, ease: 'power1.inOut' }, 3.1);
  tl.to(strokesG, { attr: { stroke: '#1E4068' }, duration: 0.8 }, 3.3);
  tl.to(stage.querySelector('.pr-white'), { opacity: 1, duration: 0.6 }, 3.35);
  tl.to(stage.querySelector('.pr-bubbles'), { opacity: 0.8, duration: 0.2 }, 3.4).to(stage.querySelector('.pr-bubbles'), { y: -700, opacity: 0, duration: 0.6 }, 3.45);
  tl.to(stage.querySelector('.pr-waterg'), { opacity: 0, duration: 0.3 }, 3.75);
  // the water keeps a gentle wobble while visible
  G.to(stage.querySelector('.pr-water'), { x: -40, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
}

/* ---------------- Boot ---------------- */
(async function boot() {
  setupHero();
  const { settings } = await initSite({ page: 'home' });
  const note = document.querySelector('[data-shop-note]');
  if (note && settings.shop_note) note.textContent = settings.shop_note;
  setupProcess();
  loadProducts();
})();
