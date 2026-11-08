'use strict';
/* «Ритм еды» — интерфейс прототипа. Состояние живёт только в памяти вкладки:
   без сетевых запросов, хранилищ браузера, аккаунтов, оплаты и телеметрии. */
(() => {
  const D = window.RITM_DATA;
  const E = window.RITM_ENGINE;
  const $ = id => document.getElementById(id);
  const view = $('view');
  const ctxEl = $('context');
  const dialog = $('dialog');
  const dialogBody = $('dialog-body');
  const toastEl = $('toast');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Утилиты ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let seq = 1;
  const uid = p => `${p}${seq++}`;
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateOf = k => new Date(`${k}T12:00:00`);
  const addDays = (k, n) => { const d = dateOf(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const TODAY = keyOf(new Date());
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const fmtDay = k => cap(dateOf(k).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }));
  const fmtShort = k => dateOf(k).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const relDay = k => k === TODAY ? 'Сегодня' : k === addDays(TODAY, -1) ? 'Вчера' : k === addDays(TODAY, 1) ? 'Завтра' : fmtDay(k);
  const weekdayIdx = k => (dateOf(k).getDay() + 6) % 7;
  const mondayOf = k => addDays(k, -weekdayIdx(k));
  const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const num = (v, d = 1) => Number(v).toLocaleString('ru-RU', { maximumFractionDigits: d });
  const parseNum = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const catLabel = c => (D.CATS[c] || D.CATS.other).label;
  const typeLabel = t => D.MEAL_TYPES[t] || 'Приём пищи';
  const ideaById = id => D.IDEAS.find(i => i.id === id);
  const habitDef = id => D.HABITS.find(h => h.id === id);

  /* ---------- Иконки (собственные SVG) ---------- */
  const P = {
    today: '<path d="M4 11.5 12 5l8 6.5V20H4z"/><path d="M10 20v-5h4v5"/>',
    diary: '<path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    plan: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    progress: '<path d="M4 19h16"/><path d="M6 15l4-4 3 3 5-6"/>',
    settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    plus: '<path d="M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.2 7 19l1.2-5.6L4 9.6 9.6 9z"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    repeat: '<path d="M17 3l3 3-3 3"/><path d="M4 12V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 12v3a3 3 0 0 1-3 3H4"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/>',
    star: '<path d="M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.2 7 19l1.2-5.6L4 9.6 9.6 9z"/>',
    up: '<path d="M6 14l6-6 6 6"/>', down: '<path d="M6 10l6 6 6-6"/>',
    left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    timer: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4l2.5 2M9 3h6"/>',
    water: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/>',
    restaurant: '<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 3c-2 1-3 4-3 7h3v11"/>',
    cup: '<path d="M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 9h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M11 3v2"/>',
    apple: '<path d="M12 7c-3-2-7 0-7 5 0 4 3 8 5 8 1 0 1.3-.5 2-.5s1 .5 2 .5c2 0 5-4 5-8 0-5-4-7-7-5z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
    bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3"/>',
    plate: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/>',
    cake: '<path d="M4 20h16v-7H4z"/><path d="M4 15c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0M12 13V9M12 6.5v.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M11 9l-2 5 3 2v5M11 9l3 1 2 3M9 14l-3 7M12 9.5l-3 1-1.5 3"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="M7 5l12 7-12 7z"/>',
    scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9a4 4 0 0 1 6 0l-2 3"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z"/><path d="M5 19l8-8"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    barcode: '<path d="M4 6v12M7 6v12M10 6v12M14 6v12M16 6v12M20 6v12"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    sync: '<path d="M20 11a8 8 0 0 0-14-4.5L4 9M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14 4.5L20 15M20 20v-5h-5"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    body: '<circle cx="12" cy="5" r="2.5"/><path d="M8 9h8l-1 6h-2l-.5 6h-1L11 15H9z"/>',
    dots: '<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    cart: '<path d="M4 5h2l2 10h10l2-7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>'
  };
  const ico = (name, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[name]}</svg>`;
  const TYPE_ICON = { first: 'cup', lunch: 'bowl', dinner: 'plate', snack: 'apple', dessert: 'cake' };

  function ideaArt(kind) {
    const c = 'stroke="var(--ink)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"';
    const base = `<ellipse cx="50" cy="56" rx="38" ry="30" fill="var(--surface)" ${c}/>`;
    const parts = {
      egg: `${base}<ellipse cx="44" cy="54" rx="16" ry="12" fill="#fff" ${c}/><circle cx="44" cy="54" r="6" fill="var(--amber)"/><path d="M62 46c6 2 9 8 7 14" stroke="var(--accent)" stroke-width="5" fill="none" stroke-linecap="round"/>`,
      bowl: `<path d="M14 48h72a36 30 0 0 1-72 0z" fill="var(--surface)" ${c}/><circle cx="38" cy="44" r="7" fill="var(--accent)"/><circle cx="54" cy="42" r="6" fill="var(--amber)"/><circle cx="66" cy="45" r="5" fill="var(--accent-soft)" ${c}/>`,
      plate: `${base}<path d="M34 50c4-8 12-8 16 0" stroke="var(--accent)" stroke-width="6" fill="none" stroke-linecap="round"/><rect x="54" y="50" width="16" height="12" rx="4" fill="var(--amber-soft)" ${c}/><circle cx="42" cy="64" r="5" fill="var(--amber)"/>`,
      fish: `${base}<path d="M30 56c8-10 26-10 34 0-8 10-26 10-34 0zM64 56l10-7v14z" fill="var(--accent-soft)" ${c}/><path d="M38 66h24" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/>`,
      soup: `<path d="M16 46h68a34 28 0 0 1-68 0z" fill="var(--amber-soft)" ${c}/><circle cx="40" cy="52" r="4" fill="var(--amber)"/><circle cx="56" cy="50" r="4" fill="var(--amber)"/><path d="M40 34c0-4 4-4 4-8M54 34c0-4 4-4 4-8" ${c}/>`,
      sticks: `<rect x="26" y="40" width="10" height="34" rx="5" fill="var(--amber)" ${c} transform="rotate(-12 31 57)"/><rect x="42" y="36" width="10" height="38" rx="5" fill="var(--accent)" ${c}/><circle cx="70" cy="60" r="14" fill="var(--amber-soft)" ${c}/>`
    };
    return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${parts[kind] || parts.plate}</svg>`;
  }

  /* ---------- Состояние ---------- */
  function initialState() {
    return {
      route: 'onboarding', params: [], onboarded: false,
      ob: { step: 0, age: '', health: [], meds: '', numbers: '' },
      safety: { limited: false, locked: false, reasons: [] },
      numbers: true, theme: 'system',
      meals: [], favorites: [], custom: [], water: [], moves: [],
      habits: { chosen: [], marks: {} },
      plan: {}, shopDone: [],
      weights: [], measures: [], chartMode: 'mine',
      diaryDate: TODAY, planDate: TODAY, ideaFilter: '',
      draft: null, search: { q: '', tab: 'all', cat: '' }, showAll: false,
      timer: { total: 600000, remaining: 600000, running: false, endAt: 0, mealId: '', awaiting: false },
      plusPlan: 'year',
      breakfast: { first: 'yes', have: [] }, snack: { have: [] }, restaurant: { have: [] }
    };
  }
  let state = initialState();
  let tickHandle = null;

  const limited = () => state.safety.limited;
  const showNumbers = () => state.numbers;
  const showScore = () => !limited() && state.numbers;
  const mealsOn = k => state.meals.filter(m => m.date === k);
  const visibleHabits = () => state.habits.chosen.filter(h => !limited() || habitDef(h.id).neutral);

  /* ---------- Тема ---------- */
  // Внутри Telegram «как в системе» означает «как в Telegram» (схему сообщает telegram.js).
  function applyTheme() {
    const host = window.RITM_HOST && window.RITM_HOST.scheme;
    document.documentElement.dataset.theme = state.theme === 'system' && host ? host : state.theme;
  }

  /* ---------- Тост с отменой ---------- */
  let toastTimer = null;
  function toast(msg, action) {
    toastEl.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button" id="toast-action">${esc(action.label)}</button>` : ''}`;
    toastEl.classList.add('show');
    if (action) $('toast-action').onclick = () => { hideToast(); action.fn(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? 6000 : 3200);
  }
  function hideToast() { toastEl.classList.remove('show'); }

  /* ---------- Диалог ---------- */
  function openDialog(html) {
    dialogBody.innerHTML = html;
    if (!dialog.open) dialog.showModal();
    const first = dialogBody.querySelector('[autofocus], input, select, button, a[href]');
    if (first) first.focus();
  }
  const closeDialog = () => { if (dialog.open) dialog.close(); };
  // Если кнопка, открывшая окно, перерисована, возвращаем фокус к заголовку экрана, а не в начало страницы.
  dialog.addEventListener('close', () => {
    setTimeout(() => {
      if (document.activeElement === document.body || !document.activeElement) {
        const h = view.querySelector('h1');
        if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      }
    }, 0);
  });

  /* ---------- Безопасность ---------- */
  function safetyFromOnboarding() {
    const o = state.ob, r = [];
    if (o.age === 'under18') r.push('возраст младше 18 лет');
    if (o.age === 'skip') r.push('возраст не указан');
    if (o.health.includes('preg')) r.push('беременность или грудное вскармливание');
    if (o.health.includes('diabetes')) r.push('диабет');
    if (o.health.includes('ed')) r.push('расстройство пищевого поведения');
    if (o.health.includes('skip')) r.push('ответ о здоровье не указан');
    if (o.meds === 'yes') r.push('сахароснижающие препараты');
    if (o.meds === 'skip') r.push('ответ о препаратах не указан');
    return r;
  }

  /* ---------- Маршруты ---------- */
  const ROUTES = [
    ['onboarding', 'Онбординг'], ['today', 'Сегодня'], ['diary', 'Дневник'], ['add', 'Добавить еду'],
    ['breakfast', 'Первый приём'], ['snack', 'Перекус'], ['restaurant', 'Ресторан'],
    ['plan', 'План: неделя'], ['plan/ideas', 'План: идеи блюд'], ['idea/chicken-broccoli', 'Идея блюда'],
    ['plan/shopping', 'План: покупки'], ['plan/habits', 'План: привычки'],
    ['move', 'Таймер движения'], ['scan', 'Фото еды · ИИ (скоро)'], ['progress', 'Прогресс'], ['method', 'Как это работает'], ['settings', 'Настройки'], ['plus', 'Ритм Плюс (пример)']
  ];
  const MAIN_NAV = [['today', 'Сегодня', 'today'], ['diary', 'Дневник', 'diary'], ['plan', 'План', 'plan'], ['progress', 'Прогресс', 'progress']];
  const SECTION = { today: 'today', move: 'today', diary: 'diary', meal: 'diary', add: 'diary', breakfast: 'diary', snack: 'diary', restaurant: 'diary', scan: 'diary', plan: 'plan', idea: 'plan', progress: 'progress', method: 'method', settings: 'settings', plus: 'plus' };

  function parseHash() {
    let h;
    try { h = decodeURIComponent(location.hash.replace(/^#\/?/, '')); }
    catch { h = 'today'; }
    const [route, ...params] = h.split('/');
    return { route: route || 'today', params };
  }
  // Переход рисует экран сразу; «Назад» в браузере по-прежнему приходит через hashchange.
  function go(hash) {
    if (location.hash !== '#' + hash) history.pushState(null, '', '#' + hash);
    route();
  }
  let lastRouteKey = '';
  function route() {
    let { route: r, params } = parseHash();
    if (!screens[r]) r = 'today';
    if (!state.onboarded && r !== 'onboarding') { r = 'onboarding'; params = []; history.replaceState(null, '', '#onboarding'); }
    if (state.onboarded && r === 'onboarding') { r = 'today'; history.replaceState(null, '', '#today'); }
    if (r === 'add' && !state.draft) startDraft({});
    state.route = r; state.params = params;
    render({ routeChange: `${r}/${params.join('/')}` !== lastRouteKey });
    lastRouteKey = `${r}/${params.join('/')}`;
    window.dispatchEvent(new CustomEvent('ritm:route', { detail: { route: r, hash: [r, ...params].join('/') } }));
  }
  window.addEventListener('hashchange', route);

  /* ---------- Отрисовка ---------- */
  function navHtml(cls) {
    const sec = SECTION[state.route];
    return MAIN_NAV.map(([h, t, i]) => `<a class="nav-link ${cls}" href="#${h}" ${sec === h ? 'aria-current="page"' : ''}>${ico(i)}<span>${t}</span></a>`).join('');
  }
  function timerChip() {
    const t = state.timer;
    if (!(t.running || t.awaiting || t.remaining < t.total)) return '';
    const label = t.awaiting ? 'Двигались?' : fmtTime(t.remaining);
    return `<a class="timer-chip" href="#move" aria-label="Таймер движения: ${t.awaiting ? 'ждёт ответа' : fmtTime(t.remaining)}">${ico('timer')}<span data-timer-text>${label}</span></a>`;
  }
  function renderChrome() {
    $('side-nav').innerHTML = state.onboarded ? navHtml('') : '';
    $('side-secondary').innerHTML = state.onboarded ? [['method', 'Как это работает', 'info'], ['settings', 'Настройки', 'settings'], ['plus', 'Ритм Плюс', 'plus']]
      .map(([h, t, i]) => `<a class="nav-link" href="#${h}" ${SECTION[state.route] === h ? 'aria-current="page"' : ''}>${ico(i)}<span>${t}</span></a>`).join('') : '';
    $('tabbar').innerHTML = state.onboarded ? navHtml('') : '';
    $('tabbar').hidden = !state.onboarded;
    $('side-timer').innerHTML = state.onboarded && !limited() ? timerChip() : '';
    $('top-timer').innerHTML = state.onboarded && !limited() ? timerChip() : '';
  }

  function render(opts = {}) {
    applyTheme();
    const flipBefore = opts.flip ? measure() : null;
    const active = document.activeElement;
    const keepId = !opts.routeChange && active && active.id && view.contains(active) ? active.id : null;
    const out = screens[state.route]();
    view.innerHTML = out.main;
    ctxEl.innerHTML = out.context || '';
    document.body.classList.toggle('has-bar', !!view.querySelector('.draft-bar'));
    renderChrome();
    document.title = `${out.title || 'Ритм еды'} — Ритм еды`;
    if (opts.routeChange) {
      view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
      window.scrollTo(0, 0);
      const h = view.querySelector('h1');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    } else if (keepId) {
      const el = $(keepId);
      if (el) el.focus({ preventScroll: true });
    }
    if (flipBefore) playFlip(flipBefore, opts.appear);
    // Слой анимаций (motion.js) получает сигнал после каждой отрисовки.
    window.dispatchEvent(new CustomEvent('ritm:render', { detail: { route: state.route, routeChange: !!opts.routeChange } }));
  }

  /* FLIP: перестановка компонентов показывает, куда переместилась строка. */
  function measure() {
    const m = new Map();
    view.querySelectorAll('[data-flip]').forEach(el => m.set(el.dataset.flip, el.getBoundingClientRect().top));
    return m;
  }
  function playFlip(before, appearKey) {
    view.querySelectorAll('[data-flip]').forEach(el => {
      const k = el.dataset.flip;
      if (before.has(k)) {
        const dy = before.get(k) - el.getBoundingClientRect().top;
        if (dy && !reduceMotion.matches && el.animate) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(0.77, 0, 0.175, 1)' });
      } else if (!appearKey || appearKey === k) {
        el.classList.add('appear');
      }
    });
  }

  /* ---------- Общие куски ---------- */
  const pageHead = (eyebrow, title, lead) => `${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h1 class="h1">${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}`;
  const backLink = (href, label) => `<a class="btn btn-ghost btn-sm" href="#${href}" style="margin:-6px 0 8px -10px">${ico('left')}${label}</a>`;
  // Мини-герой «Ритмик»: тарелка-персонаж с листиком. Используется в онбординге и в знакомстве (guide.js).
  let heroSeq = 0;
  function heroSvg(cls = 'hero', wave = true) {
    const id = 'heroGrad' + (++heroSeq);
    return `<svg class="${cls}" viewBox="0 0 100 114" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1fb89b"/><stop offset="1" stop-color="#0b6e72"/></linearGradient></defs>
      <g class="whole"><path d="M50 26V18" stroke="#0b6e72" stroke-width="2.5" stroke-linecap="round"/><path class="leaf" d="M50 19C50 10 57 4 67 4c-1 9-7 15-17 15z"/>
      <ellipse class="arm ${wave ? 'wave' : ''}" cx="13" cy="60" rx="7" ry="11" transform="rotate(-25 13 60)"/><ellipse class="arm" cx="87" cy="70" rx="7" ry="11" transform="rotate(20 87 70)"/>
      <ellipse cx="40" cy="106" rx="9" ry="5" fill="#0b6e72"/><ellipse cx="60" cy="106" rx="9" ry="5" fill="#0b6e72"/>
      <circle class="body" cx="50" cy="64" r="40" style="fill:url(#${id})"/><circle class="rim" cx="50" cy="64" r="31"/>
      <ellipse class="eye" cx="40" cy="58" rx="4.2" ry="5.6"/><ellipse class="eye" cx="60" cy="58" rx="4.2" ry="5.6"/>
      <circle cx="41.5" cy="56" r="1.4" fill="#fff"/><circle cx="61.5" cy="56" r="1.4" fill="#fff"/>
      <ellipse class="cheek" cx="32" cy="68" rx="5" ry="3"/><ellipse class="cheek" cx="68" cy="68" rx="5" ry="3"/>
      <path d="M42 70q8 8 16 0" fill="none" stroke="#10233a" stroke-width="3" stroke-linecap="round"/></g></svg>`;
  }
  // Раскрытые блоки остаются раскрытыми после перерисовки (иначе «Замеры» сворачивались бы после каждого ввода).
  const openKeep = new Set();
  const keepOpen = k => openKeep.has(k) ? 'open' : '';
  document.addEventListener('toggle', e => { const k = e.target.dataset && e.target.dataset.keep; if (k) e.target.open ? openKeep.add(k) : openKeep.delete(k); }, true);
  const demoTag = x => x && x.demo ? ' <span class="example-tag">пример</span>' : '';
  const limitedNote = () => limited() ? `<p class="note safety">${ico('shield')} Ограниченный режим: без оценок, целей и активных советов по еде и нагрузке. Вопросы о питании обсудите с врачом.</p>` : '';

  function pips(ev) {
    return `<span class="pips" aria-hidden="true">${ev.rules.filter(r => r.state !== 'na').map(r => `<i class="${r.state === 'met' ? 'met' : r.state === 'unknown' ? 'unknown' : ''}"></i>`).join('')}</span>`;
  }
  function evalMeal(m, phase) {
    return E.evaluate(m, { phase: phase || (m.status === 'planned' ? 'before' : 'after'), limited: limited() });
  }
  // Пищевая ценность вводится вручную на всю указанную порцию; null — «неизвестно», не ноль.
  const NUTR = [['kcal', 'ккал', 'ккал'], ['p', 'белки', 'г'], ['f', 'жиры', 'г'], ['c', 'углеводы', 'г'], ['fib', 'клетчатка', 'г'], ['s', 'сахар', 'г']];
  const emptyNutr = () => Object.fromEntries(NUTR.map(([k]) => [k, null]));
  function itemText(it) {
    return `${esc(it.name)}${it.amount != null && it.amount !== '' ? ` <span class="muted">${num(it.amount)} ${esc(it.unit)}</span>` : ''}`;
  }

  function mealRow(m, opts = {}) {
    const ev = evalMeal(m);
    const status = m.status === 'planned' ? '<span class="tag amber">собрано до еды</span>' : '';
    // Строка приёма: нажатие открывает разбор; редкие действия — в меню «⋯».
    const score = showScore() ? `<div class="score-line">${pips(ev)}<span>${esc(ev.summary)}</span></div>` : '';
    return `<li data-flip="m-${m.id}"><div class="meal">
      <div class="meal-icon">${ico(TYPE_ICON[m.type] || 'plate')}</div>
      <div class="grow">
        <a class="meal-link" href="#meal/${m.id}" aria-label="${typeLabel(m.type)}: открыть запись и разбор">
          <div class="meal-title">${typeLabel(m.type)}${status}${demoTag(m)}${opts.showDate ? `<span class="tag">${esc(relDay(m.date))}</span>` : ''}</div>
          <p class="meal-items">${m.items.map(itemText).join(' → ')}</p>
          ${score}
        </a>
        <div class="meal-actions">${m.status === 'planned' ? `<button class="btn btn-accent btn-sm" type="button" data-act="eaten" data-arg="${m.id}">${ico('check')}Отметить, что съели</button>` : ''}</div>
      </div>
      <details class="more"><summary aria-label="Действия: ${typeLabel(m.type)}">${ico('dots', '')}</summary><div class="more-menu">
        <button class="btn btn-ghost btn-sm" type="button" data-act="edit-meal" data-arg="${m.id}" aria-label="Изменить: ${typeLabel(m.type)}">${ico('edit')}Изменить</button>
        <button class="btn btn-ghost btn-sm" type="button" data-act="copy-meal" data-arg="${m.id}" aria-label="Копировать: ${typeLabel(m.type)}">${ico('copy')}Копировать</button>
        <button class="btn btn-ghost btn-sm danger" type="button" data-act="delete-meal" data-arg="${m.id}" aria-label="Удалить: ${typeLabel(m.type)}">${ico('trash')}Удалить</button>
      </div></details></div></li>`;
  }

  function waterTotal(k) { return state.water.filter(w => w.date === k).reduce((s, w) => s + w.ml, 0); }
  function waterWidget(k) {
    const list = state.water.filter(w => w.date === k);
    const total = waterTotal(k);
    return `<section class="panel water" aria-labelledby="water-h">
      <div class="row nowrap"><span class="meal-icon">${ico('water')}</span><div class="grow"><h2 class="h3" id="water-h">Вода · ${esc(relDay(k).toLowerCase())}</h2>
      <p class="small muted" style="margin:0">${showNumbers() ? (total ? `Итого ${num(total, 0)} мл` : 'Пока не отмечено') : (total ? 'Отмечено' : 'Пока не отмечено')} · без обязательной нормы</p></div></div>
      ${!showNumbers() && list.length ? `<div class="water-bar" aria-hidden="true">${list.map(() => '<i></i>').join('')}</div>` : ''}
      <div class="row">${[150, 250, 500].map(ml => `<button class="btn btn-secondary btn-sm grow" type="button" data-act="water" data-arg="${ml}|${k}">+${ml} мл</button>`).join('')}</div>
      ${list.length ? `<button class="btn btn-ghost btn-sm" type="button" data-act="water-undo" data-arg="${k}">Отменить последнее</button>` : ''}
    </section>`;
  }

  // «На сегодня»: привычки, вода, движение и план одним коротким списком вместо четырёх карточек.
  function todayList() {
    const rows = [];
    const marks = state.habits.marks[TODAY] || [];
    const habits = visibleHabits().filter(h => !h.paused && h.days.includes(weekdayIdx(TODAY)));
    if (!visibleHabits().length) rows.push(`<li class="row-item"><span class="ri-icon t-veg">${ico('leaf', '')}</span><a class="grow" href="#plan/habits"><b>Выбрать 1–3 привычки</b><span class="sub">Отмечать их можно прямо здесь</span></a></li>`);
    habits.forEach(h => {
      const d = habitDef(h.id), on = marks.includes(h.id);
      rows.push(`<li class="row-item habit"><button class="mark" type="button" data-act="mark-habit" data-arg="${h.id}|${TODAY}" aria-pressed="${on}" aria-label="${on ? 'Снять отметку' : 'Отметить'}: ${esc(d.name)}">${ico('check', '')}</button><div class="grow"><b>${esc(d.name)}</b><span class="sub">Привычка</span></div></li>`);
    });
    const wl = state.water.filter(w => w.date === TODAY), wt = waterTotal(TODAY);
    rows.push(`<li class="row-item water inline"><span class="ri-icon t-water">${ico('water', '')}</span><div class="grow"><b>Вода</b><span class="sub">${wt ? (showNumbers() ? `${num(wt, 0)} мл` : 'Отмечено') : 'Пока не отмечено'}</span></div>
      <div class="water-btns">${wl.length ? `<button class="btn btn-ghost btn-sm" type="button" data-act="water-undo" data-arg="${TODAY}" aria-label="Отменить последнюю отметку воды">Отменить</button>` : ''}<button class="btn btn-secondary btn-sm" type="button" data-act="water" data-arg="250|${TODAY}">+250 мл</button></div></li>`);
    if (!limited()) {
      (state.plan[TODAY] || []).forEach(p => { const i = ideaById(p.ideaId); rows.push(`<li class="row-item"><span class="ri-icon t-plan">${ico('plan', '')}</span><a class="grow" href="#idea/${i.id}"><b>${esc(i.name)}</b><span class="sub">В плане · ${typeLabel(p.slot).toLowerCase()}</span></a><button class="btn btn-ghost btn-sm" type="button" data-act="idea-draft" data-arg="${i.id}|${p.slot}">В черновик</button></li>`); });
      rows.push(`<li class="row-item"><span class="ri-icon t-move">${ico('walk', '')}</span><a class="grow" href="#move"><b>Движение после еды</b><span class="sub">Таймер на 10–20 минут</span></a></li>`);
    }
    return `<ul class="list today-list">${rows.join('')}</ul>`;
  }

  /* ---------- Следующее действие ---------- */
  function nextAction() {
    const t = state.timer;
    if (t.awaiting && !limited()) return { eyebrow: 'Таймер завершён', title: 'Вы двигались?', text: 'Таймер сам ничего не подтверждает. Ответьте, если хотите записать движение.',
      actions: `<div class="row"><button class="btn btn-primary" type="button" data-act="move-yes">Да, двигался(ась)</button><button class="btn btn-secondary" type="button" data-act="move-no">Нет, не получилось</button></div>` };
    const planned = mealsOn(TODAY).find(m => m.status === 'planned');
    if (planned) return { eyebrow: 'Собрано до еды', title: `${typeLabel(planned.type)}: отметьте, когда поедите`, text: 'Подтвердите фактический состав и порядок — неизвестное не считается нарушением.',
      actions: `<button class="btn btn-primary" type="button" data-act="eaten" data-arg="${planned.id}">${ico('check')}Отметить, что съели</button>` };
    const recent = mealsOn(TODAY).filter(m => m.status === 'eaten' && m.eatenAt && Date.now() - m.eatenAt < 70 * 60000 && ['first', 'lunch', 'dinner'].includes(m.type))
      .find(m => !state.moves.some(v => v.mealId === m.id));
    if (recent && !limited()) return { eyebrow: 'После еды', title: 'Если удобно — 10–20 минут движения', text: 'Ходьба или домашние дела в своём темпе. Это не «отработка» еды и не влияет на оценку блюда.',
      actions: `<div class="row"><a class="btn btn-primary" href="#move" data-act="timer-for" data-arg="${recent.id}">${ico('timer')}Открыть таймер</a><button class="btn btn-secondary" type="button" data-act="self-report" data-arg="${recent.id}">Отметить самостоятельно</button></div>` };
    if (!mealsOn(TODAY).length) {
      if (limited()) return null;
      return { eyebrow: 'Следующее действие', title: 'Первый приём — с несладкой основой', text: 'Яйца, творог, сыр, рыба или бобовые; хлеб и фрукт — по желанию, в конце. Время не важно.',
        actions: `<a class="btn btn-primary" href="#breakfast">${ico('cup')}Собрать первый приём</a>` };
    }
    // Привычки и следующий приём уже есть в списке «На сегодня» — отдельная карточка не дублирует их.
    return null;
  }

  /* ---------- Экраны ---------- */
  const screens = {};

  screens.onboarding = () => {
    const o = state.ob, step = o.step;
    const prog = `<div class="onb-progress" role="progressbar" aria-label="Шаг ${step + 1} из 6" aria-valuemin="1" aria-valuemax="6" aria-valuenow="${step + 1}">${[0, 1, 2, 3, 4, 5].map(i => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;
    const nav = (canNext, nextLabel = 'Дальше') => `<div class="onb-actions">${step > 0 ? '<button class="btn btn-secondary" type="button" data-act="ob-back">Назад</button>' : ''}<button class="btn btn-primary" type="button" data-act="ob-next" ${canNext ? '' : 'disabled'}>${nextLabel}</button></div>`;
    const radio = (name, v, t, s, cur) => `<label class="choice"><input type="radio" name="${name}" value="${v}" data-field="${name}" ${cur === v ? 'checked' : ''}><span>${t}${s ? `<small>${s}</small>` : ''}</span></label>`;
    let body = '';
    if (step === 0) {
      body = `${heroSvg('hero hero-big')}${pageHead('Привет! Я Ритмик', 'РИТМ ЕДЫ', 'Помогу сделать одно посильное изменение до еды и спокойно вести дневник. После настройки покажу, где что находится.')}
        <ul class="benefits">
          <li>${ico('leaf')}<div><b>Одно действие до еды</b><p class="muted small">Добавить овощи, белок или переставить сладкое в конец — прямо в собранном приёме.</p></div></li>
          <li>${ico('diary')}<div><b>Дневник без подсчёта калорий</b><p class="muted small">Поиск, избранное, повтор и копирование. Цифры можно скрыть.</p></div></li>
          <li>${ico('plan')}<div><b>План и привычки в своём темпе</b><p class="muted small">Идеи блюд, список покупок, 1–3 привычки без серий-наказаний.</p></div></li>
        </ul>
        <p class="note">Это прототип: данные остаются в этой вкладке и пропадают после перезагрузки. Он не ставит диагнозов и не заменяет врача.</p>
        ${nav(true, 'Начать')}`;
    } else if (step === 1) {
      body = `${pageHead('Шаг 1 из 4', 'Вам есть 18 лет?', 'Приложение рассчитано на взрослых.')}
        <fieldset><legend class="sr-only">Возраст</legend>
        ${radio('ob-age', 'adult', 'Да, мне 18 или больше', '', o.age)}${radio('ob-age', 'under18', 'Нет, мне меньше 18', 'Включится ограниченный режим', o.age)}${radio('ob-age', 'skip', 'Не хочу отвечать', 'Включится ограниченный режим', o.age)}</fieldset>${nav(!!o.age)}`;
    } else if (step === 2) {
      const ck = (v, t, s) => `<label class="choice"><input type="checkbox" value="${v}" data-field="ob-health" ${o.health.includes(v) ? 'checked' : ''}><span>${t}${s ? `<small>${s}</small>` : ''}</span></label>`;
      body = `${pageHead('Шаг 2 из 4', 'Есть ли что-то из этого?', 'Ответ меняет режим приложения. Это не диагноз, подробности не нужны.')}
        <fieldset><legend class="sr-only">Состояние здоровья</legend>
        ${ck('preg', 'Беременность или грудное вскармливание')}${ck('diabetes', 'Диабет любого типа')}${ck('ed', 'Расстройство пищевого поведения сейчас или в прошлом')}
        ${ck('none', 'Ничего из этого')}${ck('skip', 'Не хочу отвечать', 'Включится ограниченный режим')}</fieldset>${nav(o.health.length > 0)}`;
    } else if (step === 3) {
      body = `${pageHead('Шаг 3 из 4', 'Принимаете ли вы препараты, снижающие сахар в крови?', 'Отдельный вопрос — даже если диабета нет.')}
        <fieldset><legend class="sr-only">Сахароснижающие препараты</legend>
        ${radio('ob-meds', 'no', 'Нет', '', o.meds)}${radio('ob-meds', 'yes', 'Да', 'Инсулин или таблетки', o.meds)}${radio('ob-meds', 'skip', 'Не хочу отвечать', 'Включится ограниченный режим', o.meds)}</fieldset>${nav(!!o.meds)}`;
    } else if (step === 4) {
      body = `${pageHead('Шаг 4 из 4', 'Показывать цифры?', 'Можно изменить в настройках в любой момент.')}
        <fieldset><legend class="sr-only">Цифры</legend>
        ${radio('ob-numbers', 'with', 'С цифрами', 'Оценка приёмов, вес и графики', o.numbers)}${radio('ob-numbers', 'without', 'Без цифр', 'Только действия и дневник — вес, оценки и графики скрыты', o.numbers)}</fieldset>${nav(!!o.numbers)}`;
    } else {
      const reasons = safetyFromOnboarding();
      body = reasons.length
        ? `${pageHead('Готово', 'Включён ограниченный режим', `Причина: ${esc(reasons.join(', '))}.`)}
          <div class="panel panel-tint stack"><p><b>Что это значит.</b> Дневник, вода и нейтральные привычки доступны. Оценок, целей похудения и активных советов по еде и нагрузке не будет.</p>
          <p>Изменения в питании обсудите с врачом.</p></div>
          <div class="onb-actions"><button class="btn btn-secondary" type="button" data-act="ob-back">Назад</button><button class="btn btn-primary" type="button" data-act="ob-finish">Открыть дневник</button></div>`
        : `${pageHead('Готово', 'Всё настроено', 'Начните с первой записи или с одной привычки — этого достаточно.')}
          <div class="onb-actions"><button class="btn btn-secondary" type="button" data-act="ob-back">Назад</button><button class="btn btn-primary" type="button" data-act="ob-finish">Перейти к сегодняшнему дню</button></div>`;
    }
    return { title: 'Знакомство', main: `<div class="onb">${prog}${body}</div>` };
  };

  screens.today = () => {
    const h = new Date().getHours();
    const hello = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
    const na = nextAction();
    const last = [...state.meals].filter(m => m.status === 'eaten').sort((a, b) => (b.date + b.created).localeCompare(a.date + a.created))[0];
    const meals = mealsOn(TODAY);
    const main = `${pageHead(fmtDay(TODAY), hello)}
      ${limitedNote()}
      <div class="hero-actions">
        <button class="btn btn-primary btn-big" type="button" data-act="new-meal">${ico('add')}Добавить еду</button>
        <div class="scroller" role="group" aria-label="Быстрые действия">
          ${last ? `<button class="chip" type="button" data-act="repeat-meal" data-arg="${last.id}" aria-label="Повторить: ${typeLabel(last.type).toLowerCase()} · ${esc(last.items.map(i => i.name).join(', '))}">${ico('repeat', 'ico')}Повторить ${esc(last.items[0].name.toLowerCase())}${last.items.length > 1 ? '…' : ''}</button>` : ''}
          <a class="chip ai" href="#scan">${ico('camera', 'ico')}Фото еды<span class="badge-soon">ИИ</span></a><a class="chip" href="#breakfast">${ico('cup', 'ico')}Первый приём</a><a class="chip" href="#snack">${ico('apple', 'ico')}Перекус</a><a class="chip" href="#restaurant">${ico('restaurant', 'ico')}Ресторан</a>
        </div>
      </div>
      ${na ? `<section class="next" aria-live="polite"><p class="eyebrow">${esc(na.eyebrow)}</p><h2 class="h3">${esc(na.title)}</h2><p class="small muted">${esc(na.text)}</p>${na.actions}</section>` : ''}
      <section class="section" aria-labelledby="meals-h"><div class="section-head"><h2 class="h2" id="meals-h">Еда сегодня</h2>${meals.length ? '<a class="btn btn-ghost btn-sm" href="#diary">Дневник</a>' : ''}</div>
        ${meals.length ? `<ul class="list">${meals.map(m => mealRow(m)).join('')}</ul>` : '<p class="muted small">Пока пусто. Записывайте, когда удобно — до или после еды.</p>'}</section>
      <section class="section" aria-labelledby="habits-h"><div class="section-head"><h2 class="h2" id="habits-h">На сегодня</h2>${visibleHabits().length ? '<a class="btn btn-ghost btn-sm" href="#plan/habits">Привычки</a>' : ''}</div>${todayList()}</section>`;
    return { title: 'Сегодня', main, context: '' };
  };

  screens.diary = () => {
    const k = state.diaryDate;
    const meals = mealsOn(k);
    // В итоги входит только фактически съеденное; собранное до еды — отдельно.
    const eatenItems = meals.filter(m => m.status === 'eaten').flatMap(m => m.items);
    const plannedCount = meals.filter(m => m.status === 'planned').length;
    const moves = state.moves.filter(v => v.date === k);
    const main = `${pageHead(k === TODAY ? 'Дневник' : esc(fmtDay(k)), esc(relDay(k)))}
      <div class="row" role="group" aria-label="Выбор дня">
        <button class="icon-btn" type="button" data-act="diary-day" data-arg="-1" aria-label="Предыдущий день">${ico('left', '')}</button>
        <input type="date" id="diary-date" value="${k}" data-field="diary-date" aria-label="Дата" style="width:auto;flex:1;max-width:220px">
        <button class="icon-btn" type="button" data-act="diary-day" data-arg="1" aria-label="Следующий день">${ico('right', '')}</button>
        ${k !== TODAY ? '<button class="btn btn-ghost btn-sm" type="button" data-act="diary-today">К сегодняшнему дню</button>' : ''}
      </div>
      <section class="section" aria-labelledby="dm-h" style="margin-top:20px"><div class="section-head"><h2 class="h2" id="dm-h">Приёмы пищи</h2><button class="btn btn-ghost btn-sm" type="button" data-act="new-meal" data-arg="|${k}">${ico('add')}Добавить${k !== TODAY ? ' в этот день' : ''}</button></div>
      ${meals.length ? `<ul class="list">${meals.map(m => mealRow(m)).join('')}</ul>` : '<p class="muted small">В этот день записей нет.</p>'}</section>
      ${moves.length ? `<section class="section"><h2 class="h2">Движение</h2><ul class="list">${moves.map(v => `<li class="entry"><span class="grow">${ico('walk')} ${esc(v.kind)}${showNumbers() ? `, ${v.minutes} мин` : ''} <span class="tag">${v.source === 'timer' ? 'таймер + ваш ответ' : 'самоотчёт'}</span></span><button class="icon-btn plain" type="button" data-act="delete-move" data-arg="${v.id}" aria-label="Удалить запись движения">${ico('trash', '')}</button></li>`).join('')}</ul></section>` : ''}`;
    const nutr = showNumbers() && !limited() && (eatenItems.length || plannedCount)
      ? `<section class="panel"><h2 class="h3">Пищевая ценность съеденного</h2>
        ${eatenItems.length ? `<ul class="list">${NUTR.map(([k, l, u]) => {
          const known = eatenItems.filter(i => i.nutr && i.nutr[k] != null);
          const sum = known.reduce((s, i) => s + i.nutr[k], 0);
          const full = known.length === eatenItems.length;
          return `<li class="entry"><span class="grow">${l}</span><span>${known.length ? `<b>${full ? '' : 'не меньше '}${num(sum, k === 'kcal' ? 0 : 1)} ${u}</b>` : '<span class="muted">неизвестно</span>'}<br><span class="tiny muted">известно для ${known.length} из ${eatenItems.length}</span></span></li>`;
        }).join('')}</ul>` : '<p class="small muted">Съеденного за день пока нет.</p>'}
        <p class="tiny muted" style="margin-top:8px">Только фактически съеденное и только введённые вами значения — на всю указанную порцию. Неизвестное не считается нулём.${plannedCount ? ' Собранное до еды в итоги не входит.' : ''}</p></section>` : '';
    return { title: 'Дневник', main, context: `${waterWidget(k)}${nutr}` };
  };

  /* --- Черновик и сборка --- */
  function startDraft({ type, date, phase, items, mealId }) {
    const h = new Date().getHours();
    state.draft = {
      mealId: mealId || null, date: date || TODAY,
      type: type || (h < 11 ? 'first' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack'),
      phase: phase || 'before', orderStatus: 'confirmed',
      items: (items || []).map(i => ({ id: uid('c'), ...i, nutr: { ...emptyNutr(), ...(i.nutr || {}) } })),
      afterMain: null
    };
    state.search = { q: '', tab: 'all', cat: '' };
    state.showAll = false;
  }
  const compFromFood = (f, source) => ({ name: f.name, cat: f.cat, amount: f.amount, unit: f.unit, foodId: f.id, source: source || 'пример состава' });
  function allFoods() { return [...state.custom.map(c => ({ ...c, own: true })), ...D.FOODS]; }
  function recentFoods() {
    const seen = new Map();
    [...state.meals].sort((a, b) => (b.date + b.created).localeCompare(a.date + a.created)).forEach(m => m.items.forEach(i => {
      const key = i.foodId || `name:${i.name.toLowerCase()}`;
      if (!seen.has(key)) seen.set(key, { id: i.foodId || key, name: i.name, cat: i.cat, amount: i.amount, unit: i.unit, recent: true });
    }));
    return [...seen.values()].slice(0, 12);
  }
  function foodList() {
    const s = state.search, q = s.q.trim().toLowerCase();
    let list = s.tab === 'recent' ? recentFoods() : s.tab === 'fav' ? allFoods().filter(f => state.favorites.includes(f.id)) : s.tab === 'own' ? state.custom : allFoods();
    if (s.cat) list = list.filter(f => f.cat === s.cat);
    if (q) list = list.filter(f => f.name.toLowerCase().includes(q));
    return list;
  }
  function foodRows() {
    const s = state.search, list = foodList();
    const limit = state.showAll ? 200 : 4;
    const empty = { recent: 'Недавних продуктов пока нет — они появятся после первых записей.', fav: 'Избранного пока нет. Отметьте звёздочкой продукт в списке.', own: 'Своих продуктов пока нет.', all: 'Ничего не найдено.' }[s.tab];
    const create = s.q.trim() ? `<div class="food"><div class="grow"><span class="food-name">Создать своё: «${esc(s.q.trim())}»</span><small>Группу выберете сами; пищевая ценность — только если введёте вручную</small></div><button class="add" type="button" data-act="create-food" aria-label="Создать свой продукт ${esc(s.q.trim())}">${ico('add', '')}</button></div>` : '';
    if (!list.length) return `<p class="muted small" style="margin:10px 0">${empty}</p>${create}`;
    return list.slice(0, limit).map(f => {
      const fav = state.favorites.includes(f.id);
      return `<div class="food"><div class="grow"><span class="food-name">${esc(f.name)}</span><small>${catLabel(f.cat)} · ${f.own ? 'свой продукт' : f.recent ? 'недавнее' : 'пример состава'}</small></div>
        ${f.recent ? '' : `<button class="icon-btn plain" type="button" data-act="fav" data-arg="${esc(f.id)}" aria-pressed="${fav}" aria-label="${fav ? 'Убрать из избранного' : 'В избранное'}: ${esc(f.name)}">${ico('star', '')}</button>`}
        <button class="add" type="button" data-act="add-food" data-arg="${esc(f.id)}" aria-label="Добавить: ${esc(f.name)}">${ico('add', '')}</button></div>`;
    }).join('') + (list.length > limit ? `<button class="btn btn-ghost btn-sm" type="button" data-act="show-all">Показать все (${list.length})</button>` : '') + create;
  }

  function compRow(it, i, arr) {
    const n = it.nutr || {};
    return `<li class="comp" data-flip="${it.id}">
      <span class="comp-index" aria-hidden="true">${i + 1}</span>
      <span class="comp-name">${esc(it.name)} <span class="tiny muted">· ${esc(it.source || 'свой')}</span></span>
      <span class="comp-tools">
        <button class="icon-btn plain" type="button" data-act="comp-move" data-arg="${it.id}|-1" ${i === 0 ? 'disabled' : ''} aria-label="Выше: ${esc(it.name)}">${ico('up', '')}</button>
        <button class="icon-btn plain" type="button" data-act="comp-move" data-arg="${it.id}|1" ${i === arr.length - 1 ? 'disabled' : ''} aria-label="Ниже: ${esc(it.name)}">${ico('down', '')}</button>
        <button class="icon-btn plain" type="button" data-act="comp-remove" data-arg="${it.id}" aria-label="Убрать: ${esc(it.name)}">${ico('close', '')}</button>
      </span>
      <div class="comp-meta">
        <select id="cat-${it.id}" data-field="comp-cat" data-id="${it.id}" aria-label="Группа: ${esc(it.name)}">${Object.entries(D.CATS).map(([k, v]) => `<option value="${k}" ${k === it.cat ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
        <input id="amt-${it.id}" type="text" inputmode="decimal" min="0" step="any" value="${it.amount ?? ''}" data-field="comp-amount" data-id="${it.id}" aria-label="Количество: ${esc(it.name)}">
        <select id="unit-${it.id}" data-field="comp-unit" data-id="${it.id}" aria-label="Мера: ${esc(it.name)}">${D.UNITS.map(u => `<option ${u === it.unit ? 'selected' : ''}>${u}</option>`).join('')}</select>
      </div>
      ${showNumbers() && !limited() ? `<details><summary>Пищевая ценность всей порции (если знаете)</summary>
        <p class="tiny muted" style="margin:0 0 6px">Значения на всю указанную порцию, не на 100 г. Пустое поле — неизвестно.</p><div class="nutr-grid">
        ${NUTR.map(([k, l, u]) => `<div><label for="n-${k}-${it.id}">${l}, ${u}</label><input id="n-${k}-${it.id}" type="text" inputmode="decimal" value="${n[k] ?? ''}" placeholder="неизв." data-field="comp-nutr" data-id="${it.id}" data-k="${k}"></div>`).join('')}
      </div></details>` : ''}
    </li>`;
  }

  function assembly(d) {
    if (limited()) return `<p class="note safety">${ico('shield')} В ограниченном режиме сборка не даёт советов и оценок. Просто сохраните запись.</p>`;
    if (!d.items.length) return '<p class="muted small">Добавьте компоненты — здесь появится одно действие, которое реально меняет состав.</p>';
    const ev = evalMeal({ ...d, id: d.mealId || 'draft' }, d.phase);
    const adv = ev.advice;
    const advice = d.phase === 'before'
      ? (adv ? `<div class="advice pulse" id="advice"><p class="eyebrow">${adv.optional ? 'Если хотите' : 'Одно действие до еды'}</p><p style="margin:0">${esc(adv.text)}</p><button class="btn btn-amber" type="button" data-act="apply-advice" data-arg="${adv.action}">${esc(adv.label)}</button></div>`
        : `<div class="advice calm pulse" id="advice"><p class="eyebrow">Сборка готова</p><p style="margin:0">${ev.unknown ? 'Советовать нечего: по части состава данных не хватает. Это не нарушение.' : 'Менять ничего не нужно. Приятного аппетита.'}</p></div>`)
      : `<div class="advice calm"><p class="eyebrow">Уже поели</p><p style="margin:0">Прошлое не переставляем. Укажите, как ели на самом деле: неизвестный порядок не считается нарушением.</p></div>`;
    const applicable = ev.rules.filter(r => r.state !== 'na'), na = ev.rules.filter(r => r.state === 'na');
    const stIcon = { met: ico('check', ''), opportunity: ico('right', ''), unknown: '?', na: '—' };
    const stName = { met: 'подтверждено', opportunity: 'можно улучшить', unknown: 'данных не хватает', na: 'не применяется' };
    const list = showScore() ? `<div class="score-line" style="margin:12px 0 0">${pips(ev)}<b>${esc(ev.summary)}</b></div>
      <details class="disclose"><summary>Подробнее об оценке</summary><div class="disclose-body"><ul class="rules">${applicable.map(r => `<li class="rule"><span class="rule-state ${r.state}" aria-hidden="true">${stIcon[r.state]}</span><div><h4>${esc(r.title)} <span class="sr-only">— ${stName[r.state]}</span></h4><p>${esc(r.text)}</p></div></li>`).join('')}</ul>
      ${na.length ? `<details><summary class="small muted" style="min-height:44px;display:flex;align-items:center;cursor:pointer">Не применяется к этому приёму: ${na.length}</summary><ul class="rules">${na.map(r => `<li class="rule"><span class="rule-state na" aria-hidden="true">—</span><div><h4>${esc(r.title)}</h4><p>${esc(r.text)}</p></div></li>`).join('')}</ul></details>` : ''}
      <p class="tiny muted">Оценка считает только применимые правила. Глюкоза, калории, вес и движение в неё не входят.</p></div></details>` : '';
    return advice + list;
  }

  const saveLabel = d => d.mealId ? 'Сохранить изменения' : d.phase === 'before' ? 'Сохранить собранный приём' : 'Записать в дневник';
  screens.add = () => {
    const d = state.draft, s = state.search;
    const tabs = [['all', 'Все'], ['recent', 'Недавнее'], ['fav', 'Избранное'], ['own', 'Свои']];
    const cats = ['', 'veg', 'protein', 'dairy', 'starch', 'fruit', 'sweet', 'mixed'];
    // «Отменить» — вверху, как в листах iOS/Android: внизу его закрывала бы закреплённая панель состава.
    const main = `<div class="row nowrap" style="justify-content:space-between">${backLink(d.date === TODAY ? 'today' : 'diary', d.date === TODAY ? 'Сегодня' : 'Дневник')}<button class="btn btn-ghost btn-sm" type="button" data-act="cancel-draft" style="margin:-6px -10px 8px 0">Отменить</button></div>
      ${pageHead('', d.mealId ? `Изменить: ${typeLabel(d.type).toLowerCase()}` : 'Добавить еду')}
      <div class="add-meta">
        <div class="pills" role="group" aria-label="Приём пищи">${Object.entries(D.MEAL_TYPES).map(([k, v]) => `<button type="button" data-act="draft-type" data-arg="${k}" aria-pressed="${d.type === k}">${v}</button>`).join('')}</div>
        <div class="meta-line">
          <div class="seg" role="group" aria-label="Когда">${[['before', 'До еды'], ['after', 'Уже поел(а)']].map(([k, v]) => `<button type="button" data-act="draft-phase" data-arg="${k}" aria-pressed="${d.phase === k}">${v}</button>`).join('')}</div>
          <label for="draft-date" class="sr-only">Дата</label><input type="date" id="draft-date" value="${d.date}" data-field="draft-date">
        </div>
      </div>
      ${limited() ? '' : `<a class="scan-entry" href="#scan" style="margin-top:16px"><span class="ri-icon t-ai">${ico('camera', '')}</span><span class="grow"><b>Сфотографировать тарелку</b><span class="sub small muted" style="display:block">ИИ распознает состав и калории</span></span><span class="badge-soon">скоро</span></a>`}
      <section class="section" aria-labelledby="search-h" style="margin-top:16px">
        <h2 class="sr-only" id="search-h">Поиск продуктов</h2>
        <div class="search-box">${ico('search', '')}<label for="food-q" class="sr-only">Поиск продукта</label>
        <input type="search" id="food-q" placeholder="Гречка, творог, салат…" value="${esc(s.q)}" data-field="food-q" autocomplete="off"></div>
        <div class="scroller" role="group" aria-label="Источник">${tabs.map(([k, v]) => `<button class="chip" type="button" data-act="food-tab" data-arg="${k}" aria-pressed="${s.tab === k}">${v}</button>`).join('')}</div>
        <details class="disclose" ${s.cat ? 'open' : ''}><summary>${s.cat ? `Группа: ${D.CATS[s.cat].short}` : 'Фильтр по группе'}</summary>
          <div class="chips disclose-body" role="group" aria-label="Группа">${cats.map(c => `<button class="chip" type="button" data-act="food-cat" data-arg="${c}" aria-pressed="${s.cat === c}">${c ? D.CATS[c].short : 'все группы'}</button>`).join('')}</div></details>
        <div id="food-results">${foodRows()}</div>
      </section>
      <section class="section" aria-labelledby="draft-h">
        <div class="section-head"><h2 class="h2" id="draft-h" tabindex="-1">${d.phase === 'before' ? 'Состав и порядок' : 'Что вы съели'}</h2>${d.items.length ? `<span class="tag">${d.items.length} комп.</span>` : ''}</div>
        ${d.items.length ? `<ol class="list" style="list-style:none;padding:0">${d.items.map(compRow).join('')}</ol>` : '<p class="muted small">Нажмите «+» у продукта. Сложное блюдо можно добавить целиком — как «Смешанное блюдо».</p>'}
        ${d.phase === 'after' && d.items.length > 1 ? `<fieldset style="margin-top:14px"><legend>Ели в этом порядке?</legend><div class="seg" role="group">${[['confirmed', 'Да, в этом порядке'], ['unknown', 'Всё вместе / не помню']].map(([k, v]) => `<button type="button" data-act="draft-order" data-arg="${k}" aria-pressed="${d.orderStatus === k}">${v}</button>`).join('')}</div></fieldset>` : ''}
        ${d.type === 'dessert' && !limited() ? `<fieldset style="margin-top:14px"><legend>Это сразу после основной еды?</legend><div class="seg" role="group">${[[true, 'Да, сразу после'], [false, 'Нет или не знаю']].map(([k, v]) => `<button type="button" data-act="draft-aftermain" data-arg="${k}" aria-pressed="${d.afterMain === k}">${v}</button>`).join('')}</div></fieldset>` : ''}
        ${d.items.length || limited() ? `<div id="assembly" style="margin-top:14px">${assembly(d)}</div>` : '<div id="assembly"></div>'}
      </section>
      ${d.items.length ? `<div class="draft-bar" role="region" aria-label="Состав черновика">
        <span class="grow"><b>${showNumbers() ? `В составе ${d.items.length}` : 'Есть состав'}</b></span>
        <button class="btn btn-secondary btn-sm" type="button" data-act="view-draft">Посмотреть</button>
        <button class="btn btn-primary btn-sm" type="button" data-act="save-draft">${d.mealId ? 'Сохранить' : d.phase === 'before' ? 'Сохранить' : 'Записать'}</button></div>` : ''}`;
    // В ограниченном режиме справа нет подсказок по порядку групп — только нейтральное пояснение. На телефоне справка не показывается.
    const context = limited()
      ? '<section class="panel flat desk-only"><h2 class="h3">Только запись</h2><p class="small muted">Сборка без советов и оценок. Пищевая ценность не угадывается по названию.</p></section>'
      : `<section class="panel desk-only"><h2 class="h3">Порядок групп</h2><ol class="small" style="padding-left:1.2em;margin:8px 0">
      <li>Овощи, зелень, бобовые</li><li>Белок и жиры</li><li>Крахмал, затем сладкое и фрукты</li></ol>
      <p class="small muted">Смешанное блюдо не разбираем. Калории и глюкоза не считаются; карточки продуктов — примеры состава без пищевой ценности.</p></section>`;
    return { title: 'Добавить еду', main, context };
  };

  /* --- Сценарии --- */
  const choiceChips = (key, opts) => `<div class="chips" role="group">${opts.map(([v, t]) => `<button class="chip" type="button" data-act="toggle-have" data-arg="${key}|${v}" aria-pressed="${state[key].have.includes(v)}">${t}</button>`).join('')}</div>`;
  const limitedScenario = (title, type) => ({ title, main: `${backLink('today', 'Сегодня')}${pageHead('Сценарий', title)}${limitedNote()}<p>В ограниченном режиме приложение не подбирает состав. Запишите приём так, как вам удобно.</p><button class="btn btn-primary" type="button" data-act="new-meal" data-arg="${type}">${ico('add')}Записать</button>` });

  const BF = { egg: ['Яйцо', 'protein', 2, 'шт'], cottage: ['Творог или йогурт без сахара', 'dairy', 150, 'г'], cheese: ['Сыр', 'dairy', 2, 'ломтик'], fish: ['Рыба или мясо', 'protein', 100, 'г'], legume: ['Бобовые или хумус', 'legume', 3, 'ст. л.'], veg: ['Овощи', 'veg', 1, 'порция'], bread: ['Хлеб или каша', 'starch', 1, 'порция'], fruit: ['Фрукт или ягоды', 'fruit', 1, 'горсть'], pastry: ['Сладкая выпечка', 'sweet', 1, 'шт'], coffee: ['Кофе или чай без сиропа', 'drink', 1, 'чашка'] };
  screens.breakfast = () => {
    if (limited()) return limitedScenario('Первый приём пищи', 'first');
    const b = state.breakfast, have = b.have;
    const items = E.sortByRank(have.map(k => BF[k]).map(([name, cat, amount, unit]) => ({ name, cat, amount, unit, source: 'ваш выбор' })), 'first');
    const hasBase = items.some(i => ['protein', 'dairy', 'legume', 'fat'].includes(i.cat));
    const out = !have.length ? '<p class="muted">Отметьте, что есть под рукой, — соберём основу.</p>' : `
      <div class="advice ${hasBase ? 'calm' : ''}"><p class="eyebrow">${hasBase ? 'Сборка' : 'Одно действие'}</p>
      ${hasBase ? `<ol style="margin:0;padding-left:1.2em">${items.map(i => `<li>${esc(i.name)}${i.cat === 'starch' ? ' — по желанию, в конце' : i.cat === 'fruit' || i.cat === 'sweet' ? ' — после основы' : ''}</li>`).join('')}</ol>`
        : '<p style="margin:0">Пока нет несладкой основы. Если есть возможность, добавьте яйцо, творог, сыр или бобовые — сладкое тогда в конце.</p>'}
      ${have.includes('coffee') ? '<p class="small" style="margin:0">Кофе — без сиропа; если хочется сладкого, лучше после еды.</p>' : ''}</div>
      <button class="btn btn-primary btn-block" type="button" data-act="scenario-draft" data-arg="breakfast" style="margin-top:12px">${ico('add')}Собрать черновик</button>`;
    return { title: 'Первый приём', main: `${backLink('today', 'Сегодня')}${pageHead('Сценарий', 'Первый приём пищи', 'Не привязан ко времени: это ваш первый приём, когда бы он ни был.')}
      <fieldset><legend>Это первый приём пищи сегодня?</legend><div class="seg" role="group">${[['yes', 'Да'], ['no', 'Нет, уже ел(а)']].map(([k, v]) => `<button type="button" data-act="bf-first" data-arg="${k}" aria-pressed="${b.first === k}">${v}</button>`).join('')}</div></fieldset>
      ${b.first === 'no' ? '<p class="note">Тогда это обычный приём — откройте сборку, она подскажет порядок.</p><button class="btn btn-secondary" type="button" data-act="new-meal" data-arg="lunch">Открыть сборку</button>' : `
      <section class="section"><h2 class="h2" style="margin-bottom:10px">Что есть под рукой?</h2>${choiceChips('breakfast', Object.entries(BF).map(([k, v]) => [k, v[0]]))}</section>
      <section class="section" aria-live="polite">${out}</section>`}` };
  };

  const SN = { nuts: ['Орехи', 'fat', 1, 'горсть'], cheese: ['Сыр', 'dairy', 2, 'ломтик'], yogurt: ['Йогурт без сахара', 'dairy', 150, 'г'], hummus: ['Хумус', 'legume', 3, 'ст. л.'], veg: ['Овощные палочки', 'veg', 1, 'порция'], egg: ['Яйцо', 'protein', 1, 'шт'], fruit: ['Фрукт', 'fruit', 1, 'шт'], bread: ['Хлебцы', 'starch', 2, 'шт'], sweet: ['Что-то сладкое', 'sweet', 1, 'порция'] };
  screens.snack = () => {
    if (limited()) return limitedScenario('Перекус', 'snack');
    const have = state.snack.have;
    const chosen = have.map(k => SN[k]);
    const base = chosen.filter(c => ['fat', 'dairy', 'legume', 'protein', 'veg'].includes(c[1]));
    const sweet = have.includes('sweet');
    const carbOnly = chosen.filter(c => ['fruit', 'starch'].includes(c[1]));
    let out = '<p class="muted">Отметьте, что доступно.</p>';
    if (have.length) {
      const combo = [...base.slice(0, 2), ...carbOnly.slice(0, 1)];
      out = `<div class="advice ${base.length ? 'calm' : ''}"><p class="eyebrow">${base.length ? 'Несладкий вариант' : 'Одно действие'}</p>
        ${base.length ? `<p style="margin:0">${esc(combo.map(c => c[0]).join(' + '))}${carbOnly.length ? ' — фрукт или хлебцы вместе с белком/жиром' : ''}.</p>` : '<p style="margin:0">Сейчас только крахмал или фрукт. Если можно, добавьте орехи, сыр, йогурт без сахара или хумус.</p>'}
        ${sweet ? '<p class="small" style="margin:0">Сладкое не запрещено: его удобно съесть после основной еды как десерт.</p>' : ''}</div>
        <div class="row" style="margin-top:12px"><button class="btn btn-primary grow" type="button" data-act="scenario-draft" data-arg="snack">${ico('add')}Собрать перекус</button>
        ${sweet ? '<button class="btn btn-secondary grow" type="button" data-act="scenario-draft" data-arg="dessert">Записать сладкое как десерт</button>' : ''}</div>`;
    }
    return { title: 'Перекус', main: `${backLink('today', 'Сегодня')}${pageHead('Сценарий', 'Перекус', 'Если он нужен — лучше несладкий. Дополнительная соль не нужна.')}
      <p class="note safety">Если сейчас слабость, дрожь, сильное потоотделение или вы принимаете сахароснижающие препараты — не ждите и не терпите: поешьте и следуйте плану, согласованному с врачом.</p>
      <section class="section"><h2 class="h2" style="margin-bottom:10px">Что есть под рукой?</h2>${choiceChips('snack', Object.entries(SN).map(([k, v]) => [k, v[0]]))}</section>
      <section class="section" aria-live="polite">${out}</section>` };
  };

  const RS = { salad: ['Салат или овощная закуска', 'veg'], soup: ['Суп', 'mixed'], main: ['Мясо, рыба или птица', 'protein'], side: ['Гарнир: картофель, рис, паста', 'starch'], bread: ['Хлеб на столе', 'starch'], dessert: ['Десерт', 'sweet'], drink: ['Сладкий напиток', 'sweet'] };
  screens.restaurant = () => {
    if (limited()) return limitedScenario('Ресторан', 'lunch');
    const have = state.restaurant.have;
    const order = E.sortByRank(have.map(k => ({ key: k, name: RS[k][0], cat: RS[k][1] })), 'lunch');
    const steps = order.map(i => {
      if (i.key === 'bread') return 'Хлеб — не первым, если есть другой вариант';
      if (i.key === 'drink') return 'Сладкий напиток — лучше к десерту; вода или чай без сахара — к еде';
      if (i.key === 'dessert') return 'Десерт — в конце, если хочется';
      return i.name;
    });
    const out = !have.length ? '<p class="muted">Отметьте, что есть в меню или на столе.</p>' : `
      <div class="advice calm"><p class="eyebrow">Простая сборка</p><ol style="margin:0;padding-left:1.2em">${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      ${!have.includes('salad') ? '<p class="small" style="margin:0">Овощей в меню нет? Можно съесть немного овощей дома перед выходом или начать с белкового блюда.</p>' : ''}</div>
      <button class="btn btn-primary btn-block" type="button" data-act="scenario-draft" data-arg="restaurant" style="margin-top:12px">${ico('add')}Перенести в черновик</button>`;
    return { title: 'Ресторан', main: `${backLink('today', 'Сегодня')}${pageHead('Сценарий', 'В ресторане', 'Отметьте доступное — подскажем порядок. Меню и состав блюд мы не знаем и не придумываем.')}
      <section class="section"><h2 class="h2" style="margin-bottom:10px">Что доступно?</h2>${choiceChips('restaurant', Object.entries(RS).map(([k, v]) => [k, v[0]]))}</section>
      <section class="section" aria-live="polite">${out}</section>
      <p class="note">Пищевая ценность ресторанных блюд неизвестна. Об аллергенах спрашивайте в заведении.</p>` };
  };

  /* --- План --- */
  const planTabs = cur => `<div class="seg" role="group" aria-label="Разделы плана" style="margin-bottom:18px">${[['plan', 'Неделя'], ['plan/ideas', 'Идеи'], ['plan/shopping', 'Покупки'], ['plan/habits', 'Привычки']]
    .filter(([h]) => !limited() || h === 'plan/habits').map(([h, t]) => `<a class="btn btn-sm" style="flex:1;${cur === h ? 'background:var(--surface);box-shadow:0 1px 3px #10233a22' : 'color:var(--ink-2)'}" href="#${h}" ${cur === h ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</div>`;
  const weekDays = () => { const m = mondayOf(state.planDate); return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(m, i)); };

  screens.plan = () => {
    const sub = state.params[0] || '';
    if (sub === 'habits') return habitsScreen();
    if (limited()) return { title: 'План', main: `${pageHead('План', 'План')}${limitedNote()}<p>Планы питания и идеи блюд в ограниченном режиме не предлагаются. Доступны нейтральные привычки.</p><a class="btn btn-primary" href="#plan/habits">Привычки</a>` };
    if (sub === 'ideas') return ideasScreen();
    if (sub === 'shopping') return shoppingScreen();
    const days = weekDays(), k = state.planDate, plan = state.plan[k] || [];
    const main = `${pageHead('', 'План')}${planTabs('plan')}
      <div class="row nowrap" style="margin-bottom:10px"><button class="icon-btn" type="button" data-act="plan-week" data-arg="-7" aria-label="Предыдущая неделя">${ico('left', '')}</button>
        <b class="grow" style="text-align:center">${fmtShort(days[0])} — ${fmtShort(days[6])}</b>
        <button class="icon-btn" type="button" data-act="plan-week" data-arg="7" aria-label="Следующая неделя">${ico('right', '')}</button></div>
      <div class="week-strip" role="group" aria-label="День недели">${days.map((d, i) => `<button class="day-btn" type="button" data-act="plan-day" data-arg="${d}" aria-pressed="${d === k}" aria-label="${fmtDay(d)}${(state.plan[d] || []).length ? ', есть план' : ''}"><span>${WD[i]}</span><b>${dateOf(d).getDate()}</b><span class="dot ${(state.plan[d] || []).length ? '' : 'off'}"></span></button>`).join('')}</div>
      <section class="section" aria-labelledby="pd-h" style="margin-top:20px"><h2 class="h2" id="pd-h" style="margin-bottom:6px">${esc(relDay(k))}</h2>
        ${plan.length ? `<ul class="list today-list">${plan.map(p => { const i = ideaById(p.ideaId); return `<li class="row-item" data-flip="${p.id}"><span class="ri-icon">${ico(TYPE_ICON[p.slot] || 'plate', '')}</span><a class="grow" href="#idea/${i.id}"><b>${esc(i.name)}</b><span class="sub">${typeLabel(p.slot)}</span></a>
          <details class="more"><summary aria-label="Действия: ${esc(i.name)}">${ico('dots', '')}</summary><div class="more-menu">
          <button class="btn btn-ghost btn-sm" type="button" data-act="idea-draft" data-arg="${i.id}|${p.slot}|${k}">${ico('add')}В черновик</button>
          <button class="btn btn-ghost btn-sm danger" type="button" data-act="plan-remove" data-arg="${k}|${p.id}" aria-label="Убрать из плана: ${esc(i.name)}">${ico('close')}Убрать из плана</button></div></details></li>`; }).join('')}</ul>`
          : '<p class="muted small">На этот день ничего не запланировано.</p>'}
        <div class="scroller" role="group" aria-label="Добавить идею" style="margin-top:12px">${['first', 'lunch', 'dinner', 'snack'].map(slot => `<button class="chip" type="button" data-act="plan-pick" data-arg="${k}|${slot}">${ico('add', 'ico')}${typeLabel(slot)}</button>`).join('')}</div>
      </section>`;
    return { title: 'План', main, context: shoppingPanel(true) };
  };

  function ideasScreen() {
    const f = state.ideaFilter;
    const list = D.IDEAS.filter(i => !f || i.slots.includes(f));
    return { title: 'Идеи блюд', main: `${pageHead('План', 'Идеи блюд', 'Собственные простые составы прототипа. Пищевая ценность не рассчитана.')}${planTabs('plan/ideas')}
      <div class="chips" role="group" aria-label="Фильтр" style="margin-bottom:14px">${[['', 'Все'], ['first', 'Первый приём'], ['lunch', 'Обед'], ['dinner', 'Ужин'], ['snack', 'Перекус'], ['dessert', 'Десерт']].map(([k, v]) => `<button class="chip" type="button" data-act="idea-filter" data-arg="${k}" aria-pressed="${f === k}">${v}</button>`).join('')}</div>
      <div class="ideas">${list.map(i => `<a class="idea" href="#idea/${i.id}"><span class="idea-art">${ideaArt(i.art)}</span><h3>${esc(i.name)}</h3><span class="row small muted">${ico('timer')} ${i.minutes} мин · ${i.slots.map(typeLabel).join(', ').toLowerCase()}</span></a>`).join('')}</div>` };
  }

  screens.idea = () => {
    if (limited()) return screens.plan();
    const i = ideaById(state.params[0]) || D.IDEAS[0];
    return { title: i.name, main: `${backLink('plan/ideas', 'Идеи')}
      <div class="idea-art" style="height:140px;margin-bottom:16px">${ideaArt(i.art)}</div>
      ${pageHead(`${i.minutes} мин · ${i.slots.map(typeLabel).join(', ').toLowerCase()}`, esc(i.name))}
      <div class="row"><button class="btn btn-primary" type="button" data-act="idea-draft" data-arg="${i.id}|${i.slots[0]}">${ico('add')}В черновик</button><button class="btn btn-secondary" type="button" data-act="idea-to-plan" data-arg="${i.id}">${ico('plan')}В план</button></div>
      <section class="section"><h2 class="h2" style="margin-bottom:10px">В дневник попадёт</h2><ol class="small" style="padding-left:1.2em;margin:0 0 6px">${i.eat.map(([n, c]) => `<li>${esc(n)} <span class="tiny muted">${D.CATS[c].short}${c === 'mixed' ? ' — готовое блюдо целиком, не разбираем' : ''}</span></li>`).join('')}</ol></section>
      <section class="section"><h2 class="h2" style="margin-bottom:10px">Ингредиенты для приготовления и покупок</h2><ul class="ingr">${i.items.map(([n, c, a, u]) => `<li><span>${esc(n)} <span class="tiny muted">${D.CATS[c].short}</span></span><span>${num(a)} ${u}</span></li>`).join('')}</ul></section>
      <section class="section"><h2 class="h2" style="margin-bottom:10px">Шаги</h2><ol class="steps">${i.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></section>
      <p class="note">Собственная идея прототипа, не из книг и чужих баз. Калории не рассчитаны.</p>` };
  };

  function shoppingItems() {
    const map = new Map();
    weekDays().forEach(d => (state.plan[d] || []).forEach(p => ideaById(p.ideaId).items.forEach(([n, , a, u]) => {
      const key = `${n}|${u}`;
      const cur = map.get(key) || { name: n, unit: u, amount: 0, key };
      cur.amount += a; map.set(key, cur);
    })));
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }
  function shoppingPanel(compact) {
    const list = shoppingItems();
    if (!list.length) return `<section class="panel"><h2 class="h3">${ico('cart')} Покупки на неделю</h2><p class="small muted">Добавьте идеи в план — список соберётся автоматически.</p></section>`;
    const left = list.filter(x => !state.shopDone.includes(x.key)).length;
    return `<section class="panel"><div class="section-head"><h2 class="h3">${ico('cart')} Покупки на неделю</h2><span class="tag">${left} осталось</span></div>
      <ul class="shop">${list.slice(0, compact ? 8 : 200).map(x => { const done = state.shopDone.includes(x.key); return `<li class="${done ? 'done' : ''}"><label><span class="row nowrap"><input type="checkbox" data-field="shop" value="${esc(x.key)}" ${done ? 'checked' : ''}>${esc(x.name)}</span><span class="muted">${num(x.amount)} ${esc(x.unit)}</span></label></li>`; }).join('')}</ul>
      ${compact && list.length > 8 ? `<a class="btn btn-ghost btn-sm" href="#plan/shopping">Весь список (${list.length})</a>` : ''}
      ${compact ? '' : `<div class="row" style="margin-top:12px"><button class="btn btn-secondary btn-sm" type="button" data-act="shop-copy">${ico('copy')}Скопировать</button><button class="btn btn-secondary btn-sm" type="button" data-act="shop-download">${ico('download')}Скачать .txt</button></div>`}</section>`;
  }
  function shoppingScreen() {
    return { title: 'Покупки', main: `${pageHead('План', 'Список покупок', 'Собирается из идей, добавленных в план этой недели. Совпадающие продукты суммируются.')}${planTabs('plan/shopping')}${shoppingPanel(false)}` };
  }

  function habitsScreen() {
    const chosen = visibleHabits();
    const opts = D.HABITS.filter(h => !limited() || h.neutral);
    const days = weekDays();
    const marked = days.reduce((s, d) => s + chosen.filter(h => !h.paused && h.days.includes(weekdayIdx(d)) && (state.habits.marks[d] || []).includes(h.id)).length, 0);
    const planned = days.filter(d => d <= TODAY).reduce((s, d) => s + chosen.filter(h => !h.paused && h.days.includes(weekdayIdx(d))).length, 0);
    const main = `${pageHead('План', 'Привычки', 'Выберите от одной до трёх. Пропуск ничего не обнуляет — серий нет.')}${planTabs('plan/habits')}
      ${limitedNote()}
      <section aria-labelledby="ch-h"><div class="section-head"><h2 class="h2" id="ch-h">Выбранные</h2><span class="tag">${chosen.length} из 3</span></div>
      ${chosen.length ? `<ul class="list">${chosen.map(h => { const d = habitDef(h.id); return `<li class="stack" style="padding:12px 0" data-flip="h-${h.id}">
          <div class="row nowrap"><b class="grow">${esc(d.name)}</b>${h.paused ? '<span class="tag amber">пауза</span>' : ''}
          <button class="btn btn-ghost btn-sm" type="button" data-act="habit-pause" data-arg="${h.id}">${h.paused ? 'Продолжить' : 'Пауза'}</button>
          <button class="icon-btn plain" type="button" data-act="habit-remove" data-arg="${h.id}" aria-label="Убрать привычку: ${esc(d.name)}">${ico('close', '')}</button></div>
          <div class="days" role="group" aria-label="Дни для: ${esc(d.name)}">${WD.map((w, i) => `<button type="button" data-act="habit-day" data-arg="${h.id}|${i}" aria-pressed="${h.days.includes(i)}">${w}</button>`).join('')}</div></li>`; }).join('')}</ul>`
        : '<p class="muted">Пока ничего не выбрано.</p>'}</section>
      <section class="section" aria-labelledby="wk-h"><div class="section-head"><h2 class="h2" id="wk-h">Неделя</h2>${showNumbers() && planned ? `<span class="tag accent">отмечено ${marked} из ${planned} запланированных</span>` : ''}</div>
      ${chosen.length ? `<div class="grid-week" role="table" aria-label="Отметки за неделю"><span role="columnheader"></span>${days.map((d, i) => `<span class="hd" role="columnheader">${WD[i]}</span>`).join('')}
        ${chosen.map(h => `<span class="nm" role="rowheader">${esc(habitDef(h.id).name)}</span>${days.map(d => {
          const sched = !h.paused && h.days.includes(weekdayIdx(d)), on = (state.habits.marks[d] || []).includes(h.id), future = d > TODAY;
          if (!sched) return '<span class="cell off" role="cell" aria-label="не запланировано">·</span>';
          if (future) return `<span class="cell" role="cell" aria-label="${fmtDay(d)}: впереди"></span>`;
          return `<button class="cell ${on ? 'on' : ''}" role="cell" type="button" data-act="mark-habit" data-arg="${h.id}|${d}" aria-pressed="${on}" aria-label="${esc(habitDef(h.id).name)}, ${fmtDay(d)}: ${on ? 'отмечено' : 'не отмечено'}" style="border:0;width:100%">${on ? ico('check', '') : ''}</button>`;
        }).join('')}`).join('')}</div>
        <p class="tiny muted" style="margin-top:8px">Обзор строится только из ваших отметок в этой вкладке. Забыли отметить — нажмите на день.</p>` : '<p class="muted small">Выберите привычку, и здесь появится недельный обзор.</p>'}</section>
      <section class="section" aria-labelledby="op-h"><h2 class="h2" id="op-h" style="margin-bottom:8px">Варианты</h2>
      <ul class="list">${opts.map(o => { const on = chosen.some(c => c.id === o.id); return `<li class="habit"><div class="grow"><b>${esc(o.name)}</b><p class="small muted" style="margin:0">${esc(o.hint)}</p></div>
        <button class="btn ${on ? 'btn-secondary' : 'btn-accent'} btn-sm" type="button" data-act="habit-toggle" data-arg="${o.id}" aria-pressed="${on}">${on ? 'Выбрано' : 'Выбрать'}</button></li>`; }).join('')}</ul></section>`;
    return { title: 'Привычки', main };
  }

  /* --- Движение --- */
  const fmtTime = ms => { const s = Math.ceil(ms / 1000); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
  screens.move = () => {
    const movesToday = state.moves.filter(v => v.date === TODAY);
    const movesList = movesToday.length ? `<section class="section"><h2 class="h2" style="margin-bottom:8px">Записано сегодня</h2><ul class="list">${movesToday.map(v => `<li class="entry" data-flip="${v.id}"><span class="grow">${ico('walk')} ${esc(v.kind)}, ${v.minutes} мин <span class="tag">${v.source === 'timer' ? 'таймер + ваш ответ' : 'самоотчёт'}</span></span><button class="icon-btn plain" type="button" data-act="delete-move" data-arg="${v.id}" aria-label="Удалить запись движения">${ico('trash', '')}</button></li>`).join('')}</ul></section>` : '';
    const selfForm = `<section class="section" aria-labelledby="sr-h"><h2 class="h2" id="sr-h">Записать самостоятельно</h2>
      <div class="field-row"><div><label for="sr-kind">Что делали</label><select id="sr-kind">${['Ходьба', 'Домашние дела', 'Упражнения', 'Другое'].map(k => `<option>${k}</option>`).join('')}</select></div>
      <div><label for="sr-min">Минут</label><input id="sr-min" type="number" min="1" max="240" value="15" inputmode="numeric"></div></div>
      <button class="btn btn-secondary" type="button" data-act="self-save" style="margin-top:12px">Записать</button></section>`;
    if (limited()) return { title: 'Движение', main: `${backLink('today', 'Сегодня')}${pageHead('Движение', 'Записи активности')}${limitedNote()}<p>Приложение не предлагает нагрузку в ограниченном режиме. Если хотите, можно записать активность сами.</p>${selfForm}${movesList}` };
    const t = state.timer, R = 100, C = 2 * Math.PI * R;
    const frac = t.total ? t.remaining / t.total : 1;
    const eaten = mealsOn(TODAY).filter(m => m.status === 'eaten');
    const main = `${backLink('today', 'Сегодня')}${pageHead('После еды', 'Таймер движения', 'Обычно 10–20 минут ходьбы или домашних дел, начать удобно в пределах ~70 минут после еды. По самочувствию.')}
      ${t.awaiting ? `<div class="confirm-move pulse" role="alert"><b>Время вышло. Вы двигались?</b><p class="small muted" style="margin:0">Таймер не подтверждает движение — подтверждаете вы. Шаги не считаются.</p>
        <div class="row"><button class="btn btn-primary" type="button" data-act="move-yes">Да, двигался(ась)</button><button class="btn btn-secondary" type="button" data-act="move-no">Нет, не получилось</button></div></div>` : ''}
      <div class="seg" role="group" aria-label="Длительность" style="margin-top:14px">${[10, 15, 20].map(n => `<button type="button" data-act="timer-len" data-arg="${n}" aria-pressed="${t.total === n * 60000}" ${t.running ? 'disabled' : ''}>${n} мин</button>`).join('')}</div>
      <div class="timer-wrap"><svg class="ring" viewBox="0 0 240 240" role="timer" aria-label="Осталось ${fmtTime(t.remaining)}">
        <circle class="track" cx="120" cy="120" r="${R}"/><circle class="prog" id="ring-prog" cx="120" cy="120" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"/>
        <text x="120" y="124" text-anchor="middle" id="ring-text">${fmtTime(t.remaining)}</text><text class="sub" x="120" y="150" text-anchor="middle">${t.running ? 'идёт' : t.remaining < t.total ? 'пауза' : 'готов'}</text></svg></div>
      <div class="row">
        <button class="btn btn-primary grow" type="button" data-act="timer-toggle">${t.running ? `${ico('pause')}Пауза` : `${ico('play')}${t.remaining < t.total && !t.awaiting ? 'Продолжить' : 'Старт'}`}</button>
        <button class="btn btn-secondary grow" type="button" data-act="timer-reset" ${t.remaining === t.total && !t.running ? 'disabled' : ''}>Сбросить</button></div>
      ${eaten.length ? `<label for="timer-meal">После какого приёма</label><select id="timer-meal" data-field="timer-meal"><option value="">Не привязывать</option>${eaten.map(m => `<option value="${m.id}" ${t.mealId === m.id ? 'selected' : ''}>${typeLabel(m.type)}</option>`).join('')}</select>` : ''}
      <p class="tiny muted" style="margin-top:10px">Можно уйти на другой экран — время не потеряется. Движение не повышает оценку блюда.</p>
      ${selfForm}${movesList}`;
    return { title: 'Таймер движения', main };
  };

  /* --- Прогресс --- */
  function chartSvg(points, opts = {}) {
    const W = 560, H = 220, pl = 40, pr = 12, pt = 16, pb = 30;
    const vals = points.map(p => p.v).filter(v => v != null);
    const meds = (opts.median || []).filter(p => p.v != null);
    const all = [...vals, ...meds.map(p => p.v)];
    let lo = Math.min(...all), hi = Math.max(...all);
    if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
    const span = Math.max(1, E.dayDiff(points[points.length - 1].d, points[0].d));
    const x = d => pl + (W - pl - pr) * (E.dayDiff(d, points[0].d) / span);
    const y = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
    const real = points.filter(p => p.v != null);
    // Линия не соединяет даты через отсутствующие календарные дни.
    const lines = (list, cls) => {
      const groups = [];
      for (const p of list) {
        const last = groups[groups.length - 1];
        if (!last || E.dayDiff(p.d, last[last.length - 1].d) > 1) groups.push([p]);
        else last.push(p);
      }
      return groups.filter(g => g.length > 1).map(g => `${cls === 'line' ? `<polygon class="area" fill="url(#areaGrad)" points="${x(g[0].d).toFixed(1)},${H - pb} ${g.map(p => `${x(p.d).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')} ${x(g[g.length - 1].d).toFixed(1)},${H - pb}"/>` : ''}<polyline class="${cls}" pathLength="1" data-dates="${g.map(p => p.d).join(',')}" points="${g.map(p => `${x(p.d).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')}"/>`).join('');
    };
    const ticks = [lo, (lo + hi) / 2, hi];
    return `<svg class="chart ${opts.example ? 'example' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label)}">
      <defs><linearGradient id="lineGrad" x1="0" x2="1"><stop offset="0" stop-color="#2f8fe0"/><stop offset="1" stop-color="#13a47a"/></linearGradient>
      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#13a47a" stop-opacity="0.28"/><stop offset="1" stop-color="#13a47a" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map(v => `<line class="axis" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${num(v)}</text>`).join('')}
      <text x="${pl}" y="${H - 8}">${fmtShort(points[0].d)}</text><text x="${W - pr}" y="${H - 8}" text-anchor="end">${fmtShort(points[points.length - 1].d)}</text>
      ${opts.example ? `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" style="font-size:28px;font-weight:700;opacity:.12;letter-spacing:6px">ПРИМЕР</text>` : ''}
      ${lines(meds, 'median')}
      ${lines(real, 'line')}
      ${real.map((p, i) => `<circle class="pt" style="--i:${i}" cx="${x(p.d)}" cy="${y(p.v)}" r="4.5"/>`).join('')}</svg>`;
  }
  function medianSeries(entries) {
    const days = [...new Set(entries.map(e => e.date))].sort();
    return days.map(d => ({ d, v: E.median7(entries, d) }));
  }

  // Макет тела: объёмный манекен на подиуме, полосы замеров и выноски со значениями.
  // Значения — только ваши записи (примеры в демо подписаны); без «идеальной фигуры» и сравнений.
  // [название, точка на теле x,y, сторона выноски, y подписи, полуширина полосы (0 — без полосы)]
  const BODY_POINTS = [['Грудь', 150, 92, 'r', 80, 37], ['Плечо', 103, 112, 'l', 98, 0], ['Талия', 150, 134, 'l', 150, 31], ['Бёдра', 150, 164, 'r', 180, 38]];
  function bodyCard() {
    const latest = k => [...state.measures].filter(m => m.kind === k).sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created)[0];
    const label = BODY_POINTS.map(([k]) => { const m = latest(k); return `${k}: ${m ? num(m.cm) + ' см' : 'нет замера'}`; }).join(', ');
    const callouts = BODY_POINTS.map(([k, x, y, side, ly, band], i) => {
      const m = latest(k), r = side === 'r', ex = r ? 236 : 64, tx = r ? 240 : 60, anchor = r ? 'start' : 'end';
      return `<g class="callout ${m ? '' : 'none'}" style="--i:${i}">
        ${band ? `<ellipse class="band" pathLength="1" cx="150" cy="${y}" rx="${band}" ry="7"/>` : ''}
        <path class="lead" pathLength="1" d="M${x} ${y} L${r ? x + 40 : x - 22} ${ly} L${ex} ${ly}"/>
        <circle class="pulse" cx="${x}" cy="${y}" r="5"/><circle class="pin" cx="${x}" cy="${y}" r="4"/>
        <text class="lbl" x="${tx}" y="${ly - 6}" text-anchor="${anchor}">${k.toUpperCase()}</text>
        <text class="val" x="${tx}" y="${ly + 14}" text-anchor="${anchor}">${m ? `${num(m.cm)} см` : '—'}</text>
        ${m && m.demo ? `<text class="lbl" x="${tx}" y="${ly + 28}" text-anchor="${anchor}">пример</text>` : ''}</g>`;
    }).join('');
    return `<section class="section" aria-labelledby="body-h"><h2 class="h2" id="body-h" style="margin-bottom:8px">Тело</h2><div class="body-card">
      <svg class="body-svg" viewBox="0 0 300 330" role="img" aria-label="Схема тела. ${esc(label)}">
        <defs>
          <linearGradient id="bodyGrad" gradientUnits="userSpaceOnUse" x1="150" y1="10" x2="150" y2="320"><stop offset="0" stop-color="#3fe0c0"/><stop offset=".55" stop-color="#19a991"/><stop offset="1" stop-color="#2f8fe0"/></linearGradient>
          <radialGradient id="podGrad"><stop offset="0" stop-color="#3fe0c0" stop-opacity=".55"/><stop offset="1" stop-color="#3fe0c0" stop-opacity="0"/></radialGradient>
          <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></linearGradient>
          <g id="fig" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="150" cy="34" r="19" stroke-width="0"/><rect x="142" y="50" width="16" height="16" rx="7" stroke-width="0"/>
            <path stroke-width="0" d="M116 66Q150 58 184 66Q195 70 192 86L183 130Q180 140 184 150L188 170Q150 184 112 170L116 150Q120 140 117 130L108 86Q105 70 116 66Z"/>
            <path fill="none" stroke-width="17" d="M113 78L101 140L95 196"/><path fill="none" stroke-width="17" d="M187 78L199 140L205 196"/>
            <path fill="none" stroke-width="25" d="M135 170L131 238L129 296"/><path fill="none" stroke-width="25" d="M165 170L169 238L171 296"/>
          </g>
          <mask id="figMask"><use href="#fig" fill="#fff" stroke="#fff"/></mask>
        </defs>
        <g class="grid" aria-hidden="true">${[60, 100, 140].map(r => `<circle cx="150" cy="170" r="${r}"/>`).join('')}</g>
        <ellipse class="podium" cx="150" cy="306" rx="78" ry="13" fill="url(#podGrad)"/><ellipse class="podium-ring" cx="150" cy="306" rx="60" ry="8"/>
        <g class="figure"><use href="#fig" fill="url(#bodyGrad)" stroke="url(#bodyGrad)"/>
          <g mask="url(#figMask)"><rect class="shine" x="90" y="0" width="40" height="330"/><rect class="scan" x="60" y="0" width="180" height="46"/></g></g>
        ${callouts}
      </svg></div>
      <p class="tiny muted" style="margin-top:6px">Выноски показывают последние замеры. Добавить — в разделе «Замеры» ниже.</p></section>`;
  }
  screens.progress = () => {
    if (!showNumbers()) return { title: 'Прогресс', main: `${pageHead('Прогресс', 'Прогресс')}<p class="lead">Режим без цифр скрывает вес, оценки и графики на всех экранах.</p><a class="btn btn-secondary" href="#settings">Настройки цифр</a>
      <section class="section">${habitWeekCompact()}</section>` };
    // Ограниченный режим в прототипе: без тела и веса, только нейтральный обзор отметок.
    if (limited()) return { title: 'Прогресс', main: `${pageHead('Прогресс', 'Неделя')}${limitedNote()}<p class="lead">Вес, замеры и графики в ограниченном режиме не показываются.</p>
      <section class="section">${habitWeekCompact()}</section>` };
    const ws = [...state.weights].sort((a, b) => a.date.localeCompare(b.date) || a.created - b.created);
    const entries = ws.map(w => ({ date: w.date, value: w.kg }));
    const med = E.median7(entries, TODAY);
    const ex = state.chartMode === 'example';
    let chart;
    if (limited()) chart = '<p class="note safety">В ограниченном режиме графиков, медианы и целей нет. Записи остаются вашими.</p>';
    else if (ex) {
      const pts = D.EXAMPLE_WEIGHTS.map((v, i) => ({ d: addDays(TODAY, i - D.EXAMPLE_WEIGHTS.length + 1), v }));
      const exEntries = pts.filter(p => p.v != null).map(p => ({ date: p.d, value: p.v }));
      chart = `<p class="tag amber" style="margin-bottom:8px">Пример · вымышленные значения, не ваши данные</p>${chartSvg(pts, { example: true, median: medianSeries(exEntries), label: 'Пример графика веса с вымышленными значениями' })}`;
    } else if (ws.length < 2) chart = `<div class="empty">${ico('progress')}<p>Чтобы увидеть линию, нужно хотя бы две записи веса. Пробелы не дорисовываются.</p></div>`;
    else chart = chartSvg(ws.map(w => ({ d: w.date, v: w.kg })), { median: medianSeries(entries), label: `График ваших записей веса: ${ws.length}` });
    // Сначала то, ради чего открывают экран: последнее значение, медиана и график. Ввод — одной строкой, списки свёрнуты.
    const main = `${pageHead('', 'Прогресс')}
      ${limitedNote()}
      <div class="stats"><div class="stat"><span class="small muted">Последняя запись</span><b>${ws.length ? `${num(ws[ws.length - 1].kg)} кг` : '—'}</b></div>
        <div class="stat"><span class="small muted">Медиана за 7 дней</span><b>${med != null ? `${num(med)} кг` : '—'}</b>${med == null ? '<span class="tiny muted">нужно 3 дня с измерениями</span>' : ''}</div></div>
      ${limited() ? '' : `<section class="section" aria-labelledby="ch-h" style="margin-top:18px"><h2 class="sr-only" id="ch-h">График</h2>
        ${chart}
        <div class="row" style="justify-content:space-between;margin-top:6px"><div class="legend"><span><i></i>измерения</span><span><i class="med"></i>медиана 7 дней</span></div>
        <button class="btn btn-ghost btn-sm" type="button" data-act="chart-mode" data-arg="${ex ? 'mine' : 'example'}" aria-pressed="${ex}">${ex ? 'Мои записи' : 'Пример графика'}</button></div></section>`}
      ${bodyCard()}
      <section class="section" aria-labelledby="w-h"><h2 class="h2" id="w-h" style="margin-bottom:8px">Добавить вес</h2>
        <div class="weight-line"><label for="w-kg" class="sr-only">Вес, кг</label><input type="text" id="w-kg" min="20" max="400" step="0.1" inputmode="decimal" placeholder="Вес, кг">
        <label for="w-date" class="sr-only">Дата</label><input type="date" id="w-date" value="${TODAY}" max="${TODAY}">
        <button class="btn btn-primary" type="button" data-act="weight-add">Добавить</button></div>
        <p class="tiny muted" style="margin-top:6px">Только ваши записи. Без прогноза даты и норм калорий.</p></section>
      <section class="section">
        <details class="disclose" data-keep="weights" ${keepOpen('weights')}><summary>Записи веса${ws.length ? ` (${ws.length})` : ''}</summary><div class="disclose-body">
        ${ws.length ? `<ul class="list">${[...ws].reverse().map(w => `<li class="entry" data-flip="${w.id}"><span class="grow">${esc(relDay(w.date))} · <b>${num(w.kg)} кг</b>${demoTag(w)}</span>
          <button class="icon-btn plain" type="button" data-act="weight-edit" data-arg="${w.id}" aria-label="Изменить запись веса за ${esc(relDay(w.date))}">${ico('edit', '')}</button><button class="icon-btn plain" type="button" data-act="weight-delete" data-arg="${w.id}" aria-label="Удалить запись веса за ${esc(relDay(w.date))}">${ico('trash', '')}</button></li>`).join('')}</ul>`
        : '<p class="muted small">Записей пока нет.</p>'}</div></details>
        <details class="disclose" id="measures" data-keep="measures" ${keepOpen('measures')}><summary>Замеры${state.measures.length ? ` (${state.measures.length})` : ''}</summary><div class="disclose-body">
        <div class="field-row"><div><label for="m-kind">Что</label><select id="m-kind">${['Талия', 'Бёдра', 'Грудь', 'Плечо'].map(k => `<option>${k}</option>`).join('')}</select></div>
        <div><label for="m-cm">См</label><input id="m-cm" type="text" min="10" max="300" step="0.5" inputmode="decimal"></div>
        <div><label for="m-date">Дата</label><input id="m-date" type="date" value="${TODAY}" max="${TODAY}"></div></div>
        <button class="btn btn-secondary" type="button" data-act="measure-add" style="margin-top:12px">Добавить замер</button>
        ${state.measures.length ? `<ul class="list" style="margin-top:8px">${[...state.measures].sort((a, b) => b.date.localeCompare(a.date)).map(m => `<li class="entry" data-flip="${m.id}"><span class="grow">${esc(relDay(m.date))} · ${esc(m.kind)} <b>${num(m.cm)} см</b></span><button class="icon-btn plain" type="button" data-act="measure-delete" data-arg="${m.id}" aria-label="Удалить замер ${esc(m.kind)}">${ico('trash', '')}</button></li>`).join('')}</ul>` : ''}
        </div></details>
      </section>
      <section class="section">${habitWeekCompact()}</section>`;
    return { title: 'Прогресс', main };
  };
  function habitWeekCompact() {
    const days = weekDays().map((_, i) => addDays(mondayOf(TODAY), i));
    const chosen = visibleHabits();
    const mealsDays = days.map(d => mealsOn(d).length);
    return `<h2 class="h2" style="margin-bottom:8px">Неделя по вашим отметкам</h2>
      <div class="grid-week"><span></span>${days.map((d, i) => `<span class="hd">${WD[i]}</span>`).join('')}
      <span class="nm">Записи еды</span>${mealsDays.map((n, i) => `<span class="cell ${n ? 'on' : ''}" aria-label="${fmtDay(days[i])}: ${n ? 'есть записи' : 'нет записей'}">${n ? ico('check', '') : ''}</span>`).join('')}
      ${chosen.map(h => `<span class="nm">${esc(habitDef(h.id).name)}</span>${days.map(d => { const s = !h.paused && h.days.includes(weekdayIdx(d)), on = (state.habits.marks[d] || []).includes(h.id); return `<span class="cell ${!s ? 'off' : on ? 'on' : ''}" aria-label="${fmtDay(d)}: ${!s ? 'не запланировано' : on ? 'отмечено' : 'нет отметки'}">${!s ? '·' : on ? ico('check', '') : ''}</span>`; }).join('')}`).join('')}</div>
      <p class="tiny muted" style="margin-top:8px">Пустая ячейка не значит, что вы не ели или не старались, — просто нет отметки.</p>`;
  }

  /* --- Настройки и подписка --- */
  screens.meal = () => {
    const m = state.meals.find(x => x.id === state.params[0]);
    if (!m) return { title: 'Приём пищи', main: `${backLink('diary', 'Дневник')}${pageHead('', 'Запись не найдена')}<p>Возможно, она удалена или вкладка была перезагружена.</p>` };
    const ev = evalMeal(m);
    const labels = { met: 'Подтверждено', opportunity: 'Можно попробовать иначе', unknown: 'Данных не хватает', na: 'Не применяется' };
    const details = showScore() ? `<section class="section"><h2 class="h2">Из чего сложилась оценка</h2><p class="lead">${esc(ev.summary)}</p><ul class="rules">${ev.rules.map(r => `<li class="rule"><div><h3 class="h3">${esc(r.title)}</h3><p class="small"><b>${labels[r.state]}.</b> ${esc(r.text)}</p></div></li>`).join('')}</ul><p class="note">Неизвестное не считается нарушением. Это оценка известных действий, а не измерение глюкозы, здоровья или качества человека. Движение и калории в неё не входят.</p></section>` : `<p class="note">${limited() ? 'В ограниченном режиме' : 'В режиме без цифр'} оценки и их разбор скрыты. Запись доступна без них.</p>`;
    return { title: 'Разбор приёма', main: `${backLink('diary', 'Дневник')}${pageHead(relDay(m.date), typeLabel(m.type), m.status === 'planned' ? 'Собрано до еды. Факт ещё не подтверждён.' : 'Записано после еды. Прошлый порядок не меняем советом.')}<ul class="list">${m.items.map(i => `<li class="entry">${itemText(i)}</li>`).join('')}</ul>${details}<div class="row"><button class="btn btn-primary" type="button" data-act="edit-meal" data-arg="${m.id}">Изменить запись</button><a class="btn btn-secondary" href="#method">Как работает подход</a></div>` };
  };
  /* --- Авторы --- */
  function creditsHtml() {
    return `<section class="credits" aria-labelledby="cr-h">
      <svg class="seal" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="sealGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1fb89b"/><stop offset="1" stop-color="#0b6e72"/></linearGradient></defs>
        <path d="M32 4l22 8v17c0 15-9 25-22 31C19 54 10 44 10 29V12z" fill="url(#sealGrad)"/><path d="M28 20h8v8h8v8h-8v8h-8v-8h-8v-8h8z" fill="#fff"/></svg>
      <p class="brand-line" id="cr-h">Ритм еды</p>
      <p style="margin:0;font-weight:600">Создано под наблюдением врача</p>
      <dl><div><dt>Медицинское сопровождение</dt><dd>Врач Авакян Шакро Норикович</dd></div>
        <div><dt>Создатель</dt><dd>Малхасян Андраник Мартунович</dd></div></dl>
      <div class="fact"><span>47 положений методики</span><span>6 групп правил оценки</span><span>Безопасный режим для групп риска</span></div>
      <p class="tiny muted" style="margin:4px 0 0;max-width:42ch">Приложение не ставит диагнозов и не заменяет очную консультацию врача. Рекомендации общие, без лечебных обещаний и гарантий похудения.</p>
    </section>`;
  }

  /* --- Фото еды · ИИ (интерфейс готов, распознавание не подключено) --- */
  const SOON = [['camera', 'ai', 'Фото еды · ИИ', 'Состав, порядок и примерные калории по снимку тарелки'], ['barcode', 'plan', 'Сканер штрихкода', 'Продукт из магазина в дневник за секунду'],
    ['mic', 'water', 'Голосовой ввод', '«Съел гречку с курицей» — и запись готова'], ['heart', 'move', 'Шаги и здоровье', 'Apple Health и Health Connect с вашего разрешения'],
    ['bell', 'veg', 'Напоминания', 'Мягко, в выбранное время, без давления'], ['sync', 'ai', 'Синхронизация', 'Дневник на телефоне и компьютере после входа']];
  screens.scan = () => {
    if (limited()) return { title: 'Фото еды', main: `${backLink('add', 'Добавить еду')}${pageHead('Скоро', 'Фото еды')}${limitedNote()}<p>В ограниченном режиме подсчёт калорий по фото не предлагается. Записывайте еду вручную.</p>` };
    const plate = `<svg class="plate-art" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="92" fill="#f4f7f8"/><circle cx="100" cy="100" r="74" fill="#ffffff" stroke="#dfe7ea" stroke-width="3"/>
      <g fill="#2fae6b"><circle cx="70" cy="72" r="15"/><circle cx="86" cy="58" r="12"/><circle cx="58" cy="92" r="11"/></g><g fill="#7fd36b"><circle cx="78" cy="86" r="9"/><circle cx="96" cy="74" r="7"/></g>
      <path d="M108 60c22-6 42 6 44 24 2 16-14 22-30 20s-28-10-26-24c0-10 4-18 12-20z" fill="#f08a5d"/><path d="M118 74c10-2 20 2 24 8" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/>
      <g fill="#e8cf8f"><ellipse cx="80" cy="132" rx="7" ry="4"/><ellipse cx="94" cy="140" rx="7" ry="4"/><ellipse cx="108" cy="134" rx="7" ry="4"/><ellipse cx="96" cy="126" rx="7" ry="4"/><ellipse cx="120" cy="142" rx="7" ry="4"/><ellipse cx="84" cy="146" rx="7" ry="4"/><ellipse cx="110" cy="150" rx="7" ry="4"/><ellipse cx="124" cy="128" rx="7" ry="4"/></g></svg>`;
    const main = `${backLink('add', 'Добавить еду')}${pageHead('ИИ · скоро', 'Фото еды')}
      <div class="scan-card"><div class="scan-view">${plate}<div class="scan-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="scan-line" aria-hidden="true"></div><span class="scan-label">Демонстрация экрана</span></div>
        <ol class="steps-ai"><li><span><b>Сфотографируйте тарелку</b><br><span class="small muted">До еды — чтобы получить подсказку по порядку.</span></span></li>
          <li><span><b>ИИ предложит состав и калории</b><br><span class="small muted">Продукты, группы и примерный объём порции.</span></span></li>
          <li><span><b>Вы проверяете и сохраняете</b><br><span class="small muted">Ничего не записывается без вашего подтверждения.</span></span></li></ol>
        <div class="row" style="margin-top:14px"><button class="btn btn-primary grow" type="button" disabled>${ico('camera')}Открыть камеру</button><button class="btn btn-secondary grow" type="button" data-act="new-meal">${ico('add')}Ввести вручную</button></div>
        <p class="tiny muted" style="margin:10px 0 0">Распознавание появится в полной версии после подключения сервера и модели ИИ. Сейчас фото не делается и никуда не отправляется — результат не имитируется.</p></div>
      <section class="section" aria-labelledby="soon-h"><h2 class="h2" id="soon-h" style="margin-bottom:10px">Скоро в приложении</h2>
        <div class="soon-grid">${SOON.map(([i, t, n, d]) => `<div class="soon-tile"><span class="ri-icon t-${t}">${ico(i, '')}</span><b>${n}<span class="badge-soon">скоро</span></b><p>${d}</p></div>`).join('')}</div></section>`;
    return { title: 'Фото еды · ИИ', main };
  };

  screens.method = () => {
    const main = `${backLink('today', 'Сегодня')}${pageHead('Как это работает', 'Одно посильное изменение', 'Приложение помогает выбрать доступное действие до еды, а затем спокойно записать, как получилось.')}${limitedNote()}
      ${limited() ? '<p>В вашем режиме приложение не предлагает менять питание или нагрузку. Доступны нейтральный дневник и привычки; изменения обсудите с врачом.</p>' : `<ul class="benefits">
      <li>${ico('leaf')}<div><b>Овощи в начале</b><p>Если удобно, добавьте небольшую овощную закуску. Обязательного объёма нет.</p></div></li>
      <li>${ico('plate')}<div><b>Порядок доступных блюд</b><p>Овощи → белок и жиры → крахмал и сладкое. Смешанную еду не нужно разбирать, паузы не требуются.</p></div></li>
      <li>${ico('cup')}<div><b>Несладкая основа первого приёма</b><p>Белковый компонент или бобовые; хлеб, каша и фрукты допустимы с дополнениями. Первый приём бывает в любое время.</p></div></li>
      <li>${ico('cake')}<div><b>Сладкое допускается</b><p>Один из вариантов — десерт после основной еды. Если нужен перекус сейчас, не нужно терпеть голод ради отметки.</p></div></li>
      <li>${ico('bowl')}<div><b>Углеводы с сопровождением</b><p>Клетчатка, белок или жир могут дополнить хлеб, крупу или фрукт. Нет списка «плохих» блюд.</p></div></li>
      <li>${ico('walk')}<div><b>Движение по возможности</b><p>После еды можно выбрать доступную активность. Таймер считает время; движение подтверждаете вы, отдельно от оценки блюда.</p></div></li></ul>`}
      <p class="note">Общие советы по образу жизни, без лечебных обещаний и гарантии похудения. Все приёмы сразу выполнять не требуется. Калории — дополнительная информация без штрафов; цифры можно убрать в настройках.</p><a class="btn btn-primary" href="#today">К сегодняшнему дню</a>
      <section class="section">${creditsHtml()}</section>`;
    return { title: 'Как это работает', main };
  };
  screens.settings = () => {
    const s = state.safety;
    const main = `${pageHead('Настройки', 'Настройки')}
      <section class="section" aria-labelledby="th-h"><h2 class="h2" id="th-h" style="margin-bottom:10px">Тема</h2>
        <div class="seg" role="group" aria-label="Тема">${[['system', window.RITM_HOST ? 'Как в Telegram' : 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']].map(([k, v]) => `<button type="button" data-act="theme" data-arg="${k}" aria-pressed="${state.theme === k}">${v}</button>`).join('')}</div></section>
      <section class="section" aria-labelledby="nm-h"><h2 class="h2" id="nm-h" style="margin-bottom:10px">Цифры</h2>
        <div class="seg" role="group" aria-label="Цифры">${[[true, 'С цифрами'], [false, 'Без цифр']].map(([k, v]) => `<button type="button" data-act="numbers" data-arg="${k}" aria-pressed="${state.numbers === k}">${v}</button>`).join('')}</div>
        <p class="small muted" style="margin-top:8px">Без цифр скрываются вес, оценки, калории и графики на всех экранах.</p></section>
      <section class="section" aria-labelledby="sf-h"><h2 class="h2" id="sf-h" style="margin-bottom:10px">${ico('shield')} Безопасность</h2>
        ${s.locked ? `<div class="panel panel-tint"><p><b>Ограниченный режим включён по ответам анкеты:</b> ${esc(s.reasons.join(', '))}.</p><p style="margin:0">Оценки, цели похудения и активные советы по еде и нагрузке отключены. Изменения в питании обсудите с врачом.</p></div>`
          : `<div class="row nowrap"><div class="grow"><b>Ограниченный режим</b><p class="small muted" style="margin:0">Без оценок, целей и активных советов. Можно включить, если цифры и советы мешают.</p></div>
            <button class="switch" type="button" role="switch" aria-checked="${s.limited}" aria-label="Ограниченный режим" data-act="toggle-limited"></button></div>`}</section>
      <section class="section" aria-labelledby="dt-h"><h2 class="h2" id="dt-h" style="margin-bottom:6px">Данные</h2>
        <p class="small muted">Экспорт, исправление и удаление бесплатны. Файл сохраняется на устройство, никуда не отправляется.</p>
        <div class="row"><button class="btn btn-secondary btn-sm" type="button" data-act="export" data-arg="csv">${ico('download')}Экспорт CSV</button><button class="btn btn-secondary btn-sm" type="button" data-act="export" data-arg="json">${ico('download')}Экспорт JSON</button>
        <button class="btn btn-ghost btn-sm" type="button" data-act="wipe">${ico('trash')}Удалить мои записи</button></div></section>
      <section class="section"><h2 class="h2" style="margin-bottom:6px">Подписка</h2><a class="btn btn-secondary btn-sm" href="#plus">${ico('plus')}Ритм Плюс — пример экрана</a></section>
      <section class="section"><h2 class="h2" style="margin-bottom:6px">О приложении</h2><div class="row"><a class="btn btn-secondary" href="#method">Как работает подход</a><button class="btn btn-secondary" type="button" data-guide-open>${ico('spark')}Знакомство с Ритмиком</button><a class="btn btn-secondary" href="#scan">${ico('camera')}Скоро в приложении</a></div><button class="btn btn-ghost btn-sm" type="button" data-act="about">Что работает, а что нет</button></section>
      <section class="section">${creditsHtml()}</section>`;
    return { title: 'Настройки', main };
  };

  screens.plus = () => {
    const plans = [['month', 'Месяц', '349 ₽', 'в месяц, списывается каждый месяц'], ['year', 'Год', '2 490 ₽', 'полная сумма за год, списывается сразу']];
    const main = `${backLink('settings', 'Настройки')}<p class="tag amber">Пример экрана · оплата не подключена</p>
      ${pageHead('Подписка', 'Ритм Плюс', 'Так мог бы выглядеть платный уровень. Цены — пример, не предложение.')}
      <section class="section"><h2 class="h2" style="margin-bottom:8px">Бесплатно всегда</h2><ul class="checklist">${['Дневник, поиск, избранное, повтор и копирование', 'Сборка с одним действием до еды', 'История, исправления, экспорт и удаление данных', 'Привычки, вода, вес и замеры'].map(x => `<li>${ico('check', '')}<span>${x}</span></li>`).join('')}</ul></section>
      <section class="section"><h2 class="h2" style="margin-bottom:8px">В Плюс (идея, в прототипе нет)</h2><ul class="checklist">${['Больше собственных идей блюд и планов на неделю', 'Отчёты за выбранный период', 'Синхронизация между устройствами — после правовой проверки'].map(x => `<li>${ico('plus', '')}<span>${x}</span></li>`).join('')}</ul></section>
      <div class="plans section" role="group" aria-label="Период">${plans.map(([k, t, p, s]) => `<button class="plan" type="button" data-act="plus-plan" data-arg="${k}" aria-pressed="${state.plusPlan === k}"><span class="small muted">${t}</span><b>${p}</b><span class="small">${s}</span></button>`).join('')}</div>
      <div class="panel" style="margin-top:14px"><ul class="checklist small">${['Пробного периода нет.', 'Продлевается автоматически, пока вы не отмените её в магазине приложений не позднее чем за сутки до конца периода.', 'Отмена продления не прекращает уже оплаченный период.', 'В прототипе ничего не списывается и данные карты не запрашиваются.'].map(x => `<li>${ico('info', '')}<span>${x}</span></li>`).join('')}</ul></div>
      <div class="onb-actions"><button class="btn btn-secondary" type="button" data-act="go" data-arg="today">Остаться на бесплатной</button><button class="btn btn-primary" type="button" data-act="plus-buy">Оформить (демо)</button></div>`;
    return { title: 'Ритм Плюс', main };
  };

  /* ---------- Действия ---------- */
  function saveMealFromDraft() {
    const d = state.draft;
    const status = d.phase === 'before' ? 'planned' : 'eaten';
    const data = { date: d.date, type: d.type, items: d.items.map(i => ({ ...i, nutr: { ...i.nutr } })), orderStatus: d.items.length > 1 ? d.orderStatus : 'confirmed', status, afterMain: d.type === 'dessert' ? d.afterMain === true : null };
    if (d.mealId) {
      const m = state.meals.find(x => x.id === d.mealId);
      if (m) { Object.assign(m, data); if (status === 'eaten' && !m.eatenAt) m.eatenAt = Date.now(); return m; }
    }
    const m = { id: uid('m'), created: Date.now(), eatenAt: status === 'eaten' ? Date.now() : null, ...data };
    state.meals.push(m);
    return m;
  }
  function removeWithUndo(arrName, id, label) {
    const arr = state[arrName], idx = arr.findIndex(x => x.id === id);
    if (idx < 0) return;
    const [item] = arr.splice(idx, 1);
    render();
    toast(`${label} удалено`, { label: 'Отменить', fn: () => { state[arrName].splice(Math.min(idx, state[arrName].length), 0, item); render({ flip: true, appear: id.startsWith('m') ? `m-${id}` : id }); toast('Возвращено'); } });
  }
  function insertBeforeCarb(items, comp) {
    const i = items.findIndex(x => ['starch', 'fruit', 'sweet', 'mixed'].includes(x.cat));
    if (i < 0) items.push(comp); else items.splice(i, 0, comp);
  }
  function addComp(comp, opts = {}) {
    const c = { id: uid('c'), ...comp, nutr: emptyNutr() };
    if (opts.start) state.draft.items.unshift(c); else if (opts.beforeCarb) insertBeforeCarb(state.draft.items, c); else state.draft.items.push(c);
    render({ flip: true, appear: c.id });
    return c;
  }
  function csvCell(v) {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  }
  function download(name, text, type) {
    // В Telegram скачивание blob-файлов не поддерживается: адаптер копирует текст в буфер.
    if (window.RITM_HOST && window.RITM_HOST.saveText) {
      window.RITM_HOST.saveText(name, text).then(ok => toast(ok ? 'Скопировано: в Telegram прототип не сохраняет файлы, вставьте текст куда нужно' : 'Скопировать не удалось. Откройте прототип в браузере, чтобы скачать файл'));
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function exportData(kind) {
    const userData = { exportedAt: new Date().toISOString(), note: 'Экспорт прототипа «Ритм еды». Пустые значения — неизвестны, а не ноль.',
      meals: state.meals, water: state.water, movement: state.moves, weights: state.weights, measures: state.measures, habits: state.habits, plan: state.plan };
    if (kind === 'json') return download(`ritm-edy-${TODAY}.json`, JSON.stringify(userData, null, 2), 'application/json');
    const rows = [['раздел', 'дата', 'тип', 'статус', 'порядок', 'название', 'группа', 'количество', 'мера', 'ккал', 'белки', 'жиры', 'углеводы', 'клетчатка', 'сахар', 'пример']];
    state.meals.forEach(m => m.items.forEach(i => rows.push(['еда', m.date, typeLabel(m.type), m.status === 'planned' ? 'собрано до еды' : 'съедено', m.orderStatus === 'unknown' ? 'не подтверждён' : 'подтверждён', i.name, catLabel(i.cat), i.amount, i.unit, i.nutr?.kcal, i.nutr?.p, i.nutr?.f, i.nutr?.c, i.nutr?.fib, i.nutr?.s, m.demo ? 'да' : ''])));
    state.water.forEach(w => rows.push(['вода', w.date, '', '', '', 'вода', '', w.ml, 'мл', '', '', '', '', '', '', '']));
    state.moves.forEach(v => rows.push(['движение', v.date, '', v.source === 'timer' ? 'таймер + ответ' : 'самоотчёт', '', v.kind, '', v.minutes, 'мин', '', '', '', '', '', '', '']));
    state.weights.forEach(w => rows.push(['вес', w.date, '', '', '', 'вес', '', w.kg, 'кг', '', '', '', '', '', '', w.demo ? 'да' : '']));
    state.measures.forEach(m => rows.push(['замер', m.date, '', '', '', m.kind, '', m.cm, 'см', '', '', '', '', '', '', '']));
    download(`ritm-edy-${TODAY}.csv`, '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
  }
  function shoppingText() { return shoppingItems().map(x => `${state.shopDone.includes(x.key) ? '[x]' : '[ ]'} ${x.name} — ${num(x.amount)} ${x.unit}`).join('\n'); }

  function startTimerTick() {
    clearInterval(tickHandle);
    tickHandle = setInterval(() => {
      const t = state.timer;
      if (!t.running) return clearInterval(tickHandle);
      t.remaining = Math.max(0, t.endAt - Date.now());
      const txt = fmtTime(t.remaining);
      const ring = $('ring-prog'), rt = $('ring-text');
      if (ring) ring.style.strokeDashoffset = String(2 * Math.PI * 100 * (1 - t.remaining / t.total));
      if (rt) rt.textContent = txt;
      document.querySelectorAll('[data-timer-text]').forEach(el => { el.textContent = txt; });
      if (t.remaining === 0) {
        t.running = false; t.awaiting = true; clearInterval(tickHandle);
        toast('Таймер завершён. Ответьте, двигались ли вы.');
        const typing = document.activeElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
        if (!typing && !dialog.open) render(); else renderChrome();
      }
    }, 250);
  }
  function recordMove(minutes, kind, source, mealId) {
    const v = { id: uid('v'), date: TODAY, minutes, kind, source, mealId: mealId || '' };
    state.moves.push(v);
    return v;
  }

  const actions = {
    go: a => go(a),
    about: () => openDialog(`<h2 id="dialog-title">Что работает в прототипе</h2>
      <p><b>Работает в этой вкладке:</b> онбординг и ограниченный режим, дневник с поиском, избранным, повтором, копированием и отменой удаления, сборка с правилами, сценарии первого приёма, перекуса и ресторана, план с идеями и списком покупок, привычки, таймер с вашим подтверждением, вода, вес и замеры, темы, режим без цифр, экспорт файлом.</p>
      <p><b>Не подключено:</b> аккаунт, синхронизация, уведомления, Health и шаги, фото и голосовой ИИ, штрихкод, базы продуктов, оплата, аналитика. Сетевых запросов нет.</p>
      <p><b>Данные:</b> продукты и идеи — примеры прототипа; калории в них неизвестны. Всё пропадает после перезагрузки.</p>
      <p class="small muted">Создатель — Малхасян Андраник Мартунович. Медицинское сопровождение — врач Авакян Шакро Норикович.</p>
      <div class="dialog-actions"><button class="btn btn-secondary" type="button" data-review-open>Служебное меню экранов</button><button class="btn btn-primary" type="button" data-act="close">Понятно</button></div>`),
    close: () => closeDialog(),
    skip: (a, el, e) => { e.preventDefault(); $('main').focus(); },

    'ob-next': () => { state.ob.step = Math.min(5, state.ob.step + 1); render({ routeChange: true }); },
    'ob-back': () => { state.ob.step = Math.max(0, state.ob.step - 1); render({ routeChange: true }); },
    'ob-finish': () => {
      const reasons = safetyFromOnboarding();
      state.safety = { limited: reasons.length > 0, locked: reasons.length > 0, reasons };
      state.numbers = state.ob.numbers !== 'without';
      state.onboarded = true;
      go('today');
      toast(reasons.length ? 'Ограниченный режим включён' : 'Готово. Начнём с одного шага.');
    },

    'new-meal': a => { const [type, date] = (a || '').split('|'); startDraft({ type: type || undefined, date: date || TODAY }); go('add'); },
    'repeat-meal': a => {
      const src = state.meals.find(m => m.id === a); if (!src) return;
      const m = { id: uid('m'), created: Date.now(), eatenAt: Date.now(), date: TODAY, type: src.type, status: 'eaten', afterMain: null, orderStatus: src.items.length > 1 ? 'unknown' : 'confirmed', items: src.items.map(i => ({ ...i, id: uid('c'), nutr: { ...i.nutr } })) };
      state.meals.push(m);
      render({ flip: true, appear: `m-${m.id}` });
      toast(`${typeLabel(m.type)} повторён на сегодня`, { label: 'Отменить', fn: () => { state.meals = state.meals.filter(x => x.id !== m.id); render(); } });
    },
    'edit-meal': a => { const m = state.meals.find(x => x.id === a); if (!m) return; startDraft({ mealId: m.id, type: m.type, date: m.date, phase: m.status === 'planned' ? 'before' : 'after', items: m.items }); state.draft.orderStatus = m.orderStatus; state.draft.afterMain = m.afterMain ?? null; go('add'); },
    'copy-meal': a => {
      const m = state.meals.find(x => x.id === a); if (!m) return;
      openDialog(`<h2 id="dialog-title">Копировать приём</h2><p class="small muted">${esc(m.items.map(i => i.name).join(', '))}</p>
        <label for="cp-date">День</label><input type="date" id="cp-date" value="${TODAY}">
        <label for="cp-type">Приём пищи</label><select id="cp-type">${Object.entries(D.MEAL_TYPES).map(([k, v]) => `<option value="${k}" ${k === m.type ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <p class="tiny muted">На будущий день копия сохранится как «собрано до еды».</p>
        <div class="dialog-actions"><button class="btn btn-primary" type="button" data-act="copy-do" data-arg="${m.id}">Копировать</button></div>`);
    },
    'copy-do': a => {
      const m = state.meals.find(x => x.id === a); if (!m) return;
      const date = $('cp-date').value || TODAY, type = $('cp-type').value;
      const future = date > TODAY;
      const c = { id: uid('m'), created: Date.now(), eatenAt: future ? null : Date.now(), date, type, status: future ? 'planned' : m.status, orderStatus: m.orderStatus, items: m.items.map(i => ({ ...i, id: uid('c'), nutr: { ...i.nutr } })) };
      state.meals.push(c);
      closeDialog(); render({ flip: true, appear: `m-${c.id}` });
      toast(`Скопировано: ${typeLabel(type).toLowerCase()}, ${relDay(date).toLowerCase()}`, { label: 'Отменить', fn: () => { state.meals = state.meals.filter(x => x.id !== c.id); render(); } });
    },
    'delete-meal': a => removeWithUndo('meals', a, 'Приём пищи'),
    eaten: a => {
      const m = state.meals.find(x => x.id === a); if (!m) return;
      openDialog(`<h2 id="dialog-title">${typeLabel(m.type)}: как вы ели?</h2><p class="small muted">${esc(m.items.map(i => i.name).join(' → '))}</p>
        <div class="dialog-actions">
          <button class="btn btn-primary" type="button" data-act="eaten-do" data-arg="${m.id}|confirmed">${m.items.length > 1 ? 'Так и ели, в этом порядке' : 'Так и ели'}</button>
          ${m.items.length > 1 ? `<button class="btn btn-secondary" type="button" data-act="eaten-do" data-arg="${m.id}|unknown">Ели всё вместе или не помню</button>` : ''}
          <button class="btn btn-ghost" type="button" data-act="eaten-edit" data-arg="${m.id}">Состав или порядок были другими</button></div>`);
    },
    'eaten-do': a => {
      const [id, order] = a.split('|');
      const m = state.meals.find(x => x.id === id); if (!m) return;
      m.status = 'eaten'; m.orderStatus = order; m.eatenAt = Date.now();
      closeDialog(); render();
      if (!limited() && ['first', 'lunch', 'dinner'].includes(m.type)) toast('Записано. Если удобно — немного движения.', { label: 'Таймер', fn: () => { state.timer.mealId = m.id; go('move'); } });
      else toast('Записано в дневник');
    },
    'eaten-edit': a => { closeDialog(); actions['edit-meal'](a); state.draft.phase = 'after'; render(); },

    'diary-day': a => { state.diaryDate = addDays(state.diaryDate, Number(a)); render(); },
    'diary-today': () => { state.diaryDate = TODAY; render(); },

    'draft-type': a => { state.draft.type = a; render(); },
    'draft-phase': a => { state.draft.phase = a; if (a === 'before') state.draft.orderStatus = 'confirmed'; render(); },
    'draft-order': a => { state.draft.orderStatus = a; render(); },
    'draft-aftermain': a => { state.draft.afterMain = a === 'true'; render(); },
    'view-draft': () => { const h = $('draft-h'); h.setAttribute('tabindex', '-1'); h.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' }); h.focus({ preventScroll: true }); },
    'food-tab': a => { state.search.tab = a; state.showAll = false; render(); },
    'food-cat': a => { state.search.cat = a; state.showAll = false; render(); },
    'show-all': () => { state.showAll = true; $('food-results').innerHTML = foodRows(); },
    fav: (a, el) => {
      const i = state.favorites.indexOf(a);
      if (i >= 0) state.favorites.splice(i, 1); else state.favorites.push(a);
      $('food-results').innerHTML = foodRows();
      const again = view.querySelector(`[data-act="fav"][data-arg="${CSS.escape(a)}"]`);
      if (again) again.focus();
      toast(i >= 0 ? 'Убрано из избранного' : 'Добавлено в избранное');
    },
    'add-food': a => {
      const f = allFoods().find(x => x.id === a) || recentFoods().find(x => x.id === a);
      if (!f) return;
      addComp(compFromFood(f, f.own ? 'свой продукт' : f.recent ? 'недавнее' : 'пример состава'));
      toast(`Добавлено: ${f.name}`);
    },
    'create-food': () => {
      const name = state.search.q.trim().slice(0, 60);
      if (!name) return;
      openDialog(`<h2 id="dialog-title">Свой продукт</h2>
        <label for="cf-name">Название</label><input type="text" id="cf-name" maxlength="60" value="${esc(name)}">
        <label for="cf-cat">Группа</label><select id="cf-cat">${Object.entries(D.CATS).map(([k, v]) => `<option value="${k}" ${k === 'other' ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
        <div class="field-row"><div><label for="cf-amt">Количество</label><input type="text" inputmode="decimal" id="cf-amt" min="0" step="any" value="1"></div><div><label for="cf-unit">Мера</label><select id="cf-unit">${D.UNITS.map(u => `<option ${u === 'порция' ? 'selected' : ''}>${u}</option>`).join('')}</select></div></div>
        <p class="tiny muted">Пищевая ценность не угадывается по названию. Её можно ввести в компоненте вручную.</p>
        <div class="dialog-actions"><button class="btn btn-primary" type="button" data-act="create-food-do">Сохранить и добавить</button></div>`);
    },
    'create-food-do': () => {
      const name = $('cf-name').value.trim().slice(0, 60);
      if (!name) { toast('Напишите название'); $('cf-name').focus(); return; }
      const f = { id: uid('own'), name, cat: $('cf-cat').value, amount: parseNum($('cf-amt').value), unit: $('cf-unit').value };
      state.custom.push(f);
      state.search.q = '';
      closeDialog();
      addComp(compFromFood(f, 'свой продукт'));
      toast(`Создано и добавлено: ${name}`);
    },
    'comp-move': a => {
      const [id, dir] = a.split('|'); const arr = state.draft.items, i = arr.findIndex(x => x.id === id), j = i + Number(dir);
      if (i < 0 || j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      render({ flip: true });
      const btn = view.querySelector(`[data-act="comp-move"][data-arg="${id}|${dir}"]`);
      (btn && !btn.disabled ? btn : view.querySelector(`[data-act="comp-remove"][data-arg="${id}"]`)).focus();
    },
    'comp-remove': a => {
      const arr = state.draft.items, i = arr.findIndex(x => x.id === a); if (i < 0) return;
      const [it] = arr.splice(i, 1);
      render({ flip: true });
      toast(`Убрано: ${it.name}`, { label: 'Отменить', fn: () => { state.draft && state.draft.items.splice(i, 0, it); render({ flip: true, appear: it.id }); } });
    },
    'apply-advice': a => {
      const d = state.draft;
      if (a === 'add-veg') { addComp({ name: 'Овощная закуска', cat: 'veg', amount: 1, unit: 'порция', source: 'добавлено сборкой' }, { start: true }); toast('Добавлена овощная закуска в начало'); }
      else if (a === 'reorder') { d.items = E.sortByRank(d.items, d.type); render({ flip: true }); toast('Компоненты расставлены по порядку'); }
      else if (a === 'sweet-end') { d.items = E.sweetToEnd(d.items); render({ flip: true }); toast('Сладкое перенесено в конец'); }
      else if (a === 'to-dessert') { d.type = 'dessert'; render(); toast('Отмечено как десерт — удобно после основной еды'); }
      else if (a === 'add-base') {
        const picks = ['egg', 'cottage', 'cheese', 'nuts', 'hummus', 'yogurt', 'chicken'].map(id => D.FOODS.find(f => f.id === id));
        openDialog(`<h2 id="dialog-title">Добавить белок или жир</h2><p class="small muted">Добавим перед крахмалом и сладким.</p><div class="dialog-actions">${picks.map(f => `<button class="btn btn-secondary" type="button" data-act="add-base-do" data-arg="${f.id}">${esc(f.name)}</button>`).join('')}</div>`);
      }
    },
    'add-base-do': a => { const f = D.FOODS.find(x => x.id === a); closeDialog(); addComp(compFromFood(f, 'добавлено сборкой'), { beforeCarb: true }); toast(`Добавлено: ${f.name}`); },
    'save-draft': () => {
      const d = state.draft; if (!d || !d.items.length) return;
      const invalid = d.items.find(i => !Number.isFinite(i.amount) || i.amount <= 0);
      if (invalid) {
        toast('Укажите количество больше нуля: ' + invalid.name);
        $('amt-' + invalid.id)?.focus(); return;
      }
      if (d.phase === 'after' && d.date > TODAY) {
        toast('Будущую еду можно сохранить как план. Выберите «Собираю до еды».');
        view.querySelector('[data-act="draft-phase"][data-arg="before"]')?.focus(); return;
      }
      const editing = !!d.mealId;
      const m = saveMealFromDraft();
      state.draft = null;
      state.diaryDate = m.date;
      go(m.date === TODAY ? 'today' : 'diary');
      toast(editing ? 'Изменения сохранены' : m.status === 'planned' ? 'Собрано до еды. Отметьте, когда поедите.' : 'Записано в дневник',
        editing ? null : { label: 'Отменить', fn: () => { state.meals = state.meals.filter(x => x.id !== m.id); render(); } });
    },
    'cancel-draft': () => { const d = state.draft; state.draft = null; go(d && d.date !== TODAY ? 'diary' : 'today'); },

    'toggle-have': a => { const [k, v] = a.split('|'); const arr = state[k].have, i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); render(); },
    'bf-first': a => { state.breakfast.first = a; render(); },
    'scenario-draft': a => {
      let items = [], type = a;
      if (a === 'breakfast') { type = 'first'; items = E.sortByRank(state.breakfast.have.map(k => BF[k]).map(([name, cat, amount, unit]) => ({ name, cat, amount, unit, source: 'ваш выбор' })), 'first'); }
      if (a === 'snack') items = state.snack.have.filter(k => k !== 'sweet').map(k => SN[k]).map(([name, cat, amount, unit]) => ({ name, cat, amount, unit, source: 'ваш выбор' }));
      if (a === 'dessert') items = [SN.sweet].map(([name, cat, amount, unit]) => ({ name, cat, amount, unit, source: 'ваш выбор' }));
      if (a === 'restaurant') { type = new Date().getHours() < 17 ? 'lunch' : 'dinner'; items = E.sortByRank(state.restaurant.have.map(k => ({ name: `${RS[k][0]} (ресторан)`, cat: RS[k][1], amount: 1, unit: 'порция', source: 'ваш выбор в ресторане' })), type); }
      if (!items.length) { toast('Отметьте хотя бы один вариант'); return; }
      startDraft({ type, items, phase: 'before' });
      go('add');
    },

    'plan-week': a => { state.planDate = addDays(state.planDate, Number(a)); render(); },
    'plan-day': a => { state.planDate = a; render(); },
    'plan-pick': a => {
      const [k, slot] = a.split('|');
      const list = D.IDEAS.filter(i => i.slots.includes(slot));
      openDialog(`<h2 id="dialog-title">${typeLabel(slot)} · ${esc(relDay(k))}</h2><div class="dialog-actions">${list.map(i => `<button class="btn btn-secondary" type="button" data-act="plan-add" data-arg="${k}|${slot}|${i.id}" style="justify-content:flex-start">${ico('timer')}${esc(i.name)} · ${i.minutes} мин</button>`).join('')}</div>`);
    },
    'plan-add': a => {
      const [k, slot, ideaId] = a.split('|');
      const p = { id: uid('p'), slot, ideaId };
      (state.plan[k] = state.plan[k] || []).push(p);
      closeDialog(); render({ flip: true, appear: p.id });
      toast(`В плане: ${ideaById(ideaId).name}`, { label: 'Отменить', fn: () => { state.plan[k] = state.plan[k].filter(x => x.id !== p.id); render(); } });
    },
    'plan-remove': a => {
      const [k, id] = a.split('|'); const arr = state.plan[k] || [], i = arr.findIndex(x => x.id === id); if (i < 0) return;
      const [p] = arr.splice(i, 1); render({ flip: true });
      toast('Убрано из плана', { label: 'Отменить', fn: () => { arr.splice(i, 0, p); render({ flip: true, appear: p.id }); } });
    },
    'idea-filter': a => { state.ideaFilter = a; render(); },
    'idea-draft': a => {
      const [id, slot, date] = a.split('|'); const i = ideaById(id);
      startDraft({ type: slot || i.slots[0], date: date || TODAY, phase: 'before', items: i.eat.map(([name, cat, amount, unit]) => ({ name, cat, amount, unit, source: `идея «${i.name}»` })) });
      go('add'); toast('Идея в черновике — проверьте состав и порядок');
    },
    'idea-to-plan': a => {
      const i = ideaById(a); const days = weekDays();
      openDialog(`<h2 id="dialog-title">В план: ${esc(i.name)}</h2>
        <label for="ip-day">День</label><select id="ip-day">${days.map(d => `<option value="${d}" ${d === state.planDate ? 'selected' : ''}>${fmtDay(d)}</option>`).join('')}</select>
        <label for="ip-slot">Приём</label><select id="ip-slot">${['first', 'lunch', 'dinner', 'snack', 'dessert'].map(s => `<option value="${s}" ${s === i.slots[0] ? 'selected' : ''}>${typeLabel(s)}</option>`).join('')}</select>
        <div class="dialog-actions"><button class="btn btn-primary" type="button" data-act="idea-to-plan-do" data-arg="${i.id}">Добавить в план</button></div>`);
    },
    'idea-to-plan-do': a => {
      const k = $('ip-day').value, slot = $('ip-slot').value;
      (state.plan[k] = state.plan[k] || []).push({ id: uid('p'), slot, ideaId: a });
      state.planDate = k; closeDialog();
      toast(`Добавлено в план: ${relDay(k).toLowerCase()}`, { label: 'Открыть план', fn: () => go('plan') });
    },
    'shop-copy': () => {
      const text = shoppingText();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast('Список скопирован'), () => toast('Не удалось скопировать — скачайте .txt'));
      else toast('Копирование недоступно — скачайте .txt');
    },
    'shop-download': () => download(`pokupki-${TODAY}.txt`, shoppingText(), 'text/plain;charset=utf-8'),

    'habit-toggle': a => {
      const ch = state.habits.chosen, i = ch.findIndex(h => h.id === a);
      if (i >= 0) { const [h] = ch.splice(i, 1); render({ flip: true }); toast('Привычка убрана', { label: 'Отменить', fn: () => { ch.splice(i, 0, h); render({ flip: true }); } }); return; }
      if (visibleHabits().length >= 3) { toast('Можно выбрать до трёх. Уберите одну, чтобы добавить другую.'); return; }
      ch.push({ id: a, days: [0, 1, 2, 3, 4, 5, 6], paused: false });
      render({ flip: true, appear: `h-${a}` }); toast('Привычка выбрана — дни можно изменить');
    },
    'habit-remove': a => actions['habit-toggle'](a),
    'habit-pause': a => { const h = state.habits.chosen.find(x => x.id === a); h.paused = !h.paused; render(); toast(h.paused ? 'На паузе — отметки сохранены' : 'Продолжаем'); },
    'habit-day': a => {
      const [id, d] = a.split('|'); const h = state.habits.chosen.find(x => x.id === id), di = Number(d);
      if (h.days.includes(di)) { if (h.days.length === 1) { toast('Нужен хотя бы один день — или поставьте паузу'); return; } h.days = h.days.filter(x => x !== di); } else h.days = [...h.days, di].sort();
      render();
    },
    'mark-habit': (a, el) => {
      const [id, k] = a.split('|');
      const marks = state.habits.marks[k] = state.habits.marks[k] || [];
      const i = marks.indexOf(id);
      if (i >= 0) marks.splice(i, 1); else marks.push(id);
      const sel = `[data-act="mark-habit"][data-arg="${a}"]`;
      render();
      const again = view.querySelector(sel);
      if (again) { again.focus({ preventScroll: true }); if (i < 0 && !reduceMotion.matches && again.animate) again.animate([{ transform: 'scale(0.9)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }); }
      toast(i >= 0 ? 'Отметка снята' : 'Отмечено');
    },

    water: a => {
      const [ml, k] = a.split('|');
      const w = { id: uid('w'), date: k || TODAY, ml: Number(ml) };
      state.water.push(w);
      render();
      toast(`+${ml} мл`, { label: 'Отменить', fn: () => { state.water = state.water.filter(x => x.id !== w.id); render(); } });
    },
    'water-undo': a => {
      const list = state.water.filter(w => w.date === a); const last = list[list.length - 1]; if (!last) return;
      state.water = state.water.filter(x => x !== last); render(); toast(`Отменено: ${last.ml} мл`);
    },

    'timer-for': a => { state.timer.mealId = a; },
    'timer-len': a => { const t = state.timer; if (t.running) return; t.total = t.remaining = Number(a) * 60000; t.awaiting = false; render(); },
    'timer-toggle': () => {
      const t = state.timer;
      if (t.running) { t.running = false; t.remaining = Math.max(0, t.endAt - Date.now()); clearInterval(tickHandle); }
      else {
        if (t.awaiting || t.remaining <= 0) { t.remaining = t.total; t.awaiting = false; }
        t.running = true; t.endAt = Date.now() + t.remaining; startTimerTick();
      }
      render();
      const b = view.querySelector('[data-act="timer-toggle"]'); if (b) b.focus();
    },
    'timer-reset': () => { const t = state.timer; t.running = false; clearInterval(tickHandle); t.remaining = t.total; t.awaiting = false; render(); toast('Таймер сброшен'); },
    'move-yes': () => {
      const t = state.timer;
      const v = recordMove(Math.round(t.total / 60000), 'Ходьба или движение', 'timer', t.mealId);
      t.awaiting = false; t.remaining = t.total;
      render({ flip: true, appear: v.id });
      toast('Записано: движение по вашему ответу', { label: 'Отменить', fn: () => { state.moves = state.moves.filter(x => x.id !== v.id); render(); } });
    },
    'move-no': () => { const t = state.timer; t.awaiting = false; t.remaining = t.total; render(); toast('Хорошо, ничего не записываем'); },
    'self-report': a => { state.timer.mealId = a; go('move'); setTimeout(() => { const el = $('sr-min'); if (el) el.focus(); }, 50); },
    'self-save': () => {
      const min = parseNum($('sr-min').value);
      if (!min || min < 1 || min > 240) { toast('Укажите от 1 до 240 минут'); $('sr-min').focus(); return; }
      const v = recordMove(Math.round(min), $('sr-kind').value, 'self', state.timer.mealId);
      render({ flip: true, appear: v.id });
      toast('Записано по самоотчёту', { label: 'Отменить', fn: () => { state.moves = state.moves.filter(x => x.id !== v.id); render(); } });
    },
    'delete-move': a => removeWithUndo('moves', a, 'Движение'),

    'chart-mode': a => { state.chartMode = a; render(); },
    'weight-add': () => {
      const kg = parseNum($('w-kg').value), date = $('w-date').value || TODAY;
      if (kg == null || kg < 20 || kg > 400) { toast('Введите вес от 20 до 400 кг'); $('w-kg').focus(); return; }
      if (date > TODAY) { toast('Дата не может быть в будущем'); return; }
      const w = { id: uid('kg'), date, kg: Math.round(kg * 10) / 10, created: Date.now() };
      state.weights.push(w); state.chartMode = 'mine';
      render({ flip: true, appear: w.id });
      toast('Вес записан', { label: 'Отменить', fn: () => { state.weights = state.weights.filter(x => x.id !== w.id); render(); } });
    },
    'weight-edit': a => {
      const w = state.weights.find(x => x.id === a); if (!w) return;
      openDialog(`<h2 id="dialog-title">Изменить запись веса</h2><label for="we-date">Дата</label><input type="date" id="we-date" value="${w.date}" max="${TODAY}">
        <label for="we-kg">Вес, кг</label><input type="text" id="we-kg" value="${w.kg}" min="20" max="400" step="0.1" inputmode="decimal">
        <div class="dialog-actions"><button class="btn btn-primary" type="button" data-act="weight-edit-do" data-arg="${w.id}">Сохранить</button></div>`);
    },
    'weight-edit-do': a => {
      const w = state.weights.find(x => x.id === a); const kg = parseNum($('we-kg').value), date = $('we-date').value;
      if (kg == null || kg < 20 || kg > 400 || !date || date > TODAY) { toast('Проверьте дату и вес (20–400 кг)'); return; }
      w.kg = Math.round(kg * 10) / 10; w.date = date; closeDialog(); render(); toast('Изменено');
    },
    'weight-delete': a => removeWithUndo('weights', a, 'Запись веса'),
    'measure-add': () => {
      const cm = parseNum($('m-cm').value), date = $('m-date').value || TODAY;
      if (cm == null || cm < 10 || cm > 300) { toast('Введите от 10 до 300 см'); $('m-cm').focus(); return; }
      const m = { id: uid('cm'), kind: $('m-kind').value, cm, date, created: Date.now() };
      state.measures.push(m); render({ flip: true, appear: m.id });
      toast('Замер записан', { label: 'Отменить', fn: () => { state.measures = state.measures.filter(x => x.id !== m.id); render(); } });
    },
    'measure-delete': a => removeWithUndo('measures', a, 'Замер'),

    theme: a => { state.theme = a; render(); },
    numbers: a => { state.numbers = a === 'true'; render(); toast(state.numbers ? 'Цифры показаны' : 'Цифры скрыты на всех экранах'); },
    'toggle-limited': () => {
      if (state.safety.locked) return;
      state.safety.limited = !state.safety.limited; render();
      toast(state.safety.limited ? 'Ограниченный режим включён' : 'Ограниченный режим выключен');
    },
    export: a => { exportData(a); toast(`Файл ${a.toUpperCase()} сохранён на устройство`); },
    wipe: () => openDialog(`<h2 id="dialog-title">Удалить мои записи?</h2><p>Удалятся еда, вода, движение, вес, замеры, план и отметки привычек в этой вкладке. Настройки и режим безопасности останутся. Отменить будет нельзя — при желании сначала сделайте экспорт.</p>
      <div class="dialog-actions"><button class="btn btn-primary" type="button" data-act="wipe-do">Удалить записи</button><button class="btn btn-secondary" type="button" data-act="close">Не удалять</button></div>`),
    'wipe-do': () => {
      Object.assign(state, { meals: [], water: [], moves: [], weights: [], measures: [], plan: {}, shopDone: [], custom: [], favorites: [] });
      state.habits.marks = {}; closeDialog(); render(); toast('Записи удалены');
    },
    'plus-plan': a => { state.plusPlan = a; render(); },
    'plus-buy': () => openDialog(`<h2 id="dialog-title">Оплата не подключена</h2><p>Это пример экрана. Деньги не списываются, данные карты не запрашиваются, подписка не оформляется.</p>
      <div class="dialog-actions"><button class="btn btn-primary" type="button" data-act="plus-free">Продолжить бесплатно</button></div>`),
    'plus-free': () => { closeDialog(); go('today'); toast('Вы на бесплатной версии — всё основное доступно'); }
  };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.act];
    if (!fn) return;
    if (el.tagName === 'A' && el.dataset.act === 'timer-for') { fn(el.dataset.arg, el, e); return; }
    e.preventDefault();
    fn(el.dataset.arg, el, e);
  });

  function onField(e) {
    const el = e.target, f = el.dataset && el.dataset.field;
    if (!f) return;
    const o = state.ob, d = state.draft;
    const findComp = () => d && d.items.find(x => x.id === el.dataset.id);
    switch (f) {
      case 'ob-age': case 'ob-meds': case 'ob-numbers': {
        o[f.slice(3)] = el.value; render();
        const again = view.querySelector(`input[data-field="${f}"][value="${el.value}"]`); if (again) again.focus();
        break;
      }
      case 'ob-health': {
        const v = el.value;
        if (v === 'none' || v === 'skip') o.health = el.checked ? [v] : [];
        else { o.health = o.health.filter(x => x !== 'none' && x !== 'skip' && x !== v); if (el.checked) o.health.push(v); }
        render();
        const again = view.querySelector(`input[data-field="ob-health"][value="${v}"]`); if (again) again.focus();
        break;
      }
      case 'food-q': state.search.q = el.value; state.showAll = false; $('food-results').innerHTML = foodRows(); break;
      case 'draft-date': if (el.value) d.date = el.value; break;
      case 'comp-cat': { const c = findComp(); if (c) { c.cat = el.value; render(); } break; }
      case 'comp-amount': { const c = findComp(); if (c) c.amount = parseNum(el.value); break; }
      case 'comp-unit': { const c = findComp(); if (c) c.unit = el.value; break; }
      case 'comp-nutr': { const c = findComp(); if (c) { const v = parseNum(el.value); c.nutr[el.dataset.k] = v != null && v >= 0 ? v : null; } break; }
      case 'diary-date': if (el.value) { state.diaryDate = el.value; render(); } break;
      case 'timer-meal': state.timer.mealId = el.value; break;
      case 'shop': {
        const i = state.shopDone.indexOf(el.value);
        if (el.checked && i < 0) state.shopDone.push(el.value); else if (!el.checked && i >= 0) state.shopDone.splice(i, 1);
        el.closest('li').classList.toggle('done', el.checked);
        break;
      }
    }
  }
  document.addEventListener('input', e => { if (['food-q', 'comp-amount', 'comp-nutr'].includes(e.target.dataset && e.target.dataset.field)) onField(e); });
  document.addEventListener('change', e => { if (!['food-q', 'comp-amount', 'comp-nutr'].includes(e.target.dataset && e.target.dataset.field)) onField(e); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'food-q') { e.preventDefault(); const first = view.querySelector('#food-results .add'); if (first) first.click(); }
  });

  /* ---------- Служебный API для review.js ---------- */
  function reset() { clearInterval(tickHandle); closeDialog(); hideToast(); state = initialState(); lastRouteKey = ''; history.replaceState(null, '', '#onboarding'); route(); }
  function loadDemo() {
    reset();
    Object.assign(state, { onboarded: true, numbers: true });
    const y = addDays(TODAY, -1);
    const mk = (date, type, ids, order = 'confirmed') => ({ id: uid('m'), demo: true, created: Date.now() - 1000, eatenAt: null, date, type, status: 'eaten', orderStatus: order, items: ids.map(id => { const f = D.FOODS.find(x => x.id === id); return { id: uid('c'), ...compFromFood(f), nutr: emptyNutr() }; }) });
    state.meals.push(mk(y, 'first', ['egg', 'tomato', 'bread']), mk(y, 'lunch', ['salad', 'chicken', 'buckwheat']), mk(y, 'snack', ['apple', 'nuts']), mk(TODAY, 'first', ['cottage', 'berries']));
    state.habits.chosen = [{ id: 'veg-first', days: [0, 1, 2, 3, 4, 5, 6], paused: false }, { id: 'move-after', days: [0, 2, 4], paused: false }];
    state.habits.marks[y] = ['veg-first'];
    [[-9, 82.1], [-7, 81.9], [-5, 82.0], [-3, 81.7], [-1, 81.6]].forEach(([d, kg]) => state.weights.push({ id: uid('kg'), demo: true, date: addDays(TODAY, d), kg, created: Date.now() }));
    (state.plan[TODAY] = []).push({ id: uid('p'), slot: 'dinner', ideaId: 'fish-zucchini' });
    state.water.push({ id: uid('w'), date: TODAY, ml: 250 });
    [['Талия', 88], ['Бёдра', 102], ['Грудь', 98]].forEach(([kind, cm]) => state.measures.push({ id: uid('cm'), demo: true, kind, cm, date: addDays(TODAY, -2), created: Date.now() }));
    go('today');
  }
  window.RitmApp = { go, reset, loadDemo, ROUTES, applyTheme, toast, heroSvg, get onboarded() { return state.onboarded; }, get route() { return state.route; } };

  applyTheme();
  route();
})();
