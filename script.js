const LEAD_ENDPOINT = 'https://lead-relay.leestygpt.workers.dev/lead/NHV8H8AXK6';

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');

  // ===== Utils =====
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const header = document.getElementById('header');
  const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  const setMenu = open => {
    burger.classList.toggle('is-open', open);
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  };
  burger?.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // Phone mask
  document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.startsWith('8')) v = '7' + v.slice(1);
      if (!v.startsWith('7')) v = '7' + v;
      v = v.slice(0, 11);
      let out = '+7';
      if (v.length > 1) out += ' (' + v.slice(1, 4);
      if (v.length >= 4) out += ') ' + v.slice(4, 7);
      if (v.length >= 7) out += '-' + v.slice(7, 9);
      if (v.length >= 9) out += '-' + v.slice(9, 11);
      e.target.value = out;
    });
  });

  // Smooth scroll with header offset
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href.length <= 1) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  // ===== Calculator: the live thing =====
  const rows = [...document.querySelectorAll('#calcForm .row')];
  const state = { area: 18, profile: 17, plug: 17, spots: 6, lustre: 1, rod: 3 };
  const prices = {};
  const maxes = {};
  const inputs = {};
  let plugTouched = false, profileTouched = false;

  rows.forEach(row => {
    const key = row.dataset.key;
    prices[key] = Number(row.dataset.price);
    maxes[key] = Number(row.dataset.max);
    inputs[key] = row.querySelector('input');
  });

  const parse = (v, max) => {
    const n = parseFloat(String(v).replace(',', '.'));
    if (Number.isNaN(n) || n < 0) return 0;
    return Math.min(n, max);
  };

  const plan = document.getElementById('plan');
  const totalEl = document.getElementById('total');
  const liveEl = document.getElementById('totalLive');
  const summaryEl = document.getElementById('summary');
  const calcField = document.getElementById('calcField');
  let shown = 19000;
  let tween = 0;
  let liveTimer = 0;

  const svg = (tag, attrs) => {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<${tag} ${a}/>`;
  };

  function renderPlan() {
    if (!plan) return;
    const A = Math.max(state.area, 3);
    const w0 = Math.sqrt(A * 4 / 3), h0 = Math.sqrt(A * 3 / 4);
    const K = Math.min(372 / w0, 250 / h0, 64);
    const W = w0 * K, H = h0 * K;
    const x0 = (400 - W) / 2, y0 = (300 - H) / 2;
    const parts = [];
    parts.push(svg('rect', { x: x0.toFixed(1), y: y0.toFixed(1), width: W.toFixed(1), height: H.toFixed(1), fill: '#fff', 'fill-opacity': 0.3 }));
    parts.push(svg('rect', { x: (x0 + 7).toFixed(1), y: (y0 + 7).toFixed(1), width: (W - 14).toFixed(1), height: (H - 14).toFixed(1), fill: '#fff', 'fill-opacity': 0.14 }));

    const chand = Math.min(Math.round(state.lustre), 5);
    const cy = y0 + H / 2;
    const chPts = Array.from({ length: chand }, (_, i) => ({ x: x0 + W * (i + 1) / (chand + 1), y: cy }));

    const n = Math.min(Math.round(state.spots), 60);
    if (n > 0) {
      // an even lattice, every spot kept; a spot that lands on a chandelier steps aside
      const cols = Math.max(1, Math.ceil(Math.sqrt(n * W / H)));
      const rws = Math.ceil(n / cols);
      const pad = 30;
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / cols);
        const inRow = r === rws - 1 ? n - r * cols : cols;
        const c = i - r * cols;
        let px = x0 + pad + (W - pad * 2) * (c + 0.5) / inRow;
        let py = y0 + pad + (H - pad * 2) * (r + 0.5) / rws;
        chPts.forEach(p => { if (Math.hypot(p.x - px, p.y - py) < 26) py += py <= p.y ? -22 : 22; });
        parts.push(svg('circle', { cx: px.toFixed(1), cy: py.toFixed(1), r: 5, fill: '#fff' }));
      }
    }
    chPts.forEach(p => {
      parts.push(svg('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 14, fill: '#fff' }));
      parts.push(svg('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 6, fill: '#1f2de6' }));
    });
    if (state.rod > 0) {
      const rw = Math.min(state.rod / w0, 1) * (W - 30);
      parts.push(svg('rect', { x: (x0 + (W - rw) / 2).toFixed(1), y: (y0 + 15).toFixed(1), width: rw.toFixed(1), height: 7, rx: 3.5, fill: '#fff' }));
    }
    plan.innerHTML = `<g class="room">${parts.join('')}</g>`;
  }

  const sum = () =>
    state.area * prices.area + state.profile * prices.profile + state.plug * prices.plug + state.spots * prices.spots +
    state.lustre * prices.lustre + state.rod * prices.rod;

  const num = n => String(Math.round(n * 10) / 10).replace('.', ',');
  function describe() {
    const bits = [];
    if (state.area) bits.push(`потолок ${num(state.area)} м²`);
    if (state.profile) bits.push(`профиль ${num(state.profile)} м.п.`);
    if (state.plug) bits.push(`заглушка ${num(state.plug)} м.п.`);
    if (state.spots) bits.push(`светильники ${num(state.spots)} шт.`);
    if (state.lustre) bits.push(`люстра ${num(state.lustre)} шт.`);
    if (state.rod) bits.push(`карниз ${num(state.rod)} м.п.`);
    return bits;
  }

  function update() {
    const total = Math.round(sum());
    const bits = describe();
    const text = bits.length ? bits[0].charAt(0).toUpperCase() + bits[0].slice(1) + (bits.length > 1 ? ', ' + bits.slice(1).join(', ') : '') : 'Добавьте работы, чтобы увидеть итог';
    summaryEl.textContent = text;
    calcField.value = bits.length ? `${bits.join(', ')} — итого ${fmt(total)} ₽` : '';
    renderPlan();

    cancelAnimationFrame(tween);
    if (reduceMotion) {
      shown = total;
      totalEl.innerHTML = fmt(total) + '&nbsp;₽';
    } else {
      const from = shown, start = performance.now(), dur = 380;
      const tick = t => {
        const p = Math.min(1, (t - start) / dur);
        shown = from + (total - from) * (1 - Math.pow(1 - p, 3));
        totalEl.innerHTML = fmt(shown) + '&nbsp;₽';
        if (p < 1) tween = requestAnimationFrame(tick);
        else shown = total;
      };
      tween = requestAnimationFrame(tick);
    }
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => { liveEl.textContent = `Итого ${fmt(total)} рублей`; }, 700);
  }

  function setKey(key, value, fromUser) {
    state[key] = parse(value, maxes[key]);
    if (key === 'plug' && fromUser) plugTouched = true;
    if (key === 'profile' && fromUser) profileTouched = true;
    if (key === 'area') {
      const w = Math.sqrt(state.area * 4 / 3), h = Math.sqrt(state.area * 3 / 4);
      const per = Math.round(2 * (w + h));
      if (!plugTouched) { state.plug = per; inputs.plug.value = per; }
      if (!profileTouched) { state.profile = per; inputs.profile.value = per; }
    }
    update();
  }

  rows.forEach(row => {
    const key = row.dataset.key;
    const input = inputs[key];
    input.addEventListener('input', () => setKey(key, input.value, true));
    input.addEventListener('blur', () => { input.value = num(state[key]); });
    input.addEventListener('focus', () => input.select());
    row.querySelectorAll('.stepper__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = Number(btn.dataset.dir);
        const next = Math.max(0, Math.round((state[key] + dir) * 10) / 10);
        input.value = num(Math.min(next, maxes[key]));
        setKey(key, input.value, true);
      });
    });
  });
  update();

  // ===== Areas: index with preview =====
  const idx = document.getElementById('index');
  const preview = document.getElementById('preview');
  const cap = document.getElementById('previewCap');
  const captions = [
    'Автозаводский район зимой. Фото: Sergey Kozorezov',
    'Комсомольский район. Фото: ShinePhantom',
    'Волга у Жигулёвских гор. Картина Н. Добровольского, 1885'
  ];
  if (idx && preview) {
    const items = [...idx.querySelectorAll('li')];
    const imgs = [...preview.querySelectorAll('img')];
    imgs.forEach(img => { img.style.objectPosition = img.dataset.pos || '50% 50%'; });
    const setActive = i => {
      items.forEach((li, k) => li.classList.toggle('is-active', k === i));
      imgs.forEach((img, k) => img.classList.toggle('is-active', k === i));
      cap.textContent = captions[i];
    };
    items.forEach((li, i) => {
      const a = li.querySelector('a');
      li.addEventListener('mouseenter', () => setActive(i));
      a.addEventListener('focus', () => setActive(i));
      a.addEventListener('click', () => {
        const d = document.getElementById('f-district');
        if (d && !d.value) d.value = li.dataset.district;
      });
    });
    setActive(0);
  }

  // ===== FAQ: one card open (fallback where <details name> is unsupported) =====
  const qas = [...document.querySelectorAll('.qa')];
  qas.forEach(d => d.addEventListener('toggle', () => {
    if (d.open) qas.forEach(o => { if (o !== d) o.open = false; });
  }));

  // ===== Lead form → Cloudflare Worker → Telegram =====
  const form = document.getElementById('leadForm');
  const status = document.getElementById('formStatus');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn.textContent;

    const fd = new FormData(form);
    const payload = {};
    fd.forEach((v, k) => { payload[k] = v; });

    if (payload._gotcha) return;
    if (!payload.name || !payload.phone || payload.phone.replace(/\D/g, '').length < 11) {
      status.textContent = 'Укажите имя и телефон полностью.';
      return;
    }
    const extra = payload.calc ? `Расчёт на сайте: ${payload.calc}` : '';
    payload.comment = [payload.comment, extra].filter(Boolean).join('\n');
    delete payload.calc;
    delete payload._gotcha;

    btn.disabled = true;
    btn.textContent = 'Отправляем...';
    status.textContent = '';

    try {
      const resp = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      status.textContent = 'Заявка отправлена. Мы перезвоним и договоримся о замере.';
      form.reset();
      update();
    } catch (err) {
      console.error(err);
      status.textContent = 'Не удалось отправить. Проверьте интернет и нажмите кнопку ещё раз.';
    } finally {
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3000);
    }
  });

  // ===== Reveal: parts of each section enter in sequence =====
  const groups = [
    '.hero__copy > *',
    '.calc__list > *, .calc__rows .row',
    '.calc__result .plan, .calc__result .result > *',
    '.process__head > *, .step',
    '.services > h2, .cat__head, .menu li, .cat__note',
    '.areas__list > h2, .areas__list > p, .index li, .preview',
    '.faq > h2, .qa',
    '.coupon__lead > *, .coupon__form > *'
  ];
  const items = [];
  groups.forEach(sel => {
    const els = [...document.querySelectorAll(sel)];
    els.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.setProperty('--d', Math.min(i, 8) * 70 + 'ms');
      items.push(el);
    });
  });
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(el => io.observe(el));
  }
})();
