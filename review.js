'use strict';
/* Служебное меню проверки прототипа: переход к любому экрану, чистый сценарий и демо-профиль.
   Вторично по отношению к приложению: открывается из «Что работает в прототипе» или кнопкой в боковой панели. */
(() => {
  const app = window.RitmApp;
  if (!app) return;
  const dlg = document.createElement('dialog');
  dlg.id = 'review-dialog';
  dlg.setAttribute('aria-labelledby', 'review-title');
  document.body.append(dlg);

  function open() {
    const main = document.getElementById('dialog');
    if (main.open) main.close();
    dlg.innerHTML = `<form method="dialog" class="dialog-close"><button class="icon-btn" value="close" aria-label="Закрыть служебное меню"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></form>
      <h2 id="review-title">Служебное меню прототипа</h2>
      <p class="small muted">Для проверки экранов. Не часть пользовательского сценария.</p>
      <div class="dialog-actions">
        <button class="btn btn-primary" type="button" data-review="demo">Демо-профиль (записи с пометкой «пример»)</button>
        <button class="btn btn-secondary" type="button" data-review="reset">Чистый сценарий с онбординга</button>
      </div>
      <h3 class="h3" style="margin-top:18px">Экраны</h3>
      ${app.onboarded ? '' : '<p class="tiny muted">До онбординга доступен только он. Чтобы открыть остальные экраны, выберите демо-профиль.</p>'}
      <nav aria-label="Экраны прототипа"><ul class="list">${app.ROUTES.map(([h, t]) => `<li><a class="nav-link" href="#${h}" data-review-link>${t}<span class="tiny muted" style="margin-left:auto">#${h}</span></a></li>`).join('')}</ul></nav>`;
    if (!dlg.open) dlg.showModal();
    dlg.querySelector('[data-review="demo"]').focus();
  }

  dlg.addEventListener('click', e => {
    const b = e.target.closest('[data-review]');
    if (b) {
      if (b.dataset.review === 'reset') {
        if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Нажмите ещё раз: все данные вкладки будут стёрты'; return; }
        dlg.close(); app.reset();
      } else { dlg.close(); app.loadDemo(); }
      return;
    }
    if (e.target.closest('[data-review-link]')) dlg.close();
  });

  document.addEventListener('click', e => {
    if (e.target.closest('[data-review-open]')) { e.preventDefault(); open(); }
  });

  const foot = document.querySelector('.side-foot');
  if (foot) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'link-btn';
    btn.dataset.reviewOpen = '';
    btn.textContent = 'Служебное меню экранов';
    foot.append(btn);
  }
  // Только явная служебная ссылка: обычный вход остаётся чистым онбордингом.
  if (new URLSearchParams(location.search).get('review') === 'demo') {
    app.loadDemo();
    document.querySelectorAll('.proto-badge').forEach(b => { b.textContent = 'Демо-профиль · примеры'; });
    history.replaceState(null, '', location.pathname + location.hash);
  }
})();
