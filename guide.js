'use strict';
/* Знакомство с мини-героем «Ритмиком»: проводит по главному экрану после первого входа.
   Не модальное: подсветка не перехватывает нажатия, карточку можно пропустить в любой момент.
   «Первый вход» в прототипе — первый раз в этой вкладке (данные не сохраняются между запусками).
   Повторить можно в Настройках → «Знакомство с Ритмиком». */
(() => {
  const app = window.RitmApp;
  if (!app) return;

  // Тексты сверены с методикой прототипа (engine.js, METHOD.md): оценка — доля подтверждённых применимых правил;
  // неизвестное не считается нарушением; движение и калории в оценку не входят.
  const STEPS = [
    { title: 'Привет! Я Ритмик', text: 'Покажу за минуту, как здесь всё устроено. Можно пропустить и вернуться к знакомству в настройках.' },
    { sel: ['#view [data-act="new-meal"]'], title: 'Добавить еду', text: 'Записывайте до или после еды. До еды я подскажу одно посильное изменение — например, начать с овощей.' },
    { sel: ['#view .scroller'], title: 'Быстрые действия', text: 'Повторить прошлый приём, собрать первый приём, перекус или выбрать блюдо в ресторане. Фото еды с ИИ — скоро.' },
    { sel: ['#view .meal', '#meals-h'], title: 'Ваша еда за день', text: 'Нажмите на запись — увидите разбор: какие правила выполнены и каких данных не хватает. Неизвестное не считается ошибкой.' },
    { sel: ['#view .today-list'], title: 'Отметки на сегодня', text: 'Привычки, вода и движение после еды. Пропуск ничего не обнуляет — серий-наказаний нет.' },
    { title: 'Как считается оценка', text: '«Подтверждено 2 из 3» — сколько применимых правил выполнено: овощи в приёме, порядок «овощи → белок и жиры → крахмал», крахмал не в одиночку, несладкий первый приём и перекус, сладкое после основной еды. Калории и движение в оценку не входят.' },
    { sel: ['#tabbar', '#side-nav'], title: 'Разделы', text: 'Дневник — все дни. План — идеи блюд и список покупок. Прогресс — вес, замеры, схема тела и график.' },
    { sel: ['.topbar [href="#settings"]', '#side-secondary [href="#settings"]'], title: 'Настройки', text: 'Тема, режим без цифр, экспорт данных и повтор этого знакомства. Приятного аппетита!' }
  ];

  let i = 0, card = null, spot = null, active = false, shownOnce = false;

  function visible(el) { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }
  function target(step) { for (const s of step.sel || []) { const el = document.querySelector(s); if (visible(el)) return el; } return null; }

  function place() {
    if (!active) return;
    const el = target(STEPS[i]);
    if (!el) { spot.classList.add('off'); card.classList.remove('top'); return; }
    const r = el.getBoundingClientRect(), pad = 6;
    spot.classList.remove('off');
    spot.style.width = r.width + pad * 2 + 'px'; spot.style.height = r.height + pad * 2 + 'px';
    spot.style.transform = `translate(${r.left - pad}px, ${r.top - pad}px)`;
    // Карточка — с противоположной стороны от подсвеченного элемента.
    card.classList.toggle('top', r.top + r.height / 2 > innerHeight * 0.55);
  }

  function show() {
    const step = STEPS[i], last = i === STEPS.length - 1;
    const el = target(step);
    if (el) el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    card.innerHTML = `${app.heroSvg('hero', i === 0 || last)}
      <div class="guide-text"><p class="eyebrow" style="margin:0">Знакомство · ${i + 1} из ${STEPS.length}</p><h2 id="guide-title">${step.title}</h2><p>${step.text}</p></div>
      <div class="guide-actions"><span class="guide-dots" aria-hidden="true">${STEPS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>
        ${last ? '' : '<button class="btn btn-ghost btn-sm" type="button" data-guide="skip">Пропустить</button>'}
        ${i > 0 ? '<button class="btn btn-secondary btn-sm" type="button" data-guide="back">Назад</button>' : ''}
        <button class="btn btn-primary btn-sm" type="button" data-guide="next">${last ? 'Начать пользоваться' : i === 0 ? 'Показать' : 'Дальше'}</button></div>`;
    setTimeout(place, 380); place();
  }

  function start() {
    if (active) return;
    if (!app.onboarded) return;
    // Не уводим человека с экрана, который он уже открыл: знакомство дождётся следующего захода на «Сегодня».
    if (app.route !== 'today') { shownOnce = false; return; }
    active = true; shownOnce = true; i = 0;
    spot = document.createElement('div'); spot.className = 'guide-spot off'; spot.setAttribute('aria-hidden', 'true');
    card = document.createElement('section'); card.className = 'guide-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'false'); card.setAttribute('aria-labelledby', 'guide-title');
    document.body.append(spot, card);
    show();
  }
  function stop() {
    active = false;
    if (card) { const c = card; c.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(12px)' }], { duration: 180, easing: 'ease-out' }).onfinish = () => c.remove(); }
    if (spot) spot.remove();
    card = spot = null;
  }

  document.addEventListener('click', e => {
    const g = e.target.closest('[data-guide]');
    if (g) {
      const a = g.dataset.guide;
      if (a === 'skip') stop();
      else if (a === 'back') { i = Math.max(0, i - 1); show(); }
      else if (a === 'next') { if (i >= STEPS.length - 1) stop(); else { i++; show(); } }
      return;
    }
    if (e.target.closest('[data-guide-open]')) { e.preventDefault(); shownOnce = true; app.go('today'); setTimeout(start, 300); }
  });
  document.addEventListener('keydown', e => { if (active && e.key === 'Escape' && !document.querySelector('dialog[open]')) stop(); });
  addEventListener('resize', place);
  addEventListener('scroll', () => requestAnimationFrame(place), { passive: true });

  // Первый вход: сразу после онбординга или открытия демо-профиля — один раз за вкладку, после заставки.
  window.addEventListener('ritm:render', e => {
    if (active) { if (e.detail.route !== 'today') stop(); else requestAnimationFrame(place); return; }
    if (!shownOnce && app.onboarded && e.detail.route === 'today') { shownOnce = true; setTimeout(start, document.querySelector('.splash') ? 1900 : 450); }
  });
  if (app.onboarded && location.hash.startsWith('#today')) { shownOnce = true; setTimeout(start, 1900); }
})();
