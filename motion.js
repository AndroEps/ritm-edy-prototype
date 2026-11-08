'use strict';
/* Слой анимаций «РИТМ ЕДЫ». Не меняет данные и текст: только визуальные эффекты поверх готового DOM.
   Принципы (emil-design-eng, fixing-motion-performance): transform/opacity, ease-out на входе, короткие отклики,
   ничего не блокирует ввод (pointer-events: none), prefers-reduced-motion отключает перемещения. */
(() => {
  const app = window.RitmApp;
  if (!app) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => reduce.matches;

  /* ---------- Заставка запуска: тарелка рисуется, три части «падают» в порядке еды, название проявляется ---------- */
  (function splash() {
    const name = 'Ритм еды';
    const el = document.createElement('div');
    el.className = 'splash';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<div class="splash-inner">
      <svg class="splash-logo" viewBox="0 0 32 32"><circle class="plate" pathLength="1" cx="16" cy="16" r="13.5"/><circle class="s s1" cx="10" cy="16" r="3"/><circle class="s s2" cx="16" cy="16" r="3"/><circle class="s s3" cx="22" cy="16" r="3"/></svg>
      <div class="splash-name">${[...name].map((c, i) => `<span style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
      <div class="splash-sub">Под наблюдением врача</div></div>`;
    document.body.append(el);
    el.addEventListener('animationend', e => { if (e.target === el) el.remove(); });
    setTimeout(() => el.remove(), 3000); // страховка, если анимации отключены браузером
  })();

  /* ---------- Волна от нажатия ---------- */
  const RIPPLE = '.btn, .chip, .pills button, .seg button, .icon-btn, .nav-link, .food .add, .day-btn, .mark';
  document.addEventListener('pointerdown', e => {
    if (still() || e.button > 0) return;
    const t = e.target.closest(RIPPLE);
    if (!t || t.disabled) return;
    const r = t.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    t.append(s);
    s.addEventListener('animationend', () => s.remove());
  }, { passive: true });

  /* ---------- Эффекты, привязанные к действиям: запоминаем при нажатии, играем после перерисовки ---------- */
  let pending = null;
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act, r = b.getBoundingClientRect();
    if (act === 'mark-habit' && b.getAttribute('aria-pressed') !== 'true') pending = { kind: 'burst', arg: b.dataset.arg };
    else if (act === 'water') pending = { kind: 'drop', x: r.left + r.width / 2, y: r.top + r.height / 2 };
    else if (act === 'add-food') {
      const name = b.closest('.food')?.querySelector('.food-name')?.textContent || '';
      pending = { kind: 'fly', x: r.left, y: r.top, name };
    }
  }, true);

  function burst(x, y) {
    const wrap = document.createElement('div');
    wrap.className = 'burst';
    wrap.style.left = x + 'px'; wrap.style.top = y + 'px';
    const colors = ['#13a47a', '#2f8fe0', '#f2a33a', '#ff6b4a', '#7fe0c8'];
    wrap.innerHTML = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2, d = 34 + (i % 3) * 10;
      return `<i style="--c:${colors[i % colors.length]};--x:${(Math.cos(a) * d).toFixed(1)}px;--y:${(Math.sin(a) * d).toFixed(1)}px"></i>`;
    }).join('');
    document.body.append(wrap);
    setTimeout(() => wrap.remove(), 800);
  }
  function drop(x, y) {
    const d = document.createElement('div');
    d.className = 'drop';
    d.style.left = x + 'px'; d.style.top = y + 'px';
    document.body.append(d);
    d.addEventListener('animationend', () => d.remove());
  }
  function fly(p) {
    const bar = document.querySelector('.draft-bar');
    if (!bar || !p.name) return;
    const t = bar.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'fly';
    f.textContent = '+ ' + p.name;
    document.body.append(f);
    const w = f.offsetWidth;
    const dx = t.left + 24 - p.x, dy = t.top + t.height / 2 - 14 - p.y;
    f.style.left = p.x - w + 44 + 'px'; f.style.top = p.y + 'px';
    const anim = f.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5 + w / 2}px, ${dy * 0.5 - 60}px) scale(1.05)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx + w - 44}px, ${dy}px) scale(0.5)`, opacity: 0 }
    ], { duration: 650, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' });
    anim.onfinish = () => { f.remove(); bar.classList.remove('bump'); void bar.offsetWidth; bar.classList.add('bump'); };
  }

  /* ---------- Нижняя навигация: «пилюля» переезжает к активной вкладке ---------- */
  let lastPillX = null;
  function pill() {
    const bar = document.getElementById('tabbar');
    if (!bar || bar.hidden || getComputedStyle(bar).display === 'none') { lastPillX = null; return; }
    const cur = bar.querySelector('[aria-current="page"]');
    let p = bar.querySelector('.tab-pill');
    if (!cur) { if (p) p.remove(); lastPillX = null; return; }
    if (!p) { p = document.createElement('span'); p.className = 'tab-pill'; bar.prepend(p); }
    const br = bar.getBoundingClientRect(), cr = cur.getBoundingClientRect();
    const x = cr.left - br.left;
    p.style.width = cr.width + 'px';
    p.style.transform = `translateX(${x}px)`;
    if (lastPillX != null && lastPillX !== x && !still()) {
      p.animate([{ transform: `translateX(${lastPillX}px) scaleX(1.15)` }, { transform: `translateX(${x}px)` }], { duration: 420, easing: 'cubic-bezier(0.34, 1.36, 0.64, 1)' });
    }
    lastPillX = x;
  }

  /* ---------- После каждой отрисовки ---------- */
  window.addEventListener('ritm:render', () => {
    // Индексы для каскада строк списков.
    document.querySelectorAll('#view .list, #view .today-list').forEach(ul => [...ul.children].forEach((li, i) => li.style.setProperty('--i', Math.min(i, 8))));
    pill();
    const p = pending; pending = null;
    if (!p || still()) return;
    if (p.kind === 'burst') {
      const b = document.querySelector(`[data-act="mark-habit"][data-arg="${CSS.escape(p.arg)}"][aria-pressed="true"]`);
      if (b) { const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); }
    } else if (p.kind === 'drop') drop(p.x, p.y);
    else if (p.kind === 'fly') requestAnimationFrame(() => fly(p));
  });
  window.addEventListener('resize', () => { lastPillX = null; pill(); });
  pill();
})();
