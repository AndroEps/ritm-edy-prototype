'use strict';
/* Адаптер Telegram Mini App для прототипа «Ритм еды».
   Работает только при запуске из Telegram (параметры tgWebApp* в адресе). В обычном браузере ничего не делает.
   Внешний скрипт telegram-web-app.js не подключается: мост к клиенту Telegram реализован напрямую,
   поэтому прототип по-прежнему не делает внешних запросов. Данные из Telegram (initData, имя пользователя)
   не читаются, не хранятся и никуда не отправляются. CloudStorage не используется: записи остаются в памяти вкладки. */
(() => {
  const raw = location.hash.replace(/^#/, '');
  if (!/(^|&)tgWebApp(Data|Version|Platform)=/.test(raw)) return;

  const params = new URLSearchParams(raw);
  const version = params.get('tgWebAppVersion') || '6.0';
  const platform = params.get('tgWebAppPlatform') || 'unknown';
  let theme = {};
  try { theme = JSON.parse(params.get('tgWebAppThemeParams') || '{}'); } catch { theme = {}; }
  // Убираем служебные параметры из адреса до запуска маршрутизатора: он читает ту же часть после «#».
  history.replaceState(null, '', location.pathname + location.search + '#today');

  const WEB_ORIGIN = 'https://web.telegram.org';
  const atLeast = v => {
    const a = version.split('.').map(Number), b = v.split('.').map(Number);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
    }
    return true;
  };
  function post(type, data = {}) {
    try {
      if (window.TelegramWebviewProxy) window.TelegramWebviewProxy.postEvent(type, JSON.stringify(data));
      else if (window.external && 'notify' in window.external) window.external.notify(JSON.stringify({ eventType: type, eventData: data }));
      else if (window.parent !== window) window.parent.postMessage(JSON.stringify({ eventType: type, eventData: data }), WEB_ORIGIN);
    } catch { /* клиент без моста: прототип работает как обычная страница */ }
  }

  function schemeOf(t) {
    const hex = /^#([0-9a-f]{6})$/i.exec(t.bg_color || '');
    if (!hex) return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const n = parseInt(hex[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5 ? 'dark' : 'light';
  }
  function paintChrome() {
    const bg = getComputedStyle(document.body).backgroundColor;
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(bg);
    if (!m) return;
    const color = '#' + m.slice(1, 4).map(x => Number(x).toString(16).padStart(2, '0')).join('');
    if (atLeast('6.9')) post('web_app_set_header_color', { color });
    else if (atLeast('6.1')) post('web_app_set_header_color', { color_key: 'bg_color' });
    if (atLeast('6.1')) post('web_app_set_background_color', { color });
    if (atLeast('7.10')) post('web_app_set_bottom_bar_color', { color });
  }

  const host = {
    platform, version, scheme: schemeOf(theme),
    saveText(name, text) {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, () => false);
      return Promise.resolve(false);
    }
  };
  window.RITM_HOST = host;
  document.documentElement.classList.add('in-telegram');

  /* ---------- Кнопка «Назад» Telegram ---------- */
  const ROOTS = new Set(['today', 'diary', 'plan', 'progress', 'onboarding']);
  const stack = [];
  let backVisible = null;
  function setBack(show) {
    if (show === backVisible || !atLeast('6.1')) return;
    backVisible = show;
    post('web_app_setup_back_button', { is_visible: show });
  }
  window.addEventListener('ritm:route', e => {
    const { route, hash } = e.detail;
    const root = ROOTS.has(hash);
    if (root) stack.length = 0;
    else if (stack[stack.length - 1] !== hash) stack.push(hash);
    setBack(!root);
    if (atLeast('6.2')) post('web_app_setup_closing_behavior', { need_confirmation: route !== 'onboarding' });
    requestAnimationFrame(paintChrome);
  });
  function onBack() {
    const app = window.RitmApp;
    if (!app) return;
    const dlg = document.querySelector('dialog[open]');
    if (dlg) { dlg.close(); return; }
    stack.pop();
    app.go(stack.length ? stack.pop() : 'today');
  }

  /* ---------- События от клиента ---------- */
  function receive(type, data) {
    if (type === 'back_button_pressed') onBack();
    else if (type === 'theme_changed' && data && data.theme_params) {
      host.scheme = schemeOf(data.theme_params);
      if (window.RitmApp) window.RitmApp.applyTheme();
      requestAnimationFrame(paintChrome);
    }
  }
  window.Telegram = window.Telegram || {};
  window.Telegram.WebView = { receiveEvent: receive };
  window.TelegramGameProxy = { receiveEvent: receive };
  window.addEventListener('message', e => {
    if (e.origin !== WEB_ORIGIN) return;
    let msg;
    try { msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
    if (msg && msg.eventType) receive(msg.eventType, msg.eventData);
  });

  /* ---------- Тактильный отклик на основные действия ---------- */
  document.addEventListener('click', e => {
    if (!atLeast('6.1')) return;
    const b = e.target.closest('.btn-primary, .food .add, .switch, .cell');
    if (b) post('web_app_trigger_haptic_feedback', b.classList.contains('btn-primary') ? { type: 'impact', impact_style: 'light' } : { type: 'selection_change' });
  }, true);

  /* ---------- Запуск ---------- */
  post('web_app_ready');
  post('web_app_expand');
  // Вертикальный свайп Telegram закрывает приложение и мешает прокрутке длинных экранов.
  if (atLeast('7.7')) post('web_app_setup_swipe_behavior', { allow_vertical_swipe: false });
  if (atLeast('6.1')) post('web_app_request_theme');
})();
